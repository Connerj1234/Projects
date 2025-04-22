export interface Task {
    id: string
    title: string
    list_id: string
    user_id: string
    completed: boolean
    created_at: string
    notes?: string
    due_date?: string
  }

  export interface Folder {
    id: string
    user_id: string
    name: string
    created_at: string
  }

  export interface TaskList {
    id: string
    name: string
  }
