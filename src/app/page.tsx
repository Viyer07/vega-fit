import Link from 'next/link'

const FEATURES = [
  {
    icon: '📋',
    title: 'Build real programs',
    body: 'Structure workout days, target sets, rep ranges, and RIR targets for every client — organized by phase and week.',
  },
  {
    icon: '🏋️',
    title: 'Log every set',
    body: 'Weight, reps, RIR, and machine notes per set, with a picker pulling from a library of 800+ exercises — pictures included.',
  },
  {
    icon: '📈',
    title: 'See real progress',
    body: 'Bodyweight trend lines with 7-day averages, best-lift charts, and automatic PR detection on every logged set.',
  },
  {
    icon: '📅',
    title: 'Never miss a weigh-in',
    body: 'A full calendar for logging bodyweight — including backdated entries — plus a streak counter and year-long heatmap.',
  },
  {
    icon: '🎯',
    title: 'Goal tracking',
    body: 'Trainers set a target bodyweight; clients see a live progress bar based on their rolling average, not daily noise.',
  },
  {
    icon: '👀',
    title: 'Full trainer visibility',
    body: 'See every client\'s logged workouts, sets, and bodyweight history in one place — no spreadsheets required.',
  },
]

const STEPS = [
  {
    n: '01',
    title: 'Connect',
    body: 'Clients sign up with their trainer\'s code to link accounts instantly — no admin work required.',
  },
  {
    n: '02',
    title: 'Build the program',
    body: 'Trainers lay out workout days and exercises, picking from a searchable library with images and muscle groups.',
  },
  {
    n: '03',
    title: 'Train and track',
    body: 'Clients log sets as they train and watch their strength, bodyweight, and PRs stack up over time.',
  },
]

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-card2 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <span className="text-sm font-semibold uppercase tracking-widest text-accent">
            Vega Fit
          </span>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-muted hover:text-foreground">
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-accent hover:bg-accent/90 px-4 py-2 text-sm font-medium text-white"
            >
              Sign up
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pb-20 pt-20 text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-accent">
          Built for trainers and their clients
        </p>
        <h1 className="mx-auto mt-4 max-w-2xl text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
          Train smarter. Track everything.
        </h1>
        <p className="mx-auto mt-5 max-w-lg text-muted">
          Vega Fit is where trainers build programs and clients log every set, every weigh-in,
          and every PR — all in one place.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/signup"
            className="rounded-lg bg-accent hover:bg-accent/90 px-6 py-3 font-medium text-white"
          >
            Get started
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-card2 px-6 py-3 font-medium text-foreground hover:border-accent hover:text-accent"
          >
            Log in
          </Link>
        </div>

        {/* Mockup preview */}
        <div className="mx-auto mt-16 max-w-2xl rounded-2xl border border-card2 bg-card p-6 text-left shadow-2xl">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">Welcome, Alex</p>
            <span className="rounded-full bg-card2 px-2 py-0.5 text-xs text-muted">Client</span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-card2 bg-card2 p-3 text-center">
              <p className="text-lg font-semibold text-foreground">🔥 12</p>
              <p className="mt-1 text-[11px] text-muted">Day streak</p>
            </div>
            <div className="rounded-lg border border-card2 bg-card2 p-3 text-center">
              <p className="text-lg font-semibold text-foreground">Week 3</p>
              <p className="mt-1 text-[11px] text-muted">Hypertrophy</p>
            </div>
            <div className="rounded-lg border border-card2 bg-card2 p-3 text-center">
              <p className="text-lg font-semibold text-foreground">4/5</p>
              <p className="mt-1 text-[11px] text-muted">This week</p>
            </div>
          </div>
          <div className="mt-4 rounded-lg border border-card2 bg-card2 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted">Bodyweight trend</p>
              <span className="text-xs text-gold">🏆 New PR: Bench Press</span>
            </div>
            <svg viewBox="0 0 300 60" className="mt-3 w-full" preserveAspectRatio="none">
              <polyline
                points="0,45 40,38 80,42 120,30 160,34 200,20 240,24 300,10"
                fill="none"
                stroke="#1d9e75"
                strokeWidth="2"
              />
            </svg>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-card2 bg-card/30">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <h2 className="text-center text-2xl font-semibold text-foreground sm:text-3xl">
            Everything a program needs
          </h2>
          <p className="mx-auto mt-3 max-w-md text-center text-muted">
            No spreadsheets, no guessing what happened last session.
          </p>

          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-card2 bg-card p-6 shadow-sm shadow-black/20 transition hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-md hover:shadow-black/30"
              >
                <span className="text-2xl">{f.icon}</span>
                <h3 className="mt-3 font-medium text-foreground">{f.title}</h3>
                <p className="mt-2 text-sm text-muted">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="text-center text-2xl font-semibold text-foreground sm:text-3xl">
          How it works
        </h2>
        <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n}>
              <p className="text-sm font-semibold text-accent">{s.n}</p>
              <h3 className="mt-2 font-medium text-foreground">{s.title}</h3>
              <p className="mt-2 text-sm text-muted">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-card2">
        <div className="mx-auto max-w-5xl px-6 py-16 text-center">
          <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
            Ready to stop guessing?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-muted">
            Whether you&apos;re coaching clients or training yourself, Vega Fit keeps the data
            straight.
          </p>
          <div className="mt-7 flex justify-center gap-3">
            <Link
              href="/signup"
              className="rounded-lg bg-accent hover:bg-accent/90 px-6 py-3 font-medium text-white"
            >
              Create your account
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-card2 px-6 py-8 text-center text-xs text-muted">
        Vega Fit
      </footer>
    </main>
  )
}
