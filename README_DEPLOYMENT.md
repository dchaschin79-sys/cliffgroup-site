# Cliff Group Florida Railway Deployment

This repository now deploys the public Cliff Group Florida marketing website as a minimal Node static service on Railway.

The site is still a static frontend. There is no frontend build step, no auth, and no Stripe integration. The separate lead-capture API remains in `backend/` and is already hosted at:

`https://zesty-reflection-production-274d.up.railway.app`

## Production Architecture

| Layer | File / Service | Purpose |
| --- | --- | --- |
| Web service | `server.js` | Serves `index.html`, static files, security headers, health checks, and SPA fallback routes |
| Runtime config | `package.json` | Declares Node runtime and `npm start` |
| Lockfile | `package-lock.json` | Lets Railway install the root app deterministically |
| Railway config | `railway.json` | Uses Nixpacks, starts `npm start`, and checks `/health` |
| Homepage | `index.html` | Production landing page and active inline UI logic |
| Optional script copy | `app.js` | Kept aligned with inline form logic, but not referenced by `index.html` |
| Lead API | `backend/` | Separate Railway backend service for PostgreSQL lead capture |

## Product Routes

The public website keeps a lightweight static architecture. Railway serves `index.html` for extensionless product paths, and the page applies route-specific product copy in the browser.

| Route | Product Experience | Notes |
| --- | --- | --- |
| `/` | HVAC Pro / ecosystem entry | Defaults to the HVAC operations platform story |
| `/hvacpro` | HVAC Pro | Dispatch, estimating, scheduling, invoicing and field coordination for HVAC contractors |
| `/salespro` | SalesPro | Inventory, orders, invoices, purchasing, payments and spreadsheet replacement for small businesses |
| `/salespro/demo` | SalesPro demo | Loads SalesPro positioning and opens the demo modal |
| `/salespro/login` | SalesPro route preserved | Served by the same static fallback until a dedicated app/login surface is connected |

Future products can reuse the same route-profile pattern without adding CMS complexity.

## Railway Web Service Settings

Use the repository root for the public website service.

| Setting | Value |
| --- | --- |
| Builder | Nixpacks |
| Root directory | Repository root |
| Install command | Railway default, `npm install` |
| Start command | `npm start` |
| Health check path | `/health` |
| Required env vars | None for the frontend |
| Port binding | `server.js` listens on `process.env.PORT` |

Do not set the web service root directory to `backend/`. The `backend/` folder is a separate API service with its own deployment config.

## Local Validation

```bash
npm install
HOST=127.0.0.1 PORT=8787 npm start
curl -I http://127.0.0.1:8787/
curl -I http://127.0.0.1:8787/app.js
curl -I http://127.0.0.1:8787/some/spa/path
curl -s http://127.0.0.1:8787/health
```

Expected results:

- `/` returns `200` and `text/html`.
- `/app.js` returns `200` and `application/javascript`.
- Unknown extensionless paths return `index.html` for SPA fallback support.
- `/health` returns `{"ok":true}`.
- Security headers are present.

## Lead Forms

The frontend lead forms post JSON to:

`https://zesty-reflection-production-274d.up.railway.app/api/leads`

Payload shape:

- `name`
- `email`
- `phone`
- `company`
- `message`
- `source`

The page CSP allows `connect-src` to the Railway lead API. The backend config includes the custom domain and Railway website origin by default; keep any additional production domains in the lead API `ALLOWED_ORIGINS` environment variable.

## Removed Deployment Files

These Cloudflare/static-hosting files were intentionally removed from the Railway web service path:

- `_headers`
- `_redirects`

Security headers and fallback routing now live in `server.js`, because Railway serves this site through Node rather than Cloudflare Pages static-file conventions.

## Deployment Checklist

- [ ] Confirm the Railway website service uses the repository root.
- [ ] Confirm the Railway website service is not pointed at `backend/`.
- [ ] Confirm Railway detects Node/Nixpacks.
- [ ] Confirm `npm install` completes.
- [ ] Confirm Railway starts `npm start`.
- [ ] Confirm logs show `Cliff Group site listening on 0.0.0.0:$PORT`.
- [ ] Confirm `/health` returns `{"ok":true}`.
- [ ] Confirm the public Railway URL serves the homepage.
- [ ] Confirm `/app.js` and image assets serve with `200`.
- [ ] Confirm an extensionless path such as `/platform` serves the homepage.
- [ ] Confirm the contact/demo forms submit to the lead API.
- [ ] Confirm the lead appears in the backend admin dashboard or database.

## Important Notes

- The public website and lead API are two separate Railway services.
- The public website should not run the backend API from `backend/`.
- The backend API should not serve the marketing homepage.
- Keep the website deployment minimal: `package.json`, `package-lock.json`, `railway.json`, and `server.js`.
