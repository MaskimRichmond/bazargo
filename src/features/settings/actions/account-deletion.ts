"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

/**
 * Secure account deletion workflow:
 * 1. Authenticate current user (server-side, cannot be spoofed)
 * 2. Atomically anonymize profile + deactivate content + clean storage + audit (via DB RPC)
 * 3. Tombstone auth identity (scramble email/password, revoke sessions)
 * 4. Sign out local session
 * 
 * Design decisions:
 * - We do NOT call auth.admin.deleteUser() because profiles.id → auth.users(id) ON DELETE CASCADE
 *   would destroy orders, chats, messages and other business records.
 * - Instead we tombstone: scramble credentials so login is impossible, but the FK tree stays intact.
 * - The atomic RPC handles profile anonymization + storage cleanup in one transaction.
 *   If the RPC fails, no partial anonymization occurs.
 * - If the auth tombstoning step fails AFTER the RPC, profile is already anonymized (safe state)
 *   but the user could theoretically still authenticate. We throw an error so the user knows
 *   to retry or contact support.
 */
export async function deleteAccountAction() {
  // Step 0: Authenticate from trusted server session
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    throw new Error("Unauthorized")
  }

  const adminClient = createAdminClient()
  
  // Step 1: Atomic DB cleanup via RPC (anonymize + deactivate + storage + audit)
  // If this fails, nothing has changed — safe to retry
  const { error: rpcError } = await adminClient.rpc("process_account_deletion", {
    p_user_id: user.id
  })
  
  if (rpcError) {
    throw new Error("Не удалось обработать удаление аккаунта. Пожалуйста, попробуйте снова или обратитесь в поддержку.")
  }

  // Step 2: Tombstone auth identity
  // Scramble email and password so no auth flow (email/password, OTP, magic link) can succeed
  const scrambledEmail = `deleted-${user.id}@tombstone.bazargo.internal`
  const scrambledPassword = crypto.randomUUID() + crypto.randomUUID()
  
  const { error: tombstoneError } = await adminClient.auth.admin.updateUserById(user.id, {
    email: scrambledEmail,
    password: scrambledPassword,
    email_confirm: true, // Prevent confirmation emails
    phone: "",
    phone_confirm: true,
    user_metadata: { deleted: true, deleted_at: new Date().toISOString() },
    app_metadata: { deleted: true, providers: [] },
    ban_duration: "876000h" // ~100 years ban via GoTrue
  })
  
  if (tombstoneError) {
    // Profile is already anonymized (RPC succeeded), but auth still works.
    // This is a partial state — user must retry or contact support.
    throw new Error("Данные обезличены, но не удалось заблокировать аккаунт. Обратитесь в поддержку.")
  }
  
  // Step 3: Sign out all sessions
  // signOut with scope 'global' revokes all refresh tokens
  await supabase.auth.signOut({ scope: 'global' })

  revalidatePath("/")
  redirect("/account-deletion?success=true")
}
