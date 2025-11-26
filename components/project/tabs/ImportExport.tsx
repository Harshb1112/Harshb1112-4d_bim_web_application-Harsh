/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import MSProjectImportDialog from '../MSProjectImportDialog'
import { toast } from 'sonner'

interface ImportExportProps {
  project: any
  onImportSuccess: () => void
}

export default function ImportExport({ project, onImportSuccess }: ImportExportProps) {
  const [exportingExcel, setExportingExcel] = useState(false)
  const [exportingMSProject, setExportingMSProject] = useState(false)
  const [exportingPDF, setExportingPDF] = useState(false)

  const handleExportExcel = async () => {
    setExportingExcel(true)
    try {
      const response = await fetch(`/api/projects/${project.id}/export-excel`, {
        method: 'GET',
        credentials: 'include',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to export to Excel')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${project.name}_schedule.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success('Excel file downloaded successfully!')
    } catch (error) {
      console.error('Export error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to export to Excel')
    } finally {
      setExportingExcel(false)
    }
  }

  const handleExportMSProject = async () => {
    setExportingMSProject(true)
    try {
      const response = await fetch(`/api/projects/${project.id}/export-msproject`, {
        method: 'GET',
        credentials: 'include',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to export to MS Project')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${project.name}_schedule.xml`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success('MS Project XML file downloaded successfully!')
    } catch (error) {
      console.error('Export error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to export to MS Project')
    } finally {
      setExportingMSProject(false)
    }
  }

  const handleExportPDF = async () => {
    setExportingPDF(true)
    try {
      const response = await fetch(`/api/projects/${project.id}/export-pdf`, {
        method: 'GET',
        credentials: 'include',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to export to PDF')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${project.name}_schedule.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success('PDF file downloaded successfully!')
    } catch (error) {
      console.error('Export error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to export to PDF')
    } finally {
      setExportingPDF(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Import Section */}
      <Card>
        <CardHeader>
          <CardTitle>Import Schedule</CardTitle>
          <CardDescription>
            Import tasks and dependencies from a Microsoft Project XML file. This will replace the existing schedule.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MSProjectImportDialog 
            projectId={project.id} 
            onImportSuccess={onImportSuccess}
          />
        </CardContent>
      </Card>

      {/* Export Section */}
      <Card>
        <CardHeader>
          <CardTitle>Export Schedule</CardTitle>
          <CardDescription>
            Export your project schedule to various formats for use in other applications.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button 
            variant="outline" 
            className="w-full justify-start" 
            onClick={handleExportExcel}
            disabled={exportingExcel}
          >
            {exportingExcel ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-4 h-4 mr-2" />
            )}
            {exportingExcel ? 'Exporting...' : 'Export to Excel'}
          </Button>
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={handleExportMSProject}
            disabled={exportingMSProject}
          >
            {exportingMSProject ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            {exportingMSProject ? 'Exporting...' : 'Export to MS Project XML'}
          </Button>
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={handleExportPDF}
            disabled={exportingPDF}
          >
            {exportingPDF ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            {exportingPDF ? 'Exporting...' : 'Export to PDF'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}