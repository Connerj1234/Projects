'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

type Semester = {
  id: string
  name: string
  start_date: string
  end_date: string
}

export default function Semesters() {
  const [semesters, setSemesters] = useState<Semester[]>([])
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [error, setError] = useState('')

  const fetchSemesters = async () => {
    const { data, error } = await supabase
      .from('semesters')
      .select('*')
      .order('start_date', { ascending: true })

    if (error) {
      console.error(error.message)
    } else {
      setSemesters(data)
    }
  }

  useEffect(() => {
    fetchSemesters()
  }, [])

  const createSemester = async (e: React.FormEvent) => {
    e.preventDefault()
    const user = (await supabase.auth.getUser()).data.user
    if (!user) return

    const { data: newSemester, error } = await supabase
      .from('semesters')
      .insert({
        user_id: user.id,
        name,
        start_date: startDate,
        end_date: endDate,
      })
      .select()
      .single()

    if (error || !newSemester) {
      setError(error?.message ?? 'Failed to create semester')
      return
    }

    // Auto-create semester_events for start/end
    const eventInserts = [
      {
        user_id: user.id,
        semester_id: newSemester.id,
        title: 'Semester Start',
        event_type: 'start',
        event_date: startDate,
      },
      {
        user_id: user.id,
        semester_id: newSemester.id,
        title: 'Semester End',
        event_type: 'end',
        event_date: endDate,
      },
    ]

    const { error: eventError } = await supabase
      .from('semester_events')
      .insert(eventInserts)

    if (eventError) {
      console.error('Failed to insert semester events:', eventError.message)
    }

    setName('')
    setStartDate('')
    setEndDate('')
    fetchSemesters()
  }

  const deleteSemester = async (semesterId: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this semester?')
    if (!confirmed) return

    const { count, error: countError } = await supabase
      .from('assignments')
      .select('*', { count: 'exact', head: true })
      .eq('semester_id', semesterId)

    if (countError) {
      console.error('Error checking assignments:', countError.message)
      return
    }

    if (count && count > 0) {
      alert('This semester has related assignments and cannot be deleted.')
      return
    }

    const { error } = await supabase.from('semesters').delete().eq('id', semesterId)
    if (error) {
      console.error('Error deleting semester:', error.message)
    } else {
      fetchSemesters()
    }
  }

  return (
    <section className="mb-16">
      <h2 className="text-xl font-semibold mb-4">Your Semesters</h2>
      <ul className="space-y-4">
        {semesters.map(sem => (
          <li
            key={sem.id}
            className="bg-zinc-800 p-4 rounded-xl border border-zinc-700 flex justify-between items-center"
          >
            <div>
              <div className="font-medium text-lg">{sem.name}</div>
              <div className="text-sm text-zinc-400">
                {sem.start_date} → {sem.end_date}
              </div>
            </div>
            <button
              onClick={() => deleteSemester(sem.id)}
              className="text-red-400 hover:text-red-500 text-sm font-medium"
            >
              Delete
            </button>
          </li>
        ))}
        {semesters.length === 0 && <p className="text-zinc-400">No semesters yet.</p>}
      </ul>

      <h2 className="text-xl font-semibold mt-10 mb-4">Create a New Semester</h2>
      {error && <p className="text-red-400 text-sm mb-2">{error}</p>}

      <form onSubmit={createSemester} className="space-y-4">
        <input
          type="text"
          placeholder="Semester name"
          value={name}
          onChange={e => setName(e.target.value)}
          required
          className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
        />
        <div className="flex gap-4">
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            required
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
          />
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            required
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
          />
        </div>
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg transition"
        >
          Create Semester
        </button>
      </form>
    </section>
  )
}
