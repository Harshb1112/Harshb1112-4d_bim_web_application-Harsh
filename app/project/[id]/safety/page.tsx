'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, AlertTriangle, CheckCircle, Users } from 'lucide-react';
import { format } from 'date-fns';
import ProjectHeader from '@/components/project/ProjectHeader';
import ProjectNavigation from '@/components/project/ProjectNavigation';

export default function SafetyPage() {
  const params = useParams();
  const projectId = params.id;
  const [incidents, setIncidents] = useState<any[]>([]);
  const [talks, setTalks] = useState<any[]>([]);
  const [isIncidentDialogOpen, setIsIncidentDialogOpen] = useState(false);
  const [isTalkDialogOpen, setIsTalkDialogOpen] = useState(false);
  const [project, setProject] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  const [incidentForm, setIncidentForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    type: 'near_miss',
    severity: 'low',
    location: '',
    description: '',
    injuredPerson: '',
    witnessNames: '',
    rootCause: '',
    correctiveAction: ''
  });

  const [talkForm, setTalkForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    topic: '',
    description: '',
    conductedBy: '',
    attendees: '',
    attendeeCount: '',
    duration: '',
    notes: ''
  });

  useEffect(() => {
    fetchProjectAndUser();
    fetchIncidents();
    fetchTalks();
  }, [projectId]);

  const fetchProjectAndUser = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const projectRes = await fetch(`/api/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (projectRes.ok) {
        const projectData = await projectRes.json();
        setProject(projectData);
      }

      const userRes = await fetch('/api/users/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (userRes.ok) {
        const userData = await userRes.json();
        setUser(userData.user || userData);
      }
    } catch (error) {
      console.error('Failed to fetch project/user:', error);
    }
  };

  const fetchIncidents = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/safety/incidents?projectId=${projectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setIncidents(data);
    } catch (error) {
      console.error('Failed to fetch incidents:', error);
    }
  };

  const fetchTalks = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/safety/toolbox-talks?projectId=${projectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setTalks(data);
    } catch (error) {
      console.error('Failed to fetch talks:', error);
    }
  };

  const handleIncidentSubmit = async () => {
    try {
      const token = localStorage.getItem('token');
      await fetch('/api/safety/incidents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          projectId: parseInt(projectId as string),
          ...incidentForm
        })
      });
      setIsIncidentDialogOpen(false);
      fetchIncidents();
    } catch (error) {
      console.error('Failed to create incident:', error);
    }
  };

  const handleTalkSubmit = async () => {
    try {
      const token = localStorage.getItem('token');
      await fetch('/api/safety/toolbox-talks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          projectId: parseInt(projectId as string),
          ...talkForm,
          attendeeCount: parseInt(talkForm.attendeeCount) || 0,
          duration: parseInt(talkForm.duration) || null
        })
      });
      setIsTalkDialogOpen(false);
      fetchTalks();
    } catch (error) {
      console.error('Failed to create talk:', error);
    }
  };

  const openIncidents = incidents.filter(i => i.status === 'open').length;
  const thisMonthTalks = talks.filter(t => {
    const talkDate = new Date(t.date);
    const now = new Date();
    return talkDate.getMonth() === now.getMonth() && talkDate.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div>
      {project && user ? (
        <>
          <ProjectHeader project={project} user={user} />
          <ProjectNavigation projectId={projectId as string} userRole={user.role} />
        </>
      ) : (
        <div className="bg-gray-100 p-4 border-b">
          <div className="max-w-7xl mx-auto">
            <div className="h-16 bg-gray-200 animate-pulse rounded"></div>
          </div>
        </div>
      )}
      
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Safety Compliance</h1>
            <p className="text-sm text-gray-500 mt-1">Track incidents, toolbox talks, and safety metrics</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => window.location.href = `/project/${projectId}`}
            >
              ← Back to Project
            </Button>
          <Dialog open={isIncidentDialogOpen} onOpenChange={setIsIncidentDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">+ Report Incident</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Report Safety Incident</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={incidentForm.date}
                    onChange={(e) => setIncidentForm({ ...incidentForm, date: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Type</Label>
                    <Select value={incidentForm.type} onValueChange={(v) => setIncidentForm({ ...incidentForm, type: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="near_miss">Near Miss</SelectItem>
                        <SelectItem value="first_aid">First Aid</SelectItem>
                        <SelectItem value="medical">Medical Treatment</SelectItem>
                        <SelectItem value="lost_time">Lost Time</SelectItem>
                        <SelectItem value="fatality">Fatality</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Severity</Label>
                    <Select value={incidentForm.severity} onValueChange={(v) => setIncidentForm({ ...incidentForm, severity: v })}>
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
                <div>
                  <Label>Location</Label>
                  <Input
                    value={incidentForm.location}
                    onChange={(e) => setIncidentForm({ ...incidentForm, location: e.target.value })}
                    placeholder="Where did it happen?"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={incidentForm.description}
                    onChange={(e) => setIncidentForm({ ...incidentForm, description: e.target.value })}
                    placeholder="Describe what happened..."
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Injured Person (if any)</Label>
                  <Input
                    value={incidentForm.injuredPerson}
                    onChange={(e) => setIncidentForm({ ...incidentForm, injuredPerson: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Witness Names</Label>
                  <Input
                    value={incidentForm.witnessNames}
                    onChange={(e) => setIncidentForm({ ...incidentForm, witnessNames: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Root Cause</Label>
                  <Textarea
                    value={incidentForm.rootCause}
                    onChange={(e) => setIncidentForm({ ...incidentForm, rootCause: e.target.value })}
                    rows={2}
                  />
                </div>
                <div>
                  <Label>Corrective Action</Label>
                  <Textarea
                    value={incidentForm.correctiveAction}
                    onChange={(e) => setIncidentForm({ ...incidentForm, correctiveAction: e.target.value })}
                    rows={2}
                  />
                </div>
                <Button onClick={handleIncidentSubmit} className="w-full">Submit Report</Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isTalkDialogOpen} onOpenChange={setIsTalkDialogOpen}>
            <DialogTrigger asChild>
              <Button>New Toolbox Talk</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>New Toolbox Talk</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={talkForm.date}
                    onChange={(e) => setTalkForm({ ...talkForm, date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Topic</Label>
                  <Input
                    value={talkForm.topic}
                    onChange={(e) => setTalkForm({ ...talkForm, topic: e.target.value })}
                    placeholder="e.g., Fall Protection, PPE Requirements"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={talkForm.description}
                    onChange={(e) => setTalkForm({ ...talkForm, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Conducted By</Label>
                  <Input
                    value={talkForm.conductedBy}
                    onChange={(e) => setTalkForm({ ...talkForm, conductedBy: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Attendee Count</Label>
                    <Input
                      type="number"
                      value={talkForm.attendeeCount}
                      onChange={(e) => setTalkForm({ ...talkForm, attendeeCount: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Duration (minutes)</Label>
                    <Input
                      type="number"
                      value={talkForm.duration}
                      onChange={(e) => setTalkForm({ ...talkForm, duration: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Attendees (names)</Label>
                  <Textarea
                    value={talkForm.attendees}
                    onChange={(e) => setTalkForm({ ...talkForm, attendees: e.target.value })}
                    placeholder="List attendee names..."
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={talkForm.notes}
                    onChange={(e) => setTalkForm({ ...talkForm, notes: e.target.value })}
                    rows={2}
                  />
                </div>
                <Button onClick={handleTalkSubmit} className="w-full">Save Toolbox Talk</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Shield className="w-8 h-8 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Days Without Incident</p>
                <p className="text-2xl font-bold">N/A</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
              <div>
                <p className="text-sm text-gray-500">Total Incidents (YTD)</p>
                <p className="text-2xl font-bold">{incidents.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
              <div>
                <p className="text-sm text-gray-500">Open Incidents</p>
                <p className="text-2xl font-bold">{openIncidents}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Users className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-sm text-gray-500">Toolbox Talks (Month)</p>
                <p className="text-2xl font-bold">{thisMonthTalks}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {incidents.length === 0 && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <p className="text-green-800 font-semibold">No incidents reported. Keep up the safe work!</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="incidents" className="w-full">
        <TabsList>
          <TabsTrigger value="incidents">Incidents</TabsTrigger>
          <TabsTrigger value="talks">Toolbox Talks</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="incidents">
          <Card>
            <CardHeader>
              <CardTitle>Recent Incidents</CardTitle>
            </CardHeader>
            <CardContent>
              {incidents.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No incidents reported on this project</p>
              ) : (
                <div className="space-y-4">
                  {incidents.map((incident) => (
                    <div key={incident.id} className="border-l-4 border-orange-500 bg-orange-50 p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold">{incident.type.replace('_', ' ').toUpperCase()}</h4>
                          <p className="text-sm text-gray-600">{format(new Date(incident.date), 'MMM dd, yyyy')}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          incident.severity === 'critical' ? 'bg-red-100 text-red-800' :
                          incident.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                          incident.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {incident.severity}
                        </span>
                      </div>
                      <p className="mt-2 text-sm">{incident.description}</p>
                      {incident.location && <p className="text-sm text-gray-600 mt-1">Location: {incident.location}</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="talks">
          <Card>
            <CardHeader>
              <CardTitle>Toolbox Talks</CardTitle>
            </CardHeader>
            <CardContent>
              {talks.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No toolbox talks recorded yet</p>
              ) : (
                <div className="space-y-4">
                  {talks.map((talk) => (
                    <div key={talk.id} className="border p-4 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold">{talk.topic}</h4>
                          <p className="text-sm text-gray-600">{format(new Date(talk.date), 'MMM dd, yyyy')}</p>
                        </div>
                        <span className="text-sm text-gray-500">{talk.attendeeCount} attendees</span>
                      </div>
                      {talk.description && <p className="mt-2 text-sm">{talk.description}</p>}
                      <p className="text-sm text-gray-600 mt-1">Conducted by: {talk.conductedBy}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Safety Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Analytics will be available once more data is collected.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </div>
  );
}
