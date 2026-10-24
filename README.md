# IRStore24

IRStore24 is a storefront for Counter-Strike 2 (CS2) items and Team Fortress 2 (TF2) keys. Customers browse current inventory, build a persistent cart, and start an order. Checkout reserves stock and shows instructions for manual payment; an administrator verifies payment and confirms the order. The MVP does not integrate a Steam trade API or an automated payment gateway.

The [architecture document](docs/ARCHITECTURE.md) is the source of truth for the MVP design.

## Contents

- [Project status](#project-status)
- [Features](#features)
- [Technology stack](#technology-stack)
- [System architecture](#system-architecture)
- [Repository structure](#repository-structure)
- [Prerequisites](#prerequisites)
- [Local development](#local-development)
- [Authentication and API proxy](#authentication-and-api-proxy)
- [Application routes](#application-routes)
- [API overview](#api-overview)
- [Database and migrations](#database-and-migrations)
- [Administrator bootstrap](#administrator-bootstrap)
- [Product images and media](#product-images-and-media)
- [Order lifecycle](#order-lifecycle)
- [Order expiration](#order-expiration)
- [Testing and quality checks](#testing-and-quality-checks)
- [Deployment status](#deployment-status)
- [Security notes](#security-notes)
- [Troubleshooting](#troubleshooting)
- [Project documentation](#project-documentation)
- [Roadmap](#roadmap)

## Project status

| Area | Current state |
| --- | --- |
| Application | Next.js storefront and FastAPI backend implement the MVP flows described below. |
| Local validation | Authenticated browser journeys, purchases, inventory transitions, administration, the production build, TypeScript, frontend and backend tests, and Alembic drift checks passed in an isolated local environment. See [E2E validation](docs/E2E_VALIDATION.md). |
| Deployment | Production readiness is **not confirmed**. The last documented live site is an Under Construction deployment; the current VPS state was not verified during local validation. The tracked deployment files do not yet route production API and media requests or start a FastAPI service. |

Local success does not establish that payments, HTTPS sessions, media delivery, or order expiration are working in Production.

## Features

| Area | Implemented behavior |
| --- | --- |
| Storefront | CS2 catalog and slug-based details; name and weapon search; weapon, exterior, float, price, and availability filters; sorting and pagination. TF2 key listings show stock and buy/sell prices. Product availability follows current stock and visibility. An administrator-configured USDT/Toman rate supplies converted prices; no external exchange-rate feed is used. |
| Authentication | Email/password registration and login, server-managed sessions, password changes, account deactivation, and temporary or permanent bans. Restrictions revoke sessions. |
| Shopping and orders | Persistent carts containing CS2 items and TF2 keys, quantity changes, server-calculated checkout, transactional stock reservation, pending-order payment instructions, order history, cancellation, confirmation, and expiration with stock restoration. |
| Administration | Dashboard, CS2 creation/editing/hiding/soft deletion/restoration, TF2 key management, exchange-rate and payment/contact settings, user restrictions, and pending-order confirmation or cancellation. |

## Technology stack

| Layer | Technology | Purpose |
| --- | --- | --- |
| Frontend | Next.js 16, React, TypeScript | App Router pages and browser interactions |
| Backend | Python, FastAPI | HTTP API, authorization, pricing, and order rules |
| Database | PostgreSQL 17 in the tracked Compose service | Persistent store, account, cart, and order data |
| ORM | SQLAlchemy 2 | Models and transactional database access |
| Migrations | Alembic | Versioned schema changes |
| Reverse proxy | Nginx (target architecture) | Same-origin routing and HTTPS termination |
| Containerization | Docker, Docker Compose | Tracked web and database services; API service remains deployment work |
| Deployment OS | Ubuntu Server (target) | Intended production host |

## System architecture

The intended production request path is:

```text
Browser (HTTPS)
    |
    v
Nginx
    |-- /         --> Next.js :3000
    |-- /api/*    --> FastAPI :8000 --> PostgreSQL :5432
    `-- /media/*  --> persistent media storage
```

The API, database, and application ports should remain private behind the reverse proxy. This is the [target architecture](docs/ARCHITECTURE.md), **not the current tracked deployment configuration**: the tracked Nginx file forwards all paths to Next.js, Compose defines only `web` and `db`, and production Next.js has no `/api/*` rewrite. Local development uses the Next.js development proxy instead.

## Repository structure

```text
app/                        Next.js App Router pages and layouts
components/                 Storefront, admin, and shared UI components
lib/                        Browser API client, session state, and links
public/                     Static frontend assets
backend/
  app/
    api/                    FastAPI route handlers and dependencies
    core/                   Configuration, database, and security helpers
    models/                 SQLAlchemy table models
    schemas/                Request and response models
    services/               Authentication, cart, pricing, and order logic
    jobs/                   Pending-order expiration command
  alembic/                  Migration environment and revisions
  tests/                    Backend and PostgreSQL integration tests
tests/                      Frontend and browser E2E tests
docs/                       Architecture and operating notes
```

## Prerequisites

- Git.
- Node.js and npm. The tracked Dockerfile uses Node.js 22; using the same major version locally is a practical choice. `package-lock.json` supports `npm ci`.
- Python **3.10 or newer**, with `venv` and `pip` available. The backend declares `requires-python = ">=3.10"` in `backend/pyproject.toml`.
- Docker Engine and Docker Compose for the local PostgreSQL service.

A host-level PostgreSQL installation is unnecessary for this workflow. On systems where Docker commands require elevated privileges, use `sudo` as shown below.

## Local development

These steps assume a fresh checkout. Keep PostgreSQL, FastAPI, and Next.js running as **three separate local components**.

### 1. Clone and select the development branch

```bash
git clone https://github.com/Maximus42-byte/IRStore24-Web.git
cd IRStore24-Web
git switch feature/storefront-mvp
```

The branch is the current MVP development line. Review its status before using any deployment instructions.

### 2. Install frontend and backend dependencies

From the repository root:

```bash
npm ci
python3 --version
python3 -m venv backend/.venv
backend/.venv/bin/python -m pip install -e './backend[dev]'
```

Use a Python 3 interpreter that reports version 3.10 or newer. The `dev` extra installs backend test dependencies. If `backend/.venv` already exists, reuse it and run its `bin/python`; activation is optional. Do not recreate an existing working environment as a routine fix.

### 3. Configure the local environment

```bash
cp .env.example .env
```

Edit the new `.env` before starting the database. Replace the sample database password with a strong **local** value. For browser testing over local HTTP, set:

```text
APP_ENV=development
AUTH_COOKIE_SECURE=false
AUTH_ALLOWED_ORIGINS=["http://localhost:3000"]
```

The allowed-origins value is a JSON list as parsed by Pydantic Settings. Keep browser navigation on `http://localhost:3000`; mixing `localhost` and `127.0.0.1` in browser URLs can prevent the session cookie or exact Origin check from matching. FastAPI itself still listens on `127.0.0.1:8000`.

| Variable | Required? | Use and default |
| --- | --- | --- |
| `POSTGRES_DB` | Yes | Database name for Compose and FastAPI. |
| `POSTGRES_USER` | Yes | Database user for Compose and FastAPI. |
| `POSTGRES_PASSWORD` | Yes | Database password; replace the `.env.example` placeholder. |
| `DB_HOST` | Optional | FastAPI database host; defaults to `127.0.0.1`. |
| `DB_PORT` | Optional | FastAPI database port; defaults to `5432`. |
| `APP_ENV` | Local HTTP override | Defaults to `production`; set `development` for the local cookie override. |
| `AUTH_COOKIE_SECURE` | Local HTTP override | Defaults to `true`; `false` is accepted only for local development origins. |
| `AUTH_ALLOWED_ORIGINS` | Local HTTP override | Defaults to `["https://irstore24.ir"]`; use the JSON list above for this local setup. |
| `AUTH_SESSION_TTL_HOURS` | Optional | Session lifetime; defaults to `168`. |
| `AUTH_LOGIN_MAX_ATTEMPTS` | Optional | Per-account login attempt limit; defaults to `5`. |
| `AUTH_LOGIN_MAX_IP_ATTEMPTS` | Optional | Per-IP login attempt limit; defaults to `100`. |
| `AUTH_LOGIN_WINDOW_SECONDS` | Optional | Login limit window; defaults to `900`. |
| `API_PROXY_TARGET` | Optional, development only | Next.js `/api/*` proxy target; defaults to `http://127.0.0.1:8000`. |

The backend reads the root `.env`; Docker Compose uses it for database interpolation, and Next.js can read `API_PROXY_TARGET` there. `.env` is Git-ignored. Never commit credentials or copy local HTTP authentication settings into Production. Production requires HTTPS origins and Secure cookies.

### 4. Start PostgreSQL

From the repository root:

```bash
sudo docker compose up -d db
sudo docker compose ps db
```

Wait for the `db` service to report `healthy`. Compose binds its PostgreSQL port to `127.0.0.1` and keeps data in the `postgres_data` volume. Do not remove the volume to solve routine connection or migration errors.

### 5. Apply local migrations

From the repository root, enter `backend/` and use the project virtual environment:

```bash
cd backend
.venv/bin/python -m alembic upgrade head
.venv/bin/python -m alembic current
```

Run migrations only against the database named in the intended `.env`. Review new migrations before applying them to any shared or production database.

### 6. Start FastAPI

In a terminal at `backend/`:

```bash
.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Check `http://127.0.0.1:8000/api/health` and `http://127.0.0.1:8000/api/health/database`. Interactive API documentation is at `http://127.0.0.1:8000/docs`. Mutating requests sent from that documentation page require its own origin to be explicitly allowed for local development; the quick-start Origin setting covers the Next.js browser app.

### 7. Start Next.js

In a separate terminal at the repository root:

```bash
npm run dev
```

Open **http://localhost:3000**. Keep the database container and FastAPI process running while using the storefront.

## Authentication and API proxy

The browser calls relative `/api/*` URLs with same-origin credentials. In development, [the Next.js rewrite](next.config.ts) forwards those requests to FastAPI, so the browser sees one origin. FastAPI sets an HttpOnly, SameSite=Lax session cookie; only a hash of the session token is stored in PostgreSQL. The frontend does not place session tokens in browser storage.

FastAPI requires an exact trusted `Origin` for state-changing `/api/*` requests. The local HTTP override above is limited to `APP_ENV=development`; the production defaults require HTTPS and a Secure cookie. Do not disable Origin checks or place tokens in `localStorage` to work around a hostname mismatch. Production requires reverse-proxy routing for `/api/*`; the development rewrite is absent from the production build.

## Application routes

The following are **frontend** paths. The API paths are summarized in the next section.

| Access | Route | Purpose |
| --- | --- | --- |
| Public | `/` | Home and featured products |
| Public | `/cs2-items` | Searchable CS2 catalog |
| Public | `/cs2-items/[slug]` | CS2 item detail |
| Public | `/tf2-keys` | TF2 key listing |
| Public | `/support` | Telegram and Instagram contact links |
| Public | `/register`, `/login` | Account registration and sign-in |
| Signed in | `/cart` | Persistent cart and checkout |
| Signed in | `/account` | Account overview and password change |
| Signed in | `/account/orders` | Order history |
| Signed in | `/account/orders/[order_number]` | Owned order details and pending-order cancellation |
| Admin | `/admin` | Dashboard |
| Admin | `/admin/cs2-items`, `/admin/cs2-items/new`, `/admin/cs2-items/[slug]/edit` | CS2 product management |
| Admin | `/admin/tf2-keys`, `/admin/tf2-keys/edit` | TF2 key management; edit uses an optional `?id=` query |
| Admin | `/admin/orders`, `/admin/orders/[order_number]` | Order review, confirmation, and cancellation |
| Admin | `/admin/users`, `/admin/users/[id]` | User search, bans, and account status |
| Admin | `/admin/settings` | Exchange rate and store payment/contact settings |

The CS2 admin edit segment is named `[slug]` in the route tree; the current page accepts either a numeric item ID or a slug.

## API overview

| Group | Representative implemented endpoints | Responsibility |
| --- | --- | --- |
| Authentication | `POST /api/auth/register`, `/api/auth/login`, `/api/auth/logout`; `GET /api/auth/me` | Account creation and sessions |
| Public store | `GET /api/cs2-items`, `/api/cs2-items/{slug}`, `/api/tf2-keys` | Visible products, stock, and prices |
| Public settings | `GET /api/store/settings/public` | Public exchange rate and contact links |
| Cart | `GET /api/cart`; `POST`, `PATCH`, `DELETE` under `/api/cart/cs2-items` and `/api/cart/tf2-keys` | Persistent cart lines |
| Orders | `POST /api/orders/finalize`; `GET /api/account/orders`; `POST /api/account/orders/{order_number}/cancel` | Checkout and customer orders |
| Account | `GET /api/account`; `POST /api/account/change-password` | Account details and credentials |
| Administration | `/api/admin/cs2-items`, `/api/admin/tf2-keys`, `/api/admin/settings`, `/api/admin/users`, `/api/admin/orders` | Products, settings, users, and order transitions |
| Health | `GET /api/health`, `/api/health/database` | Process and database checks |

See the running FastAPI application's [Swagger UI](http://127.0.0.1:8000/docs) for request schemas and the complete endpoint list.

## Database and migrations

SQLAlchemy models live in `backend/app/models/`; Alembic revisions live in `backend/alembic/versions/`. PostgreSQL persists application data. The eleven application tables are:

```text
users              user_sessions
cs2_items          tf2_keys          store_settings
carts              cart_cs2_items    cart_tf2_keys
orders             order_cs2_items   order_tf2_keys
```

Alembic also maintains its own `alembic_version` table. Monetary amounts, exchange rates, and CS2 float values use fixed-point PostgreSQL `NUMERIC` types; authoritative calculations use Python `Decimal`.

From `backend/`, check schema state with:

```bash
.venv/bin/python -m alembic current
.venv/bin/python -m alembic heads
.venv/bin/python -m alembic check
```

For a new local database, apply reviewed migrations with `.venv/bin/python -m alembic upgrade head`. Do not reset or delete a populated database or Docker volume as a troubleshooting shortcut. Production migrations require review, an identified target database, backup and rollback planning, and separate deployment approval.

## Administrator bootstrap

There is no default administrator, public admin-registration path, seeded exchange rate, or seeded payment card. The controlled first-admin procedure is documented in [Administrator bootstrap](docs/ADMIN_BOOTSTRAP.md): register an ordinary account, verify the intended database and account ID, obtain operator approval, and promote exactly that account in a guarded transaction.

After signing in as the administrator, configure a real, approved USDT/Toman rate, payment card and holder, Telegram contact, and saleable inventory. Until settings and products are configured, the catalog can be empty and checkout cannot complete. Keep administrator passwords and real payment details out of source code and documentation.

## Product images and media

CS2 rows store an `image_path` reference such as `/media/cs2/item.webp`. The frontend renders the referenced image and falls back to the weapon label if the path is missing or loading fails. There is no image-upload API in the current MVP.

For a local preview, a file can be placed under `public/media/` at the matching path. Production needs persistent storage served on `/media/*` by the reverse proxy; files inside a disposable web container layer are not a durable media strategy. That route is not present in the tracked Nginx configuration.

## Order lifecycle

```text
Cart -> Finalize purchase -> Pending order -> Manual payment coordination
                                            |-> Admin confirmation
                                            |-> User/admin cancellation
                                            `-> Expiration job
```

FastAPI calculates prices and totals, locks inventory rows, records product price snapshots and the current exchange rate, and reduces stock once when it creates a pending order. The owner sees the order number, payment instructions, and reservation countdown. The browser countdown is informational; the backend decides when a reservation has expired.

An administrator confirms payment manually. Confirmation does not reduce stock again. A pending cancellation or expiration restores reserved stock once; invalid or repeated transitions are rejected. See [the architecture](docs/ARCHITECTURE.md) for transaction and concurrency rules.

## Order expiration

The expiration worker is implemented in `backend/app/jobs/expire_orders.py`. From `backend/`, run it with the same database environment as FastAPI:

```bash
.venv/bin/python -m app.jobs.expire_orders --batch-size 100
```

It handles due pending orders transactionally. [Order expiration operations](docs/ORDER_EXPIRATION.md) describes the worker and scheduling expectations. **No production scheduler is configured in this repository**; deploying and monitoring one remains launch work.

## Testing and quality checks

| Check | Command and location |
| --- | --- |
| Production frontend build | `npm run build` — repository root |
| TypeScript | `npm run typecheck` — repository root |
| Frontend tests | `npm run test:frontend` — repository root |
| Backend tests | `.venv/bin/python -m pytest -v` — `backend/` |
| Migration drift | `.venv/bin/python -m alembic check` — `backend/`, against the intended migrated database |
| Browser E2E | `E2E_CONFIG_PATH=/tmp/<private-config>.json node tests/browser-e2e.mjs prepare` and the remaining phases — repository root; see [E2E validation](docs/E2E_VALIDATION.md) |

The browser suite needs a fresh isolated local PostgreSQL database, private generated test credentials, FastAPI, Next.js development mode, and two separate Chrome debugging profiles. Its setup and phase order are documented in [E2E validation](docs/E2E_VALIDATION.md). The current runner invokes the backend virtual environment through a machine-specific absolute path, so it needs adaptation before it can run from an arbitrary fresh clone. Never aim its fixtures at the normal development or production database.

ESLint is **not configured**. TypeScript checking and the production build do not replace linting.

## Deployment status

The last documented production site is an Under Construction deployment, subject to verification on the actual VPS. The integrated storefront has been validated locally, but it is not declared production-ready.

The tracked deployment files still need a FastAPI Docker service, Compose wiring between `web`, `api`, and `db`, Nginx `/api/*` routing, persistent `/media/*` routing and storage, and a monitored order-expiration schedule. The tracked Nginx file currently proxies all requests to Next.js, and the production Next.js build has no API rewrite; direct `/api/auth/me` returned 404 during local production-build validation. The live server may differ and was not inspected.

Before deployment, prepare production-only environment values, HTTPS and Secure cookies, reviewed migrations, a controlled administrator bootstrap, approved store settings, production route and purchase verification, and a rollback plan. Do not assume the current `docker-compose.yml` or `nginx-irstore24.conf` already provides the [target production architecture](docs/ARCHITECTURE.md).

## Security notes

- Passwords are hashed with Argon2id. Sessions are managed by FastAPI; PostgreSQL stores session-token hashes, not raw tokens.
- Session cookies are HttpOnly and SameSite=Lax. Secure cookies are the default and required for the intended HTTPS deployment.
- FastAPI validates exact trusted Origins for state-changing API requests and checks roles, ownership, bans, and account status server-side.
- Prices, totals, exchange rates, order transitions, and inventory changes are authoritative on the server. Stock reservations and restorations use database transactions and row locking.
- Keep PostgreSQL on private interfaces, use restricted database access, and keep `.env`, credentials, tokens, and private keys outside Git.

## Troubleshooting

| Symptom | Safe checks |
| --- | --- |
| PostgreSQL is unavailable | Run `sudo docker compose ps db` and `sudo docker compose logs db`; wait for `healthy`. Check Docker Engine and the configured local port. Do not delete `postgres_data`. |
| FastAPI cannot reach PostgreSQL | Check `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `DB_HOST`, and `DB_PORT` in the root `.env`; then check `http://127.0.0.1:8000/api/health/database`. |
| Alembic reports a connection or revision error | From `backend/`, run `.venv/bin/python -m alembic current` and `.venv/bin/python -m alembic heads`. Verify the target database before considering any migration action. |
| Port 3000 or 8000 is in use | Check listeners with `ss -ltnp`; stop the stale local process or deliberately choose another port and update the matching origin/proxy settings. |
| Login succeeds but the session disappears | Use `http://localhost:3000` consistently. For local HTTP, check `APP_ENV=development`, `AUTH_COOKIE_SECURE=false`, and the exact `AUTH_ALLOWED_ORIGINS` value; restart the local servers after edits. |
| A state-changing request returns 403 | Check the browser's exact `Origin` against `AUTH_ALLOWED_ORIGINS`. Keep CSRF/Origin validation enabled. |
| `/api/*` returns 502 or 404 | Confirm FastAPI is running on port 8000 and the development `API_PROXY_TARGET` is correct. In a production build, verify Nginx `/api/*` routing; Next.js has no production API rewrite. |
| The catalog is empty or a price equivalent is missing | Check that an authorized administrator created visible products with stock and configured a real `usdt_toman_rate`. |
| Product images are missing | Verify the `/media/*` reference and the local `public/media/` preview file, or inspect the intended persistent media route. The weapon-label fallback should remain visible. |
| The Python virtual environment is unavailable | Check `backend/.venv/bin/python` and your Python version. For a fresh checkout, follow the setup steps above; use the virtual-environment interpreter for backend commands. |

## Project documentation

- [MVP architecture and business rules](docs/ARCHITECTURE.md)
- [Local browser E2E validation and deployment gap](docs/E2E_VALIDATION.md)
- [Controlled administrator bootstrap](docs/ADMIN_BOOTSTRAP.md)
- [Pending-order expiration operations](docs/ORDER_EXPIRATION.md)

## Roadmap

**MVP launch work:** finish and verify FastAPI deployment, same-origin production API routing, persistent media delivery, expiration scheduling, secure production configuration, approved store initialization, and an end-to-end staging and production rollout with rollback.

**Optional later work:** Steam API or automated trade integration and an automated payment gateway are outside MVP v1. They should be designed separately rather than assumed to exist today.
