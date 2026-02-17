'use client'

import { useState } from 'react'
import { db } from '@/lib/localdb/client'
import { TaskList } from './types'

interface ModalProps {
    open: boolean
    setOpen: (open: boolean) => void
    onCreate: (newList: TaskList) => void
  }

export default function CreateListModal({ open, setOpen, onCreate }: ModalProps) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    setLoading(true)
    const {
      data: { user },
      error: userError,
    } = await db.auth.getUser()

    if (userError || !user) {
      alert('Error fetching user info')
      setLoading(false)
      return
    }

    const { data: existingLists, error: fetchError } = await db
      .from('todo_lists')
      .select('order_index')
      .eq('user_id', user.id)

    if (fetchError) {
      alert('Error fetching list order: ' + fetchError.message)
      setLoading(false)
      return
    }

    const nextIndex = existingLists?.length || 0

    const { data, error } = await db
      .from('todo_lists')
      .insert([
        {
          name,
          user_id: user.id,
          order_index: nextIndex,
        },
      ])
      .select()
      .single()

    if (error) {
      alert('Error creating list: ' + error.message)
    } else {
      onCreate(data)
      setOpen(false)
      setName('')
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
        <h2 className="text-lg font-semibold mb-4">Create New List</h2>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="List name"
          className="w-full px-3 py-2 rounded-md placeholder-gray-400 bg-zinc-850 border border-white text-white mb-4"
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setOpen(false)}
            className="px-4 py-2 rounded bg-zinc-700 hover:bg-zinc-600 text-sm">
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={loading || !name}
            className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-sm text-white">
            {loading ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}
