import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { cloudflare } from '@cloudflare/vite-plugin'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'

export default defineConfig({
  plugins: [
    // Generates app/routeTree.gen.ts from app/routes/** on each dev/build run
    TanStackRouterVite({
      routesDirectory: './app/routes',
      generatedRouteTree: './app/routeTree.gen.ts',
    }),
    react(),
    // Builds the Cloudflare Worker alongside the SPA assets
    cloudflare(),
  ],
})
