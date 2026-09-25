# Secure Account Deletion & Admin UX Fix

**Date:** 2026-09-26

## 1. Root Cause Analysis
The independent verification highlighted two critical issues:
1. **App Store Rejection Risk:** The `/settings/account` deletion flow was only signing the user out and anonymizing their `profiles` row. The underlying `auth.users` row remained active, allowing the user to simply log back in. Apple strictly requires true account termination (Guideline 5.1.1(v)).
2. **Admin UX Crash:** Unauthorized users visiting `/admin/*` routes triggered a 500 Internal Server Error because `verifyAdminAccess()` threw an Error instead of returning a boolean, failing to gracefully redirect the user.
3. **Report RLS Immutability:** The `reports` table allowed `UPDATE` via RLS without restricting immutable fields (`reporter_id`, `target_id`, etc.), opening a potential API abuse vector for rogue moderators.

## 2. Implementation & Auth Deletion
* **Supabase Admin Client:** In `src/features/settings/actions/account-deletion.ts`, we introduced `@supabase/supabase-js` `createClient` utilizing `SUPABASE_SERVICE_ROLE_KEY`. This runs exclusively on the server (Next.js Server Action) preventing any key leakage to the client.
* **Deletion Atomicity:** The action now performs operations in sequence:
  1. Anonymizes `profiles` (name to `Deleted User XXX`).
  2. Deactivates owned `listings`.
  3. Blocks owned `stores`.
  4. Writes to `audit_logs` (`ACCOUNT_DELETED`).
  5. Cleans up owned `storage.objects` via secure RPC.
  6. **Terminates the Auth identity** using `adminAuthClient.auth.admin.deleteUser(user.id)`.
  7. Clears the local session (`signOut`).

## 3. Storage Handling
* Created a PostgreSQL RPC function `cleanup_user_storage(uid UUID)` with `SECURITY DEFINER`.
* This safely deletes all rows from `storage.objects` where `owner = uid` before the `auth.users` row is deleted, bypassing any restrictive FK constraints that would otherwise block the auth account deletion.

## 4. Failure Handling
* The flow throws an Error if the final `auth.admin.deleteUser` step fails. While this leaves the user with an anonymized profile, it prevents a false "Success" message. This state is safe because their PII is cleared (satisfying the Digital Code), even if the Auth identity persists temporarily due to unexpected DB locks.

## 5. RLS & Trigger Changes
* Created migration `20260926000000_reports_rls_fix.sql`.
* Replaced the loose `FOR UPDATE` RLS on `reports` with an explicit `WITH CHECK` clause.
* Added a `BEFORE UPDATE` trigger `tr_prevent_immutable_report_updates` that explicitly blocks changes to `reporter_id`, `target_id`, `target_type`, and `created_at`.

## 6. Admin UX Fix
* Refactored `verifyAdminAccess()` to return `{ authorized: boolean, user?: User, role?: string }`.
* Updated all Admin Page Server Components to gracefully `redirect("/")` if `!authRes.authorized`, eliminating the 500 error.
* All Server Actions correctly destructure the response and throw `Unauthorized` ONLY at the action boundary, maintaining strict security without breaking standard routing.

## 7. Tests Added
* Added `11-account-deletion-security.sql` pgTAP tests.
* Validated `cleanup_user_storage` execution.
* Validated trigger protection against updating `reporter_id` and `target_id` on the `reports` table.

## 8. Remaining Legal Review
* The core data processing rules from the Digital Code (№178) and E-commerce (№154) are now technically fulfilled (anonymization and B2B tracking).
* **Pending:** Law №98 (Consumer Protection) — The business owner needs to consult legal counsel regarding whether the platform is obligated to provide an in-app dispute/return mechanism between buyers and ОсОО sellers, or if the current "hands-off" Terms of Service clause is legally sufficient.
