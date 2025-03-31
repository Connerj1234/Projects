export type ViewMode = 'list' | 'calendar';

export interface Semester {
  id: string;
  name: string;
  startDate?: string;
  endDate?: string;
}

export interface Class {
  id: string;
  name: string;
  color: string;
  semesterId: string;
}

export interface AssignmentType {
  id: string;
  name: string;
  color: string;
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
