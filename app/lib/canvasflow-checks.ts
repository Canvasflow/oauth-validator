// app/lib/canvasflow-checks.ts
// ---------------------------------------------------------------------------
// The checks the Canvasflow Resource Server applies to a tenant access token
// (CF-OAUTH v1.1.0), run client-side on the decoded token so the validator
// shows V1 and V3 exactly as the API will judge them. Pure: no I/O. The
// signature itself (V2) is verified server-side (/api/validate/signature).
// ---------------------------------------------------------------------------
import type { DecodedJwt } from './jwt'
import { getExpectedAudience, type OAuthConfig } from './config'

export type CheckStatus = 'pass' | 'warn' | 'fail'

export interface Check {
  id: string
  group: 'V1' | 'V2' | 'V3'
  label: string
  status: CheckStatus
  detail?: string
}

const CLOCK_TOLERANCE_S = 60
const MAX_LIFETIME_S = 3600
const MIN_SECRET_BYTES = 32
const JWKS_ALGS = ['RS256', 'ES256']
const HMAC_ALGS = ['HS256']
const CLAIM_NAMES = ['cf:entitlements', 'resources', 'entitlements'] as const
const ENTITLEMENT = /^cf:([a-z]+):([A-Za-z0-9_-]+)$/
const PII_CLAIMS = ['email', 'name', 'given_name', 'family_name', 'phone_number', 'address']

export function runCanvasflowChecks(
  token: DecodedJwt,
  config: OAuthConfig | null,
  nowSec: number = Math.floor(Date.now() / 1000),
): Check[] {
  const { header, payload } = token
  const checks: Check[] = []
  const add = (c: Check) => checks.push(c)

  // ── V1: header ───────────────────────────────────────────────────────────
  const typ = typeof header.typ === 'string' ? header.typ : undefined
  if (config?.cognitoMode) {
    const typOk = typ === undefined || typ === 'JWT'
    const useOk = payload.token_use === 'access'
    add({
      id: 'typ', group: 'V1', label: 'Access token type (Cognito mode)',
      status: typOk && useOk ? 'pass' : 'fail',
      detail: !typOk
        ? `typ is "${typ}"; Cognito mode accepts "JWT" or no typ`
        : !useOk
          ? `token_use is ${JSON.stringify(payload.token_use)}; must be "access" (an ID token is rejected)`
          : 'typ JWT/absent with token_use "access"',
    })
  } else {
    const normalized = typ?.toLowerCase().replace(/^application\//, '')
    add({
      id: 'typ', group: 'V1', label: 'typ is at+jwt',
      status: normalized === 'at+jwt' ? 'pass' : 'fail',
      detail: normalized === 'at+jwt'
        ? typ
        : `typ is ${typ === undefined ? 'missing' : `"${typ}"`}. Cognito tenants: enable Cognito mode in Settings.`,
    })
  }

  const method = config?.verificationMethod ?? 'jwks'
  const allowed = method === 'secret' ? HMAC_ALGS : JWKS_ALGS
  add({
    id: 'alg', group: 'V1', label: `alg allowed for the ${method === 'secret' ? 'HS256' : 'JWKS'} path`,
    status: header.alg && allowed.includes(header.alg) ? 'pass' : 'fail',
    detail: `alg is ${header.alg ? `"${header.alg}"` : 'missing'}; Canvasflow accepts ${allowed.join(' / ')} for this path`,
  })

  add({
    id: 'kid', group: 'V1', label: 'kid present',
    status: typeof header.kid === 'string' && header.kid ? 'pass' : 'fail',
    detail: typeof header.kid === 'string' && header.kid ? header.kid : 'every token must carry a kid header',
  })

  // ── V1: payload ──────────────────────────────────────────────────────────
  if (config?.issuer) {
    const iss = payload.iss
    add({
      id: 'iss', group: 'V1', label: 'iss matches the registered issuer exactly',
      status: iss === config.issuer ? 'pass' : 'fail',
      detail: iss === config.issuer
        ? iss
        : `token iss ${JSON.stringify(iss)} ≠ ${JSON.stringify(config.issuer)} (trailing slash and case matter)`,
    })
  }

  const audience = getExpectedAudience(config)
  const aud = payload.aud
  const audOk = typeof aud === 'string' ? aud === audience : Array.isArray(aud) && aud.includes(audience)
  add({
    id: 'aud', group: 'V1', label: `aud contains "${audience}"`,
    status: audOk ? 'pass' : 'fail',
    detail: `aud is ${JSON.stringify(aud)}`,
  })

  const sub = payload.sub
  add({
    id: 'sub', group: 'V1', label: 'sub is a stable opaque id',
    status: typeof sub !== 'string' || !sub ? 'fail' : sub.includes('@') ? 'warn' : 'pass',
    detail: typeof sub !== 'string' || !sub
      ? 'sub is required'
      : sub.includes('@') ? 'sub looks like an email address; it must be an opaque id' : sub,
  })

  add({
    id: 'jti', group: 'V1', label: 'jti present',
    status: typeof payload.jti === 'string' && payload.jti ? 'pass' : 'fail',
    detail: typeof payload.jti === 'string' ? payload.jti : 'jti is required (used to correlate server logs)',
  })

  const { iat, exp } = payload
  if (typeof iat !== 'number' || typeof exp !== 'number') {
    add({ id: 'times', group: 'V1', label: 'iat and exp present', status: 'fail', detail: 'both are required numeric dates' })
  } else {
    add({
      id: 'iat', group: 'V1', label: 'iat not in the future (60s tolerance)',
      status: iat <= nowSec + CLOCK_TOLERANCE_S ? 'pass' : 'fail',
      detail: `iat is ${iat - nowSec}s from now`,
    })
    add({
      id: 'lifetime', group: 'V1', label: 'exp − iat ≤ 3600s',
      status: exp - iat <= MAX_LIFETIME_S ? 'pass' : 'fail',
      detail: `${exp - iat}s`,
    })
    add({
      id: 'exp', group: 'V1', label: 'Not expired',
      // Expiry is expected over time; it is what V5 relies on, not a defect.
      status: exp > nowSec - CLOCK_TOLERANCE_S ? 'pass' : 'warn',
      detail: exp > nowSec ? `${exp - nowSec}s left` : `expired ${nowSec - exp}s ago — the API will reject it (see V5)`,
    })
  }

  // ── V1/V3: entitlement claim (§4.3–§4.4) ─────────────────────────────────
  const claim = CLAIM_NAMES.find((name) => payload[name] !== undefined)
  const values = claim ? payload[claim] : undefined
  if (!claim) {
    add({
      id: 'claim', group: 'V1', label: 'Entitlement claim present',
      status: 'warn',
      detail: 'No cf:entitlements / resources / entitlements claim: accepted as free content only, but logged as a probable hook misconfiguration. Emit an explicit [] for free-tier users.',
    })
  } else if (!Array.isArray(values)) {
    add({
      id: 'claim', group: 'V1', label: 'Entitlement claim is an array',
      status: 'fail',
      detail: `${claim} is ${typeof values}; a present non-array claim rejects the whole token`,
    })
  } else {
    add({ id: 'claim', group: 'V1', label: 'Entitlement claim is an array', status: 'pass', detail: `resolved from ${claim}` })

    const issues: string[] = []
    const ignored: unknown[] = []
    const unsupported: string[] = []
    for (const v of values) {
      const m = typeof v === 'string' ? ENTITLEMENT.exec(v) : null
      if (!m) ignored.push(v)
      else if (m[1] === 'issue' && /^\d+$/.test(m[2])) issues.push(v as string)
      else unsupported.push(v as string)
    }
    add({
      id: 'effective', group: 'V3', label: 'Effective entitlements',
      status: 'pass',
      detail: issues.length ? issues.join(', ') : 'none — free content only',
    })
    if (ignored.length) {
      add({
        id: 'ignored', group: 'V3', label: 'Values without a valid cf: prefix',
        status: 'warn',
        detail: `${ignored.map((v) => JSON.stringify(v)).join(', ')} — silently ignored by the API`,
      })
    }
    if (unsupported.length) {
      add({
        id: 'unsupported', group: 'V3', label: 'cf: values the API does not gate',
        status: 'warn',
        detail: `${unsupported.join(', ')} — only cf:issue:<number> grants access today`,
      })
    }
    const otherClaims = CLAIM_NAMES.filter((n) => n !== claim && payload[n] !== undefined)
    if (otherClaims.length) {
      add({
        id: 'shadowed', group: 'V3', label: 'Lower-precedence claims ignored',
        status: 'warn',
        detail: `${otherClaims.join(', ')} present but ignored (no merging; ${claim} wins)`,
      })
    }
  }

  const pii = PII_CLAIMS.filter((c) => payload[c] !== undefined)
  if (pii.length) {
    add({
      id: 'pii', group: 'V1', label: 'No PII in the access token',
      status: 'warn',
      detail: `${pii.join(', ')} present; personal data belongs in the ID token`,
    })
  }

  // ── V2: HS256 secret rules (§5.2.2) ──────────────────────────────────────
  if (method === 'secret' && config?.secret !== undefined) {
    const bytes = new TextEncoder().encode(config.secret).length
    add({
      id: 'secret-length', group: 'V2', label: 'Shared secret ≥ 32 bytes (UTF-8)',
      status: bytes >= MIN_SECRET_BYTES ? 'pass' : 'fail',
      detail: `${bytes} bytes`,
    })
    if (config.secret !== config.secret.trim()) {
      add({
        id: 'secret-whitespace', group: 'V2', label: 'Shared secret has no surrounding whitespace',
        status: 'warn',
        detail: 'The secret is used exactly as given (not trimmed); make sure the IdP signs with the same bytes',
      })
    }
  }

  return checks
}

export function summarize(checks: Check[]): CheckStatus {
  if (checks.some((c) => c.status === 'fail')) return 'fail'
  if (checks.some((c) => c.status === 'warn')) return 'warn'
  return 'pass'
}
