// Role-based permissions system

export type Role = 'admin' | 'manager' | 'team_leader' | 'member'

export interface Permission {
  canAddAdmin: boolean
  canAddManager: boolean
  canAddTeamLeader: boolean
  canAddMember: boolean
  canViewAllTeams: boolean
  canViewAllProjects: boolean
  canManagePermissions: boolean
  canViewGanttChart: boolean
  canEditTasks: boolean
  canDeleteProjects: boolean
}

export const ROLE_PERMISSIONS: Record<Role, Permission> = {
  admin: {
    canAddAdmin: true,
    canAddManager: true,
    canAddTeamLeader: true,
    canAddMember: true,
    canViewAllTeams: true,
    canViewAllProjects: true,
    canManagePermissions: true,
    canViewGanttChart: true,
    canEditTasks: true,
    canDeleteProjects: true
  },
  manager: {
    canAddAdmin: false,
    canAddManager: false,
    canAddTeamLeader: true,
    canAddMember: true,
    canViewAllTeams: false, // Only assigned teams
    canViewAllProjects: false, // Only assigned projects
    canManagePermissions: false,
    canViewGanttChart: true, // Team-restricted
    canEditTasks: true,
    canDeleteProjects: false
  },
  team_leader: {
    canAddAdmin: false,
    canAddManager: false,
    canAddTeamLeader: false,
    canAddMember: true,
    canViewAllTeams: false, // Only their team
    canViewAllProjects: false, // Only their team projects
    canManagePermissions: false,
    canViewGanttChart: true, // Team-restricted
    canEditTasks: true,
    canDeleteProjects: false
  },
  member: {
    canAddAdmin: false,
    canAddManager: false,
    canAddTeamLeader: false,
    canAddMember: false,
    canViewAllTeams: false,
    canViewAllProjects: false,
    canManagePermissions: false,
    canViewGanttChart: true, // Only their tasks
    canEditTasks: true, // Only their tasks
    canDeleteProjects: false
  }
}

export function hasPermission(role: string, permission: keyof Permission): boolean {
  const roleKey = role as Role
  return ROLE_PERMISSIONS[roleKey]?.[permission] || false
}

export function canInviteRole(inviterRole: string, targetRole: string): boolean {
  if (inviterRole === 'admin') return true
  if (inviterRole === 'manager') {
    return ['team_leader', 'member'].includes(targetRole)
  }
  if (inviterRole === 'team_leader') {
    return targetRole === 'member'
  }
  return false
}

export function getAccessibleTeams(userId: number, role: string, teamMemberships: any[]) {
  if (role === 'admin') {
    return 'all' // Admin sees all teams
  }
  
  // Manager, Team Leader, Member see only their teams
  return teamMemberships.map(tm => tm.teamId)
}
