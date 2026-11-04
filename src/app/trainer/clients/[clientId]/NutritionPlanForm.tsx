'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export type NutritionPlan = {
  calorie_target: number | null
  cardio_target: string | null
  meal_plan: string[] | null
}

const MEAL_COUNT = 6

export default function NutritionPlanForm({
  programId,
  initial,
}: {
  programId: string
  initial: NutritionPlan
}) {
  const supabase = createClient()
  const [calories, setCalories] = useState(
    initial.calorie_target != null ? String(initial.calorie_target) : ''
  )
  const [cardio, setCardio] = useState(initial.cardio_target ?? '')
  const [meals, setMeals] = useState<string[]>(
    Array.from({ length: MEAL_COUNT }, (_, i) => initial.meal_plan?.[i] ?? '')
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function save() {
    setSaving(true)
    setSaved(false)
    const trimmed = meals.map((m) => m.trim())
    const { error } = await supabase
      .from('programs')
      .update({
        calorie_target: calories.trim() ? Number(calories) : null,
        cardio_target: cardio.trim() || null,
        meal_plan: trimmed.some(Boolean) ? trimmed : null,
      })
      .eq('id', programId)
    setSaving(false)
    if (error) return alert(error.message)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div className="mt-6 rounded-xl border border-card2 bg-card p-5 shadow-sm shadow-black/20">
      <h2 className="font-semibold text-foreground">Nutrition &amp; cardio plan</h2>
      <p className="mt-1 text-xs text-muted">
        Shown to the client on their Nutrition tab. They log weight, cardio, and end-of-day calories
        against it.
      </p>

      <div className="mt-4 flex flex-wrap gap-4">
        <div>
          <label className="block text-xs text-muted">Daily calories</label>
          <input
            type="number"
            min={0}
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            placeholder="e.g. 2400"
            className="mt-1 w-32 rounded-lg border border-card2 bg-card2 px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
          />
        </div>
        <div className="min-w-[220px] flex-1">
          <label className="block text-xs text-muted">Cardio</label>
          <input
            value={cardio}
            onChange={(e) => setCardio(e.target.value)}
            placeholder="e.g. 30 min incline walk, 5x/week"
            className="mt-1 w-full rounded-lg border border-card2 bg-card2 px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {meals.map((meal, i) => (
          <div key={i}>
            <label className="block text-xs text-muted">Meal {i + 1}</label>
            <input
              value={meal}
              onChange={(e) =>
                setMeals((prev) => prev.map((m, j) => (j === i ? e.target.value : m)))
              }
              placeholder={i === 0 ? 'e.g. 3 eggs, oats, banana' : ''}
              className="mt-1 w-full rounded-lg border border-card2 bg-card2 px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            />
          </div>
        ))}
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="mt-5 rounded-lg bg-accent hover:bg-accent/90 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {saving ? 'Saving…' : saved ? 'Saved!' : 'Save plan'}
      </button>
    </div>
  )
}
