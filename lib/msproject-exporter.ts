/* eslint-disable @typescript-eslint/no-explicit-any */

export function generateMSProjectXML(project: any): string {
  const tasks = project.tasks || []
  
  // Create task map for UID assignment
  const taskUidMap = new Map<number, number>()
  tasks.forEach((task: any, index: number) => {
    taskUidMap.set(task.id, index + 1)
  })

  const projectStartDate = project.startDate 
    ? new Date(project.startDate).toISOString() 
    : new Date().toISOString()

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<Project xmlns="http://schemas.microsoft.com/project">
  <Name>${escapeXml(project.name)}</Name>
  <Title>${escapeXml(project.name)}</Title>
  <CreationDate>${new Date().toISOString()}</CreationDate>
  <LastSaved>${new Date().toISOString()}</LastSaved>
  <ScheduleFromStart>1</ScheduleFromStart>
  <StartDate>${projectStartDate}</StartDate>
  <FinishDate>${project.endDate ? new Date(project.endDate).toISOString() : projectStartDate}</FinishDate>
  <CurrencySymbol>$</CurrencySymbol>
  <CalendarUID>1</CalendarUID>
  <DefaultStartTime>08:00:00</DefaultStartTime>
  <DefaultFinishTime>17:00:00</DefaultFinishTime>
  <MinutesPerDay>480</MinutesPerDay>
  <MinutesPerWeek>2400</MinutesPerWeek>
  <DaysPerMonth>20</DaysPerMonth>
  <Tasks>
`

  // Add tasks
  tasks.forEach((task: any) => {
    const uid = taskUidMap.get(task.id)!
    const startDate = task.startDate ? new Date(task.startDate).toISOString() : projectStartDate
    const endDate = task.endDate ? new Date(task.endDate).toISOString() : startDate
    const duration = task.durationDays || 0
    
    xml += `    <Task>
      <UID>${uid}</UID>
      <ID>${task.id}</ID>
      <Name>${escapeXml(task.name)}</Name>
      <Type>1</Type>
      <IsNull>0</IsNull>
      <CreateDate>${task.createdAt ? new Date(task.createdAt).toISOString() : new Date().toISOString()}</CreateDate>
      <Start>${startDate}</Start>
      <Finish>${endDate}</Finish>
      <Duration>PT${duration * 8}H0M0S</Duration>
      <DurationFormat>7</DurationFormat>
      <Work>PT${duration * 8}H0M0S</Work>
      <PercentComplete>${task.progress ? Number(task.progress) : 0}</PercentComplete>
      <Priority>${getPriorityValue(task.priority)}</Priority>
      <ConstraintType>0</ConstraintType>
`

    // Add parent relationship
    if (task.parentId && taskUidMap.has(task.parentId)) {
      xml += `      <OutlineParent>${taskUidMap.get(task.parentId)}</OutlineParent>
`
    }

    // Add notes/description
    if (task.description) {
      xml += `      <Notes>${escapeXml(task.description)}</Notes>
`
    }

    // Add predecessors
    if (task.predecessors && task.predecessors.length > 0) {
      xml += `      <PredecessorLink>
`
      task.predecessors.forEach((pred: any) => {
        const predUid = taskUidMap.get(pred.predecessorId)
        if (predUid) {
          xml += `        <PredecessorUID>${predUid}</PredecessorUID>
        <Type>${getDependencyType(pred.type)}</Type>
        <LinkLag>0</LinkLag>
`
        }
      })
      xml += `      </PredecessorLink>
`
    }

    xml += `    </Task>
`
  })

  xml += `  </Tasks>
  <Resources/>
  <Assignments/>
</Project>`

  return xml
}

function escapeXml(text: string): string {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function getPriorityValue(priority: string): number {
  const priorityMap: Record<string, number> = {
    low: 300,
    medium: 500,
    high: 700,
    critical: 900,
  }
  return priorityMap[priority?.toLowerCase()] || 500
}

function getDependencyType(type: string): number {
  const typeMap: Record<string, number> = {
    FS: 1, // Finish-to-Start
    SS: 0, // Start-to-Start
    FF: 2, // Finish-to-Finish
    SF: 3, // Start-to-Finish
  }
  return typeMap[type?.toUpperCase()] || 1
}
