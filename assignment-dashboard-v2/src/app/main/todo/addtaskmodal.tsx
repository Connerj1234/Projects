'use client'

import { useState, useEffect, useRef } from 'react'
import { db } from '@/lib/localdb/client'
import { Task, TaskList } from './types'
import { createPortal } from 'react-dom'

export default function AddTaskModal({
  open,
  setOpen,
  list,
  onTaskCreate,
  allLists
}: {
    open: boolean
    setOpen: (open: boolean) => void
    list: TaskList | null
    onTaskCreate: (task: Task) => void
    allLists: TaskList[]
}) {
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [selectedList, setSelectedList] = useState(list?.id ?? '')
  const [loading, setLoading] = useState(false)

  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (list?.id) {
      setSelectedList(list.id)
    }
  }, [list])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open, setOpen])

  if (!open) return null

  const handleSubmit = async () => {
    if (!title || !selectedList) return
    setLoading(true)

    const { data: { user } } = await db.auth.getUser()
    const { data, error } = await db
      .from('todos')
      .insert([
        {
          title,
          notes,
          due_date: dueDate || null,
          list_id: selectedList,
          user_id: user?.id,
        },
      ])
      .select()
      .single()

    if (!error && data) {
      onTaskCreate(data)
      setTitle('')
      setNotes('')
      setDueDate('')
      setSelectedList(list?.id ?? '')
      setOpen(false)
    }

    setLoading(false)
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div
        ref={modalRef}
        className="bg-zinc-900 border border-white p-6 rounded-md w-full max-w-md shadow-md"
      >
        <h2 className="text-lg font-semibold mb-4 text-white">Add Task</h2>
        <input
          type="text"
          placeholder="Task title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 rounded-md bg-zinc-900 placeholder-gray-400 border border-white text-white mb-4"
        />
        <textarea
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full px-3 py-2 rounded-md bg-zinc-900 placeholder-gray-400 border border-white text-white mb-4 resize-none"
          rows={3}
        />
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="w-full px-3 py-2 rounded-md bg-zinc-900 border border-white text-white mb-4"
        />
        <select
          value={selectedList}
          onChange={(e) => setSelectedList(e.target.value)}
          className="w-full px-3 py-2 rounded-md bg-zinc-800 border border-white text-white mb-4"
        >
          <option value="">Select a list</option>
          {allLists.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>

        <div className="flex justify-end gap-2">
          <button
            onClick={() => setOpen(false)}
            className="px-4 py-2 rounded bg-zinc-700 hover:bg-zinc-600 text-sm text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !title || !selectedList}
            className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-sm text-white"
          >
            {loading ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
