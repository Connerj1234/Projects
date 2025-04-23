'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Task, TaskList } from './types'
import { createPortal } from 'react-dom'

export default function EditTaskModal({ open, setOpen, task, lists, setTasks }: {
  open: boolean
  setOpen: (open: boolean) => void
  task: Task
  lists: TaskList[]
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>
}) {
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [dueDate, setDueDate] = useState<string | null>(null)
  const [listId, setListId] = useState('')

  useEffect(() => {
    setTitle(task.title || '')
    setNotes(task.notes || '')
    setDueDate(task.due_date || null)
    setListId(task.list_id)
  }, [task])

  const handleSave = async () => {
    const { error } = await supabase
      .from('todos')
      .update({ title, notes, due_date: dueDate || null, list_id: listId })
      .eq('id', task.id)

    if (!error) {
      setTasks(prev =>
        prev.map(t =>
          t.id === task.id ? { ...t, title, notes, due_date: dueDate || null, list_id: listId } : t
        )
      )
      setOpen(false)
    }
  }

  const handleDelete = async () => {
    const { error } = await supabase.from('todos').delete().eq('id', task.id)
    if (!error) {
      setTasks(prev => prev.filter(t => t.id !== task.id))
      setOpen(false)
    }
  }

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false)
      }}
    >
      <div
        className="bg-zinc-900 border border-white p-6 rounded-md w-full max-w-md shadow-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-4 text-white">Edit Task</h2>

        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Title"
          className="w-full px-3 py-2 rounded-md bg-zinc-900 placeholder-gray-400 border border-white text-white mb-4"
        />
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          className="w-full px-3 py-2 rounded-md bg-zinc-900 placeholder-gray-400 border border-white text-white mb-4 resize-none"
          rows={3}
        />
        <input
          type="date"
          value={dueDate ?? ''}
          onChange={e => setDueDate(e.target.value)}
          className="w-full px-3 py-2 rounded-md bg-zinc-900 border border-white text-white mb-4"
        />
        <select
          value={listId}
          onChange={e => setListId(e.target.value)}
          className="w-full px-3 py-2 rounded-md bg-zinc-800 border border-white text-white mb-4"
        >
          {lists.map(l => (
            <option key={l.id} value={l.id} className="text-black">
              {l.name}
            </option>
          ))}
        </select>
        <div className="flex justify-between gap-3">
          <button
            onClick={handleDelete}
            className="rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
          >
            Delete
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => setOpen(false)}
              className="px-4 py-2 rounded bg-zinc-700 hover:bg-zinc-600 text-sm text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
