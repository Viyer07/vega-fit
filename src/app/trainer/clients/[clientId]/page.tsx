import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ProgramBuilder from './ProgramBuilder'
import GoalWeightForm from './GoalWeightForm'

export default async function ClientProgramPage({
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
    .select('id, full_name, trainer_id, goal_weight')
    .eq('id', clientId)
    .single()

  if (!client || client.trainer_id !== user.id) notFound()

  const { data: program } = await supabase
    .from('programs')
    .select('id, name, phase_name, phase_week, phase_total_weeks, calorie_target, protein_target, carbs_target, fat_target, cardio_target')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let days: {
    id: string
    day_order: number
    day_name: string
    is_rest: boolean
    exercises: {
      id: string
      exercise_order: number
      name: string
      target_sets: number
      rep_range: string
      rir_target: string | null
      notes: string | null
    }[]
  }[] = []

  if (program) {
    const { data: dayRows } = await supabase
      .from('workout_days')
      .select('id, day_order, day_name, is_rest, exercises(id, exercise_order, name, target_sets, rep_range, rir_target, notes, image_url)')
      .eq('program_id', program.id)
      .order('day_order')

    days = (dayRows ?? []).map((d) => ({
      ...d,
      exercises: (d.exercises ?? []).sort((a, b) => a.exercise_order - b.exercise_order),
    }))
  }

  return (
    <main className="min-h-screen bg-background px-6 py-8">
      <div className="mx-auto max-w-4xl">
        <Link href="/trainer" className="text-sm text-accent hover:underline">
          ← Back to clients
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-foreground">{client.full_name}</h1>
          <Link
            href={`/trainer/clients/${clientId}/logs`}
            className="rounded-lg border border-card2 px-4 py-2 text-sm font-medium text-foreground hover:border-accent hover:text-accent"
          >
            View logs
          </Link>
        </div>

        <div className="mt-4">
          <GoalWeightForm clientId={clientId} initialGoalWeight={client.goal_weight} />
        </div>

        <ProgramBuilder clientId={clientId} initialProgram={program ?? null} initialDays={days} />
      </div>
    </main>
  )
}
