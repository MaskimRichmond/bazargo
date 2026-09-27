"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

/**
 * Secure account deletion workflow using a robust retryable state machine approach.
 * 
 * Steps:
 * 1. Authenticate user.
 * 2. Fetch all user-owned files from `storage.objects` (using service_role to query the storage schema).
 * 3. Delete physical files via the official Supabase Storage API. (Retry-safe, fails fast).
 * 4. Atomic DB cleanup via RPC (anonymize profile, deactivate listings, block stores, audit log).
 * 5. Tombstone Auth identity (scramble email/password, revoke sessions).
 * 6. Sign out local session.
 * 
 * If any step fails, the operation throws an error, allowing the user to safely retry.
 */
export async function deleteAccountAction() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    throw new Error("Unauthorized")
  }

  const adminClient = createAdminClient()
  
  // Step 2: Storage Cleanup
  // Fetch all objects owned by the user from the storage schema
  const { data: storageObjects, error: storageFetchError } = await adminClient
    .schema('storage')
    .from('objects')
    .select('bucket_id, name')
    .eq('owner', user.id)

  if (storageFetchError) {
    throw new Error("Не удалось получить список файлов для удаления. Ошибка: " + storageFetchError.message)
  }

  if (storageObjects && storageObjects.length > 0) {
    // Group files by bucket
    const bucketFiles: Record<string, string[]> = {}
    for (const obj of storageObjects) {
      if (!bucketFiles[obj.bucket_id]) bucketFiles[obj.bucket_id] = []
      bucketFiles[obj.bucket_id].push(obj.name)
    }

    // Call the official Storage API to remove physical files
    for (const [bucket, files] of Object.entries(bucketFiles)) {
      const { error: removeError } = await adminClient.storage.from(bucket).remove(files)
      if (removeError) {
         // Fails early, safe to retry later (idempotent)
         throw new Error(`Ошибка при удалении файлов из ${bucket}: ` + removeError.message)
      }
    }
  }
  
  // Step 3: Atomic DB cleanup via RPC
  const { error: rpcError } = await adminClient.rpc("process_account_deletion", {
    p_user_id: user.id
  })
  
  if (rpcError) {
    throw new Error("Не удалось обработать удаление бизнес-данных. Ошибка: " + rpcError.message)
  }

  // Step 4: Tombstone Auth identity
  const scrambledEmail = `deleted-${user.id}@tombstone.bazargo.internal`
  const scrambledPassword = crypto.randomUUID() + crypto.randomUUID()
  
  const { error: tombstoneError } = await adminClient.auth.admin.updateUserById(user.id, {
    email: scrambledEmail,
    password: scrambledPassword,
    email_confirm: true,
    phone: "",
    phone_confirm: true,
    user_metadata: { deleted: true, deleted_at: new Date().toISOString() },
    app_metadata: { deleted: true, providers: [] },
    ban_duration: "87600h" // 10 years
  })
  
  if (tombstoneError) {
    throw new Error("Данные обезличены, но не удалось заблокировать аутентификацию. Обратитесь в поддержку.")
  }
  
  // Step 5: Global Sign-Out
  await supabase.auth.signOut({ scope: 'global' })

  revalidatePath("/")
  redirect("/account-deletion?success=true")
}
