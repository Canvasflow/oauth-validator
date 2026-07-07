// app/routes/api/$.ts
// ---------------------------------------------------------------------------
// Catch-all API route — every request to /api/* is handled here.
// The request is forwarded verbatim to the Hono application, which owns
// all backend routing and validation logic.
// ---------------------------------------------------------------------------
import { createAPIFileRoute } from '@tanstack/react-start/api'
import { app } from '../../server/app'

const handler = ({ request }: { request: Request }) => app.fetch(request)

export const APIRoute = createAPIFileRoute('/api/$')({
  GET:     handler,
  POST:    handler,
  PUT:     handler,
  DELETE:  handler,
  PATCH:   handler,
  OPTIONS: handler,
})
