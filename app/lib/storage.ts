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
} as const

const isClient = () => typeof window !== 'undefined'

// ── Pre-auth ephemeral values ─────────────────────────────────────────────

export function saveAuthRequest(state: string, codeVerifier: string): void {
  if (!isClient()) return
  sessionStorage.setItem(KEYS.STATE, state)
  sessionStorage.setItem(KEYS.CODE_VERIFIER, codeVerifier)
}

export function loadAuthRequest(): { state: string; codeVerifier: string } | null {
  if (!isClient()) return null
  const state        = sessionStorage.getItem(KEYS.STATE)
  const codeVerifier = sessionStorage.getItem(KEYS.CODE_VERIFIER)
  if (!state || !codeVerifier) return null
  return { state, codeVerifier }
}

export function clearAuthRequest(): void {
  if (!isClient()) return
  sessionStorage.removeItem(KEYS.STATE)
  sessionStorage.removeItem(KEYS.CODE_VERIFIER)
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
