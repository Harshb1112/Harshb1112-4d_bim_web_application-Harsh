"use client"

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Download, Loader2, FileText, FileSpreadsheet, Check } from 'lucide-react'
import { toast } from 'sonner'

interface ExportToSAPDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: number
  projectName?: string
}

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺' },
  { code: 'PLN', name: 'Polish Zloty', symbol: 'zł' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱' },
  { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč' },
  { code: 'ILS', name: 'Israeli Shekel', symbol: '₪' },
  { code: 'CLP', name: 'Chilean Peso', symbol: '$' },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨' },
  { code: 'EGP', name: 'Egyptian Pound', symbol: '£' },
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫' },
  { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳' }
]

const EXPORT_TYPES = [
  { value: 'all', label: 'All Data' },
  { value: 'wbs', label: 'WBS Elements' },
  { value: 'activities', label: 'Network Activities' },
  { value: 'costs', label: 'Cost Elements' },
  { value: 'workcenters', label: 'Work Centers' }
]

const FORMATS = [
  { value: 'csv', label: 'CSV', icon: FileSpreadsheet },
  { value: 'xml', label: 'XML (IDoc)', icon: FileText }
]

const DATE_FORMATS = [
  { value: 'sap', label: 'SAP (YYYYMMDD)' },
  { value: 'iso', label: 'ISO (YYYY-MM-DD)' }
]

export default function ExportToSAPDialog({ 
  open, 
  onOpenChange, 
  projectId,
  projectName = 'Project'
}: ExportToSAPDialogProps) {
  const [exporting, setExporting] = useState(false)
  const [exportType, setExportType] = useState('all')
  const [format, setFormat] = useState('csv')
  const [config, setConfig] = useState({
    projectDefinition: '',
    controllingArea: '1000',
    plant: '1000',
    costCenter: 'CC1000',
    currency: 'USD',
    dateFormat: 'sap'
  })
  const [preview, setPreview] = useState({
    wbsCount: 0,
    activitiesCount: 0,
    workCentersCount: 0,
    costItemsCount: 0
  })

  useEffect(() => {
    if (open) {
      // Set default project definition from project name
      const projectDef = projectName.replace(/[^a-zA-Z0-9_]/g, '_').toUpperCase()
      setConfig(prev => ({ ...prev, projectDefinition: projectDef }))
      
      // Fetch preview data
      fetchPreview()
    }
  }, [open, projectId, projectName])

  const fetchPreview = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/export-preview`, {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        setPreview(data.preview)
      }
    } catch (error) {
      console.error('Error fetching preview:', error)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      console.log('[SAP Export Dialog] Starting export with config:', config)
      
      const response = await fetch('/api/integrations/sap/export', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          projectId,
          format,
          exportType,
          config
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Export failed')
      }

      // Handle file download based on format
      if (format === 'csv' || format === 'xml') {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        
        const fileExtension = format === 'csv' ? 'csv' : 'xml'
        const fileName = `SAP_${exportType.toUpperCase()}_${config.projectDefinition}_${Date.now()}.${fileExtension}`
        a.download = fileName
        
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        
        console.log('[SAP Export Dialog] File downloaded:', fileName)
      } else {
        // Handle JSON response
        const data = await response.json()
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `SAP_${exportType.toUpperCase()}_${config.projectDefinition}_${Date.now()}.json`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }

      toast.success(`Export completed successfully! Currency: ${config.currency}`)
      onOpenChange(false)
    } catch (error: any) {
      console.error('[SAP Export Dialog] Export error:', error)
      toast.error(error.message || 'Failed to export')
    } finally {
      setExporting(false)
    }
  }

  // Helper function to convert JSON to XML
  const convertToXML = (data: any[], config: any) => {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml += '<SAP_PROJECT_EXPORT>\n'
    xml += `  <PROJECT_DEFINITION>${config.projectDefinition}</PROJECT_DEFINITION>\n`
    xml += `  <CONTROLLING_AREA>${config.controllingArea}</CONTROLLING_AREA>\n`
    xml += `  <PLANT>${config.plant}</PLANT>\n`
    xml += `  <COST_CENTER>${config.costCenter}</COST_CENTER>\n`
    xml += `  <CURRENCY>${config.currency}</CURRENCY>\n`
    xml += '  <TASKS>\n'
    
    data.forEach(task => {
      xml += '    <TASK>\n'
      Object.entries(task).forEach(([key, value]) => {
        xml += `      <${key}>${value || ''}</${key}>\n`
      })
      xml += '    </TASK>\n'
    })
    
    xml += '  </TASKS>\n'
    xml += '</SAP_PROJECT_EXPORT>'
    return xml
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Export to SAP PS</DialogTitle>
          <DialogDescription>
            Generate SAP-compatible files for import into SAP Project System
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Export Type and Format */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Export Type</Label>
              <Select value={exportType} onValueChange={setExportType}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPORT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        {exportType === type.value && <Check className="h-4 w-4 text-orange-500" />}
                        <span>{type.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Format</Label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMATS.map((fmt) => {
                    const Icon = fmt.icon
                    return (
                      <SelectItem key={fmt.value} value={fmt.value}>
                        <div className="flex items-center gap-2">
                          {format === fmt.value && <Check className="h-4 w-4 text-orange-500" />}
                          <Icon className="h-4 w-4" />
                          <span>{fmt.label}</span>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* SAP Configuration */}
          <div className="border rounded-lg p-4 space-y-4 bg-gray-50">
            <h3 className="font-medium text-sm">SAP Configuration</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="projectDef">Project Definition</Label>
                <Input
                  id="projectDef"
                  value={config.projectDefinition}
                  onChange={(e) => setConfig({ ...config, projectDefinition: e.target.value })}
                  placeholder="HARSH_BA"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="controllingArea">Controlling Area</Label>
                <Input
                  id="controllingArea"
                  value={config.controllingArea}
                  onChange={(e) => setConfig({ ...config, controllingArea: e.target.value })}
                  placeholder="1000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="plant">Plant</Label>
                <Input
                  id="plant"
                  value={config.plant}
                  onChange={(e) => setConfig({ ...config, plant: e.target.value })}
                  placeholder="1000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="costCenter">Cost Center</Label>
                <Input
                  id="costCenter"
                  value={config.costCenter}
                  onChange={(e) => setConfig({ ...config, costCenter: e.target.value })}
                  placeholder="CC1000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select 
                  value={config.currency} 
                  onValueChange={(value) => setConfig({ ...config, currency: value })}
                >
                  <SelectTrigger id="currency">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {CURRENCIES.map((currency) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        {currency.code} - {currency.name} ({currency.symbol})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateFormat">Date Format</Label>
                <Select 
                  value={config.dateFormat} 
                  onValueChange={(value) => setConfig({ ...config, dateFormat: value })}
                >
                  <SelectTrigger id="dateFormat">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DATE_FORMATS.map((fmt) => (
                      <SelectItem key={fmt.value} value={fmt.value}>
                        <div className="flex items-center gap-2">
                          {config.dateFormat === fmt.value && <Check className="h-4 w-4 text-orange-500" />}
                          <span>{fmt.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Export Preview */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="font-medium text-sm mb-3">Export Preview</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <span>•</span>
                <span>{preview.wbsCount} WBS Elements / Activities</span>
              </div>
              <div className="flex items-center gap-2">
                <span>•</span>
                <span>{preview.workCentersCount} Work Centers</span>
              </div>
              <div className="flex items-center gap-2">
                <span>•</span>
                <span>{preview.costItemsCount} Cost Line Items</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={exporting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={exporting || !config.projectDefinition}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            {exporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
