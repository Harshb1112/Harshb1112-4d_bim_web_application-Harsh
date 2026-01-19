'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { clearAllAuthTokens } from '@/lib/clear-auth'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    clearAllAuthTokens()

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Login failed')
      }

      document.cookie = `token=${data.token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`
      toast.success('Login successful!', {
        description: `Welcome back, ${data.user.fullName}.`,
      })
      router.push('/dashboard')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred'
      toast.error('Login Failed', {
        description: errorMessage,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Top right logo */}
      <div className="absolute top-3 right-2 flex items-center gap-3">
        <Image src="/assets/bimboss-logo.png" alt="BimBoss Logo" width={200} height={150} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="space-y-1 flex flex-col items-center pb-2">
            <div className="w-14 h-14 bg-blue-900 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800">BIM 4D Scheduler</h2>
            <CardDescription>Sign in to manage your construction projects</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
              <button className="flex-1 py-2 px-4 bg-white rounded-md shadow-sm text-sm font-medium text-gray-800">
                Sign In
              </button>
              <Link href="/register" className="flex-1 py-2 px-4 text-sm font-medium text-gray-500 text-center hover:text-gray-700">
                Sign Up
              </Link>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link href="/forgot-password" className="text-xs text-blue-900 hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-11" />
              </div>
              <Button type="submit" className="w-full h-11 bg-blue-900 hover:bg-blue-800" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>

      </div>

      {/* Bottom logo - fixed at bottom */}
      <div className="pb-7 flex justify-center items-center gap-3">
        <Image src="/assets/bimboss-logo.png" alt="BimBoss Logo" width={200} height={150} />
      </div>
    </div>
  )
}
