import { useQuery } from '@tanstack/react-query'
import { CheckSquare, CalendarDays, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { ProgressBar } from '@/components/ui/progress-bar'
import { SkeletonCard } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'
import { qk } from '@/lib/query-client'
import { useAuth } from '@/auth/auth-provider'
import { todayISO, weekStartISO, formatDateLong } from '@/utils/date'

type ActivityItem = {
  id: string
  created_at: string
  template_id: string
  user_id: string
}

type SimpleProfile = {
  id: string
  full_name: string
}

type SimpleTemplate = {
  id: string
  nombre: string
}

export function DashboardPage() {
  const { profile } = useAuth()
  const today = todayISO()
  const semana = weekStartISO()

  const { data: stats, isLoading } = useQuery({
    queryKey: qk.dashboardStats(profile?.clinic_id ?? '', today),
    queryFn: async () => {
      const clinicId = profile!.clinic_id

      const [templatesRes, completionsRes, weeklyRes] = await Promise.all([
        supabase
          .from('checklist_templates')
          .select('id', { count: 'exact' })
          .eq('clinic_id', clinicId)
          .eq('activo', true),
        supabase
          .from('checklist_completions')
          .select('id', { count: 'exact' })
          .eq('clinic_id', clinicId)
          .eq('fecha', today),
        supabase
          .from('weekly_records')
          .select('id', { count: 'exact' })
          .eq('clinic_id', clinicId)
          .eq('semana_inicio', semana),
      ])

      const totalTemplates = templatesRes.count ?? 0
      const completedToday = completionsRes.count ?? 0
      const weeklyCount = weeklyRes.count ?? 0
      const checklistPct =
        totalTemplates > 0 ? Math.round((completedToday / totalTemplates) * 100) : 0

      return { totalTemplates, completedToday, checklistPct, weeklyCount }
    },
    enabled: !!profile,
  })

  const { data: activity = [], isLoading: activityLoading } = useQuery({
    queryKey: ['dashboard-activity', profile?.clinic_id ?? '', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checklist_completions')
        .select('id, created_at, template_id, user_id')
        .eq('clinic_id', profile!.clinic_id)
        .eq('fecha', today)
        .order('created_at', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as ActivityItem[]
    },
    enabled: !!profile,
  })

  const { data: profiles = [] } = useQuery({
    queryKey: ['dashboard-profiles', profile?.clinic_id ?? ''],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('clinic_id', profile!.clinic_id)

      if (error) throw error
      return data as SimpleProfile[]
    },
    enabled: !!profile,
  })

  const { data: templates = [] } = useQuery({
    queryKey: ['dashboard-templates', profile?.clinic_id ?? ''],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checklist_templates')
        .select('id, nombre')
        .eq('clinic_id', profile!.clinic_id)

      if (error) throw error
      return data as SimpleTemplate[]
    },
    enabled: !!profile,
  })

  const profilesMap = new Map(profiles.map((p) => [p.id, p.full_name]))
  const templatesMap = new Map(templates.map((t) => [t.id, t.nombre]))

  const activityByUser = new Map<string, number>()

  for (const item of activity) {
    const count = activityByUser.get(item.user_id) ?? 0
    activityByUser.set(item.user_id, count + 1)
  }

  const activityRanking = Array.from(activityByUser.entries())
    .map(([userId, count]) => ({
      userId,
      name: profilesMap.get(userId) ?? 'Usuario',
      count,
    }))
    .sort((a, b) => b.count - a.count)

  const activeUserIds = new Set(activity.map(a => a.user_id))

  const inactiveUsers = profiles
    .filter(p => !activeUserIds.has(p.id))
    .map(p => p.full_name)
    {/* Inactive users */}
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-brand-400">
          <CalendarDays size={16} />
          <span className="text-xs font-medium uppercase tracking-wide">
            Sin actividad hoy
          </span>
        </div>

        {inactiveUsers.length === 0 ? (
          <p className="text-sm text-brand-400">
            Todos los usuarios han registrado actividad.
          </p>
        ) : (
          <div className="space-y-2">
            {inactiveUsers.map((name) => (
              <div
                key={name}
                className="rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-800"
              >
                {name}
              </div>
            ))}
          </div>
        )}S
      </CardContent>
    </Card>

  const cards = [
    {
      label: 'Checklist hoy',
      value: stats ? `${stats.completedToday} / ${stats.totalTemplates}` : '—',
      sub: stats ? `${stats.checklistPct}% completado` : '',
      pct: stats?.checklistPct ?? 0,
      Icon: CheckSquare,
    },
    {
      label: 'Registros esta semana',
      value: stats?.weeklyCount ?? '—',
      sub: 'Total de actividades',
      pct: null,
      Icon: CalendarDays,
    },
  ]

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-brand-900">
          Buenos días{profile ? `, ${profile.full_name.split(' ')[0]}` : ''}
        </h2>
        <p className="text-sm text-brand-400 capitalize">{formatDateLong(today)}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {isLoading
          ? [0, 1].map((i) => <SkeletonCard key={i} />)
          : cards.map(({ label, value, sub, pct, Icon }) => (
              <Card key={label}>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-brand-400">
                    <Icon size={16} />
                    <span className="text-xs font-medium uppercase tracking-wide">
                      {label}
                    </span>
                  </div>

                  <div>
                    <p className="text-2xl font-bold text-brand-900">{String(value)}</p>
                    {sub && <p className="text-xs text-brand-400 mt-0.5">{sub}</p>}
                  </div>

                  {pct !== null && <ProgressBar value={pct} />}
                </CardContent>
              </Card>
            ))}
      </div>

      <Card>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-brand-400">
            <Clock size={16} />
            <span className="text-xs font-medium uppercase tracking-wide">
              Últimas acciones de hoy
            </span>
          </div>

          {/* Team activity ranking */}
          <Card>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-brand-400">
                <CheckSquare size={16} />
                <span className="text-xs font-medium uppercase tracking-wide">
                  Actividad del equipo hoy
                </span>
              </div>

              {activityRanking.length === 0 ? (
                <p className="text-sm text-brand-400">
                  Sin actividad todavía.
                </p>
              ) : (
                <div className="space-y-2">
                  {activityRanking.map((user) => (
                    <div
                      key={user.userId}
                      className="flex items-center justify-between rounded-xl bg-brand-50 px-3 py-2"
                    >
                      <span className="text-sm font-medium text-brand-800">
                        {user.name}
                      </span>

                      <span className="text-xs text-brand-500">
                        {user.count} tareas
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {activityLoading ? (
            <p className="text-sm text-brand-400">Cargando actividad...</p>
          ) : activity.length === 0 ? (
            <p className="text-sm text-brand-400">
              Todavía no hay acciones registradas hoy.
            </p>
          ) : (
            <div className="space-y-2">
              {activity.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-3 rounded-xl bg-brand-50 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-brand-800 truncate">
                      {templatesMap.get(item.template_id) ?? 'Tarea sin nombre'}
                    </p>
                    <p className="text-xs text-brand-400">
                      {profilesMap.get(item.user_id) ?? 'Usuario desconocido'}
                    </p>
                  </div>

                  <span className="shrink-0 text-xs text-brand-400">
                    {new Date(item.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <a
          href="/checklist"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-800 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          <CheckSquare size={16} />
          Ver checklist de hoy
        </a>

        <a
          href="/semanal"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-100 text-brand-700 text-sm font-medium hover:bg-brand-200 transition-colors"
        >
          <CalendarDays size={16} />
          Registro semanal
        </a>
      </div>
    </div>
  )
}