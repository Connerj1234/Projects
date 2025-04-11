import { useState, useEffect } from 'react'
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
} from 'date-fns'
import { supabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import DayAssignmentModal from './day_assignment'

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

interface Props {
  selectedSemester: string
  showCompleted: boolean
  onToggleComplete: (id: string, completed: boolean) => void
  onEdit: (assignment: Assignment) => void
  onDelete: (id: string) => void
}

export default function AssignmentCalendarView({
  selectedSemester,
  showCompleted,
  onToggleComplete,
  onEdit,
  onDelete,
}: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [classMap, setClassMap] = useState<any>({})
  const [typeMap, setTypeMap] = useState<any>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedClass, setSelectedClass] = useState('all')
  const [selectedType, setSelectedType] = useState('all')
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null)
  const [assignments, setAssignments] = useState<Assignment[]>([])

  const fetchAssignments = async () => {
    const { data, error } = await supabase
      .from('assignments')
      .select('*, semesters(name)')
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      .order('due_date', { ascending: true });

    if (error) {
      console.error('Error fetching assignments:', error);
      return;
    }

    // Update the local state with the fetched assignments
    setAssignments(data);
  }

  useEffect(() => {
    fetchAssignments()
  }, [])
  

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

  const startDate = startOfWeek(startOfMonth(currentMonth))
  const endDate = endOfWeek(endOfMonth(currentMonth))

  assignments.forEach((a, i) => {
    if (!a || typeof a !== 'object') {
      console.warn(`Assignment at index ${i} is invalid:`, a)
    }
  })

  const filteredAssignments = assignments.filter((a) => {
    if (!a || typeof a !== 'object') return false

    const title = a.title ?? ''
    const notes = a.notes ?? ''

    const matchesSemester = selectedSemester === 'all' || a.semester_id === selectedSemester
    const matchesCompleted = showCompleted || !a.completed
    const matchesClass = selectedClass === 'all' || a.class_id === selectedClass
    const matchesType = selectedType === 'all' || a.type_id === selectedType
    const matchesSearch =
      title.toLowerCase().includes((searchQuery || '').toLowerCase()) ||
      notes.toLowerCase().includes((searchQuery || '').toLowerCase())

    return matchesSemester && matchesClass && matchesType && matchesCompleted && matchesSearch
  })

  const getAssignmentCountForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return filteredAssignments.filter(
      (a) => a.due_date?.startsWith(dateStr)
    ).length
  }

  const openModalForDate = (date: Date) => {
    setSelectedDate(date)
    setModalOpen(true)
  }

  const renderCells = () => {
    const days = []
    let day = startDate

    while (day <= endDate) {
      const formattedDate = format(day, 'd')
      const cloneDay = new Date(day)
      const assignmentCount = getAssignmentCountForDate(day)
      const isToday = isSameDay(day, new Date())

      days.push(
        <div
          key={day.toString()}
          className={cn(
            'h-24 border border-zinc-700 p-1 text-sm relative',
            {
              'ring-2 ring-blue-500': isToday,
              'text-gray-400': !isSameMonth(day, currentMonth),
            }
          )}
        >
          <div className="text-sm font-semibold text-white mb-1">{formattedDate}</div>
          {assignmentCount > 0 && (
            <div
              className="absolute bottom-2 left-2 text-xs bg-blue-600 text-white rounded-full px-2 py-0.5 cursor-pointer"
              onClick={() => openModalForDate(cloneDay)}
            >
              📌 {assignmentCount} assignment{assignmentCount > 1 ? 's' : ''}
            </div>
          )}
        </div>
      )
      day = addDays(day, 1)
    }

    return <div className="grid grid-cols-7 gap-1">{days}</div>
  }

  return (
    <div className="space-y-4">
        <div className="flex flex-wrap justify-between items-center mb-2 gap-y-4">
        <h2 className="text-2xl font-bold pt-2">Assignment Dashboard</h2>
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
      <div className="flex justify-center gap-4 text-white pt-4">
        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>Previous</button>
        <h3 className="text-lg font-medium">{format(currentMonth, 'MMMM yyyy')}</h3>
        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>Next</button>
      </div>

      <div className="grid grid-cols-7 text-sm text-center text-white">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      {renderCells()}

      <DayAssignmentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        date={selectedDate}
        assignments={filteredAssignments}
        onToggleComplete={onToggleComplete}
        onEdit={onEdit}
        onDelete={onDelete}
        classMap={classMap}
        typeMap={typeMap}
        refreshAssignments={fetchAssignments}
      />
    </div>
  )
}
