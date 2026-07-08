// app/server/routes/validate-signature.ts
// POST /api/validate/signature
// ---------------------------------------------------------------------------
// Cryptographically verifies a JWT's signature using either the issuer's JWKS
// (default) or a shared HMAC secret when verificationMethod is "secret".
// ---------------------------------------------------------------------------
import type { Context } from 'hono'
import { resolveJwksUri } from '../lib/jwks'
import { verifyJwtSignature, verifyJwtWithSecret } from '../lib/jwt-verify'
import { extractEntitlements } from '../lib/entitlements'

function b64Decode(segment: string): string {
  const padded = segment
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(segment.length + ((4 - (segment.length % 4)) % 4), '=')
  return atob(padded)
}

function decodePayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    return JSON.parse(b64Decode(parts[1])) as Record<string, unknown>
  } catch {
    return null
  }
}

export async function handleValidateSignature(c: Context) {
  let body: { token?: unknown; verificationMethod?: unknown; jwksUri?: unknown; secret?: unknown }
  try {
    body = await c.req.json<{
      token?: unknown
      verificationMethod?: unknown
      jwksUri?: unknown
      secret?: unknown
    }>()
  } catch {
    return c.json({ valid: false, error: 'Request body must be JSON' }, 400)
  }

  const { token, verificationMethod, jwksUri: overrideJwksUri, secret } = body
  if (!token || typeof token !== 'string') {
    return c.json({ valid: false, error: 'Missing or invalid `token` field' }, 400)
  }

  const payload = decodePayload(token)
  if (!payload) {
    return c.json({ valid: false, error: 'Invalid JWT structure' }, 400)
  }

  const iss = payload.iss as string | undefined

  // ── Shared secret path ────────────────────────────────────────────────────
  if (verificationMethod === 'secret') {
    if (!secret || typeof secret !== 'string' || !secret.trim()) {
      return c.json({ valid: false, error: 'verificationMethod is "secret" but no secret was provided' }, 400)
    }

    const result = await verifyJwtWithSecret(token, secret.trim())
    if (!result.valid) {
      return c.json({
        valid: false,
        error: result.error,
        algorithm: result.algorithm,
        keyId: result.keyId,
        issuer: iss,
      })
    }

    const { entitlements, source } = extractEntitlements(payload)
    return c.json({
      valid: true,
      algorithm: result.algorithm,
      keyId: result.keyId,
      issuer: iss,
      subject: payload.sub as string | undefined,
      entitlements,
      entitlementsSource: source,
    })
  }

  // ── JWKS path (default) ───────────────────────────────────────────────────
  const explicitJwksUri =
    typeof overrideJwksUri === 'string' && overrideJwksUri.trim() ? overrideJwksUri.trim() : undefined

  let jwksUri: string
  if (explicitJwksUri) {
    jwksUri = explicitJwksUri
  } else if (iss) {
    jwksUri = await resolveJwksUri(iss)
  } else {
    return c.json({
      valid: false,
      error: 'Token has no `iss` claim and no JWKS URI was provided — cannot locate JWKS',
    }, 400)
  }

  const result = await verifyJwtSignature(token, jwksUri)

  if (!result.valid) {
    return c.json({
      valid: false,
      error: result.error,
      algorithm: result.algorithm,
      keyId: result.keyId,
      issuer: iss,
      jwksUri,
    })
  }

  const { entitlements, source } = extractEntitlements(payload)
  return c.json({
    valid: true,
    algorithm: result.algorithm,
    keyId: result.keyId,
    issuer: iss,
    subject: payload.sub as string | undefined,
    jwksUri,
    entitlements,
    entitlementsSource: source,
  })
}
