'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Task, TaskList } from './types'

export default function AddTaskModal({
  open,
  setOpen,
  initialList,
  allLists,
  onTaskCreate,
}: {
  open: boolean
  setOpen: (open: boolean) => void
  initialList: TaskList | null
  allLists: TaskList[]
  onTaskCreate: (task: Task) => void
}) {
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [selectedListId, setSelectedListId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (initialList) {
      setSelectedListId(initialList.id)
    }
  }, [initialList])

  const handleSubmit = async () => {
    if (!title || !selectedListId) return
    setLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('todos')
      .insert([
        {
          title,
          notes,
          due_date: dueDate,
          list_id: selectedListId,
          user_id: user.id,
        },
      ])
      .select()
      .single()

    if (!error && data) {
      onTaskCreate(data)
      setTitle('')
      setNotes('')
      setDueDate('')
      setSelectedListId(null)
      setOpen(false)
    }

    setLoading(false)
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false)
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-900 border border-white p-6 rounded-md w-full max-w-md shadow-md"
      >
        <h2 className="text-white text-lg font-semibold mb-4">Add Task</h2>

        <input
          type="text"
          placeholder="Task title"
          className="w-full px-3 py-2 rounded-md bg-zinc-900 placeholder-gray-400 border border-white text-white mb-4"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <textarea
          placeholder="Notes (optional)"
          className="w-full px-3 py-2 rounded-md bg-zinc-900 placeholder-gray-400 border border-white text-white mb-4 resize-none"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <input
          type="date"
          className="w-full px-3 py-2 rounded-md bg-zinc-900 border border-white text-white mb-4"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />

        <select
          value={selectedListId ?? ''}
          onChange={(e) => setSelectedListId(e.target.value)}
          className="w-full px-3 py-2 rounded-md bg-zinc-800 border border-white text-white mb-4"
        >
          <option value="" disabled>
            Select list
          </option>
          {allLists.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>

        <div className="flex justify-end gap-2">
          <button
            onClick={() => setOpen(false)}
            className="px-4 py-2 rounded bg-zinc-700 hover:bg-zinc-600 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm"
          >
            {loading ? 'Saving...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}
