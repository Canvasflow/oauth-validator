// app/components/SignatureValidator.tsx
// ---------------------------------------------------------------------------
// Sends the access token to the Hono backend (POST /api/validate/signature)
// which fetches the issuer's JWKS and cryptographically verifies the
// signature. Shows the result and the normalized entitlements.
// ---------------------------------------------------------------------------
import { useEffect, useState } from 'react'
import { getOAuthConfig } from '../lib/config'

interface SignatureResult {
  valid: boolean
  algorithm?: string
  keyId?: string
  issuer?: string
  subject?: string
  jwksUri?: string
  entitlements?: string[]
  entitlementsSource?: string | null
  error?: string
}

interface Props {
  accessToken: string
}

type Status = 'idle' | 'loading' | 'success' | 'error'

export function SignatureValidator({ accessToken }: Props) {
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<SignatureResult | null>(null)

  useEffect(() => {
    setStatus('idle')
    setResult(null)
  }, [accessToken])

  const handleValidate = async () => {
    setStatus('loading')
    setResult(null)
    const config = getOAuthConfig()

    const requestBody: Record<string, string> = { token: accessToken }
    if (config?.verificationMethod === 'secret' && config.secret) {
      requestBody.verificationMethod = 'secret'
      requestBody.secret = config.secret
    } else if (config?.jwksUri) {
      requestBody.jwksUri = config.jwksUri
    }

    try {
      const res = await fetch('/api/validate/signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })
      const data = (await res.json()) as SignatureResult
      setResult(data)
      setStatus(data.valid ? 'success' : 'error')
    } catch (e) {
      setResult({ valid: false, error: (e as Error).message })
      setStatus('error')
    }
  }

  return (
    <div className="sig-validator">
      <div className="sig-validator__header">
        <div>
          <h3 className="sig-validator__title">Signature Verification</h3>
          <p className="sig-validator__desc">
            Cryptographic verification runs on the Cloudflare Worker — it fetches
            the issuer's JWKS and verifies the token's signature server-side.
          </p>
        </div>
        <button
          className={`btn btn--ghost${status === 'loading' ? ' btn--loading' : ''}`}
          onClick={handleValidate}
          disabled={status === 'loading'}
          aria-busy={status === 'loading'}
        >
          {status === 'loading' ? (
            <>
              <span className="spinner" aria-hidden="true" />
              Verifying…
            </>
          ) : (
            'Verify Signature'
          )}
        </button>
      </div>

      {result && (
        <div className={`sig-result sig-result--${result.valid ? 'valid' : 'invalid'}`}>
          <div className="sig-result__badge">
            {result.valid ? (
              <>
                <span className="sig-result__icon">✓</span>
                Signature Valid
              </>
            ) : (
              <>
                <span className="sig-result__icon">✗</span>
                Signature Invalid
              </>
            )}
          </div>

          {result.error && (
            <div className="sig-result__error">{result.error}</div>
          )}

          <div className="sig-result__details">
            {result.algorithm && (
              <div className="sig-result__row">
                <span className="sig-result__label">Algorithm</span>
                <code className="sig-result__value">{result.algorithm}</code>
              </div>
            )}
            {result.keyId && (
              <div className="sig-result__row">
                <span className="sig-result__label">Key ID</span>
                <code className="sig-result__value">{result.keyId}</code>
              </div>
            )}
            {result.issuer && (
              <div className="sig-result__row">
                <span className="sig-result__label">Issuer</span>
                <code className="sig-result__value">{result.issuer}</code>
              </div>
            )}
            {result.subject && (
              <div className="sig-result__row">
                <span className="sig-result__label">Subject</span>
                <code className="sig-result__value">{result.subject}</code>
              </div>
            )}
            {result.jwksUri && (
              <div className="sig-result__row">
                <span className="sig-result__label">JWKS URI</span>
                <code className="sig-result__value">{result.jwksUri}</code>
              </div>
            )}
            {result.entitlements !== undefined && (
              <div className="sig-result__row">
                <span className="sig-result__label">
                  Entitlements
                  {result.entitlementsSource && result.entitlementsSource !== 'entitlements' && (
                    <span className="sig-result__source-tag">
                      from <code>{result.entitlementsSource}</code>
                    </span>
                  )}
                </span>
                <span className="sig-result__value">
                  {result.entitlements.length > 0
                    ? result.entitlements.join(', ')
                    : <em className="sig-result__empty">none</em>}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
