# Canvasflow OAuth Validator

A browser-based developer tool for testing and inspecting the **OAuth 2.0 Authorization Code + PKCE** flow (RFC 6749 + RFC 7636) against any OIDC-compliant Identity Provider.

Built with **React 18 · Vite 8 · TanStack Router · Hono · Tailwind CSS v4 · TypeScript**, deployed as a **Cloudflare Worker** serving a static SPA. No OAuth libraries — PKCE and JWT handling use the browser's native **Web Crypto API** exclusively.

---

## Why this tool exists

Canvasflow integrates with multiple customer Identity Providers (Auth0, Okta, AWS Cognito, Azure AD, and others). Each tenant configures their own IdP, which means the exact shape of the issued access token — its claims, signing algorithm, audience value, and entitlements structure — varies per deployment.

Before this tool, verifying that a new IdP integration was correct required:

1. Spinning up the full Canvasflow backend and a test publication
2. Pasting raw tokens into jwt.io (no server-side signature check, no entitlement parsing)
3. Writing one-off scripts to hit the token endpoint and decode the result

This validator condenses that into a single self-contained URL:

- **Executes the full PKCE flow** so you test the actual browser redirect, not a simulated token
- **Decodes and annotates every claim** with Canvasflow-specific context (e.g. flags a wrong `aud`, highlights an empty entitlements array)
- **Verifies the JWT signature server-side** via a Cloudflare Worker — either by fetching the IdP's public keys from JWKS or by a shared HMAC secret
- **Normalises entitlements** across the three claim names Canvasflow's pre-token hook may use (`cf:entitlements`, `resources`, `entitlements`)
- **Refreshes tokens** so you can confirm the refresh grant is working without building a separate test harness
- Requires **zero backend deployment** per developer — all IdP settings are stored in `localStorage` and the Worker is shared

---

## Architecture

```
Browser (SPA)                         Cloudflare Worker
┌───────────────────────────────┐     ┌──────────────────────────────────┐
│  TanStack Router              │     │  src/worker.ts                   │
│  ┌────────────────────────┐   │     │  ┌────────────────────────────┐  │
│  │  /login                │   │     │  │  /api/*  →  Hono router    │  │
│  │  /callback             │   │  ←→ │  │  /api/validate/signature   │  │
│  │  /dashboard            │   │     │  └────────────────────────────┘  │
│  └────────────────────────┘   │     │  everything else → ASSETS SPA    │
│                               │     └──────────────────────────────────┘
│  Web Crypto API (PKCE / HMAC) │
│  localStorage  (IdP config)   │
│  sessionStorage (tokens)      │
└───────────────────────────────┘
```

The SPA handles the entire OAuth flow client-side. The Worker backend exists only for the `/api/validate/signature` endpoint, which needs server-side access to fetch JWKS keys (avoiding CORS restrictions from the browser).

---

## Project structure

```
oauth-validator/
├── app/
│   ├── client.tsx                  # React entry point, mounts router
│   ├── router.tsx                  # TanStack Router instance
│   ├── styles.css                  # Tailwind v4 entry; @theme design tokens
│   ├── routes/
│   │   ├── __root.tsx              # Root layout
│   │   ├── index.tsx               # Redirects / → /login
│   │   ├── login.tsx               # Login route
│   │   ├── callback.tsx            # OAuth callback route
│   │   └── dashboard.tsx           # Post-auth dashboard route
│   ├── components/
│   │   ├── LoginScreen.tsx         # Sign-in card with IdP settings access
│   │   ├── CallbackScreen.tsx      # Handles redirect, exchanges code
│   │   ├── DashboardScreen.tsx     # Main shell after authentication
│   │   ├── TokenInspector.tsx      # Tabbed JWT viewer (header / claims / raw)
│   │   ├── ClaimRow.tsx            # Single claim display row (supports pills)
│   │   ├── SignatureValidator.tsx  # Calls Worker to verify JWT signature
│   │   ├── TokenRefresh.tsx        # Exchanges refresh token for new tokens
│   │   ├── SettingsDialog.tsx      # <dialog> for configuring the IdP
│   │   └── ThemeToggle.tsx         # Light / dark mode toggle
│   ├── lib/
│   │   ├── config.ts               # OAuthConfig type; localStorage read/write
│   │   ├── oauth.ts                # login(), handleCallback(), refreshTokens()
│   │   ├── pkce.ts                 # code_verifier / code_challenge (Web Crypto)
│   │   ├── storage.ts              # sessionStorage wrappers for token objects
│   │   └── jwt.ts                  # Client-side JWT decode + claim helpers
│   ├── server/
│   │   ├── app.ts                  # Hono app; registers API routes
│   │   ├── routes/
│   │   │   └── validate-signature.ts  # POST /api/validate/signature handler
│   │   └── lib/
│   │       ├── jwt-verify.ts       # verifyJwtSignature (JWKS) + verifyJwtWithSecret (HMAC)
│   │       ├── jwks.ts             # JWKS fetch + key caching
│   │       └── entitlements.ts     # Normalises entitlement claims
│   ├── routeTree.gen.ts            # Auto-generated by TanStack Router plugin
│   └── types/
│       └── app.ts                  # Shared TypeScript types
├── src/
│   └── worker.ts                   # Cloudflare Worker entry point
├── index.html                      # Shell HTML; theme init script; Google Fonts
├── vite.config.ts                  # Vite 8 + @cloudflare/vite-plugin + Tailwind
├── wrangler.toml                   # Cloudflare Worker / Assets config
├── tsconfig.json
├── package.json
└── .github/
    └── workflows/
        └── deploy.yml              # CI/CD: push to main or develop → deploy
```

---

## Pre-requisites

| Requirement | Version | Notes |
|---|---|---|
| Node.js | ≥ 20 | Required by Vite 8 and Wrangler |
| npm | ≥ 10 | Comes with Node 20 |
| Cloudflare account | — | Free tier is sufficient |
| Wrangler CLI | ≥ 4 | Installed as a dev dependency; `npx wrangler` works |
| A registered OIDC IdP | — | Auth0, Okta, Cognito, Azure AD, or any RFC 8414 compliant provider |

No environment variables are needed at build time. All IdP settings are entered at runtime through the in-app Settings dialog and stored in `localStorage`.

---

## Installation

```bash
# 1. Clone the repository
git clone https://github.com/canvasflow/oauth-validator.git
cd oauth-validator

# 2. Install dependencies
npm install

# 3. Start the local dev server
npm run dev
# → http://localhost:5173
```

On first load, click the **gear icon** (⚙) to open the Settings dialog and fill in your IdP details. No `.env` file is needed.

### Required IdP settings

| Field | Description |
|---|---|
| Issuer | The `iss` claim value / base URL of your IdP |
| Authorization endpoint | The `/authorize` URL |
| Token endpoint | The `/token` URL |
| Client ID | Your SPA's client ID (public client — no secret) |
| Redirect URI | Must be registered in your IdP (default: `http://localhost:5173/callback`) |
| Scope | Space-separated scopes, e.g. `openid profile email` |
| Audience | Optional — required by Auth0 and some others |

### Token verification settings

| Mode | When to use |
|---|---|
| **JWKS** (default) | IdP publishes a JWKS endpoint. The Worker fetches the public key and verifies the signature. Optionally override the JWKS URI if auto-discovery is not available. |
| **Shared secret** | IdP uses HMAC (HS256/HS384/HS512). Enter the shared secret — it is sent to the Worker in the verification request and never stored server-side. |

---

## Running locally

```bash
npm run dev        # Start Vite dev server + Worker (via @cloudflare/vite-plugin)
npm run build      # Production build → dist/
npm run check      # TypeScript type check (no emit)
```

The dev server runs the Cloudflare Worker in a local Miniflare environment, so the `/api/validate/signature` endpoint works exactly as it does in production.

---

## Deployment

Deployment is fully automated via GitHub Actions. Any push to `main` or `develop` triggers a build and deploy to Cloudflare Workers.

### First-time setup

1. **Create the Worker** — the first deploy creates it automatically. No manual setup in the Cloudflare dashboard is required.

2. **Add the API token secret to GitHub:**
   - Go to your Cloudflare dashboard → **My Profile → API Tokens**
   - Create a token with `Cloudflare Workers:Edit` and `Cloudflare Pages:Edit` permissions
   - Add it to the repository under **Settings → Secrets → Actions** as `CLOUDFLARE_API_TOKEN`

3. **Register the production redirect URI** in your IdP:
   - `https://oauth-validator.<your-subdomain>.workers.dev/callback`
   - Or your custom domain if you've configured one in Wrangler

### Manual deploy

```bash
npm run deploy     # Equivalent to: npm run build && wrangler deploy
```

### CI/CD pipeline (`deploy.yml`)

```
push → main or develop
  └─ npm install
  └─ npm run build
  └─ wrangler deploy  (using CLOUDFLARE_API_TOKEN secret)
```

Both `main` and `develop` deploy to the same Worker. If you need separate staging and production environments, configure [Wrangler environments](https://developers.cloudflare.com/workers/wrangler/environments/) in `wrangler.toml`.

---

## IdP quick-start notes

**Auth0**
Set `Audience` to your API identifier (e.g. `canvasflow-api`). Register the app as a **Single Page Application** (not a regular web app). PKCE is enabled automatically for SPAs.

**Okta**
Use the authorization server issuer URL (not the org URL). Set grant type to `Authorization Code`. Enable PKCE in the app settings. Leave the client secret blank.

**AWS Cognito**
Create an App Client with **no client secret**. Enable `Authorization code grant`. Add the callback URL to **Allowed callback URLs**. The scope `openid` is required; `profile` and `email` are optional.

**Azure AD / Entra ID**
Register as a **Single-page application** (the SPA registration type enables PKCE automatically and disables the client secret). Add the callback URL to **Redirect URIs** under the SPA platform.

**Generic OIDC**
Any provider that exposes a `/.well-known/openid-configuration` discovery document will work. Fill in the issuer, authorization endpoint, and token endpoint manually, or derive them from the discovery document.

---

## Security notes

- **Tokens are stored in `sessionStorage`** — cleared when the tab closes, not shared across tabs, and not accessible to other origins.
- **IdP settings are stored in `localStorage`** — persistent across sessions, but scoped to the origin. The shared secret (if used) is also stored here; only use HMAC mode in non-production environments.
- **Signature verification runs on the Worker**, not in the browser. This avoids CORS issues when fetching JWKS endpoints and keeps the verification logic off the client.
- **This tool is for developers and QA only** — it is not intended to be a production authentication client.
