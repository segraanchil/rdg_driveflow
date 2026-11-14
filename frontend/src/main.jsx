import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import GlobalLoader from './components/ui/GlobalLoader.jsx'
import Toaster from './components/ui/Toaster.jsx'
import './index.css'

registerSW({ immediate: true })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <GlobalLoader />
        <Toaster />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
