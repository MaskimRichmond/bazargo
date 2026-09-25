# BazarGo Compliance & Technical Audit Map

## 1. Current State (Read-Only Audit)

### 1.1 Database Architecture
- **Profiles:** Contains `id`, `full_name`, `avatar_url`, `phone`, `role` (enum: 'USER', 'ADMIN'). 
- **Roles & Permissions (RBAC):** Only two roles exist: `USER` and `ADMIN`. The `ADMIN` check is implemented in RLS via `EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND role = 'ADMIN')`. There is no granular RBAC (`SUPER_ADMIN`, `MODERATOR`, `SUPPORT`) yet.
- **Missing Administrative Tables:**
  - `reports` (for UGC abuse reporting).
  - `audit_logs` (for tracking sensitive actions).
  - `user_blocks` / `bans` (for tracking inter-user blocking and administrative bans).
- **Existing Content Statuses:**
  - Listings have `status`: `'ACTIVE', 'DEACTIVATED', 'SOLD', 'BLOCKED'`.
  - Stores have `status`: `'PENDING', 'APPROVED', 'BLOCKED'`.

### 1.2 Frontend / Routes
- **Public Routes:** `/catalog`, `/stores`, `/b2b`, `/product/*`, `/store/*`, `/legal`, `/privacy`, `/terms`, `/safety`, `/help`, `/contacts`.
- **Protected Routes:** `/sell`, `/profile`, `/orders`, `/messages`, `/my-listings`, `/favorites`, `/requests`.
- **Admin Panel:** **Missing**. No `/admin/*` routes exist. No dashboard, moderation tools, or reporting views exist.
- **Legal Pages:** `/privacy` and `/terms` are currently placeholders ("Заглушка") and do not reflect the actual legal state of the platform.
- **Account Deletion:** **Missing**. There is no UI or backend flow to delete a user account and associated data.

### 1.3 UGC & Community Guidelines (App Store / Google Play Gap)
- **Reporting:** **Missing**. Users cannot report listings, stores, or messages.
- **Blocking:** **Missing**. Users cannot block other users.
- **Moderation:** Partial. The DB supports a `BLOCKED` status for listings and stores, but there is no UI/Server Action for moderators to perform these actions securely.
- **Account Deletion URL:** **Missing**. App Stores require a public and in-app URL for account deletion.

---

## 2. Implementation Plan (Post-Audit)

### Phase 1: Database Expansion & RBAC
1. Expand `user_role` to include `SUPER_ADMIN`, `MODERATOR`, `SUPPORT` or create a more granular permission structure.
2. Create `reports` table (reporter_id, target_id, target_type, reason, status).
3. Create `audit_logs` table (actor_id, action, target_id, metadata, timestamp).
4. Create `user_blocks` table (blocker_id, blocked_id) for peer-to-peer blocking.
5. Create `user_bans` or add `is_banned` / `banned_at` / `ban_reason` to `profiles` for administrative bans.

### Phase 2: Administrative Backend (Server Actions)
1. Add strict server-side authorization checks verifying roles via DB (not client claims).
2. Implement actions: `adminBlockUser`, `adminModerateListing`, `adminResolveReport`.
3. Implement `deleteAccount` flow (anonymizing profile, archiving orders, deleting listings/images).

### Phase 3: UGC Compliance Features
1. Add "Report" buttons to Listings, Chat Messages, and Profiles.
2. Add "Block User" functionality in Chats and Profiles.
3. Update existing Chat RPCs to filter out blocked users.

### Phase 4: Admin Frontend
1. Create `/admin/layout.tsx` with role-based redirection.
2. Create `/admin/dashboard` with metrics.
3. Create `/admin/reports`, `/admin/users`, `/admin/listings` with server-side pagination.

### Phase 5: Legal & Policy Documents
1. Draft actual `Privacy Policy` mapping Supabase (Auth/DB), Vercel (Hosting), and Resend (Emails).
2. Draft `Terms of Service` and `Safety Guidelines`.
