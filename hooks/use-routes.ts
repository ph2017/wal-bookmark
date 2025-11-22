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
  }
]

export default function useRoutes() {
  const pathname = usePathname()
  return routes.map(route => ({
    ...route,
    isActive: pathname.startsWith(route.url),
  }))
}
