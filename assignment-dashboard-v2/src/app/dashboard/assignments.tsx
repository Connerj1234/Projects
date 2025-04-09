'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Trash2 } from 'lucide-react'

export default function Assignments() {
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [classId, setClassId] = useState('')
  const [typeId, setTypeId] = useState('')
  const [notes, setNotes] = useState('')
  const [assignments, setAssignments] = useState<any[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [types, setTypes] = useState<any[]>([])

  const fetchAssignments = async () => {
    const user = (await supabase.auth.getUser()).data.user
    const { data } = await supabase
      .from('assignments')
      .select('*')
      .eq('user_id', user?.id)
      .order('due_date')

    if (data) setAssignments(data)
  }

  const fetchClassesAndTypes = async () => {
    const user = (await supabase.auth.getUser()).data.user
    if (!user) return

    const { data: classData } = await supabase
      .from('classes')
      .select('id, name')
      .eq('user_id', user.id)

    const { data: typeData } = await supabase
      .from('assignment_types')
      .select('id, name')
      .eq('user_id', user.id)

    if (classData) setClasses(classData)
    if (typeData) setTypes(typeData)
  }

  useEffect(() => {
    fetchAssignments()
    fetchClassesAndTypes()
  }, [])

  const createAssignment = async (e: React.FormEvent) => {
    e.preventDefault()
    const user = (await supabase.auth.getUser()).data.user
    if (!user) return

    await supabase.from('assignments').insert({
      user_id: user.id,
      title,
      due_date: dueDate,
      class_id: classId,
      type_id: typeId,
      notes,
    })

    setTitle('')
    setDueDate('')
    setClassId('')
    setTypeId('')
    setNotes('')
    fetchAssignments()
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white">Add New Assignment</h2>

      <form onSubmit={createAssignment} className="space-y-4">
        <div className="grid gap-3">
          <Label htmlFor="title" className="text-white">Title</Label>
          <Input
            id="title"
            type="text"
            placeholder="e.g. Essay 2, Quiz 5"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>

        <div className="grid gap-3">
          <Label htmlFor="due-date" className="text-white">Due Date</Label>
          <Input
            id="due-date"
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
          />
        </div>

        <div className="grid gap-3">
          <Label htmlFor="class" className="text-white">Class</Label>
          <select
            id="class"
            value={classId}
            onChange={e => setClassId(e.target.value)}
            className="bg-black text-white rounded px-3 py-2"
          >
            <option value="">Select a class</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="grid gap-3">
          <Label htmlFor="type" className="text-white">Assignment Type</Label>
          <select
            id="type"
            value={typeId}
            onChange={e => setTypeId(e.target.value)}
            className="bg-black text-white rounded px-3 py-2"
          >
            <option value="">Select a type</option>
            {types.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div className="grid gap-3">
          <Label htmlFor="notes" className="text-white">Notes</Label>
          <Input
            id="notes"
            type="text"
            placeholder="Optional notes..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

        <Button type="submit" className="w-full">
          Add Assignment
        </Button>
      </form>
    </div>
  )
}
