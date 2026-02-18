# Restaurant Ordering System — Full Sales Process

> End-to-end dine-in ordering: from QR scan → cart → order → kitchen → serve → pay → feedback.

---

## 1. Actors & Roles

| Actor | Auth | Description |
|---|---|---|
| **Guest** | No account (anonymous session via cookie/localStorage) | Scans QR, browses menu, builds cart, submits orders, tracks status |
| **Customer** | Optional account (email + password or social) | Same as guest PLUS: order history, saved preferences, favorites, feedback |
| **Waiter** (role: `waiter`) | Admin auth with `orders.read`, `orders.create`, `orders.update` | Validates pending orders, manages table orders, marks served, adds notes |
| **Chef** (role: `chef`) | Admin auth with `orders.read`, `orders.update` (status only) | Views order queue, updates prep status (preparing → ready) |
| **Manager** (role: `manager`) | Admin auth with `orders.*` | Closes sessions on payment, applies discounts, views analytics, manages table availability |
| **Admin** (role: `admin`) | Full access | Everything above + system configuration |

---

## 2. Customer Journey (Real-Life Flow)

### 2.1 Entry: QR Code Scan
- Customer scans a **QR code printed on the physical table** (e.g., `https://{domain}/t/{tenantSlug}/l/{locationSlug}/table/{tableLabel}`)
- QR resolves to: `tenantId` + `locationId` + `tableId` (via `FloorTable` or `DiningTable`)
- A **table session** is created automatically (or resumed if active)
- The customer lands on the **location menu page** scoped to that table
- The QR route is the ONLY route that allows placing orders — browsing the restaurant directory or general menu pages is read-only

### 2.2 Restaurant Discovery (Browse Only)
- `/t/{tenantSlug}` — Restaurant landing page (info, locations list)
- `/t/{tenantSlug}/l/{locationSlug}` — Location page with chat
- `/t/{tenantSlug}/l/{locationSlug}/menu` — Full published menu (read-only, no cart)
- `/t/{tenantSlug}/menu` — Brand-level menu overview
- Customers can browse any restaurant's menu but **cannot add to cart** unless they entered via a valid QR table route

### 2.3 Account (Optional)
- Guest: no signup needed — session tied to browser + table QR
- **Create Account**: email/password registration from the table page or menu page
  - Stored in a new `Customer` model (separate from `AdminUser`)
  - Fields: name, email, phone (optional), passwordHash, preferences (allergies, dietary), locale
- **Login**: returning customers can log in to access their history
- Account benefits: order history, saved favorites, dietary profile auto-applied, feedback history

### 2.4 Menu Browsing + Adding to Cart
- Customer sees the published menu for the location (sections → items with prices, photos, allergens, dietary flags, spiciness)
- Two ways to add items to cart:
  1. **Menu UI**: Click/tap item → select options (size, sides, add-ons from `OptionGroup`) → set quantity → "Add to Cart"
  2. **AI Chat**: Chat with the AI assistant → ask questions ("What's gluten-free?", "Recommend something spicy") → AI suggests items → customer clicks **"Add to Cart"** button rendered in chat responses
- Cart is stored **client-side** (localStorage) until submission, synced to server on submit
- Cart shows: item name, selected options, quantity, unit price, line total
- Customer can edit quantities, remove items, or clear cart before submitting

### 2.5 Cart Review & Order Submission
- Cart page/drawer shows:
  - All items with options, quantities, individual prices
  - Subtotal, tax (based on `priceTaxPolicy`), total
  - Special instructions text field (allergies, preferences, "no onions", etc.)
  - **"Submit Order"** button
- On submit:
  - Order is created in DB with status `pending`
  - Waiter receives a **real-time notification** (via polling, SSE, or WebSocket)
  - Customer sees order confirmation with estimated wait time
  - Cart is cleared
- Customer **can order multiple rounds** — each submission creates a new order (or appends to the active table session)

### 2.6 Order Tracking (Real-Time)
- After submission, customer sees their order(s) with live status:
  - `pending` → Waiting for waiter validation
  - `confirmed` → Waiter validated, sent to kitchen
  - `preparing` → Chef is preparing the dish
  - `ready` → Ready for pickup/serving
  - `served` → Waiter delivered to table
  - `cancelled` → Order was cancelled
- Status updates via polling (every 10-15s) or SSE for real-time push
- Customer receives **browser notifications** (if permitted) on status changes
- Customer can submit additional orders while previous ones are in progress

### 2.7 Payment & Session Close
- When customer is done, they request the bill (button or ask waiter)
- **Manager/waiter** reviews all orders in the table session → generates bill
- Payment options: cash at table, card at table, or via app (future: Stripe integration)
- Manager marks session as `paid` → all orders in session move to `completed`
- Table status is set back to `available` for new customers
- Receipt is generated (viewable in-app, optionally emailed)

### 2.8 Feedback & Rating
- After payment (or after leaving), customer can:
  - Rate overall experience (1-5 stars)
  - Rate individual dishes (optional)
  - Leave a text review
  - Rate specific aspects: food quality, service speed, ambiance, value
- Feedback is tied to the table session and visible to management in analytics
- Customers with accounts can view their feedback history

---

## 3. Staff Workflows

### 3.1 Waiter Dashboard
- **Active Tables View**: shows all tables in the assigned location with status indicators:
  - 🟢 Available | 🟡 Occupied (active session) | 🔴 Needs attention (new order pending)
- **Incoming Orders Queue**: list of `pending` orders awaiting validation
  - Each order shows: table label, items, special instructions, time since submission
  - Actions: **Validate** (→ `confirmed`, sends to kitchen) | **Reject** (→ `cancelled`, with reason)
- **Table Detail View**: click a table to see:
  - All orders in the current session (with statuses)
  - Total running bill
  - "Add Order" button (waiter can place orders on behalf of customer — for verbal requests)
  - Special notes / allergy warnings
- **Serve Confirmation**: when chef marks order as `ready`, waiter sees it highlighted → clicks **"Mark Served"** → status becomes `served`
- **Notifications**: real-time alerts for:
  - New pending order on any assigned table
  - Order marked as `ready` by kitchen
  - Customer requesting bill

### 3.2 Chef / Kitchen Dashboard
- **Order Queue** with swim lanes:
  - **Pending** (confirmed by waiter, waiting to prep)
  - **Preparing** (chef clicked "Start Preparing")
  - **Ready** (chef clicked "Mark Ready")
- Each order card shows: order number, table label, items with quantities, options, special instructions, time elapsed
- Chef can update order item status individually or per-order
- Kitchen Display System (KDS) style — optimized for large screen / tablet mounted in kitchen
- Sound/visual alert for new incoming confirmed orders

### 3.3 Manager Actions
- **Close Table Session**: after payment received → marks session `closed`, all orders `completed`, table → `available`
- **Apply Discount**: percentage or fixed amount on individual items or total bill
- **Void Items**: remove items from the bill with a reason (manager-only action)
- **Reopen Session**: if customer wants to order more after requesting bill
- **Daily Summary**: view total orders, revenue, average order value, popular items, table turnover rate

---

## 4. Data Models (Prisma Schema Additions)

### 4.1 Customer (Guest / Registered)
```
Customer {
  id, tenantId, email?, name?, phone?, passwordHash?,
  isGuest (bool), locale, dietaryPreferences (Json),
  createdAt, updatedAt
}
```

### 4.2 Table Session (Groups all orders for one seating)
```
TableSession {
  id, tenantId, locationId, tableId (FloorTable),
  customerId? (Customer), sessionCode (unique short code),
  status: open | bill_requested | paid | closed,
  guestCount (int), specialNotes?,
  openedAt, closedAt?, paidAt?
}
```

### 4.3 Order
```
Order {
  id, tenantId, sessionId (TableSession), orderNumber (auto-increment per location per day),
  status: pending | confirmed | preparing | ready | served | completed | cancelled,
  specialInstructions?, subtotalMinor, taxMinor, totalMinor, currency,
  confirmedById? (AdminUser — waiter), confirmedAt?,
  prepStartedAt?, readyAt?, servedAt?, servedById? (AdminUser — waiter),
  cancelledAt?, cancelReason?,
  createdAt, updatedAt
}
```

### 4.4 Order Item
```
OrderItem {
  id, tenantId, orderId (Order), itemId (Item),
  itemName (snapshot), quantity, unitPriceMinor, totalPriceMinor,
  selectedOptions (Json — snapshot of chosen options with names & prices),
  specialNote?, status: pending | preparing | ready | served | cancelled,
  createdAt
}
```

### 4.5 Payment
```
Payment {
  id, tenantId, sessionId (TableSession),
  method: cash | card | app,
  amountMinor, currency, tipMinor?,
  discountMinor?, discountReason?,
  processedById? (AdminUser — manager/waiter),
  status: pending | completed | refunded,
  receiptNumber?,
  createdAt
}
```

### 4.6 Feedback
```
Feedback {
  id, tenantId, sessionId (TableSession), customerId? (Customer),
  overallRating (1-5), foodRating?, serviceRating?, ambianceRating?, valueRating?,
  comment?,
  createdAt
}
```

### 4.7 Item Favorite (for registered customers)
```
CustomerFavorite {
  id, tenantId, customerId (Customer), itemId (Item),
  createdAt
}
```

---

## 5. API Routes

### 5.1 Customer / Public APIs (`/api/t/[tenantId]/...`)
| Method | Route | Description |
|---|---|---|
| POST | `/api/t/[tenantId]/auth/register` | Customer account registration |
| POST | `/api/t/[tenantId]/auth/login` | Customer login |
| GET | `/api/t/[tenantId]/auth/me` | Current customer session |
| POST | `/api/t/[tenantId]/auth/logout` | Customer logout |
| GET | `/api/t/[tenantId]/l/[locationSlug]/menu` | Get published menu for location |
| POST | `/api/t/[tenantId]/table-session` | Create/resume table session (from QR scan, receives tableId) |
| GET | `/api/t/[tenantId]/table-session/[code]` | Get current session with orders |
| POST | `/api/t/[tenantId]/orders` | Submit new order (from cart) |
| GET | `/api/t/[tenantId]/orders/[id]` | Get order status |
| GET | `/api/t/[tenantId]/sessions/[code]/orders` | Get all orders in session (for tracking) |
| POST | `/api/t/[tenantId]/sessions/[code]/request-bill` | Customer requests the bill |
| POST | `/api/t/[tenantId]/feedback` | Submit feedback after payment |
| GET | `/api/t/[tenantId]/customer/history` | Order history (authenticated customers only) |
| GET | `/api/t/[tenantId]/customer/favorites` | Saved favorites |
| POST | `/api/t/[tenantId]/customer/favorites` | Add/remove favorite |

### 5.2 Admin / Staff APIs (`/api/admin/...`)
| Method | Route | Description |
|---|---|---|
| GET | `/api/admin/orders` | List orders (filterable by status, table, location, date) |
| GET | `/api/admin/orders/[id]` | Order detail |
| PATCH | `/api/admin/orders/[id]/status` | Update order status (confirm, prepare, ready, serve, cancel) |
| POST | `/api/admin/orders` | Waiter creates order on behalf of customer |
| PUT | `/api/admin/orders/[id]/items` | Add/remove/modify items (waiter) |
| GET | `/api/admin/table-sessions` | List active sessions |
| GET | `/api/admin/table-sessions/[id]` | Session detail with all orders |
| POST | `/api/admin/table-sessions/[id]/close` | Close session after payment (manager) |
| POST | `/api/admin/payments` | Record payment |
| GET | `/api/admin/payments/[sessionId]` | Get payment info for session |
| POST | `/api/admin/orders/[id]/discount` | Apply discount (manager only) |
| GET | `/api/admin/kitchen/queue` | Kitchen queue view (confirmed + preparing orders) |
| GET | `/api/admin/feedback` | View feedback/ratings |
| GET | `/api/admin/analytics/orders` | Order analytics (revenue, popular items, avg times) |

---

## 6. Pages & UI

### 6.1 Customer Pages (under `/t/[tenantId]/`)
| Route | Page | Description |
|---|---|---|
| `/t/[tenantId]` | Restaurant landing | Info, locations list, link to menus (browse only) |
| `/t/[tenantId]/l/[locationSlug]/table/[tableLabel]` | **QR Entry Point** | Creates/resumes table session → redirects to ordering menu |
| `/t/[tenantId]/l/[locationSlug]/table/[tableLabel]/menu` | **Ordering Menu** | Full menu with "Add to Cart" buttons + AI chat with add-to-cart |
| `/t/[tenantId]/l/[locationSlug]/table/[tableLabel]/cart` | **Cart & Checkout** | Cart review, special instructions, submit order |
| `/t/[tenantId]/l/[locationSlug]/table/[tableLabel]/orders` | **Order Tracker** | Live status of all orders in current session |
| `/t/[tenantId]/l/[locationSlug]/table/[tableLabel]/bill` | **Bill View** | Itemized bill with totals when bill is requested |
| `/t/[tenantId]/l/[locationSlug]/table/[tableLabel]/feedback` | **Feedback Form** | Star ratings + text review (shown after payment) |
| `/t/[tenantId]/l/[locationSlug]/menu` | Menu (read-only) | Browse menu without ordering (no QR context) |
| `/t/[tenantId]/account` | **Customer Account** | Registration / login |
| `/t/[tenantId]/account/history` | **Order History** | Past orders for logged-in customers |
| `/t/[tenantId]/account/favorites` | **Favorites** | Saved favorite dishes |

### 6.2 Admin Pages (under `/t/[tenantId]/admin/`)
| Route | Page | Actor |
|---|---|---|
| `/t/[tenantId]/admin/orders` | **Orders Dashboard** | Waiter, Manager — all active orders with filters |
| `/t/[tenantId]/admin/orders/[id]` | **Order Detail** | View/update single order |
| `/t/[tenantId]/admin/tables-live` | **Live Table Map** | Waiter, Manager — floor plan with real-time table statuses |
| `/t/[tenantId]/admin/kitchen` | **Kitchen Display (KDS)** | Chef — order queue in swim lanes |
| `/t/[tenantId]/admin/payments` | **Payment Management** | Manager — record payments, close sessions |
| `/t/[tenantId]/admin/feedback` | **Feedback & Reviews** | Manager — view ratings and reviews |
| `/t/[tenantId]/admin/analytics/orders` | **Order Analytics** | Manager, Admin — revenue, popular items, wait times |

---

## 7. Notifications & Real-Time Updates

| Event | Who is Notified | Channel |
|---|---|---|
| New order submitted by customer | Waiter(s) at that location | SSE / polling + sound alert |
| Order confirmed by waiter | Customer (on tracker page) + Kitchen | SSE / polling |
| Order status → `preparing` | Customer | SSE / polling |
| Order status → `ready` | Customer + Waiter (to serve) | SSE / polling + sound alert |
| Order status → `served` | Customer (confirmation) | SSE / polling |
| Bill requested by customer | Waiter + Manager | SSE / polling + sound alert |
| Session closed / payment recorded | Customer (receipt available) | SSE / polling |

- Use **Server-Sent Events (SSE)** for real-time push (simpler than WebSocket, works with Next.js API routes)
- Fallback: polling every 10-15 seconds
- Browser Notification API for push notifications when tab is in background (customer + staff)

---

## 8. Integration with Existing Systems

### 8.1 Floor Plan ↔ Orders
- Table sessions link to `FloorTable` (from the floor plan designer)
- Live table map shows real-time table status derived from active sessions:
  - `available` = no active session
  - `occupied` = open session with at least one order
  - `needs_attention` = has pending order awaiting validation
  - `bill_requested` = customer asked for the bill
- Clicking a table on the floor plan opens the table session detail

### 8.2 Chat ↔ Cart
- Enhance the existing `ChatInterface` to include an **"Add to Cart"** action button in AI responses
- When the AI recommends a dish, render a card with: name, price, allergens, and an "Add to Cart" button
- Clicking "Add to Cart" from chat adds the item to the client-side cart (with default options)
- The customer can then review options in the cart drawer before submitting
- AI can also summarize the current cart if asked ("What's in my cart?")

### 8.3 RBAC ↔ Order Permissions
- Already defined in `permissions.ts`: `orders.read`, `orders.create`, `orders.update`, `orders.delete`
- Already mapped in `roles.ts`:
  - **Chef**: `orders.read`, `orders.update` (status changes only)
  - **Waiter**: `orders.read`, `orders.create`, `orders.update`
  - **Manager**: `orders.read`, `orders.create`, `orders.update`
  - **Admin**: all order permissions
- Add new permissions: `payments.read`, `payments.create`, `feedback.read`, `sessions.read`, `sessions.close`

### 8.4 Menu Data ↔ Order Snapshots
- When an order is placed, **snapshot** the item name, price, and selected options into the `OrderItem`
- This ensures the order record is accurate even if menu prices or names change later
- Use `Item`, `ItemPriceBase`, `OptionItem`, `OptionItemPrice` at the time of order creation

---

## 9. QR Code Generation

- QR codes encode: `https://{domain}/t/{tenantSlug}/l/{locationSlug}/table/{tableLabel}`
- Admin can generate QR codes from the floor plan or table management pages
- QR code includes: restaurant logo (center), table label text below
- Downloadable as PNG/SVG for printing
- Each `FloorTable` has a unique table label per layout — use this as the QR identifier
- QR links should be stable (based on slug + label, not UUIDs) so printed codes remain valid

---

## 10. Implementation Priority

### Phase 1 — Core Ordering (MVP)
1. Prisma models: `Customer`, `TableSession`, `Order`, `OrderItem`
2. QR entry route + table session creation
3. Ordering menu page with "Add to Cart" + cart drawer
4. Submit order API + customer order tracker page
5. Waiter dashboard: incoming orders queue + validate/reject
6. Chef kitchen display: order queue with status updates
7. Waiter: mark order as served

### Phase 2 — Payment & Session Management
1. Prisma models: `Payment`
2. Customer: request bill
3. Manager: close session + record payment
4. Receipt generation
5. Table status resets to available on session close
6. Live table map with real-time status

### Phase 3 — Customer Accounts & History
1. Customer registration/login
2. Order history page
3. Saved favorites
4. Dietary profile auto-applied to menu display

### Phase 4 — Chat Integration + Feedback
1. AI chat "Add to Cart" action buttons
2. Chat-aware cart context ("What's in my cart?")
3. Prisma model: `Feedback`
4. Post-payment feedback form
5. Feedback analytics for managers

### Phase 5 — Advanced Features
1. QR code generator in admin
2. Discount/promotion system
3. Order analytics dashboard
4. Waiter notifications (SSE)
5. Browser push notifications
6. Multi-round ordering UX polish
