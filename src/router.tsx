// src/router.tsx
// ---------------------------------------------------------------------------
// TanStack Router — fully programmatic (no file-based codegen).
//
// Pattern:
//   1. Define every route with createRoute() in one place.
//   2. Export a getRouteApi() handle per route that needs hooks (useSearch,
//      useParams, useNavigate scoped to that route).
//   3. Assemble the routeTree and export the router.
//   4. Components import their route handle and call Route.useSearch() etc.
//      — no self-reference, no circular deps.
//
// Routes:
//   /          → redirect to /dashboard or /login
//   /login     → LoginScreen  (search: ?error, ?error_description)
//   /callback  → CallbackScreen
//   /dashboard → DashboardScreen (protected)
// ---------------------------------------------------------------------------

import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  getRouteApi,
  redirect,
} from '@tanstack/react-router'
import { z } from 'zod'
import { fallback, zodValidator } from '@tanstack/zod-adapter'
import { loadTokens } from './lib/storage'
import { LoginScreen } from './components/LoginScreen'
import { CallbackScreen } from './components/CallbackScreen'
import { DashboardScreen } from './components/DashboardScreen'

// ── Root ─────────────────────────────────────────────────────────────────────

const rootRoute = createRootRoute({
  component: () => <Outlet />,
})

// ── / index — redirect only ──────────────────────────────────────────────────

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({
      to: loadTokens() ? '/dashboard' : '/login',
      search: { error: undefined, error_description: undefined },
    })
  },
  component: () => null,
})

// ── /login ───────────────────────────────────────────────────────────────────

const loginSearchSchema = z.object({
  error:             fallback(z.string().optional(), undefined),
  error_description: fallback(z.string().optional(), undefined),
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  validateSearch: zodValidator(loginSearchSchema),
  beforeLoad: () => {
    if (loadTokens()) throw redirect({ to: '/dashboard' })
  },
  component: LoginScreen,
})

// ── /callback ────────────────────────────────────────────────────────────────

const callbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/callback',
  component: CallbackScreen,
})

// ── /dashboard (protected) ───────────────────────────────────────────────────

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  beforeLoad: () => {
    if (!loadTokens()) {
      throw redirect({
        to: '/login',
        search: { error: undefined, error_description: undefined },
      })
    }
  },
  component: DashboardScreen,
})

// ── Route tree + router ───────────────────────────────────────────────────────

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  callbackRoute,
  dashboardRoute,
])

export const router = createRouter({ routeTree })

// Module augmentation — gives every useNavigate / useSearch / Link call
// full type inference from the route tree.
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// ── Per-route API handles ─────────────────────────────────────────────────────
// Components import these to call Route.useSearch(), Route.useParams(), etc.
// This is the programmatic equivalent of the file-based `export const Route`
// pattern — no self-reference, no circular imports.

export const loginRouteApi    = getRouteApi('/login')
export const callbackRouteApi = getRouteApi('/callback')
export const dashboardRouteApi = getRouteApi('/dashboard')
