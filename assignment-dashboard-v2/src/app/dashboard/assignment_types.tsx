'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Trash2 } from 'lucide-react'

export default function AssignmentTypes({ selectedSemester }: { selectedSemester: string }) {
  const [types, setTypes] = useState<any[]>([])
  const [name, setName] = useState('')
  const [color, setColor] = useState('')

  const fetchTypes = async () => {
    const { data } = await supabase
      .from('assignment_types')
      .select('*')
      .eq('semester_id', selectedSemester)
      .order('created_at')

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

  const deleteType = async (id: string) => {
    const user = await supabase.auth.getUser().then(res => res.data.user);
    if (!user) return;

    // Check for any linked assignments
    const { data: linkedAssignments } = await supabase
      .from('assignments')
      .select('id')
      .eq('user_id', user.id)
      .eq('type_id', id);

    if (linkedAssignments && linkedAssignments.length > 0) {
      alert("This type cannot be deleted. It's still in use by one or more assignments.");
      return;
    }

    const { error } = await supabase.from('assignment_types').delete().eq('id', id);
    if (error) alert('Failed to delete type.');
    else alert('Deleted successfully.');
    fetchTypes();
  }

  const updateColor = async (id: string, newColor: string) => {
    await supabase.from('assignment_types').update({ color: newColor }).eq('id', id)
    fetchTypes()
  }

  return (
    <div className="space-y-6">

      <ul className="space-y-3">
        {types.map(type => (
          <li
            key={type.id}
            className="flex justify-between items-center border border-zinc-700 rounded-lg px-4 py-2"
          >
            <span className="text-white font-medium">{type.name}</span>
            <div className="flex items-center gap-3">
              <Input
                type="color"
                value={type.color || '#000000'}
                onChange={e => updateColor(type.id, e.target.value)}
                className="h-6 w-10 p-0 border-none bg-transparent"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteType(type.id)}
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <form onSubmit={createType} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="type-name" className="text-white">Add New Type</Label>
          <div className="flex gap-3">
            <Input
              id="type-name"
              type="text"
              placeholder="e.g. Quiz"
              value={name}
              onChange={e => setName(e.target.value)}
              className="text-white placeholder-gray-400"
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
          Add Type
        </Button>
      </form>
    </div>
  )
}
