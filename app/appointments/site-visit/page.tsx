"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import ProtectedPageWrapper from "@/components/protected-page-wrapper"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { 
  Plus, Search, ChevronRight, Activity, RotateCcw,
  Ticket, Wrench, User2, Loader2, CheckCircle2, ShieldCheck
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// FIREBASE
import { db } from "@/lib/firebase"
import { collection, onSnapshot, query, orderBy, where } from "firebase/firestore"

// CUSTOM COMPONENTS
import { PageHeader } from "@/components/page-header"

/**
 * @name SiteVisitListPage
 * @protocol Shared Engineering/IT Pool / Filtered Sales View
 * @version 2.6.4-AdminSync
 */
export default function SiteVisitListPage() {
  const router = useRouter()
  const [user, setUser] = React.useState<{ id: string | null; dept: string }>({ id: null, dept: "" })
  const [isUserLoading, setIsUserLoading] = React.useState(true)
  const [visits, setVisits] = React.useState<any[]>([])
  const [isDataLoading, setIsDataLoading] = React.useState(true)
  const [selectedStatus, setSelectedStatus] = React.useState<string | null>(null)
  const [searchQuery, setSearchQuery] = React.useState("")

  // 1. IDENTITY & DEPARTMENT RETRIEVAL
  React.useEffect(() => {
    const storedId = localStorage.getItem("userId")
    if (!storedId) { setIsUserLoading(false); return; }

    const fetchUser = async () => {
      try {
        const res = await fetch(`/api/user?id=${encodeURIComponent(storedId)}`)
        const data = await res.json()
        setUser({ id: storedId, dept: data.Department?.toUpperCase() || "SALES" })
      } catch (error) { 
        console.error("Profile Retrieval Error:", error) 
      } finally { 
        setIsUserLoading(false) 
      }
    }
    fetchUser()
  }, [])

  // 2. LIVE DATA SYNC WITH MULTI-DEPARTMENT ADMIN LOGIC
  React.useEffect(() => {
    if (isUserLoading || !user.id) return;

    setIsDataLoading(true)
    const baseCollection = collection(db, "appointments")
    let q;

    const userDept = user.dept.toUpperCase();
    
    /**
     * VISIBILITY PROTOCOL:
     * - ENGINEERING & IT: Global visibility (all requests)
     * - OTHERS: Restricted to personal submissions (submittedBy)
     */
    const hasGlobalAccess = userDept === "ENGINEERING" || userDept === "IT";

    if (hasGlobalAccess) {
      q = query(baseCollection, orderBy("createdAt", "desc"));
    } else {
      q = query(
        baseCollection, 
        where("submittedBy", "==", user.id), 
        orderBy("createdAt", "desc")
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const liveData = snapshot.docs.map(doc => {
        const data = doc.data()
        const rawDate = data.appointmentDate?.toDate ? data.appointmentDate.toDate() : new Date()
        
        return {
          id: doc.id.slice(-6).toUpperCase(),
          fullId: doc.id,
          ...data,
          site: data.client || "Client Not Specified",
          date: rawDate.toLocaleDateString('en-CA'), 
          status: data.status?.toUpperCase() || "PENDING",
          tech: data.pic || "UNASSIGNED",
          type: Array.isArray(data.protocols) ? data.protocols.join(" + ") : (data.protocols || "Standard Engagement")
        }
      })
      
      setVisits(liveData)
      setIsDataLoading(false)
    }, (error) => {
      console.error("Firestore Sync Error:", error)
      setIsDataLoading(false)
    })

    return () => unsubscribe()
  }, [user, isUserLoading])

  const filteredVisits = visits.filter(v => {
    const matchesSearch = v.site.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         v.id.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = selectedStatus ? v.status === selectedStatus : true
    return matchesSearch && matchesStatus
  })

  const isSales = user.dept === "SALES"
  const handleAddNew = () => router.push('/appointments/site-visit/add')

  return (
    <ProtectedPageWrapper>
      <SidebarProvider defaultOpen={false}>
        <AppSidebar userId={user.id} />
        <SidebarInset className="bg-[#F9FAFA] pb-24 md:pb-0 relative font-sans">
          
          <PageHeader 
            title="ACTIVITY_OVERVIEW" 
            version="REV 2.6.4" 
            showBackButton={true}
            trigger={<SidebarTrigger className="mr-2" />}
            actions={
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-black/5 border border-black/10 rounded-sm shadow-sm">
                  <ShieldCheck className="size-3 text-black/50" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-black/70">
                    DEPT: {user.dept}
                  </span>
                </div>
                {!isUserLoading && isSales && (
                  <Button 
                    onClick={handleAddNew}
                    className="hidden md:flex rounded-md bg-[#121212] text-white font-bold uppercase text-[10px] tracking-widest px-6 h-10 hover:bg-black transition-all shadow-md"
                  >
                    <Plus className="mr-2 size-4" /> Create Engagement
                  </Button>
                )}
              </div>
            }
          />

          <main className="flex flex-1 flex-col gap-6 p-4 md:p-10 max-w-7xl mx-auto w-full">
            
            {/* STAT CARDS */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Total Records" val={visits.length} icon={Activity} isActive={selectedStatus === null} onClick={() => setSelectedStatus(null)} color="#121212" />
              <StatCard label="Pending" val={visits.filter(v => v.status === "PENDING").length} icon={Ticket} isActive={selectedStatus === "PENDING"} onClick={() => setSelectedStatus("PENDING")} color="#F59E0B" />
              <StatCard label="Confirmed" val={visits.filter(v => v.status === "CONFIRMED").length} icon={Wrench} isActive={selectedStatus === "CONFIRMED"} onClick={() => setSelectedStatus("CONFIRMED")} color="#3B82F6" />
              <StatCard label="Completed" val={visits.filter(v => v.status === "COMPLETED").length} icon={CheckCircle2} isActive={selectedStatus === "COMPLETED"} onClick={() => setSelectedStatus("COMPLETED")} color="#10B981" />
            </section>

            {/* SEARCH BOX */}
            <div className="flex flex-col md:flex-row gap-4 mt-2">
              <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-black/30 group-focus-within:text-black transition-colors" />
                <Input 
                  placeholder="Search Client or ID..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 rounded-md border-black/10 bg-white h-12 text-sm shadow-sm"
                />
              </div>
              <Button 
                variant="outline" 
                onClick={() => {setSelectedStatus(null); setSearchQuery("")}} 
                className="rounded-md border-black/10 h-12 px-6 uppercase font-bold text-[10px] tracking-widest bg-white hover:bg-[#121212] hover:text-white transition-all shadow-sm"
              >
                <RotateCcw className="mr-2 size-3" /> Reset Sync
              </Button>
            </div>

            {/* PROTOCOL CARD LIST */}
            <section className="bg-white border border-black/5 rounded-lg shadow-sm overflow-hidden">
              <div className="hidden md:grid grid-cols-5 bg-[#F9FAFA] border-b border-black/5 p-5">
                  {["Ref_ID", "Client Entity", "Schedule", "Personnel", "Status"].map((h) => (
                    <span key={h} className="text-[10px] font-bold uppercase tracking-[0.15em] text-black/40">{h}</span>
                  ))}
              </div>

              <div className="divide-y divide-black/5">
                {isDataLoading ? <LoadingState /> : filteredVisits.length === 0 ? <EmptyState /> : (
                  filteredVisits.map((item) => (
                    <div 
                      key={item.fullId}
                      onClick={() => router.push(`/appointments/site-visit/${item.fullId}`)}
                      className="group grid grid-cols-1 md:grid-cols-5 gap-4 p-5 hover:bg-[#F9FAFA] cursor-pointer transition-all items-center"
                    >
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-black font-mono">#{item.id}</span>
                        <span className="text-[9px] font-medium uppercase text-black/40 truncate mt-1">{item.type}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold uppercase tracking-tight text-black">{item.site}</span>
                      </div>
                      <div className="hidden md:flex flex-col font-medium text-[12px] text-black/60 italic">{item.date}</div>
                      <div className="flex items-center gap-2 text-[11px] font-bold uppercase text-black/70">
                        <User2 className="size-3 text-black/20" /> 
                        <span className="truncate">{item.tech}</span>
                      </div>
                      <div className="flex items-center md:justify-end gap-4">
                        <Badge variant="outline" className={cn("rounded-sm font-bold text-[9px] uppercase border px-2.5 py-0.5", getStatusStyles(item.status))}>
                          {item.status}
                        </Badge>
                        <ChevronRight className="size-4 text-black/10 group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </main>

          {/* FAB COMPONENT */}
          {!isUserLoading && isSales && (
            <div className="md:hidden fixed bottom-8 right-6 z-50">
              <Button 
                onClick={handleAddNew}
                className="size-16 rounded-full bg-[#121212] text-white shadow-2xl hover:bg-black active:scale-95 transition-all flex items-center justify-center border border-white/10"
              >
                <Plus className="size-6 stroke-[3px]" />
              </Button>
            </div>
          )}
        </SidebarInset>
      </SidebarProvider>
    </ProtectedPageWrapper>
  )
}

function getStatusStyles(status: string) {
  switch (status.toUpperCase()) {
    case "PENDING": return "text-amber-600 border-amber-200 bg-amber-50";
    case "CONFIRMED": return "text-blue-600 border-blue-200 bg-blue-50";
    case "COMPLETED": return "text-emerald-600 border-emerald-200 bg-emerald-50";
    default: return "text-black/40 border-black/10 bg-black/5";
  }
}

function StatCard({ label, val, icon: Icon, isActive, onClick, color }: any) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "cursor-pointer p-5 flex flex-col gap-3 transition-all border rounded-lg bg-white shadow-sm",
        isActive ? "border-black ring-1 ring-black/5 translate-y-[-2px]" : "border-black/5 opacity-80 hover:opacity-100"
      )}
    >
      <div className="flex justify-between items-start">
        <Icon className="size-5" style={{ color: isActive ? color : '#ccc' }} />
        <span className="text-2xl font-bold tracking-tighter text-[#121212]">{val.toString().padStart(2, '0')}</span>
      </div>
      <span className={cn("text-[10px] font-bold uppercase tracking-[0.1em]", isActive ? "text-black" : "text-black/40")}>{label}</span>
    </div>
  );
}

const LoadingState = () => (
  <div className="flex flex-col items-center justify-center p-20 gap-3">
    <Loader2 className="size-6 animate-spin text-black/10" />
    <p className="text-[10px] font-bold uppercase tracking-widest text-black/20">Syncing_Operational_Core...</p>
  </div>
)

const EmptyState = () => (
  <div className="p-20 text-center">
    <p className="text-[10px] font-bold uppercase tracking-widest text-black/20">System_Null // No Department Records</p>
  </div>
)