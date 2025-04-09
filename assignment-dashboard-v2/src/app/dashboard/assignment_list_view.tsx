'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

type Assignment = {
  id: string
  title: string
  due_date: string
  completed: boolean
  semester_id: string
}

type Semester = {
  id: string
  name: string
}

type Props = {
  selectedSemester: string
  showCompleted: boolean
}

export default function AssignmentListView({ selectedSemester, showCompleted }: Props) {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [semesters, setSemesters] = useState<Semester[]>([])

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: semesterData }, { data: assignmentData }] = await Promise.all([
        supabase.from('semesters').select('id, name'),
        supabase.from('assignments').select('*').order('due_date', { ascending: true }),
      ])

      if (semesterData) setSemesters(semesterData)
      if (assignmentData) setAssignments(assignmentData)
    }

    fetchData()
  }, [])

  const toggleCompleted = async (id: string, current: boolean) => {
    const { error } = await supabase
      .from('assignments')
      .update({ completed: !current })
      .eq('id', id)

    if (!error) {
      const { data } = await supabase
        .from('assignments')
        .select('*')
        .order('due_date', { ascending: true })
      if (data) setAssignments(data)
    }
  }

  const filteredAssignments = selectedSemester === 'all'
    ? assignments
    : assignments.filter(a => a.semester_id === selectedSemester)

  return (
    <section className="mt-16">
      <h2 className="text-xl font-semibold mb-4">Assignment List (by Semester)</h2>

      {semesters.map(sem => {
        const grouped = filteredAssignments.filter(a => a.semester_id === sem.id)
        if (grouped.length === 0) return null

        return (
          <div key={sem.id} className="mb-8">
            <h3 className="text-lg font-semibold mb-2 text-zinc-300">{sem.name}</h3>
            <ul className="space-y-2">
              {grouped.map(a => (
                <li
                  key={a.id}
                  className="flex justify-between items-center bg-zinc-800 border border-zinc-700 p-3 rounded-lg"
                >
                  <div>
                    <div
                      className={`font-medium ${
                        a.completed ? 'text-zinc-500 line-through' : 'text-white'
                      }`}
                    >
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
            </ul>
          </div>
        )
      })}

      {filteredAssignments.length === 0 && (
        <p className="text-zinc-400">No assignments found.</p>
      )}
    </section>
  )
}
