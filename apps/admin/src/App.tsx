import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/auth/AuthProvider'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Register } from '@/pages/Register'
import { SetupOrganization } from '@/pages/SetupOrganization'
import { DashboardHome } from '@/pages/DashboardHome'
import { OrganisationSettings } from '@/pages/OrganisationSettings'
import { Competitions } from '@/pages/Competitions'
import { CompetitionDetail } from '@/pages/CompetitionDetail'
import { Athletes } from '@/pages/Athletes'
import { Faq } from '@/pages/Faq'
import { Liveanzeige } from '@/pages/Liveanzeige'
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
  return <Navigate to={localStorage.getItem('bb_org_setup_done') ? '/dashboard' : '/setup'} replace />
}

export default function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/register" element={<Register />} />
            <Route path="/setup" element={<ProtectedRoute><SetupOrganization /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
              <Route index element={<DashboardHome />} />
              <Route path="organisation" element={<OrganisationSettings />} />
              <Route path="wettkampfe" element={<Competitions />} />
              <Route path="wettkampfe/:id" element={<CompetitionDetail />} />
              <Route path="athleten" element={<Athletes />} />
              <Route path="liveanzeige" element={<Liveanzeige />} />
              <Route path="hilfe" element={<Faq />} />
            </Route>
            <Route path="*" element={<SmartRedirect />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </AuthProvider>
  )
}
