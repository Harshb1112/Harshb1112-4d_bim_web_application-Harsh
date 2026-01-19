import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { id } = await params
    const projectId = parseInt(id)

    if (isNaN(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 })
    }

    const body = await request.json()
    const { exportType = 'all', config = {} } = body

    // Fetch project with tasks and resources
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        tasks: {
          include: {
            assignedTo: {
              select: {
                id: true,
                fullName: true,
                email: true
              }
            },
            children: true
          }
        },
        resources: true
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Generate CSV content based on export type
    const csv = generateCSV(project, exportType, config)

    // Return as downloadable file
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${config.projectDefinition || `project-${projectId}`}_SAP_Export.csv"`
      }
    })
  } catch (error) {
    console.error('Error exporting to CSV:', error)
    return NextResponse.json({ error: 'Failed to export project' }, { status: 500 })
  }
}

function generateCSV(project: any, exportType: string, config: any): string {
  const tasks = project.tasks || []
  const resources = project.resources || []
  
  const {
    projectDefinition = project.name,
    controllingArea = '1000',
    plant = '1000',
    costCenter = 'CC1000',
    currency = 'USD',
    dateFormat = 'sap'
  } = config

  let csv = ''

  // Export based on type
  if (exportType === 'all' || exportType === 'wbs') {
    csv += generateWBSCSV(tasks, projectDefinition, controllingArea, currency, dateFormat)
  }

  if (exportType === 'all' || exportType === 'activities') {
    if (csv) csv += '\n\n'
    csv += generateActivitiesCSV(tasks, projectDefinition, plant, dateFormat)
  }

  if (exportType === 'all' || exportType === 'costs') {
    if (csv) csv += '\n\n'
    csv += generateCostElementsCSV(resources, projectDefinition, costCenter, currency)
  }

  if (exportType === 'all' || exportType === 'workcenters') {
    if (csv) csv += '\n\n'
    csv += generateWorkCentersCSV(tasks, plant)
  }

  return csv
}

function generateWBSCSV(tasks: any[], projectDef: string, controllingArea: string, currency: string, dateFormat: string): string {
  const headers = [
    'WBS_Element',
    'Description',
    'Controlling_Area',
    'Start_Date',
    'End_Date',
    'Status',
    'Progress',
    'Currency'
  ]

  const rows = tasks
    .filter(task => !task.parentId)
    .map((task, index) => {
      const wbsCode = `${projectDef}.${String(index + 1).padStart(3, '0')}`
      return [
        wbsCode,
        escapeCSV(task.name),
        controllingArea,
        formatDate(task.startDate, dateFormat),
        formatDate(task.endDate, dateFormat),
        task.status || 'PLANNED',
        task.progress || 0,
        currency
      ].join(',')
    })

  return [headers.join(','), ...rows].join('\n')
}

function generateActivitiesCSV(tasks: any[], projectDef: string, plant: string, dateFormat: string): string {
  const headers = [
    'Activity_Code',
    'Activity_Name',
    'Description',
    'Plant',
    'Start_Date',
    'End_Date',
    'Duration_Days',
    'Work_Center',
    'Status',
    'Progress'
  ]

  const rows = tasks.map((task, index) => {
    const activityCode = `${projectDef}${String(index + 1).padStart(4, '0')}`
    const duration = calculateDuration(task.startDate, task.endDate)
    
    return [
      activityCode,
      escapeCSV(task.name),
      escapeCSV(task.description || ''),
      plant,
      formatDate(task.startDate, dateFormat),
      formatDate(task.endDate, dateFormat),
      duration,
      escapeCSV(task.assignedTo?.fullName || 'UNASSIGNED'),
      task.status || 'PLANNED',
      task.progress || 0
    ].join(',')
  })

  return [headers.join(','), ...rows].join('\n')
}

function generateCostElementsCSV(resources: any[], projectDef: string, costCenter: string, currency: string): string {
  const headers = [
    'Cost_Element',
    'Description',
    'Cost_Center',
    'Unit_Cost',
    'Quantity',
    'Total_Cost',
    'Currency',
    'Type'
  ]

  const rows = resources.map((resource) => {
    const totalCost = (resource.unitCost || 0) * (resource.quantity || 0)
    
    return [
      `${projectDef}_${resource.id}`,
      escapeCSV(resource.name),
      costCenter,
      resource.unitCost || 0,
      resource.quantity || 0,
      totalCost,
      currency,
      resource.type || 'MATERIAL'
    ].join(',')
  })

  return [headers.join(','), ...rows].join('\n')
}

function generateWorkCentersCSV(tasks: any[], plant: string): string {
  const headers = [
    'Work_Center',
    'Description',
    'Plant',
    'Type',
    'Capacity'
  ]

  // Get unique work centers
  const uniqueUsers = new Map()
  tasks.forEach(task => {
    if (task.assignedTo) {
      uniqueUsers.set(task.assignedTo.id, task.assignedTo)
    }
  })

  const rows = Array.from(uniqueUsers.values()).map((user, index) => {
    const wcCode = `WC${String(index + 1).padStart(4, '0')}`
    
    return [
      wcCode,
      escapeCSV(user.fullName),
      plant,
      'PERSON',
      1
    ].join(',')
  })

  return [headers.join(','), ...rows].join('\n')
}

function escapeCSV(str: string): string {
  if (!str) return ''
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function formatDate(date: Date | string | null, format: string): string {
  if (!date) return ''
  const d = new Date(date)
  
  if (format === 'sap') {
    // YYYYMMDD format
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}${month}${day}`
  } else {
    // ISO format YYYY-MM-DD
    return d.toISOString().split('T')[0]
  }
}

function calculateDuration(startDate: Date | string | null, endDate: Date | string | null): number {
  if (!startDate || !endDate) return 0
  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffTime = Math.abs(end.getTime() - start.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}
