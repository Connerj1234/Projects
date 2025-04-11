'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Trash2 } from 'lucide-react'

export default function Classes({ selectedSemester }: { selectedSemester: string }) {
  const [classes, setClasses] = useState<any[]>([])
  const [name, setName] = useState('')
  const [color, setColor] = useState('')

  const fetchClasses = async () => {
    const { data } = await supabase
      .from('classes')
      .select('*')
      .eq('semester_id', selectedSemester)
      .order('created_at')

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

  const deleteClass = async (id: string) => {
    const user = await supabase.auth.getUser().then(res => res.data.user);
    if (!user) return;

    // Check for any linked assignments
    const { data: linkedAssignments } = await supabase
      .from('assignments')
      .select('id')
      .eq('user_id', user.id)
      .eq('class_id', id); // or 'type_id' for types

    if (linkedAssignments && linkedAssignments.length > 0) {
      alert("This class cannot be deleted. It's still in use by one or more assignments.");
      return;
    }

    const { error } = await supabase.from('classes').delete().eq('id', id); // or 'assignment_types'
    if (error) alert('Failed to delete class/type.');
    fetchClasses(); // or fetchTypes()
  }

  const updateColor = async (id: string, newColor: string) => {
    await supabase.from('classes').update({ color: newColor }).eq('id', id)
    fetchClasses()
  }

  return (
    <div className="space-y-6">

      <ul className="space-y-3">
        {classes.map(cls => (
          <li
            key={cls.id}
            className="flex justify-between items-center border border-zinc-700 rounded-lg px-4 py-2"
          >
            <span className="text-white font-medium">{cls.name}</span>
            <div className="flex items-center gap-3">
              <Input
                type="color"
                value={cls.color || '#000000'}
                onChange={e => updateColor(cls.id, e.target.value)}
                className="h-6 w-10 p-0 border-none bg-transparent"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteClass(cls.id)}
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <form onSubmit={createClass} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="class-name" className="text-white">Add New Class</Label>
          <div className="flex gap-3">
            <Input
              id="class-name"
              type="text"
              placeholder="e.g. Math 101"
              value={name}
              className="text-white placeholder-gray-400"
              onChange={e => setName(e.target.value)}
            />
            <Input
              type="color"
              value={color}
              onChange={e => setColor(e.target.value)}
              className="h-10 w-12 p-1 border-none bg-transparent"
            />
          </div>
        </div>
        <Button type="submit" className="w-full bg-zinc-700">
          Add Class
        </Button>
      </form>
    </div>
  )
}
