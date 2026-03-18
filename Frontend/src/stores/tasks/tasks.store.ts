import { create } from "zustand"

import {
  createTask,
  deleteTask,
  getTasks,
  updateTask,
} from "@/api/endpoint"
import { toast } from "@/hooks/use-toast"
import { TASK_STATUS, type CreateTaskInput, type Task, type TaskStatus } from "@/types/task.type"
type TasksState = {
  tasks: Task[]
  isLoading: boolean
  fetchTasks: () => Promise<void>
  addTask: (input: CreateTaskInput) => Promise<void>
  patchTask: (id: Task["id"], patch: Partial<Omit<Task, "id" | "createdAt">>) => Promise<void>
  deleteTask: (id: Task["id"]) => Promise<void>
  reorderWithinStatus: (status: TaskStatus, sourceIndex: number, destinationIndex: number) => Promise<void>
}

function normalizeOrders(tasks: Task[]): Task[] {
  const sorted = [...tasks].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )
  const counters: Record<TaskStatus, number> = {
    [TASK_STATUS.BACKLOG]: 0,
    [TASK_STATUS.IN_PROGRESS]: 0,
    [TASK_STATUS.DONE]: 0,
  }

  return sorted.map((t) => {
    const maybeOrder =
      "order" in t && typeof t.order === "number" ? t.order : undefined
    const order = maybeOrder ?? counters[t.status]++
    return { ...t, order }
  })
}

function orderedByStatus(tasks: Task[], status: TaskStatus) {
  return tasks
    .filter((t) => t.status === status)
    .slice()
    .sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
}

export const useTasksStore = create<TasksState>((set, get) => ({
  tasks: [],
  isLoading: true,

  fetchTasks: async () => {
    try {
      set({ isLoading: true })
      const data = await getTasks()
      set({ tasks: normalizeOrders(data) })
      // #region agent log
      fetch("http://127.0.0.1:7746/ingest/73cedf80-3f59-4630-9f74-3ddab02feec7", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": "f4b5c5",
        },
        body: JSON.stringify({
          sessionId: "f4b5c5",
          runId: "initial",
          hypothesisId: "H1",
          location: "tasks.store.ts:fetchTasks",
          message: "fetchTasks completed",
          data: { count: data.length },
          timestamp: Date.now(),
        }),
      }).catch(() => {})
      // #endregion
    } catch (e) {
      toast({
        title: "Failed to load tasks",
        description: e instanceof Error ? e.message : "Unknown error",
      })
    } finally {
      set({ isLoading: false })
    }
  },

  addTask: async (input) => {
    try {
      const created = await createTask(input)
      set((s) => ({ tasks: [{ ...created }, ...s.tasks] }))
      toast({ title: "Task created" })
      // #region agent log
      fetch("http://127.0.0.1:7746/ingest/73cedf80-3f59-4630-9f74-3ddab02feec7", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": "f4b5c5",
        },
        body: JSON.stringify({
          sessionId: "f4b5c5",
          runId: "initial",
          hypothesisId: "H2",
          location: "tasks.store.ts:addTask",
          message: "addTask completed",
          data: { createdId: created.id },
          timestamp: Date.now(),
        }),
      }).catch(() => {})
      // #endregion
    } catch (e) {
      toast({
        title: "Failed to create task",
        description: e instanceof Error ? e.message : "Unknown error",
      })
      throw e
    }
  },

  patchTask: async (id, patch) => {
    const prev = get().tasks
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? ({ ...t, ...patch } as Task) : t)),
    }))
    try {
      await updateTask(id, patch)
    } catch (e) {
      set({ tasks: prev })
      toast({
        title: "Failed to update task",
        description: e instanceof Error ? e.message : "Unknown error",
      })
      throw e
    }
  },

  deleteTask: async (id) => {
    const prev = get().tasks
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }))
    try {
      await deleteTask(id)
      toast({ title: "Task deleted" })
    } catch (e) {
      set({ tasks: prev })
      toast({
        title: "Failed to delete task",
        description: e instanceof Error ? e.message : "Unknown error",
      })
      throw e
    }
  },

  reorderWithinStatus: async (status, sourceIndex, destinationIndex) => {
    if (sourceIndex === destinationIndex) return

    const prev = get().tasks
    const current = orderedByStatus(prev, status)
    const next = current.slice()
    const [moved] = next.splice(sourceIndex, 1)
    next.splice(destinationIndex, 0, moved)

    const nextById = new Map(next.map((t, idx) => [t.id, idx]))

    set({
      tasks: prev.map((t) =>
        t.status === status && nextById.has(t.id)
          ? ({ ...t, order: nextById.get(t.id)! } as Task)
          : t
      ),
    })

    try {
      await Promise.all(next.map((t, idx) => updateTask(t.id, { order: idx })))
    } catch (e) {
      set({ tasks: prev })
      toast({
        title: "Failed to reorder",
        description: e instanceof Error ? e.message : "Unknown error",
      })
      throw e
    }
  },
}))

