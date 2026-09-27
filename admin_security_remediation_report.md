# Admin Security Remediation Report

**Date:** 2026-09-27  
**Commit base:** f4ad584  
**Migration:** `20260927180000_admin_security_remediation.sql`

---

## 1. Findings and Exact Paths

### BLOCKER-1: cleanup_user_storage IDOR (LIVE)
**File:** `supabase/migrations/20260927000000_admin_security_hardening.sql`  
**Deployed state:** `EXCEPTION WHEN OTHERS` caught the authorization `RAISE EXCEPTION`, suppressing it entirely. Function returned success for unauthorized callers. Grants included `anon=X/postgres` and `authenticated=X/postgres` — any anonymous user could wipe any user's storage.  
**Evidence:** `npx supabase db query --linked` returned `proacl: {postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}`.

### BLOCKER-2: Non-atomic admin mutations  
**File:** `src/features/admin/actions.ts` (previous version)  
**Issue:** Mutation and audit log were two separate Supabase calls. If audit insert failed, the mutation was already committed but the action threw an error — leaving inconsistent state.

### BLOCKER-3: Account deletion cascades  
**File:** `src/features/settings/actions/account-deletion.ts` (previous version)  
**Issue:** `auth.admin.deleteUser()` was replaced with `updateUserById()` in f4ad584, but the deletion flow had no error checking on intermediate steps (listings/stores deactivation errors were ignored), no atomic transaction, and `ban_duration` was not set.

### HIGH-1: Audit log unprotected against modification  
**Table:** `public.audit_logs`  
**Issue:** No UPDATE/DELETE-deny RLS policies existed. While no INSERT policy for `authenticated` prevented client writes, there was no explicit barrier against modification if data leaked via another path.

---

## 2. Fixes Applied

### Fix 1: `cleanup_user_storage` — complete rewrite
- Removed the `EXCEPTION WHEN OTHERS` block that silently swallowed all errors including the authorization check
- Changed authorization model: only `service_role` can call this function (not even `authenticated` for own uid — the Server Action calls it via service_role)
- Added `SET search_path = ''`
- Explicitly revoked EXECUTE from `PUBLIC`, `anon`, AND `authenticated` individually
- Granted EXECUTE only to `service_role`
- **Verified deployed:** `proacl: {postgres=X/postgres,service_role=X/postgres}`

### Fix 2: Atomic admin RPCs
Created four new PostgreSQL functions, each atomic (mutation + audit in one transaction):
- `admin_block_user(p_target_user_id, p_reason)` — validates ADMIN/SUPER_ADMIN role, prevents banning SUPER_ADMIN, checks target exists, verifies not already banned
- `admin_unblock_user(p_target_user_id, p_reason)` — same role check, verifies currently banned
- `admin_moderate_listing(p_listing_id, p_new_status, p_reason)` — validates MODERATOR+, validates listing exists, validates allowed status values, prevents no-op
- `admin_resolve_report(p_report_id, p_resolution, p_notes)` — validates MODERATOR+, validates report exists and is in OPEN/IN_REVIEW state

All four: `SECURITY DEFINER`, `SET search_path = ''`, EXECUTE granted only to `service_role`.

### Fix 3: Server Actions rewritten
- `src/features/admin/actions.ts`: All four actions now call the atomic RPCs via `createAdminClient().rpc(...)`. Single call, single error check. No more separate mutation + audit.
- Input validation added (non-empty reason/notes).
- `verifyAdminAccess` updated to include SUPPORT role for read-only admin area access.

### Fix 4: Account deletion — atomic + tombstone
- `src/features/settings/actions/account-deletion.ts`: Complete rewrite.
- Step 1: Atomic RPC `process_account_deletion` handles profile anonymization, listing deactivation, store blocking, storage cleanup, and audit log — all in one DB transaction. If any step fails, the entire transaction rolls back.
- Step 2: Auth tombstoning via `updateUserById`: scrambles email to `deleted-<uuid>@tombstone.bazargo.internal`, random password, sets `ban_duration: "876000h"` (~100 years), clears phone, marks metadata `deleted: true`, clears providers.
- Step 3: Global sign-out (`scope: 'global'`) to revoke all refresh tokens.
- Error states are explicit and user-facing messages are safe (no PII, no secrets).

### Fix 5: Audit log protection
- Added RLS policies: `FOR UPDATE USING (false)` and `FOR DELETE USING (false)` — nobody can modify or delete audit records via the API.

---

## 3. Deletion Workflow

```
User clicks "Delete Account"
         ↓
Server Action: deleteAccountAction()
         ↓
    supabase.auth.getUser() → user.id (trusted)
         ↓
    adminClient.rpc("process_account_deletion", { p_user_id })
         ↓ (atomic transaction)
    ┌─ UPDATE profiles SET full_name='Deleted User xxx', phone=NULL, avatar_url=NULL
    ├─ UPDATE listings SET status='DEACTIVATED' WHERE seller_id=uid
    ├─ UPDATE stores SET status='BLOCKED' WHERE owner_id=uid
    ├─ DELETE FROM storage.objects WHERE owner=uid
    └─ INSERT INTO audit_logs (action='ACCOUNT_DELETION_COMPLETED')
         ↓ (if RPC fails → throw, nothing changed)
    adminClient.auth.admin.updateUserById(user.id, {
        email: scrambled, password: random, ban_duration: "876000h",
        phone: "", user_metadata: {deleted:true}, app_metadata: {deleted:true, providers:[]}
    })
         ↓ (if tombstone fails → throw with specific message;
            profile already anonymized = safe partial state)
    supabase.auth.signOut({ scope: 'global' })
         ↓
    redirect("/account-deletion?success=true")
```

---

## 4. Permission Matrix

| Permission | SUPPORT | MODERATOR | ADMIN | SUPER_ADMIN |
|---|---|---|---|---|
| USERS_READ | ✅ | ✅ | ✅ | ✅ |
| USERS_BAN | ❌ | ❌ | ✅ | ✅ |
| LISTINGS_READ | ✅ | ✅ | ✅ | ✅ |
| LISTINGS_MODERATE | ❌ | ✅ | ✅ | ✅ |
| REPORTS_READ | ✅ | ✅ | ✅ | ✅ |
| REPORTS_RESOLVE | ❌ | ✅ | ✅ | ✅ |
| STORES_READ | ✅ | ✅ | ✅ | ✅ |
| STORES_MODERATE | ❌ | ✅ | ✅ | ✅ |
| ORDERS_READ | ✅ | ❌ | ✅ | ✅ |
| AUDIT_READ | ❌ | ❌ | ✅ | ✅ |
| ROLES_MANAGE | ❌ | ❌ | ❌ | ✅ |

---

## 5. Changed Files

| File | Change |
|---|---|
| `supabase/migrations/20260927180000_admin_security_remediation.sql` | New migration: 6 RPCs, audit RLS |
| `src/features/admin/actions.ts` | Rewritten to use atomic RPCs |
| `src/features/settings/actions/account-deletion.ts` | Rewritten with atomic RPC + tombstone |
| `src/app/(main)/admin/layout.tsx` | Added SUPPORT to allowed roles |
| `supabase/tests/database/12-admin-security-remediation.sql` | New: 12 security tests |

---

## 6. Tests and Results

**TypeScript (`npx tsc --noEmit`):** PASS (exit code 0)  
**Build (`npm run build`):** PASS (42 routes, exit code 0)  
**DB Tests (`npx supabase test db`):** Cannot run — Docker not available locally.  

### pgTAP tests written (12 assertions in `12-admin-security-remediation.sql`):
1. `anon` cannot call `cleanup_user_storage` → expects 42501
2. `authenticated` cannot call `cleanup_user_storage` → expects 42501
3. `service_role` can call `cleanup_user_storage` → expects success
4. `anon` cannot call `admin_block_user` → expects 42501
5. `authenticated` cannot call `admin_block_user` → expects 42501
6. Report `reporter_id` immutable → expects P0001
7. Report `target_id` immutable → expects P0001
8. USER cannot escalate own role → expects P0001
9. USER cannot change own ban status → expects P0001
10. USER cannot read audit logs → expects 0 rows
11. `authenticated` cannot call `process_account_deletion` → expects 42501
12. `service_role` can call `process_account_deletion` + profile is anonymized

---

## 7. Linked DB Verification

Deployed function grants confirmed via live query:
```
admin_block_user:         {postgres=X/postgres,service_role=X/postgres}
admin_moderate_listing:   {postgres=X/postgres,service_role=X/postgres}
admin_resolve_report:     {postgres=X/postgres,service_role=X/postgres}
admin_unblock_user:       {postgres=X/postgres,service_role=X/postgres}
cleanup_user_storage:     {postgres=X/postgres,service_role=X/postgres}
process_account_deletion: {postgres=X/postgres,service_role=X/postgres}
```

No `anon` or `authenticated` grants on any admin/deletion function.

---

## 8. Remaining Risks

| ID | Severity | Description |
|---|---|---|
| R-1 | MEDIUM | `ban_duration: "876000h"` depends on GoTrue respecting this field. If GoTrue ignores it (version mismatch), the scrambled email/password is still the primary access barrier. |
| R-2 | MEDIUM | pgTAP tests not runnable without local Docker. CI/CD pipeline should run them. |
| R-3 | LOW | The `prevent_privilege_escalation` trigger allows ADMIN to change any non-SUPER_ADMIN user's role. The RBAC module restricts `ROLES_MANAGE` to SUPER_ADMIN only, but the DB trigger is more permissive. The Server Action layer enforces the stricter rule. |
| R-4 | LOW | Account deletion partial state: if auth tombstoning fails after RPC succeeds, profile is anonymized but auth identity is technically active. Error message instructs user to contact support. |

---

## 9. Status

| Finding | Status |
|---|---|
| BLOCKER-1: cleanup_user_storage IDOR | **FIXED & VERIFIED** |
| BLOCKER-2: Non-atomic admin mutations | **FIXED** |
| BLOCKER-3: Account deletion cascades | **FIXED** (tombstoning, no deleteUser) |
| HIGH-1: Audit log unprotected | **FIXED** |

**No known BLOCKER or CRITICAL issues remain.**
