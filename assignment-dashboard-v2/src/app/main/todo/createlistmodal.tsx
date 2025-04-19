'use client'

import { useState } from 'react'

export default function CreateListModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [listName, setListName] = useState('')

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-md border border-zinc-700 px-3 py-1 text-sm hover:bg-zinc-800"
      >
        + Create List
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 p-6 rounded-md w-full max-w-sm text-white">
            <h2 className="text-lg font-semibold mb-4">Create New List</h2>
            <input
              type="text"
              placeholder="List name"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              className="w-full p-2 rounded-md bg-zinc-800 border border-zinc-700 mb-4"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setIsOpen(false)}
                className="text-sm px-4 py-2 bg-zinc-700 rounded-md hover:bg-zinc-600"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // placeholder: call function to create list
                  setIsOpen(false)
                }}
                className="text-sm px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-500"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
