'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Building2 } from 'lucide-react'

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
    // Fetch team leaders for Team Member selection
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
      
      // Team Leader creates new team
      if (role === 'team_leader' && newTeamName) {
        requestBody.newTeamName = newTeamName.trim()
      }
      // Team Member joins team leader's team
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed')
      }

      router.push('/login')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 flex flex-col items-center">
          <div className="flex items-center space-x-2">
            <Building2 className="h-8 w-8 text-blue-600" />
            <CardTitle className="text-2xl font-bold">4D BIM</CardTitle>
          </div>
          <CardDescription>
            Create your account to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
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
                <Input
                  id="newTeamName"
                  type="text"
                  placeholder="Enter your team name (e.g., Team Alpha)"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  required
                />
                <p className="text-xs text-gray-500">
                  A new team will be created with you as the leader
                </p>
              </div>
            )}
            {role === 'viewer' && teamLeaders.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="teamLeader">Select Team Leader</Label>
                <Select value={teamLeaderId} onValueChange={setTeamLeaderId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose your team leader" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamLeaders.map((leader) => (
                      <SelectItem key={leader.id} value={leader.id.toString()}>
                        {leader.fullName} ({leader.email})
                        {leader.teamName && ` - ${leader.teamName}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  You will join this team leader&apos;s team as a member
                </p>
              </div>
            )}
            {role === 'viewer' && teamLeaders.length === 0 && (
              <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md">
                No team leaders available yet. Please contact your administrator.
              </div>
            )}

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Sign up'}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm">
            <span className="text-gray-500">Already have an account? </span>
            <Link href="/login" className="text-blue-600 hover:underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}