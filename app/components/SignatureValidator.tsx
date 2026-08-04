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
    <div className="bg-card border border-rim rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-rim bg-panel">
        <div>
          <h3 className="text-base font-semibold text-ink mb-1">Signature Verification</h3>
          <p className="text-sm text-ink2 leading-relaxed max-w-lg">
            Cryptographic verification runs on the backend — it fetches
            the issuer's public key and verifies the token's signature server-side.
          </p>
        </div>
        <button
          className="flex-shrink-0 flex items-center gap-2 text-sm font-medium px-3.5 py-2 rounded-xl text-ink2 border border-rim2 hover:bg-panel hover:text-ink transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleValidate}
          disabled={status === 'loading'}
          aria-busy={status === 'loading'}
        >
          {status === 'loading' ? (
            <>
              <span className="inline-block w-3.5 h-3.5 border-2 border-ink3/40 border-t-ink2 rounded-full animate-spin" aria-hidden="true" />
              Verifying…
            </>
          ) : (
            'Verify Signature'
          )}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className="px-6 py-5 flex flex-col gap-4">
          {/* Badge */}
          <div className={`inline-flex items-center gap-2 text-sm font-semibold px-3.5 py-1.5 rounded-full w-fit border ${
            result.valid
              ? 'bg-ok/10 text-ok border-ok/25'
              : 'bg-bad/10 text-bad border-bad/25'
          }`}>
            <span className="text-base leading-none">{result.valid ? '✓' : '✗'}</span>
            {result.valid ? 'Signature Valid' : 'Signature Invalid'}
          </div>

          {/* Error message */}
          {result.error && (
            <div className="font-mono text-sm text-bad bg-bad/8 border border-bad/20 rounded-xl px-4 py-3">
              {result.error}
            </div>
          )}

          {/* Details */}
          <div className="flex flex-col">
            <DetailRow label="Algorithm">{result.algorithm && <code>{result.algorithm}</code>}</DetailRow>
            <DetailRow label="Key ID">{result.keyId && <code>{result.keyId}</code>}</DetailRow>
            <DetailRow label="Issuer">{result.issuer && <code className="break-all">{result.issuer}</code>}</DetailRow>
            <DetailRow label="Subject">{result.subject && <code className="break-all">{result.subject}</code>}</DetailRow>
            {result.jwksUri && (
              <DetailRow label="JWKS URI"><code className="break-all">{result.jwksUri}</code></DetailRow>
            )}
            {result.entitlements !== undefined && (
              <DetailRow label={
                <span className="flex flex-col gap-0.5">
                  Entitlements
                  {result.entitlementsSource && result.entitlementsSource !== 'entitlements' && (
                    <span className="text-[0.72rem] text-ink3">from <code>{result.entitlementsSource}</code></span>
                  )}
                </span>
              }>
                {result.entitlements.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {result.entitlements.map((item, i) => (
                      <span key={i} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand/10 text-brand border border-brand/20">
                        {item}
                      </span>
                    ))}
                  </div>
                ) : (
                  <em className="text-sm text-ink3 not-italic">none</em>
                )}
              </DetailRow>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function DetailRow({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  if (!children) return null
  return (
    <div className="grid grid-cols-[180px_1fr] items-baseline gap-3 py-2 border-b border-rim last:border-0">
      <span className="text-sm text-ink2 flex flex-col gap-0.5">{label}</span>
      <span className="text-sm text-ink">{children}</span>
    </div>
  )
}
