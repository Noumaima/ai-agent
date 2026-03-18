import { z } from "zod"

import { TASK_FREQUENCY, type TaskFrequency } from "@/types/task.type"

export const TASK_CATEGORIES = ["Design", "Dev", "QA", "Ops"] as const
export type TaskCategory = (typeof TASK_CATEGORIES)[number]

export const TASK_FREQUENCIES = [
  TASK_FREQUENCY.DAILY,
  TASK_FREQUENCY.WEEKLY,
  TASK_FREQUENCY.MONTHLY,
] as const satisfies readonly TaskFrequency[]

export const TASK_PRIORITIES = ["high", "medium", "low"] as const
export type TaskPriority = (typeof TASK_PRIORITIES)[number]

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().trim().min(1, "Description is required"),
  dueDate: z
    .string()
    .min(1, "Due date & time is required")
    .refine((raw) => {
      const date = new Date(raw)
      if (Number.isNaN(date.getTime())) return false
      return date.getTime() > Date.now()
    }, "Due date & time must be in the future"),
  frequency: z.enum(TASK_FREQUENCIES),
  category: z.enum(TASK_CATEGORIES),
  agentId: z.string().min(1, "Agent is required"),
  priority: z.enum(TASK_PRIORITIES),
})

export type CreateTaskFormValues = z.infer<typeof createTaskSchema>

export const createTaskDefaultValues: CreateTaskFormValues = {
  title: "",
  description: "",
  dueDate: "",
  frequency: TASK_FREQUENCY.WEEKLY,
  category: "Design",
  agentId: "",
  priority: "low",
}
