"use client"

import Image from 'next/image'
import { Menu } from 'lucide-react'
import CreateProjectDialog from '@/components/dashboard/CreateProjectDialog'

interface DashboardHeaderProps {
  user: {
    id: number
    fullName: string
    email: string
    role: string
  }
  onMenuClick?: () => void
}

export default function DashboardHeader({ user, onMenuClick }: DashboardHeaderProps) {
  return (
    <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-4">
            {/* Mobile menu button */}
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Menu className="h-6 w-6" />
            </button>
            
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-900 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">BIM 4D Scheduler</h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            { /*(user.role === 'admin' || user.role === 'manager') && <CreateProjectDialog /> */ } 
            
            {/* Right side logo */}
            <div className="hidden sm:flex items-center gap-3">
              <Image 
                src="/assets/bimboss-logo.png" 
                alt="BimBoss Logo" 
                width={140}
                priority 
                height={120}
                priority
                style={{ width: 'auto', height: 'auto' }}
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
