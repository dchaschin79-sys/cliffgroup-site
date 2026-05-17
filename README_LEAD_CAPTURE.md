# Cliff Group Florida Lead Capture Infrastructure

Phase 2 adds real lead capture while keeping the public website static.

## Architecture

| Layer | Location | Deployment |
| --- | --- | --- |
| Marketing website | `index.html` | Cloudflare Pages, no build command |
| Lead API | `backend/` | Railway Node.js service |
| Lead storage | PostgreSQL | Railway Postgres or managed Postgres |
| Email notifications | Resend | API calls from the backend |
| Admin view | `/admin` on backend | HTTP Basic Auth |

The frontend posts to `https://cliffgroup-api-production.up.railway.app/api/leads`.

## Database Schema

The lead table is created by `backend/migrations/001_create_leads.sql`.

Core fields:

- `id`
- `created_at`
- `updated_at`
- `form_type`
- `full_name`
- `email`
- `company`
- `role`
- `phone`
- `team_size`
- `message`
- `operational_problem`
- `source_page`
- `status`
- `metadata`

## API Routes

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Railway health check |
| `POST` | `/api/leads` | Generic production lead endpoint |
| `POST` | `/api/leads/demo` | Backward-compatible demo request form |
| `POST` | `/api/leads/contact` | Backward-compatible contact form |
| `POST` | `/api/leads/walkthrough` | Backward-compatible walkthrough form |
| `GET` | `/admin` | Protected lead list |
| `GET` | `/admin/leads/:id` | Protected lead detail |
| `POST` | `/admin/leads/:id/status` | Protected status update |

## Required Environment Variables

Backend variables:

```text
PORT=8788
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
DATABASE_SSL=true
ALLOWED_ORIGINS=https://cliffgroupflorida.com,https://www.cliffgroupflorida.com,https://cliffgroup-site-production.up.railway.app
ADMIN_USERNAME=admin
ADMIN_PASSWORD=replace-with-a-long-random-password
RESEND_API_KEY=re_replace_with_resend_key
RESEND_FROM_EMAIL=Cliff Group Florida <hello@cliffgroup.software>
INTERNAL_NOTIFICATION_EMAIL=hello@cliffgroup.software
EMAIL_ENABLED=true
PUBLIC_SITE_URL=https://cliffgroupflorida.com
```

## Railway Deployment

1. Create a Railway service from the `backend/` directory.
2. Add a Railway Postgres database or attach a managed Postgres connection.
3. Add the environment variables above.
4. Deploy the backend service.
5. Map or confirm the Railway service at `https://cliffgroup-api-production.up.railway.app`.
6. Confirm `https://cliffgroup-api-production.up.railway.app/api/health` returns `{"ok":true}`.
7. Submit a test lead from the production site.
8. Confirm the lead appears in the backend admin dashboard.

## Security Notes

- Request bodies are limited.
- CORS is restricted by `ALLOWED_ORIGINS`.
- Lead submission routes are rate limited.
- A hidden honeypot field is included for spam protection prep.
- Admin routes use HTTP Basic Auth and require `ADMIN_PASSWORD`.
- Secrets belong only in Railway environment variables, never in `index.html`.

## Future SaaS Readiness

This lead system is intentionally not a CRM or onboarding system. It is structured so future phases can promote a lead into:

- an organization record,
- a customer account,
- a Stripe customer,
- a product entitlement,
- and a SaaS onboarding workflow.
