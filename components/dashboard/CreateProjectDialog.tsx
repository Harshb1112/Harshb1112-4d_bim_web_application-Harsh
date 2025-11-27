"use client"

import { useState, useEffect } from "react"
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
import { CalendarPlus, Loader2, Plus } from "lucide-react"
import { toast } from "sonner"

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
  /**
   * Optional: override the trigger button label.
   */
  label?: string
  /**
   * Optional: pass a different button variant (e.g. "outline") for the trigger.
   */
  variant?: "default" | "outline" | "ghost" | "secondary" | "destructive" | "link"
  /**
   * Optional: size for the trigger button.
   */
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
  const [teamId, setTeamId] = useState("")
  const [teamLeaderId, setTeamLeaderId] = useState("")
  const [teams, setTeams] = useState<Team[]>([])
  const [teamLeaders, setTeamLeaders] = useState<TeamLeader[]>([])
  const [loading, setLoading] = useState(false)
  const [speckleUrl, setSpeckleUrl] = useState("")
  const [bimSource, setBimSource] = useState<string>("none") // none, speckle, local, acc, drive
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [autodeskUrn, setAutodeskUrn] = useState("")
  const [autodeskFileUrl, setAutodeskFileUrl] = useState("")

  useEffect(() => {
    if (isOpen) {
      // Fetch teams (cookie will be sent automatically)
      fetch("/api/teams", {
        credentials: 'include'
      })
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
      // Fetch team leaders for selected team (cookie will be sent automatically)
      fetch(`/api/users?role=team_leader`, {
        credentials: 'include'
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.users) {
            // Filter leaders who belong to selected team
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
    setTeamId("")
    setTeamLeaderId("")
    setSpeckleUrl("")
    setBimSource("none")
    setSelectedFile(null)
    setAutodeskUrn("")
    setAutodeskFileUrl("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error("Project name is required")
      return
    }

    setLoading(true)

    const promise = new Promise(async (resolve, reject) => {
      try {
        if (!teamId) {
          throw new Error("Please select a team")
        }

        // Validate based on selected source
        if (bimSource === "speckle" && !speckleUrl.trim()) {
          throw new Error("Please provide Speckle URL")
        }
        if (bimSource === "local" && !selectedFile) {
          throw new Error("Please select an IFC file")
        }
        if ((bimSource === "acc" || bimSource === "drive") && !autodeskUrn) {
          throw new Error("Please provide Autodesk URN")
        }

        let projectData: any = {
          name: name.trim(),
          description: description.trim() || null,
          startDate: startDate || null,
          endDate: endDate || null,
          teamId: parseInt(teamId),
          teamLeaderId: teamLeaderId ? parseInt(teamLeaderId) : null,
          bimSource: bimSource,
        }

        // Add source-specific data
        if (bimSource === "speckle") {
          projectData.speckleUrl = speckleUrl.trim()
        } else if (bimSource === "acc" || bimSource === "drive") {
          projectData.autodeskUrn = autodeskUrn.trim()
          projectData.autodeskFileUrl = autodeskFileUrl.trim()
        }

        let response: Response
        const token = document.cookie.split('token=')[1]?.split(';')[0]

        // Handle file upload separately using dedicated upload endpoint
        if (bimSource === "local" && selectedFile) {
          const formData = new FormData()
          formData.append("file", selectedFile)
          formData.append("projectData", JSON.stringify(projectData))

          response = await fetch("/api/projects/upload", {
            method: "POST",
            credentials: 'include',
            headers: {
              ...(token && { 'Authorization': `Bearer ${token}` }),
            },
            body: formData,
          })
        } else {
          response = await fetch("/api/projects", {
            method: "POST",
            credentials: 'include',
            headers: {
              "Content-Type": "application/json",
              ...(token && { 'Authorization': `Bearer ${token}` }),
            },
            body: JSON.stringify(projectData),
          })
        }

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || "Failed to create project")
        }

        // Navigate directly to the new project workspace
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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} onClick={() => setIsOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <CalendarPlus className="h-5 w-5" />
            <span>Create New Project</span>
          </DialogTitle>
          <DialogDescription>
            Define the basic information for your new 4D BIM project.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="project-name">Project Name</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-description">Description</Label>
            <Textarea
              id="project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bim-source">BIM Model Source</Label>
            <Select value={bimSource} onValueChange={setBimSource}>
              <SelectTrigger>
                <SelectValue placeholder="Select BIM source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Model (Add Later)</SelectItem>
                <SelectItem value="speckle">Speckle</SelectItem>
                <SelectItem value="local">Local IFC File</SelectItem>
                <SelectItem value="acc">Autodesk Construction Cloud</SelectItem>
                <SelectItem value="drive">Autodesk Drive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {bimSource === "speckle" && (
            <div className="space-y-2">
              <Label htmlFor="speckle-url">Speckle Model URL</Label>
              <Input
                id="speckle-url"
                type="url"
                placeholder="https://app.speckle.systems/projects/..."
                value={speckleUrl}
                onChange={(e) => setSpeckleUrl(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Paste your Speckle project/model URL
              </p>
            </div>
          )}

          {bimSource === "local" && (
            <div className="space-y-2">
              <Label htmlFor="ifc-file">Upload IFC File</Label>
              <Input
                id="ifc-file"
                type="file"
                accept=".ifc"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-gray-500">
                Upload your IFC model file (max 100MB)
              </p>
            </div>
          )}

          {(bimSource === "acc" || bimSource === "drive") && (
            <>
              <div className="space-y-2">
                <Label htmlFor="autodesk-urn">Autodesk URN *</Label>
                <Input
                  id="autodesk-urn"
                  type="text"
                  placeholder="urn:adsk.wipprod:dm.lineage:..."
                  value={autodeskUrn}
                  onChange={(e) => setAutodeskUrn(e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  The URN of your model in {bimSource === "acc" ? "Autodesk Construction Cloud" : "Autodesk Drive"}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="autodesk-file-url">File URL (Optional)</Label>
                <Input
                  id="autodesk-file-url"
                  type="text"
                  placeholder="https://..."
                  value={autodeskFileUrl}
                  onChange={(e) => setAutodeskFileUrl(e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  Direct link to the file (optional)
                </p>
              </div>
            </>
          )}
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
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {loading ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
