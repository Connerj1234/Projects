'use client'

import { supabase } from '@/lib/supabase/client'
import { Pencil, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'

type Assignment = {
  id: string
  title: string
  due_date: string
  completed: boolean
  semester_id: string
  class_id: string
  type_id: string
  notes?: string
  semesters?: { name: string }
}

type Props = {
  assignments: Assignment[]
  selectedSemester: string
  showCompleted: boolean
  fetchAssignments: () => void
  onEdit?: (assignment: Assignment) => void
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  date.setHours(date.getHours() + 12);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function getDaysAway(dateString: string) {
    const utcDate = new Date(dateString);

    const localDue = new Date(
      utcDate.getUTCFullYear(),
      utcDate.getUTCMonth(),
      utcDate.getUTCDate()
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = localDue.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return '(Today)';
    if (diffDays === 1) return '(Tomorrow)';
    if (diffDays < 0) return `(${Math.abs(diffDays)} days ago)`;
    return `(in ${diffDays} days)`;
  }

export default function AssignmentListView({
  assignments,
  selectedSemester,
  showCompleted,
  fetchAssignments,
  onEdit,
}: Props) {
  const [classMap, setClassMap] = useState<{ [id: string]: { name: string; color: string } }>({})
  const [typeMap, setTypeMap] = useState<{ [id: string]: { name: string; color: string } }>({})
  const [selectedClass, setSelectedClass] = useState('all')
  const [selectedType, setSelectedType] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null)
  useEffect(() => {
    const fetchMeta = async () => {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) return

      let classQuery = supabase.from('classes').select('id, name, color').eq('user_id', user.id)
      let typeQuery = supabase.from('assignment_types').select('id, name, color').eq('user_id', user.id)

      if (selectedSemester !== 'all') {
        classQuery = classQuery.eq('semester_id', selectedSemester)
        typeQuery = typeQuery.eq('semester_id', selectedSemester)
      }

      const { data: classes } = await classQuery
      const { data: types } = await typeQuery

      const cMap: any = {}
      classes?.forEach((c) => (cMap[c.id] = { name: c.name, color: c.color }))
      setClassMap(cMap)

      const tMap: any = {}
      types?.forEach((t) => (tMap[t.id] = { name: t.name, color: t.color }))
      setTypeMap(tMap)
    }

    fetchMeta()
  }, [selectedSemester])

  const filtered = assignments.filter((a) => {
    const matchesSemester = selectedSemester === 'all' || a.semester_id === selectedSemester
    const matchesCompleted = showCompleted || !a.completed
    const matchesClass = selectedClass === 'all' || a.class_id === selectedClass
    const matchesType = selectedType === 'all' || a.type_id === selectedType
    const matchesSearch = a.title.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSemester && matchesCompleted && matchesClass && matchesType && matchesSearch
  })

  const grouped = filtered.reduce<{ [semesterId: string]: Assignment[] }>((acc, curr) => {
    if (!acc[curr.semester_id]) acc[curr.semester_id] = []
    acc[curr.semester_id].push(curr)
    return acc
  }, {})

  return (
    <section className="mt-10 space-y-10">
      <div className="flex flex-wrap justify-between items-center mb-2 gap-y-4">
        <h2 className="text-2xl font-bold">Assignment Dashboard</h2>
        <div className="flex gap-3">
              <input
                type="text"
                placeholder="Search assignments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded px-3 py-1 bg-zinc-800 border border-zinc-600 text-white"
              />

              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="rounded px-2 py-1 bg-zinc-800 border border-zinc-600 text-white"
              >
                <option value="all">All Classes</option>
                {Object.entries(classMap).map(([id, { name }]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>

              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="rounded px-2 py-1 bg-zinc-800 border border-zinc-600 text-white"
              >
                <option value="all">All Types</option>
                {Object.entries(typeMap).map(([id, { name }]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
            </div>
        </div>

      {Object.entries(grouped).map(([semesterId, items]) => (
        <div key={semesterId} className="space-y-2 pb-10 mt-6">
          <h3 className="text-lg font-semibold text-zinc-300">
            Semester: {items[0]?.semesters?.name || 'Unknown'}
          </h3>
          <ul className="space-y-2">
            {items.map((a) => (
              <li key={a.id} className="flex justify-between items-center bg-zinc-800 border border-zinc-700 p-3 rounded-lg">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={a.completed}
                    onChange={async () => {
                      await supabase
                        .from('assignments')
                        .update({ completed: !a.completed })
                        .eq('id', a.id)
                        .then(fetchAssignments)
                    }}
                    className="form-checkbox h-4 w-4 text-blue-600"
                  />
                  <div>
                    <div className={`font-medium ${a.completed ? 'text-zinc-500 line-through' : 'text-white'}`}>
                      {a.title}
                    </div>
                    <div className="text-sm text-zinc-400">
                      {a.due_date ? `Due: ${formatDate(a.due_date)} - ${getDaysAway(a.due_date)}` : 'No due date'}
                    </div>
                    {a.notes && <div className="text-sm text-zinc-400 mt-1">Notes: {a.notes}</div>}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {classMap[a.class_id] && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: classMap[a.class_id].color }}>
                          {classMap[a.class_id].name}
                        </span>
                      )}
                      {typeMap[a.type_id] && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: typeMap[a.type_id].color }}>
                          {typeMap[a.type_id].name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => {
                    setEditingAssignment(a)
                    onEdit?.(a)
                  }}>
                    <Pencil className="h-4 w-4 text-blue-400 hover:text-blue-500" />
                  </button>
                  <button onClick={async () => {
                    if (confirm(`Delete "${a.title}"?`)) {
                      await supabase.from('assignments').delete().eq('id', a.id)
                      fetchAssignments()
                    }
                  }}>
                    <Trash2 className="h-4 w-4 text-red-500 hover:text-red-600" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {Object.keys(grouped).length === 0 && (
        <p className="text-zinc-400">No assignments found.</p>
      )}
    </section>
  )
}
