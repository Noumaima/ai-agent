import type { RouteObject } from "react-router-dom"
import { DashboardPage } from "../pages"
import { PUBLIC_DASHBOARD_ROUTES } from "./routes.constant"

export const DASHBOARD_ROUTES = [
  {
    path: PUBLIC_DASHBOARD_ROUTES.DASHBOARD,
    element: <DashboardPage />,
  },
] as RouteObject[]
