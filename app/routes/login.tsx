import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { fallback, zodValidator } from '@tanstack/zod-adapter'
import { loadTokens } from '../lib/storage'
import { LoginScreen } from '../components/LoginScreen'

const searchSchema = z.object({
  error:             fallback(z.string().optional(), undefined),
  error_description: fallback(z.string().optional(), undefined),
})

// @ts-ignore – path types come from routeTree.gen.ts (generated on first `npm run dev`)
export const Route = createFileRoute('/login')({
  validateSearch: zodValidator(searchSchema),
  beforeLoad: () => {
    if (loadTokens()) throw redirect({ to: '/dashboard' })
  },
  component: LoginScreen,
})
