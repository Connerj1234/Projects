'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Task, TaskList } from './types'
import TodoSidebar from './todosidebar'
import TaskListCard from './tasklistcard'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'

export default function TodoPage() {
  const [selectedLists, setSelectedLists] = useState<string[]>([])
  const [lists, setLists] = useState<TaskList[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const sensors = useSensors(useSensor(PointerSensor))

  useEffect(() => {
    const fetchLists = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('todo_lists')
        .select('id, name, order_index')
        .eq('user_id', user.id)
        .order('order_index', { ascending: true })

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

  const handleDragEnd = async ({ active, over }: any) => {
    if (!over || active.id === over.id) return

    const oldIndex = lists.findIndex((l) => l.id === active.id)
    const newIndex = lists.findIndex((l) => l.id === over.id)
    const reordered = arrayMove(lists, oldIndex, newIndex)

    setLists(reordered)

    // ✅ Persist to Supabase
    await Promise.all(
      reordered.map((list, index) =>
        supabase
          .from('todo_lists')
          .update({ order_index: index })
          .eq('id', list.id)
      )
    )
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
     <div className="flex-1 p-6 bg-zinc-900 text-white overflow-y-auto">
        <h1 className="text-2xl font-bold mb-4">Your Tasks</h1>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={lists.map((l) => l.id)} strategy={verticalListSortingStrategy}>
            <div className="relative flex flex-wrap gap-4 items-start">
              {grouped.map(({ list, tasks }) => (
                <TaskListCard
                  key={list.id}
                  id={list.id}
                  list={list}
                  tasks={tasks}
                  onTaskCreate={handleNewTask}
                  onToggleComplete={handleToggleComplete}
                  setLists={setLists}
                  allLists={lists}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  )
}
