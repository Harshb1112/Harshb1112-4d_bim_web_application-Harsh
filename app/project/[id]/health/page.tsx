'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { AlertTriangle, TrendingDown, Sparkles, Save } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import ProjectHeader from '@/components/project/ProjectHeader';
import ProjectNavigation from '@/components/project/ProjectNavigation';

export default function HealthPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id;
  const [project, setProject] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
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
      
      // Fetch project
      const projectRes = await fetch(`/api/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const projectData = await projectRes.json();
      setProject(projectData);

      // Fetch user
      const userRes = await fetch('/api/users/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const userData = await userRes.json();
      setUser(userData);

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
          projectId: parseInt(projectId as string),
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
      
      // The snapshot is automatically saved when we fetch health data
      // But we can force a new snapshot here
      await fetch(`/api/schedule-health?projectId=${projectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Refresh the data
      await fetchData();
      
      alert('✓ Snapshot saved successfully!');
    } catch (error) {
      console.error('Save snapshot error:', error);
      alert('Failed to save snapshot. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const getRiskAlerts = () => {
    const alerts = [];
    
    // Schedule Risk
    if (health?.spi < 0.8) {
      alerts.push({
        severity: 'critical',
        title: 'Critical Schedule Delay',
        description: `SPI is ${health.spi.toFixed(2)} - Project is significantly behind schedule`,
        color: 'red'
      });
    } else if (health?.spi < 0.9) {
      alerts.push({
        severity: 'warning',
        title: 'Schedule Delay Warning',
        description: `SPI is ${health.spi.toFixed(2)} - Project is slightly behind schedule`,
        color: 'orange'
      });
    }
    
    // Cost Risk
    if (health?.cpi < 0.8) {
      alerts.push({
        severity: 'critical',
        title: 'Budget Overrun Risk',
        description: `CPI is ${health.cpi.toFixed(2)} - Cost performance needs immediate attention`,
        color: 'red'
      });
    } else if (health?.cpi < 0.9) {
      alerts.push({
        severity: 'warning',
        title: 'Cost Overrun Warning',
        description: `CPI is ${health.cpi.toFixed(2)} - Costs are trending above budget`,
        color: 'orange'
      });
    }
    
    // Resource Risk
    if (health?.resourceScore < 40) {
      alerts.push({
        severity: 'critical',
        title: 'Resource Allocation Critical',
        description: `Resource score is ${health.resourceScore} - Severe resource issues detected`,
        color: 'red'
      });
    } else if (health?.resourceScore < 60) {
      alerts.push({
        severity: 'warning',
        title: 'Resource Allocation Warning',
        description: `Resource score is ${health.resourceScore} - Resource optimization needed`,
        color: 'orange'
      });
    }
    
    // Overall Health Risk
    if (health?.overallScore < 40) {
      alerts.push({
        severity: 'critical',
        title: 'Project Health Critical',
        description: `Overall score is ${health.overallScore} - Multiple areas need immediate attention`,
        color: 'red'
      });
    }
    
    // Cost Variance Risk
    if (health?.costVariance < -1000) {
      alerts.push({
        severity: 'warning',
        title: 'Significant Cost Variance',
        description: `Cost variance is $${health.costVariance.toFixed(0)} - Project is over budget`,
        color: 'orange'
      });
    }
    
    // Schedule Variance Risk
    if (health?.scheduleVariance < -1000) {
      alerts.push({
        severity: 'warning',
        title: 'Significant Schedule Variance',
        description: `Schedule variance is $${health.scheduleVariance.toFixed(0)} - Behind planned value`,
        color: 'orange'
      });
    }
    
    return alerts;
  };

  if (loading || !project || !user) {
    return <div className="p-6">Loading...</div>;
  }

  const status = getHealthStatus(health?.overallScore || 10);
  const riskAlerts = getRiskAlerts();

  return (
    <div>
      <ProjectHeader project={project} user={user} />
      <ProjectNavigation projectId={projectId as string} userRole={user.role} />
      
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Schedule Health Dashboard</h1>
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

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Overall Health Score */}
          <Card className="lg:col-span-1">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center">
                <div className={`w-32 h-32 rounded-full ${status.bg} flex items-center justify-center`}>
                  <span className={`text-4xl font-bold ${status.color}`}>
                    {health?.overallScore || 10}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-semibold">Overall Health Score</h3>
                <p className={`text-sm ${status.color}`}>
                  🔴 {status.label} — "Project requires immediate action"
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Top Metrics */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Top Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Schedule</p>
                  <p className="text-2xl font-bold">{health?.scheduleScore || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Cost</p>
                  <p className="text-2xl font-bold">{health?.costScore || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Resources</p>
                  <p className="text-2xl font-bold">{health?.resourceScore || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Health Dimensions Radar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Health Dimensions</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
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

        <Tabs defaultValue="evm" className="w-full">
          <TabsList>
            <TabsTrigger value="evm">EVM Metrics</TabsTrigger>
            <TabsTrigger value="risks">Risk Alerts</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="evm" className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">SPI</CardTitle>
                  <p className="text-xs text-gray-500">Schedule Performance Index</p>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{health?.spi?.toFixed(2) || '0.00'}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">CPI</CardTitle>
                  <p className="text-xs text-gray-500">Cost Performance Index</p>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{health?.cpi?.toFixed(2) || '0.00'}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-red-500" />
                    Schedule Variance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-red-600">
                    ${health?.scheduleVariance?.toFixed(0) || '-1'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-red-500" />
                    Cost Variance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-red-600">
                    ${health?.costVariance?.toFixed(0) || '-1'}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Earned Value Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <p className="text-sm text-gray-500">Budget at Completion (BAC)</p>
                    <p className="text-xl font-bold">${health?.bac || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Planned Value (PV)</p>
                    <p className="text-xl font-bold">${health?.pv || 1}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Earned Value (EV)</p>
                    <p className="text-xl font-bold">${health?.ev || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Actual Cost (AC)</p>
                    <p className="text-xl font-bold">${health?.ac || 1}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Estimate at Completion (EAC)</p>
                    <p className="text-xl font-bold">${health?.eac || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Estimate to Complete (ETC)</p>
                    <p className="text-xl font-bold">${health?.etc || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Variance at Completion (VAC)</p>
                    <p className="text-xl font-bold">${health?.vac || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">TCPI</p>
                    <p className="text-xl font-bold">{health?.tcpi?.toFixed(2) || '1.00'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="risks">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  Risk Alerts ({riskAlerts.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {riskAlerts.length > 0 ? (
                  <div className="space-y-4">
                    {riskAlerts.map((alert, index) => (
                      <div 
                        key={index}
                        className={`p-4 border-l-4 ${
                          alert.color === 'red' 
                            ? 'border-red-500 bg-red-50' 
                            : 'border-orange-500 bg-orange-50'
                        }`}
                      >
                        <h4 className={`font-semibold ${
                          alert.color === 'red' ? 'text-red-800' : 'text-orange-800'
                        }`}>
                          {alert.title}
                        </h4>
                        <p className={`text-sm ${
                          alert.color === 'red' ? 'text-red-700' : 'text-orange-700'
                        }`}>
                          {alert.description}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    <p className="text-lg font-semibold text-green-600">✓ No Risk Alerts</p>
                    <p className="text-sm mt-2">Project health metrics are within acceptable ranges</p>
                  </div>
                )}
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
                    
                    <div>
                      <h4 className="font-semibold mb-4">EVM Trends</h4>
                      <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={historicalHealth.slice(-10).map(h => ({
                          date: new Date(h.date).toLocaleDateString(),
                          spi: h.spi,
                          cpi: h.cpi
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis domain={[0, 2]} />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="spi" stroke="#3b82f6" name="SPI" strokeWidth={2} />
                          <Line type="monotone" dataKey="cpi" stroke="#10b981" name="CPI" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mt-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-gray-600">Trend Direction</p>
                        <p className="text-lg font-bold text-blue-600">
                          {historicalHealth.length >= 2 && 
                           historicalHealth[historicalHealth.length - 1].overallScore > 
                           historicalHealth[historicalHealth.length - 2].overallScore 
                            ? '↗ Improving' 
                            : '↘ Declining'}
                        </p>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg">
                        <p className="text-sm text-gray-600">Data Points</p>
                        <p className="text-lg font-bold text-green-600">{historicalHealth.length}</p>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <p className="text-sm text-gray-600">Tracking Since</p>
                        <p className="text-lg font-bold text-purple-600">
                          {new Date(historicalHealth[0].date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    <p className="text-lg font-semibold">No Historical Data Yet</p>
                    <p className="text-sm mt-2">
                      Trend analysis will be available once more health snapshots are collected.
                    </p>
                    <p className="text-sm mt-1">
                      Click "Refresh" periodically to build historical data.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
