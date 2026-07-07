// src/lib/oauth.ts
// ---------------------------------------------------------------------------
// OAuth 2.0 Authorization Code + PKCE flow — pure client-side implementation.
// RFC 6749 + RFC 7636. No libraries.
//
// Flow:
//   1. login()          → generates verifier/challenge, saves to sessionStorage,
//                         redirects browser to the IdP authorization endpoint
//   2. handleCallback() → reads the auth code from the URL, exchanges it for
//                         tokens at the token endpoint, saves tokens, clears
//                         ephemeral PKCE values
// ---------------------------------------------------------------------------

import { oauthConfig } from './config'
import { generateCodeVerifier, generateCodeChallenge, generateState } from './pkce'
import { saveAuthRequest, loadAuthRequest, clearAuthRequest, saveTokens } from './storage'

// ---------------------------------------------------------------------------
// Token endpoint response shape
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Step 1: Initiate login — redirect to IdP
// ---------------------------------------------------------------------------

/**
 * Build the authorization URL, persist PKCE state, redirect the browser.
 * This function does not return — it navigates away.
 */
export async function login(): Promise<void> {
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = await generateCodeChallenge(codeVerifier)
  const state = generateState()

  // Persist before redirect — will be read back in handleCallback()
  saveAuthRequest(state, codeVerifier)

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: oauthConfig.clientId,
    redirect_uri: oauthConfig.redirectUri,
    scope: oauthConfig.scope,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })

  // Some IdPs (e.g. Auth0) require the audience param to set the correct aud claim
  if (oauthConfig.audience) {
    params.set('audience', oauthConfig.audience)
  }

  const authUrl = `${oauthConfig.authorizationEndpoint}?${params.toString()}`
  window.location.href = authUrl
}

// ---------------------------------------------------------------------------
// Step 2: Handle the callback — exchange auth code for tokens
// ---------------------------------------------------------------------------

export type CallbackResult =
  | { ok: true }
  | { ok: false; error: string; errorDescription?: string }

/**
 * Called when the browser lands on the redirect_uri (/callback).
 * Reads `code` and `state` from the URL query string, validates state,
 * exchanges the code for tokens, saves them, cleans up the URL.
 */
export async function handleCallback(): Promise<CallbackResult> {
  const url = new URL(window.location.href)
  const code = url.searchParams.get('code')
  const returnedState = url.searchParams.get('state')
  const error = url.searchParams.get('error')
  const errorDescription = url.searchParams.get('error_description') ?? undefined

  // IdP returned an error (user denied, misconfiguration, etc.)
  if (error) {
    clearAuthRequest()
    return { ok: false, error, errorDescription }
  }

  if (!code) {
    return { ok: false, error: 'missing_code', errorDescription: 'No authorization code in callback URL.' }
  }

  // Load the saved state and verifier
  const saved = loadAuthRequest()
  if (!saved) {
    return {
      ok: false,
      error: 'missing_state',
      errorDescription: 'No PKCE state found in session. The login flow may have expired or been started in a different tab.',
    }
  }

  // CSRF check — state must match exactly
  if (returnedState !== saved.state) {
    clearAuthRequest()
    return {
      ok: false,
      error: 'state_mismatch',
      errorDescription: 'State parameter mismatch. Possible CSRF attack or stale session.',
    }
  }

  // Exchange the auth code for tokens
  const tokenResult = await exchangeCode(code, saved.codeVerifier)
  clearAuthRequest() // ephemeral values no longer needed

  if ('error' in tokenResult) {
    return {
      ok: false,
      error: tokenResult.error ?? 'token_exchange_failed',
      errorDescription: tokenResult.error_description,
    }
  }

  // Persist the tokens
  saveTokens({
    accessToken: tokenResult.access_token,
    idToken: tokenResult.id_token,
    refreshToken: tokenResult.refresh_token,
  })

  // Clean the code + state out of the URL without a page reload
  const cleanUrl = new URL(window.location.href)
  cleanUrl.search = ''
  window.history.replaceState({}, document.title, cleanUrl.pathname)

  return { ok: true }
}

// ---------------------------------------------------------------------------
// Token endpoint request
// ---------------------------------------------------------------------------

async function exchangeCode(
  code: string,
  codeVerifier: string
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: oauthConfig.redirectUri,
    client_id: oauthConfig.clientId,
    code_verifier: codeVerifier,
  })

  const response = await fetch(oauthConfig.tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
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
