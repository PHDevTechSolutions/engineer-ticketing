"use client"

import * as React from "react"
import { 
  ShieldCheck, Search, ShieldAlert, UserCog, 
  ChevronRight, Lock, Unlock, RotateCcw,
  Layers, Users2, Briefcase, RefreshCw, Loader2
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/page-header"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import ProtectedPageWrapper from "@/components/protected-page-wrapper"
import { toast } from "sonner"

interface PermissionRole {
  id: string
  roleName: "SUPER ADMIN" | "MANAGER" | "LEADER" | "MEMBER" | "GUEST"
  description: string
  status: "ACTIVE" | "RESTRICTED"
  departments: string[]
}

export default function PermissionsPage() {
  const [userId, setUserId] = React.useState<string | null>(null)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [activeDept, setActiveDept] = React.useState<string>("ALL")
  const [staff, setStaff] = React.useState<any[]>([])
  const [isFetching, setIsFetching] = React.useState(true)

  // 1. Fetch staff data to count roles dynamically
  const updatePermissionsData = React.useCallback(async () => {
    setIsFetching(true)
    try {
      const res = await fetch("/api/UserManagement/Fetch")
      if (!res.ok) throw new Error("Connection failed")
      const data = await res.json()
      setStaff(data || [])
    } catch (err) {
      toast.error("Could not sync role counts.")
    } finally {
      setIsFetching(false)
    }
  }, [])

  React.useEffect(() => {
    setUserId(localStorage.getItem("userId"))
    updatePermissionsData()
  }, [updatePermissionsData])

  const departments = ["ALL", "IT", "ENGINEERING", "SALES", "PROCUREMENT"]

  const roles: PermissionRole[] = [
    { 
      id: "1", 
      roleName: "SUPER ADMIN", 
      description: "Full system authority. Manages global configurations, security settings, and developer-level audit logs.", 
      status: "ACTIVE",
      departments: ["IT"]
    },
    { 
      id: "2", 
      roleName: "MANAGER", 
      description: "Departmental head. Responsible for project approvals, quotation finalization, and high-level reporting.", 
      status: "ACTIVE",
      departments: ["ENGINEERING", "SALES", "PROCUREMENT"]
    },
    { 
      id: "3", 
      roleName: "LEADER", 
      description: "Team supervisor. Manages daily task distribution, technical validations, and member progress tracking.", 
      status: "ACTIVE",
      departments: ["ENGINEERING", "IT"]
    },
    { 
      id: "4", 
      roleName: "MEMBER", 
      description: "Standard operational access. Creates tickets, updates task status, and generates draft quotations.", 
      status: "ACTIVE",
      departments: ["ENGINEERING", "SALES", "PROCUREMENT", "IT"]
    },
    { 
      id: "5", 
      roleName: "GUEST", 
      description: "Restricted visibility. Limited to viewing shared dashboards or public project documentation only.", 
      status: "RESTRICTED",
      departments: ["ALL"]
    },
  ]

  // Helper to count users for a specific role name
  const getRoleUserCount = (roleName: string) => {
    return staff.filter(user => user.Role?.toUpperCase() === roleName.toUpperCase()).length
  }

  const filteredRoles = roles.filter(role => {
    const matchesSearch = role.roleName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDept = activeDept === "ALL" || role.departments.includes(activeDept)
    return matchesSearch && matchesDept
  })

  return (
    <ProtectedPageWrapper>
      <SidebarProvider defaultOpen={false}>
        <AppSidebar userId={userId} />
        <SidebarInset className="bg-[#F4F7F7] font-sans">
          
          <PageHeader 
            title="SYSTEM PERMISSIONS" 
            version="V3.2" 
            showBackButton={true}
            trigger={<SidebarTrigger className="mr-2" />}
            actions={
                <Button 
                    onClick={updatePermissionsData} 
                    variant="ghost" 
                    size="icon" 
                    className={cn("rounded-full h-10 w-10", isFetching && "bg-blue-50 text-blue-600")}
                >
                    <RefreshCw className={cn("size-5", isFetching && "animate-spin")} />
                </Button>
            }
          />

          <main className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">
            
            {/* Hierarchy Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-[24px] border border-zinc-200/60 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                  <ShieldCheck className="size-6" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Active Roles</p>
                  <p className="text-2xl font-black text-zinc-900">{roles.filter(r => r.status === "ACTIVE").length.toString().padStart(2, '0')}</p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-[24px] border border-zinc-200/60 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-zinc-50 text-zinc-400 rounded-xl">
                  <Users2 className="size-6" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Total Staff</p>
                  <p className="text-2xl font-black text-zinc-900">
                    {isFetching ? <Loader2 className="size-5 animate-spin text-zinc-300" /> : staff.length.toString().padStart(2, '0')}
                  </p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-[24px] border border-zinc-200/60 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
                  <Lock className="size-6" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Restricted</p>
                  <p className="text-2xl font-black text-zinc-900">{roles.filter(r => r.status === "RESTRICTED").length.toString().padStart(2, '0')}</p>
                </div>
              </div>
            </div>

            {/* Department Filter & Search */}
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
                <input
                  placeholder="Filter by role name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 h-12 rounded-2xl border-none bg-white shadow-sm ring-1 ring-zinc-200 focus:ring-2 focus:ring-black outline-none text-sm font-medium transition-all"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar w-full md:w-auto">
                {departments.map((dept) => (
                  <Button
                    key={dept}
                    onClick={() => setActiveDept(dept)}
                    variant={activeDept === dept ? "default" : "outline"}
                    className={cn(
                      "h-12 px-5 rounded-2xl font-bold text-[10px] uppercase tracking-tighter transition-all shrink-0",
                      activeDept === dept ? "bg-black text-white" : "bg-white text-zinc-500 border-zinc-200 hover:bg-zinc-50"
                    )}
                  >
                    {dept}
                  </Button>
                ))}
              </div>
            </div>

            {/* Roles Table */}
            <div className="bg-white rounded-[32px] border border-zinc-200/60 overflow-hidden shadow-sm">
              <div className="hidden md:grid grid-cols-12 bg-zinc-50/50 p-6 border-b border-zinc-100 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                <span className="col-span-4">Role Title</span>
                <span className="col-span-4">Permissions Overview</span>
                <span className="col-span-2 text-center">Users</span>
                <span className="col-span-2 text-right">Status</span>
              </div>

              <div className="divide-y divide-zinc-50">
                {filteredRoles.map((role) => (
                  <div key={role.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-6 items-center hover:bg-zinc-50/40 transition-colors group cursor-pointer">
                    <div className="col-span-4 flex items-center gap-4">
                      <div className={cn(
                        "p-3 rounded-2xl text-white transition-transform group-hover:scale-110",
                        role.roleName === "SUPER ADMIN" ? "bg-zinc-900 shadow-lg shadow-zinc-200" :
                        role.roleName === "MANAGER" ? "bg-blue-600 shadow-lg shadow-blue-100" :
                        role.roleName === "LEADER" ? "bg-emerald-600 shadow-lg shadow-emerald-100" : 
                        role.roleName === "GUEST" ? "bg-orange-500 shadow-lg shadow-orange-100" : "bg-zinc-400 shadow-lg shadow-zinc-100"
                      )}>
                        {role.status === "ACTIVE" ? <Unlock className="size-4" /> : <Lock className="size-4" />}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-zinc-900 tracking-tight">{role.roleName}</span>
                        <div className="flex gap-1 mt-1">
                          {role.departments.slice(0, 2).map(d => (
                            <span key={d} className="text-[8px] font-bold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full uppercase">
                              {d}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="col-span-4">
                      <p className="text-xs text-zinc-500 leading-relaxed font-medium pr-4">
                        {role.description}
                      </p>
                    </div>

                    <div className="col-span-2 text-center">
                      <div className="inline-flex flex-col items-center">
                        <span className="text-sm font-black text-zinc-900">
                          {isFetching ? "..." : getRoleUserCount(role.roleName)}
                        </span>
                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter">Assigned</span>
                      </div>
                    </div>

                    <div className="col-span-2 flex items-center justify-end gap-3">
                      <Badge className={cn(
                        "px-3 py-1 rounded-full text-[9px] font-bold border-none",
                        role.status === "ACTIVE" ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600"
                      )}>
                        {role.status}
                      </Badge>
                      <Button variant="ghost" size="icon" className="size-8 rounded-xl group-hover:translate-x-1 transition-transform bg-zinc-50 text-zinc-400 group-hover:text-black">
                        <ChevronRight className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedPageWrapper>
  )
}