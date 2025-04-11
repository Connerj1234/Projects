'use client'

import { useState, useEffect } from 'react'
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay } from 'date-fns'
import { supabase } from '@/lib/supabase/client'

interface Assignment {
  id: string
  title: string
  due_date: string | null
  completed: boolean
  semester_id: string
  class_id: string
  type_id: string
  notes?: string
}

interface Props {
  assignments: Assignment[]
  selectedSemester: string
  showCompleted: boolean
}

export default function AssignmentCalendarView({ selectedSemester, showCompleted }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [classMap, setClassMap] = useState<{ [id: string]: { name: string; color: string } }>({})
  const [typeMap, setTypeMap] = useState<{ [id: string]: { name: string; color: string } }>({})
  const [selectedClass, setSelectedClass] = useState('all')
  const [selectedType, setSelectedType] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

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

  const getFilteredAssignmentsForDate = (date: Date) => {
    if (!assignments || !Array.isArray(assignments)) return []

    const dateStr = format(date, 'yyyy-MM-dd')
    return assignments.filter((a) => {
      const matchesSemester = selectedSemester === 'all' || a.semester_id === selectedSemester
      const matchesCompleted = showCompleted || !a.completed
      const matchesClass = selectedClass === 'all' || a.class_id === selectedClass
      const matchesType = selectedType === 'all' || a.type_id === selectedType
      const matchesSearch = a.title.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesDate = a.due_date?.startsWith(dateStr)
      return matchesSemester && matchesCompleted && matchesClass && matchesType && matchesSearch && matchesDate
    })
  }

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(monthStart)
  const startDate = startOfWeek(monthStart)
  const endDate = endOfWeek(monthEnd)

  const onDateClick = (day: Date) => setSelectedDate(day)
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))

  const renderDays = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    return <div className="grid grid-cols-7 text-center font-semibold mt-6">{days.map(d => <div key={d}>{d}</div>)}</div>
  }

  const renderCells = () => {
    const rows = []
    let day = startDate

    while (day <= endDate) {
      const days = []
      for (let i = 0; i < 7; i++) {
        const formattedDate = format(day, 'd')
        const dailyAssignments = getFilteredAssignmentsForDate(day)
        const isToday = isSameDay(day, new Date())

        days.push(
          <div
            key={day.toString()}
            className={`border p-1 h-28 overflow-auto text-sm cursor-pointer ${!isSameMonth(day, monthStart) ? 'text-gray-400' : ''} ${isToday ? 'bg-blue-100' : ''}`}
            onClick={() => onDateClick(day)}
          >
            <div className="font-bold mb-1">{formattedDate}</div>
            {dailyAssignments.map(a => (
              <div key={a.id} className="bg-blue-500 text-white px-1 rounded text-xs truncate">
                {a.title}
              </div>
            ))}
          </div>
        )
        day = addDays(day, 1)
      }
      rows.push(
        <div className="grid grid-cols-7" key={day.toString()}>
          {days}
        </div>
      )
    }
    return <div>{rows}</div>
  }

  const renderSelectedDayAssignments = () => {
    if (!selectedDate) return null
    const dailyAssignments = getFilteredAssignmentsForDate(selectedDate)
    return (
      <div className="mt-4">
        <h3 className="text-lg font-semibold">Assignments on {format(selectedDate, 'MMMM do, yyyy')}:</h3>
        {dailyAssignments.length > 0 ? (
          <ul className="space-y-2 mt-2">
            {dailyAssignments.map(a => (
              <li key={a.id} className="text-sm">
                <div className="font-medium text-white">{a.title}</div>
                {a.notes && <div className="text-sm text-zinc-400">{a.notes}</div>}
                <div className="flex gap-2 mt-1">
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
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500 mt-2">No assignments due</p>
        )}
      </div>
    )
  }

  return (
    <div className="mt-10 pb-10">
      <div className="flex flex-wrap justify-between items-center mb-6 gap-y-4">
        <h2 className="text-2xl font-bold">Assignment Dashboard</h2>
        <div className="flex gap-3 flex-wrap">
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

      <div className="flex justify-center items-center gap-4 mb-4">
        <button onClick={prevMonth} className="text-sm px-2 py-1 border rounded">Previous</button>
        <span className="text-lg font-semibold">{format(currentMonth, 'MMMM yyyy')}</span>
        <button onClick={nextMonth} className="text-sm px-2 py-1 border rounded">Next</button>
      </div>

      {renderDays()}
      {renderCells()}
      {renderSelectedDayAssignments()}
    </div>
  )
}
