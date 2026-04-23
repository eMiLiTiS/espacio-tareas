import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!url || url === 'https://your-project.supabase.co') {
  console.warn('[supabase] VITE_SUPABASE_URL not set — copy .env.example to .env and fill in values')
}

export const supabase = createClient<Database>(url, key)
