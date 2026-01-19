'use client';

import { useEffect, useState } from 'react';
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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

interface SafetyPageContentProps {
  projectId: number;
}

const SAFETY_TOPICS = [
  'Fall Protection',
  'Electrical Safety',
  'PPE Requirements',
  'Ladder Safety',
  'Housekeeping',
  'Fire Safety',
  'Heat Stress Prevention',
  'Cold Stress Prevention',
  'Hazard Communication',
  'Lockout/Tagout',
  'Confined Space Entry',
  'Excavation Safety',
  'Crane Safety',
  'Scaffolding Safety',
  'Tool Safety',
  'Custom Topic...'
];

export default function SafetyPageContent({ projectId }: SafetyPageContentProps) {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [talks, setTalks] = useState<any[]>([]);
  const [isIncidentDialogOpen, setIsIncidentDialogOpen] = useState(false);
  const [isTalkDialogOpen, setIsTalkDialogOpen] = useState(false);

  const [incidentForm, setIncidentForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    type: '',
    severity: '',
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
    customTopic: '',
    description: '',
    conductedBy: '',
    attendees: '',
    attendeeCount: '',
    duration: '',
    notes: ''
  });

  useEffect(() => {
    fetchIncidents();
    fetchTalks();
  }, [projectId]);

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
    if (!incidentForm.type || !incidentForm.severity || !incidentForm.description) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/safety/incidents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          projectId: parseInt(projectId as any),
          ...incidentForm
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create incident');
      }

      setIsIncidentDialogOpen(false);
      setIncidentForm({
        date: format(new Date(), 'yyyy-MM-dd'),
        type: '',
        severity: '',
        location: '',
        description: '',
        injuredPerson: '',
        witnessNames: '',
        rootCause: '',
        correctiveAction: ''
      });
      fetchIncidents();
      alert('Incident reported successfully');
    } catch (error) {
      console.error('Failed to create incident:', error);
      alert('Failed to report incident');
    }
  };

  const handleTalkSubmit = async () => {
    const finalTopic = talkForm.topic === 'Custom Topic...' ? talkForm.customTopic : talkForm.topic;
    
    if (!finalTopic || !talkForm.conductedBy) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/safety/toolbox-talks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          projectId: parseInt(projectId as any),
          date: talkForm.date,
          topic: finalTopic,
          description: talkForm.description,
          conductedBy: talkForm.conductedBy,
          attendees: talkForm.attendees,
          attendeeCount: parseInt(talkForm.attendeeCount) || 0,
          duration: parseInt(talkForm.duration) || null,
          notes: talkForm.notes
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create toolbox talk');
      }

      setIsTalkDialogOpen(false);
      setTalkForm({
        date: format(new Date(), 'yyyy-MM-dd'),
        topic: '',
        customTopic: '',
        description: '',
        conductedBy: '',
        attendees: '',
        attendeeCount: '',
        duration: '',
        notes: ''
      });
      fetchTalks();
      alert('Toolbox talk recorded successfully');
    } catch (error) {
      console.error('Failed to create talk:', error);
      alert('Failed to record toolbox talk');
    }
  };

  const openIncidents = incidents.filter(i => i.status === 'open').length;
  const thisMonthTalks = talks.filter(t => {
    const talkDate = new Date(t.date);
    const now = new Date();
    return talkDate.getMonth() === now.getMonth() && talkDate.getFullYear() === now.getFullYear();
  }).length;

  // Prepare chart data - ONLY from real data
  const incidentsByType = Object.entries(
    incidents.reduce((acc: any, inc) => {
      const type = inc.type.replace('_', ' ');
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const incidentsBySeverity = Object.entries(
    incidents.reduce((acc: any, inc) => {
      acc[inc.severity] = (acc[inc.severity] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const monthlyTrend = Object.entries(
    incidents.reduce((acc: any, inc) => {
      const month = new Date(inc.date).toLocaleDateString('en-US', { month: 'short' });
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {})
  ).map(([month, count]) => ({ month, count }));

  const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899'];
  const SEVERITY_COLORS: any = {
    'low': '#10b981',
    'medium': '#f59e0b', 
    'high': '#f97316',
    'critical': '#ef4444'
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Safety Compliance</h2>
          <p className="text-sm text-gray-500 mt-1">Track incidents, toolbox talks, and safety metrics</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isTalkDialogOpen} onOpenChange={setIsTalkDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">New Toolbox Talk</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Record Toolbox Talk</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Date *</Label>
                    <Input
                      type="date"
                      value={talkForm.date}
                      onChange={(e) => setTalkForm({ ...talkForm, date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Number of Attendees</Label>
                    <Input
                      type="number"
                      value={talkForm.attendeeCount}
                      onChange={(e) => setTalkForm({ ...talkForm, attendeeCount: e.target.value })}
                      placeholder="e.g., 12"
                    />
                  </div>
                </div>
                <div>
                  <Label>Topic *</Label>
                  <Select 
                    value={talkForm.topic} 
                    onValueChange={(value) => setTalkForm({ ...talkForm, topic: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select topic" />
                    </SelectTrigger>
                    <SelectContent>
                      {SAFETY_TOPICS.map((topic) => (
                        <SelectItem key={topic} value={topic}>
                          {topic}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {talkForm.topic === 'Custom Topic...' && (
                  <div>
                    <Label>Custom Topic *</Label>
                    <Input
                      value={talkForm.customTopic}
                      onChange={(e) => setTalkForm({ ...talkForm, customTopic: e.target.value })}
                      placeholder="Enter custom topic"
                    />
                  </div>
                )}
                <div>
                  <Label>Conducted By *</Label>
                  <Input
                    value={talkForm.conductedBy}
                    onChange={(e) => setTalkForm({ ...talkForm, conductedBy: e.target.value })}
                    placeholder="Name of person conducting the talk"
                  />
                </div>
                <div>
                  <Label>Duration (minutes)</Label>
                  <Input
                    type="number"
                    value={talkForm.duration}
                    onChange={(e) => setTalkForm({ ...talkForm, duration: e.target.value })}
                    placeholder="e.g., 15"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={talkForm.description}
                    onChange={(e) => setTalkForm({ ...talkForm, description: e.target.value })}
                    placeholder="Brief description of the talk..."
                    rows={3}
                  />
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
                    placeholder="Key points discussed, questions raised, etc."
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setIsTalkDialogOpen(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button onClick={handleTalkSubmit} className="flex-1">
                    Save
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isIncidentDialogOpen} onOpenChange={setIsIncidentDialogOpen}>
            <DialogTrigger asChild>
              <Button>Report Incident</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Report Safety Incident</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Incident Date *</Label>
                    <Input
                      type="date"
                      value={incidentForm.date}
                      onChange={(e) => setIncidentForm({ ...incidentForm, date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Location</Label>
                    <Input
                      value={incidentForm.location}
                      onChange={(e) => setIncidentForm({ ...incidentForm, location: e.target.value })}
                      placeholder="e.g., Level 3, Zone A"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Incident Type *</Label>
                    <Select value={incidentForm.type} onValueChange={(v) => setIncidentForm({ ...incidentForm, type: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="near_miss">Near Miss</SelectItem>
                        <SelectItem value="first_aid">First Aid</SelectItem>
                        <SelectItem value="medical">Medical Treatment</SelectItem>
                        <SelectItem value="lost_time">Lost Time</SelectItem>
                        <SelectItem value="fatality">Fatality</SelectItem>
                        <SelectItem value="property_damage">Property Damage</SelectItem>
                        <SelectItem value="environmental">Environmental</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Severity *</Label>
                    <Select value={incidentForm.severity} onValueChange={(v) => setIncidentForm({ ...incidentForm, severity: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select severity" />
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
                  <Label>Description *</Label>
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
                    placeholder="Name of injured person"
                  />
                </div>
                <div>
                  <Label>Witness Names</Label>
                  <Input
                    value={incidentForm.witnessNames}
                    onChange={(e) => setIncidentForm({ ...incidentForm, witnessNames: e.target.value })}
                    placeholder="Names of witnesses"
                  />
                </div>
                <div>
                  <Label>Root Cause Analysis</Label>
                  <Textarea
                    value={incidentForm.rootCause}
                    onChange={(e) => setIncidentForm({ ...incidentForm, rootCause: e.target.value })}
                    placeholder="Preliminary root cause assessment..."
                    rows={2}
                  />
                </div>
                <div>
                  <Label>Corrective Actions</Label>
                  <Textarea
                    value={incidentForm.correctiveAction}
                    onChange={(e) => setIncidentForm({ ...incidentForm, correctiveAction: e.target.value })}
                    placeholder="Actions taken or required..."
                    rows={2}
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setIsIncidentDialogOpen(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button onClick={handleIncidentSubmit} className="flex-1">
                    Submit Report
                  </Button>
                </div>
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
                          <p className="text-sm text-gray-600">{new Date(incident.date).toLocaleDateString()}</p>
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
                          <p className="text-sm text-gray-600">{new Date(talk.date).toLocaleDateString()}</p>
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
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Incidents by Type</CardTitle>
                </CardHeader>
                <CardContent>
                  {incidents.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No data available</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={incidentsByType}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Incidents by Severity</CardTitle>
                </CardHeader>
                <CardContent>
                  {incidents.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No data available</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={incidentsBySeverity}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {incidentsBySeverity.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={SEVERITY_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Incident Trend</CardTitle>
              </CardHeader>
              <CardContent>
                {incidents.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No data available</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="count" stroke="#ef4444" strokeWidth={2} name="Incidents" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Most Common Topics</CardTitle>
                </CardHeader>
                <CardContent>
                  {talks.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No data available</p>
                  ) : (
                    <div className="space-y-2">
                      {Object.entries(
                        talks.reduce((acc: any, talk) => {
                          acc[talk.topic] = (acc[talk.topic] || 0) + 1;
                          return acc;
                        }, {})
                      )
                      .sort((a: any, b: any) => b[1] - a[1])
                      .slice(0, 5)
                      .map(([topic, count]) => (
                        <div key={topic} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm">{topic}</span>
                          <span className="font-bold text-green-600">{count as number}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Total Attendees</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <p className="text-5xl font-bold text-green-600">
                      {talks.reduce((sum, talk) => sum + (talk.attendeeCount || 0), 0)}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">Across {talks.length} toolbox talks</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Average Duration</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <p className="text-5xl font-bold text-blue-600">
                      {talks.length > 0 
                        ? Math.round(talks.reduce((sum, talk) => sum + (talk.duration || 0), 0) / talks.length)
                        : 0}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">minutes per talk</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Safety Performance Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-3xl font-bold text-blue-600">{incidents.length}</p>
                    <p className="text-sm text-gray-600 mt-1">Total Incidents</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-3xl font-bold text-green-600">{talks.length}</p>
                    <p className="text-sm text-gray-600 mt-1">Toolbox Talks</p>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <p className="text-3xl font-bold text-yellow-600">
                      {incidents.filter(i => i.severity === 'high' || i.severity === 'critical').length}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">High/Critical</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <p className="text-3xl font-bold text-purple-600">
                      {incidents.filter(i => i.status === 'resolved').length}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">Resolved</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
