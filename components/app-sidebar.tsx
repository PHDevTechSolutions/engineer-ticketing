"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { NavMain } from "../components/nav-main"
import { NavProjects } from "../components/nav-projects"
import { NavSecondary } from "../components/nav-secondary"
import { NavUser } from "../components/nav-user"
import {
  BookOpen,
  CalendarDays,
  SquareTerminal,
  Settings2,
  ExternalLink,
  Users,
  Fingerprint,
  Layers
} from "lucide-react"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  userId: string | null
}

export function AppSidebar({ userId, ...props }: AppSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isLoading, setIsLoading] = React.useState(true)

  const [userDetails, setUserDetails] = React.useState({
    UserId: "",
    Firstname: "",
    Lastname: "",
    Email: "",
    profilePicture: "",
    ReferenceID: "",
    Position: "",
    Department: "",
  })

  React.useEffect(() => {
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
          ReferenceID: data.ReferenceID || "",
          Position: data.Position || "",
          Department: data.Department || "",
        })
      } catch (error) {
        console.error("SYS_FETCH_ERROR:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [userId])

  const appendUserId = (url: string) =>
    userId ? (url.includes("?") ? `${url}&userId=${userId}` : `${url}?userId=${userId}`) : url

  // ---------------------------------------------------------
  // CORE NAVIGATION DEFINITIONS
  // ---------------------------------------------------------
  const NAV_ITEMS = {
    appointments: {
      title: "Service Control",
      url: "#",
      icon: CalendarDays,
      isActive: pathname?.includes("/appointments") || pathname?.includes("/admin"),
      items: [
        { title: "Schedules & Slots", url: appendUserId("/appointments/slots") },
        { title: "Protocol Registry", url: appendUserId("/admin/protocols") },
        { title: "Assignment Matrix", url: appendUserId("/admin/assignment-matrix") },
      ],
    },
    iam: {
      title: "User Management",
      url: "#",
      icon: Users,
      isActive: pathname?.startsWith("/admin") && !pathname?.includes("protocols"),
      items: [
        { title: "Staff Directory", url: appendUserId("/admin/staff") },
        { title: "Permission Sets", url: appendUserId("/admin/permissions") },
        { title: "Access Logs", url: appendUserId("/admin/logs") },
      ],
    },
    personal: {
      title: "My Account",
      url: "#",
      icon: Fingerprint,
      isActive: pathname?.startsWith("/account"),
      items: [
        { title: "Security & 2FA", url: appendUserId("/account/security") },
        { title: "Personal Info", url: appendUserId("/account/profile") },
        { title: "Preferences", url: appendUserId("/account/preferences") },
      ],
    },
  }

  const PROJECTS = [
    // { name: "Taskflow SMS", url: appendUserId("/taskflow"), icon: ExternalLink },
    // { name: "Ecodesk Ticketing", url: appendUserId("/ecodesk"), icon: ExternalLink },
    // { name: "Acculog Attendance", url: appendUserId("/acculog"), icon: ExternalLink },
  ]

  // ---------------------------------------------------------
  // FILTER LOGIC (Role-Based Access Control)
  // ---------------------------------------------------------
  const department = userDetails.Department?.trim()
  const hasFullAccess = ["IT", "Engineering"].includes(department)

  const getFilteredData = () => {
    if (isLoading) return { navMain: [], navSecondary: [], projects: [] }

    const baseItems = [NAV_ITEMS.personal]

    // 1. ADMIN / ENGINEERING MGMT VIEW
    if (hasFullAccess) {
      return {
        navMain: [NAV_ITEMS.appointments, NAV_ITEMS.iam, ...baseItems],
        navSecondary: [
          { title: "Global Settings", url: appendUserId("/settings"), icon: Settings2 },
          { title: "Support Wiki", url: appendUserId("/docs"), icon: BookOpen },
        ],
        // projects: PROJECTS,
      }
    }

    // 2. ROLE-SPECIFIC VIEWS
    switch (department) {
      case "Sales":
        return {
          navMain: [
            {
              ...NAV_ITEMS.appointments,
              items: NAV_ITEMS.appointments.items.filter(i => 
                !["Protocol Registry", "Assignment Matrix"].includes(i.title)
              )
            },
            ...baseItems
          ],
          navSecondary: [],
          // projects: [PROJECTS[0]],
        }
      default:
        return { navMain: baseItems, navSecondary: [], projects: [] }
    }
  }

  const filtered = getFilteredData()

  return (
    <Sidebar variant="inset" className="bg-[#F9FAFA] border-r border-black/5" {...props}>
      <SidebarHeader className="p-0 overflow-hidden bg-white border-b border-black/5">
        <SidebarMenu className="p-4">
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="hover:bg-transparent px-0 h-auto">
              <button 
                onClick={() => router.push(appendUserId("/dashboard"))} 
                className="flex flex-col items-start gap-4 w-full group text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-[#121212] flex items-center justify-center shadow-lg transition-transform group-hover:scale-95">
                    <img src="/disruptive.png" className="w-5 h-5" alt="Brand Logo" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-black uppercase tracking-tight text-[#121212]">
                      Disruptive
                    </span>
                    <span className="text-[9px] font-bold text-black/30 uppercase tracking-[0.2em]">
                      Engineering_Dept
                    </span>
                  </div>
                </div>

                {/* PROTOCOL INDICATOR CARD */}
                <div className="w-full px-3 py-2 bg-[#F9FAFA] border border-black/5 rounded-lg flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[7px] font-black text-black/20 uppercase tracking-widest">Auth_Node</span>
                    <span className="text-[10px] font-black text-[#121212] uppercase tracking-tight">
                      {department || "GUEST_ACCESS"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[8px] font-mono font-bold text-black/40">V2.6</span>
                  </div>
                </div>
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="gap-0 py-2 scrollbar-hide">
        {!isLoading && (
          <>
            <NavMain items={filtered.navMain} />
            <div className="px-6 py-4">
               <div className="h-[1px] bg-black/5 w-full" />
            </div>
            {/* <NavProjects projects={filtered.projects} /> */}
            <NavSecondary items={filtered.navSecondary} className="mt-auto" />
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-black/5 bg-white p-2">
        <NavUser
          user={{
            id: userDetails.UserId,
            name: isLoading ? "AUTHENTICATING..." : `${userDetails.Firstname} ${userDetails.Lastname}`,
            email: userDetails.Email,
            avatar: userDetails.profilePicture,
          }}
        />
      </SidebarFooter>
    </Sidebar>
  )
}