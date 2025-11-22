"use client"

import { Settings2, SquareTerminal, PanelsTopLeft, Wallet, FileArchive, Star } from "lucide-react"
import { usePathname } from "next/navigation"

export const routes = [
  {
    title: "Blobs",
    url: "/main/blob",
    icon: FileArchive,
  },
  {
    title: "Bookmarks",
    url: "/main/bookmarks",
    icon: Star,
  },
  {
    title: "Dashboard",
    url: "/main/dashboard",
    icon: SquareTerminal,
  },
  {
    title: "MyProjects",
  url: "/main/my-projects",
    icon: PanelsTopLeft,
  }
]

export default function useRoutes() {
  const pathname = usePathname()
  return routes.map(route => ({
    ...route,
    isActive: pathname.startsWith(route.url),
  }))
}
