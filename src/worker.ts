/// <reference types="@cloudflare/workers-types" />
// src/worker.ts — Cloudflare Worker entry point
// Routes /api/* requests to Hono and serves the SPA for everything else.
// The SPA's client-side router (TanStack Router) handles its own routes;
// non-existent asset paths fall back to index.html via wrangler.toml's
// not_found_handling = "single-page-application".
import { app } from '../app/server/app'

export interface Env {
  ASSETS: Fetcher
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url)

    if (pathname.startsWith('/api/')) {
      return app.fetch(request, env)
    }

    return env.ASSETS.fetch(request)
  },
} satisfies ExportedHandler<Env>
