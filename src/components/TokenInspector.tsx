// src/components/TokenInspector.tsx
import { useState } from 'react'
import { decodeJwt, formatExpiry, isExpired } from '../lib/jwt'
import { ClaimRow } from './ClaimRow'
import type { StoredTokens } from '../lib/storage'

interface Props {
  tokens: StoredTokens
}

type Tab = 'access' | 'id' | 'raw'

export function TokenInspector({ tokens }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('access')
  const [copied, setCopied] = useState<string | null>(null)

  const accessDecoded = decodeJwt(tokens.accessToken)
  const idDecoded = tokens.idToken ? decodeJwt(tokens.idToken) : null

  const handleCopy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="token-inspector">
      <div className="tab-bar" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === 'access'}
          className={`tab${activeTab === 'access' ? ' tab--active' : ''}`}
          onClick={() => setActiveTab('access')}
        >
          Access Token
        </button>
        {idDecoded && (
          <button
            role="tab"
            aria-selected={activeTab === 'id'}
            className={`tab${activeTab === 'id' ? ' tab--active' : ''}`}
            onClick={() => setActiveTab('id')}
          >
            ID Token
          </button>
        )}
        <button
          role="tab"
          aria-selected={activeTab === 'raw'}
          className={`tab${activeTab === 'raw' ? ' tab--active' : ''}`}
          onClick={() => setActiveTab('raw')}
        >
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
                  ⚠ Signature is NOT verified client-side. Verification is the GraphQL server's responsibility.
                </div>
                <ClaimRow name="typ" value={accessDecoded.header.typ} description="Token type — must be at+jwt per RFC 9068" highlight={accessDecoded.header.typ !== 'at+jwt'} />
                <ClaimRow name="alg" value={accessDecoded.header.alg} description="Signing algorithm" />
                <ClaimRow name="kid" value={accessDecoded.header.kid} description="Key ID — used by the server to select the verification key" />
              </section>

              <section className="claims-section">
                <h3 className="claims-section__title">Standard Claims</h3>
                <ClaimRow name="iss" value={accessDecoded.payload.iss} description="Issuer — identifies the tenant IdP" />
                <ClaimRow name="sub" value={accessDecoded.payload.sub} description="Subject — stable opaque user identifier (never use email)" />
                <ClaimRow name="aud" value={accessDecoded.payload.aud} description='Audience — must equal "canvasflow-api"' highlight={accessDecoded.payload.aud !== 'canvasflow-api'} />
                <ClaimRow name="jti" value={accessDecoded.payload.jti} description="JWT ID — unique per token, used for log correlation" />
                {accessDecoded.payload.exp !== undefined && (
                  <ClaimRow
                    name="exp"
                    value={`${accessDecoded.payload.exp} (${formatExpiry(accessDecoded.payload.exp)})`}
                    description="Expiry timestamp"
                    highlight={isExpired(accessDecoded.payload.exp)}
                  />
                )}
                {accessDecoded.payload.iat !== undefined && (
                  <ClaimRow
                    name="iat"
                    value={`${accessDecoded.payload.iat} (${new Date(accessDecoded.payload.iat * 1000).toLocaleTimeString()})`}
                    description="Issued at"
                  />
                )}
              </section>

              <section className="claims-section">
                <h3 className="claims-section__title">Entitlements</h3>
                {accessDecoded.payload.entitlements !== undefined ? (
                  <ClaimRow
                    name="entitlements"
                    value={accessDecoded.payload.entitlements}
                    description="Canvasflow resource IDs — RFC 9068 §2.2.3.1 + RFC 7643 §4.1.2"
                    highlight={(accessDecoded.payload.entitlements as unknown[]).length === 0}
                  />
                ) : accessDecoded.payload.resources !== undefined ? (
                  <>
                    <div className="claims-section__note claims-section__note--warn">
                      Legacy claim name detected. Rename to <code>entitlements</code> per RFC 9068 §2.2.3.1.
                    </div>
                    <ClaimRow
                      name="resources"
                      value={accessDecoded.payload.resources}
                      description="Legacy claim — see warning above"
                      highlight
                    />
                  </>
                ) : (
                  <div className="claims-section__note claims-section__note--warn">
                    No <code>entitlements</code> claim found. The pre-token hook may not be configured, or the claim was added to the ID token instead of the access token.
                  </div>
                )}
              </section>

              <section className="claims-section">
                <h3 className="claims-section__title">All Other Claims</h3>
                {Object.entries(accessDecoded.payload)
                  .filter(([k]) => !['iss','sub','aud','exp','iat','jti','entitlements','resources'].includes(k))
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
            The ID token is for the SPA to read user identity. It must never be sent to the GraphQL API.
          </div>
          <section className="claims-section">
            <h3 className="claims-section__title">Identity Claims</h3>
            <ClaimRow name="sub" value={idDecoded.payload.sub} description="Stable user identifier — use this, not email" />
            <ClaimRow name="email" value={idDecoded.payload.email} description="Email (may change — do not use as user ID)" />
            <ClaimRow name="name" value={idDecoded.payload.name} description="Display name" />
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
            Raw token values. Include the access token in API requests as: <code>Authorization: Bearer &lt;access_token&gt;</code>
          </div>
          <RawToken
            label="Access Token"
            token={tokens.accessToken}
            onCopy={() => handleCopy(tokens.accessToken, 'access')}
            copied={copied === 'access'}
          />
          {tokens.idToken && (
            <RawToken
              label="ID Token (SPA only — never send to API)"
              token={tokens.idToken}
              onCopy={() => handleCopy(tokens.idToken!, 'id')}
              copied={copied === 'id'}
            />
          )}
          {tokens.refreshToken && (
            <RawToken
              label="Refresh Token (never send to API)"
              token={tokens.refreshToken}
              onCopy={() => handleCopy(tokens.refreshToken!, 'refresh')}
              copied={copied === 'refresh'}
            />
          )}
        </div>
      )}
    </div>
  )
}

function RawToken({
  label,
  token,
  onCopy,
  copied,
}: {
  label: string
  token: string
  onCopy: () => void
  copied: boolean
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
