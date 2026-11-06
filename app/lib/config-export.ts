// app/lib/config-export.ts
// ---------------------------------------------------------------------------
// The shareable config export, produced identically by the Settings dialog's
// download button and the dashboard's Export Configuration panel. Tokens are
// never part of it. The HS256 shared secret is left out unless the caller
// opts in: it is a credential, not configuration.
// ---------------------------------------------------------------------------

import type { OAuthConfig } from './config'

// Spec version stamped in the export. Pinned to the released 1.0.0 while
// 1.1.0 (SPEC_VERSION, from docs/spec/version.tex) is unreleased; switch
// back to SPEC_VERSION once 1.1.0 ships.
const EXPORT_SPEC_VERSION = '1.0.0'

export interface ConfigExport {
  filename: string
  json: string
}

// The one source of both the file name and the content, for every caller.
export function buildConfigExport(config: OAuthConfig, { includeSecret = false } = {}): ConfigExport {
  const now = new Date()
  const exported: OAuthConfig = { ...config }
  if (!includeSecret) delete exported.secret
  const json = JSON.stringify(
    {
      tool: 'canvasflow-oauth-validator',
      specVersion: EXPORT_SPEC_VERSION,
      exportedAt: now.toISOString(),
      config: exported,
    },
    null,
    2,
  )
  return { filename: exportFilename(config, now), json }
}

export function downloadConfigExport({ filename, json }: ConfigExport): void {
  const url = URL.createObjectURL(new Blob([json + '\n'], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// oauth-config-<issuer host>-<YYYY-MM-DD>.json
function exportFilename(config: OAuthConfig, now: Date): string {
  let host = 'idp'
  try {
    host = new URL(config.issuer).hostname || host
  } catch {
    // issuer is not a URL; keep the generic name
  }
  const date = now.toISOString().slice(0, 10)
  return `oauth-config-${host.replace(/[^a-z0-9.-]/gi, '_')}-${date}.json`
}
