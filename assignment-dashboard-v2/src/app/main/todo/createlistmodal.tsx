'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'

export default function CreateListModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    setLoading(true)
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      alert('Error fetching user info')
      setLoading(false)
      return
    }

    const { error } = await supabase.from('todo_lists').insert([
      {
        name,
        user_id: user.id,
      },
    ])

    if (error) {
      alert('Error creating list: ' + error.message)
    } else {
      onClose()
      setName('')
    }
    setLoading(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-zinc-900 p-6 rounded-md w-full max-w-md shadow-md">
        <h2 className="text-lg font-semibold mb-4">Create New List</h2>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="List name"
          className="w-full px-3 py-2 rounded-md bg-zinc-800 border border-zinc-700 text-white mb-4"
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-zinc-700 hover:bg-zinc-600 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={loading || !name}
            className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-sm text-white"
          >
            {loading ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}
