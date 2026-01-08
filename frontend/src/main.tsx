import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { registerServiceWorker } from './hooks/usePWA'
import './styles/globals.css'

// Register service worker for PWA
registerServiceWorker()

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element not found')

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
