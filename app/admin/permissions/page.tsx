"use client"

import * as React from "react"
import { 
  ShieldCheck, Search, ShieldAlert, UserCog, 
  ChevronRight, Lock, Unlock, RotateCcw, Plus 
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/page-header"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import ProtectedPageWrapper from "@/components/protected-page-wrapper"

// Simple data structure for permissions
interface PermissionRole {
  id: string
  roleName: string
  description: string
  userCount: number
  status: "ACTIVE" | "RESTRICTED"
}

export default function PermissionsPage() {
  const [userId, setUserId] = React.useState<string | null>(null)
  const [searchTerm, setSearchTerm] = React.useState("")

  React.useEffect(() => {
    setUserId(localStorage.getItem("userId"))
  }, [])

  // Sample data for engiconnect roles
  const roles: PermissionRole[] = [
    { id: "1", roleName: "Super Admin", description: "Full access to all system settings and logs.", userCount: 2, status: "ACTIVE" },
    { id: "2", roleName: "Manager", description: "Can view reports and manage team activities.", userCount: 5, status: "ACTIVE" },
    { id: "3", roleName: "Standard User", description: "Basic access to daily tools and personal logs.", userCount: 24, status: "ACTIVE" },
    { id: "4", roleName: "Guest", description: "Limited view-only access for temporary visitors.", userCount: 1, status: "RESTRICTED" },
  ]

  const filteredRoles = roles.filter(role => 
    role.roleName.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
              <Button className="h-10 rounded-xl bg-black text-white hover:bg-zinc-800 font-bold text-[10px] tracking-widest uppercase px-4 gap-2">
                <Plus className="size-4" /> New Role
              </Button>
            }
          />

          <main className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">
            
            {/* Top Stats - Layman Terms */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-[24px] border border-zinc-200/60 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                  <ShieldCheck className="size-6" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Active Roles</p>
                  <p className="text-2xl font-black text-zinc-900">03</p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-[24px] border border-zinc-200/60 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-zinc-50 text-zinc-400 rounded-xl">
                  <UserCog className="size-6" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Assigned Users</p>
                  <p className="text-2xl font-black text-zinc-900">32</p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-[24px] border border-zinc-200/60 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
                  <Lock className="size-6" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Restricted</p>
                  <p className="text-2xl font-black text-zinc-900">01</p>
                </div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
              <input
                placeholder="Search by role name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 h-12 rounded-2xl border-none bg-white shadow-sm ring-1 ring-zinc-200 focus:ring-2 focus:ring-black outline-none text-sm"
              />
            </div>

            {/* Roles List */}
            <div className="bg-white rounded-[24px] border border-zinc-200/60 overflow-hidden shadow-sm">
              <div className="hidden md:grid grid-cols-12 bg-zinc-50/50 p-6 border-b border-zinc-100 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                <span className="col-span-4">Access Role</span>
                <span className="col-span-4">Privileges</span>
                <span className="col-span-2 text-center">Users</span>
                <span className="col-span-2 text-right">Status</span>
              </div>

              <div className="divide-y divide-zinc-50">
                {filteredRoles.map((role) => (
                  <div key={role.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-6 items-center hover:bg-zinc-50/40 transition-colors group cursor-pointer">
                    <div className="col-span-4 flex items-center gap-4">
                      <div className="p-2.5 bg-zinc-900 text-white rounded-xl">
                        <Unlock className="size-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-zinc-900 uppercase tracking-tight">{role.roleName}</span>
                        <span className="text-[10px] text-zinc-400 font-medium">ID: ROLE-0{role.id}</span>
                      </div>
                    </div>

                    <div className="col-span-4">
                      <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                        {role.description}
                      </p>
                    </div>

                    <div className="col-span-2 text-center">
                      <Badge variant="outline" className="rounded-lg border-zinc-200 px-3 font-bold text-zinc-600 text-[10px]">
                        {role.userCount} Users
                      </Badge>
                    </div>

                    <div className="col-span-2 flex items-center justify-end gap-3">
                      <Badge className={cn(
                        "px-2 py-0.5 rounded-md text-[9px] font-bold border-none",
                        role.status === "ACTIVE" ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600"
                      )}>
                        {role.status}
                      </Badge>
                      <Button variant="ghost" size="icon" className="size-8 rounded-lg group-hover:translate-x-1 transition-transform">
                        <ChevronRight className="size-4 text-zinc-400" />
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