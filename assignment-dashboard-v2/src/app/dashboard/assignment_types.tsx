'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

type Props = {
  selectedSemester: string
}

type AssignmentType = {
  id: string
  name: string
  color: string | null
}

export default function AssignmentTypes({ selectedSemester }: Props) {
  const [types, setTypes] = useState<AssignmentType[]>([])
  const [newType, setNewType] = useState('')
  const [newColor, setNewColor] = useState('')

  const fetchTypes = async () => {
    const { data, error } = await supabase
      .from('assignment_types')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Failed to fetch types:', error.message)
    } else {
      setTypes(data)
    }
  }

  useEffect(() => {
    fetchTypes()
  }, [])

  const createType = async (e: React.FormEvent) => {
    e.preventDefault()
    const user = (await supabase.auth.getUser()).data.user
    if (!user) return

    const { error } = await supabase.from('assignment_types').insert({
      user_id: user.id,
      name: newType,
      color: newColor || null,
    })

    if (error) {
      console.error('Failed to create type:', error.message)
    } else {
      setNewType('')
      setNewColor('')
      fetchTypes()
    }
  }

  const deleteType = async (id: string) => {
    const confirmed = window.confirm('Delete this assignment type?')
    if (!confirmed) return

    const { error } = await supabase.from('assignment_types').delete().eq('id', id)
    if (error) {
      console.error('Failed to delete type:', error.message)
    } else {
      fetchTypes()
    }
  }

  return (
    <section className="mt-16">
      <h2 className="text-xl font-semibold mb-4">Assignment Types</h2>

      <ul className="space-y-4 mb-6">
        {types.map(t => (
          <li
            key={t.id}
            className="flex justify-between items-center bg-zinc-800 border border-zinc-700 p-4 rounded-lg"
          >
            <div>
              <div className="font-medium text-white">{t.name}</div>
              {t.color && <div className="text-sm text-zinc-400">Color: {t.color}</div>}
            </div>
            <button
              onClick={() => deleteType(t.id)}
              className="text-red-400 hover:text-red-500 text-sm font-medium"
            >
              Delete
            </button>
          </li>
        ))}
        {types.length === 0 && <p className="text-zinc-400">No assignment types yet.</p>}
      </ul>

      <form onSubmit={createType} className="space-y-4">
        <input
          type="text"
          placeholder="Type name (e.g. Quiz)"
          value={newType}
          onChange={e => setNewType(e.target.value)}
          required
          className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
        />
        <input
          type="text"
          placeholder="Optional color (e.g. #facc15)"
          value={newColor}
          onChange={e => setNewColor(e.target.value)}
          className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
        />
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg transition"
        >
          Add Type
        </button>
      </form>
    </section>
  )
}
