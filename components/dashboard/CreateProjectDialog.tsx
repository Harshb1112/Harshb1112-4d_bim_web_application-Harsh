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

  useEffect(() => {
    if (isOpen) {
      // Fetch teams
      const token = document.cookie.split("token=")[1]?.split(";")[0]
      if (token) {
        fetch("/api/teams", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.teams) {
              setTeams(data.teams)
            }
          })
          .catch((err) => console.error("Failed to load teams:", err))
      }
    }
  }, [isOpen])

  useEffect(() => {
    if (teamId) {
      // Fetch team leaders for selected team
      const token = document.cookie.split("token=")[1]?.split(";")[0]
      if (token) {
        fetch(`/api/users?role=team_leader`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
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
      }
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
        const token = document.cookie.split("token=")[1]?.split(";")[0]
        if (!token) {
          throw new Error("You must be logged in to create a project")
        }

        if (!teamId) {
          throw new Error("Please select a team")
        }

        const response = await fetch("/api/projects", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || null,
            startDate: startDate || null,
            endDate: endDate || null,
            teamId: parseInt(teamId),
            teamLeaderId: teamLeaderId ? parseInt(teamLeaderId) : null,
          }),
        })

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || "Failed to create project")
        }

        // Navigate directly to the new project workspace
        const projectId = data.project?.id
        if (projectId) {
          setIsOpen(false)
          resetForm()
          // Use push so the server components re-fetch with the new project context
          router.push(`/project/${projectId}`)
        } else {
          // Fallback: refresh dashboard if ID is missing for some reason
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
