"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, ClipboardList } from "lucide-react"
import { toast } from "sonner"

interface IfcElement {
  id: string
  globalId: string
  name: string
  type: string
  description?: string
}

interface TaskAssignmentDialogProps {
  isOpen: boolean
  onClose: () => void
  selectedElements: IfcElement[]
  projectId: number
}

export default function TaskAssignmentDialog({
  isOpen,
  onClose,
  selectedElements,
  projectId,
}: TaskAssignmentDialogProps) {
  const [taskName, setTaskName] = useState("")
  const [taskDescription, setTaskDescription] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [duration, setDuration] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!taskName.trim()) {
      toast.error("Task name is required")
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        credentials: 'include',
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId,
          name: taskName.trim(),
          description: taskDescription.trim() || null,
          startDate: startDate || null,
          endDate: endDate || null,
          duration: duration ? parseInt(duration) : null,
          ifcElements: selectedElements.map(e => ({
            elementId: e.id,
            globalId: e.globalId,
            name: e.name,
            type: e.type
          }))
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create task")
      }

      toast.success("Task assigned successfully")
      resetForm()
      onClose()
    } catch (error: any) {
      toast.error(error.message || "Failed to assign task")
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setTaskName("")
    setTaskDescription("")
    setStartDate("")
    setEndDate("")
    setDuration("")
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <ClipboardList className="h-5 w-5" />
            <span>Assign Task to IFC Elements</span>
          </DialogTitle>
          <DialogDescription>
            Create a task for {selectedElements.length} selected element(s)
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="task-name">Task Name *</Label>
            <Input
              id="task-name"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              placeholder="e.g., Install walls"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-description">Description</Label>
            <Textarea
              id="task-description"
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              placeholder="Task details..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Duration (days)</Label>
            <Input
              id="duration"
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="e.g., 7"
              min="1"
            />
          </div>

          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm font-medium mb-2">Selected Elements:</div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {selectedElements.map((element) => (
                <div key={element.id} className="text-xs text-gray-600">
                  • {element.name} ({element.type})
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {loading ? "Assigning..." : "Assign Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
