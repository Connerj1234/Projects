'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Props {
  selectedSemester: string
  fetchAssignments: () => void
}

export default function Assignments({ selectedSemester, fetchAssignments }: Props) {
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [classId, setClassId] = useState('')
  const [typeId, setTypeId] = useState('')
  const [notes, setNotes] = useState('')
  const [classes, setClasses] = useState<any[]>([])
  const [types, setTypes] = useState<any[]>([])
  const [semesterName, setSemesterName] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      const user = (await supabase.auth.getUser()).data.user
      if (!user || !selectedSemester) return

      const [{ data: classData }, { data: typeData }, { data: semesterData }] = await Promise.all([
        supabase
          .from('classes')
          .select('id, name')
          .eq('user_id', user.id)
          .eq('semester_id', selectedSemester),
        supabase
          .from('assignment_types')
          .select('id, name')
          .eq('user_id', user.id)
          .eq('semester_id', selectedSemester),
        supabase
          .from('semesters')
          .select('name')
          .eq('id', selectedSemester)
          .single()
      ])

      if (classData) setClasses(classData)
      if (typeData) setTypes(typeData)
      if (semesterData) setSemesterName(semesterData.name)
    }

    fetchData()
  }, [selectedSemester])

  const createAssignment = async (e: React.FormEvent) => {
    e.preventDefault()
    const user = (await supabase.auth.getUser()).data.user
    if (!user || !selectedSemester) return

    if (!title || !dueDate || !classId || !typeId) {
      alert("Please fill out all required fields before submitting.")
      return
    }

    const localDate = new Date(dueDate);
    localDate.setHours(20, 0, 0, 0);

    const { error } = await supabase.from('assignments').insert({
      user_id: user.id,
      semester_id: selectedSemester,
      title,
      due_date: localDate.toISOString(),
      class_id: classId,
      type_id: typeId,
      notes,
    })

    if (error) {
      alert("Error creating assignment. Please try again.")
    } else {
      setTitle('')
      setDueDate('')
      setClassId('')
      setTypeId('')
      setNotes('')
      fetchAssignments()
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={createAssignment} className="space-y-4">
        <div className="grid gap-3">
          <Label htmlFor="title" className="text-white">Title</Label>
          <Input
            id="title"
            type="text"
            placeholder="e.g. Essay 2, Quiz 5"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="text-white placeholder-gray-400"
          />
        </div>

        <div className="grid gap-3">
          <Label htmlFor="due-date" className="text-white">Due Date</Label>
          <Input
            id="due-date"
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            className="text-white placeholder-gray-400"
          />
        </div>

        <div className="grid gap-3">
          <Label htmlFor="class" className="text-white">Class</Label>
          <select
            id="class"
            value={classId}
            onChange={e => setClassId(e.target.value)}
            className="w-full p-2 bg-zinc-800 border rounded text-white"
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
            className="w-full p-2 bg-zinc-800 border rounded text-white"
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
            className="text-white placeholder-gray-400"
          />
        </div>

        <Button type="submit" className="w-full bg-zinc-700">
          Add Assignment
        </Button>
      </form>
    </div>
  )
}
