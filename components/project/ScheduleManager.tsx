"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import IfcScheduleWorkflow from "./IfcScheduleWorkflow"
import { FileBox } from "lucide-react"

interface Model {
  id: number
  name: string
  format: string
}

interface ScheduleManagerProps {
  projectId: number
}

export default function ScheduleManager({ projectId }: ScheduleManagerProps) {
  const [models, setModels] = useState<Model[]>([])
  const [selectedModelId, setSelectedModelId] = useState<number | undefined>()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadModels()
  }, [projectId])

  const loadModels = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/models`, {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        setModels(data.models || [])
        
        // Auto-select first IFC model
        const ifcModel = data.models?.find((m: Model) => 
          m.format?.toLowerCase() === 'ifc'
        )
        if (ifcModel) {
          setSelectedModelId(ifcModel.id)
        }
      }
    } catch (error) {
      console.error("Failed to load models:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileBox className="h-5 w-5" />
          Schedule Manager
        </CardTitle>
        <CardDescription>
          Select IFC elements and assign construction tasks
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="model-select">Select BIM Model</Label>
          <Select
            value={selectedModelId?.toString()}
            onValueChange={(value) => setSelectedModelId(parseInt(value))}
          >
            <SelectTrigger id="model-select">
              <SelectValue placeholder="Choose a model..." />
            </SelectTrigger>
            <SelectContent>
              {models.map((model) => (
                <SelectItem key={model.id} value={model.id.toString()}>
                  {model.name || `Model ${model.id}`} ({model.format})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedModelId ? (
          <IfcScheduleWorkflow
            projectId={projectId}
            modelId={selectedModelId}
          />
        ) : (
          <div className="text-center py-8 text-gray-500">
            {loading ? "Loading models..." : "Please select a model to continue"}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
