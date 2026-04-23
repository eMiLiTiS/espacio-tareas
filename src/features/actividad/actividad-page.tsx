import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Activity } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { qk } from '@/lib/query-client'
import { useAuth } from '@/auth/auth-provider'
import { SkeletonList } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Badge } from '@/components/ui/badge'
import { weekStartISO, weekLabel, shiftWeek } from '@/utils/date'
import type { GlobalActivityRow, Dia } from '@/types/domain'
import { DIAS } from '@/types/domain'

const DIA_ORDER: Dia[] = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']

export function ActividadPage() {
  const { profile } = useAuth()
  const [semana, setSemana] = useState(weekStartISO())
  const [filterUser, setFilterUser] = useState<string>('all')

  const isCurrentWeek = semana === weekStartISO()

  const { data: rows = [], isLoading } = useQuery({
    queryKey: qk.globalActivity(profile?.clinic_id ?? '', semana),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_global_weekly_activity', {
        p_semana_inicio: semana,
      })
      if (error) throw error
      return data as GlobalActivityRow[]
    },
    enabled: !!profile,
  })

  // Unique users for filter
  const users = Array.from(
    new Map(rows.map((r) => [r.user_id, r.full_name])).entries()
  )

  const filtered = filterUser === 'all' ? rows : rows.filter((r) => r.user_id === filterUser)

  // Group by day
  const byDay = new Map<Dia, GlobalActivityRow[]>()
  for (const r of filtered) {
    const d = r.dia as Dia
    if (!byDay.has(d)) byDay.set(d, [])
    byDay.get(d)!.push(r)
  }

  return (
    <div className="max-w-3xl space-y-5">
      {/* Week navigator */}
      <div className="flex items-center justify-between bg-white rounded-2xl border border-brand-100 px-4 py-3">
        <button
          onClick={() => setSemana(shiftWeek(semana, -1))}
          className="p-1.5 rounded-lg text-brand-400 hover:text-brand-700 hover:bg-brand-100 transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <p className="text-sm font-medium text-brand-900">{weekLabel(semana)}</p>
          {isCurrentWeek && (
            <p className="text-xs text-accent-600 font-medium">Semana actual</p>
          )}
        </div>
        <button
          onClick={() => setSemana(shiftWeek(semana, 1))}
          disabled={isCurrentWeek}
          className="p-1.5 rounded-lg text-brand-400 hover:text-brand-700 hover:bg-brand-100 transition-colors disabled:opacity-30"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* User filter */}
      {users.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterUser('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filterUser === 'all'
                ? 'bg-brand-800 text-white'
                : 'bg-brand-100 text-brand-600 hover:bg-brand-200'
            }`}
          >
            Todos
          </button>
          {users.map(([uid, name]) => (
            <button
              key={uid}
              onClick={() => setFilterUser(uid)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filterUser === uid
                  ? 'bg-brand-800 text-white'
                  : 'bg-brand-100 text-brand-600 hover:bg-brand-200'
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {/* Activity list */}
      {isLoading ? (
        <SkeletonList rows={5} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Activity size={36} />}
          title="Sin actividad esta semana"
          description="Los registros semanales del equipo aparecerán aquí"
        />
      ) : (
        DIA_ORDER.filter((d) => byDay.has(d)).map((d) => (
          <div key={d} className="bg-white rounded-2xl border border-brand-100 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-brand-50 bg-brand-50">
              <p className="text-xs font-semibold text-brand-600 uppercase tracking-wide">
                {DIAS[d]}
              </p>
            </div>
            <div className="divide-y divide-brand-50">
              {byDay.get(d)!.map((row) => (
                <div key={row.id} className="flex items-start gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <Badge variant="neutral">{row.full_name}</Badge>
                    </div>
                    <p className="text-sm text-brand-800">{row.actividad}</p>
                    {row.cantidad != null && (
                      <p className="text-xs text-brand-400 mt-0.5">Cantidad: {row.cantidad}</p>
                    )}
                    {row.observacion && (
                      <p className="text-xs text-brand-400 mt-0.5">{row.observacion}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
