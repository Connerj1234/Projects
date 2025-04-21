'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface TaskList {
  id: string
  name: string
}

interface Props {
    lists: TaskList[]
    selectedLists: string[]
    setSelectedLists: React.Dispatch<React.SetStateAction<string[]>>
  }

export default function ListSelector({ selectedLists, setSelectedLists, lists }: Props) {
  const [expanded, setExpanded] = useState(true)
  const [initialized, setInitialized] = useState(false)

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
    setSelectedLists((prev: string[]) =>
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
