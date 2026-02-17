'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { db } from '@/lib/localdb/client'

type Assignment = {
  id: string
  title: string
  due_date: string | null
  completed: boolean
  class_id: string
  type_id: string
}

type Todo = {
  id: string
  title: string
  due_date?: string | null
  completed: boolean
  list_id: string
}

type CalendarItem = {
  id: string
  kind: 'assignment' | 'todo'
  title: string
  dateKey: string
  completed: boolean
  meta: string
}

function toDateKey(value: string | null | undefined) {
  if (!value) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return format(parsed, 'yyyy-MM-dd')
}

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [items, setItems] = useState<CalendarItem[]>([])
  const [showAssignments, setShowAssignments] = useState(true)
  const [showTodos, setShowTodos] = useState(true)
  const [showCompleted, setShowCompleted] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      const [assignmentsRes, todosRes, classesRes, typesRes, listsRes] = await Promise.all([
        db.from('assignments').select('id, title, due_date, completed, class_id, type_id'),
        db.from('todos').select('id, title, due_date, completed, list_id'),
        db.from('classes').select('id, name'),
        db.from('assignment_types').select('id, name'),
        db.from('todo_lists').select('id, name'),
      ])

      const assignments = (assignmentsRes.data ?? []) as Assignment[]
      const todos = (todosRes.data ?? []) as Todo[]
      const classes = (classesRes.data ?? []) as Array<{ id: string; name: string }>
      const types = (typesRes.data ?? []) as Array<{ id: string; name: string }>
      const lists = (listsRes.data ?? []) as Array<{ id: string; name: string }>

      const classMap = new Map(classes.map((c) => [c.id, c.name]))
      const typeMap = new Map(types.map((t) => [t.id, t.name]))
      const listMap = new Map(lists.map((l) => [l.id, l.name]))

      const assignmentItems: CalendarItem[] = assignments
        .map((assignment) => {
          const dateKey = toDateKey(assignment.due_date)
          if (!dateKey) return null

          const className = classMap.get(assignment.class_id) ?? 'Class'
          const typeName = typeMap.get(assignment.type_id) ?? 'Type'

          return {
            id: assignment.id,
            kind: 'assignment',
            title: assignment.title,
            dateKey,
            completed: assignment.completed,
            meta: `${className} · ${typeName}`,
          }
        })
        .filter((item): item is CalendarItem => Boolean(item))

      const todoItems: CalendarItem[] = todos
        .map((todo) => {
          const dateKey = toDateKey(todo.due_date)
          if (!dateKey) return null

          return {
            id: todo.id,
            kind: 'todo',
            title: todo.title,
            dateKey,
            completed: todo.completed,
            meta: listMap.get(todo.list_id) ?? 'To-Do',
          }
        })
        .filter((item): item is CalendarItem => Boolean(item))

      setItems([...assignmentItems, ...todoItems])
    }

    fetchData()
  }, [])

  const visibleItems = useMemo(() => {
    return items.filter((item) => {
      if (!showCompleted && item.completed) return false
      if (item.kind === 'assignment' && !showAssignments) return false
      if (item.kind === 'todo' && !showTodos) return false
      return true
    })
  }, [items, showAssignments, showTodos, showCompleted])

  const itemsByDate = useMemo(() => {
    const grouped = new Map<string, CalendarItem[]>()
    for (const item of visibleItems) {
      const existing = grouped.get(item.dateKey) ?? []
      existing.push(item)
      grouped.set(item.dateKey, existing)
    }
    return grouped
  }, [visibleItems])

  const selectedDateKey = format(selectedDate, 'yyyy-MM-dd')
  const selectedItems = (itemsByDate.get(selectedDateKey) ?? []).sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1
    return a.title.localeCompare(b.title)
  })

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const gridStart = startOfWeek(monthStart)
  const gridEnd = endOfWeek(monthEnd)

  const dayCells: Date[] = []
  let day = gridStart
  while (day <= gridEnd) {
    dayCells.push(day)
    day = addDays(day, 1)
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-white px-4 py-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Calendar</h1>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">{format(currentMonth, 'MMMM yyyy')}</h2>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={showAssignments} onChange={(e) => setShowAssignments(e.target.checked)} />
            Assignments
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={showTodos} onChange={(e) => setShowTodos(e.target.checked)} />
            To-Dos
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={showCompleted} onChange={(e) => setShowCompleted(e.target.checked)} />
            Show Completed
          </label>
          <div className="ml-1 flex items-center gap-2">
            <button
              className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1 text-sm"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              Prev
            </button>
            <button
              className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1 text-sm"
              onClick={() => {
                setCurrentMonth(new Date())
                setSelectedDate(new Date())
              }}
            >
              Today
            </button>
            <button
              className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1 text-sm"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
          <div className="mb-2 grid grid-cols-7 text-center text-xs text-zinc-400">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label) => (
              <div key={label} className="py-2">
                {label}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {dayCells.map((cellDate) => {
              const key = format(cellDate, 'yyyy-MM-dd')
              const dayItems = itemsByDate.get(key) ?? []
              const assignmentCount = dayItems.filter((item) => item.kind === 'assignment').length
              const todoCount = dayItems.filter((item) => item.kind === 'todo').length

              return (
                <button
                  key={key}
                  onClick={() => setSelectedDate(cellDate)}
                  className={`min-h-24 rounded border p-2 text-left transition ${
                    isSameDay(cellDate, selectedDate)
                      ? 'border-blue-500 bg-zinc-700'
                      : 'border-zinc-700 bg-zinc-900 hover:bg-zinc-700'
                  } ${isSameMonth(cellDate, currentMonth) ? 'text-white' : 'text-zinc-500'}`}
                >
                  <div className="mb-2 text-sm font-semibold">{format(cellDate, 'd')}</div>
                  <div className="space-y-1">
                    {assignmentCount > 0 && (
                      <div className="inline-block rounded-full bg-blue-600 px-2 py-0.5 text-[11px] text-white">
                        {assignmentCount} assignment{assignmentCount > 1 ? 's' : ''}
                      </div>
                    )}
                    {todoCount > 0 && (
                      <div className="inline-block rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] text-white">
                        {todoCount} todo{todoCount > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        <aside className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
          <h3 className="text-lg font-semibold">{format(selectedDate, 'EEEE, MMMM d')}</h3>
          <p className="mt-1 text-sm text-zinc-400">{selectedItems.length} item{selectedItems.length === 1 ? '' : 's'}</p>

          <div className="mt-4 space-y-2">
            {selectedItems.length === 0 ? (
              <div className="rounded border border-zinc-700 bg-zinc-900 p-3 text-sm text-zinc-400">No due items.</div>
            ) : (
              selectedItems.map((item) => (
                <div key={`${item.kind}-${item.id}`} className="rounded border border-zinc-700 bg-zinc-900 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs uppercase tracking-wide ${item.kind === 'assignment' ? 'text-blue-400' : 'text-emerald-400'}`}>
                      {item.kind}
                    </span>
                    {item.completed && <span className="text-xs text-zinc-500">Completed</span>}
                  </div>
                  <p className={`mt-1 text-sm ${item.completed ? 'text-zinc-500 line-through' : 'text-white'}`}>{item.title}</p>
                  <p className="mt-1 text-xs text-zinc-400">{item.meta}</p>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
