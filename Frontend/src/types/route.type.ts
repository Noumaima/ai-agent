import type { ReactNode } from "react"

export const Routes = {
  PUBLIC: "/public",
  PRIVATE: "/private",
} as const

export type Route = (typeof Routes)[keyof typeof Routes]

export interface IRoute {
  path: string
  element: ReactNode | null
  children?: IRoute[]
  name?: string
  index?: boolean
  hasAccess?: boolean
  permissionName?: string
}
