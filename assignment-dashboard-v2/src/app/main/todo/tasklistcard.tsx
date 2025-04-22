'use client'

import { useState } from 'react'
import { Task, TaskList } from './types'
import { supabase } from '@/lib/supabase/client'

export default function TaskListCard({
  list,
  tasks,
  onTaskCreate,
  onToggleComplete,
}: {
  list: TaskList
  tasks: Task[]
  onTaskCreate: (task: Task) => void
  onToggleComplete: (taskId: string, value: boolean) => void
  onOpenDetail?: () => void
}) {
  const [showInput, setShowInput] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [loading, setLoading] = useState(false)

  const incomplete = tasks.filter((t) => !t.completed)
  const complete = tasks.filter((t) => t.completed)

  const handleSubmit = async () => {
    if (!newTitle) return

    setLoading(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        setLoading(false)
        return
      }

    const { data, error } = await supabase
      .from('todos')
      .insert([{ title: newTitle, list_id: list.id, user_id: user.id }])
      .select()
      .single()

    if (!error && data) {
      onTaskCreate(data)
      setNewTitle('')
      setShowInput(false)
    }

    setLoading(false)
  }

  return (
    <div className="bg-zinc-800 rounded-xl p-4 w-[320px] flex-shrink-0 shadow-md border border-zinc-700 flex flex-col justify-between">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-base font-semibold">{list.name}</h2>
        <button
          className="text-xs text-blue-400 hover:underline"
          onClick={() => setShowInput(true)}
        >
          Add a task
        </button>
      </div>

      {showInput && (
        <div className="mb-3 flex gap-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="New task title"
            className="flex-1 text-sm px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-white"
          />
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-2 py-1 text-sm bg-blue-600 rounded text-white"
          >
            {loading ? '...' : 'Add'}
          </button>
        </div>
      )}

      {incomplete.length === 0 ? (
        <div className="flex flex-col items-center text-center py-4">
          <div className="text-3xl">✅</div>
          <p className="text-sm text-zinc-400 mt-1">All tasks complete!</p>
        </div>
      ) : (
        <ul className="flex-1 space-y-2">
          {incomplete.map((task) => (
            <li key={task.id} className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1 accent-blue-500"
                onChange={() => onToggleComplete(task.id, true)}
              />
              <span>{task.title}</span>
            </li>
          ))}
        </ul>
      )}

      <details className="mt-4 text-sm text-zinc-400">
        <summary className="cursor-pointer">Completed ({complete.length})</summary>
        <ul className="mt-2 space-y-1">
          {complete.map((task) => (
            <li key={task.id} className="flex items-start gap-2">
              <input
                type="checkbox"
                className="mt-1 accent-blue-500"
                checked
                onChange={() => onToggleComplete(task.id, false)}
              />
              <span className="line-through opacity-60">{task.title}</span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  )
}
