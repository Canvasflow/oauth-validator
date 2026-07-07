import { useEffect, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { handleCallback } from '../lib/oauth'

export function CallbackScreen() {
  const navigate = useNavigate()
  const hasRun = useRef(false)

  useEffect(() => {
    // StrictMode double-invokes effects in dev; the auth code is single-use,
    // so a second exchange would fail with invalid_grant.
    if (hasRun.current) return
    hasRun.current = true

    handleCallback().then((result) => {
      if (result.ok) {
        void navigate({ to: '/dashboard', replace: true })
      } else {
        void navigate({
          to: '/login',
          replace: true,
          search: {
            error: result.error,
            error_description: result.errorDescription,
          },
        })
      }
    })
  }, [navigate])

  return (
    <div className="screen screen--callback">
      <div className="callback-card">
        <span className="spinner spinner--large" aria-hidden="true" />
        <p className="callback-card__text">Completing sign-in…</p>
        <p className="callback-card__sub">Exchanging authorization code for tokens</p>
      </div>
    </div>
  )
}
