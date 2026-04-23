import { useLocation } from 'react-router-dom'
import { useAuth } from '@/auth/auth-provider'
import { Badge } from '@/components/ui/badge'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/checklist': 'Checklist diario',
  '/semanal': 'Registro semanal',
  '/actividad': 'Actividad global',
  '/ajustes': 'Ajustes',
}

export function Header() {
  const { pathname } = useLocation()
  const { profile } = useAuth()
  const title = PAGE_TITLES[pathname] ?? 'Espacio Tareas'

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-brand-100 px-4 md:px-6 py-3 flex items-center justify-between">
      {/* Mobile logo + title */}
      <div className="flex items-center gap-3">
        <div className="md:hidden w-7 h-7 rounded-lg bg-brand-800 flex items-center justify-center">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        </div>
        <h1 className="text-sm font-semibold text-brand-900">{title}</h1>
      </div>

      {/* Role badge */}
      {profile && (
        <Badge variant={profile.role === 'admin' ? 'default' : 'neutral'}>
          {profile.role === 'admin' ? 'Admin' : 'Worker'}
        </Badge>
      )}
    </header>
  )
}
