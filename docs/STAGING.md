# Isolated staging on the existing VPS

This is a **historical staging plan**. The operator has verified that `irstore24-staging` is the live production project. The new `docker-compose.production-live.yml` overlay applies only to that live project after this staging file; it restores the production media path without changing ports or the PostgreSQL volume. Do not use this staging file's declared project name for a new candidate. Nothing in this task accessed the VPS.

## Known host facts and remaining checks

The original 2026-10-29 host facts are superseded by the operator's report that the storefront is live. Inspect the current Compose project labels, database volume, media mount, free host ports, Compose version, and HTTPS routing before preparing any candidate.

## Isolation contract

| Resource | Existing site | Proposed staging |
| --- | --- | --- |
| Checkout | Inspect live path; the runbook records `/opt/irstore24-staging` | Choose a verified-unused path |
| Compose project | Verified live: `irstore24-staging` | This file's name is occupied; choose a new unused project |
| Web container | Inspect live container | Compose-generated name only if project is unused |
| Web host port | Live: `127.0.0.1:3100` | Choose an unused loopback port |
| API host port | Live: `127.0.0.1:8100` | Choose an unused loopback port |
| PostgreSQL host port | Inspect live binding | None in this file |
| Database volume | Inspect and preserve actual live name | This file would select `irstore24-staging_postgres_data`; do not use if live |
| Nginx | Live HTTPS site | No change during staging preparation |

The staging API media mount is `/srv/irstore24-staging/media:/app/media`, separate from production `/srv/irstore24/media`. Create its `cs2/` and `tf2/` directories for UID/GID 10001 with mode 0755 before starting the API; the bind mount will not auto-create the host path. Staging Nginx, if later approved, must serve `/media/` from the staging directory.

The volume name is project-scoped because `postgres_data` has no fixed `name:`. This file sets `name: irstore24-staging`. If that project is live, its volume is production data and the file is not an isolated staging configuration. Never run `docker compose up`, `down`, or a base-file-only command against an unverified live checkout.

## Files and private environment

The two-file staging configuration is `docker-compose.yml` plus `docker-compose.staging.yml`, in that order, but its declared project name is already occupied by production. A genuinely isolated staging deployment first needs a reviewed, different project name, ports, media path, and database volume. The live production invocation adds `docker-compose.production-live.yml` as the third file; never add that live overlay to a genuine staging project. Explicit `-f` selection prevents Compose from loading the local development override. The staging file uses Compose `!override` to **replace**, rather than append to, the base port lists and to clear database ports. It needs Docker Compose 2.24.4 or newer; check the VPS version before using it. The local Compose 2.40.3 parser accepted it.

Only after inspection, an operator may prepare a separate candidate checkout at a verified-unused path; `/opt/irstore24-staging` may already be the live checkout. Use a private environment file outside Git, for example `/etc/irstore24/staging.env`, mode 0600, containing only the real staging `POSTGRES_DB`, `POSTGRES_USER`, and `POSTGRES_PASSWORD`. Use credentials distinct from any eventual production database. Do not copy local `.env` or its HTTP cookie settings. Shell variables can override the file; inspect the invocation environment without printing secrets. Any separately approved candidate must retain `APP_ENV=production`, `AUTH_COOKIE_SECURE=true`, and approved HTTPS Origins inherited from the base file.

## Candidate deployment commands are intentionally withheld

The command block that previously started `irstore24-staging` has been removed because the preserved server runbook says that name may now be the **live production project**. Running `up`, `run`, or Alembic under it without inspection could touch production data or containers.

Before any candidate deployment, inspect the live project labels, volume, checkout, media mount, and occupied ports. If `irstore24-staging` is live, create a separately reviewed candidate Compose override with a new project name, unused loopback ports, a distinct media directory, and a disposable database volume. Keep the live project and its volume untouched. Validate the resolved config without exposing credentials. See [deployment operations](DEPLOYMENT.md) for the release gates and [server migration](SERVER_MIGRATION.md) for the preserved historical runbook.

## Staging checks and limits

From the VPS host, after the staging services are healthy, test the loopback endpoints:

~~~bash
curl --fail http://127.0.0.1:8100/api/health
curl --fail http://127.0.0.1:8100/api/health/database
curl --fail http://127.0.0.1:3100/
curl -i http://127.0.0.1:8100/api/auth/me
~~~

The final endpoint should return 401 when unauthenticated. Compare `docker compose ... ps` and the live HTTPS site before and after; the old `irstore24-web` and public site must remain unchanged. A direct port test does not validate Nginx `/api/*` routing, persistent media, Secure browser cookies, or a full checkout. Because the staging ports are loopback HTTP and the API keeps Secure cookies and HTTPS-only Origins, do not weaken cookie or Origin settings merely to make browser login work. Arrange a separately reviewed, private HTTPS staging ingress and test it before claiming a complete staging pass. Do not modify the live Nginx virtual host as part of this preparation.

The production Nginx location fragment in `nginx-irstore24.conf` is **not** a candidate proxy configuration. Do not install or run the production expiration timer against an unverified candidate project. Any disposable candidate expiration test must use its separately verified project and database.

Do not delete either project's volume to troubleshoot failures. Stop on build, health, migration, or routing errors and preserve logs for review. See [deployment operations](DEPLOYMENT.md) for the eventual production cutover, media storage, backup, and rollback boundaries.
