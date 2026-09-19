# Goal Description
STAGE 3 — PRODUCTION SCALABILITY + PERFORMANCE + REALTIME + FINAL TECHNICAL HARDENING

## User Review Required
> [!IMPORTANT]
> The pagination of the catalog is using OFFSET + LIMIT for MVP but will be kept since it's already implemented, unless it poses a huge risk. The prompt says "Если текущая pagination подходит для текущего масштаба, зафиксируй это... НЕ переписывай pagination просто ради моды." I will document this.

## Proposed Changes

### Database Indexes & Constraints
#### [NEW] supabase/migrations/20260919200000_stage3_indexes.sql
Create foreign key indexes to prevent Sequential Scans during joins and lookups:
- `listings(seller_id)`
- `listings(store_id)`
- `listings(category_id)`
- `listings(status, created_at)`
- `listing_images(listing_id)`
- `favorites(user_id)`, `favorites(listing_id)`
- `messages(chat_id, created_at)`
- `chats(buyer_id)`, `chats(seller_id)`
- `orders(buyer_id)`, `orders(seller_id)`
- `order_items(order_id)`
- Add unique constraints to prevent duplicates: `favorites(user_id, listing_id)`, `cart_items(user_id, listing_id)`

### Chat Architecture & Realtime
#### [MODIFY] src/features/chat/components/chat-room.tsx
- Fix Chat Realtime subscription lifecycle. Supabase `createClient()` should be stable.
- Ensure messages use `message.id` as canonical identity for deduplication (already implemented).
- Implement properly marked as read functionality? (Check if `is_read` exists).

#### [MODIFY] src/app/actions/chats.ts
- Use RPC or Transaction for `sendMessage` to ensure `chat.updated_at` is updated atomically with the message creation.

### Data Fetching & Query Audit
#### [MODIFY] src/app/(main)/messages/layout.tsx
- Optimize chat list query. `or(buyer_id, seller_id)` + `order(updated_at)` is fine, but we should limit the nested `messages` to `LIMIT 1` instead of pulling all messages. Supabase allows nested limits.

#### [MODIFY] src/app/(main)/catalog/page.tsx
- Add a strict limit to `searchParams.page` (e.g. max 50 pages) to prevent deep OFFSET scanning. 

### Server / Client Boundary
#### [MODIFY] src/lib/supabase/client.ts
- Ensure `createClient()` for browser correctly caches the client globally to avoid creating new connections on every render.

## Verification Plan
1. Apply the new DB migrations.
2. Verify that creating a message updates the chat timestamp correctly.
3. Verify that the Chat List limits message history to just the last message.
4. Run `npm run build` and `npm run lint`.
