# IRStore24

Next.js storefront and FastAPI backend for CS2 items and TF2 keys. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the application boundaries.

## Local development

1. Use a local PostgreSQL database. Copy `.env.example` to `.env` and supply your own local database credentials. The backend reads `.env` from the project root.
2. For plain HTTP development, set `APP_ENV=development`, `AUTH_COOKIE_SECURE=false`, and `AUTH_ALLOWED_ORIGINS=["http://localhost:3000"]` in the local `.env`. Use **localhost** consistently in the browser. These settings are for local development only; HTTPS production keeps Secure cookies.
3. Apply existing migrations to the local database:

   `cd backend && /home/maximus/Projects/IRStore24/backend/.venv/bin/python -m alembic upgrade head`

4. Start FastAPI from `backend/`:

   `/home/maximus/Projects/IRStore24/backend/.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000`

5. In another terminal at the repository root, run `npm install` and `npm run dev`. Open `http://localhost:3000`.

The Next.js development server forwards `/api/*` to `http://127.0.0.1:8000`. Set `API_PROXY_TARGET` only if FastAPI uses another local address. Browser requests remain same origin, so the HttpOnly session cookie stays with the browser and FastAPI receives the browser's Origin header. Production requires Nginx to route `/api/*` to FastAPI and `/media/*` to persistent media storage; Next.js does not add a production API rewrite. The tracked Nginx and Compose files do not yet provide that production routing. See [local end-to-end validation](docs/E2E_VALIDATION.md).

Product image paths are `/media/*`. To preview images locally, make the corresponding files available under `public/media/` or use a local media server at that path. The UI falls back to the weapon label if an image is absent or fails to load.

Store settings and catalog data must be entered by an authorized administrator. No exchange rate, payment card, product, or admin account is seeded by the frontend. The first admin settings save requires a real USDT/Toman rate. Registration creates an account, then the user signs in separately.

## Checks

`npm run build`, `npm run typecheck`, and `npm run test:frontend` validate the frontend. There is currently no ESLint configuration. From `backend/`, run `/home/maximus/Projects/IRStore24/backend/.venv/bin/python -m pytest` and `/home/maximus/Projects/IRStore24/backend/.venv/bin/python -m alembic check`.
