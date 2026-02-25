"use client"

import * as React from "react"
import { 
  ChevronRight, 
  LayoutGrid, 
  Settings2, 
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

export function NavMain({
  items,
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
      <SidebarGroupLabel className="px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400">
        Main Navigation
      </SidebarGroupLabel>
      <SidebarMenu className="gap-1 px-2">
        {items.map((item) => (
          <Collapsible
            key={item.title}
            asChild
            defaultOpen={item.isActive}
            className="group/collapsible"
          >
            <SidebarMenuItem>
              <SidebarMenuButton 
                asChild 
                tooltip={item.title}
                className="hover:bg-gray-100 transition-colors"
              >
                <div 
                  role="button" 
                  onClick={item.onClick} 
                  className="flex items-center gap-3 px-3 py-2"
                >
                  {item.icon && <item.icon className="size-4 text-gray-500 group-hover/collapsible:text-red-600 transition-colors" />}
                  <span className="text-sm font-semibold tracking-tight text-gray-700">
                    {item.title}
                  </span>
                </div>
              </SidebarMenuButton>

              {item.items?.length ? (
                <>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuAction className="transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90">
                      <ChevronRight className="size-3 text-gray-400" />
                      <span className="sr-only">Toggle</span>
                    </SidebarMenuAction>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub className="ml-4 mr-2 mt-1 border-l border-gray-100 px-2 space-y-0.5">
                      {item.items?.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton asChild>
                            <a 
                              href={subItem.url} 
                              className="group flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-gray-50 transition-all"
                            >
                              <div className="size-1 rounded-full bg-gray-300 group-hover:bg-red-500 transition-colors" />
                              <span className="text-xs font-medium text-gray-500 group-hover:text-gray-900 transition-colors">
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