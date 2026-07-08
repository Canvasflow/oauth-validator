import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { clearAll, loadTokens, type StoredTokens } from '../lib/storage'
import { TokenInspector } from './TokenInspector'
import { SignatureValidator } from './SignatureValidator'
import { TokenRefresh } from './TokenRefresh'
import { SettingsDialog } from './SettingsDialog'

export function DashboardScreen() {
  const navigate = useNavigate()
  const [tokens, setTokens] = useState<StoredTokens>(() => loadTokens()!)
  const [showSettings, setShowSettings] = useState(false)

  const handleLogout = () => {
    clearAll()
    void navigate({
      to: '/login',
      replace: true,
      search: { error: undefined, error_description: undefined },
    })
  }

  return (
    <>
      {showSettings && <SettingsDialog onClose={() => setShowSettings(false)} />}

      <div className="screen screen--dashboard">
        <header className="dashboard-header">
          <div className="dashboard-header__brand">
            <svg width="24" height="24" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <rect width="32" height="32" rx="8" fill="var(--accent)" />
              <path
                d="M8 16a8 8 0 1 1 16 0A8 8 0 0 1 8 16Zm8-5.5a1.5 1.5 0 0 0-1.5 1.5v4a1.5 1.5 0 0 0 3 0v-4A1.5 1.5 0 0 0 16 10.5Zm0 9a1.75 1.75 0 1 0 0 3.5 1.75 1.75 0 0 0 0-3.5Z"
                fill="white"
              />
            </svg>
            <span className="dashboard-header__title">OAuth PKCE Validator</span>
          </div>
          <div className="dashboard-header__actions">
            <div className="status-badge status-badge--success">
              <span className="status-badge__dot" />
              Authenticated
            </div>
            <button
              className="btn btn--ghost btn--sm btn--icon"
              onClick={() => setShowSettings(true)}
              aria-label="Configure IdP settings"
              title="Settings"
            >
              <SettingsIcon />
            </button>
            <button className="btn btn--ghost btn--sm" onClick={handleLogout}>
              Sign out
            </button>
          </div>
        </header>

        <main className="dashboard-main">
          <div className="dashboard-intro">
            <h2 className="dashboard-intro__heading">Token Inspector</h2>
            <p className="dashboard-intro__body">
              The PKCE flow completed successfully. The access token is stored in{' '}
              <code>sessionStorage</code>. Decoded claims are shown below — client-side
              decode only. Use the Signature Verification panel to cryptographically
              confirm the token via the Cloudflare Worker backend.
            </p>
          </div>

          <TokenInspector tokens={tokens} />

          <SignatureValidator accessToken={tokens.accessToken} />

          <TokenRefresh tokens={tokens} onRefreshed={setTokens} />
        </main>
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
