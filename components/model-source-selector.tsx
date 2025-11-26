'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Upload, Link2, Cloud, HardDrive } from 'lucide-react';

type ModelSource = 'speckle' | 'local_ifc' | 'autodesk_acc' | 'autodesk_drive';

interface ModelSourceSelectorProps {
  projectId: number;
  onModelAdded?: () => void;
}

export function ModelSourceSelector({ projectId, onModelAdded }: ModelSourceSelectorProps) {
  const [selectedSource, setSelectedSource] = useState<ModelSource | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <Card
          className={`p-6 cursor-pointer hover:border-primary transition-colors ${
            selectedSource === 'speckle' ? 'border-primary bg-primary/5' : ''
          }`}
          onClick={() => setSelectedSource('speckle')}
        >
          <div className="flex flex-col items-center text-center space-y-2">
            <Link2 className="h-8 w-8" />
            <h3 className="font-semibold">Speckle</h3>
            <p className="text-sm text-muted-foreground">Connect to Speckle stream</p>
          </div>
        </Card>

        <Card
          className={`p-6 cursor-pointer hover:border-primary transition-colors ${
            selectedSource === 'local_ifc' ? 'border-primary bg-primary/5' : ''
          }`}
          onClick={() => setSelectedSource('local_ifc')}
        >
          <div className="flex flex-col items-center text-center space-y-2">
            <Upload className="h-8 w-8" />
            <h3 className="font-semibold">Upload IFC</h3>
            <p className="text-sm text-muted-foreground">Upload local IFC file</p>
          </div>
        </Card>

        <Card
          className={`p-6 cursor-pointer hover:border-primary transition-colors ${
            selectedSource === 'autodesk_acc' ? 'border-primary bg-primary/5' : ''
          }`}
          onClick={() => setSelectedSource('autodesk_acc')}
        >
          <div className="flex flex-col items-center text-center space-y-2">
            <Cloud className="h-8 w-8" />
            <h3 className="font-semibold">Autodesk ACC</h3>
            <p className="text-sm text-muted-foreground">Construction Cloud</p>
          </div>
        </Card>

        <Card
          className={`p-6 cursor-pointer hover:border-primary transition-colors ${
            selectedSource === 'autodesk_drive' ? 'border-primary bg-primary/5' : ''
          }`}
          onClick={() => setSelectedSource('autodesk_drive')}
        >
          <div className="flex flex-col items-center text-center space-y-2">
            <HardDrive className="h-8 w-8" />
            <h3 className="font-semibold">Autodesk Drive</h3>
            <p className="text-sm text-muted-foreground">Connect to Drive</p>
          </div>
        </Card>
      </div>

      {selectedSource === 'speckle' && (
        <SpeckleForm projectId={projectId} onSuccess={onModelAdded} />
      )}
      {selectedSource === 'local_ifc' && (
        <LocalIFCForm projectId={projectId} onSuccess={onModelAdded} />
      )}
      {selectedSource === 'autodesk_acc' && (
        <AutodeskACCForm projectId={projectId} onSuccess={onModelAdded} />
      )}
      {selectedSource === 'autodesk_drive' && (
        <AutodeskDriveForm projectId={projectId} onSuccess={onModelAdded} />
      )}
    </div>
  );
}

function SpeckleForm({ projectId, onSuccess }: { projectId: number; onSuccess?: () => void }) {
  const [serverUrl, setServerUrl] = useState('https://app.speckle.systems');
  const [streamId, setStreamId] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/models/connect/speckle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, serverUrl, streamId, token }),
      });

      if (!response.ok) throw new Error('Failed to connect');
      onSuccess?.();
    } catch (error) {
      console.error('Error connecting to Speckle:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <Label>Server URL</Label>
          <Input value={serverUrl} onChange={(e) => setServerUrl(e.target.value)} />
        </div>
        <div>
          <Label>Stream ID</Label>
          <Input value={streamId} onChange={(e) => setStreamId(e.target.value)} />
        </div>
        <div>
          <Label>Token</Label>
          <Input type="password" value={token} onChange={(e) => setToken(e.target.value)} />
        </div>
        <Button onClick={handleConnect} disabled={loading}>
          {loading ? 'Connecting...' : 'Connect'}
        </Button>
      </div>
    </Card>
  );
}

function LocalIFCForm({ projectId, onSuccess }: { projectId: number; onSuccess?: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('projectId', projectId.toString());

    try {
      const response = await fetch('/api/models/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');
      onSuccess?.();
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <Label>Select IFC File</Label>
          <Input type="file" accept=".ifc,.ifczip" onChange={handleFileChange} />
          {file && (
            <p className="text-sm text-muted-foreground mt-2">
              Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
        </div>
        <Button onClick={handleUpload} disabled={!file || loading}>
          {loading ? `Uploading... ${progress}%` : 'Upload'}
        </Button>
      </div>
    </Card>
  );
}

function AutodeskACCForm({ projectId, onSuccess }: { projectId: number; onSuccess?: () => void }) {
  const [accessToken, setAccessToken] = useState('');
  const [hubs, setHubs] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [selectedHub, setSelectedHub] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('');
  const [selectedFile, setSelectedFile] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuthorize = () => {
    window.location.href = `/api/autodesk/auth?projectId=${projectId}&source=acc`;
  };

  const fetchHubs = async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const response = await fetch('/api/autodesk/hubs', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await response.json();
      setHubs(data.hubs || []);
    } catch (error) {
      console.error('Error fetching hubs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async (hubId: string) => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/autodesk/projects?hubId=${hubId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await response.json();
      setProjects(data.projects || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFolders = async (projectId: string, folderId: string) => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const response = await fetch(
        `/api/autodesk/folders?projectId=${projectId}&folderId=${folderId}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      const data = await response.json();
      setFolders(data.contents || []);
    } catch (error) {
      console.error('Error fetching folders:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        {!accessToken ? (
          <div className="text-center">
            <p className="mb-4">Connect to Autodesk Construction Cloud</p>
            <Button onClick={handleAuthorize}>
              Authorize with Autodesk
            </Button>
          </div>
        ) : (
          <>
            <div>
              <Label>Access Token</Label>
              <Input
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="Paste your access token"
              />
              <Button size="sm" className="mt-2" onClick={fetchHubs}>
                Load Hubs
              </Button>
            </div>

            {hubs.length > 0 && (
              <div>
                <Label>Select Hub</Label>
                <select
                  className="w-full p-2 border rounded"
                  value={selectedHub}
                  onChange={(e) => {
                    setSelectedHub(e.target.value);
                    fetchProjects(e.target.value);
                  }}
                >
                  <option value="">Select a hub...</option>
                  {hubs.map((hub) => (
                    <option key={hub.id} value={hub.id}>
                      {hub.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {projects.length > 0 && (
              <div>
                <Label>Select Project</Label>
                <select
                  className="w-full p-2 border rounded"
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                >
                  <option value="">Select a project...</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {folders.length > 0 && (
              <div>
                <Label>Select File</Label>
                <select
                  className="w-full p-2 border rounded"
                  value={selectedFile}
                  onChange={(e) => setSelectedFile(e.target.value)}
                >
                  <option value="">Select a file...</option>
                  {folders
                    .filter((item) => item.type === 'items')
                    .map((file) => (
                      <option key={file.id} value={file.id}>
                        {file.name}
                      </option>
                    ))}
                </select>
              </div>
            )}

            <Button disabled={!selectedFile || loading}>
              {loading ? 'Loading...' : 'Connect File'}
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}

function AutodeskDriveForm({ projectId, onSuccess }: { projectId: number; onSuccess?: () => void }) {
  const [accessToken, setAccessToken] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuthorize = () => {
    window.location.href = `/api/autodesk/auth?projectId=${projectId}&source=drive`;
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        {!accessToken ? (
          <div className="text-center">
            <p className="mb-4">Connect to Autodesk Drive</p>
            <Button onClick={handleAuthorize}>
              Authorize with Autodesk
            </Button>
          </div>
        ) : (
          <>
            <div>
              <Label>Access Token</Label>
              <Input
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="Paste your access token"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Drive integration uses the same API as ACC. Select your files from the folder browser.
            </p>
            <Button disabled={loading}>
              {loading ? 'Loading...' : 'Browse Files'}
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}
