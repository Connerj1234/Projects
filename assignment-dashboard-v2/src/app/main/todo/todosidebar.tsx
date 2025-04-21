'use client'

import { useEffect, useState } from 'react'
import { PlusIcon } from 'lucide-react'
import CreateListModal from './createlistmodal'
import CreateTaskModal from './createtaskmodal'
import ListSelector from './listselector'
import { supabase } from '@/lib/supabase/client'
import { TaskList } from './types'

export default function TodoSidebar({
  selectedLists,
  setSelectedLists,
}: {
  selectedLists: string[]
  setSelectedLists: (ids: string[]) => void
}) {
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [showListModal, setShowListModal] = useState(false)
  const [lists, setLists] = useState<TaskList[]>([])

  const handleNewList = (newList: TaskList) => {
    setLists((prev) => [...prev, newList])           // Add to dropdown
    setSelectedLists((prev) => [...prev, newList.id]) // Auto-select
  }


  useEffect(() => {
    const fetchLists = async () => {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) return

      const { data, error } = await supabase
        .from('todo_lists')
        .select('id, name')
        .eq('user_id', user.id)

      if (!error && data) {
        setLists(data)
        setSelectedLists(data.map((l) => l.id)) // default: all selected
      }
    }

    fetchLists()
  }, [])


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

      <ListSelector
        lists={lists}
        selectedLists={selectedLists}
        setSelectedLists={setSelectedLists}
      />

      <CreateTaskModal open={showTaskModal} setOpen={setShowTaskModal} />
      <CreateListModal open={showListModal} setOpen={setShowListModal} onCreate={handleNewList} />
    </aside>
  )
}
