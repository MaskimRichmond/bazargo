"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function blockUserAction(blockedId: string, reason?: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error("Unauthorized")

  if (user.id === blockedId) {
    throw new Error("You cannot block yourself.")
  }

  const { error } = await supabase
    .from("user_blocks")
    .insert({
      blocker_id: user.id,
      blocked_id: blockedId,
      reason
    })

  if (error) {
    if (error.code === '23505') return { success: true } // Already blocked
    throw new Error("Failed to block user.")
  }

  // Record audit log for security purposes
  await supabase.from("audit_logs").insert({
    actor_id: user.id,
    action: "USER_BLOCKED_PEER",
    target_id: blockedId,
    target_type: "USER"
  })

  revalidatePath("/messages")
  revalidatePath(`/profile/${blockedId}`)
  
  return { success: true }
}

export async function unblockUserAction(blockedId: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error("Unauthorized")

  const { error } = await supabase
    .from("user_blocks")
    .delete()
    .match({ blocker_id: user.id, blocked_id: blockedId })

  if (error) {
    throw new Error("Failed to unblock user.")
  }

  revalidatePath("/messages")
  revalidatePath(`/profile/${blockedId}`)
  
  return { success: true }
}
