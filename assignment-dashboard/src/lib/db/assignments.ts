import { supabase } from '@/lib/supabaseClient';
import { AssignmentRow } from '@/types'; // or define type inline

// 1. Fetch assignments for current user
export const getAssignments = async () => {
  const { data, error } = await supabase
    .from('assignments')
    .select('*')
    .order('due_date', { ascending: true });

  if (error) throw error;
  return data;
};

// 2. Add new assignment
export const addAssignment = async (assignment: Omit<AssignmentRow, 'id' | 'created_at'>) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase.from('assignments').insert([
    {
      ...assignment,
      user_id: user?.id,
    },
  ]);

  if (error) throw error;
  return data;
};

// 3. Update assignment
export const updateAssignment = async (assignment: Partial<AssignmentRow> & { id: string }) => {
  const { data, error } = await supabase
    .from('assignments')
    .update(assignment)
    .eq('id', assignment.id);

  if (error) throw error;
  return data;
};

// 4. Delete assignment
export const deleteAssignment = async (id: string) => {
  const { data, error } = await supabase.from('assignments').delete().eq('id', id);

  if (error) throw error;
  return data;
};
