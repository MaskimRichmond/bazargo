"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { hasPermission, type Role, type Permission } from "@/lib/rbac"

/**
 * Verifies the current user has admin-area access and optionally a specific permission.
 * Returns structured result — never throws, so callers can redirect gracefully.
 */
export async function verifyAdminAccess(requiredPermission?: Permission) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { authorized: false as const }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile) return { authorized: false as const }

  const role = profile.role as Role

  // Minimum bar for admin area access
  if (!["SUPPORT", "MODERATOR", "ADMIN", "SUPER_ADMIN"].includes(role)) {
    return { authorized: false as const }
  }

  if (requiredPermission && !hasPermission(role, requiredPermission)) {
    return { authorized: false as const }
  }

  return { authorized: true as const, user, role }
}

/**
 * Block a user. Uses atomic DB RPC — mutation + audit in one transaction.
 */
export async function blockUserAction(userId: string, reason: string) {
  const authRes = await verifyAdminAccess('USERS_BAN')
  if (!authRes.authorized) throw new Error("Unauthorized: Insufficient privileges")
  
  if (!userId || !reason?.trim()) throw new Error("Invalid input: userId and reason are required")
  
  const adminClient = createAdminClient()
  const { data, error } = await adminClient.rpc("admin_block_user", {
    p_target_user_id: userId,
    p_reason: reason.trim()
  })

  if (error) throw new Error(error.message)

  revalidatePath("/admin/users")
  return { success: true, auditId: data }
}

/**
 * Unblock a user. Uses atomic DB RPC.
 */
export async function unblockUserAction(userId: string, reason: string) {
  const authRes = await verifyAdminAccess('USERS_BAN')
  if (!authRes.authorized) throw new Error("Unauthorized: Insufficient privileges")
  
  if (!userId || !reason?.trim()) throw new Error("Invalid input: userId and reason are required")
  
  const adminClient = createAdminClient()
  const { data, error } = await adminClient.rpc("admin_unblock_user", {
    p_target_user_id: userId,
    p_reason: reason.trim()
  })

  if (error) throw new Error(error.message)

  revalidatePath("/admin/users")
  return { success: true, auditId: data }
}

/**
 * Moderate a listing (change status). Uses atomic DB RPC.
 */
export async function moderateListingAction(listingId: string, status: 'ACTIVE' | 'DEACTIVATED' | 'BLOCKED', reason: string) {
  const authRes = await verifyAdminAccess('LISTINGS_MODERATE')
  if (!authRes.authorized) throw new Error("Unauthorized: Insufficient privileges")

  if (!listingId || !reason?.trim()) throw new Error("Invalid input: listingId and reason are required")

  const adminClient = createAdminClient()
  const { data, error } = await adminClient.rpc("admin_moderate_listing", {
    p_listing_id: listingId,
    p_new_status: status,
    p_reason: reason.trim()
  })

  if (error) throw new Error(error.message)

  revalidatePath("/admin/listings")
  return { success: true, auditId: data }
}

/**
 * Resolve/reject a report. Uses atomic DB RPC.
 */
export async function resolveReportAction(reportId: string, resolutionStatus: 'RESOLVED' | 'REJECTED', notes: string) {
  const authRes = await verifyAdminAccess('REPORTS_RESOLVE')
  if (!authRes.authorized) throw new Error("Unauthorized: Insufficient privileges")

  if (!reportId || !notes?.trim()) throw new Error("Invalid input: reportId and notes are required")

  const adminClient = createAdminClient()
  const { data, error } = await adminClient.rpc("admin_resolve_report", {
    p_report_id: reportId,
    p_resolution: resolutionStatus,
    p_notes: notes.trim()
  })

  if (error) throw new Error(error.message)

  revalidatePath("/admin/reports")
  return { success: true, auditId: data }
}
