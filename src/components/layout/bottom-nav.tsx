import { NavLink } from 'react-router-dom'
import { cn } from '@/utils/cn'
import { NAV_ITEMS } from '@/lib/constants'

export function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-brand-100
                    flex items-stretch safe-area-bottom">
      {NAV_ITEMS.map(({ path, label, Icon }) => (
        <NavLink
          key={path}
          to={path}
          className={({ isActive }) =>
            cn(
              'flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-colors',
              isActive
                ? 'text-brand-900'
                : 'text-brand-400 hover:text-brand-600'
            )
          }
        >
          {({ isActive }) => (
            <>
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
