# BazarGo Compliance Matrix & Technical Audit

## 1. Verified Compliance Matrix (Updated)

| Area | Requirement | Official Source | Article/Section | Applies? | Current | Action | Status |
|---|---|---|---|---|---|---|---|
| **Personal Data Deletion** | Right to erasure / Anonymization | Цифровой кодекс КР (№178, вст. 05.02.2026) | Глава 11 (ст. 77-91) | YES | Settings Account page created. | Implemented DB anonymization logic. | PASS |
| **Cross-Border Data Transfer** | Processors (Vercel, Supabase) | Цифровой кодекс КР (№178) | ст. 89 | YES | Data transfers to foreign clouds. | Updated Privacy Policy to declare foreign Processors explicitly. | PASS |
| **Seller Info Disclosure** | Display Name/Tax ID (ИНН) | Закон КР «Об электронной торговле» (№154) | ст. 5 (ч. 1) | YES (for IP/LLC) | B2B flow exists. | Law requires providing info "and/or" to the operator. Direct public listing exposure is NOT strictly required by Law 154. | PASS |
| **24-Hour UGC Takedown** | Remove false/illegal info within 24h | Закон КР «О защите от недостоверной информации» (№101) | ст. 3 | YES | DB structure exists. | Built Admin Reports Panel and UI Modal to flag items for admins to meet the SLA. | PASS |
| **App Store UGC (Report)** | In-app reporting for content | Apple App Store Guideline | 1.2 | YES | Missing | Created `ReportModal` and `reports` DB. | PASS |
| **App Store UGC (Block)** | In-app blocking for users | Apple App Store Guideline | 1.2 | YES | Missing | Created `BlockButton` and `user_blocks` DB. Enforced in chat. | PASS |
| **App Store Data Deletion** | Public URL for Account Deletion | Apple App Store Guideline | 5.1.1(v) | YES | Missing | Created `/account-deletion` route. | PASS |

---

## 2. Technical Implementation Map

### Administrative Controls (RBAC)
- **Roles:** `SUPER_ADMIN`, `ADMIN`, `MODERATOR`, `SUPPORT`.
- **Enforcement:** Verified via Server Actions (not client side flags). A Postgres Trigger `prevent_privilege_escalation` blocks clients from altering roles.

### Reporting System
- **Rate Limiting:** Users can submit a maximum of 10 reports per day (enforced in `src/features/reports/actions.ts`).
- **Data Model:** `reports` table handles targets (`LISTING`, `USER`, `MESSAGE`, `STORE`).

### Account Deletion
- Follows the **Anonymization (Обезличивание)** principle defined in the Digital Code.
- Replaces PII with `Deleted User [ID]`, sets `avatar_url` to null, deactivates listings/stores, blocks chats.
- Deletion is requested from `/settings/account` with an explicit warning checkbox.

### Chat Abuse & Blocking
- **Peer-to-Peer Block:** A `BlockButton` is integrated. If user A blocks user B, a row in `user_blocks` is created.
- **RLS Enforcement:** `messages` INSERT policy specifically blocks `sender_id` if the `chats` relationship hits a `user_blocks` match.
- **UI Degradation:** The Chat Room checks the `isBlocked` flag to render graceful warnings rather than crash.
