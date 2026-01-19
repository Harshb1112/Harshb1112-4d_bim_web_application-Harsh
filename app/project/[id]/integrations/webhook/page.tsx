'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Settings, Download, Copy, RefreshCw, Key } from 'lucide-react'
import { toast } from 'sonner'

export default function WebhookPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const [webhookUrl, setWebhookUrl] = useState('https://[YourApp]/webhooks/bimboss-webhook')
  const [apiKey, setApiKey] = useState('wbf_Prod1ca4e1')
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const payloadExample = `{
  "event": "task.updated",
  "timestamp": "2025-01-16T10:30:00Z",
  "project_id": "${projectId}",
  "data": {
    "task_id": "123",
    "task_name": "Foundation Work",
    "status": "in_progress",
    "progress": 45
  }
}`

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('✅ Copied to clipboard!')
  }

  const generateApiKey = () => {
    const newKey = 'wbf_' + Math.random().toString(36).substring(2, 15)
    setApiKey(newKey)
    toast.success('✅ New API key generated!')
  }

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/integrations/webhook-logs?projectId=${projectId}`, {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setLogs(data.logs || [])
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [projectId])

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
        <h1 className="text-3xl font-bold text-gray-900">Integrations</h1>
        <p className="text-gray-600 mt-2">
          Connect BIMBOSS with your SAP/ERP systems
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="export" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="export" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export to SAP
          </TabsTrigger>
          <TabsTrigger value="webhook" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Webhook API
          </TabsTrigger>
        </TabsList>

        {/* Export to SAP Tab */}
        <TabsContent value="export">
          <div className="text-center py-12 text-gray-500">
            <Download className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <p>Export to SAP functionality</p>
            <Button
              onClick={() => router.push(`/project/${projectId}/integrations/sap-export`)}
              className="mt-4 bg-orange-500 hover:bg-orange-600"
            >
              Go to SAP Export
            </Button>
          </div>
        </TabsContent>

        {/* Webhook API Tab */}
        <TabsContent value="webhook" className="space-y-6">
          {/* Webhook URL */}
          <Card>
            <CardHeader>
              <CardTitle>Webhook URL</CardTitle>
              <CardDescription>
                Use this unique URL to send project events and status to BIMBOSS
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="font-mono text-sm"
                  placeholder="https://your-app.com/webhooks/bimboss"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(webhookUrl)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>

              {/* Payload Request Example */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Payload Request</Label>
                <div className="relative">
                  <pre className="bg-gray-100 p-4 rounded-lg text-xs overflow-x-auto font-mono">
                    {payloadExample}
                  </pre>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(payloadExample)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* API Keys */}
          <Card>
            <CardHeader>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>
                Generate API keys to authenticate webhook requests
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label className="text-sm mb-2 block">Key name e.g. wbf_Prod1ca4e1</Label>
                  <Input
                    value={apiKey}
                    readOnly
                    className="font-mono"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => copyToClipboard(apiKey)}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                  <Button
                    onClick={generateApiKey}
                    className="bg-orange-500 hover:bg-orange-600"
                  >
                    <Key className="h-4 w-4 mr-2" />
                    Generate
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Integration Logs */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Integration Logs</CardTitle>
                  <CardDescription>
                    View webhook calls and their status
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchLogs}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">No webhook calls yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {logs.map((log, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg text-sm"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{log.event || 'Webhook Call'}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(log.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          log.status === 'success'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {log.status || 'pending'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Webhook Events Info */}
          <Card>
            <CardHeader>
              <CardTitle>Available Events</CardTitle>
              <CardDescription>
                Events that will trigger webhook notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  <code className="bg-gray-100 px-2 py-1 rounded">task.created</code> - New task created
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  <code className="bg-gray-100 px-2 py-1 rounded">task.updated</code> - Task status changed
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  <code className="bg-gray-100 px-2 py-1 rounded">task.completed</code> - Task marked complete
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  <code className="bg-gray-100 px-2 py-1 rounded">project.updated</code> - Project details changed
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  <code className="bg-gray-100 px-2 py-1 rounded">file.uploaded</code> - New file added
                </li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
