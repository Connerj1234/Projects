'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '@/lib/supabase/client'
import { Task, TaskList } from './types'

export default function DeleteListConfirmation({
  open,
  setOpen,
  list,
  tasks,
  setLists,
}: {
  open: boolean
  setOpen: (open: boolean) => void
  list: TaskList
  tasks: Task[]
  setLists: React.Dispatch<React.SetStateAction<TaskList[]>>
}) {
  const [confirm, setConfirm] = useState(false)
  const taskList = tasks ?? []
  const hasIncomplete = tasks.some((t) => !t.completed)
  const hasTasks = tasks.length > 0

  const handleDelete = async () => {
    // Delete tasks first if they exist
    if (hasTasks) {
      await supabase.from('todos').delete().eq('list_id', list.id)
    }

    await supabase.from('todo_lists').delete().eq('id', list.id)

    setLists((prev) => prev.filter((l) => l.id !== list.id))
    setOpen(false)
    setConfirm(false)
  }

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setOpen(false)
          setConfirm(false)
        }
      }}
    >
      <div
        className="bg-zinc-900 border border-white p-6 rounded-lg shadow-lg w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-white text-lg font-semibold mb-4">Delete List</h2>

        {hasIncomplete ? (
          <p className="text-sm text-red-400 mb-4">
            You must complete all tasks before deleting this list.
          </p>
        ) : hasTasks && !confirm ? (
          <p className="text-sm text-zinc-300 mb-4">
            This list has completed tasks. Are you sure you want to delete both
            the list and its tasks?
          </p>
        ) : (
          <p className="text-sm text-zinc-400 mb-4">
            This will permanently delete the list
            {hasTasks ? ' and its tasks' : ''}.
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={() => {
              setOpen(false)
              setConfirm(false)
            }}
            className="text-sm px-4 py-2 rounded border border-white text-white"
          >
            Cancel
          </button>

          <button
            disabled={hasIncomplete}
            onClick={() => {
              if (hasTasks && !confirm) {
                setConfirm(true)
              } else {
                handleDelete()
              }
            }}
            className={`text-sm px-4 py-2 rounded ${
              hasIncomplete
                ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
                : 'bg-red-600 text-white hover:bg-red-500'
            }`}
            title={hasIncomplete ? 'You must complete all tasks first' : ''}
          >
            {hasIncomplete
              ? 'Delete'
              : confirm
              ? 'Confirm Delete'
              : 'Delete'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
