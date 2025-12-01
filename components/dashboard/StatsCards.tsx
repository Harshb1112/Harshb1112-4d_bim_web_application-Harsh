import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, CheckCircle2, Box, TrendingUp } from 'lucide-react'

interface StatsCardsProps {
  totalProjects: number
  totalTasks: number
  totalModels: number
  avgProgress: number
}

export default function StatsCards({ totalProjects, totalTasks, totalModels, avgProgress }: StatsCardsProps) {
  const stats = [
    { title: 'Active Projects', value: totalProjects, icon: Building2, color: 'text-blue-600 dark:text-blue-400' },
    { title: 'Total Tasks', value: totalTasks, icon: CheckCircle2, color: 'text-green-600 dark:text-green-400' },
    { title: 'Models Uploaded', value: totalModels, icon: Box, color: 'text-purple-600 dark:text-purple-400' },
    { title: 'Avg Progress', value: `${avgProgress}%`, icon: TrendingUp, color: 'text-orange-600 dark:text-orange-400' }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat) => (
        <Card key={stat.title} className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {stat.title}
            </CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
