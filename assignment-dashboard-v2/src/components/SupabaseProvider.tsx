'use client'

import { SessionContextProvider } from '@supabase/auth-helpers-react'
import { supabase } from '../lib/supabase/client'
import { ReactNode } from 'react'

export default function SupabaseProvider({ children }: { children: ReactNode }) {
  return (
    <SessionContextProvider supabaseClient={supabase}>
      {children}
    </SessionContextProvider>
  )
}
