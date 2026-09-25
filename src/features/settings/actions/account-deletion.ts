"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { createClient as createAdminClient } from "@supabase/supabase-js"

export async function deleteAccountAction() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    throw new Error("Unauthorized")
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Server configuration error: Service role key missing")
  }

  const adminAuthClient = createAdminClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
  
  const anonymizedName = `Deleted User ${user.id.substring(0, 5)}`

  // 1. Anonymize Profile
  const { error: profileError } = await adminAuthClient
    .from("profiles")
    .update({
      full_name: anonymizedName,
      avatar_url: null,
      phone: null,
      role: 'USER',
    })
    .eq("id", user.id)

  if (profileError) throw new Error("Failed to anonymize profile: " + profileError.message)

  // 2. Deactivate/Archive all listings
  await adminAuthClient
    .from("listings")
    .update({ status: 'DEACTIVATED' })
    .eq("seller_id", user.id)

  // 3. Deactivate/Archive all stores
  await adminAuthClient
    .from("stores")
    .update({ status: 'BLOCKED' })
    .eq("owner_id", user.id)
    
  // 4. Log the deletion event
  await adminAuthClient
    .from("audit_logs")
    .insert({
      actor_id: user.id,
      action: "ACCOUNT_DELETED",
      target_id: user.id,
      target_type: "USER",
      reason: "User requested account deletion via self-service UI"
    })

  // 5. Clean up Storage files owned by user (RPC)
  await adminAuthClient.rpc("cleanup_user_storage", { uid: user.id })

  // 6. Delete the actual Auth User (App Store Guideline 5.1.1(v) requirement)
  const { error: deleteError } = await adminAuthClient.auth.admin.deleteUser(user.id)
  
  if (deleteError) {
    throw new Error("Failed to delete auth account. Please contact support. " + deleteError.message)
  }
  
  // 7. Sign out the local session
  await supabase.auth.signOut()

  revalidatePath("/")
  redirect("/account-deletion?success=true")
}
