'use client'

import { useState } from 'react'
import { PlusIcon } from 'lucide-react'
import CreateListModal from './createlistmodal'
import CreateTaskModal from './createtaskmodal'
import ListSelector from './listselector'

export default function TodoSidebar({
  selectedLists,
  setSelectedLists,
}: {
  selectedLists: string[]
  setSelectedLists: (ids: string[]) => void
}) {
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [showListModal, setShowListModal] = useState(false)

  return (
    <aside className="w-44 min-h-screen bg-zinc-900 text-white p-4 flex flex-col justify-start gap-6">
      <button
        onClick={() => setShowTaskModal(true)}
        className="bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 px-4 rounded-md text-sm flex items-center justify-center"
      >
        <PlusIcon className="w-4 h-4 mr-2" />
        New Task
      </button>

      <button
        onClick={() => setShowListModal(true)}
        className="bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-2 px-4 rounded-md text-sm flex items-center justify-center"
      >
        <PlusIcon className="w-4 h-4 mr-2" />
        Create List
      </button>

      <ListSelector selectedLists={selectedLists} setSelectedLists={setSelectedLists} />

      <CreateTaskModal open={showTaskModal} setOpen={setShowTaskModal} />
      <CreateListModal open={showListModal} setOpen={setShowListModal} />
    </aside>
  )
}
