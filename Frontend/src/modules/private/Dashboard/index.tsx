import { Button } from "@/components/ui"
import { useAuthContext } from "@/modules/public/auth/providers"

export default function Dashboard() {
  const { logout } = useAuthContext()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Private dashboard</h1>
        <p className="text-sm text-muted-foreground">
          You are authenticated (demo state stored in localStorage).
        </p>
      </div>
      <Button variant="outline" onClick={logout}>
        Logout
      </Button>
    </div>
  )
}

