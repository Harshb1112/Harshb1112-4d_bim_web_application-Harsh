"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarPlus, Loader2, Plus, ImagePlus, X, Upload, FileArchive } from "lucide-react"
import { toast } from "sonner"
import Image from "next/image"

interface Team {
  id: number
  name: string
  code: string
}

interface TeamLeader {
  id: number
  fullName: string
  email: string
}

interface CreateProjectDialogProps {
  label?: string
  variant?: "default" | "outline" | "ghost" | "secondary" | "destructive" | "link"
  size?: "default" | "sm" | "lg" | "icon"
}

export default function CreateProjectDialog({
  label = "New Project",
  variant = "default",
  size = "default",
}: CreateProjectDialogProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [status, setStatus] = useState("active")
  const [teamId, setTeamId] = useState("")
  const [teamLeaderId, setTeamLeaderId] = useState("")
  const [teams, setTeams] = useState<Team[]>([])
  const [teamLeaders, setTeamLeaders] = useState<TeamLeader[]>([])
  const [loading, setLoading] = useState(false)
  
  // Project Image
  const [projectImage, setProjectImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Import from Backup
  const [backupFile, setBackupFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const backupFileInputRef = useRef<HTMLInputElement>(null)


  useEffect(() => {
    if (isOpen) {
      fetch("/api/teams", { credentials: 'include' })
        .then((res) => res.json())
        .then((data) => {
          if (data.teams) {
            setTeams(data.teams)
          }
        })
        .catch((err) => console.error("Failed to load teams:", err))
    }
  }, [isOpen])

  useEffect(() => {
    if (teamId) {
      fetch(`/api/users?role=team_leader`, { credentials: 'include' })
        .then((res) => res.json())
        .then((data) => {
          if (data.users) {
            const selectedTeamId = parseInt(teamId)
            const leadersInTeam = data.users.filter((user: any) =>
              user.teamMemberships?.some(
                (tm: any) => tm.teamId === selectedTeamId && tm.role === "leader"
              )
            )
            setTeamLeaders(leadersInTeam)
          }
        })
        .catch((err) => console.error("Failed to load team leaders:", err))
    } else {
      setTeamLeaders([])
      setTeamLeaderId("")
    }
  }, [teamId])

  const resetForm = () => {
    setName("")
    setDescription("")
    setStartDate("")
    setEndDate("")
    setStatus("active")
    setTeamId("")
    setTeamLeaderId("")
    setProjectImage(null)
    setImagePreview(null)
    setBackupFile(null)
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error("Please select an image file")
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size should be less than 5MB")
        return
      }
      setProjectImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = () => {
    setProjectImage(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error("Project name is required")
      return
    }
    if (!teamId) {
      toast.error("Please select a team")
      return
    }

    setLoading(true)

    const promise = new Promise(async (resolve, reject) => {
      try {
        const formData = new FormData()
        formData.append("name", name.trim())
        formData.append("description", description.trim() || "")
        formData.append("startDate", startDate || "")
        formData.append("endDate", endDate || "")
        formData.append("status", status)
        formData.append("teamId", teamId)
        if (teamLeaderId) {
          formData.append("teamLeaderId", teamLeaderId)
        }
        if (projectImage) {
          formData.append("image", projectImage)
        }

        const token = document.cookie.split('token=')[1]?.split(';')[0]
        const response = await fetch("/api/projects", {
          method: "POST",
          credentials: 'include',
          headers: {
            ...(token && { 'Authorization': `Bearer ${token}` }),
          },
          body: formData,
        })

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || "Failed to create project")
        }

        const projectId = data.project?.id
        if (projectId) {
          setIsOpen(false)
          resetForm()
          router.push(`/project/${projectId}`)
        } else {
          setIsOpen(false)
          resetForm()
          router.refresh()
        }

        resolve("Project created successfully")
      } catch (error) {
        reject(error)
      } finally {
        setLoading(false)
      }
    })

    toast.promise(promise, {
      loading: "Creating project...",
      success: (message) => `${message}`,
      error: (err: any) => `Failed to create project: ${err.message}`,
    })
  }

  const handleImportBackup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!backupFile) {
      toast.error("Please select a backup file")
      return
    }

    console.log('[Import] Starting import with file:', backupFile.name, backupFile.type, backupFile.size);

    setImporting(true)

    const promise = new Promise(async (resolve, reject) => {
      try {
        const formData = new FormData()
        formData.append("backupFile", backupFile)

        console.log('[Import] FormData created, sending request...');

        const token = localStorage.getItem('token')
        const response = await fetch("/api/projects/restore", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: formData,
        })

        console.log('[Import] Response status:', response.status);

        const data = await response.json()
        console.log('[Import] Response data:', data);
        
        if (!response.ok) {
          throw new Error(data.error || "Failed to import backup")
        }

        const projectId = data.project?.id
        if (projectId) {
          setIsOpen(false)
          resetForm()
          router.push(`/project/${projectId}`)
        } else {
          setIsOpen(false)
          resetForm()
          router.refresh()
        }

        resolve("Project imported successfully")
      } catch (error) {
        reject(error)
      } finally {
        setImporting(false)
      }
    })

    toast.promise(promise, {
      loading: "Importing project from backup...",
      success: (message) => `${message}`,
      error: (err: any) => `Failed to import: ${err.message}`,
    })
  }


  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} onClick={() => setIsOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <CalendarPlus className="h-5 w-5" />
            <span>Create New Project</span>
          </DialogTitle>
          <DialogDescription>
            Add a new construction project to manage its schedule
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="create" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">Create New</TabsTrigger>
            <TabsTrigger value="import">Import from Backup</TabsTrigger>
          </TabsList>

          {/* CREATE NEW TAB */}
          <TabsContent value="create">
            <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          {/* Project Image */}
          <div className="space-y-2">
            <Label>Project Image</Label>
            <div className="flex items-center gap-4">
              {imagePreview ? (
                <div className="relative w-24 h-24 rounded-lg overflow-hidden border">
                  <Image
                    src={imagePreview}
                    alt="Project preview"
                    fill
                    className="object-cover"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <ImagePlus className="h-6 w-6 text-gray-400" />
                  <span className="text-xs text-gray-500 mt-1">Add Image</span>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              <div className="text-xs text-gray-500">
                <p>Upload a project image</p>
                <p>Max size: 5MB</p>
              </div>
            </div>
          </div>

          {/* Project Name */}
          <div className="space-y-2">
            <Label htmlFor="project-name">Project Name *</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter project name"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="project-description">Description</Label>
            <Textarea
              id="project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Project description (optional)"
              rows={2}
            />
          </div>

          {/* Team Selection */}
          <div className="space-y-2">
            <Label htmlFor="project-team">Team *</Label>
            <Select value={teamId} onValueChange={setTeamId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select team" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id.toString()}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Team Leader (Optional) */}
          {teamId && teamLeaders.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="project-leader">Team Leader (Optional)</Label>
              <Select value={teamLeaderId} onValueChange={setTeamLeaderId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team leader" />
                </SelectTrigger>
                <SelectContent>
                  {teamLeaders.map((leader) => (
                    <SelectItem key={leader.id} value={leader.id.toString()}>
                      {leader.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="project-start">Start Date</Label>
              <Input
                id="project-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-end">End Date</Label>
              <Input
                id="project-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="project-status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planning">Planning</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {loading ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </form>
          </TabsContent>

          {/* IMPORT FROM BACKUP TAB */}
          <TabsContent value="import">
            <form onSubmit={handleImportBackup} className="grid gap-4 py-4">
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
                  <FileArchive className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Import Project from Backup</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Upload a backup JSON file to restore a complete project with all its data, tasks, and resources.
                  </p>
                  
                  <input
                    ref={backupFileInputRef}
                    type="file"
                    accept=".json,application/json"
                    onChange={(e) => setBackupFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => backupFileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Select JSON Backup File
                  </Button>
                  
                  {backupFile && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <FileArchive className="h-5 w-5 text-blue-600" />
                          <span className="text-sm font-medium text-blue-900">{backupFile.name}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setBackupFile(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-blue-700 mt-1">
                        Size: {(backupFile.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  )}
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-yellow-900 mb-2">⚠️ Important Notes:</h4>
                  <ul className="text-xs text-yellow-800 space-y-1 list-disc list-inside">
                    <li>Only upload JSON backup files created by this application</li>
                    <li>The backup will restore project data including tasks and resources</li>
                    <li>Models with external URLs (Speckle, Autodesk) will be restored</li>
                    <li>Local model files will NOT be restored (only metadata)</li>
                  </ul>
                </div>
              </div>

              <DialogFooter>
                <Button type="submit" disabled={importing || !backupFile}>
                  {importing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {importing ? "Importing..." : "Import Project"}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
