'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    // The reset link sets a recovery session automatically once Supabase
    // parses the URL. Watch for it, and also check in case it's already set.
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords don\'t match.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (updateError) {
      setError(updateError.message)
      return
    }
    setDone(true)
  }

  if (done) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm rounded-xl border border-card2 bg-card p-8 text-center">
          <h1 className="text-xl font-semibold text-foreground">Password updated</h1>
          <p className="mt-2 text-sm text-muted">You can now log in with your new password.</p>
          <button
            onClick={() => router.push('/login')}
            className="mt-6 rounded-lg bg-accent hover:bg-accent/90 px-4 py-2 text-sm font-medium text-white"
          >
            Go to login
          </button>
        </div>
      </main>
    )
  }

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm rounded-xl border border-card2 bg-card p-8 text-center">
          <h1 className="text-xl font-semibold text-foreground">Verifying reset link...</h1>
          <p className="mt-2 text-sm text-muted">
            If this doesn&apos;t update in a few seconds, your reset link may have expired.{' '}
            <a href="/forgot-password" className="text-accent">
              Request a new one
            </a>
            .
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl border border-card2 bg-card p-8"
      >
        <h1 className="text-xl font-semibold text-foreground">Set a new password</h1>

        <label className="mt-6 block text-sm text-muted">New password</label>
        <input
          required
          minLength={6}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-lg border border-card2 bg-card2 px-3 py-2 text-foreground outline-none focus:border-accent"
        />

        <label className="mt-4 block text-sm text-muted">Confirm password</label>
        <input
          required
          minLength={6}
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="mt-1 w-full rounded-lg border border-card2 bg-card2 px-3 py-2 text-foreground outline-none focus:border-accent"
        />

        {error && <p className="mt-4 text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-lg bg-accent hover:bg-accent/90 py-2 font-medium text-white disabled:opacity-60"
        >
          {loading ? 'Updating...' : 'Update password'}
        </button>
      </form>
    </main>
  )
}
