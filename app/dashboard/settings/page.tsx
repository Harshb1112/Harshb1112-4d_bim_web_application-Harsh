'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sun, Moon, Monitor, Settings as SettingsIcon, Bot, User, Mail, Shield, Camera, Key, AlertCircle, Bell, Lock, Globe, Database, Zap, Clock, Download, Trash2, Smartphone, Laptop, MapPin, RefreshCw, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
  const [aiProvider, setAiProvider] = useState<'openai' | 'claude'>('openai')
  const [apiKey, setApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)

  // Notification Settings
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [taskNotifications, setTaskNotifications] = useState(true)
  const [projectNotifications, setProjectNotifications] = useState(true)
  const [weeklyDigest, setWeeklyDigest] = useState(false)

  // Security Settings
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [sessions, setSessions] = useState<any[]>([])
  const [show2FADialog, setShow2FADialog] = useState(false)
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [verifying2FA, setVerifying2FA] = useState(false)
  
  // Login History
  const [loginHistory, setLoginHistory] = useState<any[]>([])
  const [loadingLoginHistory, setLoadingLoginHistory] = useState(true)
  
  // Push Notifications
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushSupported, setPushSupported] = useState(false)
  const [enablingPush, setEnablingPush] = useState(false)

  // API Keys & Integrations
  const [apiKeys, setApiKeys] = useState<any[]>([])
  const [integrations, setIntegrations] = useState<any[]>([])
  const [loadingApiKeys, setLoadingApiKeys] = useState(true)
  const [loadingIntegrations, setLoadingIntegrations] = useState(true)
  const [showNewApiKeyDialog, setShowNewApiKeyDialog] = useState(false)
  const [newApiKeyName, setNewApiKeyName] = useState('')
  const [generatedApiKey, setGeneratedApiKey] = useState('')

  // Language & Region
  const [language, setLanguage] = useState('en')
  const [timezone, setTimezone] = useState('UTC')
  const [dateFormat, setDateFormat] = useState('MM/DD/YYYY')
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    setMounted(true)
    const savedTheme = localStorage.getItem('theme') as Theme || 'light'
    setTheme(savedTheme)
    fetchUserProfile()
    fetchAIConfig()
    fetchNotificationSettings()
    fetchSecuritySettings()
    fetchLanguageSettings()
    fetchSessions()
    fetchLoginHistory()
    fetchApiKeys()
    fetchIntegrations()
    checkPushNotificationSupport()

    // Update current time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const fetchNotificationSettings = async () => {
    try {
      const response = await fetch('/api/settings/notifications', {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setEmailNotifications(data.emailNotifications)
        setTaskNotifications(data.taskNotifications)
        setProjectNotifications(data.projectNotifications)
        setWeeklyDigest(data.weeklyDigest)
      }
    } catch (error) {
      console.error('Failed to fetch notification settings:', error)
    }
  }

  const fetchSecuritySettings = async () => {
    try {
      const response = await fetch('/api/settings/security', {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setTwoFactorEnabled(data.twoFactorEnabled)
      }
    } catch (error) {
      console.error('Failed to fetch security settings:', error)
    }
  }

  const fetchLanguageSettings = async () => {
    try {
      const response = await fetch('/api/settings/language', {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setLanguage(data.language)
        setTimezone(data.timezone)
        setDateFormat(data.dateFormat)
      }
    } catch (error) {
      console.error('Failed to fetch language settings:', error)
    }
  }

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/settings/sessions', {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setSessions(data)
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error)
    }
  }
  
  const fetchLoginHistory = async () => {
    setLoadingLoginHistory(true)
    try {
      const response = await fetch('/api/auth/login-history', {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setLoginHistory(data.sessions || [])
      }
    } catch (error) {
      console.error('Failed to fetch login history:', error)
    } finally {
      setLoadingLoginHistory(false)
    }
  }
  
  const fetchApiKeys = async () => {
    setLoadingApiKeys(true)
    try {
      const response = await fetch('/api/api-keys', {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setApiKeys(data.apiKeys || [])
      }
    } catch (error) {
      console.error('Failed to fetch API keys:', error)
    } finally {
      setLoadingApiKeys(false)
    }
  }
  
  const fetchIntegrations = async () => {
    setLoadingIntegrations(true)
    try {
      const response = await fetch('/api/integrations', {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setIntegrations(data.integrations || [])
      }
    } catch (error) {
      console.error('Failed to fetch integrations:', error)
    } finally {
      setLoadingIntegrations(false)
    }
  }
  
  const handleGenerateApiKey = async () => {
    if (!newApiKeyName.trim()) {
      toast.error('❌ Please enter a name for the API key')
      return
    }
    
    setIsSaving(true)
    try {
      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: newApiKeyName,
          expiresInDays: 365 // 1 year expiry
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setGeneratedApiKey(data.apiKey.key)
        setNewApiKeyName('')
        fetchApiKeys()
        toast.success('✅ API key generated successfully!')
      } else {
        const error = await response.json()
        toast.error(`❌ ${error.error || 'Failed to generate API key'}`)
      }
    } catch (error) {
      console.error('Failed to generate API key:', error)
      toast.error('❌ Failed to generate API key')
    } finally {
      setIsSaving(false)
    }
  }
  
  const handleRevokeApiKey = async (keyId: number) => {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return
    }
    
    try {
      const response = await fetch(`/api/api-keys/${keyId}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      
      if (response.ok) {
        fetchApiKeys()
        toast.success('✅ API key revoked successfully!')
      } else {
        toast.error('❌ Failed to revoke API key')
      }
    } catch (error) {
      console.error('Failed to revoke API key:', error)
      toast.error('❌ Failed to revoke API key')
    }
  }
  
  const handleConnectIntegration = async (type: string) => {
    // For now, just show a coming soon message
    // In the future, this will open integration-specific dialogs
    toast.info(`🔗 ${type} integration coming soon!`)
  }
  
  const handleDisconnectIntegration = async (integrationId: number) => {
    if (!confirm('Are you sure you want to disconnect this integration?')) {
      return
    }
    
    try {
      const response = await fetch(`/api/integrations/${integrationId}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      
      if (response.ok) {
        fetchIntegrations()
        toast.success('✅ Integration disconnected successfully!')
      } else {
        toast.error('❌ Failed to disconnect integration')
      }
    } catch (error) {
      console.error('Failed to disconnect integration:', error)
      toast.error('❌ Failed to disconnect integration')
    }
  }
  
  const checkPushNotificationSupport = async () => {
    try {
      const { isNotificationSupported, getNotificationPermission } = await import('@/lib/push-notifications')
      const supported = isNotificationSupported()
      setPushSupported(supported)
      
      if (supported) {
        const permission = getNotificationPermission()
        setPushEnabled(permission === 'granted')
      }
    } catch (error) {
      console.error('Failed to check push notification support:', error)
    }
  }
  
  const handleEnablePushNotifications = async () => {
    setEnablingPush(true)
    try {
      const { initializePushNotifications, sendTestNotification } = await import('@/lib/push-notifications')
      
      const success = await initializePushNotifications()
      if (success) {
        setPushEnabled(true)
        toast.success('✅ Push notifications enabled!')
        
        // Send test notification
        setTimeout(async () => {
          await sendTestNotification()
        }, 1000)
      } else {
        toast.error('❌ Failed to enable push notifications. Please check browser permissions.')
      }
    } catch (error: any) {
      console.error('Failed to enable push notifications:', error)
      toast.error('❌ ' + error.message)
    } finally {
      setEnablingPush(false)
    }
  }

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
        console.log('📥 Loaded AI config:', data)
        setAiEnabled(data.aiEnabled || false)
        setAiProvider(data.aiProvider || 'openai')
        
        // Show masked key if exists (for user to know it's saved)
        if (data.hasApiKey) {
          setApiKey('••••••••••••••••') // Show masked key
          console.log('✅ API key is saved (showing masked)')
        } else {
          setApiKey('')
          console.log('⚠️ No API key saved')
        }
      }
    } catch (error) {
      console.error('Failed to fetch AI config:', error)
    }
  }

  const handleSaveAIConfig = async () => {
    // If API key is masked (already saved), don't send it again
    const isMaskedKey = apiKey === '••••••••••••••••';
    
    // Validate before saving
    if (aiEnabled && !apiKey) {
      toast.error('❌ Please enter an API key when AI is enabled');
      return;
    }

    if (aiEnabled && apiKey && !isMaskedKey) {
      // Auto-detect and validate provider based on key
      if (apiKey.startsWith('sk-ant-')) {
        if (aiProvider !== 'claude') {
          console.log('🔧 Auto-correcting provider to Claude based on key');
          setAiProvider('claude');
        }
      } else if (apiKey.startsWith('sk-')) {
        if (aiProvider !== 'openai') {
          console.log('🔧 Auto-correcting provider to OpenAI based on key');
          setAiProvider('openai');
        }
      } else {
        toast.error('❌ Invalid API key format. OpenAI keys start with "sk-", Claude keys start with "sk-ant-"');
        return;
      }
    }

    setIsSaving(true)
    try {
      console.log('💾 Saving AI config:', { aiEnabled, aiProvider, hasApiKey: !!apiKey, isMasked: isMaskedKey });
      
      const response = await fetch('/api/settings/ai-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          aiEnabled,
          aiProvider,
          apiKey: isMaskedKey ? undefined : apiKey.trim() // Don't send masked key
        })
      })

      const data = await response.json();
      console.log('📥 Save response:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save AI configuration')
      }

      toast.success(`✅ ${aiProvider === 'openai' ? 'OpenAI' : 'Claude'} Configuration saved successfully!`)
      
      // Reload config to show masked key
      await fetchAIConfig();
      
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
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7 gap-2">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Sun className="h-4 w-4" />
            <span className="hidden sm:inline">Appearance</span>
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            <span className="hidden sm:inline">AI Config</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">Advanced</span>
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
                Configure OpenAI or Claude integration for all projects
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

                {/* AI Provider Selection */}
                {aiEnabled && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-base font-semibold">AI Provider</Label>
                      <p className="text-sm text-muted-foreground">
                        {apiKey && !isMaskedKey ? 'Auto-detected from your API key' : 'Choose which AI service to use'}
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <Button
                          type="button"
                          variant={aiProvider === 'openai' ? 'default' : 'outline'}
                          className="h-20 flex flex-col items-center justify-center gap-2"
                          onClick={() => setAiProvider('openai')}
                          disabled={apiKey && !isMaskedKey}
                        >
                          <Bot className="h-6 w-6" />
                          <span className="font-semibold">OpenAI</span>
                          <span className="text-xs">GPT-4o, GPT-4o-mini</span>
                        </Button>
                        <Button
                          type="button"
                          variant={aiProvider === 'claude' ? 'default' : 'outline'}
                          className="h-20 flex flex-col items-center justify-center gap-2"
                          onClick={() => setAiProvider('claude')}
                          disabled={apiKey && !isMaskedKey}
                        >
                          <Bot className="h-6 w-6" />
                          <span className="font-semibold">Claude</span>
                          <span className="text-xs">All Models (Auto-fallback)</span>
                        </Button>
                      </div>
                    </div>

                    {/* API Key Input */}
                    <div className="space-y-2">
                      <Label htmlFor="global-api-key" className="flex items-center gap-2 text-base font-semibold">
                        <Key className="h-5 w-5" />
                        {aiProvider === 'openai' ? 'OpenAI' : 'Claude'} API Key
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Add your {aiProvider === 'openai' ? 'OpenAI' : 'Anthropic Claude'} API key to enable AI features
                      </p>
                      <div className="flex gap-2">
                        <Input
                          id="global-api-key"
                          type={showApiKey ? 'text' : 'password'}
                          placeholder={aiProvider === 'openai' ? 'sk-proj-...' : 'sk-ant-...'}
                          value={apiKey}
                          onChange={(e) => {
                            const newKey = e.target.value;
                            setApiKey(newKey);
                            
                            // Auto-detect provider based on key prefix
                            if (newKey.startsWith('sk-ant-')) {
                              setAiProvider('claude');
                              console.log('🔍 Auto-detected Claude API key');
                            } else if (newKey.startsWith('sk-')) {
                              setAiProvider('openai');
                              console.log('🔍 Auto-detected OpenAI API key');
                            }
                          }}
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
                          href={aiProvider === 'openai' ? 'https://platform.openai.com/api-keys' : 'https://console.anthropic.com/'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-600 hover:underline font-semibold"
                        >
                          {aiProvider === 'openai' ? 'OpenAI Platform' : 'Anthropic Console'}
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

                    {/* Model Info */}
                    <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                      <Bot className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-900 dark:text-green-100">
                        <strong>Smart Model Selection:</strong> System automatically tries models in order until one works.
                        {aiProvider === 'claude' ? (
                          <div className="mt-2 text-xs space-y-1">
                            <div>1. Claude 3.5 Sonnet (Latest)</div>
                            <div>2. Claude 3.5 Sonnet (Stable)</div>
                            <div>3. Claude 3 Haiku (Fast & Free tier)</div>
                            <div>4. Claude 3 Sonnet (Fallback)</div>
                            <div>5. Claude 3 Opus (Most powerful)</div>
                          </div>
                        ) : (
                          <div className="mt-2 text-xs space-y-1">
                            <div>1. GPT-4o-mini (Fast & Cheap)</div>
                            <div>2. GPT-4o (Powerful)</div>
                            <div>3. GPT-4-turbo (Alternative)</div>
                          </div>
                        )}
                      </AlertDescription>
                    </Alert>

                    {/* Billing Info */}
                    <Alert className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
                      <Bot className="h-4 w-4 text-purple-600" />
                      <AlertDescription className="text-purple-900 dark:text-purple-100">
                        <strong>Billing:</strong> API usage will be charged to your {aiProvider === 'openai' ? 'OpenAI' : 'Claude'} account. Monitor usage at{' '}
                        <a
                          href={aiProvider === 'openai' ? 'https://platform.openai.com/usage' : 'https://console.anthropic.com/settings/billing'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline font-semibold"
                        >
                          {aiProvider === 'openai' ? 'OpenAI Dashboard' : 'Anthropic Console'}
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
                    <li>Add your {aiProvider === 'openai' ? 'OpenAI' : 'Claude'} API key above</li>
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

        {/* Notifications Settings */}
        <TabsContent value="notifications" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-blue-600" />
                Email Notifications
              </CardTitle>
              <CardDescription>
                Choose what email notifications you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="space-y-0.5">
                  <Label className="text-base font-semibold">Task Assignments</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when you're assigned to a new task
                  </p>
                </div>
                <Switch
                  checked={taskNotifications}
                  onCheckedChange={setTaskNotifications}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="space-y-0.5">
                  <Label className="text-base font-semibold">Project Updates</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive updates about project changes and milestones
                  </p>
                </div>
                <Switch
                  checked={projectNotifications}
                  onCheckedChange={setProjectNotifications}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="space-y-0.5">
                  <Label className="text-base font-semibold">Weekly Digest</Label>
                  <p className="text-sm text-muted-foreground">
                    Get a weekly summary of your tasks and projects
                  </p>
                </div>
                <Switch
                  checked={weeklyDigest}
                  onCheckedChange={setWeeklyDigest}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="space-y-0.5">
                  <Label className="text-base font-semibold">All Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Master toggle for all email notifications
                  </p>
                </div>
                <Switch
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>

              <Button 
                className="w-full" 
                disabled={isSaving}
                onClick={async () => {
                  setIsSaving(true)
                  try {
                    const response = await fetch('/api/settings/notifications', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify({
                        emailNotifications,
                        taskNotifications,
                        projectNotifications,
                        weeklyDigest
                      })
                    })
                    if (response.ok) {
                      toast.success('✅ Notification preferences saved!')
                    } else {
                      throw new Error('Failed to save')
                    }
                  } catch (error) {
                    toast.error('❌ Failed to save notification preferences')
                  } finally {
                    setIsSaving(false)
                  }
                }}
              >
                {isSaving ? 'Saving...' : 'Save Notification Preferences'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-green-600" />
                Push Notifications
              </CardTitle>
              <CardDescription>
                Real-time notifications in your browser
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!pushSupported ? (
                <Alert className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-900 dark:text-yellow-100">
                    <strong>Not Supported:</strong> Your browser doesn't support push notifications.
                  </AlertDescription>
                </Alert>
              ) : pushEnabled ? (
                <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-900 dark:text-green-100">
                    <strong>Enabled:</strong> You will receive real-time notifications for tasks, projects, and updates.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-900 dark:text-blue-100">
                    <strong>Enable Notifications:</strong> Click the button below to receive real-time updates.
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="space-y-0.5">
                  <Label className="text-base font-semibold">Browser Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified about tasks, projects, and important updates
                  </p>
                </div>
                <Button
                  onClick={handleEnablePushNotifications}
                  disabled={!pushSupported || pushEnabled || enablingPush}
                  variant={pushEnabled ? "outline" : "default"}
                  className={pushEnabled ? "" : "bg-green-600 hover:bg-green-700"}
                >
                  {enablingPush ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Enabling...
                    </>
                  ) : pushEnabled ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Enabled
                    </>
                  ) : (
                    <>
                      <Bell className="h-4 w-4 mr-2" />
                      Enable
                    </>
                  )}
                </Button>
              </div>
              
              {pushEnabled && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={async () => {
                    try {
                      const { sendTestNotification } = await import('@/lib/push-notifications')
                      await sendTestNotification()
                      toast.success('Test notification sent!')
                    } catch (error) {
                      toast.error('Failed to send test notification')
                    }
                  }}
                >
                  <Bell className="h-4 w-4 mr-2" />
                  Send Test Notification
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-red-600" />
                Two-Factor Authentication
              </CardTitle>
              <CardDescription>
                Add an extra layer of security to your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20">
                <div className="space-y-0.5">
                  <Label className="text-base font-semibold text-red-900 dark:text-red-100">Enable 2FA</Label>
                  <p className="text-sm text-red-800 dark:text-red-200">
                    Protect your account with two-factor authentication
                  </p>
                </div>
                <Switch
                  checked={twoFactorEnabled}
                  onCheckedChange={async (checked) => {
                    if (checked) {
                      // Enable 2FA - send code
                      try {
                        const response = await fetch('/api/auth/2fa/enable', {
                          method: 'POST',
                          credentials: 'include'
                        })
                        if (response.ok) {
                          setShow2FADialog(true)
                          toast.success('📧 Verification code sent to your email!')
                        } else {
                          throw new Error('Failed to send code')
                        }
                      } catch (error) {
                        toast.error('❌ Failed to enable 2FA')
                      }
                    } else {
                      // Disable 2FA
                      try {
                        const response = await fetch('/api/auth/2fa/disable', {
                          method: 'POST',
                          credentials: 'include'
                        })
                        if (response.ok) {
                          setTwoFactorEnabled(false)
                          toast.success('❌ 2FA Disabled')
                        } else {
                          throw new Error('Failed to disable')
                        }
                      } catch (error) {
                        toast.error('❌ Failed to disable 2FA')
                      }
                    }
                  }}
                />
              </div>

              {twoFactorEnabled && (
                <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                  <AlertCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-900 dark:text-green-100">
                    <strong>✅ 2FA is Active:</strong> Your account is protected with two-factor authentication.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Laptop className="h-5 w-5 text-purple-600" />
                Active Sessions
              </CardTitle>
              <CardDescription>
                Manage your active login sessions across devices
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {sessions.length > 0 ? (
                  sessions.map((session: any, i: number) => (
                    <div key={session.id} className={`flex items-center justify-between p-4 rounded-lg border ${i === 0 ? 'bg-green-50 dark:bg-green-900/20 border-green-200' : ''}`}>
                      <div className="flex items-center gap-3">
                        {session.deviceType === 'mobile' ? (
                          <Smartphone className="h-5 w-5 text-gray-600" />
                        ) : (
                          <Laptop className="h-5 w-5 text-green-600" />
                        )}
                        <div>
                          <p className="font-semibold">{session.deviceName}</p>
                          <p className="text-sm text-muted-foreground">
                            {session.browser} • {session.location} • {new Date(session.lastActive).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {i === 0 ? (
                        <span className="text-xs bg-green-600 text-white px-2 py-1 rounded-full">Active</span>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={async () => {
                            try {
                              const response = await fetch(`/api/settings/sessions?sessionId=${session.id}`, {
                                method: 'DELETE',
                                credentials: 'include'
                              })
                              if (response.ok) {
                                toast.success('Session terminated')
                                fetchSessions()
                              }
                            } catch (error) {
                              toast.error('Failed to terminate session')
                            }
                          }}
                        >
                          Revoke
                        </Button>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-between p-4 rounded-lg border bg-green-50 dark:bg-green-900/20 border-green-200">
                    <div className="flex items-center gap-3">
                      <Laptop className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-semibold">Current Session</p>
                        <p className="text-sm text-muted-foreground">Windows • Chrome • {new Date().toLocaleDateString()}</p>
                      </div>
                    </div>
                    <span className="text-xs bg-green-600 text-white px-2 py-1 rounded-full">Active</span>
                  </div>
                )}
              </div>

              <Button 
                variant="destructive" 
                className="w-full" 
                onClick={async () => {
                  try {
                    const response = await fetch('/api/settings/sessions', {
                      method: 'DELETE',
                      credentials: 'include'
                    })
                    if (response.ok) {
                      toast.success('All other sessions terminated')
                      fetchSessions()
                    }
                  } catch (error) {
                    toast.error('Failed to terminate sessions')
                  }
                }}
              >
                Terminate All Other Sessions
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-600" />
                Login History
              </CardTitle>
              <CardDescription>
                Recent login activity on your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingLoginHistory ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : loginHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p>No login history found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {loginHistory.map((login) => (
                    <div key={login.id} className="flex items-center justify-between p-3 rounded-lg border text-sm">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${login.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                        <div>
                          <p className="font-medium">
                            {new Date(login.createdAt).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {login.location || 'Unknown location'} • {login.deviceType} • {login.browser || 'Unknown browser'}
                          </p>
                        </div>
                      </div>
                      {login.isActive && (
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                          Active
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>


        {/* Advanced Settings */}
        <TabsContent value="advanced" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-purple-600" />
                Data Management
              </CardTitle>
              <CardDescription>
                Export or delete your account data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg border bg-blue-50 dark:bg-blue-900/20 border-blue-200">
                <div className="flex items-start gap-3">
                  <Download className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100">Export Your Data</h4>
                    <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                      Download a copy of all your data including projects, tasks, and settings
                    </p>
                    <Button 
                      variant="outline" 
                      className="mt-3" 
                      disabled={isSaving}
                      onClick={async () => {
                        setIsSaving(true)
                        try {
                          const response = await fetch('/api/user/export-data', {
                            credentials: 'include'
                          })
                          if (response.ok) {
                            const blob = await response.blob()
                            const url = window.URL.createObjectURL(blob)
                            const a = document.createElement('a')
                            a.href = url
                            a.download = `4dbim-data-export-${new Date().toISOString().split('T')[0]}.json`
                            document.body.appendChild(a)
                            a.click()
                            window.URL.revokeObjectURL(url)
                            document.body.removeChild(a)
                            toast.success('📦 Data exported successfully!')
                          } else {
                            throw new Error('Failed to export')
                          }
                        } catch (error) {
                          toast.error('❌ Failed to export data')
                        } finally {
                          setIsSaving(false)
                        }
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {isSaving ? 'Exporting...' : 'Request Data Export'}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg border bg-red-50 dark:bg-red-900/20 border-red-200">
                <div className="flex items-start gap-3">
                  <Trash2 className="h-5 w-5 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-red-900 dark:text-red-100">Delete Account</h4>
                    <p className="text-sm text-red-800 dark:text-red-200 mt-1">
                      Permanently delete your account and all associated data. This action cannot be undone.
                    </p>
                    <Button variant="destructive" className="mt-3" onClick={() => toast.error('⚠️ Account deletion requires admin approval')}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete My Account
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-orange-600" />
                API Access
              </CardTitle>
              <CardDescription>
                Generate API keys for external integrations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {user && !['admin', 'manager'].includes(user.role) ? (
                <Alert className="bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-900 dark:text-orange-100">
                    <strong>Developer Feature:</strong> API access is only available for Admin and Manager roles.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Your API Keys</Label>
                      <Button 
                        size="sm" 
                        onClick={() => setShowNewApiKeyDialog(true)}
                        disabled={loadingApiKeys}
                      >
                        <Key className="h-4 w-4 mr-2" />
                        Generate New Key
                      </Button>
                    </div>
                    
                    {loadingApiKeys ? (
                      <div className="flex items-center justify-center py-8">
                        <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                      </div>
                    ) : apiKeys.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground border rounded-lg">
                        <Key className="h-12 w-12 mx-auto mb-2 opacity-30" />
                        <p>No API keys generated yet</p>
                        <p className="text-xs mt-1">Generate your first API key to get started</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {apiKeys.map((key) => (
                          <div key={key.id} className="flex items-center justify-between p-3 rounded-lg border">
                            <div className="flex-1">
                              <p className="font-medium">{key.name}</p>
                              <p className="text-xs text-muted-foreground font-mono">
                                {key.keyPrefix}••••••••••••••••••••
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Created: {new Date(key.createdAt).toLocaleDateString()}
                                {key.lastUsedAt && ` • Last used: ${new Date(key.lastUsedAt).toLocaleDateString()}`}
                              </p>
                            </div>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => handleRevokeApiKey(key.id)}
                            >
                              Revoke
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button variant="outline" className="w-full" onClick={() => toast.info('📖 API documentation coming soon!')}>
                    View API Documentation
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-600" />
                Integrations
              </CardTitle>
              <CardDescription>
                Connect with third-party services
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingIntegrations ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : (
                <div className="space-y-3">
                  {[
                    { type: 'slack', name: 'Slack', icon: '💬' },
                    { type: 'teams', name: 'Microsoft Teams', icon: '👥' },
                    { type: 'jira', name: 'Jira', icon: '📋' },
                    { type: 'webhook', name: 'Webhooks', icon: '🔗' },
                  ].map((integrationType) => {
                    const connected = integrations.find(i => i.type === integrationType.type && i.isActive)
                    return (
                      <div key={integrationType.type} className="flex items-center justify-between p-4 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{integrationType.icon}</span>
                          <div>
                            <p className="font-semibold">{integrationType.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {connected ? `Connected as "${connected.name}"` : 'Not Connected'}
                            </p>
                          </div>
                        </div>
                        {connected ? (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleDisconnectIntegration(connected.id)}
                          >
                            Disconnect
                          </Button>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleConnectIntegration(integrationType.name)}
                          >
                            Connect
                          </Button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New API Key Dialog */}
      <Dialog open={showNewApiKeyDialog} onOpenChange={setShowNewApiKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>🔑 Generate New API Key</DialogTitle>
            <DialogDescription>
              Create a new API key for external integrations
            </DialogDescription>
          </DialogHeader>
          {generatedApiKey ? (
            <div className="space-y-4 py-4">
              <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-900 dark:text-green-100">
                  <strong>API Key Generated!</strong> Copy it now - you won't be able to see it again.
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                <Label>Your API Key</Label>
                <div className="flex gap-2">
                  <Input
                    value={generatedApiKey}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedApiKey)
                      toast.success('✅ API key copied to clipboard!')
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </div>
              <Button
                className="w-full"
                onClick={() => {
                  setGeneratedApiKey('')
                  setShowNewApiKeyDialog(false)
                }}
              >
                Done
              </Button>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="api-key-name">API Key Name</Label>
                <Input
                  id="api-key-name"
                  placeholder="e.g., Production API, Mobile App"
                  value={newApiKeyName}
                  onChange={(e) => setNewApiKeyName(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Give your API key a descriptive name to identify its purpose
                </p>
              </div>
              <Button
                className="w-full"
                disabled={isSaving || !newApiKeyName.trim()}
                onClick={handleGenerateApiKey}
              >
                {isSaving ? 'Generating...' : 'Generate API Key'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 2FA Verification Dialog */}
      <Dialog open={show2FADialog} onOpenChange={setShow2FADialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>🔐 Verify Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Enter the 6-digit code sent to your email
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="2fa-code">Verification Code</Label>
              <Input
                id="2fa-code"
                type="text"
                maxLength={6}
                placeholder="000000"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                className="text-center text-2xl tracking-widest font-mono"
              />
              <p className="text-xs text-muted-foreground text-center">
                Code expires in 10 minutes
              </p>
            </div>
            <Button
              className="w-full"
              disabled={verifying2FA || twoFactorCode.length !== 6}
              onClick={async () => {
                setVerifying2FA(true)
                try {
                  const response = await fetch('/api/auth/2fa/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ code: twoFactorCode })
                  })
                  
                  if (response.ok) {
                    setTwoFactorEnabled(true)
                    setShow2FADialog(false)
                    setTwoFactorCode('')
                    toast.success('✅ 2FA enabled successfully!')
                  } else {
                    const data = await response.json()
                    toast.error(`❌ ${data.error || 'Invalid code'}`)
                  }
                } catch (error) {
                  toast.error('❌ Failed to verify code')
                } finally {
                  setVerifying2FA(false)
                }
              }}
            >
              {verifying2FA ? 'Verifying...' : 'Verify & Enable 2FA'}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={async () => {
                try {
                  const response = await fetch('/api/auth/2fa/enable', {
                    method: 'POST',
                    credentials: 'include'
                  })
                  if (response.ok) {
                    toast.success('📧 New code sent!')
                  }
                } catch (error) {
                  toast.error('❌ Failed to resend code')
                }
              }}
            >
              Resend Code
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
