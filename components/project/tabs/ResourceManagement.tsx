"use client"

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { Plus, Trash2, Edit, Users, Wrench, Package, Building2, DollarSign, Calendar as CalendarIcon, Upload, Sparkles, FileSpreadsheet } from 'lucide-react'
import { toast } from 'sonner'

interface Resource {
  id: number
  name: string
  type: string
  unit: string | null
  hourlyRate: number | null
  dailyRate: number | null
  capacity: number | null
  description: string | null
}

interface Assignment {
  id: number
  resourceId: number
  taskId: number
  quantity: number
  startDate: string | null
  endDate: string | null
  hoursPerDay: number | null
  status: string
  resource: { id: number; name: string; type: string; hourlyRate: number | null; dailyRate: number | null }
  task: { id: number; name: string; startDate: string | null; endDate: string | null; status: string }
}

interface Cost {
  id: number
  resourceId: number
  date: string
  hours: number | null
  quantity: number | null
  unitCost: number
  totalCost: number
  notes: string | null
  resource: { id: number; name: string; type: string }
}

interface ResourceManagementProps {
  project: any
  currentUserRole?: string
}

export default function ResourceManagement({ project, currentUserRole = 'viewer' }: ResourceManagementProps) {
  const canEdit = currentUserRole === 'admin' || currentUserRole === 'manager'
  const [resources, setResources] = useState<Resource[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [costs, setCosts] = useState<Cost[]>([])
  const [totalCost, setTotalCost] = useState(0)
  const [costByType, setCostByType] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('all')
  
  // Dialog states
  const [resourceDialogOpen, setResourceDialogOpen] = useState(false)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [costDialogOpen, setCostDialogOpen] = useState(false)
  const [editingResource, setEditingResource] = useState<Resource | null>(null)
  
  // Resource form
  const [name, setName] = useState('')
  const [type, setType] = useState('labor')
  const [unit, setUnit] = useState('')
  const [hourlyRate, setHourlyRate] = useState('')
  const [dailyRate, setDailyRate] = useState('')
  const [capacity, setCapacity] = useState('')
  const [description, setDescription] = useState('')
  
  // Assignment form
  const [selectedResourceId, setSelectedResourceId] = useState('')
  const [selectedTaskId, setSelectedTaskId] = useState('')
  const [assignQuantity, setAssignQuantity] = useState('1')
  const [assignHoursPerDay, setAssignHoursPerDay] = useState('8')
  
  // Cost form
  const [costResourceId, setCostResourceId] = useState('')
  const [costDate, setCostDate] = useState('')
  const [costHours, setCostHours] = useState('')
  const [costQuantity, setCostQuantity] = useState('')
  const [costUnitCost, setCostUnitCost] = useState('')
  const [costNotes, setCostNotes] = useState('')

  // Import & AI states
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [aiDialogOpen, setAiDialogOpen] = useState(false)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [importing, setImporting] = useState(false)
  const [selectedRegion, setSelectedRegion] = useState<'india' | 'usa' | 'uae' | 'uk' | 'europe'>('india')

  // Real Exchange Rates (as of Dec 2024) - Base: INR
  const EXCHANGE_RATES: Record<string, { rate: number; symbol: string; name: string }> = {
    india: { rate: 1, symbol: '₹', name: 'INR' },           // Base currency
    usa: { rate: 0.0112, symbol: '$', name: 'USD' },        // 1 INR = 0.0112 USD (1 USD = 89.55 INR)
    uae: { rate: 0.0411, symbol: 'AED', name: 'AED' },      // 1 INR = 0.0411 AED (1 AED = 24.35 INR)
    uk: { rate: 0.0089, symbol: '£', name: 'GBP' },         // 1 INR = 0.0089 GBP (1 GBP = 112.36 INR)
    europe: { rate: 0.0107, symbol: '€', name: 'EUR' },     // 1 INR = 0.0107 EUR (1 EUR = 93.46 INR)
  }

  // Base Market Rates in INR - Real Indian construction industry rates (2024)
  const BASE_MARKET_RATES_INR: Record<string, { hourly: number; daily: number; unit: string }> = {
    // Labor (INR)
    'mason': { hourly: 100, daily: 800, unit: 'person' },
    'carpenter': { hourly: 90, daily: 720, unit: 'person' },
    'plumber': { hourly: 100, daily: 800, unit: 'person' },
    'electrician': { hourly: 110, daily: 880, unit: 'person' },
    'painter': { hourly: 80, daily: 640, unit: 'person' },
    'welder': { hourly: 120, daily: 960, unit: 'person' },
    'helper': { hourly: 50, daily: 400, unit: 'person' },
    'laborer': { hourly: 50, daily: 400, unit: 'person' },
    'supervisor': { hourly: 150, daily: 1200, unit: 'person' },
    'site engineer': { hourly: 200, daily: 1600, unit: 'person' },
    'foreman': { hourly: 125, daily: 1000, unit: 'person' },
    // Equipment
    'jcb': { hourly: 1500, daily: 12000, unit: 'machine' },
    'crane': { hourly: 2500, daily: 20000, unit: 'machine' },
    'concrete mixer': { hourly: 300, daily: 2400, unit: 'machine' },
    'excavator': { hourly: 2000, daily: 16000, unit: 'machine' },
    'bulldozer': { hourly: 2200, daily: 17600, unit: 'machine' },
    'tower crane': { hourly: 3500, daily: 28000, unit: 'machine' },
    'scaffolding': { hourly: 50, daily: 400, unit: 'set' },
    'generator': { hourly: 200, daily: 1600, unit: 'machine' },
    // Materials
    'cement': { hourly: 0, daily: 380, unit: 'bag' },
    'steel': { hourly: 0, daily: 65, unit: 'kg' },
    'sand': { hourly: 0, daily: 60, unit: 'cft' },
    'bricks': { hourly: 0, daily: 8, unit: 'piece' },
    'concrete': { hourly: 0, daily: 5500, unit: 'cum' },
    'tiles': { hourly: 0, daily: 45, unit: 'sqft' },
    'paint': { hourly: 0, daily: 250, unit: 'liter' },
  }

  // Convert INR to selected currency using real exchange rates
  const convertCurrency = (inrAmount: number): number => {
    const rate = EXCHANGE_RATES[selectedRegion].rate
    return Math.round(inrAmount * rate * 100) / 100
  }

  // Get market rate in selected currency
  const getMarketRate = (resourceName: string) => {
    const nameLower = resourceName.toLowerCase()
    for (const [key, rates] of Object.entries(BASE_MARKET_RATES_INR)) {
      if (nameLower.includes(key) || key.includes(nameLower)) {
        return {
          hourly: convertCurrency(rates.hourly),
          daily: convertCurrency(rates.daily),
          unit: rates.unit,
          currency: EXCHANGE_RATES[selectedRegion].symbol
        }
      }
    }
    return null
  }

  // Format currency with proper symbol
  const formatCurrency = (n: number) => {
    const { symbol } = EXCHANGE_RATES[selectedRegion]
    if (selectedRegion === 'india') return `${symbol}${n.toLocaleString('en-IN')}`
    if (selectedRegion === 'usa') return `${symbol}${n.toLocaleString('en-US')}`
    if (selectedRegion === 'uae') return `${symbol} ${n.toLocaleString()}`
    if (selectedRegion === 'uk') return `${symbol}${n.toLocaleString('en-GB')}`
    return `${symbol}${n.toLocaleString('de-DE')}`
  }

  // Legacy compatibility - will be removed
  const MARKET_RATES_BY_REGION: Record<string, Record<string, { hourly: number; daily: number; unit: string; currency: string }>> = {
    india: {
      'mason': { hourly: 100, daily: 800, unit: 'person', currency: '₹' },
      'steel': { hourly: 0, daily: 65, unit: 'kg', currency: '₹' },
      'sand': { hourly: 0, daily: 60, unit: 'cft', currency: '₹' },
      'bricks': { hourly: 0, daily: 8, unit: 'piece', currency: '₹' },
      'concrete': { hourly: 0, daily: 5500, unit: 'cum', currency: '₹' },
    },
    usa: {
      // Labor (USD)
      'mason': { hourly: 35, daily: 280, unit: 'person', currency: '$' },
      'carpenter': { hourly: 32, daily: 256, unit: 'person', currency: '$' },
      'plumber': { hourly: 40, daily: 320, unit: 'person', currency: '$' },
      'electrician': { hourly: 42, daily: 336, unit: 'person', currency: '$' },
      'painter': { hourly: 28, daily: 224, unit: 'person', currency: '$' },
      'welder': { hourly: 38, daily: 304, unit: 'person', currency: '$' },
      'helper': { hourly: 18, daily: 144, unit: 'person', currency: '$' },
      'laborer': { hourly: 20, daily: 160, unit: 'person', currency: '$' },
      'supervisor': { hourly: 55, daily: 440, unit: 'person', currency: '$' },
      'site engineer': { hourly: 65, daily: 520, unit: 'person', currency: '$' },
      'foreman': { hourly: 48, daily: 384, unit: 'person', currency: '$' },
      // Equipment
      'crane': { hourly: 350, daily: 2800, unit: 'machine', currency: '$' },
      'excavator': { hourly: 250, daily: 2000, unit: 'machine', currency: '$' },
      'bulldozer': { hourly: 280, daily: 2240, unit: 'machine', currency: '$' },
      'concrete mixer': { hourly: 85, daily: 680, unit: 'machine', currency: '$' },
      'scaffolding': { hourly: 15, daily: 120, unit: 'set', currency: '$' },
      // Materials
      'cement': { hourly: 0, daily: 12, unit: 'bag', currency: '$' },
      'steel': { hourly: 0, daily: 1.2, unit: 'kg', currency: '$' },
      'concrete': { hourly: 0, daily: 150, unit: 'cum', currency: '$' },
    },
    uae: {
      // Labor (AED)
      'mason': { hourly: 35, daily: 280, unit: 'person', currency: 'AED' },
      'carpenter': { hourly: 32, daily: 256, unit: 'person', currency: 'AED' },
      'plumber': { hourly: 38, daily: 304, unit: 'person', currency: 'AED' },
      'electrician': { hourly: 42, daily: 336, unit: 'person', currency: 'AED' },
      'painter': { hourly: 28, daily: 224, unit: 'person', currency: 'AED' },
      'welder': { hourly: 45, daily: 360, unit: 'person', currency: 'AED' },
      'helper': { hourly: 15, daily: 120, unit: 'person', currency: 'AED' },
      'laborer': { hourly: 18, daily: 144, unit: 'person', currency: 'AED' },
      'supervisor': { hourly: 65, daily: 520, unit: 'person', currency: 'AED' },
      'site engineer': { hourly: 85, daily: 680, unit: 'person', currency: 'AED' },
      'foreman': { hourly: 55, daily: 440, unit: 'person', currency: 'AED' },
      // Equipment
      'crane': { hourly: 450, daily: 3600, unit: 'machine', currency: 'AED' },
      'excavator': { hourly: 320, daily: 2560, unit: 'machine', currency: 'AED' },
      'tower crane': { hourly: 650, daily: 5200, unit: 'machine', currency: 'AED' },
      'concrete mixer': { hourly: 95, daily: 760, unit: 'machine', currency: 'AED' },
      // Materials
      'cement': { hourly: 0, daily: 18, unit: 'bag', currency: 'AED' },
      'steel': { hourly: 0, daily: 3.5, unit: 'kg', currency: 'AED' },
      'concrete': { hourly: 0, daily: 380, unit: 'cum', currency: 'AED' },
    },
    uk: {
      // Labor (GBP)
      'mason': { hourly: 22, daily: 176, unit: 'person', currency: '£' },
      'carpenter': { hourly: 20, daily: 160, unit: 'person', currency: '£' },
      'plumber': { hourly: 28, daily: 224, unit: 'person', currency: '£' },
      'electrician': { hourly: 30, daily: 240, unit: 'person', currency: '£' },
      'painter': { hourly: 18, daily: 144, unit: 'person', currency: '£' },
      'laborer': { hourly: 14, daily: 112, unit: 'person', currency: '£' },
      'supervisor': { hourly: 38, daily: 304, unit: 'person', currency: '£' },
      'site engineer': { hourly: 45, daily: 360, unit: 'person', currency: '£' },
      // Equipment
      'crane': { hourly: 280, daily: 2240, unit: 'machine', currency: '£' },
      'excavator': { hourly: 180, daily: 1440, unit: 'machine', currency: '£' },
      // Materials
      'cement': { hourly: 0, daily: 8, unit: 'bag', currency: '£' },
      'steel': { hourly: 0, daily: 0.9, unit: 'kg', currency: '£' },
    },
    europe: {
      // Labor (EUR)
      'mason': { hourly: 28, daily: 224, unit: 'person', currency: '€' },
      'carpenter': { hourly: 26, daily: 208, unit: 'person', currency: '€' },
      'plumber': { hourly: 32, daily: 256, unit: 'person', currency: '€' },
      'electrician': { hourly: 35, daily: 280, unit: 'person', currency: '€' },
      'painter': { hourly: 22, daily: 176, unit: 'person', currency: '€' },
      'laborer': { hourly: 16, daily: 128, unit: 'person', currency: '€' },
      'supervisor': { hourly: 45, daily: 360, unit: 'person', currency: '€' },
      'site engineer': { hourly: 55, daily: 440, unit: 'person', currency: '€' },
      // Equipment
      'crane': { hourly: 320, daily: 2560, unit: 'machine', currency: '€' },
      'excavator': { hourly: 220, daily: 1760, unit: 'machine', currency: '€' },
      // Materials
      'cement': { hourly: 0, daily: 10, unit: 'bag', currency: '€' },
      'steel': { hourly: 0, daily: 1.1, unit: 'kg', currency: '€' },
    }
  }

  // Get current region's market rates
  const MARKET_RATES = MARKET_RATES_BY_REGION[selectedRegion]
  const currentCurrency = selectedRegion === 'india' ? '₹' : selectedRegion === 'usa' ? '$' : selectedRegion === 'uae' ? 'AED' : selectedRegion === 'uk' ? '£' : '€'

  useEffect(() => {
    fetchAll()
  }, [project.id])

  // Show notification when region changes with exchange rate info
  useEffect(() => {
    const { symbol, name, rate } = EXCHANGE_RATES[selectedRegion]
    const inrEquivalent = selectedRegion === 'india' ? '' : ` (1 ${name} = ₹${Math.round(1/rate)})`
    toast.info(`Region: ${selectedRegion.toUpperCase()} - ${symbol} ${name}${inrEquivalent}`)
  }, [selectedRegion])

  const fetchAll = async () => {
    setLoading(true)
    await Promise.all([fetchResources(), fetchAssignments(), fetchCosts()])
    setLoading(false)
  }

  const fetchResources = async () => {
    try {
      const res = await fetch(`/api/resources?projectId=${project.id}`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setResources(data.resources || [])
      }
    } catch (error) {
      console.error('Failed to fetch resources:', error)
    }
  }

  const fetchAssignments = async () => {
    try {
      const res = await fetch(`/api/resources/assignments?projectId=${project.id}`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setAssignments(data.assignments || [])
      }
    } catch (error) {
      console.error('Failed to fetch assignments:', error)
    }
  }

  const fetchCosts = async () => {
    try {
      const res = await fetch(`/api/resources/costs?projectId=${project.id}`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setCosts(data.costs || [])
        setTotalCost(data.totalCost || 0)
        setCostByType(data.byType || {})
      }
    } catch (error) {
      console.error('Failed to fetch costs:', error)
    }
  }

  const filteredResources = useMemo(() => {
    if (filterType === 'all') return resources
    return resources.filter(r => r.type === filterType)
  }, [resources, filterType])

  const resetResourceForm = () => {
    setName(''); setType('labor'); setUnit(''); setHourlyRate(''); setDailyRate(''); setCapacity(''); setDescription('')
    setEditingResource(null)
  }

  const openEditDialog = (resource: Resource) => {
    setEditingResource(resource)
    setName(resource.name); setType(resource.type); setUnit(resource.unit || '')
    setHourlyRate(resource.hourlyRate?.toString() || ''); setDailyRate(resource.dailyRate?.toString() || '')
    setCapacity(resource.capacity?.toString() || ''); setDescription(resource.description || '')
    setResourceDialogOpen(true)
  }

  const handleResourceSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { toast.error('Name required'); return }

    try {
      const payload = { projectId: project.id, name: name.trim(), type, unit: unit || null, hourlyRate: hourlyRate || null, dailyRate: dailyRate || null, capacity: capacity || null, description: description || null }
      const url = editingResource ? `/api/resources/${editingResource.id}` : '/api/resources'
      const method = editingResource ? 'PATCH' : 'POST'
      
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(payload) })
      if (!res.ok) throw new Error('Failed')
      
      toast.success(editingResource ? 'Updated!' : 'Added!')
      setResourceDialogOpen(false); resetResourceForm(); fetchResources()
    } catch { toast.error('Failed to save') }
  }

  const handleDeleteResource = async (id: number) => {
    if (!confirm('Delete this resource?')) return
    try {
      const res = await fetch(`/api/resources/${id}`, { method: 'DELETE', credentials: 'include' })
      if (!res.ok) throw new Error('Failed')
      toast.success('Deleted!'); fetchResources()
    } catch { toast.error('Failed to delete') }
  }

  // Auto-fill rates when name changes - with real currency conversion
  const handleNameChange = (newName: string) => {
    setName(newName)
    const rates = getMarketRate(newName)
    if (rates && !editingResource) {
      setHourlyRate(rates.hourly.toString())
      setDailyRate(rates.daily.toString())
      setUnit(rates.unit)
      const { symbol, name: currencyName } = EXCHANGE_RATES[selectedRegion]
      toast.info(`${selectedRegion.toUpperCase()} rates: ${symbol}${rates.daily}/day (${currencyName})`)
    }
  }

  // Import Excel handler
  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('projectId', project.id.toString())

    try {
      const res = await fetch('/api/resources/import', {
        method: 'POST',
        credentials: 'include',
        body: formData
      })

      if (res.ok) {
        const data = await res.json()
        toast.success(`Imported ${data.count || 0} resources!`)
        fetchResources()
        setImportDialogOpen(false)
      } else {
        const error = await res.json()
        toast.error(error.error || 'Import failed')
      }
    } catch (error) {
      console.error('Import error:', error)
      toast.error('Failed to import')
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  // AI Parse prompt and create resources
  const parseAIPrompt = (prompt: string) => {
    const results: Array<{
      name: string
      type: string
      quantity: number
      hourlyRate: number | null
      dailyRate: number | null
      duration: string | null
      unit: string
    }> = []

    // Patterns to match
    // "Add 3 cranes for 3 months"
    // "Add 5 excavators at ₹150/hour"
    // "Add 10 laborers at ₹25/hour for 6 months"
    // "5 masons", "10 helpers", "2 jcb"
    
    const lines = prompt.toLowerCase().split(/[,\n]/).map(l => l.trim()).filter(Boolean)
    
    for (const line of lines) {
      // Extract quantity
      const qtyMatch = line.match(/(\d+)\s*([\w\s]+)/)
      if (!qtyMatch) continue
      
      const quantity = parseInt(qtyMatch[1]) || 1
      let resourceName = qtyMatch[2].trim()
      
      // Clean up resource name
      resourceName = resourceName
        .replace(/^(add|create|need|want)\s+/i, '')
        .replace(/\s+(at|for|starting|from).*$/i, '')
        .trim()
      
      // Determine type based on name
      let type = 'labor'
      const equipmentKeywords = ['crane', 'jcb', 'excavator', 'bulldozer', 'mixer', 'scaffolding', 'generator', 'machine']
      const materialKeywords = ['cement', 'steel', 'sand', 'brick', 'concrete', 'tile', 'paint', 'pipe', 'wood', 'glass']
      
      if (equipmentKeywords.some(k => resourceName.includes(k))) type = 'equipment'
      else if (materialKeywords.some(k => resourceName.includes(k))) type = 'material'
      
      // Extract rate if specified
      let hourlyRate: number | null = null
      let dailyRate: number | null = null
      
      const rateMatch = line.match(/(?:at|@)\s*[₹$]?\s*(\d+)\s*\/?\s*(hour|hr|day|daily)?/i)
      if (rateMatch) {
        const rate = parseInt(rateMatch[1])
        if (rateMatch[2]?.includes('day')) {
          dailyRate = rate
        } else {
          hourlyRate = rate
          dailyRate = rate * 8
        }
      } else {
        // Use market rates
        const marketRate = getMarketRate(resourceName)
        if (marketRate) {
          hourlyRate = marketRate.hourly
          dailyRate = marketRate.daily
        }
      }
      
      // Extract duration
      let duration: string | null = null
      const durationMatch = line.match(/for\s+(\d+)\s*(month|week|day|year)s?/i)
      if (durationMatch) {
        duration = `${durationMatch[1]} ${durationMatch[2]}s`
      }
      
      // Get unit from market rates or default
      const marketRate = getMarketRate(resourceName)
      const unit = marketRate?.unit || (type === 'labor' ? 'person' : type === 'equipment' ? 'machine' : 'unit')
      
      // Capitalize resource name
      const capitalizedName = resourceName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      
      results.push({
        name: capitalizedName,
        type,
        quantity,
        hourlyRate,
        dailyRate,
        duration,
        unit
      })
    }
    
    return results
  }

  // AI Generate from prompt
  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Please describe the resources you want to create')
      return
    }

    setAiGenerating(true)
    
    const parsedResources = parseAIPrompt(aiPrompt)
    
    if (parsedResources.length === 0) {
      toast.error('Could not understand the request. Try: "Add 5 masons at ₹800/day"')
      setAiGenerating(false)
      return
    }

    let created = 0
    for (const resource of parsedResources) {
      // Check if already exists
      const exists = resources.find(r => r.name.toLowerCase() === resource.name.toLowerCase())
      if (exists) {
        toast.info(`${resource.name} already exists, skipping`)
        continue
      }

      try {
        const res = await fetch('/api/resources', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            projectId: project.id,
            name: resource.name,
            type: resource.type,
            unit: resource.unit,
            hourlyRate: resource.hourlyRate,
            dailyRate: resource.dailyRate,
            capacity: resource.quantity,
            description: `AI created: ${resource.quantity} ${resource.name}${resource.duration ? ` for ${resource.duration}` : ''}`
          })
        })
        if (res.ok) created++
      } catch (error) {
        console.error('Failed to create:', resource.name)
      }
    }

    if (created > 0) {
      toast.success(`✨ AI created ${created} resources!`)
      fetchResources()
    }
    
    setAiPrompt('')
    setAiGenerating(false)
    setAiDialogOpen(false)
  }

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedResourceId || !selectedTaskId) { toast.error('Select resource and task'); return }

    try {
      const res = await fetch('/api/resources/assignments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ resourceId: parseInt(selectedResourceId), taskId: parseInt(selectedTaskId), quantity: parseFloat(assignQuantity) || 1, hoursPerDay: parseFloat(assignHoursPerDay) || 8 })
      })
      if (!res.ok) throw new Error('Failed')
      
      const data = await res.json()
      const costMsg = data.cost?.totalCost ? ` (₹${data.cost.totalCost.toLocaleString()} cost tracked)` : ''
      toast.success(`✅ Resource assigned!${costMsg}`)
      
      setAssignDialogOpen(false)
      fetchAssignments()
      fetchCosts() // Refresh costs to show new entry
      setSelectedResourceId(''); setSelectedTaskId(''); setAssignQuantity('1'); setAssignHoursPerDay('8')
    } catch { toast.error('Failed to assign') }
  }

  const handleCostSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!costResourceId || !costDate || !costUnitCost) { toast.error('Fill required fields'); return }

    try {
      const res = await fetch('/api/resources/costs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ resourceId: parseInt(costResourceId), date: costDate, hours: costHours ? parseFloat(costHours) : null, quantity: costQuantity ? parseFloat(costQuantity) : null, unitCost: parseFloat(costUnitCost), notes: costNotes || null })
      })
      if (!res.ok) throw new Error('Failed')
      toast.success('Cost added!'); setCostDialogOpen(false); fetchCosts()
      setCostResourceId(''); setCostDate(''); setCostHours(''); setCostQuantity(''); setCostUnitCost(''); setCostNotes('')
    } catch { toast.error('Failed to add cost') }
  }

  const getTypeIcon = (t: string) => {
    switch (t) {
      case 'labor': return <Users className="h-4 w-4 text-blue-500" />
      case 'equipment': return <Wrench className="h-4 w-4 text-orange-500" />
      case 'material': return <Package className="h-4 w-4 text-green-500" />
      case 'subcontractor': return <Building2 className="h-4 w-4 text-purple-500" />
      default: return <Package className="h-4 w-4" />
    }
  }

  // Utilization calculation
  const utilization = useMemo(() => {
    return resources.map(r => {
      const resourceAssignments = assignments.filter(a => a.resourceId === r.id)
      const totalAssigned = resourceAssignments.reduce((sum, a) => sum + a.quantity, 0)
      const utilizationPercent = r.capacity ? Math.min((totalAssigned / r.capacity) * 100, 100) : 0
      return { ...r, totalAssigned, utilizationPercent, assignmentCount: resourceAssignments.length }
    })
  }, [resources, assignments])

  // Calendar state
  const [calendarMonth, setCalendarMonth] = useState(new Date())

  // Calendar data - group assignments by date using task dates
  const calendarData = useMemo(() => {
    const byDate: Record<string, Assignment[]> = {}
    assignments.forEach(a => {
      // Use assignment startDate if available, otherwise use task startDate
      const startDateStr = a.startDate || a.task?.startDate
      const endDateStr = a.endDate || a.task?.endDate
      
      if (startDateStr) {
        const startDate = new Date(startDateStr)
        const endDate = endDateStr ? new Date(endDateStr) : startDate
        
        // Add assignment to each day in the range
        const currentDate = new Date(startDate)
        while (currentDate <= endDate) {
          const dateKey = currentDate.toISOString().split('T')[0]
          if (!byDate[dateKey]) byDate[dateKey] = []
          if (!byDate[dateKey].find(existing => existing.id === a.id)) {
            byDate[dateKey].push(a)
          }
          currentDate.setDate(currentDate.getDate() + 1)
        }
      }
    })
    return byDate
  }, [assignments])

  // Get days in current month for calendar grid
  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear()
    const month = calendarMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const days: Date[] = []
    
    // Add padding for days before first of month
    const startPadding = firstDay.getDay()
    for (let i = startPadding - 1; i >= 0; i--) {
      const d = new Date(year, month, -i)
      days.push(d)
    }
    
    // Add all days of month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d))
    }
    
    // Add padding for days after last of month
    const endPadding = 6 - lastDay.getDay()
    for (let i = 1; i <= endPadding; i++) {
      days.push(new Date(year, month + 1, i))
    }
    
    return days
  }, [calendarMonth])

  // formatCurrency is defined above with EXCHANGE_RATES


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Resource Management</h2>
          <p className="text-sm text-muted-foreground">Manage labor, equipment, materials, and subcontractors for your project</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Region:</span>
          <Select value={selectedRegion} onValueChange={(v: 'india' | 'usa' | 'uae' | 'uk' | 'europe') => setSelectedRegion(v)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="india">🇮🇳 India (₹)</SelectItem>
              <SelectItem value="usa">🇺🇸 USA ($)</SelectItem>
              <SelectItem value="uae">🇦🇪 UAE (AED)</SelectItem>
              <SelectItem value="uk">🇬🇧 UK (£)</SelectItem>
              <SelectItem value="europe">🇪🇺 Europe (€)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="library" className="space-y-4">
        <TabsList>
          <TabsTrigger value="library">Resource Library</TabsTrigger>
          <TabsTrigger value="cost">Cost Tracking</TabsTrigger>
          <TabsTrigger value="utilization">Utilization</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
        </TabsList>

        {/* RESOURCE LIBRARY TAB */}
        <TabsContent value="library" className="space-y-4">
          <div className="flex items-center justify-between">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40"><SelectValue placeholder="All Types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="labor">Labor</SelectItem>
                <SelectItem value="equipment">Equipment</SelectItem>
                <SelectItem value="material">Material</SelectItem>
                <SelectItem value="subcontractor">Subcontractor</SelectItem>
              </SelectContent>
            </Select>
            {canEdit && <div className="flex gap-2">
              {/* Import Excel */}
              <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline"><FileSpreadsheet className="h-4 w-4 mr-2" />Import Excel</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Import Resources from Excel</DialogTitle>
                    <DialogDescription>Download the template, fill it with your resources, then upload it back</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6 py-4">
                    {/* Step 1: Download Template */}
                    <div>
                      <p className="text-sm font-medium mb-3">Step 1: Download Template</p>
                      <Button 
                        variant="outline" 
                        className="w-full justify-center"
                        onClick={() => {
                          // Create and download Excel template
                          const headers = ['name', 'type', 'unit', 'hourly_rate', 'daily_rate', 'capacity', 'description']
                          const sampleData = [
                            ['Mason', 'labor', 'person', '100', '800', '5', 'Skilled mason'],
                            ['Crane', 'equipment', 'machine', '2500', '20000', '1', 'Tower crane'],
                            ['Cement', 'material', 'bag', '', '380', '100', 'OPC 53 grade'],
                          ]
                          const csvContent = [headers.join(','), ...sampleData.map(row => row.join(','))].join('\n')
                          const blob = new Blob([csvContent], { type: 'text/csv' })
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url
                          a.download = 'resource_template.csv'
                          a.click()
                          URL.revokeObjectURL(url)
                          toast.success('Template downloaded!')
                        }}
                      >
                        <Upload className="h-4 w-4 mr-2 rotate-180" />
                        Download Excel Template
                      </Button>
                    </div>

                    {/* Step 2: Upload */}
                    <div>
                      <p className="text-sm font-medium mb-3">Step 2: Upload Filled Template</p>
                      <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                        <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                        <p className="text-sm font-medium mb-1">Click to upload Excel file</p>
                        <p className="text-xs text-muted-foreground mb-4">or drag and drop</p>
                        <Input
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          onChange={handleImportExcel}
                          disabled={importing}
                          className="max-w-xs mx-auto cursor-pointer"
                        />
                      </div>
                      {importing && <p className="text-center text-sm text-blue-600 mt-2">Importing resources...</p>}
                    </div>

                    {/* Required columns info */}
                    <div className="bg-gray-100 p-4 rounded-lg text-sm">
                      <p className="font-medium mb-2">Required columns:</p>
                      <ul className="space-y-1 text-muted-foreground list-disc list-inside">
                        <li><strong>name:</strong> Resource name</li>
                        <li><strong>type:</strong> labor, equipment, material, or subcontractor</li>
                        <li><strong>unit:</strong> Unit of measurement (hours, days, m3, etc.)</li>
                        <li><strong>hourly_rate:</strong> Optional hourly cost</li>
                        <li><strong>daily_rate:</strong> Optional daily cost</li>
                        <li><strong>capacity:</strong> Optional maximum capacity</li>
                        <li><strong>description:</strong> Optional notes</li>
                      </ul>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* AI Create */}
              <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline"><Sparkles className="h-4 w-4 mr-2" />AI Create</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-yellow-500" />
                      Create Resources with AI
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <p className="text-sm text-muted-foreground">
                      Describe the resources you want to create. For example:
                    </p>
                    <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
                      <li>"Add 3 cranes for 3 months starting from 2024-03-15"</li>
                      <li>"Add 5 excavators at ₹150/hour"</li>
                      <li>"Add 10 laborers at ₹25/hour for 6 months"</li>
                    </ul>
                    
                    <div className="border-t pt-4">
                      <div className="flex gap-2">
                        <Textarea
                          placeholder="Describe the resources you want to create..."
                          value={aiPrompt}
                          onChange={(e) => setAiPrompt(e.target.value)}
                          className="flex-1 min-h-[80px] resize-none border-2 border-orange-200 focus:border-orange-400"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault()
                              handleAIGenerate()
                            }
                          }}
                        />
                        <Button 
                          onClick={handleAIGenerate} 
                          disabled={aiGenerating || !aiPrompt.trim()}
                          className="bg-orange-400 hover:bg-orange-500 text-white px-6"
                        >
                          {aiGenerating ? '...' : 'Send'}
                        </Button>
                      </div>
                    </div>
                    
                    <div className="bg-amber-50 p-3 rounded-lg text-xs text-amber-700">
                      💡 Market rates will be auto-applied based on resource names (Indian construction rates 2024)
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
                <DialogTrigger asChild><Button variant="outline"><Plus className="h-4 w-4 mr-2" />Assign to Task</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Assign Resource to Task</DialogTitle>
                    <DialogDescription>Link a resource to a task for cost tracking</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAssignSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Resource</Label>
                      <Select value={selectedResourceId} onValueChange={setSelectedResourceId}>
                        <SelectTrigger><SelectValue placeholder="Select resource" /></SelectTrigger>
                        <SelectContent>{resources.map(r => <SelectItem key={r.id} value={r.id.toString()}>{r.name} ({r.type})</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Task</Label>
                      <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
                        <SelectTrigger><SelectValue placeholder="Select task" /></SelectTrigger>
                        <SelectContent>
                          {(project.tasks && project.tasks.length > 0) ? (
                            project.tasks.map((t: any) => <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>)
                          ) : (
                            <div className="p-2 text-sm text-muted-foreground text-center">No tasks found. Create tasks in Schedule tab first.</div>
                          )}
                        </SelectContent>
                      </Select>
                      {(!project.tasks || project.tasks.length === 0) && (
                        <p className="text-xs text-amber-600">⚠️ Go to Schedule tab and create tasks first</p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Quantity</Label>
                        <Input type="number" value={assignQuantity} onChange={e => setAssignQuantity(e.target.value)} min="1" />
                        <p className="text-xs text-muted-foreground">How many units? (e.g., 5 masons, 2 machines)</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Hours/Day</Label>
                        <Input type="number" value={assignHoursPerDay} onChange={e => setAssignHoursPerDay(e.target.value)} min="1" max="24" />
                        <p className="text-xs text-muted-foreground">Working hours per day (default 8)</p>
                      </div>
                    </div>
                    {selectedResourceId && assignQuantity && assignHoursPerDay && (
                      <div className="bg-blue-50 p-3 rounded-lg text-sm">
                        <p className="text-blue-800">
                          💰 Daily Cost: {(() => {
                            const res = resources.find(r => r.id.toString() === selectedResourceId)
                            if (!res) return '₹0'
                            const hourly = res.hourlyRate || 0
                            const daily = res.dailyRate || (hourly * 8)
                            const qty = parseFloat(assignQuantity) || 1
                            const hrs = parseFloat(assignHoursPerDay) || 8
                            const cost = hourly ? (hourly * hrs * qty) : (daily * qty)
                            return formatCurrency(cost)
                          })()}
                        </p>
                      </div>
                    )}
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
                      <Button type="submit" disabled={!selectedResourceId || !selectedTaskId}>Assign</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
              <Dialog open={resourceDialogOpen} onOpenChange={(o) => { setResourceDialogOpen(o); if (!o) resetResourceForm() }}>
                <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add Resource</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{editingResource ? 'Edit' : 'Add'} Resource</DialogTitle></DialogHeader>
                  <form onSubmit={handleResourceSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Name *</Label>
                        <Input 
                          value={name} 
                          onChange={e => handleNameChange(e.target.value)} 
                          placeholder="e.g., Mason, Electrician, Cement"
                          required 
                        />
                        <p className="text-xs text-muted-foreground">💡 Type resource name for auto market rates</p>
                      </div>
                      <div className="space-y-2"><Label>Type</Label>
                        <Select value={type} onValueChange={setType}><SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="labor">Labor</SelectItem><SelectItem value="equipment">Equipment</SelectItem><SelectItem value="material">Material</SelectItem><SelectItem value="subcontractor">Subcontractor</SelectItem></SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2"><Label>Unit</Label><Input value={unit} onChange={e => setUnit(e.target.value)} placeholder="person, machine, kg" /></div>
                      <div className="space-y-2"><Label>Hourly Rate (₹)</Label><Input type="number" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} placeholder="Auto-filled" /></div>
                      <div className="space-y-2"><Label>Daily Rate (₹)</Label><Input type="number" value={dailyRate} onChange={e => setDailyRate(e.target.value)} placeholder="Auto-filled" /></div>
                    </div>
                    <div className="space-y-2"><Label>Capacity</Label><Input type="number" value={capacity} onChange={e => setCapacity(e.target.value)} placeholder="Max available units" /></div>
                    <div className="space-y-2"><Label>Description</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional notes about this resource" /></div>
                    {(hourlyRate || dailyRate) && (
                      <div className="bg-green-50 p-3 rounded-lg text-sm">
                        <p className="text-green-800">
                          💰 Estimated cost: {hourlyRate && `₹${hourlyRate}/hr`} {dailyRate && `| ₹${dailyRate}/day`}
                        </p>
                      </div>
                    )}
                    <DialogFooter><Button type="submit">{editingResource ? 'Update' : 'Add Resource'}</Button></DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>}
          </div>
          <Card>
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Unit</TableHead><TableHead>Capacity</TableHead><TableHead>Usage</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {loading ? <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow> :
                  filteredResources.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No resources found</TableCell></TableRow> :
                    filteredResources.map(r => {
                      const resourceAssignments = assignments.filter(a => a.resourceId === r.id)
                      const totalUsed = resourceAssignments.reduce((sum, a) => sum + a.quantity, 0)
                      const usageCostINR = totalUsed > 0 ? (r.dailyRate || (r.hourlyRate || 0) * 8) * totalUsed : 0
                      const usageCostConverted = convertCurrency(usageCostINR)
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium"><div className="flex items-center gap-2">{getTypeIcon(r.type)}{r.name}</div></TableCell>
                          <TableCell className="capitalize">{r.type}</TableCell>
                          <TableCell>{r.unit || '-'}</TableCell>
                          <TableCell>{r.capacity || '-'}</TableCell>
                          <TableCell>
                            {totalUsed > 0 ? (
                              <span className="text-green-600 font-medium">{totalUsed} used = {formatCurrency(usageCostConverted)}/day</span>
                            ) : (
                              <span className="text-muted-foreground">Not assigned</span>
                            )}
                          </TableCell>
                          <TableCell>{canEdit && <div className="flex gap-1"><Button variant="ghost" size="sm" onClick={() => openEditDialog(r)}><Edit className="h-4 w-4" /></Button><Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDeleteResource(r.id)}><Trash2 className="h-4 w-4" /></Button></div>}</TableCell>
                        </TableRow>
                      )
                    })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>


        {/* COST TRACKING TAB */}
        <TabsContent value="cost" className="space-y-4">
          {/* Cost Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{formatCurrency(convertCurrency(totalCost))}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Labor Cost</CardTitle>
                <Users className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{formatCurrency(convertCurrency(costByType.labor || 0))}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Equipment Cost</CardTitle>
                <Wrench className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{formatCurrency(convertCurrency(costByType.equipment || 0))}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Material Cost</CardTitle>
                <Package className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{formatCurrency(convertCurrency(costByType.material || 0))}</div></CardContent>
            </Card>
          </div>

          {/* Add Cost Entry */}
          {canEdit && <div className="flex justify-end">
            <Dialog open={costDialogOpen} onOpenChange={setCostDialogOpen}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add Cost Entry</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Cost Entry</DialogTitle><DialogDescription>Record resource cost for tracking</DialogDescription></DialogHeader>
                <form onSubmit={handleCostSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Resource *</Label>
                    <Select value={costResourceId} onValueChange={setCostResourceId}>
                      <SelectTrigger><SelectValue placeholder="Select resource" /></SelectTrigger>
                      <SelectContent>{resources.map(r => <SelectItem key={r.id} value={r.id.toString()}>{r.name} ({r.type})</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Date *</Label><Input type="date" value={costDate} onChange={e => setCostDate(e.target.value)} required /></div>
                    <div className="space-y-2"><Label>Unit Cost (₹) *</Label><Input type="number" value={costUnitCost} onChange={e => setCostUnitCost(e.target.value)} required /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Hours</Label><Input type="number" value={costHours} onChange={e => setCostHours(e.target.value)} /></div>
                    <div className="space-y-2"><Label>Quantity</Label><Input type="number" value={costQuantity} onChange={e => setCostQuantity(e.target.value)} /></div>
                  </div>
                  <div className="space-y-2"><Label>Notes</Label><Textarea value={costNotes} onChange={e => setCostNotes(e.target.value)} /></div>
                  <DialogFooter><Button type="submit">Add Cost</Button></DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>}

          {/* Cost History Table */}
          <Card>
            <CardHeader><CardTitle>Cost History</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Resource</TableHead><TableHead>Type</TableHead><TableHead>Hours/Qty</TableHead><TableHead>Unit Cost</TableHead><TableHead>Total</TableHead><TableHead>Notes</TableHead></TableRow></TableHeader>
                <TableBody>
                  {costs.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No cost entries yet</TableCell></TableRow> :
                    costs.map(c => (
                      <TableRow key={c.id}>
                        <TableCell>{new Date(c.date).toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium">{c.resource.name}</TableCell>
                        <TableCell className="capitalize">{c.resource.type}</TableCell>
                        <TableCell>{c.hours || c.quantity || '-'}</TableCell>
                        <TableCell>{formatCurrency(convertCurrency(c.unitCost))}</TableCell>
                        <TableCell className="font-semibold">{formatCurrency(convertCurrency(c.totalCost))}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{c.notes || '-'}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* UTILIZATION TAB */}
        <TabsContent value="utilization" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Resource Utilization</CardTitle><CardDescription>View how resources are being utilized across tasks</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              {utilization.length === 0 ? <p className="text-center py-8 text-muted-foreground">No resources to show</p> :
                utilization.map(r => (
                  <div key={r.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">{getTypeIcon(r.type)}<span className="font-medium">{r.name}</span></div>
                      <div className="text-sm text-muted-foreground">{r.assignmentCount} assignments • {r.totalAssigned}/{r.capacity || '∞'} allocated</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Progress value={r.utilizationPercent} className="flex-1" />
                      <span className={`text-sm font-medium ${r.utilizationPercent > 80 ? 'text-red-500' : r.utilizationPercent > 50 ? 'text-yellow-500' : 'text-green-500'}`}>{Math.round(r.utilizationPercent)}%</span>
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>

          {/* Assignments List */}
          <Card>
            <CardHeader><CardTitle>Active Assignments</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Resource</TableHead><TableHead>Task</TableHead><TableHead>Quantity</TableHead><TableHead>Hours/Day</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {assignments.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No assignments yet</TableCell></TableRow> :
                    assignments.map(a => (
                      <TableRow key={a.id}>
                        <TableCell><div className="flex items-center gap-2">{getTypeIcon(a.resource.type)}{a.resource.name}</div></TableCell>
                        <TableCell>{a.task.name}</TableCell>
                        <TableCell>{a.quantity}</TableCell>
                        <TableCell>{a.hoursPerDay || '-'}</TableCell>
                        <TableCell><span className={`px-2 py-1 rounded text-xs ${a.status === 'completed' ? 'bg-green-100 text-green-800' : a.status === 'active' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>{a.status}</span></TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CALENDAR TAB */}
        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><CalendarIcon className="h-5 w-5" />Resource Calendar</CardTitle>
                  <CardDescription>View resource assignments by date</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}>←</Button>
                  <span className="font-medium min-w-[140px] text-center">{calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                  <Button variant="outline" size="sm" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}>→</Button>
                  <Button variant="outline" size="sm" onClick={() => setCalendarMonth(new Date())}>Today</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, idx) => {
                  const dateKey = day.toISOString().split('T')[0]
                  const dayAssignments = calendarData[dateKey] || []
                  const isCurrentMonth = day.getMonth() === calendarMonth.getMonth()
                  const isToday = day.toDateString() === new Date().toDateString()
                  
                  return (
                    <div key={idx} className={`min-h-[100px] border rounded p-1 ${isCurrentMonth ? 'bg-white' : 'bg-gray-50'} ${isToday ? 'border-blue-500 border-2' : ''}`}>
                      <div className={`text-sm font-medium mb-1 ${isCurrentMonth ? '' : 'text-muted-foreground'} ${isToday ? 'text-blue-600' : ''}`}>{day.getDate()}</div>
                      <div className="space-y-1">
                        {dayAssignments.slice(0, 3).map(a => (
                          <div key={a.id} className={`text-xs p-1 rounded truncate ${a.resource.type === 'labor' ? 'bg-blue-100 text-blue-700' : a.resource.type === 'equipment' ? 'bg-orange-100 text-orange-700' : a.resource.type === 'material' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`} title={`${a.resource.name} → ${a.task.name}`}>
                            {a.resource.name}
                          </div>
                        ))}
                        {dayAssignments.length > 3 && (
                          <div className="text-xs text-muted-foreground">+{dayAssignments.length - 3} more</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Legend */}
              <div className="flex gap-4 mt-4 text-sm">
                <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-100"></span>Labor</div>
                <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-100"></span>Equipment</div>
                <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100"></span>Material</div>
                <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-purple-100"></span>Subcontractor</div>
              </div>

              {/* Selected Day Details */}
              {Object.keys(calendarData).length > 0 && (
                <div className="mt-6">
                  <h4 className="font-semibold mb-3">Upcoming Assignments</h4>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {Object.entries(calendarData)
                      .filter(([date]) => new Date(date) >= new Date(new Date().toDateString()))
                      .sort(([a], [b]) => a.localeCompare(b))
                      .slice(0, 10)
                      .map(([date, dayAssignments]) => (
                        <div key={date} className="border rounded-lg p-3">
                          <div className="font-medium text-sm mb-2">{new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                          <div className="space-y-1">
                            {dayAssignments.map(a => (
                              <div key={a.id} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">{getTypeIcon(a.resource.type)}<span>{a.resource.name}</span><span className="text-muted-foreground">→</span><span>{a.task.name}</span></div>
                                <span className="text-xs text-muted-foreground">{a.quantity} units</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {Object.keys(calendarData).length === 0 && (
                <p className="text-center py-8 text-muted-foreground">No scheduled assignments. Assign resources to tasks to see them on the calendar.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
