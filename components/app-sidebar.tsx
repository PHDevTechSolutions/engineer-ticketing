"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import {
  Sidebar, SidebarContent, SidebarFooter,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from "@/components/ui/sidebar"
import { NavMain }      from "./nav-main"
import { NavSecondary } from "./nav-secondary"
import { NavUser }      from "./nav-user"

import { db } from "@/lib/firebase"
import { collection, onSnapshot } from "firebase/firestore"

import {
  LayoutDashboard, CalendarCheck, FileText, Monitor, ClipboardCheck,
  Package, MoreHorizontal, ThumbsUp, Wrench, Warehouse,
  Users, ShieldCheck, BarChart3, Settings2, BookOpen, CircleUser,
} from "lucide-react"

/* ─────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────── */
interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  userId: string | null | undefined
}

type NavItem = {
  title:    string
  url:      string
  icon?:    any
  isActive?: boolean
  badge?:   number
  items?:   { title: string; url: string }[]
}

/* Full permission document shape — matches permissions-page.tsx */
type PermDoc = {
  services:  Record<string, boolean>
  nav:       Record<string, boolean>
  security:  Record<string, boolean>
  account:   Record<string, boolean>
  dashboard: Record<string, boolean>
}

/* ─────────────────────────────────────────────────────────
   SERVICE MAP  — key must match Firestore role_permissions
   .services keys exactly (same as dashboard + permissions page)
───────────────────────────────────────────────────────── */
const SERVICE_MAP: Record<string, { title: string; icon: any; path: string }> = {
  siteVisit:      { title: "Site Visit",        icon: CalendarCheck,  path: "/appointments/site-visit" },
  jobRequest:     { title: "Job Request",        icon: FileText,       path: "/request/job" },
  dialux:         { title: "DIAlux Simulation",  icon: Monitor,        path: "/request/dialux" },
  recommendation: { title: "Recommendation",     icon: ThumbsUp,       path: "/requests/recommendation" },
  shopDrawing:    { title: "Shop Drawing",        icon: Wrench,         path: "/request/shop-drawing" },
  testing:        { title: "Testing Monitor",     icon: ClipboardCheck, path: "/request/testing" },
  productRequest: { title: "SPF Product",         icon: Package,        path: "/request/product" },
  others:         { title: "Other Request",       icon: MoreHorizontal, path: "/request/other" },
}

/* Default fallback when no permission doc exists */
const DEFAULT_PERMS: PermDoc = {
  services:  {},
  nav:       { team: false, admin: false, analytics: false, systemSettings: false, helpCenter: false },
  security:  { changePassword: true, managePin: true, manageBiometrics: true, manage2FA: false, viewActivityLog: true },
  account:   { viewProfile: true, editProfile: true, preferences: true },
  dashboard: { showStats: true, showRecentActivity: true, showOverviewTabs: true, showAlertBanner: true },
}

/* ─────────────────────────────────────────────────────────
   BADGE HELPERS
───────────────────────────────────────────────────────── */
function getDeptStyle(dept: string) {
  const d = dept?.toUpperCase().trim()
  if (d === "IT")               return "bg-emerald-100 text-emerald-700"
  if (d === "ENGINEERING")      return "bg-blue-100 text-blue-700"
  if (d === "SALES")            return "bg-red-100 text-red-700"
  if (d === "PROCUREMENT")      return "bg-violet-100 text-violet-700"
  if (d?.includes("WAREHOUSE")) return "bg-amber-100 text-amber-700"
  return "bg-zinc-100 text-zinc-500"
}

function getRoleStyle(role: string) {
  const r = role?.toUpperCase()
  if (r === "SUPER ADMIN") return "bg-zinc-900 text-white"
  if (r === "MANAGER")     return "bg-blue-600 text-white"
  if (r === "LEADER")      return "bg-violet-100 text-violet-700"
  return "bg-zinc-100 text-zinc-500"
}

/* ─────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────── */
export function AppSidebar({ userId, ...props }: AppSidebarProps) {
  const pathname = usePathname()

  const [isLoading, setIsLoading]     = React.useState(true)
  const [permsLoaded, setPermsLoaded] = React.useState(false)
  const [userDetails, setUserDetails] = React.useState({
    UserId: "", Firstname: "", Lastname: "", Email: "",
    profilePicture: "", Department: "", Role: "",
  })
  /* Full permission doc for this user's dept+role */
  const [permDoc, setPermDoc] = React.useState<PermDoc>(DEFAULT_PERMS)

  /* ── 1. Fetch user profile ── */
  React.useEffect(() => {
    if (!userId) { setIsLoading(false); return }
    const run = async () => {
      try {
        const res  = await fetch(`/api/user?id=${encodeURIComponent(userId)}`)
        const data = await res.json()
        const role = localStorage.getItem("userRole")       || "MEMBER"
        const dept = localStorage.getItem("userDepartment") || data.Department || ""
        setUserDetails({
          UserId:         data._id || userId,
          Firstname:      data.Firstname      || "",
          Lastname:       data.Lastname       || "",
          Email:          data.Email          || "",
          profilePicture: data.profilePicture || "/avatars/default.jpg",
          Department:     dept,
          Role:           role,
        })
      } catch (e) {
        console.error("Sidebar user fetch:", e)
      } finally {
        setIsLoading(false)
      }
    }
    run()
  }, [userId])

  /* ── 2. Subscribe to role_permissions — reads ALL sections ── */
  React.useEffect(() => {
    if (!userDetails.Department || !userDetails.Role) return

    const deptKey  = userDetails.Department.toUpperCase().trim()
    const roleKey  = userDetails.Role.toUpperCase().trim()
    const targetId = `${deptKey}_${roleKey}`

    const unsub = onSnapshot(collection(db, "role_permissions"), snap => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[]

      /* Exact match first, then fallback to role-only */
      const raw = docs.find((p: any) => p.id === targetId)
               || docs.find((p: any) => p.id.endsWith(`_${roleKey}`))

      if (raw) {
        /* Deep merge with defaults to handle missing keys */
        setPermDoc({
          services:  { ...DEFAULT_PERMS.services,  ...(raw.services  || {}) },
          nav:       { ...DEFAULT_PERMS.nav,        ...(raw.nav       || {}) },
          security:  { ...DEFAULT_PERMS.security,   ...(raw.security  || {}) },
          account:   { ...DEFAULT_PERMS.account,    ...(raw.account   || {}) },
          dashboard: { ...DEFAULT_PERMS.dashboard,  ...(raw.dashboard || {}) },
        })
      } else {
        setPermDoc(DEFAULT_PERMS)
      }
      setPermsLoaded(true)
    })

    return () => unsub()
  }, [userDetails.Department, userDetails.Role])

  /* ── 3. Append userId to links ── */
  const appendId = React.useCallback((url: string) =>
    userId
      ? url.includes("?") ? `${url}&userId=${userId}` : `${url}?userId=${userId}`
      : url,
    [userId]
  )

  /* ── 4. Build nav — 100% driven by Firestore permDoc ── */
  const { navMain, navSecondary } = React.useMemo(() => {
    if (isLoading || !permsLoaded) return { navMain: [], navSecondary: [] }

    const p  = pathname ?? ""
    const sv = permDoc.services
    const nv = permDoc.nav
    const ac = permDoc.account

    /* Dashboard — always visible */
    const dashboard: NavItem = {
      title:    "Dashboard",
      url:      appendId("/dashboard"),
      icon:     LayoutDashboard,
      isActive: p.startsWith("/dashboard"),
    }

    /* ── Services — from permDoc.services ── */
    const serviceItems: NavItem[] = Object.entries(SERVICE_MAP)
      .filter(([key]) => sv[key] === true)
      .map(([, def]) => ({
        title:    def.title,
        url:      appendId(def.path),
        icon:     def.icon,
        isActive: p.startsWith(def.path),
      }))

    /* ≤3 services → flat; >3 → collapsible group */
    const servicesEntry: NavItem[] = serviceItems.length === 0
      ? []
      : serviceItems.length <= 3
      ? serviceItems
      : [{
          title:    "Services",
          url:      "#",
          icon:     LayoutDashboard,
          isActive: serviceItems.some(s => p.startsWith(s.url.split("?")[0])),
          items:    serviceItems.map(s => ({ title: s.title, url: s.url })),
        }]

    /* ── Nav sections — from permDoc.nav ── */
    const teamItem: NavItem = {
      title:    "Team",
      url:      "#",
      icon:     Users,
      isActive: p.startsWith("/admin/staff") || p.startsWith("/admin/logs"),
      items: [
        { title: "Staff Directory",   url: appendId("/admin/staff") },
        { title: "Activity Logs",     url: appendId("/admin/logs") },
        { title: "Service Schedules", url: appendId("/appointments/slots") },
      ],
    }

    const adminItem: NavItem = {
      title:    "Admin",
      url:      "#",
      icon:     ShieldCheck,
      isActive: p.startsWith("/admin/permissions") || p.startsWith("/admin/protocols"),
      items: [
        { title: "Access Rights",   url: appendId("/admin/permissions") },
        { title: "Protocols",       url: appendId("/admin/protocols") },
        { title: "Team Matrix",     url: appendId("/admin/assignment-matrix") },
      ],
    }

    const analyticsItem: NavItem = {
      title:    "Analytics",
      url:      appendId("/analytics"),
      icon:     BarChart3,
      isActive: p.startsWith("/analytics"),
    }

    /* ── Account — sub-items filtered by permDoc.account ── */
    const accountSubItems = [
      ...(ac.viewProfile ? [{ title: "Profile",   url: appendId("/account/profile") }]      : []),
      { title: "Security", url: appendId("/account/security") }, // always available
      ...(ac.preferences  ? [{ title: "Settings", url: appendId("/account/preferences") }]   : []),
    ]

    const accountItem: NavItem = {
      title:    "My Account",
      url:      "#",
      icon:     CircleUser,
      isActive: p.startsWith("/account"),
      items:    accountSubItems,
    }

    /* ── Assemble final nav ── */
    const main: NavItem[] = [
      dashboard,
      ...servicesEntry,
      ...(nv.team      ? [teamItem]      : []),
      ...(nv.admin     ? [adminItem]     : []),
      ...(nv.analytics ? [analyticsItem] : []),
      accountItem,
    ]

    const secondary: NavItem[] = [
      ...(nv.systemSettings ? [{ title: "System Settings", url: appendId("/settings"), icon: Settings2 }] : []),
      ...(nv.helpCenter     ? [{ title: "Help Center",     url: appendId("/docs"),     icon: BookOpen  }] : []),
    ]

    return { navMain: main, navSecondary: secondary }
  }, [isLoading, permsLoaded, permDoc, pathname, appendId])

  const dept             = userDetails.Department?.trim()
  const role             = userDetails.Role?.trim()
  const enabledServices  = Object.values(permDoc.services).filter(Boolean).length

  /* ─────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────── */
  return (
    <Sidebar variant="inset" className="bg-[#F8F9FA] border-r border-gray-100 z-30" {...props}>

      {/* ── HEADER ── */}
      <SidebarHeader className="p-0 bg-white border-b border-gray-100">
        <SidebarMenu className="p-4">
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="hover:bg-transparent px-0 h-auto">
              <Link
                href={appendId("/dashboard")}
                className="flex flex-col items-start gap-3 w-full group text-left no-underline"
              >
                {/* Brand */}
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-[#E33636] flex items-center justify-center shadow-lg shadow-red-100 transition-transform group-hover:scale-95 flex-shrink-0">
                    <img src="/disruptive.png" className="w-6 h-6 invert" alt="DSI" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-black uppercase tracking-tighter text-zinc-900 leading-none">
                      DSI Connect
                    </span>
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">
                      Enterprise Platform
                    </span>
                  </div>
                </div>

                {/* User context card */}
                {isLoading ? (
                  <div className="w-full h-[62px] bg-zinc-50 border border-zinc-100 rounded-xl animate-pulse" />
                ) : dept ? (
                  <div className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-100 rounded-xl group-hover:bg-zinc-100 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest leading-none mb-1">Session</p>
                        <p className="text-[12px] font-black text-zinc-900 truncate leading-none">
                          {userDetails.Firstname || "User"}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded-full ${getDeptStyle(dept)}`}>
                          {dept.length > 10 ? dept.slice(0, 8) + "…" : dept}
                        </span>
                        <span className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded-full ${getRoleStyle(role)}`}>
                          {role || "MEMBER"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2 pt-1.5 border-t border-zinc-100">
                      <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[8px] font-bold text-emerald-600 uppercase tracking-widest">Live</span>
                      {permsLoaded && enabledServices > 0 && (
                        <>
                          <div className="h-2 w-px bg-zinc-200 mx-0.5" />
                          <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">
                            {enabledServices} service{enabledServices !== 1 ? "s" : ""}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="w-full px-3 py-2 bg-zinc-50 border border-zinc-100 rounded-xl">
                    <p className="text-[9px] font-bold text-zinc-400 uppercase">Guest Session</p>
                  </div>
                )}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* ── CONTENT ── */}
      <SidebarContent className="gap-0 py-3 overflow-y-auto scrollbar-hide">
        {isLoading || !permsLoaded ? (
          <div className="px-4 space-y-1.5 pt-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-9 bg-zinc-100 rounded-xl animate-pulse"
                style={{ opacity: 1 - i * 0.12 }} />
            ))}
          </div>
        ) : (
          <>
            <NavMain items={navMain} />
            {navSecondary.length > 0 && (
              <>
                <div className="px-4 py-2"><div className="h-px bg-zinc-100" /></div>
                <NavSecondary items={navSecondary} />
              </>
            )}
          </>
        )}
      </SidebarContent>

      {/* ── FOOTER ── */}
      <SidebarFooter className="border-t border-gray-100 bg-white p-3">
        <NavUser
          user={{
            id:     userDetails.UserId,
            name:   isLoading ? "Loading..." : `${userDetails.Firstname} ${userDetails.Lastname}`.trim(),
            email:  userDetails.Email,
            avatar: userDetails.profilePicture,
          }}
        />
      </SidebarFooter>
    </Sidebar>
  )
}