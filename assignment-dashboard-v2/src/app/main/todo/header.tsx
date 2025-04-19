'use client'

import { useState } from 'react'
import CreateListModal from './createlistmodal'
import ListSelector from './listselector'
import CreateTaskModal from './createtaskmodal'

export default function TodoHeader() {
  const [showListModal, setShowListModal] = useState(false)
  const [showTaskModal, setShowTaskModal] = useState(false)

  return (
    <>
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-4">
        <div className="flex items-center gap-2">
          <ListSelector />
          <button
            onClick={() => setShowListModal(true)}
            className="bg-zinc-800 text-white px-3 py-1.5 rounded-md hover:bg-zinc-700 text-sm"
          >
            + Create List
          </button>
        </div>
        <button
          onClick={() => setShowTaskModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-500 text-sm"
        >
          + New Task
        </button>
      </div>

      {showListModal && <CreateListModal onClose={() => setShowListModal(false)} />}
      {showTaskModal && <CreateTaskModal onClose={() => setShowTaskModal(false)} />}
    </>
  )
}
