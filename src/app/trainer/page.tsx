import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import CopyCode from './CopyCode'

export default async function TrainerDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'client') redirect('/client')

  const { data: clients } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('trainer_id', user.id)
    .order('full_name')

  const clientIds = (clients ?? []).map((c) => c.id)

  // Count workouts logged by all clients in the last 7 days
  let workoutsThisWeek = 0
  if (clientIds.length > 0) {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const { count } = await supabase
      .from('workout_logs')
      .select('id', { count: 'exact', head: true })
      .in('client_id', clientIds)
      .gte('logged_date', sevenDaysAgo.toISOString().split('T')[0])
    workoutsThisWeek = count ?? 0
  }

  return (
    <main className="min-h-screen bg-background px-6 py-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-semibold text-foreground">
          Welcome, {profile?.full_name ?? 'Coach'}
        </h1>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-card2 bg-card p-4 text-center">
            <p className="text-xl font-semibold text-foreground">{clients?.length ?? 0}</p>
            <p className="mt-1 text-xs text-muted">Active clients</p>
          </div>
          <div className="rounded-xl border border-card2 bg-card p-4 text-center">
            <p className="text-xl font-semibold text-foreground">{workoutsThisWeek}</p>
            <p className="mt-1 text-xs text-muted">Workouts logged this week</p>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-card2 bg-card p-5 shadow-sm shadow-black/20">
          <p className="text-sm text-muted">
            Share this code with clients so they link to you when they sign up:
          </p>
          <CopyCode code={user.id} />
        </div>

        <div className="mt-8">
          <h2 className="text-lg font-semibold text-foreground">Your clients</h2>
          {!clients || clients.length === 0 ? (
            <p className="mt-3 text-sm text-muted">
              No clients linked yet. Once a client signs up with your code, they&apos;ll appear here.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {clients.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/trainer/clients/${c.id}`}
                    className="flex items-center justify-between rounded-lg border border-card2 bg-card px-4 py-3 text-foreground shadow-sm shadow-black/20 transition hover:-translate-y-0.5 hover:border-accent hover:shadow-md hover:shadow-black/30"
                  >
                    <span>{c.full_name}</span>
                    <span className="text-sm text-accent">Manage program →</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  )
}
