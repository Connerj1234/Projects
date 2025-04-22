'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '@/lib/supabase/client'
import { TaskList } from './types'

export default function DeleteListConfirmation({
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
  const handleDelete = async () => {
    const { error } = await supabase
      .from('todo_lists')
      .delete()
      .eq('id', list.id)

    if (!error) {
      setLists((prev) => prev.filter((l) => l.id !== list.id))
      setOpen(false)
    }
  }

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 "
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false)
      }}
    >
      <div
        className="bg-zinc-900 border border-white p-6 rounded-lg shadow-lg w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-white text-lg font-semibold mb-4">
          Delete this list?
        </h2>
        <p className="text-sm text-zinc-400 mb-4">
          This will permanently delete the list. You can only delete lists
          without incomplete tasks.
        </p>
        <div className="mt-4 flex justify-end gap-2">
        <button
            onClick={() => setOpen(false)}
            className="px-4 py-2 rounded bg-zinc-700 hover:bg-zinc-600 text-sm text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            className="text-sm px-4 py-2 bg-red-600 text-white rounded"
          >
            Delete
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
