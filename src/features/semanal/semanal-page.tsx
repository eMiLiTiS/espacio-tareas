import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Trash2, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { qk } from '@/lib/query-client'
import { useAuth } from '@/auth/auth-provider'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { SkeletonList } from '@/components/ui/skeleton'
import { Modal } from '@/components/ui/modal'
import { weekStartISO, weekLabel, shiftWeek } from '@/utils/date'
import type { WeeklyRecord, Dia } from '@/types/domain'
import { DIAS } from '@/types/domain'

const DIA_LIST = Object.entries(DIAS) as [Dia, string][]

type WeeklyTemplate = {
  id: string
  clinic_id: string
  nombre: string
  unidad: string | null
  orden: number
  activo: boolean
}

export function SemanalPage() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const [semana, setSemana] = useState(weekStartISO())
  const [modalOpen, setModalOpen] = useState(false)

  const isCurrentWeek = semana === weekStartISO()

  const { data: templates = [] } = useQuery({
    queryKey: ['weekly_templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weekly_templates')
        .select('*')
        .eq('activo', true)
        .order('orden')

      if (error) throw error
      return data as WeeklyTemplate[]
    },
  })

  const { data: records = [], isLoading } = useQuery({
    queryKey: qk.weeklyRecords(profile?.id ?? '', semana),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weekly_records')
        .select('*')
        .eq('user_id', profile!.id)
        .eq('semana_inicio', semana)
        .order('created_at')

      if (error) throw error
      return data as WeeklyRecord[]
    },
    enabled: !!profile,
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('weekly_records').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.weeklyRecords(profile!.id, semana) })
      toast.success('Registro eliminado')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const byDay = new Map<Dia, WeeklyRecord[]>()
  for (const r of records) {
    const d = r.dia as Dia
    if (!byDay.has(d)) byDay.set(d, [])
    byDay.get(d)!.push(r)
  }

  const recordsByActividad = useMemo(() => {
    const map = new Map<string, WeeklyRecord>()
    for (const r of records) {
      map.set(r.actividad, r)
    }
    return map
  }, [records])

  async function saveTemplateValue(template: WeeklyTemplate, rawValue: string) {
    if (!profile) return

    const clean = rawValue.trim()
    const cantidad = clean === '' ? null : Number(clean)

    if (cantidad !== null && (Number.isNaN(cantidad) || cantidad < 0)) {
      toast.error('Cantidad inválida')
      return
    }

    const existing = recordsByActividad.get(template.nombre)

    if (existing) {
      const { error } = await supabase
        .from('weekly_records')
        .update({ cantidad })
        .eq('id', existing.id)

      if (error) {
        toast.error(error.message)
        return
      }
    } else {
      const { error } = await supabase.from('weekly_records').insert({
        clinic_id: profile.clinic_id,
        user_id: profile.id,
        semana_inicio: semana,
        dia: 'lunes',
        actividad: template.nombre,
        cantidad,
        observacion: null,
      })

      if (error) {
        toast.error(error.message)
        return
      }
    }

    qc.invalidateQueries({ queryKey: qk.weeklyRecords(profile.id, semana) })
    toast.success('Guardado')
  }

  return (
    <div className="max-w-2xl space-y-5">
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

      <div className="flex justify-end">
        <Button onClick={() => setModalOpen(true)} size="sm">
          <Plus size={14} />
          Añadir actividad
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-brand-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-brand-50 bg-brand-50">
          <p className="text-xs font-semibold text-brand-600 uppercase tracking-wide">
            Ítems semanales
          </p>
        </div>

        <div className="divide-y divide-brand-50">
          {templates.map((template) => {
            const current = recordsByActividad.get(template.nombre)

            return (
              <div key={template.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-brand-800">
                    {template.nombre}
                  </p>

                  {template.unidad && (
                    <p className="text-xs text-brand-400 mt-0.5">
                      {template.unidad}
                    </p>
                  )}
                </div>

                <input
                  type="number"
                  min="0"
                  defaultValue={current?.cantidad ?? ''}
                  onBlur={(e) => saveTemplateValue(template, e.target.value)}
                  className="w-28 px-3 py-2 text-sm text-right border border-brand-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400"
                  placeholder="0"
                />
              </div>
            )
          })}
        </div>
      </div>

      {isLoading ? (
        <SkeletonList rows={4} />
      ) : records.length === 0 ? (
        <EmptyState
          icon={<CalendarDays size={36} />}
          title="Sin registros esta semana"
          description="Rellena los ítems semanales o añade una actividad extra"
        />
      ) : (
        DIA_LIST.filter(([d]) => byDay.has(d)).map(([d, label]) => (
          <div key={d} className="bg-white rounded-2xl border border-brand-100 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-brand-50 bg-brand-50">
              <p className="text-xs font-semibold text-brand-600 uppercase tracking-wide">
                {label}
              </p>
            </div>

            <div className="divide-y divide-brand-50">
              {byDay.get(d)!.map((rec) => (
                <div key={rec.id} className="flex items-start gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-brand-800">{rec.actividad}</p>

                    {rec.cantidad != null && (
                      <p className="text-xs text-brand-400 mt-0.5">
                        Cantidad: {rec.cantidad}
                      </p>
                    )}

                    {rec.observacion && (
                      <p className="text-xs text-brand-400 mt-0.5">
                        {rec.observacion}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => deleteMutation.mutate(rec.id)}
                    disabled={deleteMutation.isPending}
                    className="text-brand-300 hover:text-danger-500 transition-colors shrink-0 mt-0.5"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      <AddRecordModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        semana={semana}
        clinicId={profile?.clinic_id ?? ''}
        userId={profile?.id ?? ''}
        onAdded={() => {
          qc.invalidateQueries({ queryKey: qk.weeklyRecords(profile!.id, semana) })
          setModalOpen(false)
          toast.success('Actividad añadida')
        }}
      />
    </div>
  )
}

function AddRecordModal({
  open,
  onClose,
  semana,
  clinicId,
  userId,
  onAdded,
}: {
  open: boolean
  onClose: () => void
  semana: string
  clinicId: string
  userId: string
  onAdded: () => void
}) {
  const [dia, setDia] = useState<Dia>('lunes')
  const [actividad, setActividad] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [observacion, setObservacion] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!actividad.trim()) return

    setSaving(true)

    const { error } = await supabase.from('weekly_records').insert({
      clinic_id: clinicId,
      user_id: userId,
      semana_inicio: semana,
      dia,
      actividad: actividad.trim(),
      cantidad: cantidad ? parseFloat(cantidad) : null,
      observacion: observacion.trim() || null,
    })

    setSaving(false)

    if (error) {
      toast.error(error.message)
      return
    }

    setActividad('')
    setCantidad('')
    setObservacion('')
    onAdded()
  }

  return (
    <Modal open={open} onClose={onClose} title="Nueva actividad">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-brand-700 mb-1.5">
            Día
          </label>
          <select
            value={dia}
            onChange={(e) => setDia(e.target.value as Dia)}
            className="w-full px-3 py-2 text-sm border border-brand-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400"
          >
            {DIA_LIST.map(([d, label]) => (
              <option key={d} value={d}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-brand-700 mb-1.5">
            Actividad *
          </label>
          <input
            required
            value={actividad}
            onChange={(e) => setActividad(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-brand-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400"
            placeholder="Describe la actividad..."
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-brand-700 mb-1.5">
              Cantidad
            </label>
            <input
              type="number"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-brand-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400"
              placeholder="Opcional"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-brand-700 mb-1.5">
              Observación
            </label>
            <input
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-brand-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400"
              placeholder="Opcional"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            Guardar
          </Button>
        </div>
      </form>
    </Modal>
  )
}