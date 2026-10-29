# Isolated staging on the existing VPS

This is a **future operator procedure**. No command in this document was run on the VPS while preparing this repository. The current Under Construction container `irstore24-web` at `127.0.0.1:3000` must keep serving HTTPS through the existing Nginx configuration. Staging is not a production cutover.

## Known host facts and remaining checks

As reported after manual inspection on 2026-10-29, the VPS runs Ubuntu 24.04 with Docker and Nginx active, serves HTTPS 200, keeps the current site at `/opt/irstore24` on `main` commit `43b0230`, and has no production PostgreSQL volume. Its Nginx `/` route reaches `127.0.0.1:3000`. These facts were supplied by the operator; this repository task did not connect to the VPS. Check the installed Docker Compose version, free host ports, current Compose project labels, disk space, and certificate/virtual-host details again before staging.

## Isolation contract

| Resource | Existing site | Proposed staging |
| --- | --- | --- |
| Checkout | `/opt/irstore24` | `/opt/irstore24-staging` |
| Compose project | Inspect existing labels; never target it | `irstore24-staging` |
| Web container | `irstore24-web` | Compose-generated staging name; no `container_name` |
| Web host port | `127.0.0.1:3000` | `127.0.0.1:3100` |
| API host port | None reported | `127.0.0.1:8100` |
| PostgreSQL host port | None reported | None |
| Database volume | None reported currently | `irstore24-staging_postgres_data` |
| Nginx | Live HTTPS site | No change during staging preparation |

The staging volume name is project-scoped because `postgres_data` has no fixed `name:`. The staging file also sets `name: irstore24-staging`, and every command below passes `--project-name irstore24-staging` explicitly. Compose-generated container and network names are project-scoped. Do not run plain `docker compose up`, `docker compose down`, or a base-file-only command from the live production checkout.

## Files and private environment

The staging configuration is exactly `docker-compose.yml` plus `docker-compose.staging.yml`, in that order. Pass both with `-f`. This prevents Compose from automatically loading `docker-compose.override.yml`, which exists for the local development database. The staging file uses Compose `!override` to **replace**, rather than append to, the base port lists and to clear database ports. It needs Docker Compose 2.24.4 or newer; check the VPS version before using it. The local Compose 2.40.3 parser accepted it.

After the reviewed commit is pushed separately, an operator may prepare the staging checkout at `/opt/irstore24-staging` without changing `/opt/irstore24`. Use a private environment file outside Git, for example `/etc/irstore24/staging.env`, mode 0600, containing only the real staging `POSTGRES_DB`, `POSTGRES_USER`, and `POSTGRES_PASSWORD`. Use credentials distinct from any eventual production database. Do not copy local `.env` or its HTTP cookie settings. Shell variables can override the file; inspect the invocation environment without printing secrets. The staging project retains `APP_ENV=production`, `AUTH_COOKIE_SECURE=true`, and the approved HTTPS Origins inherited from the base file.

## Future operator commands

Run only after confirming the checkout, Compose version, project name, published ports, and private environment file. The commands below select the staging project explicitly and do not name or stop `irstore24-web`.

~~~bash
cd /opt/irstore24-staging
docker compose --project-name irstore24-staging --env-file /etc/irstore24/staging.env -f docker-compose.yml -f docker-compose.staging.yml config --quiet
docker compose --project-name irstore24-staging --env-file /etc/irstore24/staging.env -f docker-compose.yml -f docker-compose.staging.yml build web api
docker compose --project-name irstore24-staging --env-file /etc/irstore24/staging.env -f docker-compose.yml -f docker-compose.staging.yml up -d db
docker compose --project-name irstore24-staging --env-file /etc/irstore24/staging.env -f docker-compose.yml -f docker-compose.staging.yml ps db
docker compose --project-name irstore24-staging --env-file /etc/irstore24/staging.env -f docker-compose.yml -f docker-compose.staging.yml run --rm --no-deps api /opt/venv/bin/python -m alembic current
docker compose --project-name irstore24-staging --env-file /etc/irstore24/staging.env -f docker-compose.yml -f docker-compose.staging.yml run --rm --no-deps api /opt/venv/bin/python -m alembic upgrade head
docker compose --project-name irstore24-staging --env-file /etc/irstore24/staging.env -f docker-compose.yml -f docker-compose.staging.yml run --rm --no-deps api /opt/venv/bin/python -m alembic check
docker compose --project-name irstore24-staging --env-file /etc/irstore24/staging.env -f docker-compose.yml -f docker-compose.staging.yml up -d api web
docker compose --project-name irstore24-staging --env-file /etc/irstore24/staging.env -f docker-compose.yml -f docker-compose.staging.yml ps
~~~

`config --quiet` checks syntax only. Before `build`, inspect the resolved configuration in a private session; full `docker compose ... config` output can include credentials, so never share its raw output. Verify its service port bindings are exactly 3100 and 8100 on `127.0.0.1` and that `db` has no `ports`. Verify the resolved volume name is `irstore24-staging_postgres_data`. Stop if any of these checks differ. Apply Alembic only to the new staging database after confirming the target. A healthy database container does not mean migrations completed.

## Staging checks and limits

From the VPS host, after the staging services are healthy, test the loopback endpoints:

~~~bash
curl --fail http://127.0.0.1:8100/api/health
curl --fail http://127.0.0.1:8100/api/health/database
curl --fail http://127.0.0.1:3100/
curl -i http://127.0.0.1:8100/api/auth/me
~~~

The final endpoint should return 401 when unauthenticated. Compare `docker compose ... ps` and the live HTTPS site before and after; the old `irstore24-web` and public site must remain unchanged. A direct port test does not validate Nginx `/api/*` routing, persistent media, Secure browser cookies, or a full checkout. Because the staging ports are loopback HTTP and the API keeps Secure cookies and HTTPS-only Origins, do not weaken cookie or Origin settings merely to make browser login work. Arrange a separately reviewed, private HTTPS staging ingress and test it before claiming a complete staging pass. Do not modify the live Nginx virtual host as part of this preparation.

The production Nginx location fragment in `nginx-irstore24.conf` targets future production ports 3000/8000; it is **not** a staging proxy configuration. The production systemd expiration timer must not be installed against the staging project. For staging-only expiration checks with disposable orders, run the job manually using the same explicit staging Compose options and `exec -T api /opt/venv/bin/python -m app.jobs.expire_orders`.

Do not delete either project's volume to troubleshoot failures. Stop on build, health, migration, or routing errors and preserve logs for review. See [deployment operations](DEPLOYMENT.md) for the eventual production cutover, media storage, backup, and rollback boundaries.
