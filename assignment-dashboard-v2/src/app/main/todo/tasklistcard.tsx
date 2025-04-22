'use client'

import { useState } from 'react'
import { MoreVertical } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import RenameListModal from './renamelistmodal'
import DeleteListConfirmation from './deletelistconfirmation'
import { Task, TaskList } from './types'
import { useRef, useEffect } from 'react'
import AddTaskModal from './addtaskmodal'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export default function TaskListCard({
  id,
  list,
  tasks,
  onTaskCreate,
  onToggleComplete,
  setLists,
  allLists,
}: {
  id: string
  list: TaskList
  tasks: Task[]
  onTaskCreate: (task: Task) => void
  onToggleComplete: (taskId: string, value: boolean) => void
  setLists: React.Dispatch<React.SetStateAction<TaskList[]>>
  allLists: TaskList[]
}) {
  const [showInput, setShowInput] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showRename, setShowRename] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)

  const incomplete = tasks.filter((t) => !t.completed)
  const complete = tasks.filter((t) => t.completed)

  const dropdownRef = useRef<HTMLDivElement | null>(null)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleSubmit = async () => {
    if (!newTitle) return
    setLoading(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('todos')
      .insert([{ title: newTitle, list_id: list.id, user_id: user.id }])
      .select()
      .single()

    if (!error && data) {
      onTaskCreate(data)
      setNewTitle('')
      setShowInput(false)
    }

    setLoading(false)
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        touchAction: 'manipulation',
        willChange: 'transform',
      }}
      className="bg-zinc-800 rounded-xl w-[350px] flex-shrink-0 shadow-md border border-zinc-700 flex flex-col justify-between p-4"
    >
        <div className="flex justify-between items-center mb-2">
          <div
            {...attributes}
            {...listeners}
            className="absolute top-1 left-1/2 -translate-x-1/2 w-10 h-1.5 bg-zinc-600 rounded-full opacity-80 cursor-grab"
            title="Drag to reorder"
          />
        <h2 className="text-base font-semibold">{list.name}</h2>
        <div className="flex items-center gap-4 relative">
          <button
            className="text-xs text-blue-400 hover:underline"
            onClick={() => setShowAddModal(true)}
          >
            Add a task
          </button>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="text-zinc-400 hover:text-white"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && (
            <div ref={dropdownRef} className="absolute right-0 top-6 w-48 bg-zinc-800 border border-zinc-700 rounded shadow-lg text-sm z-50">
              <div className="px-3 py-2 text-zinc-400">Sort by</div>
              <ul className="border-b border-zinc-700">
                <li className="px-4 py-2 hover:bg-zinc-700 cursor-pointer">My order</li>
                <li className="px-4 py-2 hover:bg-zinc-700 cursor-pointer">Date</li>
                <li className="px-4 py-2 hover:bg-zinc-700 cursor-pointer">Title</li>
              </ul>
              <ul>
                <li
                  onClick={() => {
                    setShowRename(true)
                    setShowMenu(false)
                  }}
                  className="px-4 py-2 hover:bg-zinc-700 cursor-pointer"
                >
                  Rename list
                </li>
                <li
                  onClick={() => {
                    if (incomplete.length === 0) {
                      setShowDelete(true)
                      setShowMenu(false)
                    }
                  }}
                  className={`px-4 py-2 ${
                    incomplete.length > 0
                      ? 'text-zinc-500 cursor-not-allowed'
                      : 'hover:bg-zinc-700 cursor-pointer text-red-500'
                  }`}
                >
                  Delete list
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
      <AddTaskModal
        open={showAddModal}
        setOpen={setShowAddModal}
        initialList={list}
        allLists={allLists}
        onTaskCreate={onTaskCreate}
      />
      {incomplete.length === 0 ? (
        <div className="flex flex-col items-center text-center py-4">
          <div className="text-3xl">✅</div>
          <p className="text-sm text-zinc-400 mt-1">All tasks complete!</p>
        </div>
      ) : (
        <ul className="flex-1 space-y-2">
          {incomplete.map((task) => (
            <li key={task.id} className="flex items-start gap-4 text-sm">
              <input
                type="checkbox"
                className="mt-1 accent-blue-500"
                onChange={() => onToggleComplete(task.id, true)}
              />
              <div>
                <div>{task.title}</div>
                {task.notes && (
                  <div className="text-xs text-zinc-400 mt-0.5">{task.notes}</div>
                )}
                {task.due_date && (
                  <div className="text-xs text-zinc-500 mt-0.5">
                    {new Date(task.due_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <details className="mt-4 text-sm text-zinc-400">
      <summary className="text-sm text-zinc-400">
        <span className="inline-flex items-center gap-1 hover:text-white cursor-pointer">
          Completed ({complete.length})
        </span>
      </summary>
        <ul className="mt-2 space-y-1">
          {complete.map((task) => (
            <li key={task.id} className="flex items-start gap-2">
              <input
                type="checkbox"
                className="mt-0.5 accent-blue-500"
                checked
                onChange={() => onToggleComplete(task.id, false)}
              />
              <div className="line-through opacity-60">
                <div>{task.title}</div>
                {task.notes && (
                  <div className="text-xs text-zinc-400 mt-0.5">{task.notes}</div>
                )}
                {task.due_date && (
                  <div className="text-xs text-zinc-500 mt-0.5">
                    {new Date(task.due_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </details>

      <RenameListModal open={showRename} setOpen={setShowRename} list={list} setLists={setLists} />
      <DeleteListConfirmation open={showDelete} setOpen={setShowDelete} list={list} setLists={setLists} />
    </div>
  )
}
