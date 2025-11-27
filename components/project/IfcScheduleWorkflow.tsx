"use client"

import { useState } from "react"
import IfcScheduleSelector from "./IfcScheduleSelector"
import TaskAssignmentDialog from "./TaskAssignmentDialog"

interface IfcElement {
  id: string
  globalId: string
  name: string
  type: string
  description?: string
}

interface IfcScheduleWorkflowProps {
  projectId: number
  modelId?: number
}

export default function IfcScheduleWorkflow({
  projectId,
  modelId,
}: IfcScheduleWorkflowProps) {
  const [selectedElements, setSelectedElements] = useState<IfcElement[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleElementsSelected = (elements: IfcElement[]) => {
    setSelectedElements(elements)
    setIsDialogOpen(true)
  }

  const handleDialogClose = () => {
    setIsDialogOpen(false)
    setSelectedElements([])
  }

  return (
    <>
      <IfcScheduleSelector
        projectId={projectId}
        modelId={modelId}
        onElementsSelected={handleElementsSelected}
      />

      <TaskAssignmentDialog
        isOpen={isDialogOpen}
        onClose={handleDialogClose}
        selectedElements={selectedElements}
        projectId={projectId}
      />
    </>
  )
}
