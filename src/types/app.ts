// src/types/app.ts

export type AppScreen =
  | 'login'       // not authenticated — show login button
  | 'callback'    // processing the IdP redirect
  | 'dashboard'   // authenticated — show token data

export interface AuthState {
  screen: AppScreen
  error?: string
  errorDescription?: string
}
