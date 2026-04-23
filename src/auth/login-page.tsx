import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from './auth-provider'

export function LoginPage() {
  const { user, isLoading, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!isLoading && user) return <Navigate to="/dashboard" replace />

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const { error } = await signIn(email, password)
    setSubmitting(false)
    if (error) toast.error(error)
  }

  return (
    <div className="min-h-screen bg-brand-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-800 text-white mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-brand-900">Espacio Tareas</h1>
          <p className="text-sm text-brand-500 mt-1">Inicia sesión para continuar</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-brand-100 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-700 mb-1.5">
              Correo electrónico
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-brand-200 text-brand-900 text-sm
                         placeholder:text-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500
                         focus:border-transparent transition-colors"
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-700 mb-1.5">
              Contraseña
            </label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-brand-200 text-brand-900 text-sm
                         placeholder:text-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500
                         focus:border-transparent transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 rounded-xl bg-brand-800 text-white text-sm font-medium
                       hover:bg-brand-700 active:bg-brand-900 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors"
          >
            {submitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
