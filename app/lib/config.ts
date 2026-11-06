// app/lib/config.ts
// OAuth config is stored in localStorage and managed via the Settings dialog.
// No env vars required — the user fills in IdP details at runtime.

const STORAGE_KEY = 'oauth_config'

export type VerificationMethod = 'jwks' | 'secret'

// 'pkce' (default) — Authorization Code + PKCE, RFC 6749 + RFC 7636.
// 'implicit' — Implicit grant, RFC 6749 §4.2. Deprecated by the OAuth 2.0
// Security Best Current Practice (RFC 9700); kept here only so this tool can
// validate legacy IdP configurations still running it.
export type AuthFlow = 'pkce' | 'implicit'

export interface OAuthConfig {
  issuer: string
  authorizationEndpoint: string
  tokenEndpoint: string
  clientId: string
  redirectUri: string
  scope: string
  audience?: string
  flow: AuthFlow
  verificationMethod: VerificationMethod
  jwksUri?: string
  // HS256 shared secret, used exactly as typed: its UTF-8 bytes are the HMAC
  // key (CF-OAUTH §5.2.2). Never trimmed.
  secret?: string
  // ── Canvasflow Resource Server expectations (CF-OAUTH) ──
  // Value that must be present in the access token's `aud`. Defaults to
  // canvasflow-api; AWS Cognito tenants register their app client id.
  expectedAudience?: string
  // Cognito accommodation (typ_strict = false): typ may be "JWT" or absent,
  // and token_use must be "access".
  cognitoMode?: boolean
  // V5 — the Canvasflow GraphQL endpoint and the PWA's app-key to probe.
  graphqlUrl?: string
  appKey?: string
}

export const DEFAULT_AUDIENCE = 'canvasflow-api'

export function getExpectedAudience(cfg: OAuthConfig | null): string {
  return cfg?.expectedAudience?.trim() || DEFAULT_AUDIENCE
}

export function getOAuthConfig(): OAuthConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as OAuthConfig
  } catch {
    return null
  }
}

export function saveOAuthConfig(config: OAuthConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

export function resetOAuthConfig(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export function isConfigured(): boolean {
  const cfg = getOAuthConfig()
  if (!cfg) return false
  return !!(
    cfg.issuer &&
    cfg.authorizationEndpoint &&
    (cfg.flow === 'implicit' || cfg.tokenEndpoint) &&
    cfg.clientId &&
    cfg.redirectUri &&
    cfg.scope
  )
}
