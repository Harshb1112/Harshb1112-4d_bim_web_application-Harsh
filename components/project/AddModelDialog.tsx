"use client"

import { useState, useEffect } from "react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Loader2, FolderOpen, Upload, RefreshCw, Box } from "lucide-react"
import { toast } from "sonner"

interface AddModelDialogProps {
  projectId: number
  onModelAdded?: () => void
}

export default function AddModelDialog({ projectId, onModelAdded }: AddModelDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [modelName, setModelName] = useState("")
  const [bimSource, setBimSource] = useState<string>("speckle")
  
  // Speckle
  const [speckleUrl, setSpeckleUrl] = useState("")
  
  // Local IFC
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  
  // Autodesk
  const [autodeskUrn, setAutodeskUrn] = useState("")
  const [autodeskFileUrl, setAutodeskFileUrl] = useState("")
  const [showAutodeskBrowser, setShowAutodeskBrowser] = useState(false)
  const [autodeskToken, setAutodeskToken] = useState("")
  const [hubs, setHubs] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [folders, setFolders] = useState<any[]>([])
  const [files, setFiles] = useState<any[]>([])
  const [selectedHub, setSelectedHub] = useState("")
  const [selectedProject, setSelectedProject] = useState("")
  const [selectedFolder, setSelectedFolder] = useState("")
  const [loadingAutodesk, setLoadingAutodesk] = useState(false)
  const [uploadingForUrn, setUploadingForUrn] = useState(false)
  const [translationStatus, setTranslationStatus] = useState("")

  // Check for OAuth callback success
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('autodesk_auth') === 'success') {
        toast.success('Autodesk account connected successfully!')
        // Clean up URL
        window.history.replaceState({}, '', window.location.pathname)
        
        // Restore dialog state if available
        const savedState = sessionStorage.getItem('addModelDialog_state')
        if (savedState) {
          try {
            const state = JSON.parse(savedState)
            // Only restore if less than 5 minutes old
            if (Date.now() - state.timestamp < 5 * 60 * 1000) {
              setModelName(state.modelName || '')
              setBimSource(state.bimSource || 'acc')
              setIsOpen(true)
              setShowAutodeskBrowser(true)
              // Refresh hubs list
              setTimeout(() => initAutodeskBrowser(), 500)
            }
            sessionStorage.removeItem('addModelDialog_state')
          } catch (e) {
            console.error('Failed to restore dialog state:', e)
          }
        }
      } else if (params.get('autodesk_auth') === 'error') {
        toast.error(params.get('error') || 'Failed to connect Autodesk account')
        window.history.replaceState({}, '', window.location.pathname)
        sessionStorage.removeItem('addModelDialog_state')
      }
    }
  }, [])

  const resetForm = () => {
    setModelName("")
    setBimSource("speckle")
    setSpeckleUrl("")
    setSelectedFile(null)
    setAutodeskUrn("")
    setAutodeskFileUrl("")
    setShowAutodeskBrowser(false)
    setHubs([])
    setProjects([])
    setFolders([])
    setFiles([])
    setSelectedHub("")
    setSelectedProject("")
    setSelectedFolder("")
    setTranslationStatus("")
  }

  // Autodesk browser functions
  const initAutodeskBrowser = async () => {
    try {
      setLoadingAutodesk(true)
      const tokenRes = await fetch('/api/autodesk/token')
      if (!tokenRes.ok) throw new Error('Failed to get Autodesk token')
      const { access_token } = await tokenRes.json()
      setAutodeskToken(access_token)

      const hubsRes = await fetch('/api/autodesk/hubs', {
        headers: { Authorization: `Bearer ${access_token}` }
      })
      if (!hubsRes.ok) throw new Error('Failed to load hubs')
      const { hubs: hubsData } = await hubsRes.json()
      setHubs(hubsData || [])
      setShowAutodeskBrowser(true)
    } catch (err: any) {
      toast.error(err.message || 'Failed to connect to Autodesk')
    } finally {
      setLoadingAutodesk(false)
    }
  }

  const loadProjects = async (hubId: string) => {
    try {
      setSelectedHub(hubId)
      setProjects([])
      setFolders([])
      setFiles([])
      setSelectedProject("")
      setSelectedFolder("")
      setLoadingAutodesk(true)

      const res = await fetch(`/api/autodesk/projects?hubId=${hubId}`, {
        headers: { Authorization: `Bearer ${autodeskToken}` }
      })
      if (!res.ok) throw new Error('Failed to load projects')
      const { projects: projectsData } = await res.json()
      setProjects(projectsData || [])
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoadingAutodesk(false)
    }
  }

  const loadFolders = async (projectId: string) => {
    try {
      setSelectedProject(projectId)
      setFolders([])
      setFiles([])
      setSelectedFolder("")
      setLoadingAutodesk(true)

      const res = await fetch(`/api/autodesk/folders?hubId=${selectedHub}&projectId=${projectId}`, {
        headers: { Authorization: `Bearer ${autodeskToken}` }
      })
      if (!res.ok) throw new Error('Failed to load folders')
      const { folders: foldersData } = await res.json()
      setFolders(foldersData || [])
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoadingAutodesk(false)
    }
  }

  const loadFiles = async (folderId: string) => {
    try {
      setSelectedFolder(folderId)
      setFiles([])
      setLoadingAutodesk(true)

      const res = await fetch(`/api/autodesk/folders/contents?projectId=${selectedProject}&folderId=${folderId}`, {
        headers: { Authorization: `Bearer ${autodeskToken}` }
      })
      if (!res.ok) throw new Error('Failed to load files')
      const { contents } = await res.json()
      setFiles(contents || [])
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoadingAutodesk(false)
    }
  }

  const selectAutodeskFile = async (file: any) => {
    try {
      setLoadingAutodesk(true)
      toast.info(`Getting viewable URN for: ${file.name}`)

      const res = await fetch(
        `/api/autodesk/derivative?itemId=${encodeURIComponent(file.id)}&projectId=${encodeURIComponent(selectedProject)}`,
        { headers: { Authorization: `Bearer ${autodeskToken}` } }
      )

      if (!res.ok) {
        const encodedUrn = btoa(file.id).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
        setAutodeskUrn(encodedUrn)
        
        toast.info('Starting model translation...')
        await fetch('/api/autodesk/derivative', {
          method: 'POST',
          headers: { 
            Authorization: `Bearer ${autodeskToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ urn: file.id })
        })
      } else {
        const data = await res.json()
        setAutodeskUrn(data.derivativeUrn || file.id)
      }

      setAutodeskFileUrl(file.webView || '')
      setModelName(file.name || modelName)
      setShowAutodeskBrowser(false)
      toast.success(`Selected: ${file.name}`)
    } catch (err: any) {
      const encodedUrn = btoa(file.id).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      setAutodeskUrn(encodedUrn)
      setShowAutodeskBrowser(false)
      toast.warning(`Selected with fallback URN: ${file.name}`)
    } finally {
      setLoadingAutodesk(false)
    }
  }

  const uploadFileForUrn = async (file: File) => {
    try {
      setUploadingForUrn(true)
      setTranslationStatus('Uploading...')

      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/autodesk/translate', {
        method: 'POST',
        body: formData
      })

      if (!res.ok) throw new Error('Upload failed')
      const { urn } = await res.json()
      
      setAutodeskUrn(urn)
      setTranslationStatus('Processing model...')

      const checkStatus = async () => {
        const statusRes = await fetch(`/api/autodesk/translate/status?urn=${urn}`)
        const status = await statusRes.json()
        
        if (status.ready) {
          setTranslationStatus('Ready!')
          toast.success('Model processed successfully!')
          return true
        } else if (status.status === 'failed') {
          setTranslationStatus('Failed')
          toast.error('Model processing failed')
          return true
        } else {
          setTranslationStatus(`Processing: ${status.progress || '0%'}`)
          return false
        }
      }

      const pollInterval = setInterval(async () => {
        const done = await checkStatus()
        if (done) clearInterval(pollInterval)
      }, 5000)

      await checkStatus()
    } catch (err: any) {
      toast.error(err.message || 'Upload failed')
      setTranslationStatus('')
    } finally {
      setUploadingForUrn(false)
    }
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!modelName.trim()) {
      toast.error("Model name is required")
      return
    }

    if (bimSource === "speckle" && !speckleUrl.trim()) {
      toast.error("Please provide Speckle URL")
      return
    }
    if (bimSource === "local" && !selectedFile) {
      toast.error("Please select an IFC or RVT file")
      return
    }
    if ((bimSource === "acc" || bimSource === "drive") && !autodeskUrn) {
      toast.error("Please provide Autodesk URN")
      return
    }

    setLoading(true)

    try {
      let response: Response

      if (bimSource === "local" && selectedFile) {
        // Upload IFC file
        const formData = new FormData()
        formData.append("file", selectedFile)
        formData.append("projectId", projectId.toString())
        formData.append("name", modelName.trim())

        response = await fetch("/api/models/upload", {
          method: "POST",
          credentials: 'include',
          body: formData,
        })
      } else {
        // Register model from external source
        const modelData: any = {
          projectId,
          name: modelName.trim(),
          source: bimSource,
        }

        if (bimSource === "speckle") {
          modelData.sourceUrl = speckleUrl.trim()
          modelData.format = "speckle"
        } else if (bimSource === "acc" || bimSource === "drive") {
          modelData.sourceId = autodeskUrn.trim()
          modelData.sourceUrl = autodeskFileUrl.trim() || null
          modelData.source = bimSource === "acc" ? "autodesk_construction_cloud" : "autodesk_drive"
          modelData.format = "autodesk"
        }

        response = await fetch("/api/models/add", {
          method: "POST",
          credentials: 'include',
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(modelData),
        })
      }

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Failed to add model")
      }

      toast.success("Model added successfully!")
      setIsOpen(false)
      resetForm()
      onModelAdded?.()
    } catch (error: any) {
      console.error('Add model error:', error)
      // Handle JSON parse errors
      if (error.message?.includes('JSON')) {
        toast.error("Server response error. Please check your network connection and try again.")
      } else {
        toast.error(error.message || "Failed to add model")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button onClick={() => setIsOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add 3D Model
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Box className="h-5 w-5" />
            <span>Add 3D Model</span>
          </DialogTitle>
          <DialogDescription>
            Add a new 3D model to this project from various sources
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          {/* Model Name */}
          <div className="space-y-2">
            <Label htmlFor="model-name">Model Name *</Label>
            <Input
              id="model-name"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder="Enter model name"
              required
            />
          </div>

          {/* BIM Source Selection */}
          <div className="space-y-2">
            <Label htmlFor="bim-source">Model Source *</Label>
            <Select value={bimSource} onValueChange={setBimSource}>
              <SelectTrigger>
                <SelectValue placeholder="Select model source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="speckle">Speckle</SelectItem>
                <SelectItem value="local">Local IFC/RVT File</SelectItem>
                <SelectItem value="acc">Autodesk Construction Cloud</SelectItem>
                <SelectItem value="drive">Autodesk Drive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Speckle URL */}
          {bimSource === "speckle" && (
            <div className="space-y-2">
              <Label htmlFor="speckle-url">Speckle Model URL *</Label>
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

          {/* Local IFC File */}
          {bimSource === "local" && (
            <div className="space-y-2">
              <Label htmlFor="ifc-file">Upload IFC File *</Label>
              <Input
                id="ifc-file"
                type="file"
                accept=".ifc,.ifczip"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    const sizeMB = file.size / 1024 / 1024
                    const sizeGB = sizeMB / 1024
                    
                    // Check file size
                    if (sizeGB > 10) {
                      toast.error(`File too large (${sizeGB.toFixed(1)}GB). Maximum 10GB allowed.`)
                      e.target.value = ''
                      return
                    }
                    
                    // Warning for large files
                    if (sizeMB > 500) {
                      toast.warning(`Large file (${sizeGB.toFixed(1)}GB). This will be processed on server. Browser viewing may be limited.`, {
                        duration: 5000
                      })
                    } else if (sizeMB > 100) {
                      toast.warning(`File size: ${sizeMB.toFixed(0)}MB. Loading may take time.`)
                    }
                    
                    setSelectedFile(file)
                    if (!modelName) setModelName(file.name.replace(/\.[^/.]+$/, ""))
                  }
                }}
              />
              <p className="text-xs text-gray-500">
                Upload your IFC model file (max 10GB)
              </p>
              <div className="text-xs space-y-1 mt-2">
                <p className="text-green-600">✓ Files up to 500MB: Full browser viewing</p>
                <p className="text-yellow-600">⚠ Files 500MB-10GB: Server processing, limited preview</p>
              </div>
            </div>
          )}

          {/* Autodesk Sources */}
          {(bimSource === "acc" || bimSource === "drive") && (
            <>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={initAutodeskBrowser}
                  disabled={loadingAutodesk}
                  className="flex-1"
                >
                  {loadingAutodesk ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <FolderOpen className="h-4 w-4 mr-2" />
                  )}
                  Browse Autodesk
                </Button>
              </div>

              {/* Autodesk Browser */}
              {showAutodeskBrowser && (
                <div className="border rounded-lg p-3 space-y-3 bg-gray-50 dark:bg-gray-900">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Select from Autodesk</span>
                    <div className="flex gap-2">
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => {
                          setShowAutodeskBrowser(false)
                          setHubs([])
                          setProjects([])
                          setFolders([])
                          setFiles([])
                          setSelectedHub("")
                          setSelectedProject("")
                          setSelectedFolder("")
                          initAutodeskBrowser()
                        }}
                        title="Refresh accounts"
                      >
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                      <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => setShowAutodeskBrowser(false)}>
                        ✕
                      </Button>
                    </div>
                  </div>
                  
                  <Select value={selectedHub} onValueChange={loadProjects}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Select Hub/Account" />
                    </SelectTrigger>
                    <SelectContent>
                      {hubs.map((hub) => (
                        <SelectItem key={hub.id} value={hub.id}>{hub.name}</SelectItem>
                      ))}
                      <div className="border-t mt-1 pt-1">
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              // Save current state before redirect
                              sessionStorage.setItem('addModelDialog_state', JSON.stringify({
                                modelName,
                                bimSource,
                                projectId,
                                timestamp: Date.now()
                              }))
                              
                              toast.info('Redirecting to Autodesk login...')
                              // Trigger OAuth flow to add new account
                              const authUrl = `/api/autodesk/auth?source=${bimSource}&projectId=${projectId}`
                              window.location.href = authUrl
                            } catch (error) {
                              toast.error('Failed to initiate authentication')
                            }
                          }}
                          className="w-full text-left px-2 py-1.5 text-sm hover:bg-blue-50 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-400 flex items-center gap-2"
                        >
                          <Plus className="h-3 w-3" />
                          Add New Account
                        </button>
                      </div>
                    </SelectContent>
                  </Select>

                  {projects.length > 0 && (
                    <Select value={selectedProject} onValueChange={loadFolders}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Select Project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((proj) => (
                          <SelectItem key={proj.id} value={proj.id}>{proj.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {folders.length > 0 && (
                    <Select value={selectedFolder} onValueChange={loadFiles}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Select Folder" />
                      </SelectTrigger>
                      <SelectContent>
                        {folders.map((folder) => (
                          <SelectItem key={folder.id} value={folder.id}>{folder.attributes?.name || folder.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {files.length > 0 && (
                    <div className="max-h-40 overflow-y-auto border rounded">
                      {files.map((file) => {
                        const isFolder = file.type === 'folders'
                        return (
                          <button
                            key={file.id}
                            type="button"
                            onClick={() => isFolder ? loadFiles(file.id) : selectAutodeskFile(file)}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900 border-b last:border-b-0 flex items-center gap-2"
                          >
                            {isFolder ? '📁' : '📄'} {file.name || file.attributes?.displayName}
                            {isFolder && <span className="text-xs text-gray-400 ml-auto">→</span>}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {loadingAutodesk && (
                    <div className="flex items-center justify-center py-2">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span className="text-sm">Loading...</span>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="autodesk-urn">Autodesk URN *</Label>
                <Input
                  id="autodesk-urn"
                  type="text"
                  placeholder="urn:adsk.wipprod:dm.lineage:..."
                  value={autodeskUrn}
                  onChange={(e) => setAutodeskUrn(e.target.value)}
                />
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
              </div>
            </>
          )}

          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {loading ? "Adding..." : "Add Model"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
