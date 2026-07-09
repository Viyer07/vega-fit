'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function GoalWeightForm({
  clientId,
  initialGoalWeight,
}: {
  clientId: string
  initialGoalWeight: number | null
}) {
  const supabase = createClient()
  const [goalWeight, setGoalWeight] = useState(
    initialGoalWeight != null ? String(initialGoalWeight) : ''
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function save() {
    setSaving(true)
    setSaved(false)
    const value = goalWeight.trim() ? Number(goalWeight) : null
    const { error } = await supabase
      .from('profiles')
      .update({ goal_weight: value })
      .eq('id', clientId)
    setSaving(false)
    if (error) return alert(error.message)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div className="rounded-xl border border-card2 bg-card p-5 shadow-sm shadow-black/20">
      <p className="text-sm text-muted">Goal bodyweight</p>
      <div className="mt-2 flex items-center gap-2">
        <input
          type="number"
          step="0.1"
          value={goalWeight}
          onChange={(e) => setGoalWeight(e.target.value)}
          placeholder="e.g. 175"
          className="w-32 rounded-lg border border-card2 bg-card2 px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
        />
        <span className="text-sm text-muted">lb</span>
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-accent hover:bg-accent/90 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save'}
        </button>
      </div>
    </div>
  )
}
