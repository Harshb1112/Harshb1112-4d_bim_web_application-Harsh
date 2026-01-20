'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Bot, Key, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface ProjectAISettingsProps {
  projectId: number
  initialAiEnabled?: boolean
  initialApiKey?: string | null
}

export default function ProjectAISettings({ 
  projectId, 
  initialAiEnabled = false,
  initialApiKey = ''
}: ProjectAISettingsProps) {
  const [aiEnabled, setAiEnabled] = useState(initialAiEnabled)
  const [apiKey, setApiKey] = useState(initialApiKey || '')
  const [showApiKey, setShowApiKey] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/ai-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          aiEnabled,
          aiApiKey: apiKey || null
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save AI settings')
      }

      toast.success('✅ AI settings saved successfully!')
    } catch (error) {
      console.error('Failed to save AI settings:', error)
      toast.error('❌ Failed to save AI settings')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-purple-600" />
          AI Features Configuration
        </CardTitle>
        <CardDescription>
          Configure OpenAI integration for this project
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable AI Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="ai-enabled">Enable AI Features</Label>
            <p className="text-sm text-muted-foreground">
              Allow AI-powered task generation for this project
            </p>
          </div>
          <Switch
            id="ai-enabled"
            checked={aiEnabled}
            onCheckedChange={setAiEnabled}
          />
        </div>

        {/* API Key Input */}
        {aiEnabled && (
          <div className="space-y-2">
            <Label htmlFor="api-key" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              OpenAI API Key
            </Label>
            <div className="flex gap-2">
              <Input
                id="api-key"
                type={showApiKey ? 'text' : 'password'}
                placeholder="sk-proj-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="font-mono text-sm"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? 'Hide' : 'Show'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Get your API key from{' '}
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-600 hover:underline"
              >
                OpenAI Platform
              </a>
            </p>
          </div>
        )}

        {/* Info Alert */}
        {aiEnabled && !apiKey && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              AI features will not work without a valid OpenAI API key. 
              Each project uses its own API key for billing isolation.
            </AlertDescription>
          </Alert>
        )}

        {/* Billing Info */}
        {aiEnabled && apiKey && (
          <Alert className="bg-purple-50 border-purple-200">
            <Bot className="h-4 w-4 text-purple-600" />
            <AlertDescription className="text-purple-900">
              <strong>Billing:</strong> API usage will be charged to your OpenAI account.
              Monitor usage at{' '}
              <a
                href="https://platform.openai.com/usage"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                OpenAI Dashboard
              </a>
            </AlertDescription>
          </Alert>
        )}

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={isSaving || (aiEnabled && !apiKey)}
          className="w-full"
        >
          {isSaving ? 'Saving...' : 'Save AI Settings'}
        </Button>
      </CardContent>
    </Card>
  )
}
