'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Targets } from '@/lib/nutrition'

export type NutritionPlan = Targets

function numOrNull(v: string) {
  return v.trim() ? Number(v) : null
}

export default function NutritionPlanForm({
  programId,
  initial,
}: {
  programId: string
  initial: NutritionPlan
}) {
  const supabase = createClient()
  const [calories, setCalories] = useState(initial.calorie_target?.toString() ?? '')
  const [protein, setProtein] = useState(initial.protein_target?.toString() ?? '')
  const [carbs, setCarbs] = useState(initial.carbs_target?.toString() ?? '')
  const [fat, setFat] = useState(initial.fat_target?.toString() ?? '')
  const [cardio, setCardio] = useState(initial.cardio_target ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function save() {
    setSaving(true)
    setSaved(false)
    const { error } = await supabase
      .from('programs')
      .update({
        calorie_target: numOrNull(calories),
        protein_target: numOrNull(protein),
        carbs_target: numOrNull(carbs),
        fat_target: numOrNull(fat),
        cardio_target: cardio.trim() || null,
      })
      .eq('id', programId)
    setSaving(false)
    if (error) return alert(error.message)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const fields: { label: string; value: string; set: (v: string) => void; placeholder: string }[] = [
    { label: 'Calories', value: calories, set: setCalories, placeholder: '2400' },
    { label: 'Protein (g)', value: protein, set: setProtein, placeholder: '180' },
    { label: 'Carbs (g)', value: carbs, set: setCarbs, placeholder: '250' },
    { label: 'Fat (g)', value: fat, set: setFat, placeholder: '70' },
  ]

  return (
    <div className="mt-6 rounded-xl border border-card2 bg-card p-5 shadow-sm shadow-black/20">
      <h2 className="font-semibold text-foreground">Daily nutrition &amp; cardio targets</h2>
      <p className="mt-1 text-xs text-muted">
        The client sees these on their Nutrition tab and logs each meal and their day against them.
      </p>

      <div className="mt-4 flex flex-wrap gap-4">
        {fields.map((f) => (
          <div key={f.label}>
            <label className="block text-xs text-muted">{f.label}</label>
            <input
              type="number"
              min={0}
              value={f.value}
              onChange={(e) => f.set(e.target.value)}
              placeholder={f.placeholder}
              className="mt-1 w-28 rounded-lg border border-card2 bg-card2 px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            />
          </div>
        ))}
      </div>

      <div className="mt-4">
        <label className="block text-xs text-muted">Cardio</label>
        <input
          value={cardio}
          onChange={(e) => setCardio(e.target.value)}
          placeholder="e.g. 30 min incline walk, 5x/week"
          className="mt-1 w-full max-w-md rounded-lg border border-card2 bg-card2 px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
        />
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="mt-5 rounded-lg bg-accent hover:bg-accent/90 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {saving ? 'Saving…' : saved ? 'Saved!' : 'Save targets'}
      </button>
    </div>
  )
}
