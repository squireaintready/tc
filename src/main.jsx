import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import ErrorBoundary from './ErrorBoundary'
import { ThemeProvider } from './ThemeContext'
import { StaffProvider } from './StaffContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <StaffProvider>
          <App />
        </StaffProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
)
