'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

type Props = {
  selectedSemester: string
  setSelectedSemester: (id: string) => void
  semesters?: any[]
}

export default function SemesterSelector({ selectedSemester, setSelectedSemester, semesters }: Props) {
  return (
    <div>
      <select
        value={selectedSemester}
        onChange={e => setSelectedSemester(e.target.value)}
        className="h-10 text-sm px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white"
      >
        <option value="all">All Semesters</option>
        {semesters?.map(s => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
</div>
  )
}
