import { NavLink } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { cn } from '@/utils/cn'
import { NAV_ITEMS } from '@/lib/constants'
import { useAuth } from '@/auth/auth-provider'

export function Sidebar() {
  const { profile, signOut } = useAuth()

  return (
    <aside className="hidden md:flex flex-col w-56 shrink-0 bg-white border-r border-brand-100 h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-brand-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-brand-800 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-brand-900">Espacio Tareas</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map(({ path, label, Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand-100 text-brand-900'
                  : 'text-brand-500 hover:bg-brand-50 hover:text-brand-800'
              )
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 border-t border-brand-100 pt-3 space-y-1">
        {profile && (
          <div className="px-3 py-2">
            <p className="text-xs font-medium text-brand-800 truncate">{profile.full_name}</p>
            <p className="text-xs text-brand-400 truncate">{profile.email}</p>
          </div>
        )}
        <button
          onClick={signOut}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm text-brand-500
                     hover:bg-danger-50 hover:text-danger-600 transition-colors"
        >
          <LogOut size={18} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
