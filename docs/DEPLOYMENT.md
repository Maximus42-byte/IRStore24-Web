# Deployment preparation and operations

This document describes the **planned** container deployment. It was prepared locally and no VPS command was run for this change. The operator reported on 2026-10-29 that the Ubuntu 24.04 VPS serves the Under Construction site over HTTPS from `/opt/irstore24` on `main` commit `43b0230`; Nginx proxies `/` to the existing `irstore24-web` container on `127.0.0.1:3000`. No production PostgreSQL volume currently exists. The live configuration and certificate paths were not inspected by this task. Keep that site running until a separately approved cutover.

## Service layout

| Service | Role | Exposure |
| --- | --- | --- |
| web | Next.js standalone server | 127.0.0.1:3000 on host |
| api | FastAPI under a non-root user | 127.0.0.1:8000 on host |
| db | PostgreSQL 17 with named `postgres_data` volume | Compose network only in production |
| Host Nginx | Existing HTTPS termination and routing | Public 80/443, subject to live configuration review |

`docker-compose.yml` is the production base file. `docker-compose.override.yml` is loaded automatically only when no explicit file list is given; it adds the old loopback-only 5432 binding for local development. Use `-f docker-compose.yml` for production-style commands, so the database has **no host port**. The explicit Compose project name `irstore24` preserves the normal project volume name `irstore24_postgres_data` when that is the actual existing project. Verify the real project and volume on the VPS before running Compose; a different project name would select a different volume.

The API image installs the package from `backend/pyproject.toml` into `/opt/venv`, constrained by `backend/constraints-container.txt`. It contains no `.env`, local virtual environment, or test credentials. The API filesystem is read-only at runtime except for a temporary `/tmp` mount. The web image uses `npm ci` and the standalone Next.js output. Both images have health checks. API health checks test a real database query; they do **not** prove migrations have run.

## Local computer: development workflow

The existing local workflow is unchanged: copy `.env.example` to the ignored `.env`, set a strong local database password, then run:

~~~bash
docker compose config --quiet
docker compose up -d db
docker compose ps db
~~~

This loads the local override and exposes PostgreSQL only at 127.0.0.1:5432 for the host virtual environment. Continue using `backend/.venv/bin/python` for the locally running API, tests, and Alembic. Do not copy `APP_ENV=development` or `AUTH_COOKIE_SECURE=false` to production. Running the full base Compose stack over plain local HTTP keeps Secure cookies enabled by design; its login flow requires an explicitly isolated test configuration and proxy.

For an isolated container test, choose a new Compose project name and disposable database credentials, then run the base file with `-p <unique-test-project> -f docker-compose.yml --env-file <private-test-env>`. Inspect the resolved project and volume before starting. Never use the normal development project or volume as a fixture. Do not run `down -v` on existing resources.

## Isolated staging before production cutover

Use the separate [staging guide](STAGING.md) and the explicit `docker-compose.yml` plus `docker-compose.staging.yml` file list. Staging uses `irstore24-staging`, ports `127.0.0.1:3100` and `127.0.0.1:8100`, and its own PostgreSQL volume. The existing production checkout, `irstore24-web`, port 3000, and Nginx virtual host are outside that Compose project. Do not use the production base-file commands below for staging.

## Future production cutover: required inspection first

Before any deployment action, inspect the actual host with the operator:

1. Reconfirm the operator-reported live site, active Nginx server blocks, certificate and redirect setup, Docker Compose project labels, container names, networks, mounts, volume names, and backup schedule. No production PostgreSQL volume was reported as of 2026-10-29; confirm this again before creating one.
2. Keep the existing web container on 127.0.0.1:3000 until cutover approval. Confirm the future API port 8000 can bind on loopback, PostgreSQL is not publicly reachable, the intended media path can be read by Nginx, and Docker plus systemd paths and permissions exist.
3. Preserve the existing Under Construction release and its images/configuration for rollback. For any existing database, take and verify a recoverable backup before migration. For a new production database, verify the new volume identity before initialization and establish backups immediately after. Review migration revisions and the target database. Obtain deployment approval separately.

The following are **future production cutover commands, not staging commands**. Running the base file on the existing production Compose project can replace the live web container or collide with port 3000; do not run them while the Under Construction site must remain. After separate cutover approval, confirm the checked-out revision and existing Compose project/volume identity, and create a private, mode 0600 environment file outside Git at an approved host path such as `/etc/irstore24/production.env`. It needs real `POSTGRES_DB`, `POSTGRES_USER`, and `POSTGRES_PASSWORD` values. Shell environment variables can override the selected file, so inspect the invocation environment without printing secrets. No payment card, exchange rate, or administrator account is seeded by Compose.

A controlled sequence for a verified matching project is:

~~~bash
docker compose --env-file /etc/irstore24/production.env -f docker-compose.yml config --quiet
docker compose --env-file /etc/irstore24/production.env -f docker-compose.yml build web api
docker compose --env-file /etc/irstore24/production.env -f docker-compose.yml up -d db
docker compose --env-file /etc/irstore24/production.env -f docker-compose.yml ps db
docker compose --env-file /etc/irstore24/production.env -f docker-compose.yml run --rm --no-deps api /opt/venv/bin/python -m alembic current
docker compose --env-file /etc/irstore24/production.env -f docker-compose.yml run --rm --no-deps api /opt/venv/bin/python -m alembic upgrade head
docker compose --env-file /etc/irstore24/production.env -f docker-compose.yml run --rm --no-deps api /opt/venv/bin/python -m alembic check
docker compose --env-file /etc/irstore24/production.env -f docker-compose.yml up -d api web
docker compose --env-file /etc/irstore24/production.env -f docker-compose.yml ps
~~~

Stop on any failed command. Review the revision returned by `alembic current` and the migration plan **before** `upgrade head`. A healthy database container or `depends_on` does not mean migrations completed. Do not reset a database or recreate its volume to fix a migration failure. API and web should be started only after a successful migration gate. The Dockerfile does not auto-run migrations.

Production Compose fixes `APP_ENV=production`, `AUTH_COOKIE_SECURE=true`, and the exact allowed Origins to `https://irstore24.ir` and `https://www.irstore24.ir`. Both names must have valid HTTPS routing if both are served. A host-only cookie works on the hostname that issued it; avoid switching hostname mid-session. The tracked Next.js production build has no development API rewrite.

## Host Nginx routing template

`nginx-irstore24.conf` is a **location fragment**, not a complete virtual host. After inspecting the live TLS server block and certificate/redirect rules, merge or include the reviewed locations inside the appropriate HTTPS server for both apex and www. Do not replace the live file with this fragment. The fragment forwards:

- `/` to 127.0.0.1:3000.
- `/api/*` to 127.0.0.1:8000. `proxy_pass` has no trailing URI slash, so FastAPI receives the complete `/api/...` path.
- Allowed image files under `/media/*` to the host directory `/srv/irstore24/media`. Other media paths return 404.

The fragment forwards Host, real client address, forwarded chain, and original scheme. It caps request bodies at 1 MiB and disables media directory listings. Check for conflicting existing locations, server-level body limits, cache rules, and proxy settings. Validate syntax with the installed Nginx configuration before any reload. Keep the live HTTPS redirect and certificate paths; neither was invented here. Confirm the browser receives Secure, HttpOnly, SameSite=Lax session cookies over HTTPS and that POST Origin checks accept only the two approved domains. Unknown API routes must return FastAPI's 404, not a Next.js page.

## Persistent product media

The planned media root is `/srv/irstore24/media` on the host; it is **not** mounted inside the application containers. Nginx reads it directly. Validate this path and the Nginx worker identity on the VPS before creating it. Keep its parent directories traversable, use directories mode 0755 and public image files mode 0644, and assign ownership to a controlled operator account rather than the Nginx worker. The Nginx template rejects symlinks and accepts only simple relative image filenames ending in png, jpg, jpeg, webp, gif, or avif. Keep secrets and non-image files outside this tree.

An approved operator can inspect the image format and filename, stage it privately, and install it into a category directory such as `/srv/irstore24/media/cs2/`. The final name should match the template's filename pattern; for example `ak47-redline.webp`. After verifying the file is readable through `/media/cs2/ak47-redline.webp`, set the CS2 product's `image_path` to that URL in the admin UI. Uploads through the public API are not part of MVP v1. The frontend retains its missing-image fallback.

Back up the host media directory alongside PostgreSQL backups. Container replacement does not affect media, but a database restore with missing media files creates broken references. Verify both backup sets and practice restoration to isolated resources.

## Order expiration timer

`deploy/systemd/irstore24-expire-orders.service` and `.timer` are **templates for later installation**, not active services. Their planned paths (`/opt/irstore24` and `/etc/irstore24/production.env`), Docker executable, permissions, and Compose project identity require VPS inspection. Install one timer for the store. The systemd timer starts the one-shot service every minute; systemd does not overlap another invocation of the same service. It runs `app.jobs.expire_orders` inside the deployed API container with the same database environment, without browser activity. The job selects due orders with row locks, restores stock and updates status transactionally, and is safe to repeat. After downtime, the next successful run processes overdue orders in batches.

The command prints only an aggregate expired-order count on success; systemd captures its output and failure exit code in the journal. Inspect `systemctl status irstore24-expire-orders.service`, `systemctl list-timers irstore24-expire-orders.timer`, and `journalctl -u irstore24-expire-orders.service` for the last successful run and failures. Configure host monitoring to alert if no successful completion appears for more than two scheduled intervals or if the unit fails. A stopped API container causes the job to fail visibly; it must not silently count as success. See [order expiration](ORDER_EXPIRATION.md) for the transaction behavior.

## Verification and rollback boundaries

Before exposing a new release, verify loopback service health, then test through the **actual Nginx route**: `/`, `/api/health`, `/api/health/database`, unauthenticated `/api/auth/me` (expected 401), unknown `/api/...` (expected FastAPI 404), valid and invalid `/media/*` paths, and a permitted and rejected Origin. Confirm cookie flags and a full purchase/inventory flow using approved non-production fixtures first. HTTP-only local proxy tests do not establish production HTTPS behavior.

For rollback, retain the prior application image/checkout and Nginx configuration. Reverting images can restore prior application code, but it cannot safely undo database migrations or new writes. Prefer a forward fix after reviewing compatibility. If a database restore is needed, restore a verified pre-migration backup to an isolated target first and plan a controlled cutover with the operator; do not run destructive `down -v` or blind Alembic downgrade. Restore media together with matching database data.

## Current validation limit

At preparation time, the local account could parse Compose files but could not access the Docker daemon; passwordless sudo was unavailable. Container builds, health checks, Nginx syntax, reverse-proxy routing, and HTTPS/cookie behavior remain unverified. The actual VPS was not accessed in this task; the dated host facts above were supplied by the operator. These are deployment gates, not completed checks.
