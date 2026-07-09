'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type SetLog = {
  id: string
  set_number: number
  weight: number | null
  reps: number | null
  rir: number | null
  machine_notes: string | null
  is_pr: boolean
  exerciseId: string
  exerciseName: string
}

type WorkoutLog = {
  id: string
  dayName: string
  finishedAt: string | null
  sets: SetLog[]
}

export default function WorkoutHistory({ initial }: { initial: WorkoutLog[] }) {
  const supabase = createClient()
  const [logs, setLogs] = useState(initial)
  const [editingSetId, setEditingSetId] = useState<string | null>(null)
  const [draft, setDraft] = useState<{ weight: string; reps: string; rir: string; notes: string }>({
    weight: '',
    reps: '',
    rir: '',
    notes: '',
  })
  const [busy, setBusy] = useState(false)

  function startEdit(s: SetLog) {
    setEditingSetId(s.id)
    setDraft({
      weight: s.weight != null ? String(s.weight) : '',
      reps: s.reps != null ? String(s.reps) : '',
      rir: s.rir != null ? String(s.rir) : '',
      notes: s.machine_notes ?? '',
    })
  }

  function cancelEdit() {
    setEditingSetId(null)
  }

  async function saveEdit(workoutId: string, setId: string) {
    setBusy(true)
    const { error } = await supabase
      .from('set_logs')
      .update({
        weight: draft.weight ? Number(draft.weight) : null,
        reps: draft.reps ? Number(draft.reps) : null,
        rir: draft.rir ? Number(draft.rir) : null,
        machine_notes: draft.notes || null,
      })
      .eq('id', setId)

    setBusy(false)
    if (error) return alert(error.message)

    setLogs((prev) =>
      prev.map((wl) =>
        wl.id !== workoutId
          ? wl
          : {
              ...wl,
              sets: wl.sets.map((s) =>
                s.id !== setId
                  ? s
                  : {
                      ...s,
                      weight: draft.weight ? Number(draft.weight) : null,
                      reps: draft.reps ? Number(draft.reps) : null,
                      rir: draft.rir ? Number(draft.rir) : null,
                      machine_notes: draft.notes || null,
                    }
              ),
            }
      )
    )
    setEditingSetId(null)
  }

  async function deleteSet(workoutId: string, setId: string) {
    if (!window.confirm('Delete this set?')) return
    setBusy(true)
    const { error } = await supabase.from('set_logs').delete().eq('id', setId)
    setBusy(false)
    if (error) return alert(error.message)

    setLogs((prev) =>
      prev.map((wl) =>
        wl.id !== workoutId ? wl : { ...wl, sets: wl.sets.filter((s) => s.id !== setId) }
      )
    )
  }

  async function deleteWorkout(workoutId: string) {
    if (!window.confirm('Delete this entire workout log, including all its sets?')) return
    setBusy(true)
    const { error } = await supabase.from('workout_logs').delete().eq('id', workoutId)
    setBusy(false)
    if (error) return alert(error.message)

    setLogs((prev) => prev.filter((wl) => wl.id !== workoutId))
  }

  if (logs.length === 0) {
    return <p className="text-sm text-muted">No workouts logged yet.</p>
  }

  return (
    <div className="space-y-4">
      {logs.map((wl) => {
        const grouped = groupByExercise(wl.sets)
        return (
          <div key={wl.id} className="rounded-xl border border-card2 bg-card p-5 shadow-sm shadow-black/20">
            <div className="flex items-baseline justify-between">
              <p className="font-medium text-foreground">{wl.dayName}</p>
              <div className="flex items-center gap-3">
                <p className="text-xs text-muted">{formatDateTime(wl.finishedAt)}</p>
                <button
                  onClick={() => deleteWorkout(wl.id)}
                  disabled={busy}
                  className="text-xs font-medium text-danger disabled:opacity-60"
                >
                  Delete workout
                </button>
              </div>
            </div>

            {grouped.map(({ exerciseName, sets }) => (
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
                      <th className="pb-1 font-normal" />
                    </tr>
                  </thead>
                  <tbody>
                    {sets.map((s) => {
                      const isEditing = editingSetId === s.id
                      return (
                        <tr key={s.id} className="border-t border-card2">
                          <td className="py-1.5 text-muted">{s.set_number}</td>
                          {isEditing ? (
                            <>
                              <td className="py-1.5 pr-1">
                                <input
                                  type="number"
                                  value={draft.weight}
                                  onChange={(e) => setDraft({ ...draft, weight: e.target.value })}
                                  className="w-16 rounded border border-card2 bg-card2 px-1.5 py-1 text-foreground outline-none focus:border-accent"
                                />
                              </td>
                              <td className="py-1.5 pr-1">
                                <input
                                  type="number"
                                  value={draft.reps}
                                  onChange={(e) => setDraft({ ...draft, reps: e.target.value })}
                                  className="w-14 rounded border border-card2 bg-card2 px-1.5 py-1 text-foreground outline-none focus:border-accent"
                                />
                              </td>
                              <td className="py-1.5 pr-1">
                                <input
                                  type="number"
                                  value={draft.rir}
                                  onChange={(e) => setDraft({ ...draft, rir: e.target.value })}
                                  className="w-12 rounded border border-card2 bg-card2 px-1.5 py-1 text-foreground outline-none focus:border-accent"
                                />
                              </td>
                              <td className="py-1.5 pr-1">
                                <input
                                  value={draft.notes}
                                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                                  className="w-full rounded border border-card2 bg-card2 px-1.5 py-1 text-foreground outline-none focus:border-accent"
                                />
                              </td>
                              <td className="py-1.5 text-right whitespace-nowrap">
                                <button
                                  onClick={() => saveEdit(wl.id, s.id)}
                                  disabled={busy}
                                  className="mr-2 text-accent disabled:opacity-60"
                                >
                                  Save
                                </button>
                                <button onClick={cancelEdit} className="text-muted">
                                  Cancel
                                </button>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className={`py-1.5 ${s.is_pr ? 'text-gold font-semibold' : 'text-foreground'}`}>
                                {s.weight != null ? `${s.weight} lb` : '—'}
                                {s.is_pr && ' 🏆'}
                              </td>
                              <td className="py-1.5 text-foreground">{s.reps ?? '—'}</td>
                              <td className="py-1.5 text-foreground">{s.rir ?? '—'}</td>
                              <td className="py-1.5 text-muted">{s.machine_notes ?? ''}</td>
                              <td className="py-1.5 text-right whitespace-nowrap">
                                <button
                                  onClick={() => startEdit(s)}
                                  className="mr-2 text-accent"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => deleteSet(wl.id, s.id)}
                                  disabled={busy}
                                  className="text-danger disabled:opacity-60"
                                >
                                  Delete
                                </button>
                              </td>
                            </>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

function groupByExercise(sets: SetLog[]) {
  const order: string[] = []
  const map: Record<string, SetLog[]> = {}
  for (const s of [...sets].sort((a, b) => a.set_number - b.set_number)) {
    if (!map[s.exerciseName]) {
      map[s.exerciseName] = []
      order.push(s.exerciseName)
    }
    map[s.exerciseName].push(s)
  }
  return order.map((name) => ({ exerciseName: name, sets: map[name] }))
}

function formatDateTime(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
