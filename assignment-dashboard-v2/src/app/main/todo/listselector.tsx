'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface TaskList {
  id: string
  name: string
}

interface Props {
  selectedLists: string[]
  setSelectedLists: (listIds: string[]) => void
}

export default function ListSelector({ selectedLists, setSelectedLists }: Props) {
  const [lists, setLists] = useState<TaskList[]>([])
  const [expanded, setExpanded] = useState(true)
  const [initialized, setInitialized] = useState(false)

  // Load task lists from Supabase
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
      }
    }

    fetchLists()
  }, [])

  // Once lists are loaded, initialize selection
  useEffect(() => {
    if (lists.length > 0 && !initialized) {
      const stored = localStorage.getItem('selected-task-lists')
      if (stored) {
        const storedIds = JSON.parse(stored) as string[]
        setSelectedLists(storedIds)
      } else {
        const allIds = lists.map((list) => list.id)
        setSelectedLists(allIds)
      }
      setInitialized(true)
    }
  }, [lists, initialized, setSelectedLists])

  // Save selection anytime it changes (but only after init)
  useEffect(() => {
    if (initialized) {
      localStorage.setItem('selected-task-lists', JSON.stringify(selectedLists))
    }
  }, [selectedLists, initialized])

  const toggleList = (id: string) => {
    setSelectedLists((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        className="flex items-center justify-between text-sm font-medium cursor-pointer"
        onClick={() => setExpanded((prev) => !prev)}
      >
        <span>Lists</span>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </div>

      {expanded && (
        <div className="flex flex-col gap-2 text-sm text-zinc-300">
          {lists.map((list) => (
            <label key={list.id} className="flex items-center justify-between">
              <span>{list.name}</span>
              <input
                type="checkbox"
                checked={selectedLists.includes(list.id)}
                onChange={() => toggleList(list.id)}
              />
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
