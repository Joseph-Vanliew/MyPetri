import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ensureHistoryHotkeysInstalled } from './stores/historyStore.js'

// Install global hotkeys BEFORE React mounts to capture browser-level defaults (e.g., Firefox Cmd+Z)
ensureHistoryHotkeysInstalled()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
