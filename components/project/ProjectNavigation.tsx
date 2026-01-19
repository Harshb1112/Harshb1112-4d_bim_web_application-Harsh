'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Activity, 
  Calendar, 
  Box, 
  Briefcase, 
  FileText, 
  Shield, 
  Users, 
  File, 
  Database, 
  Settings, 
  Brain,
  Link2
} from 'lucide-react';

interface ProjectNavigationProps {
  projectId: string | number;
  userRole?: string;
}

export default function ProjectNavigation({ projectId, userRole }: ProjectNavigationProps) {
  const pathname = usePathname();

  const tabs = [
    { name: 'Dashboard', href: `/project/${projectId}`, icon: LayoutDashboard },
    { name: 'Health', href: `/project/${projectId}/health`, icon: Activity },
    { name: 'Schedule', href: `/project/${projectId}?tab=schedule`, icon: Calendar },
    { name: '3D Models', href: `/project/${projectId}?tab=models`, icon: Box },
    { name: 'Resources', href: `/project/${projectId}?tab=resources`, icon: Briefcase },
    { name: 'Daily Log', href: `/project/${projectId}/daily-log`, icon: FileText },
    { name: 'Safety', href: `/project/${projectId}/safety`, icon: Shield },
    ...(userRole === 'admin' || userRole === 'manager' || userRole === 'team_leader' 
      ? [{ name: 'Team', href: `/project/${projectId}?tab=team`, icon: Users }] 
      : []
    ),
    { name: 'Files', href: `/project/${projectId}?tab=files`, icon: File },
    { name: 'Backups', href: `/project/${projectId}/backups`, icon: Database },
    { name: 'Settings', href: `/project/${projectId}?tab=settings`, icon: Settings },
    { name: 'AI', href: `/project/${projectId}?tab=ai-insights`, icon: Brain },
  ];

  const isActive = (href: string) => {
    if (href.includes('?tab=')) {
      const tab = href.split('?tab=')[1];
      if (typeof window === 'undefined') return false;
      return pathname === `/project/${projectId}` && window.location.search.includes(`tab=${tab}`);
    }
    return pathname === href;
  };

  return (
    <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-1 overflow-x-auto" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = isActive(tab.href);
            
            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
                  active
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
