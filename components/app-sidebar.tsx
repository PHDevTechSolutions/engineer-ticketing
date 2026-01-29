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
  LifeBuoy,
  ShieldCheck,
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
  // CORE NAVIGATION SECTIONS
  // ---------------------------------------------------------
  const NAV_ITEMS = {
    // 1. App-to-App Bridge (The "Switchboard")
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
    // 2. Appointment & Schedule Logic
    appointments: {
      title: "Appointment Logic",
      url: "#",
      icon: CalendarDays,
      isActive: pathname?.startsWith("/appointments"),
      items: [
        { title: "Schedules & Slots", url: appendUserId("/appointments/slots") },
        { title: "Booking Rules", url: appendUserId("/appointments/rules") },
        { title: "Notification Templates", url: appendUserId("/appointments/notifications") },
      ],
    },
    // 3. User & Staff Management
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
    // 4. Personal Account & Security
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

  // 5. Direct External/Linked Apps
  const PROJECTS = [
    { name: "Taskflow SMS", url: appendUserId("/taskflow"), icon: ExternalLink },
    { name: "Ecodesk Ticketing", url: appendUserId("/ecodesk"), icon: ExternalLink },
    { name: "Acculog Attendance", url: appendUserId("/acculog"), icon: ExternalLink },
  ]

  // ---------------------------------------------------------
  // FILTER LOGIC (Based on User Position)
  // ---------------------------------------------------------
  const position = userDetails.Position?.trim()
  const hasFullAccess = ["IT Manager", "IT Senior Supervisor", "Senior Fullstack Developer"].includes(position)

  const getFilteredData = () => {
    if (isLoading) return { navMain: [], navSecondary: [], projects: [] }
    
    // Everyone sees "My Account"
    const baseItems = [NAV_ITEMS.personal]

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

    // Role Specific
    switch (position) {
      case "IT Associate":
        return {
          navMain: [NAV_ITEMS.appointments, ...baseItems],
          navSecondary: [],
          projects: PROJECTS.filter(p => p.name !== "Acculog Attendance"),
        }
      case "Asset Supervisor":
        return {
          navMain: [...baseItems],
          navSecondary: [],
          projects: [PROJECTS[0]], // Only Taskflow
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
                  <span className="truncate text-xs opacity-60">Management Console</span>
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