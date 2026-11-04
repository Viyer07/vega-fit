'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Plan = {
  calorie_target: number | null
  cardio_target: string | null
  meal_plan: string[] | null
}
type Checkin = {
  logged_date: string
  cardio_minutes: number | null
  end_of_day_calories: number | null
}
type BwLog = { logged_date: string; weight: number }

// Local-date string (the app's other widgets use UTC, which flips to "tomorrow" in the evening)
function localDateStr(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function NutritionTab({
  plan,
  checkins,
  bodyweightLogs,
}: {
  plan: Plan
  checkins: Checkin[]
  bodyweightLogs: BwLog[]
}) {
  const router = useRouter()
  const supabase = createClient()
  const todayStr = useMemo(() => localDateStr(new Date()), [])

  const [checkinMap, setCheckinMap] = useState<Record<string, Checkin>>(() =>
    Object.fromEntries(checkins.map((c) => [c.logged_date, c]))
  )
  const [weightMap, setWeightMap] = useState<Record<string, number>>(() =>
    Object.fromEntries(bodyweightLogs.map((l) => [l.logged_date, Number(l.weight)]))
  )

  const todayCheckin = checkinMap[todayStr]
  const [weight, setWeight] = useState(
    weightMap[todayStr] != null ? String(weightMap[todayStr]) : ''
  )
  const [cardio, setCardio] = useState(
    todayCheckin?.cardio_minutes != null ? String(todayCheckin.cardio_minutes) : ''
  )
  const [calories, setCalories] = useState(
    todayCheckin?.end_of_day_calories != null ? String(todayCheckin.end_of_day_calories) : ''
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const meals = (plan.meal_plan ?? []).map((m, i) => ({ n: i + 1, text: m })).filter((m) => m.text)
  const hasPlan = plan.calorie_target != null || plan.cardio_target || meals.length > 0

  async function save() {
    setError(null)
    setSaved(false)
    const w = weight.trim() ? Number(weight) : null
    const c = cardio.trim() ? Number(cardio) : null
    const k = calories.trim() ? Number(calories) : null
    if (w == null && c == null && k == null) return setError('Enter at least one value.')
    if ([w, c, k].some((v) => v != null && (Number.isNaN(v) || v < 0))) {
      return setError('Values must be positive numbers.')
    }

    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setSaving(false)
      return setError('Not logged in.')
    }

    if (w != null && w > 0) {
      const { error: wErr } = await supabase
        .from('bodyweight_logs')
        .upsert(
          { client_id: user.id, logged_date: todayStr, weight: w },
          { onConflict: 'client_id,logged_date' }
        )
      if (wErr) {
        setSaving(false)
        return setError(wErr.message)
      }
      setWeightMap((prev) => ({ ...prev, [todayStr]: w }))
    }

    if (c != null || k != null) {
      const { error: cErr } = await supabase
        .from('daily_checkins')
        .upsert(
          {
            client_id: user.id,
            logged_date: todayStr,
            cardio_minutes: c,
            end_of_day_calories: k,
          },
          { onConflict: 'client_id,logged_date' }
        )
      if (cErr) {
        setSaving(false)
        return setError(cErr.message)
      }
      setCheckinMap((prev) => ({
        ...prev,
        [todayStr]: { logged_date: todayStr, cardio_minutes: c, end_of_day_calories: k },
      }))
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
    router.refresh()
  }

  const recentDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - i)
    return localDateStr(d)
  })

  function calorieDelta(kcal: number | null | undefined) {
    if (kcal == null || plan.calorie_target == null) return null
    return kcal - plan.calorie_target
  }

  const todayDelta = calorieDelta(calories.trim() ? Number(calories) : null)

  return (
    <div className="space-y-6">
      {hasPlan ? (
        <div className="rounded-xl border border-card2 bg-card p-5 shadow-sm shadow-black/20">
          <h2 className="font-semibold text-foreground">Your plan</h2>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-card2 bg-card2 p-3 text-center">
              <p className="text-xl font-semibold text-foreground">
                {plan.calorie_target != null ? plan.calorie_target : '—'}
              </p>
              <p className="mt-1 text-xs text-muted">Daily calories</p>
            </div>
            <div className="rounded-lg border border-card2 bg-card2 p-3 text-center">
              <p className="text-sm font-semibold text-foreground">{plan.cardio_target ?? '—'}</p>
              <p className="mt-1 text-xs text-muted">Cardio</p>
            </div>
          </div>
          {meals.length > 0 && (
            <ul className="mt-4 space-y-2">
              {meals.map((m) => (
                <li key={m.n} className="flex gap-3 text-sm">
                  <span className="w-14 flex-shrink-0 text-muted">Meal {m.n}</span>
                  <span className="text-foreground">{m.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted">
          Your trainer hasn&apos;t set a nutrition plan yet. You can still log your day below.
        </p>
      )}

      <div className="rounded-xl border border-card2 bg-card p-5 shadow-sm shadow-black/20">
        <h2 className="font-semibold text-foreground">Today&apos;s check-in</h2>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-muted">Weight (lb)</label>
            <input
              type="number"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="mt-1 w-28 rounded-lg border border-card2 bg-card2 px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-xs text-muted">Cardio (min)</label>
            <input
              type="number"
              value={cardio}
              onChange={(e) => setCardio(e.target.value)}
              className="mt-1 w-28 rounded-lg border border-card2 bg-card2 px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-xs text-muted">End-of-day calories</label>
            <input
              type="number"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              className="mt-1 w-36 rounded-lg border border-card2 bg-card2 px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            />
          </div>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-accent hover:bg-accent/90 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {saving ? 'Saving…' : saved ? 'Saved!' : 'Save'}
          </button>
        </div>
        {todayDelta != null && (
          <p className="mt-3 text-xs text-muted">
            {Math.abs(todayDelta)} kcal {todayDelta > 0 ? 'over' : 'under'} your{' '}
            {plan.calorie_target} target
          </p>
        )}
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      </div>

      <div className="rounded-xl border border-card2 bg-card p-5 shadow-sm shadow-black/20">
        <h2 className="font-semibold text-foreground">Last 7 days</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-muted">
                <th className="pb-2 font-normal">Date</th>
                <th className="pb-2 font-normal">Weight</th>
                <th className="pb-2 font-normal">Cardio</th>
                <th className="pb-2 font-normal">Calories</th>
                <th className="pb-2 font-normal">vs target</th>
              </tr>
            </thead>
            <tbody>
              {recentDays.map((d) => {
                const c = checkinMap[d]
                const delta = calorieDelta(c?.end_of_day_calories)
                return (
                  <tr key={d} className="border-t border-card2 text-foreground">
                    <td className="py-2 text-muted">{d.slice(5)}</td>
                    <td className="py-2">{weightMap[d] != null ? `${weightMap[d]} lb` : '—'}</td>
                    <td className="py-2">
                      {c?.cardio_minutes != null ? `${c.cardio_minutes} min` : '—'}
                    </td>
                    <td className="py-2">{c?.end_of_day_calories ?? '—'}</td>
                    <td className="py-2">
                      {delta == null ? '—' : `${delta > 0 ? '+' : ''}${delta}`}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
