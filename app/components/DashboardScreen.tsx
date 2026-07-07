// app/components/DashboardScreen.tsx
import { useNavigate } from '@tanstack/react-router'
import { clearAll, loadTokens } from '../lib/storage'
import { TokenInspector } from './TokenInspector'
import { SignatureValidator } from './SignatureValidator'

export function DashboardScreen() {
  const navigate = useNavigate()
  const tokens = loadTokens()!

  const handleLogout = () => {
    clearAll()
    void navigate({
      to: '/login',
      replace: true,
      search: { error: undefined, error_description: undefined },
    })
  }

  return (
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
      </main>
    </div>
  )
}
