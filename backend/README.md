# Cliff Group Lead Capture API

This backend is a lightweight Railway-ready API for the static Cliff Group Florida marketing site.

## What It Does

- Accepts marketing form submissions from the static site.
- Stores leads in PostgreSQL.
- Sends internal and confirmation emails through Resend.
- Provides a minimal Basic Auth protected `/admin` dashboard.
- Keeps the public website static and Cloudflare Pages compatible.

## Local Setup

1. Copy `backend/.env.example` to `backend/.env`.
2. Set `DATABASE_URL`, `ADMIN_PASSWORD`, and Resend values.
3. Install dependencies:

```bash
npm install
```

4. Prepare the database:

```bash
npm run db:migrate
```

5. Start the API:

```bash
npm start
```

The API listens on `http://127.0.0.1:8788` by default.

## API Routes

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Health check for Railway. |
| `POST` | `/api/leads/demo` | Demo request form. |
| `POST` | `/api/leads/contact` | Contact request form. |
| `POST` | `/api/leads/walkthrough` | Workflow walkthrough request form. |
| `GET` | `/admin` | Protected recent leads list. |
| `GET` | `/admin/leads/:id` | Protected lead detail view. |
| `POST` | `/admin/leads/:id/status` | Protected status update. |

## Railway Deployment

Deploy the `backend/` directory as a Railway service.

Required environment variables:

- `DATABASE_URL`
- `DATABASE_SSL`
- `ALLOWED_ORIGINS`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `INTERNAL_NOTIFICATION_EMAIL`
- `EMAIL_ENABLED`
- `PUBLIC_SITE_URL`

Recommended production origin list:

```text
https://cliffgroupflorida.com,https://www.cliffgroupflorida.com
```

After Railway deploys, map the service to:

```text
https://api.cliffgroupflorida.com
```

Then confirm:

```bash
curl https://api.cliffgroupflorida.com/api/health
```

## Notes

- The API stores leads before attempting email notifications.
- If Resend is not configured, leads are still stored and notification status is reported as skipped.
- The admin dashboard is intentionally small and should later be replaced or integrated into the SaaS control plane.
