"use client"

import { type LucideIcon } from "lucide-react"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

export function NavProjects({
  projects,
}: {
  projects: {
    name: string
    url: string
    icon: LucideIcon
  }[]
}) {
  const { isMobile } = useSidebar()

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel className="px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400">
        Active Projects
      </SidebarGroupLabel>
      <SidebarMenu className="gap-0.5 px-2">
        {projects.map((item) => (
          <SidebarMenuItem key={item.name}>
            <SidebarMenuButton 
              asChild
              className="group transition-all duration-200 hover:bg-gray-100/80 active:scale-[0.98]"
            >
              <a href={item.url} className="flex items-center gap-3 px-3 py-2">
                <item.icon className="size-4 text-gray-500 group-hover:text-red-600 transition-colors" />
                <span className="text-sm font-semibold tracking-tight text-gray-700 group-hover:text-gray-900">
                  {item.name}
                </span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}