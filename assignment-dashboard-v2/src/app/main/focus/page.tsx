'use client'

import { useEffect, useMemo, useState } from 'react'
import { addDays, format, isSameDay, parseISO, startOfDay, subDays } from 'date-fns'

type FocusPriority = {
  id: string
  text: string
  completed: boolean
}

type FocusSession = {
  id: string
  durationMinutes: number
  completedAt: string
  note?: string
}

type FocusChecklist = {
  close_tabs: boolean
  silence_phone: boolean
  clear_desk: boolean
  water_ready: boolean
}

type FocusState = {
  priorities: FocusPriority[]
  sessions: FocusSession[]
  checklist: FocusChecklist
}

const STORAGE_KEY = 'focus-hub-v1'

const defaultState: FocusState = {
  priorities: [
    { id: 'p1', text: 'Finish top assignment', completed: false },
    { id: 'p2', text: 'Clear one todo list backlog', completed: false },
  ],
  sessions: [],
  checklist: {
    close_tabs: false,
    silence_phone: false,
    clear_desk: false,
    water_ready: false,
  },
}

function loadFocusState(): FocusState {
  if (typeof window === 'undefined') return defaultState
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return defaultState

  try {
    const parsed = JSON.parse(raw) as FocusState
    return {
      priorities: Array.isArray(parsed.priorities) ? parsed.priorities : defaultState.priorities,
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      checklist: parsed.checklist ?? defaultState.checklist,
    }
  } catch {
    return defaultState
  }
}

function saveFocusState(state: FocusState) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function newId(prefix: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}`
}

export default function FocusPage() {
  const [state, setState] = useState<FocusState>(defaultState)
  const [hydrated, setHydrated] = useState(false)
  const [modeMinutes, setModeMinutes] = useState(25)
  const [secondsLeft, setSecondsLeft] = useState(25 * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [newPriority, setNewPriority] = useState('')
  const [sessionNote, setSessionNote] = useState('')

  useEffect(() => {
    const loaded = loadFocusState()
    setState(loaded)
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    saveFocusState(state)
  }, [state, hydrated])

  useEffect(() => {
    setIsRunning(false)
    setSecondsLeft(modeMinutes * 60)
  }, [modeMinutes])

  useEffect(() => {
    if (!isRunning) return

    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer)
          setIsRunning(false)

          setState((current) => ({
            ...current,
            sessions: [
              {
                id: newId('session'),
                durationMinutes: modeMinutes,
                completedAt: new Date().toISOString(),
                note: sessionNote.trim() || undefined,
              },
              ...current.sessions,
            ].slice(0, 100),
          }))

          return modeMinutes * 60
        }

        return prev - 1
      })
    }, 1000)

    return () => window.clearInterval(timer)
  }, [isRunning, modeMinutes, sessionNote])

  const todayMinutes = useMemo(() => {
    const now = new Date()
    return state.sessions
      .filter((session) => isSameDay(parseISO(session.completedAt), now))
      .reduce((sum, session) => sum + session.durationMinutes, 0)
  }, [state.sessions])

  const weekMinutes = useMemo(() => {
    const now = new Date()
    const weekStart = subDays(startOfDay(now), 6)
    return state.sessions
      .filter((session) => {
        const day = parseISO(session.completedAt)
        return day >= weekStart && day <= addDays(startOfDay(now), 1)
      })
      .reduce((sum, session) => sum + session.durationMinutes, 0)
  }, [state.sessions])

  const streakDays = useMemo(() => {
    const daySet = new Set(
      state.sessions.map((session) => format(parseISO(session.completedAt), 'yyyy-MM-dd')),
    )

    let streak = 0
    let cursor = startOfDay(new Date())

    while (daySet.has(format(cursor, 'yyyy-MM-dd'))) {
      streak += 1
      cursor = subDays(cursor, 1)
    }

    return streak
  }, [state.sessions])

  const completionPercent = useMemo(() => {
    if (state.priorities.length === 0) return 0
    const completed = state.priorities.filter((priority) => priority.completed).length
    return Math.round((completed / state.priorities.length) * 100)
  }, [state.priorities])

  const checklistPercent = useMemo(() => {
    const values = Object.values(state.checklist)
    const checked = values.filter(Boolean).length
    return Math.round((checked / values.length) * 100)
  }, [state.checklist])

  const minutesLabel = `${String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:${String(secondsLeft % 60).padStart(2, '0')}`

  const handleAddPriority = () => {
    const trimmed = newPriority.trim()
    if (!trimmed) return

    const priority: FocusPriority = {
      id: newId('priority'),
      text: trimmed,
      completed: false,
    }

    setState((current) => ({
      ...current,
      priorities: [...current.priorities, priority],
    }))

    setNewPriority('')
  }

  const completeNow = () => {
    if (secondsLeft === modeMinutes * 60) return

    setState((current) => ({
      ...current,
      sessions: [
        {
          id: newId('session'),
          durationMinutes: modeMinutes,
          completedAt: new Date().toISOString(),
          note: sessionNote.trim() || undefined,
        },
        ...current.sessions,
      ].slice(0, 100),
    }))

    setIsRunning(false)
    setSecondsLeft(modeMinutes * 60)
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-white px-4 py-6">
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-3">
          <p className="text-xs text-zinc-400">Focus Today</p>
          <p className="text-xl font-bold">{todayMinutes}m</p>
        </div>
        <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-3">
          <p className="text-xs text-zinc-400">Last 7 Days</p>
          <p className="text-xl font-bold">{weekMinutes}m</p>
        </div>
        <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-3">
          <p className="text-xs text-zinc-400">Streak</p>
          <p className="text-xl font-bold">{streakDays} day{streakDays === 1 ? '' : 's'}</p>
        </div>
        <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-3">
          <p className="text-xs text-zinc-400">Priority Progress</p>
          <p className="text-xl font-bold">{completionPercent}%</p>
        </div>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-[1.3fr_1fr]">
        <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
          <h2 className="text-lg font-semibold">Session Timer</h2>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              className={`rounded-md px-3 py-1 text-sm ${modeMinutes === 25 ? 'bg-blue-600' : 'bg-zinc-700 hover:bg-zinc-600'}`}
              onClick={() => setModeMinutes(25)}
            >
              25 min
            </button>
            <button
              className={`rounded-md px-3 py-1 text-sm ${modeMinutes === 50 ? 'bg-blue-600' : 'bg-zinc-700 hover:bg-zinc-600'}`}
              onClick={() => setModeMinutes(50)}
            >
              50 min
            </button>
          </div>

          <p className="mt-6 text-5xl font-bold tracking-wider">{minutesLabel}</p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium hover:bg-emerald-700"
              onClick={() => setIsRunning(true)}
              disabled={isRunning}
            >
              Start
            </button>
            <button
              className="rounded-md bg-zinc-700 px-3 py-2 text-sm font-medium hover:bg-zinc-600"
              onClick={() => setIsRunning(false)}
              disabled={!isRunning}
            >
              Pause
            </button>
            <button
              className="rounded-md bg-zinc-700 px-3 py-2 text-sm font-medium hover:bg-zinc-600"
              onClick={() => {
                setIsRunning(false)
                setSecondsLeft(modeMinutes * 60)
              }}
            >
              Reset
            </button>
            <button
              className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium hover:bg-blue-700"
              onClick={completeNow}
            >
              Complete Now
            </button>
          </div>

          <div className="mt-4">
            <label className="text-xs text-zinc-400">Session Note</label>
            <textarea
              className="mt-1 min-h-24 w-full rounded-md border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm"
              placeholder="What are you focusing on for this session?"
              value={sessionNote}
              onChange={(event) => setSessionNote(event.target.value)}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
            <h2 className="text-lg font-semibold">Top Priorities</h2>
            <div className="mt-3 space-y-2">
              {state.priorities.map((priority) => (
                <div key={priority.id} className="flex items-center justify-between gap-2 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={priority.completed}
                      onChange={() => {
                        setState((current) => ({
                          ...current,
                          priorities: current.priorities.map((item) =>
                            item.id === priority.id ? { ...item, completed: !item.completed } : item,
                          ),
                        }))
                      }}
                    />
                    <span className={priority.completed ? 'line-through text-zinc-500' : ''}>{priority.text}</span>
                  </label>
                  <button
                    className="text-xs text-zinc-400 hover:text-red-400"
                    onClick={() => {
                      setState((current) => ({
                        ...current,
                        priorities: current.priorities.filter((item) => item.id !== priority.id),
                      }))
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <input
                className="w-full rounded-md border border-zinc-600 bg-zinc-900 px-2 py-2 text-sm"
                placeholder="Add a top priority"
                value={newPriority}
                onChange={(event) => setNewPriority(event.target.value)}
              />
              <button
                className="rounded-md bg-zinc-700 px-3 py-2 text-sm hover:bg-zinc-600"
                onClick={handleAddPriority}
              >
                Add
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Do Not Disturb Checklist</h2>
              <span className="text-xs text-zinc-400">
                {Object.values(state.checklist).filter(Boolean).length}/4 Ready
              </span>
            </div>
            <div className="mt-3">
              <div className="h-2 w-full rounded-full bg-zinc-700">
                <div
                  className="h-2 rounded-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${checklistPercent}%` }}
                />
              </div>
              <div className="mt-1 text-xs text-zinc-500">
                {checklistPercent === 100 ? 'Focus mode engaged.' : 'Complete prep for a smoother session.'}
              </div>
            </div>
            <div className="mt-3 space-y-2 text-sm">
              {[
                ['close_tabs', 'Close distracting tabs'],
                ['silence_phone', 'Silence phone notifications'],
                ['clear_desk', 'Clear desk workspace'],
                ['water_ready', 'Water bottle ready'],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={state.checklist[key as keyof FocusChecklist]}
                    onChange={() => {
                      setState((current) => ({
                        ...current,
                        checklist: {
                          ...current.checklist,
                          [key]: !current.checklist[key as keyof FocusChecklist],
                        },
                      }))
                    }}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-zinc-700 bg-zinc-800 p-4">
        <h2 className="text-lg font-semibold">Session Log</h2>
        <div className="mt-3 space-y-2">
          {state.sessions.length === 0 ? (
            <p className="text-sm text-zinc-400">No sessions yet. Start one above.</p>
          ) : (
            state.sessions.slice(0, 12).map((session) => {
              return (
                <div key={session.id} className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">{session.durationMinutes} min session</p>
                    <p className="text-xs text-zinc-400">{format(parseISO(session.completedAt), 'EEE, MMM d · h:mm a')}</p>
                  </div>
                  {session.note && (
                    <p className="mt-1 text-xs text-zinc-400">
                      Note: {session.note}
                    </p>
                  )}
                </div>
              )
            })
          )}
        </div>
      </section>
    </div>
  )
}
