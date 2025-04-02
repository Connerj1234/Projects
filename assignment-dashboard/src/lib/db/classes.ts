import { supabase } from '@/lib/supabaseClient';
import { ClassRow } from '@/types';

export const getClasses = async (): Promise<ClassRow[]> => {
  const { data, error } = await supabase
    .from('classes')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return data;
};

export const addClass = async (newClass: Omit<ClassRow, 'id' | 'created_at' | 'user_id'>) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase.from('classes').insert([
    {
      ...newClass,
      user_id: user?.id,
    },
  ]);

  if (error) throw error;
  return data;
};

export const deleteClass = async (id: string) => {
  const { data, error } = await supabase.from('classes').delete().eq('id', id);
  if (error) throw error;
  return data;
};
