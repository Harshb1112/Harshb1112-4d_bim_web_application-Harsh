'use client'

import { useState } from 'react'
import { DollarSign, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

interface AddCostDialogProps {
  projectId: number
  onCostAdded?: () => void
}

export default function AddCostDialog({ projectId, onCostAdded }: AddCostDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [cost, setCost] = useState({
    date: new Date().toISOString().split('T')[0],
    category: 'material',
    description: '',
    quantity: '',
    unit: '',
    unitCost: '',
    totalCost: '',
    vendor: '',
    invoiceRef: '',
    notes: ''
  })

  const calculateTotal = () => {
    const qty = parseFloat(cost.quantity) || 0
    const unitCost = parseFloat(cost.unitCost) || 0
    return (qty * unitCost).toFixed(2)
  }

  const handleSubmit = async () => {
    if (!cost.category || !cost.totalCost) {
      toast.error('Please fill required fields')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/site-view/${projectId}/costs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...cost,
          quantity: cost.quantity ? parseFloat(cost.quantity) : null,
          unitCost: cost.unitCost ? parseFloat(cost.unitCost) : null,
          totalCost: parseFloat(cost.totalCost)
        })
      })

      if (response.ok) {
        toast.success('Cost entry added')
        setOpen(false)
        setCost({
          date: new Date().toISOString().split('T')[0],
          category: 'material',
          description: '',
          quantity: '',
          unit: '',
          unitCost: '',
          totalCost: '',
          vendor: '',
          invoiceRef: '',
          notes: ''
        })
        onCostAdded?.()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to add cost')
      }
    } catch (error) {
      toast.error('Failed to add cost entry')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Cost Entry
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Add Cost Entry
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={cost.date}
                onChange={(e) => setCost({ ...cost, date: e.target.value })}
                className="bg-gray-700 border-gray-600"
              />
            </div>
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select 
                value={cost.category}
                onValueChange={(v) => setCost({ ...cost, category: v })}
              >
                <SelectTrigger className="bg-gray-700 border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="labor">👷 Labor</SelectItem>
                  <SelectItem value="material">📦 Material</SelectItem>
                  <SelectItem value="equipment">🚜 Equipment</SelectItem>
                  <SelectItem value="subcontractor">🏗️ Subcontractor</SelectItem>
                  <SelectItem value="overhead">📋 Overhead</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              value={cost.description}
              onChange={(e) => setCost({ ...cost, description: e.target.value })}
              placeholder="e.g., Cement bags, Daily wages"
              className="bg-gray-700 border-gray-600"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                value={cost.quantity}
                onChange={(e) => {
                  const newCost = { ...cost, quantity: e.target.value }
                  if (newCost.unitCost) {
                    newCost.totalCost = (parseFloat(e.target.value) * parseFloat(newCost.unitCost)).toFixed(2)
                  }
                  setCost(newCost)
                }}
                placeholder="50"
                className="bg-gray-700 border-gray-600"
              />
            </div>
            <div className="space-y-2">
              <Label>Unit</Label>
              <Input
                value={cost.unit}
                onChange={(e) => setCost({ ...cost, unit: e.target.value })}
                placeholder="bags, kg, hrs"
                className="bg-gray-700 border-gray-600"
              />
            </div>
            <div className="space-y-2">
              <Label>Unit Cost (₹)</Label>
              <Input
                type="number"
                value={cost.unitCost}
                onChange={(e) => {
                  const newCost = { ...cost, unitCost: e.target.value }
                  if (newCost.quantity) {
                    newCost.totalCost = (parseFloat(newCost.quantity) * parseFloat(e.target.value)).toFixed(2)
                  }
                  setCost(newCost)
                }}
                placeholder="350"
                className="bg-gray-700 border-gray-600"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Total Cost (₹) *</Label>
            <Input
              type="number"
              value={cost.totalCost}
              onChange={(e) => setCost({ ...cost, totalCost: e.target.value })}
              placeholder="17500"
              className="bg-gray-700 border-gray-600 text-lg font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Vendor</Label>
              <Input
                value={cost.vendor}
                onChange={(e) => setCost({ ...cost, vendor: e.target.value })}
                placeholder="Supplier name"
                className="bg-gray-700 border-gray-600"
              />
            </div>
            <div className="space-y-2">
              <Label>Invoice Ref</Label>
              <Input
                value={cost.invoiceRef}
                onChange={(e) => setCost({ ...cost, invoiceRef: e.target.value })}
                placeholder="INV-001"
                className="bg-gray-700 border-gray-600"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={cost.notes}
              onChange={(e) => setCost({ ...cost, notes: e.target.value })}
              placeholder="Additional notes..."
              className="bg-gray-700 border-gray-600"
              rows={2}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={handleSubmit}
              disabled={loading || !cost.totalCost}
            >
              {loading ? 'Adding...' : 'Add Cost'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
