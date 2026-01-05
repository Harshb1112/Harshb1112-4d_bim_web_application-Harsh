import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'
import ExcelJS from 'exceljs'
import { XMLParser } from 'fast-xml-parser'

// Parse MS Project XML format
function parseMSProjectXML(xmlContent: string): any[] {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })
  const result = parser.parse(xmlContent)
  
  const tasks: any[] = []
  const projectTasks = result?.Project?.Tasks?.Task || []
  const taskArray = Array.isArray(projectTasks) ? projectTasks : [projectTasks]
  
  for (const task of taskArray) {
    if (!task.Name || task.Name === '') continue
    tasks.push({
      name: task.Name,
      startDate: task.Start ? new Date(task.Start) : null,
      endDate: task.Finish ? new Date(task.Finish) : null,
      durationDays: task.Duration ? parseInt(task.Duration.replace(/[^\d]/g, '')) / 8 : null,
      progress: task.PercentComplete ? parseInt(task.PercentComplete) : 0,
      status: task.PercentComplete >= 100 ? 'completed' : task.PercentComplete > 0 ? 'in_progress' : 'todo',
      description: task.Notes || null,
    })
  }
  return tasks
}

// Parse Primavera P6 XML format
function parsePrimaveraXML(xmlContent: string): any[] {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })
  const result = parser.parse(xmlContent)
  
  const tasks: any[] = []
  const activities = result?.APIBusinessObjects?.Activity || result?.Project?.Activity || []
  const activityArray = Array.isArray(activities) ? activities : [activities]
  
  for (const activity of activityArray) {
    if (!activity.Name && !activity.ActivityName) continue
    tasks.push({
      name: activity.Name || activity.ActivityName,
      startDate: activity.StartDate ? new Date(activity.StartDate) : null,
      endDate: activity.FinishDate ? new Date(activity.FinishDate) : null,
      progress: activity.PercentComplete || 0,
      status: (activity.PercentComplete || 0) >= 100 ? 'completed' : (activity.PercentComplete || 0) > 0 ? 'in_progress' : 'todo',
    })
  }
  return tasks
}

// Parse Primavera XER format
function parsePrimaveraXER(xerContent: string): any[] {
  const tasks: any[] = []
  const lines = xerContent.split('\n')
  let inTaskSection = false
  let headers: string[] = []
  
  for (const line of lines) {
    if (line.startsWith('%T\tTASK')) { inTaskSection = true; continue }
    if (line.startsWith('%F') && inTaskSection) { headers = line.replace('%F\t', '').split('\t'); continue }
    if (line.startsWith('%R') && inTaskSection) {
      const values = line.replace('%R\t', '').split('\t')
      const task: Record<string, string> = {}
      headers.forEach((h, i) => { task[h] = values[i] })
      if (task.task_name) {
        tasks.push({
          name: task.task_name,
          startDate: task.target_start_date ? new Date(task.target_start_date) : null,
          endDate: task.target_end_date ? new Date(task.target_end_date) : null,
          progress: task.phys_complete_pct ? parseInt(task.phys_complete_pct) : 0,
          status: parseInt(task.phys_complete_pct || '0') >= 100 ? 'completed' : parseInt(task.phys_complete_pct || '0') > 0 ? 'in_progress' : 'todo',
        })
      }
    }
    if (line.startsWith('%T') && inTaskSection && !line.startsWith('%T\tTASK')) { inTaskSection = false }
  }
  return tasks
}

// Parse Excel/CSV
async function parseExcelCSV(buffer: ArrayBuffer, textContent: string): Promise<any[]> {
  const workbook = new ExcelJS.Workbook()
  try {
    await workbook.xlsx.load(buffer)
  } catch {
    const lines = textContent.split('\n').filter(l => l.trim())
    if (lines.length < 2) return []
    const worksheet = workbook.addWorksheet('Tasks')
    lines.forEach((line) => {
      worksheet.addRow(line.split(',').map(v => v.trim().replace(/^"|"$/g, '')))
    })
  }

  const worksheet = workbook.worksheets[0]
  if (!worksheet) return []

  const tasks: any[] = []
  let headerRow: string[] = []

  worksheet.eachRow((row, rowNumber) => {
    const values = row.values as any[]
    if (rowNumber === 1) {
      headerRow = values.slice(1).map(v => String(v || '').toLowerCase().trim().replace(/\s+/g, ''))
      return
    }
    const rowData: Record<string, any> = {}
    values.slice(1).forEach((val, idx) => { if (headerRow[idx]) rowData[headerRow[idx]] = val })

    const name = rowData['name'] || rowData['taskname'] || rowData['task']
    if (!name) return

    let startDate = null, endDate = null
    const startStr = rowData['startdate'] || rowData['start']
    const endStr = rowData['enddate'] || rowData['end'] || rowData['duedate']
    if (startStr) try { startDate = new Date(startStr); if (isNaN(startDate.getTime())) startDate = null } catch { startDate = null }
    if (endStr) try { endDate = new Date(endStr); if (isNaN(endDate.getTime())) endDate = null } catch { endDate = null }

    let status = 'todo'
    const statusStr = (rowData['status'] || '').toString().toLowerCase()
    if (statusStr.includes('progress')) status = 'in_progress'
    else if (statusStr.includes('complete')) status = 'completed'

    const progress = Math.min(100, Math.max(0, parseInt(String(rowData['progress'] || 0).replace('%', '')) || 0))

    tasks.push({ name: name.toString().trim(), startDate, endDate, status, progress: status === 'completed' ? 100 : progress })
  })
  return tasks
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('file') as File
    const projectId = parseInt(formData.get('projectId') as string)
    if (!file || !projectId) return NextResponse.json({ error: 'File and projectId required' }, { status: 400 })

    const fileName = file.name.toLowerCase()
    const buffer = await file.arrayBuffer()
    const textContent = new TextDecoder().decode(buffer)
    
    let parsedTasks: any[] = []

    if (fileName.endsWith('.xml')) {
      if (textContent.includes('<Project') && textContent.includes('<Tasks>')) {
        parsedTasks = parseMSProjectXML(textContent)
      } else {
        parsedTasks = parsePrimaveraXML(textContent)
      }
    } else if (fileName.endsWith('.xer')) {
      parsedTasks = parsePrimaveraXER(textContent)
    } else {
      parsedTasks = await parseExcelCSV(buffer, textContent)
    }

    if (parsedTasks.length === 0) {
      return NextResponse.json({ error: 'No valid tasks found in file' }, { status: 400 })
    }

    let created = 0
    for (const task of parsedTasks) {
      try {
        await prisma.task.create({ data: { projectId, ...task } })
        created++
      } catch (error) { console.error('Failed to create task:', task.name, error) }
    }

    return NextResponse.json({ success: true, count: created, message: `Imported ${created} tasks` })
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json({ error: 'Failed to import tasks' }, { status: 500 })
  }
}
