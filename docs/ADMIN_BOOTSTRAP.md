# Administrator bootstrap

The API deliberately has no administrator registration endpoint and creates no
default administrator. A database operator must explicitly approve the first
promotion.

1. Register a normal account through `POST /api/auth/register` with a unique
   email and a strong password controlled by the intended administrator.
2. On the intended database connection, verify the database name, host, and
   account identity before making any change. Obtain operator approval for the
   specific account ID. Never place a password or database credential in a
   command, source file, or Git commit.
3. In a transaction, lock that account and inspect its ID, email, role,
   `is_active`, and `is_banned`. Promote only the verified, active, unbanned
   account by setting `role = 'admin'` and `updated_at = now()`. Check that
   exactly one row was updated before committing; otherwise roll back.
4. Have the administrator log out and log in again, then verify that an
   authenticated `GET /api/admin/settings` returns either settings or a 404
   indicating that settings have not yet been initialized.

The first settings row must be created separately by an administrator using
`PATCH /api/admin/settings` with a real, approved `usdt_toman_rate`.
No exchange rate or payment details are generated automatically.
