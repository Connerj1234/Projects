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
  const [semesterId, setSemesterId] = useState(selectedSemester)
  const [classId, setClassId] = useState('')
  const [typeId, setTypeId] = useState('')
  const [notes, setNotes] = useState('')
  const [classes, setClasses] = useState<any[]>([])
  const [types, setTypes] = useState<any[]>([])
  const [semesters, setSemesters] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const fetchClassesAndTypes = async () => {
    const user = (await supabase.auth.getUser()).data.user
    if (!user) return

    const { data: classData } = await supabase
      .from('classes')
      .select('id, name')
      .eq('user_id', user.id)
      .eq('semester_id', semesterId)

    const { data: typeData } = await supabase
      .from('assignment_types')
      .select('id, name')
      .eq('user_id', user.id)
      .eq('semester_id', semesterId)

    if (classData) setClasses(classData)
    if (typeData) setTypes(typeData)
  }

  useEffect(() => {
    fetchClassesAndTypes()
    fetchSemesters()
  }, [])

  useEffect(() => {
    const savedSemester = localStorage.getItem('selectedSemester')
    if (savedSemester) setSemesterId(savedSemester)
  }, [])

  const fetchSemesters = async () => {
    const { data: semesterData } = await supabase.from('semesters').select('id, name')
    if (semesterData) setSemesters(semesterData)
  }

  const createAssignment = async (e: React.FormEvent) => {
    e.preventDefault()
    const user = (await supabase.auth.getUser()).data.user
    if (!user) return

    if (!title || !dueDate || !classId || !typeId || !semesterId) {
      alert("Please fill out all required fields before submitting.")
      return
    }

  await supabase.from('assignments').insert({
      user_id: user.id,
      semester_id: semesterId,
      title,
      due_date: dueDate,
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
          <Label htmlFor="semester" className="text-white">Semester</Label>
          <select
            id="semester"
            value={semesterId}
            onChange={e => setSemesterId(e.target.value)}
            className="w-full p-2 bg-zinc-800 border rounded text-white"
          >
            <option value="">Select a semester</option>
            {semesters.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
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
            <option value="" >Select a type</option>
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
