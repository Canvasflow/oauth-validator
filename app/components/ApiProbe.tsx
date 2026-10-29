import { useState } from 'react'
import { decodeJwt, isExpired } from '../lib/jwt'
import { getOAuthConfig } from '../lib/config'

// V5 — Expiry behavior (CF-OAUTH v1.1.0 §9.4): an expired access token sent to
// the Canvasflow GraphQL API gets the generic INVALID_TOKEN error, and the
// refreshed token restores access. The browser calls the API directly: only
// the access token is sent, never the ID or refresh token (§8.5).

interface Props {
  accessToken: string
}

type Outcome = 'accepted' | 'rejected' | 'error'

interface Probe {
  at: Date
  jti?: string
  expired: boolean
  outcome: Outcome
  detail: string
}

const PROBE_QUERY = '{ issues(limit: 1) { id } }'

export function ApiProbe({ accessToken }: Props) {
  const [probes, setProbes] = useState<Probe[]>([])
  const [loading, setLoading] = useState(false)
  const config = getOAuthConfig()
  const ready = !!(config?.graphqlUrl && config.appKey)

  const handleProbe = async () => {
    if (!config?.graphqlUrl || !config.appKey) return
    const payload = decodeJwt(accessToken)?.payload
    const expired = payload?.exp !== undefined && isExpired(payload.exp)
    setLoading(true)
    let probe: Probe
    try {
      const res = await fetch(config.graphqlUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'app-key': config.appKey,
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ query: PROBE_QUERY }),
      })
      const body = (await res.json()) as { errors?: Array<{ message?: string; extensions?: { code?: string } }> }
      const code = body.errors?.[0]?.extensions?.code
      probe = code === 'INVALID_TOKEN'
        ? { at: new Date(), jti: payload?.jti, expired, outcome: 'rejected', detail: 'INVALID_TOKEN' }
        : body.errors?.length
          ? { at: new Date(), jti: payload?.jti, expired, outcome: 'error', detail: `${code ?? 'error'}: ${body.errors[0]?.message ?? ''}` }
          : { at: new Date(), jti: payload?.jti, expired, outcome: 'accepted', detail: `HTTP ${res.status}, data returned` }
    } catch (e) {
      probe = { at: new Date(), jti: payload?.jti, expired, outcome: 'error', detail: (e as Error).message }
    }
    setProbes((prev) => [probe, ...prev])
    setLoading(false)
  }

  // V5 passes once an expired token was rejected and a later, valid token
  // was accepted.
  const chronological = [...probes].reverse()
  const firstRejection = chronological.findIndex((p) => p.expired && p.outcome === 'rejected')
  const v5Pass = firstRejection !== -1 &&
    chronological.slice(firstRejection + 1).some((p) => !p.expired && p.outcome === 'accepted')
  const unexpected = probes.find((p) => (p.expired && p.outcome === 'accepted') || (!p.expired && p.outcome === 'rejected'))

  return (
    <div className="bg-card border border-rim rounded-2xl overflow-hidden">
      <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-rim bg-panel">
        <div>
          <h3 className="text-base font-semibold text-ink mb-1">V5 — API Expiry Check</h3>
          <p className="text-sm text-ink2 leading-relaxed max-w-lg">
            Calls the Canvasflow GraphQL API with the current access token. Probe once the
            token has expired (expect <code>INVALID_TOKEN</code>), refresh it below, then probe
            again (expect data).
          </p>
        </div>
        <button
          className="flex-shrink-0 flex items-center gap-2 text-sm font-medium px-3.5 py-2 rounded-xl text-ink2 border border-rim2 hover:bg-panel hover:text-ink transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleProbe}
          disabled={!ready || loading}
          aria-busy={loading}
        >
          {loading ? 'Calling…' : 'Call API'}
        </button>
      </div>

      <div className="px-6 py-5 flex flex-col gap-4">
        {!ready && (
          <div className="text-sm rounded-xl px-4 py-2.5 leading-relaxed border bg-note/10 border-note/30 text-note">
            Set the Canvasflow GraphQL URL and the PWA's <code>app-key</code> in Settings to run V5.
          </div>
        )}

        {probes.length > 0 && (
          <div className={`inline-flex items-center gap-2 text-sm font-semibold px-3.5 py-1.5 rounded-full w-fit border ${
            v5Pass && !unexpected ? 'bg-ok/10 text-ok border-ok/25'
              : unexpected ? 'bg-bad/10 text-bad border-bad/25'
              : 'bg-warn/10 text-warn border-warn/25'
          }`}>
            {v5Pass && !unexpected
              ? '✓ V5 passed: expired token rejected, refreshed token accepted'
              : unexpected
                ? `✗ Unexpected: ${unexpected.expired ? 'an expired token was accepted' : 'a valid token was rejected'}`
                : 'V5 incomplete: need an expired-token rejection followed by a valid-token success'}
          </div>
        )}

        {probes.map((p, i) => (
          <div key={i} className="grid grid-cols-[110px_1fr] gap-3 py-2 border-b border-rim last:border-0 text-sm">
            <span className={p.outcome === 'accepted' ? 'text-ok' : p.outcome === 'rejected' ? 'text-warn' : 'text-bad'}>
              {p.outcome}
            </span>
            <span className="text-ink2 font-mono text-xs break-all">
              {p.at.toLocaleTimeString()} · token {p.expired ? 'expired' : 'valid'} · {p.detail}
              {p.jti && ` · jti ${p.jti}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
