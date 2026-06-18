import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/auth/AuthProvider'
import { Register } from '@/pages/Register'
import { SetupOrganization } from '@/pages/SetupOrganization'
import { Dashboard } from '@/pages/Dashboard'
import { keycloak, DEV_MODE } from '@/auth/keycloak'

const queryClient = new QueryClient()

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const auth = useAuth()

  if (auth.status === 'loading') return null

  if (auth.status === 'unauthenticated') {
    if (!DEV_MODE) keycloak!.login({ redirectUri: window.location.href })
    return null
  }

  return <>{children}</>
}

function SmartRedirect() {
  const auth = useAuth()
  if (auth.status === 'loading') return null
  if (auth.status === 'unauthenticated') return <Navigate to="/register" replace />
  const hasOrg = localStorage.getItem('bb_org_setup_done')
  return <Navigate to={hasOrg ? '/dashboard' : '/setup'} replace />
}

export default function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/register" element={<Register />} />
            <Route path="/setup" element={
              <ProtectedRoute><SetupOrganization /></ProtectedRoute>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute><Dashboard /></ProtectedRoute>
            } />
            <Route path="*" element={<SmartRedirect />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </AuthProvider>
  )
}
