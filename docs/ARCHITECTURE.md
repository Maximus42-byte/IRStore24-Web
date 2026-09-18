# IRStore24 Architecture

## 1. Document Status

This document is the Source of Truth for the agreed IRStore24 MVP v1 application architecture.

Implementation should follow this document unless an architectural decision is explicitly revisited and this document is updated.

Production deployment state is documented separately in:

```text
IRStore24-PROJECT-STATE.md
```

---

# 2. Project Overview

IRStore24 is an online storefront for buying and selling:

- CS2 items
- TF2 keys

The MVP business model is intentionally simple:

- Products are manually managed by administrators.
- No Steam API integration is used.
- No automated Steam trade system is used.
- Users register with email and password.
- Users have persistent shopping carts.
- Payment is manual.
- Users receive payment instructions after starting a purchase.
- Users contact IRStore24 through Telegram to complete payment confirmation.
- Administrators manually confirm completed purchases.
- Users may also sell supported items to IRStore24.
- A custom Admin Panel manages the entire store.

---

# 3. Technology Stack

## Frontend

```text
Next.js
React
TypeScript
App Router
```

## Backend

```text
FastAPI
Python
```

## Database

```text
PostgreSQL
```

## Reverse Proxy

```text
Nginx
```

## Deployment

```text
Docker
Docker Compose
Ubuntu Server
```

## Source Control

```text
GitHub
```

---

# 4. High-Level Architecture

```text
                         Internet
                            |
                            v
                    https://irstore24.ir
                            |
                            v
                         Nginx
                   +--------+--------+
                   |                 |
                   v                 v
                Next.js           FastAPI
                 :3000             :8000
                                      |
                                      v
                                  PostgreSQL
                                    :5432

                     Persistent Media Storage
                              |
                              v
                            Nginx
```

Nginx routing:

```text
/          -> Next.js
/api/*     -> FastAPI
/media/*   -> Persistent Media Storage
```

Production application ports must remain private.

Expected public ports:

```text
80   HTTP
443  HTTPS
22   SSH
```

Expected private application ports:

```text
3000  Next.js
8000  FastAPI
5432  PostgreSQL
```

PostgreSQL must not be publicly exposed.

---

# 5. Main Website Navigation

The website has exactly four primary navigation entries:

```text
خانه
آیتم CS2
کلید TF2
پشتیبانی
```

Routes:

```text
/                 Home
/cs2-items        CS2 Items
/tf2-keys         TF2 Keys
/support          Support
```

Cart and Account are separate header actions and are not primary navigation entries.

Example:

```text
IRStore24

خانه | آیتم CS2 | کلید TF2 | پشتیبانی

                          Account   Cart
```

On mobile, the same four navigation entries may appear inside a mobile menu.

---

# 6. Frontend Routes

Public routes:

```text
/

/cs2-items
/cs2-items/[slug]

/tf2-keys

/support

/login
/register
```

Authenticated user routes:

```text
/cart

/account
/account/orders
/account/orders/[order_number]
```

Admin routes:

```text
/admin

/admin/cs2-items
/admin/cs2-items/new
/admin/cs2-items/[id]/edit

/admin/tf2-keys

/admin/orders
/admin/orders/[order_number]

/admin/users
/admin/users/[id]

/admin/settings
```

---

# 7. Home Page

The Home page should remain simple.

Expected structure:

```text
Header

Hero
├── IRStore24 introduction
├── CS2 Store CTA
└── Main visual

Featured / Latest CS2 Items

TF2 Key Section

Support CTA
├── Telegram
└── Instagram

Footer
```

Filtering is not required on the Home page.

Product filtering belongs on:

```text
/cs2-items
```

---

# 8. CS2 Items Domain

CS2 items and TF2 keys are separate product domains.

A CS2 item contains:

```text
id
slug

name
description

weapon
exterior
float_value

stock_quantity

sell_price_amount
sell_price_currency

buy_price_amount
buy_price_currency

image_path

is_active
deleted_at

created_at
updated_at
```

Meaning of prices:

```text
sell_price
=
Price the customer pays to buy the item from IRStore24

buy_price
=
Price IRStore24 pays when buying the item from the customer
```

Supported base currencies:

```text
USDT
TOMAN
```

Each buy/sell price has exactly one administrator-selected base currency.

Example:

```text
sell_price_amount   = 85
sell_price_currency = USDT

buy_price_amount    = 7,400,000
buy_price_currency  = TOMAN
```

---

# 9. CS2 Item Availability

Availability must not be stored as a separate independent boolean.

It is derived from:

```text
available =
    is_active
    AND deleted_at IS NULL
    AND stock_quantity > 0
```

This prevents contradictory states such as:

```text
available = true
stock_quantity = 0
```

---

# 10. CS2 Weapon

`weapon` identifies the weapon associated with the skin.

Examples:

```text
AK-47
AWP
M4A1-S
M4A4
Glock-18
USP-S
Desert Eagle
Karambit
Butterfly Knife
```

The exact supported weapon list will be maintained by the application.

---

# 11. CS2 Exterior

Supported standard exterior values:

```text
Factory New
Minimal Wear
Field-Tested
Well-Worn
Battle-Scarred
```

Admin UI should use a controlled selection instead of arbitrary free-form text where appropriate.

---

# 12. CS2 Float

`float_value` represents the wear float of the CS2 item.

Example:

```text
0.23128412
```

The backend must validate the float value.

The backend may additionally validate consistency between `float_value` and `exterior`.

---

# 13. CS2 Item Detail Page

Route:

```text
/cs2-items/[slug]
```

Expected information:

```text
Image

Name
Weapon
Exterior
Float

Description

Sell Price in Toman
Sell Price in USDT

Buy Price in Toman
Buy Price in USDT

Stock Quantity
Availability

Add to Cart / Buy Action
Sell Action
```

Clicking a CS2 Item Card opens its dedicated item page.

---

# 14. CS2 Item Card

A product card should contain the most useful information without becoming excessively large.

Example:

```text
Image

AK-47 | Redline

Weapon: AK-47
Exterior: Field-Tested
Float: 0.231284

Buy from IRStore24:
8,500,000 Toman
85 USDT

Sell to IRStore24:
7,500,000 Toman
75 USDT

Stock: 3

[ Add to Cart ]
[ Sell ]
```

If stock is zero:

```text
Out of Stock
```

Buying is disabled.

Selling to IRStore24 may remain available.

---

# 15. TF2 Keys Domain

TF2 keys are completely separate from CS2 items.

TF2 keys do not use:

```text
weapon
exterior
float_value
```

TF2 key data:

```text
id

stock_quantity

sell_price_amount
sell_price_currency

buy_price_amount
buy_price_currency

is_active

created_at
updated_at
```

The TF2 Key domain has its own:

```text
Frontend page
Backend endpoints
Admin management
Database table
```

Route:

```text
/tf2-keys
```

---

# 16. Shared Cart

Although CS2 items and TF2 keys are separate product domains, both may exist inside the same user cart.

Example:

```text
Cart

AK-47 | Redline x 1
AWP | Asiimov x 1
TF2 Key x 5
```

---

# 17. Central Currency Conversion

The store uses a centrally managed conversion rate:

```text
1 USDT = X TOMAN
```

Example:

```text
1 USDT = 98,500 TOMAN
```

The administrator controls this rate.

The application does not currently require an external automatic exchange-rate API.

---

# 18. Product Pricing

For every CS2 item or TF2 key, the administrator can choose whether the primary price is entered in:

```text
USDT
```

or:

```text
TOMAN
```

Example:

```text
Sell Price

Amount:
85

Currency:
USDT

Calculated:
8,372,500 TOMAN
```

Or:

```text
Sell Price

Amount:
8,500,000

Currency:
TOMAN

Calculated:
86.29 USDT
```

The same applies to the store buy price.

---

# 19. Pricing Source of Truth

Only the administrator-selected base price is stored as the product price.

Example:

```text
sell_price_amount
sell_price_currency

buy_price_amount
buy_price_currency
```

The equivalent currency is dynamically calculated using the current central exchange rate.

This means changing:

```text
1 USDT = 98,500 TOMAN
```

to:

```text
1 USDT = 101,000 TOMAN
```

immediately changes the calculated equivalent prices for current products and carts.

No mass product update is required.

---

# 20. Pricing Security

Frontend price calculations are only previews.

FastAPI is authoritative.

The backend must never trust:

```text
price
total
exchange rate
calculated amount
```

submitted by the browser.

All authoritative values must be calculated server-side.

---

# 21. Store Settings

Store-wide configuration is stored centrally.

Conceptual table:

```text
store_settings
--------------------------------
id

usdt_toman_rate

card_number
card_holder_name

telegram_username
telegram_url

instagram_url

order_reservation_minutes

updated_at
updated_by
```

Default reservation duration:

```text
120 minutes
```

Administrators may change this value.

---

# 22. Payment Settings

MVP v1 does not use an automated payment gateway.

Administrators configure:

```text
Card Number
Card Holder Name
Telegram Contact
```

These values are shown to the user after a purchase has been started.

The purchase page may show:

```text
Order #IR-10427

Total:
9,850,000 Toman
100 USDT

Card Number:
6037-....-....-....

Card Holder:
...

After payment:
Contact IRStore24 on Telegram

Time Remaining:
01:42:18
```

---

# 23. Support Channels

Current supported contact channels:

```text
Telegram
Instagram
```

Telegram is used for purchase/payment coordination.

Instagram is available as a general support/contact channel.

---

# 24. Users

User data:

```text
users
--------------------------------
id

email
password_hash

role
is_active

is_banned
ban_type
banned_until
ban_reason
banned_at
banned_by

created_at
updated_at
```

Supported roles:

```text
user
admin
```

Plain-text passwords must never be stored.

---

# 25. Registration

Registration requires:

```text
Email
Password
Confirm Password
```

The backend receives:

```text
email
password
```

Password confirmation is primarily a frontend validation concern, although backend validation still applies to the password itself.

---

# 26. Login

Login requires:

```text
Email
Password
```

Successful login creates a server-managed session.

---

# 27. Password Storage

Passwords must be stored only as secure password hashes.

Never store:

```text
plain password
encrypted reversible password
password inside logs
password inside Git
```

---

# 28. User Sessions

Authentication uses server-managed sessions.

Conceptual session table:

```text
user_sessions
--------------------------------
id
user_id

session_token_hash

created_at
expires_at
last_used_at

revoked_at
```

The raw session token must never be stored in PostgreSQL.

Only a hash of the token is stored.

---

# 29. Authentication Cookie

The browser receives the authentication credential through a secure cookie.

Required properties include:

```text
HttpOnly
Secure
SameSite
```

Authentication tokens must not be stored in:

```text
localStorage
sessionStorage
```

---

# 30. Authentication Validation

Protected requests follow this conceptual validation flow:

```text
Request
   |
   v
Session valid?
   |
   v
User exists?
   |
   v
User active?
   |
   v
User banned?
   |
   v
Role allowed?
   |
   v
Allow request
```

Authorization must be enforced by FastAPI.

Frontend route hiding alone is not a security control.

---

# 31. Ban System

The application supports:

```text
Temporary Ban
Permanent Ban
```

Temporary ban:

```text
is_banned = true
ban_type = temporary
banned_until = timestamp
```

Permanent ban:

```text
is_banned = true
ban_type = permanent
banned_until = NULL
```

---

# 32. Ban Administration

Administrators can:

```text
Ban User Temporarily
Ban User Permanently
Specify Ban Reason
Specify Custom Duration
Change Ban Duration
Unban User
Deactivate User
```

Example durations:

```text
2 hours
1 day
7 days
30 days
45 days
Custom
Permanent
```

---

# 33. Ban Enforcement

When an administrator bans or deactivates a user:

```text
Ban / Deactivate
       |
       v
Revoke all active sessions
       |
       v
Immediate loss of authenticated access
```

A banned user may still:

```text
Browse public pages
View products
View prices
```

A banned user may not:

```text
Use cart
Start a purchase
Sell through authenticated flow
Use account features
Perform authenticated operations
```

---

# 34. Admin Self-Protection

An administrator must not accidentally:

```text
Ban themselves
Deactivate themselves
```

If multiple administrator levels are later required, a stronger role such as `owner` may be introduced.

This is not required for MVP v1.

---

# 35. User Account

Route:

```text
/account
```

Account area includes:

```text
Email
Account Status
Active Orders
Previous Orders
Logout
```

Order history:

```text
/account/orders
```

Order details:

```text
/account/orders/[order_number]
```

---

# 36. Shopping Cart

Every authenticated user has one persistent cart.

Conceptual tables:

```text
carts
cart_cs2_items
cart_tf2_keys
```

Main cart:

```text
carts
--------------------------------
id
user_id
created_at
updated_at
```

`user_id` is unique so one user has one active cart.

---

# 37. CS2 Cart Items

```text
cart_cs2_items
--------------------------------
id
cart_id
cs2_item_id
quantity
created_at
updated_at
```

---

# 38. TF2 Cart Items

```text
cart_tf2_keys
--------------------------------
id
cart_id
tf2_key_id
quantity
created_at
updated_at
```

---

# 39. Cart Data Rules

The cart stores:

```text
Product Reference
Quantity
```

The cart does not store historical prices.

Prices shown in the cart are dynamically calculated using:

```text
Current Product Price
+
Current USDT/Toman Rate
```

---

# 40. Live Cart Pricing

Example:

```text
09:00

User adds:
AK-47 | Redline

Current price:
80 USDT
```

Later:

```text
12:00

Admin changes price:
100 USDT
```

When the user opens the cart:

```text
Displayed price:
100 USDT
```

Adding a product to the cart does not lock its price.

---

# 41. Cart and Inventory

Adding a product to the cart does not reserve inventory.

Example:

```text
Current stock:
3

User adds quantity:
2

Database stock remains:
3
```

Stock is only reserved when the user starts the purchase.

---

# 42. Cart Quantity Validation

Frontend may prevent obviously invalid quantities.

However, FastAPI performs authoritative validation.

The backend checks:

```text
quantity > 0
product exists
product is active
product is not deleted
requested quantity is valid
```

Final inventory validation occurs when the purchase starts.

---

# 43. Purchase Action

The user-facing action is called:

```text
خرید
```

Internally, this converts the current cart into a pending order.

The browser must not send trusted price information.

---

# 44. Purchase Flow

When the user presses:

```text
خرید
```

FastAPI performs:

```text
Load User Cart
       |
       v
Validate Session
       |
       v
Validate User Status
       |
       v
Check Ban Status
       |
       v
Lock Relevant Product Rows
       |
       v
Validate Current Stock
       |
       v
Read Current Product Prices
       |
       v
Read Current USDT/Toman Rate
       |
       v
Calculate Final Prices
       |
       v
Reduce Inventory
       |
       v
Create Pending Order
       |
       v
Lock Order Prices
       |
       v
Set Expiration Time
       |
       v
Clear Purchased Cart Entries
       |
       v
COMMIT
```

The entire operation must be atomic.

---

# 45. Concurrent Purchases

The backend must prevent two users from purchasing inventory that does not exist.

PostgreSQL row-level locking should be used where appropriate.

Conceptually:

```text
SELECT ... FOR UPDATE
```

The final implementation may use SQLAlchemy equivalents.

---

# 46. Price Locking

Prices remain live while products are only in the cart.

At the moment the user starts the purchase:

```text
Current product prices
+
Current USDT/Toman rate
```

are locked into the order.

Example:

```text
09:00
Add to Cart
Price = 80 USDT

12:00
Admin changes price
Price = 100 USDT

12:30
User presses Buy

Order price = 100 USDT
```

Later:

```text
13:00

Admin changes product price:
120 USDT
```

The existing pending order remains:

```text
100 USDT
```

---

# 47. Exchange Rate Locking

The current exchange rate is also locked when the purchase starts.

Example:

```text
1 USDT = 98,500 TOMAN
```

The order stores this rate.

If the administrator later changes the rate:

```text
1 USDT = 102,000 TOMAN
```

the existing order does not change.

---

# 48. Inventory Reservation

Inventory is reduced when the purchase starts.

Example:

```text
Stock before purchase:
3

User purchases:
2

Stock after purchase starts:
1
```

The pending order represents the reservation.

A separate reservation table is not required for MVP v1.

---

# 49. Reservation Duration

Default reservation duration:

```text
120 minutes
```

Administrators can change this setting.

When an order is created:

```text
expires_at =
created_at + current order_reservation_minutes
```

The resulting `expires_at` is stored in the order.

---

# 50. Reservation Setting Changes

Changing:

```text
order_reservation_minutes
```

only affects new purchases.

Example:

```text
Current setting:
120 minutes

Order A created
Expires in 120 minutes
```

Admin changes setting:

```text
60 minutes
```

Order A remains unchanged.

Order B created afterward:

```text
Expires in 60 minutes
```

---

# 51. Manual Payment Process

After the purchase starts:

```text
Order Status = pending
```

The user receives:

```text
Order Number
Products
Locked Prices
Total Toman Amount
Total USDT Amount
Card Number
Card Holder Name
Telegram Contact
Expiration Time
Remaining Time
```

The user transfers payment manually.

The user then contacts IRStore24 through Telegram.

An administrator verifies the transaction.

---

# 52. Order Statuses

Supported statuses:

```text
pending
confirmed
cancelled
expired
```

Allowed transitions:

```text
pending -> confirmed
pending -> cancelled
pending -> expired
```

Invalid transitions include:

```text
confirmed -> cancelled
confirmed -> expired

cancelled -> confirmed
cancelled -> expired

expired -> confirmed
expired -> cancelled
```

---

# 53. Confirmed Order

When an administrator confirms payment:

```text
pending -> confirmed
```

Inventory must not be reduced again.

It was already reduced when the purchase started.

---

# 54. Cancelled Order

If a pending order is cancelled:

```text
pending -> cancelled
```

all reserved quantities are returned to inventory.

Example:

```text
Stock after reservation:
1

Reserved quantity:
2

Order cancelled

New stock:
3
```

---

# 55. Expired Order

If the reservation expires:

```text
pending -> expired
```

all reserved quantities are returned to inventory.

---

# 56. Order Expiration Job

A lightweight backend job periodically checks:

```text
status = pending
AND expires_at <= NOW()
```

Matching orders are expired.

The expiration operation must:

```text
Lock Order
Validate Current Status
Change pending -> expired
Return Reserved Stock
Commit Transaction
```

---

# 57. Idempotency

Stock-return operations must be idempotent.

The application must never return stock twice.

For example:

```text
pending -> expired
```

returns inventory once.

A second expiration attempt must do nothing.

Likewise:

```text
pending -> cancelled
```

returns stock once.

---

# 58. Orders Table

Conceptual structure:

```text
orders
--------------------------------
id
order_number
user_id

status

locked_usdt_toman_rate

total_price_toman
total_price_usdt

created_at
expires_at

confirmed_at
confirmed_by

cancelled_at
cancelled_by

expired_at
```

`order_number` is the user-facing order identifier.

Example:

```text
IR-10427
```

---

# 59. CS2 Order Items

CS2 order lines are stored separately.

```text
order_cs2_items
--------------------------------
id
order_id
cs2_item_id

name
weapon
exterior
float_value

quantity

unit_price_toman
unit_price_usdt
```

These values form a purchase-time snapshot.

---

# 60. TF2 Order Items

TF2 order lines are stored separately.

```text
order_tf2_keys
--------------------------------
id
order_id
tf2_key_id

quantity

unit_price_toman
unit_price_usdt
```

---

# 61. Order Snapshots

Product price and relevant product information are copied into order rows when the purchase starts.

This preserves order history even if the catalog changes later.

For example:

```text
Order created:
AK-47 | Redline
100 USDT
```

Later the catalog item is:

```text
Renamed
Price changed
Hidden
Soft deleted
```

The original order remains unchanged.

---

# 62. Public CS2 API

```text
GET /api/cs2-items

GET /api/cs2-items/{slug}
```

Supported filtering may include:

```text
search
weapon
exterior
min_float
max_float
min_price
max_price
available
page
page_size
sort
```

Example:

```text
GET /api/cs2-items?weapon=AWP&available=true&sort=price_asc&page=1&page_size=24
```

Only active and non-deleted catalog items are publicly returned.

---

# 63. Public TF2 API

```text
GET /api/tf2-keys
```

The returned price includes calculated values in both:

```text
TOMAN
USDT
```

---

# 64. Public Store Settings API

A limited public settings endpoint may expose information required by the storefront.

Example:

```text
GET /api/store/settings/public
```

It may return safe public values such as:

```text
Current USDT/Toman Rate
Telegram Contact
Instagram Contact
```

Payment card details do not need to be exposed through the generic public settings endpoint.

They are returned as part of an authenticated pending purchase where required.

---

# 65. Authentication API

```text
POST /api/auth/register

POST /api/auth/login

POST /api/auth/logout

GET /api/auth/me
```

`/api/auth/me` returns the currently authenticated user based on the session.

---

# 66. Authentication Error Handling

Authentication errors should avoid unnecessary account enumeration.

For example, login should not reveal whether:

```text
Email exists but password is incorrect
```

versus:

```text
Email does not exist
```

A generic authentication failure response is preferred.

---

# 67. Account API

Authenticated user endpoints:

```text
GET /api/account

GET /api/account/orders

GET /api/account/orders/{order_number}

POST /api/account/orders/{order_number}/cancel

POST /api/account/change-password
```

The backend determines the user from the authenticated session.

The client must not provide a trusted `user_id`.

---

# 68. Account Authorization

Do not use URLs such as:

```text
/api/users/125/orders
```

for normal user account access.

Prefer:

```text
/api/account/orders
```

The session determines ownership.

This reduces IDOR-style authorization risks.

---

# 69. Cart API

Authenticated endpoints:

```text
GET /api/cart
```

CS2:

```text
POST   /api/cart/cs2-items
PATCH  /api/cart/cs2-items/{cs2_item_id}
DELETE /api/cart/cs2-items/{cs2_item_id}
```

TF2:

```text
POST   /api/cart/tf2-keys
PATCH  /api/cart/tf2-keys/{tf2_key_id}
DELETE /api/cart/tf2-keys/{tf2_key_id}
```

---

# 70. Purchase API

The internal purchase-start endpoint:

```text
POST /api/orders/finalize
```

The UI labels this action:

```text
خرید
```

The request must not contain authoritative prices.

FastAPI reads the cart and calculates all values itself.

---

# 71. User Order Cancellation

Pending orders may be cancelled by the owner:

```text
POST /api/account/orders/{order_number}/cancel
```

Only:

```text
pending
```

orders may be cancelled.

Cancelling returns reserved inventory.

---

# 72. Admin Authorization

Every `/api/admin/*` request requires:

```text
Authenticated User
AND
role = admin
AND
is_active = true
AND
not currently banned
```

FastAPI enforces these conditions.

---

# 73. Admin Dashboard

Route:

```text
/admin
```

Dashboard may display:

```text
Total Users
Active Users
Banned Users

Total CS2 Items
Available CS2 Items
Out-of-Stock CS2 Items

TF2 Key Stock

Pending Orders
Confirmed Orders

Current USDT/Toman Rate
Current Reservation Duration
```

---

# 74. Admin CS2 Routes

Frontend:

```text
/admin/cs2-items

/admin/cs2-items/new

/admin/cs2-items/[id]/edit
```

Admin can manage:

```text
Name
Slug
Description

Weapon
Exterior
Float

Stock

Sell Price
Sell Price Currency

Buy Price
Buy Price Currency

Image

Visibility
```

---

# 75. Admin CS2 API

```text
GET /api/admin/cs2-items

GET /api/admin/cs2-items/{id}

POST /api/admin/cs2-items

PATCH /api/admin/cs2-items/{id}

DELETE /api/admin/cs2-items/{id}

POST /api/admin/cs2-items/{id}/restore
```

Delete uses soft deletion.

---

# 76. Soft Delete

CS2 products are not immediately physically deleted.

Deleting sets:

```text
deleted_at = CURRENT_TIMESTAMP
```

Restoring clears the deletion marker.

Historical order data remains unaffected.

---

# 77. Admin TF2 Routes

Frontend:

```text
/admin/tf2-keys
```

Administrators manage:

```text
Stock Quantity

Sell Price
Sell Price Currency

Buy Price
Buy Price Currency

Active Status
```

---

# 78. Admin TF2 API

```text
GET /api/admin/tf2-keys

GET /api/admin/tf2-keys/{id}

POST /api/admin/tf2-keys

PATCH /api/admin/tf2-keys/{id}
```

For MVP, the storefront is expected to use one primary active TF2 Key product, while the schema does not unnecessarily prevent future expansion.

---

# 79. Admin User Routes

```text
/admin/users

/admin/users/[id]
```

Admin user list may display:

```text
Email
Role
Account Status
Ban Status
Ban Expiration
Created At
```

---

# 80. Admin User Filtering

Supported filters may include:

```text
search
role
status
ban_status
```

Examples:

```text
active
inactive

not_banned
temporary
permanent
```

---

# 81. Admin User API

```text
GET /api/admin/users

GET /api/admin/users/{id}

PATCH /api/admin/users/{id}/status

POST /api/admin/users/{id}/ban

POST /api/admin/users/{id}/unban
```

---

# 82. Admin Ban Request

Temporary ban example:

```json
{
  "type": "temporary",
  "duration_minutes": 10080,
  "reason": "Spam"
}
```

Permanent ban example:

```json
{
  "type": "permanent",
  "reason": "Fraud attempt"
}
```

---

# 83. Admin Orders

Frontend:

```text
/admin/orders

/admin/orders/[order_number]
```

Order list filters may include:

```text
status
user
order_number
date range
```

Supported statuses:

```text
pending
confirmed
cancelled
expired
```

---

# 84. Admin Order Details

Example:

```text
Order #IR-10427

User:
user@example.com

Status:
PENDING

Created:
14:00

Expires:
16:00

Remaining:
01:23:18

--------------------------------

AK-47 | Redline x 1

TF2 Key x 5

--------------------------------

Total:
100 USDT
9,850,000 TOMAN

[ Confirm Payment ]
[ Cancel Order ]
```

---

# 85. Admin Order API

```text
GET /api/admin/orders

GET /api/admin/orders/{order_number}

POST /api/admin/orders/{order_number}/confirm

POST /api/admin/orders/{order_number}/cancel
```

Only pending orders may be confirmed or cancelled.

---

# 86. Admin Order Confirmation

Confirmation performs:

```text
Lock Order
Check status = pending
Set status = confirmed
Set confirmed_at
Set confirmed_by
Commit
```

Inventory does not change.

---

# 87. Admin Order Cancellation

Cancellation performs:

```text
Lock Order
Check status = pending
Lock relevant products
Return reserved quantities
Set status = cancelled
Set cancelled_at
Set cancelled_by
Commit
```

This must be transactional.

---

# 88. Admin Settings Route

Frontend:

```text
/admin/settings
```

Administrators manage:

```text
USDT/Toman Rate

Card Number
Card Holder Name

Telegram Username / URL
Instagram URL

Order Reservation Duration
```

---

# 89. Admin Settings API

```text
GET /api/admin/settings

PATCH /api/admin/settings
```

Validation includes at minimum:

```text
usdt_toman_rate > 0

order_reservation_minutes > 0
```

Additional validation should be added where appropriate.

---

# 90. Admin Panel Structure

```text
Admin
|
+-- Dashboard
|
+-- CS2 Items
|   |
|   +-- List
|   +-- Add
|   +-- Edit
|   +-- Stock
|   +-- Buy Price
|   +-- Sell Price
|   +-- Visibility
|   +-- Soft Delete
|
+-- TF2 Keys
|   |
|   +-- Stock
|   +-- Buy Price
|   +-- Sell Price
|
+-- Orders
|   |
|   +-- Pending
|   +-- Confirmed
|   +-- Cancelled
|   +-- Expired
|
+-- Users
|   |
|   +-- View
|   +-- Activate / Deactivate
|   +-- Temporary Ban
|   +-- Permanent Ban
|   +-- Unban
|
+-- Settings
    |
    +-- USDT Rate
    +-- Card Information
    +-- Telegram
    +-- Instagram
    +-- Reservation Duration
```

---

# 91. Database Tables

The current conceptual database contains:

```text
users
user_sessions

cs2_items
tf2_keys

store_settings

carts
cart_cs2_items
cart_tf2_keys

orders
order_cs2_items
order_tf2_keys
```

---

# 92. Database Relationships

Conceptual relationships:

```text
users
 |
 +---- user_sessions
 |
 +---- carts
 |       |
 |       +---- cart_cs2_items ---- cs2_items
 |       |
 |       +---- cart_tf2_keys ----- tf2_keys
 |
 +---- orders
         |
         +---- order_cs2_items
         |
         +---- order_tf2_keys
```

Admin references may also point to:

```text
users.id
```

for fields such as:

```text
banned_by
updated_by
confirmed_by
cancelled_by
```

---

# 93. PostgreSQL Data-Type Guidance

Exact migrations will be finalized during implementation.

Expected types include:

```text
BIGINT / IDENTITY
TEXT
VARCHAR
BOOLEAN
NUMERIC
TIMESTAMPTZ
```

Monetary and exchange-rate values must use fixed-point decimal types such as PostgreSQL:

```text
NUMERIC
```

They must not use floating-point types for authoritative currency calculations.

---

# 94. Backend Architecture

The backend remains one modular FastAPI application.

No microservices are required for MVP v1.

Proposed structure:

```text
backend/
|
+-- app/
|   |
|   +-- main.py
|   |
|   +-- api/
|   |   |
|   |   +-- auth.py
|   |   +-- account.py
|   |   +-- cs2_items.py
|   |   +-- tf2_keys.py
|   |   +-- cart.py
|   |   +-- orders.py
|   |   |
|   |   +-- admin/
|   |       +-- cs2_items.py
|   |       +-- tf2_keys.py
|   |       +-- orders.py
|   |       +-- users.py
|   |       +-- settings.py
|   |
|   +-- models/
|   |
|   +-- schemas/
|   |
|   +-- services/
|   |
|   +-- db/
|   |
|   +-- auth/
|   |
|   +-- core/
|
+-- ...
```

The exact filenames may evolve during implementation without changing the architectural boundaries.

---

# 95. Backend Responsibilities

FastAPI is responsible for:

```text
Authentication
Session Management

Authorization
Ban Enforcement

CS2 Catalog
TF2 Catalog

Price Calculation
Currency Conversion

Cart Management

Purchase Creation

Inventory Reservation

Order Expiration

Order Confirmation
Order Cancellation

Admin Management

Database Transactions
```

---

# 96. Frontend Responsibilities

Next.js is responsible for:

```text
Public Storefront

Home Page
CS2 Listing
CS2 Detail

TF2 Key Page

Support Page

Login
Registration

Cart UI

Account UI
Order UI

Admin UI

User Interaction
Frontend Validation
Price Preview
Countdown Display
```

Next.js is not authoritative for:

```text
Prices
Inventory
Authentication Authorization
Order Status
Expiration
Ban Status
```

---

# 97. Countdown Handling

Frontend may display a countdown using:

```text
expires_at
```

received from the backend.

However, the browser is not authoritative for expiration.

The backend determines whether an order is actually expired.

---

# 98. Media Storage

CS2 item images require persistent storage.

Images must not depend on disposable Docker container layers.

Conceptual production storage:

```text
Persistent Host Storage
        |
        v
/media/*
        |
        v
Nginx
```

The exact production directory will be established during deployment implementation.

---

# 99. Image References

Database records store a path/reference such as:

```text
image_path
```

Example:

```text
/media/cs2/ak47-redline.webp
```

The exact upload and filename strategy will be determined during implementation.

---

# 100. Security Principles

The application follows these core principles:

```text
Never store plain-text passwords.

Never store raw session tokens in PostgreSQL.

Never put authentication tokens in localStorage.

Use secure HttpOnly cookies.

Validate authorization in FastAPI.

Never trust browser-submitted prices.

Never trust browser-submitted totals.

Never trust browser-submitted exchange rates.

Perform inventory changes transactionally.

Lock inventory rows during purchase creation.

Validate order state transitions server-side.

Make stock restoration idempotent.

Do not publicly expose PostgreSQL.

Keep production application ports behind Nginx.

Never commit secrets to Git.

Use environment variables for secrets.

Preserve current production availability during deployment.

Avoid security changes that could cause SSH lockout.
```

---

# 101. Secrets

Secrets must never be committed to GitHub.

Examples:

```text
Database Password
Session Secret
API Secret
Private Keys
Access Tokens
Credentials
```

Environment-specific values must use environment variables or appropriate secret files.

Files containing secrets must be excluded by `.gitignore`.

---

# 102. PostgreSQL Exposure

PostgreSQL must communicate only through the required internal application network.

Production must not expose PostgreSQL directly to the public Internet unless a future explicit requirement justifies it.

---

# 103. Docker Services

The expected future Docker Compose architecture contains:

```text
web
api
db
```

Where:

```text
web = Next.js

api = FastAPI

db = PostgreSQL
```

Host Nginx remains the public reverse proxy.

---

# 104. Production Request Flow

Public page request:

```text
Browser
   |
   v
Nginx
   |
   v
Next.js
```

API request:

```text
Browser
   |
   v
Nginx
   |
   v
FastAPI
   |
   v
PostgreSQL
```

Media request:

```text
Browser
   |
   v
Nginx
   |
   v
Persistent Media Storage
```

---

# 105. Development Workflow

Development happens locally.

Standard flow:

```text
Local Computer
      |
      v
Feature Branch
      |
      v
Development
      |
      v
Local Testing
      |
      v
Git Commit
      |
      v
GitHub
      |
      v
Production Deployment
```

Production should not be used as the primary development environment.

---

# 106. Current Development Branch

Current storefront development branch:

```text
feature/storefront-mvp
```

The existing production Under Construction page remains stable until the new storefront is ready for deployment.

---

# 107. Deployment Principle

Deployment should happen only after a version has been:

```text
Developed locally
Tested locally
Committed
Pushed to GitHub
Reviewed sufficiently for deployment
```

Production then receives the tested version.

---

# 108. MVP v1 Non-Goals

The following are intentionally outside MVP v1:

```text
Steam API Integration

Automatic Steam Trading

Automatic Steam Inventory Sync

Automated Payment Gateway

Automatic Bank Payment Verification

Automatic Cryptocurrency Payment Processing

IP-Based User Bans

Microservices

Complex Multi-Level Admin Roles

Automatic Currency API

Redis Requirement

Kubernetes

Steam Login

OAuth Login

Guest Checkout
```

These features may be reconsidered later if actual requirements justify them.

---

# 109. Future Expansion Possibilities

The architecture should allow future additions without requiring unnecessary complexity today.

Possible future features include:

```text
Steam API Integration

Steam Authentication

Automated Trades

Automated Payment Gateway

Additional Payment Methods

Automated USDT/Toman Rate Provider

Multiple Product Images

Favorites / Wishlist

Advanced Order History

User Notifications

Email Verification

Password Reset

2FA

Additional Admin Roles

Audit Logs

More Product Categories

Object Storage

Redis
```

None of these are required for MVP v1.

---

# 110. Core Business Flow Summary

The primary purchase flow is:

```text
Visitor
   |
   v
Browse Store
   |
   v
Register / Login
   |
   v
Add Products to Cart
   |
   v
Cart Shows Live Prices
   |
   v
User Presses "Buy"
   |
   v
Backend Recalculates Current Prices
   |
   v
Backend Checks Inventory
   |
   v
Backend Locks Inventory
   |
   v
Stock Is Reduced
   |
   v
Price Is Locked
   |
   v
Pending Order Created
   |
   v
Payment Instructions Displayed
   |
   v
User Pays
   |
   v
User Contacts Telegram
   |
   +-----------------------------+
   |                             |
   v                             v
Admin Confirms                Timeout / Cancel
   |                             |
   v                             v
confirmed                 cancelled / expired
                                 |
                                 v
                          Inventory Restored
```

---

# 111. Product Selling Flow

For selling an item to IRStore24:

```text
User Views Supported Item
        |
        v
Current IRStore24 Buy Price Displayed
        |
        v
User Presses Sell
        |
        v
Authentication / Ban Check
        |
        v
Telegram Coordination
```

A separate sell-cart system is not required for MVP v1.

---

# 112. Main Architectural Principles

IRStore24 MVP v1 should remain:

```text
Simple
Maintainable
Secure
Transactional
Modular
Production-Friendly
Easy to Extend
```

Avoid introducing infrastructure or abstractions that are not currently required.

---

# 113. Final MVP Architecture

```text
                           Internet
                              |
                              v
                      https://irstore24.ir
                              |
                              v
                           Nginx
                  +-----------+-----------+
                  |                       |
                  v                       v
               Next.js                 FastAPI
                  |                       |
                  |                       |
                  |              +--------+---------+
                  |              |        |         |
                  |              v        v         v
                  |            Auth     Store     Orders
                  |              |        |         |
                  |              +--------+---------+
                  |                       |
                  |                       v
                  |                  PostgreSQL
                  |
                  v
             User Interface

                     Persistent Media Storage
                              |
                              v
                            Nginx
```

---

# 114. Architecture Status

Status:

```text
IRStore24 MVP v1 Architecture
APPROVED
```

The architecture agreed in this document covers:

```text
Frontend
Backend
Database
Authentication
Sessions
User Accounts
User Bans
CS2 Items
TF2 Keys
Pricing
USDT/Toman Conversion
Shopping Cart
Inventory
Manual Payment
Orders
Order Reservation
Order Expiration
Admin Panel
Media Storage
Deployment Boundaries
Security Principles
```

Implementation should now proceed incrementally using this document as the application architecture reference.