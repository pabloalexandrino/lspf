import { createClient } from '@supabase/supabase-js'

/**
 * Service-role Supabase client. Bypasses RLS entirely.
 * Use only in Server Components, Route Handlers, and Server Actions.
 * Never import in 'use client' components.
 */
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  )
}
