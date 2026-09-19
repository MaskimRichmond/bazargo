# Implementation Plan: Stage 9

## Goal
Implement a complete ordering and cart system, robust inventory decrement logic using an atomic SQL transaction, user settings, and smart text search via `pg_trgm` and synonym mappings.

## Scope of Changes

### 1. Database Migrations
- **Orders & Cart**: Create `orders`, `order_items`, and `cart_items` tables with appropriate enums (`order_status`). 
- **Inventory Logic**: Create a PostgreSQL stored function (RPC) `complete_order` to atomically deduct inventory and handle `SINGLE` vs `INVENTORY` logic (`ACTIVE` -> `SOLD`, or decrement `quantity` -> `OUT_OF_STOCK`).
- **Search Extensions**: Enable `pg_trgm` extension and create `GIN` indexes on `listings(title)` and `listings(description)`.
- **RLS**: Apply strict Row Level Security to ensure buyers can only read their own orders, sellers can only read orders where they are the seller, and cart items are isolated.

### 2. Orders & Cart Backend (Server Actions)
- `add_to_cart`, `remove_from_cart`, `update_cart_quantity` actions.
- `checkout` action: reads real prices directly from listings (not trusting client), chunks `cart_items` into separate orders per `seller_id`, applies initial status `PENDING`.
- `update_order_status` action: to transition from `PENDING` -> `CONFIRMED` / `REJECTED`, or `PENDING`/`CONFIRMED` -> `CANCELLED`.
- `complete_order_action`: Calls the PostgreSQL RPC `complete_order(order_id)` safely.

### 3. Smart Search & Normalization
- Modify the existing catalog search to normalize strings.
- Add an array of starter synonyms (e.g., 'клава' -> 'клавиатура').
- Query using Supabase `.or('title.ilike.%query%,description.ilike.%query%')` but supplemented with `textSearch` or RPC for `pg_trgm` similarity if necessary. In PostgREST, `pg_trgm` can be utilized using `title.wfts.query` or simply falling back to our JS-based synonym expander combined with standard `ilike`.

### 4. UI Modifications
- `/cart`: Shopping cart page showing totals and quantity controls.
- `/checkout`: Simple MVP checkout summary screen.
- `/orders` & `/orders/[id]`: Buyer view.
- `/seller/orders` & `/seller/orders/[id]`: Seller view.
- `ProductPage`: Add "Купить сейчас" and "В корзину" buttons for buyers (hidden for the listing owner).
- `/settings`: Simple user settings for Profile, Region, and mock notifications preferences.
- `Header` & `MobileNav`: Add entries for Cart and Orders.

## Open Questions & Review
- Is `pg_trgm` strictly required or can we just use a JS-based Synonym expansion + multiple `.ilike` queries in Supabase? We will enable `pg_trgm` and GIN indexes in a migration so that in the future or via RPC we can use `.rpc('search_listings')` if standard `.or()` is insufficient for typos.
- The `b2b_applications` and previous architectures will remain completely untouched.

Does this plan accurately capture your constraints?
