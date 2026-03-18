import {
  createBrowserRouter,
  Navigate,
  type RouteObject,
  RouterProvider,
} from "react-router-dom"

import { Spinner } from "@/components/ui"
import PrivateLayout from "@/components/layout/PrivateLayout"
import { useAuthContext } from "@/modules/public/auth/providers"
import { PRIVATE_DASHBOARD_ROUTES } from "@/modules/private"
import { DASHBOARD_ROUTES } from "@/modules/public"

const AGENT_PORTAL_ROUTES = [
  ...PRIVATE_DASHBOARD_ROUTES,
  {
    path: "",
    element: <Navigate to={"dashboard"} replace />,
  },
]

const PRIVATE_ROUTES = [
  {
    path: "/private",
    element: <PrivateLayout />,
    children: AGENT_PORTAL_ROUTES,
  },
  {
    path: "*",
    element: <Navigate to={"/private"} replace />,
  },
] as RouteObject[]

const PUBLIC_ROUTES = [
  ...DASHBOARD_ROUTES,
  {
    path: "*",
    element: <Navigate to={"/"} replace />,
  },
] as RouteObject[]

const privateRouter = createBrowserRouter(PRIVATE_ROUTES)
const publicRouter = createBrowserRouter(PUBLIC_ROUTES)

const AppRouterProvider = () => {
  const { isAuthenticated, isPending } = useAuthContext()

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <RouterProvider router={isAuthenticated ? privateRouter : publicRouter} />
  )
}

export default AppRouterProvider
