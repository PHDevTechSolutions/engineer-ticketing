"use client"

import * as React from "react"
import { 
  ChevronRight, 
  LayoutGrid, 
  Settings2, 
  ClipboardList, 
  ShieldAlert,
  Users2,
  Database,
  type LucideIcon 
} from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"

// This is the data structure you would pass to the component
const sidebarItems = [
  {
    title: "Operations",
    url: "/appointments",
    icon: LayoutGrid,
    isActive: true,
    items: [
      { title: "Site Visit Registry", url: "/appointments/site-visit" },
      { title: "Active Missions", url: "/appointments/active" },
    ],
  },
  {
    title: "System Config",
    url: "#",
    icon: Settings2,
    items: [
      { title: "Protocol Registry", url: "/admin/protocols" }, // The dynamic list we built
      { title: "Booking Rules", url: "/admin/booking-rules" }, // The PIC assignment logic
      { title: "Team Management", url: "/admin/teams" },
    ],
  },
]

export function NavMain({
  items = sidebarItems, // Defaulting to the structure above
}: {
  items: {
    title: string
    url: string
    icon: LucideIcon
    isActive?: boolean
    onClick?: () => void
    items?: {
      title: string
      url: string
    }[]
  }[]
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">
        Control_Center
      </SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <Collapsible
            key={item.title}
            asChild
            defaultOpen={item.isActive}
            className="group/collapsible"
          >
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip={item.title}>
                <div 
                  role="button" 
                  onClick={item.onClick} 
                  className="cursor-pointer flex items-center gap-3 px-3 py-2"
                >
                  {item.icon && <item.icon className="size-4 text-primary" />}
                  <span className="text-[11px] font-black uppercase tracking-tight italic">
                    {item.title}
                  </span>
                </div>
              </SidebarMenuButton>

              {item.items?.length ? (
                <>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuAction className="transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90">
                      <ChevronRight className="size-3" />
                      <span className="sr-only">Toggle</span>
                    </SidebarMenuAction>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub className="border-l-2 border-primary/20 ml-4 px-2 space-y-1">
                      {item.items?.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton asChild>
                            <a 
                              href={subItem.url} 
                              className="group flex items-center gap-2 py-1.5"
                            >
                              <div className="size-1 bg-muted-foreground/30 group-hover:bg-primary transition-colors" />
                              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-foreground">
                                {subItem.title}
                              </span>
                            </a>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </>
              ) : null}
            </SidebarMenuItem>
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}