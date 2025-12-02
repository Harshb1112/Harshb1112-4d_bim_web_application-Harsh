'use client'

import { useMemo } from 'react'
import { format } from 'date-fns'
import { DollarSign, TrendingUp, Package, Users, Truck, Building } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import AddCostDialog from './AddCostDialog'

interface CostPanelProps {
  costSummary: {
    todayTotal: number
    projectTotal: number
    byCategory: Record<string, number>
  } | null
  dailyCosts: any[]
  selectedDate: Date
  projectId?: number
  onRefresh?: () => void
}

const categoryIcons: Record<string, any> = {
  labor: Users,
  material: Package,
  equipment: Truck,
  subcontractor: Building,
  overhead: DollarSign
}

const categoryColors: Record<string, string> = {
  labor: 'bg-blue-500',
  material: 'bg-green-500',
  equipment: 'bg-yellow-500',
  subcontractor: 'bg-purple-500',
  overhead: 'bg-gray-500'
}

export default function CostPanel({ costSummary, dailyCosts, selectedDate, projectId, onRefresh }: CostPanelProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount)
  }

  const categoryBreakdown = useMemo(() => {
    if (!costSummary?.byCategory) return []
    
    const total = Object.values(costSummary.byCategory).reduce((sum, val) => sum + val, 0)
    
    return Object.entries(costSummary.byCategory).map(([category, amount]) => ({
      category,
      amount,
      percentage: total > 0 ? (amount / total) * 100 : 0,
      Icon: categoryIcons[category] || DollarSign,
      color: categoryColors[category] || 'bg-gray-500'
    })).sort((a, b) => b.amount - a.amount)
  }, [costSummary])

  if (!costSummary) {
    return (
      <div className="text-center text-gray-400 py-8">
        <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No cost data available</p>
        <p className="text-sm mt-2">Add cost entries to track expenses</p>
        {projectId && (
          <div className="mt-4">
            <AddCostDialog projectId={projectId} onCostAdded={onRefresh} />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Today's Cost Summary */}
      <Card className="bg-gray-700 border-gray-600">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-300">
            Cost for {format(selectedDate, 'MMM d, yyyy')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">
            {formatCurrency(costSummary.todayTotal)}
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {dailyCosts?.length || 0} transactions today
          </p>
        </CardContent>
      </Card>

      {/* Total Project Cost */}
      <Card className="bg-gradient-to-br from-blue-600 to-blue-800 border-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-blue-100">
            Total Project Cost
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-white">
            {formatCurrency(costSummary.projectTotal)}
          </div>
          <div className="flex items-center gap-1 mt-2 text-blue-200 text-sm">
            <TrendingUp className="h-4 w-4" />
            <span>Cumulative to date</span>
          </div>
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      <Card className="bg-gray-700 border-gray-600">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-300">
            Cost by Category
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {categoryBreakdown.length > 0 ? (
            categoryBreakdown.map(({ category, amount, percentage, Icon, color }) => (
              <div key={category} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`p-1 rounded ${color}`}>
                      <Icon className="h-3 w-3 text-white" />
                    </div>
                    <span className="capitalize text-gray-300">{category}</span>
                  </div>
                  <span className="text-white font-medium">
                    {formatCurrency(amount)}
                  </span>
                </div>
                <Progress value={percentage} className="h-1.5" />
                <div className="text-xs text-gray-500 text-right">
                  {percentage.toFixed(1)}%
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-400 text-sm text-center py-4">
              No category data available
            </p>
          )}
        </CardContent>
      </Card>

      {/* Today's Transactions */}
      {dailyCosts && dailyCosts.length > 0 && (
        <Card className="bg-gray-700 border-gray-600">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">
              Today's Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {dailyCosts.map((cost) => {
                const Icon = categoryIcons[cost.category] || DollarSign
                return (
                  <div 
                    key={cost.id} 
                    className="flex items-center justify-between p-2 bg-gray-800 rounded"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-sm text-white">
                          {cost.description || cost.category}
                        </p>
                        {cost.vendor && (
                          <p className="text-xs text-gray-500">{cost.vendor}</p>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-medium text-white">
                      {formatCurrency(cost.totalCost)}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Cost Button */}
      {projectId && (
        <AddCostDialog projectId={projectId} onCostAdded={onRefresh} />
      )}
    </div>
  )
}
