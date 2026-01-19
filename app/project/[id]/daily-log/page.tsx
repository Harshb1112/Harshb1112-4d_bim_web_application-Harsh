'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Plus, X } from 'lucide-react';
import { format } from 'date-fns';
import ProjectHeader from '@/components/project/ProjectHeader';
import ProjectNavigation from '@/components/project/ProjectNavigation';

export default function DailyLogPage() {
  const params = useParams();
  const projectId = params.id;
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [log, setLog] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [project, setProject] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    weather: '',
    temperatureLow: '',
    temperatureHigh: '',
    crewCount: '',
    totalHours: '',
    activities: '',
    deliveries: [] as Array<{ material: string; quantity: string; supplier: string }>,
    equipment: '',
    visitors: [] as Array<{ name: string; company: string; purpose: string }>,
    issues: '',
    delays: '',
    notes: ''
  });

  useEffect(() => {
    fetchProjectAndUser();
    fetchLog(selectedDate);
    fetchAllLogs();
  }, [selectedDate, projectId]);

  const fetchProjectAndUser = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch project
      const projectRes = await fetch(`/api/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (projectRes.ok) {
        const projectData = await projectRes.json();
        setProject(projectData);
        console.log('✅ Project loaded:', projectData.name);
      } else {
        console.error('❌ Failed to fetch project');
      }

      // Fetch user
      const userRes = await fetch('/api/users/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (userRes.ok) {
        const userData = await userRes.json();
        setUser(userData.user || userData);
        console.log('✅ User loaded:', userData.user?.email || userData.email);
      } else {
        console.error('❌ Failed to fetch user');
      }
    } catch (error) {
      console.error('Failed to fetch project/user:', error);
    }
  };

  const fetchLog = async (date: Date) => {
    try {
      const token = localStorage.getItem('token');
      const dateStr = format(date, 'yyyy-MM-dd');
      const res = await fetch(`/api/daily-logs?projectId=${projectId}&date=${dateStr}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setLog(data);
      if (data) {
        setFormData({
          weather: data.weather || '',
          temperatureLow: data.temperatureLow || '',
          temperatureHigh: data.temperatureHigh || '',
          crewCount: data.crewCount || '',
          totalHours: data.totalHours || '',
          activities: data.activities || '',
          deliveries: Array.isArray(data.deliveries) ? data.deliveries : [],
          equipment: data.equipment || '',
          visitors: Array.isArray(data.visitors) ? data.visitors : [],
          issues: data.issues || '',
          delays: data.delays || '',
          notes: data.notes || ''
        });
      }
    } catch (error) {
      console.error('Failed to fetch log:', error);
    }
  };

  const fetchAllLogs = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/daily-logs?projectId=${projectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
      setLogs([]);
    }
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');
      await fetch('/api/daily-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          projectId: parseInt(projectId as string),
          date: format(selectedDate, 'yyyy-MM-dd'),
          ...formData,
          temperatureLow: formData.temperatureLow ? parseFloat(formData.temperatureLow) : null,
          temperatureHigh: formData.temperatureHigh ? parseFloat(formData.temperatureHigh) : null,
          crewCount: formData.crewCount ? parseInt(formData.crewCount) : null,
          totalHours: formData.totalHours ? parseFloat(formData.totalHours) : null
        })
      });
      setIsDialogOpen(false);
      fetchLog(selectedDate);
      fetchAllLogs();
    } catch (error) {
      console.error('Failed to save log:', error);
    }
  };

  const addVisitor = () => {
    setFormData({
      ...formData,
      visitors: [...formData.visitors, { name: '', company: '', purpose: '' }]
    });
  };

  const removeVisitor = (index: number) => {
    setFormData({
      ...formData,
      visitors: formData.visitors.filter((_, i) => i !== index)
    });
  };

  const updateVisitor = (index: number, field: string, value: string) => {
    const updated = [...formData.visitors];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, visitors: updated });
  };

  const addDelivery = () => {
    setFormData({
      ...formData,
      deliveries: [...formData.deliveries, { material: '', quantity: '', supplier: '' }]
    });
  };

  const removeDelivery = (index: number) => {
    setFormData({
      ...formData,
      deliveries: formData.deliveries.filter((_, i) => i !== index)
    });
  };

  const updateDelivery = (index: number, field: string, value: string) => {
    const updated = [...formData.deliveries];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, deliveries: updated });
  };

  const getDatesWithLogs = () => {
    if (!Array.isArray(logs)) return [];
    return logs.map(l => new Date(l.date).toDateString());
  };

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
            <h1 className="text-3xl font-bold">Daily Construction Logs</h1>
            <p className="text-sm text-gray-500 mt-1">Track daily activities, weather, crew, and deliveries</p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => window.location.href = `/project/${projectId}`}
          >
            ← Back to Project
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Select Date</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="rounded-md border"
              modifiers={{
                hasLog: (date) => getDatesWithLogs().includes(date.toDateString())
              }}
              modifiersStyles={{
                hasLog: { fontWeight: 'bold', textDecoration: 'underline' }
              }}
            />
            <div className="mt-4">
              <p className="text-sm text-gray-500">Dates with logs</p>
              <div className="mt-2 space-y-1">
                {Array.isArray(logs) && logs.slice(0, 5).map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setSelectedDate(new Date(l.date))}
                    className="block w-full text-left text-sm p-2 hover:bg-gray-100 rounded"
                  >
                    {format(new Date(l.date), 'MMM dd, yyyy')}
                  </button>
                ))}
                {(!Array.isArray(logs) || logs.length === 0) && (
                  <p className="text-sm text-gray-400">No logs yet</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>
                {log ? `Log for ${format(selectedDate, 'MMMM dd, yyyy')}` : `No Log for ${format(selectedDate, 'MMMM dd, yyyy')}`}
              </CardTitle>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>{log ? 'Edit Log' : '+ Create Log'}</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Daily Log - {format(selectedDate, 'MMMM dd, yyyy')}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Weather</Label>
                        <Select value={formData.weather} onValueChange={(value) => setFormData({ ...formData, weather: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select weather" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Sunny">Sunny</SelectItem>
                            <SelectItem value="Partly Cloudy">Partly Cloudy</SelectItem>
                            <SelectItem value="Cloudy">Cloudy</SelectItem>
                            <SelectItem value="Rainy">Rainy</SelectItem>
                            <SelectItem value="Stormy">Stormy</SelectItem>
                            <SelectItem value="Snowy">Snowy</SelectItem>
                            <SelectItem value="Foggy">Foggy</SelectItem>
                            <SelectItem value="Windy">Windy</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label>Low Temp (°F)</Label>
                          <Input
                            type="number"
                            value={formData.temperatureLow}
                            onChange={(e) => setFormData({ ...formData, temperatureLow: e.target.value })}
                            placeholder="65"
                          />
                        </div>
                        <div>
                          <Label>High Temp (°F)</Label>
                          <Input
                            type="number"
                            value={formData.temperatureHigh}
                            onChange={(e) => setFormData({ ...formData, temperatureHigh: e.target.value })}
                            placeholder="85"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Crew Count</Label>
                        <Input
                          type="number"
                          value={formData.crewCount}
                          onChange={(e) => setFormData({ ...formData, crewCount: e.target.value })}
                          placeholder="Number of workers"
                        />
                      </div>
                      <div>
                        <Label>Total Hours Worked</Label>
                        <Input
                          type="number"
                          step="0.5"
                          value={formData.totalHours}
                          onChange={(e) => setFormData({ ...formData, totalHours: e.target.value })}
                          placeholder="40"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Activities</Label>
                      <Textarea
                        value={formData.activities}
                        onChange={(e) => setFormData({ ...formData, activities: e.target.value })}
                        placeholder="Work performed today..."
                        rows={3}
                      />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <Label>Deliveries</Label>
                        <Button type="button" size="sm" onClick={addDelivery} variant="outline">
                          <Plus className="h-4 w-4 mr-1" /> Add Delivery
                        </Button>
                      </div>
                      {formData.deliveries.map((delivery, index) => (
                        <div key={index} className="border rounded-lg p-3 mb-2 space-y-2">
                          <div className="flex justify-between items-start">
                            <div className="grid grid-cols-3 gap-2 flex-1">
                              <Input
                                placeholder="Material"
                                value={delivery.material}
                                onChange={(e) => updateDelivery(index, 'material', e.target.value)}
                              />
                              <Input
                                placeholder="Quantity"
                                value={delivery.quantity}
                                onChange={(e) => updateDelivery(index, 'quantity', e.target.value)}
                              />
                              <Input
                                placeholder="Supplier"
                                value={delivery.supplier}
                                onChange={(e) => updateDelivery(index, 'supplier', e.target.value)}
                              />
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => removeDelivery(index)}
                              className="ml-2"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div>
                      <Label>Equipment</Label>
                      <Textarea
                        value={formData.equipment}
                        onChange={(e) => setFormData({ ...formData, equipment: e.target.value })}
                        placeholder="Equipment used..."
                        rows={2}
                      />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <Label>Site Visitors</Label>
                        <Button type="button" size="sm" onClick={addVisitor} variant="outline">
                          <Plus className="h-4 w-4 mr-1" /> Add Visitor
                        </Button>
                      </div>
                      {formData.visitors.map((visitor, index) => (
                        <div key={index} className="border rounded-lg p-3 mb-2 space-y-2">
                          <div className="flex justify-between items-start">
                            <div className="grid grid-cols-3 gap-2 flex-1">
                              <Input
                                placeholder="Name"
                                value={visitor.name}
                                onChange={(e) => updateVisitor(index, 'name', e.target.value)}
                              />
                              <Input
                                placeholder="Company"
                                value={visitor.company}
                                onChange={(e) => updateVisitor(index, 'company', e.target.value)}
                              />
                              <Input
                                placeholder="Purpose"
                                value={visitor.purpose}
                                onChange={(e) => updateVisitor(index, 'purpose', e.target.value)}
                              />
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => removeVisitor(index)}
                              className="ml-2"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div>
                      <Label>Delays/Issues</Label>
                      <Textarea
                        value={formData.delays}
                        onChange={(e) => setFormData({ ...formData, delays: e.target.value })}
                        placeholder="Any delays or issues encountered..."
                        rows={2}
                      />
                    </div>
                    <div>
                      <Label>Additional Issues</Label>
                      <Textarea
                        value={formData.issues}
                        onChange={(e) => setFormData({ ...formData, issues: e.target.value })}
                        placeholder="Other problems encountered..."
                        rows={2}
                      />
                    </div>
                    <div>
                      <Label>Notes</Label>
                      <Textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Additional notes..."
                        rows={3}
                      />
                    </div>
                    <Button onClick={handleSave} className="w-full">Save Log</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {log ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-500">Weather</p>
                    <p>{log.weather || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-500">Temperature</p>
                    <p>
                      {log.temperatureLow && log.temperatureHigh 
                        ? `${log.temperatureLow}°F - ${log.temperatureHigh}°F` 
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-500">Crew Count</p>
                    <p>{log.crewCount || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-500">Total Hours Worked</p>
                    <p>{log.totalHours ? `${log.totalHours} hrs` : 'N/A'}</p>
                  </div>
                </div>
                {log.activities && (
                  <div>
                    <p className="text-sm font-semibold text-gray-500">Activities</p>
                    <p className="whitespace-pre-wrap">{log.activities}</p>
                  </div>
                )}
                {Array.isArray(log.deliveries) && log.deliveries.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-gray-500 mb-2">Deliveries</p>
                    <div className="space-y-2">
                      {log.deliveries.map((delivery: any, idx: number) => (
                        <div key={idx} className="border rounded p-2 bg-gray-50">
                          <p><span className="font-medium">Material:</span> {delivery.material}</p>
                          <p><span className="font-medium">Quantity:</span> {delivery.quantity}</p>
                          <p><span className="font-medium">Supplier:</span> {delivery.supplier}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {log.equipment && (
                  <div>
                    <p className="text-sm font-semibold text-gray-500">Equipment</p>
                    <p className="whitespace-pre-wrap">{log.equipment}</p>
                  </div>
                )}
                {Array.isArray(log.visitors) && log.visitors.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-gray-500 mb-2">Site Visitors</p>
                    <div className="space-y-2">
                      {log.visitors.map((visitor: any, idx: number) => (
                        <div key={idx} className="border rounded p-2 bg-gray-50">
                          <p><span className="font-medium">Name:</span> {visitor.name}</p>
                          <p><span className="font-medium">Company:</span> {visitor.company}</p>
                          <p><span className="font-medium">Purpose:</span> {visitor.purpose}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {log.delays && (
                  <div>
                    <p className="text-sm font-semibold text-gray-500">Delays/Issues</p>
                    <p className="whitespace-pre-wrap">{log.delays}</p>
                  </div>
                )}
                {log.issues && (
                  <div>
                    <p className="text-sm font-semibold text-gray-500">Additional Issues</p>
                    <p className="whitespace-pre-wrap">{log.issues}</p>
                  </div>
                )}
                {log.notes && (
                  <div>
                    <p className="text-sm font-semibold text-gray-500">Notes</p>
                    <p className="whitespace-pre-wrap">{log.notes}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <FileText className="w-16 h-16 mb-4" />
                <p>No log for {format(selectedDate, 'MMMM dd, yyyy')}</p>
                <p className="text-sm">Create a daily log to track activities for this date</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
    </div>
  );
}
