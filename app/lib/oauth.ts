// app/lib/oauth.ts
// OAuth 2.0 Authorization Code + PKCE flow (default) and the deprecated
// Implicit grant — pure client-side. RFC 6749 + RFC 7636. No libraries.

import { getOAuthConfig } from './config'
import { generateCodeVerifier, generateCodeChallenge, generateState } from './pkce'
import { saveAuthRequest, loadAuthRequest, clearAuthRequest, saveTokens, type StoredTokens } from './storage'
import { decodeJwt } from './jwt'

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
  const config = getOAuthConfig()
  if (!config) throw new Error('OAuth not configured. Click the settings icon to configure your IdP.')

  const state = generateState()

  if (config.flow === 'implicit') {
    // Implicit grant (RFC 6749 §4.2) — deprecated. Tokens come back directly
    // in the redirect URI fragment; there is no code exchange and no PKCE.
    // A nonce is required to bind the returned id_token to this request.
    const nonce = generateState()
    saveAuthRequest(state, undefined, nonce)

    const params = new URLSearchParams({
      response_type: 'id_token token',
      client_id:     config.clientId,
      redirect_uri:  config.redirectUri,
      scope:         config.scope,
      state,
      nonce,
      response_mode: 'fragment',
    })

    if (config.audience) params.set('audience', config.audience)

    window.location.href = `${config.authorizationEndpoint}?${params.toString()}`
    return
  }

  const codeVerifier = generateCodeVerifier()
  const codeChallenge = await generateCodeChallenge(codeVerifier)

  saveAuthRequest(state, codeVerifier)

  const params = new URLSearchParams({
    response_type:         'code',
    client_id:             config.clientId,
    redirect_uri:          config.redirectUri,
    scope:                 config.scope,
    state,
    code_challenge:        codeChallenge,
    code_challenge_method: 'S256',
  })

  if (config.audience) params.set('audience', config.audience)

  window.location.href = `${config.authorizationEndpoint}?${params.toString()}`
}

// ── Step 2: Handle the callback ───────────────────────────────────────────

export type CallbackResult =
  | { ok: true }
  | { ok: false; error: string; errorDescription?: string }

export async function handleCallback(): Promise<CallbackResult> {
  const config = getOAuthConfig()
  return config?.flow === 'implicit' ? handleImplicitCallback() : handleCodeCallback()
}

// ── PKCE callback: exchange the authorization code for tokens ─────────────

async function handleCodeCallback(): Promise<CallbackResult> {
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

  if (!saved.codeVerifier) {
    clearAuthRequest()
    return {
      ok: false,
      error: 'missing_code_verifier',
      errorDescription: 'No PKCE code verifier found in session. The login flow may have expired or been started in a different tab.',
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

// ── Implicit callback: tokens arrive directly in the redirect fragment ────
// Deprecated grant (RFC 6749 §4.2 / RFC 9700). No token endpoint round trip:
// the IdP puts access_token (and id_token, since we request "id_token token")
// straight into the URL fragment. We still enforce state (CSRF) and, when an
// id_token is present, the nonce that binds it to this specific request.

function handleImplicitCallback(): CallbackResult {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))

  const accessToken      = hashParams.get('access_token')
  const idToken          = hashParams.get('id_token') ?? undefined
  const returnedState    = hashParams.get('state')
  const error            = hashParams.get('error')
  const errorDescription = hashParams.get('error_description') ?? undefined

  if (error) {
    clearAuthRequest()
    return { ok: false, error, errorDescription }
  }

  if (!accessToken) {
    return { ok: false, error: 'missing_token', errorDescription: 'No access token in callback URL fragment.' }
  }

  const saved = loadAuthRequest()
  if (!saved) {
    return {
      ok: false,
      error: 'missing_state',
      errorDescription: 'No auth request state found in session. The login flow may have expired or been started in a different tab.',
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

  if (idToken && saved.nonce) {
    const decoded = decodeJwt(idToken)
    if (decoded?.payload.nonce !== saved.nonce) {
      clearAuthRequest()
      return {
        ok: false,
        error: 'nonce_mismatch',
        errorDescription: 'ID token nonce does not match the value sent in the authorization request. Possible token replay.',
      }
    }
  }

  clearAuthRequest()
  saveTokens({ accessToken, idToken })

  // Remove the fragment from the URL without a page reload
  const clean = new URL(window.location.href)
  clean.hash = ''
  window.history.replaceState({}, document.title, clean.pathname)

  return { ok: true }
}

// ── Step 3: Refresh tokens ────────────────────────────────────────────────

export type RefreshResult =
  | { ok: true; tokens: StoredTokens }
  | { ok: false; error: string; errorDescription?: string }

export async function refreshTokens(refreshToken: string): Promise<RefreshResult> {
  const config = getOAuthConfig()
  if (!config) {
    return {
      ok: false,
      error: 'not_configured',
      errorDescription: 'OAuth config not found. Please configure your IdP settings.',
    }
  }

  const body = new URLSearchParams({
    grant_type:    'refresh_token',
    refresh_token: refreshToken,
    client_id:     config.clientId,
  })

  try {
    const response = await fetch(config.tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: body.toString(),
    })

    const data = (await response.json()) as TokenResponse

    if (!response.ok || data.error) {
      return {
        ok: false,
        error: data.error ?? `http_${response.status}`,
        errorDescription: data.error_description ?? `Token endpoint returned ${response.status}`,
      }
    }

    const newTokens: StoredTokens = {
      accessToken:  data.access_token,
      idToken:      data.id_token      ?? undefined,
      // Preserve the existing refresh token if the IdP doesn't rotate it
      refreshToken: data.refresh_token ?? refreshToken,
    }
    saveTokens(newTokens)
    return { ok: true, tokens: newTokens }
  } catch (e) {
    return {
      ok: false,
      error: 'network_error',
      errorDescription: (e as Error).message,
    }
  }
}

// ── Token endpoint ────────────────────────────────────────────────────────

async function exchangeCode(code: string, codeVerifier: string): Promise<TokenResponse> {
  const config = getOAuthConfig()
  if (!config) {
    return {
      access_token: '',
      token_type: '',
      error: 'not_configured',
      error_description: 'OAuth config not found. Please configure your IdP settings.',
    }
  }

  const body = new URLSearchParams({
    grant_type:    'authorization_code',
    code,
    redirect_uri:  config.redirectUri,
    client_id:     config.clientId,
    code_verifier: codeVerifier,
  })

  const response = await fetch(config.tokenEndpoint, {
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
