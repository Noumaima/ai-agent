import type { CreateTaskInput, Task, UpdateTaskPatch } from "@/types/task.type"
import type { Agent } from "@/types/agent.type"

// For local dev we go through Vite proxy at /api to avoid CORS.
// In other environments you can override with VITE_API_BASE_URL.
const DEFAULT_BASE_URL = "/api"

function getBaseUrl() {
  const raw = import.meta.env.VITE_API_BASE_URL
  if (typeof raw === "string" && raw.length > 0) return raw
  return DEFAULT_BASE_URL
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getBaseUrl()}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(text || `Request failed (${res.status})`)
  }

  // json-server returns empty body for some methods; guard that case
  const contentType = res.headers.get("content-type") ?? ""
  if (!contentType.includes("application/json")) {
    return undefined as T
  }
  return (await res.json()) as T
}

export async function getTasks(): Promise<Task[]> {
  const tasks = await apiFetch<Task[]>("/tasks/")
  return tasks.sort((a, b) => {
    const at = new Date(a.createdAt).getTime()
    const bt = new Date(b.createdAt).getTime()
    return bt - at
  })
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  return await apiFetch<Task>("/tasks/", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export async function updateTask(
  id: Task["id"],
  patch: UpdateTaskPatch
): Promise<Task> {
  return await apiFetch<Task>(`/tasks/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  })
}

export async function deleteTask(id: Task["id"]): Promise<void> {
  await apiFetch<void>(`/tasks/${id}`, { method: "DELETE" })
}

export async function getAgents(): Promise<Agent[]> {
  return await apiFetch<Agent[]>("/agents/")
}
