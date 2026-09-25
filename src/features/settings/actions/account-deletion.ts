"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function deleteAccountAction() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    throw new Error("Unauthorized")
  }

  // Under the Digital Code of the Kyrgyz Republic (Law №178), we are permitted
  // to perform "обезличивание" (anonymization) of the user profile so the data
  // loses its connection to the data principal, allowing retention of aggregated
  // analytics without retaining PII.
  // We must also irreversibly deactivate/delete UGC content.
  
  const anonymizedName = `Deleted User ${user.id.substring(0, 5)}`

  // 1. Anonymize Profile
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      full_name: anonymizedName,
      avatar_url: null,
      phone: null,
      role: 'USER', // Downgrade if admin
    })
    .eq("id", user.id)

  if (profileError) throw new Error("Failed to anonymize profile: " + profileError.message)

  // 2. Deactivate/Archive all listings
  await supabase
    .from("listings")
    .update({ status: 'DEACTIVATED' })
    .eq("seller_id", user.id)

  // 3. Deactivate/Archive all stores
  await supabase
    .from("stores")
    .update({ status: 'BLOCKED' })
    .eq("owner_id", user.id)
    
  // 4. Log the deletion event
  await supabase
    .from("audit_logs")
    .insert({
      actor_id: user.id,
      action: "ACCOUNT_ANONYMIZED",
      target_id: user.id,
      target_type: "USER",
      reason: "User requested account deletion via self-service UI"
    })

  // 5. Optionally invoke a Supabase Edge Function to delete the auth.users record, 
  // but since `auth.users` deletion requires service_role and is restricted on client, 
  // we will sign the user out. The actual row deletion from auth.users can be handled 
  // by a backend CRON job or Edge Function listening to the audit log.
  
  await supabase.auth.signOut()

  revalidatePath("/")
  redirect("/account-deletion?success=true")
}
