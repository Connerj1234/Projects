import { supabase } from '@/lib/supabaseClient';
import { AssignmentTypeRow } from '@/types';

export const getAssignmentTypes = async (): Promise<AssignmentTypeRow[]> => {
  const { data, error } = await supabase
    .from('assignment_types')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return data;
};

export const addAssignmentType = async (
  newType: Omit<AssignmentTypeRow, 'id' | 'created_at' | 'user_id'>
) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase.from('assignment_types').insert([
    {
      ...newType,
      user_id: user?.id,
    },
  ]);

  if (error) throw error;
  return data;
};

export const deleteAssignmentType = async (id: string) => {
  const { data, error } = await supabase
    .from('assignment_types')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return data;
};
