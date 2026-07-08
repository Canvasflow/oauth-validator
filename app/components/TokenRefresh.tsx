import { useState } from 'react'
import { refreshTokens } from '../lib/oauth'
import { decodeJwt, formatExpiry } from '../lib/jwt'
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
    <div className="token-refresh">
      <div className="token-refresh__header">
        <div>
          <h3 className="token-refresh__title">Token Refresh</h3>
          <p className="token-refresh__desc">
            Exchange the refresh token for a new access token at the token endpoint.
            The token inspector and signature panel will update with the new token.
          </p>
        </div>
        <button
          className="btn btn--ghost"
          onClick={handleRefresh}
          disabled={!hasRefreshToken || status === 'loading'}
          aria-busy={status === 'loading'}
        >
          {status === 'loading' ? (
            <>
              <span className="spinner" aria-hidden="true" />
              Refreshing…
            </>
          ) : (
            'Refresh Token'
          )}
        </button>
      </div>

      {!hasRefreshToken && (
        <div className="token-refresh__body">
          <div className="claims-section__note claims-section__note--warn">
            No refresh token was issued. Your IdP may require the{' '}
            <code>offline_access</code> scope, or this client may not support
            refresh tokens.
          </div>
        </div>
      )}

      {status === 'success' && (
        <div className="token-refresh__body">
          <div className="sig-result sig-result--valid">
            <div className="sig-result__badge">
              <span className="sig-result__icon">✓</span>
              Token Refreshed
            </div>
            {newExpiry !== null && (
              <div className="sig-result__details">
                <div className="sig-result__row">
                  <span className="sig-result__label">New expiry</span>
                  <code className="sig-result__value">
                    {newExpiry} ({formatExpiry(newExpiry)})
                  </code>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {status === 'error' && error && (
        <div className="token-refresh__body">
          <div className="sig-result__error">
            {error}{errorDesc ? `: ${errorDesc}` : ''}
          </div>
        </div>
      )}
    </div>
  )
}
