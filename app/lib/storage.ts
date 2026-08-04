// app/lib/storage.ts
// ---------------------------------------------------------------------------
// Typed sessionStorage wrappers. sessionStorage is used (not localStorage):
//   - Cleared when the tab closes — no lingering tokens
//   - Not shared across tabs — reduced cross-tab attack surface
//
// All public functions guard against server-side invocation (no sessionStorage
// in Cloudflare Workers) by checking typeof window first.
// ---------------------------------------------------------------------------

const KEYS = {
  ACCESS_TOKEN:  'pkce.access_token',
  ID_TOKEN:      'pkce.id_token',
  REFRESH_TOKEN: 'pkce.refresh_token',
  CODE_VERIFIER: 'pkce.code_verifier',
  STATE:         'pkce.state',
  NONCE:         'pkce.nonce',
} as const

const isClient = () => typeof window !== 'undefined'

// ── Pre-auth ephemeral values ─────────────────────────────────────────────
// codeVerifier is only set for the PKCE flow; nonce is only set for the
// implicit flow (used to bind the returned id_token to this request).

export function saveAuthRequest(state: string, codeVerifier?: string, nonce?: string): void {
  if (!isClient()) return
  sessionStorage.setItem(KEYS.STATE, state)
  if (codeVerifier) sessionStorage.setItem(KEYS.CODE_VERIFIER, codeVerifier)
  else sessionStorage.removeItem(KEYS.CODE_VERIFIER)
  if (nonce) sessionStorage.setItem(KEYS.NONCE, nonce)
  else sessionStorage.removeItem(KEYS.NONCE)
}

export function loadAuthRequest(): { state: string; codeVerifier?: string; nonce?: string } | null {
  if (!isClient()) return null
  const state = sessionStorage.getItem(KEYS.STATE)
  if (!state) return null
  return {
    state,
    codeVerifier: sessionStorage.getItem(KEYS.CODE_VERIFIER) ?? undefined,
    nonce:        sessionStorage.getItem(KEYS.NONCE)         ?? undefined,
  }
}

export function clearAuthRequest(): void {
  if (!isClient()) return
  sessionStorage.removeItem(KEYS.STATE)
  sessionStorage.removeItem(KEYS.CODE_VERIFIER)
  sessionStorage.removeItem(KEYS.NONCE)
}

// ── Post-auth tokens ──────────────────────────────────────────────────────

export interface StoredTokens {
  accessToken: string
  idToken?: string
  refreshToken?: string
}

export function saveTokens(tokens: StoredTokens): void {
  if (!isClient()) return
  sessionStorage.setItem(KEYS.ACCESS_TOKEN, tokens.accessToken)
  if (tokens.idToken)      sessionStorage.setItem(KEYS.ID_TOKEN,      tokens.idToken)
  if (tokens.refreshToken) sessionStorage.setItem(KEYS.REFRESH_TOKEN, tokens.refreshToken)
}

export function loadTokens(): StoredTokens | null {
  if (!isClient()) return null
  const accessToken = sessionStorage.getItem(KEYS.ACCESS_TOKEN)
  if (!accessToken) return null
  return {
    accessToken,
    idToken:      sessionStorage.getItem(KEYS.ID_TOKEN)      ?? undefined,
    refreshToken: sessionStorage.getItem(KEYS.REFRESH_TOKEN) ?? undefined,
  }
}

export function clearTokens(): void {
  if (!isClient()) return
  sessionStorage.removeItem(KEYS.ACCESS_TOKEN)
  sessionStorage.removeItem(KEYS.ID_TOKEN)
  sessionStorage.removeItem(KEYS.REFRESH_TOKEN)
}

export function clearAll(): void {
  clearAuthRequest()
  clearTokens()
}
