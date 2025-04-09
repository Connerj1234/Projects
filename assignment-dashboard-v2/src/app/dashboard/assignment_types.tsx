'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function AssignmentTypes({ selectedSemester }: { selectedSemester: string }) {
  const [types, setTypes] = useState<any[]>([])
  const [name, setName] = useState('')
  const [color, setColor] = useState('')

  const fetchTypes = async () => {
    const { data } = await supabase.from('assignment_types').select('*').eq('semester_id', selectedSemester).order('created_at')
    if (data) setTypes(data)
  }

  useEffect(() => {
    if (selectedSemester !== 'all') {
      fetchTypes()
    } else {
      setTypes([])
    }
  }, [selectedSemester])

  const createType = async (e: React.FormEvent) => {
    e.preventDefault()
    const user = (await supabase.auth.getUser()).data.user
    if (!user || selectedSemester === 'all') return
    await supabase.from('assignment_types').insert({
      user_id: user.id,
      name,
      color: color || null,
      semester_id: selectedSemester,
    })
    setName('')
    setColor('')
    fetchTypes()
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Assignment Types</h2>

      <ul className="space-y-3">
        {types.map(type => (
          <li key={type.id} className="flex justify-between items-center border border-zinc-700 rounded-lg px-4 py-2">
            <span className="text-white">{type.name}</span>
            {type.color && <span className="text-sm text-zinc-400">{type.color}</span>}
          </li>
        ))}
      </ul>

      <form onSubmit={createType} className="space-y-3">
        <Input
          type="text"
          placeholder="Type name (e.g. Quiz)"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <Input
          type="color"
          value={color}
          onChange={e => setColor(e.target.value)}
        />
        <Button type="submit" className="w-full">Add Type</Button>
      </form>
    </div>
  )
}
