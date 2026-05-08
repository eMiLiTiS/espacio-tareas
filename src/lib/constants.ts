import {
  LayoutDashboard,
  CheckSquare,
  CalendarDays,
  Activity,
  AlertTriangle,
  Settings,
} from 'lucide-react'

export const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { path: '/checklist', label: 'Checklist', Icon: CheckSquare },
  { path: '/semanal', label: 'Semanal', Icon: CalendarDays },
  { path: '/actividad', label: 'Actividad', Icon: Activity },
  { path: '/incidencias', label: 'Incidencias', Icon: AlertTriangle },
  { path: '/ajustes', label: 'Ajustes', Icon: Settings },
] as const
