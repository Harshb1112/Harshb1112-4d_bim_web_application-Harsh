'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function RegisterPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('viewer')
  const [teamLeaderId, setTeamLeaderId] = useState('')
  const [teamLeaders, setTeamLeaders] = useState<Array<{ id: number; fullName: string; email: string; teamId: number | null; teamName: string | null }>>([])
  const [newTeamName, setNewTeamName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    fetch('/api/users/team-leaders')
      .then(res => res.json())
      .then(data => {
        if (data.teamLeaders) {
          setTeamLeaders(data.teamLeaders)
        }
      })
      .catch(err => console.error('Failed to load team leaders:', err))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const requestBody: any = { fullName, email, password, role }
      
      if (role === 'team_leader' && newTeamName) {
        requestBody.newTeamName = newTeamName.trim()
      }
      else if (role === 'viewer' && teamLeaderId) {
        const selectedLeader = teamLeaders.find(l => l.id === parseInt(teamLeaderId))
        if (selectedLeader?.teamId) {
          requestBody.teamId = selectedLeader.teamId
          requestBody.teamRole = 'member'
        } else {
          throw new Error('Selected team leader does not have a team yet')
        }
      }

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Registration failed')
      router.push('/login')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Top right logo */}
      <div className="absolute top-6 right-8 flex items-center gap-3">
        <Image src="/assets/bimboss-logo.png" alt="BimBoss Logo" width={70} height={70} />
        <div className="text-right">
          <p className="text-blue-900 font-bold text-xl">BIMBOSS</p>
          <p className="text-teal-600 text-xs font-semibold tracking-wider">CONSULTANTS</p>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="space-y-1 flex flex-col items-center pb-2">
            <div className="w-14 h-14 bg-blue-900 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800">BIM 4D Scheduler</h2>
            <CardDescription>Create your account to get started</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
              <Link href="/login" className="flex-1 py-2 px-4 text-sm font-medium text-gray-500 text-center hover:text-gray-700">
                Sign In
              </Link>
              <button className="flex-1 py-2 px-4 bg-white rounded-md shadow-sm text-sm font-medium text-gray-800">
                Sign Up
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input id="fullName" type="text" placeholder="Enter your full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Team Member</SelectItem>
                    <SelectItem value="team_leader">Team Leader</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {role === 'team_leader' && (
                <div className="space-y-2">
                  <Label htmlFor="newTeamName">Team Name</Label>
                  <Input id="newTeamName" type="text" placeholder="Enter your team name" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} required className="h-11" />
                  <p className="text-xs text-gray-500">A new team will be created with you as the leader</p>
                </div>
              )}
              {role === 'viewer' && teamLeaders.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="teamLeader">Select Team Leader</Label>
                  <Select value={teamLeaderId} onValueChange={setTeamLeaderId}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Choose your team leader" />
                    </SelectTrigger>
                    <SelectContent>
                      {teamLeaders.map((leader) => (
                        <SelectItem key={leader.id} value={leader.id.toString()}>
                          {leader.fullName} {leader.teamName && `- ${leader.teamName}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {role === 'viewer' && teamLeaders.length === 0 && (
                <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md">
                  No team leaders available yet. Please contact your administrator.
                </div>
              )}
              {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>}
              <Button type="submit" className="w-full h-11 bg-blue-900 hover:bg-blue-800" disabled={loading}>
                {loading ? 'Creating account...' : 'Sign Up'}
              </Button>
            </form>
          </CardContent>
        </Card>

      </div>

      {/* Bottom logo - fixed at bottom */}
      <div className="pb-8 flex justify-center items-center gap-4">
        <Image src="/assets/bimboss-logo.png" alt="BimBoss Logo" width={80} height={80} />
        <div>
          <p className="text-blue-900 font-bold text-2xl tracking-wide">BIMBOSS</p>
          <p className="text-teal-600 text-sm font-semibold tracking-widest">CONSULTANTS</p>
        </div>
      </div>
    </div>
  )
}
