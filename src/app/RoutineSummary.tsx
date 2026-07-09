'use client'

type SummaryExercise = {
  target_sets: number
  primary_muscle?: string | null
}

const MUSCLE_LABELS: Record<string, string> = {
  abdominals: 'Abs',
  abductors: 'Abductors',
  adductors: 'Adductors',
  biceps: 'Biceps',
  calves: 'Calves',
  chest: 'Chest',
  forearms: 'Forearms',
  glutes: 'Glutes',
  hamstrings: 'Hamstrings',
  lats: 'Lats',
  'lower back': 'Lower Back',
  'middle back': 'Middle Back',
  neck: 'Neck',
  quadriceps: 'Quadriceps',
  shoulders: 'Shoulders',
  traps: 'Traps',
  triceps: 'Triceps',
}

export default function RoutineSummary({ exercises }: { exercises: SummaryExercise[] }) {
  const exerciseCount = exercises.length
  const totalSets = exercises.reduce((s, e) => s + (e.target_sets || 0), 0)
  const estimatedMinutes = Math.max(5, Math.round(totalSets * 2.5))

  const muscleSets: Record<string, number> = {}
  for (const e of exercises) {
    if (!e.primary_muscle) continue
    muscleSets[e.primary_muscle] = (muscleSets[e.primary_muscle] ?? 0) + (e.target_sets || 0)
  }
  const sortedMuscles = Object.entries(muscleSets).sort((a, b) => b[1] - a[1])
  const maxSets = sortedMuscles.length > 0 ? sortedMuscles[0][1] : 0

  function intensity(muscle: string) {
    const sets = muscleSets[muscle] ?? 0
    if (sets === 0 || maxSets === 0) return 0.06
    return 0.15 + 0.75 * (sets / maxSets)
  }

  if (exerciseCount === 0) {
    return null
  }

  return (
    <div className="rounded-xl border border-card2 bg-card p-5 shadow-sm shadow-black/20">
      <h2 className="font-semibold text-foreground">Routine summary</h2>

      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-xl font-semibold text-foreground">{exerciseCount}</p>
          <p className="mt-1 text-xs text-muted">Exercises</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-semibold text-foreground">{totalSets}</p>
          <p className="mt-1 text-xs text-muted">Total sets</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-semibold text-foreground">{estimatedMinutes}m</p>
          <p className="mt-1 text-xs text-muted">Est. duration</p>
        </div>
      </div>

      {sortedMuscles.length > 0 && (
        <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="mx-auto flex gap-3 sm:mx-0">
            <BodySvg view="front" intensity={intensity} />
            <BodySvg view="back" intensity={intensity} />
          </div>

          <div className="flex-1 space-y-2">
            {sortedMuscles.map(([muscle, sets]) => (
              <div key={muscle} className="flex items-center gap-3">
                <span className="w-24 flex-shrink-0 text-xs text-muted">
                  {MUSCLE_LABELS[muscle] ?? muscle}
                </span>
                <div className="h-2 flex-1 rounded-full bg-card2">
                  <div
                    className="h-2 rounded-full bg-accent"
                    style={{ width: `${maxSets > 0 ? (sets / maxSets) * 100 : 0}%` }}
                  />
                </div>
                <span className="w-6 flex-shrink-0 text-right text-xs text-muted">{sets}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function BodySvg({ view, intensity }: { view: 'front' | 'back'; intensity: (m: string) => number }) {
  const fill = (m: string) => `rgba(29, 158, 117, ${intensity(m).toFixed(2)})`
  const stroke = '#1c1f28'

  return (
    <svg viewBox="0 0 120 220" width="90" height="165" className="flex-shrink-0">
      {/* head */}
      <circle cx="60" cy="16" r="13" fill={fill('neck')} stroke={stroke} strokeWidth="1" />
      {/* neck */}
      <rect x="53" y="27" width="14" height="8" fill={fill('neck')} stroke={stroke} strokeWidth="1" />

      {view === 'front' ? (
        <>
          {/* shoulders */}
          <circle cx="34" cy="42" r="9" fill={fill('shoulders')} stroke={stroke} strokeWidth="1" />
          <circle cx="86" cy="42" r="9" fill={fill('shoulders')} stroke={stroke} strokeWidth="1" />
          {/* chest */}
          <rect x="38" y="36" width="44" height="30" rx="6" fill={fill('chest')} stroke={stroke} strokeWidth="1" />
          {/* abs */}
          <rect x="42" y="68" width="36" height="34" rx="5" fill={fill('abdominals')} stroke={stroke} strokeWidth="1" />
          {/* biceps */}
          <rect x="20" y="46" width="13" height="34" rx="5" fill={fill('biceps')} stroke={stroke} strokeWidth="1" />
          <rect x="87" y="46" width="13" height="34" rx="5" fill={fill('biceps')} stroke={stroke} strokeWidth="1" />
          {/* forearms */}
          <rect x="18" y="82" width="12" height="30" rx="5" fill={fill('forearms')} stroke={stroke} strokeWidth="1" />
          <rect x="90" y="82" width="12" height="30" rx="5" fill={fill('forearms')} stroke={stroke} strokeWidth="1" />
          {/* quads */}
          <rect x="42" y="104" width="16" height="46" rx="6" fill={fill('quadriceps')} stroke={stroke} strokeWidth="1" />
          <rect x="62" y="104" width="16" height="46" rx="6" fill={fill('quadriceps')} stroke={stroke} strokeWidth="1" />
          {/* calves */}
          <rect x="43" y="152" width="14" height="40" rx="5" fill={fill('calves')} stroke={stroke} strokeWidth="1" />
          <rect x="63" y="152" width="14" height="40" rx="5" fill={fill('calves')} stroke={stroke} strokeWidth="1" />
        </>
      ) : (
        <>
          {/* shoulders/traps */}
          <circle cx="34" cy="42" r="9" fill={fill('shoulders')} stroke={stroke} strokeWidth="1" />
          <circle cx="86" cy="42" r="9" fill={fill('shoulders')} stroke={stroke} strokeWidth="1" />
          <rect x="42" y="36" width="36" height="18" rx="5" fill={fill('traps')} stroke={stroke} strokeWidth="1" />
          {/* lats */}
          <rect x="38" y="54" width="44" height="26" rx="6" fill={fill('lats')} stroke={stroke} strokeWidth="1" />
          {/* lower back */}
          <rect x="42" y="80" width="36" height="20" rx="5" fill={fill('lower back')} stroke={stroke} strokeWidth="1" />
          {/* triceps */}
          <rect x="20" y="46" width="13" height="34" rx="5" fill={fill('triceps')} stroke={stroke} strokeWidth="1" />
          <rect x="87" y="46" width="13" height="34" rx="5" fill={fill('triceps')} stroke={stroke} strokeWidth="1" />
          {/* forearms */}
          <rect x="18" y="82" width="12" height="30" rx="5" fill={fill('forearms')} stroke={stroke} strokeWidth="1" />
          <rect x="90" y="82" width="12" height="30" rx="5" fill={fill('forearms')} stroke={stroke} strokeWidth="1" />
          {/* glutes */}
          <rect x="42" y="100" width="36" height="18" rx="6" fill={fill('glutes')} stroke={stroke} strokeWidth="1" />
          {/* hamstrings */}
          <rect x="42" y="118" width="16" height="34" rx="6" fill={fill('hamstrings')} stroke={stroke} strokeWidth="1" />
          <rect x="62" y="118" width="16" height="34" rx="6" fill={fill('hamstrings')} stroke={stroke} strokeWidth="1" />
          {/* calves */}
          <rect x="43" y="152" width="14" height="40" rx="5" fill={fill('calves')} stroke={stroke} strokeWidth="1" />
          <rect x="63" y="152" width="14" height="40" rx="5" fill={fill('calves')} stroke={stroke} strokeWidth="1" />
        </>
      )}
    </svg>
  )
}
