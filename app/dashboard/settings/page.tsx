'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Sun, Moon, Monitor, Settings as SettingsIcon, Bot, User, Mail, Shield, Camera, Key, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import Image from 'next/image'

type Theme = 'light' | 'dark' | 'system'

interface UserProfile {
  id: number
  fullName: string
  email: string
  role: string
  profileImage?: string | null
}

export default function SettingsPage() {
  const [theme, setTheme] = useState<Theme>('light')
  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  
  // Profile form state
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // AI Configuration state
  const [aiEnabled, setAiEnabled] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)

  useEffect(() => {
    setMounted(true)
    const savedTheme = localStorage.getItem('theme') as Theme || 'light'
    setTheme(savedTheme)
    fetchUserProfile()
    fetchAIConfig()
  }, [])

  const fetchUserProfile = async () => {
    try {
      const response = await fetch('/api/user/profile', {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setUser(data)
        setFullName(data.fullName)
        setEmail(data.email)
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error)
      toast.error('Failed to load profile')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAIConfig = async () => {
    try {
      const response = await fetch('/api/settings/ai-config', {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setAiEnabled(data.aiEnabled || false)
        // Don't set the masked key, keep it empty for security
        // User will need to re-enter if they want to change
        setApiKey('')
      }
    } catch (error) {
      console.error('Failed to fetch AI config:', error)
    }
  }

  const handleSaveAIConfig = async () => {
    // Validate before saving
    if (aiEnabled && !apiKey) {
      toast.error('❌ Please enter an API key when AI is enabled');
      return;
    }

    if (aiEnabled && apiKey && !apiKey.startsWith('sk-')) {
      toast.error('❌ Invalid API key format. Must start with "sk-"');
      return;
    }

    setIsSaving(true)
    try {
      console.log('💾 Saving AI config:', { aiEnabled, hasApiKey: !!apiKey });
      
      const response = await fetch('/api/settings/ai-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          aiEnabled,
          apiKey: apiKey.trim() // Trim whitespace
        })
      })

      const data = await response.json();
      console.log('📥 Save response:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save AI configuration')
      }

      toast.success('✅ AI Configuration saved successfully!')
      
      // Don't clear the key - just keep it for user reference
      // setApiKey('') // Removed - user should see their key
    } catch (error: any) {
      console.error('Failed to save AI config:', error)
      toast.error(`❌ ${error.message || 'Failed to save AI configuration'}`)
    } finally {
      setIsSaving(false)
    }
  }

  const applyTheme = (newTheme: Theme) => {
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else if (newTheme === 'light') {
      document.documentElement.classList.remove('dark')
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (prefersDark) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
  }

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    applyTheme(newTheme)
    toast.success(`Theme changed to ${newTheme}`)
  }

  const handleProfileUpdate = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fullName,
          email
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update profile')
      }

      const updatedUser = await response.json()
      setUser(updatedUser)
      toast.success('✅ Profile updated successfully!')
    } catch (error) {
      console.error('Failed to update profile:', error)
      toast.error('❌ Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match')
      return
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to change password')
      }

      toast.success('✅ Password changed successfully!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error: any) {
      console.error('Failed to change password:', error)
      toast.error(`❌ ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('image', file)

    setIsSaving(true)
    try {
      const response = await fetch('/api/user/profile-image', {
        method: 'POST',
        credentials: 'include',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Failed to upload image')
      }

      const data = await response.json()
      setUser(prev => prev ? { ...prev, profileImage: data.profileImage } : null)
      toast.success('✅ Profile image updated!')
    } catch (error) {
      console.error('Failed to upload image:', error)
      toast.error('❌ Failed to upload image')
    } finally {
      setIsSaving(false)
    }
  }

  if (!mounted || isLoading) {
    return null
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <SettingsIcon className="h-8 w-8" />
              Settings
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage your application preferences and configurations
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => window.history.back()}
            className="flex items-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back
          </Button>
        </div>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Sun className="h-4 w-4" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            AI Configuration
          </TabsTrigger>
        </TabsList>

        {/* Profile Settings */}
        <TabsContent value="profile" className="mt-6 space-y-6">
          {/* Profile Image */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Profile Picture
              </CardTitle>
              <CardDescription>
                Update your profile picture
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-6">
              <div className="relative">
                {user?.profileImage ? (
                  <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-blue-500">
                    <Image
                      src={user.profileImage}
                      alt={user.fullName}
                      width={96}
                      height={96}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold">
                    {user?.fullName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="max-w-xs"
                  disabled={isSaving}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  JPG, PNG or GIF. Max size 2MB.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Basic Information
              </CardTitle>
              <CardDescription>
                Update your personal information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Role
                </Label>
                <Input
                  value={user?.role || ''}
                  disabled
                  className="bg-gray-100 dark:bg-gray-800"
                />
                <p className="text-xs text-muted-foreground">
                  Contact an administrator to change your role
                </p>
              </div>

              <Button
                onClick={handleProfileUpdate}
                disabled={isSaving}
                className="w-full"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Change Password
              </CardTitle>
              <CardDescription>
                Update your password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>

              <Button
                onClick={handlePasswordChange}
                disabled={isSaving || !currentPassword || !newPassword || !confirmPassword}
                className="w-full"
                variant="secondary"
              >
                {isSaving ? 'Changing...' : 'Change Password'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Settings */}
        <TabsContent value="appearance" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sun className="h-5 w-5" />
                Theme Settings
              </CardTitle>
              <CardDescription>
                Choose your preferred color theme for the application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Light Theme */}
                <button
                  onClick={() => handleThemeChange('light')}
                  className={`p-6 rounded-lg border-2 transition-all ${
                    theme === 'light'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex flex-col items-center gap-3">
                    <Sun className={`h-8 w-8 ${theme === 'light' ? 'text-blue-600' : 'text-gray-600'}`} />
                    <div className="text-center">
                      <h3 className="font-semibold">Light</h3>
                      <p className="text-sm text-muted-foreground">Bright and clear</p>
                    </div>
                    {theme === 'light' && (
                      <div className="w-2 h-2 rounded-full bg-blue-600" />
                    )}
                  </div>
                </button>

                {/* Dark Theme */}
                <button
                  onClick={() => handleThemeChange('dark')}
                  className={`p-6 rounded-lg border-2 transition-all ${
                    theme === 'dark'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex flex-col items-center gap-3">
                    <Moon className={`h-8 w-8 ${theme === 'dark' ? 'text-blue-600' : 'text-gray-600'}`} />
                    <div className="text-center">
                      <h3 className="font-semibold">Dark</h3>
                      <p className="text-sm text-muted-foreground">Easy on the eyes</p>
                    </div>
                    {theme === 'dark' && (
                      <div className="w-2 h-2 rounded-full bg-blue-600" />
                    )}
                  </div>
                </button>

                {/* System Theme */}
                <button
                  onClick={() => handleThemeChange('system')}
                  className={`p-6 rounded-lg border-2 transition-all ${
                    theme === 'system'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex flex-col items-center gap-3">
                    <Monitor className={`h-8 w-8 ${theme === 'system' ? 'text-blue-600' : 'text-gray-600'}`} />
                    <div className="text-center">
                      <h3 className="font-semibold">System</h3>
                      <p className="text-sm text-muted-foreground">Auto adjust</p>
                    </div>
                    {theme === 'system' && (
                      <div className="w-2 h-2 rounded-full bg-blue-600" />
                    )}
                  </div>
                </button>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Current theme: <span className="font-semibold capitalize">{theme}</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Configuration */}
        <TabsContent value="ai" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-purple-600" />
                Global AI Configuration
              </CardTitle>
              <CardDescription>
                Configure OpenAI integration for all projects
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Enable AI Toggle */}
                <div className="flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="space-y-0.5">
                    <Label htmlFor="global-ai-enabled" className="text-base font-semibold text-purple-900 dark:text-purple-100">
                      Enable AI Features
                    </Label>
                    <p className="text-sm text-purple-800 dark:text-purple-200">
                      Allow AI-powered task generation across all projects
                    </p>
                  </div>
                  <Switch
                    id="global-ai-enabled"
                    checked={aiEnabled}
                    onCheckedChange={setAiEnabled}
                  />
                </div>

                {/* API Key Input */}
                {aiEnabled && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="global-api-key" className="flex items-center gap-2 text-base font-semibold">
                        <Key className="h-5 w-5" />
                        OpenAI API Key
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Add your OpenAI API key to enable AI features across all projects
                      </p>
                      <div className="flex gap-2">
                        <Input
                          id="global-api-key"
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
                          className="text-purple-600 hover:underline font-semibold"
                        >
                          OpenAI Platform
                        </a>
                      </p>
                    </div>

                    {/* Info Alert */}
                    <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                      <AlertCircle className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-blue-900 dark:text-blue-100">
                        <strong>One API Key for All Projects:</strong> Once configured here, AI features will be available in all your projects automatically.
                      </AlertDescription>
                    </Alert>

                    {/* Billing Info */}
                    <Alert className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
                      <Bot className="h-4 w-4 text-purple-600" />
                      <AlertDescription className="text-purple-900 dark:text-purple-100">
                        <strong>Billing:</strong> API usage will be charged to your OpenAI account. Monitor usage at{' '}
                        <a
                          href="https://platform.openai.com/usage"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline font-semibold"
                        >
                          OpenAI Dashboard
                        </a>
                      </AlertDescription>
                    </Alert>
                  </div>
                )}

                {/* Save Button */}
                <Button 
                  onClick={handleSaveAIConfig}
                  disabled={isSaving || (aiEnabled && !apiKey)}
                  className="w-full" 
                  size="lg"
                >
                  {isSaving ? 'Saving...' : 'Save AI Configuration'}
                </Button>

                {/* How to Use */}
                <div className="pt-6 border-t space-y-3">
                  <h4 className="font-semibold text-base">How AI Features Work:</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                    <li>Add your OpenAI API key above</li>
                    <li>Save the configuration</li>
                    <li>Open any project</li>
                    <li>Go to Schedule tab → AI Task Generator</li>
                    <li>Generate AI-powered tasks automatically!</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
