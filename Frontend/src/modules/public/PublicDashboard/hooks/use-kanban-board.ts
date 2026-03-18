import { useEffect, useMemo, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { toast } from "@/hooks/use-toast"
import { useTasksStore } from "@/stores/tasks"
import { TASK_STATUS, type CreateTaskInput, type Task, type TaskStatus } from "@/types/task.type"
import type { Agent } from "@/types/agent.type"
import { getAgents } from "@/api/endpoint"
import {
  createTaskDefaultValues,
  createTaskSchema,
  type CreateTaskFormValues,
} from "../schema/task.schema"

export function useKanbanBoard() {
  const tasks = useTasksStore((s) => s.tasks)
  const isLoading = useTasksStore((s) => s.isLoading)
  const fetchTasks = useTasksStore((s) => s.fetchTasks)
  const addTask = useTasksStore((s) => s.addTask)
  const patchTask = useTasksStore((s) => s.patchTask)
  const deleteTaskById = useTasksStore((s) => s.deleteTask)
  const reorderWithinStatus = useTasksStore((s) => s.reorderWithinStatus)

  const [isCreating, setIsCreating] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  // Per-column advanced search (debounced) + tag chips
  const [searchBacklog, setSearchBacklog] = useState("")
  const [searchInProgress, setSearchInProgress] = useState("")
  const [searchDone, setSearchDone] = useState("")

  const debouncedBacklog = useDebouncedValue(searchBacklog, 250)
  const debouncedInProgress = useDebouncedValue(searchInProgress, 250)
  const debouncedDone = useDebouncedValue(searchDone, 250)

  const [backlogTags, setBacklogTags] = useState<string[]>([])
  const [inProgressTags, setInProgressTags] = useState<string[]>([])
  const [doneTags, setDoneTags] = useState<string[]>([])

  const [backlogTagInput, setBacklogTagInput] = useState("")
  const [inProgressTagInput, setInProgressTagInput] = useState("")
  const [doneTagInput, setDoneTagInput] = useState("")

  const [agents, setAgents] = useState<Agent[]>([])
  const [isLoadingAgents, setIsLoadingAgents] = useState(true)

  const form = useForm<CreateTaskFormValues>({
    resolver: zodResolver(createTaskSchema as never),
    defaultValues: createTaskDefaultValues,
  })

  useEffect(() => {
    void fetchTasks()
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setIsLoadingAgents(true)
        const data = await getAgents()
        if (!cancelled) setAgents(data)
      } catch (e) {
        if (!cancelled) {
          toast({
            title: "Failed to load agents",
            description: e instanceof Error ? e.message : "Unknown error",
          })
        }
      } finally {
        if (!cancelled) setIsLoadingAgents(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const columns = useMemo(() => {
    return [
      { key: TASK_STATUS.BACKLOG, title: "Backlog" },
      { key: TASK_STATUS.IN_PROGRESS, title: "In progress" },
      { key: TASK_STATUS.DONE, title: "Done" },
    ] as const satisfies ReadonlyArray<{ key: TaskStatus; title: string }>
  }, [])

  const submitCreate = async (values: CreateTaskFormValues) => {
    const nextOrder =
      Math.max(
        -1,
        ...tasks
          .filter((t) => t.status === TASK_STATUS.BACKLOG)
          .map((t) => t.order)
      ) + 1

    const due = new Date(values.dueDate)
    const hh = String(due.getHours()).padStart(2, "0")
    const mm = String(due.getMinutes()).padStart(2, "0")
    const ss = String(due.getSeconds()).padStart(2, "0")

    const input: CreateTaskInput = {
      title: values.title.trim(),
      description: values.description.trim(),
      dueDate: due.toISOString(),
      frequency: values.frequency,
      category: values.category,
      status: TASK_STATUS.BACKLOG,
      priority: values.priority,
      order: nextOrder,
      createdAt: new Date().toISOString(),
      agent_id: Number(values.agentId),
      is_periodic: true,
      schedule_time: `${hh}:${mm}:${ss}`,
    }

    try {
      setIsCreating(true)
      await addTask(input)
      setIsCreateOpen(false)
      form.reset(createTaskDefaultValues)
    } finally {
      setIsCreating(false)
    }
  }

  const filteredTasksByStatus = useMemo(() => {
    const haystack = (t: Task) =>
      `${t.title} ${t.description} ${t.category} ${t.frequency} ${t.dueDate}`.toLowerCase()

    const apply = (status: TaskStatus, q: string, tags: string[]) => {
      const query = q.trim().toLowerCase()
      const normalizedTags = tags
        .map((x) => x.trim().toLowerCase())
        .filter(Boolean)

      return tasks
        .filter((t) => t.status === status)
        .slice()
        .sort((a, b) => a.order - b.order)
        .filter((t) => {
        if (t.status !== status) return false
        const text = haystack(t)
        if (query && !text.includes(query)) return false
        if (normalizedTags.length > 0) {
          return normalizedTags.every((tag) => text.includes(tag))
        }
        return true
      })
    }

    return {
      [TASK_STATUS.BACKLOG]: apply(
        TASK_STATUS.BACKLOG,
        debouncedBacklog,
        backlogTags
      ),
      [TASK_STATUS.IN_PROGRESS]: apply(
        TASK_STATUS.IN_PROGRESS,
        debouncedInProgress,
        inProgressTags
      ),
      [TASK_STATUS.DONE]: apply(TASK_STATUS.DONE, debouncedDone, doneTags),
    } as const satisfies Record<TaskStatus, Task[]>
  }, [
    tasks,
    debouncedBacklog,
    debouncedInProgress,
    debouncedDone,
    backlogTags,
    inProgressTags,
    doneTags,
  ])

  const changeStatus = async (task: Task, next: TaskStatus) => {
    await patchTask(task.id, { status: next })
  }

  const addTag = (status: TaskStatus, raw: string) => {
    const trimmed = raw.trim()
    if (!trimmed) return
    if (!trimmed.startsWith("@")) return

    const value = trimmed.slice(1).trim()
    if (!value) return

    const push = (setTags: (updater: (cur: string[]) => string[]) => void) =>
      setTags((cur) => {
        const next = new Set(cur.map((x) => x.toLowerCase()))
        if (next.has(value.toLowerCase())) return cur
        return [...cur, value]
      })

    if (status === TASK_STATUS.BACKLOG) push(setBacklogTags)
    if (status === TASK_STATUS.IN_PROGRESS) push(setInProgressTags)
    if (status === TASK_STATUS.DONE) push(setDoneTags)
  }

  const removeTag = (status: TaskStatus, tag: string) => {
    const del = (setTags: (updater: (cur: string[]) => string[]) => void) =>
      setTags((cur) => cur.filter((t) => t !== tag))

    if (status === TASK_STATUS.BACKLOG) del(setBacklogTags)
    if (status === TASK_STATUS.IN_PROGRESS) del(setInProgressTags)
    if (status === TASK_STATUS.DONE) del(setDoneTags)
  }

  return {
    tasks,
    isLoading,
    columns,
    changeStatus,
    deleteTaskById,
    isCreating,
    isCreateOpen,
    setIsCreateOpen,
    form,
    submitCreate,
    filteredTasksByStatus,
    searchByStatus: {
      [TASK_STATUS.BACKLOG]: searchBacklog,
      [TASK_STATUS.IN_PROGRESS]: searchInProgress,
      [TASK_STATUS.DONE]: searchDone,
    } as const,
    setSearchByStatus: {
      [TASK_STATUS.BACKLOG]: setSearchBacklog,
      [TASK_STATUS.IN_PROGRESS]: setSearchInProgress,
      [TASK_STATUS.DONE]: setSearchDone,
    } as const,
    tagsByStatus: {
      [TASK_STATUS.BACKLOG]: backlogTags,
      [TASK_STATUS.IN_PROGRESS]: inProgressTags,
      [TASK_STATUS.DONE]: doneTags,
    } as const,
    tagInputByStatus: {
      [TASK_STATUS.BACKLOG]: backlogTagInput,
      [TASK_STATUS.IN_PROGRESS]: inProgressTagInput,
      [TASK_STATUS.DONE]: doneTagInput,
    } as const,
    setTagInputByStatus: {
      [TASK_STATUS.BACKLOG]: setBacklogTagInput,
      [TASK_STATUS.IN_PROGRESS]: setInProgressTagInput,
      [TASK_STATUS.DONE]: setDoneTagInput,
    } as const,
    addTag,
    removeTag,
    reorderWithinStatus,
    agents,
    isLoadingAgents,
  }
}

