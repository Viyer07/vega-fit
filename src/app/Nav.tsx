'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function Nav({ homeHref, roleLabel }: { homeHref: string; roleLabel: string }) {
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-20 border-b border-card2 bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
        <Link href={homeHref} className="flex items-center gap-2 transition hover:opacity-80">
          <span className="text-sm font-semibold uppercase tracking-widest text-accent">
            Vega Fit
          </span>
          <span className="rounded-full bg-card2 px-2 py-0.5 text-xs text-muted">{roleLabel}</span>
        </Link>
        <button
          onClick={handleSignOut}
          className="text-sm font-medium text-muted hover:text-foreground"
        >
          Sign out
        </button>
      </div>
    </header>
  )
}
