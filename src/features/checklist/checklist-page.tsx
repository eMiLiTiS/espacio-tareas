import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CheckSquare, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { qk } from '@/lib/query-client'
import { useAuth } from '@/auth/auth-provider'
import { ProgressBar } from '@/components/ui/progress-bar'
import { SkeletonList } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { cn } from '@/utils/cn'
import { todayISO, subDaysISO } from '@/utils/date'
import type { Seccion, ChecklistTemplate, ChecklistCompletion, Category, Profile } from '@/types/domain'
import { SECCIONES } from '@/types/domain'

const SECCIONES_ORDER: Seccion[] = ['apertura', 'durante_dia', 'cierre']
const ALERT_DAYS = 3

interface TemplateRow {
  template: ChecklistTemplate
  completions: ChecklistCompletion[]
  myCompletion: ChecklistCompletion | undefined
  lastGlobalDate: string | null
}

interface CategoryGroup {
  category: Category | null
  items: TemplateRow[]
}

interface Section {
  seccion: Seccion
  groups: CategoryGroup[]
  total: number
  completed: number
}

function buildSections(
  templates: ChecklistTemplate[],
  completions: ChecklistCompletion[],
  categories: Category[],
  currentUserId: string,
  lastDateByTemplate: Map<string, string>
): Section[] {
  const completionsByTemplate = new Map<string, ChecklistCompletion[]>()
  for (const c of completions) {
    if (!completionsByTemplate.has(c.template_id)) completionsByTemplate.set(c.template_id, [])
    completionsByTemplate.get(c.template_id)!.push(c)
  }
  const categoryMap = new Map(categories.map((c) => [c.id, c]))

  return SECCIONES_ORDER.map((seccion) => {
    const sectionTemplates = templates
      .filter((t) => t.seccion === seccion && t.activo)
      .sort((a, b) => a.orden - b.orden)

    const grouped = new Map<string | null, TemplateRow[]>()
    for (const t of sectionTemplates) {
      const key = t.category_id ?? null
      if (!grouped.has(key)) grouped.set(key, [])
      const tmplCompletions = completionsByTemplate.get(t.id) ?? []
      grouped.get(key)!.push({
        template: t,
        completions: tmplCompletions,
        myCompletion: tmplCompletions.find((c) => c.user_id === currentUserId),
        lastGlobalDate: lastDateByTemplate.get(t.id) ?? null,
      })
    }

    const groups: CategoryGroup[] = Array.from(grouped.entries())
      .map(([catId, items]) => ({
        category: catId ? (categoryMap.get(catId) ?? null) : null,
        items,
      }))
      .sort((a, b) => (a.category?.orden ?? 999) - (b.category?.orden ?? 999))

    const completed = sectionTemplates.filter(
      (t) => (completionsByTemplate.get(t.id)?.length ?? 0) > 0
    ).length

    return { seccion, groups, total: sectionTemplates.length, completed }
  })
}

export function ChecklistPage() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const today = todayISO()
  const alertThreshold = subDaysISO(ALERT_DAYS)
  const [activeTab, setActiveTab] = useState<Seccion>('apertura')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const { data: templates = [], isLoading: tLoading } = useQuery({
    queryKey: qk.checklistTemplates(profile?.clinic_id ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checklist_templates')
        .select('*')
        .eq('clinic_id', profile!.clinic_id)
        .eq('activo', true)
        .order('orden')
      if (error) throw error
      return data as ChecklistTemplate[]
    },
    enabled: !!profile,
  })

  const { data: completions = [], isLoading: cLoading } = useQuery({
    queryKey: qk.checklistCompletions(profile?.clinic_id ?? '', today),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checklist_completions')
        .select('*')
        .eq('clinic_id', profile!.clinic_id)
        .eq('fecha', today)
      if (error) throw error
      return data as ChecklistCompletion[]
    },
    enabled: !!profile,
  })

  // Fetch recent completions to compute last-marked date per template (alert logic)
  const { data: recentDates = [] } = useQuery({
    queryKey: qk.checklistRecentCompletions(profile?.clinic_id ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checklist_completions')
        .select('template_id, fecha')
        .eq('clinic_id', profile!.clinic_id)
        .gte('fecha', subDaysISO(30))
      if (error) throw error
      return data as { template_id: string; fecha: string }[]
    },
    enabled: !!profile,
  })

  const { data: categories = [] } = useQuery({
    queryKey: qk.categories(profile?.clinic_id ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('clinic_id', profile!.clinic_id)
        .order('orden')
      if (error) throw error
      return data as Category[]
    },
    enabled: !!profile,
  })

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles', profile?.clinic_id ?? ''],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('clinic_id', profile!.clinic_id)
      if (error) throw error
      return data as Profile[]
    },
    enabled: !!profile,
  })

  // Build max fecha per template from recent completions
  const lastDateByTemplate = new Map<string, string>()
  for (const { template_id, fecha } of recentDates) {
    const existing = lastDateByTemplate.get(template_id)
    if (!existing || fecha > existing) lastDateByTemplate.set(template_id, fecha)
  }

  // Toggle my own completion on/off
  const toggleMutation = useMutation({
    mutationFn: async ({
      template,
      myCompletion,
      cantidad,
    }: {
      template: ChecklistTemplate
      myCompletion: ChecklistCompletion | undefined
      cantidad?: number
    }) => {
      if (myCompletion) {
        const { error } = await supabase
          .from('checklist_completions')
          .delete()
          .eq('id', myCompletion.id)
        if (error) throw error
        return { type: 'removed' as const, id: myCompletion.id }
      } else {
        const { data, error } = await supabase
          .from('checklist_completions')
          .insert({
            clinic_id: profile!.clinic_id,
            template_id: template.id,
            user_id: profile!.id,
            fecha: today,
            cantidad: cantidad ?? null,
          })
          .select()
          .single()
        if (error) throw error
        return { type: 'added' as const, completion: data as ChecklistCompletion }
      }
    },
    onSuccess: (result) => {
      const queryKey = qk.checklistCompletions(profile!.clinic_id, today)
      qc.setQueryData<ChecklistCompletion[]>(queryKey, (old = []) => {
        if (result.type === 'removed') return old.filter((c) => c.id !== result.id)
        return [...old, result.completion]
      })
      qc.invalidateQueries({ queryKey })
      qc.invalidateQueries({ queryKey: qk.dashboardStats(profile!.clinic_id, today) })
      qc.invalidateQueries({ queryKey: qk.checklistRecentCompletions(profile!.clinic_id) })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  // Admin: remove any user's completion by id
  const adminRemoveMutation = useMutation({
    mutationFn: async (completionId: string) => {
      const { error } = await supabase
        .from('checklist_completions')
        .delete()
        .eq('id', completionId)
      if (error) throw error
      return completionId
    },
    onSuccess: (completionId) => {
      const queryKey = qk.checklistCompletions(profile!.clinic_id, today)
      qc.setQueryData<ChecklistCompletion[]>(queryKey, (old = []) =>
        old.filter((c) => c.id !== completionId)
      )
      qc.invalidateQueries({ queryKey })
      qc.invalidateQueries({ queryKey: qk.dashboardStats(profile!.clinic_id, today) })
      qc.invalidateQueries({ queryKey: qk.checklistRecentCompletions(profile!.clinic_id) })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const profilesById = new Map(profiles.map((p) => [p.id, p]))
  const sections = buildSections(
    templates,
    completions,
    categories,
    profile?.id ?? '',
    lastDateByTemplate
  )
  const activeSection = sections.find((s) => s.seccion === activeTab)
  const isLoading = tLoading || cLoading
  const isAdmin = profile?.role === 'admin'
  const isPending = toggleMutation.isPending || adminRemoveMutation.isPending

  function toggleCollapse(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div className="max-w-2xl space-y-5">
      {/* Section tabs */}
      <div className="flex gap-1 bg-brand-100 p-1 rounded-xl">
        {sections.map((s) => (
          <button
            key={s.seccion}
            onClick={() => setActiveTab(s.seccion)}
            className={cn(
              'flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-colors',
              activeTab === s.seccion
                ? 'bg-white text-brand-900 shadow-sm'
                : 'text-brand-500 hover:text-brand-700'
            )}
          >
            {SECCIONES[s.seccion]}
            {s.total > 0 && (
              <span
                className={cn(
                  'ml-1.5 text-[10px]',
                  s.completed === s.total ? 'text-accent-600' : 'text-brand-400'
                )}
              >
                {s.completed}/{s.total}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Progress */}
      {activeSection && activeSection.total > 0 && (
        <div className="flex items-center gap-3">
          <ProgressBar
            value={(activeSection.completed / activeSection.total) * 100}
            className="flex-1"
          />
          <span className="text-xs text-brand-400 tabular-nums">
            {activeSection.completed}/{activeSection.total}
          </span>
        </div>
      )}

      {/* Items */}
      {isLoading ? (
        <SkeletonList rows={5} />
      ) : activeSection?.groups.length === 0 ? (
        <EmptyState
          icon={<CheckSquare size={36} />}
          title="Sin tareas en esta sección"
          description="Añade plantillas desde Ajustes"
        />
      ) : (
        activeSection?.groups.map((group) => {
          const groupKey = group.category?.id ?? 'sin-categoria'
          const isCollapsed = collapsed.has(groupKey)
          const groupCompleted = group.items.filter((r) => r.completions.length > 0).length

          return (
            <div key={groupKey} className="bg-white rounded-2xl border border-brand-100 overflow-hidden">
              {group.category && (
                <button
                  onClick={() => toggleCollapse(groupKey)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-brand-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: group.category.color }}
                    />
                    <span className="text-sm font-medium text-brand-800">{group.category.name}</span>
                    <span className="text-xs text-brand-400">
                      {groupCompleted}/{group.items.length}
                    </span>
                  </div>
                  {isCollapsed ? (
                    <ChevronRight size={14} className="text-brand-400" />
                  ) : (
                    <ChevronDown size={14} className="text-brand-400" />
                  )}
                </button>
              )}

              {!isCollapsed && (
                <div className="divide-y divide-brand-50">
                  {group.items.map(({ template, completions: tmplCompletions, myCompletion, lastGlobalDate }) => (
                    <ChecklistItem
                      key={template.id}
                      template={template}
                      completions={tmplCompletions}
                      myCompletion={myCompletion}
                      profilesById={profilesById}
                      alertThreshold={alertThreshold}
                      lastGlobalDate={lastGlobalDate}
                      onToggleMine={(cantidad) =>
                        toggleMutation.mutate({ template, myCompletion, cantidad })
                      }
                      onAdminRemove={(completionId) => adminRemoveMutation.mutate(completionId)}
                      disabled={isPending}
                      isAdmin={isAdmin}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}

function ChecklistItem({
  template,
  completions,
  myCompletion,
  profilesById,
  alertThreshold,
  lastGlobalDate,
  onToggleMine,
  onAdminRemove,
  disabled,
  isAdmin,
}: {
  template: ChecklistTemplate
  completions: ChecklistCompletion[]
  myCompletion: ChecklistCompletion | undefined
  profilesById: Map<string, Profile>
  alertThreshold: string
  lastGlobalDate: string | null
  onToggleMine: (cantidad?: number) => void
  onAdminRemove: (completionId: string) => void
  disabled: boolean
  isAdmin: boolean
}) {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const today = todayISO()
  const [qty, setQty] = useState(myCompletion?.cantidad?.toString() ?? '')
  const [obs, setObs] = useState(myCompletion?.observacion ?? '')
  const checked = !!myCompletion
  const showAlert = !lastGlobalDate || lastGlobalDate < alertThreshold

  useEffect(() => {
    setObs(myCompletion?.observacion ?? '')
  }, [myCompletion?.id])

  async function saveObs(value: string) {
    if (!myCompletion || !profile) return
    const observacion = value.trim() || null
    if ((myCompletion.observacion ?? null) === observacion) return
    const { error } = await supabase
      .from('checklist_completions')
      .update({ observacion })
      .eq('id', myCompletion.id)
    if (error) toast.error(error.message)
    else qc.invalidateQueries({ queryKey: qk.checklistCompletions(profile.clinic_id, today) })
  }

  return (
    <div
      className={cn(
        'flex items-start gap-3 px-4 py-3',
        showAlert && 'border-l-2 border-red-300'
      )}
    >
      <button
        onClick={() =>
          onToggleMine(template.tiene_cantidad ? (parseFloat(qty) || undefined) : undefined)
        }
        disabled={disabled}
        className={cn(
          'mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors',
          checked
            ? 'bg-accent-500 border-accent-500 text-white'
            : 'border-brand-300 hover:border-brand-500'
        )}
      >
        {checked && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path
              d="M1 4L4 7L9 1"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn('text-sm', checked ? 'line-through text-brand-400' : 'text-brand-800')}>
            {template.nombre}
          </span>
          {showAlert && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-red-500">
              <AlertTriangle size={10} />
              +{ALERT_DAYS}d
            </span>
          )}
        </div>

        {completions.length > 0 && (
          <p className="mt-0.5 text-[11px] text-brand-400 leading-relaxed">
            {'Marcado por: '}
            {completions.map((c, i) => {
              const name = profilesById.get(c.user_id)?.full_name ?? 'Usuario'
              const isOwn = c.id === myCompletion?.id
              const time = new Date(c.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })
              return (
                <span key={c.id}>
                  {i > 0 && ', '}
                  {name}
                  {' '}
                  <span className="text-brand-300">{time}</span>
                  {c.observacion && (
                    <span className="text-brand-400"> — "{c.observacion}"</span>
                  )}
                  {isAdmin && !isOwn && (
                    <button
                      onClick={() => onAdminRemove(c.id)}
                      disabled={disabled}
                      className="ml-0.5 text-red-400 hover:text-red-600 leading-none"
                      title={`Quitar marca de ${name}`}
                    >
                      ×
                    </button>
                  )}
                </span>
              )
            })}
          </p>
        )}

        {checked && (
          <input
            type="text"
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            onBlur={(e) => saveObs(e.target.value)}
            placeholder="Añadir nota..."
            className="mt-1 w-full text-xs px-2 py-1 border border-brand-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-400 text-brand-700 placeholder:text-brand-300"
          />
        )}
      </div>

      {template.tiene_cantidad && !checked && (
        <div className="flex items-center gap-1 shrink-0">
          <input
            type="number"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onToggleMine(parseFloat(qty) || undefined)
              if (e.key === 'Escape') setQty('')
            }}
            onBlur={() => {
              if (qty) onToggleMine(parseFloat(qty) || undefined)
            }}
            className="w-16 text-right px-2 py-1 text-xs border border-brand-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-400"
            placeholder="0"
          />
          {template.unidad && (
            <span className="text-xs text-brand-400">{template.unidad}</span>
          )}
        </div>
      )}

      {template.tiene_cantidad && checked && myCompletion?.cantidad != null && (
        <span className="text-xs text-brand-400 shrink-0">
          {myCompletion.cantidad} {template.unidad}
        </span>
      )}
    </div>
  )
}
