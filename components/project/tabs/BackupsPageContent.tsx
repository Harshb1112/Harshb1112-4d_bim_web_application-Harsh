'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Database, Download, Clock, RotateCcw, Trash2, FileJson } from 'lucide-react';
import { format } from 'date-fns';

interface BackupsPageContentProps {
  projectId: number;
}

export default function BackupsPageContent({ projectId }: BackupsPageContentProps) {
  const [backups, setBackups] = useState<any[]>([]);
  const [autoBackup, setAutoBackup] = useState(true);
  const [frequency, setFrequency] = useState('24');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [backupName, setBackupName] = useState('');
  const [backupDescription, setBackupDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    fetchBackups();
    fetchSettings();
  }, [projectId]);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        credentials: 'include'
      });
      const data = await res.json();
      setAutoBackup(data.autoBackupEnabled || false);
      setFrequency((data.autoBackupFrequency || 24).toString());
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  };

  const saveSettings = async (enabled: boolean, freq: string) => {
    setSavingSettings(true);
    try {
      await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          autoBackupEnabled: enabled,
          autoBackupFrequency: parseInt(freq)
        })
      });
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSavingSettings(false);
    }
  };

  const fetchBackups = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/project-backups?projectId=${projectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setBackups(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch backups:', error);
      setBackups([]);
    }
  };

  const handleCreateBackup = async () => {
    setCreating(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/project-backups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          projectId: parseInt(projectId as any),
          name: backupName || `Backup ${new Date().toLocaleString()}`,
          description: backupDescription
        })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create backup');
      }
      
      setIsDialogOpen(false);
      setBackupName('');
      setBackupDescription('');
      fetchBackups();
      
      alert(`Backup created successfully!\n\nSize: ${data.message}\n\nIncludes:\n- ${data.includes.tasks} tasks\n- ${data.includes.models} models\n- ${data.includes.files} files\n- ${data.includes.dailyLogs} daily logs\n- ${data.includes.safetyIncidents} safety incidents\n- ${data.includes.siteCaptures} site captures`);
    } catch (error: any) {
      console.error('Failed to create backup:', error);
      alert(error.message || 'Failed to create backup');
    } finally {
      setCreating(false);
    }
  };

  const handleDownload = async (backupId: number, backupName: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/project-backups/${backupId}/download`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) {
        throw new Error('Failed to download backup');
      }
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${backupName.replace(/[^a-z0-9]/gi, '_')}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download:', error);
      alert('Failed to download backup');
    }
  };

  const handleDownloadJSON = async (projectId: number, projectName: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/project-backups/${projectId}/download-json`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) {
        throw new Error('Failed to download JSON');
      }
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName.replace(/[^a-z0-9]/gi, '_')}_backup.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download JSON:', error);
      alert('Failed to download JSON backup');
    }
  };

  const handleDelete = async (backupId: number) => {
    if (!confirm('Are you sure you want to delete this backup? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/project-backups/${backupId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to delete backup');
      }

      fetchBackups();
      alert('Backup deleted successfully!');
    } catch (error) {
      console.error('Failed to delete backup:', error);
      alert('Failed to delete backup');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Backup Settings</h2>
          <p className="text-sm text-gray-500 mt-1">Configure automatic backups and manage project backups</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Auto-backup Settings</CardTitle>
          <p className="text-sm text-gray-500">
            Configure automatic backups to protect your project data on a schedule
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Auto-Backup</Label>
              <p className="text-sm text-gray-500">Automatically backup project data</p>
            </div>
            <Switch 
              checked={autoBackup} 
              onCheckedChange={(checked) => {
                setAutoBackup(checked);
                saveSettings(checked, frequency);
              }} 
            />
          </div>

          {autoBackup && (
            <div>
              <Label>Frequency</Label>
              <Select 
                value={frequency} 
                onValueChange={(value) => {
                  setFrequency(value);
                  saveSettings(autoBackup, value);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">Every 6 hours</SelectItem>
                  <SelectItem value="12">Every 12 hours</SelectItem>
                  <SelectItem value="24">Every 24 hours</SelectItem>
                  <SelectItem value="48">Every 48 hours</SelectItem>
                  <SelectItem value="168">Weekly (168 hours)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-green-600 mt-2">
                ✅ Auto-backup is enabled. Backups will be created automatically every {frequency} hours.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Project Backups</CardTitle>
              <p className="text-sm text-gray-500">
                Create and manage backups of your project data, tasks, resources, schedules, and all related data
              </p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>+ Create Backup</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Project Backup</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Backup Name</Label>
                    <Input
                      value={backupName}
                      onChange={(e) => setBackupName(e.target.value)}
                      placeholder="e.g., Before major changes"
                    />
                  </div>
                  <div>
                    <Label>Description (Optional)</Label>
                    <Textarea
                      value={backupDescription}
                      onChange={(e) => setBackupDescription(e.target.value)}
                      placeholder="Why are you creating this backup?"
                      rows={3}
                    />
                  </div>
                  <div className="bg-blue-50 p-3 rounded text-sm text-blue-800">
                    <p className="font-semibold">This backup will include:</p>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>Project details and settings</li>
                      <li>All tasks and schedules</li>
                      <li>All 3D model files (IFC, etc.)</li>
                      <li>Resources and assignments</li>
                      <li>Daily logs and safety records</li>
                      <li>All project documents</li>
                      <li>All site photos and videos</li>
                    </ul>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      className="flex-1"
                      disabled={creating}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateBackup}
                      disabled={creating}
                      className="flex-1"
                    >
                      {creating ? 'Creating...' : 'Create Backup'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {backups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Database className="w-16 h-16 mb-4" />
              <p className="text-lg font-semibold">No backups yet</p>
              <p className="text-sm">Create your first backup to protect your project data</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-3 text-sm font-semibold">Name</th>
                    <th className="text-left p-3 text-sm font-semibold">Type</th>
                    <th className="text-left p-3 text-sm font-semibold">Size</th>
                    <th className="text-left p-3 text-sm font-semibold">Created</th>
                    <th className="text-left p-3 text-sm font-semibold">Contents</th>
                    <th className="text-right p-3 text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {backups.map((backup) => (
                    <tr key={backup.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Database className={`w-5 h-5 ${backup.isAutomatic ? 'text-green-500' : 'text-blue-500'}`} />
                          <div>
                            <p className="font-medium">{backup.name}</p>
                            {backup.description && (
                              <p className="text-xs text-gray-500">{backup.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        {backup.isAutomatic ? (
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                            Auto
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                            Manual
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-sm">{formatFileSize(backup.fileSize)}</td>
                      <td className="p-3 text-sm">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-gray-400" />
                          {format(new Date(backup.createdAt), 'MMM dd, yyyy HH:mm')}
                        </div>
                      </td>
                      <td className="p-3 text-xs text-gray-600">
                        {backup.metadata ? `${backup.metadata.tasks || 0} tasks, ${backup.metadata.models || 0} models` : 'N/A'}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2 justify-end">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDownloadJSON(projectId, backup.name)}
                            title="Download JSON (for import)"
                            className="text-green-600 hover:text-green-700"
                          >
                            <FileJson className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDownload(backup.id, backup.name)}
                            title="Download Full Backup (ZIP)"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            title="Restore"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDelete(backup.id)}
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
