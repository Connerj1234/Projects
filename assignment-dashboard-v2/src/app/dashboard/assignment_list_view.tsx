'use client'

import { supabase } from '@/lib/supabase/client'
import { Pencil, Trash2 } from 'lucide-react'

type Assignment = {
  id: string
  title: string
  due_date: string
  completed: boolean
  semester_id: string
}

type Props = {
  assignments: Assignment[]
  selectedSemester: string
  showCompleted: boolean
  refreshAssignments: () => void
}

export default function AssignmentListView({ assignments, selectedSemester, showCompleted, refreshAssignments }: Props) {
  const groupedBySemester: { [semesterId: string]: Assignment[] } = {}

  assignments.forEach((a) => {
    if (
      (selectedSemester === 'all' || a.semester_id === selectedSemester) &&
      (showCompleted || !a.completed)
    ) {
      if (!groupedBySemester[a.semester_id]) groupedBySemester[a.semester_id] = []
      groupedBySemester[a.semester_id].push(a)
    }
  })

  const toggleCompleted = async (assignment: Assignment) => {
    await supabase
      .from('assignments')
      .update({ completed: !assignment.completed })
      .eq('id', assignment.id)

    refreshAssignments() // ← refresh the assignment list + stats
  }

  const handleEdit = (assignment: Assignment) => {
    alert(`Editing assignment: ${assignment.title}`)
    // Add modal or routing logic here
  }

  const handleDelete = async (assignment: Assignment) => {
    const confirmed = confirm(`Are you sure you want to delete "${assignment.title}"?`)
    if (!confirmed) return
    await supabase.from('assignments').delete().eq('id', assignment.id)
    refreshAssignments()
  }

  return (
    <section className="mt-16 space-y-10">
      <h2 className="text-2xl font-bold mb-4">Assignment Dashboard</h2>

      {Object.entries(groupedBySemester).map(([semesterId, items]) => (
        <div key={semesterId} className="space-y-2">
          <h3 className="text-lg font-semibold text-zinc-300">Semester: {semesterId}</h3>
          <ul className="space-y-2">
            {items.map((a) => (
              <li
                key={a.id}
                className="flex justify-between items-center bg-zinc-800 border border-zinc-700 p-3 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={a.completed}
                    onChange={() => toggleCompleted(a)}
                    className="form-checkbox h-4 w-4 text-blue-600"
                  />
                  <div>
                    <div className={`font-medium ${a.completed ? 'text-zinc-500 line-through' : 'text-white'}`}>{a.title}</div>
                    <div className="text-sm text-zinc-400">Due: {a.due_date}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => handleEdit(a)}>
                    <Pencil className="h-4 w-4 text-blue-400 hover:text-blue-500" />
                  </button>
                  <button onClick={() => handleDelete(a)}>
                    <Trash2 className="h-4 w-4 text-red-500 hover:text-red-600" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {Object.keys(groupedBySemester).length === 0 && (
        <p className="text-zinc-400">No assignments found.</p>
      )}
    </section>
  )
}
