'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

type Props = {
  selectedSemester: string
}

type Semester = { id: string; name: string }
type Class = { id: string; name: string }
type Type = { id: string; name: string }
type Assignment = {
  id: string
  title: string
  due_date: string
  class_id: string
  type_id: string
  completed: boolean
}

export default function Assignments({ selectedSemester }: Props) {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [semesters, setSemesters] = useState<Semester[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [types, setTypes] = useState<Type[]>([])

  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [classId, setClassId] = useState('')
  const [typeId, setTypeId] = useState('')
  const [semesterId, setSemesterId] = useState('')

  useEffect(() => {
    const fetchAll = async () => {
      const [a, s, c, t] = await Promise.all([
        supabase.from('assignments').select('*').order('due_date', { ascending: true }),
        supabase.from('semesters').select('id, name'),
        supabase.from('classes').select('id, name, semester_id'),
        supabase.from('assignment_types').select('id, name'),
      ])
      if (a.data) setAssignments(a.data)
      if (s.data) setSemesters(s.data)
      if (c.data) setClasses(c.data)
      if (t.data) setTypes(t.data)
    }
    fetchAll()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const user = (await supabase.auth.getUser()).data.user
    if (!user) return

    const { error } = await supabase.from('assignments').insert({
      user_id: user.id,
      semester_id: semesterId,
      class_id: classId,
      type_id: typeId,
      title,
      due_date: dueDate,
      completed: false,
    })

    if (error) {
      console.error('Failed to create assignment:', error.message)
    } else {
      setTitle('')
      setDueDate('')
      setClassId('')
      setTypeId('')
      setSemesterId('')
      const { data } = await supabase.from('assignments').select('*').order('due_date', { ascending: true })
      if (data) setAssignments(data)
    }
  }

  const toggleCompleted = async (id: string, current: boolean) => {
    const { error } = await supabase
      .from('assignments')
      .update({ completed: !current })
      .eq('id', id)

    if (error) console.error('Error toggling complete:', error.message)
    else {
      const { data } = await supabase.from('assignments').select('*').order('due_date', { ascending: true })
      if (data) setAssignments(data)
    }
  }

  return (
    <section className="mt-16">
      <h2 className="text-xl font-semibold mb-4">Assignments</h2>

      <ul className="space-y-4 mb-6">
        {assignments.map(a => (
          <li
            key={a.id}
            className="flex justify-between items-center bg-zinc-800 border border-zinc-700 p-4 rounded-lg"
          >
            <div>
              <div className={`font-medium ${a.completed ? 'line-through text-zinc-400' : 'text-white'}`}>
                {a.title}
              </div>
              <div className="text-sm text-zinc-400">Due: {a.due_date}</div>
            </div>
            <button
              onClick={() => toggleCompleted(a.id, a.completed)}
              className="text-sm font-medium text-blue-400 hover:text-blue-500"
            >
              {a.completed ? 'Undo' : 'Complete'}
            </button>
          </li>
        ))}
        {assignments.length === 0 && <p className="text-zinc-400">No assignments yet.</p>}
      </ul>

      <form onSubmit={handleCreate} className="space-y-4">
        <h3 className="text-lg font-semibold">Create a New Assignment</h3>

        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
          className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
        />

        <input
          type="date"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
          required
          className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
        />

        <select
          value={semesterId}
          onChange={e => setSemesterId(e.target.value)}
          required
          className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
        >
          <option value="">Select Semester</option>
          {semesters.map(s => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <select
          value={classId}
          onChange={e => setClassId(e.target.value)}
          required
          className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
        >
          <option value="">Select Class</option>
          {classes.map(c => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={typeId}
          onChange={e => setTypeId(e.target.value)}
          required
          className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
        >
          <option value="">Select Assignment Type</option>
          {types.map(t => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg transition"
        >
          Add Assignment
        </button>
      </form>
    </section>
  )
}
