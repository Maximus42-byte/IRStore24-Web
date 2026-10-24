# Pending order expiration

Pending orders reserve inventory until their stored `expires_at` timestamp.
The backend command below processes due orders in batches and returns stock
transactionally:

```bash
~/Projects/IRStore24/backend/.venv/bin/python -m app.jobs.expire_orders --batch-size 100
```

Run it from the `backend` directory with the same environment as the API.
A deployment scheduler can invoke it every minute. This repository does not
configure a Production scheduler; that remains a separate deployment step.

The command selects due pending orders with PostgreSQL row locks and
`SKIP LOCKED`, then commits each expiration and stock restoration together.
It is safe to run repeatedly or from more than one scheduler process.
Confirmation and cancellation also check the stored expiry timestamp, so a
late payment confirmation cannot succeed while waiting for the next run.

Monitor command failures and rerun after resolving them. If a referenced
product has been physically removed outside the API, expiration stops and
rolls back that order; product deletion must follow the existing soft-delete
policy.
