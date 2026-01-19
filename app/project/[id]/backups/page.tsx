'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Database, Download, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function BackupsPage() {
  const params = useParams();
  const projectId = params.id;
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
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/projects/${projectId}/backup-settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setAutoBackup(data.autoBackupEnabled);
      setFrequency(data.autoBackupFrequency.toString());
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/projects/${projectId}/backup-settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          autoBackupEnabled: autoBackup,
          autoBackupFrequency: frequency
        })
      });
      alert('Auto-backup settings saved!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings');
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
      setBackups(data);
    } catch (error) {
      console.error('Failed to fetch backups:', error);
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
          projectId: parseInt(projectId as string),
          name: backupName || `Full Backup ${new Date().toLocaleString()}`,
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
      
      // Show success message with details
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

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Backup Settings</h1>
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
                saveSettings();
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
                  saveSettings();
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
              <p className="text-xs text-gray-500 mt-1">
                💡 The system checks every hour and creates backups when due.
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
                      <li>All 3D model files (IFC, etc.) - FULL FILES</li>
                      <li>Resources and assignments</li>
                      <li>Daily logs and safety records</li>
                      <li>All project documents (PDF, Excel, etc.)</li>
                      <li>All site photos and videos</li>
                    </ul>
                    <p className="text-xs text-blue-600 mt-2">
                      ⚠️ Backup size can be up to 5GB depending on your files
                    </p>
                  </div>
                  <Button
                    onClick={handleCreateBackup}
                    disabled={creating}
                    className="w-full"
                  >
                    {creating ? 'Creating Backup...' : 'Create Backup'}
                  </Button>
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
            <div className="space-y-2">
              {backups.map((backup) => (
                <div
                  key={backup.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <Database className={`w-8 h-8 ${backup.isAutomatic ? 'text-green-500' : 'text-blue-500'}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{backup.name}</h4>
                        {backup.isAutomatic && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                            Auto
                          </span>
                        )}
                      </div>
                      <div className="flex gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(backup.createdAt), 'MMM dd, yyyy HH:mm')}
                        </span>
                        <span>{formatFileSize(backup.fileSize)}</span>
                      </div>
                      {backup.description && (
                        <p className="text-sm text-gray-600 mt-1">{backup.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDownload(backup.id, backup.name)}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                    <Button variant="outline" size="sm">
                      Restore
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
