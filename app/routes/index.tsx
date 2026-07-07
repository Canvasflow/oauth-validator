import { createFileRoute, redirect } from '@tanstack/react-router'
import { loadTokens } from '../lib/storage'

// @ts-ignore – path types come from routeTree.gen.ts (generated on first `npm run dev`)
export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({
      to: loadTokens() ? '/dashboard' : '/login',
      search: { error: undefined, error_description: undefined },
    })
  },
  component: () => null,
})
