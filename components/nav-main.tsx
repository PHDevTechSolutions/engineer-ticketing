"use client"

import Link from "next/link"
import { ChevronRight, type LucideIcon } from "lucide-react"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"

export function NavMain({
  items,
  label,
}: {
  label?: string
  items: {
    title: string
    url: string
    icon?: LucideIcon
    isActive?: boolean
    badge?: number
    items?: {
      title: string
      url: string
    }[]
  }[]
}) {
  const pathname = usePathname()

  if (!items || items.length === 0) return null

  return (
    <SidebarGroup className="px-2">
      {label && (
        <SidebarGroupLabel className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-400 px-3 mb-1">
          {label}
        </SidebarGroupLabel>
      )}
      <SidebarMenu className="gap-0.5">
        {items.map((item) => {

          // ── Collapsible group (has sub-items) ──
          if (item.items && item.items.length > 0) {
            const isGroupActive = item.isActive ||
              item.items.some(sub => pathname?.startsWith(sub.url.split("?")[0]))

            return (
              <Collapsible
                key={item.title}
                asChild
                defaultOpen={isGroupActive}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip={item.title}
                      isActive={isGroupActive}
                      className={cn(
                        "w-full h-9 rounded-xl px-3 transition-all",
                        "text-[11px] font-bold",
                        isGroupActive
                          ? "bg-zinc-100 text-zinc-900"
                          : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800"
                      )}
                    >
                      {item.icon && (
                        <item.icon className={cn(
                          "size-4 flex-shrink-0 transition-colors",
                          isGroupActive ? "text-[#E33636]" : "text-zinc-400"
                        )} />
                      )}
                      <span className="flex-1 text-left truncate">{item.title}</span>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className="flex-shrink-0 bg-[#E33636] text-white text-[8px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                          {item.badge > 99 ? "99+" : item.badge}
                        </span>
                      )}
                      <ChevronRight className={cn(
                        "size-3 flex-shrink-0 transition-transform duration-200",
                        "group-data-[state=open]/collapsible:rotate-90",
                        isGroupActive ? "text-zinc-500" : "text-zinc-300"
                      )} />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <SidebarMenuSub className="ml-4 mt-0.5 border-l border-zinc-100 pl-3 space-y-0.5">
                      {item.items.map((subItem) => {
                        const isSubActive = pathname?.startsWith(subItem.url.split("?")[0])
                        return (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isSubActive}
                              className={cn(
                                "h-8 rounded-lg text-[11px] transition-all px-3",
                                isSubActive
                                  ? "bg-zinc-900 text-white font-bold"
                                  : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 font-medium"
                              )}
                            >
                              <Link href={subItem.url}>
                                {isSubActive && (
                                  <div className="size-1.5 rounded-full bg-[#E33636] flex-shrink-0" />
                                )}
                                <span>{subItem.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            )
          }

          // ── Simple link ──
          const isItemActive = item.isActive ||
            (item.url !== "#" && pathname?.startsWith(item.url.split("?")[0]))

          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                isActive={isItemActive}
                tooltip={item.title}
                className={cn(
                  "h-9 rounded-xl px-3 transition-all",
                  "text-[11px] font-bold",
                  isItemActive
                    ? "bg-zinc-900 text-white hover:bg-zinc-800"
                    : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800"
                )}
              >
                <Link href={item.url} className="flex items-center gap-2.5">
                  {item.icon && (
                    <item.icon className={cn(
                      "size-4 flex-shrink-0 transition-colors",
                      isItemActive ? "text-white" : "text-zinc-400"
                    )} />
                  )}
                  <span className="flex-1 truncate">{item.title}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className={cn(
                      "flex-shrink-0 text-[8px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center",
                      isItemActive
                        ? "bg-white/20 text-white"
                        : "bg-[#E33636] text-white"
                    )}>
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}