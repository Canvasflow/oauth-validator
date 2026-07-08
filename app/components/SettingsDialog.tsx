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
    secret:                existing?.secret               ?? EMPTY_FORM.secret,
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
      jwksUri:               form.verificationMethod === 'jwks'    ? (form.jwksUri.trim() || undefined)  : undefined,
      secret:                form.verificationMethod === 'secret'  ? (form.secret.trim() || undefined)   : undefined,
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
    <dialog ref={dialogRef} className="settings-dialog" aria-labelledby="settings-title">
      <div className="settings-dialog__header">
        <h2 id="settings-title" className="settings-dialog__title">IdP Settings</h2>
        <button
          className="settings-dialog__close"
          onClick={() => dialogRef.current?.close()}
          aria-label="Close settings"
        >
          ✕
        </button>
      </div>

      <div className="settings-dialog__body">
        <p className="settings-dialog__desc">
          Configure your OAuth 2.0 / OIDC provider. Values are saved in{' '}
          <code>localStorage</code> and persist across page refreshes.
        </p>

        <div className="settings-fields">
          <p className="settings-section-label">OAuth Provider</p>

          <Field label="Issuer" id="s-issuer" value={form.issuer}
            onChange={set('issuer')} placeholder="https://your-idp.example.com" />
          <Field label="Authorization endpoint" id="s-auth-ep" value={form.authorizationEndpoint}
            onChange={set('authorizationEndpoint')} placeholder="https://your-idp.example.com/authorize" />
          <Field label="Token endpoint" id="s-token-ep" value={form.tokenEndpoint}
            onChange={set('tokenEndpoint')} placeholder="https://your-idp.example.com/oauth/token" />
          <Field label="Client ID" id="s-client-id" value={form.clientId}
            onChange={set('clientId')} placeholder="your-client-id" mono />
          <Field label="Redirect URI" id="s-redirect" value={form.redirectUri}
            onChange={set('redirectUri')} placeholder={`${window.location.origin}/callback`} mono />
          <Field label="Scope" id="s-scope" value={form.scope}
            onChange={set('scope')} placeholder="openid profile email" mono />
          <Field label="Audience (optional)" id="s-audience" value={form.audience}
            onChange={set('audience')} placeholder="your-api-identifier" mono />

          <p className="settings-section-label">Token Verification</p>

          <div className="settings-field">
            <label className="settings-field__label" htmlFor="s-method">Method</label>
            <select
              className="settings-field__input settings-field__select"
              id="s-method"
              value={form.verificationMethod}
              onChange={setMethod}
            >
              <option value="jwks">JWKS (asymmetric key — recommended)</option>
              <option value="secret">Shared secret (HMAC)</option>
            </select>
          </div>

          {form.verificationMethod === 'jwks' && (
            <Field label="JWKS URI (optional)" id="s-jwks" value={form.jwksUri}
              onChange={set('jwksUri')} placeholder="https://your-idp.example.com/.well-known/jwks.json" mono />
          )}

          {form.verificationMethod === 'secret' && (
            <div className="settings-field">
              <label className="settings-field__label" htmlFor="s-secret">
                Shared secret
              </label>
              <div className="settings-field__secret-row">
                <input
                  className="settings-field__input settings-field__input--mono"
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
                  className="settings-field__secret-toggle"
                  onClick={() => setShowSecret(v => !v)}
                  aria-label={showSecret ? 'Hide secret' : 'Show secret'}
                >
                  {showSecret ? 'Hide' : 'Show'}
                </button>
              </div>
              <p className="settings-field__hint">
                Stored in <code>localStorage</code>. Only use in dev/test environments.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="settings-dialog__footer">
        <button className="btn btn--ghost btn--sm" onClick={handleReset}>
          Reset all
        </button>
        <div className="settings-dialog__footer-right">
          <button className="btn btn--ghost btn--sm" onClick={() => dialogRef.current?.close()}>
            Cancel
          </button>
          <button className="btn btn--primary btn--sm btn--inline" onClick={handleSave} disabled={!isValid}>
            Save
          </button>
        </div>
      </div>
    </dialog>
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
    <div className="settings-field">
      <label className="settings-field__label" htmlFor={id}>{label}</label>
      <input
        className={`settings-field__input${mono ? ' settings-field__input--mono' : ''}`}
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
