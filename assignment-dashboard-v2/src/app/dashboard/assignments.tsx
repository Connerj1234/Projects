'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { format } from 'date-fns'

export default function Assignments({ selectedSemester }: { selectedSemester: string }) {
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')

  const createAssignment = async (e: React.FormEvent) => {
    e.preventDefault()
    const user = (await supabase.auth.getUser()).data.user
    if (!user || selectedSemester === 'all') return
    await supabase.from('assignments').insert({
      user_id: user.id,
      title,
      due_date: dueDate,
      notes,
      completed: false,
      semester_id: selectedSemester,
    })
    setTitle('')
    setDueDate('')
    setNotes('')
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Create Assignment</h2>

      <form onSubmit={createAssignment} className="space-y-3">
        <Input
          type="text"
          placeholder="Assignment title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
        />
        <Input
          type="date"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
          required
        />
        <Textarea
          placeholder="Optional notes"
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
        <Button type="submit" className="w-full">Add Assignment</Button>
      </form>
    </div>
  )
}
