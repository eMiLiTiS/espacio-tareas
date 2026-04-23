import type { ChecklistTemplate, ChecklistCompletion, Category } from '@/types/domain'
import type { Seccion } from '@/types/domain'

const SECCIONES_ORDER: Seccion[] = ['apertura', 'durante_dia', 'cierre']

interface TemplateRow {
  template: ChecklistTemplate
  completion: ChecklistCompletion | undefined
}

interface CategoryGroup {
  category: Category | null
  items: TemplateRow[]
}

export interface ChecklistSection {
  seccion: Seccion
  groups: CategoryGroup[]
  total: number
  completed: number
}

export function buildChecklistSections(
  templates: ChecklistTemplate[],
  completions: ChecklistCompletion[],
  categories: Category[]
): ChecklistSection[] {
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

    return {
      seccion,
      groups,
      total: sectionTemplates.length,
      completed: sectionTemplates.filter((t) => completionMap.has(t.id)).length,
    }
  })
}
