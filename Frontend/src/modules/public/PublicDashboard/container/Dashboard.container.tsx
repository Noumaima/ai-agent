import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  Textarea,
} from "@/components/ui"
import { cn, formatDateTime } from "@/lib/utils"
import { useState } from "react"
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd"
import { GripVertical, X, Trash2 } from "lucide-react"
import { TASK_STATUS, type TaskFrequency, type TaskStatus } from "@/types/task.type"
import { useKanbanBoard } from "../hooks/use-kanban-board"
import {
  TASK_CATEGORIES,
  TASK_FREQUENCIES,
  TASK_PRIORITIES,
  type TaskPriority,
} from "../schema/task.schema"
import { useAuthContext } from "../../auth/providers"

export const DashboardContainer = () => {
  const { login } = useAuthContext()
  const {
    isLoading,
    columns,
    deleteTaskById,
    filteredTasksByStatus,
    searchByStatus,
    setSearchByStatus,
    tagsByStatus,
    tagInputByStatus,
    setTagInputByStatus,
    addTag,
    removeTag,
    reorderWithinStatus,
    agents,
    isLoadingAgents,
    isCreating,
    isCreateOpen,
    setIsCreateOpen,
    form,
    submitCreate,
  } = useKanbanBoard()

  const [deleteCandidate, setDeleteCandidate] = useState<
    { id: string | number; title: string } | undefined
  >(undefined)
  const isDeleteOpen = Boolean(deleteCandidate)

  const accentByStatus: Record<
    TaskStatus,
    { border: string; text: string; softBg: string }
  > = {
    [TASK_STATUS.BACKLOG]: {
      border: "border-l-blue-500",
      text: "text-blue-600",
      softBg: "bg-blue-500/5",
    },
    [TASK_STATUS.IN_PROGRESS]: {
      border: "border-l-orange-500",
      text: "text-orange-600",
      softBg: "bg-orange-500/5",
    },
    [TASK_STATUS.DONE]: {
      border: "border-l-green-500",
      text: "text-green-600",
      softBg: "bg-green-500/5",
    },
  }

  const onDragEnd = (result: DropResult) => {
    const { destination, source } = result
    if (!destination) return
    if (destination.droppableId !== source.droppableId) return

    const status = source.droppableId as TaskStatus
    const isFiltered =
      searchByStatus[status].trim().length > 0 ||
      tagsByStatus[status].length > 0
    if (isFiltered) return

    void reorderWithinStatus(status, source.index, destination.index)
  }

  return (
    <div className="space-y-6">
      <AlertDialog
        open={isDeleteOpen}
        onOpenChange={(o) => (!o ? setDeleteCandidate(undefined) : null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteCandidate
                ? `"${deleteCandidate.title}" will be permanently removed.`
                : "This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline" type="button">
                Cancel
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="destructive"
                type="button"
                onClick={() => {
                  if (!deleteCandidate) return
                  void deleteTaskById(deleteCandidate.id)
                  setDeleteCandidate(undefined)
                }}
              >
                Delete
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold">Applicant</h1>
          <p className="text-sm text-muted-foreground">
            Create tasks and move them across columns.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={login}>
            Login (demo)
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>New task</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create task</DialogTitle>
                <DialogDescription>
                  Create your own workflow to manage your tasks.
                </DialogDescription>
              </DialogHeader>

              <form
                className="space-y-4"
                onSubmit={form.handleSubmit(submitCreate)}
              >
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" {...form.register("title")} />
                  {form.formState.errors.title?.message ? (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.title.message}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    {...form.register("description")}
                  />
                  {form.formState.errors.description?.message ? (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.description.message}
                    </p>
                  ) : null}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Due date & time</Label>
                    <Input
                      id="dueDate"
                      type="datetime-local"
                      {...form.register("dueDate")}
                    />
                    {form.formState.errors.dueDate?.message ? (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.dueDate.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label>Frequency</Label>
                    <Select
                      value={form.watch("frequency")}
                      onValueChange={(v) =>
                        form.setValue("frequency", v as TaskFrequency, {
                          shouldValidate: true,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={TASK_FREQUENCIES[0]}>
                          Daily
                        </SelectItem>
                        <SelectItem value={TASK_FREQUENCIES[1]}>
                          Weekly
                        </SelectItem>
                        <SelectItem value={TASK_FREQUENCIES[2]}>
                          Monthly
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {form.formState.errors.frequency?.message ? (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.frequency.message}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={form.watch("category")}
                    onValueChange={(v) =>
                      form.setValue(
                        "category",
                        v as (typeof TASK_CATEGORIES)[number],
                        {
                          shouldValidate: true,
                        }
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.category?.message ? (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.category.message}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select
                    value={form.watch("priority")}
                    onValueChange={(v) =>
                      form.setValue("priority", v as TaskPriority, {
                        shouldValidate: true,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={TASK_PRIORITIES[0]}>High</SelectItem>
                      <SelectItem value={TASK_PRIORITIES[1]}>Medium</SelectItem>
                      <SelectItem value={TASK_PRIORITIES[2]}>Low</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.priority?.message ? (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.priority.message}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label>Agent</Label>
                  <Select
                    value={form.watch("agentId")}
                    onValueChange={(v) =>
                      form.setValue("agentId", v, { shouldValidate: true })
                    }
                    disabled={isLoadingAgents}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          isLoadingAgents ? "Loading agents..." : "Select agent"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {agents.map((agent) => (
                        <SelectItem key={agent.id} value={String(agent.id)}>
                          {agent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.agentId?.message ? (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.agentId.message}
                    </p>
                  ) : null}
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isCreating}>
                    {isCreating ? (
                      <span className="inline-flex items-center gap-2">
                        <Spinner size="sm" />
                        Creating
                      </span>
                    ) : (
                      "Create"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid gap-4 md:grid-cols-3">
            {columns.map((col) => {
              const status = col.key
              const items = filteredTasksByStatus[status]
              const accent = accentByStatus[status]
              const isFiltered =
                searchByStatus[status].trim().length > 0 ||
                tagsByStatus[status].length > 0

              return (
                <Card
                  key={status}
                  className={cn(
                    "border-l-4 bg-muted/30",
                    accent.border,
                    accent.softBg
                  )}
                >
                  <CardHeader className="gap-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className={accent.text}>{col.title}</CardTitle>
                      <Badge variant="secondary">{items.length}</Badge>
                    </div>

                    <Input
                      value={searchByStatus[col.key]}
                      placeholder="Search…"
                      onChange={(e) =>
                        setSearchByStatus[col.key](e.target.value)
                      }
                    />

                    <div className="flex flex-wrap items-center gap-2">
                      {tagsByStatus[col.key].map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
                          @{tag}
                          <button
                            type="button"
                            className="rounded hover:bg-muted/60"
                            aria-label={`Remove @${tag}`}
                            onClick={() => removeTag(col.key, tag)}
                          >
                            <X className="size-3" />
                          </button>
                        </Badge>
                      ))}

                      <Input
                        value={tagInputByStatus[col.key]}
                        placeholder="Add tag (type @tag + Enter)"
                        className="h-8 w-[12rem]"
                        onChange={(e) =>
                          setTagInputByStatus[col.key](e.target.value)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            addTag(col.key, tagInputByStatus[col.key])
                            setTagInputByStatus[col.key]("")
                          }
                          if (
                            e.key === "Backspace" &&
                            tagInputByStatus[col.key].length === 0
                          ) {
                            const cur = tagsByStatus[col.key]
                            const last = cur[cur.length - 1]
                            if (last) removeTag(col.key, last)
                          }
                        }}
                      />
                    </div>

                    {isFiltered ? (
                      <p className="text-xs text-muted-foreground">
                        Drag & drop is disabled while filters are active.
                      </p>
                    ) : null}
                  </CardHeader>
                  <Droppable droppableId={status}>
                    {(dropProvided) => (
                      <CardContent
                        className="space-y-3"
                        ref={dropProvided.innerRef}
                        {...dropProvided.droppableProps}
                      >
                        {items.length === 0 ? (
                          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                            No tasks yet.
                          </div>
                        ) : null}

                        {items.map((t, index) => (
                          <Draggable
                            key={t.id}
                            draggableId={String(t.id)}
                            index={index}
                            isDragDisabled={isFiltered}
                          >
                            {(dragProvided) => (
                              <Card
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                className={cn(
                                  "border-l-4 bg-background",
                                  accentByStatus[t.status].border
                                )}
                              >
                                <CardHeader className="pb-2">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex min-w-0 items-start gap-2">
                                      <div
                                        {...dragProvided.dragHandleProps}
                                        className={cn(
                                          "mt-0.5 inline-flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted",
                                          isFiltered
                                            ? "opacity-40"
                                            : "cursor-grab"
                                        )}
                                        aria-label="Drag to reorder"
                                      >
                                        <GripVertical className="size-4" />
                                      </div>
                                      <CardTitle className="line-clamp-2 min-w-0">
                                        {t.title}
                                      </CardTitle>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      {t.status === TASK_STATUS.BACKLOG ? (
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon-sm"
                                          aria-label="Delete task"
                                          className="text-destructive hover:text-destructive"
                                          onClick={() =>
                                            setDeleteCandidate({
                                              id: t.id,
                                              title: t.title,
                                            })
                                          }
                                        >
                                          <Trash2 className="size-4 text-destructive" />
                                        </Button>
                                      ) : null}
                                    </div>
                                  </div>
                                  <p className="line-clamp-2 text-sm text-muted-foreground">
                                    {t.description}
                                  </p>
                                </CardHeader>
                                <CardContent className="flex flex-wrap gap-2 pt-0">
                                  <Badge variant="outline">{t.category}</Badge>
                                  <Badge variant="secondary">
                                    {t.frequency}
                                  </Badge>
                                  <Badge variant="secondary">
                                    {formatDateTime(t.dueDate)}
                                  </Badge>

                                  {t.status === TASK_STATUS.IN_PROGRESS ? (
                                    <div className="flex w-full items-center justify-end text-xs text-orange-600">
                                      <Spinner
                                        size="sm"
                                        className="h-3 w-3 border-orange-500/30 border-t-orange-500"
                                      />
                                    </div>
                                  ) : null}
                                </CardContent>
                              </Card>
                            )}
                          </Draggable>
                        ))}
                        {dropProvided.placeholder}
                      </CardContent>
                    )}
                  </Droppable>
                </Card>
              )
            })}
          </div>
        </DragDropContext>
      )}
    </div>
  )
}
