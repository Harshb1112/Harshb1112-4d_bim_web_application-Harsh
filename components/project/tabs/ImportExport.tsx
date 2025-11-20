/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { UploadCloud, FileText, X } from 'lucide-react'
import { toast } from 'sonner'

interface ImportExportProps {
  project: any
  onImportSuccess: () => void
}

export default function ImportExport({ project, onImportSuccess }: ImportExportProps) {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0])
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/xml': ['.xml'],
      'text/xml': ['.xml'],
    },
    maxFiles: 1,
  })

  const handleImport = async () => {
    if (!file) {
      toast.error('No file selected', { description: 'Please select an MS Project XML file to import.' })
      return
    }

    setLoading(true)
    const formData = new FormData()
    formData.append('file', file)

    const promise = new Promise(async (resolve, reject) => {
      try {
        const response = await fetch(`/api/projects/${project.id}/import-msproject`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${document.cookie.split('token=')[1]?.split(';')[0]}`
          },
          body: formData,
        })

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'Failed to import schedule')
        }
        
        onImportSuccess()
        setFile(null)
        resolve(data.message)
      } catch (error) {
        reject(error)
      } finally {
        setLoading(false)
      }
    })

    toast.promise(promise, {
      loading: 'Importing schedule...',
      success: (message) => `Import successful: ${message}`,
      error: (err) => `Import failed: ${err.message}`,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Schedule</CardTitle>
        <CardDescription>
          Import tasks and dependencies from a Microsoft Project XML file. This will replace the existing schedule.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div
          {...getRootProps()}
          className={`p-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-blue-600 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
        >
          <input {...getInputProps()} />
          <UploadCloud className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          {isDragActive ? (
            <p className="text-blue-600">Drop the file here...</p>
          ) : (
            <p className="text-gray-500">Drag & drop an MS Project XML file here, or click to select</p>
          )}
        </div>

        {file && (
          <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
            <div className="flex items-center space-x-3">
              <FileText className="h-5 w-5 text-gray-600" />
              <div>
                <p className="font-medium text-sm">{file.name}</p>
                <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setFile(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        <Button onClick={handleImport} disabled={!file || loading} className="w-full">
          {loading ? 'Importing...' : 'Import Schedule'}
        </Button>
      </CardContent>
    </Card>
  )
}