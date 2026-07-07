// src/components/LoginScreen.tsx
import { useState } from 'react'
import { loginRouteApi } from '../router'
import { login } from '../lib/oauth'

export function LoginScreen() {
  // Typed search params from the route definition — no prop drilling needed.
  const { error, error_description } = loginRouteApi.useSearch()
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    try {
      await login() // redirects away — loading stays true until navigation
    } catch (e) {
      console.error('Login initiation failed:', e)
      setLoading(false)
    }
  }

  return (
    <div className="screen screen--login">
      <div className="login-card">
        <div className="login-card__header">
          <div className="logo">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <rect width="32" height="32" rx="8" fill="var(--accent)" />
              <path
                d="M8 16a8 8 0 1 1 16 0A8 8 0 0 1 8 16Zm8-5.5a1.5 1.5 0 0 0-1.5 1.5v4a1.5 1.5 0 0 0 3 0v-4A1.5 1.5 0 0 0 16 10.5Zm0 9a1.75 1.75 0 1 0 0 3.5 1.75 1.75 0 0 0 0-3.5Z"
                fill="white"
              />
            </svg>
            <span className="logo__name">OAuth PKCE PoC</span>
          </div>
          <h1 className="login-card__title">Sign in</h1>
          <p className="login-card__subtitle">
            Authorization Code flow with PKCE (S256).<br />
            No token libraries — Web Crypto API only.
          </p>
        </div>

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
          disabled={loading}
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
          </p>
        </div>
      </div>
    </div>
  )
}
