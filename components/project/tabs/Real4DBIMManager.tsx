/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { 
  Box, 
  Filter, 
  MousePointer, 
  Square, 
  Lasso, 
  Layers,
  PlusCircle,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Calendar,
  TrendingUp
} from 'lucide-react'
import { toast } from 'sonner'
import SpeckleViewer from '../SpeckleViewer'

interface Real4DBIMManagerProps {
  project: any
}

// Construction phases
const CONSTRUCTION_PHASES = [
  { id: 1, name: 'Site Prep