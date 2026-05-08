export type Database = {
  public: {
    Tables: {
      clinic: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          clinic_id: string
          full_name: string
          email: string
          role: 'admin' | 'worker'
          created_at: string
        }
        Insert: {
          id: string
          clinic_id: string
          full_name: string
          email: string
          role?: 'admin' | 'worker'
          created_at?: string
        }
        Update: {
          id?: string
          clinic_id?: string
          full_name?: string
          email?: string
          role?: 'admin' | 'worker'
          created_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          clinic_id: string
          name: string
          color: string
          orden: number
          created_at: string
        }
        Insert: {
          id?: string
          clinic_id: string
          name: string
          color?: string
          orden?: number
          created_at?: string
        }
        Update: {
          id?: string
          clinic_id?: string
          name?: string
          color?: string
          orden?: number
          created_at?: string
        }
        Relationships: []
      }
      checklist_templates: {
        Row: {
          id: string
          clinic_id: string
          category_id: string | null
          nombre: string
          seccion: 'apertura' | 'durante_dia' | 'cierre'
          tiene_cantidad: boolean
          unidad: string | null
          orden: number
          activo: boolean
          created_at: string
        }
        Insert: {
          id?: string
          clinic_id: string
          category_id?: string | null
          nombre: string
          seccion: 'apertura' | 'durante_dia' | 'cierre'
          tiene_cantidad?: boolean
          unidad?: string | null
          orden?: number
          activo?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          clinic_id?: string
          category_id?: string | null
          nombre?: string
          seccion?: 'apertura' | 'durante_dia' | 'cierre'
          tiene_cantidad?: boolean
          unidad?: string | null
          orden?: number
          activo?: boolean
          created_at?: string
        }
        Relationships: []
      }
      checklist_completions: {
        Row: {
          id: string
          clinic_id: string
          template_id: string
          user_id: string
          fecha: string
          cantidad: number | null
          observacion: string | null
          created_at: string
        }
        Insert: {
          id?: string
          clinic_id: string
          template_id: string
          user_id: string
          fecha: string
          cantidad?: number | null
          observacion?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          clinic_id?: string
          template_id?: string
          user_id?: string
          fecha?: string
          cantidad?: number | null
          observacion?: string | null
          created_at?: string
        }
        Relationships: []
      }
      weekly_templates: {
        Row: {
          id: string
          clinic_id: string
          nombre: string
          unidad: string | null
          orden: number
          activo: boolean
          created_at: string
        }
        Insert: {
          id?: string
          clinic_id: string
          nombre: string
          unidad?: string | null
          orden?: number
          activo?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          clinic_id?: string
          nombre?: string
          unidad?: string | null
          orden?: number
          activo?: boolean
          created_at?: string
        }
        Relationships: []
      }
      weekly_records: {
        Row: {
          id: string
          clinic_id: string
          user_id: string
          semana_inicio: string
          dia: 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo'
          actividad: string
          cantidad: number | null
          observacion: string | null
          created_at: string
        }
        Insert: {
          id?: string
          clinic_id: string
          user_id: string
          semana_inicio: string
          dia: 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo'
          actividad: string
          cantidad?: number | null
          observacion?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          clinic_id?: string
          user_id?: string
          semana_inicio?: string
          dia?: 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo'
          actividad?: string
          cantidad?: number | null
          observacion?: string | null
          created_at?: string
        }
        Relationships: []
      }
      incidencias: {
        Row: {
          id: string
          clinic_id: string
          user_id: string
          titulo: string
          descripcion: string | null
          estado: 'abierta' | 'en_proceso' | 'resuelta'
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          clinic_id: string
          user_id: string
          titulo: string
          descripcion?: string | null
          estado?: 'abierta' | 'en_proceso' | 'resuelta'
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          clinic_id?: string
          user_id?: string
          titulo?: string
          descripcion?: string | null
          estado?: 'abierta' | 'en_proceso' | 'resuelta'
          created_at?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_global_weekly_activity: {
        Args: {
          p_semana_inicio: string
        }
        Returns: {
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
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
