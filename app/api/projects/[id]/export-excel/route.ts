import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'
import ExcelJS from 'exceljs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = getTokenFromRequest(request)
    const user = token ? verifyToken(token) : null
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const projectId = parseInt(id)
    if (isNaN(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 })
    }

    // Verify user has access to project
    const projectAccess = await prisma.projectUser.findFirst({
      where: {
        projectId,
        userId: user.id,
      },
    })
    if (!projectAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch project and tasks
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        tasks: {
          include: {
            predecessors: {
              include: {
                predecessor: true,
              },
            },
            successors: {
              include: {
                successor: true,
              },
            },
          },
          orderBy: { id: 'asc' },
        },
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Create workbook
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'BIM 4D Application'
    workbook.created = new Date()
    
    const worksheet = workbook.addWorksheet('Tasks')

    // Define columns
    worksheet.columns = [
      { header: 'Task ID', key: 'id', width: 10 },
      { header: 'Task Name', key: 'name', width: 30 },
      { header: 'Start Date', key: 'startDate', width: 15 },
      { header: 'End Date', key: 'endDate', width: 15 },
      { header: 'Duration (Days)', key: 'duration', width: 15 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Priority', key: 'priority', width: 12 },
      { header: 'Progress (%)', key: 'progress', width: 12 },
      { header: 'Predecessors', key: 'predecessors', width: 30 },
      { header: 'Description', key: 'description', width: 40 },
    ]

    // Style header row
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF3B82F6' },
    }
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' }

    // Add data rows
    project.tasks.forEach(task => {
      worksheet.addRow({
        id: task.id,
        name: task.name,
        startDate: task.startDate ? new Date(task.startDate).toLocaleDateString() : '',
        endDate: task.endDate ? new Date(task.endDate).toLocaleDateString() : '',
        duration: task.durationDays || 0,
        status: task.status,
        priority: task.priority,
        progress: task.progress ? Number(task.progress) : 0,
        predecessors: task.predecessors.map(p => p.predecessor.name).join(', '),
        description: task.description || '',
      })
    })

    // Add borders to all cells
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        }
      })
    })

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer()

    // Return file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${project.name}_schedule.xlsx"`,
      },
    })
  } catch (error) {
    console.error('Excel export error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
