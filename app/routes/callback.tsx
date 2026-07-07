import { createFileRoute } from '@tanstack/react-router'
import { CallbackScreen } from '../components/CallbackScreen'

// @ts-ignore – path types come from routeTree.gen.ts (generated on first `npm run dev`)
export const Route = createFileRoute('/callback')({
  component: CallbackScreen,
})
