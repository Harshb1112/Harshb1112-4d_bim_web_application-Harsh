"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2, DollarSign, MapPin, Users, Building2, Plus, X, IndianRupee, Euro, PoundSterling } from 'lucide-react'

interface ProjectSettingsProps {
  project: any
  onUpdate: () => void
}

const CURRENCIES = [
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', rate: 83.12 },      // FIRST - India
  { code: 'USD', name: 'US Dollar', symbol: '$', rate: 1 },             // Base currency
  { code: 'EUR', name: 'Euro', symbol: '€', rate: 0.92 },
  { code: 'GBP', name: 'British Pound', symbol: '£', rate: 0.79 },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', rate: 3.67 },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'ر.س', rate: 3.75 },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', rate: 1.52 },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', rate: 1.36 },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', rate: 1.34 },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', rate: 149.50 },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', rate: 7.24 },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$', rate: 17.08 },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', rate: 4.97 },
]

const DEFAULT_STAKEHOLDER_ROLES = [
  'Architect',
  'Project Manager',
  'Consultant',
  'Superintendent',
  'Inspector',
]

export default function ProjectSettings({ project, onUpdate }: ProjectSettingsProps) {
  const [loading, setLoading] = useState(false)
  const [customRole, setCustomRole] = useState('')
  const [previousCurrency, setPreviousCurrency] = useState(project.currency || 'INR')
  const [formData, setFormData] = useState({
    currency: project.currency || 'INR',
    location: project.location || '',
    city: project.city || '',
    state: project.state || '',
    country: project.country || '',
    postalCode: project.postalCode || '',
    totalBudget: project.totalBudget || 0,
    contingencyPercentage: project.contingencyPercentage || 10,
  })

  const [stakeholders, setStakeholders] = useState([
    { role: 'Owner', name: '', company: '', email: '', phone: '' },
    { role: 'Engineer', name: '', company: '', email: '', phone: '' },
    { role: 'Contractor', name: '', company: '', email: '', phone: '' },
  ])

  const addStakeholder = (role: string) => {
    setStakeholders([...stakeholders, { role, name: '', company: '', email: '', phone: '' }])
  }

  const addCustomStakeholder = () => {
    if (customRole.trim()) {
      addStakeholder(customRole.trim())
      setCustomRole('')
    }
  }

  // Get currency icon based on selected currency
  const getCurrencyIcon = () => {
    switch (formData.currency) {
      case 'INR':
        return IndianRupee
      case 'EUR':
        return Euro
      case 'GBP':
        return PoundSterling
      case 'USD':
      case 'AUD':
      case 'CAD':
      case 'SGD':
      case 'AED':
      case 'SAR':
      default:
        return DollarSign
    }
  }

  const CurrencyIcon = getCurrencyIcon()

  // Convert budget when currency changes
  const handleCurrencyChange = (newCurrency: string) => {
    const oldCurrencyData = CURRENCIES.find(c => c.code === previousCurrency)
    const newCurrencyData = CURRENCIES.find(c => c.code === newCurrency)
    
    if (oldCurrencyData && newCurrencyData && formData.totalBudget > 0) {
      // Convert: amount in old currency → USD → new currency
      const amountInUSD = formData.totalBudget / oldCurrencyData.rate
      const convertedAmount = amountInUSD * newCurrencyData.rate
      
      // Show conversion notification
      const oldSymbol = oldCurrencyData.symbol
      const newSymbol = newCurrencyData.symbol
      toast.info(
        `Budget converted: ${oldSymbol}${formData.totalBudget.toLocaleString()} → ${newSymbol}${Math.round(convertedAmount).toLocaleString()}`,
        { duration: 5000 }
      )
      
      setFormData({ 
        ...formData, 
        currency: newCurrency,
        totalBudget: Math.round(convertedAmount)
      })
    } else {
      setFormData({ ...formData, currency: newCurrency })
    }
    
    setPreviousCurrency(newCurrency)
  }

  const removeStakeholder = (index: number) => {
    setStakeholders(stakeholders.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          stakeholders: stakeholders,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update settings')
      }

      toast.success('Settings updated successfully')
      onUpdate()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Currency Settings - FIRST */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CurrencyIcon className="h-5 w-5" />
            <CardTitle>Currency</CardTitle>
          </div>
          <CardDescription>
            Set the default currency for this project&apos;s costs and budget
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="currency">Project Currency</Label>
              <Select
                value={formData.currency}
                onValueChange={handleCurrencyChange}
              >
                <SelectTrigger id="currency" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((curr) => (
                    <SelectItem key={curr.code} value={curr.code}>
                      {curr.symbol} {curr.code} - {curr.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                💡 Budget will be automatically converted when you change currency
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Budget Allocation - SECOND */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CurrencyIcon className="h-5 w-5" />
            <CardTitle>Budget Allocation</CardTitle>
          </div>
          <CardDescription>
            Set the total project budget and contingency reserve
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="totalBudget">Total Project Budget</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  {CURRENCIES.find(c => c.code === formData.currency)?.symbol || '$'}
                </span>
                <Input
                  id="totalBudget"
                  type="number"
                  value={formData.totalBudget}
                  onChange={(e) => setFormData({ ...formData, totalBudget: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                  className="pl-8"
                  min="0"
                  step="1000"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Enter the total approved budget for this project
              </p>
            </div>
            
            <div>
              <Label htmlFor="contingency">Contingency Reserve (%)</Label>
              <Input
                id="contingency"
                type="number"
                value={formData.contingencyPercentage}
                onChange={(e) => setFormData({ ...formData, contingencyPercentage: parseFloat(e.target.value) || 0 })}
                placeholder="10"
                min="0"
                max="100"
                step="1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Percentage of budget reserved for unexpected costs (typically 5-15%)
              </p>
            </div>

            {/* Budget Summary */}
            {formData.totalBudget > 0 && (
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg space-y-2">
                <h4 className="font-medium text-sm text-blue-900 dark:text-blue-100">Budget Summary</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Total Budget:</span>
                    <span className="font-semibold">
                      {CURRENCIES.find(c => c.code === formData.currency)?.symbol}
                      {Math.round(formData.totalBudget).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Contingency ({formData.contingencyPercentage}%):</span>
                    <span className="font-semibold text-orange-600">
                      {CURRENCIES.find(c => c.code === formData.currency)?.symbol}
                      {Math.round(formData.totalBudget * formData.contingencyPercentage / 100).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-blue-200 dark:border-blue-800">
                    <span className="text-gray-600 dark:text-gray-400">Working Budget:</span>
                    <span className="font-bold text-green-600">
                      {CURRENCIES.find(c => c.code === formData.currency)?.symbol}
                      {Math.round(formData.totalBudget - (formData.totalBudget * formData.contingencyPercentage / 100)).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Project Address */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            <CardTitle>Project Address</CardTitle>
          </div>
          <CardDescription>
            Location details for the construction project site.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="location">Street Address</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="123 Construction Ave"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="City"
                />
              </div>
              <div>
                <Label htmlFor="state">State / Province</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="State"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="Country"
                />
              </div>
              <div>
                <Label htmlFor="postalCode">Postal Code</Label>
                <Input
                  id="postalCode"
                  value={formData.postalCode}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                  placeholder="Postal code"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Project Stakeholders */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <CardTitle>Project Stakeholders</CardTitle>
          </div>
          <CardDescription>
            Manage key stakeholders and their contact information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Stakeholder List */}
            {stakeholders.map((stakeholder, index) => (
              <div key={index} className="border rounded-lg p-4 relative bg-gray-50">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8"
                  onClick={() => removeStakeholder(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
                <h4 className="font-medium mb-4 text-sm">{stakeholder.role}</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Name</Label>
                    <Input
                      value={stakeholder.name}
                      onChange={(e) => {
                        const updated = [...stakeholders]
                        updated[index].name = e.target.value
                        setStakeholders(updated)
                      }}
                      placeholder="Full name"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Company</Label>
                    <Input
                      value={stakeholder.company}
                      onChange={(e) => {
                        const updated = [...stakeholders]
                        updated[index].company = e.target.value
                        setStakeholders(updated)
                      }}
                      placeholder="Company name"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Email</Label>
                    <Input
                      type="email"
                      value={stakeholder.email}
                      onChange={(e) => {
                        const updated = [...stakeholders]
                        updated[index].email = e.target.value
                        setStakeholders(updated)
                      }}
                      placeholder="email@example.com"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Phone</Label>
                    <Input
                      value={stakeholder.phone}
                      onChange={(e) => {
                        const updated = [...stakeholders]
                        updated[index].phone = e.target.value
                        setStakeholders(updated)
                      }}
                      placeholder="+1 234 567 8900"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Add Stakeholder Section */}
            <div className="pt-4 border-t">
              <p className="text-sm font-medium mb-3">Add Stakeholder</p>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_STAKEHOLDER_ROLES.map((role) => (
                  <Button
                    key={role}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addStakeholder(role)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {role}
                  </Button>
                ))}
              </div>
              
              {/* Custom Role Input */}
              <div className="flex gap-2 mt-3">
                <Input
                  placeholder="Custom role name"
                  value={customRole}
                  onChange={(e) => setCustomRole(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomStakeholder())}
                  className="max-w-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addCustomStakeholder}
                  disabled={!customRole.trim()}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end sticky bottom-0 bg-white py-4 border-t">
        <Button onClick={handleSave} disabled={loading} size="lg" className="bg-orange-500 hover:bg-orange-600">
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {loading ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  )
}
