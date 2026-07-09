import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Fall back to placeholder values so builds (and prerendering) don't crash
// when Supabase env vars aren't configured yet. Real values are required for
// auth/data calls to actually work at runtime.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // called from a Server Component — ignore, middleware refreshes session
          }
        },
      },
    }
  )
}
