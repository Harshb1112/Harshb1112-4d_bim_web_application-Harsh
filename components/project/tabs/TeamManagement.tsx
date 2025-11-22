/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UserPlus, Trash2, Users, ShieldCheck, Eye, Crown } from 'lucide-react'
import { toast } from 'sonner'

interface TeamManagementProps {
  project: any
}

export default function TeamManagement({ project: initialProject }: TeamManagementProps) {
  const [project, setProject] = useState(initialProject)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [memberRole, setMemberRole] = useState('member')
  const [selectedTeamId, setSelectedTeamId] = useState(project.teamId?.toString() || '')
  const [teams, setTeams] = useState<any[]>([])
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState('')

  // Fetch teams and current user role
  useEffect(() => {
    const fetchData = async () => {
      const token = document.cookie.split('token=')[1]?.split(';')[0]
      if (!token) return

      // Get current user role from token
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        setCurrentUserRole(payload.role)
      } catch (e) {
        console.error('Failed to parse token:', e)
      }

      // Fetch teams
      try {
        const response = await fetch('/api/teams', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (response.ok) {
          const data = await response.json()
          setTeams(data.teams || [])
        }
      } catch (error) {
        console.error('Failed to fetch teams:', error)
      }
    }
    fetchData()
  }, [])

  // Fetch team members when team is selected
  useEffect(() => {
    if (selectedTeamId) {
      fetchTeamMembers(selectedTeamId)
    }
  }, [selectedTeamId])

  const fetchTeamMembers = async (teamId: string) => {
    const token = document.cookie.split('token=')[1]?.split(';')[0]
    const team = teams.find(t => t.id.toString() === teamId)
    if (team && team.members) {
      setTeamMembers(team.members)
    }
  }

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedTeamId) {
      toast.error('Please select a team')
      return
    }
    
    setLoading(true)
    setTempPassword(null)

    const promise = new Promise(async (resolve, reject) => {
      try {
        const response = await fetch(`/api/teams/${selectedTeamId}/members`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${document.cookie.split('token=')[1]?.split(';')[0]}`
          },
          body: JSON.stringify({ fullName, email, memberRole }),
        })

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'Failed to add member')
        }

        // Refresh team members
        await fetchTeamMembers(selectedTeamId)
        
        setFullName('')
        setEmail('')
        setMemberRole('member')

        if (data.temporaryPassword) {
          setTempPassword(data.temporaryPassword)
        }
        
        resolve(data.message || 'Member added successfully')
      } catch (error) {
        reject(error)
      } finally {
        setLoading(false)
      }
    })

    toast.promise(promise, {
      loading: 'Adding member...',
      success: (message) => `${message}`,
      error: (err) => `Error: ${err.message}`,
    })
  }

  const handleRemoveMember = async (membershipId: number) => {
    if (!selectedTeamId) return
    
    const promise = new Promise(async (resolve, reject) => {
      try {
        const response = await fetch(`/api/teams/${selectedTeamId}/members`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${document.cookie.split('token=')[1]?.split(';')[0]}`
          },
          body: JSON.stringify({ membershipId }),
        })

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'Failed to remove member')
        }

        // Refresh team members
        await fetchTeamMembers(selectedTeamId)
        resolve('Member removed successfully.')
      } catch (error) {
        reject(error)
      }
    })

    toast.promise(promise, {
      loading: 'Removing member...',
      success: (message) => `${message}`,
      error: (err) => `Error: ${err.message}`,
    })
  }

  const getMemberRoleIcon = (role: string) => {
    switch (role) {
      case 'leader': return <Crown className="h-5 w-5 text-yellow-600" />
      case 'member': return <Users className="h-5 w-5 text-blue-600" />
      default: return <Eye className="h-5 w-5 text-gray-600" />
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Team Members</span>
            </CardTitle>
            <CardDescription>
              Manage team members. {currentUserRole === 'admin' || currentUserRole === 'manager' ? 'Select a team to view and manage its members.' : 'View and manage your team members.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(currentUserRole === 'admin' || currentUserRole === 'manager') && (
              <div className="mb-4">
                <Label htmlFor="teamSelect">Select Team</Label>
                <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id.toString()}>
                        {team.name} ({team.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {selectedTeamId ? (
              <div className="space-y-4">
                {teamMembers.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No members in this team yet.</p>
                ) : (
                  teamMembers.map((member: any) => (
                    <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          {getMemberRoleIcon(member.role)}
                        </div>
                        <div>
                          <p className="font-medium">{member.user.fullName}</p>
                          <p className="text-sm text-gray-500">{member.user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="text-sm capitalize text-gray-600">{member.role}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleRemoveMember(member.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">Please select a team to view members.</p>
            )}
          </CardContent>
        </Card>
      </div>
      <div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <UserPlus className="h-5 w-5" />
              <span>Invite New Member</span>
            </CardTitle>
            <CardDescription>
              Add a new user to this project by their email address. If the user doesn&apos;t exist, an account will be created.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddMember} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="memberRole">Team Role</Label>
                <Select value={memberRole} onValueChange={setMemberRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="leader">Team Leader</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Adding...' : 'Add Member'}
              </Button>
            </form>
            {tempPassword && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800">
                <p className="font-medium">Temporary Password Generated:</p>
                <p className="font-mono break-all">{tempPassword}</p>
                <p className="mt-2">Please share this with the new user. In a production environment, an email would be sent automatically.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}