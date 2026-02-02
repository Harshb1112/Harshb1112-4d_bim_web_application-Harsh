'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { AlertTriangle, TrendingDown, Sparkles, Save } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { convertCurrency, CURRENCY_SYMBOLS } from '@/lib/currency-converter';

interface HealthPageContentProps {
  projectId: number;
}

interface ProjectInfo {
  currency: string;
  name: string;
}

export default function HealthPageContent({ projectId }: HealthPageContentProps) {
  const [health, setHealth] = useState<any>(null);
  const [historicalHealth, setHistoricalHealth] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [projectInfo, setProjectInfo] = useState<ProjectInfo>({ currency: 'USD', name: '' });
  const [displayCurrency, setDisplayCurrency] = useState<string>('USD');

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch project info for currency
      const projectRes = await fetch(`/api/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (projectRes.ok) {
        const projectData = await projectRes.json();
        const projCurrency = projectData.currency || 'USD';
        setProjectInfo({
          currency: projCurrency,
          name: projectData.name || ''
        });
        setDisplayCurrency(projCurrency); // Set display currency to project currency
      }
      
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

  // Currency formatting helper with conversion
  const formatCurrency = (amount: number) => {
    // Data is stored in project's native currency, convert to display currency
    const converted = convertCurrency(amount, projectInfo.currency, displayCurrency);
    const symbol = CURRENCY_SYMBOLS[displayCurrency] || displayCurrency;
    
    return `${symbol}${Math.abs(converted).toLocaleString('en-US', { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    })}`;
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

  // Available currencies for dropdown
  const currencies = [
    { code: 'INR', name: 'India (₹)', symbol: '₹' },
    { code: 'USD', name: 'USA ($)', symbol: '$' },
    { code: 'EUR', name: 'Europe (€)', symbol: '€' },
    { code: 'GBP', name: 'UK (£)', symbol: '£' },
    { code: 'AED', name: 'UAE (د.إ)', symbol: 'د.إ' },
    { code: 'SAR', name: 'Saudi (ر.س)', symbol: 'ر.س' },
    { code: 'AUD', name: 'Australia (A$)', symbol: 'A$' },
    { code: 'CAD', name: 'Canada (C$)', symbol: 'C$' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Schedule Health Dashboard</h2>
          <p className="text-sm text-gray-500 mt-1">AI-powered project health analysis and EVM metrics</p>
        </div>
        <div className="flex gap-2 items-center">
          {/* Currency Selector */}
          <select
            value={displayCurrency}
            onChange={(e) => setDisplayCurrency(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm bg-white"
          >
            {currencies.map(curr => (
              <option key={curr.code} value={curr.code}>
                {curr.name}
              </option>
            ))}
          </select>
          
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
                  <p className={`text-3xl font-bold ${(health?.spi || 0) >= 1 ? 'text-green-600' : 'text-red-600'}`}>
                    {health?.spi?.toFixed(2) || '0.00'}
                  </p>
                  <p className="text-xs mt-1 text-gray-500">
                    {(health?.spi || 0) >= 1 ? '✅ On or ahead of schedule' : '⚠️ Behind schedule'}
                  </p>
                  <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${(health?.spi || 0) >= 1 ? 'bg-green-600' : 'bg-red-600'}`}
                      style={{ width: `${Math.min((health?.spi || 0) * 50, 100)}%` }}
                    ></div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="text-sm text-gray-500">CPI</div>
                  </div>
                  <p className="text-xs text-gray-400 mb-1">Cost Performance Index</p>
                  <p className={`text-3xl font-bold ${(health?.cpi || 0) >= 1 ? 'text-green-600' : 'text-red-600'}`}>
                    {health?.cpi?.toFixed(2) || '0.00'}
                  </p>
                  <p className="text-xs mt-1 text-gray-500">
                    {(health?.cpi || 0) >= 1 ? '✅ On or under budget' : '⚠️ Over budget'}
                  </p>
                  <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${(health?.cpi || 0) >= 1 ? 'bg-green-600' : 'bg-red-600'}`}
                      style={{ width: `${Math.min((health?.cpi || 0) * 50, 100)}%` }}
                    ></div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    {(health?.scheduleVariance || 0) >= 0 ? (
                      <div className="w-4 h-4 text-green-500">✓</div>
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-500" />
                    )}
                    <div className="text-sm text-gray-500">Schedule Variance</div>
                  </div>
                  <p className={`text-3xl font-bold ${(health?.scheduleVariance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(health?.scheduleVariance || 0)}
                  </p>
                  <p className="text-xs mt-1 text-gray-500">
                    {(health?.scheduleVariance || 0) >= 0 ? 'Ahead of planned value' : 'Behind planned value'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    {(health?.costVariance || 0) >= 0 ? (
                      <div className="w-4 h-4 text-green-500">✓</div>
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-500" />
                    )}
                    <div className="text-sm text-gray-500">Cost Variance</div>
                  </div>
                  <p className={`text-3xl font-bold ${(health?.costVariance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(health?.costVariance || 0)}
                  </p>
                  <p className="text-xs mt-1 text-gray-500">
                    {(health?.costVariance || 0) >= 0 ? 'Under budget' : 'Over budget'}
                  </p>
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
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-gray-600 mb-1">Budget at Completion (BAC)</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {formatCurrency(health?.bac || 0)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Total project budget</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-sm text-gray-600 mb-1">Planned Value (PV)</p>
                  <p className="text-2xl font-bold text-purple-700">
                    {formatCurrency(health?.pv || 0)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Should have spent</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm text-gray-600 mb-1">Earned Value (EV)</p>
                  <p className="text-2xl font-bold text-green-700">
                    {formatCurrency(health?.ev || 0)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Value of work done</p>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <p className="text-sm text-gray-600 mb-1">Actual Cost (AC)</p>
                  <p className="text-2xl font-bold text-orange-700">
                    {formatCurrency(health?.ac || 0)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Actually spent</p>
                </div>
                <div className="p-4 bg-gray-100 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Estimate at Completion (EAC)</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(health?.eac || 0)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Projected final cost</p>
                </div>
                <div className="p-4 bg-gray-100 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Estimate to Complete (ETC)</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(health?.etc || 0)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Cost to finish</p>
                </div>
                <div className={`p-4 rounded-lg ${(health?.vac || 0) >= 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <p className="text-sm text-gray-600 mb-1">Variance at Completion (VAC)</p>
                  <p className={`text-2xl font-bold ${(health?.vac || 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {formatCurrency(health?.vac || 0)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {(health?.vac || 0) >= 0 ? 'Under budget' : 'Over budget'}
                  </p>
                </div>
                <div className="p-4 bg-gray-100 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">To-Complete PI (TCPI)</p>
                  <p className="text-2xl font-bold">{health?.tcpi?.toFixed(2) || '1.00'}</p>
                  <p className="text-xs text-gray-500 mt-1">Required efficiency</p>
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
                Risk Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Dynamic risk alerts based on actual metrics */}
                {(health?.spi || 0) < 0.8 && (
                  <div className="p-4 border-l-4 border-red-500 bg-red-50">
                    <h4 className="font-semibold text-red-800">Critical Schedule Delay</h4>
                    <p className="text-sm text-red-700">
                      SPI is {health?.spi?.toFixed(2)} - Project is significantly behind schedule. 
                      Only {((health?.spi || 0) * 100).toFixed(0)}% of planned work is complete.
                    </p>
                  </div>
                )}
                
                {(health?.spi || 0) >= 0.8 && (health?.spi || 0) < 1 && (
                  <div className="p-4 border-l-4 border-orange-500 bg-orange-50">
                    <h4 className="font-semibold text-orange-800">Schedule Delay Warning</h4>
                    <p className="text-sm text-orange-700">
                      SPI is {health?.spi?.toFixed(2)} - Project is slightly behind schedule.
                    </p>
                  </div>
                )}

                {(health?.cpi || 0) < 0.8 && (
                  <div className="p-4 border-l-4 border-red-500 bg-red-50">
                    <h4 className="font-semibold text-red-800">Critical Budget Overrun</h4>
                    <p className="text-sm text-red-700">
                      CPI is {health?.cpi?.toFixed(2)} - Cost performance needs immediate attention. 
                      Project is spending {(((1 / (health?.cpi || 1)) - 1) * 100).toFixed(0)}% more than planned.
                    </p>
                  </div>
                )}

                {(health?.cpi || 0) >= 0.8 && (health?.cpi || 0) < 1 && (
                  <div className="p-4 border-l-4 border-orange-500 bg-orange-50">
                    <h4 className="font-semibold text-orange-800">Budget Overrun Warning</h4>
                    <p className="text-sm text-orange-700">
                      CPI is {health?.cpi?.toFixed(2)} - Project is slightly over budget.
                    </p>
                  </div>
                )}

                {(health?.resourceScore || 0) > 0 && (health?.resourceScore || 0) < 50 && (
                  <div className="p-4 border-l-4 border-red-500 bg-red-50">
                    <h4 className="font-semibold text-red-800">Resource Allocation Critical</h4>
                    <p className="text-sm text-red-700">
                      Resource score is {health?.resourceScore} - Severe resource issues detected. 
                      Review resource allocation and utilization.
                    </p>
                  </div>
                )}

                {(health?.overallScore || 0) < 50 && (
                  <div className="p-4 border-l-4 border-red-500 bg-red-50">
                    <h4 className="font-semibold text-red-800">Project Health Critical</h4>
                    <p className="text-sm text-red-700">
                      Overall score is {health?.overallScore} - Multiple areas need immediate attention.
                    </p>
                  </div>
                )}

                {(health?.costVariance || 0) < -1000 && (
                  <div className="p-4 border-l-4 border-orange-500 bg-orange-50">
                    <h4 className="font-semibold text-orange-800">Significant Cost Variance</h4>
                    <p className="text-sm text-orange-700">
                      Cost variance is {formatCurrency(health?.costVariance || 0)} - Project is over budget.
                    </p>
                  </div>
                )}

                {(health?.scheduleVariance || 0) < -1000 && (
                  <div className="p-4 border-l-4 border-orange-500 bg-orange-50">
                    <h4 className="font-semibold text-orange-800">Significant Schedule Variance</h4>
                    <p className="text-sm text-orange-700">
                      Schedule variance is {formatCurrency(health?.scheduleVariance || 0)} - Behind planned value.
                    </p>
                  </div>
                )}

                {(health?.tcpi || 0) > 1.2 && (
                  <div className="p-4 border-l-4 border-orange-500 bg-orange-50">
                    <h4 className="font-semibold text-orange-800">High Performance Required</h4>
                    <p className="text-sm text-orange-700">
                      TCPI is {health?.tcpi?.toFixed(2)} - Team must work {((health?.tcpi || 1) * 100).toFixed(0)}% efficiently to meet budget.
                    </p>
                  </div>
                )}

                {/* Show positive message if everything is good */}
                {(health?.spi || 0) >= 1 && (health?.cpi || 0) >= 1 && (health?.overallScore || 0) >= 80 && (
                  <div className="p-4 border-l-4 border-green-500 bg-green-50">
                    <h4 className="font-semibold text-green-800">✅ Project Health Excellent</h4>
                    <p className="text-sm text-green-700">
                      All metrics are within acceptable ranges. Project is on track for successful completion.
                    </p>
                  </div>
                )}

                {/* Show message if no significant risks */}
                {(health?.spi || 0) >= 0.9 && (health?.cpi || 0) >= 0.9 && 
                 (health?.overallScore || 0) >= 60 && (health?.overallScore || 0) < 80 && (
                  <div className="p-4 border-l-4 border-blue-500 bg-blue-50">
                    <h4 className="font-semibold text-blue-800">ℹ️ Project Health Good</h4>
                    <p className="text-sm text-blue-700">
                      Minor variations detected but within acceptable ranges. Continue monitoring.
                    </p>
                  </div>
                )}
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
