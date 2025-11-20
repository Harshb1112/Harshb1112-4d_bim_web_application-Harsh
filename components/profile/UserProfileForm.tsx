"use client"

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface UserProfileFormProps {
  user: {
    id: number
    fullName: string
    email: string
    role: string
  }
  isPasswordForm?: boolean
}

export default function UserProfileForm({ user, isPasswordForm = false }: UserProfileFormProps) {
  const [fullName, setFullName] = useState(user.fullName)
  const [email, setEmail] = useState(user.email)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const promise = new Promise(async (resolve, reject) => {
      try {
        const token = document.cookie.split('token=')[1]?.split(';')[0]
        const response = await fetch('/api/users/me', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ fullName, email }),
        })

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'Failed to update profile')
        }

        resolve(data.message)
      } catch (error) {
        reject(error)
      } finally {
        setLoading(false)
      }
    })

    toast.promise(promise, {
      loading: 'Updating profile...',
      success: (message) => `${message}`,
      error: (err) => `Profile update failed: ${err.message}`,
    })
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (newPassword !== confirmNewPassword) {
      toast.error('Password Mismatch', { description: 'New password and confirmation do not match.' })
      setLoading(false)
      return
    }

    const promise = new Promise(async (resolve, reject) => {
      try {
        const token = document.cookie.split('token=')[1]?.split(';')[0]
        const response = await fetch('/api/users/me/password', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ currentPassword, newPassword }),
        })

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'Failed to change password')
        }

        setCurrentPassword('')
        setNewPassword('')
        setConfirmNewPassword('')
        resolve(data.message)
      } catch (error) {
        reject(error)
      } finally {
        setLoading(false)
      }
    })

    toast.promise(promise, {
      loading: 'Changing password...',
      success: (message) => `${message}`,
      error: (err) => `Password change failed: ${err.message}`,
    })
  }

  if (isPasswordForm) {
    return (
      <form onSubmit={handlePasswordSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="currentPassword">Current Password</Label>
          <Input
            id="currentPassword"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="newPassword">New Password</Label>
          <Input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
          <Input
            id="confirmNewPassword"
            type="password"
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
            required
          />
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          {loading ? 'Updating...' : 'Change Password'}
        </Button>
      </form>
    )
  }

  return (
    <form onSubmit={handleProfileSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fullName">Full Name</Label>
        <Input
          id="fullName"
          type="text"
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
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
        {loading ? 'Saving...' : 'Save Changes'}
      </Button>
    </form>
  )
}