'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { format } from 'date-fns'

export default function Semesters() {
  const [semesters, setSemesters] = useState<any[]>([])
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const fetchSemesters = async () => {
    const user = (await supabase.auth.getUser()).data.user
    if (!user) return
    const { data } = await supabase.from('semesters').select('*').eq('user_id', user.id).order('start_date')
    if (data) setSemesters(data)
  }

  useEffect(() => {
    fetchSemesters()
  }, [])

  const createSemester = async (e: React.FormEvent) => {
    e.preventDefault()
    const user = (await supabase.auth.getUser()).data.user
    if (!user) return
    const { data, error } = await supabase.from('semesters').insert({
      user_id: user.id,
      name,
      start_date: startDate,
      end_date: endDate,
    }).select()
    if (data && data[0]) {
      await supabase.from('semester_events').insert([
        { user_id: user.id, title: `Start of ${name}`, date: startDate, description: `Semester begins`, created_at: new Date().toISOString() },
        { user_id: user.id, title: `End of ${name}`, date: endDate, description: `Semester ends`, created_at: new Date().toISOString() },
      ])
    }
    setName('')
    setStartDate('')
    setEndDate('')
    fetchSemesters()
  }

  const deleteSemester = async (id: string) => {
    const { data: assignments } = await supabase.from('assignments').select('*').eq('semester_id', id)
    if (assignments && assignments.length > 0) {
      alert('You cannot delete a semester that has assignments.')
      return
    }
    await supabase.from('semesters').delete().eq('id', id)
    fetchSemesters()
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Your Semesters</h2>
      <ul className="space-y-3">
        {semesters.map(sem => (
          <li key={sem.id} className="flex justify-between items-center border border-zinc-700 rounded-lg px-4 py-2">
            <div>
              <div className="text-white font-medium">{sem.name}</div>
              <div className="text-sm text-zinc-400">{format(new Date(sem.start_date), 'yyyy-MM-dd')} → {format(new Date(sem.end_date), 'yyyy-MM-dd')}</div>
            </div>
            <Button variant="destructive" size="sm" onClick={() => deleteSemester(sem.id)}>Delete</Button>
          </li>
        ))}
      </ul>

      <form onSubmit={createSemester} className="space-y-3">
        <Input
          type="text"
          placeholder="Semester name"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />
        <div className="flex gap-2">
          <Input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            required
          />
          <Input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            required
          />
        </div>
        <Button type="submit" className="w-full">Create Semester</Button>
      </form>
    </div>
  )
}
