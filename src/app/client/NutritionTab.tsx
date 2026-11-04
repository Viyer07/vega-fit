'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  dayTotals,
  localDateStr,
  type Checkin,
  type MealLog,
  type Targets,
} from '@/lib/nutrition'

type BwLog = { logged_date: string; weight: number }

function numOrNull(v: string) {
  return v.trim() === '' ? null : Number(v)
}

function str(v: number | null | undefined) {
  return v != null ? String(v) : ''
}

const inputClass =
  'mt-1 w-full rounded-lg border border-card2 bg-card2 px-3 py-2 text-sm text-foreground outline-none focus:border-accent'

export default function NutritionTab({
  plan,
  checkins,
  mealLogs,
  bodyweightLogs,
}: {
  plan: Targets
  checkins: Checkin[]
  mealLogs: MealLog[]
  bodyweightLogs: BwLog[]
}) {
  const router = useRouter()
  const supabase = createClient()
  const todayStr = useMemo(() => localDateStr(new Date()), [])
  const minDate = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - 45)
    return localDateStr(d)
  }, [])

  const [date, setDate] = useState(todayStr)
  const [checkinMap, setCheckinMap] = useState<Record<string, Checkin>>(() =>
    Object.fromEntries(checkins.map((c) => [c.logged_date, c]))
  )
  const [weightMap, setWeightMap] = useState<Record<string, number>>(() =>
    Object.fromEntries(bodyweightLogs.map((l) => [l.logged_date, Number(l.weight)]))
  )
  const [mealMap, setMealMap] = useState<Record<string, MealLog[]>>(() => {
    const map: Record<string, MealLog[]> = {}
    for (const m of mealLogs) (map[m.logged_date] ??= []).push(m)
    return map
  })

  // End-of-day form
  const loadDay = (d: string) => {
    const c = checkinMap[d]
    return {
      weight: str(weightMap[d]),
      cardio: str(c?.cardio_minutes),
      kcal: str(c?.end_of_day_calories),
      protein: str(c?.end_of_day_protein),
      carbs: str(c?.end_of_day_carbs),
      fat: str(c?.end_of_day_fat),
    }
  }
  const [day, setDay] = useState(() => loadDay(todayStr))
  const [daySaving, setDaySaving] = useState(false)
  const [daySaved, setDaySaved] = useState(false)
  const [dayError, setDayError] = useState<string | null>(null)

  // New-meal form
  const emptyMeal = { name: '', kcal: '', protein: '', carbs: '', fat: '' }
  const [meal, setMeal] = useState(emptyMeal)
  const [mealSaving, setMealSaving] = useState(false)
  const [mealError, setMealError] = useState<string | null>(null)

  const meals = mealMap[date] ?? []
  const totals = dayTotals(checkinMap[date], meals)

  function changeDate(d: string) {
    if (!d) return
    setDate(d)
    setDay(loadDay(d))
    setDayError(null)
    setMealError(null)
  }

  async function currentUserId() {
    const { data: { user } } = await supabase.auth.getUser()
    return user?.id ?? null
  }

  async function addMeal() {
    setMealError(null)
    const values = {
      calories: numOrNull(meal.kcal),
      protein: numOrNull(meal.protein),
      carbs: numOrNull(meal.carbs),
      fat: numOrNull(meal.fat),
    }
    if (Object.values(values).every((v) => v == null)) {
      return setMealError('Enter calories or at least one macro.')
    }
    if (Object.values(values).some((v) => v != null && (Number.isNaN(v) || v < 0))) {
      return setMealError('Values must be positive numbers.')
    }
    setMealSaving(true)
    const userId = await currentUserId()
    if (!userId) {
      setMealSaving(false)
      return setMealError('Not logged in.')
    }
    const { data, error } = await supabase
      .from('meal_logs')
      .insert({
        client_id: userId,
        logged_date: date,
        meal_number: meals.length + 1,
        name: meal.name.trim() || null,
        ...values,
      })
      .select('id, logged_date, meal_number, name, calories, protein, carbs, fat')
      .single()
    setMealSaving(false)
    if (error) return setMealError(error.message)
    setMealMap((prev) => ({ ...prev, [date]: [...(prev[date] ?? []), data] }))
    setMeal(emptyMeal)
  }

  async function deleteMeal(id: string) {
    const { error } = await supabase.from('meal_logs').delete().eq('id', id)
    if (error) return setMealError(error.message)
    setMealMap((prev) => ({ ...prev, [date]: (prev[date] ?? []).filter((m) => m.id !== id) }))
  }

  async function saveDay() {
    setDayError(null)
    setDaySaved(false)
    const w = numOrNull(day.weight)
    const fields = {
      cardio_minutes: numOrNull(day.cardio),
      end_of_day_calories: numOrNull(day.kcal),
      end_of_day_protein: numOrNull(day.protein),
      end_of_day_carbs: numOrNull(day.carbs),
      end_of_day_fat: numOrNull(day.fat),
    }
    const all = [w, ...Object.values(fields)]
    if (all.every((v) => v == null)) return setDayError('Enter at least one value.')
    if (all.some((v) => v != null && (Number.isNaN(v) || v < 0))) {
      return setDayError('Values must be positive numbers.')
    }

    setDaySaving(true)
    const userId = await currentUserId()
    if (!userId) {
      setDaySaving(false)
      return setDayError('Not logged in.')
    }

    if (w != null && w > 0) {
      const { error } = await supabase
        .from('bodyweight_logs')
        .upsert(
          { client_id: userId, logged_date: date, weight: w },
          { onConflict: 'client_id,logged_date' }
        )
      if (error) {
        setDaySaving(false)
        return setDayError(error.message)
      }
      setWeightMap((prev) => ({ ...prev, [date]: w }))
    }

    if (Object.values(fields).some((v) => v != null)) {
      const { error } = await supabase
        .from('daily_checkins')
        .upsert(
          { client_id: userId, logged_date: date, ...fields },
          { onConflict: 'client_id,logged_date' }
        )
      if (error) {
        setDaySaving(false)
        return setDayError(error.message)
      }
      setCheckinMap((prev) => ({ ...prev, [date]: { logged_date: date, ...fields } }))
    }

    setDaySaving(false)
    setDaySaved(true)
    setTimeout(() => setDaySaved(false), 1500)
    router.refresh()
  }

  const hasTargets =
    plan.calorie_target != null ||
    plan.protein_target != null ||
    plan.carbs_target != null ||
    plan.fat_target != null ||
    !!plan.cardio_target

  const macroRows: { label: string; unit: string; total: number | null; target: number | null }[] = [
    { label: 'Calories', unit: 'kcal', total: totals.calories, target: plan.calorie_target },
    { label: 'Protein', unit: 'g', total: totals.protein, target: plan.protein_target },
    { label: 'Carbs', unit: 'g', total: totals.carbs, target: plan.carbs_target },
    { label: 'Fat', unit: 'g', total: totals.fat, target: plan.fat_target },
  ]

  const recentDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - i)
    return localDateStr(d)
  })

  return (
    <div className="space-y-6">
      {hasTargets ? (
        <div className="rounded-xl border border-card2 bg-card p-5 shadow-sm shadow-black/20">
          <h2 className="font-semibold text-foreground">Your daily targets</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {macroRows.map((r) => (
              <div key={r.label} className="rounded-lg border border-card2 bg-card2 p-3 text-center">
                <p className="text-xl font-semibold text-foreground">{r.target ?? '—'}</p>
                <p className="mt-1 text-xs text-muted">
                  {r.label} {r.target != null ? `(${r.unit})` : ''}
                </p>
              </div>
            ))}
          </div>
          {plan.cardio_target && (
            <p className="mt-4 text-sm text-muted">
              Cardio: <span className="text-foreground">{plan.cardio_target}</span>
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted">
          Your trainer hasn&apos;t set nutrition targets yet. You can still log your meals below.
        </p>
      )}

      <div className="rounded-xl border border-card2 bg-card p-5 shadow-sm shadow-black/20">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-foreground">
            {date === todayStr ? "Today's food" : 'Food log'}
          </h2>
          <input
            type="date"
            value={date}
            min={minDate}
            max={todayStr}
            onChange={(e) => changeDate(e.target.value)}
            aria-label="Date"
            className="rounded-lg border border-card2 bg-card2 px-3 py-1.5 text-sm text-foreground outline-none focus:border-accent"
          />
        </div>

        <div className="mt-4 space-y-3">
          {macroRows.map((r) => {
            const pct = r.target ? Math.min(100, ((r.total ?? 0) / r.target) * 100) : 0
            const over = r.target != null && r.total != null && r.total > r.target
            return (
              <div key={r.label}>
                <div className="flex justify-between text-xs">
                  <span className="text-muted">{r.label}</span>
                  <span className="text-foreground">
                    {r.total ?? 0}
                    {r.target != null ? ` / ${r.target}` : ''} {r.unit}
                  </span>
                </div>
                {r.target != null && (
                  <div className="mt-1 h-1.5 rounded-full bg-card2">
                    <div
                      className={`h-1.5 rounded-full ${over ? 'bg-warn' : 'bg-accent'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-medium text-foreground">Meals</h3>
          {meals.length === 0 ? (
            <p className="mt-2 text-sm text-muted">No meals logged for this day yet.</p>
          ) : (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-muted">
                    <th className="pb-1 font-normal">Meal</th>
                    <th className="pb-1 font-normal">Cals</th>
                    <th className="pb-1 font-normal">Protein</th>
                    <th className="pb-1 font-normal">Carbs</th>
                    <th className="pb-1 font-normal">Fat</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {meals.map((m, i) => (
                    <tr key={m.id} className="border-t border-card2 text-foreground">
                      <td className="py-2">{m.name || `Meal ${i + 1}`}</td>
                      <td className="py-2">{m.calories ?? '—'}</td>
                      <td className="py-2">{m.protein != null ? `${m.protein}g` : '—'}</td>
                      <td className="py-2">{m.carbs != null ? `${m.carbs}g` : '—'}</td>
                      <td className="py-2">{m.fat != null ? `${m.fat}g` : '—'}</td>
                      <td className="py-2 text-right">
                        <button
                          onClick={() => deleteMeal(m.id)}
                          aria-label="Delete meal"
                          className="text-danger"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-end gap-2">
            <div className="min-w-[140px] flex-1">
              <label className="block text-xs text-muted">Meal name (optional)</label>
              <input
                value={meal.name}
                onChange={(e) => setMeal({ ...meal, name: e.target.value })}
                placeholder={`Meal ${meals.length + 1}`}
                className={inputClass}
              />
            </div>
            {(
              [
                ['kcal', 'Cals'],
                ['protein', 'Protein (g)'],
                ['carbs', 'Carbs (g)'],
                ['fat', 'Fat (g)'],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="w-24">
                <label className="block text-xs text-muted">{label}</label>
                <input
                  type="number"
                  min={0}
                  value={meal[key]}
                  onChange={(e) => setMeal({ ...meal, [key]: e.target.value })}
                  className={inputClass}
                />
              </div>
            ))}
            <button
              onClick={addMeal}
              disabled={mealSaving}
              className="rounded-lg border border-accent px-4 py-2 text-sm font-medium text-accent disabled:opacity-60"
            >
              {mealSaving ? 'Adding…' : '+ Add meal'}
            </button>
          </div>
          {mealError && <p className="mt-2 text-sm text-danger">{mealError}</p>}
        </div>
      </div>

      <div className="rounded-xl border border-card2 bg-card p-5 shadow-sm shadow-black/20">
        <h2 className="font-semibold text-foreground">End of day</h2>
        <p className="mt-1 text-xs text-muted">
          Totals above come from your meals. If you skipped logging some, enter your day totals
          here and they replace the meal totals.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          {(
            [
              ['weight', 'Weight (lb)', 'w-28', '0.1'],
              ['cardio', 'Cardio (min)', 'w-28', '1'],
              ['kcal', 'Calories', 'w-28', '1'],
              ['protein', 'Protein (g)', 'w-28', '1'],
              ['carbs', 'Carbs (g)', 'w-28', '1'],
              ['fat', 'Fat (g)', 'w-28', '1'],
            ] as const
          ).map(([key, label, width, step]) => (
            <div key={key} className={width}>
              <label className="block text-xs text-muted">{label}</label>
              <input
                type="number"
                min={0}
                step={step}
                value={day[key]}
                onChange={(e) => setDay({ ...day, [key]: e.target.value })}
                className={inputClass}
              />
            </div>
          ))}
          <button
            onClick={saveDay}
            disabled={daySaving}
            className="rounded-lg bg-accent hover:bg-accent/90 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {daySaving ? 'Saving…' : daySaved ? 'Saved!' : 'Save day'}
          </button>
        </div>
        {dayError && <p className="mt-3 text-sm text-danger">{dayError}</p>}
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
                <th className="pb-2 font-normal">Cals</th>
                <th className="pb-2 font-normal">P</th>
                <th className="pb-2 font-normal">C</th>
                <th className="pb-2 font-normal">F</th>
                <th className="pb-2 font-normal">vs target</th>
              </tr>
            </thead>
            <tbody>
              {recentDays.map((d) => {
                const c = checkinMap[d]
                const t = dayTotals(c, mealMap[d] ?? [])
                const delta =
                  t.calories != null && plan.calorie_target != null
                    ? t.calories - plan.calorie_target
                    : null
                return (
                  <tr key={d} className="border-t border-card2 text-foreground">
                    <td className="py-2 text-muted">{d.slice(5)}</td>
                    <td className="py-2">{weightMap[d] != null ? `${weightMap[d]} lb` : '—'}</td>
                    <td className="py-2">
                      {c?.cardio_minutes != null ? `${c.cardio_minutes} min` : '—'}
                    </td>
                    <td className="py-2">{t.calories ?? '—'}</td>
                    <td className="py-2">{t.protein ?? '—'}</td>
                    <td className="py-2">{t.carbs ?? '—'}</td>
                    <td className="py-2">{t.fat ?? '—'}</td>
                    <td className="py-2">{delta == null ? '—' : `${delta > 0 ? '+' : ''}${delta}`}</td>
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
