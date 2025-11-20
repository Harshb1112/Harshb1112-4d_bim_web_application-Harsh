import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Building2, 
  CheckCircle2, 
  Box, // Changed from Cube to Box
  TrendingUp 
} from 'lucide-react'

interface StatsCardsProps {
  totalProjects: number
  totalTasks: number
  totalModels: number
  avgProgress: number
}

export default function StatsCards({ 
  totalProjects, 
  totalTasks, 
  totalModels, 
  avgProgress 
}: StatsCardsProps) {
  const stats = [
    {
      title: 'Active Projects',
      value: totalProjects,
      icon: Building2,
      color: 'text-blue-600'
    },
    {
      title: 'Total Tasks',
      value: totalTasks,
      icon: CheckCircle2,
      color: 'text-green-600'
    },
    {
      title: 'Models Uploaded',
      value: totalModels,
      icon:   Box, // Changed from Cube to Box
      color: 'text-purple-600'
    },
    {
      title: 'Avg Progress',
      value: `${avgProgress}%`,
      icon: TrendingUp,
      color: 'text-orange-600'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {stat.title}
            </CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}