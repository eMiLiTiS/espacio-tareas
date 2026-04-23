import type { Database } from './database'

export type Role = 'admin' | 'worker'
export type Seccion = 'apertura' | 'durante_dia' | 'cierre'
export type Dia = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo'

export type Clinic = Database['public']['Tables']['clinic']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Category = Database['public']['Tables']['categories']['Row']
export type ChecklistTemplate = Database['public']['Tables']['checklist_templates']['Row']
export type ChecklistCompletion = Database['public']['Tables']['checklist_completions']['Row']
export type WeeklyRecord = Database['public']['Tables']['weekly_records']['Row']

export interface GlobalActivityRow {
  id: string
  clinic_id: string
  user_id: string
  semana_inicio: string
  dia: string
  actividad: string
  cantidad: number | null
  observacion: string | null
  created_at: string
  full_name: string
}

/** Template with its completion for a given date (if any) */
export interface TemplateWithCompletion {
  template: ChecklistTemplate
  completion: ChecklistCompletion | null
}

/** Templates grouped by category */
export interface CategoryGroup {
  category: Category | null
  items: TemplateWithCompletion[]
  completedCount: number
}

/** Sections with their category groups */
export interface ChecklistSection {
  seccion: Seccion
  label: string
  groups: CategoryGroup[]
  total: number
  completed: number
}

export const SECCIONES: Record<Seccion, string> = {
  apertura: 'Apertura',
  durante_dia: 'Durante el día',
  cierre: 'Cierre',
}

export const DIAS: Record<Dia, string> = {
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
  sabado: 'Sábado',
  domingo: 'Domingo',
}
