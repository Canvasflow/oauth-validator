// app/lib/oauth.ts
// OAuth 2.0 Authorization Code + PKCE flow — pure client-side.
// RFC 6749 + RFC 7636. No libraries.

import { oauthConfig } from './config'
import { generateCodeVerifier, generateCodeChallenge, generateState } from './pkce'
import { saveAuthRequest, loadAuthRequest, clearAuthRequest, saveTokens } from './storage'

interface TokenResponse {
  access_token: string
  token_type: string
  expires_in?: number
  id_token?: string
  refresh_token?: string
  scope?: string
  error?: string
  error_description?: string
}

// ── Step 1: Initiate login — redirect to IdP ──────────────────────────────

export async function login(): Promise<void> {
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = await generateCodeChallenge(codeVerifier)
  const state = generateState()

  saveAuthRequest(state, codeVerifier)

  const params = new URLSearchParams({
    response_type:          'code',
    client_id:              oauthConfig.clientId,
    redirect_uri:           oauthConfig.redirectUri,
    scope:                  oauthConfig.scope,
    state,
    code_challenge:         codeChallenge,
    code_challenge_method:  'S256',
  })

  if (oauthConfig.audience) params.set('audience', oauthConfig.audience)

  window.location.href = `${oauthConfig.authorizationEndpoint}?${params.toString()}`
}

// ── Step 2: Handle the callback ───────────────────────────────────────────

export type CallbackResult =
  | { ok: true }
  | { ok: false; error: string; errorDescription?: string }

export async function handleCallback(): Promise<CallbackResult> {
  const url              = new URL(window.location.href)
  const code             = url.searchParams.get('code')
  const returnedState    = url.searchParams.get('state')
  const error            = url.searchParams.get('error')
  const errorDescription = url.searchParams.get('error_description') ?? undefined

  if (error) {
    clearAuthRequest()
    return { ok: false, error, errorDescription }
  }

  if (!code) {
    return { ok: false, error: 'missing_code', errorDescription: 'No authorization code in callback URL.' }
  }

  const saved = loadAuthRequest()
  if (!saved) {
    return {
      ok: false,
      error: 'missing_state',
      errorDescription: 'No PKCE state found in session. The login flow may have expired or been started in a different tab.',
    }
  }

  if (returnedState !== saved.state) {
    clearAuthRequest()
    return {
      ok: false,
      error: 'state_mismatch',
      errorDescription: 'State parameter mismatch. Possible CSRF attack or stale session.',
    }
  }

  const tokenResult = await exchangeCode(code, saved.codeVerifier)
  clearAuthRequest()

  if ('error' in tokenResult) {
    return {
      ok: false,
      error: tokenResult.error ?? 'token_exchange_failed',
      errorDescription: tokenResult.error_description,
    }
  }

  saveTokens({
    accessToken:  tokenResult.access_token,
    idToken:      tokenResult.id_token,
    refreshToken: tokenResult.refresh_token,
  })

  // Remove code + state from the URL without a page reload
  const clean = new URL(window.location.href)
  clean.search = ''
  window.history.replaceState({}, document.title, clean.pathname)

  return { ok: true }
}

// ── Token endpoint ────────────────────────────────────────────────────────

async function exchangeCode(code: string, codeVerifier: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type:    'authorization_code',
    code,
    redirect_uri:  oauthConfig.redirectUri,
    client_id:     oauthConfig.clientId,
    code_verifier: codeVerifier,
  })

  const response = await fetch(oauthConfig.tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: body.toString(),
  })

  const data = (await response.json()) as TokenResponse

  if (!response.ok || data.error) {
    return {
      access_token: '',
      token_type: '',
      error: data.error ?? `http_${response.status}`,
      error_description: data.error_description ?? `Token endpoint returned ${response.status}`,
    }
  }

  return data
}
