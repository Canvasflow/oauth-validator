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

  for (const [claim, source] of candidates) {
    const val = payload[claim]
    if (Array.isArray(val)) {
      return { entitlements: val.filter((v) => typeof v === 'string') as string[], source }
    }
  }

  return { entitlements: [], source: null }
}
