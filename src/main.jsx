import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ThemeProvider } from './ThemeContext'
import { StaffProvider } from './StaffContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <StaffProvider>
        <App />
      </StaffProvider>
    </ThemeProvider>
  </React.StrictMode>
)
