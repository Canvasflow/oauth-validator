import { decodeJwt } from '../lib/jwt'
import { getOAuthConfig } from '../lib/config'
import { runCanvasflowChecks, summarize, type Check, type CheckStatus } from '../lib/canvasflow-checks'
import { SPEC_VERSION } from '../lib/spec'

interface Props {
  accessToken: string
}

const GROUPS: Array<{ id: Check['group']; title: string }> = [
  { id: 'V1', title: 'V1 — Token structure' },
  { id: 'V2', title: 'V2 — Signing (run Signature Verification below for the signature itself)' },
  { id: 'V3', title: 'V3 — Entitlements' },
]

const BADGE: Record<CheckStatus, { icon: string; className: string; label: string }> = {
  pass: { icon: '✓', className: 'bg-ok/10 text-ok border-ok/25', label: 'Pass' },
  warn: { icon: '!', className: 'bg-warn/10 text-warn border-warn/25', label: 'Warning' },
  fail: { icon: '✗', className: 'bg-bad/10 text-bad border-bad/25', label: 'Fail' },
}

export function CanvasflowChecks({ accessToken }: Props) {
  const decoded = decodeJwt(accessToken)
  const config = getOAuthConfig()

  if (!decoded) return null

  const checks = runCanvasflowChecks(decoded, config)
  const overall = BADGE[summarize(checks)]

  return (
    <div className="bg-card border border-rim rounded-2xl overflow-hidden">
      <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-rim bg-panel">
        <div>
          <h3 className="text-base font-semibold text-ink mb-1">Canvasflow Checks</h3>
          <p className="text-sm text-ink2 leading-relaxed max-w-lg">
            How the Canvasflow API will judge this access token (CF-OAUTH v{SPEC_VERSION}).
            Go-live needs every check green.
          </p>
        </div>
        <span className={`flex-shrink-0 inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full border ${overall.className}`}>
          {overall.icon} {overall.label}
        </span>
      </div>

      <div className="px-6 py-5 flex flex-col gap-5">
        {GROUPS.map(({ id, title }) => {
          const group = checks.filter((c) => c.group === id)
          if (!group.length) return null
          return (
            <section key={id} className="flex flex-col">
              <h4 className="font-mono text-[0.7rem] uppercase tracking-widest text-ink3 pb-2 border-b border-rim mb-1">{title}</h4>
              {group.map((c) => {
                const badge = BADGE[c.status]
                return (
                  <div key={c.id} className="grid grid-cols-[28px_1fr] gap-2 py-2 border-b border-rim last:border-0">
                    <span className={`w-6 h-6 inline-flex items-center justify-center rounded-full border text-xs font-bold ${badge.className}`} aria-label={badge.label}>
                      {badge.icon}
                    </span>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-sm text-ink">{c.label}</span>
                      {c.detail && <span className="text-xs text-ink3 break-all font-mono">{c.detail}</span>}
                    </div>
                  </div>
                )
              })}
            </section>
          )
        })}
      </div>
    </div>
  )
}
