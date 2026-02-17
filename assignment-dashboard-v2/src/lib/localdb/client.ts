import defaultData from '@/data/defaultData.json'

type Row = Record<string, any>
type OrderOptions = { ascending?: boolean }
type DbTable = 'semesters' | 'classes' | 'assignment_types' | 'assignments' | 'todo_lists' | 'todos'

type LocalDb = Record<DbTable, Row[]>

type QueryResult<T = any> = {
  data: T
  error: { message: string } | null
}

const STORAGE_KEY = 'assignment-dashboard-v2-local-db'
const DEMO_USER = {
  id: 'local-user',
  email: 'portfolio@local.app',
}

function clone<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value)
  }
  return JSON.parse(JSON.stringify(value))
}

function nowIso() {
  return new Date().toISOString()
}

function newId(prefix: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function normalizeTable(name: string): DbTable {
  if (name === 'types') return 'assignment_types'
  return name as DbTable
}

function normalizeDbShape(input: any): LocalDb {
  return {
    semesters: Array.isArray(input?.semesters) ? input.semesters : [],
    classes: Array.isArray(input?.classes) ? input.classes : [],
    assignment_types: Array.isArray(input?.assignment_types) ? input.assignment_types : [],
    assignments: Array.isArray(input?.assignments) ? input.assignments : [],
    todo_lists: Array.isArray(input?.todo_lists)
      ? input.todo_lists.map((list: Row) => ({
          ...list,
          order_index: typeof list.order_index === 'number' ? list.order_index : (list.order ?? 0),
          order: typeof list.order === 'number' ? list.order : (list.order_index ?? 0),
        }))
      : [],
    todos: Array.isArray(input?.todos) ? input.todos : [],
  }
}

function loadDb(): LocalDb {
  if (typeof window === 'undefined') {
    return normalizeDbShape(defaultData)
  }

  const saved = window.localStorage.getItem(STORAGE_KEY)
  if (!saved) {
    const seeded = normalizeDbShape(defaultData)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded))
    return clone(seeded)
  }

  try {
    const parsed = JSON.parse(saved)
    const normalized = normalizeDbShape(parsed)
    return clone(normalized)
  } catch {
    const fallback = normalizeDbShape(defaultData)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback))
    return clone(fallback)
  }
}

function saveDb(db: LocalDb) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
}

function applyFilters(rows: Row[], eqFilters: Array<{ column: string; value: any }>, inFilters: Array<{ column: string; values: any[] }>) {
  return rows.filter((row) => {
    const matchesEq = eqFilters.every(({ column, value }) => row[column] === value)
    const matchesIn = inFilters.every(({ column, values }) => values.includes(row[column]))
    return matchesEq && matchesIn
  })
}

function applyOrder(rows: Row[], column: string | null, options: OrderOptions | undefined) {
  if (!column) return rows
  const ascending = options?.ascending !== false
  return [...rows].sort((a, b) => {
    if (a[column] == null && b[column] == null) return 0
    if (a[column] == null) return 1
    if (b[column] == null) return -1
    if (a[column] < b[column]) return ascending ? -1 : 1
    if (a[column] > b[column]) return ascending ? 1 : -1
    return 0
  })
}

function pickColumns(row: Row, selectClause: string | null) {
  if (!selectClause || selectClause.trim() === '*' || selectClause.includes('*')) {
    return { ...row }
  }

  const picked: Row = {}
  for (const token of selectClause.split(',').map((part) => part.trim())) {
    if (!token || token.includes('(')) continue
    picked[token] = row[token]
  }
  return picked
}

function withRelations(table: DbTable, row: Row, selectClause: string | null, db: LocalDb) {
  if (table === 'assignments' && selectClause?.includes('semesters(name)')) {
    const semester = db.semesters.find((s) => s.id === row.semester_id)
    return {
      ...row,
      semesters: semester ? { name: semester.name } : null,
    }
  }
  return row
}

class LocalQuery implements PromiseLike<QueryResult<any>> {
  private action: 'select' | 'insert' | 'update' | 'delete' = 'select'
  private selectClause: string | null = '*'
  private selectInvokedOnMutation = false
  private singleResult = false
  private insertPayload: Row[] = []
  private updatePayload: Row = {}
  private eqFilters: Array<{ column: string; value: any }> = []
  private inFilters: Array<{ column: string; values: any[] }> = []
  private orderColumn: string | null = null
  private orderOptions: OrderOptions | undefined

  constructor(private readonly tableName: string) {}

  select(columns = '*') {
    this.selectClause = columns
    if (this.action !== 'select') {
      this.selectInvokedOnMutation = true
    }
    return this
  }

  eq(column: string, value: any) {
    this.eqFilters.push({ column, value })
    return this
  }

  in(column: string, values: any[]) {
    this.inFilters.push({ column, values })
    return this
  }

  order(column: string, options?: OrderOptions) {
    this.orderColumn = column
    this.orderOptions = options
    return this
  }

  single() {
    this.singleResult = true
    return this
  }

  insert(payload: Row | Row[]) {
    this.action = 'insert'
    this.insertPayload = Array.isArray(payload) ? payload : [payload]
    return this
  }

  update(payload: Row) {
    this.action = 'update'
    this.updatePayload = payload
    return this
  }

  delete() {
    this.action = 'delete'
    return this
  }

  async execute(): Promise<QueryResult<any>> {
    const table = normalizeTable(this.tableName)
    const db = loadDb()
    const rows = db[table]

    if (!rows) {
      return { data: null, error: { message: `Unknown table: ${this.tableName}` } }
    }

    if (this.action === 'select') {
      const filtered = applyFilters(rows, this.eqFilters, this.inFilters)
      const ordered = applyOrder(filtered, this.orderColumn, this.orderOptions)
      const selected = ordered.map((row) => pickColumns(withRelations(table, row, this.selectClause, db), this.selectClause))
      const data = this.singleResult ? (selected[0] ?? null) : selected
      return { data, error: null }
    }

    if (this.action === 'insert') {
      const inserted = this.insertPayload.map((entry) => {
        const base: Row = {
          ...entry,
          id: entry.id ?? newId(table.slice(0, -1)),
          created_at: entry.created_at ?? nowIso(),
        }

        if (table === 'todo_lists') {
          if (typeof base.order_index !== 'number') base.order_index = 0
          base.order = typeof base.order === 'number' ? base.order : base.order_index
        }

        if (table === 'todos') {
          if (typeof base.completed !== 'boolean') base.completed = false
          if (!('completed_on' in base)) base.completed_on = null
        }

        if (table === 'assignments') {
          if (typeof base.completed !== 'boolean') base.completed = false
        }

        if (!base.user_id) {
          base.user_id = DEMO_USER.id
        }

        return base
      })

      db[table] = [...rows, ...inserted]
      saveDb(db)

      if (!this.selectInvokedOnMutation) {
        return { data: null, error: null }
      }

      const selected = inserted.map((row) => pickColumns(withRelations(table, row, this.selectClause, db), this.selectClause))
      const data = this.singleResult ? (selected[0] ?? null) : selected
      return { data, error: null }
    }

    const filtered = applyFilters(rows, this.eqFilters, this.inFilters)

    if (this.action === 'update') {
      const ids = new Set(filtered.map((row) => row.id))
      const updated = rows.map((row) => {
        if (!ids.has(row.id)) return row

        const merged = {
          ...row,
          ...this.updatePayload,
        }

        if (table === 'todo_lists' && typeof merged.order_index === 'number') {
          merged.order = merged.order_index
        }

        return merged
      })

      db[table] = updated
      saveDb(db)

      if (!this.selectInvokedOnMutation) {
        return { data: null, error: null }
      }

      const updatedRows = updated.filter((row) => ids.has(row.id))
      const selected = updatedRows.map((row) => pickColumns(withRelations(table, row, this.selectClause, db), this.selectClause))
      const data = this.singleResult ? (selected[0] ?? null) : selected
      return { data, error: null }
    }

    const remaining = rows.filter((row) => !filtered.some((match) => match.id === row.id))
    db[table] = remaining
    saveDb(db)

    if (!this.selectInvokedOnMutation) {
      return { data: null, error: null }
    }

    const selected = filtered.map((row) => pickColumns(withRelations(table, row, this.selectClause, db), this.selectClause))
    const data = this.singleResult ? (selected[0] ?? null) : selected
    return { data, error: null }
  }

  then<TResult1 = QueryResult<any>, TResult2 = never>(
    onfulfilled?: ((value: QueryResult<any>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled ?? undefined, onrejected ?? undefined)
  }
}

export const db = {
  from(table: string) {
    return new LocalQuery(table)
  },
  auth: {
    async getUser() {
      return {
        data: { user: DEMO_USER },
        error: null,
      }
    },
    async getSession() {
      return {
        data: {
          session: {
            user: DEMO_USER,
          },
        },
        error: null,
      }
    },
    async signOut() {
      return { error: null }
    },
  },
}
