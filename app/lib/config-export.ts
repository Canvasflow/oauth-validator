// app/lib/config-export.ts
// ---------------------------------------------------------------------------
// The shareable config export, produced identically by the Settings dialog's
// download button and the dashboard's Export Configuration panel. Tokens are
// never part of it. The HS256 shared secret is left out unless the caller
// opts in: it is a credential, not configuration.
// ---------------------------------------------------------------------------

import { z } from 'zod'
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

// ── Import: validate a dropped / chosen config file ───────────────────────
// Accepts the export above ({ tool, specVersion, exportedAt, config }) and a
// bare OAuthConfig object. Unknown keys are rejected so a typo cannot be
// silently ignored; required fields mirror what the Settings form needs.

const nonEmpty = (name: string) =>
  z.string({ required_error: `${name} is required`, invalid_type_error: `${name} must be a string` })
    .refine((v) => v.trim() !== '', `${name} must not be empty`)

const optionalString = z.string().optional()

const configSchema = z
  .object({
    issuer:                nonEmpty('issuer'),
    authorizationEndpoint: nonEmpty('authorizationEndpoint'),
    tokenEndpoint:         optionalString,
    clientId:              nonEmpty('clientId'),
    redirectUri:           nonEmpty('redirectUri'),
    scope:                 nonEmpty('scope'),
    audience:              optionalString,
    flow:                  z.enum(['pkce', 'implicit']).default('pkce'),
    verificationMethod:    z.enum(['jwks', 'secret']).default('jwks'),
    jwksUri:               optionalString,
    secret:                optionalString,
    expectedAudience:      optionalString,
    cognitoMode:           z.boolean().optional(),
    graphqlUrl:            optionalString,
    appKey:                optionalString,
  })
  .strict()
  .superRefine((c, ctx) => {
    if (c.flow === 'pkce' && !c.tokenEndpoint?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['tokenEndpoint'], message: 'tokenEndpoint is required for the pkce flow' })
    }
  })

const exportSchema = z
  .object({
    tool:        z.literal('canvasflow-oauth-validator'),
    specVersion: z.string(),
    exportedAt:  z.string(),
    config:      z.unknown(),
  })
  .strict()

export type ConfigImportResult =
  | { ok: true; config: OAuthConfig; warnings: string[] }
  | { ok: false; errors: string[] }

export function parseConfigImport(text: string): ConfigImportResult {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch (e) {
    return { ok: false, errors: [`Not valid JSON: ${(e as Error).message}`] }
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return { ok: false, errors: ['The file must contain a JSON object.'] }
  }

  let raw: unknown = data
  let prefix = ''
  if ('tool' in data || 'config' in data) {
    const wrapper = exportSchema.safeParse(data)
    if (!wrapper.success) return { ok: false, errors: formatIssues(wrapper.error, '') }
    raw = wrapper.data.config
    prefix = 'config.'
  }

  const parsed = configSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: formatIssues(parsed.error, prefix) }
  const config: OAuthConfig = { ...parsed.data, tokenEndpoint: parsed.data.tokenEndpoint ?? '' }
  // The form keeps tokenEndpoint as a string; the implicit flow may omit it.
  const warnings: string[] = []
  // A dashboard export leaves the secret out unless asked: still importable.
  if (config.verificationMethod === 'secret' && !config.secret) {
    warnings.push('The file has no HS256 shared secret. Enter it before saving.')
  }
  try {
    const origin = new URL(config.redirectUri).origin
    if (typeof window !== 'undefined' && origin !== window.location.origin) {
      warnings.push(`The redirect URI points to ${origin}, not this site (${window.location.origin}). Sign-in will fail with a missing state unless you change it.`)
    }
  } catch {
    warnings.push('The redirect URI is not a valid URL.')
  }
  return { ok: true, config, warnings }
}

function formatIssues(error: z.ZodError, prefix: string): string[] {
  return error.issues.map((i) => {
    if (i.code === z.ZodIssueCode.unrecognized_keys) {
      return `Unknown field${i.keys.length > 1 ? 's' : ''}: ${i.keys.map((k) => prefix + k).join(', ')}`
    }
    const field = i.path.join('.')
    // Messages written above already start with the field name.
    if (field && i.message.startsWith(`${field} `)) return prefix + i.message
    return `${prefix + field || prefix.replace(/\.$/, '') || 'file'}: ${i.message}`
  })
}
