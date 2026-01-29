import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'
import ExcelJS from 'exceljs'
import { XMLParser } from 'fast-xml-parser'

// Parse MS Project XML format
function parseMSProjectXML(xmlContent: string): any[] {
  try {
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })
    const result = parser.parse(xmlContent)
    
    console.log('[MS Project Parser] Parsed structure:', Object.keys(result))
    
    const tasks: any[] = []
    
    // Try multiple possible paths for tasks
    let projectTasks = result?.Project?.Tasks?.Task || 
                      result?.project?.tasks?.task ||
                      result?.Tasks?.Task ||
                      result?.tasks?.task ||
                      []
    
    const taskArray = Array.isArray(projectTasks) ? projectTasks : [projectTasks]
    
    console.log('[MS Project Parser] Found', taskArray.length, 'tasks')
    
    if (taskArray.length === 0) {
      // Log the structure to help debug
      console.log('[MS Project Parser] Full structure:', JSON.stringify(result, null, 2).substring(0, 500))
    }
    
    for (const task of taskArray) {
      // Try multiple possible field names
      const name = task.Name || task.name || task.TaskName || task.taskName || task['@_Name']
      if (!name || name === '') continue
      
      const start = task.Start || task.start || task.StartDate || task.startDate
      const finish = task.Finish || task.finish || task.EndDate || task.endDate || task.FinishDate
      const duration = task.Duration || task.duration
      const percentComplete = task.PercentComplete || task.percentComplete || task.PercentWorkComplete || 0
      
      tasks.push({
        name: String(name),
        startDate: start ? new Date(start) : null,
        endDate: finish ? new Date(finish) : null,
        durationDays: duration ? parseInt(String(duration).replace(/[^\d]/g, '')) / 8 : null,
        progress: parseInt(String(percentComplete)) || 0,
        status: percentComplete >= 100 ? 'completed' : percentComplete > 0 ? 'in_progress' : 'todo',
        description: task.Notes || task.notes || task.Description || task.description || null,
      })
    }
    
    console.log('[MS Project Parser] Successfully parsed', tasks.length, 'valid tasks')
    return tasks
  } catch (error) {
    console.error('[MS Project Parser] Error:', error)
    return []
  }
}

// Parse Primavera P6 XML format
function parsePrimaveraXML(xmlContent: string): any[] {
  try {
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })
    const result = parser.parse(xmlContent)
    
    console.log('[Primavera Parser] Parsed structure:', Object.keys(result))
    
    const tasks: any[] = []
    const activities = result?.APIBusinessObjects?.Activity || 
                      result?.Project?.Activity || 
                      result?.Activity ||
                      []
    const activityArray = Array.isArray(activities) ? activities : [activities]
    
    console.log('[Primavera Parser] Found', activityArray.length, 'activities')
    
    if (activityArray.length === 0) {
      console.log('[Primavera Parser] Full structure:', JSON.stringify(result, null, 2).substring(0, 500))
    }
    
    for (const activity of activityArray) {
      const name = activity.Name || activity.ActivityName || activity.name || activity.activityName
      if (!name) continue
      
      tasks.push({
        name: String(name),
        startDate: activity.StartDate || activity.startDate ? new Date(activity.StartDate || activity.startDate) : null,
        endDate: activity.FinishDate || activity.finishDate ? new Date(activity.FinishDate || activity.finishDate) : null,
        progress: parseInt(String(activity.PercentComplete || activity.percentComplete || 0)),
        status: (activity.PercentComplete || 0) >= 100 ? 'completed' : (activity.PercentComplete || 0) > 0 ? 'in_progress' : 'todo',
      })
    }
    
    console.log('[Primavera Parser] Successfully parsed', tasks.length, 'valid tasks')
    return tasks
  } catch (error) {
    console.error('[Primavera Parser] Error:', error)
    return []
  }
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
  
  // Check if it's Excel XML format (from Revit/BIM exports)
  if (textContent.includes('<Workbook') && textContent.includes('schemas-microsoft-com:office:spreadsheet')) {
    console.log('[Excel Parser] Detected Excel XML Workbook format')
    try {
      const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })
      const result = parser.parse(textContent)
      
      const worksheet = result?.Workbook?.Worksheet
      if (!worksheet) {
        console.error('[Excel Parser] No worksheet found in XML')
        return []
      }
      
      const table = worksheet.Table
      if (!table || !table.Row) {
        console.error('[Excel Parser] No table or rows found')
        return []
      }
      
      const rows = Array.isArray(table.Row) ? table.Row : [table.Row]
      console.log('[Excel Parser] Found', rows.length, 'rows in XML')
      
      // Find header row and data rows
      let headerRow: string[] = []
      const tasks: any[] = []
      
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        if (!row.Cell) continue
        
        const cells = Array.isArray(row.Cell) ? row.Cell : [row.Cell]
        const values = cells.map((cell: any) => {
          const data = cell.Data
          if (!data) return ''
          return typeof data === 'object' ? (data['#text'] || '') : String(data)
        })
        
        // First row with data is header
        if (headerRow.length === 0 && values.some(v => v)) {
          headerRow = values.map(v => String(v).toLowerCase().trim().replace(/\s+/g, ''))
          console.log('[Excel Parser] Headers:', headerRow)
          continue
        }
        
        // Skip empty rows
        if (!values.some(v => v)) continue
        
        // Build row object
        const rowData: Record<string, any> = {}
        values.forEach((val, idx) => {
          if (headerRow[idx]) rowData[headerRow[idx]] = val
        })
        
        const name = rowData['name'] || rowData['taskname'] || rowData['task'] || rowData['familyandtype']
        if (!name) continue
        
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
      }
      
      console.log('[Excel Parser] Successfully parsed', tasks.length, 'tasks from XML')
      return tasks
    } catch (error) {
      console.error('[Excel Parser] Error parsing Excel XML:', error)
      return []
    }
  }
  
  try {
    console.log('[Excel Parser] Attempting to parse as Excel...')
    await workbook.xlsx.load(buffer)
    console.log('[Excel Parser] Successfully loaded as Excel')
  } catch (error) {
    console.log('[Excel Parser] Not Excel, trying CSV...', error)
    const lines = textContent.split('\n').filter(l => l.trim())
    console.log('[Excel Parser] CSV lines found:', lines.length)
    
    if (lines.length < 2) {
      console.error('[Excel Parser] Not enough lines in CSV')
      return []
    }
    
    const worksheet = workbook.addWorksheet('Tasks')
    lines.forEach((line, idx) => {
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
      console.log(`[Excel Parser] CSV line ${idx}:`, values)
      worksheet.addRow(values)
    })
  }

  const worksheet = workbook.worksheets[0]
  if (!worksheet) {
    console.error('[Excel Parser] No worksheet found')
    return []
  }

  const tasks: any[] = []
  let headerRow: string[] = []

  worksheet.eachRow((row, rowNumber) => {
    const values = row.values as any[]
    if (rowNumber === 1) {
      headerRow = values.slice(1).map(v => String(v || '').toLowerCase().trim().replace(/\s+/g, ''))
      console.log('[Excel Parser] Headers:', headerRow)
      return
    }
    const rowData: Record<string, any> = {}
    values.slice(1).forEach((val, idx) => { if (headerRow[idx]) rowData[headerRow[idx]] = val })

    console.log(`[Excel Parser] Row ${rowNumber} data:`, rowData)

    const name = rowData['name'] || rowData['taskname'] || rowData['task']
    if (!name) {
      console.log(`[Excel Parser] Row ${rowNumber} skipped - no name found`)
      return
    }

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
  
  console.log('[Excel Parser] Successfully parsed', tasks.length, 'tasks')
  return tasks
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('file') as File
    const projectIdStr = formData.get('projectId') as string
    const projectId = parseInt(projectIdStr)
    
    console.log('Import request:', { hasFile: !!file, projectIdStr, projectId, fileName: file?.name })
    
    if (!file) return NextResponse.json({ error: 'File is required' }, { status: 400 })
    if (!projectIdStr || isNaN(projectId)) return NextResponse.json({ error: 'Valid projectId is required' }, { status: 400 })

    const fileName = file.name.toLowerCase()
    const buffer = await file.arrayBuffer()
    const textContent = new TextDecoder().decode(buffer)
    
    console.log('[Import] File details:', {
      fileName,
      fileSize: buffer.byteLength,
      contentPreview: textContent.substring(0, 200),
      isXML: fileName.endsWith('.xml'),
      isXER: fileName.endsWith('.xer'),
      containsProject: textContent.includes('<Project'),
      containsTasks: textContent.includes('<Tasks>')
    })
    
    let parsedTasks: any[] = []

    if (fileName.endsWith('.xml')) {
      console.log('[Import] Parsing as XML...')
      if (textContent.includes('<Project') && textContent.includes('<Tasks>')) {
        console.log('[Import] Detected MS Project XML format')
        parsedTasks = parseMSProjectXML(textContent)
      } else if (textContent.includes('<Workbook') && textContent.includes('schemas-microsoft-com:office:spreadsheet')) {
        console.log('[Import] Detected Excel XML Workbook format - treating as Excel')
        parsedTasks = await parseExcelCSV(buffer, textContent)
      } else {
        console.log('[Import] Detected Primavera XML format')
        parsedTasks = parsePrimaveraXML(textContent)
      }
    } else if (fileName.endsWith('.xer')) {
      console.log('[Import] Parsing as Primavera XER...')
      parsedTasks = parsePrimaveraXER(textContent)
    } else {
      console.log('[Import] Parsing as Excel/CSV...')
      parsedTasks = await parseExcelCSV(buffer, textContent)
    }

    console.log('Parsed tasks:', { count: parsedTasks.length, fileType: fileName.split('.').pop() })
    
    if (parsedTasks.length === 0) {
      return NextResponse.json({ error: 'No valid tasks found in file. Please check the file format.' }, { status: 400 })
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
    const errorMessage = error instanceof Error ? error.message : 'Failed to import tasks'
    return NextResponse.json({ error: errorMessage, details: String(error) }, { status: 500 })
  }
}
