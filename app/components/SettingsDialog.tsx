import { useEffect, useRef, useState } from 'react'
import { getOAuthConfig, saveOAuthConfig, resetOAuthConfig, type OAuthConfig } from '../lib/config'

interface Props {
  onClose: () => void
}

const EMPTY_FORM = {
  issuer:                '',
  authorizationEndpoint: '',
  tokenEndpoint:         '',
  jwksUri:               '',
  clientId:              '',
  redirectUri:           typeof window !== 'undefined' ? `${window.location.origin}/callback` : '',
  scope:                 'openid profile email',
  audience:              '',
}

export function SettingsDialog({ onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  const existing = getOAuthConfig()
  const [form, setForm] = useState({
    issuer:                existing?.issuer                ?? EMPTY_FORM.issuer,
    authorizationEndpoint: existing?.authorizationEndpoint ?? EMPTY_FORM.authorizationEndpoint,
    tokenEndpoint:         existing?.tokenEndpoint         ?? EMPTY_FORM.tokenEndpoint,
    jwksUri:               existing?.jwksUri               ?? EMPTY_FORM.jwksUri,
    clientId:              existing?.clientId              ?? EMPTY_FORM.clientId,
    redirectUri:           existing?.redirectUri           ?? EMPTY_FORM.redirectUri,
    scope:                 existing?.scope                 ?? EMPTY_FORM.scope,
    audience:              existing?.audience              ?? EMPTY_FORM.audience,
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

  const handleSave = () => {
    const config: OAuthConfig = {
      issuer:                form.issuer.trim(),
      authorizationEndpoint: form.authorizationEndpoint.trim(),
      tokenEndpoint:         form.tokenEndpoint.trim(),
      jwksUri:               form.jwksUri.trim() || undefined,
      clientId:              form.clientId.trim(),
      redirectUri:           form.redirectUri.trim(),
      scope:                 form.scope.trim(),
      audience:              form.audience.trim() || undefined,
    }
    saveOAuthConfig(config)
    dialogRef.current?.close()
  }

  const handleReset = () => {
    resetOAuthConfig()
    setForm({ ...EMPTY_FORM, redirectUri: `${window.location.origin}/callback` })
  }

  const isValid = !!(
    form.issuer &&
    form.authorizationEndpoint &&
    form.tokenEndpoint &&
    form.clientId &&
    form.redirectUri &&
    form.scope
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
          <Field label="Issuer" id="s-issuer" value={form.issuer}
            onChange={set('issuer')} placeholder="https://your-idp.example.com" />
          <Field label="Authorization endpoint" id="s-auth-ep" value={form.authorizationEndpoint}
            onChange={set('authorizationEndpoint')} placeholder="https://your-idp.example.com/authorize" />
          <Field label="Token endpoint" id="s-token-ep" value={form.tokenEndpoint}
            onChange={set('tokenEndpoint')} placeholder="https://your-idp.example.com/oauth/token" />
          <Field label="JWKS URI (optional)" id="s-jwks" value={form.jwksUri}
            onChange={set('jwksUri')} placeholder="https://your-idp.example.com/.well-known/jwks.json" mono />
          <Field label="Client ID" id="s-client-id" value={form.clientId}
            onChange={set('clientId')} placeholder="your-client-id" mono />
          <Field label="Redirect URI" id="s-redirect" value={form.redirectUri}
            onChange={set('redirectUri')} placeholder={`${window.location.origin}/callback`} mono />
          <Field label="Scope" id="s-scope" value={form.scope}
            onChange={set('scope')} placeholder="openid profile email" mono />
          <Field label="Audience (optional)" id="s-audience" value={form.audience}
            onChange={set('audience')} placeholder="your-api-identifier" mono />
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
