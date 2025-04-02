export type ViewMode = 'list' | 'calendar';

export interface Semester {
  id: string;
  name: string;
  startDate?: string;
  endDate?: string;
}

export type Assignment = {
  id: string;
  title: string;
  description: string;
  classId: string;
  type: AssignmentType;
  dueDate: Date;
  completed: boolean;
  semester: string;
};

export type FilterOptions = {
  showCompleted: boolean;
  selectedClasses: string[];
  selectedTypes: string[];
  selectedSemester: string;
};

export type AssignmentRow = {
    id: string;
    user_id: string;
    title: string;
    due_date: string;
    class_id: string;
    type_id: string;
    notes?: string;
    completed: boolean;
    created_at: string;
  };

  // --- Class types ---
export type ClassRow = {
    id: string;
    user_id: string;
    name: string;
    color: string;
    created_at: string;
  };

  export type Class = {
    id: string;
    name: string;
    color: string;
  };

  // --- AssignmentType types ---
  export type AssignmentTypeRow = {
    id: string;
    user_id: string;
    name: string;
    color: string;
    created_at: string;
  };

  export type AssignmentType = {
    id: string;
    name: string;
    color: string;
  };
