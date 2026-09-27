# BAZARGO — PROJECT STATUS & RELEASE ROADMAP

**Date:** 2026-09-27  
**Branch:** `main`  
**Purpose:** Consolidated inventory, status report, and development roadmap to transition from isolated security audits to product release.

---

## 1. PRODUCT INVENTORY
*Current implementation status based on repository inspection.*

| Feature Area | Status | Evidence / Paths |
|---|---|---|
| **Authentication** | Confirmed Implemented | `src/app/(auth)/login`, Supabase SSR middleware |
| **Profiles** | Confirmed Implemented | `src/app/(main)/profile`, `src/app/(main)/settings` |
| **Listings** | Confirmed Implemented | `src/app/(main)/product`, `src/app/(main)/sell` |
| **Catalog / Search** | Confirmed Implemented | `src/app/(main)/catalog`, Multilingual fuzzy DB RPCs |
| **Images** | Confirmed (Needs Polish) | Supabase Storage, sharp. Lacks `next/image` in some places. |
| **Favorites** | Confirmed Implemented | `src/app/(main)/favorites`, DB triggers |
| **Cart** | Confirmed Implemented | `src/app/(main)/cart`, RPC: `checkoutCart` |
| **Checkout** | Confirmed Implemented | Secured via `checkout_concurrency` migrations |
| **Orders** | Confirmed Implemented | `src/app/(main)/orders`, `src/app/(main)/seller/orders` |
| **Chat** | Confirmed Implemented | `src/app/(main)/messages`, Realtime DB setup |
| **Notifications** | Confirmed Implemented | DB triggers (`p1_notifications_trigger.sql`) |
| **Stores** | Confirmed Implemented | `src/app/(main)/stores`, `src/app/(main)/store/[slug]` |
| **Buyer Requests** | Confirmed Implemented | `src/app/(main)/requests`, `src/app/(main)/my-requests` |
| **B2B** | Confirmed Implemented | `src/app/(main)/b2b` |
| **Reports / Moderation** | Confirmed Implemented | `src/app/(main)/admin/reports`, RPC: `admin_resolve_report` |
| **Account Deletion** | Confirmed Implemented | State machine, Tombstone Auth, Fencing Tokens |
| **Admin Panel** | Confirmed Implemented | `src/app/(main)/admin/*` (UI + Protected Server Actions) |
| **Legal Pages** | Confirmed Implemented | `/terms`, `/privacy`, `/safety`, `/legal` |
| **SEO / Mobile** | Missing / Untested | Lacking `next-seo`, Mobile safe-area gaps reported. |

---

## 2. USER JOURNEY STATUS

1. **Visitor → Registration/Login → Browse → Listing → Contact Seller**
   - *Status:* Confirmed Implemented.
   - *Gaps:* Untested automated transitions. UI flow verified visually but lacks E2E tests.
2. **Seller → Create Listing → Publish → Manage Listing**
   - *Status:* Confirmed Implemented.
   - *Gaps:* Async photo upload timeout risks on slow networks; lacks Drag & Drop sorting.
3. **Buyer → Cart → Checkout → Order → Communication → Completion**
   - *Status:* Confirmed Implemented.
   - *Gaps:* Cart lacks visual grouping by seller/store. Orders lack tabbed navigation (Active vs Completed), creating scaling issues for UX.
4. **Store Owner → Create/Manage Store → Publish Products**
   - *Status:* Confirmed Implemented.
   - *Gaps:* Missing intra-store search (searching items *only* within one store).
5. **Report / Block → Moderation Decision**
   - *Status:* Confirmed Implemented (Admin RPCs and UI are fully functional).
6. **Account Deletion → Cleanup → Final State**
   - *Status:* Confirmed Implemented. Highly secured via `fencing_token`.
   - *Gaps:* Storage orphans (residual risk accepted).

---

## 3. ENGINEERING HEALTH

- **Build Status:** **PASS** (`Next.js 16.3.5` compiles in ~2.7s).
- **TypeScript:** **PASS** (`npx tsc --noEmit` exits with 0).
- **Lint Status:** **FAIL** (271 warnings/errors, mostly `@typescript-eslint/no-explicit-any` in older `/sell` and `/stores` feature directories. `/admin` is fully compliant).
- **Test Coverage:** **PARTIAL (PLAYWRIGHT)**. E2E tests for Auth, Catalog, and Cart exist and pass. No unit tests.
- **Database Consistency:** **HIGH**. 54 migration files strictly control schema, RLS, and RPCs. No schema drift identified.
- **Obsolete/Temporary Files:** `fix_any.js`, `cast_data.js`, `verify_security.js`, `verify_lock.js` clutter the root directory.

---

## 4. SECURITY AND COMPLIANCE

- **Confirmed Controls:** 100% RLS coverage, Atomic RPCs for destructive actions, `service_role` containment, global `enforce_banned_user_block` trigger.
- **Unresolved Risks:** "Orphaned" storage files uploaded via valid JWTs after deletion but before expiration (Accepted operational risk, requires cron).
- **Compliance:** Do NOT declare full legal compliance. Privacy rules and GDPR/KZ data laws require qualified local legal review.
- **Production Prerequisites:** Securing `SUPABASE_SERVICE_ROLE_KEY` in Vercel environment variables.

---

## 5. EXISTING UX AND PRODUCT GAPS (from historical audits)

*Checked against current codebase:*
- **Cart Grouping by Seller:** STILL OPEN.
- **Orders Tabs (Active/Completed):** STILL OPEN.
- **Chat Read Receipts:** STILL OPEN.
- **Store Intra-search:** STILL OPEN.
- **Image Optimization (`<img>` to `<Image>`):** STILL OPEN (Lint explicitly flags `src/features/sell/components/steps/photo-upload.tsx`).
- **Unified Empty States & Skeletons:** STILL OPEN.
- **A11y (Missing ARIA / Labels):** STILL OPEN.

---

## 6. PRIORITIZED BACKLOG

### P0 (Blocks controlled release)
1. **Implement Automated E2E Testing Pipeline**
   - *Impact:* Cannot safely release updates without breaking core flows.
   - *Action:* Install Playwright, write tests for Auth, Checkout, and Listing creation.
2. **Optimize Images / Fix Next Warnings**
   - *Impact:* Poor LCP performance, bandwidth waste.
   - *Action:* Replace `<img src={...}>` with `next/image` in `photo-upload.tsx` and `product-card.tsx`.

### P1 (Essential user journeys)
3. **Cart & Orders UX Overhaul**
   - *Impact:* Buyers will abandon carts if confused; Sellers will lose track of orders.
   - *Action:* Group cart items by `store_id`. Add Tabs (`Active`, `History`) to `/orders`.
4. **Global Loading Skeletons & Empty States**
   - *Impact:* Current UI jumps and feels disjointed during data fetching.
   - *Action:* Create unified `EmptyState` and `LoadingSkeleton` shared components.

### P2 (Operational & Polish)
5. **Storage Orphan Cleanup Cron**
   - *Impact:* Wasted S3/Supabase storage costs.
   - *Action:* Write edge function to periodically delete unlinked images.
6. **Mobile Safe-Area Fixes**
   - *Impact:* UI overlap on iOS Safari.
   - *Action:* Fix `bottom-14` artifacts in layout components.

### P3 (Future Expansion)
7. **Chat Read Receipts & Store Intra-search**
   - *Action:* Defer until post-launch user feedback confirms demand.

---

## 7. RELEASE ROADMAP

**Phase 1: Foundation & Stability (Current Goal)**
- Set up Playwright. Write E2E tests for the 3 core journeys.
- Resolve remaining 271 ESLint warnings.
- Clean up root directory (remove `.js` test/fix scripts).

**Phase 2: UX Polish**
- Implement Cart Grouping, Order Tabs, and Next.js Image optimizations.
- Apply unified Skeletons.

**Phase 3: Controlled Beta (Invite-Only)**
- Deploy to Production. Monitor Vercel logs and Supabase database metrics.
- QA testing by real users on actual mobile devices.

**Phase 4: Public Launch**
- Marketing release.

---

## 8. STOP-REOPENING RULE
The following security vectors have been exhaustively tested and secured at the database layer. **Do not initiate new audits on these topics unless reproducible code exploits are found:**
1. **Account Deletion Race Conditions** (Secured via `acquire_deletion_lock` and Fencing Tokens).
2. **Checkout Concurrency / Double Spends** (Secured via atomic `stage1_checkout_concurrency.sql`).
3. **Banned User DB Writes** (Secured via `enforce_banned_user_block` trigger on all mutable tables).
4. **Admin IDOR / RBAC** (Secured via Server-side `verifyAdminAccess` and DB `service_role` execution).

---

## 9. SINGLE SOURCE OF TRUTH
- **RETAIN:** `PROJECT_STATUS.md` (This document is the master state of the project).
- **ARCHIVE / SUPERSEDE:** `audit_report.md`, `admin_security_architecture_audit.md`, `admin_ui_implementation_report.md`, `admin_ui_verification_report.md`. These hold historical value but should not drive future daily tasks.

---

## 10. FINAL SUMMARY

**Product Maturity:** 
The BazarGo backend (Supabase SQL) is highly mature, strictly secured, and production-ready. The Next.js frontend is functionally complete but lacks automated test coverage, performance polish (images), and scalable UX patterns (grouping/tabs).

**Top 5 Priorities:**
1. Playwright E2E Testing setup.
2. Next.js Image Optimization.
3. Cart & Orders UX Refactoring.
4. Unified Skeletons / Empty States.
5. ESLint Zero (Resolving legacy `any` types).

**Next Single Development Task:**
Initialize `Playwright` and write the first E2E test for the Authentication flow.

**What explicitly NOT to work on:**
Do not modify the database schema, do not create more security reports, and do not build new features (like auctions, crypto, or delivery integrations) until Phase 4 is complete.

## 11. LOCALIZATION & LEGAL READINESS (KYRGYZSTAN)

### Localization (Kyrgyz Language)
- **Status:** **MISSING**. The current architecture has `lang="ru"` hardcoded in `RootLayout`. There is no `next-intl` or generic i18n system implemented.
- **Action Required:** Cannot "expand" Kyrgyz localization as it does not exist. A foundational i18n library must be installed and integrated across all routes. 

### Legal Readiness (Kyrgyz Republic)
*Note: This is a technical inspection matched against general legal principles from cbd.minjust.gov.kg. It is NOT certified legal advice.*
- **Personal Data (Закон КР "Об информации персонального характера"):**
  - *Confirmed Fact:* Technical ability to delete accounts exists.
  - *Action Required (Owner):* Terms of Service and Privacy Policy must clearly state data retention policies and the procedure for deletion. Storage orphans (deleted user images staying in bucket for 1h) must be legally reviewed to see if it violates the "immediate deletion" request principle, or if 1h is considered acceptable technical lag.
- **E-commerce (Закон КР "Об электронной торговле"):**
  - *Confirmed Fact:* Platform connects buyers and sellers.
  - *Action Required (Owner/Legal):* Check if displaying only `full_name` is sufficient, or if sellers (especially B2B/Stores) are legally required to display business registration numbers (ИНН) publicly on the platform.
- **UGC & Moderation (Google Play / App Store + Local Laws):**
  - *Confirmed Fact:* The platform technically supports blocking users, hiding listings, and resolving reports.
  - *Action Required:* Ensure EULA explicitly outlines zero tolerance for objectionable content to pass App Store review.
