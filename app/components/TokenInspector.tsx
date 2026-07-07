// app/components/TokenInspector.tsx
import { useState } from 'react'
import { decodeJwt, extractEntitlements, formatExpiry, isExpired } from '../lib/jwt'
import { ClaimRow } from './ClaimRow'
import type { StoredTokens } from '../lib/storage'

interface Props {
  tokens: StoredTokens
}

type Tab = 'access' | 'id' | 'raw'

const STANDARD_CLAIMS = new Set(['iss','sub','aud','exp','iat','jti'])
const ENTITLEMENT_CLAIMS = new Set(['cf:entitlements', 'resources', 'entitlements'])

export function TokenInspector({ tokens }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('access')
  const [copied, setCopied] = useState<string | null>(null)

  const accessDecoded = decodeJwt(tokens.accessToken)
  const idDecoded     = tokens.idToken ? decodeJwt(tokens.idToken) : null

  const handleCopy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="token-inspector">
      <div className="tab-bar" role="tablist">
        <button role="tab" aria-selected={activeTab === 'access'}
          className={`tab${activeTab === 'access' ? ' tab--active' : ''}`}
          onClick={() => setActiveTab('access')}>
          Access Token
        </button>
        {idDecoded && (
          <button role="tab" aria-selected={activeTab === 'id'}
            className={`tab${activeTab === 'id' ? ' tab--active' : ''}`}
            onClick={() => setActiveTab('id')}>
            ID Token
          </button>
        )}
        <button role="tab" aria-selected={activeTab === 'raw'}
          className={`tab${activeTab === 'raw' ? ' tab--active' : ''}`}
          onClick={() => setActiveTab('raw')}>
          Raw Tokens
        </button>
      </div>

      {/* ── Access Token ── */}
      {activeTab === 'access' && (
        <div className="tab-panel" role="tabpanel">
          {accessDecoded ? (
            <>
              <section className="claims-section">
                <h3 className="claims-section__title">Header</h3>
                <div className="claims-section__note">
                  Decoded client-side (no signature check). Use the Signature Verification panel below to cryptographically validate.
                </div>
                <ClaimRow name="typ" value={accessDecoded.header.typ}
                  description="Token type — should be at+jwt per RFC 9068"
                  highlight={accessDecoded.header.typ !== 'at+jwt'} />
                <ClaimRow name="alg" value={accessDecoded.header.alg} description="Signing algorithm" />
                <ClaimRow name="kid" value={accessDecoded.header.kid} description="Key ID — used to select the verification key from JWKS" />
              </section>

              <section className="claims-section">
                <h3 className="claims-section__title">Standard Claims</h3>
                <ClaimRow name="iss" value={accessDecoded.payload.iss} description="Issuer — identifies the IdP" />
                <ClaimRow name="sub" value={accessDecoded.payload.sub} description="Subject — stable opaque user identifier" />
                <ClaimRow name="aud" value={accessDecoded.payload.aud}
                  description='Audience — must equal "canvasflow-api"'
                  highlight={accessDecoded.payload.aud !== 'canvasflow-api'} />
                <ClaimRow name="jti" value={accessDecoded.payload.jti} description="JWT ID — unique per token" />
                {accessDecoded.payload.exp !== undefined && (
                  <ClaimRow name="exp"
                    value={`${accessDecoded.payload.exp} (${formatExpiry(accessDecoded.payload.exp)})`}
                    description="Expiry timestamp"
                    highlight={isExpired(accessDecoded.payload.exp)} />
                )}
                {accessDecoded.payload.iat !== undefined && (
                  <ClaimRow name="iat"
                    value={`${accessDecoded.payload.iat} (${new Date(accessDecoded.payload.iat * 1000).toLocaleTimeString()})`}
                    description="Issued at" />
                )}
              </section>

              <EntitlementsSection payload={accessDecoded.payload} />

              <section className="claims-section">
                <h3 className="claims-section__title">All Other Claims</h3>
                {Object.entries(accessDecoded.payload)
                  .filter(([k]) => !STANDARD_CLAIMS.has(k) && !ENTITLEMENT_CLAIMS.has(k))
                  .map(([k, v]) => (
                    <ClaimRow key={k} name={k} value={v} />
                  ))}
              </section>
            </>
          ) : (
            <div className="claims-section__note claims-section__note--warn">
              Could not decode access token. It may not be a JWT (some IdPs issue opaque tokens).
            </div>
          )}
        </div>
      )}

      {/* ── ID Token ── */}
      {activeTab === 'id' && idDecoded && (
        <div className="tab-panel" role="tabpanel">
          <div className="claims-section__note">
            The ID token is for the SPA to read user identity only. Never send it to the API.
          </div>
          <section className="claims-section">
            <h3 className="claims-section__title">Identity Claims</h3>
            <ClaimRow name="sub"   value={idDecoded.payload.sub}   description="Stable user identifier — use this, never email" />
            <ClaimRow name="email" value={idDecoded.payload.email} description="Email (may change — do not use as user ID)" />
            <ClaimRow name="name"  value={idDecoded.payload.name}  description="Display name" />
            {Object.entries(idDecoded.payload)
              .filter(([k]) => !['sub','email','name','iss','aud','exp','iat','jti'].includes(k))
              .map(([k, v]) => (
                <ClaimRow key={k} name={k} value={v} />
              ))}
          </section>
        </div>
      )}

      {/* ── Raw Tokens ── */}
      {activeTab === 'raw' && (
        <div className="tab-panel" role="tabpanel">
          <div className="claims-section__note">
            Include the access token in API requests as: <code>Authorization: Bearer &lt;access_token&gt;</code>
          </div>
          <RawToken label="Access Token" token={tokens.accessToken}
            onCopy={() => handleCopy(tokens.accessToken, 'access')} copied={copied === 'access'} />
          {tokens.idToken && (
            <RawToken label="ID Token (SPA only — never send to API)" token={tokens.idToken}
              onCopy={() => handleCopy(tokens.idToken!, 'id')} copied={copied === 'id'} />
          )}
          {tokens.refreshToken && (
            <RawToken label="Refresh Token (client-side only — never send to API)" token={tokens.refreshToken}
              onCopy={() => handleCopy(tokens.refreshToken!, 'refresh')} copied={copied === 'refresh'} />
          )}
        </div>
      )}
    </div>
  )
}

// ── Entitlements section ───────────────────────────────────────────────────
// Normalizes cf:entitlements > resources > entitlements into a single display.

function EntitlementsSection({ payload }: { payload: Record<string, unknown> }) {
  const { values, source } = extractEntitlements(payload as Parameters<typeof extractEntitlements>[0])

  return (
    <section className="claims-section">
      <h3 className="claims-section__title">Entitlements</h3>
      {values !== undefined ? (
        <>
          {source !== 'entitlements' && source !== null && (
            <div className="claims-section__note claims-section__note--info">
              Resolved from <code>{source}</code> claim (normalized to <code>entitlements</code>).
            </div>
          )}
          <ClaimRow
            name="entitlements"
            value={values}
            description="Canvasflow resource IDs — normalized from cf:entitlements / resources / entitlements"
            highlight={values.length === 0}
          />
        </>
      ) : (
        <div className="claims-section__note claims-section__note--warn">
          No entitlement claim found (<code>cf:entitlements</code>, <code>resources</code>, or{' '}
          <code>entitlements</code>). The pre-token hook may not be configured.
        </div>
      )}
    </section>
  )
}

// ── RawToken helper ────────────────────────────────────────────────────────

function RawToken({ label, token, onCopy, copied }: {
  label: string; token: string; onCopy: () => void; copied: boolean
}) {
  return (
    <div className="raw-token">
      <div className="raw-token__header">
        <span className="raw-token__label">{label}</span>
        <button className="btn btn--ghost btn--sm" onClick={onCopy}>
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <pre className="raw-token__value">{token}</pre>
    </div>
  )
}
