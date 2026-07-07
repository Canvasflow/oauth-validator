// app/routes/__root.tsx — root layout (HTML shell)
// Scripts injects the client bundles; Outlet renders the active child route.
import { createRootRoute, Outlet, Scripts } from '@tanstack/react-router'

export const Route = createRootRoute({
  component: RootDocument,
})

function RootDocument() {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>OAuth PKCE Validator</title>
      </head>
      <body>
        <div id="root">
          <Outlet />
        </div>
        <Scripts />
      </body>
    </html>
  )
}
