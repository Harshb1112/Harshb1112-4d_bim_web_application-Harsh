/* eslint-disable react-hooks/exhaustive-deps */
"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Bug, Loader2, RefreshCw, Info, AlertTriangle, XCircle, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { formatDateTime } from '@/lib/utils'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface ErrorLog {
  id: number
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'critical'
  message: string
  stackTrace?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context?: any
  user?: {
    fullName: string
    email: string
  }
}

interface ErrorLogViewerProps {
  projectId: number
}

const getLevelIcon = (level: string) => {
  switch (level) {
    case 'info': return <Info className="h-4 w-4 text-blue-500" />
    case 'warn': return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    case 'error': return <XCircle className="h-4 w-4 text-red-500" />
    case 'critical': return <Zap className="h-4 w-4 text-purple-500" />
    default: return <Bug className="h-4 w-4 text-gray-500" />
  }
}

const getLevelColorClass = (level: string) => {
  switch (level) {
    case 'info': return 'bg-blue-50 border-blue-200'
    case 'warn': return 'bg-yellow-50 border-yellow-200'
    case 'error': return 'bg-red-50 border-red-200'
    case 'critical': return 'bg-purple-50 border-purple-200'
    default: return 'bg-gray-50 border-gray-200'
  }
}

export default function ErrorLogViewer({ projectId }: ErrorLogViewerProps) {
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filterLevel, setFilterLevel] = useState('all')
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null)

  useEffect(() => {
    if (projectId) {
      fetchErrorLogs()
    }
  }, [projectId, filterLevel])

  const fetchErrorLogs = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/error-logs?projectId=${projectId}&level=${filterLevel}`, {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setErrorLogs(data.errorLogs || [])
      } else {
        toast.error('Failed to load error logs.')
      }
    } catch (error) {
      console.error('Failed to load error logs:', error)
      toast.error('An error occurred while loading error logs.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Error Logs</h2>
          <p className="text-sm text-gray-500">Review system and application errors for this project.</p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={filterLevel} onValueChange={setFilterLevel}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="warn">Warning</SelectItem>
              <SelectItem value="info">Info</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchErrorLogs} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center space-x-2">
            <Bug className="h-5 w-5" />
            <span>Project Error History</span>
          </CardTitle>
          <CardDescription>Detailed logs of issues encountered within the project.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="ml-3 text-gray-600">Loading error logs...</p>
            </div>
          ) : errorLogs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Bug className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium">No error logs found</p>
              <p className="text-sm">Everything looks good, or no errors have been reported yet.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {errorLogs.map((log) => (
                <Collapsible
                  key={log.id}
                  open={expandedLogId === log.id}
                  onOpenChange={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                  className={`border rounded-lg ${getLevelColorClass(log.level)}`}
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-4 cursor-pointer">
                    <div className="flex items-center space-x-3">
                      {getLevelIcon(log.level)}
                      <span className={`font-medium capitalize ${log.level === 'error' || log.level === 'critical' ? 'text-red-700' : ''}`}>
                        {log.level}: {log.message.substring(0, 100)}{log.message.length > 100 ? '...' : ''}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-600 text-sm">
                      <span>{formatDateTime(log.timestamp)}</span>
                      {expandedLogId === log.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="border-t border-gray-200 bg-white p-4 text-sm text-gray-700">
                    <p className="mb-2"><strong>Message:</strong> {log.message}</p>
                    {log.user && (
                      <p className="mb-2"><strong>Reported By:</strong> {log.user.fullName} ({log.user.email})</p>
                    )}
                    {log.stackTrace && (
                      <div className="mt-2">
                        <p className="font-semibold">Stack Trace:</p>
                        <pre className="bg-gray-100 p-2 rounded-md overflow-x-auto text-xs">
                          <code>{log.stackTrace}</code>
                        </pre>
                      </div>
                    )}
                    {log.context && Object.keys(log.context).length > 0 && (
                      <div className="mt-2">
                        <p className="font-semibold">Context:</p>
                        <pre className="bg-gray-100 p-2 rounded-md overflow-x-auto text-xs">
                          <code>{JSON.stringify(log.context, null, 2)}</code>
                        </pre>
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}