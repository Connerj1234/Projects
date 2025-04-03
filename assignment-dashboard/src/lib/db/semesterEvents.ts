import { supabase } from '@/lib/supabaseClient';

export type SemesterEvent = {
  id: string;
  user_id: string;
  title: string;
  date: string;
  description?: string;
  created_at: string;
  type: 'semesterStart' | 'semesterEnd';
};

export const getSemesterEvents = async (): Promise<SemesterEvent[]> => {
  const { data, error } = await supabase
    .from('semester_events')
    .select('*')
    .order('date', { ascending: true });

  if (error) throw error;
  return data;
};
