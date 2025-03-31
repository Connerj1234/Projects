import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Assignment, Class, AssignmentType, Semester, ViewMode, FilterOptions } from '@/types';

export type ViewMode = 'list' | 'calendar';

export type Semester = {
  id: string;
  name: string;
  startDate?: string;
  endDate?: string;
};

export type SemesterEvent = {
  id: string;
  title: string;
  date: Date;
  type: 'semesterStart' | 'semesterEnd';
  semesterId: string;
};

export type Class = {
  id: string;
  name: string;
  semesterId: string;
  color: string;
};

export type AssignmentType = {
  id: string;
  name: string;
  color: string;
};

export type FilterOptions = {
  showCompleted: boolean;
  selectedSemester: string;
  selectedClasses: string[];
  selectedTypes: string[];
};

interface Store {
  classes: Class[];
  assignments: Assignment[];
  assignmentTypes: AssignmentType[];
  semesters: Semester[];
  viewMode: ViewMode;
  filterOptions: FilterOptions;
  setFilterOptions: (options: Partial<FilterOptions>) => void;
  setViewMode: (mode: ViewMode) => void;
  addClass: (newClass: Class) => void;
  removeClass: (classId: string) => void;
  addAssignmentType: (newType: AssignmentType) => void;
  removeAssignmentType: (typeId: string) => void;
  updateClassColor: (classId: string, color: string) => void;
  updateAssignmentTypeColor: (typeId: string, color: string) => void;
  addSemester: (newSemester: Semester) => void;
  removeSemester: (semesterId: string) => void;
  updateSemester: (semesterId: string, updates: Partial<Semester>) => void;
  getSemesterEvents: () => SemesterEvent[];
  addAssignment: (assignment: Assignment) => void;
  updateAssignment: (assignmentId: string, updates: Partial<Assignment>) => void;
  deleteAssignment: (assignmentId: string) => void;
  toggleAssignmentCompletion: (assignmentId: string) => void;
}

const useStore = create<Store>()(
  persist(
    (set, get) => ({
      classes: [],
      assignments: [],
      assignmentTypes: [
        { id: 'hw', name: 'Homework', color: '#3182CE' },
        { id: 'quiz', name: 'Quiz', color: '#38A169' },
        { id: 'test', name: 'Test', color: '#E53E3E' },
        { id: 'project', name: 'Project', color: '#805AD5' },
        { id: 'final', name: 'Final', color: '#DD6B20' },
      ],
      semesters: [],
      viewMode: 'list',
      filterOptions: {
        showCompleted: false,
        selectedSemester: '',
        selectedClasses: [],
        selectedTypes: [],
      },

      setFilterOptions: (options) =>
        set((state) => ({
          filterOptions: { ...state.filterOptions, ...options },
        })),

      setViewMode: (mode) => set({ viewMode: mode }),

      addClass: (newClass) =>
        set((state) => ({
          classes: [...state.classes, newClass],
        })),

      removeClass: (classId) =>
        set((state) => ({
          classes: state.classes.filter((c) => c.id !== classId),
        })),

      addAssignmentType: (newType) =>
        set((state) => ({
          assignmentTypes: [...state.assignmentTypes, newType],
        })),

      removeAssignmentType: (typeId) =>
        set((state) => ({
          assignmentTypes: state.assignmentTypes.filter((t) => t.id !== typeId),
        })),

      updateClassColor: (classId, color) =>
        set((state) => ({
          classes: state.classes.map((c) =>
            c.id === classId ? { ...c, color } : c
          ),
        })),

      updateAssignmentTypeColor: (typeId, color) =>
        set((state) => ({
          assignmentTypes: state.assignmentTypes.map((t) =>
            t.id === typeId ? { ...t, color } : t
          ),
        })),

      addSemester: (newSemester) =>
        set((state) => ({
          semesters: [...state.semesters, newSemester],
        })),

      removeSemester: (semesterId) =>
        set((state) => ({
          semesters: state.semesters.filter((s) => s.id !== semesterId),
          // Also remove all classes associated with this semester
          classes: state.classes.filter((c) => c.semesterId !== semesterId),
          // Reset selected semester if it was the one removed
          filterOptions: state.filterOptions.selectedSemester === semesterId
            ? { ...state.filterOptions, selectedSemester: '' }
            : state.filterOptions,
        })),

      updateSemester: (semesterId, updates) =>
        set((state) => ({
          semesters: state.semesters.map((s) =>
            s.id === semesterId ? { ...s, ...updates } : s
          ),
        })),

      getSemesterEvents: () => {
        const semesters = get().semesters;
        const events: SemesterEvent[] = [];

        semesters.forEach(semester => {
          if (semester.startDate) {
            events.push({
              id: `${semester.id}-start`,
              title: `${semester.name} Starts`,
              date: new Date(semester.startDate),
              type: 'semesterStart',
              semesterId: semester.id
            });
          }
          if (semester.endDate) {
            events.push({
              id: `${semester.id}-end`,
              title: `${semester.name} Ends`,
              date: new Date(semester.endDate),
              type: 'semesterEnd',
              semesterId: semester.id
            });
          }
        });

        return events;
      },

      addAssignment: (assignment) =>
        set((state) => ({
          assignments: [...state.assignments, assignment],
        })),

      updateAssignment: (assignmentId, updates) =>
        set((state) => ({
          assignments: state.assignments.map((a) =>
            a.id === assignmentId ? { ...a, ...updates } : a
          ),
        })),

      deleteAssignment: (assignmentId) =>
        set((state) => ({
          assignments: state.assignments.filter((a) => a.id !== assignmentId),
        })),

      toggleAssignmentCompletion: (assignmentId) =>
        set((state) => ({
          assignments: state.assignments.map((a) =>
            a.id === assignmentId ? { ...a, completed: !a.completed } : a
          ),
        })),
    }),
    {
      name: 'assignment-store',
    }
  )
);

export default useStore;
