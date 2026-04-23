import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './auth-provider'

/** Wraps protected routes. Renders <Outlet /> when authenticated. */
export function AuthGuard() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-brand-50">
        <div className="w-8 h-8 border-2 border-brand-300 border-t-brand-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return <Outlet />
}
