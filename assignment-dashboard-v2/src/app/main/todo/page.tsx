'use client'

import { useState } from 'react'
import TodoSidebar from './todosidebar'

export default function TodoPage() {
  const [selectedLists, setSelectedLists] = useState<string[]>([])

  return (
    <div className="flex min-h-screen bg-zinc-900 text-white">
      <TodoSidebar
        selectedLists={selectedLists}
        setSelectedLists={setSelectedLists}
      />
      <main className="flex-1 p-6">
        <h1 className="text-2xl font-bold mb-4">Your Tasks</h1>
        {/* Tasks will be listed here based on selectedLists */}
      </main>
    </div>
  )
}
