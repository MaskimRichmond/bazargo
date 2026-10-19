"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

/**
 * Secure account deletion workflow using a robust retryable state machine approach.
 */
export async function deleteAccountAction() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    throw new Error("Unauthorized")
  }

  const adminClient = createAdminClient()
  
  // Step 1: Atomic State Machine Lock with Fencing Token
  const { data: lock, error: lockError } = await adminClient.rpc("acquire_deletion_lock", {
    p_user_id: user.id
  })

  if (lockError || !lock) {
    throw new Error("Не удалось инициировать процесс удаления. " + (lockError?.message || ""))
  }

  const fencingToken = lock.fencing_token

  try {
    // Step 2: Storage Cleanup with Pagination
    let page = 0
    const limit = 1000
    const bucketFiles: Record<string, string[]> = {}

    while (true) {
      const { data: storageObjects, error: storageFetchError } = await adminClient
        .schema('storage')
        .from('objects')
        .select('bucket_id, name')
        .eq('owner', user.id)
        .range(page * limit, (page + 1) * limit - 1)

      if (storageFetchError) throw new Error("Storage fetch error: " + storageFetchError.message)
      if (!storageObjects || storageObjects.length === 0) break

      for (const obj of storageObjects) {
        if (!bucketFiles[obj.bucket_id]) bucketFiles[obj.bucket_id] = []
        bucketFiles[obj.bucket_id].push(obj.name)
      }

      if (storageObjects.length < limit) break
      page++
    }

    for (const [bucket, files] of Object.entries(bucketFiles)) {
      const chunkSize = 100
      for (let i = 0; i < files.length; i += chunkSize) {
        const chunk = files.slice(i, i + chunkSize)
        const { error: removeError } = await adminClient.storage.from(bucket).remove(chunk)
        if (removeError) throw new Error(`Ошибка при удалении файлов из ${bucket}: ` + removeError.message)
      }
    }
    
    // Step 3: Atomic DB cleanup via RPC (Requires Fencing Token)
    const { error: rpcError } = await adminClient.rpc("process_account_deletion", {
      p_user_id: user.id,
      p_fencing_token: fencingToken
    })
    
    if (rpcError) throw new Error("DB cleanup error: " + rpcError.message)

    // Step 4: Tombstone Auth identity
    // Check lock one last time before destroying Auth (using single check)
    const { data: verifyLock } = await adminClient
        .from('account_deletion_requests')
        .select('fencing_token')
        .eq('user_id', user.id)
        .single()
        
    if (verifyLock?.fencing_token !== fencingToken) {
        throw new Error("Fencing token mismatch before Auth Tombstone.")
    }

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
      ban_duration: "876000h" // 100 years
    })
    
    if (tombstoneError) {
      throw new Error("Auth tombstone error: " + tombstoneError.message)
    }
    
    // Step 5: Mark State Machine as COMPLETED (Requires Fencing Token)
    await adminClient
      .from('account_deletion_requests')
      .update({ status: 'COMPLETED', completed_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('fencing_token', fencingToken)

  } catch (err: any) {
    // Step 6 (Fallback): Mark FAILED. Only update if our fencing token still owns the lock.
    await adminClient
      .from('account_deletion_requests')
      .update({ status: 'FAILED', error_details: "System deletion error occurred." })
      .eq('user_id', user.id)
      .eq('fencing_token', fencingToken)

    throw new Error(err.message || "Произошла ошибка при удалении. Пожалуйста, повторите попытку.")
  }

  // Step 7: Global Sign-Out
  await supabase.auth.signOut({ scope: 'global' })

  revalidatePath("/")
  redirect("/account-deletion?success=true")
}
