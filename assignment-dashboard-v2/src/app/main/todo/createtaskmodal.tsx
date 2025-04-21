'use client'

import React from 'react'

interface ModalProps {
    open: boolean
    setOpen: (open: boolean) => void
  }


export default function CreateTaskModal({ open, setOpen }: ModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black bg-opacity-30 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />
      <div className="relative z-10 bg-zinc-800 rounded-lg p-6 w-full max-w-md shadow-lg">
        <h2 className="text-lg font-semibold mb-4">Create New Task</h2>

        {/* Form goes here */}

        <div className="flex justify-end mt-4">
          <button
            onClick={() => setOpen(false)}
            className="px-4 py-1.5 bg-zinc-700 rounded hover:bg-zinc-600"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
