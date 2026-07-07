# OAuth PKCE PoC

A minimal proof-of-concept SPA implementing the **OAuth 2.0 Authorization Code + PKCE** flow (RFC 6749 + RFC 7636).

Built with **React + Vite + TypeScript**. Zero OAuth libraries — PKCE is implemented with the browser's native **Web Crypto API**.

---

## What this PoC does

1. Initiates an Authorization Code + PKCE flow (S256 method)
2. Handles the callback redirect from the IdP
3. Exchanges the auth code for tokens at the token endpoint
4. Stores tokens in `sessionStorage`
5. Displays decoded JWT claims in a Token Inspector UI

**What it explicitly does NOT do:**

- Verify JWT signatures (that is the GraphQL Resource Server's responsibility)
- Manage token revocation (tenant Authorization Server's responsibility)
- Make any API calls beyond the token endpoint

---

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Configure your IdP
cp .env.example .env.local
# Edit .env.local with your IdP values

# 3. Start the dev server
npm run dev
# → http://localhost:5173
```

Your IdP must have `http://localhost:5173/callback` registered as an allowed redirect URI.

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `VITE_OAUTH_ISSUER` | ✓ | IdP issuer URL (the `iss` claim value) |
| `VITE_OAUTH_AUTHORIZATION_ENDPOINT` | ✓ | IdP authorization endpoint |
| `VITE_OAUTH_TOKEN_ENDPOINT` | ✓ | IdP token endpoint |
| `VITE_OAUTH_CLIENT_ID` | ✓ | OAuth client ID (public SPA — no secret) |
| `VITE_OAUTH_REDIRECT_URI` | ✓ | Redirect URI (must match IdP registration) |
| `VITE_OAUTH_SCOPE` | ✓ | Requested scopes (e.g. `openid email profile`) |
| `VITE_OAUTH_AUDIENCE` | optional | Audience param (required by Auth0, others) |

---

## Project structure

```
oauth-pkce-poc/
├── src/
│   ├── lib/
│   │   ├── config.ts     # Environment-driven OAuth config
│   │   ├── pkce.ts       # PKCE helpers (Web Crypto API only)
│   │   ├── oauth.ts      # Flow orchestration: login() + handleCallback()
│   │   ├── storage.ts    # Typed sessionStorage wrappers
│   │   └── jwt.ts        # JWT decode (display only — no signature verification)
│   ├── components/
│   │   ├── LoginScreen.tsx      # Pre-auth screen with sign-in button
│   │   ├── CallbackScreen.tsx   # Processes the IdP redirect
│   │   ├── DashboardScreen.tsx  # Post-auth shell
│   │   ├── TokenInspector.tsx   # Decoded token viewer (3 tabs)
│   │   └── ClaimRow.tsx         # Single claim display row
│   ├── types/
│   │   └── app.ts        # AppScreen + AuthState types
│   ├── App.tsx            # Root component + minimal routing
│   ├── main.tsx           # Entry point
│   └── styles.css         # All styles (no CSS framework)
├── .env.example           # IdP config template
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## PKCE implementation

The PKCE helpers in `src/lib/pkce.ts` use only `crypto.getRandomValues` and `crypto.subtle.digest`:

```
code_verifier  = BASE64URL(32 random bytes)
code_challenge = BASE64URL(SHA256(code_verifier))
state          = BASE64URL(16 random bytes)   ← CSRF token
```

No third-party crypto libraries. Works in any modern browser and Node ≥ 18.

---

## Token storage

`sessionStorage` is used deliberately:
- Cleared when the tab closes (no persistent token leakage)
- Not shared across tabs
- Sufficient for a PoC

In production, prefer in-memory storage for access tokens and refresh tokens in HttpOnly cookies.

---

## Architecture boundary

This SPA is a **pure client** (OAuth Client + minimal UI). It has no opinion about:

- How the tenant configures their IdP
- What claims are in the token
- How the GraphQL server validates signatures

The GraphQL server (Resource Server) owns signature verification and entitlement enforcement. The `jwt.ts` decode is for developer inspection only.

---

## IdP quick-start notes

**Auth0:** Set `VITE_OAUTH_AUDIENCE=canvasflow-api`. Register the app as a SPA (not a regular web app). Enable PKCE in the app settings.

**Okta:** Use the authorization server URL for `ISSUER`. Ensure the client application has `Authorization Code` grant type and PKCE enabled. No client secret for SPAs.

**AWS Cognito:** Set `App client` to have no secret. Enable `Authorization code grant`. Add `http://localhost:5173/callback` to callback URLs.

**Azure AD:** Register as a SPA (not a web app — SPA gets no client secret and enables PKCE by default). Add `http://localhost:5173/callback` as a redirect URI.
