// app/types/app.ts

export type AppScreen = 'login' | 'callback' | 'dashboard'

export interface AuthState {
  screen: AppScreen
  error?: string
  errorDescription?: string
}
