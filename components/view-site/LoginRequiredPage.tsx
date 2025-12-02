'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Eye, EyeOff, Camera, Shield, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

interface LoginRequiredPageProps {
  projectId: string
  projectName: string
}

export default function LoginRequiredPage({ projectId, projectName }: LoginRequiredPageProps) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !password) {
      toast.error('Please enter email and password')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Login successful!')
        // Refresh the page to load the site view
        window.location.reload()
      } else {
        toast.error(data.error || 'Login failed')
      }
    } catch (error) {
      toast.error('Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    router.push(`/project/${projectId}`)
  }

  const handleGoToLogin = () => {
    router.push(`/login?redirect=/project/${projectId}/view-site`)
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      {/* Background with blur effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
      </div>

      {/* Login Card */}
      <Card className="relative z-10 w-full max-w-md bg-gray-800 border-gray-700 text-white shadow-2xl">
        <CardHeader className="text-center pb-2">
          {/* Lock Icon */}
          <div className="mx-auto mb-4 w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center">
            <Lock className="h-8 w-8 text-red-500" />
          </div>

          <CardTitle className="text-2xl font-bold text-white">
            Sign in to View Live Site
          </CardTitle>

          <CardDescription className="text-gray-400 mt-2">
            You must be logged in to access the live 360° camera feed and historical timelapse.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Security Notice */}
          <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-lg p-3 flex items-start gap-3">
            <Shield className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="text-yellow-200 font-medium">Secure Access Required</p>
              <p className="text-yellow-300/70 text-xs mt-1">
                Unauthorized users cannot view the construction site. Login is mandatory for security.
              </p>
            </div>
          </div>

          {/* Project Info */}
          <div className="bg-gray-700/50 rounded-lg p-3 flex items-center gap-3">
            <Camera className="h-5 w-5 text-blue-400" />
            <div>
              <p className="text-sm text-gray-300">Viewing site for:</p>
              <p className="font-medium text-white">{projectName}</p>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-300">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-300">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
                onClick={handleCancel}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </div>
          </form>

          {/* Alternative: Go to main login page */}
          <div className="text-center pt-2">
            <button
              onClick={handleGoToLogin}
              className="text-sm text-blue-400 hover:text-blue-300 underline"
            >
              Go to main login page
            </button>
          </div>

          {/* Warning */}
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500 pt-2">
            <AlertTriangle className="h-3 w-3" />
            <span>All access is logged for security purposes</span>
          </div>
        </CardContent>
      </Card>

      {/* Camera illustration in background */}
      <div className="absolute bottom-10 right-10 opacity-10">
        <Camera className="h-48 w-48 text-white" />
      </div>
    </div>
  )
}
