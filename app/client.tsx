// app/client.tsx — browser entry point
// Uses RouterProvider (not StartClient) because defaultSsr: false means there
// is no server-rendered React tree to hydrate — React mounts fresh.
import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { createAppRouter } from './router'
import './styles.css'

const router = createAppRouter()

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('#root element not found')

ReactDOM.createRoot(rootElement).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
)
