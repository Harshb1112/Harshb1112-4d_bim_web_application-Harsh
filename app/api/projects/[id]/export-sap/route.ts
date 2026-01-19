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

    // Generate SAP PS compatible XML
    const xml = generateSAPXML(project)

    // Return as downloadable file
    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Content-Disposition': `attachment; filename="project-${projectId}-sap-export.xml"`
      }
    })
  } catch (error) {
    console.error('Error exporting to SAP:', error)
    return NextResponse.json({ error: 'Failed to export project' }, { status: 500 })
  }
}

function generateSAPXML(project: any): string {
  const tasks = project.tasks || []
  const resources = project.resources || []

  // Generate WBS Elements
  const wbsElements = tasks
    .filter((task: any) => !task.parentId)
    .map((task: any, index: number) => {
      const wbsCode = `${project.id}.${String(index + 1).padStart(3, '0')}`
      return `
    <WBS_ELEMENT>
      <WBS_CODE>${wbsCode}</WBS_CODE>
      <WBS_NAME>${escapeXml(task.name)}</WBS_NAME>
      <WBS_DESC>${escapeXml(task.description || '')}</WBS_DESC>
      <START_DATE>${formatDate(task.startDate)}</START_DATE>
      <END_DATE>${formatDate(task.endDate)}</END_DATE>
      <STATUS>${task.status || 'PLANNED'}</STATUS>
      <PROGRESS>${task.progress || 0}</PROGRESS>
    </WBS_ELEMENT>`
    })
    .join('')

  // Generate Network Activities
  const activities = tasks.map((task: any, index: number) => {
    const activityCode = `${project.id}${String(index + 1).padStart(4, '0')}`
    return `
    <ACTIVITY>
      <ACTIVITY_CODE>${activityCode}</ACTIVITY_CODE>
      <ACTIVITY_NAME>${escapeXml(task.name)}</ACTIVITY_NAME>
      <ACTIVITY_DESC>${escapeXml(task.description || '')}</ACTIVITY_DESC>
      <START_DATE>${formatDate(task.startDate)}</START_DATE>
      <END_DATE>${formatDate(task.endDate)}</END_DATE>
      <DURATION>${calculateDuration(task.startDate, task.endDate)}</DURATION>
      <WORK_CENTER>${task.assignedTo?.fullName || 'UNASSIGNED'}</WORK_CENTER>
      <STATUS>${task.status || 'PLANNED'}</STATUS>
      <PROGRESS>${task.progress || 0}</PROGRESS>
    </ACTIVITY>`
  }).join('')

  // Generate Cost Elements
  const costElements = resources.map((resource: any, index: number) => {
    return `
    <COST_ELEMENT>
      <COST_CODE>${resource.id}</COST_CODE>
      <COST_NAME>${escapeXml(resource.name)}</COST_NAME>
      <COST_TYPE>${resource.type || 'MATERIAL'}</COST_TYPE>
      <UNIT_COST>${resource.unitCost || 0}</UNIT_COST>
      <QUANTITY>${resource.quantity || 0}</QUANTITY>
      <TOTAL_COST>${(resource.unitCost || 0) * (resource.quantity || 0)}</TOTAL_COST>
      <CURRENCY>USD</CURRENCY>
    </COST_ELEMENT>`
  }).join('')

  // Generate Work Centers
  const workCenters = Array.from(
    new Set(tasks.map((task: any) => task.assignedTo?.fullName).filter(Boolean))
  ).map((name, index) => {
    return `
    <WORK_CENTER>
      <WC_CODE>WC${String(index + 1).padStart(4, '0')}</WC_CODE>
      <WC_NAME>${escapeXml(name as string)}</WC_NAME>
      <WC_TYPE>PERSON</WC_TYPE>
      <CAPACITY>1</CAPACITY>
    </WORK_CENTER>`
  }).join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<SAP_PROJECT_EXPORT>
  <PROJECT>
    <PROJECT_ID>${project.id}</PROJECT_ID>
    <PROJECT_NAME>${escapeXml(project.name)}</PROJECT_NAME>
    <PROJECT_DESC>${escapeXml(project.description || '')}</PROJECT_DESC>
    <START_DATE>${formatDate(project.startDate)}</START_DATE>
    <END_DATE>${formatDate(project.endDate)}</END_DATE>
    <STATUS>${project.status || 'ACTIVE'}</STATUS>
    <EXPORT_DATE>${new Date().toISOString()}</EXPORT_DATE>
  </PROJECT>
  
  <WBS_ELEMENTS>${wbsElements}
  </WBS_ELEMENTS>
  
  <ACTIVITIES>${activities}
  </ACTIVITIES>
  
  <COST_ELEMENTS>${costElements}
  </COST_ELEMENTS>
  
  <WORK_CENTERS>${workCenters}
  </WORK_CENTERS>
</SAP_PROJECT_EXPORT>`
}

function escapeXml(str: string): string {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function formatDate(date: Date | string | null): string {
  if (!date) return ''
  const d = new Date(date)
  return d.toISOString().split('T')[0]
}

function calculateDuration(startDate: Date | string | null, endDate: Date | string | null): number {
  if (!startDate || !endDate) return 0
  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffTime = Math.abs(end.getTime() - start.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}
