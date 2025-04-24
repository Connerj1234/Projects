import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type EditSemesterModalProps = {
  open: boolean;
  setOpen: (val: boolean) => void;
  semester: {
    id: string;
    name: string;
    start_date: string | null;
    end_date: string | null;
  };
  fetchSemesters: () => void;
};

export default function EditSemesterModal({ open, setOpen, semester, fetchSemesters }: EditSemesterModalProps) {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (semester) {
      setName(semester.name);
      setStartDate(semester.start_date || '');
      setEndDate(semester.end_date || '');
    }
  }, [semester]);

  const handleUpdate = async () => {
    const { error } = await supabase
      .from('semesters')
      .update({
        name,
        start_date: startDate || null,
        end_date: endDate || null,
      })
      .eq('id', semester.id)

    if (error) {
      console.error('Error updating semester:', error);
      return;
    }

    fetchSemesters();
    setOpen(false);
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 ${open ? '' : 'hidden'}`}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative z-[1001] mx-auto mt-24 max-w-md rounded-2xl border border-white bg-zinc-900 p-6 shadow-xl"
      >
        <h2 className="mb-4 text-lg font-semibold text-white">Edit Semester</h2>
        <Input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Semester name"
          className="mb-3 text-white placeholder:text-zinc-500"
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
        <div className="mt-4 flex justify-end gap-2">
            <Button type="button" onClick={handleUpdate} className='w-full bg-zinc-700'>
              Save
            </Button>
        </div>
      </motion.div>
    </div>
  );
}
