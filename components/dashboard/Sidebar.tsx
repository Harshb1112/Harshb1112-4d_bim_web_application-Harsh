"use client"

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { LayoutDashboard, User, Sun, Moon, Monitor, BarChart3, LogOut, ChevronLeft, ChevronRight } from 'lucide-react'

interface SidebarProps {
  user: {
    id: number
    fullName: string
    email: string
    role: string
    profileImage?: string | null
  }
}

type Theme = 'light' | 'dark' | 'system'

export default function Sidebar({ user }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [theme, setTheme] = useState<Theme>('light')
  const [showThemeMenu, setShowThemeMenu] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme || 'light'
    const savedCollapsed = localStorage.getItem('sidebarCollapsed') === 'true'
    setTheme(savedTheme)
    setCollapsed(savedCollapsed)
    applyTheme(savedTheme)
  }, [])

  const applyTheme = (newTheme: Theme) => {
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else if (newTheme === 'light') {
      document.documentElement.classList.remove('dark')
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (prefersDark) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
  }

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    applyTheme(newTheme)
    setShowThemeMenu(false)
  }

  const toggleCollapse = () => {
    const newCollapsed = !collapsed
    setCollapsed(newCollapsed)
    localStorage.setItem('sidebarCollapsed', String(newCollapsed))
  }

  const handleLogout = () => {
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT'
    router.push('/login')
  }

  const getThemeIcon = () => {
    if (theme === 'dark') return <Moon className="h-5 w-5" />
    if (theme === 'light') return <Sun className="h-5 w-5" />
    return <Monitor className="h-5 w-5" />
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Admin'
      case 'manager': return 'Manager'
      case 'team_leader': return 'Team Leader'
      default: return 'Member'
    }
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <aside className={`fixed left-0 top-0 h-screen ${collapsed ? 'w-20' : 'w-64'} bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col z-50 transition-all duration-300`}>
      {/* Collapse Toggle Button */}
      <button
        onClick={toggleCollapse}
        className="absolute -right-3 top-20 w-6 h-6 bg-blue-900 rounded-full flex items-center justify-center text-white shadow-md hover:bg-blue-800 transition-colors z-50"
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>

      {/* User Profile Section - Top */}
      <Link href="/profile" className={`p-4 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${collapsed ? 'flex justify-center' : ''}`}>
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
          {user.profileImage ? (
            <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-blue-500 shadow-lg flex-shrink-0">
              <Image src={user.profileImage} alt={user.fullName} width={44} height={44} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-11 h-11 bg-gradient-to-br from-blue-600 to-blue-900 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg flex-shrink-0">
              {getInitials(user.fullName)}
            </div>
          )}
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-gray-900 dark:text-white font-semibold text-sm truncate">{user.fullName}</p>
              <p className="text-blue-600 dark:text-blue-400 text-xs font-medium">{getRoleLabel(user.role)}</p>
            </div>
          )}
        </div>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 p-3 mt-2 overflow-y-auto">
        {!collapsed && <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 px-3">Menu</p>}
        <ul className="space-y-1">
          <li>
            <Link
              href="/dashboard"
              className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-xl transition-all ${
                pathname === '/dashboard'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              title="Dashboard"
            >
              <LayoutDashboard className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span className="font-medium">Dashboard</span>}
            </Link>
          </li>
          <li>
            <Link
              href="/profile"
              className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-xl transition-all ${
                pathname === '/profile'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              title="Profile"
            >
              <User className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span className="font-medium">Profile</span>}
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard/gantt"
              className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-xl transition-all ${
                pathname === '/dashboard/gantt'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              title="Gantt Chart"
            >
              <BarChart3 className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span className="font-medium">Gantt Chart</span>}
            </Link>
          </li>

          {/* Theme Toggle */}
          <li className="relative pt-2">
            <button
              onClick={() => setShowThemeMenu(!showThemeMenu)}
              className={`w-full flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all`}
              title="Theme"
            >
              {getThemeIcon()}
              {!collapsed && (
                <>
                  <span className="font-medium">Theme</span>
                  <span className="ml-auto text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-md capitalize">{theme}</span>
                </>
              )}
            </button>
            
            {showThemeMenu && (
              <div className={`absolute ${collapsed ? 'left-full ml-2' : 'left-0 right-0'} top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-2 z-50`}>
                <button
                  onClick={() => handleThemeChange('light')}
                  className={`w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 ${theme === 'light' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/30' : 'text-gray-700 dark:text-gray-300'}`}
                >
                  <Sun className="h-4 w-4" />
                  Light
                </button>
                <button
                  onClick={() => handleThemeChange('dark')}
                  className={`w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 ${theme === 'dark' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/30' : 'text-gray-700 dark:text-gray-300'}`}
                >
                  <Moon className="h-4 w-4" />
                  Dark
                </button>
                <button
                  onClick={() => handleThemeChange('system')}
                  className={`w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 ${theme === 'system' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/30' : 'text-gray-700 dark:text-gray-300'}`}
                >
                  <Monitor className="h-4 w-4" />
                  System
                </button>
              </div>
            )}
          </li>
        </ul>
      </nav>

      {/* Sign Out */}
      <div className="p-3">
        <button
          onClick={handleLogout}
          className={`w-full flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-all`}
          title="Sign Out"
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span className="font-medium">Sign Out</span>}
        </button>
      </div>

      {/* Bottom Logo */}
      <div className="p-3 border-t border-gray-100 dark:border-gray-800">
           <Image src="/assets/bimboss-logo.png" alt="BimBoss Logo" width={140} height={120} />
      </div>
    </aside>
  )
}
