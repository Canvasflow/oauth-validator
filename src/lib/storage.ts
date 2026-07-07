// src/lib/storage.ts
// ---------------------------------------------------------------------------
// Typed sessionStorage wrappers.
//
// sessionStorage is used (not localStorage) because:
//   - Cleared automatically when the tab closes — no lingering tokens
//   - Not shared across tabs — reduces cross-tab attack surface
//   - Sufficient for a PoC where persistence across sessions is not needed
//
// In a production app you would want to consider:
//   - In-memory only (most secure, lost on refresh)
//   - Refresh-token rotation with secure HttpOnly cookies
//   - NEVER storing tokens in localStorage
// ---------------------------------------------------------------------------

const KEYS = {
  ACCESS_TOKEN: 'pkce.access_token',
  ID_TOKEN: 'pkce.id_token',
  REFRESH_TOKEN: 'pkce.refresh_token',
  CODE_VERIFIER: 'pkce.code_verifier',
  STATE: 'pkce.state',
} as const

// ---------------------------------------------------------------------------
// Pre-auth ephemeral values (cleared after callback)
// ---------------------------------------------------------------------------

export function saveAuthRequest(state: string, codeVerifier: string): void {
  sessionStorage.setItem(KEYS.STATE, state)
  sessionStorage.setItem(KEYS.CODE_VERIFIER, codeVerifier)
}

export function loadAuthRequest(): { state: string; codeVerifier: string } | null {
  const state = sessionStorage.getItem(KEYS.STATE)
  const codeVerifier = sessionStorage.getItem(KEYS.CODE_VERIFIER)
  if (!state || !codeVerifier) return null
  return { state, codeVerifier }
}

export function clearAuthRequest(): void {
  sessionStorage.removeItem(KEYS.STATE)
  sessionStorage.removeItem(KEYS.CODE_VERIFIER)
}

// ---------------------------------------------------------------------------
// Post-auth tokens
// ---------------------------------------------------------------------------

export interface StoredTokens {
  accessToken: string
  idToken?: string
  refreshToken?: string
}

export function saveTokens(tokens: StoredTokens): void {
  sessionStorage.setItem(KEYS.ACCESS_TOKEN, tokens.accessToken)
  if (tokens.idToken) sessionStorage.setItem(KEYS.ID_TOKEN, tokens.idToken)
  if (tokens.refreshToken) sessionStorage.setItem(KEYS.REFRESH_TOKEN, tokens.refreshToken)
}

export function loadTokens(): StoredTokens | null {
  const accessToken = sessionStorage.getItem(KEYS.ACCESS_TOKEN)
  if (!accessToken) return null
  return {
    accessToken,
    idToken: sessionStorage.getItem(KEYS.ID_TOKEN) ?? undefined,
    refreshToken: sessionStorage.getItem(KEYS.REFRESH_TOKEN) ?? undefined,
  }
}

export function clearTokens(): void {
  sessionStorage.removeItem(KEYS.ACCESS_TOKEN)
  sessionStorage.removeItem(KEYS.ID_TOKEN)
  sessionStorage.removeItem(KEYS.REFRESH_TOKEN)
}

export function clearAll(): void {
  clearAuthRequest()
  clearTokens()
}
