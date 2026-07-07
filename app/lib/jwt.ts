// app/lib/jwt.ts
// ---------------------------------------------------------------------------
// Client-side JWT decoding — display purposes only. Does NOT verify the
// signature. Signature verification is the server's responsibility (Hono
// endpoint at POST /api/validate/signature).
// ---------------------------------------------------------------------------

export interface JwtHeader {
  typ?: string
  alg?: string
  kid?: string
  [key: string]: unknown
}

export interface JwtPayload {
  iss?: string
  sub?: string
  aud?: string | string[]
  exp?: number
  iat?: number
  jti?: string
  // Entitlement claims — normalized by extractEntitlements() in this module.
  // Priority: 'cf:entitlements' > 'resources' > 'entitlements'
  'cf:entitlements'?: string[]
  resources?: string[]
  entitlements?: string[]
  // Identity claims (ID token)
  email?: string
  name?: string
  picture?: string
  [key: string]: unknown
}

export interface DecodedJwt {
  header: JwtHeader
  payload: JwtPayload
  raw: { header: string; payload: string; signature: string }
}

export type EntitlementsSource = 'cf:entitlements' | 'resources' | 'entitlements' | null

export interface NormalizedEntitlements {
  values: string[] | undefined
  source: EntitlementsSource
}

/**
 * Decode a JWT without verifying its signature.
 * Returns null if the token is structurally invalid.
 */
export function decodeJwt(token: string): DecodedJwt | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const [rawHeader, rawPayload, rawSignature] = parts
    const header  = JSON.parse(b64UrlDecode(rawHeader))  as JwtHeader
    const payload = JSON.parse(b64UrlDecode(rawPayload)) as JwtPayload
    return { header, payload, raw: { header: rawHeader, payload: rawPayload, signature: rawSignature } }
  } catch {
    return null
  }
}

/**
 * Normalize the three possible entitlement claim names into a single value.
 * Priority order: cf:entitlements  >  resources  >  entitlements
 */
export function extractEntitlements(payload: JwtPayload): NormalizedEntitlements {
  if (payload['cf:entitlements'] !== undefined) {
    return { values: payload['cf:entitlements'], source: 'cf:entitlements' }
  }
  if (payload.resources !== undefined) {
    return { values: payload.resources, source: 'resources' }
  }
  if (payload.entitlements !== undefined) {
    return { values: payload.entitlements, source: 'entitlements' }
  }
  return { values: undefined, source: null }
}

export function formatExpiry(exp: number): string {
  const nowSecs = Math.floor(Date.now() / 1000)
  const diff    = exp - nowSecs
  if (diff < 0) {
    const ago = Math.abs(diff)
    if (ago < 60)   return `expired ${ago}s ago`
    if (ago < 3600) return `expired ${Math.floor(ago / 60)}m ago`
    return `expired ${Math.floor(ago / 3600)}h ago`
  }
  if (diff < 60)   return `expires in ${diff}s`
  if (diff < 3600) return `expires in ${Math.floor(diff / 60)}m`
  return `expires in ${Math.floor(diff / 3600)}h`
}

export function isExpired(exp: number): boolean {
  return Math.floor(Date.now() / 1000) >= exp
}

// ── Internal ──────────────────────────────────────────────────────────────────

function b64UrlDecode(str: string): string {
  const padded = str
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(str.length + ((4 - (str.length % 4)) % 4), '=')
  return atob(padded)
}
