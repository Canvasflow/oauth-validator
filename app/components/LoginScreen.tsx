import { useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import { login } from '../lib/oauth'
import { isConfigured } from '../lib/config'
import { SettingsDialog } from './SettingsDialog'

const routeApi = getRouteApi('/login')

export function LoginScreen() {
  const { error, error_description } = routeApi.useSearch()
  const [loading, setLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [configured, setConfigured] = useState(isConfigured)

  const handleLogin = async () => {
    setLoading(true)
    try {
      await login()
    } catch (e) {
      console.error('Login initiation failed:', e)
      setLoading(false)
    }
  }

  const handleSettingsClose = () => {
    setShowSettings(false)
    setConfigured(isConfigured())
  }

  return (
    <>
      {showSettings && <SettingsDialog onClose={handleSettingsClose} />}

      <div className="screen screen--login">
        <div className="login-card">
          <div className="login-card__header">
            <div className="login-card__brand-row">
              <div className="logo">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
                  <rect width="32" height="32" rx="8" fill="var(--accent)" />
                  <path
                    d="M8 16a8 8 0 1 1 16 0A8 8 0 0 1 8 16Zm8-5.5a1.5 1.5 0 0 0-1.5 1.5v4a1.5 1.5 0 0 0 3 0v-4A1.5 1.5 0 0 0 16 10.5Zm0 9a1.75 1.75 0 1 0 0 3.5 1.75 1.75 0 0 0 0-3.5Z"
                    fill="white"
                  />
                </svg>
                <span className="logo__name">OAuth PKCE Validator</span>
              </div>
              <button
                className="btn btn--ghost btn--sm btn--icon"
                onClick={() => setShowSettings(true)}
                aria-label="Configure IdP settings"
                title="Settings"
              >
                <SettingsIcon />
              </button>
            </div>

            <h1 className="login-card__title">Sign in</h1>
            <p className="login-card__subtitle">
              Authorization Code flow with PKCE (S256).<br />
              No token libraries — Web Crypto API only.
            </p>
          </div>

          {!configured && (
            <div className="warn-banner" role="alert">
              <span className="warn-banner__icon">⚙️</span>
              <div>
                <strong className="warn-banner__title">IdP not configured</strong>
                <span className="warn-banner__desc">
                  Click the settings icon above to enter your identity provider details before signing in.
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="error-banner" role="alert">
              <strong className="error-banner__code">{error}</strong>
              {error_description && (
                <span className="error-banner__desc">{error_description}</span>
              )}
            </div>
          )}

          <button
            className="btn btn--primary"
            onClick={handleLogin}
            disabled={loading || !configured}
            aria-busy={loading}
          >
            {loading ? (
              <>
                <span className="spinner" aria-hidden="true" />
                Redirecting to IdP…
              </>
            ) : (
              'Sign in with your IdP'
            )}
          </button>

          <div className="login-card__footer">
            <p>
              Tokens are stored in <code>sessionStorage</code> and cleared when the tab closes.
              IdP settings are saved in <code>localStorage</code>.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}
