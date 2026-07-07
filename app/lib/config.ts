// app/lib/config.ts
// All OAuth parameters are read from environment variables (VITE_ prefix for
// client-side exposure via import.meta.env). Copy .env.example to .env.local
// and fill in your IdP values — .env.local is gitignored.

export interface OAuthConfig {
  issuer: string
  authorizationEndpoint: string
  tokenEndpoint: string
  clientId: string
  redirectUri: string
  scope: string
  audience?: string
}

function required(key: string): string {
  const value = import.meta.env[key] as string | undefined
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}\n` +
        'Copy .env.example to .env.local and fill in your IdP values.'
    )
  }
  return value
}

function optional(key: string): string | undefined {
  return (import.meta.env[key] as string | undefined) || undefined
}

export const oauthConfig: OAuthConfig = {
  issuer:                required('VITE_OAUTH_ISSUER'),
  authorizationEndpoint: required('VITE_OAUTH_AUTHORIZATION_ENDPOINT'),
  tokenEndpoint:         required('VITE_OAUTH_TOKEN_ENDPOINT'),
  clientId:              required('VITE_OAUTH_CLIENT_ID'),
  redirectUri:           required('VITE_OAUTH_REDIRECT_URI'),
  scope:                 required('VITE_OAUTH_SCOPE'),
  audience:              optional('VITE_OAUTH_AUDIENCE'),
}
