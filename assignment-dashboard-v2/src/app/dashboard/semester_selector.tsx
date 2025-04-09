'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

type Props = {
  selectedSemester: string
  setSelectedSemester: (id: string) => void
}

export default function SemesterSelector({ selectedSemester, setSelectedSemester }: Props) {
  const [semesters, setSemesters] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    const fetchSemesters = async () => {
      const { data, error } = await supabase
        .from('semesters')
        .select('id, name')
        .order('start_date', { ascending: true })

      if (error) {
        console.error('Error loading semesters:', error.message)
      } else if (data) {
        setSemesters(data)
      }
    }

    fetchSemesters()
  }, [])

  return (
    <div>
      <select
        value={selectedSemester}
        onChange={e => setSelectedSemester(e.target.value)}
        className="h-10 text-sm px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white"
      >
        <option value="all">All Semesters</option>
        {semesters.map(s => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
</div>
  )
}
