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
          credentials: 'include'
        })
        if (response.ok) {
          const data = await response.json()
          const fetchedTeams = data.teams || []
          console.log('✅ Fetched teams:', fetchedTeams.length)
          console.log('✅ First team members:', fetchedTeams[0]?.members?.length)
          setTeams(fetchedTeams)
          
          // Auto-select first team or project's team
          if (fetchedTeams.length > 0) {
            const teamToSelect = project.teamId 
              ? fetchedTeams.find((t: any) => t.id === project.teamId)?.id.toString()
              : fetchedTeams[0].id.toString()
            
            if (teamToSelect) {
              console.log('✅ Auto-selecting team:', teamToSelect)
              setSelectedTeamId(teamToSelect)
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch teams:', error)
      }
    }
    fetchData()
  }, [project.teamId])

  // Fetch team members when team is selected OR teams change
  useEffect(() => {
    if (selectedTeamId && teams.length > 0) {
      fetchTeamMembers(selectedTeamId)
    }
  }, [selectedTeamId, teams])

  const fetchTeamMembers = async (teamId: string) => {
    const team = teams.find(t => t.id.toString() === teamId)
    if (team && team.members) {
      console.log('Team members found:', team.members)
      
      // Sort members by role priority: Admin > Manager > Team Leader > Member
      const roleOrder: { [key: string]: number } = {
        'admin': 1,
        'manager': 2,
        'team_leader': 3,
        'leader': 3,
        'viewer': 4,
        'member': 4
      }
      
      const sortedMembers = [...team.members].sort((a, b) => {
        const roleA = roleOrder[a.user.role] || 999
        const roleB = roleOrder[b.user.role] || 999
        
        if (roleA !== roleB) {
          return roleA - roleB
        }
        
        // If same role, sort by name
        return a.user.fullName.localeCompare(b.user.fullName)
      })
      
      setTeamMembers(sortedMembers)
    } else {
      console.log('No members found for team:', teamId)
      setTeamMembers([])
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
            'Content-Type': 'application/json'
          },
          credentials: 'include',
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

  const handlePromote = async (membershipId: number, seniority: string | null) => {
    if (!selectedTeamId) return
    
    const promise = new Promise(async (resolve, reject) => {
      try {
        const response = await fetch(`/api/teams/${selectedTeamId}/members/${membershipId}/promote`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({ seniority }),
        })

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'Failed to update seniority')
        }

        // Refresh team members
        await fetchTeamMembers(selectedTeamId)
        resolve(data.message || 'Seniority updated successfully')
      } catch (error) {
        reject(error)
      }
    })

    toast.promise(promise, {
      loading: 'Updating seniority...',
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
            'Content-Type': 'application/json'
          },
          credentials: 'include',
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

  const getMemberRoleIcon = (userRole: string, teamRole: string, seniority?: string | null) => {
    // Admin - always red shield
    if (userRole === 'admin' || teamRole === 'admin') {
      return <ShieldCheck className="h-5 w-5 text-red-600" />
    }
    
    // Manager with seniority levels
    if (userRole === 'manager' || teamRole === 'manager') {
      if (seniority === 'senior') return <ShieldCheck className="h-5 w-5 text-purple-800" /> // Dark purple for senior
      if (seniority === 'junior') return <ShieldCheck className="h-5 w-5 text-purple-400" /> // Light purple for junior
      return <ShieldCheck className="h-5 w-5 text-purple-600" /> // Normal purple
    }
    
    // Team Leader with seniority levels
    if (userRole === 'team_leader' || teamRole === 'leader') {
      if (seniority === 'senior') return <Crown className="h-5 w-5 text-yellow-700" /> // Dark gold for senior
      if (seniority === 'junior') return <Crown className="h-5 w-5 text-yellow-400" /> // Light gold for junior
      return <Crown className="h-5 w-5 text-yellow-600" /> // Normal gold
    }
    
    // Team Member with seniority levels
    if (userRole === 'viewer' || teamRole === 'member') {
      if (seniority === 'senior') return <Users className="h-5 w-5 text-blue-800" /> // Dark blue for senior
      if (seniority === 'junior') return <Users className="h-5 w-5 text-blue-400" /> // Light blue for junior
      return <Users className="h-5 w-5 text-blue-600" /> // Normal blue
    }
    
    return <Eye className="h-5 w-5 text-gray-600" />
  }

  const getRoleDisplayName = (userRole: string, teamRole: string, seniority?: string | null) => {
    // Admin never has seniority
    if (userRole === 'admin' || teamRole === 'admin') {
      return 'Admin'
    }
    
    // Manager with seniority
    if (userRole === 'manager' || teamRole === 'manager') {
      if (seniority === 'senior') return 'Senior Manager'
      if (seniority === 'junior') return 'Junior Manager'
      return 'Manager'
    }
    
    // Team Leader with seniority
    if (teamRole === 'leader') {
      if (seniority === 'senior') return 'Senior Team Leader'
      if (seniority === 'junior') return 'Junior Team Leader'
      return 'Team Leader'
    }
    
    // Team Member with seniority
    if (userRole === 'viewer' || teamRole === 'member') {
      if (seniority === 'senior') return 'Senior Team Member'
      if (seniority === 'junior') return 'Junior Team Member'
      return 'Team Member'
    }
    
    return teamRole
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
            {(currentUserRole === 'admin' || currentUserRole === 'manager' || currentUserRole === 'team_leader') && teams.length > 1 && (
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
            {teams.length === 1 && selectedTeamId && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm font-medium text-blue-900">
                  Team: {teams[0].name} ({teams[0].code})
                </p>
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
                          {getMemberRoleIcon(member.user.role, member.role, member.seniority)}
                        </div>
                        <div>
                          <p className="font-medium">{member.user.fullName}</p>
                          <p className="text-sm text-gray-500">{member.user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="text-sm font-medium text-gray-700">
                          {getRoleDisplayName(member.user.role, member.role, member.seniority)}
                        </span>
                        {/* Admin and Manager can manage members */}
                        {(currentUserRole === 'admin' || currentUserRole === 'manager') && member.id > 0 && (
                          <div className="flex items-center space-x-2">
                            {/* Seniority dropdown - Only Admin can change */}
                            {currentUserRole === 'admin' && (member.role === 'leader' || member.role === 'manager' || member.role === 'member') && (
                              <Select 
                                value={member.seniority || 'normal'} 
                                onValueChange={(value) => handlePromote(member.id, value === 'normal' ? null : value)}
                              >
                                <SelectTrigger className="h-8 w-24 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="senior">Senior</SelectItem>
                                  <SelectItem value="normal">Normal</SelectItem>
                                  <SelectItem value="junior">Junior</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                            
                            {/* Remove button */}
                            {/* Admin can remove anyone except other Admins */}
                            {/* Manager can remove Team Leaders and Members only */}
                            {(
                              (currentUserRole === 'admin' && member.user.role !== 'admin') ||
                              (currentUserRole === 'manager' && member.user.role !== 'admin' && member.user.role !== 'manager')
                            ) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => handleRemoveMember(member.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        )}
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
      {(currentUserRole === 'admin' || currentUserRole === 'manager') && (
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <UserPlus className="h-5 w-5" />
                <span>Invite New {currentUserRole === 'admin' ? 'User' : 'Team Member'}</span>
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
                <Label htmlFor="teamSelect">Select Team</Label>
                <Select value={selectedTeamId} onValueChange={setSelectedTeamId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose team to add member to" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id.toString()}>
                        {team.name} ({team.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Member will be added to this team
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="memberRole">
                  {currentUserRole === 'admin' ? 'User Role' : 'Team Role'}
                </Label>
                <Select value={memberRole} onValueChange={setMemberRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currentUserRole === 'admin' && (
                      <>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                      </>
                    )}
                    {(currentUserRole === 'admin' || currentUserRole === 'manager') && (
                      <>
                        <SelectItem value="leader">Team Leader</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
                {currentUserRole === 'admin' && (
                  <p className="text-xs text-gray-500">
                    As Admin, you can create users with any role
                  </p>
                )}
                {currentUserRole === 'manager' && (
                  <p className="text-xs text-gray-500">
                    As Manager, you can create Team Leaders and Members
                  </p>
                )}
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
      )}
    </div>
  )
}