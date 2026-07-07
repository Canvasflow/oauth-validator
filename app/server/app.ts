// app/server/app.ts
// ---------------------------------------------------------------------------
// Hono application — handles all /api/* requests forwarded from TanStack
// Start's API catch-all route.
//
// Base path /api is set on the Hono instance so route definitions are
// relative: app.post('/validate/signature') → matches /api/validate/signature
// ---------------------------------------------------------------------------
import { Hono } from 'hono'
import { handleValidateSignature } from './routes/validate-signature'

const app = new Hono().basePath('/api')

app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

app.post('/validate/signature', handleValidateSignature)

// 404 for any other /api/* path
app.all('*', (c) => c.json({ error: 'Not found' }, 404))

export { app }
