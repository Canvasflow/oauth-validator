// app/ssr.tsx — server entry point (Cloudflare Worker / SSR)
// Serves the HTML shell for the SPA. API requests are handled by Hono
// via app/routes/api/$.ts before this handler is reached.
import {
  createStartHandler,
  defaultStreamHandler,
} from '@tanstack/react-start/server'
import { createAppRouter } from './router'

export default createStartHandler({
  createRouter: createAppRouter,
})(defaultStreamHandler)
