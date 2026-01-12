/* eslint-disable @typescript-eslint/no-explicit-any */
// TEMPORARILY DISABLED - jspdf causing deployment issues
// import { jsPDF } from 'jspdf'
// import autoTable from 'jspdf-autotable'

export async function generateSchedulePDF(project: any): Promise<Buffer> {
  // TODO: Re-enable after fixing jspdf version conflict
  throw new Error('PDF generation temporarily disabled')
  
  /* COMMENTED OUT FOR DEPLOYMENT
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  })

  // Title
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text(project.name, 15, 20)

  // Project Info
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  let yPos = 30

  if (project.description) {
    doc.text(`Description: ${project.description}`, 15, yPos)
    yPos += 6
  }

  if (project.team) {
    doc.text(`Team: ${project.team.name} (${project.team.code})`, 15, yPos)
    yPos += 6
  }

  if (project.startDate) {
    doc.text(`Start Date: ${new Date(project.startDate).toLocaleDateString()}`, 15, yPos)
    yPos += 6
  }

  if (project.endDate) {
    doc.text(`End Date: ${new Date(project.endDate).toLocaleDateString()}`, 15, yPos)
    yPos += 6
  }

  doc.text(`Generated: ${new Date().toLocaleString()}`, 15, yPos)
  yPos += 10

  // Tasks Table
  const tasks = project.tasks || []
  const tableData = tasks.map((task: any) => [
    task.id.toString(),
    task.name,
    task.startDate ? new Date(task.startDate).toLocaleDateString() : '-',
    task.endDate ? new Date(task.endDate).toLocaleDateString() : '-',
    task.durationDays?.toString() || '0',
    task.status || '-',
    task.priority || '-',
    task.progress ? `${Number(task.progress)}%` : '0%',
    task.predecessors?.map((p: any) => p.predecessor.name).join(', ') || '-',
  ])

  autoTable(doc, {
    startY: yPos,
    head: [
      [
        'ID',
        'Task Name',
        'Start Date',
        'End Date',
        'Duration',
        'Status',
        'Priority',
        'Progress',
        'Predecessors',
      ],
    ],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [59, 130, 246], // Blue
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 10 }, // ID
      1: { cellWidth: 50 }, // Task Name
      2: { cellWidth: 25 }, // Start Date
      3: { cellWidth: 25 }, // End Date
      4: { cellWidth: 18 }, // Duration
      5: { cellWidth: 20 }, // Status
      6: { cellWidth: 20 }, // Priority
      7: { cellWidth: 18 }, // Progress
      8: { cellWidth: 40 }, // Predecessors
    },
    margin: { left: 15, right: 15 },
    didDrawPage: (data) => {
      // Footer
      const pageCount = doc.getNumberOfPages()
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      )
    },
  })

  // Summary Section
  const finalY = (doc as any).lastAutoTable.finalY + 10
  if (finalY < doc.internal.pageSize.getHeight() - 40) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Project Summary', 15, finalY)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    
    const totalTasks = tasks.length
    const completedTasks = tasks.filter((t: any) => t.status === 'completed').length
    const inProgressTasks = tasks.filter((t: any) => t.status === 'in_progress').length
    const todoTasks = tasks.filter((t: any) => t.status === 'todo').length
    const avgProgress = tasks.length > 0 
      ? (tasks.reduce((sum: number, t: any) => sum + (Number(t.progress) || 0), 0) / tasks.length).toFixed(1)
      : 0

    let summaryY = finalY + 8
    doc.text(`Total Tasks: ${totalTasks}`, 15, summaryY)
    summaryY += 6
    doc.text(`Completed: ${completedTasks} | In Progress: ${inProgressTasks} | To Do: ${todoTasks}`, 15, summaryY)
    summaryY += 6
    doc.text(`Average Progress: ${avgProgress}%`, 15, summaryY)
  }

  // Convert to Buffer
  const pdfArrayBuffer = doc.output('arraybuffer')
  return Buffer.from(pdfArrayBuffer)
  */
}
