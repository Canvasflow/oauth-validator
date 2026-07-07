// src/lib/jwt.ts
// ---------------------------------------------------------------------------
// Client-side JWT decoding — for DISPLAY PURPOSES ONLY.
//
// This does NOT verify the signature. Signature verification is the Resource
// Server's job (the GraphQL server). The SPA's responsibility is:
//   1. Obtain the token via the PKCE flow
//   2. Store it safely
//   3. Send it in the Authorization header on every API request
//   4. Display token claims to help the developer understand what was issued
//
// Never make authorization decisions in the SPA based on decoded claims.
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
  entitlements?: string[]
  resources?: string[]      // legacy claim name — also displayed if present
  email?: string
  name?: string
  picture?: string
  [key: string]: unknown
}

export interface DecodedJwt {
  header: JwtHeader
  payload: JwtPayload
  raw: {
    header: string
    payload: string
    signature: string
  }
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

    const header = JSON.parse(base64UrlDecode(rawHeader)) as JwtHeader
    const payload = JSON.parse(base64UrlDecode(rawPayload)) as JwtPayload

    return {
      header,
      payload,
      raw: {
        header: rawHeader,
        payload: rawPayload,
        signature: rawSignature,
      },
    }
  } catch {
    return null
  }
}

/**
 * Returns a human-readable relative time string for a Unix timestamp.
 * e.g. "in 42 minutes", "3 hours ago"
 */
export function formatExpiry(exp: number): string {
  const nowSecs = Math.floor(Date.now() / 1000)
  const diffSecs = exp - nowSecs

  if (diffSecs < 0) {
    const ago = Math.abs(diffSecs)
    if (ago < 60) return `expired ${ago}s ago`
    if (ago < 3600) return `expired ${Math.floor(ago / 60)}m ago`
    return `expired ${Math.floor(ago / 3600)}h ago`
  }

  if (diffSecs < 60) return `expires in ${diffSecs}s`
  if (diffSecs < 3600) return `expires in ${Math.floor(diffSecs / 60)}m`
  return `expires in ${Math.floor(diffSecs / 3600)}h`
}

export function isExpired(exp: number): boolean {
  return Math.floor(Date.now() / 1000) >= exp
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function base64UrlDecode(str: string): string {
  // Restore standard base64 padding
  const padded = str.replace(/-/g, '+').replace(/_/g, '/').padEnd(
    str.length + ((4 - (str.length % 4)) % 4),
    '='
  )
  return atob(padded)
}
