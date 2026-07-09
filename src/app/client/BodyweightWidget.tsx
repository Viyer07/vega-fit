'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type BwLog = { logged_date: string; weight: number }

function toDateStr(d: Date) {
  return d.toISOString().split('T')[0]
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function BodyweightWidget({ initial }: { initial: BwLog[] }) {
  const supabase = createClient()
  const [logs, setLogs] = useState(initial)
  const [weight, setWeight] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])
  const todayStr = toDateStr(today)

  const [selectedDate, setSelectedDate] = useState(todayStr)
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [viewYear, setViewYear] = useState(today.getFullYear())

  const logsByDate = useMemo(() => {
    const map: Record<string, number> = {}
    for (const l of logs) map[l.logged_date] = Number(l.weight)
    return map
  }, [logs])

  const loggedToday = logsByDate[todayStr]
  const selectedEntry = logsByDate[selectedDate]

  // Streak: consecutive days ending today with a logged entry
  const streak = useMemo(() => {
    let count = 0
    for (let i = 0; i < 365; i++) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      if (logsByDate[toDateStr(d)] != null) {
        count++
      } else if (i > 0 || !logsByDate[todayStr]) {
        break
      }
    }
    return count
  }, [logsByDate, today, todayStr])

  async function save() {
    const val = parseFloat(weight)
    if (!val || val <= 0) return setError('Enter a valid weight.')
    setError(null)
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const { data, error: err } = await supabase
      .from('bodyweight_logs')
      .upsert(
        { client_id: user.id, logged_date: selectedDate, weight: val },
        { onConflict: 'client_id,logged_date' }
      )
      .select('logged_date, weight')
      .single()

    setSaving(false)
    if (err) return setError(err.message)
    setLogs((prev) => {
      const without = prev.filter((l) => l.logged_date !== selectedDate)
      return [data, ...without]
    })
    setWeight('')
  }

  function goToMonth(delta: number) {
    let m = viewMonth + delta
    let y = viewYear
    if (m < 0) { m = 11; y -= 1 }
    if (m > 11) { m = 0; y += 1 }
    setViewMonth(m)
    setViewYear(y)
  }

  // Build calendar grid (Monday-start weeks) for viewMonth/viewYear
  const calendarWeeks = useMemo(() => {
    const firstOfMonth = new Date(viewYear, viewMonth, 1)
    const startOffset = (firstOfMonth.getDay() + 6) % 7 // 0=Mon
    const gridStart = new Date(firstOfMonth)
    gridStart.setDate(firstOfMonth.getDate() - startOffset)

    const weeks: { date: Date; inMonth: boolean }[][] = []
    let cursor = new Date(gridStart)
    for (let w = 0; w < 6; w++) {
      const week: { date: Date; inMonth: boolean }[] = []
      for (let d = 0; d < 7; d++) {
        week.push({ date: new Date(cursor), inMonth: cursor.getMonth() === viewMonth })
        cursor.setDate(cursor.getDate() + 1)
      }
      weeks.push(week)
    }
    return weeks
  }, [viewMonth, viewYear])

  // Year heatmap (Mon-start weeks, current year)
  const yearGrid = useMemo(() => {
    const year = today.getFullYear()
    const jan1 = new Date(year, 0, 1)
    const startOffset = (jan1.getDay() + 6) % 7
    const gridStart = new Date(jan1)
    gridStart.setDate(jan1.getDate() - startOffset)

    const dec31 = new Date(year, 11, 31)
    const totalDays = Math.ceil((dec31.getTime() - gridStart.getTime()) / 86400000) + 1
    const totalWeeks = Math.ceil(totalDays / 7)

    const weeks: Date[][] = []
    const cursor = new Date(gridStart)
    for (let w = 0; w < totalWeeks; w++) {
      const week: Date[] = []
      for (let d = 0; d < 7; d++) {
        week.push(new Date(cursor))
        cursor.setDate(cursor.getDate() + 1)
      }
      weeks.push(week)
    }
    return weeks
  }, [today])

  return (
    <div className="rounded-xl border border-card2 bg-card p-5 shadow-sm shadow-black/20">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-foreground">Bodyweight</h2>
      </div>

      <div className="mt-3 flex items-center gap-8">
        <div>
          <p className="text-xs text-muted">Today</p>
          <p className="text-2xl font-semibold text-foreground">
            {loggedToday != null ? loggedToday : '—'}
            {loggedToday != null && <span className="ml-1 text-sm text-muted">lbs</span>}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted">Streak</p>
          <p className="text-2xl font-semibold text-foreground">
            {streak} <span className="text-sm text-muted">days</span>
          </p>
        </div>
      </div>

      {/* Month calendar */}
      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <button onClick={() => goToMonth(-1)} className="px-2 text-muted hover:text-foreground">
            ‹
          </button>
          <p className="text-sm font-medium text-foreground">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </p>
          <button onClick={() => goToMonth(1)} className="px-2 text-muted hover:text-foreground">
            ›
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {WEEKDAY_LABELS.map((w) => (
            <p key={w} className="text-[10px] text-muted">{w}</p>
          ))}
          {calendarWeeks.flat().map(({ date, inMonth }, i) => {
            const dateStr = toDateStr(date)
            const tracked = logsByDate[dateStr] != null
            const isToday = dateStr === todayStr
            const isSelected = dateStr === selectedDate
            const isFuture = date.getTime() > today.getTime()
            return (
              <button
                key={i}
                disabled={isFuture}
                onClick={() => {
                  setSelectedDate(dateStr)
                  setWeight(logsByDate[dateStr] != null ? String(logsByDate[dateStr]) : '')
                }}
                className={`aspect-square rounded-full border text-xs transition disabled:cursor-not-allowed disabled:opacity-30 ${
                  !inMonth ? 'opacity-30' : ''
                } ${
                  isSelected
                    ? 'border-accent bg-accent/20 text-foreground'
                    : tracked
                      ? 'border-accent text-foreground'
                      : isToday
                        ? 'border-muted text-foreground'
                        : 'border-card2 text-muted'
                }`}
              >
                {date.getDate()}
              </button>
            )
          })}
        </div>
      </div>

      {/* Log/edit selected date */}
      <div className="mt-5 flex items-center gap-2">
        <input
          type="number"
          step="0.1"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          placeholder={
            selectedEntry != null ? `${selectedEntry} lb logged` : `Log weight for ${formatDate(selectedDate)}`
          }
          className="w-52 rounded-lg border border-card2 bg-card2 px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
        />
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-accent hover:bg-accent/90 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {saving ? 'Saving…' : selectedEntry != null ? 'Update' : 'Log'}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}

      {/* Year heatmap */}
      <div className="mt-6">
        <p className="mb-2 text-xs text-muted">{today.getFullYear()}</p>
        <div className="flex gap-[3px] overflow-x-auto pb-1">
          {yearGrid.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map((date, di) => {
                const dateStr = toDateStr(date)
                const inYear = date.getFullYear() === today.getFullYear()
                const tracked = logsByDate[dateStr] != null
                return (
                  <div
                    key={di}
                    title={inYear ? dateStr : undefined}
                    className={`h-[10px] w-[10px] rounded-[2px] ${
                      !inYear ? 'bg-transparent' : tracked ? 'bg-accent' : 'bg-card2'
                    }`}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function formatDate(iso: string) {
  const [, m, d] = iso.split('-')
  return `${parseInt(m)}/${parseInt(d)}`
}
