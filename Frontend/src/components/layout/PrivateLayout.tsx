import { Outlet } from "react-router-dom"

export default function PrivateLayout() {
  return (
    <div className="min-h-screen">
      <div className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="text-sm font-medium">Private area</div>
        </div>
      </div>
      <div className="mx-auto max-w-5xl px-6 py-6">
        <Outlet />
      </div>
    </div>
  )
}

