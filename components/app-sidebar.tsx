"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { NavMain } from "./nav-main"
import { NavSecondary } from "./nav-secondary"
import { NavUser } from "./nav-user"
import {
  BookOpen,
  CalendarDays,
  Settings2,
  Users,
  LayoutDashboard,
  CircleUser,
} from "lucide-react"

/**
 * FIX: userId is now 'string | undefined' to stay in sync with 
 * how the Security page sets its initial state.
 */
interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  userId: string | null | undefined
}

export function AppSidebar({ userId, ...props }: AppSidebarProps) {
  const pathname = usePathname()
  const [isLoading, setIsLoading] = React.useState(true)

  const [userDetails, setUserDetails] = React.useState({
    UserId: "",
    Firstname: "",
    Lastname: "",
    Email: "",
    profilePicture: "",
    Position: "",
    Department: "",
  })

  React.useEffect(() => {
    // If we don't have a user ID, stop loading and wait
    if (!userId) {
      setIsLoading(false)
      return
    }
    
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/user?id=${encodeURIComponent(userId)}`)
        const data = await res.json()
        setUserDetails({
          UserId: data._id || userId,
          Firstname: data.Firstname || "",
          Lastname: data.Lastname || "",
          Email: data.Email || "",
          profilePicture: data.profilePicture || "/avatars/default.jpg",
          Position: data.Position || "",
          Department: data.Department || "",
        })
      } catch (error) {
        console.error("DATA_FETCH_ERROR:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [userId])

  // Helper to keep the user ID in the link when moving between pages
  const appendUserId = (url: string) =>
    userId ? (url.includes("?") ? `${url}&userId=${userId}` : `${url}?userId=${userId}`) : url

  const NAV_ITEMS = {
    dashboard: {
        title: "Home",
        url: appendUserId("/dashboard"),
        icon: LayoutDashboard,
        isActive: pathname?.startsWith("/dashboard"),
    },
    services: {
      title: "Work Management",
      url: "#",
      icon: CalendarDays,
      isActive: pathname?.includes("/appointments") || pathname?.includes("/admin/protocols"),
      items: [
        { title: "Service Schedules", url: appendUserId("/appointments/slots") },
        { title: "Standard Procedures", url: appendUserId("/admin/protocols") },
        { title: "Team Assignments", url: appendUserId("/admin/assignment-matrix") },
      ],
    },
    team: {
      title: "Team Directory",
      url: "#",
      icon: Users,
      isActive: pathname?.startsWith("/admin") && !pathname?.includes("protocols"),
      items: [
        { title: "Staff List", url: appendUserId("/admin/staff") },
        { title: "Access Rights", url: appendUserId("/admin/permissions") },
        { title: "Activity Logs", url: appendUserId("/admin/logs") },
      ],
    },
    account: {
      title: "My Profile",
      url: "#",
      icon: CircleUser,
      isActive: pathname?.startsWith("/account"),
      items: [
        { title: "Personal Details", url: appendUserId("/account/profile") },
        { title: "Security Settings", url: appendUserId("/account/security") },
        { title: "App Settings", url: appendUserId("/account/preferences") },
      ],
    },
  }

  const department = userDetails.Department?.trim()
  const hasFullAccess = ["IT", "Engineering"].includes(department)

  const getFilteredData = () => {
    if (isLoading) return { navMain: [], navSecondary: [] }
    const baseItems = [NAV_ITEMS.dashboard, NAV_ITEMS.account]

    if (hasFullAccess) {
      return {
        navMain: [NAV_ITEMS.dashboard, NAV_ITEMS.services, NAV_ITEMS.team, NAV_ITEMS.account],
        navSecondary: [
          { title: "System Settings", url: appendUserId("/settings"), icon: Settings2 },
          { title: "Help Center", url: appendUserId("/docs"), icon: BookOpen },
        ],
      }
    }

    if (department === "Sales") {
        return {
          navMain: [
            NAV_ITEMS.dashboard,
            {
              ...NAV_ITEMS.services,
              items: NAV_ITEMS.services.items?.filter(i => 
                !["Standard Procedures", "Team Assignments"].includes(i.title)
              )
            },
            NAV_ITEMS.account
          ],
          navSecondary: [],
        }
    }
    return { navMain: baseItems, navSecondary: [] }
  }

  const filtered = getFilteredData()

  return (
    <Sidebar variant="inset" className="bg-[#F8F9FA] border-r border-gray-100 z-30" {...props}>
      <SidebarHeader className="p-0 overflow-hidden bg-white border-b border-gray-100">
        <SidebarMenu className="p-4">
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="hover:bg-transparent px-0 h-auto">
              <Link 
                href={appendUserId("/dashboard")} 
                className="flex flex-col items-start gap-4 w-full group text-left no-underline"
              >
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-red-600 flex items-center justify-center shadow-lg shadow-red-100 transition-transform group-hover:scale-95">
                    <img src="/disruptive.png" className="w-6 h-6 invert" alt="Logo" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold uppercase tracking-tight text-gray-900">
                      engiconnect
                    </span>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                      Dashboard v2.6
                    </span>
                  </div>
                </div>

                <div className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-between group-hover:bg-gray-100 transition-colors">
                  <div className="flex flex-col">
                    <span className="text-[7px] font-bold text-gray-400 uppercase tracking-widest">Department</span>
                    <span className="text-[10px] font-bold text-gray-900 uppercase">
                      {department || "Guest"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="size-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[8px] font-bold text-emerald-600 uppercase">System Active</span>
                  </div>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="gap-0 py-4 scrollbar-hide">
        {!isLoading && (
          <>
            <NavMain items={filtered.navMain} />
            <div className="px-6 py-4">
               <div className="h-px bg-gray-100 w-full" />
            </div>
            <NavSecondary items={filtered.navSecondary} className="mt-auto" />
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-gray-100 bg-white p-4">
        <NavUser
          user={{
            id: userDetails.UserId,
            name: isLoading ? "Loading..." : `${userDetails.Firstname} ${userDetails.Lastname}`,
            email: userDetails.Email,
            avatar: userDetails.profilePicture,
          }}
        />
      </SidebarFooter>
    </Sidebar>
  )
}