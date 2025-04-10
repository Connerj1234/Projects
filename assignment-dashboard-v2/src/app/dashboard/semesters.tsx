'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Trash2 } from 'lucide-react'

export default function Semesters({semesters, setSemesters}: { semesters: any[], setSemesters: (s: any[]) => void }) {
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const fetchSemesters = async () => {
    const user = (await supabase.auth.getUser()).data.user
    const { data } = await supabase
      .from('semesters')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at')

    if (data) {
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

    const { data, error } = await supabase
      .from('semesters')
      .insert({
        user_id: user.id,
        name,
        start_date: startDate,
        end_date: endDate
      })
      .select()

    if (data) {
      await fetchSemesters()
      setSemesters([...semesters, ...data])
      setName('')
      setStartDate('')
      setEndDate('')
    } else {
      console.error('Error creating semester:', error)
    }
  }


  const deleteSemester = async (id: string) => {
    const { data: assignments } = await supabase
      .from('assignments')
      .select('id')
      .eq('semester_id', id)

    if (assignments && assignments.length > 0) {
      alert('Cannot delete semester with assignments')
      return
    }

    await supabase.from('semesters').delete().eq('id', id)
    fetchSemesters()
  }

  return (
    <div className="space-y-6">

      <ul className="space-y-3">
        {semesters.map(semester => (
          <li
            key={semester.id}
            className="flex justify-between items-center border border-zinc-700 rounded-lg px-4 py-2"
          >
            <div>
              <p className="text-white font-medium">{semester.name}</p>
              <p className="text-sm text-gray-400">
                {semester.start_date} to {semester.end_date}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => deleteSemester(semester.id)}
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </li>
        ))}
      </ul>

      <form onSubmit={createSemester} className="space-y-4">
        <Label htmlFor="semester-name" className="text-white">Add New Semester</Label>

        <Input
          id="semester-name"
          type="text"
          placeholder="e.g. Spring 2025"
          value={name}
          onChange={e => setName(e.target.value)}
          className="text-white placeholder-gray-400"
        />

        <div className="flex gap-3">
          <Input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="text-white placeholder-gray-400"
          />
          <Input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="text-white placeholder-gray-400"
          />
        </div>

        <Button type="submit" className="w-full bg-zinc-700">
          Create Semester
        </Button>
      </form>
    </div>
  )
}
