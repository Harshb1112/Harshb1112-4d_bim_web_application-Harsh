'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { Box, Calendar, Trash2, Plus, X, Loader2 } from 'lucide-react'
import { format } from 'date-fns'

interface EditTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: any
  projectId: number
  availableElements?: Array<{
    id: number
    guid: string
    category?: string
    name?: string
    type?: string
    typeName?: string
    family?: string
  }>
  teams?: Array<{ id: number; name: string }>
  users?: Array<{ id: number; fullName: string; role: string }>
  onTaskUpdated?: () => void
}

export default function EditTaskDialog({
  open,
  onOpenChange,
  task,
  projectId,
  availableElements = [],
  teams = [],
  users = [],
  onTaskUpdated
}: EditTaskDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    assigneeId: '',
    teamId: '',
    priority: 'medium',
    status: 'todo',
    progress: 0
  })
  const [linkedElements, setLinkedElements] = useState<any[]>([])
  const [elementsToAdd, setElementsToAdd] = useState<number[]>([])
  const [elementsToRemove, setElementsToRemove] = useState<number[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState('details')
  const [elementSearch, setElementSearch] = useState('')
  const [elementCategoryFilter, setElementCategoryFilter] = useState('all')


  // Initialize form when task changes
  useEffect(() => {
    if (task && open) {
      setFormData({
        name: task.name || '',
        description: task.description || '',
        startDate: task.startDate ? format(new Date(task.startDate), 'yyyy-MM-dd') : '',
        endDate: task.endDate ? format(new Date(task.endDate), 'yyyy-MM-dd') : '',
        assigneeId: task.assigneeId?.toString() || '',
        teamId: task.teamId?.toString() || '',
        priority: task.priority || 'medium',
        status: task.status || 'todo',
        progress: task.progress || 0
      })
      setLinkedElements(task.elementLinks || [])
      setElementsToAdd([])
      setElementsToRemove([])
      setActiveTab('details')
    }
  }, [task, open])

  // Get elements not already linked
  const unlinkedElements = availableElements.filter(
    el => !linkedElements.some(link => link.elementId === el.id || link.element?.id === el.id)
      && !elementsToAdd.includes(el.id)
  )

  // Filter elements based on search and category
  const filteredUnlinkedElements = unlinkedElements.filter(el => {
    const matchesSearch = elementSearch === '' || 
      el.guid?.toLowerCase().includes(elementSearch.toLowerCase()) ||
      el.category?.toLowerCase().includes(elementSearch.toLowerCase()) ||
      el.type?.toLowerCase().includes(elementSearch.toLowerCase()) ||
      el.name?.toLowerCase().includes(elementSearch.toLowerCase()) ||
      el.typeName?.toLowerCase().includes(elementSearch.toLowerCase()) ||
      el.family?.toLowerCase().includes(elementSearch.toLowerCase())
    
    const matchesCategory = elementCategoryFilter === 'all' || 
      el.type === elementCategoryFilter || 
      el.category === elementCategoryFilter
    
    return matchesSearch && matchesCategory
  })

  // Get unique categories for filter - use 'type' field which has better category names
  const availableCategories = [...new Set(
    unlinkedElements
      .map(el => el.type || el.category || el.family)
      .filter(Boolean)
  )].sort()

  // Debug: Log first few elements to see what data we have
  useEffect(() => {
    if (open && availableElements.length > 0) {
      console.log('Available elements sample:', availableElements.slice(0, 3))
      console.log('Available categories:', availableCategories)
      console.log('Total unlinked elements:', unlinkedElements.length)
    }
  }, [open, availableElements.length])

  // Elements by type for display
  const elementsByType = linkedElements
    .filter(link => !elementsToRemove.includes(link.id))
    .reduce((acc, link) => {
      const type = link.element?.category || 'Unknown'
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast.error('Task name is required')
      return
    }

    setIsSubmitting(true)

    try {
      // 1. Update task details
      const updateResponse = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          startDate: formData.startDate || null,
          endDate: formData.endDate || null,
          assigneeId: formData.assigneeId || null,
          teamId: formData.teamId || null,
          priority: formData.priority,
          status: formData.status,
          progress: formData.progress
        })
      })

      if (!updateResponse.ok) {
        const error = await updateResponse.json()
        throw new Error(error.error || 'Failed to update task')
      }

      // 2. Remove elements if any marked for removal
      if (elementsToRemove.length > 0) {
        const deleteResponse = await fetch('/api/links', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ linkIds: elementsToRemove })
        })

        if (!deleteResponse.ok) {
          console.error('Failed to remove some element links')
        }
      }

      // 3. Add new elements if any selected
      if (elementsToAdd.length > 0) {
        const addResponse = await fetch('/api/links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskId: task.id,
            elementIds: elementsToAdd
          })
        })

        if (!addResponse.ok) {
          console.error('Failed to add some element links')
        }
      }

      toast.success('Task updated successfully!')
      onOpenChange(false)
      onTaskUpdated?.()
    } catch (error) {
      console.error('Error updating task:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update task')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRemoveElement = (linkId: number) => {
    setElementsToRemove([...elementsToRemove, linkId])
  }

  const handleUndoRemove = (linkId: number) => {
    setElementsToRemove(elementsToRemove.filter(id => id !== linkId))
  }

  const handleAddElement = (elementId: number) => {
    setElementsToAdd([...elementsToAdd, elementId])
  }

  const handleUndoAdd = (elementId: number) => {
    setElementsToAdd(elementsToAdd.filter(id => id !== elementId))
  }

  const pendingChanges = elementsToAdd.length + elementsToRemove.length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription>
            Update task details and manage linked elements
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">
              <Calendar className="h-4 w-4 mr-2" />
              Details & Dates
            </TabsTrigger>
            <TabsTrigger value="elements">
              <Box className="h-4 w-4 mr-2" />
              Elements ({linkedElements.length - elementsToRemove.length + elementsToAdd.length})
              {pendingChanges > 0 && (
                <Badge variant="destructive" className="ml-2 text-xs">
                  {pendingChanges} changes
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>


          <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
            {/* Details Tab */}
            <TabsContent value="details" className="flex-1 overflow-auto space-y-4 mt-4">
              <div>
                <Label htmlFor="name">Task Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Task name"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Task description..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">Not Started</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => setFormData({ ...formData, priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="teamId">Team</Label>
                  <Select
                    value={formData.teamId || 'none'}
                    onValueChange={(value) => setFormData({ ...formData, teamId: value === 'none' ? '' : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Team</SelectItem>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id.toString()}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="assigneeId">Assignee</Label>
                  <Select
                    value={formData.assigneeId || 'none'}
                    onValueChange={(value) => setFormData({ ...formData, assigneeId: value === 'none' ? '' : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {user.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="progress">Progress: {formData.progress}%</Label>
                <Input
                  id="progress"
                  type="range"
                  min="0"
                  max="100"
                  value={formData.progress}
                  onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>
            </TabsContent>


            {/* Elements Tab */}
            <TabsContent value="elements" className="flex-1 overflow-hidden flex flex-col mt-4">
              {/* Summary */}
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Box className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">
                    {linkedElements.length - elementsToRemove.length + elementsToAdd.length} element(s) linked
                  </span>
                </div>
                {Object.keys(elementsByType).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(elementsByType).map(([type, count]) => (
                      <Badge key={type} variant="secondary">
                        {type}: {String(count)}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 flex-1 overflow-hidden">
                {/* Current Elements */}
                <div className="flex flex-col overflow-hidden">
                  <h4 className="text-sm font-semibold mb-2">Linked Elements</h4>
                  <ScrollArea className="flex-1 border rounded-lg p-2">
                    {linkedElements.length === 0 && elementsToAdd.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">No elements linked</p>
                    ) : (
                      <div className="space-y-2">
                        {/* Existing elements */}
                        {linkedElements.map((link) => (
                          <div
                            key={link.id}
                            className={`flex items-center justify-between p-2 rounded border ${
                              elementsToRemove.includes(link.id)
                                ? 'bg-red-50 border-red-200 opacity-60'
                                : 'bg-white'
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-mono truncate">
                                {link.element?.guid?.slice(0, 20)}...
                              </p>
                              <Badge variant="outline" className="text-xs mt-1">
                                {link.element?.category || 'Unknown'}
                              </Badge>
                            </div>
                            {elementsToRemove.includes(link.id) ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => handleUndoRemove(link.id)}
                                className="text-blue-600"
                              >
                                Undo
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRemoveElement(link.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}

                        {/* Newly added elements (pending) */}
                        {elementsToAdd.map((elementId) => {
                          const element = availableElements.find(el => el.id === elementId)
                          return (
                            <div
                              key={`new-${elementId}`}
                              className="flex items-center justify-between p-2 rounded border bg-green-50 border-green-200"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-mono truncate">
                                  {element?.guid?.slice(0, 20)}...
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    {element?.category || 'Unknown'}
                                  </Badge>
                                  <Badge className="text-xs bg-green-600">New</Badge>
                                </div>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => handleUndoAdd(elementId)}
                                className="text-red-600"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </ScrollArea>
                </div>

                {/* Available Elements to Add */}
                <div className="flex flex-col overflow-hidden">
                  <div className="mb-2">
                    <h4 className="text-sm font-semibold mb-2">Available Elements</h4>
                    
                    {/* Search and Filter */}
                    <div className="space-y-2 mb-2">
                      <Input
                        placeholder="Search by GUID, category, or name..."
                        value={elementSearch}
                        onChange={(e) => setElementSearch(e.target.value)}
                        className="text-xs h-8"
                      />
                      <Select
                        value={elementCategoryFilter}
                        onValueChange={setElementCategoryFilter}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue placeholder="Filter by type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types ({unlinkedElements.length})</SelectItem>
                          {availableCategories.map((category) => {
                            const count = unlinkedElements.filter(el => 
                              (el.type || el.category || el.family) === category
                            ).length
                            return (
                              <SelectItem key={category} value={category || 'Unknown'}>
                                {category || 'Unknown'} ({count})
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <p className="text-xs text-gray-500">
                      Showing {filteredUnlinkedElements.length} of {unlinkedElements.length} elements
                    </p>
                  </div>
                  
                  <ScrollArea className="flex-1 border rounded-lg p-2">
                    {filteredUnlinkedElements.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">
                        {elementSearch || elementCategoryFilter !== 'all' 
                          ? 'No elements match your search'
                          : 'No more elements available'
                        }
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {filteredUnlinkedElements.map((element) => (
                          <div
                            key={element.id}
                            className="flex items-center justify-between p-2 rounded border bg-white hover:bg-gray-50"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">
                                {element.name || element.typeName || element.family || 'Unnamed Element'}
                              </p>
                              <p className="text-xs font-mono text-gray-500 truncate">
                                {element.guid?.slice(0, 24)}...
                              </p>
                              <div className="flex gap-1 mt-1">
                                {(element.type || element.category) && (
                                  <Badge variant="outline" className="text-xs">
                                    {element.type || element.category}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => handleAddElement(element.id)}
                              className="text-green-600 hover:text-green-700"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </div>
            </TabsContent>

            <DialogFooter className="mt-4 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
