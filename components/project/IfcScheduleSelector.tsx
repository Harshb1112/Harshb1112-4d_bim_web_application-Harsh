"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Calendar, Search, CheckSquare } from "lucide-react"
import { toast } from "sonner"

interface IfcElement {
  id: string
  globalId: string
  name: string
  type: string
  description?: string
}

interface IfcScheduleSelectorProps {
  projectId: number
  modelId?: number
  onElementsSelected?: (elements: IfcElement[]) => void
}

export default function IfcScheduleSelector({
  projectId,
  modelId,
  onElementsSelected,
}: IfcScheduleSelectorProps) {
  const [elements, setElements] = useState<IfcElement[]>([])
  const [selectedElements, setSelectedElements] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (modelId) {
      loadIfcElements()
    }
  }, [modelId])

  const loadIfcElements = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/models/${modelId}/schedule-elements`, {
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error("Failed to load IFC elements")
      }

      const data = await response.json()
      setElements(data.elements || [])
    } catch (error: any) {
      toast.error(error.message || "Failed to load IFC schedule elements")
    } finally {
      setLoading(false)
    }
  }

  const toggleElement = (elementId: string) => {
    const newSelected = new Set(selectedElements)
    if (newSelected.has(elementId)) {
      newSelected.delete(elementId)
    } else {
      newSelected.add(elementId)
    }
    setSelectedElements(newSelected)
  }

  const toggleAll = () => {
    if (selectedElements.size === filteredElements.length) {
      setSelectedElements(new Set())
    } else {
      setSelectedElements(new Set(filteredElements.map(e => e.id)))
    }
  }

  const handleAssignTasks = () => {
    const selected = elements.filter(e => selectedElements.has(e.id))
    onElementsSelected?.(selected)
  }

  const filteredElements = elements.filter(element =>
    element.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    element.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    element.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          IFC Schedule Elements
        </h3>
        <Button
          onClick={handleAssignTasks}
          disabled={selectedElements.size === 0}
          size="sm"
        >
          <CheckSquare className="h-4 w-4 mr-2" />
          Assign Tasks ({selectedElements.size})
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search elements..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading elements...</div>
      ) : elements.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No schedule elements found in this model
        </div>
      ) : (
        <>
          <div className="flex items-center space-x-2 pb-2 border-b">
            <Checkbox
              id="select-all"
              checked={selectedElements.size === filteredElements.length && filteredElements.length > 0}
              onCheckedChange={toggleAll}
            />
            <Label htmlFor="select-all" className="cursor-pointer">
              Select All ({filteredElements.length})
            </Label>
          </div>

          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {filteredElements.map((element) => (
                <div
                  key={element.id}
                  className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer"
                  onClick={() => toggleElement(element.id)}
                >
                  <Checkbox
                    checked={selectedElements.has(element.id)}
                    onCheckedChange={() => toggleElement(element.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{element.name}</div>
                    <div className="text-sm text-gray-500">{element.type}</div>
                    {element.description && (
                      <div className="text-xs text-gray-400 mt-1">{element.description}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </>
      )}
    </div>
  )
}
