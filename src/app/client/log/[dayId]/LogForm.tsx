'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Exercise = {
  id: string
  name: string
  target_sets: number
  rep_range: string
  rir_target: string | null
  image_url?: string | null
}

type SetEntry = { weight: string; reps: string; rir: string; notes: string }

export default function LogForm({
  dayId,
  exercises,
  bestWeights,
}: {
  dayId: string
  exercises: Exercise[]
  bestWeights: Record<string, number>
}) {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [prHit, setPrHit] = useState<string[]>([])

  const [entries, setEntries] = useState<Record<string, SetEntry[]>>(() => {
    const initial: Record<string, SetEntry[]> = {}
    for (const ex of exercises) {
      initial[ex.id] = Array.from({ length: ex.target_sets }, () => ({
        weight: '',
        reps: '',
        rir: '',
        notes: '',
      }))
    }
    return initial
  })

  function updateSet(exerciseId: string, index: number, field: keyof SetEntry, value: string) {
    setEntries((prev) => {
      const next = { ...prev }
      const sets = [...next[exerciseId]]
      sets[index] = { ...sets[index], [field]: value }
      next[exerciseId] = sets
      return next
    })
  }

  async function handleSave() {
    setSaving(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Not logged in.')
      setSaving(false)
      return
    }

    const { data: workoutLog, error: workoutLogError } = await supabase
      .from('workout_logs')
      .insert({ client_id: user.id, workout_day_id: dayId, finished_at: new Date().toISOString() })
      .select('id')
      .single()

    if (workoutLogError) {
      setError(workoutLogError.message)
      setSaving(false)
      return
    }

    const rowsToInsert: {
      workout_log_id: string
      exercise_id: string
      set_number: number
      weight: number | null
      reps: number | null
      rir: number | null
      machine_notes: string | null
      is_pr: boolean
    }[] = []

    const newPrNames: string[] = []
    const runningBest = { ...bestWeights }

    for (const ex of exercises) {
      const sets = entries[ex.id] ?? []
      sets.forEach((set, i) => {
        if (!set.weight && !set.reps) return
        const weight = set.weight ? Number(set.weight) : null
        const isPr = weight != null && weight > (runningBest[ex.id] ?? 0)
        if (isPr) {
          runningBest[ex.id] = weight!
          if (!newPrNames.includes(ex.name)) newPrNames.push(ex.name)
        }
        rowsToInsert.push({
          workout_log_id: workoutLog.id,
          exercise_id: ex.id,
          set_number: i + 1,
          weight,
          reps: set.reps ? Number(set.reps) : null,
          rir: set.rir ? Number(set.rir) : null,
          machine_notes: set.notes || null,
          is_pr: isPr,
        })
      })
    }

    if (rowsToInsert.length === 0) {
      setError('Log at least one set before saving.')
      setSaving(false)
      return
    }

    const { error: setLogError } = await supabase.from('set_logs').insert(rowsToInsert)

    setSaving(false)
    if (setLogError) {
      setError(setLogError.message)
      return
    }

    setPrHit(newPrNames)
    setSaved(true)
  }

  if (saved) {
    return (
      <div className="mt-8 rounded-xl border border-card2 bg-card p-6">
        <p className="text-lg font-medium text-foreground">Workout logged.</p>
        {prHit.length > 0 && (
          <p className="mt-2 text-gold">
            New PR{prHit.length > 1 ? 's' : ''}: {prHit.join(', ')} 🏆
          </p>
        )}
        <button
          onClick={() => router.push('/client')}
          className="mt-4 rounded-lg bg-accent hover:bg-accent/90 px-4 py-2 text-sm font-medium text-white"
        >
          Back to dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="mt-8 space-y-6">
      {exercises.map((ex) => (
        <div key={ex.id} className="rounded-xl border border-card2 bg-card p-5 shadow-sm shadow-black/20">
          <div className="flex items-baseline justify-between">
            <div className="flex items-center gap-3">
              {ex.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={ex.image_url}
                  alt=""
                  className="h-12 w-12 flex-shrink-0 rounded-md object-cover bg-card2"
                />
              ) : (
                <div className="h-12 w-12 flex-shrink-0 rounded-md bg-card2" />
              )}
              <h3 className="font-medium text-foreground">{ex.name}</h3>
            </div>
            <span className="text-xs text-muted">
              Target: {ex.target_sets} × {ex.rep_range}
              {ex.rir_target ? ` @ RIR ${ex.rir_target}` : ''}
            </span>
          </div>
          {bestWeights[ex.id] != null && (
            <p className="mt-1 text-xs text-muted">Current best: {bestWeights[ex.id]} lb</p>
          )}

          <table className="mt-4 w-full text-left text-sm">
            <thead>
              <tr className="text-muted">
                <th className="pb-2 font-normal">Set</th>
                <th className="pb-2 font-normal">Weight</th>
                <th className="pb-2 font-normal">Reps</th>
                <th className="pb-2 font-normal">RIR</th>
                <th className="pb-2 font-normal">Machine / notes</th>
              </tr>
            </thead>
            <tbody>
              {entries[ex.id]?.map((set, i) => (
                <tr key={i} className="border-t border-card2">
                  <td className="py-2 text-muted">{i + 1}</td>
                  <td className="py-2 pr-2">
                    <input
                      type="number"
                      value={set.weight}
                      onChange={(e) => updateSet(ex.id, i, 'weight', e.target.value)}
                      className="w-20 rounded-lg border border-card2 bg-card2 px-2 py-1.5 text-foreground outline-none focus:border-accent"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      type="number"
                      value={set.reps}
                      onChange={(e) => updateSet(ex.id, i, 'reps', e.target.value)}
                      className="w-16 rounded-lg border border-card2 bg-card2 px-2 py-1.5 text-foreground outline-none focus:border-accent"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      type="number"
                      value={set.rir}
                      onChange={(e) => updateSet(ex.id, i, 'rir', e.target.value)}
                      className="w-14 rounded-lg border border-card2 bg-card2 px-2 py-1.5 text-foreground outline-none focus:border-accent"
                    />
                  </td>
                  <td className="py-2">
                    <input
                      value={set.notes}
                      onChange={(e) => updateSet(ex.id, i, 'notes', e.target.value)}
                      placeholder="e.g. seat 4"
                      className="w-full rounded-lg border border-card2 bg-card2 px-2 py-1.5 text-foreground outline-none focus:border-accent"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {error && <p className="text-sm text-danger">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full rounded-lg bg-accent hover:bg-accent/90 py-3 font-medium text-white disabled:opacity-60"
      >
        {saving ? 'Saving...' : 'Save workout'}
      </button>
    </div>
  )
}
