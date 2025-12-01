"use client"

import { useState, useEffect } from 'react'
import Sidebar from '@/components/dashboard/Sidebar'
import DashboardHeader from '@/components/dashboard/DashboardHeader'

interface DashboardLayoutClientProps {
  user: {
    id: number
    fullName: string
    email: string
    role: string
    profileImage?: string | null
  }
  children: React.ReactNode
}

export default function DashboardLayoutClient({ user, children }: DashboardLayoutClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    const savedCollapsed = localStorage.getItem('sidebarCollapsed') === 'true'
    setSidebarCollapsed(savedCollapsed)

    // Listen for storage changes
    const handleStorage = () => {
      const collapsed = localStorage.getItem('sidebarCollapsed') === 'true'
      setSidebarCollapsed(collapsed)
    }

    window.addEventListener('storage', handleStorage)
    
    // Also check periodically for same-tab changes
    const interval = setInterval(() => {
      const collapsed = localStorage.getItem('sidebarCollapsed') === 'true'
      if (collapsed !== sidebarCollapsed) {
        setSidebarCollapsed(collapsed)
      }
    }, 100)

    return () => {
      window.removeEventListener('storage', handleStorage)
      clearInterval(interval)
    }
  }, [sidebarCollapsed])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Sidebar - Desktop */}
      <div className="hidden lg:block">
        <Sidebar user={user} />
      </div>

      {/* Sidebar - Mobile */}
      {sidebarOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 lg:hidden">
            <Sidebar user={user} />
          </div>
        </>
      )}

      {/* Main Content */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
        <DashboardHeader user={user} onMenuClick={() => setSidebarOpen(true)} />
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
