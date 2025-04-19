'use client'

import React from 'react'

interface Props {
  open: boolean
  onClose: () => void
}

export default function CreateTaskModal({ open, onClose }: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black bg-opacity-30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 bg-zinc-800 rounded-lg p-6 w-full max-w-md shadow-lg">
        <h2 className="text-lg font-semibold mb-4">Create New Task</h2>

        {/* Form goes here */}

        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-700 rounded hover:bg-zinc-600"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
