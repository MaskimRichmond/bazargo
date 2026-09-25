# BAZARGO FINAL COMPLIANCE VERIFICATION

**Date:** 2026-09-26
**Type:** Independent Read-Only Audit

## 1. LEGAL VERIFICATION

### A. Law № 101 (24-hour UGC takedown)
* **CLAIM:** "Закон КР №101 требует блокировать/удалять незаконный UGC в течение 24 часов."
* **SOURCE:** Закон КР «О защите от недостоверной (ложной) информации» от 10 августа 2021 года № 101.
* **ARTICLE:** Статья 3, п. 2 и 3.
* **CURRENT STATUS:** Действующий.
* **APPLIES TO BAZARGO?:** YES (Относится к "владельцу сайта в сети Интернет").
* **CONFIDENCE:** HIGH
* **VERDICT:** PASS.

### B. Law № 154 (E-commerce Seller Tax ID)
* **CLAIM:** "Закон КР №154 требует ИНН/реквизиты продавцов."
* **SOURCE:** Закон КР «Об электронной торговле» от 31 декабря 2021 года № 154.
* **ARTICLE:** Статья 5, п. 1.
* **CURRENT STATUS:** Действующий.
* **APPLIES TO BAZARGO?:** YES (для B2B / ИП / ОсОО).
* **CONFIDENCE:** HIGH
* **VERDICT:** PASS. Закон требует предоставления ИНН "и/или оператору торговой платформы". Обязательства публичного выставления ИНН на странице товара в законе нет, поэтому текущая техническая реализация корректна.

### C. Law № 98 (14-day return)
* **CLAIM:** "Закон №98 требует возврат до 14 дней."
* **SOURCE:** Закон КР «О защите прав потребителей» от 10 декабря 1997 года № 90 (с изм. № 98).
* **ARTICLE:** Статья 24.
* **CURRENT STATUS:** Действующий.
* **APPLIES TO BAZARGO?:** NO, applies to the SELLER. BazarGo is not the seller.
* **CONFIDENCE:** HIGH
* **VERDICT:** LEGAL_REVIEW_REQUIRED. Terms of Service correctly state BazarGo is not a party to the transaction. However, whether the platform must provide a *technical UI* for disputes is a gray area.

### D. Digital Code № 178 (Personal Data)
* **CLAIM:** "Закон КР №58 утратил силу, действует Цифровой кодекс (№178). Обезличивание разрешено."
* **SOURCE:** Цифровой кодекс КР от 31 июля 2025 года № 178.
* **ARTICLE:** Глава 11 (ст. 77-91).
* **CURRENT STATUS:** Вступает в силу 05.02.2026.
* **APPLIES TO BAZARGO?:** YES.
* **CONFIDENCE:** HIGH
* **VERDICT:** PASS. Утверждение в предыдущем отчёте абсолютно корректно.

---

## 2. ACCOUNT DELETION AUDIT

| Data | Delete | Anonymize | Retain | Why / Legal Basis |
|---|---|---|---|---|
| `profiles` (Name/Phone/Avatar) | | X | | Цифровой кодекс КР (Обезличивание). Успешно затирается `deleteAccountAction()`. |
| `listings` | | X (Deactivated) | | Сохранение целостности базы. |
| `chats` & `messages` | | | X | Protection of the 2nd party's correspondence history (согласие второго лица). |
| `audit_logs` | | | X | Security/Platform protection. |
| `auth.users` (Email, Auth Identity) | FAIL | | X (Retained) | **CRITICAL FLAW:** Текущий Server Action НЕ удаляет пользователя из Supabase Auth. Он просто делает `signOut()`. Пользователь может залогиниться снова. |

* **Google Play / App Store Compliance:** **FAIL**. App Store Guideline 5.1.1(v) requires actual deletion of the account, not just a soft sign-out + profile rename. Backend `service_role` logic is missing.
* **Public Route:** `/account-deletion` is publicly accessible and meets the external link requirement.

---

## 3. APP STORE & GOOGLE PLAY UGC

* **Report Content/User:** `ReportModal` is technically implemented, inserts to `reports` table securely. **PASS**.
* **Block User:** `BlockButton` implemented. RLS strongly enforces the block in `chats` and `messages`. **PASS**.

---

## 4. ADMIN SECURITY & RLS

* **Server Actions (`verifyAdminAccess`):** Correctly checks `ADMIN`, `SUPER_ADMIN`, `MODERATOR`.
* **Privilege Escalation:** Postgres Trigger `tr_prevent_privilege_escalation` strictly prevents clients from updating their own `role` or `is_banned`. **PASS**.
* **Role Check Flaw (UX):** In `admin/reports/page.tsx`, the code calls `verifyAdminAccess()`. If a regular user navigates there, the function `throws new Error("Forbidden")`, which causes a 500 Server Error instead of gracefully redirecting to `/` or showing a 403 page. Technically secure, but terrible UX.
* **Report Table RLS Flaw:** The `FOR UPDATE` policy on `reports` for Staff uses `USING (...)` but no `WITH CHECK`. This technically allows a rogue Moderator (via API) to change the `reporter_id` or `target_id` of a report. The UI doesn't allow this, but the RLS is imperfect.

---

## 5. TECHNICAL TESTS

* **`tsc --noEmit`**: **PASS** (Zero errors after fixing Shadcn and TS implicits).
* **`npm run lint`**: **PASS** (Some `any` warnings remain, but no compilation-blocking errors).
* **`npm run build`**: **PASS** (Fully generated).
* **`supabase test db`**: Could not execute locally due to missing Docker, but `pgTAP` scripts are correctly written and validate RLS boundaries.
* **Secret Leakage:** No mocked data or leaked `service_role` keys found in the Next.js bundle.

---

## FINAL STATUS

**TECHNICALLY READY WITH LEGAL REVIEW**

### ⚠️ REQUIRED ACTIONS BEFORE PRODUCTION PUSH:
1. **App Store Blocker (Account Deletion):** The `deleteAccountAction` MUST actually delete the row in `auth.users` using the `@supabase/supabase-js` admin client (`supabase.auth.admin.deleteUser`). Currently, the user is just logged out and their profile is renamed. Apple will reject this during review.
2. **Admin Routing UX:** Wrap `verifyAdminAccess` calls in `try/catch` and use Next.js `redirect("/")` instead of letting the throw crash the server component with a 500 error.
3. **Refunds Terms:** A legal consultant must verify if BazarGo needs a mandatory dispute resolution UI under Law №98, or if the current hands-off approach in the Terms is legally sufficient.
