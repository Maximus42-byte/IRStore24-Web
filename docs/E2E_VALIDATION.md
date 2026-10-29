# Local end-to-end validation

The browser suite in `tests/browser-e2e.mjs` drives the Next.js UI through
headless Chrome. Its API requests pass through the Next.js development proxy
to FastAPI and PostgreSQL. It uses an isolated database with a name matching
`irstore24_e2e_<hex>`; the normal `irstore24` database is never a fixture
target.

## Isolated run

For the 2026-10-24 run, PostgreSQL was reached only through
`127.0.0.1:5432`. A new database, `irstore24_e2e_a3b4632f5c47`, was
created after checking the connection target. Alembic migrations brought it
to `f691486b68bb`. FastAPI ran on `127.0.0.1:8000` with
`POSTGRES_DB` set to that database, `APP_ENV=development`,
`AUTH_COOKIE_SECURE=false`, and
`AUTH_ALLOWED_ORIGINS=["http://localhost:3000"]`. Next.js ran locally on
port 3000. Browser navigation used `http://localhost:3000` consistently.
The insecure-cookie override is accepted only for local development; the
production default remains Secure.

The test identities and generated passwords were held in a mode `0600`
JSON file under `/tmp`, with `database`, `origin`, `user_email`,
`user_password`, `admin_email`, and `admin_password` fields. The file,
passwords, and session tokens are not tracked or printed. Both accounts were
registered through the browser. The `promote` phase checks the local host,
isolated database name, exactly two users, target account state, and
single-row update under a row lock before granting the test administrator
role. It does not add an admin registration endpoint or default account.
Test-only settings, prices, and payment instructions were entered only into
the disposable database through the admin UI.

The private JSON must specify a fresh database name and two distinct,
securely generated test identities. Run `prepare` first; it refuses an
existing database and requires a local PostgreSQL host. It creates only the
named disposable database and applies real Alembic migrations with the
project virtual environment. Then start the API with the environment above,
start `npm run dev -- --hostname 127.0.0.1 --port 3000`, and start two
separate headless Chrome remote-debugging profiles on ports 9222 (user) and
9223 (administrator). For example, Chrome can be started with
`--headless=new --remote-debugging-port=9222 --user-data-dir=/tmp/irstore24-e2e-user`;
use port 9223 and a different profile directory for the administrator.
Run the phases in this order:

```text
E2E_CONFIG_PATH=/tmp/<private-config>.json node tests/browser-e2e.mjs prepare
E2E_CONFIG_PATH=/tmp/<private-config>.json node tests/browser-e2e.mjs register
E2E_CONFIG_PATH=/tmp/<private-config>.json node tests/browser-e2e.mjs promote
E2E_CONFIG_PATH=/tmp/<private-config>.json node tests/browser-e2e.mjs seed
E2E_CONFIG_PATH=/tmp/<private-config>.json node tests/browser-e2e.mjs purchase
E2E_CONFIG_PATH=/tmp/<private-config>.json node tests/browser-e2e.mjs admin
E2E_CONFIG_PATH=/tmp/<private-config>.json node tests/browser-e2e.mjs remaining-orders
E2E_CONFIG_PATH=/tmp/<private-config>.json node tests/browser-e2e.mjs accounts
E2E_CONFIG_PATH=/tmp/<private-config>.json node tests/browser-e2e.mjs availability
E2E_CONFIG_PATH=/tmp/<private-config>.json node tests/browser-e2e.mjs settings-feedback
```

The expiration phase moves only its new test order's `expires_at` into the
past, then invokes the existing backend expiration command with the project
virtual environment. This avoids waiting 120 minutes. It verifies a second
run restores no additional inventory.

## Results

The browser covered registration, failed and successful login, persistent
sessions, logout, CSRF and admin restrictions, catalog filters, detail pages,
missing-image fallback, contact links, hidden and out-of-stock products,
mixed carts, quantity changes, cart persistence, pending purchase, exact
totals, locked rate, payment visibility, countdown, user and admin
cancellation, confirmation, expiration, order history, product management,
settings, user bans, deactivation, and session revocation. One admin settings
feedback bug was fixed: saving settings no longer remounts the form and
removes its success message.

The final isolated database contained one confirmed, one expired, and three
cancelled orders. Final product stocks were seven CS2 items and six TF2 keys,
after explicit admin stock edits and all expected reservation restorations.
Read-only counts for the normal local database matched the pre-test counts.
The production build, TypeScript check, four frontend tests, 101 backend
tests, and Alembic drift check passed. The backend suite emitted one
Starlette/httpx deprecation warning; the frontend suite emitted Node's
experimental transform-types warning. No ESLint configuration exists.
After the evidence was recorded, both task-created disposable databases,
private credential files, and Chrome profiles were removed. The normal
development database and its volumes were left in place.

## Deployment blocker observed during this run

The production Next.js build intentionally has no `/api/*` rewrite.
Directly serving that build returned HTTP 404 for `/api/auth/me`. The
tracked `nginx-irstore24.conf` forwards all paths to Next.js and has no
`/api/*` or `/media/*` route, while the tracked Compose file starts only
the web and database services. The local browser suite passed through the
development proxy; it does not prove production API routing. The actual VPS
configuration was not inspected or changed. A later local preparation change added
Compose, Nginx, media, and timer templates in [deployment preparation](DEPLOYMENT.md);
those templates have not been deployed or reverse-proxy tested.

Before staging or production launch, build and verify the prepared backend
service, same-origin `/api/*` routing, persistent `/media/*` delivery, HTTPS Secure
cookies, real administrator-approved store settings, and the proposed monitored
expiration timer. The deployment guide records the remaining local and VPS gates.
