# BAZARGO ADMIN CONTROL PANEL: SECURITY & ARCHITECTURE AUDIT

**Date:** 2026-09-26
**Type:** Read-Only Independent Audit

## 1. Executive Summary
The current Admin Control Panel UI and routing are securely protected. However, the **underlying Database Architecture and Server Actions are fundamentally broken**. 
The system suffers from silent database failures that render most moderation actions completely non-functional, a catastrophic IDOR vulnerability in an RPC function, and a destructive cascade flaw in account deletion. 

**Conclusion:** The Admin Control Panel is **NOT** production-ready.

---

## 2. Route Security
* **Protection Level:** Secure.
* **Mechanism:** Next.js `layout.tsx` and Server Actions use `verifyAdminAccess()` to fetch the profile role from Postgres.
* **Access by Role:**
  - `USER`: Blocked (Redirected).
  - `SUPPORT`: Blocked (Currently only allows ADMIN, SUPER_ADMIN, MODERATOR).
  - `MODERATOR`: Allowed on reports, listings. Blocked from user banning via Action logic.
  - `ADMIN / SUPER_ADMIN`: Full access.
* **Finding:** UI and direct URL transitions are securely protected on the server side.

---

## 3. RBAC Matrix (Current vs Intended)

| Action | USER | SUPPORT | MODERATOR | ADMIN | SUPER_ADMIN | Status |
|---|---|---|---|---|---|---|
| Access `/admin/*` | ❌ | ❌ | ✅ | ✅ | ✅ | Implemented |
| Resolve Reports | ❌ | ❌ | ✅ | ✅ | ✅ | Implemented & Works |
| Moderate Listings | ❌ | ❌ | ✅ | ✅ | ✅ | **Fails Silently** |
| Ban/Unban Users | ❌ | ❌ | ❌ | ✅ | ✅ | **Fails Silently** |
| View Audit Logs | ❌ | ❌ | ❌ | ✅ | ✅ | Implemented |
| Write Audit Logs| ❌ | ❌ | ✅ | ✅ | ✅ | **Fails Silently** |
| Manage Roles | ❌ | ❌ | ❌ | ❌ | ✅ | Not Implemented |

---

## 4. Server Action & RLS Security (THE CRITICAL FLAW)

Server Actions (e.g., `blockUserAction`, `moderateListingAction`) authenticate the Admin using `createClient()` (running under the Admin's JWT context). However, **PostgreSQL RLS strictness blocks the Admin**.

* **`profiles` (Banning Users):**
  - **RLS Policy:** `Users can update own profile. USING (auth.uid() = id)`
  - **Issue:** Admins cannot update other users' `is_banned` field. The update affects 0 rows. Supabase does not throw an error for 0 rows affected. The Next.js action continues and reports "Success".
  - **Status:** **BLOCKER**.
* **`listings` (Moderating Listings):**
  - **RLS Policy:** `Users can update own listings. USING (auth.uid() = seller_id)`
  - **Issue:** Moderators cannot change the `status` of a listing they don't own. 0 rows affected. Fails silently.
  - **Status:** **BLOCKER**.
* **`audit_logs` (Tracking Actions):**
  - **RLS Policy:** No `INSERT` policy exists on `audit_logs` for authenticated users.
  - **Issue:** All attempts to write to the audit log fail silently. The Admin panel currently generates ZERO audit logs.
  - **Status:** **BLOCKER**.

---

## 5. RPC & IDOR Findings

* **`cleanup_user_storage(uid UUID)`**
  * **Finding:** Created with `SECURITY DEFINER` (runs as superuser). It lacks an `IF auth.uid() = uid` check and lacks `SET search_path = ''`.
  * **Vulnerability:** **CRITICAL IDOR**. Any logged-in user can call this RPC directly via the Supabase API with another user's UUID, instantly wiping all avatars, listing images, and store logos of the victim.
* **Server Action Target Injection (IDOR)**
  * **Finding:** Admin actions take `listingId`, `userId`, etc., from the client. Since they are protected by `verifyAdminAccess()`, standard users cannot abuse them. Admins are *intended* to modify arbitrary IDs, so this is architecturally sound, provided RBAC is strictly enforced.

---

## 6. Service Role & Data Exposure

* **Service Role:** `SUPABASE_SERVICE_ROLE_KEY` is securely isolated to server-side code (e.g., inside `account-deletion.ts`). It is never leaked to the client bundle.
* **Data Exposure:** `users/page.tsx` fetches from `profiles` which does not contain `email` or `phone`. Admin PII exposure is currently structurally limited. (If Admins need to see emails, a secure server-side proxy fetching from `auth.users` is required).

---

## 7. Account Deletion Cascade (Re-Verified)

* **Finding:** `adminAuthClient.auth.admin.deleteUser(user.id)` triggers a catastrophic `ON DELETE CASCADE`.
  - `auth.users` -> `profiles` -> `listings` -> `chats` -> `messages` -> `orders`.
* **Impact:** Deleting a user irrevocably destroys the financial history (`orders`) and communications (`chats`) of the **second party** in the transaction. This is a severe compliance and business continuity failure.
* **Status:** **CRITICAL BLOCKER**.

---

## 8. Proposed Secure Admin Architecture

To fix the fundamental disconnect between Server Actions and DB RLS, the architecture must adopt one of two patterns:

**Pattern A: Dedicated Admin Service Client (Recommended)**
1. Create a `createAdminActionClient()` in Next.js that uses `SUPABASE_SERVICE_ROLE_KEY`.
2. Wrap it in a strict RBAC gateway: `if (!hasRole(user, 'ADMIN')) throw Error`.
3. Perform the DB operations using the service client (bypassing RLS) so that `is_banned`, `listings.status`, and `audit_logs` are written successfully.
4. This keeps RLS incredibly simple (Users only touch their own data) while Server Actions safely orchestrate elevated tasks.

**Pattern B: Complex RLS Expansion**
1. Add explicit RLS policies for Admins: `CREATE POLICY "Admins can update profiles" ON profiles FOR UPDATE USING (is_admin(auth.uid()))`.
2. This requires maintaining a `SECURITY DEFINER` function `is_admin()` and adds computational overhead to every DB query.

### Proposed Route Structure
* `/admin` (Dashboard & Metrics)
* `/admin/users` & `/admin/users/[id]` (View user, manage bans, view user's listings/orders)
* `/admin/listings` & `/admin/listings/[id]` (Moderation queue, status management)
* `/admin/reports` (UGC Reports management)
* `/admin/support` (Dedicated zone for Support role - read only access to orders/users)

---

## 9. Security Test Plan (For Future Implementation)

1. **Silent Failure Regression:** Ensure `UPDATE` actions throw if 0 rows are affected, or strictly verify the DB state post-update.
2. **RPC IDOR Test:** Attempt to execute `cleanup_user_storage` as `USER_A` targeting `USER_B`. Must receive HTTP 403 / Error.
3. **Escalation Test:** Intercept `blockUserAction` request with a `MODERATOR` session cookie. Must throw `Forbidden`.
4. **Cascade Test:** Delete a user account, then query `orders` to ensure the order record remains intact (using `SET NULL` or an anonymization scrambling approach instead of actual auth deletion).
5. **Audit Integrity:** Attempt to `INSERT` or `UPDATE` into `audit_logs` using a standard anon/authenticated API key. Must fail.
