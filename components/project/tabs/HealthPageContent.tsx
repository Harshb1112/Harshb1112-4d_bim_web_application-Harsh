'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { AlertTriangle, TrendingDown, Sparkles, Save } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface HealthPageContentProps {
  projectId: number;
}

export default function HealthPageContent({ projectId }: HealthPageContentProps) {
  const [health, setHealth] = useState<any>(null);
  const [historicalHealth, setHistoricalHealth] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch health
      const healthRes = await fetch(`/api/schedule-health?projectId=${projectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const healthData = await healthRes.json();
      setHealth(healthData);

      // Fetch historical health data
      const historyRes = await fetch(`/api/schedule-health/history?projectId=${projectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setHistoricalHealth(historyData);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getHealthStatus = (score: number) => {
    if (score >= 80) return { label: 'Excellent', color: 'text-green-600', bg: 'bg-green-100' };
    if (score >= 60) return { label: 'Good', color: 'text-blue-600', bg: 'bg-blue-100' };
    if (score >= 40) return { label: 'Fair', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    if (score >= 20) return { label: 'Poor', color: 'text-orange-600', bg: 'bg-orange-100' };
    return { label: 'Critical', color: 'text-red-600', bg: 'bg-red-100' };
  };

  const handleAIAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/ai/project-insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          projectId: parseInt(projectId as any),
          healthMetrics: health
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.needsReentry || data.decryptionError) {
          alert('⚠️ API Key Error\n\nYour OpenAI API key needs to be re-entered.\n\nPlease go to Settings → AI Config and enter your API key again.');
        } else if (data.apiKeyMissing) {
          alert('⚠️ No API Key\n\nPlease configure your OpenAI API key in Settings → AI Config first.');
        } else if (data.noCredits) {
          alert('⚠️ No Credits\n\nYour OpenAI account has no credits. Please add credits at platform.openai.com');
        } else {
          alert(`❌ AI Analysis Failed\n\n${data.error || 'Unknown error'}`);
        }
        return;
      }

      setAiAnalysis(data.analysis);
    } catch (error) {
      console.error('AI Analysis error:', error);
      alert('❌ Failed to generate AI analysis. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveSnapshot = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      
      await fetch(`/api/schedule-health?projectId=${projectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      await fetchData();
      
      alert('✓ Snapshot saved successfully!');
    } catch (error) {
      console.error('Save snapshot error:', error);
      alert('Failed to save snapshot. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  const status = getHealthStatus(health?.overallScore || 10);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Schedule Health Dashboard</h2>
          <p className="text-sm text-gray-500 mt-1">AI-powered project health analysis and EVM metrics</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleAIAnalysis} 
            variant="outline"
            disabled={isAnalyzing}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {isAnalyzing ? 'Analyzing...' : 'AI Analysis'}
          </Button>
          <Button 
            onClick={handleSaveSnapshot}
            disabled={isSaving}
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Snapshot'}
          </Button>
        </div>
      </div>

      {aiAnalysis && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              AI Analysis & Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <p className="whitespace-pre-wrap text-gray-700">{aiAnalysis}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className={`w-24 h-24 rounded-full ${status.bg} flex items-center justify-center`}>
                <span className={`text-4xl font-bold ${status.color}`}>
                  {health?.overallScore || 10}
                </span>
              </div>
              <div>
                <h3 className="text-xl font-semibold">Overall Health Score</h3>
                <p className={`text-sm ${status.color}`}>
                  Project requires immediate action
                </p>
              </div>
            </div>
            <div className="flex gap-8">
              <div className="text-center">
                <p className="text-sm text-gray-500">Schedule</p>
                <p className="text-3xl font-bold">{health?.scheduleScore || 0}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500">Cost</p>
                <p className="text-3xl font-bold">{health?.costScore || 0}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500">Resources</p>
                <p className="text-3xl font-bold">{health?.resourceScore || 0}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="evm" className="w-full">
        <TabsList>
          <TabsTrigger value="evm">EVM Metrics</TabsTrigger>
          <TabsTrigger value="risk">Risk Alerts (7)</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="evm" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="text-sm text-gray-500">SPI</div>
                  </div>
                  <p className="text-xs text-gray-400 mb-1">Schedule Performance Index</p>
                  <p className="text-3xl font-bold text-red-600">{health?.spi?.toFixed(2) || '0.00'}</p>
                  <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-red-600 h-2 rounded-full" style={{ width: `${Math.min((health?.spi || 0) * 100, 100)}%` }}></div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="text-sm text-gray-500">CPI</div>
                  </div>
                  <p className="text-xs text-gray-400 mb-1">Cost Performance Index</p>
                  <p className="text-3xl font-bold text-red-600">{health?.cpi?.toFixed(2) || '0.00'}</p>
                  <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-red-600 h-2 rounded-full" style={{ width: `${Math.min((health?.cpi || 0) * 100, 100)}%` }}></div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="w-4 h-4 text-red-500" />
                    <div className="text-sm text-gray-500">Schedule Variance</div>
                  </div>
                  <p className="text-3xl font-bold text-red-600">${health?.scheduleVariance?.toFixed(0) || '-1'}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="w-4 h-4 text-red-500" />
                    <div className="text-sm text-gray-500">Cost Variance</div>
                  </div>
                  <p className="text-3xl font-bold text-red-600">${health?.costVariance?.toFixed(0) || '-1'}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Health Dimensions</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <RadarChart data={[
                    { dimension: 'Schedule', value: health?.scheduleScore || 0, fullMark: 100 },
                    { dimension: 'Cost', value: health?.costScore || 0, fullMark: 100 },
                    { dimension: 'Resources', value: health?.resourceScore || 0, fullMark: 100 }
                  ]}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="dimension" />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    <Radar 
                      name="Health Score" 
                      dataKey="value" 
                      stroke="#f97316" 
                      fill="#f97316" 
                      fillOpacity={0.6} 
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Earned Value Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-gray-100 rounded-lg">
                  <p className="text-sm text-gray-600">Budget at Completion (BAC)</p>
                  <p className="text-2xl font-bold">${health?.bac || 0}</p>
                </div>
                <div className="p-4 bg-gray-100 rounded-lg">
                  <p className="text-sm text-gray-600">Planned Value (PV)</p>
                  <p className="text-2xl font-bold">${health?.pv || 1}</p>
                </div>
                <div className="p-4 bg-gray-100 rounded-lg">
                  <p className="text-sm text-gray-600">Earned Value (EV)</p>
                  <p className="text-2xl font-bold">${health?.ev || 0}</p>
                </div>
                <div className="p-4 bg-gray-100 rounded-lg">
                  <p className="text-sm text-gray-600">Actual Cost (AC)</p>
                  <p className="text-2xl font-bold">${health?.ac || 1}</p>
                </div>
                <div className="p-4 bg-gray-100 rounded-lg">
                  <p className="text-sm text-gray-600">Estimate at Completion (EAC)</p>
                  <p className="text-2xl font-bold">${health?.eac || 0}</p>
                </div>
                <div className="p-4 bg-gray-100 rounded-lg">
                  <p className="text-sm text-gray-600">Estimate to Complete (ETC)</p>
                  <p className="text-2xl font-bold">${health?.etc || 0}</p>
                </div>
                <div className="p-4 bg-green-100 rounded-lg">
                  <p className="text-sm text-gray-600">Variance at Completion (VAC)</p>
                  <p className="text-2xl font-bold text-green-600">${health?.vac || 0}</p>
                </div>
                <div className="p-4 bg-gray-100 rounded-lg">
                  <p className="text-sm text-gray-600">To-Complete PI (TCPI)</p>
                  <p className="text-2xl font-bold">{health?.tcpi?.toFixed(2) || '1.00'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risk">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                Risk Alerts (7)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border-l-4 border-red-500 bg-red-50">
                  <h4 className="font-semibold text-red-800">Critical Schedule Delay</h4>
                  <p className="text-sm text-red-700">SPI is {health?.spi?.toFixed(2) || '0.00'} - Project is significantly behind schedule</p>
                </div>
                <div className="p-4 border-l-4 border-red-500 bg-red-50">
                  <h4 className="font-semibold text-red-800">Budget Overrun Risk</h4>
                  <p className="text-sm text-red-700">CPI is {health?.cpi?.toFixed(2) || '0.00'} - Cost performance needs immediate attention</p>
                </div>
                <div className="p-4 border-l-4 border-red-500 bg-red-50">
                  <h4 className="font-semibold text-red-800">Resource Allocation Critical</h4>
                  <p className="text-sm text-red-700">Resource score is {health?.resourceScore || 0} - Severe resource issues detected</p>
                </div>
                <div className="p-4 border-l-4 border-red-500 bg-red-50">
                  <h4 className="font-semibold text-red-800">Project Health Critical</h4>
                  <p className="text-sm text-red-700">Overall score is {health?.overallScore || 10} - Multiple areas need immediate attention</p>
                </div>
                <div className="p-4 border-l-4 border-orange-500 bg-orange-50">
                  <h4 className="font-semibold text-orange-800">Significant Cost Variance</h4>
                  <p className="text-sm text-orange-700">Cost variance is ${health?.costVariance?.toFixed(0) || '-1'} - Project is over budget</p>
                </div>
                <div className="p-4 border-l-4 border-orange-500 bg-orange-50">
                  <h4 className="font-semibold text-orange-800">Significant Schedule Variance</h4>
                  <p className="text-sm text-orange-700">Schedule variance is ${health?.scheduleVariance?.toFixed(0) || '-1'} - Behind planned value</p>
                </div>
                <div className="p-4 border-l-4 border-orange-500 bg-orange-50">
                  <h4 className="font-semibold text-orange-800">Performance Index Below Target</h4>
                  <p className="text-sm text-orange-700">Both SPI and CPI are below 1.0 - Project requires corrective action</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
            </CardHeader>
            <CardContent>
              {historicalHealth.length > 1 ? (
                <div className="space-y-6">
                  <div>
                    <h4 className="font-semibold mb-4">Health Score Trends</h4>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={historicalHealth.slice(-10).map(h => ({
                        date: new Date(h.date).toLocaleDateString(),
                        overall: h.overallScore,
                        schedule: h.scheduleScore,
                        cost: h.costScore,
                        resource: h.resourceScore
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="overall" stroke="#8b5cf6" name="Overall" strokeWidth={2} />
                        <Line type="monotone" dataKey="schedule" stroke="#3b82f6" name="Schedule" />
                        <Line type="monotone" dataKey="cost" stroke="#10b981" name="Cost" />
                        <Line type="monotone" dataKey="resource" stroke="#f59e0b" name="Resources" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No historical data yet. Click "Save Snapshot" to start tracking trends.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
