'use client'

import { useState, useRef, useEffect, Dispatch, SetStateAction } from 'react'
import { MoreVertical, Trash } from 'lucide-react'
import RenameListModal from './renamelistmodal'
import DeleteListConfirmation from './deletelistconfirmation'
import { Task, TaskList } from './types'
import AddTaskModal from './addtaskmodal'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { createPortal } from 'react-dom'
import EditTaskModal from './edittaskmodal'
import { supabase } from '@/lib/supabase/client'

export default function TaskListCard({
  id,
  list,
  tasks,
  onTaskCreate,
  onToggleComplete,
  setLists,
  allLists,
  setTasks
}: {
  id: string
  list: TaskList
  tasks: Task[]
  onTaskCreate: (task: Task) => void
  onToggleComplete: (taskId: string, value: boolean) => void
  setLists: React.Dispatch<React.SetStateAction<TaskList[]>>
  allLists: TaskList[]
  setTasks: Dispatch<SetStateAction<Task[]>>
}) {
  const [showMenu, setShowMenu] = useState(false)
  const [showRename, setShowRename] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number, left: number } | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement | null>(null)
  const [sortOption, setSortOption] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sortOption') || 'order';
    }
    return 'order';
  });

  const incomplete = tasks.filter((t) => !t.completed)
  const complete = tasks.filter((t) => t.completed)

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm('Are you sure you want to permanently delete this completed task?')
    if (!confirmed) return

    const { error } = await supabase.from('todos').delete().eq('id', id)

    if (!error) {
      setTasks(prev => prev.filter(t => t.id !== id))
    }
  }

  const sortedIncomplete = [...incomplete].sort((a, b) => {
    if (sortOption === 'date') {
      const dateA = a.due_date ? new Date(a.due_date) : null
      const dateB = b.due_date ? new Date(b.due_date) : null
      if (!dateA) return 1
      if (!dateB) return -1
      return dateA.getTime() - dateB.getTime()
    } else if (sortOption === 'title') {
      return a.title.localeCompare(b.title)
    }
    return 0
  })

  const [showEdit, setShowEdit] = useState(false)
  const [activeTask, setActiveTask] = useState<Task | null>(null)

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

  const handleToggleMenu = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + 6,
        left: rect.right - 192,
      })
    }
    setShowMenu((prev) => !prev)
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

  const handleSort = (option: string) => {
    setSortOption(option);
    localStorage.setItem('sortOption', option);
    setShowMenu(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, touchAction: 'manipulation', willChange: 'transform' }}
      className="bg-zinc-800 rounded-xl w-[350px] flex-shrink-0 shadow-md border border-zinc-700 flex flex-col justify-between p-4"
    >
      <div className="flex justify-between items-center mb-2">
        <div
          {...attributes}
          {...listeners}
          className="absolute top-1 left-1/2 -translate-x-1/2 w-10 h-1.5 bg-zinc-400 rounded-full opacity-90 cursor-grab"
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
          <button ref={buttonRef} onClick={handleToggleMenu} className="text-white hover:text-white">
            <MoreVertical className="w-4 h-4 cursor-pointer" />
          </button>

          {showMenu && dropdownPosition &&
            createPortal(
              <div
                ref={dropdownRef}
                className="absolute z-[1000] w-48 bg-zinc-800 border border-zinc-700 rounded-md shadow-lg text-sm"
                style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
              >
                <div className="px-3 py-2 text-zinc-400">Sort by</div>
                <ul className="border-b border-zinc-700">
                  {['order', 'date', 'title'].map((option) => (
                    <li
                      key={option}
                      className="px-4 py-2 hover:bg-zinc-700 cursor-pointer flex items-center"
                      onClick={() => handleSort(option)}
                    >
                      {sortOption === option && <span className="text-zinc-400 mr-2">✔</span>}
                      <span className={`${sortOption !== option ? 'ml-[18px]' : ''} text-white capitalize`}>
                        {option === 'order' ? 'My order' : option}
                      </span>
                    </li>
                  ))}
                </ul>
                <ul>
                  <li onClick={() => { setShowRename(true); setShowMenu(false) }} className="px-4 py-2 hover:bg-zinc-700 cursor-pointer text-white">Rename list</li>
                  <li onClick={() => { if (incomplete.length === 0) { setShowDelete(true); setShowMenu(false) } }} className={`px-4 py-2 ${incomplete.length > 0 ? 'text-zinc-500 cursor-not-allowed' : 'hover:bg-zinc-700 cursor-pointer text-red-500'}`}>Delete list</li>
                </ul>
              </div>,
              document.body
            )}
        </div>
      </div>

      <AddTaskModal open={showAddModal} setOpen={setShowAddModal} list={list} allLists={allLists} onTaskCreate={onTaskCreate} />

      {sortedIncomplete.length === 0 ? (
        <div className="flex flex-col items-center text-center py-4">
          <div className="text-3xl">✅</div>
          <p className="text-sm text-zinc-400 mt-1">All tasks complete!</p>
        </div>
      ) : (
        <ul className="flex-1 space-y-2">
          {sortedIncomplete.map((task) => (
            <li key={task.id} className="group flex justify-between items-start px-2 text-sm">
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                className="mt-1 accent-blue-500"
                onChange={() => onToggleComplete(task.id, true)}
              />
              <div>
                <div className="">{task.title}</div>
                {task.notes && <div className="text-xs text-zinc-400 mt-0.5">{task.notes}</div>}
                {task.due_date && (
                  <div className="text-xs text-zinc-500 mt-0.5">
                    {new Date(task.due_date + 'T00:00:00').toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => {
                setActiveTask(task)
                setShowEdit(true)
              }}
              className="invisible group-hover:visible text-white cursor-pointer"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
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
      <li key={task.id} className="group flex justify-between items-start px-2 text-sm">
        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            className="mt-1 accent-blue-500"
            checked
            onChange={() => onToggleComplete(task.id, false)}
          />
          <div className="opacity-60">
            <div className="line-through">{task.title}</div>
            {task.notes && <div className="text-xs text-zinc-400 mt-0.5">{task.notes}</div>}
            {task.completed_on && (
              <div className="text-xs text-zinc-400 mt-0.5">
                Completed:{' '}
                {new Date(task.completed_on + 'T00:00:00').toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => handleDelete(task.id)}
          className="invisible group-hover:visible text-zinc-400 hover:text-red-500"
        >
          <Trash className="w-4 h-4 cursor-pointer" />
        </button>
      </li>
    ))}
  </ul>
</details>

      {activeTask && (
        <EditTaskModal
            open={showEdit}
            setOpen={setShowEdit}
            task={activeTask}
            lists={allLists}
            setTasks={setTasks}
        />
      )}

      <RenameListModal open={showRename} setOpen={setShowRename} list={list} setLists={setLists} />
      <DeleteListConfirmation open={showDelete} setOpen={setShowDelete} list={list} tasks={tasks} setLists={setLists} />
    </div>
  )
}
