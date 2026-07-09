'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ExercisePicker from './ExercisePicker'
import RoutineSummary from '@/app/RoutineSummary'

type Exercise = {
  id: string
  exercise_order: number
  name: string
  target_sets: number
  rep_range: string
  rir_target: string | null
  notes: string | null
  image_url?: string | null
  primary_muscle?: string | null
}

type Day = {
  id: string
  day_order: number
  day_name: string
  is_rest: boolean
  exercises: Exercise[]
}

type Program = {
  id: string
  name: string
  phase_name: string | null
  phase_week: number
  phase_total_weeks: number
}

export default function ProgramBuilder({
  clientId,
  initialProgram,
  initialDays,
}: {
  clientId: string
  initialProgram: Program | null
  initialDays: Day[]
}) {
  const router = useRouter()
  const supabase = createClient()
  const [program, setProgram] = useState(initialProgram)
  const [days, setDays] = useState(initialDays)
  const [busy, setBusy] = useState(false)
  const [pendingMeta, setPendingMeta] = useState<
    Record<string, { image_url: string | null; primary_muscle: string | null }>
  >({})

  function refresh() {
    router.refresh()
  }

  async function createProgram(formData: FormData) {
    setBusy(true)
    const { data, error } = await supabase
      .from('programs')
      .insert({
        client_id: clientId,
        name: String(formData.get('name')),
        phase_name: String(formData.get('phase_name') || '') || null,
        phase_week: Number(formData.get('phase_week') || 1),
        phase_total_weeks: Number(formData.get('phase_total_weeks') || 4),
      })
      .select('id, name, phase_name, phase_week, phase_total_weeks')
      .single()
    setBusy(false)
    if (error) return alert(error.message)
    setProgram(data)
  }

  async function addDay() {
    if (!program) return
    const dayName = window.prompt('Day name (e.g. "Push Day", "Rest")')
    if (!dayName) return
    setBusy(true)
    const { data, error } = await supabase
      .from('workout_days')
      .insert({
        program_id: program.id,
        day_order: days.length,
        day_name: dayName,
        is_rest: /rest/i.test(dayName),
      })
      .select('id, day_order, day_name, is_rest')
      .single()
    setBusy(false)
    if (error) return alert(error.message)
    setDays([...days, { ...data, exercises: [] }])
  }

  async function removeDay(dayId: string) {
    if (!window.confirm('Delete this day and all its exercises?')) return
    setBusy(true)
    const { error } = await supabase.from('workout_days').delete().eq('id', dayId)
    setBusy(false)
    if (error) return alert(error.message)
    setDays(days.filter((d) => d.id !== dayId))
  }

  async function addExercise(dayId: string, formData: FormData) {
    const day = days.find((d) => d.id === dayId)
    if (!day) return
    setBusy(true)
    const { data, error } = await supabase
      .from('exercises')
      .insert({
        workout_day_id: dayId,
        exercise_order: day.exercises.length,
        name: String(formData.get('name')),
        target_sets: Number(formData.get('target_sets') || 3),
        rep_range: String(formData.get('rep_range') || ''),
        rir_target: String(formData.get('rir_target') || '') || null,
        image_url: pendingMeta[dayId]?.image_url ?? null,
        primary_muscle: pendingMeta[dayId]?.primary_muscle ?? null,
      })
      .select('id, exercise_order, name, target_sets, rep_range, rir_target, notes, image_url, primary_muscle')
      .single()
    setBusy(false)
    if (error) return alert(error.message)
    setDays(
      days.map((d) => (d.id === dayId ? { ...d, exercises: [...d.exercises, data] } : d))
    )
    setPendingMeta((prev) => ({ ...prev, [dayId]: { image_url: null, primary_muscle: null } }))
  }

  async function removeExercise(dayId: string, exerciseId: string) {
    setBusy(true)
    const { error } = await supabase.from('exercises').delete().eq('id', exerciseId)
    setBusy(false)
    if (error) return alert(error.message)
    setDays(
      days.map((d) =>
        d.id === dayId
          ? { ...d, exercises: d.exercises.filter((e) => e.id !== exerciseId) }
          : d
      )
    )
  }

  if (!program) {
    return (
      <form
        action={createProgram}
        className="mt-8 max-w-md rounded-xl border border-card2 bg-card p-6"
      >
        <h2 className="text-lg font-semibold text-foreground">Create a program</h2>
        <label className="mt-4 block text-sm text-muted">Program name</label>
        <input
          name="name"
          required
          className="mt-1 w-full rounded-lg border border-card2 bg-card2 px-3 py-2 text-foreground outline-none focus:border-accent"
        />
        <label className="mt-4 block text-sm text-muted">Phase name</label>
        <input
          name="phase_name"
          placeholder="e.g. Hypertrophy"
          className="mt-1 w-full rounded-lg border border-card2 bg-card2 px-3 py-2 text-foreground outline-none focus:border-accent"
        />
        <div className="mt-4 flex gap-3">
          <div className="flex-1">
            <label className="block text-sm text-muted">Current week</label>
            <input
              name="phase_week"
              type="number"
              min={1}
              defaultValue={1}
              className="mt-1 w-full rounded-lg border border-card2 bg-card2 px-3 py-2 text-foreground outline-none focus:border-accent"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm text-muted">Total weeks</label>
            <input
              name="phase_total_weeks"
              type="number"
              min={1}
              defaultValue={4}
              className="mt-1 w-full rounded-lg border border-card2 bg-card2 px-3 py-2 text-foreground outline-none focus:border-accent"
            />
          </div>
        </div>
        <button
          disabled={busy}
          className="mt-6 w-full rounded-lg bg-accent hover:bg-accent/90 py-2 font-medium text-white disabled:opacity-60"
        >
          Create program
        </button>
      </form>
    )
  }

  return (
    <div className="mt-8">
      <div className="rounded-xl border border-card2 bg-card p-5 shadow-sm shadow-black/20">
        <p className="text-foreground font-medium">{program.name}</p>
        <p className="text-sm text-muted">
          {program.phase_name ?? 'Phase'} — week {program.phase_week}/{program.phase_total_weeks}
        </p>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Workout days</h2>
        <button
          onClick={addDay}
          disabled={busy}
          className="rounded-lg bg-accent hover:bg-accent/90 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          + Add day
        </button>
      </div>

      <div className="mt-4 space-y-4">
        {days.map((day) => (
          <div key={day.id} className="rounded-xl border border-card2 bg-card p-5 shadow-sm shadow-black/20">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-foreground">{day.day_name}</h3>
              <button onClick={() => removeDay(day.id)} className="text-sm text-danger">
                Remove day
              </button>
            </div>

            {!day.is_rest && (
              <>
                <table className="mt-4 w-full text-left text-sm">
                  <thead>
                    <tr className="text-muted">
                      <th className="pb-2 font-normal">Exercise</th>
                      <th className="pb-2 font-normal">Sets</th>
                      <th className="pb-2 font-normal">Reps</th>
                      <th className="pb-2 font-normal">RIR</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {day.exercises.map((ex) => (
                      <tr key={ex.id} className="border-t border-card2 text-foreground">
                        <td className="py-2">
                          <div className="flex items-center gap-2">
                            {ex.image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={ex.image_url}
                                alt=""
                                className="h-8 w-8 flex-shrink-0 rounded-md object-cover bg-card2"
                              />
                            ) : (
                              <div className="h-8 w-8 flex-shrink-0 rounded-md bg-card2" />
                            )}
                            {ex.name}
                          </div>
                        </td>
                        <td className="py-2">{ex.target_sets}</td>
                        <td className="py-2">{ex.rep_range}</td>
                        <td className="py-2">{ex.rir_target ?? '—'}</td>
                        <td className="py-2 text-right">
                          <button
                            onClick={() => removeExercise(day.id, ex.id)}
                            className="text-danger"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <form
                  action={(fd) => addExercise(day.id, fd)}
                  className="mt-4 flex flex-wrap items-end gap-2"
                >
                  <ExercisePicker
                    onSelect={({ image_url, primary_muscle }) =>
                      setPendingMeta((prev) => ({ ...prev, [day.id]: { image_url, primary_muscle } }))
                    }
                  />
                  <div>
                    <label className="block text-xs text-muted">Sets</label>
                    <input
                      name="target_sets"
                      type="number"
                      min={1}
                      defaultValue={3}
                      className="mt-1 w-16 rounded-lg border border-card2 bg-card2 px-2 py-1.5 text-sm text-foreground outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted">Rep range</label>
                    <input
                      name="rep_range"
                      placeholder="8-12"
                      className="mt-1 w-20 rounded-lg border border-card2 bg-card2 px-2 py-1.5 text-sm text-foreground outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted">RIR</label>
                    <input
                      name="rir_target"
                      placeholder="1-2"
                      className="mt-1 w-16 rounded-lg border border-card2 bg-card2 px-2 py-1.5 text-sm text-foreground outline-none focus:border-accent"
                    />
                  </div>
                  <button
                    disabled={busy}
                    className="rounded-lg border border-accent px-3 py-1.5 text-sm font-medium text-accent disabled:opacity-60"
                  >
                    + Add exercise
                  </button>
                </form>

                {day.exercises.length > 0 && (
                  <div className="mt-4">
                    <RoutineSummary exercises={day.exercises} />
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
