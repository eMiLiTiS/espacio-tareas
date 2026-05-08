import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { AlertTriangle, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { qk } from '@/lib/query-client'
import { useAuth } from '@/auth/auth-provider'
import { cn } from '@/utils/cn'
import { EmptyState } from '@/components/ui/empty-state'
import { SkeletonList } from '@/components/ui/skeleton'
import { Modal } from '@/components/ui/modal'
import type { Incidencia } from '@/types/domain'

type IncidenciaRow = Incidencia

type ProfileLite = {
  id: string
  full_name: string
}

type EstadoFilter = 'todas' | 'abierta' | 'en_proceso' | 'resuelta'

const ESTADO_LABEL: Record<string, string> = {
  abierta: 'Abierta',
  en_proceso: 'En proceso',
  resuelta: 'Resuelta',
}

const ESTADO_BADGE: Record<string, string> = {
  abierta: 'bg-yellow-100 text-yellow-800',
  en_proceso: 'bg-blue-100 text-blue-800',
  resuelta: 'bg-green-100 text-green-700',
}

const FILTERS: { key: EstadoFilter; label: string }[] = [
  { key: 'todas', label: 'Todas' },
  { key: 'abierta', label: 'Abiertas' },
  { key: 'en_proceso', label: 'En proceso' },
  { key: 'resuelta', label: 'Resueltas' },
]

export function IncidenciasPage() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const [filter, setFilter] = useState<EstadoFilter>('todas')
  const [showCreate, setShowCreate] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const isAdmin = profile?.role === 'admin'

  const { data: incidencias = [], isLoading } = useQuery({
    queryKey: qk.incidencias(profile?.clinic_id ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incidencias')
        .select('*')
        .eq('clinic_id', profile!.clinic_id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as IncidenciaRow[]
    },
    enabled: !!profile,
  })

  const { data: profiles = [] } = useQuery({
  queryKey: ['incidencias-profiles', profile?.clinic_id ?? ''],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('clinic_id', profile!.clinic_id)

    if (error) throw error
    return data as ProfileLite[]
  },
  enabled: !!profile,
})

const profilesMap = new Map(profiles.map((p) => [p.id, p.full_name]))

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('incidencias')
        .insert({
          clinic_id: profile!.clinic_id,
          user_id: profile!.id,
          titulo: titulo.trim(),
          descripcion: descripcion.trim() || null,
        })
        .select('*')
        .single()
      if (error) throw error
      return data as IncidenciaRow
    },
    onSuccess: (data) => {
      qc.setQueryData<IncidenciaRow[]>(qk.incidencias(profile!.clinic_id), (old = []) => [
        data,
        ...old,
      ])
      setTitulo('')
      setDescripcion('')
      setShowCreate(false)
      toast.success('Incidencia registrada')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateEstadoMutation = useMutation({
    mutationFn: async ({ id, estado }: { id: string; estado: Incidencia['estado'] }) => {
      const { error } = await supabase
        .from('incidencias')
        .update({ estado, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
      return { id, estado }
    },
    onSuccess: ({ id, estado }) => {
      qc.setQueryData<IncidenciaRow[]>(qk.incidencias(profile!.clinic_id), (old = []) =>
        old.map((inc) =>
          inc.id === id ? { ...inc, estado: estado as Incidencia['estado'] } : inc
        )
      )
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const canEdit = (inc: IncidenciaRow) => isAdmin || inc.user_id === profile?.id

  const filtered =
    filter === 'todas' ? incidencias : incidencias.filter((i) => i.estado === filter)

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!titulo.trim()) return
    createMutation.mutate()
  }

  function closeModal() {
    setShowCreate(false)
    setTitulo('')
    setDescripcion('')
  }

  return (
    <div className="max-w-2xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-brand-900">Incidencias</h2>
          <p className="text-sm text-brand-400">Registro de incidencias del equipo</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-800 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          <Plus size={16} />
          Nueva
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-brand-100 p-1 rounded-xl">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={cn(
              'flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-colors',
              filter === key
                ? 'bg-white text-brand-900 shadow-sm'
                : 'text-brand-500 hover:text-brand-700'
            )}
          >
            {label}
            {key !== 'todas' && (
              <span className="ml-1 text-[10px] text-brand-400">
                {incidencias.filter((i) => i.estado === key).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <SkeletonList rows={4} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<AlertTriangle size={36} />}
          title="Sin incidencias"
          description={
            filter === 'todas'
              ? 'Registra una nueva incidencia con el botón "Nueva"'
              : `No hay incidencias con estado "${ESTADO_LABEL[filter] ?? filter}"`
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((inc) => (
            <div
              key={inc.id}
              className="bg-white rounded-2xl border border-brand-100 p-4 space-y-3"
            >
              {/* Content */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-brand-900">{inc.titulo}</p>
                  {inc.descripcion && (
                    <p className="mt-1 text-sm text-brand-600 whitespace-pre-wrap">
                      {inc.descripcion}
                    </p>
                  )}
                </div>
                <span
                  className={cn(
                    'shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                    ESTADO_BADGE[inc.estado]
                  )}
                >
                  {ESTADO_LABEL[inc.estado]}
                </span>
              </div>

              {/* Meta + estado selector */}
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] text-brand-400">
                  {profilesMap.get(inc.user_id) ?? 'Usuario'} ·{' '}
                  {new Date(inc.created_at).toLocaleString('es', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>

                {canEdit(inc) && (
                  <select
                    value={inc.estado}
                    onChange={(e) =>
                      updateEstadoMutation.mutate({
                        id: inc.id,
                        estado: e.target.value as Incidencia['estado'],
                      })
                    }
                    disabled={updateEstadoMutation.isPending}
                    className="text-xs border border-brand-200 rounded-lg px-2 py-1 text-brand-700 bg-white focus:outline-none focus:ring-1 focus:ring-brand-400"
                  >
                    <option value="abierta">Abierta</option>
                    <option value="en_proceso">En proceso</option>
                    <option value="resuelta">Resuelta</option>
                  </select>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      <Modal open={showCreate} onClose={closeModal} title="Nueva incidencia" size="md">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-brand-700 mb-1">
              Título <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              maxLength={200}
              placeholder="Describe brevemente la incidencia"
              className="w-full px-3 py-2 text-sm border border-brand-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-brand-700 mb-1">
              Descripción{' '}
              <span className="text-brand-400 font-normal">(opcional)</span>
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
              placeholder="Detalles adicionales..."
              className="w-full px-3 py-2 text-sm border border-brand-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2 text-sm text-brand-600 hover:text-brand-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!titulo.trim() || createMutation.isPending}
              className="px-4 py-2 text-sm font-medium bg-brand-800 text-white rounded-xl hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {createMutation.isPending ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
