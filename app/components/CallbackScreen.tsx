import { useEffect, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { handleCallback } from '../lib/oauth'

export function CallbackScreen() {
  const navigate = useNavigate()
  const hasRun = useRef(false)

  useEffect(() => {
    if (hasRun.current) return
    hasRun.current = true

    handleCallback().then((result) => {
      if (result.ok) {
        void navigate({ to: '/dashboard', replace: true })
      } else {
        void navigate({
          to: '/login',
          replace: true,
          search: { error: result.error, error_description: result.errorDescription },
        })
      }
    })
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-canvas">
      <div className="flex flex-col items-center gap-4 text-center">
        <span
          className="inline-block w-10 h-10 border-[3px] border-rim2 border-t-brand rounded-full animate-spin"
          aria-hidden="true"
        />
        <p className="text-lg font-semibold text-ink">Completing sign-in…</p>
        <p className="text-sm text-ink2">Exchanging authorization code for tokens</p>
      </div>
    </div>
  )
}
