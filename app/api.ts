// app/api.ts — API router entry point for TanStack Start
// This file activates the vinxi API router, which discovers and registers
// all createAPIFileRoute() handlers found in app/routes/api/*.ts files.
import {
  createStartAPIHandler,
  defaultAPIFileRouteHandler,
} from '@tanstack/react-start/api'

export default createStartAPIHandler(defaultAPIFileRouteHandler)
