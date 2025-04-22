'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Task, TaskList } from './types'
import TodoSidebar from './todosidebar'
import TaskListCard from './tasklistcard'

export default function TodoPage() {
  const [selectedLists, setSelectedLists] = useState<string[]>([])
  const [lists, setLists] = useState<TaskList[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedListId, setSelectedListId] = useState<string | null>(null)

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

  const handleNewTask = (newTask: Task) => {
    setTasks((prev) => [...prev, newTask])
  }

  const handleToggleComplete = async (taskId: string, value: boolean) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed: value } : t))
    )

    await supabase.from('todos').update({ completed: value }).eq('id', taskId)
  }

  const taskCounts = tasks.reduce((acc, task) => {
    if (!task.completed) {
      acc[task.list_id] = (acc[task.list_id] || 0) + 1
    }
    return acc
  }, {} as Record<string, number>)

  const visibleLists = lists.filter((list) => selectedLists.includes(list.id))

  const grouped = visibleLists.map((list) => ({
    list,
    tasks: tasks.filter((t) => t.list_id === list.id),
  }))

  return (
    <div className="flex">
      <TodoSidebar
        selectedLists={selectedLists}
        setSelectedLists={setSelectedLists}
        lists={lists}
        setLists={setLists}
        onTaskCreate={handleNewTask}
        taskCounts={taskCounts}
      />
      <div className="flex-1 max-h-screen overflow-y-auto overflow-x-auto p-6 bg-zinc-900 text-white">
        <h1 className="text-2xl font-bold mb-4">Your Tasks</h1>
        <div className="flex gap-6 flex-wrap">
          {grouped.map(({ list, tasks }) => (
            <TaskListCard
              key={list.id}
              list={list}
              tasks={tasks}
              onTaskCreate={handleNewTask}
              onToggleComplete={handleToggleComplete}
              setLists={setLists}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
