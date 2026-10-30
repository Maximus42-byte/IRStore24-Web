# Deployment preparation and operations

This document describes repository configuration and a future operator procedure. The operator reports that the production storefront is now live; the older 2026-10-29 host facts in related documents are historical. Inspect the actual live Compose project, PostgreSQL volume, Nginx routing, certificates, and backups before any release. Nothing in this repository task accesses the VPS.

## Service layout

| Service | Role | Exposure |
| --- | --- | --- |
| web | Next.js standalone server | Live: 127.0.0.1:3100 on host |
| api | FastAPI under a non-root user | Live: 127.0.0.1:8100 on host |
| db | PostgreSQL 17 with named `postgres_data` volume | Compose network only in production |
| Host Nginx | Existing HTTPS termination and routing | Public 80/443, subject to live configuration review |

`docker-compose.yml` is the base file. The verified live project is `irstore24-staging` in `/opt/irstore24-staging`, with PostgreSQL volume `irstore24-staging_postgres_data`. Every live command must select `docker-compose.yml`, `docker-compose.staging.yml`, and `docker-compose.production-live.yml` in that order, plus `--project-name irstore24-staging`. The final overlay changes only the API media bind source to match Nginx. The staging file alone keeps its separate media path for a genuinely isolated staging project, but its declared project name is occupied by the live site and must never be used for a new candidate without a distinct override. `docker-compose.override.yml` loads automatically only when no explicit file list is given and exposes local PostgreSQL on loopback; it must not be used on the live host.

The API image installs the package from `backend/pyproject.toml` into `/opt/venv`, constrained by `backend/constraints-container.txt`. It contains no `.env`, local virtual environment, or test credentials. The API filesystem is read-only at runtime except for a temporary `/tmp` mount and the dedicated writable `/app/media` bind mount. The API runs as UID/GID 10001; the media mount must be prepared for that identity. The web image uses `npm ci` and the standalone Next.js output. Both images have health checks. API health checks test a real database query; they do **not** prove migrations have run.

## Local computer: development workflow

For the host virtualenv workflow: copy `.env.example` to the ignored `.env`, set a strong local database password, then run:

~~~bash
docker compose config --quiet
docker compose up -d db
docker compose ps db
~~~

This loads the local override and exposes PostgreSQL only at 127.0.0.1:5432 for the host virtual environment. For a full local Compose API, first create ignored `backend/container-media` and its `cs2/` and `tf2/` subdirectories for UID/GID 10001; the host virtualenv uses separate ignored `backend/media` owned by the local user. Continue using `backend/.venv/bin/python` for the locally running API, tests, and Alembic. Do not copy `APP_ENV=development` or `AUTH_COOKIE_SECURE=false` to production. Running the full base Compose stack over plain local HTTP keeps Secure cookies enabled by design; its login flow requires an explicitly isolated test configuration and proxy.

For an isolated container test, use a new project name, disposable credentials, and a reviewed media mount override. Inspect the resolved project, media path, and PostgreSQL volume before starting. Never use an existing project or volume as a fixture.

## Release against the live storefront

The operator has verified that the live deployment uses project `irstore24-staging`, checkout `/opt/irstore24-staging`, environment file `/etc/irstore24/staging.env`, ports 3100/8100, and an existing persistent PostgreSQL volume. Preserve those identities. The base file alone would select project `irstore24` and a different volume. The staging pair alone would bind `/srv/irstore24-staging/media`, while live Nginx reads `/srv/irstore24/media`. Use the live overlay below for every approved production operation. The [server migration runbook](SERVER_MIGRATION.md) retains older command examples for historical context; its latest live-release section supersedes them.

1. **Inspect without changing state.** On the host, record the active container labels and Compose project, the exact PostgreSQL volume identity and mount, database name and Alembic revision, Nginx upstream ports, media bind mount, image tags, current commit, and recent verified backups. Stop if the checkout, Compose file set, project, volume, or database does not match the live system.
2. **Prepare backups and media.** Take a new consistent PostgreSQL backup and a separate media backup; verify checksums and perform a restore into an isolated target. Keep existing backups. Prepare `/srv/irstore24/media/cs2` and `/srv/irstore24/media/tf2` for UID/GID 10001 with directory mode 0755, preserving existing files and making no recursive permission changes without review. Confirm Nginx read access and that `client_max_body_size 1m` is effective on the live HTTPS virtual host.
3. **Build and validate application images in isolation.** Use a distinct, verified-unused project and host ports for candidate API/web containers. Use a disposable database with representative data, not the live database volume, for migration and upload tests. Keep the live storefront serving while testing HTTPS cookies, Origin rejection, media access, checkout, and health. Save the approved image tags so the release can use these images without rebuilding the database service.
4. **Migrate the actual live database only after approval and a backup gate.** Select the verified live project, existing database, environment file, and Compose files explicitly. Confirm the current revision matches `f691486b68bb` before applying `6c97dfd75e2b`. This migration only adds nullable `tf2_keys.image_path`; it must not create a new database volume or change existing records. Stop on a revision mismatch or migration error.
5. **Switch application traffic after validation.** Start candidate application containers from the approved prebuilt images without targeting, rebuilding, or replacing the PostgreSQL service. Use free loopback ports so the current web/API keep serving until the candidate passes private HTTPS and media tests. Back up the live Nginx virtual host, validate the proposed routing with `nginx -t`, then reload Nginx only for an approved cutover. Verify the public purchase flow and monitor errors.
6. **Rollback boundaries.** Keep the old application images and Nginx file for immediate traffic rollback. Restore the old Nginx upstream and app images if needed. Do not use `docker compose down -v`, reset or recreate the production volume, or restore over the live database. The nullable-column migration can remain while the older app runs; a downgrade would delete image references and needs a separate data plan. Match any future database restore to the corresponding media backup.

These are release gates, not a claim that this task accessed the VPS. Recheck the operator-reported live facts before any approved release.

### Exact live Compose selection and rollback

Run these commands only in an approved live maintenance procedure, after verifying the checkout, environment file, current containers, PostgreSQL volume, backups, and image IDs. The explicit file list excludes the local development override:

~~~bash
cd /opt/irstore24-staging
LIVE_COMPOSE=(docker compose --project-name irstore24-staging
  --env-file /etc/irstore24/staging.env
  -f docker-compose.yml -f docker-compose.staging.yml
  -f docker-compose.production-live.yml)
"${LIVE_COMPOSE[@]}" config --quiet
"${LIVE_COMPOSE[@]}" ps
docker inspect irstore24-staging-api-1 --format '{{.Image}}'
docker inspect irstore24-staging-web-1 --format '{{.Image}}'
~~~

Record the two image IDs privately before any replacement, and preserve both image objects. Confirm that the resolved project is `irstore24-staging`, the volume is `irstore24-staging_postgres_data`, web/API bind only to `127.0.0.1:3100` and `127.0.0.1:8100`, database has no host port, and API media is `/srv/irstore24/media:/app/media`. Full `config` output includes database credentials; do not publish it. The normal service image tags resolve to `irstore24-staging-api` and `irstore24-staging-web`; verify these again before release. After a separately approved backup, migration, and candidate validation, replace only application services with `"${LIVE_COMPOSE[@]}" up -d --no-deps --no-build api web`. Do not target `db`, use `down`, or create another project for the live database.

If application replacement fails, restore the previously recorded image IDs to those verified Compose image tags and run:

~~~bash
docker image tag <RECORDED_OLD_API_IMAGE_ID> irstore24-staging-api
docker image tag <RECORDED_OLD_WEB_IMAGE_ID> irstore24-staging-web
"${LIVE_COMPOSE[@]}" up -d --no-deps --no-build --force-recreate api web
"${LIVE_COMPOSE[@]}" ps
~~~

The placeholders must be replaced with the recorded old IDs; stop if they are unavailable. Keep the new live media overlay in place so the API and Nginx continue using the same host directory. This release requires no Nginx change. If routing was changed by a separate approved release, restore its backed-up virtual host, test with `nginx -t`, then reload. The additive nullable TF2 image migration may remain with the older app; a downgrade drops image references and requires a separate data plan. Never restore a database dump over the live database as an automatic rollback.

Production Compose fixes `APP_ENV=production`, `AUTH_COOKIE_SECURE=true`, and the exact allowed Origins to `https://irstore24.ir` and `https://www.irstore24.ir`. Both names must have valid HTTPS routing if both are served. A host-only cookie works on the hostname that issued it; avoid switching hostname mid-session. The tracked Next.js production build has no development API rewrite.

## Host Nginx routing template

`nginx-irstore24.conf` is a **location fragment**, not a complete virtual host. It still targets the base-file ports 3000/8000 and must not be applied to the verified live site, which uses 3100/8100. Keep the live Nginx virtual host unchanged for this media mount fix. For a separately approved Nginx change, inspect the live TLS server block and certificate/redirect rules before adapting any fragment; never replace the live file blindly. The tracked fragment forwards:

- `/` to 127.0.0.1:3000.
- `/api/*` to 127.0.0.1:8000. `proxy_pass` has no trailing URI slash, so FastAPI receives the complete `/api/...` path.
- Allowed image files under `/media/*` to the host directory `/srv/irstore24/media`. Other media paths return 404.

The fragment forwards Host, real client address, forwarded chain, and original scheme. It caps request bodies at 1 MiB and disables media directory listings. Check for conflicting existing locations, server-level body limits, cache rules, and proxy settings. Validate syntax with the installed Nginx configuration before any reload. Keep the live HTTPS redirect and certificate paths; neither was invented here. Confirm the browser receives Secure, HttpOnly, SameSite=Lax session cookies over HTTPS and that POST Origin checks accept only the two approved domains. Unknown API routes must return FastAPI's 404, not a Next.js page.

## Persistent product media

The live overlay bind-mounts only `/srv/irstore24/media` into the API at `/app/media` and retains `MEDIA_ROOT=/app/media`. The base uses the same path; the staging file alone selects `/srv/irstore24-staging/media` for a separate environment. The automatically loaded local override uses ignored `./backend/container-media`; the host virtualenv uses ignored `backend/media`. The API runs as UID/GID 10001 and writes generated images only in `cs2/` and `tf2/`. Keep the existing live media root owned by root:root at 0755. On an approved VPS preparation step, inspect it and create or adjust only the category directories:

~~~bash
sudo stat -c '%a %u:%g %n' /srv/irstore24 /srv/irstore24/media
sudo install -d -o 10001 -g 10001 -m 0755 /srv/irstore24/media/cs2 /srv/irstore24/media/tf2
sudo stat -c '%a %u:%g %n' /srv/irstore24/media/cs2 /srv/irstore24/media/tf2
namei -l /srv/irstore24/media/cs2 /srv/irstore24/media/tf2
~~~

`install -d` changes ownership and mode of those two directories if they already exist but does not recurse into existing images. Review existing ACLs and ownership first if another process writes there. Each parent must be traversable by UID 10001 and the actual Nginx worker; the category directories are writable by UID 10001 and readable by Nginx. New images are mode 0644. Verify the Nginx worker identity and test read access to an existing image as that user. Never use 0777, recursively chown media, or delete existing files.

Admins can upload JPEG, PNG, or WebP through `/api/admin/media/cs2` and `/api/admin/media/tf2`. The API accepts raw image bytes, limits uploads to 768 KiB and decoded images to 4096 pixels per side and 16 million pixels, and rewrites them as metadata-free WebP with generated filenames. Nginx's existing `client_max_body_size 1m` covers the request; no increase is required. The tracked Nginx fragment already allows the generated `/media/<category>/<hex>.webp` paths. Keep the live virtual host unchanged until a reviewed cutover. CS2 and TF2 images display a fallback when their nullable image reference is absent or fails to load. Removing or replacing a reference does not delete the old file; reconcile unreferenced files against database records and backups only through a separate reviewed cleanup.

Back up the host media directory alongside PostgreSQL backups. Container replacement does not affect media, but a database restore with missing media files creates broken references. Verify both backup sets and practice restoration to isolated resources.

## Order expiration timer

`deploy/systemd/irstore24-expire-orders.service` and `.timer` are local templates; the operator reports an existing live timer. The template now selects the verified live checkout, environment file, project, and three Compose files, then uses `exec -T api /opt/venv/bin/python -m app.jobs.expire_orders --batch-size 100`. Inspect the installed unit before changing it; keep exactly one active expiration timer for the store. The existing backup unit and script are not in this repository. They must continue to target the same `irstore24-staging` project and `db` service; if they invoke Compose, update their file list to the same three files during an approved release, without changing the database volume. Validate both installed unit definitions and run each one-shot service after deployment, then check its exit status and journal. The systemd timer starts the one-shot service every minute; systemd does not overlap another invocation of the same service. It runs `app.jobs.expire_orders` inside the deployed API container with the same database environment, without browser activity. The job selects due orders with row locks, restores stock and updates status transactionally, and is safe to repeat. After downtime, the next successful run processes overdue orders in batches.

The command prints only an aggregate expired-order count on success; systemd captures its output and failure exit code in the journal. Inspect `systemctl status irstore24-expire-orders.service`, `systemctl list-timers irstore24-expire-orders.timer`, and `journalctl -u irstore24-expire-orders.service` for the last successful run and failures. Configure host monitoring to alert if no successful completion appears for more than two scheduled intervals or if the unit fails. A stopped API container causes the job to fail visibly; it must not silently count as success. See [order expiration](ORDER_EXPIRATION.md) for the transaction behavior.

## Verification and rollback boundaries

Before exposing a new release, verify loopback service health, then test through the **actual Nginx route**: `/`, `/api/health`, `/api/health/database`, unauthenticated `/api/auth/me` (expected 401), unknown `/api/...` (expected FastAPI 404), valid and invalid `/media/*` paths, and a permitted and rejected Origin. Confirm cookie flags and a full purchase/inventory flow using approved non-production fixtures first. HTTP-only local proxy tests do not establish production HTTPS behavior.

For rollback, retain the prior application image/checkout and Nginx configuration. Reverting images can restore prior application code, but it cannot safely undo database migrations or new writes. Prefer a forward fix after reviewing compatibility. If a database restore is needed, restore a verified pre-migration backup to an isolated target first and plan a controlled cutover with the operator; do not run destructive `down -v` or blind Alembic downgrade. Restore media together with matching database data.

## Current validation limit

At preparation time, the local account could parse Compose files but could not access the Docker daemon; passwordless sudo was unavailable. Container builds, health checks, Nginx syntax, reverse-proxy routing, and HTTPS/cookie behavior remain unverified. The actual VPS was not accessed in this task; the dated host facts above were supplied by the operator. These are deployment gates, not completed checks.
