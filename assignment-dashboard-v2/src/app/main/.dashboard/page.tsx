'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  addDays,
  addWeeks,
  format,
  isSameDay,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfWeek,
  subDays,
  subWeeks,
} from 'date-fns'
import { db } from '@/lib/localdb/client'

type Assignment = {
  id: string
  title: string
  due_date: string | null
  completed: boolean
  semester_id: string
  created_at?: string
}

type Todo = {
  id: string
  title: string
  due_date?: string | null
  completed: boolean
  completed_on?: string | null
}

type Semester = {
  id: string
  name: string
}

type PlanItem = {
  id: string
  kind: 'assignment' | 'todo'
  title: string
  dueDate: Date
  subtitle: string
}

type FocusSummary = {
  todayMinutes: number
  weekMinutes: number
  streakDays: number
  priorities: Array<{ id: string; text: string; completed: boolean }>
}

function dateOrNull(value?: string | null) {
  if (!value) return null
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value) ? parseISO(value) : new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

function readFocusSummary(): FocusSummary {
  if (typeof window === 'undefined') {
    return { todayMinutes: 0, weekMinutes: 0, streakDays: 0, priorities: [] }
  }

  const raw = window.localStorage.getItem('focus-hub-v1')
  if (!raw) {
    return { todayMinutes: 0, weekMinutes: 0, streakDays: 0, priorities: [] }
  }

  try {
    const parsed = JSON.parse(raw) as {
      priorities?: Array<{ id: string; text: string; completed: boolean }>
      sessions?: Array<{ durationMinutes: number; completedAt: string }>
    }

    const priorities = Array.isArray(parsed.priorities) ? parsed.priorities.slice(0, 3) : []
    const sessions = Array.isArray(parsed.sessions) ? parsed.sessions : []

    const now = new Date()
    const todayMinutes = sessions
      .filter((session) => isSameDay(parseISO(session.completedAt), now))
      .reduce((sum, session) => sum + (session.durationMinutes ?? 0), 0)

    const weekStart = subDays(startOfDay(now), 6)
    const weekMinutes = sessions
      .filter((session) => {
        const day = parseISO(session.completedAt)
        return day >= weekStart && day <= addDays(startOfDay(now), 1)
      })
      .reduce((sum, session) => sum + (session.durationMinutes ?? 0), 0)

    const sessionDays = new Set(sessions.map((session) => format(parseISO(session.completedAt), 'yyyy-MM-dd')))
    let streakDays = 0
    let cursor = startOfDay(now)
    while (sessionDays.has(format(cursor, 'yyyy-MM-dd'))) {
      streakDays += 1
      cursor = subDays(cursor, 1)
    }

    return { todayMinutes, weekMinutes, streakDays, priorities }
  } catch {
    return { todayMinutes: 0, weekMinutes: 0, streakDays: 0, priorities: [] }
  }
}

export default function HomePage() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [todos, setTodos] = useState<Todo[]>([])
  const [semesters, setSemesters] = useState<Semester[]>([])
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [focusSummary, setFocusSummary] = useState<FocusSummary>({
    todayMinutes: 0,
    weekMinutes: 0,
    streakDays: 0,
    priorities: [],
  })

  const loadData = useCallback(async () => {
    const [assignmentsRes, todosRes, semestersRes] = await Promise.all([
      db
        .from('assignments')
        .select('id, title, due_date, completed, semester_id, created_at')
        .order('due_date', { ascending: true }),
      db.from('todos').select('id, title, due_date, completed, completed_on'),
      db.from('semesters').select('id, name'),
    ])

    setAssignments((assignmentsRes.data ?? []) as Assignment[])
    setTodos((todosRes.data ?? []) as Todo[])
    setSemesters((semestersRes.data ?? []) as Semester[])
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    const refresh = () => setFocusSummary(readFocusSummary())
    refresh()
    window.addEventListener('storage', refresh)
    return () => window.removeEventListener('storage', refresh)
  }, [])

  const semesterMap = useMemo(() => new Map(semesters.map((semester) => [semester.id, semester.name])), [semesters])

  const dueTodayCount = useMemo(() => {
    const now = new Date()
    const assignmentsDueToday = assignments.filter((assignment) => {
      const due = dateOrNull(assignment.due_date)
      return due ? isSameDay(due, now) : false
    }).length

    const todosDueToday = todos.filter((todo) => {
      const due = dateOrNull(todo.due_date)
      return due ? isSameDay(due, now) : false
    }).length

    return assignmentsDueToday + todosDueToday
  }, [assignments, todos])

  const upcomingAssignments = useMemo(() => {
    return assignments
      .filter((assignment) => assignment.due_date && !assignment.completed)
      .sort((a, b) => new Date(a.due_date ?? '').getTime() - new Date(b.due_date ?? '').getTime())
      .slice(0, 6)
  }, [assignments])

  const upcomingTodos = useMemo(() => {
    return todos
      .filter((todo) => todo.due_date && !todo.completed)
      .sort((a, b) => new Date(a.due_date ?? '').getTime() - new Date(b.due_date ?? '').getTime())
      .slice(0, 6)
  }, [todos])

  const weeklyLoad = useMemo(() => {
    const start = startOfDay(new Date())
    return Array.from({ length: 7 }).map((_, idx) => {
      const day = addDays(start, idx)
      const assignmentCount = assignments.filter((assignment) => {
        if (assignment.completed) return false
        const due = dateOrNull(assignment.due_date)
        return due ? isSameDay(due, day) : false
      }).length

      const todoCount = todos.filter((todo) => {
        if (todo.completed) return false
        const due = dateOrNull(todo.due_date)
        return due ? isSameDay(due, day) : false
      }).length

      return {
        key: format(day, 'yyyy-MM-dd'),
        label: format(day, 'EEE'),
        assignmentCount,
        todoCount,
        total: assignmentCount + todoCount,
      }
    })
  }, [assignments, todos])

  const maxWeeklyLoad = Math.max(1, ...weeklyLoad.map((point) => point.total))

  const completionTrend = useMemo(() => {
    const week0 = startOfWeek(new Date(), { weekStartsOn: 0 })

    return Array.from({ length: 4 }).map((_, idx) => {
      const weekStart = subWeeks(week0, 3 - idx)
      const weekEnd = addDays(addWeeks(weekStart, 1), -1)

      const completedAssignments = assignments.filter((assignment) => {
        if (!assignment.completed) return false
        const marker = dateOrNull(assignment.due_date ?? assignment.created_at ?? null)
        return marker ? isWithinInterval(marker, { start: weekStart, end: weekEnd }) : false
      }).length

      const completedTodos = todos.filter((todo) => {
        if (!todo.completed) return false
        const marker = dateOrNull(todo.completed_on ?? todo.due_date ?? null)
        return marker ? isWithinInterval(marker, { start: weekStart, end: weekEnd }) : false
      }).length

      return {
        label: format(weekStart, 'MMM d'),
        total: completedAssignments + completedTodos,
      }
    })
  }, [assignments, todos])

  const maxTrend = Math.max(1, ...completionTrend.map((point) => point.total))

  const categoryBreakdown = useMemo(() => {
    const openAssignments = assignments.filter((assignment) => !assignment.completed).length
    const openTodos = todos.filter((todo) => !todo.completed).length
    const completedItems = assignments.filter((assignment) => assignment.completed).length + todos.filter((todo) => todo.completed).length

    const values = [
      { label: 'Open Assignments', value: openAssignments, color: '#3b82f6' },
      { label: 'Open To-Dos', value: openTodos, color: '#10b981' },
      { label: 'Completed', value: completedItems, color: '#a1a1aa' },
    ]

    const total = values.reduce((sum, item) => sum + item.value, 0)
    return { values, total }
  }, [assignments, todos])

  const thisWeekPlan = useMemo(() => {
    const today = startOfDay(new Date())
    const weekEnd = addDays(today, 6)

    const assignmentItems: PlanItem[] = assignments
      .filter((assignment) => !assignment.completed)
      .map((assignment) => {
        const due = dateOrNull(assignment.due_date)
        if (!due) return null
        return {
          id: assignment.id,
          kind: 'assignment' as const,
          title: assignment.title,
          dueDate: due,
          subtitle: semesterMap.get(assignment.semester_id) ?? 'Assignment',
        }
      })
      .filter((item): item is PlanItem => Boolean(item))

    const todoItems: PlanItem[] = todos
      .filter((todo) => !todo.completed)
      .map((todo) => {
        const due = dateOrNull(todo.due_date)
        if (!due) return null
        return {
          id: todo.id,
          kind: 'todo' as const,
          title: todo.title,
          dueDate: due,
          subtitle: 'To-Do',
        }
      })
      .filter((item): item is PlanItem => Boolean(item))

    return [...assignmentItems, ...todoItems]
      .filter((item) => isWithinInterval(item.dueDate, { start: today, end: weekEnd }))
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
      .slice(0, 10)
  }, [assignments, todos, semesterMap])

  const handleMarkComplete = async (item: PlanItem) => {
    setUpdatingId(`${item.kind}-${item.id}`)

    if (item.kind === 'assignment') {
      await db.from('assignments').update({ completed: true }).eq('id', item.id)
    } else {
      await db
        .from('todos')
        .update({ completed: true, completed_on: format(new Date(), 'yyyy-MM-dd') })
        .eq('id', item.id)
    }

    await loadData()
    setUpdatingId(null)
  }

  const donutRadius = 52
  const donutCircumference = 2 * Math.PI * donutRadius
  let donutOffset = 0

  return (
    <div className="min-h-screen bg-zinc-900 text-white px-4 py-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 px-2">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-zinc-400">Portfolio snapshot of assignments and to-dos.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/main/assignments" className="rounded-md border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm font-medium hover:bg-zinc-700">
            Assignments
          </Link>
          <Link href="/main/todo" className="rounded-md border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm font-medium hover:bg-zinc-700">
            To-Do
          </Link>
          <Link href="/main/focus" className="rounded-md border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm font-medium hover:bg-zinc-700">
            Focus
          </Link>
          <Link href="/main/calendar" className="rounded-md border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm font-medium hover:bg-zinc-700">
            Calendar
          </Link>
        </div>
      </div>

      <section className="grid grid-cols-2 gap-3 px-2 md:grid-cols-4 xl:grid-cols-8">
        <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-3">
          <p className="text-xs text-zinc-400">Assignments</p>
          <p className="text-xl font-bold">{assignments.length}</p>
        </div>
        <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-3">
          <p className="text-xs text-zinc-400">Pending Assignments</p>
          <p className="text-xl font-bold">{assignments.filter((assignment) => !assignment.completed).length}</p>
        </div>
        <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-3">
          <p className="text-xs text-zinc-400">Completed Assignments</p>
          <p className="text-xl font-bold">{assignments.filter((assignment) => assignment.completed).length}</p>
        </div>
        <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-3">
          <p className="text-xs text-zinc-400">To-Dos</p>
          <p className="text-xl font-bold">{todos.length}</p>
        </div>
        <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-3">
          <p className="text-xs text-zinc-400">Open To-Dos</p>
          <p className="text-xl font-bold">{todos.filter((todo) => !todo.completed).length}</p>
        </div>
        <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-3">
          <p className="text-xs text-zinc-400">Due Today</p>
          <p className="text-xl font-bold">{dueTodayCount}</p>
        </div>
        <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-3">
          <p className="text-xs text-zinc-400">Focus Today</p>
          <p className="text-xl font-bold">{focusSummary.todayMinutes}m</p>
        </div>
        <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-3">
          <p className="text-xs text-zinc-400">Focus Streak</p>
          <p className="text-xl font-bold">{focusSummary.streakDays}d</p>
        </div>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 px-2 xl:grid-cols-3">
        <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
          <h2 className="mb-3 text-lg font-semibold">Weekly Load</h2>
          <div className="h-44">
            <svg viewBox="0 0 360 160" className="h-full w-full">
              <line x1="24" y1="120" x2="350" y2="120" stroke="#3f3f46" strokeWidth="1" />
              <line x1="24" y1="72" x2="350" y2="72" stroke="#27272a" strokeWidth="1" />
              <line x1="24" y1="24" x2="350" y2="24" stroke="#27272a" strokeWidth="1" />
              <text x="6" y="124" className="fill-zinc-500 text-[10px]">0</text>
              <text x="6" y="76" className="fill-zinc-500 text-[10px]">{Math.ceil(maxWeeklyLoad / 2)}</text>
              <text x="6" y="28" className="fill-zinc-500 text-[10px]">{maxWeeklyLoad}</text>
              {weeklyLoad.map((point, idx) => {
                const x = 32 + idx * 45
                const assignmentHeight = (point.assignmentCount / maxWeeklyLoad) * 96
                const todoHeight = (point.todoCount / maxWeeklyLoad) * 96
                return (
                  <g key={point.key}>
                    <rect x={x} y={120 - assignmentHeight} width="16" height={assignmentHeight} rx="3" fill="#3b82f6" />
                    <rect x={x + 18} y={120 - todoHeight} width="16" height={todoHeight} rx="3" fill="#10b981" />
                    <text x={x + 17} y={Math.min(116 - Math.max(assignmentHeight, todoHeight), 112)} textAnchor="middle" className="fill-zinc-300 text-[10px]">
                      {point.total}
                    </text>
                    <text x={x + 17} y="142" textAnchor="middle" className="fill-zinc-400 text-[10px]">
                      {point.label}
                    </text>
                  </g>
                )
              })}
            </svg>
          </div>
          <div className="mt-2 flex items-center gap-4 text-xs text-zinc-400">
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" />Assignments</span>
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />To-Dos</span>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
          <h2 className="mb-3 text-lg font-semibold">Completion Trend</h2>
          <div className="h-44">
            <svg viewBox="0 0 360 160" className="h-full w-full">
              <line x1="24" y1="120" x2="338" y2="120" stroke="#3f3f46" strokeWidth="1" />
              <line x1="24" y1="75" x2="338" y2="75" stroke="#27272a" strokeWidth="1" />
              <line x1="24" y1="30" x2="338" y2="30" stroke="#27272a" strokeWidth="1" />
              <text x="6" y="124" className="fill-zinc-500 text-[10px]">0</text>
              <text x="6" y="79" className="fill-zinc-500 text-[10px]">{Math.ceil(maxTrend / 2)}</text>
              <text x="6" y="34" className="fill-zinc-500 text-[10px]">{maxTrend}</text>
              {completionTrend.map((point, idx) => {
                const x = 28 + idx * 100
                const y = 118 - (point.total / maxTrend) * 90
                return (
                  <g key={point.label}>
                    <circle cx={x} cy={y} r="4" fill="#f59e0b" />
                    <text x={x} y={y - 8} textAnchor="middle" className="fill-zinc-300 text-[10px]">
                      {point.total}
                    </text>
                    <text x={x} y="144" textAnchor="middle" className="fill-zinc-400 text-[10px]">
                      {point.label}
                    </text>
                  </g>
                )
              })}
              {completionTrend.map((point, idx) => {
                if (idx === completionTrend.length - 1) return null
                const currX = 28 + idx * 100
                const currY = 118 - (point.total / maxTrend) * 90
                const next = completionTrend[idx + 1]
                const nextX = 28 + (idx + 1) * 100
                const nextY = 118 - (next.total / maxTrend) * 90
                return <line key={`${point.label}-${next.label}`} x1={currX} y1={currY} x2={nextX} y2={nextY} stroke="#f59e0b" strokeWidth="2" />
              })}
            </svg>
          </div>
          <p className="mt-2 text-xs text-zinc-400">Completed items per week over the last month.</p>
        </div>

        <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
          <h2 className="mb-3 text-lg font-semibold">Category Breakdown</h2>
          <div className="flex items-center justify-center">
            <svg viewBox="0 0 140 140" className="h-36 w-36">
              <circle cx="70" cy="70" r={donutRadius} fill="none" stroke="#27272a" strokeWidth="16" />
              {categoryBreakdown.values.map((slice) => {
                const fraction = categoryBreakdown.total === 0 ? 0 : slice.value / categoryBreakdown.total
                const dash = fraction * donutCircumference
                const segment = (
                  <circle
                    key={slice.label}
                    cx="70"
                    cy="70"
                    r={donutRadius}
                    fill="none"
                    stroke={slice.color}
                    strokeWidth="16"
                    strokeDasharray={`${dash} ${donutCircumference - dash}`}
                    strokeDashoffset={-donutOffset}
                    transform="rotate(-90 70 70)"
                  />
                )
                donutOffset += dash
                return segment
              })}
              <text x="70" y="66" textAnchor="middle" className="fill-white text-[12px] font-semibold">
                {categoryBreakdown.total}
              </text>
              <text x="70" y="82" textAnchor="middle" className="fill-zinc-400 text-[10px]">
                Total
              </text>
            </svg>
          </div>
          <div className="mt-2 space-y-1 text-xs text-zinc-400">
            {categoryBreakdown.values.map((slice) => (
              <div key={slice.label} className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: slice.color }} />{slice.label}</span>
                <span>{slice.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 px-2 xl:grid-cols-3">
        <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">This Week Plan</h2>
            <span className="text-xs text-zinc-400">Top {thisWeekPlan.length}</span>
          </div>
          <div className="space-y-2">
            {thisWeekPlan.length === 0 ? (
              <p className="text-sm text-zinc-400">No upcoming items this week.</p>
            ) : (
              thisWeekPlan.map((item) => (
                <div key={`${item.kind}-${item.id}`} className="rounded-md border border-zinc-700 bg-zinc-900 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="mt-1 text-xs text-zinc-400">
                        {item.kind === 'assignment' ? 'Assignment' : 'To-Do'} · {item.subtitle} · {format(item.dueDate, 'EEE, MMM d')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleMarkComplete(item)}
                        disabled={updatingId === `${item.kind}-${item.id}`}
                        className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-medium hover:bg-emerald-700 disabled:opacity-60"
                      >
                        {updatingId === `${item.kind}-${item.id}` ? 'Saving' : 'Mark Complete'}
                      </button>
                      <Link
                        href={item.kind === 'assignment' ? '/main/assignments' : '/main/todo'}
                        className="rounded-md border border-zinc-600 bg-zinc-800 px-2 py-1 text-xs font-medium hover:bg-zinc-700"
                      >
                        Open
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
          <h2 className="mb-3 text-lg font-semibold">Upcoming Assignments</h2>
          <div className="space-y-2">
            {upcomingAssignments.length === 0 ? (
              <p className="text-sm text-zinc-400">No upcoming assignments.</p>
            ) : (
              upcomingAssignments.map((assignment) => (
                <div key={assignment.id} className="rounded-md border border-zinc-700 bg-zinc-900 p-3">
                  <p className="text-sm font-medium">{assignment.title}</p>
                  <p className="mt-1 text-xs text-zinc-400">
                    {assignment.due_date ? format(new Date(assignment.due_date), 'EEE, MMM d') : 'No due date'} ·{' '}
                    {semesterMap.get(assignment.semester_id) ?? 'Unknown semester'}
                  </p>
                </div>
              ))
            )}
          </div>

          <h2 className="mb-3 mt-6 text-lg font-semibold">Upcoming To-Dos</h2>
          <div className="space-y-2">
            {upcomingTodos.length === 0 ? (
              <p className="text-sm text-zinc-400">No upcoming to-dos.</p>
            ) : (
              upcomingTodos.map((todo) => (
                <div key={todo.id} className="rounded-md border border-zinc-700 bg-zinc-900 p-3">
                  <p className="text-sm font-medium">{todo.title}</p>
                  <p className="mt-1 text-xs text-zinc-400">
                    {todo.due_date ? format(parseISO(todo.due_date), 'EEE, MMM d') : 'No due date'}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Focus Snapshot</h2>
            <Link href="/main/focus" className="text-xs text-blue-400 hover:text-blue-300">
              Open Focus
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md border border-zinc-700 bg-zinc-900 p-3">
              <p className="text-xs text-zinc-400">Today</p>
              <p className="text-lg font-bold">{focusSummary.todayMinutes}m</p>
            </div>
            <div className="rounded-md border border-zinc-700 bg-zinc-900 p-3">
              <p className="text-xs text-zinc-400">This Week</p>
              <p className="text-lg font-bold">{focusSummary.weekMinutes}m</p>
            </div>
          </div>
          <div className="mt-3 rounded-md border border-zinc-700 bg-zinc-900 p-3">
            <p className="text-xs text-zinc-400">Top Priorities</p>
            {focusSummary.priorities.length === 0 ? (
              <p className="mt-1 text-sm text-zinc-500">No focus priorities set.</p>
            ) : (
              <ul className="mt-1 space-y-1 text-sm">
                {focusSummary.priorities.map((priority) => (
                  <li key={priority.id} className={priority.completed ? 'line-through text-zinc-500' : 'text-zinc-200'}>
                    {priority.text}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p className="mt-3 text-xs text-zinc-500">Set and run sessions in Focus to update this snapshot.</p>
        </div>
      </section>
    </div>
  )
}
