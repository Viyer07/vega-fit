import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ClientTabs from './ClientTabs'

function toDateStr(d: Date) {
  return d.toISOString().split('T')[0]
}

// Monday-based weekday index: 0=Mon ... 6=Sun
function mondayIndex(d: Date) {
  return (d.getDay() + 6) % 7
}

export default async function ClientDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, goal_weight')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'trainer') redirect('/trainer')

  const { data: program } = await supabase
    .from('programs')
    .select('id, name, phase_name, phase_week, phase_total_weeks, calorie_target, cardio_target, meal_plan')
    .eq('client_id', user.id)
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
      image_url: string | null
      primary_muscle: string | null
    }[]
  }[] = []

  if (program) {
    const { data: dayRows } = await supabase
      .from('workout_days')
      .select(
        'id, day_order, day_name, is_rest, exercises(id, exercise_order, name, target_sets, rep_range, rir_target, notes, image_url, primary_muscle)'
      )
      .eq('program_id', program.id)
      .order('day_order')

    days = (dayRows ?? []).map((d) => ({
      ...d,
      exercises: (d.exercises ?? []).sort((a, b) => a.exercise_order - b.exercise_order),
    }))
  }

  // Bodyweight logs (full current year, for the calendar + heatmap)
  const yearStart = new Date(new Date().getFullYear(), 0, 1)
  const { data: bwLogs } = await supabase
    .from('bodyweight_logs')
    .select('logged_date, weight')
    .eq('client_id', user.id)
    .gte('logged_date', toDateStr(yearStart))
    .order('logged_date', { ascending: false })

  // Nutrition/cardio check-ins (last 45 days)
  const fortyFiveDaysAgo = new Date()
  fortyFiveDaysAgo.setDate(fortyFiveDaysAgo.getDate() - 45)
  const { data: checkinRows } = await supabase
    .from('daily_checkins')
    .select('logged_date, cardio_minutes, end_of_day_calories')
    .eq('client_id', user.id)
    .gte('logged_date', toDateStr(fortyFiveDaysAgo))
    .order('logged_date', { ascending: false })

  // Workout log dates (last 60 days) — for streak + week strip
  const sixtyDaysAgo = new Date()
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
  const { data: workoutLogRows } = await supabase
    .from('workout_logs')
    .select('id, logged_date, finished_at')
    .eq('client_id', user.id)
    .gte('logged_date', toDateStr(sixtyDaysAgo))
    .order('logged_date', { ascending: false })

  const loggedDates = new Set((workoutLogRows ?? []).map((w) => w.logged_date))

  // Best weight per exercise (for lift progress chart)
  const { data: setLogRows } = await supabase
    .from('set_logs')
    .select(
      'exercise_id, weight, is_pr, workout_logs!inner(client_id, finished_at), exercises!inner(name)'
    )
    .eq('workout_logs.client_id', user.id)
    .not('weight', 'is', null)

  const bestMap: Record<string, { name: string; weight: number; is_pr: boolean }> = {}
  const prEvents: { name: string; weight: number; date: string | null }[] = []
  for (const row of setLogRows ?? []) {
    const ex = row.exercises as unknown as { name: string }
    const wl = row.workout_logs as unknown as { finished_at: string | null }
    const w = Number(row.weight)
    const existing = bestMap[row.exercise_id]
    if (!existing || w > existing.weight) {
      bestMap[row.exercise_id] = { name: ex.name, weight: w, is_pr: row.is_pr }
    }
    if (row.is_pr) prEvents.push({ name: ex.name, weight: w, date: wl.finished_at })
  }
  const prData = Object.values(bestMap).sort((a, b) => b.weight - a.weight)
  const recentPrs = prEvents
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
    .slice(0, 5)

  // This week's Mon-Sun strip
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const monday = new Date(today)
  monday.setDate(today.getDate() - mondayIndex(today))
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })

  const weekStrip = weekDates.map((d) => {
    const dateStr = toDateStr(d)
    const mappedDay = days.length > 0 ? days[mondayIndex(d) % days.length] : null
    const isToday = dateStr === toDateStr(today)
    const done = loggedDates.has(dateStr)
    return {
      dateStr,
      label: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dayName: mappedDay?.is_rest ? 'Rest' : mappedDay?.day_name ?? '—',
      isRest: !!mappedDay?.is_rest,
      isToday,
      done,
    }
  })

  const workoutsThisWeek = weekStrip.filter((w) => w.done).length

  // Day streak: consecutive days backward from today counting as "kept"
  // if a workout was logged, or the mapped day for that date is a rest day.
  let streak = 0
  if (days.length > 0) {
    for (let i = 0; i < 60; i++) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      const dateStr = toDateStr(d)
      const mappedDay = days[mondayIndex(d) % days.length]
      const kept = loggedDates.has(dateStr) || mappedDay?.is_rest
      if (i === 0 && !loggedDates.has(dateStr) && !mappedDay?.is_rest) {
        // today not done yet and not a rest day — don't break the streak,
        // just don't count today either
        continue
      }
      if (!kept) break
      streak++
    }
  }

  const todayMappedDay = days.length > 0 ? days[mondayIndex(today) % days.length] : null

  // Recent logged workouts (with sets) for the History tab
  const { data: historyRows } = await supabase
    .from('workout_logs')
    .select(
      'id, logged_date, finished_at, workout_days(day_name), set_logs(id, set_number, weight, reps, rir, machine_notes, is_pr, exercises(id, name))'
    )
    .eq('client_id', user.id)
    .order('finished_at', { ascending: false })
    .limit(20)

  const workoutHistory = (historyRows ?? []).map((wl) => {
    const day = Array.isArray(wl.workout_days) ? wl.workout_days[0] : wl.workout_days
    const sets = (wl.set_logs ?? []).map((s) => {
      const ex = Array.isArray(s.exercises) ? s.exercises[0] : s.exercises
      return {
        id: s.id,
        set_number: s.set_number,
        weight: s.weight,
        reps: s.reps,
        rir: s.rir,
        machine_notes: s.machine_notes,
        is_pr: s.is_pr,
        exerciseId: ex?.id ?? '',
        exerciseName: ex?.name ?? 'Unknown',
      }
    })
    return {
      id: wl.id,
      dayName: day?.day_name ?? 'Workout',
      finishedAt: wl.finished_at,
      sets,
    }
  })

  return (
    <ClientTabs
      fullName={profile?.full_name ?? 'there'}
      goalWeight={profile?.goal_weight ?? null}
      program={program ?? null}
      days={days}
      streak={streak}
      workoutsThisWeek={workoutsThisWeek}
      weekStrip={weekStrip}
      todayMappedDay={todayMappedDay}
      bodyweightLogs={bwLogs ?? []}
      prData={prData}
      recentPrs={recentPrs}
      workoutHistory={workoutHistory}
      nutritionPlan={{
        calorie_target: program?.calorie_target ?? null,
        cardio_target: program?.cardio_target ?? null,
        meal_plan: (program?.meal_plan as string[] | null) ?? null,
      }}
      checkins={checkinRows ?? []}
    />
  )
}
