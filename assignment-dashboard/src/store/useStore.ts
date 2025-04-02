import { create } from 'zustand';
import { AssignmentRow, AssignmentTypeRow, ClassRow, SemesterEvent } from '@/types';
import {
  getAssignments,
  updateAssignment,
} from '@/lib/db/assignments';
import { getClasses } from '@/lib/db/classes';
import { getAssignmentTypes } from '@/lib/db/assignmentTypes';
import { getSemesterEvents } from '@/types/semesterEvents';

type FilterOptions = {
  selectedClasses: string[];
  selectedTypes: string[];
  selectedSemester: string;
  showCompleted: boolean;
};

type Store = {
  assignments: AssignmentRow[];
  classes: ClassRow[];
  assignmentTypes: AssignmentTypeRow[];
  semesterEvents: SemesterEvent[];
  filterOptions: FilterOptions;

  viewMode: 'list' | 'calendar';
  setViewMode: (mode: 'list' | 'calendar') => void;
  setShowCompleted: (val: boolean) => void;

  // Loaders
  loadAssignments: () => Promise<void>;
  loadClasses: () => Promise<void>;
  loadAssignmentTypes: () => Promise<void>;
  loadSemesterEvents: () => Promise<void>;

  toggleAssignmentCompletion: (id: string) => Promise<void>;
};

export const useStore = create<Store>((set, get) => ({
  assignments: [],
  classes: [],
  assignmentTypes: [],
  semesterEvents: [],
  filterOptions: {
    selectedClasses: [],
    selectedTypes: [],
    selectedSemester: '',
    showCompleted: false,
  },

  viewMode: 'list',
  setViewMode: (mode) => set({ viewMode: mode }),
  setShowCompleted: (val) =>
    set((state) => ({
      filterOptions: { ...state.filterOptions, showCompleted: val },
    })),

  loadAssignments: async () => {
    const data = await getAssignments();
    set({ assignments: data });
  },

  loadClasses: async () => {
    const data = await getClasses();
    set({ classes: data });
  },

  loadAssignmentTypes: async () => {
    const data = await getAssignmentTypes();
    set({ assignmentTypes: data });
  },

  loadSemesterEvents: async () => {
    const data = await getSemesterEvents();
    set({ semesterEvents: data });
  },

  toggleAssignmentCompletion: async (id) => {
    const assignment = get().assignments.find((a) => a.id === id);
    if (!assignment) return;

    const updated = { ...assignment, completed: !assignment.completed };
    await updateAssignment(id, { completed: updated.completed });

    set((state) => ({
      assignments: state.assignments.map((a) =>
        a.id === id ? updated : a
      ),
    }));
  },
}));
