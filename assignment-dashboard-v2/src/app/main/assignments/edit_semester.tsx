import { useState, useEffect } from 'react';
import { db } from '@/lib/localdb/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2, Pencil} from 'lucide-react'

interface Semester {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
}

interface EditInlineProps {
  semester: Semester;
  fetchSemesters: () => void;
}

export default function EditSemesterInline({ semester, fetchSemesters }: EditInlineProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(semester.name);
  const [startDate, setStartDate] = useState(semester.start_date || '');
  const [endDate, setEndDate] = useState(semester.end_date || '')

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

  useEffect(() => {
    if (!editing) {
      setName(semester.name);
      setStartDate(semester.start_date || '');
      setEndDate(semester.end_date || '');
    }
  }, [editing, semester]);

  const handleUpdate = async () => {
    const { error } = await db
      .from('semesters')
      .update({ name, start_date: startDate || null, end_date: endDate || null })
      .eq('id', semester.id);

    if (error) {
      console.error('Error updating semester:', error);
      return;
    }

    fetchSemesters();
    setEditing(false);
  };

  return (
    <div className="border border-white/20 p-4 rounded-lg mb-4 text-white">
      {editing ? (
        <div className="space-y-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Semester name"
          />
          <div className="flex gap-3">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full"
            />
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button onClick={handleUpdate} className='w-full bg-zinc-700'>Save</Button>
          </div>
        </div>
      ) : (
        <div className="flex justify-between items-start">
          <div>
            <p className="text-white font-semibold">{semester.name}</p>
            <p className="text-sm text-gray-400">
              {semester.start_date && semester.end_date && (
                <>
                  {semester.start_date} to {semester.end_date}
                </>
              )}
              {semester.start_date && !semester.end_date && (
                <>Starting {semester.start_date}</>
              )}
              {!semester.start_date && semester.end_date && (
                <>Until {semester.end_date}</>
              )}
              {!semester.start_date && !semester.end_date && (
                <>No date set</>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={() => setEditing(true)}>
                <Pencil className="w-4 h-4 text-blue-500" />
            </Button>
            <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteSemester(semester.id)}
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
          </div>
        </div>
      )}
    </div>
  );
}
