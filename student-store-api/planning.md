# Student Store System Spec

## 1) Data Models

### Product

- `id`: `Int`, required, primary key, auto-increment (`@id @default(autoincrement())`)
- `name`: `String`, required
- `description`: `String`, required
- `price`: `Float`, required
- `imageUrl`: `String`, required
- `category`: `String`, required
- `orderItems`: relation field to `OrderItem[]`

Relationship details:
- One `Product` can appear in many `OrderItem` rows.
- Foreign key lives on `OrderItem.productId`.

Delete behavior:
- If a `Product` is deleted, all `OrderItem` rows referencing that product are deleted automatically (`onDelete: Cascade`).

### Order

- `id`: `Int`, required, primary key, auto-increment (`@id @default(autoincrement())`)
- `customer`: `Int`, required
- `totalPrice`: `Float`, required, default `0` (can also be set explicitly during creation)
- `status`: `String`, required
- `createdAt`: `DateTime`, required, default `now()` (`@default(now())`)
- `orderItems`: relation field to `OrderItem[]`

Relationship details:
- One `Order` contains many `OrderItem` rows.
- Foreign key lives on `OrderItem.orderId`.

Delete behavior:
- If an `Order` is deleted, all `OrderItem` rows referencing that order are deleted automatically (`onDelete: Cascade`).

### OrderItem

- `id`: `Int`, required, primary key, auto-increment (`@id @default(autoincrement())`)
- `orderId`: `Int`, required, foreign key to `Order.id`
- `productId`: `Int`, required, foreign key to `Product.id`
- `quantity`: `Int`, required
- `price`: `Float`, required (snapshot unit price at time of purchase)
- `order`: relation field to `Order`
- `product`: relation field to `Product`

Relationship details:
- Many `OrderItem` rows belong to one `Order`.
- Many `OrderItem` rows can reference one `Product`.

Delete behavior:
- `OrderItem` is downstream of both parent models. Deleting either parent (`Order` or `Product`) removes dependent `OrderItem` rows.
- If a product in an active order is deleted, the related line item disappears. In this project, we accept that the order record remains but may no longer represent the original cart perfectly unless business rules later prevent product deletion or introduce soft-deletes.

---

## 2) API Contract

Global error shape (used everywhere):
- `{ "error": "Human-readable message" }`

### `GET /`

- Request: no params/body
- Success: `200`
  - `{ "status": "ok", "message": "Student Store API" }`
- Error example:
  - `500` -> `{ "error": "Unable to process request" }`

### `GET /products`

- Request:
  - Query Parameters (all optional):
    - `category` (string): filters products by exact category match (case-insensitive). Allowed values: `Apparel`, `Books`, `Supplies`, `Accessories`, `Snacks`.
    - `sort` (string): sorts results ascending by a supported field.
      - `sort=price` -> sort by product price (low to high)
      - `sort=name` -> sort alphabetically by product name (A to Z)
  - Default behavior (no query parameters): return all products with no explicit ordering guarantees.
- Success: `200`
  - `{ "products": [ { "id": 1, "name": "...", "description": "...", "price": 29.99, "image_url": "...", "category": "..." } ] }`
- Error example:
  - `400` -> `{ "error": "Invalid category value" }`
  - `400` -> `{ "error": "Invalid sort value" }`
  - `500` -> `{ "error": "Failed to fetch products" }`

### `GET /products/:productId`

- Request:
  - Route param: `productId` (integer)
- Success: `200`
  - `{ "product": { "id": 1, "name": "...", "description": "...", "price": 29.99, "image_url": "...", "category": "..." } }`
- Error example:
  - `404` -> `{ "error": "Product not found" }`

### `POST /products`

- Request body:
  - `name` (string, required)
  - `description` (string, required)
  - `price` (number, required)
  - `image_url` (string, required)
  - `category` (string, required)
- Success: `201`
  - `{ "product": { "id": 10, "name": "...", "description": "...", "price": 4.99, "image_url": "...", "category": "Snacks" } }`
- Error examples:
  - `400` -> `{ "error": "Missing required product fields" }`
  - `500` -> `{ "error": "Failed to create product" }`

### `PUT /products/:productId`

- Request:
  - Route param: `productId` (integer)
  - Body:
    - `name` (string, required)
    - `description` (string, required)
    - `price` (number, required)
    - `image_url` (string, required)
    - `category` (string, required)
- Success: `200`
  - `{ "product": { "id": 1, "name": "...", "description": "...", "price": 29.99, "image_url": "...", "category": "Apparel" } }`
- Error examples:
  - `404` -> `{ "error": "Product not found" }`
  - `400` -> `{ "error": "Missing required product fields" }`

### `DELETE /products/:productId`

- Request:
  - Route param: `productId` (integer)
- Success: `200`
  - `{ "deleted": { "id": 1 } }`
- Error example:
  - `404` -> `{ "error": "Product not found" }`

### `GET /orders`

- Request: no body; optional query filters may be added later (`status`, `customer`)
- Success: `200`
  - `{ "orders": [ { "id": 1, "customer": 101, "total_price": 89.97, "status": "completed", "created_at": "2023-04-06T10:00:00.000Z" } ] }`
- Error example:
  - `500` -> `{ "error": "Failed to fetch orders" }`

### `GET /orders/:orderId`

- Request:
  - Route param: `orderId` (integer)
- Success: `200`
  - `{ "order": { "id": 1, "customer": 101, "total_price": 89.97, "status": "completed", "created_at": "...", "items": [ { "id": 11, "product_id": 1, "quantity": 2, "price": 29.99 } ] } }`
- Error example:
  - `404` -> `{ "error": "Order not found" }`

### `POST /orders`

- Request body:
  - `customer` (integer, required)
  - `status` (string, required; expected values like `pending`, `completed`, `cancelled`)
  - `items` (array, required, at least 1 item)
    - each item: `{ "product_id": number, "quantity": number }`
- Success: `201`
  - `{ "order": { "id": 3, "customer": 103, "total_price": 63.47, "status": "pending", "created_at": "...", "items": [ { "id": 15, "product_id": 1, "quantity": 2, "price": 29.99 }, { "id": 16, "product_id": 8, "quantity": 1, "price": 1.49 } ] } }`
- Error examples:
  - `400` -> `{ "error": "customer, status, and a non-empty items array are required" }`
  - `404` -> `{ "error": "Product 999 does not exist" }`
  - `500` -> `{ "error": "Failed to create order" }`

### `PUT /orders/:orderId`

- Request:
  - Route param: `orderId` (integer)
  - Body: `{ "status": "completed" }`
- Success: `200`
  - `{ "order": { "id": 2, "customer": 102, "total_price": 61.98, "status": "completed", "created_at": "..." } }`
- Error example:
  - `404` -> `{ "error": "Order not found" }`

### `DELETE /orders/:orderId`

- Request:
  - Route param: `orderId` (integer)
- Success: `200`
  - `{ "deleted": { "id": 2 } }`
- Error example:
  - `404` -> `{ "error": "Order not found" }`

---

## 3) Transactional Flow (`POST /orders`)

Request body shape:

```json
{
  "customer": 103,
  "status": "pending",
  "items": [
    { "product_id": 1, "quantity": 2 },
    { "product_id": 8, "quantity": 1 }
  ]
}
```

Data-layer sequence:

1. Validate body:
   - ensure `customer` is an integer,
   - ensure `status` is present,
   - ensure `items` is a non-empty array,
   - ensure each item has integer `product_id` and positive integer `quantity`.
2. Start Prisma transaction (`prisma.$transaction`).
3. Fetch all products referenced in `items` in one query (`findMany` with `id in [...]`).
4. Compare fetched ids vs requested ids:
   - if any product is missing, throw an error with `404` semantics (e.g., `"Product 999 does not exist"`).
5. Build order items payload:
   - for each item, use the current product price from DB as unit `price`,
   - compute line totals (`quantity * product.price`).
6. Calculate `totalPrice` as sum of line totals.
7. Create `Order` row with `customer`, `status`, `totalPrice`.
8. Create `OrderItem` rows connected to the new order (nested `create` or batched create inside transaction).
9. Query created order with included order items to shape final response.
10. Commit transaction and return `201` with the full order payload.

Rollback / failure behavior:
- If any step fails after transaction start (missing product, invalid FK, create failure), Prisma rolls back the whole transaction.
- No partial order is left in DB: either both `Order` and all `OrderItem` rows are created, or none are created.
- If one `product_id` is nonexistent, return an error response and do not persist anything.

---

## Decisions Log — Product Model

- **Schema translation that went smoothly**: `imageUrl` in Prisma was mapped to API `image_url` in responses so DB naming can stay camelCase while API stays consistent with frontend payloads.
- **Field decision made during implementation**: kept `price` as `Float` to match the milestone spec and existing seed data format, with explicit numeric parsing in request handling.
- **Route behavior needing a spec update**: added missing Product endpoints (`POST /products` and `PUT /products/:productId`) to the API contract so all five required Product routes are explicitly documented.

---

## Spec Reconciliation — Milestone 4 (Schema Audit)

### Schema vs. spec gaps found
- No gaps found — `Product`, `Order`, and `OrderItem` fields in `schema.prisma` match the `planning.md` data model spec.
- Relationships are modeled correctly: `OrderItem` has required foreign keys to both `Order` and `Product`, matching the documented dependency chain.
- Cascade delete rules are implemented as specified using `onDelete: Cascade` on both `OrderItem.order` and `OrderItem.product` relations.

### Cascade delete verification
- Deleting a Product removes associated OrderItems: ✅ tested
- Deleting an Order removes associated OrderItems: ✅ tested

---

## Decisions Log — Order Creation Transaction

- **What my Transactional Flow spec got right**: The sequence in the spec matched implementation cleanly: validate request, load products, compute line prices and total, then create the order and nested order items in one atomic unit.
- **What the spec missed that I discovered during implementation**: The endpoint needed an explicit validation that `items` is non-empty and that each `quantity` is a positive integer; this was enforced with a `400` before opening the transaction.
- **How the transaction error handling works**: `prisma.$transaction` commits only if every operation succeeds; if one step throws (like a missing product id), Prisma rolls back everything so no partial order or order items are persisted.
- **One thing I'd design differently if starting over**: I would model `status` as a Prisma enum (instead of free-form string) to enforce valid order states at the database level.

---

## Final Spec Reconciliation: Project Complete

### Full-system audit result
- Frontend API usage was audited and aligned: `GET /products`, `GET /products/:productId`, and `POST /orders` now match request and response contracts used by the UI.
- CORS middleware was enabled in the backend (`app.use(cors())`) to allow the Vite frontend to call the API across origins.
- Core purchase flow is wired end-to-end: browse products, view details, add/remove cart items, and place an order with transactional backend creation.

### Gaps resolved during frontend integration
- Frontend checkout state used `name` as the Student ID input; backend expects `customer` integer. Resolution: frontend converts Student ID input to numeric `customer` before `POST /orders`.
- Frontend checkout success UI expected a legacy `purchase.receipt` response shape; backend returns `order` with `items`. Resolution: success component now renders from the current API contract.
- Dorm room input state mapping was inconsistent (`id/email` fields); it was normalized to `dorm_number` to keep frontend state coherent.

### What the spec enabled during this project
- The written API/data spec made debugging integration faster because mismatches were obvious: field names, expected response shapes, and transaction behavior could be compared directly instead of guessed.
- Having the contract defined early reduced rework when connecting frontend and backend, especially around `POST /orders` validation and error handling.

