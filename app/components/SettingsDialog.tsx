import { useEffect, useRef, useState } from 'react'
import { getOAuthConfig, saveOAuthConfig, resetOAuthConfig, type OAuthConfig, type VerificationMethod } from '../lib/config'

interface Props {
  onClose: () => void
}

const EMPTY_FORM = {
  issuer:                '',
  authorizationEndpoint: '',
  tokenEndpoint:         '',
  clientId:              '',
  redirectUri:           typeof window !== 'undefined' ? `${window.location.origin}/callback` : '',
  scope:                 'openid profile email',
  audience:              '',
  verificationMethod:    'jwks' as VerificationMethod,
  jwksUri:               '',
  secret:                '',
}

const inputClass = 'w-full bg-canvas border border-rim text-ink text-sm rounded-lg px-3 py-2 placeholder:text-ink3 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-colors'
const inputMonoClass = `${inputClass} font-mono`

export function SettingsDialog({ onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [showSecret, setShowSecret] = useState(false)

  const existing = getOAuthConfig()
  const [form, setForm] = useState({
    issuer:                existing?.issuer                ?? EMPTY_FORM.issuer,
    authorizationEndpoint: existing?.authorizationEndpoint ?? EMPTY_FORM.authorizationEndpoint,
    tokenEndpoint:         existing?.tokenEndpoint         ?? EMPTY_FORM.tokenEndpoint,
    clientId:              existing?.clientId              ?? EMPTY_FORM.clientId,
    redirectUri:           existing?.redirectUri           ?? EMPTY_FORM.redirectUri,
    scope:                 existing?.scope                 ?? EMPTY_FORM.scope,
    audience:              existing?.audience              ?? EMPTY_FORM.audience,
    verificationMethod:    existing?.verificationMethod    ?? EMPTY_FORM.verificationMethod,
    jwksUri:               existing?.jwksUri               ?? EMPTY_FORM.jwksUri,
    secret:                existing?.secret                ?? EMPTY_FORM.secret,
  })

  useEffect(() => {
    const el = dialogRef.current
    if (!el) return
    el.showModal()
    const handleNativeClose = () => onClose()
    el.addEventListener('close', handleNativeClose)
    return () => el.removeEventListener('close', handleNativeClose)
  }, [onClose])

  const set = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }))

  const setMethod = (e: React.ChangeEvent<HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, verificationMethod: e.target.value as VerificationMethod }))

  const handleSave = () => {
    const config: OAuthConfig = {
      issuer:                form.issuer.trim(),
      authorizationEndpoint: form.authorizationEndpoint.trim(),
      tokenEndpoint:         form.tokenEndpoint.trim(),
      clientId:              form.clientId.trim(),
      redirectUri:           form.redirectUri.trim(),
      scope:                 form.scope.trim(),
      audience:              form.audience.trim() || undefined,
      verificationMethod:    form.verificationMethod,
      jwksUri:               form.verificationMethod === 'jwks'   ? (form.jwksUri.trim() || undefined) : undefined,
      secret:                form.verificationMethod === 'secret' ? (form.secret.trim() || undefined)  : undefined,
    }
    saveOAuthConfig(config)
    dialogRef.current?.close()
  }

  const handleReset = () => {
    resetOAuthConfig()
    setForm({ ...EMPTY_FORM, redirectUri: `${window.location.origin}/callback` })
    setShowSecret(false)
  }

  const isValid = !!(
    form.issuer &&
    form.authorizationEndpoint &&
    form.tokenEndpoint &&
    form.clientId &&
    form.redirectUri &&
    form.scope &&
    (form.verificationMethod === 'jwks' || form.secret.trim())
  )

  return (
    <dialog
      ref={dialogRef}
      className="w-full max-w-[560px] bg-card border border-rim rounded-2xl p-0 text-ink m-auto shadow-xl"
      style={{ maxHeight: 'calc(100dvh - 64px)' }}
      aria-labelledby="settings-title"
    >
      <div className="flex flex-col" style={{ maxHeight: 'calc(100dvh - 64px)' }}>

        {/* Dialog header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-rim bg-panel rounded-t-2xl flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <img
              src="https://canvasflow.io/wp-content/uploads/2022/06/favicon.ico"
              width="20"
              height="20"
              alt="Canvasflow"
              className="rounded-md"
            />
            <h2 id="settings-title" className="text-base font-semibold text-ink">IdP Settings</h2>
          </div>
          <button
            className="p-1.5 rounded-lg text-ink2 hover:text-ink hover:bg-rim transition-colors text-sm leading-none"
            onClick={() => dialogRef.current?.close()}
            aria-label="Close settings"
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-5">
          <p className="text-sm text-ink2 leading-relaxed">
            Configure your OAuth 2.0 / OIDC provider. Values are saved in{' '}
            <code>localStorage</code> and persist across page refreshes.
          </p>

          {/* OAuth Provider section */}
          <div className="flex flex-col gap-3">
            <SectionLabel>OAuth Provider</SectionLabel>
            <Field label="Issuer" id="s-issuer" value={form.issuer} onChange={set('issuer')} placeholder="https://your-idp.example.com" />
            <Field label="Authorization endpoint" id="s-auth-ep" value={form.authorizationEndpoint} onChange={set('authorizationEndpoint')} placeholder="https://your-idp.example.com/authorize" />
            <Field label="Token endpoint" id="s-token-ep" value={form.tokenEndpoint} onChange={set('tokenEndpoint')} placeholder="https://your-idp.example.com/oauth/token" />
            <Field label="Client ID" id="s-client-id" value={form.clientId} onChange={set('clientId')} placeholder="your-client-id" mono />
            <Field label="Redirect URI" id="s-redirect" value={form.redirectUri} onChange={set('redirectUri')} placeholder={`${window.location.origin}/callback`} mono />
            <Field label="Scope" id="s-scope" value={form.scope} onChange={set('scope')} placeholder="openid profile email" mono />
            <Field label="Audience (optional)" id="s-audience" value={form.audience} onChange={set('audience')} placeholder="your-api-identifier" mono />
          </div>

          {/* Token Verification section */}
          <div className="flex flex-col gap-3">
            <SectionLabel>Token Verification</SectionLabel>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-ink2" htmlFor="s-method">Method</label>
              <select
                className={`cf-select ${inputClass}`}
                id="s-method"
                value={form.verificationMethod}
                onChange={setMethod}
              >
                <option value="jwks">JWKS — asymmetric key (recommended)</option>
                <option value="secret">Shared secret — HMAC</option>
              </select>
            </div>

            {form.verificationMethod === 'jwks' && (
              <Field label="JWKS URI (optional)" id="s-jwks" value={form.jwksUri} onChange={set('jwksUri')} placeholder="https://your-idp.example.com/.well-known/jwks.json" mono />
            )}

            {form.verificationMethod === 'secret' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-ink2" htmlFor="s-secret">Shared secret</label>
                <div className="flex gap-2">
                  <input
                    className={`${inputMonoClass} flex-1`}
                    id="s-secret"
                    type={showSecret ? 'text' : 'password'}
                    value={form.secret}
                    onChange={set('secret')}
                    placeholder="your-hmac-secret"
                    spellCheck={false}
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    className="px-3 text-sm text-ink2 border border-rim2 rounded-lg hover:bg-panel hover:text-ink transition-colors flex-shrink-0"
                    onClick={() => setShowSecret(v => !v)}
                    aria-label={showSecret ? 'Hide secret' : 'Show secret'}
                  >
                    {showSecret ? 'Hide' : 'Show'}
                  </button>
                </div>
                <p className="text-xs text-ink3 leading-relaxed">
                  Stored in <code>localStorage</code>. Only use in dev / test environments.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-rim bg-panel rounded-b-2xl flex-shrink-0">
          <button
            className="text-sm font-medium px-3.5 py-2 rounded-xl text-ink2 border border-rim2 hover:bg-rim hover:text-ink transition-colors"
            onClick={handleReset}
          >
            Reset all
          </button>
          <div className="flex items-center gap-2">
            <button
              className="text-sm font-medium px-3.5 py-2 rounded-xl text-ink2 border border-rim2 hover:bg-panel hover:text-ink transition-colors"
              onClick={() => dialogRef.current?.close()}
            >
              Cancel
            </button>
            <button
              className="text-sm font-semibold px-4 py-2 rounded-xl bg-brand text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleSave}
              disabled={!isValid}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </dialog>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[0.7rem] uppercase tracking-widest text-ink3 pb-2 border-b border-rim">
      {children}
    </p>
  )
}

function Field({
  label, id, value, onChange, placeholder, mono = false,
}: {
  label: string
  id: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  mono?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-ink2" htmlFor={id}>{label}</label>
      <input
        className={mono ? inputMonoClass : inputClass}
        id={id}
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        spellCheck={false}
        autoComplete="off"
      />
    </div>
  )
}
