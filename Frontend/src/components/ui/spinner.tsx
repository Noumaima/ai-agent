import { cn } from "@/lib/utils"

type SpinnerProps = {
  className?: string
  size?: "sm" | "md" | "lg"
}

const sizeClassName: Record<NonNullable<SpinnerProps["size"]>, string> = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-12 w-12 border-4",
}

export function Spinner({ className, size = "md" }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn(
        "animate-spin rounded-full border-muted-foreground/30 border-t-muted-foreground",
        sizeClassName[size],
        className
      )}
    />
  )
}

