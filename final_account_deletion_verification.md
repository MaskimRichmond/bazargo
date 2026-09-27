# FINAL ACCOUNT DELETION VERIFICATION
**Date:** 2026-09-26
**Commit:** 159f9b3
**Type:** READ-ONLY Verification

## 1. VERIFY `cleanup_user_storage`
* **Migration:** Present in `20260926000000_reports_rls_fix.sql` and deployed to Remote DB.
* **SECURITY DEFINER:** Yes, runs as Postgres superuser.
* **search_path:** NOT SET. (Security smell: open to search_path injection).
* **Permissions/RLS:** Default `EXECUTE` is implicitly granted to `PUBLIC` in PostgreSQL. 
* **Target:** `DELETE FROM storage.objects WHERE owner = uid;`
* **CRITICAL VULNERABILITY (IDOR):** The RPC accepts `uid UUID` from the client but **DOES NOT verify `auth.uid() = uid`**. Since it is `SECURITY DEFINER` and accessible via the API, any authenticated (or anonymous) user can call `rpc('cleanup_user_storage', { uid: 'target_uuid' })` and delete ANY other user's files.
* **Status:** **BLOCKED**

## 2. CRITICAL — CHECK RPC ERROR
* **Action:** `src/features/settings/actions/account-deletion.ts`
* **Code:** `await adminAuthClient.rpc("cleanup_user_storage", { uid: user.id })`
* **Finding:** The `{ error }` object returned by `.rpc()` is completely ignored. If the RPC fails (e.g., due to timeout or permissions), the script silently moves to `auth.admin.deleteUser`.
* **Status:** **BLOCKED**

## 3. AUTH DELETE
* **Implementation:** `adminAuthClient.auth.admin.deleteUser(user.id)`
* **Security:** Uses `SUPABASE_SERVICE_ROLE_KEY` on the server-side.
* **ID integrity:** `user.id` is strictly derived from the secure `supabase.auth.getUser()` session. Arbitrary client IDs cannot be injected into the core flow.
* **Effectiveness:** The Auth identity is genuinely deleted. Re-login is impossible.
* **Status:** **PASS** (Technically executes correctly in isolation).

## 4. PARTIAL FAILURE ANALYSIS

| Step | Failure | User State | Retry possible? | Risk |
|---|---|---|---|---|
| 1. Profile Anonymization | Fails | Unchanged | Yes | Low |
| 2. Listings Deactivation | Fails | Profile anonymized, listings active | Yes | Medium |
| 3. Stores Block | Fails | Profile anonymized, listings dead, stores active | Yes | Medium |
| 4. Audit Log | Fails | Profile/Listings/Stores anonymized/blocked | Yes | Low |
| 5. Storage Cleanup (RPC) | Fails | Error ignored -> Proceeds to Auth Delete | N/A | High (Orphaned storage) |
| 6. Auth Deletion | Fails | Profile anonymized, Auth remains active | Yes | High (App Store rejection) |

## 5. STORAGE BUCKETS
* **Coverage:** The query `DELETE FROM storage.objects WHERE owner = uid` globally targets the `storage.objects` table, which underpins all Supabase buckets (`avatars`, `listing images`, `store logos`).
* **Status:** Structurally covers everything, but poses a massive risk due to the IDOR flaw.

## 6. DATABASE REFERENCES (CATASTROPHIC CASCADE FLAW)
* **Finding:** A deep structural audit reveals the following constraints:
  - `profiles(id)` -> `auth.users(id) ON DELETE CASCADE`
  - `listings(seller_id)` -> `profiles(id) ON DELETE CASCADE NOT NULL`
  - `orders(buyer_id / seller_id)` -> `profiles(id) ON DELETE CASCADE NOT NULL`
  - `chats(buyer_id / seller_id)` -> `profiles(id) ON DELETE CASCADE NOT NULL`
* **Impact:** When `auth.admin.deleteUser(user.id)` executes, it triggers a catastrophic cascade. The user's `profiles` row is physically deleted. This cascades downward, instantly **DELETING ALL their listings, orders, and chats**.
* **Risk:** Complete loss of transactional and communication history. The second party in a chat will see the entire thread disappear. The platform loses the financial records in `orders`. The "Profile Anonymization" done in Steps 1-3 is entirely useless because the row is destroyed milliseconds later.
* **Status:** **BLOCKED**

## 7. ACCOUNT DELETION PUBLIC FLOW
* **Route:** `/account-deletion` is publicly accessible.
* **Content:** Claims that data is anonymized to preserve platform history. However, due to the `ON DELETE CASCADE` flaw identified above, this statement is currently factually false. Data is being hard-deleted.

## 8. APP STORE / GOOGLE PLAY
* **Apple:** Requires actual account deletion. The current `deleteUser` satisfies this, but the resulting `CASCADE` breaks Apple's exception for retaining legally required transactional records.
* **Google Play:** Requires a public URL and clear data retention policies. Currently, the policy claims retention via anonymization, but the code executes a hard cascade delete.

## 9. TESTS
* `tsc --noEmit` - PASS
* `npm run lint` - FAIL (Expected `any` warnings, non-blocking)
* `npm run build` - PASS

---

## 10. FINAL RESULT

**STATUS: BLOCKED**

### Exact Blockers:
1. **Catastrophic Data Loss (Database Cascades):** Calling `auth.admin.deleteUser` triggers an `ON DELETE CASCADE` chain that physically destroys `profiles`, `listings`, `orders`, and `chats`, overriding the intended anonymization and breaking the platform's transactional history.
2. **IDOR Vulnerability in RPC:** `cleanup_user_storage` accepts a `uid` without verifying it matches `auth.uid()`, allowing any user to wipe another user's storage.
3. **RPC Error Ignored:** The account deletion action ignores failures from the storage cleanup RPC.

### Recommended Next Fix:
Do **NOT** push this to production. The entire deletion strategy must be redesigned to handle the database constraints.
* **Fix 1 (Safe Auth Deletion):** Instead of calling `deleteUser()` (which triggers the cascade), update the `auth.users` row via Admin API to scramble the email (e.g., `deleted-uuid@banned.local`) and randomize the password, effectively revoking access while preserving the FK tree. OR change the DB constraints from `CASCADE` to `SET NULL`, which requires a massive data migration.
* **Fix 2 (RPC Security):** Rewrite `cleanup_user_storage` to rigidly enforce `owner = auth.uid()` natively within the SQL block, and ensure the Next.js Action checks `{ error }` and aborts if it fails.
