// src/lib/pkce.ts
// ---------------------------------------------------------------------------
// PKCE helpers — RFC 7636, S256 method only.
// Uses the Web Crypto API exclusively. No third-party libraries.
// ---------------------------------------------------------------------------

/**
 * Generate a cryptographically random code_verifier.
 * RFC 7636 §4.1: 43–128 characters from the unreserved set [A-Za-z0-9\-._~]
 */
export function generateCodeVerifier(): string {
  const array = new Uint8Array(32) // 32 bytes → 43 base64url chars (≥ minimum)
  crypto.getRandomValues(array)
  return base64UrlEncode(array)
}

/**
 * Derive the code_challenge from a code_verifier.
 * RFC 7636 §4.2: code_challenge = BASE64URL(SHA256(ASCII(code_verifier)))
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoded = new TextEncoder().encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', encoded)
  return base64UrlEncode(new Uint8Array(digest))
}

/**
 * Generate a cryptographically random state parameter.
 * Used as a CSRF token: stored before redirect, verified on return.
 */
export function generateState(): string {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return base64UrlEncode(array)
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Base64URL encoding without padding (RFC 4648 §5).
 * Replaces + → -, / → _, strips trailing =
 */
function base64UrlEncode(buffer: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < buffer.length; i++) {
    binary += String.fromCharCode(buffer[i])
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}
