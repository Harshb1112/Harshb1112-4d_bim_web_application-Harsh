/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Building, Info, Hash, Text, Calendar, Ruler, Layers } from 'lucide-react'

interface ElementPropertiesPanelProps {
  element: any | null
}

const getIconForProperty = (key: string) => {
  const lowerKey = key.toLowerCase()
  if (lowerKey.includes('id') || lowerKey.includes('guid')) return <Hash className="h-4 w-4 text-gray-500" />
  if (lowerKey.includes('name') || lowerKey.includes('type') || lowerKey.includes('family') || lowerKey.includes('category')) return <Text className="h-4 w-4 text-gray-500" />
  if (lowerKey.includes('date') || lowerKey.includes('time')) return <Calendar className="h-4 w-4 text-gray-500" />
  if (lowerKey.includes('length') || lowerKey.includes('width') || lowerKey.includes('height') || lowerKey.includes('area') || lowerKey.includes('volume')) return <Ruler className="h-4 w-4 text-gray-500" />
  if (lowerKey.includes('level')) return <Layers className="h-4 w-4 text-gray-500" />
  return <Info className="h-4 w-4 text-gray-500" />
}

const formatValue = (value: any) => {
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value, null, 2)
  }
  return String(value)
}

export default function ElementPropertiesPanel({ element }: ElementPropertiesPanelProps) {
  if (!element) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building className="h-5 w-5" />
            <span>Element Properties</span>
          </CardTitle>
          <CardDescription>Select an element in the 3D viewer to see its properties.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Info className="h-12 w-12 mx-auto mb-4" />
            <p>No element selected</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const properties = Object.entries(element.parameters || {}).filter(([key]) => !key.startsWith('__'))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Building className="h-5 w-5" />
          <span>Element Properties</span>
        </CardTitle>
        <CardDescription>Detailed information for the selected element.</CardDescription>
      </CardHeader>
      <CardContent className="max-h-[500px] overflow-y-auto">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="font-medium text-gray-600">Name:</div>
            <div>{element.typeName || element.name || 'N/A'}</div>
            <div className="font-medium text-gray-600">Category:</div>
            <div>{element.category || 'N/A'}</div>
            <div className="font-medium text-gray-600">Family:</div>
            <div>{element.family || 'N/A'}</div>
            <div className="font-medium text-gray-600">Level:</div>
            <div>{element.level || 'N/A'}</div>
            <div className="font-medium text-gray-600">GUID:</div>
            <div className="break-all font-mono text-xs">{element.guid || element.id || 'N/A'}</div>
          </div>

          {properties.length > 0 && (
            <>
              <h3 className="text-md font-semibold mt-4 mb-2">Parameters</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">Property</TableHead>
                    <TableHead>Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {properties.map(([key, value]) => (
                    <TableRow key={key}>
                      <TableCell className="font-medium flex items-center space-x-2">
                        {getIconForProperty(key)}
                        <span>{key}</span>
                      </TableCell>
                      <TableCell className="break-all text-xs">{formatValue(value)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}