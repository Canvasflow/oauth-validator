import { createFileRoute, redirect } from '@tanstack/react-router'
import { loadTokens } from '../lib/storage'
import { DashboardScreen } from '../components/DashboardScreen'

// @ts-ignore – path types come from routeTree.gen.ts (generated on first `npm run dev`)
export const Route = createFileRoute('/dashboard')({
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
