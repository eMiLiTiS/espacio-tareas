import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CheckSquare, ChevronDown, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { qk } from '@/lib/query-client'
import { useAuth } from '@/auth/auth-provider'
import { ProgressBar } from '@/components/ui/progress-bar'
import { SkeletonList } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { cn } from '@/utils/cn'
import { todayISO } from '@/utils/date'
import type { Seccion, ChecklistTemplate, ChecklistCompletion, Category } from '@/types/domain'
import { SECCIONES } from '@/types/domain'

const SECCIONES_ORDER: Seccion[] = ['apertura', 'durante_dia', 'cierre']

interface TemplateRow {
  template: ChecklistTemplate
  completion: ChecklistCompletion | undefined
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
  categories: Category[]
): Section[] {
  const completionMap = new Map(completions.map((c) => [c.template_id, c]))
  const categoryMap = new Map(categories.map((c) => [c.id, c]))

  return SECCIONES_ORDER.map((seccion) => {
    const sectionTemplates = templates
      .filter((t) => t.seccion === seccion && t.activo)
      .sort((a, b) => a.orden - b.orden)

    const grouped = new Map<string | null, TemplateRow[]>()
    for (const t of sectionTemplates) {
      const key = t.category_id ?? null
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key)!.push({ template: t, completion: completionMap.get(t.id) })
    }

    const groups: CategoryGroup[] = Array.from(grouped.entries())
      .map(([catId, items]) => ({
        category: catId ? (categoryMap.get(catId) ?? null) : null,
        items,
      }))
      .sort((a, b) => (a.category?.orden ?? 999) - (b.category?.orden ?? 999))

    const total = sectionTemplates.length
    const completed = sectionTemplates.filter((t) => completionMap.has(t.id)).length

    return { seccion, groups, total, completed }
  })
}

export function ChecklistPage() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const today = todayISO()
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

  const toggleMutation = useMutation({
    mutationFn: async ({
      template,
      existingCompletion,
      cantidad,
    }: {
      template: ChecklistTemplate
      existingCompletion: ChecklistCompletion | undefined
      cantidad?: number
    }) => {
      if (existingCompletion) {
        const { error } = await supabase
          .from('checklist_completions')
          .delete()
          .eq('id', existingCompletion.id)
        if (error) throw error
        return null
      } else {
        const { data, error } = await supabase
          .from('checklist_completions')
          .upsert({
            clinic_id: profile!.clinic_id,
            template_id: template.id,
            user_id: profile!.id,
            fecha: today,
            cantidad: cantidad ?? null,
          }, {
            onConflict: 'template_id,fecha,clinic_id'
          })
          .select()
          .single()
        if (error) throw error
        return data
      }
    },
    onSuccess: (data, variables) => {
      const queryKey = qk.checklistCompletions(profile!.clinic_id, today)

      qc.setQueryData<ChecklistCompletion[]>(queryKey, (old = []) => {
        if (variables.existingCompletion) {
          return old.filter((c) => c.id !== variables.existingCompletion?.id)
        }
        if (!data) return old
        return [...old, data as ChecklistCompletion]
      })

      qc.invalidateQueries({ queryKey })
      qc.invalidateQueries({ queryKey: qk.dashboardStats(profile!.clinic_id, today) })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const sections = buildSections(templates, completions, categories)
  const activeSection = sections.find((s) => s.seccion === activeTab)
  const isLoading = tLoading || cLoading

  function toggleCollapse(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div className= "max-w-2xl space-y-5" >
    {/* Section tabs */ }
    < div className = "flex gap-1 bg-brand-100 p-1 rounded-xl" >
    {
      sections.map((s) => (
        <button
            key= { s.seccion }
            onClick = {() => setActiveTab(s.seccion)}
  className = {
    cn(
              'flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-colors',
      activeTab === s.seccion
    ? 'bg-white text-brand-900 shadow-sm'
    : 'text-brand-500 hover:text-brand-700'
            )
}
          >
  { SECCIONES[s.seccion]}
{
  s.total > 0 && (
    <span
                className={
    cn(
      'ml-1.5 text-[10px]',
      s.completed === s.total ? 'text-accent-600' : 'text-brand-400'
    )
  }
              >
    { s.completed } / { s.total }
    </span>
            )
}
</button>
        ))}
</div>

{/* Progress */ }
{
  activeSection && activeSection.total > 0 && (
    <div className="flex items-center gap-3" >
      <ProgressBar
            value={ (activeSection.completed / activeSection.total) * 100 }
  className = "flex-1"
    />
    <span className="text-xs text-brand-400 tabular-nums" >
      { activeSection.completed } / { activeSection.total }
      </span>
      </div>
      )
}

{/* Items */ }
{
  isLoading ? (
    <SkeletonList rows= { 5} />
      ) : activeSection?.groups.length === 0 ? (
    <EmptyState
          icon= {< CheckSquare size = { 36} />}
title = "Sin tareas en esta sección"
description = "Añade plantillas desde Ajustes"
  />
      ) : (
  activeSection?.groups.map((group) => {
    const groupKey = group.category?.id ?? 'sin-categoria'
    const isCollapsed = collapsed.has(groupKey)
    const groupCompleted = group.items.filter((r) => r.completion).length

    return (
      <div key= { groupKey } className = "bg-white rounded-2xl border border-brand-100 overflow-hidden" >
        {/* Category header */ }
    {
      group.category && (
        <button
                  onClick={ () => toggleCollapse(groupKey) }
      className = "w-full flex items-center justify-between px-4 py-3 hover:bg-brand-50 transition-colors"
        >
        <div className="flex items-center gap-2" >
          <div
                      className="w-2.5 h-2.5 rounded-full"
      style = {{ backgroundColor: group.category.color }
    }
                    />
      < span className = "text-sm font-medium text-brand-800" >
        { group.category.name }
        </span>
        < span className = "text-xs text-brand-400" >
          { groupCompleted } / { group.items.length }
          </span>
          </div>
    {
      isCollapsed ? (
        <ChevronRight size= { 14} className = "text-brand-400" />
                  ) : (
  <ChevronDown size= { 14} className = "text-brand-400" />
                  )}
</button>
              )}

{/* Items */ }
{
  !isCollapsed && (
    <div className="divide-y divide-brand-50" >
    {
      group.items.map(({ template, completion }) => (
        <ChecklistItem
          key= { template.id }
          template = { template }
          completion = { completion }
          onToggle = {(cantidad) =>
        toggleMutation.mutate({ template, existingCompletion: completion, cantidad })
          }
  disabled = { toggleMutation.isPending }
  canUncheck = {
            !completion ||
    completion.user_id === profile!.id ||
    profile!.role === 'admin'
}
        />
                  ))
}
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
  completion,
  onToggle,
  disabled,
  canUncheck,
}: {
  template: ChecklistTemplate
  completion: ChecklistCompletion | undefined
  onToggle: (cantidad?: number) => void
  disabled: boolean
  canUncheck: boolean
}) {
  const [qty, setQty] = useState(completion?.cantidad?.toString() ?? '')
  const checked = !!completion

  return (
    <div className= "flex items-center gap-3 px-4 py-3" >
    <button
  onClick={
    () => {
      if (checked && !canUncheck) {
        toast.error('Solo quien marcó esta tarea o un admin puede desmarcarla')
        return
      }

      onToggle(template.tiene_cantidad ? (parseFloat(qty) || undefined) : undefined)
    }
  }
  disabled = { disabled }
  className = {
    cn(
          'w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors',
      checked
        ? 'bg-accent-500 border-accent-500 text-white'
            : 'border-brand-300 hover:border-brand-500'
    )
  }
    >
    { checked && (
      <svg width="10" height = "8" viewBox = "0 0 10 8" fill = "none" >
        <path
              d="M1 4L4 7L9 1"
  stroke = "currentColor"
  strokeWidth = "1.8"
  strokeLinecap = "round"
  strokeLinejoin = "round"
    />
    </svg>
        )
}
</button>

  < span className = { cn('flex-1 text-sm', checked? 'line-through text-brand-400' : 'text-brand-800') } >
    { template.nombre }
    </span>

{
  template.tiene_cantidad && !checked && (
    <div className="flex items-center gap-1" >
      <input
            type="number"
  value = { qty }
  onChange = {(e) => setQty(e.target.value)
}
onKeyDown = {(e) => {
  if (e.key === 'Enter') onToggle(parseFloat(qty) || undefined)
  if (e.key === 'Escape') setQty('')
}}
onBlur = {() => {
  if (qty) onToggle(parseFloat(qty) || undefined)
}}
className = "w-16 text-right px-2 py-1 text-xs border border-brand-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-400"
placeholder = "0"
  />
{
  template.unidad && (
    <span className="text-xs text-brand-400"> { template.unidad } </span>
          )
}
  </div>
      )}

{
  template.tiene_cantidad && checked && completion?.cantidad != null && (
    <span className="text-xs text-brand-400" >
      { completion.cantidad } { template.unidad }
  </span>
      )
}
</div>
  )
}
