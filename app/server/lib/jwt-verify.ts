// app/server/lib/jwt-verify.ts
// ---------------------------------------------------------------------------
// Server-side JWT signature verification using the Web Crypto API.
// Compatible with Cloudflare Workers (and any Web-Crypto environment).
// Supports RSA-PKCS1 (RS256/384/512), RSA-PSS (PS256/384/512),
// and ECDSA (ES256/384/512).
// ---------------------------------------------------------------------------

interface AlgParams {
  importParams: RsaHashedImportParams | EcKeyImportParams
  verifyParams: AlgorithmIdentifier | RsaPssParams | EcdsaParams
}

function getAlgParams(alg: string): AlgParams {
  switch (alg) {
    case 'RS256':
      return { importParams: { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, verifyParams: 'RSASSA-PKCS1-v1_5' }
    case 'RS384':
      return { importParams: { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-384' }, verifyParams: 'RSASSA-PKCS1-v1_5' }
    case 'RS512':
      return { importParams: { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-512' }, verifyParams: 'RSASSA-PKCS1-v1_5' }
    case 'PS256':
      return { importParams: { name: 'RSA-PSS', hash: 'SHA-256' }, verifyParams: { name: 'RSA-PSS', saltLength: 32 } }
    case 'PS384':
      return { importParams: { name: 'RSA-PSS', hash: 'SHA-384' }, verifyParams: { name: 'RSA-PSS', saltLength: 48 } }
    case 'PS512':
      return { importParams: { name: 'RSA-PSS', hash: 'SHA-512' }, verifyParams: { name: 'RSA-PSS', saltLength: 64 } }
    case 'ES256':
      return { importParams: { name: 'ECDSA', namedCurve: 'P-256' }, verifyParams: { name: 'ECDSA', hash: 'SHA-256' } }
    case 'ES384':
      return { importParams: { name: 'ECDSA', namedCurve: 'P-384' }, verifyParams: { name: 'ECDSA', hash: 'SHA-384' } }
    case 'ES512':
      return { importParams: { name: 'ECDSA', namedCurve: 'P-521' }, verifyParams: { name: 'ECDSA', hash: 'SHA-512' } }
    default:
      throw new Error(`Unsupported algorithm: ${alg}`)
  }
}

function base64UrlToBytes(str: string): ArrayBuffer {
  const padded = str
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(str.length + ((4 - (str.length % 4)) % 4), '=')
  const binary = atob(padded)
  const buffer = new ArrayBuffer(binary.length)
  const view = new Uint8Array(buffer)
  for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i)
  return buffer
}

function b64Decode(segment: string): string {
  const padded = segment
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(segment.length + ((4 - (segment.length % 4)) % 4), '=')
  return atob(padded)
}

export interface VerifyResult {
  valid: boolean
  algorithm?: string
  keyId?: string
  error?: string
}

const HMAC_HASH: Record<string, string> = {
  HS256: 'SHA-256',
  HS384: 'SHA-384',
  HS512: 'SHA-512',
}

export async function verifyJwtWithSecret(token: string, secret: string): Promise<VerifyResult> {
  const parts = token.split('.')
  if (parts.length !== 3) return { valid: false, error: 'Invalid JWT structure (expected 3 segments)' }

  const [headerSeg, payloadSeg, signatureSeg] = parts

  let header: { alg?: string; kid?: string }
  try {
    header = JSON.parse(b64Decode(headerSeg)) as { alg?: string; kid?: string }
  } catch {
    return { valid: false, error: 'Failed to decode JWT header' }
  }

  const alg = header.alg ?? 'HS256'
  const kid = header.kid
  const hashAlg = HMAC_HASH[alg]

  if (!hashAlg) {
    return {
      valid: false,
      algorithm: alg,
      keyId: kid,
      error: `${alg} is not an HMAC algorithm. For asymmetric tokens select JWKS verification.`,
    }
  }

  try {
    const keyData = new TextEncoder().encode(secret)
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: hashAlg },
      false,
      ['verify'],
    )

    const signingInput = new TextEncoder().encode(`${headerSeg}.${payloadSeg}`)
    const signature = base64UrlToBytes(signatureSeg)
    const valid = await crypto.subtle.verify('HMAC', cryptoKey, signature, signingInput)

    if (!valid) {
      return { valid: false, algorithm: alg, keyId: kid, error: 'Signature verification failed — secret may be incorrect' }
    }

    return { valid: true, algorithm: alg, keyId: kid }
  } catch (e) {
    return { valid: false, algorithm: alg, keyId: kid, error: `Verification error: ${(e as Error).message}` }
  }
}

export async function verifyJwtSignature(
  token: string,
  jwksUri: string
): Promise<VerifyResult> {
  const parts = token.split('.')
  if (parts.length !== 3) return { valid: false, error: 'Invalid JWT structure (expected 3 segments)' }

  const [headerSeg, payloadSeg, signatureSeg] = parts

  let header: { alg?: string; kid?: string }
  try {
    header = JSON.parse(b64Decode(headerSeg)) as { alg?: string; kid?: string }
  } catch {
    return { valid: false, error: 'Failed to decode JWT header' }
  }

  const { alg, kid } = header
  if (!alg) return { valid: false, error: 'No alg claim in JWT header' }

  let algParams: AlgParams
  try {
    algParams = getAlgParams(alg)
  } catch (e) {
    return { valid: false, algorithm: alg, keyId: kid, error: (e as Error).message }
  }

  // ── Fetch JWKS ────────────────────────────────────────────────────────────
  let jwks: { keys: JsonWebKey[] }
  try {
    const res = await fetch(jwksUri, { cf: { cacheTtl: 300, cacheEverything: true } } as RequestInit)
    if (!res.ok) return { valid: false, algorithm: alg, keyId: kid, error: `JWKS fetch failed: HTTP ${res.status}` }
    jwks = (await res.json()) as { keys: JsonWebKey[] }
  } catch (e) {
    return { valid: false, algorithm: alg, keyId: kid, error: `JWKS fetch error: ${(e as Error).message}` }
  }

  // ── Select key ────────────────────────────────────────────────────────────
  const jwk = kid
    ? jwks.keys.find((k) => (k as Record<string, unknown>).kid === kid)
    : jwks.keys.find((k) => !k.use || k.use === 'sig') ?? jwks.keys[0]

  if (!jwk) {
    return {
      valid: false,
      algorithm: alg,
      keyId: kid,
      error: kid ? `Key "${kid}" not found in JWKS` : 'No suitable key found in JWKS',
    }
  }

  // ── Import key ────────────────────────────────────────────────────────────
  let cryptoKey: CryptoKey
  try {
    cryptoKey = await crypto.subtle.importKey('jwk', jwk, algParams.importParams, false, ['verify'])
  } catch (e) {
    return { valid: false, algorithm: alg, keyId: kid, error: `Key import failed: ${(e as Error).message}` }
  }

  // ── Verify ────────────────────────────────────────────────────────────────
  try {
    const data = new TextEncoder().encode(`${headerSeg}.${payloadSeg}`)
    const signature = base64UrlToBytes(signatureSeg)
    const valid = await crypto.subtle.verify(algParams.verifyParams, cryptoKey, signature, data)
    return { valid, algorithm: alg, keyId: kid }
  } catch (e) {
    return { valid: false, algorithm: alg, keyId: kid, error: `Verification error: ${(e as Error).message}` }
  }
}
