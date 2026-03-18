import type { RouteObject } from "react-router-dom"
import { PrivateDashboardPage } from "../pages"

export const PRIVATE_DASHBOARD_ROUTES = [
  {
    path: "dashboard",
    element: <PrivateDashboardPage />,
  },
] as RouteObject[]
