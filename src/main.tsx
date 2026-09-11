import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './app/store'
import './index.css'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary'
import ToastProvider from './components/toast/ToastProvider'
import setupLocatorUI from '@locator/runtime'

if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_LOCATOR === 'true') {
  setupLocatorUI()
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <Provider store={store}>
        <ToastProvider>
          <App />
        </ToastProvider>
      </Provider>
    </ErrorBoundary>
  </StrictMode>,
)
