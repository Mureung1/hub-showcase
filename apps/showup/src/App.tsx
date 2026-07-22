import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { useAuthState } from '@/hooks/useAuth'
import AppLayout from './components/AppLayout'

// 코드 스플리팅: 페이지별 lazy 로딩
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Customers = lazy(() => import('./pages/Customers'))
const NewCustomer = lazy(() => import('./pages/NewCustomer'))
const CustomerDetail = lazy(() => import('./pages/CustomerDetail'))
const Reservations = lazy(() => import('./pages/Reservations'))
const NewReservation = lazy(() => import('./pages/NewReservation'))
const Privacy = lazy(() => import('./pages/Privacy'))
const Terms = lazy(() => import('./pages/Terms'))
const NotFound = lazy(() => import('./pages/NotFound'))
const ServerError = lazy(() => import('./pages/ServerError'))

const PageFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-gray-500">로딩 중...</div>
  </div>
)

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuthState()

  if (loading) {
    return <PageFallback />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />

            {/* Protected routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="customers" element={<Customers />} />
              <Route path="customers/new" element={<NewCustomer />} />
              <Route path="customers/:id" element={<CustomerDetail />} />
              <Route path="reservations" element={<Reservations />} />
              <Route path="reservations/new" element={<NewReservation />} />
            </Route>

            {/* Error routes */}
            <Route path="/500" element={<ServerError />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        <Toaster position="bottom-center" richColors />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App