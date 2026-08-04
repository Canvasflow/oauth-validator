import { useState } from 'react'
import { refreshTokens } from '../lib/oauth'
import { decodeJwt, formatExpiry } from '../lib/jwt'
import { getOAuthConfig } from '../lib/config'
import type { StoredTokens } from '../lib/storage'

interface Props {
  tokens: StoredTokens
  onRefreshed: (tokens: StoredTokens) => void
}

type Status = 'idle' | 'loading' | 'success' | 'error'

export function TokenRefresh({ tokens, onRefreshed }: Props) {
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [errorDesc, setErrorDesc] = useState<string | null>(null)
  const [newExpiry, setNewExpiry] = useState<number | null>(null)

  const hasRefreshToken = !!tokens.refreshToken
  const isImplicit = getOAuthConfig()?.flow === 'implicit'

  const handleRefresh = async () => {
    if (!tokens.refreshToken) return
    setStatus('loading')
    setError(null)
    setErrorDesc(null)
    setNewExpiry(null)

    const result = await refreshTokens(tokens.refreshToken)

    if (result.ok) {
      const decoded = decodeJwt(result.tokens.accessToken)
      setNewExpiry(decoded?.payload.exp ?? null)
      setStatus('success')
      onRefreshed(result.tokens)
    } else {
      setError(result.error)
      setErrorDesc(result.errorDescription ?? null)
      setStatus('error')
    }
  }

  return (
    <div className="bg-card border border-rim rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-rim bg-panel">
        <div>
          <h3 className="text-base font-semibold text-ink mb-1">Token Refresh</h3>
          <p className="text-sm text-ink2 leading-relaxed max-w-lg">
            Exchange the refresh token for a new access token at the token endpoint.
            The token inspector and signature panel will update with the new token.
          </p>
        </div>
        <button
          className="flex-shrink-0 flex items-center gap-2 text-sm font-medium px-3.5 py-2 rounded-xl text-ink2 border border-rim2 hover:bg-panel hover:text-ink transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleRefresh}
          disabled={!hasRefreshToken || status === 'loading'}
          aria-busy={status === 'loading'}
        >
          {status === 'loading' ? (
            <>
              <span className="inline-block w-3.5 h-3.5 border-2 border-ink3/40 border-t-ink2 rounded-full animate-spin" aria-hidden="true" />
              Refreshing…
            </>
          ) : (
            'Refresh Token'
          )}
        </button>
      </div>

      {/* No refresh token */}
      {!hasRefreshToken && (
        <div className="px-6 py-5">
          <div className="text-sm bg-warn/10 border border-warn/30 text-warn rounded-xl px-4 py-3 leading-relaxed">
            {isImplicit ? (
              <>The implicit grant does not issue refresh tokens (RFC 6749 §4.2) — this is expected, not an error.</>
            ) : (
              <>
                No refresh token was issued. Your IdP may require the{' '}
                <code>offline_access</code> scope, or this client may not support refresh tokens.
              </>
            )}
          </div>
        </div>
      )}

      {/* Success */}
      {status === 'success' && (
        <div className="px-6 py-5 flex flex-col gap-4">
          <div className="inline-flex items-center gap-2 text-sm font-semibold px-3.5 py-1.5 rounded-full w-fit bg-ok/10 text-ok border border-ok/25">
            <span className="text-base leading-none">✓</span>
            Token Refreshed
          </div>
          {newExpiry !== null && (
            <div className="flex flex-col">
              <div className="grid grid-cols-[180px_1fr] items-baseline gap-3 py-2">
                <span className="text-sm text-ink2">New expiry</span>
                <code className="text-sm text-ink">{newExpiry} ({formatExpiry(newExpiry)})</code>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {status === 'error' && error && (
        <div className="px-6 py-5">
          <div className="font-mono text-sm text-bad bg-bad/8 border border-bad/20 rounded-xl px-4 py-3">
            {error}{errorDesc ? `: ${errorDesc}` : ''}
          </div>
        </div>
      )}
    </div>
  )
}
