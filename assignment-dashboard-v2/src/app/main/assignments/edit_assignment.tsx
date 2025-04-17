'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface EditAssignmentProps {
  currentAssignment: any
  onClose: () => void
  fetchAssignments: () => void
}

export default function EditAssignment({
  currentAssignment,
  onClose,
  fetchAssignments,
}: EditAssignmentProps) {
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [classId, setClassId] = useState('')
  const [typeId, setTypeId] = useState('')
  const [notes, setNotes] = useState('')
  const [classes, setClasses] = useState<any[]>([])
  const [types, setTypes] = useState<any[]>([])
  const [semesters, setSemesters] = useState<any[]>([])
  const [semesterId, setSemesterId] = useState(currentAssignment.semester_id)

  useEffect(() => {
    if (currentAssignment) {
      setTitle(currentAssignment.title)
      const formattedDate = currentAssignment.due_date
        ? new Date(currentAssignment.due_date).toISOString().split('T')[0]
        : '';
      setDueDate(formattedDate);
      setClassId(currentAssignment.class_id)
      setTypeId(currentAssignment.type_id)
      setNotes(currentAssignment.notes || '')
    }
  }, [currentAssignment])

  useEffect(() => {
    const fetchData = async () => {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) return

      const { data: classData } = await supabase
        .from('classes')
        .select('id, name')
        .eq('user_id', user.id)
        .eq('semester_id', currentAssignment.semester_id)

      const { data: typeData } = await supabase
        .from('assignment_types')
        .select('id, name')
        .eq('user_id', user.id)
        .eq('semester_id', currentAssignment.semester_id)

      const { data: semesterData } = await supabase.from('semesters').select('id, name').eq('user_id', user.id)

      if (classData) setClasses(classData)
      if (typeData) setTypes(typeData)
      if (semesterData) setSemesters(semesterData)
    }

    fetchData()
  }, [currentAssignment])

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title || !dueDate || !classId || !typeId) {
      alert('Please fill out all required fields.')
      return
    }

    await supabase
      .from('assignments')
      .update({
        title,
        due_date: dueDate,
        class_id: classId,
        type_id: typeId,
        notes,
        semester_id: semesterId,
      })
      .eq('id', currentAssignment.id)

    fetchAssignments()
    onClose()
  }

  return (
    <DialogContent className="bg-zinc-900 text-white">
      <DialogHeader>
        <DialogTitle className="text-xl font-semibold">Edit Assignment</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleEdit} className="space-y-4">
        <div className="grid gap-3">
          <Label >Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div className="grid gap-3">
          <Label>Due Date</Label>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>

        <div className="grid gap-3">
          <Label htmlFor="semester" className="text-white">Semester</Label>
          <select
            id="semester"
            value={semesterId}
            onChange={e => setSemesterId(e.target.value)}
            className="w-full p-2 bg-zinc-800 border rounded"
          >
            <option value="">Select a semester</option>
            {semesters.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div className="grid gap-3">
          <Label>Class</Label>
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="w-full p-2 bg-zinc-800 border rounded"
          >
            <option value="">Select a class</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="grid gap-3">
          <Label>Assignment Type</Label>
          <select
            value={typeId}
            onChange={(e) => setTypeId(e.target.value)}
            className="w-full p-2 bg-zinc-800 border rounded"
          >
            <option value="">Select a type</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div className="grid gap-3">
          <Label>Notes</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <Button type="submit" className="w-full bg-zinc-700">
          Confirm Edits
        </Button>
      </form>
    </DialogContent>
  )
}
