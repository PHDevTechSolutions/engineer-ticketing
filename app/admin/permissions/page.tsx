"use client"

import * as React from "react"
import { 
  ShieldCheck, Search, ShieldAlert, UserCog, 
  ChevronRight, Lock, Unlock, RotateCcw,
  Layers, Users2, Briefcase, RefreshCw, Loader2,
  CheckCircle2, AlertCircle, XCircle, Info, Settings2,
  SlidersHorizontal, LayoutDashboard, Database, 
  Terminal, Globe, HardDrive, CalendarCheck, FileText, 
  Monitor, ThumbsUp, ClipboardCheck, MoreHorizontal, Plus
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/page-header"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import ProtectedPageWrapper from "@/components/protected-page-wrapper"
import { toast } from "sonner"
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription,
  SheetFooter 
} from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"

// --- FIREBASE ---
import { db } from "@/lib/firebase" 
import { collection, getDocs, doc, setDoc, getDoc } from "firebase/firestore"

// --- TYPES ---
interface PermissionRole {
  id: string
  roleName: string
  description: string
  status: "ACTIVE" | "RESTRICTED"
  departments: string[]
}

const StreetLightIcon = ({ size = 16, className = "" }: { size?: number; className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M7 22h3M9 22V7c0-2 1-3 3-3h5" /><path d="M15 4h5l1 2h-7l1-2z" /><path d="M17 9v1M14 8l-.5.5M20 8l.5.5" opacity="0.5" />
    </svg>
);

export default function PermissionsPage() {
  const [userId, setUserId] = React.useState<string | null>(null)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [activeDept, setActiveDept] = React.useState<string>("ALL")
  const [staff, setStaff] = React.useState<any[]>([])
  const [isFetching, setIsFetching] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)
  const [selectedRole, setSelectedRole] = React.useState<PermissionRole | null>(null)
  
  // Logic States
  const [isDashboardAllowed, setIsDashboardAllowed] = React.useState(false)
  const [servicePermissions, setServicePermissions] = React.useState<Record<string, boolean>>({
    siteVisit: false,
    jobRequest: false,
    dialux: false,
    recommendation: false,
    shopDrawing: false,
    testing: false,
    others: false
  })

  const updatePermissionsData = React.useCallback(async () => {
    setIsFetching(true)
    try {
      const res = await fetch("/api/UserManagement/Fetch")
      if (!res.ok) throw new Error("Connection failed")
      const mongoUsers = await res.json()

      const firestoreSnap = await getDocs(collection(db, "users"))
      const securityMap: Record<string, any> = {}
      firestoreSnap.forEach(doc => {
        securityMap[doc.id] = doc.data()
      })

      const mergedData = mongoUsers.map((u: any) => {
        const security = securityMap[u._id] || { Role: "MEMBER" }
        return { 
          ...u, 
          Role: security.Role?.toUpperCase() || "MEMBER" 
        }
      })

      setStaff(mergedData || [])
    } catch (err) {
      console.error(err)
      toast.error("Could not sync role counts.")
    } finally {
      setIsFetching(false)
    }
  }, [])

  React.useEffect(() => {
    setUserId(localStorage.getItem("userId"))
    updatePermissionsData()
  }, [updatePermissionsData])

  React.useEffect(() => {
    const loadRolePermissions = async () => {
      if (!selectedRole || activeDept === "ALL") return;
      
      try {
        const docId = `${activeDept}_${selectedRole.roleName}`;
        const docRef = doc(db, "role_permissions", docId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setIsDashboardAllowed(data.isDashboardAllowed ?? false);
          setServicePermissions(data.services ?? {});
        } else {
          // Seniority-based defaults
          const isHighLevel = ["SUPER ADMIN", "MANAGER", "LEADER"].includes(selectedRole.roleName);
          setIsDashboardAllowed(selectedRole.roleName !== "GUEST");
          setServicePermissions({
            siteVisit: isHighLevel,
            jobRequest: isHighLevel,
            dialux: isHighLevel,
            recommendation: true,
            shopDrawing: ["SUPER ADMIN", "MANAGER"].includes(selectedRole.roleName),
            testing: isHighLevel,
            others: true
          });
        }
      } catch (error) {
        console.error("Error loading permissions:", error);
      }
    };

    loadRolePermissions();
  }, [selectedRole, activeDept]);

  const handleSavePermissionLogic = async () => {
    if (!selectedRole || activeDept === "ALL") {
        toast.error("Please select a specific department first.");
        return;
    }
    
    setIsSaving(true)
    try {
      const docId = `${activeDept}_${selectedRole.roleName}`;
      const roleRef = doc(db, "role_permissions", docId);
      
      await setDoc(roleRef, {
        roleName: selectedRole.roleName,
        department: activeDept,
        isDashboardAllowed: isDashboardAllowed,
        services: servicePermissions,
        updatedAt: new Date(),
        updatedBy: userId
      }, { merge: true });

      toast.success(`${activeDept} ${selectedRole.roleName} Updated`, {
        icon: <ShieldCheck className="size-4 text-emerald-500" />
      })
      setSelectedRole(null)
    } catch (error) {
      console.error("Firebase Save Error:", error)
      toast.error("Failed to commit changes.")
    } finally {
      setIsSaving(false)
    }
  }

  const toggleService = (serviceId: string) => {
    setServicePermissions(prev => ({
      ...prev,
      [serviceId]: !prev[serviceId]
    }))
  }

  const departments = ["ALL", "IT", "ENGINEERING", "SALES", "PROCUREMENT"]

  const roles: PermissionRole[] = React.useMemo(() => [
    { id: "1", roleName: "SUPER ADMIN", description: "Full system authority. Manages global configurations.", status: "ACTIVE", departments: ["IT", "ENGINEERING", "SALES", "PROCUREMENT"] },
    { id: "2", roleName: "MANAGER", description: "Departmental head. Project approvals and reporting.", status: "ACTIVE", departments: ["IT", "ENGINEERING", "SALES", "PROCUREMENT"] },
    { id: "3", roleName: "LEADER", description: "Team supervisor. Daily task distribution.", status: "ACTIVE", departments: ["IT", "ENGINEERING", "SALES", "PROCUREMENT"] },
    { id: "4", roleName: "MEMBER", description: "Standard operational access. Creates tickets.", status: "ACTIVE", departments: ["IT", "ENGINEERING", "SALES", "PROCUREMENT"] },
    { id: "5", roleName: "GUEST", description: "Restricted visibility. Limited viewing only.", status: "RESTRICTED", departments: ["ALL"] },
  ], [])

  const filteredRoles = React.useMemo(() => roles.filter(role => {
    const matchesSearch = role.roleName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDept = activeDept === "ALL" || role.departments.includes(activeDept)
    return matchesSearch && matchesDept
  }), [roles, searchTerm, activeDept])

  const getRoleUserCount = (roleName: string) => staff.filter(user => user.Role === roleName.toUpperCase()).length

  return (
    <ProtectedPageWrapper>
      <SidebarProvider defaultOpen={false}>
        <AppSidebar userId={userId} />
        <SidebarInset className="bg-[#F8FAFA] font-sans pb-20 md:pb-0">
          
          <PageHeader 
            title="SYSTEM PERMISSIONS" 
            version="V4.5-SECURITY" 
            showBackButton={true}
            trigger={<SidebarTrigger className="mr-2" />}
            actions={
                <Button onClick={updatePermissionsData} variant="ghost" size="icon" className={cn("rounded-full h-10 w-10", isFetching && "bg-blue-50")}>
                    <RefreshCw className={cn("size-5", isFetching && "animate-spin text-blue-600")} />
                </Button>
            }
          />

          <main className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">
            {/* Stats Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              <StatCard icon={<ShieldCheck />} label="Active Roles" value={roles.filter(r => r.status === "ACTIVE").length} color="emerald" />
              <StatCard icon={<Users2 />} label="Total Staff" value={staff.length} color="zinc" loading={isFetching} />
              <StatCard icon={<Lock />} label="Restricted" value={roles.filter(r => r.status === "RESTRICTED").length} color="orange" className="hidden md:flex" />
            </div>

            {/* Filters Section */}
            <div className="bg-white p-2 rounded-[24px] md:rounded-[28px] border border-zinc-200 shadow-sm flex flex-col md:flex-row gap-2 sticky top-4 z-30">
                <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-zinc-400 group-focus-within:text-black transition-colors" />
                    <input
                        placeholder="Search security roles..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-11 h-12 rounded-[20px] md:rounded-[22px] border-none bg-transparent focus:bg-zinc-50 focus:ring-1 focus:ring-zinc-100 outline-none text-sm font-bold transition-all"
                    />
                </div>
                <Separator orientation="vertical" className="hidden md:block h-8 self-center bg-zinc-200 mx-2" />
                <div className="flex gap-1 overflow-x-auto no-scrollbar p-1 pb-2 md:pb-1">
                    {departments.map((dept) => (
                    <button
                        key={dept}
                        onClick={() => setActiveDept(dept)}
                        className={cn(
                            "h-10 px-5 rounded-full text-[10px] font-black uppercase tracking-tighter transition-all whitespace-nowrap",
                            activeDept === dept ? "bg-black text-white shadow-lg scale-105" : "text-zinc-500 hover:bg-zinc-100"
                        )}
                    >
                        {dept}
                    </button>
                    ))}
                </div>
            </div>

            {/* Roles Container */}
            <div className="bg-white rounded-[32px] border border-zinc-200/60 overflow-hidden shadow-sm">
              {/* Header - Desktop Only */}
              <div className="hidden md:grid grid-cols-12 bg-zinc-50/50 p-6 border-b border-zinc-100 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                <span className="col-span-4">Role Identity</span>
                <span className="col-span-4">Permissions Overview</span>
                <span className="col-span-2 text-center">Assigned</span>
                <span className="col-span-2 text-right">Registry Status</span>
              </div>

              <div className="divide-y divide-zinc-50">
                {isFetching ? (
                  [...Array(4)].map((_, i) => (
                    <div key={i} className="p-6 space-y-3">
                      <div className="flex items-center gap-4">
                        <Skeleton className="size-10 rounded-2xl" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </div>
                    </div>
                  ))
                ) : filteredRoles.length > 0 ? (
                  filteredRoles.map((role) => (
                    <div key={role.id} onClick={() => setSelectedRole(role)} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-5 md:p-6 items-center hover:bg-zinc-50/40 transition-colors group cursor-pointer relative">
                      <div className="col-span-4 flex items-center gap-4">
                        <div className={cn("p-3 rounded-2xl text-white group-hover:scale-110 transition-transform shadow-sm", 
                          role.roleName === "SUPER ADMIN" ? "bg-zinc-900" : role.roleName === "MANAGER" ? "bg-blue-600" : role.roleName === "LEADER" ? "bg-emerald-600" : "bg-zinc-400")}>
                          {role.status === "ACTIVE" ? <Unlock className="size-4" /> : <Lock className="size-4" />}
                        </div>
                        <div>
                          <span className="text-sm font-black text-zinc-900 block group-hover:underline decoration-zinc-300 underline-offset-4">{role.roleName}</span>
                          <div className="flex gap-1 mt-1 overflow-x-hidden">
                              {role.departments.slice(0, 3).map(d => (
                                  <span key={d} className="text-[8px] font-bold px-1.5 py-0.5 bg-zinc-100 text-zinc-500 rounded uppercase whitespace-nowrap">{d}</span>
                              ))}
                              {role.departments.length > 3 && <span className="text-[8px] font-bold px-1.5 py-0.5 bg-zinc-100 text-zinc-500 rounded">+{role.departments.length - 3}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="col-span-4 text-xs text-zinc-500 font-medium leading-relaxed md:pr-6 line-clamp-2">
                        {role.description}
                      </div>
                      
                      {/* Mobile Row for Count & Status */}
                      <div className="flex items-center justify-between md:contents">
                        <div className="col-span-2 text-center md:text-center">
                            <span className="text-sm font-black text-zinc-900">{getRoleUserCount(role.roleName).toString().padStart(2, '0')}</span>
                            <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-tighter">Profiles</p>
                        </div>
                        <div className="col-span-2 flex justify-end items-center gap-3">
                            <Badge className={cn("text-[9px] font-black border-none px-3", role.status === "ACTIVE" ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600")}>
                                {role.status}
                            </Badge>
                            <ChevronRight className="size-5 text-zinc-300 group-hover:text-black group-hover:translate-x-1 transition-all" />
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-20 text-center flex flex-col items-center justify-center">
                    <div className="size-16 bg-zinc-50 rounded-full flex items-center justify-center mb-4">
                      <Search className="size-6 text-zinc-200" />
                    </div>
                    <p className="text-sm font-bold text-zinc-900">No security roles found</p>
                    <p className="text-xs text-zinc-400 mt-1">Try adjusting your search or filters.</p>
                  </div>
                )}
              </div>
            </div>
          </main>

          {/* Configuration Sheet */}
          <Sheet open={!!selectedRole} onOpenChange={() => !isSaving && setSelectedRole(null)}>
            <SheetContent className="w-full sm:max-w-md md:rounded-l-[40px] border-l-zinc-200 shadow-2xl p-0 overflow-hidden flex flex-col">
              
              <div className="p-6 md:p-8 pb-10 bg-gradient-to-br from-zinc-50 via-white to-zinc-50 relative">
                <div className="space-y-4">
                  <Badge className="bg-zinc-900 text-white text-[9px] font-black rounded-full px-3 py-1 border-none uppercase">
                    {activeDept} DEPT CONFIG
                  </Badge>
                  <SheetTitle className="text-3xl md:text-4xl font-black tracking-tighter text-zinc-900 leading-none">
                    {selectedRole?.roleName}
                  </SheetTitle>
                  <SheetDescription className="text-zinc-500 font-medium text-sm leading-relaxed">
                    Customizing access levels for the <b>{activeDept}</b> division.
                  </SheetDescription>
                </div>
                <Settings2 className="absolute top-8 right-8 size-12 md:size-16 text-zinc-100/80 -z-10 animate-pulse" />
              </div>

              <div className="flex-1 overflow-y-auto px-6 md:px-8 py-4 space-y-8 no-scrollbar">
                {activeDept === "ALL" ? (
                    <div className="p-6 bg-red-50 rounded-[28px] border border-red-100 text-center">
                        <AlertCircle className="size-8 text-red-500 mx-auto mb-3" />
                        <p className="text-xs font-bold text-red-600 uppercase">Selection Required</p>
                        <p className="text-[10px] text-red-500 mt-1 leading-normal">You must select a specific department from the main page filters before editing permissions.</p>
                        <Button variant="outline" className="mt-4 rounded-full text-[10px] font-bold border-red-200 text-red-600 h-8" onClick={() => setSelectedRole(null)}>Go Back</Button>
                    </div>
                ) : (
                    <>
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                        <LayoutDashboard className="size-3 text-black" /> Navigation Access
                      </h4>
                      <div className="p-1 bg-zinc-100/50 rounded-[28px]">
                        <PermissionToggle 
                            label="Enable Dashboard" 
                            description={`Grant access to the ${activeDept} workspace`}
                            checked={isDashboardAllowed}
                            onCheckedChange={setIsDashboardAllowed}
                        />
                      </div>
                    </div>

                    {isDashboardAllowed && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                <Database className="size-3 text-black" /> Service Modules
                            </h4>
                            
                            <div className="grid gap-2">
                                <ServiceAccessItem icon={<CalendarCheck size={16} />} label="Site Visit" checked={servicePermissions.siteVisit} onCheckedChange={() => toggleService('siteVisit')} />
                                <ServiceAccessItem icon={<FileText size={16} />} label="Job Request" checked={servicePermissions.jobRequest} onCheckedChange={() => toggleService('jobRequest')} />
                                <ServiceAccessItem icon={<Monitor size={16} />} label="DIAlux Sim" checked={servicePermissions.dialux} onCheckedChange={() => toggleService('dialux')} />
                                <ServiceAccessItem icon={<ThumbsUp size={16} />} label="Product Reco" checked={servicePermissions.recommendation} onCheckedChange={() => toggleService('recommendation')} />
                                <ServiceAccessItem icon={<StreetLightIcon size={16} />} label="Shop Drawing" checked={servicePermissions.shopDrawing} onCheckedChange={() => toggleService('shopDrawing')} />
                                <ServiceAccessItem icon={<ClipboardCheck size={16} />} label="Testing Lab" checked={servicePermissions.testing} onCheckedChange={() => toggleService('testing')} />
                                <ServiceAccessItem icon={<MoreHorizontal size={16} />} label="Misc Services" checked={servicePermissions.others} onCheckedChange={() => toggleService('others')} />
                            </div>
                        </div>
                    )}
                    </>
                )}
              </div>

              <SheetFooter className="p-6 md:p-8 bg-white border-t border-zinc-100">
                <Button 
                  disabled={isSaving || activeDept === "ALL"}
                  className="w-full h-14 md:h-16 rounded-[20px] md:rounded-[22px] bg-black text-white font-black text-sm hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-zinc-200 disabled:opacity-50"
                  onClick={handleSavePermissionLogic}
                >
                  {isSaving ? (
                    <div className="flex items-center gap-2">
                        <Loader2 className="animate-spin size-4" />
                        <span>SYNCING CHANGES...</span>
                    </div>
                  ) : `UPDATE ${activeDept} ROLES`}
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>

        </SidebarInset>
      </SidebarProvider>
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </ProtectedPageWrapper>
  )
}

// --- SUB-COMPONENTS ---

function StatCard({ icon, label, value, color, loading, className }: any) {
  const colors: any = { 
    emerald: "bg-emerald-50 text-emerald-600", 
    zinc: "bg-zinc-50 text-zinc-400", 
    orange: "bg-orange-50 text-orange-600" 
  }
  return (
    <div className={cn("bg-white p-5 md:p-6 rounded-[28px] md:rounded-[32px] border border-zinc-200/60 shadow-sm flex items-center gap-4 md:gap-5", className)}>
      <div className={cn("p-3 md:p-4 rounded-2xl", colors[color])}>
        {React.cloneElement(icon, { className: "size-5 md:size-6" })}
      </div>
      <div>
        <p className="text-[9px] md:text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{label}</p>
        <p className="text-2xl md:text-3xl font-black text-zinc-900 leading-none mt-1">{loading ? "..." : value.toString().padStart(2, '0')}</p>
      </div>
    </div>
  )
}

function PermissionToggle({ label, description, checked, onCheckedChange }: any) {
  return (
    <div className="flex items-center justify-between p-5 bg-white rounded-[24px] border border-zinc-100 shadow-sm transition-all hover:border-zinc-200">
      <div className="max-w-[75%]">
        <Label className="text-sm font-black text-zinc-900 block mb-0.5">{label}</Label>
        <p className="text-[10px] text-zinc-500 font-bold leading-tight">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} className="data-[state=checked]:bg-black" />
    </div>
  )
}

function ServiceAccessItem({ icon, label, checked, onCheckedChange }: any) {
  return (
    <div className={cn(
        "flex items-center justify-between p-4 rounded-[22px] border transition-all",
        checked ? "bg-white border-zinc-200 shadow-sm" : "bg-zinc-50/50 border-transparent opacity-60"
    )}>
        <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-xl transition-colors", checked ? "bg-zinc-900 text-white" : "bg-zinc-200 text-zinc-500")}>
                {icon}
            </div>
            <Label className="text-[11px] font-black text-zinc-900 block">{label}</Label>
        </div>
        <Switch 
          checked={checked} 
          onCheckedChange={onCheckedChange}
          className="data-[state=checked]:bg-emerald-500 scale-90" 
        />
    </div>
  )
}