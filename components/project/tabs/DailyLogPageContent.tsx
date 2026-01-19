'use client';

import { useEffect, useState } from 'react';
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

interface DailyLogPageContentProps {
  projectId: number;
}

export default function DailyLogPageContent({ projectId }: DailyLogPageContentProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [log, setLog] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    weather: '',
    temperatureLow: '',
    temperatureHigh: '',
    crewCount: '',
    totalHours: '',
    activities: '',
    deliveries: [] as Array<{ item: string; quantity: string; supplier: string }>,
    equipment: '',
    visitors: [] as Array<{ name: string; company: string; purpose: string; timeIn: string; timeOut: string }>,
    issues: '',
    delays: '',
    notes: ''
  });

  useEffect(() => {
    fetchLog(selectedDate);
    fetchAllLogs();
  }, [selectedDate, projectId]);

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
          projectId: parseInt(projectId as any),
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
      visitors: [...formData.visitors, { name: '', company: '', purpose: '', timeIn: '', timeOut: '' }]
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
      deliveries: [...formData.deliveries, { item: '', quantity: '', supplier: '' }]
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Daily Construction Logs</h2>
          <p className="text-sm text-gray-500 mt-1">Track daily activities, weather, crew, and deliveries</p>
        </div>
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
              <p className="text-sm text-gray-500">Recent logs</p>
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
                      <Label>Delays / Issues</Label>
                      <Textarea
                        value={formData.delays}
                        onChange={(e) => setFormData({ ...formData, delays: e.target.value })}
                        placeholder="Note any delays, issues, or concerns..."
                        rows={3}
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
                        <div key={index} className="border rounded-lg p-3 mb-2 space-y-2 bg-gray-50">
                          <div className="grid grid-cols-4 gap-2">
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
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => removeVisitor(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs">Time In</Label>
                              <Input
                                type="time"
                                value={visitor.timeIn}
                                onChange={(e) => updateVisitor(index, 'timeIn', e.target.value)}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Time Out</Label>
                              <Input
                                type="time"
                                value={visitor.timeOut}
                                onChange={(e) => updateVisitor(index, 'timeOut', e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <Label>Deliveries</Label>
                        <Button type="button" size="sm" onClick={addDelivery} variant="outline">
                          <Plus className="h-4 w-4 mr-1" /> Add Delivery
                        </Button>
                      </div>
                      {formData.deliveries.map((delivery, index) => (
                        <div key={index} className="border rounded-lg p-3 mb-2 bg-gray-50">
                          <div className="grid grid-cols-4 gap-2">
                            <Input
                              placeholder="Material/Equipment"
                              value={delivery.item}
                              onChange={(e) => updateDelivery(index, 'item', e.target.value)}
                            />
                            <Input
                              placeholder="Qty"
                              value={delivery.quantity}
                              onChange={(e) => updateDelivery(index, 'quantity', e.target.value)}
                            />
                            <Input
                              placeholder="Supplier"
                              value={delivery.supplier}
                              onChange={(e) => updateDelivery(index, 'supplier', e.target.value)}
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => removeDelivery(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
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
                {log.delays && (
                  <div>
                    <p className="text-sm font-semibold text-gray-500">Delays / Issues</p>
                    <p className="whitespace-pre-wrap">{log.delays}</p>
                  </div>
                )}
                {Array.isArray(log.visitors) && log.visitors.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-gray-500 mb-2">Site Visitors</p>
                    <div className="space-y-2">
                      {log.visitors.map((visitor: any, idx: number) => (
                        <div key={idx} className="border rounded p-3 bg-gray-50">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <p className="text-xs text-gray-500">Name</p>
                              <p className="font-medium">{visitor.name}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Company</p>
                              <p className="font-medium">{visitor.company}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Purpose</p>
                              <p className="font-medium">{visitor.purpose}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Time</p>
                              <p className="font-medium">{visitor.timeIn} - {visitor.timeOut}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {Array.isArray(log.deliveries) && log.deliveries.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-gray-500 mb-2">Deliveries</p>
                    <div className="space-y-2">
                      {log.deliveries.map((delivery: any, idx: number) => (
                        <div key={idx} className="border rounded p-2 bg-gray-50">
                          <p><span className="font-medium">Item:</span> {delivery.item}</p>
                          <p><span className="font-medium">Quantity:</span> {delivery.quantity}</p>
                          <p><span className="font-medium">Supplier:</span> {delivery.supplier}</p>
                        </div>
                      ))}
                    </div>
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
  );
}
