'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Task, TaskList } from './types'

interface ModalProps {
  open: boolean
  setOpen: (open: boolean) => void
  lists: TaskList[]
  onCreate: (newTask: Task) => void
}

export default function CreateTaskModal({ open, setOpen, lists, onCreate }: ModalProps) {
  const [title, setTitle] = useState('')
  const [selectedListId, setSelectedListId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    if (!title || !selectedListId) {
      alert('Please enter a title and select a list.')
      return
    }

    setLoading(true)
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      alert('Error fetching user info')
      setLoading(false)
      return
    }

    const { data, error } = await supabase
     .from('todos')
     .insert([{ title, list_id: selectedListId, user_id: user.id }])
     .select()
     .single()
    if (error) {
      alert('Error creating task: ' + error.message)
    } else {
      onCreate(data)
      setOpen(false)
      setTitle('')
      setSelectedListId(null)
    }

    setLoading(false)
  }
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setOpen(false)
        }
      }}
    >
      <div className="bg-zinc-900 border border-white p-6 rounded-md w-full max-w-md shadow-md">
        <h2 className="text-lg font-semibold mb-4">Create New Task</h2>
        {lists.length === 0 ? (
          <p className="text-red-500 text-sm mb-4">⚠️ You must create a list before adding tasks.</p>
        ) : (
          <>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              className="w-full px-3 py-2 rounded-md bg-zinc-900 placeholder-gray-400 border border-white text-white mb-4"
            />
            <select
              value={selectedListId ?? ''}
              onChange={(e) => setSelectedListId(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-zinc-800 border border-white text-white mb-4"
            >
              <option value="" disabled>Select a list</option>
              {lists.map((list) => (
                <option key={list.id} value={list.id}>{list.name}</option>
              ))}
            </select>
          </>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={() => setOpen(false)}
            className="px-4 py-2 rounded bg-zinc-700 hover:bg-zinc-600 text-sm">
            Cancel
          </button>

          <button
            onClick={handleCreate}
            disabled={loading || !title || !selectedListId}
            className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-sm text-white">
            {loading ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}
