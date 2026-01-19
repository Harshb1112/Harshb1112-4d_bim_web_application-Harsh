'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Download, ArrowLeft, FileText, X } from 'lucide-react'
import { toast } from 'sonner'

export default function SAPExportPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const [project, setProject] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  
  // Export configuration
  const [exportType, setExportType] = useState('all')
  const [format, setFormat] = useState('csv')
  const [projectDefinition, setProjectDefinition] = useState('')
  const [controllingArea, setControllingArea] = useState('1000')
  const [plant, setPlant] = useState('1000')
  const [costCenter, setCostCenter] = useState('CC1000')
  const [currency, setCurrency] = useState('USD')
  const [dateFormat, setDateFormat] = useState('sap')
  const [tasks, setTasks] = useState<any[]>([])
  const [exportPreview, setExportPreview] = useState({
    wbsElements: 0,
    workCenters: 0,
    costLineItems: 0
  })

  useEffect(() => {
    fetchProject()
    fetchTasks()
  }, [projectId])

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setProject(data.project)
        setProjectDefinition(data.project?.name?.substring(0, 10).toUpperCase().replace(/\s/g, '_') || 'PROJ_001')
      }
    } catch (error) {
      console.error('Failed to fetch project:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTasks = async () => {
    try {
      const response = await fetch(`/api/tasks?projectId=${projectId}`, {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setTasks(data.tasks || [])
        calculatePreview(data.tasks || [])
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error)
    }
  }

  const calculatePreview = (taskList: any[]) => {
    setExportPreview({
      wbsElements: taskList.length,
      workCenters: Math.ceil(taskList.length / 2),
      costLineItems: taskList.length * 3
    })
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const response = await fetch(`/api/integrations/sap/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          projectId,
          exportType,
          format,
          config: {
            projectDefinition,
            controllingArea,
            plant,
            costCenter,
            currency,
            dateFormat
          }
        }),
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `SAP_Export_${projectDefinition}_${new Date().toISOString().split('T')[0]}.${format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast.success('✅ SAP export completed successfully!')
        setShowExportDialog(false)
      } else {
        toast.error('❌ Failed to export to SAP')
      }
    } catch (error) {
      console.error('Export error:', error)
      toast.error('❌ Export failed')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push(`/project/${projectId}?tab=integrations`)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Integrations
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">SAP Project System Export</h1>
        <p className="text-gray-600 mt-2">
          Export project data to SAP-compatible formats
        </p>
      </div>

      {/* Main Export Button */}
      <Card>
        <CardContent className="pt-6">
          <Button
            onClick={() => setShowExportDialog(true)}
            className="w-full h-16 bg-orange-500 hover:bg-orange-600 text-white text-lg"
          >
            <Download className="h-5 w-5 mr-2" />
            Export to SAP PS
          </Button>
        </CardContent>
      </Card>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-2xl">Export to SAP PS</DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowExportDialog(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <DialogDescription>
              Generate SAP-compatible files for import into SAP Project System
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Export Type and Format */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Export Type</Label>
                <Select value={exportType} onValueChange={setExportType}>
                  <SelectTrigger className="border-2 border-orange-400">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Data</SelectItem>
                    <SelectItem value="wbs">WBS Elements</SelectItem>
                    <SelectItem value="activities">Network Activities</SelectItem>
                    <SelectItem value="cost">Cost Elements</SelectItem>
                    <SelectItem value="workcenters">Work Centers</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Format</Label>
                <Select value={format} onValueChange={setFormat}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        CSV
                      </div>
                    </SelectItem>
                    <SelectItem value="xml">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        XML (IDoc)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* SAP Configuration */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-4">
              <h3 className="font-semibold text-gray-700">SAP Configuration</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Project Definition</Label>
                  <Input
                    value={projectDefinition}
                    onChange={(e) => setProjectDefinition(e.target.value)}
                    placeholder="HARSH_BA"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Controlling Area</Label>
                  <Input
                    value={controllingArea}
                    onChange={(e) => setControllingArea(e.target.value)}
                    placeholder="1000"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Plant</Label>
                  <Input
                    value={plant}
                    onChange={(e) => setPlant(e.target.value)}
                    placeholder="1000"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Cost Center</Label>
                  <Input
                    value={costCenter}
                    onChange={(e) => setCostCenter(e.target.value)}
                    placeholder="CC1000"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Input
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    placeholder="USD"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Date Format</Label>
                  <Select value={dateFormat} onValueChange={setDateFormat}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sap">SAP (YYYYMMDD)</SelectItem>
                      <SelectItem value="iso">ISO (YYYY-MM-DD)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Export Preview */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-700 mb-3">Export Preview</h3>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• {exportPreview.wbsElements} WBS Elements / Activities</li>
                <li>• {exportPreview.workCenters} Work Centers</li>
                <li>• {exportPreview.costLineItems} Cost Line Items</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => setShowExportDialog(false)}
                disabled={exporting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleExport}
                disabled={exporting}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                <Download className="h-4 w-4 mr-2" />
                {exporting ? 'Exporting...' : 'Export'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Supported Export Types</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                <strong>All Data:</strong> Complete project export
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                <strong>WBS Elements:</strong> Work Breakdown Structure (PRJDEF1)
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                <strong>Network Activities:</strong> Project activities (LOIPRO)
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                <strong>Cost Elements:</strong> Cost planning (COELEM)
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                <strong>Work Centers:</strong> Resource centers (CREMAS)
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Import to SAP</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
              <li>Export data using the button above</li>
              <li>Log in to SAP system</li>
              <li>Use transaction CJ20N (WBS) or CN21 (Networks)</li>
              <li>Import the downloaded file</li>
              <li>Validate and save in SAP</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
