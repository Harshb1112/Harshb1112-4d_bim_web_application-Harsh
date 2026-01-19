"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2, DollarSign, MapPin, Users, Building2, Plus, X } from 'lucide-react'

interface ProjectSettingsProps {
  project: any
  onUpdate: () => void
}

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'ر.س' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
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
  const [formData, setFormData] = useState({
    currency: project.currency || 'USD',
    location: project.location || '',
    city: project.city || '',
    state: project.state || '',
    country: project.country || '',
    postalCode: project.postalCode || '',
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
      {/* Currency Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
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
                onValueChange={(value) => setFormData({ ...formData, currency: value })}
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
            </div>
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
