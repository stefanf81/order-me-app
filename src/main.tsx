import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App.tsx'
import { listenForInstall } from './settings/install.ts'
import { ErrorBoundary } from './shared/ui/ErrorBoundary.tsx'
import './styles.css'

// Before the first render: Chrome may offer its install prompt right away.
listenForInstall(window)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
