/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Building2, LogOut, User, Calendar } from 'lucide-react'
import Link from 'next/link'
import CreateProjectDialog from '@/components/dashboard/CreateProjectDialog'

interface DashboardHeaderProps {
  user: {
    id: number
    fullName: string
    email: string
    role: string
  }
}

export default function DashboardHeader({ user }: DashboardHeaderProps) {
  const router = useRouter()

  const handleLogout = () => {
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT'
    router.push('/login')
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Building2 className="h-8 w-8 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">4D BIM</h1>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Link href="/dashboard/gantt">
              <Button variant="outline" size="sm">
                <Calendar className="h-4 w-4 mr-2" />
                Gantt Chart
              </Button>
            </Link>

            {(user.role === 'admin' || user.role === 'manager') && <CreateProjectDialog />}

            <Link href="/profile">
              <Button variant="ghost" size="sm">
                <User className="h-4 w-4 mr-2" />
                {user.fullName}
              </Button>
            </Link>

            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}