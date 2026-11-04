import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { dayTotals, type Checkin, type MealLog } from '@/lib/nutrition'

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

  const { data: checkinRows } = await supabase
    .from('daily_checkins')
    .select('logged_date, cardio_minutes, end_of_day_calories, end_of_day_protein, end_of_day_carbs, end_of_day_fat')
    .eq('client_id', clientId)
    .order('logged_date', { ascending: false })
    .limit(14)

  const fourteenDaysAgo = new Date()
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
  const { data: mealRows } = await supabase
    .from('meal_logs')
    .select('id, logged_date, meal_number, name, calories, protein, carbs, fat')
    .eq('client_id', clientId)
    .gte('logged_date', fourteenDaysAgo.toISOString().split('T')[0])
    .order('meal_number', { ascending: true })

  const { data: latestProgram } = await supabase
    .from('programs')
    .select('calorie_target, protein_target, carbs_target, fat_target, cardio_target')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const checkinByDate: Record<string, Checkin> = {}
  for (const c of (checkinRows ?? []) as Checkin[]) checkinByDate[c.logged_date] = c
  const mealsByDate: Record<string, MealLog[]> = {}
  for (const m of (mealRows ?? []) as MealLog[]) (mealsByDate[m.logged_date] ??= []).push(m)
  const nutritionDates = Array.from(
    new Set([...Object.keys(checkinByDate), ...Object.keys(mealsByDate)])
  )
    .sort()
    .reverse()
    .slice(0, 14)

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
      {nutritionDates.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-foreground">Nutrition &amp; cardio</h2>
          {latestProgram && (
            <p className="mt-1 text-xs text-muted">
              Targets: {latestProgram.calorie_target ?? '—'} kcal · P {latestProgram.protein_target ?? '—'}g · C{' '}
              {latestProgram.carbs_target ?? '—'}g · F {latestProgram.fat_target ?? '—'}g
              {latestProgram.cardio_target ? ` · Cardio: ${latestProgram.cardio_target}` : ''}
            </p>
          )}
          <div className="mt-3 space-y-3">
            {nutritionDates.map((date) => {
              const c = checkinByDate[date]
              const meals = mealsByDate[date] ?? []
              const t = dayTotals(c, meals)
              const delta =
                t.calories != null && latestProgram?.calorie_target != null
                  ? t.calories - latestProgram.calorie_target
                  : null
              return (
                <div key={date} className="rounded-xl border border-card2 bg-card p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">{formatDate(date)}</p>
                    <p className="text-sm text-foreground">
                      {t.calories ?? '—'} kcal · P {t.protein ?? '—'}g · C {t.carbs ?? '—'}g · F{' '}
                      {t.fat ?? '—'}g
                      {delta != null && (
                        <span className="ml-2 text-muted">
                          ({delta > 0 ? '+' : ''}
                          {delta})
                        </span>
                      )}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    Cardio: {c?.cardio_minutes != null ? `${c.cardio_minutes} min` : '—'}
                  </p>
                  {meals.length > 0 && (
                    <ul className="mt-2 space-y-1 border-t border-card2 pt-2 text-xs text-muted">
                      {meals.map((m, i) => (
                        <li key={m.id}>
                          <span className="text-foreground">{m.name || `Meal ${i + 1}`}</span>:{' '}
                          {m.calories ?? '—'} kcal · P {m.protein ?? '—'}g · C {m.carbs ?? '—'}g · F{' '}
                          {m.fat ?? '—'}g
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
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
