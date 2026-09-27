const fs = require('fs');

let content = fs.readFileSync('PROJECT_STATUS.md', 'utf8');

// Update testing status
content = content.replace(
  '**Test Coverage:** **MISSING**. There is no Jest, Vitest, Playwright, or Cypress configuration in `package.json`.',
  '**Test Coverage:** **PARTIAL (PLAYWRIGHT)**. E2E tests for Auth, Catalog, and Cart exist and pass. No unit tests.'
);

// Append section for Legal & Localization
content += `
## 11. LOCALIZATION & LEGAL READINESS (KYRGYZSTAN)

### Localization (Kyrgyz Language)
- **Status:** **MISSING**. The current architecture has \`lang="ru"\` hardcoded in \`RootLayout\`. There is no \`next-intl\` or generic i18n system implemented.
- **Action Required:** Cannot "expand" Kyrgyz localization as it does not exist. A foundational i18n library must be installed and integrated across all routes. 

### Legal Readiness (Kyrgyz Republic)
*Note: This is a technical inspection matched against general legal principles from cbd.minjust.gov.kg. It is NOT certified legal advice.*
- **Personal Data (Закон КР "Об информации персонального характера"):**
  - *Confirmed Fact:* Technical ability to delete accounts exists.
  - *Action Required (Owner):* Terms of Service and Privacy Policy must clearly state data retention policies and the procedure for deletion. Storage orphans (deleted user images staying in bucket for 1h) must be legally reviewed to see if it violates the "immediate deletion" request principle, or if 1h is considered acceptable technical lag.
- **E-commerce (Закон КР "Об электронной торговле"):**
  - *Confirmed Fact:* Platform connects buyers and sellers.
  - *Action Required (Owner/Legal):* Check if displaying only \`full_name\` is sufficient, or if sellers (especially B2B/Stores) are legally required to display business registration numbers (ИНН) publicly on the platform.
- **UGC & Moderation (Google Play / App Store + Local Laws):**
  - *Confirmed Fact:* The platform technically supports blocking users, hiding listings, and resolving reports.
  - *Action Required:* Ensure EULA explicitly outlines zero tolerance for objectionable content to pass App Store review.
`;

fs.writeFileSync('PROJECT_STATUS.md', content);
