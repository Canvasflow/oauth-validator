// src/components/DashboardScreen.tsx
// ---------------------------------------------------------------------------
// Rendered at /dashboard. The beforeLoad guard in router.tsx guarantees
// tokens exist — loadTokens() is non-null here.
// ---------------------------------------------------------------------------

import { dashboardRouteApi } from '../router'
import { TokenInspector } from './TokenInspector'
import { clearAll, loadTokens } from '../lib/storage'

export function DashboardScreen() {
  const navigate = dashboardRouteApi.useNavigate()
  const tokens = loadTokens()! // non-null guaranteed by beforeLoad guard

  const handleLogout = () => {
    clearAll()
    navigate({
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
          <span className="dashboard-header__title">OAuth PKCE PoC</span>
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
            <code>sessionStorage</code> and ready to be sent as a{' '}
            <code>Bearer</code> token to the GraphQL API. Decoded claims are shown
            below — signature verification happens on the server, not here.
          </p>
        </div>

        <TokenInspector tokens={tokens} />
      </main>
    </div>
  )
}
