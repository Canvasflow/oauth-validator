import { existsSync, readFileSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'

// Publishes the CF-OAUTH spec PDF (built from docs/spec by `make -C docs pdf`)
// as a static asset at /spec/<file> and tells the app its version and URL.
// docs/spec/version.tex is the source of truth for the version. Without a
// built PDF the app gets __SPEC_PDF__ = null and hides the download link.
function specPdf(): Plugin {
  const versionTex = readFileSync('docs/spec/version.tex', 'utf8')
  const version = /\\newcommand\{\\specversion\}\{([^}]+)\}/.exec(versionTex)?.[1]
  if (!version) throw new Error('docs/spec/version.tex does not define \\specversion')
  const fileName = `canvasflow-tenant-spec-v${version}.pdf`
  const source = `docs/build/${fileName}`
  const available = existsSync(source)
  const url = `/spec/${fileName}`

  return {
    name: 'spec-pdf',
    config: () => ({
      define: {
        __SPEC_VERSION__: JSON.stringify(version),
        __SPEC_PDF__: JSON.stringify(available ? url : null),
      },
    }),
    configureServer(server) {
      server.middlewares.use(url, (_req, res) => {
        res.setHeader('Content-Type', 'application/pdf')
        res.end(readFileSync(source))
      })
    },
    generateBundle() {
      // Only the browser bundle (served by the ASSETS binding), not the Worker.
      if (!available || this.environment.name !== 'client') return
      this.emitFile({ type: 'asset', fileName: url.slice(1), source: readFileSync(source) })
    },
  }
}

export default defineConfig({
  plugins: [
    TanStackRouterVite({
      routesDirectory: './app/routes',
      generatedRouteTree: './app/routeTree.gen.ts',
    }),
    react(),
    tailwindcss(),
    cloudflare(),
    specPdf(),
  ],
})
