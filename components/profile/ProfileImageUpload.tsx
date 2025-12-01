"use client"

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Camera, Upload, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface ProfileImageUploadProps {
  user: {
    id: number
    fullName: string
    profileImage?: string | null
  }
}

export default function ProfileImageUpload({ user }: ProfileImageUploadProps) {
  const [profileImage, setProfileImage] = useState<string | null>(user.profileImage || null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB')
      return
    }

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/profile/upload-image', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload image')
      }

      setProfileImage(data.imageUrl)
      toast.success('Profile image updated!')
      
      // Refresh page to update sidebar
      window.location.reload()
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveImage = async () => {
    setUploading(true)

    try {
      const res = await fetch('/api/profile/remove-image', {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!res.ok) {
        throw new Error('Failed to remove image')
      }

      setProfileImage(null)
      toast.success('Profile image removed!')
      
      // Refresh page to update sidebar
      window.location.reload()
    } catch (error) {
      console.error('Remove error:', error)
      toast.error('Failed to remove image')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Profile Image Display */}
      <div className="relative">
        {profileImage ? (
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-blue-500 shadow-lg">
            <Image
              src={profileImage}
              alt={user.fullName}
              width={128}
              height={128}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-600 to-blue-900 flex items-center justify-center border-4 border-blue-500 shadow-lg">
            <span className="text-white text-3xl font-bold">{getInitials(user.fullName)}</span>
          </div>
        )}
        
        {/* Camera overlay button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="absolute bottom-0 right-0 w-10 h-10 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center text-white shadow-lg transition-colors disabled:opacity-50"
        >
          <Camera className="h-5 w-5" />
        </button>
      </div>

      {/* User Name */}
      <div className="text-center">
        <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{user.fullName}</h3>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="dark:border-gray-700 dark:text-gray-300"
        >
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? 'Uploading...' : 'Upload'}
        </Button>
        
        {profileImage && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRemoveImage}
            disabled={uploading}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Remove
          </Button>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
        Supported formats: JPG, PNG, GIF (max 20MB)
      </p>
    </div>
  )
}
