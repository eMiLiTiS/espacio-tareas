import type { User } from '@supabase/supabase-js'
import type { Profile } from './domain'

export interface AuthContextValue {
  user: User | null
  profile: Profile | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}
