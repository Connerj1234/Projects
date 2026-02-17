'use client'

import { useEffect, useState } from 'react'
import { db } from '@/lib/localdb/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Trash2, Pencil} from 'lucide-react'
import EditSemesterInline from "./edit_semester"

export default function Semesters({semesters, setSemesters}: { semesters: any[], setSemesters: (s: any[]) => void }) {
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeSemester, setActiveSemester] = useState<Semester | null>(null)

  const fetchSemesters = async () => {
    const user = (await db.auth.getUser()).data.user
    const { data } = await db
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
    const user = (await db.auth.getUser()).data.user
    if (!user) return

    const { data, error } = await db
      .from('semesters')
      .insert([{
        user_id: user?.id,
        name,
        start_date: startDate || null,
        end_date: endDate || null
      }])
      .select('*')

    if (data) {
      await fetchSemesters()
      setSemesters([...semesters, ...data])
      setName('')
      setStartDate('')
      setEndDate('')
    } else {
      console.error('Error creating semester:', JSON.stringify(error, null, 2))
    }
  }


  const deleteSemester = async (id: string) => {
    const { data: assignments } = await db
      .from('assignments')
      .select('id')
      .eq('semester_id', id)

    const { data: classes } = await db
      .from('classes')
      .select('id')
      .eq('semester_id', id)

    const { data: types } = await db
      .from('types')
      .select('id')
      .eq('semester_id', id)

    if (assignments && assignments.length > 0 || classes && classes.length > 0 || types && types.length > 0) {
      alert('Cannot delete semester with assignments, classes, or types')
      return
    }

    await db.from('semesters').delete().eq('id', id)
    fetchSemesters()
  }

  return (
    <div className="space-y-6">
      <ul className="space-y-3">
        {semesters.length === 0 ? (
          <p className="text-sm text-zinc-400 text-center py-4">
            No semesters created yet. Add one below!
          </p>
        ) : (
          semesters.map((semester) => (
            <EditSemesterInline
              key={semester.id}
              semester={semester}
              fetchSemesters={fetchSemesters}
            />
          ))
        )}
      </ul>
      <form onSubmit={createSemester} className="space-y-4">
        <Label htmlFor="semester-name" className="text-white mb-2">Add New Semester</Label>
        <Input
          id="semester-name"
          type="text"
          placeholder="e.g. Spring 2025"
          value={name}
          onChange={e => setName(e.target.value)}
          className="text-white placeholder-gray-400"
        />

        <div className="flex gap-3">
          <div className="flex flex-col w-full">
            <label htmlFor="start-date" className="text-sm font-medium text-white mb-1">
              Start Date <span className="text-zinc-400">(optional)</span>
            </label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="text-white placeholder-gray-400"
            />
          </div>

          <div className="flex flex-col w-full">
            <label htmlFor="end-date" className="text-sm font-medium text-white mb-1">
              End Date <span className="text-zinc-400">(optional)</span>
            </label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="text-white placeholder-gray-400"
            />
          </div>
        </div>
        <Button type="submit" className="w-full bg-zinc-700">
          Create Semester
        </Button>
        {activeSemester && (
          <EditSemesterModal
            open={showEditModal}
            setOpen={setShowEditModal}
            semester={activeSemester}
            fetchSemesters={fetchSemesters}
          />
        )}
      </form>
    </div>
  )
}
