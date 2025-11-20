/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UserPlus, Trash2, Users, ShieldCheck, Eye } from 'lucide-react'
import { toast } from 'sonner'

interface TeamManagementProps {
  project: any
}

export default function TeamManagement({ project: initialProject }: TeamManagementProps) {
  const [project, setProject] = useState(initialProject)
  const [fullName, setFullName] = useState('') // New state for full name
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('viewer')
  const [loading, setLoading] = useState(false)
  const [tempPassword, setTempPassword] = useState<string | null>(null)

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setTempPassword(null) // Clear previous temporary password

    const promise = new Promise(async (resolve, reject) => {
      try {
        const response = await fetch(`/api/projects/${project.id}/members`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${document.cookie.split('token=')[1]?.split(';')[0]}`
          },
          body: JSON.stringify({ fullName, email, role }), // Include fullName
        })

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'Failed to add member')
        }

        setProject((prev: any) => ({
          ...prev,
          projectUsers: [...prev.projectUsers, data.member],
        }))
        setFullName('')
        setEmail('')
        setRole('viewer')

        if (data.temporaryPassword) {
          setTempPassword(data.temporaryPassword)
          resolve(`New user ${data.member.user.fullName} created and added. Temporary password: ${data.temporaryPassword}`)
        } else {
          resolve(`Successfully added ${data.member.user.fullName} to the project.`)
        }
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

  const handleRemoveMember = async (projectUserId: number) => {
    const promise = new Promise(async (resolve, reject) => {
      try {
        const response = await fetch(`/api/projects/${project.id}/members`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${document.cookie.split('token=')[1]?.split(';')[0]}`
          },
          body: JSON.stringify({ projectUserId }),
        })

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'Failed to remove member')
        }

        setProject((prev: any) => ({
          ...prev,
          projectUsers: prev.projectUsers.filter((pu: any) => pu.id !== projectUserId),
        }))
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

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <ShieldCheck className="h-5 w-5 text-red-600" />
      case 'manager': return <Users className="h-5 w-5 text-blue-600" />
      case 'viewer': return <Eye className="h-5 w-5 text-gray-600" />
      default: return null
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Project Team Members</span>
            </CardTitle>
            <CardDescription>
              Manage who has access to this project and their roles.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {project.projectUsers.map((pu: any) => (
                <div key={pu.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      {getRoleIcon(pu.role)}
                    </div>
                    <div>
                      <p className="font-medium">{pu.user.fullName}</p>
                      <p className="text-sm text-gray-500">{pu.user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm capitalize text-gray-600">{pu.role}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleRemoveMember(pu.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
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
                <Label htmlFor="role">Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
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