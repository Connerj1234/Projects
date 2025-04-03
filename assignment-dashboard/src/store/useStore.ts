import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AssignmentType = {
  id: string;
  name: string;
  color: string;
};

export type Assignment = {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  dueDate: string;
  classId: string;
  semester: string;
  type: AssignmentType;
};

export type Class = {
  id: string;
  name: string;
  color: string;
  semesterId: string;
};

export type Semester = {
  id: string;
  name: string;
  startDate?: string;
  endDate: string;
};

type ViewMode = 'list' | 'calendar';

type FilterOptions = {
  selectedSemester?: string;
  selectedClasses: string[];
  selectedTypes: string[];
  timeFrame?: 'day' | 'week' | 'semester';
  showCompleted: boolean;
};

type Store = {
  semesters: Semester[];
  classes: Class[];
  assignments: Assignment[];
  assignmentTypes: AssignmentType[];
  viewMode: ViewMode;
  filterOptions: FilterOptions;

  setFilterOptions: (options: Partial<FilterOptions> | ((prev: FilterOptions) => FilterOptions)) => void;
  setViewMode: (mode: ViewMode) => void;

  addSemester: (semester: Semester) => void;
  updateSemester: (id: string, updates: Partial<Semester>) => void;
  removeSemester: (id: string) => void;

  addClass: (c: Class) => void;
  removeClass: (id: string) => void;
  updateClassColor: (id: string, color: string) => void;

  addAssignment: (a: Assignment) => void;
  updateAssignment: (id: string, updates: Partial<Assignment>) => void;
  deleteAssignment: (id: string) => void;
  toggleAssignmentCompletion: (id: string) => void;

  addAssignmentType: (type: AssignmentType) => void;
  removeAssignmentType: (id: string) => void;
  updateAssignmentTypeColor: (id: string, color: string) => void;
};

const useStore = create<Store>()(
  persist(
    (set, get) => ({
      semesters: [],
      classes: [],
      assignments: [],
      assignmentTypes: [],
      viewMode: 'list',
      filterOptions: {
        selectedSemester: undefined,
        selectedClasses: [],
        selectedTypes: [],
        timeFrame: 'semester',
        showCompleted: true,
      },

      setFilterOptions: (options) =>
        set((state) => ({
          filterOptions:
            typeof options === 'function'
              ? options(state.filterOptions)
              : { ...state.filterOptions, ...options },
        })),

      setViewMode: (mode) => set({ viewMode: mode }),

      addSemester: (semester) =>
        set((state) => ({
          semesters: [...state.semesters, semester],
        })),

      updateSemester: (id, updates) =>
        set((state) => ({
          semesters: state.semesters.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          ),
        })),

      removeSemester: (id) =>
        set((state) => ({
          semesters: state.semesters.filter((s) => s.id !== id),
        })),

      addClass: (c) =>
        set((state) => ({
          classes: [...state.classes, c],
        })),

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

      addAssignment: (a) =>
        set((state) => ({
          assignments: [...state.assignments, a],
        })),

      updateAssignment: (id, updates) =>
        set((state) => ({
          assignments: state.assignments.map((a) =>
            a.id === id ? { ...a, ...updates } : a
          ),
        })),

      deleteAssignment: (id) =>
        set((state) => ({
          assignments: state.assignments.filter((a) => a.id !== id),
        })),

      toggleAssignmentCompletion: (id) =>
        set((state) => ({
          assignments: state.assignments.map((a) =>
            a.id === id ? { ...a, completed: !a.completed } : a
          ),
        })),

      addAssignmentType: (type) =>
        set((state) => ({
          assignmentTypes: [...state.assignmentTypes, type],
        })),

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
    }),
    {
      name: 'assignment-dashboard-store',
    }
  )
);

export default useStore;
