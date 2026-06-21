import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { App } from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/:slug" element={<App />} />
        <Route path="*" element={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#a6b0c3', fontSize: 16 }}>
            Kein Scoreboard ausgewählt. URL: <code style={{ marginLeft: 8, color: '#6cf0c2' }}>/scoreboard/wettkampf-slug</code>
          </div>
        } />
      </Routes>
    </BrowserRouter>
  </StrictMode>
)
