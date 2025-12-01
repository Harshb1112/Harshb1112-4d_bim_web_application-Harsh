'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Building2, Calendar, MapPin, DollarSign, CheckCircle2 } from 'lucide-react'

interface Account {
  id: string
  name: string
  region: string
}

interface Template {
  id: string
  name: string
  type: string
}

interface CreateAutodeskProjectProps {
  accessToken: string
  onSuccess?: (project: any) => void
  onCancel?: () => void
}

export default function CreateAutodeskProject({ 
  accessToken, 
  onSuccess, 
  onCancel 
}: CreateAutodeskProjectProps) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  // Data states
  const [accounts, setAccounts] = useState<Account[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [loadingTemplates, setLoadingTemplates] = useState(false)

  // Form states
  const [selectedAccount, setSelectedAccount] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    type: 'ACC' as 'ACC' | 'BIM360',
    status: 'active' as 'active' | 'inactive',
    startDate: '',
    endDate: '',
    projectValue: '',
    currency: 'USD',
    jobNumber: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    stateOrProvince: '',
    postalCode: '',
    country: '',
    constructionType: '',
    contractType: '',
  })

  // Fetch accounts on mount
  useEffect(() => {
    fetchAccounts()
  }, [accessToken])

  // Fetch templates when account is selected
  useEffect(() => {
    if (selectedAccount) {
      fetchTemplates(selectedAccount)
    }
  }, [selectedAccount])

  const fetchAccounts = async () => {
    try {
      setLoadingAccounts(true)
      const response = await fetch('/api/autodesk/accounts', {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      
      if (!response.ok) throw new Error('Failed to fetch accounts')
      
      const data = await response.json()
      setAccounts(data.accounts || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoadingAccounts(false)
    }
  }

  const fetchTemplates = async (accountId: string) => {
    try {
      setLoadingTemplates(true)
      const response = await fetch(`/api/autodesk/templates?accountId=${accountId}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      
      if (!response.ok) throw new Error('Failed to fetch templates')
      
      const data = await response.json()
      setTemplates(data.templates || [])
    } catch (err: any) {
      console.error('Error fetching templates:', err)
    } finally {
      setLoadingTemplates(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    if (!selectedAccount || !formData.name) {
      setError('Please select an account and enter a project name')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/autodesk/projects/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          accountId: selectedAccount,
          ...formData,
          projectValue: formData.projectValue ? parseFloat(formData.projectValue) : undefined,
          templateProjectId: selectedTemplate || undefined,
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create project')
      }

      const data = await response.json()
      setSuccess(true)
      
      if (onSuccess) {
        onSuccess(data.project)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const nextStep = () => setStep(prev => Math.min(prev + 1, 3))
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1))

  if (success) {
    return (
      <Card className="w-full max-w-2xl mx-auto bg-gray-900 border-gray-700">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Project Created Successfully!</h3>
            <p className="text-gray-400 mb-6">Your Autodesk project "{formData.name}" has been created.</p>
            <Button onClick={onCancel} variant="outline">Close</Button>
          </div>
        </CardContent>
      </Card>
    )
  }


  return (
    <Card className="w-full max-w-2xl mx-auto bg-gray-900 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Building2 className="h-5 w-5 text-orange-400" />
          Create Autodesk Project
        </CardTitle>
        <CardDescription className="text-gray-400">
          Step {step} of 3 - {step === 1 ? 'Basic Info' : step === 2 ? 'Location' : 'Review'}
        </CardDescription>
        
        {/* Progress bar */}
        <div className="flex gap-2 mt-4">
          {[1, 2, 3].map(s => (
            <div 
              key={s} 
              className={`h-1 flex-1 rounded ${s <= step ? 'bg-orange-500' : 'bg-gray-700'}`} 
            />
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {error && (
          <Alert className="bg-red-900/20 border-red-500/50">
            <AlertDescription className="text-red-400">{error}</AlertDescription>
          </Alert>
        )}

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label className="text-gray-300">Account *</Label>
              {loadingAccounts ? (
                <div className="flex items-center gap-2 text-gray-400 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading accounts...
                </div>
              ) : (
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                    <SelectValue placeholder="Select an account" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    {accounts.map(account => (
                      <SelectItem key={account.id} value={account.id} className="text-white">
                        {account.name} ({account.region})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div>
              <Label className="text-gray-300">Project Name *</Label>
              <Input
                value={formData.name}
                onChange={e => handleInputChange('name', e.target.value)}
                placeholder="Enter project name"
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Project Type</Label>
                <Select value={formData.type} onValueChange={v => handleInputChange('type', v)}>
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="ACC" className="text-white">ACC (Autodesk Construction Cloud)</SelectItem>
                    <SelectItem value="BIM360" className="text-white">BIM 360</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-gray-300">Template (Optional)</Label>
                {loadingTemplates ? (
                  <div className="flex items-center gap-2 text-gray-400 py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : (
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                      <SelectValue placeholder="No template" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      <SelectItem value="" className="text-white">No template</SelectItem>
                      {templates.map(template => (
                        <SelectItem key={template.id} value={template.id} className="text-white">
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300 flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Start Date
                </Label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={e => handleInputChange('startDate', e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
              <div>
                <Label className="text-gray-300 flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> End Date
                </Label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={e => handleInputChange('endDate', e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300 flex items-center gap-1">
                  <DollarSign className="h-3 w-3" /> Project Value
                </Label>
                <Input
                  type="number"
                  value={formData.projectValue}
                  onChange={e => handleInputChange('projectValue', e.target.value)}
                  placeholder="0.00"
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
              <div>
                <Label className="text-gray-300">Job Number</Label>
                <Input
                  value={formData.jobNumber}
                  onChange={e => handleInputChange('jobNumber', e.target.value)}
                  placeholder="Optional"
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
            </div>
          </div>
        )}


        {/* Step 2: Location */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-gray-300 mb-2">
              <MapPin className="h-4 w-4" />
              <span className="font-medium">Project Location</span>
            </div>

            <div>
              <Label className="text-gray-300">Address Line 1</Label>
              <Input
                value={formData.addressLine1}
                onChange={e => handleInputChange('addressLine1', e.target.value)}
                placeholder="Street address"
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>

            <div>
              <Label className="text-gray-300">Address Line 2</Label>
              <Input
                value={formData.addressLine2}
                onChange={e => handleInputChange('addressLine2', e.target.value)}
                placeholder="Suite, unit, etc. (optional)"
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">City</Label>
                <Input
                  value={formData.city}
                  onChange={e => handleInputChange('city', e.target.value)}
                  placeholder="City"
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
              <div>
                <Label className="text-gray-300">State/Province</Label>
                <Input
                  value={formData.stateOrProvince}
                  onChange={e => handleInputChange('stateOrProvince', e.target.value)}
                  placeholder="State or Province"
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Postal Code</Label>
                <Input
                  value={formData.postalCode}
                  onChange={e => handleInputChange('postalCode', e.target.value)}
                  placeholder="Postal code"
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
              <div>
                <Label className="text-gray-300">Country</Label>
                <Input
                  value={formData.country}
                  onChange={e => handleInputChange('country', e.target.value)}
                  placeholder="Country"
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Construction Type</Label>
                <Select value={formData.constructionType} onValueChange={v => handleInputChange('constructionType', v)}>
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="new_construction" className="text-white">New Construction</SelectItem>
                    <SelectItem value="renovation" className="text-white">Renovation</SelectItem>
                    <SelectItem value="retrofit" className="text-white">Retrofit</SelectItem>
                    <SelectItem value="addition" className="text-white">Addition</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-300">Contract Type</Label>
                <Select value={formData.contractType} onValueChange={v => handleInputChange('contractType', v)}>
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="design_bid_build" className="text-white">Design-Bid-Build</SelectItem>
                    <SelectItem value="design_build" className="text-white">Design-Build</SelectItem>
                    <SelectItem value="cm_at_risk" className="text-white">CM at Risk</SelectItem>
                    <SelectItem value="ipd" className="text-white">IPD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}


        {/* Step 3: Review */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-gray-800 rounded-lg p-4 space-y-3">
              <h4 className="text-white font-medium border-b border-gray-700 pb-2">Project Summary</h4>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-gray-400">Account:</span>
                <span className="text-white">{accounts.find(a => a.id === selectedAccount)?.name || '-'}</span>
                
                <span className="text-gray-400">Project Name:</span>
                <span className="text-white">{formData.name || '-'}</span>
                
                <span className="text-gray-400">Type:</span>
                <span className="text-white">{formData.type}</span>
                
                {selectedTemplate && (
                  <>
                    <span className="text-gray-400">Template:</span>
                    <span className="text-white">{templates.find(t => t.id === selectedTemplate)?.name || '-'}</span>
                  </>
                )}
                
                {formData.startDate && (
                  <>
                    <span className="text-gray-400">Start Date:</span>
                    <span className="text-white">{formData.startDate}</span>
                  </>
                )}
                
                {formData.endDate && (
                  <>
                    <span className="text-gray-400">End Date:</span>
                    <span className="text-white">{formData.endDate}</span>
                  </>
                )}
                
                {formData.projectValue && (
                  <>
                    <span className="text-gray-400">Project Value:</span>
                    <span className="text-white">${parseFloat(formData.projectValue).toLocaleString()} {formData.currency}</span>
                  </>
                )}
                
                {formData.jobNumber && (
                  <>
                    <span className="text-gray-400">Job Number:</span>
                    <span className="text-white">{formData.jobNumber}</span>
                  </>
                )}
              </div>

              {(formData.addressLine1 || formData.city) && (
                <>
                  <h4 className="text-white font-medium border-b border-gray-700 pb-2 pt-2">Location</h4>
                  <div className="text-sm text-gray-300">
                    {formData.addressLine1 && <p>{formData.addressLine1}</p>}
                    {formData.addressLine2 && <p>{formData.addressLine2}</p>}
                    <p>
                      {[formData.city, formData.stateOrProvince, formData.postalCode]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                    {formData.country && <p>{formData.country}</p>}
                  </div>
                </>
              )}

              {(formData.constructionType || formData.contractType) && (
                <>
                  <h4 className="text-white font-medium border-b border-gray-700 pb-2 pt-2">Project Details</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {formData.constructionType && (
                      <>
                        <span className="text-gray-400">Construction Type:</span>
                        <span className="text-white">{formData.constructionType.replace(/_/g, ' ')}</span>
                      </>
                    )}
                    {formData.contractType && (
                      <>
                        <span className="text-gray-400">Contract Type:</span>
                        <span className="text-white">{formData.contractType.replace(/_/g, ' ')}</span>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex justify-between pt-4 border-t border-gray-700">
          <div>
            {onCancel && (
              <Button variant="ghost" onClick={onCancel} className="text-gray-400">
                Cancel
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {step > 1 && (
              <Button variant="outline" onClick={prevStep} disabled={loading}>
                Previous
              </Button>
            )}
            {step < 3 ? (
              <Button 
                onClick={nextStep} 
                disabled={step === 1 && (!selectedAccount || !formData.name)}
                className="bg-orange-500 hover:bg-orange-600"
              >
                Next
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit} 
                disabled={loading}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  'Create Project'
                )}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
