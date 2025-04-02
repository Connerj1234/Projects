import { create } from 'zustand';
import { Assignment, AssignmentType, Class, Semester } from '@/types';

type Store = {
  // View
  viewMode: 'list' | 'calendar';
  setViewMode: (mode: 'list' | 'calendar') => void;

  // Show completed toggle
  showCompleted: boolean;
  setShowCompleted: (value: boolean) => void;

  // Assignments
  assignments: Assignment[];
  addAssignment: (assignment: Assignment) => void;
  updateAssignment: (assignment: Assignment) => void;
  removeAssignment: (id: string) => void;

  // Semesters
  semesters: Semester[];
  addSemester: (semester: Semester) => void;
  updateSemester: (semester: Semester) => void;
  removeSemester: (id: string) => void;

  // Classes
  classes: Class[];
  addClass: (newClass: Class) => void;
  removeClass: (id: string) => void;
  updateClassColor: (id: string, color: string) => void;

  // Types
  assignmentTypes: AssignmentType[];
  addAssignmentType: (type: AssignmentType) => void;
  removeAssignmentType: (id: string) => void;
  updateAssignmentTypeColor: (id: string, color: string) => void;

  // Filters
  filterOptions: {
    selectedSemester: string;
    selectedClasses: string[];
    selectedTypes: string[];
    timeFrame: 'all' | 'day' | 'week';
  };
  setFilterOptions: (fn: (prev: Store['filterOptions']) => Store['filterOptions']) => void;
};

const useStore = create<Store>((set) => ({
  // View state
  viewMode: 'list',
  setViewMode: (mode) => set({ viewMode: mode }),

  showCompleted: false,
  setShowCompleted: (value) => set({ showCompleted: value }),

  // Assignments
  assignments: [],
  addAssignment: (assignment) =>
    set((state) => ({ assignments: [...state.assignments, assignment] })),
  updateAssignment: (updated) =>
    set((state) => ({
      assignments: state.assignments.map((a) => (a.id === updated.id ? updated : a)),
    })),
  removeAssignment: (id) =>
    set((state) => ({
      assignments: state.assignments.filter((a) => a.id !== id),
    })),

  // Semesters
  semesters: [],
  addSemester: (semester) =>
    set((state) => ({ semesters: [...state.semesters, semester] })),
  updateSemester: (updated) =>
    set((state) => ({
      semesters: state.semesters.map((s) => (s.id === updated.id ? updated : s)),
    })),
  removeSemester: (id) =>
    set((state) => ({
      semesters: state.semesters.filter((s) => s.id !== id),
    })),

  // Classes
  classes: [],
  addClass: (newClass) =>
    set((state) => ({ classes: [...state.classes, newClass] })),
  removeClass: (id) =>
    set((state) => ({
      classes: state.classes.filter((c) => c.id !== id),
    })),
  updateClassColor: (id, color) =>
    set((state) => ({
      classes: state.classes.map((c) =>
        c.id === id ? { ...c, color } : c
      ),
    })),

  // Assignment Types
  assignmentTypes: [],
  addAssignmentType: (type) =>
    set((state) => ({ assignmentTypes: [...state.assignmentTypes, type] })),
  removeAssignmentType: (id) =>
    set((state) => ({
      assignmentTypes: state.assignmentTypes.filter((t) => t.id !== id),
    })),
  updateAssignmentTypeColor: (id, color) =>
    set((state) => ({
      assignmentTypes: state.assignmentTypes.map((t) =>
        t.id === id ? { ...t, color } : t
      ),
    })),

  // Filters
  filterOptions: {
    selectedSemester: '',
    selectedClasses: [],
    selectedTypes: [],
    timeFrame: 'all',
  },
  setFilterOptions: (fn) =>
    set((state) => ({ filterOptions: fn(state.filterOptions) })),
}));

export default useStore;
