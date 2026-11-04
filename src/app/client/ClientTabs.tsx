'use client'

import { useState } from 'react'
import Link from 'next/link'
import BodyweightWidget from './BodyweightWidget'
import WorkoutHistory from './WorkoutHistory'
import RoutineSummary from '@/app/RoutineSummary'
import NutritionTab from './NutritionTab'
import type { Checkin, MealLog, Targets } from '@/lib/nutrition'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'

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

type WeekStripDay = {
  dateStr: string
  label: string
  dayName: string
  isRest: boolean
  isToday: boolean
  done: boolean
}

type BwLog = { logged_date: string; weight: number }
type PREntry = { name: string; weight: number; is_pr: boolean }
type PrEvent = { name: string; weight: number; date: string | null }
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

const TABS = ['Dashboard', "Today's workout", 'Nutrition', 'Progress', 'History'] as const
type Tab = (typeof TABS)[number]

export default function ClientTabs({
  fullName,
  program,
  days,
  streak,
  workoutsThisWeek,
  weekStrip,
  todayMappedDay,
  bodyweightLogs,
  prData,
  recentPrs,
  workoutHistory,
  goalWeight,
  nutritionPlan,
  checkins,
  mealLogs,
}: {
  fullName: string
  program: Program | null
  days: Day[]
  streak: number
  workoutsThisWeek: number
  weekStrip: WeekStripDay[]
  todayMappedDay: Day | null
  bodyweightLogs: BwLog[]
  prData: PREntry[]
  recentPrs: PrEvent[]
  workoutHistory: WorkoutLog[]
  goalWeight: number | null
  nutritionPlan: Targets
  checkins: Checkin[]
  mealLogs: MealLog[]
}) {
  const [tab, setTab] = useState<Tab>('Dashboard')

  return (
    <main className="min-h-screen bg-background px-6 py-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-semibold text-foreground">Welcome, {fullName}</h1>

        <div className="mt-6 flex gap-2 border-b border-card2">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition ${
                tab === t
                  ? 'border-accent text-accent'
                  : 'border-transparent text-muted hover:text-foreground'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === 'Dashboard' && (
            <DashboardTab
              program={program}
              streak={streak}
              workoutsThisWeek={workoutsThisWeek}
              totalDays={days.length}
              weekStrip={weekStrip}
              bodyweightLogs={bodyweightLogs}
              recentPrs={recentPrs}
            />
          )}
          {tab === "Today's workout" && (
            <TodayTab program={program} todayMappedDay={todayMappedDay} />
          )}
          {tab === 'Progress' && (
            <ProgressTab bodyweightLogs={bodyweightLogs} prData={prData} goalWeight={goalWeight} />
          )}
          {tab === 'Nutrition' && (
            <NutritionTab
              plan={nutritionPlan}
              checkins={checkins}
              mealLogs={mealLogs}
              bodyweightLogs={bodyweightLogs}
            />
          )}
          {tab === 'History' && <WorkoutHistory initial={workoutHistory} />}
        </div>
      </div>
    </main>
  )
}

function StatCard({ icon, value, label }: { icon?: string; value: string; label: string }) {
  return (
    <div className="rounded-xl border border-card2 bg-card p-4 text-center">
      <p className="text-xl font-semibold text-foreground">
        {icon && <span className="mr-1">{icon}</span>}
        {value}
      </p>
      <p className="mt-1 text-xs text-muted">{label}</p>
    </div>
  )
}

function DashboardTab({
  program,
  streak,
  workoutsThisWeek,
  totalDays,
  weekStrip,
  bodyweightLogs,
  recentPrs,
}: {
  program: Program | null
  streak: number
  workoutsThisWeek: number
  totalDays: number
  weekStrip: WeekStripDay[]
  bodyweightLogs: BwLog[]
  recentPrs: PrEvent[]
}) {
  const [showPrs, setShowPrs] = useState(false)
  const progressPct = program ? Math.min(100, (program.phase_week / program.phase_total_weeks) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <StatCard icon="🔥" value={String(streak)} label="Day streak" />
        <StatCard
          value={program ? `Week ${program.phase_week}` : '—'}
          label={program ? program.phase_name ?? 'Phase' : 'No program yet'}
        />
        <StatCard value={`${workoutsThisWeek}/${totalDays || '—'}`} label="Workouts this week" />
      </div>

      {program && (
        <div className="rounded-xl border border-card2 bg-card p-5 shadow-sm shadow-black/20">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-foreground">
                {program.phase_name ?? 'Phase'} — {program.name}
              </p>
              <p className="text-sm text-muted">Week {program.phase_week} of {program.phase_total_weeks}</p>
            </div>
            <div className="w-32 text-right">
              <p className="text-xs text-muted">Progress</p>
              <div className="mt-2 h-1.5 rounded-full bg-card2">
                <div
                  className="h-1.5 rounded-full bg-accent"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">This week</h2>
        <div className="grid grid-cols-7 gap-2">
          {weekStrip.map((d) => (
            <div
              key={d.dateStr}
              className={`rounded-xl border p-3 text-center ${
                d.isToday ? 'border-accent bg-accent/10' : 'border-card2 bg-card'
              }`}
            >
              <p className="text-xs text-muted">{d.label}</p>
              <p className="mt-2 text-lg">
                {d.done ? '✅' : d.isToday ? '🔥' : d.isRest ? '—' : '·'}
              </p>
              <p className="mt-1 truncate text-[11px] text-muted">{d.dayName}</p>
            </div>
          ))}
        </div>
      </div>

      {bodyweightLogs.length >= 1 && (
        <div className="rounded-xl border border-card2 bg-card p-5 shadow-sm shadow-black/20">
          <h2 className="mb-4 font-semibold text-foreground">Bodyweight trend</h2>
          <WeightChart logs={bodyweightLogs} />
        </div>
      )}

      <div className="rounded-xl border border-card2 bg-card p-5 shadow-sm shadow-black/20">
        <button
          onClick={() => setShowPrs((s) => !s)}
          className="flex w-full items-center justify-between text-xs font-medium uppercase tracking-wide text-muted"
        >
          Recent PRs
          <span>{showPrs ? '▲' : '▼'}</span>
        </button>
        {showPrs && (
          <div className="mt-4 space-y-2">
            {recentPrs.length === 0 ? (
              <p className="text-sm text-muted">No PRs yet — get after it.</p>
            ) : (
              recentPrs.map((pr, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{pr.name}</span>
                  <span className="font-medium text-gold">{pr.weight} lb 🏆</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function TodayTab({ program, todayMappedDay }: { program: Program | null; todayMappedDay: Day | null }) {
  if (!program) {
    return <p className="text-muted">Your trainer hasn&apos;t built your program yet. Check back soon.</p>
  }

  if (!todayMappedDay) {
    return <p className="text-muted">No workout days added yet.</p>
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-card2 bg-card p-5 shadow-sm shadow-black/20">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">{todayMappedDay.day_name}</h2>
          {!todayMappedDay.is_rest && todayMappedDay.exercises.length > 0 && (
            <Link
              href={`/client/log/${todayMappedDay.id}`}
              className="rounded-lg bg-accent hover:bg-accent/90 px-4 py-2 text-sm font-medium text-white"
            >
              Log this workout
            </Link>
          )}
        </div>

        {todayMappedDay.is_rest ? (
          <p className="mt-4 text-sm text-muted">Rest day — recover up.</p>
        ) : todayMappedDay.exercises.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No exercises added yet.</p>
        ) : (
          <table className="mt-4 w-full text-left text-sm">
            <thead>
              <tr className="text-muted">
                <th className="pb-2 font-normal">Exercise</th>
                <th className="pb-2 font-normal">Sets</th>
                <th className="pb-2 font-normal">Reps</th>
                <th className="pb-2 font-normal">RIR</th>
              </tr>
            </thead>
            <tbody>
              {todayMappedDay.exercises.map((ex) => (
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
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!todayMappedDay.is_rest && todayMappedDay.exercises.length > 0 && (
        <RoutineSummary exercises={todayMappedDay.exercises} />
      )}
    </div>
  )
}

function ProgressTab({
  bodyweightLogs,
  prData,
  goalWeight,
}: {
  bodyweightLogs: BwLog[]
  prData: PREntry[]
  goalWeight: number | null
}) {
  const [mode, setMode] = useState<'bodyweight' | 'lifts'>('bodyweight')

  const sorted = [...bodyweightLogs].sort((a, b) => a.logged_date.localeCompare(b.logged_date))
  const current = sorted.length > 0 ? sorted[sorted.length - 1].weight : null
  const last7 = sorted.slice(-7)
  const avg7 = last7.length > 0 ? last7.reduce((s, l) => s + Number(l.weight), 0) / last7.length : null
  const first7 = sorted.slice(0, 7)
  const changeSince =
    first7.length > 0 && current != null ? current - Number(first7[0].weight) : null

  const startWeight = sorted.length > 0 ? Number(sorted[0].weight) : null
  let goalProgressPct: number | null = null
  if (goalWeight != null && avg7 != null && startWeight != null) {
    const totalDelta = goalWeight - startWeight
    if (Math.abs(totalDelta) < 0.01) {
      goalProgressPct = 100
    } else {
      const progressed = avg7 - startWeight
      goalProgressPct = Math.max(0, Math.min(100, (progressed / totalDelta) * 100))
    }
  }

  return (
    <div className="space-y-6">
      <div className="inline-flex rounded-lg border border-card2 bg-card p-1">
        <button
          onClick={() => setMode('bodyweight')}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
            mode === 'bodyweight' ? 'bg-accent text-white' : 'text-muted'
          }`}
        >
          Bodyweight
        </button>
        <button
          onClick={() => setMode('lifts')}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
            mode === 'lifts' ? 'bg-accent text-white' : 'text-muted'
          }`}
        >
          Lift progress
        </button>
      </div>

      {mode === 'bodyweight' ? (
        <>
          <div className="grid grid-cols-3 gap-4">
            <StatCard
              value={changeSince != null ? `${changeSince >= 0 ? '+' : ''}${changeSince.toFixed(1)}` : '—'}
              label="lbs change (7 entries)"
            />
            <StatCard value={current != null ? `${current}` : '—'} label="Current (lbs)" />
            <StatCard value={avg7 != null ? avg7.toFixed(1) : '—'} label="7-day avg" />
          </div>

          {goalWeight != null && (
            <div className="rounded-xl border border-card2 bg-card p-5 shadow-sm shadow-black/20">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-foreground">Goal progress</h2>
                <p className="text-sm text-muted">
                  Goal: <span className="text-foreground">{goalWeight} lb</span>
                </p>
              </div>
              {goalProgressPct != null ? (
                <>
                  <div className="mt-3 h-2.5 rounded-full bg-card2">
                    <div
                      className="h-2.5 rounded-full bg-accent"
                      style={{ width: `${goalProgressPct}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-muted">
                    {goalProgressPct.toFixed(0)}% of the way there (based on your 7-day average)
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm text-muted">
                  Log a few days of bodyweight to track progress toward your goal.
                </p>
              )}
            </div>
          )}

          {sorted.length >= 1 ? (
            <div className="rounded-xl border border-card2 bg-card p-5 shadow-sm shadow-black/20">
              <h2 className="mb-4 font-semibold text-foreground">Weight trend</h2>
              <WeightChart logs={bodyweightLogs} />
            </div>
          ) : (
            <p className="text-sm text-muted">Log a few days of bodyweight to see your trend.</p>
          )}

          <div className="rounded-xl border border-card2 bg-card p-5 shadow-sm shadow-black/20">
            <h2 className="mb-4 font-semibold text-foreground">Log today&apos;s weight</h2>
            <BodyweightWidget initial={bodyweightLogs} />
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-card2 bg-card p-5 shadow-sm shadow-black/20">
          <h2 className="mb-4 font-semibold text-foreground">Best lifts</h2>
          {prData.length === 0 ? (
            <p className="text-sm text-muted">Log some workouts to see your best lifts here.</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={Math.max(180, prData.length * 44)}>
                <BarChart data={prData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1c1f28" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#8b93a6', fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" tick={{ fill: '#8b93a6', fontSize: 12 }} width={120} />
                  <Tooltip
                    contentStyle={{ background: '#151820', border: '1px solid #1c1f28', borderRadius: 8 }}
                    labelStyle={{ color: '#8b93a6' }}
                    itemStyle={{ color: '#e8eaf0' }}
                    formatter={(v) => [`${v} lb`, 'Best']}
                  />
                  <Bar dataKey="weight" radius={[0, 4, 4, 0]}>
                    {prData.map((entry, i) => (
                      <Cell key={i} fill={entry.is_pr ? '#f0b429' : '#1d9e75'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="mt-3 flex items-center gap-2 text-xs text-muted">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-gold" /> Personal record
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function WeightChart({ logs }: { logs: BwLog[] }) {
  const sorted = [...logs].sort((a, b) => a.logged_date.localeCompare(b.logged_date))
  const data = sorted.map((l, i) => {
    const windowStart = Math.max(0, i - 6)
    const window = sorted.slice(windowStart, i + 1)
    const avg = window.reduce((s, w) => s + Number(w.weight), 0) / window.length
    return { date: formatDate(l.logged_date), weight: Number(l.weight), avg7: Number(avg.toFixed(1)) }
  })

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1c1f28" />
        <XAxis dataKey="date" tick={{ fill: '#8b93a6', fontSize: 12 }} />
        <YAxis tick={{ fill: '#8b93a6', fontSize: 12 }} domain={['auto', 'auto']} width={40} />
        <Tooltip
          contentStyle={{ background: '#151820', border: '1px solid #1c1f28', borderRadius: 8 }}
          labelStyle={{ color: '#8b93a6' }}
          itemStyle={{ color: '#e8eaf0' }}
        />
        <Line
          type="monotone"
          dataKey="weight"
          name="Daily"
          stroke="#1d9e75"
          strokeWidth={2}
          dot={{ fill: '#1d9e75', r: 3 }}
          activeDot={{ r: 5 }}
        />
        <Line
          type="monotone"
          dataKey="avg7"
          name="7-day avg"
          stroke="#7c7ee8"
          strokeWidth={2}
          strokeDasharray="5 4"
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

function formatDate(iso: string) {
  const [, m, d] = iso.split('-')
  return `${parseInt(m)}/${parseInt(d)}`
}
