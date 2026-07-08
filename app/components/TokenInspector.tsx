import { useState } from 'react'
import { decodeJwt, extractEntitlements, formatExpiry, isExpired } from '../lib/jwt'
import { ClaimRow } from './ClaimRow'
import type { StoredTokens } from '../lib/storage'

interface Props {
  tokens: StoredTokens
}

type Tab = 'access' | 'id' | 'raw'

const STANDARD_CLAIMS = new Set(['iss', 'sub', 'aud', 'exp', 'iat', 'jti'])
const ENTITLEMENT_CLAIMS = new Set(['cf:entitlements', 'resources', 'entitlements'])

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

  const tabClass = (tab: Tab) =>
    `px-4 py-3 text-sm font-mono whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
      activeTab === tab
        ? 'text-brand border-brand'
        : 'text-ink2 border-transparent hover:text-ink'
    }`

  return (
    <div className="bg-card border border-rim rounded-2xl overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-rim bg-panel px-1 gap-0.5" role="tablist">
        <button role="tab" aria-selected={activeTab === 'access'} className={tabClass('access')} onClick={() => setActiveTab('access')}>
          Access Token
        </button>
        {idDecoded && (
          <button role="tab" aria-selected={activeTab === 'id'} className={tabClass('id')} onClick={() => setActiveTab('id')}>
            ID Token
          </button>
        )}
        <button role="tab" aria-selected={activeTab === 'raw'} className={tabClass('raw')} onClick={() => setActiveTab('raw')}>
          Raw Tokens
        </button>
      </div>

      {/* Access Token */}
      {activeTab === 'access' && (
        <div className="p-6 flex flex-col gap-6" role="tabpanel">
          {accessDecoded ? (
            <>
              <ClaimsSection title="Header">
                <Note>Decoded client-side (no signature check). Use the Signature Verification panel below to cryptographically validate.</Note>
                <ClaimRow name="typ" value={accessDecoded.header.typ} description="Token type — should be at+jwt per RFC 9068" highlight={accessDecoded.header.typ !== 'at+jwt'} />
                <ClaimRow name="alg" value={accessDecoded.header.alg} description="Signing algorithm" />
                <ClaimRow name="kid" value={accessDecoded.header.kid} description="Key ID — used to select the verification key from JWKS" />
              </ClaimsSection>

              <ClaimsSection title="Standard Claims">
                <ClaimRow name="iss" value={accessDecoded.payload.iss} description="Issuer — identifies the IdP" />
                <ClaimRow name="sub" value={accessDecoded.payload.sub} description="Subject — stable opaque user identifier" />
                <ClaimRow name="aud" value={accessDecoded.payload.aud} description='Audience — must equal "canvasflow-api"' highlight={accessDecoded.payload.aud !== 'canvasflow-api'} />
                <ClaimRow name="jti" value={accessDecoded.payload.jti} description="JWT ID — unique per token" />
                {accessDecoded.payload.exp !== undefined && (
                  <ClaimRow name="exp" value={`${accessDecoded.payload.exp} (${formatExpiry(accessDecoded.payload.exp)})`} description="Expiry timestamp" highlight={isExpired(accessDecoded.payload.exp)} />
                )}
                {accessDecoded.payload.iat !== undefined && (
                  <ClaimRow name="iat" value={`${accessDecoded.payload.iat} (${new Date(accessDecoded.payload.iat * 1000).toLocaleTimeString()})`} description="Issued at" />
                )}
              </ClaimsSection>

              <EntitlementsSection payload={accessDecoded.payload} />

              <ClaimsSection title="All Other Claims">
                {Object.entries(accessDecoded.payload)
                  .filter(([k]) => !STANDARD_CLAIMS.has(k) && !ENTITLEMENT_CLAIMS.has(k))
                  .map(([k, v]) => (
                    <ClaimRow key={k} name={k} value={v} />
                  ))}
              </ClaimsSection>
            </>
          ) : (
            <Note variant="warn">Could not decode access token. It may not be a JWT (some IdPs issue opaque tokens).</Note>
          )}
        </div>
      )}

      {/* ID Token */}
      {activeTab === 'id' && idDecoded && (
        <div className="p-6 flex flex-col gap-6" role="tabpanel">
          <Note>The ID token is for the SPA to read user identity only. Never send it to the API.</Note>
          <ClaimsSection title="Identity Claims">
            <ClaimRow name="sub" value={idDecoded.payload.sub} description="Stable user identifier — use this, never email" />
            <ClaimRow name="email" value={idDecoded.payload.email} description="Email (may change — do not use as user ID)" />
            <ClaimRow name="name" value={idDecoded.payload.name} description="Display name" />
            {Object.entries(idDecoded.payload)
              .filter(([k]) => !['sub', 'email', 'name', 'iss', 'aud', 'exp', 'iat', 'jti'].includes(k))
              .map(([k, v]) => <ClaimRow key={k} name={k} value={v} />)}
          </ClaimsSection>
        </div>
      )}

      {/* Raw Tokens */}
      {activeTab === 'raw' && (
        <div className="p-6 flex flex-col gap-6" role="tabpanel">
          <Note>Include the access token in API requests as: <code>Authorization: Bearer &lt;access_token&gt;</code></Note>
          <RawToken label="Access Token" token={tokens.accessToken} onCopy={() => handleCopy(tokens.accessToken, 'access')} copied={copied === 'access'} />
          {tokens.idToken && (
            <RawToken label="ID Token (SPA only — never send to API)" token={tokens.idToken} onCopy={() => handleCopy(tokens.idToken!, 'id')} copied={copied === 'id'} />
          )}
          {tokens.refreshToken && (
            <RawToken label="Refresh Token (client-side only — never send to API)" token={tokens.refreshToken} onCopy={() => handleCopy(tokens.refreshToken!, 'refresh')} copied={copied === 'refresh'} />
          )}
        </div>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ClaimsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-0.5">
      <h3 className="font-mono text-[0.7rem] uppercase tracking-widest text-ink3 pb-2 border-b border-rim mb-1">{title}</h3>
      {children}
    </section>
  )
}

function Note({ children, variant }: { children: React.ReactNode; variant?: 'warn' | 'info' }) {
  const base = 'text-sm rounded-xl px-4 py-2.5 leading-relaxed border'
  if (variant === 'warn') return <div className={`${base} bg-warn/10 border-warn/30 text-warn`}>{children}</div>
  if (variant === 'info') return <div className={`${base} bg-note/10 border-note/30 text-note`}>{children}</div>
  return <div className={`${base} bg-panel border-rim text-ink2`}>{children}</div>
}

function EntitlementsSection({ payload }: { payload: Record<string, unknown> }) {
  const { values, source } = extractEntitlements(payload as Parameters<typeof extractEntitlements>[0])

  return (
    <ClaimsSection title="Entitlements">
      {values !== undefined ? (
        <>
          {source !== 'entitlements' && source !== null && (
            <Note variant="info">Resolved from <code>{source}</code> claim (normalized to <code>entitlements</code>).</Note>
          )}
          <ClaimRow name="entitlements" value={values} description="Canvasflow resource IDs — normalized from cf:entitlements / resources / entitlements" highlight={values.length === 0} pills />
        </>
      ) : (
        <Note variant="warn">No entitlement claim found (<code>cf:entitlements</code>, <code>resources</code>, or <code>entitlements</code>). The pre-token hook may not be configured.</Note>
      )}
    </ClaimsSection>
  )
}

function RawToken({ label, token, onCopy, copied }: { label: string; token: string; onCopy: () => void; copied: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[0.8rem] font-mono text-ink2">{label}</span>
        <button
          className="text-xs font-medium px-2.5 py-1 rounded-lg text-ink2 border border-rim2 hover:bg-panel hover:text-ink transition-colors"
          onClick={onCopy}
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <pre className="token-raw">{token}</pre>
    </div>
  )
}
