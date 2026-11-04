export type Macros = {
  calories: number | null
  protein: number | null
  carbs: number | null
  fat: number | null
}

export type Targets = {
  calorie_target: number | null
  protein_target: number | null
  carbs_target: number | null
  fat_target: number | null
  cardio_target: string | null
}

export type MealLog = {
  id: string
  logged_date: string
  meal_number: number
  name: string | null
  calories: number | null
  protein: number | null
  carbs: number | null
  fat: number | null
}

export type Checkin = {
  logged_date: string
  cardio_minutes: number | null
  cardio_type: string | null
  cardio_intensity: string | null
  end_of_day_calories: number | null
  end_of_day_protein: number | null
  end_of_day_carbs: number | null
  end_of_day_fat: number | null
}

export function cardioSummary(c: Checkin | undefined) {
  if (!c) return null
  const parts = [
    c.cardio_minutes != null ? `${c.cardio_minutes} min` : null,
    c.cardio_type || null,
    c.cardio_intensity || null,
  ].filter(Boolean)
  return parts.length ? parts.join(' · ') : null
}

// Local-date string. The app's other widgets use UTC, which flips to "tomorrow" in the evening.
export function localDateStr(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function sumMeals(meals: MealLog[]): Macros {
  if (meals.length === 0) return { calories: null, protein: null, carbs: null, fat: null }
  const add = (pick: (m: MealLog) => number | null) =>
    meals.reduce((total, m) => total + (pick(m) ?? 0), 0)
  return {
    calories: add((m) => m.calories),
    protein: add((m) => m.protein),
    carbs: add((m) => m.carbs),
    fat: add((m) => m.fat),
  }
}

// A day's total: the end-of-day number the client typed if there is one, otherwise the sum of their meals.
export function dayTotals(checkin: Checkin | undefined, meals: MealLog[]): Macros {
  const fromMeals = sumMeals(meals)
  return {
    calories: checkin?.end_of_day_calories ?? fromMeals.calories,
    protein: checkin?.end_of_day_protein ?? fromMeals.protein,
    carbs: checkin?.end_of_day_carbs ?? fromMeals.carbs,
    fat: checkin?.end_of_day_fat ?? fromMeals.fat,
  }
}
