import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function ClientLogsPage({
  params,
}: {
  params: Promise<{ clientId: string }>
}) {
  const { clientId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: client } = await supabase
    .from('profiles')
    .select('id, full_name, trainer_id')
    .eq('id', clientId)
    .single()

  if (!client || client.trainer_id !== user.id) notFound()

  // Last 20 workout logs with set details
  const { data: workoutLogs } = await supabase
    .from('workout_logs')
    .select(
      'id, logged_date, finished_at, workout_days(day_name), set_logs(id, set_number, weight, reps, rir, machine_notes, is_pr, exercises(name))'
    )
    .eq('client_id', clientId)
    .order('finished_at', { ascending: false })
    .limit(20)

  // Last 30 days bodyweight
  const { data: bwLogs } = await supabase
    .from('bodyweight_logs')
    .select('logged_date, weight')
    .eq('client_id', clientId)
    .order('logged_date', { ascending: false })
    .limit(30)

  const { data: checkins } = await supabase
    .from('daily_checkins')
    .select('logged_date, cardio_minutes, end_of_day_calories')
    .eq('client_id', clientId)
    .order('logged_date', { ascending: false })
    .limit(14)

  const { data: latestProgram } = await supabase
    .from('programs')
    .select('calorie_target')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  const calorieTarget = latestProgram?.calorie_target ?? null

  return (
    <main className="min-h-screen bg-background px-6 py-8">
      <div className="mx-auto max-w-4xl">
      <Link href={`/trainer/clients/${clientId}`} className="text-sm text-accent hover:underline">
        ← Back to program
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-foreground">
        {client.full_name}&apos;s logs
      </h1>

      {/* Bodyweight */}
      {bwLogs && bwLogs.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-foreground">Bodyweight (last 30 days)</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {[...bwLogs].sort((a, b) => a.logged_date.localeCompare(b.logged_date)).map((l) => (
              <div key={l.logged_date} className="rounded-lg bg-card border border-card2 px-3 py-2 text-center">
                <p className="text-xs text-muted">{formatDate(l.logged_date)}</p>
                <p className="text-sm font-medium text-foreground">{l.weight} lb</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Nutrition / cardio check-ins */}
      {checkins && checkins.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-foreground">
            Nutrition &amp; cardio (last 14 days)
          </h2>
          <div className="mt-3 overflow-x-auto rounded-xl border border-card2 bg-card p-4">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-muted">
                  <th className="pb-2 font-normal">Date</th>
                  <th className="pb-2 font-normal">Cardio</th>
                  <th className="pb-2 font-normal">Calories</th>
                  <th className="pb-2 font-normal">vs target</th>
                </tr>
              </thead>
              <tbody>
                {checkins.map((c) => {
                  const delta =
                    c.end_of_day_calories != null && calorieTarget != null
                      ? c.end_of_day_calories - calorieTarget
                      : null
                  return (
                    <tr key={c.logged_date} className="border-t border-card2 text-foreground">
                      <td className="py-2 text-muted">{formatDate(c.logged_date)}</td>
                      <td className="py-2">
                        {c.cardio_minutes != null ? `${c.cardio_minutes} min` : '—'}
                      </td>
                      <td className="py-2">{c.end_of_day_calories ?? '—'}</td>
                      <td className="py-2">
                        {delta == null ? '—' : `${delta > 0 ? '+' : ''}${delta}`}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Workout logs */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-foreground">Recent workouts</h2>
        {!workoutLogs || workoutLogs.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No workouts logged yet.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {workoutLogs.map((wl) => {
              const day = wl.workout_days as unknown as { day_name: string } | null
              const sets = (wl.set_logs ?? []) as unknown as {
                id: string
                set_number: number
                weight: number | null
                reps: number | null
                rir: number | null
                machine_notes: string | null
                is_pr: boolean
                exercises: { name: string } | null
              }[]
              const grouped = groupByExercise(sets)
              return (
                <div key={wl.id} className="rounded-xl border border-card2 bg-card p-5 shadow-sm shadow-black/20">
                  <div className="flex items-baseline justify-between">
                    <p className="font-medium text-foreground">{day?.day_name ?? 'Workout'}</p>
                    <p className="text-xs text-muted">{formatDateTime(wl.finished_at)}</p>
                  </div>
                  {grouped.map(({ exerciseName, sets: exSets }) => (
                    <div key={exerciseName} className="mt-4">
                      <p className="text-sm font-medium text-foreground">{exerciseName}</p>
                      <table className="mt-1 w-full text-left text-sm">
                        <thead>
                          <tr className="text-muted">
                            <th className="pb-1 font-normal">Set</th>
                            <th className="pb-1 font-normal">Weight</th>
                            <th className="pb-1 font-normal">Reps</th>
                            <th className="pb-1 font-normal">RIR</th>
                            <th className="pb-1 font-normal">Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {exSets.map((s) => (
                            <tr key={s.id} className="border-t border-card2">
                              <td className="py-1 text-muted">{s.set_number}</td>
                              <td className={`py-1 ${s.is_pr ? 'text-gold font-semibold' : 'text-foreground'}`}>
                                {s.weight != null ? `${s.weight} lb` : '—'}
                                {s.is_pr && ' 🏆'}
                              </td>
                              <td className="py-1 text-foreground">{s.reps ?? '—'}</td>
                              <td className="py-1 text-foreground">{s.rir ?? '—'}</td>
                              <td className="py-1 text-muted">{s.machine_notes ?? ''}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        )}
      </section>
      </div>
    </main>
  )
}

function groupByExercise(sets: { exercises: { name: string } | null; set_number: number; weight: number | null; reps: number | null; rir: number | null; machine_notes: string | null; is_pr: boolean; id: string }[]) {
  const order: string[] = []
  const map: Record<string, typeof sets> = {}
  for (const s of [...sets].sort((a, b) => a.set_number - b.set_number)) {
    const name = s.exercises?.name ?? 'Unknown'
    if (!map[name]) { map[name] = []; order.push(name) }
    map[name].push(s)
  }
  return order.map((name) => ({ exerciseName: name, sets: map[name] }))
}

function formatDate(iso: string) {
  const [, m, d] = iso.split('-')
  return `${parseInt(m)}/${parseInt(d)}`
}

function formatDateTime(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
