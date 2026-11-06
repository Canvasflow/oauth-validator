// app/server/lib/entitlements.ts
// ---------------------------------------------------------------------------
// Normalize the three possible entitlement claim names into a single value.
// Priority: cf:entitlements  >  resources  >  entitlements
// ---------------------------------------------------------------------------

export type EntitlementsSource = 'cf:entitlements' | 'resources' | 'entitlements' | null

export interface EntitlementsResult {
  entitlements: string[]
  source: EntitlementsSource
}

export function extractEntitlements(payload: Record<string, unknown>): EntitlementsResult {
  const candidates: Array<[string, EntitlementsSource]> = [
    ['cf:entitlements', 'cf:entitlements'],
    ['resources',       'resources'],
    ['entitlements',    'entitlements'],
  ]

  // The first claim *present* wins (CF-OAUTH §4.3), even if it is not an
  // array: Canvasflow then rejects the token instead of falling through.
  for (const [claim, source] of candidates) {
    const val = payload[claim]
    if (val === undefined) continue
    return {
      entitlements: Array.isArray(val) ? (val.filter((v) => typeof v === 'string') as string[]) : [],
      source,
    }
  }

  return { entitlements: [], source: null }
}
