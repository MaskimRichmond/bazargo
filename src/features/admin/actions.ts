"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function verifyAdminAccess() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error("Unauthorized")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile || !["ADMIN", "SUPER_ADMIN", "MODERATOR"].includes(profile.role)) {
    throw new Error("Forbidden: Admin access required")
  }

  return { user, role: profile.role }
}

export async function blockUserAction(userId: string, reason: string) {
  const { user, role } = await verifyAdminAccess()
  if (!["ADMIN", "SUPER_ADMIN"].includes(role)) {
    throw new Error("Forbidden: Insufficient privileges")
  }

  const supabase = await createClient()
  
  // Need to bypass RLS for updating sensitive profile fields, so we use service_role client or secure RPC.
  // Wait, updating `is_banned` triggers RLS. Our migration added a trigger to allow `service_role` or existing Admin to update it.
  // Since we are calling from the Server Action with `createClient()` (which runs as the logged in Admin), the trigger:
  // IF NOT service_role -> check if current user is ADMIN.
  // We ARE an ADMIN, so the trigger will allow it!

  const { error } = await supabase
    .from("profiles")
    .update({ is_banned: true, ban_reason: reason, banned_at: new Date().toISOString() })
    .eq("id", userId)

  if (error) throw new Error(error.message)
    
  await supabase.from("audit_logs").insert({
    actor_id: user.id,
    action: "BLOCK_USER",
    target_id: userId,
    target_type: "USER",
    reason
  })

  revalidatePath("/admin/users")
}

export async function unblockUserAction(userId: string, reason: string) {
  const { user, role } = await verifyAdminAccess()
  if (!["ADMIN", "SUPER_ADMIN"].includes(role)) {
    throw new Error("Forbidden: Insufficient privileges")
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("profiles")
    .update({ is_banned: false, ban_reason: null, banned_at: null })
    .eq("id", userId)

  if (error) throw new Error(error.message)

  await supabase.from("audit_logs").insert({
    actor_id: user.id,
    action: "UNBLOCK_USER",
    target_id: userId,
    target_type: "USER",
    reason
  })

  revalidatePath("/admin/users")
}

export async function moderateListingAction(listingId: string, status: 'ACTIVE' | 'DEACTIVATED' | 'BLOCKED', reason: string) {
  const { user } = await verifyAdminAccess()

  const supabase = await createClient()
  const { error } = await supabase
    .from("listings")
    .update({ status })
    .eq("id", listingId)

  if (error) throw new Error(error.message)

  await supabase.from("audit_logs").insert({
    actor_id: user.id,
    action: "MODERATE_LISTING",
    target_id: listingId,
    target_type: "LISTING",
    metadata: { new_status: status },
    reason
  })

  revalidatePath("/admin/listings")
}

export async function resolveReportAction(reportId: string, resolutionStatus: 'RESOLVED' | 'REJECTED', notes: string) {
  const { user } = await verifyAdminAccess()

  const supabase = await createClient()
  const { error } = await supabase
    .from("reports")
    .update({ 
      status: resolutionStatus, 
      moderator_id: user.id, 
      resolution_notes: notes,
      resolved_at: new Date().toISOString()
    })
    .eq("id", reportId)

  if (error) throw new Error(error.message)

  await supabase.from("audit_logs").insert({
    actor_id: user.id,
    action: "RESOLVE_REPORT",
    target_id: reportId,
    target_type: "REPORT",
    metadata: { resolution: resolutionStatus },
    reason: notes
  })

  revalidatePath("/admin/reports")
}
