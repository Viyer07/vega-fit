'use client'

import { useEffect, useRef, useState } from 'react'

type LibraryExercise = {
  id: string
  name: string
  equipment: string | null
  primaryMuscles: string[]
  image: string | null
}

let cache: LibraryExercise[] | null = null

export default function ExercisePicker({
  onSelect,
}: {
  onSelect: (ex: { name: string; image_url: string | null; primary_muscle: string | null }) => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<LibraryExercise[]>([])
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!cache) {
      fetch('/exercises.json')
        .then((r) => r.json())
        .then((data: LibraryExercise[]) => {
          cache = data
        })
        .catch(() => {
          cache = []
        })
    }
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleChange(value: string) {
    setQuery(value)
    onSelect({ name: value, image_url: null, primary_muscle: null })
    if (!cache || value.trim().length < 2) {
      setResults([])
      return
    }
    const q = value.toLowerCase()
    setResults(
      cache
        .filter((e) => e.name.toLowerCase().includes(q))
        .slice(0, 8)
    )
    setOpen(true)
  }

  function pick(ex: LibraryExercise) {
    onSelect({ name: ex.name, image_url: ex.image, primary_muscle: ex.primaryMuscles[0] ?? null })
    setQuery(ex.name)
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-xs text-muted">Exercise</label>
      <input
        name="name"
        required
        autoComplete="off"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Search or type a name"
        className="mt-1 w-48 rounded-lg border border-card2 bg-card2 px-2 py-1.5 text-sm text-foreground outline-none focus:border-accent"
      />
      {open && results.length > 0 && (
        <div className="absolute z-10 mt-1 max-h-64 w-72 overflow-y-auto rounded-lg border border-card2 bg-card shadow-lg">
          {results.map((ex) => (
            <button
              key={ex.id}
              type="button"
              onClick={() => pick(ex)}
              className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-card2"
            >
              {ex.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={ex.image}
                  alt=""
                  className="h-10 w-10 flex-shrink-0 rounded-md object-cover bg-card2"
                />
              ) : (
                <div className="h-10 w-10 flex-shrink-0 rounded-md bg-card2" />
              )}
              <div className="min-w-0">
                <p className="truncate text-sm text-foreground">{ex.name}</p>
                <p className="truncate text-xs text-muted">
                  {ex.primaryMuscles.join(', ') || ex.equipment || ''}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
