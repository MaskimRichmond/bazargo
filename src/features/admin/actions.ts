"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { hasPermission, Role, Permission } from "@/lib/rbac"

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

  if (requiredPermission && !hasPermission(role, requiredPermission)) {
    return { authorized: false as const }
  }

  // Ensure minimum access for general admin area
  if (!["ADMIN", "SUPER_ADMIN", "MODERATOR"].includes(role)) {
    return { authorized: false as const }
  }

  return { authorized: true as const, user, role }
}

export async function blockUserAction(userId: string, reason: string) {
  const authRes = await verifyAdminAccess('USERS_BAN')
  if (!authRes.authorized) throw new Error("Unauthorized: Insufficient privileges")
  
  const adminClient = createAdminClient()

  // Verify target user exists
  const { data: targetProfile, error: targetError } = await adminClient
    .from("profiles")
    .select("id, role")
    .eq("id", userId)
    .single()

  if (targetError || !targetProfile) throw new Error("Target user not found")
  
  // Prevent escalation: Admin cannot ban a Super Admin
  if (targetProfile.role === 'SUPER_ADMIN' && authRes.role !== 'SUPER_ADMIN') {
    throw new Error("Forbidden: Cannot modify SUPER_ADMIN")
  }

  const { data, error } = await adminClient
    .from("profiles")
    .update({ is_banned: true, ban_reason: reason, banned_at: new Date().toISOString() })
    .eq("id", userId)
    .select()
    .single()

  if (error || !data) throw new Error(error?.message || "Failed to block user (no rows affected)")
    
  const { error: auditError } = await adminClient.from("audit_logs").insert({
    actor_id: authRes.user.id,
    action: "BLOCK_USER",
    target_id: userId,
    target_type: "USER",
    reason
  })
  
  if (auditError) throw new Error("Failed to write audit log")

  revalidatePath("/admin/users")
}

export async function unblockUserAction(userId: string, reason: string) {
  const authRes = await verifyAdminAccess('USERS_BAN') // Unban uses same perm level
  if (!authRes.authorized) throw new Error("Unauthorized: Insufficient privileges")
  
  const adminClient = createAdminClient()

  const { data, error } = await adminClient
    .from("profiles")
    .update({ is_banned: false, ban_reason: null, banned_at: null })
    .eq("id", userId)
    .select()
    .single()

  if (error || !data) throw new Error(error?.message || "Failed to unblock user (no rows affected)")

  const { error: auditError } = await adminClient.from("audit_logs").insert({
    actor_id: authRes.user.id,
    action: "UNBLOCK_USER",
    target_id: userId,
    target_type: "USER",
    reason
  })

  if (auditError) throw new Error("Failed to write audit log")

  revalidatePath("/admin/users")
}

export async function moderateListingAction(listingId: string, status: 'ACTIVE' | 'DEACTIVATED' | 'BLOCKED', reason: string) {
  const authRes = await verifyAdminAccess('LISTINGS_MODERATE')
  if (!authRes.authorized) throw new Error("Unauthorized: Insufficient privileges")

  const adminClient = createAdminClient()
  
  const { data, error } = await adminClient
    .from("listings")
    .update({ status })
    .eq("id", listingId)
    .select()
    .single()

  if (error || !data) throw new Error(error?.message || "Failed to moderate listing (no rows affected)")

  const { error: auditError } = await adminClient.from("audit_logs").insert({
    actor_id: authRes.user.id,
    action: "MODERATE_LISTING",
    target_id: listingId,
    target_type: "LISTING",
    metadata: { new_status: status },
    reason
  })

  if (auditError) throw new Error("Failed to write audit log")

  revalidatePath("/admin/listings")
}

export async function resolveReportAction(reportId: string, resolutionStatus: 'RESOLVED' | 'REJECTED', notes: string) {
  const authRes = await verifyAdminAccess('REPORTS_RESOLVE')
  if (!authRes.authorized) throw new Error("Unauthorized: Insufficient privileges")

  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from("reports")
    .update({ 
      status: resolutionStatus, 
      moderator_id: authRes.user.id, 
      resolution_notes: notes,
      resolved_at: new Date().toISOString()
    })
    .eq("id", reportId)
    .select()
    .single()

  if (error || !data) throw new Error(error?.message || "Failed to resolve report (no rows affected)")

  const { error: auditError } = await adminClient.from("audit_logs").insert({
    actor_id: authRes.user.id,
    action: "RESOLVE_REPORT",
    target_id: reportId,
    target_type: "REPORT",
    metadata: { resolution: resolutionStatus },
    reason: notes
  })

  if (auditError) throw new Error("Failed to write audit log")

  revalidatePath("/admin/reports")
}
