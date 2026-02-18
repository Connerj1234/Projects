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
import { db } from '@/lib/localdb/client'
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

type Props = {
  selectedSemester: string
  showCompleted: boolean
  onEdit: (assignment: Assignment) => void
  onDelete: (id: string) => void
  fetchAssignments: () => void
  assignments: Assignment[]
}

export default function AssignmentCalendarView({
  selectedSemester,
  showCompleted,
  onEdit,
  onDelete,
  fetchAssignments,
  assignments,
}: Props) {
  type MetaRow = { id: string; name: string; color: string }
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [classMap, setClassMap] = useState<Record<string, { name: string; color: string }>>({})
  const [typeMap, setTypeMap] = useState<Record<string, { name: string; color: string }>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedClass, setSelectedClass] = useState('all')
  const [selectedType, setSelectedType] = useState('all')

  useEffect(() => {
    const fetchMeta = async () => {
      const user = (await db.auth.getUser()).data.user
      if (!user) return

      let classQuery = db.from('classes').select('id, name, color').eq('user_id', user.id)
      let typeQuery = db.from('assignment_types').select('id, name, color').eq('user_id', user.id)

      if (selectedSemester !== 'all') {
        classQuery = classQuery.eq('semester_id', selectedSemester)
        typeQuery = typeQuery.eq('semester_id', selectedSemester)
      }

      const { data: classes } = await classQuery
      const { data: types } = await typeQuery

      const cMap: Record<string, { name: string; color: string }> = {}
      ;(classes as MetaRow[] | null)?.forEach((c: MetaRow) => (cMap[c.id] = { name: c.name, color: c.color }))
      setClassMap(cMap)

      const tMap: Record<string, { name: string; color: string }> = {}
      ;(types as MetaRow[] | null)?.forEach((t: MetaRow) => (tMap[t.id] = { name: t.name, color: t.color }))
      setTypeMap(tMap)
    }
    fetchMeta()
  }, [selectedSemester])

  const startDate = startOfWeek(startOfMonth(currentMonth))
  const endDate = endOfWeek(endOfMonth(currentMonth))

  const filteredAssignments = Array.isArray(assignments)
  ? assignments.filter((a) => {
      const title = a.title ?? ''
      const notes = a.notes ?? ''

      const matchesSemester = selectedSemester === 'all' || a.semester_id === selectedSemester
      const matchesCompleted = showCompleted || !a.completed
      const matchesClass = selectedClass === 'all' || a.class_id === selectedClass
      const matchesType = selectedType === 'all' || a.type_id === selectedType
      const matchesSearch =
        title.toLowerCase().includes((searchQuery || '').toLowerCase()) ||
        notes.toLowerCase().includes((searchQuery || '').toLowerCase())

      return (
        matchesSemester &&
        matchesCompleted &&
        matchesClass &&
        matchesType &&
        matchesSearch
      )
    })
  : []


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
              className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xs bg-blue-600 text-white rounded-full px-3 py-0.5 cursor-pointer whitespace-nowrap"
              onClick={() => openModalForDate(cloneDay)}
            >
             <span className="hidden sm:inline">
               {assignmentCount} assignment{assignmentCount > 1 ? 's' : ''}
             </span>
             <span className="inline sm:hidden">
               {assignmentCount}
             </span>
            </div>
          )}
        </div>
      )
      day = addDays(day, 1)
    }

    return <div className="grid grid-cols-7 gap-1">{days}</div>
  }

  return (
    <div className="space-y-4 bg-zinc-800 rounded-lg shadow-md p-6 mt-10">
        <div className="flex flex-wrap justify-between items-center mb-2 gap-y-4">
        <h2 className="text-2xl font-bold">Assignment Dashboard</h2>
        <div className="flex flex-wrap  items-center gap-3">
              <input
                type="text"
                placeholder="Search assignments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-md px-3 py-1 bg-zinc-800 border border-zinc-600 text-white w-full sm:w-auto"/>

              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="rounded-md px-2 py-1 bg-zinc-800 border border-zinc-600 text-white w-full sm:w-auto">
                <option value="all">All Classes</option>
                {Object.entries(classMap).map(([id, value]) => {
                   const { name } = value as { name: string; color: string }
                   return (
                     <option key={id} value={id}>
                       {name}
                     </option>
                   )
                 })}
              </select>

              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="rounded-md px-2 py-1 bg-zinc-800 border border-zinc-600 text-white w-full sm:w-auto">
                <option value="all">All Types</option>
                {Object.entries(typeMap).map(([id, value]) => {
                  const { name } = value as { name: string; color: string }
                  return (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  )
                })}
              </select>
            </div>
        </div>
        <div className="flex justify-center items-center gap-20 mb-4 pt-4">
          <button className="text-sm px-3 py-1 border rounded-md bg-zinc-800 border-zinc-600 text-white hover:cursor-pointer" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>Previous</button>
          <span className="text-lg font-semibold leading-[1.75rem]">{format(currentMonth, 'MMMM yyyy')}</span>
          <button className="text-sm px-3 py-1 border rounded-md bg-zinc-800 border-zinc-600 text-white hover:cursor-pointer" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>Next</button>
        </div>

      <div className="grid grid-cols-7 text-sm text-center text-white ">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="py-">
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
        onEdit={onEdit}
        onDelete={onDelete}
        classMap={classMap}
        typeMap={typeMap}
        fetchAssignments={fetchAssignments}
      />
    </div>
  )
}
