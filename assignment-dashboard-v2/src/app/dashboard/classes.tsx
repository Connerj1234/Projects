'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function Classes({ selectedSemester }: { selectedSemester: string }) {
  const [classes, setClasses] = useState<any[]>([])
  const [name, setName] = useState('')
  const [color, setColor] = useState('')

  const fetchClasses = async () => {
    const { data } = await supabase.from('classes').select('*').eq('semester_id', selectedSemester).order('created_at')
    if (data) setClasses(data)
  }

  useEffect(() => {
    if (selectedSemester !== 'all') {
      fetchClasses()
    } else {
      setClasses([])
    }
  }, [selectedSemester])

  const createClass = async (e: React.FormEvent) => {
    e.preventDefault()
    const user = (await supabase.auth.getUser()).data.user
    if (!user || selectedSemester === 'all') return
    await supabase.from('classes').insert({
      user_id: user.id,
      name,
      color: color || null,
      semester_id: selectedSemester,
    })
    setName('')
    setColor('')
    fetchClasses()
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Classes</h2>

      <ul className="space-y-3">
        {classes.map(cls => (
          <li key={cls.id} className="flex justify-between items-center border border-zinc-700 rounded-lg px-4 py-2">
            <span className="text-white">{cls.name}</span>
            {cls.color && <span className="text-sm text-zinc-400">{cls.color}</span>}
          </li>
        ))}
      </ul>

      <form onSubmit={createClass} className="space-y-3">
        <Input
          type="text"
          placeholder="Class name (e.g. Math 101)"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <Input
          type="color"
          value={color}
          onChange={e => setColor(e.target.value)}
        />
        <Button type="submit" className="w-full">Add Class</Button>
      </form>
    </div>
  )
}
