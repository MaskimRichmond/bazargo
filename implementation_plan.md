# Stage 8.0: Global Search, Regional System, B2B Applications

This plan details the implementation of full global search, unified regional filtering, and multi-application B2B flow.

## 1. Unified Regions (`src/lib/regions.ts`)
Create a single source of truth for regions:
```typescript
export const REGIONS = [
  "Бишкек",
  "Ош",
  "Баткенская область",
  "Джалал-Абадская область",
  "Иссык-Кульская область",
  "Нарынская область",
  "Ошская область",
  "Таласская область",
  "Чуйская область"
] as const;

export const CITIES_BY_REGION: Record<string, string[]> = { ... } // mappings for MVP
```

## 2. Database Migration
Create `supabase/migrations/20260919000000_stage8_regions.sql`.
- Add `region VARCHAR(100)` to `listings` and `requests`.
- Backfill `region` based on existing `city`.
  - e.g. `UPDATE listings SET region = 'Бишкек' WHERE city = 'Бишкек';`
  - e.g. `UPDATE listings SET region = 'Джалал-Абадская область' WHERE city = 'Джалал-Абад';`
- Make `region` NOT NULL.

## 3. Global Search & Filters
- **Catalog Page (`/catalog/page.tsx`)**:
  - Implement full Supabase filtering using `q`, `region`, and existing filters (category, price, etc.).
  - `q` search will use `.or('title.ilike.%query%,description.ilike.%query%')` safely escaping `%` and `,`.
  - Fix pagination to reset when `q` or `region` changes (already handled mostly by Next.js if we pass standard link logic, but ensure `useRouter().push` resets page).
- **Requests Page (`/requests/page.tsx`)**:
  - Add `region` filtering to requests alongside existing filters.

## 4. Header Location Selector (Cookies)
- Update `HeaderLocationSelector` to set a cookie `bazargo_region`.
- Use a Server Action or Route Handler to set the cookie securely, or just `document.cookie` client-side combined with `router.refresh()`.
- If "Все регионы" is selected, delete the cookie or set to `all`.
- This cookie will be used by SSR pages (Homepage).

## 5. Homepage Real Data
- **Popular Products (`popular-products.tsx`)**:
  - Fetch `listings` where `status = 'ACTIVE'`.
  - Filter by `region` cookie if it exists and != `all`.
  - Filter by selected category tabs.
  - Show empty state "В этом регионе пока нет объявлений" if empty.
  - Remove `mock-data.ts` usage here.

## 6. Sell Flow (Create Listing)
- Update `src/features/sell/components/steps/product-details.tsx` (or location step) to select `region` first, then `city` based on `CITIES_BY_REGION`.

## 7. B2B Multi-Applications
- Create `/b2b/my-applications` page.
- Fetch all applications for `auth.uid()` ordered by `created_at desc`.
- Translate statuses (PENDING -> На рассмотрении, etc.).
- Update `/b2b/become-supplier` to allow submitting a new application.
  - If a PENDING application exists, show a warning, but don't block.
  - Link to `/b2b/my-applications`.

## 8. Cleanup
- Audit `console.log` and `any`.
- Remove dead mock data usage.

## User Review Required
No breaking user-facing changes, but significant architectural shift to regions and full Supabase querying on homepage.
