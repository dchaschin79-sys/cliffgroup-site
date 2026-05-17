# Cliff Group Florida Static Site Deployment

This repository contains the static marketing website for Cliff Group Florida plus a separate lightweight lead-capture backend in `backend/`. The public homepage remains `index.html` and still deploys to Cloudflare Pages with no build command. The backend deploys separately to Railway.

## Production Files

Required for deployment:

- `index.html` - production homepage and all active page behavior.
- `_headers` - Cloudflare Pages security headers.
- `_redirects` - canonical redirect from `/index.html` to `/`.
- `backend/` - Railway-ready lead capture API, not part of the Cloudflare Pages static build.

Recommended to keep in the repository:

- `README_DEPLOYMENT.md` - deployment instructions.
- `README_LEAD_CAPTURE.md` - lead capture API and Railway deployment notes.
- `.gitignore` - ignores local metadata and future build/dependency artifacts.

Not required for the current production website:

- `app.js` - not referenced by `index.html`; the active marketing-page script is inline.
- `shots/` - local screenshot/reference asset.
- `uploads/` - local uploaded/reference images, not referenced by the homepage.
- `CLIFF_GROUP_PLATFORM_REPORT.md` - planning/reporting document, not required for serving the public site.
- `.DS_Store` - macOS metadata; should not be committed or deployed.

## Cloudflare Pages Deployment

Use Cloudflare Pages as a static site with no build command. Keep the backend deployment separate in Railway.

Recommended project settings:

| Setting | Value |
| --- | --- |
| Framework preset | None |
| Build command | Leave blank |
| Build output directory | `/` or repository root |
| Environment variables | None required for the static frontend |
| Production branch | `main` or your chosen production branch |

If Cloudflare requires an output directory value, use the repository root. Do not use a build command for the current version.

## Domain Setup

Recommended custom domain setup:

- `cliffgroupflorida.com` should point to the Cloudflare Pages project.
- `www.cliffgroupflorida.com` should redirect to `https://cliffgroupflorida.com`.
- Keep SaaS product subdomains separate for future apps:
  - `app.cliffgroupflorida.com`
  - `salespro.cliffgroupflorida.com`
  - `hvacpro.cliffgroupflorida.com`
  - `estimatepro.cliffgroupflorida.com`

For this static marketing deployment, only the apex domain and optional `www` redirect are required.

## Security Headers

The `_headers` file adds baseline Cloudflare Pages security headers:

- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy`
- `Content-Security-Policy`

The current site uses inline CSS and inline JavaScript, so the CSP allows `'unsafe-inline'` for scripts and styles. The CSP also allows form submissions to the Railway lead API at `https://cliffgroup-api-production.up.railway.app`. Tighten this later if the site is refactored into external static assets.

## Redirects

The `_redirects` file redirects `/index.html` to `/` for canonical homepage behavior.

No catch-all SPA redirect is needed because this is not a route-based SPA. The site uses in-page anchors such as:

- `#products`
- `#why`
- `#preview`
- `#contact`

## Functional Notes

Current buttons and modals remain frontend-only UI, but forms now submit to the backend API:

- Product cards open the product modal.
- Demo buttons open the demo modal.
- Contact and demo forms submit asynchronously to the lead API with loading, success, and error states.
- Form data is stored in PostgreSQL by the Railway backend.
- Resend sends internal and lead confirmation emails when configured.

The static frontend still has no auth, Stripe, client-side secrets, or build step.

## Deployment Checklist

- [ ] Commit `index.html`, `_headers`, `_redirects`, `.gitignore`, and `README_DEPLOYMENT.md`.
- [ ] Do not commit `.DS_Store`.
- [ ] Create a Cloudflare Pages project.
- [ ] Select the Git repository.
- [ ] Set framework preset to `None`.
- [ ] Leave build command blank.
- [ ] Set build output directory to repository root.
- [ ] Deploy the production branch.
- [ ] Add `cliffgroupflorida.com` as a custom domain.
- [ ] Redirect `www.cliffgroupflorida.com` to the apex domain.
- [ ] Confirm `https://cliffgroupflorida.com/` serves `index.html`.
- [ ] Confirm `/index.html` redirects to `/`.
- [ ] Confirm the nav anchors scroll to Platform, Products, Preview, and Contact.
- [ ] Confirm Book Demo opens the demo modal.
- [ ] Confirm product cards open the product modal.
- [ ] Confirm contact and demo forms submit to the lead API with no page reload.
- [ ] Confirm test leads appear in the Railway Postgres `leads` table.
- [ ] Confirm internal and confirmation emails send through Resend.
- [ ] Confirm security headers are present in the browser or with `curl -I`.

## Future Work Not Included In This Step

Do not add these until the SaaS platform phase:

- Authentication.
- Stripe Billing.
- Trial workspace provisioning.
- Product subdomain routing.
- Customer dashboard.
