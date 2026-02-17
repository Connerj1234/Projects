'use client'

import { useState } from 'react'
import { db } from '@/lib/localdb/client'
import { TaskList } from './types'
import { createPortal } from 'react-dom'

export default function RenameListModal({
  open,
  setOpen,
  list,
  setLists,
}: {
  open: boolean
  setOpen: (open: boolean) => void
  list: TaskList
  setLists: React.Dispatch<React.SetStateAction<TaskList[]>>
}) {
  const [name, setName] = useState(list.name)
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    setLoading(true)
    const { error } = await db
      .from('todo_lists')
      .update({ name })
      .eq('id', list.id)

    if (!error) {
      setLists((prev) =>
        prev.map((l) => (l.id === list.id ? { ...l, name } : l))
      )
      setOpen(false)
    }

    setLoading(false)
  }

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false)
      }}
    >
      <div
        className="bg-zinc-900 border border-white p-6 rounded-md shadow-lg w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-white text-lg font-semibold mb-4">Rename List</h2>
        <input
          className="w-full p-2 rounded bg-zinc-800 text-white placeholder-zinc-400 border border-white"
          placeholder="New list name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={() => setOpen(false)}
            className="px-4 py-2 rounded bg-zinc-700 hover:bg-zinc-600 text-sm text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="text-sm px-4 py-2 bg-blue-600 text-white rounded"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
