'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

type Props = {
  selectedSemester: string
}

type Semester = {
  id: string
  name: string
}

type Class = {
  id: string
  name: string
  color: string | null
  semester_id: string
}

export default function Classes({ selectedSemester }: Props) {
  const [semesters, setSemesters] = useState<Semester[]>([])
  const [classes, setClasses] = useState<Class[]>([])

  const [name, setName] = useState('')
  const [color, setColor] = useState('')
  const [semesterId, setSemesterId] = useState('')

  const fetchSemestersAndClasses = async () => {
    const [{ data: semesterData }, { data: classData }] = await Promise.all([
      supabase.from('semesters').select('id, name').order('start_date', { ascending: true }),
      supabase.from('classes').select('*').order('created_at', { ascending: true }),
    ])

    if (semesterData) setSemesters(semesterData)
    if (classData) setClasses(classData)
  }

  useEffect(() => {
    fetchSemestersAndClasses()
  }, [])

  const createClass = async (e: React.FormEvent) => {
    e.preventDefault()
    const user = (await supabase.auth.getUser()).data.user
    if (!user) return

    const { error } = await supabase.from('classes').insert({
      user_id: user.id,
      name,
      color: color || null,
      semester_id: semesterId,
    })

    if (error) {
      console.error('Failed to create class:', error.message)
    } else {
      setName('')
      setColor('')
      setSemesterId('')
      fetchSemestersAndClasses()
    }
  }

  const deleteClass = async (id: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this class?')
    if (!confirmed) return

    const { error } = await supabase.from('classes').delete().eq('id', id)
    if (error) {
      console.error('Failed to delete class:', error.message)
    } else {
      fetchSemestersAndClasses()
    }
  }

  return (
    <section className="mt-16">
      <h2 className="text-xl font-semibold mb-4">Your Classes</h2>

      <ul className="space-y-4 mb-6">
        {semesters.map(sem => (
          <div key={sem.id}>
            <div className="text-lg font-medium text-zinc-300 mb-2">{sem.name}</div>
            <ul className="space-y-2">
              {classes.filter(c => c.semester_id === sem.id).map(cls => (
                <li
                  key={cls.id}
                  className="flex justify-between items-center bg-zinc-800 border border-zinc-700 p-4 rounded-lg"
                >
                  <div>
                    <div className="text-white font-medium">{cls.name}</div>
                    {cls.color && (
                      <div className="text-sm text-zinc-400">Color: {cls.color}</div>
                    )}
                  </div>
                  <button
                    onClick={() => deleteClass(cls.id)}
                    className="text-red-400 hover:text-red-500 text-sm font-medium"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {semesters.length === 0 && (
          <p className="text-zinc-400">You need to create a semester first.</p>
        )}
      </ul>

      <form onSubmit={createClass} className="space-y-4">
        <h3 className="text-lg font-semibold">Create a New Class</h3>

        <input
          type="text"
          placeholder="Class name (e.g. Calculus)"
          value={name}
          onChange={e => setName(e.target.value)}
          required
          className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
        />

        <input
          type="text"
          placeholder="Optional color (e.g. #34d399)"
          value={color}
          onChange={e => setColor(e.target.value)}
          className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
        />

        <select
          value={semesterId}
          onChange={e => setSemesterId(e.target.value)}
          required
          className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
        >
          <option value="">Select a semester</option>
          {semesters.map(sem => (
            <option key={sem.id} value={sem.id}>
              {sem.name}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg transition"
        >
          Create Class
        </button>
      </form>
    </section>
  )
}
