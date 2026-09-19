# Goal Description
Professional Product UI/UX + Chat Redesign + Mobile-first Navigation. We are moving from a standard "website" look to a true "marketplace application" look (mobile-first, clean, consistent, professional).

## User Review Required
> [!IMPORTANT]
> The chat redesign is massive. We are replacing the fixed 600px widget with a full two-column layout on desktop, and dedicated full-screen views on mobile.
> The footer will be severely reduced to look like an application footer (compact, secondary links only).
> The desktop layout will utilize max-w-7xl mostly for better focus.

## Proposed Changes

### Global UI / Layout
#### [MODIFY] src/components/layout/footer.tsx
- Remove heavy block structure. Shrink to a minimal single row of links on mobile, clean small block on desktop.
- Remove redundant main nav links.

#### [MODIFY] src/components/layout/header.tsx
- Clean up search bar, add proper states.
- Ensure the header looks like an application shell (sticky, thin border, proper focus states).

#### [MODIFY] src/components/layout/mobile-nav.tsx
- Already mostly okay, but ensure touch targets are big enough and the "+" button dropdown is styled as a mobile-friendly menu (larger padding, rounded).

### Pages
#### [MODIFY] src/app/(main)/catalog/page.tsx
- Add Skeleton loaders.
- Improve product grid: standardize aspect ratios (e.g., aspect-[4/3] for images), clear visual hierarchy (Image > Price > Title > Location).

#### [MODIFY] src/app/(main)/product/[id]/page.tsx
- Clean up layout. Use a unified image gallery, clear CTA area (sticky bottom action bar on mobile).

#### [MODIFY] src/app/(main)/profile/page.tsx
- Turn profile into an application hub with clear sections.
- B2B discoverability: Add a dedicated, clean entry point "Для бизнеса" here.

### Chat Redesign
#### [MODIFY] src/app/(main)/messages/page.tsx
- Implement the "Chat List" view. On desktop, this is the left column. On mobile, this is the full screen list.

#### [MODIFY] src/app/(main)/messages/[id]/page.tsx
- Desktop: Left column (list), Right column (conversation).
- Mobile: Full screen conversation with a "Back" button in the header.

#### [MODIFY] src/features/chat/components/chat-room.tsx
- Re-style bubbles. No excessive pills. Distinct incoming/outgoing colors (Primary vs Muted).
- Remove fixed height `h-[600px]`, make it fill the container flex.
- Add a compact "Product Context" card at the top.

### B2B Discoverability
#### [MODIFY] src/app/(main)/b2b/page.tsx
- Minor UI polish to match the new token system.

### UI System
#### [NEW] src/components/ui/skeleton.tsx
- Add standard skeleton component.

## Verification Plan
1. Check visually across 390px (iPhone), 768px (iPad), and 1440px (Desktop).
2. Ensure no horizontal overflow anywhere.
3. Test Chat flow on mobile to ensure the keyboard doesn't break the layout and the two screens (List vs Room) feel native.
4. Verify "Для бизнеса" is easy to find in the Profile.
5. Run `npm run build` and `npm run lint`.
