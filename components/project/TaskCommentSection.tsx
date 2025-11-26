'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageSquare, Paperclip, Send, X, FileText, Image as ImageIcon } from 'lucide-react'
import { toast } from 'sonner'

interface Comment {
  id: number
  comment: string
  attachments: string | null
  createdAt: string
  user: {
    id: number
    fullName: string
    email: string
    role: string
  }
}

interface TaskCommentSectionProps {
  taskId: number
  taskName: string
}

export default function TaskCommentSection({ taskId, taskName }: TaskCommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchComments()
  }, [taskId])

  const fetchComments = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/tasks/${taskId}/comments`)
      const data = await response.json()
      
      if (response.ok) {
        setComments(data.comments || [])
      } else {
        toast.error('Failed to load comments')
      }
    } catch (error) {
      console.error('Error fetching comments:', error)
      toast.error('Failed to load comments')
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setSelectedFiles(prev => [...prev, ...files])
  }

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newComment.trim() && selectedFiles.length === 0) {
      toast.error('Please enter a comment or attach files')
      return
    }

    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('comment', newComment.trim())
      
      selectedFiles.forEach(file => {
        formData.append('files', file)
      })

      const response = await fetch(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Comment added successfully')
        setNewComment('')
        setSelectedFiles([])
        fetchComments()
      } else {
        toast.error(data.error || 'Failed to add comment')
      }
    } catch (error) {
      console.error('Error adding comment:', error)
      toast.error('Failed to add comment')
    } finally {
      setSubmitting(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase()
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
      return <ImageIcon className="h-4 w-4" />
    }
    return <FileText className="h-4 w-4" />
  }

  const parseAttachments = (attachments: string | null): string[] => {
    if (!attachments) return []
    try {
      return JSON.parse(attachments)
    } catch {
      return []
    }
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-sm">
            <MessageSquare className="h-4 w-4 mr-2" />
            Comments for: {taskName}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Comment Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <Textarea
            placeholder="Add a comment... (You can describe work done, issues faced, or attach files)"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={3}
            className="resize-none"
          />
          
          {/* Selected Files */}
          {selectedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-md text-sm"
                >
                  {getFileIcon(file.name)}
                  <span className="max-w-[150px] truncate">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="h-4 w-4 mr-2" />
              Attach Files
            </Button>
            <Button type="submit" size="sm" disabled={submitting}>
              <Send className="h-4 w-4 mr-2" />
              {submitting ? 'Sending...' : 'Send'}
            </Button>
          </div>
        </form>

        {/* Comments List */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {loading ? (
            <p className="text-sm text-gray-500 text-center py-4">Loading comments...</p>
          ) : comments.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No comments yet. Be the first to comment!
            </p>
          ) : (
            comments.map((comment) => {
              const attachments = parseAttachments(comment.attachments)
              return (
                <div key={comment.id} className="border rounded-lg p-3 bg-gray-50">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-sm">{comment.user.fullName}</p>
                      <p className="text-xs text-gray-500">
                        {comment.user.role} • {formatDate(comment.createdAt)}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm whitespace-pre-wrap mb-2">{comment.comment}</p>
                  
                  {/* Attachments */}
                  {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {attachments.map((url, index) => {
                        const fileName = url.split('/').pop() || 'file'
                        const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName)
                        
                        return (
                          <a
                            key={index}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 bg-white border px-3 py-1 rounded-md text-sm hover:bg-gray-100"
                          >
                            {getFileIcon(fileName)}
                            <span className="max-w-[150px] truncate">{fileName}</span>
                          </a>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </CardContent>
    </Card>
  )
}
