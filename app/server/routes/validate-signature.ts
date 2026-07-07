// app/server/routes/validate-signature.ts
// POST /api/validate/signature
// ---------------------------------------------------------------------------
// Cryptographically verifies a JWT's signature using the issuer's JWKS.
// The client sends only the raw token; the server derives the issuer from
// the `iss` claim and fetches the public key to verify.
// ---------------------------------------------------------------------------
import type { Context } from 'hono'
import { resolveJwksUri } from '../lib/jwks'
import { verifyJwtSignature } from '../lib/jwt-verify'
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
  let body: { token?: unknown }
  try {
    body = await c.req.json<{ token?: unknown }>()
  } catch {
    return c.json({ valid: false, error: 'Request body must be JSON' }, 400)
  }

  const { token } = body
  if (!token || typeof token !== 'string') {
    return c.json({ valid: false, error: 'Missing or invalid `token` field' }, 400)
  }

  const payload = decodePayload(token)
  if (!payload) {
    return c.json({ valid: false, error: 'Invalid JWT structure' }, 400)
  }

  const iss = payload.iss as string | undefined
  if (!iss) {
    return c.json({ valid: false, error: 'Token has no `iss` claim — cannot locate JWKS' }, 400)
  }

  const jwksUri = await resolveJwksUri(iss)
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
