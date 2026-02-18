'use client'

import { useEffect, useState } from 'react'
import { PlusIcon } from 'lucide-react'
import CreateListModal from './createlistmodal'
import CreateTaskModal from './createtaskmodal'
import ListSelector from './listselector'
import { db } from '@/lib/localdb/client'
import { Task, TaskList } from './types'

export default function TodoSidebar({
    selectedLists,
    setSelectedLists,
    lists,
    setLists,
    onTaskCreate,
    taskCounts,
  }: {
    selectedLists: string[]
    setSelectedLists: React.Dispatch<React.SetStateAction<string[]>>
    lists: TaskList[]
    setLists: React.Dispatch<React.SetStateAction<TaskList[]>>
    onTaskCreate: (newTask: Task) => void
    taskCounts: Record<string, number>
  })
  {
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [showListModal, setShowListModal] = useState(false)

  const handleNewList = (newList: TaskList) => {
    setLists((prev) => [...prev, newList])
    setSelectedLists((prev) => [...prev, newList.id])
  }

  useEffect(() => {
    const fetchLists = async () => {
      const { data, error } = await db.from('todo_lists').select('*').order('order', { ascending: true })
      if (!error && data) {
        const typedLists = data as TaskList[]
        setLists(typedLists)
        setSelectedLists(typedLists.map((l: TaskList) => l.id))
      }
    }
    fetchLists()
  }, [setLists, setSelectedLists])

  return (
    <aside className="w-44 min-h-screen bg-zinc-900 text-white p-4 ml-4 b-10 flex flex-col justify-start gap-6">
      <button
        onClick={() => setShowTaskModal(true)}
        className="bg-blue-600 hover:bg-blue-500 text-white font-medium mt-2 py-2 px-4 rounded-md text-sm flex items-center justify-center">
        <PlusIcon className="w-4 h-4 mr-2" />
        New Task
      </button>

      <ListSelector
        lists={lists}
        selectedLists={selectedLists}
        setSelectedLists={setSelectedLists}
        taskCounts={taskCounts}/>

      <button
        onClick={() => setShowListModal(true)}
        className="bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-2 px-4 rounded-md text-sm flex items-center justify-center">
        <PlusIcon className="w-4 h-4 mr-2" />
        Create List
      </button>

      <CreateTaskModal open={showTaskModal} setOpen={setShowTaskModal} lists={lists} onCreate={onTaskCreate}    />
      <CreateListModal open={showListModal} setOpen={setShowListModal} onCreate={handleNewList} />
    </aside>
  )
}
