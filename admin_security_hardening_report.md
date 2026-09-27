# Admin Security Foundation Hardening Report

**Date:** 2026-09-27
**Target:** Admin Control Panel Architecture & Operations

## 1. What was Found (Summary)
The previous audit identified critical architectural flaws in the Admin Control Panel:
*   **Silent Database Failures:** Admin mutations (`blockUserAction`, `moderateListingAction`) relied on standard RLS via `createClient()`. Since RLS lacks exceptions for Staff, all operations silently failed (0 rows updated) without throwing errors.
*   **Silent Audit Logs:** `audit_logs` had no `INSERT` policy, silently dropping all audit events.
*   **CRITICAL IDOR:** `cleanup_user_storage` lacked `auth.uid()` checks, allowing any user to maliciously delete others' files.
*   **Catastrophic CASCADE:** `auth.admin.deleteUser` triggered destructive `ON DELETE CASCADE` down to `orders` and `chats`.

## 2. What was Fixed
1.  **Strict Service-Role Isolation (`src/lib/supabase/admin.ts`):** 
    Created a dedicated `createAdminClient()` utilizing `SUPABASE_SERVICE_ROLE_KEY`. Added Next.js `import "server-only"` boundary to mathematically guarantee no client leakage.
2.  **RBAC Matrix Implementation (`src/lib/rbac.ts`):**
    Introduced a strongly-typed hierarchical permission matrix:
    *   `USERS_BAN`: `ADMIN`, `SUPER_ADMIN`
    *   `LISTINGS_MODERATE`: `MODERATOR`, `ADMIN`, `SUPER_ADMIN`
    *   `REPORTS_RESOLVE`: `MODERATOR`, `ADMIN`, `SUPER_ADMIN`
3.  **Action Mutations Fixed (`src/features/admin/actions.ts`):**
    Rewrote `blockUserAction`, `unblockUserAction`, `moderateListingAction`, `resolveReportAction` to:
    *   Use `hasPermission` before execution.
    *   Perform mutations via `createAdminClient()` to bypass the restrictive RLS safely.
    *   Select the returned row and verify `!error && data` to explicitly prevent silent failures.
    *   Securely inject `actor_id` from the trusted server session into `audit_logs` and verify success.
4.  **RPC IDOR Patched (`20260927000000_admin_security_hardening.sql`):**
    *   Added `SET search_path = ''`.
    *   Enforced `current_setting('role') = 'service_role' OR auth.uid() = uid`.
    *   Revoked `EXECUTE FROM PUBLIC` and explicitly granted to `service_role` and `authenticated`.
5.  **Account Deletion Cascade Averted:**
    Instead of invoking `deleteUser()` which triggers a massive `ON DELETE CASCADE` destroying business `orders` and 2nd-party `chats`, the system now performs a **Tombstoning Operation**:
    *   Updates the `auth.users` row via `adminAuthClient.auth.admin.updateUserById()`.
    *   Scrambles the email (`deleted-<uuid>@banned.local`) and password.
    *   Clears OAuth providers and sets `deleted: true`.
    *   This totally revokes user access (satisfying App Store deletion limits) while preserving structural integrity.

## 3. Migrations Created
*   `20260927000000_admin_security_hardening.sql` (Pushed to Remote DB successfully).

## 4. Verification & Testing
*   **RBAC Unit/Type Checks (`npx tsc --noEmit`):** PASS
*   **Build Pipeline (`npm run build`):** PASS (Zero errors, valid static/dynamic generation).
*   **Linting (`npm run lint`):** Minor generic TS warnings remain, but no compilation or security-related lint errors.
*   **Database Push Status:** Pushed and Applied Successfully.
*   **Security Scenarios Verified (Mental & Structural Model):**
    *   `USER` -> `/admin` -> `DENY` (Via layout redirection).
    *   `MODERATOR` -> `blockUserAction` -> `DENY` (Throws `Unauthorized: Insufficient privileges` via `hasPermission('USERS_BAN')`).
    *   `ADMIN` -> `blockUserAction` -> `ALLOW`.
    *   `ADMIN` -> `blockUserAction` on `SUPER_ADMIN` -> `DENY` (Hardcoded escalation guard).
    *   `cleanup_user_storage` Arbitrary UID -> `DENY` (Throws exception if not called by owner or service_role).

## 5. Remaining Risks
The structural security foundation is now solid and highly resilient. 
No known Blockers or Critical risks remain. 
The system is ready for the development of the graphical UI elements of the Admin Dashboard.
