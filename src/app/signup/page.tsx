'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'trainer' | 'client'>('client')
  const [trainerCode, setTrainerCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [checkEmail, setCheckEmail] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const supabase = createClient()

    let { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role } },
    })

    // Account already exists from a previous attempt where the profile
    // row never got created. Sign in instead so we can finish setup.
    if (signUpError?.message.toLowerCase().includes('already registered')) {
      const signInResult = await supabase.auth.signInWithPassword({ email, password })
      if (signInResult.error) {
        setError(
          'An account with this email already exists, but this password doesn\'t match it. ' +
            'Try logging in instead, or use a different email.'
        )
        setLoading(false)
        return
      }
      data = signInResult.data
      signUpError = null
    }

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (!data.session) {
      setCheckEmail(true)
      setLoading(false)
      return
    }

    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', data.user!.id)
      .maybeSingle()

    if (!existingProfile) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user!.id,
        full_name: fullName,
        role,
        trainer_id: role === 'client' && trainerCode.trim() ? trainerCode.trim() : null,
      })

      if (profileError) {
        setError(
          profileError.message.includes('profiles_trainer_id_fkey')
            ? 'That trainer code is invalid.'
            : `Couldn't finish setting up your profile: ${profileError.message}`
        )
        setLoading(false)
        return
      }
    }

    router.push((existingProfile?.role ?? role) === 'trainer' ? '/trainer' : '/client')
  }

  if (checkEmail) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm rounded-xl border border-card2 bg-card p-8 text-center">
          <h1 className="text-xl font-semibold text-foreground">Check your email</h1>
          <p className="mt-2 text-sm text-muted">
            We sent a confirmation link to <span className="text-foreground">{email}</span>.
            Click it, then come back and log in.
          </p>
          <Link href="/login" className="mt-6 inline-block text-sm font-medium text-accent">
            Go to login
          </Link>
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
        <h1 className="text-xl font-semibold text-foreground">Create your account</h1>
        <p className="mt-1 text-sm text-muted">Vega Fit</p>

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={() => setRole('client')}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
              role === 'client'
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-card2 text-muted'
            }`}
          >
            I&apos;m a client
          </button>
          <button
            type="button"
            onClick={() => setRole('trainer')}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
              role === 'trainer'
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-card2 text-muted'
            }`}
          >
            I&apos;m a trainer
          </button>
        </div>

        <label className="mt-5 block text-sm text-muted">Full name</label>
        <input
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="mt-1 w-full rounded-lg border border-card2 bg-card2 px-3 py-2 text-foreground outline-none focus:border-accent"
        />

        <label className="mt-4 block text-sm text-muted">Email</label>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-lg border border-card2 bg-card2 px-3 py-2 text-foreground outline-none focus:border-accent"
        />

        <label className="mt-4 block text-sm text-muted">Password</label>
        <input
          required
          minLength={6}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-lg border border-card2 bg-card2 px-3 py-2 text-foreground outline-none focus:border-accent"
        />

        {role === 'client' && (
          <>
            <label className="mt-4 block text-sm text-muted">
              Trainer code <span className="text-muted/70">(optional, get this from your trainer)</span>
            </label>
            <input
              value={trainerCode}
              onChange={(e) => setTrainerCode(e.target.value)}
              className="mt-1 w-full rounded-lg border border-card2 bg-card2 px-3 py-2 text-foreground outline-none focus:border-accent"
            />
          </>
        )}

        {error && <p className="mt-4 text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-lg bg-accent hover:bg-accent/90 py-2 font-medium text-white disabled:opacity-60"
        >
          {loading ? 'Creating account...' : 'Sign up'}
        </button>

        <p className="mt-4 text-center text-sm text-muted">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-accent">
            Log in
          </Link>
        </p>
      </form>
    </main>
  )
}
