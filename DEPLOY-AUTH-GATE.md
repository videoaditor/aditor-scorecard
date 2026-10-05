# Scorecard auth-gate + Cloudflare Pages migration

This moves score.aditor.ai off GitHub Pages onto Cloudflare Pages, puts it behind the central `@videoaditor/auth` gate (internal, leadership-only, `scorecard.read`), and moves the data-source token server-side so it stops shipping in the page's JavaScript.

**Ordering is safety-critical.**
The Cloudflare Access app currently in front of score.aditor.ai is the only thing keeping the leaked-token bundle off the open internet.
Do not remove Access, and do not move the domain, until the new gate is live and verified.

## What changed in the repo (this branch)

- `dashboard/functions/_middleware.ts` - the edge gate. The whole site is gated (no public landing); only a signed-in internal viewer with `scorecard.read` gets in.
- `dashboard/functions/api/scorecard/records.ts` - a server-side proxy for the single scorecard read. The token lives in the Pages project, never in the bundle.
- `dashboard/src/hooks/useScorecard.js` - now reads from the same-origin proxy (`/api/scorecard/records`); the `VITE_TEABLE_*` client config is gone.
- `dashboard/wrangler.toml`, `dashboard/tsconfig.json`, `dashboard/package.json` - CF Pages config, functions typecheck, `@videoaditor/auth` dependency.
- `.github/workflows/deploy-dashboard.yml` - **removed**, so merging this branch does not publish the proxy-calling bundle to GitHub Pages (where the Function can't run). GitHub Pages stays frozen on the last working bundle (behind Access) until the domain is flipped. Push-to-deploy becomes CF Pages Git integration.

Verified locally (Node 22): hermetic build green, functions typecheck green, `wrangler pages functions build` compiles, and the built bundle contains no token and calls `/api/scorecard/records`.

## 0. Register the app in aditor-db first (separate PR)

Merge the aditor-db migration that registers `scorecard-web` (audience `https://score.aditor.ai`, scope `scorecard.read`) with the leadership allow-list policy, then restart aditor-auth so `scorecard.read` enters the boot scope catalog.
The raw `scorecard-web` client secret is minted into `clients/aditor/.env` as `ADITOR_AUTH_SCORECARD_CLIENT_SECRET` (only its SHA-256 verifier goes in the migration); you set the raw value as `AUTH_CLIENT_SECRET` below.

## 1. Create the gate session store (KV)

Same Cloudflare account as `aditor-brain-guide` (caf450765), using an admin token:

```
CLOUDFLARE_API_TOKEN=<CF_SVCTOKEN_KV_ADMIN_ADITOR> \
CLOUDFLARE_ACCOUNT_ID=<CLOUDFLARE_ACCOUNT_ID_ADITOR> \
npx wrangler@3 kv namespace create AUTH_SESSIONS
```

Paste the returned id into `dashboard/wrangler.toml` (`AUTH_SESSIONS` id) and commit.

## 2. Create the Cloudflare Pages project (Git-connected = push-to-deploy)

Cloudflare dashboard (account caf450765) -> Workers & Pages -> Create -> Pages -> Connect to Git -> `videoaditor/aditor-scorecard`:

- Production branch: `master`
- **Root directory: `dashboard`** - critical. If left at the repo root, CF serves the stale "Brands" bundle, not the dashboard.
- Build command: `npm run build`
- Build output directory: `dist`
- Node version: 22 (set a `NODE_VERSION=22` environment variable)

Project name: `aditor-scorecard` (matches `wrangler.toml`).
After this, every push to `master` builds and deploys automatically - no GitHub Actions, no CF token in GitHub secrets.

## 3. Set the Pages project environment (Settings -> Environment variables, Production)

Secrets (encrypted):

- `AUTH_CLIENT_SECRET` = the raw `scorecard-web` client secret (`ADITOR_AUTH_SCORECARD_CLIENT_SECRET`).
- `AUTH_COOKIE_SECRET` = `openssl rand -base64 48` (save to `clients/aditor/.env` as `ADITOR_AUTH_SCORECARD_COOKIE_SECRET` and register it).
- `TEABLE_TOKEN` = a newly minted read-only token (step 5) - do not reuse the leaked one.

Plain vars:

- `TEABLE_URL` = `https://app.teable.ai`
- `TEABLE_TABLE_ID` = `tbl7295480347s6oVaI`

KV binding: `AUTH_SESSIONS` -> the namespace from step 1 (`wrangler.toml` sets this on deploy; confirm under Settings -> Functions -> KV namespace bindings).

## 4. Deploy and verify on the *.pages.dev URL (before touching score.aditor.ai)

Merging this branch to `master` triggers the first build; for a pre-merge check, deploy the branch from the CF dashboard.
On the project's `<project>.pages.dev` URL, confirm all four:

- Anonymous `GET /` returns 302 to `/auth/login` -> auth.aditor.ai (not the dashboard).
- Anonymous `GET /api/scorecard/records` returns 401 JSON.
- A leadership account signs in and the dashboard loads with data (the proxy works).
- A non-leadership internal account (e.g. an editor) is denied (missing `scorecard.read`).

Only proceed when all four hold.

## 5. Rotate the data-source token (mandatory - the old one is public)

The leaked token is baked into the live `gh-pages` bundle and its history.
In Teable (base `bsedpj9rQtsQFsPC3xm`):

- Create a new personal access token scoped read-only to the scorecard table (`record|read` on `tbl7295480347s6oVaI`; no `record|update`, no `field|*`, no base-wide scope).
- Set it as `TEABLE_TOKEN` on the Pages project (step 3).
- Revoke the old leaked token (`teable_acc...`).
- Update `vault/wiki/tools/credential-registry.md`: the scorecard token moves from a build-time repo secret to a Pages Function secret, now read-only.

## 6. Cut score.aditor.ai over to Cloudflare Pages

- Add `score.aditor.ai` as a custom domain on the Pages project (Custom domains -> Set up); CF updates the CNAME in the aditor.ai zone.
- Verify score.aditor.ai serves the gated app (repeat the step 4 checks against the real domain).
- Remove the Cloudflare Access application that fronted score.aditor.ai - it is now redundant, the gate is the access control. Do this last, after the gate is verified live.

## 7. Retire the old GitHub Pages path

Once score.aditor.ai is confirmed on CF Pages:

- (`deploy-dashboard.yml` is already removed in this branch; push-to-deploy is CF Pages Git integration.)
- Delete the `gh-pages` branch (local and origin) and turn off GitHub Pages for the repo; this also stops serving the bundle that still contains the old (now-revoked) token.
- Delete the stale repo-root build bundle (`index.html`, `assets/`, `avatars/`, `castles/`, `editors/`, `CNAME`); it never deployed and is a trap for a CF root-directory misconfig. Confirm no bookmark depends on it first.
- Remove the now-unused `VITE_TEABLE_*` repo secrets from `videoaditor/aditor-scorecard`; the token is no longer built into the client.

## Rollback

Through step 5, nothing user-facing has changed: score.aditor.ai still serves GitHub Pages behind Access, so there is nothing to roll back.
If step 6 fails, point score.aditor.ai back at GitHub Pages and re-add the Access app; the `gh-pages` branch is untouched until step 7.
The old token is revoked in step 5, so only re-expose through GitHub Pages with the new token if you must (not recommended).
