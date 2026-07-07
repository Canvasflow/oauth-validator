// app/server/lib/jwks.ts
// Resolves the JWKS URI for an issuer. Tries OIDC discovery first,
// falls back to the conventional {issuer}/.well-known/jwks.json path.

export async function resolveJwksUri(issuer: string): Promise<string> {
  const base = issuer.replace(/\/$/, '')
  const discoveryUrl = `${base}/.well-known/openid-configuration`

  try {
    const res = await fetch(discoveryUrl)
    if (res.ok) {
      const config = (await res.json()) as { jwks_uri?: string }
      if (config.jwks_uri) return config.jwks_uri
    }
  } catch {
    // Fall through — discovery not available, use conventional URL
  }

  return `${base}/.well-known/jwks.json`
}
