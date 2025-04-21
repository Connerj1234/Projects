export interface Todo {
    id: string
    user_id: string
    folder_id?: string | null
    title: string
    notes?: string | null
    due_date?: string | null
    priority?: 'low' | 'medium' | 'high'
    completed: boolean
    created_at: string
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
