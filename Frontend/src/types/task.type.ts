export const TASK_STATUS = {
  BACKLOG: "backlog",
  IN_PROGRESS: "in_progress",
  DONE: "done",
} as const

export type TaskStatus = (typeof TASK_STATUS)[keyof typeof TASK_STATUS]

export const TASK_FREQUENCY = {
  DAILY: "daily",
  WEEKLY: "weekly",
  MONTHLY: "monthly",
} as const

export type TaskFrequency =
  (typeof TASK_FREQUENCY)[keyof typeof TASK_FREQUENCY]

export const TASK_PRIORITY = {
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
} as const

export type TaskPriority = (typeof TASK_PRIORITY)[keyof typeof TASK_PRIORITY]

export type Task = {
  id: string | number
  title: string
  description: string
  dueDate: string
  frequency: TaskFrequency
  category: string
  status: TaskStatus
  priority: TaskPriority
  order: number
  createdAt: string
}

export type CreateTaskInput = Omit<Task, "id"> & {
  agent_id?: number
  is_periodic: boolean
  schedule_time: string
}
export type UpdateTaskPatch = Partial<Omit<Task, "id" | "createdAt">>
