"use client"

import * as React from "react"
import { type LucideIcon } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavSecondary({
  items,
  ...props
}: {
  items: {
    title: string
    url: string
    icon?: LucideIcon  // ← was required, now optional — matches NavItem type
  }[]
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  if (!items || items.length === 0) return null

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu className="gap-0.5 px-2">
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                size="sm"
                className="hover:bg-zinc-100 transition-colors group rounded-xl h-9"
              >
                <Link href={item.url} className="flex items-center gap-2.5 px-3">
                  {item.icon && (
                    <item.icon className="size-4 text-zinc-400 group-hover:text-zinc-700 transition-colors flex-shrink-0" />
                  )}
                  <span className={cn(
                    "text-[11px] font-bold text-zinc-500 group-hover:text-zinc-800 transition-colors truncate",
                    !item.icon && "ml-1"
                  )}>
                    {item.title}
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}