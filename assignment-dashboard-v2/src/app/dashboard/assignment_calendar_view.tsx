'use client'

import { useEffect, useState } from 'react'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase/client'

type Props = {
  selectedSemester: string
}

type Assignment = {
  id: string
  title: string
  due_date: string
}

type Event = {
  id: string
  title: string
  event_date: string
  event_type: string
}

export default function AssignmentCalendar({ selectedSemester }: Props) {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      const [a, e] = await Promise.all([
        supabase.from('assignments').select('id, title, due_date'),
        supabase.from('semester_events').select('id, title, event_date, event_type'),
      ])
      if (a.data) setAssignments(a.data)
      if (e.data) setEvents(e.data)
    }

    fetchData()
  }, [])

  const getItemsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    const dailyAssignments = assignments.filter(a => a.due_date.startsWith(dateStr))
    const dailyEvents = events.filter(e => e.event_date.startsWith(dateStr))
    return [...dailyAssignments, ...dailyEvents]
  }

  const tileContent = ({ date }: { date: Date }) => {
    const items = getItemsForDate(date)
    if (items.length > 0) {
      return <div className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-400 mx-auto" />
    }
    return null
  }

  return (
    <section className="mt-16">
      <h2 className="text-xl font-semibold mb-4">Assignment Calendar</h2>

      <div className="bg-zinc-800 p-4 rounded-xl max-w-md">
        <Calendar
          onClickDay={date => setSelectedDate(date)}
          tileContent={tileContent}
          className="!text-sm !bg-zinc-800 !text-white [&_abbr]:text-white"
        />
      </div>

      {selectedDate && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">
            {format(selectedDate, 'PPP')}
          </h3>
          <ul className="space-y-2">
            {getItemsForDate(selectedDate).map(item => (
              <li key={item.id} className="bg-zinc-800 p-3 rounded-lg border border-zinc-700">
                <span className="text-white">{item.title}</span>
              </li>
            ))}
            {getItemsForDate(selectedDate).length === 0 && (
              <p className="text-zinc-400">No assignments or events.</p>
            )}
          </ul>
        </div>
      )}
    </section>
  )
}
