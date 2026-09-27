import "server-only"

export type Role = 'USER' | 'SUPPORT' | 'MODERATOR' | 'ADMIN' | 'SUPER_ADMIN'

export const PERMISSIONS = {
  USERS_READ: ['SUPPORT', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN'],
  USERS_BAN: ['ADMIN', 'SUPER_ADMIN'],
  LISTINGS_READ: ['SUPPORT', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN'],
  LISTINGS_MODERATE: ['MODERATOR', 'ADMIN', 'SUPER_ADMIN'],
  REPORTS_READ: ['SUPPORT', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN'],
  REPORTS_RESOLVE: ['MODERATOR', 'ADMIN', 'SUPER_ADMIN'],
  STORES_READ: ['SUPPORT', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN'],
  STORES_MODERATE: ['MODERATOR', 'ADMIN', 'SUPER_ADMIN'],
  ORDERS_READ: ['SUPPORT', 'ADMIN', 'SUPER_ADMIN'],
  AUDIT_READ: ['ADMIN', 'SUPER_ADMIN'],
  ROLES_MANAGE: ['SUPER_ADMIN']
} as const

export type Permission = keyof typeof PERMISSIONS

export function hasPermission(role: Role, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly Role[]).includes(role)
}
