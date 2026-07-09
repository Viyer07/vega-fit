import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import LogForm from './LogForm'

export default async function LogWorkoutPage({
  params,
}: {
  params: Promise<{ dayId: string }>
}) {
  const { dayId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: day } = await supabase
    .from('workout_days')
    .select(
      'id, day_name, is_rest, program_id, exercises(id, exercise_order, name, target_sets, rep_range, rir_target, image_url, primary_muscle), programs!inner(client_id)'
    )
    .eq('id', dayId)
    .single()

  const program = Array.isArray(day?.programs) ? day.programs[0] : day?.programs
  if (!day || program?.client_id !== user.id) notFound()

  const exercises = (day.exercises ?? []).sort((a, b) => a.exercise_order - b.exercise_order)

  const bestWeights: Record<string, number> = {}
  if (exercises.length > 0) {
    const { data: bestRows } = await supabase
      .from('set_logs')
      .select('exercise_id, weight, workout_logs!inner(client_id)')
      .eq('workout_logs.client_id', user.id)
      .in(
        'exercise_id',
        exercises.map((e) => e.id)
      )

    for (const row of bestRows ?? []) {
      if (row.weight == null) continue
      const current = bestWeights[row.exercise_id] ?? 0
      if (row.weight > current) bestWeights[row.exercise_id] = row.weight
    }
  }

  return (
    <main className="min-h-screen bg-background px-6 py-8">
      <div className="mx-auto max-w-4xl">
        <Link href="/client" className="text-sm text-accent hover:underline">
          ← Back
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">{day.day_name}</h1>

        <LogForm dayId={dayId} exercises={exercises} bestWeights={bestWeights} />
      </div>
    </main>
  )
}
