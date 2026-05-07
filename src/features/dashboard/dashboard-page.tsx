import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CheckSquare, CalendarDays, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { ProgressBar } from '@/components/ui/progress-bar'
import { SkeletonCard } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'
import { qk } from '@/lib/query-client'
import { useAuth } from '@/auth/auth-provider'
import { todayISO, weekStartISO, formatDateLong } from '@/utils/date'
import jsPDF from 'jspdf'

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
  const [selectedDate, setSelectedDate] = useState(todayISO())
  const [selectedUserId, setSelectedUserId] = useState('all')

    // 👇 AQUÍ
  const [exportOptions, setExportOptions] = useState({
    resumen: true,
    actividad: true,
    ranking: true,
    inactivos: true,
  })

  const today = selectedDate
  const semana = weekStartISO()
  const dashboardRef = useRef<HTMLDivElement>(null)

  const handleExportPDF = () => {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    const pageWidth = pdf.internal.pageSize.getWidth()
    const margin = 14
    let y = 18

    const selectedUserName =
      selectedUserId === 'all'
        ? 'Todos los usuarios'
        : profilesMap.get(selectedUserId) ?? 'Usuario'

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(18)
    pdf.text('Espacio Tareas', margin, y)

    y += 8
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(11)
    pdf.text(`Reporte diario · ${formatDateLong(today)}`, margin, y)

    y += 6
    pdf.text(`Filtro: ${selectedUserName}`, margin, y)

    y += 12
    if (exportOptions.resumen) {
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(13)
      pdf.text('Resumen', margin, y)

      y += 8
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(11)
      pdf.text(`Checklist: ${stats?.completedToday ?? 0} / ${stats?.totalTemplates ?? 0}`, margin, y)

      y += 6
      pdf.text(`Porcentaje completado: ${stats?.checklistPct ?? 0}%`, margin, y)

      y += 6
      pdf.text(`Registros esta semana: ${stats?.weeklyCount ?? 0}`, margin, y)
    }

    if (exportOptions.actividad) {
      y += 12
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(13)
      pdf.text('Últimas acciones', margin, y)

      y += 8
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(10)

      if (activity.length === 0) {
        pdf.text('No hay acciones registradas para esta fecha.', margin, y)
        y += 6
      } else {
        activity.forEach((item) => {
          const hora = new Date(item.created_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })

          const tarea = templatesMap.get(item.template_id) ?? 'Tarea sin nombre'
          const usuario = profilesMap.get(item.user_id) ?? 'Usuario desconocido'

          const line = `${hora} · ${usuario} · ${tarea}`

          const lines = pdf.splitTextToSize(line, pageWidth - margin * 2)

          if (y > 275) {
            pdf.addPage()
            y = 18
          }

          pdf.text(lines, margin, y)
          y += lines.length * 5 + 2
        })
      }

      y += 6
    
    } else {
      activityRanking.forEach((user) => {
        if (y > 275) {
          pdf.addPage()
          y = 18
        }

        pdf.text(`${user.name}: ${user.count} tareas`, margin, y)
        y += 6
      })
    }

    y += 8
    if (y > 260) {
      pdf.addPage()
      y = 18
    }

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(13)
    pdf.text('Sin actividad', margin, y)

    y += 8
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)

    if (inactiveUsers.length === 0) {
      pdf.text('Todos los usuarios tienen actividad registrada.', margin, y)
    } else {
      inactiveUsers.forEach((name) => {
        if (y > 275) {
          pdf.addPage()
          y = 18
        }

        pdf.text(`- ${name}`, margin, y)
        y += 6
      })
    }

    pdf.save(`reporte-diario-${today}.pdf`)
  }

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
    queryKey: ['dashboard-activity', profile?.clinic_id ?? '', today, selectedUserId],
    queryFn: async () => {
      let query = supabase
        .from('checklist_completions')
        .select('id, created_at, template_id, user_id')
        .eq('clinic_id', profile!.clinic_id)
        .eq('fecha', today)
        .order('created_at', { ascending: false })

      if (selectedUserId !== 'all') {
        query = query.eq('user_id', selectedUserId)
      }

      const { data, error } = await query

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

  const activeUserIds = new Set(activity.map((a) => a.user_id))

  const inactiveUsers = profiles
    .filter((p) => !activeUserIds.has(p.id))
    .map((p) => p.full_name)

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
    <div ref={dashboardRef} className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-brand-900">
          Buenos días{profile ? `, ${profile.full_name.split(' ')[0]}` : ''}
        </h2>
        <p className="text-sm text-brand-400 capitalize">{formatDateLong(today)}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm text-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-400"
        />

        {selectedDate !== todayISO() && (
          <button
            onClick={() => setSelectedDate(todayISO())}
            className="rounded-xl bg-brand-100 px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-200"
          >
            Hoy
          </button>
        )}

        <select
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
          className="rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm text-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-400"
        >
          <option value="all">Todos</option>
          {profiles.map((user) => (
            <option key={user.id} value={user.id}>
              {user.full_name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-brand-700">
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={exportOptions.resumen}
            onChange={() =>
              setExportOptions((o) => ({ ...o, resumen: !o.resumen }))
            }
          />
          Resumen
        </label>

        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={exportOptions.actividad}
            onChange={() =>
              setExportOptions((o) => ({ ...o, actividad: !o.actividad }))
            }
          />
          Actividad
        </label>

        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={exportOptions.ranking}
            onChange={() =>
              setExportOptions((o) => ({ ...o, ranking: !o.ranking }))
            }
          />
          Ranking
        </label>

        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={exportOptions.inactivos}
            onChange={() =>
              setExportOptions((o) => ({ ...o, inactivos: !o.inactivos }))
            }
          />
          Sin actividad
        </label>
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
              Últimas acciones
            </span>
          </div>

          {activityLoading ? (
            <p className="text-sm text-brand-400">Cargando actividad...</p>
          ) : activity.length === 0 ? (
            <p className="text-sm text-brand-400">
              No hay acciones registradas para esta fecha.
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

      <Card>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-brand-400">
            <CheckSquare size={16} />
            <span className="text-xs font-medium uppercase tracking-wide">
              Actividad del equipo
            </span>
          </div>

          {activityRanking.length === 0 ? (
            <p className="text-sm text-brand-400">Sin actividad todavía.</p>
          ) : (
            <div className="space-y-2">
              {activityRanking.map((user) => (
                <div
                  key={user.userId}
                  className="flex items-center justify-between rounded-xl bg-brand-50 px-3 py-2"
                >
                  <span className="text-sm font-medium text-brand-800">{user.name}</span>
                  <span className="text-xs text-brand-500">{user.count} tareas</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-brand-400">
            <CalendarDays size={16} />
            <span className="text-xs font-medium uppercase tracking-wide">
              Sin actividad
            </span>
          </div>

          {inactiveUsers.length === 0 ? (
            <p className="text-sm text-brand-400">
              Todos los usuarios tienen actividad registrada.
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
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        
        <button
          onClick={handleExportPDF}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-black text-white text-sm font-medium hover:opacity-90"
        >
          Exportar PDF
        </button>
        
        <a
          href="/checklist"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-800 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          <CheckSquare size={16} />
          Ver checklist
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