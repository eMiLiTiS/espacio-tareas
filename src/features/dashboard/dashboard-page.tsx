import { useQuery } from '@tanstack/react-query'
import { CheckSquare, CalendarDays } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { ProgressBar } from '@/components/ui/progress-bar'
import { SkeletonCard } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'
import { qk } from '@/lib/query-client'
import { useAuth } from '@/auth/auth-provider'
import { todayISO, weekStartISO, formatDateLong } from '@/utils/date'

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
      const checklistPct = totalTemplates > 0 ? Math.round((completedToday / totalTemplates) * 100) : 0

      return { totalTemplates, completedToday, checklistPct, weeklyCount }
    },
    enabled: !!profile,
  })

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
      {/* Greeting */}
      <div>
        <h2 className="text-lg font-semibold text-brand-900">
          Buenos días{profile ? `, ${profile.full_name.split(' ')[0]}` : ''}
        </h2>
        <p className="text-sm text-brand-400 capitalize">{formatDateLong(today)}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {isLoading
          ? [0, 1].map((i) => <SkeletonCard key={i} />)
          : cards.map(({ label, value, sub, pct, Icon }) => (
              <Card key={label}>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-brand-400">
                    <Icon size={16} />
                    <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
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

      {/* Quick actions */}
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
