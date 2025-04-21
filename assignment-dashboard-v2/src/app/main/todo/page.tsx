'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Task, TaskList } from './types'
import TodoSidebar from './todosidebar'

export default function TodoPage() {
  const [selectedLists, setSelectedLists] = useState<string[]>([])
  const [lists, setLists] = useState<TaskList[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const handleNewTask = (newTask: Task) => {
    setTasks((prev) => [...prev, newTask])
  }

  // Fetch all task lists (todo_lists)
  useEffect(() => {
    const fetchLists = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('todo_lists')
        .select('id, name')
        .eq('user_id', user.id)

      if (!error && data) {
        setLists(data)
      }
    }

    fetchLists()
  }, [])

  // Fetch tasks from selected lists
  useEffect(() => {
    const fetchTasks = async () => {
      if (selectedLists.length === 0) return

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .eq('user_id', user.id)
        .in('list_id', selectedLists)

      if (!error && data) {
        setTasks(data)
      }
    }

    fetchTasks()
  }, [selectedLists])

  // Match list names to task groups
  const visibleLists = lists.filter((list) => selectedLists.includes(list.id))

  const grouped = visibleLists.map((list) => ({
    list,
    tasks: tasks.filter((t) => t.list_id === list.id),
  }))

  return (
    <div className="flex min-h-screen bg-zinc-900 text-white">
      <TodoSidebar
        selectedLists={selectedLists}
        setSelectedLists={setSelectedLists}
        lists={lists}
        setLists={setLists}
        onTaskCreate={handleNewTask}
      />
      <main className="flex-1 p-6 overflow-x-auto">
        <div className="flex gap-4">
          {grouped.map(({ list, tasks }) => (
            <div
              key={list.id}
              className="bg-zinc-800 rounded-lg p-4 min-w-[250px] w-1/3 flex-shrink-0"
            >
              <h2 className="text-lg font-semibold mb-2">{list.name}</h2>
              {tasks.length === 0 ? (
                <p className="text-sm text-zinc-400">All tasks complete!</p>
              ) : (
                <ul className="space-y-1">
                  {tasks.map((task) => (
                    <li key={task.id} className="text-sm">
                      • {task.title}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
