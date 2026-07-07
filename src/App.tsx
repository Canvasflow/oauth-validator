// src/App.tsx
// ---------------------------------------------------------------------------
// Root component. Acts as a minimal router:
//   /callback  → CallbackScreen (processes the IdP redirect)
//   /          → LoginScreen or DashboardScreen (based on stored tokens)
//
// No router library is used. Path matching is done directly on window.location.
// ---------------------------------------------------------------------------

import { useState } from 'react'
import { LoginScreen } from './components/LoginScreen'
import { CallbackScreen } from './components/CallbackScreen'
import { DashboardScreen } from './components/DashboardScreen'
import { loadTokens } from './lib/storage'
import type { AuthState } from './types/app'

function deriveInitialState(): AuthState {
  const path = window.location.pathname

  if (path === '/callback' || path.startsWith('/callback?')) {
    // The browser just returned from the IdP — process the callback
    return { screen: 'callback' }
  }

  // Not a callback — check whether we already have tokens in session
  const tokens = loadTokens()
  if (tokens) {
    return { screen: 'dashboard' }
  }

  return { screen: 'login' }
}

export default function App() {
  const [authState, setAuthState] = useState<AuthState>(deriveInitialState)
  const tokens = loadTokens()

  switch (authState.screen) {
    case 'callback':
      return <CallbackScreen onResult={setAuthState} />

    case 'dashboard':
      if (!tokens) {
        // Tokens were cleared (e.g. sign out in another tab) — fall back to login
        return <LoginScreen />
      }
      return (
        <DashboardScreen
          tokens={tokens}
          onLogout={setAuthState}
        />
      )

    case 'login':
    default:
      return (
        <LoginScreen
          error={authState.error}
          errorDescription={authState.errorDescription}
        />
      )
  }
}
