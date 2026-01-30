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
        console.error("Failed to fetch user details:", error)
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
    bridge: {
      title: "App Ecosystem",
      url: "#",
      icon: SquareTerminal,
      isActive: pathname?.startsWith("/apps"),
      items: [
        { title: "Connected Apps", url: appendUserId("/apps/connected") },
        { title: "API Gateway", url: appendUserId("/apps/gateway") },
      ],
    },
    appointments: {
      title: "Appointment Logic",
      url: "#",
      icon: CalendarDays,
      isActive: pathname?.startsWith("/appointments"),
      items: [
        { title: "Schedules & Slots", url: appendUserId("/appointments/slots") },
        { title: "Booking Rules", url: appendUserId("/admin/booking_rules") },
        // ADMIN ONLY: Management of the selectable Assistance Types
        { title: "Protocol Registry", url: appendUserId("/admin/protocols") },
        { title: "Notification Templates", url: appendUserId("/appointments/notifications") },
      ],
    },
    iam: {
      title: "User Management",
      url: "#",
      icon: Users,
      isActive: pathname?.startsWith("/admin"),
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
    { name: "Taskflow SMS", url: appendUserId("/taskflow"), icon: ExternalLink },
    { name: "Ecodesk Ticketing", url: appendUserId("/ecodesk"), icon: ExternalLink },
    { name: "Acculog Attendance", url: appendUserId("/acculog"), icon: ExternalLink },
  ]

  // ---------------------------------------------------------
  // FILTER LOGIC (Role-Based Access Control)
  // ---------------------------------------------------------
  const department = userDetails.Department?.trim()
  
  // Full Access Roles (IT + Engineering Management)
  const hasFullAccess = [
    "IT",
    "Engineering"
  ].includes(department)

  const getFilteredData = () => {
    if (isLoading) return { navMain: [], navSecondary: [], projects: [] }
    
    const baseItems = [NAV_ITEMS.personal]

    // 1. ADMIN / ENGINEERING MGMT VIEW
    if (hasFullAccess) {
      return {
        navMain: [NAV_ITEMS.bridge, NAV_ITEMS.appointments, NAV_ITEMS.iam, ...baseItems],
        navSecondary: [
          { title: "Global Settings", url: appendUserId("/settings"), icon: Settings2 },
          { title: "Support Wiki", url: appendUserId("/docs"), icon: BookOpen },
        ],
        projects: PROJECTS,
      }
    }

    // 2. ROLE-SPECIFIC VIEWS
    switch (department) {
      case "Sales":
        return {
          navMain: [
            {
              ...NAV_ITEMS.appointments,
              // Sales can see logic but cannot modify the Registry Protocols
              items: NAV_ITEMS.appointments.items.filter(i => i.title !== "Protocol Registry")
            },
            ...baseItems
          ],
          navSecondary: [],
          projects: [PROJECTS[0]], // Only Taskflow
        }

      case "IT Associate":
        return {
          navMain: [NAV_ITEMS.appointments, ...baseItems],
          navSecondary: [],
          projects: PROJECTS.filter(p => p.name !== "Acculog Attendance"),
        }

      case "Asset Supervisor":
        return {
          navMain: baseItems,
          navSecondary: [],
          projects: [PROJECTS[0]],
        }

      default:
        return { navMain: baseItems, navSecondary: [], projects: [] }
    }
  }

  const filtered = getFilteredData()

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader className="border-b border-muted/50">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="hover:bg-transparent">
              <button onClick={() => router.push(appendUserId("/dashboard"))} className="flex items-center gap-3">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                  <img src="/xchire-logo.png" className="w-5 h-5 invert" alt="Logo" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-black uppercase tracking-tight">Engineer Portal</span>
                  <span className="truncate text-xs opacity-60 font-bold italic tracking-tighter">
                    {department || "System User"}
                  </span>
                </div>
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="gap-0">
        {!isLoading && (
          <>
            <NavMain items={filtered.navMain} />
            <NavProjects projects={filtered.projects} />
            <NavSecondary items={filtered.navSecondary} className="mt-auto" />
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-muted/50">
        <NavUser
          user={{
            id: userDetails.UserId,
            name: isLoading ? "Verifying..." : `${userDetails.Firstname} ${userDetails.Lastname}`,
            email: userDetails.Email,
            avatar: userDetails.profilePicture,
          }}
        />
      </SidebarFooter>
    </Sidebar>
  )
}