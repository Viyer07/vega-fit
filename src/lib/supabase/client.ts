import { createBrowserClient } from '@supabase/ssr'

// Fall back to placeholder values so builds (and prerendering) don't crash
// when Supabase env vars aren't configured yet. Real values are required for
// auth/data calls to actually work at runtime.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
