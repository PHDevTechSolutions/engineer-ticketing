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
  Plus, Search, ChevronRight, Layout, RotateCcw,
  Clock, Hammer, User2, Loader2, CheckCircle2, ShieldCheck, FileText
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// FIREBASE
import { db } from "@/lib/firebase"
import { collection, onSnapshot, query, orderBy } from "firebase/firestore"

// CUSTOM COMPONENTS
import { PageHeader } from "@/components/page-header"

export default function ShopDrawingListPage() {
  const router = useRouter()
  const [user, setUser] = React.useState<{ id: string | null; dept: string }>({ id: null, dept: "" })
  const [isUserLoading, setIsUserLoading] = React.useState(true)
  const [drawings, setDrawings] = React.useState<any[]>([])
  const [isDataLoading, setIsDataLoading] = React.useState(true)
  const [selectedStatus, setSelectedStatus] = React.useState<string | null>(null)
  const [searchQuery, setSearchQuery] = React.useState("")

  React.useEffect(() => {
    const storedId = localStorage.getItem("userId")
    if (!storedId) { setIsUserLoading(false); return; }

    const fetchUser = async () => {
      try {
        const res = await fetch(`/api/user?id=${encodeURIComponent(storedId)}`)
        const data = await res.json()
        setUser({ id: storedId, dept: data.Department || "" })
      } catch (error) { console.error("Profile Retrieval Error:", error) } finally { setIsUserLoading(false) }
    }
    fetchUser()
  }, [])

  React.useEffect(() => {
    // Note: Collection changed to 'shop_drawings' for engineering project isolation
    const q = query(collection(db, "shop_drawings"), orderBy("createdAt", "desc"))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const liveData = snapshot.docs.map(doc => {
        const data = doc.data()
        const rawDate = data.createdAt?.toDate ? data.createdAt.toDate() : new Date()
        return {
          id: doc.id.slice(-6).toUpperCase(),
          fullId: doc.id,
          project: data.projectName || "Unnamed Project",
          date: rawDate.toLocaleDateString('en-CA'), 
          status: data.status?.toUpperCase() || "PENDING",
          engineer: data.assignedEngineer || "UNASSIGNED",
          type: data.drawingType || "General Layout"
        }
      })
      setDrawings(liveData)
      setIsDataLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const filteredDrawings = drawings.filter(d => {
    const matchesSearch = d.project.toLowerCase().includes(searchQuery.toLowerCase()) || d.id.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = selectedStatus ? d.status === selectedStatus : true
    return matchesSearch && matchesStatus
  })

  // Departmental permission check for ENGINEERING project
  const isAuthorized = user.dept.trim().toLowerCase() === "engineering" || user.dept.trim().toLowerCase() === "sales"
  const handleAddNew = () => router.push('/request/shop-drawing/add')

  return (
    <ProtectedPageWrapper>
      <SidebarProvider defaultOpen={false}>
        <AppSidebar userId={user.id} />
        <SidebarInset className="bg-[#F9FAFA] pb-24 md:pb-0 relative font-sans">
          
          <PageHeader 
            title="DRAWING_INVENTORY" 
            version="BUILD: ENG-V2.6" 
            showBackButton={true}
            trigger={<SidebarTrigger className="mr-2" />}
            actions={
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-black/5 border border-black/10 rounded-sm shadow-sm">
                  <ShieldCheck className="size-3 text-black/50" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-black/70">
                    ENGINEERING
                  </span>
                </div>
                {!isUserLoading && isAuthorized && (
                  <Button 
                    onClick={handleAddNew}
                    className="hidden md:flex rounded-md bg-[#121212] text-white font-bold uppercase text-[10px] tracking-widest px-6 h-10 hover:bg-black transition-all shadow-md"
                  >
                    <Plus className="mr-2 size-4" /> New Drawing Request
                  </Button>
                )}
              </div>
            }
          />

          <main className="flex flex-1 flex-col gap-6 p-4 md:p-10 max-w-7xl mx-auto w-full">
            
            {/* ENGINEERING STAT CARDS */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard 
                  label="Active Pipeline" 
                  val={drawings.length} 
                  icon={Layout} 
                  isActive={selectedStatus === null} 
                  onClick={() => setSelectedStatus(null)} 
                  color="#121212"
                />
                <StatCard 
                  label="In Review" 
                  val={drawings.filter(d => d.status === "PENDING").length} 
                  icon={Clock} 
                  isActive={selectedStatus === "PENDING"} 
                  onClick={() => setSelectedStatus("PENDING")} 
                  color="#F59E0B"
                />
                <StatCard 
                  label="Drafting" 
                  val={drawings.filter(d => d.status === "DRAFTING").length} 
                  icon={Hammer} 
                  isActive={selectedStatus === "DRAFTING"} 
                  onClick={() => setSelectedStatus("DRAFTING")} 
                  color="#3B82F6"
                />
                <StatCard 
                  label="Released" 
                  val={drawings.filter(d => d.status === "RELEASED").length} 
                  icon={CheckCircle2} 
                  isActive={selectedStatus === "RELEASED"} 
                  onClick={() => setSelectedStatus("RELEASED")} 
                  color="#10B981"
                />
            </section>

            {/* SEARCH & SYSTEM RESET */}
            <div className="flex flex-col md:flex-row gap-4 mt-2">
              <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-black/30 group-focus-within:text-black transition-colors" />
                <Input 
                  placeholder="Query Project Name or Drawing ID..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 rounded-md border-black/10 bg-white h-12 text-sm focus-visible:ring-1 focus-visible:ring-black focus-visible:border-black shadow-sm"
                />
              </div>
              <Button 
                variant="outline" 
                onClick={() => {setSelectedStatus(null); setSearchQuery("")}} 
                className="rounded-md border-black/10 h-12 px-6 uppercase font-bold text-[10px] tracking-widest bg-white hover:bg-black hover:text-white transition-all shadow-sm"
              >
                <RotateCcw className="mr-2 size-3" /> Reset Engine
              </Button>
            </div>

            {/* PROTOCOL DATA TABLE */}
            <section className="bg-white border border-black/5 rounded-lg shadow-sm overflow-hidden">
              <div className="hidden md:grid grid-cols-5 bg-[#F9FAFA] border-b border-black/5 p-5">
                  {["DWG_REF", "Project Specification", "Submission", "Responsible", "Status"].map((h) => (
                    <span key={h} className="text-[10px] font-bold uppercase tracking-[0.15em] text-black/40">{h}</span>
                  ))}
              </div>

              <div className="divide-y divide-black/5">
                {isDataLoading ? <LoadingState /> : filteredDrawings.length === 0 ? <EmptyState /> : (
                  filteredDrawings.map((item) => (
                    <div 
                      key={item.fullId}
                      onClick={() => router.push(`/requests/shop-drawing/${item.fullId}`)}
                      className="group grid grid-cols-1 md:grid-cols-5 gap-4 p-5 hover:bg-[#F9FAFA] cursor-pointer transition-all active:scale-[0.995]"
                    >
                      <div className="flex flex-col justify-center">
                          <span className="text-[11px] font-bold text-black font-mono">#{item.id}</span>
                          <span className="text-[9px] font-medium uppercase text-black/40 truncate mt-1 flex items-center">
                            <FileText className="size-2 mr-1" /> {item.type}
                          </span>
                      </div>
                      <div className="flex flex-col justify-center">
                          <span className="text-sm font-bold uppercase tracking-tight text-black group-hover:underline underline-offset-4 decoration-1">{item.project}</span>
                          <span className="md:hidden text-[10px] text-black/50 font-medium mt-1">{item.date}</span>
                      </div>
                      <div className="hidden md:flex flex-col justify-center font-medium text-[12px] text-black/60 italic">{item.date}</div>
                      <div className="flex items-center gap-2 text-[11px] font-bold uppercase text-black/70">
                          <div className="size-5 rounded-full bg-black/5 flex items-center justify-center">
                            <User2 className="size-3" /> 
                          </div>
                          <span className="truncate">{item.engineer}</span>
                      </div>
                      <div className="flex items-center md:justify-end gap-4">
                          <Badge variant="outline" className={cn("rounded-sm font-bold text-[9px] uppercase border px-2.5 py-0.5 shadow-none", getStatusStyles(item.status))}>
                              {item.status}
                          </Badge>
                          <ChevronRight className="size-4 text-black/20 group-hover:text-black group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </main>

          {/* FLOATING ACTION BUTTON (FAB) */}
          {!isUserLoading && isAuthorized && (
            <div className="md:hidden fixed bottom-8 right-6 z-50">
              <Button 
                onClick={handleAddNew}
                className="size-16 rounded-full bg-[#121212] text-white shadow-2xl hover:bg-black active:scale-90 transition-all flex flex-col items-center justify-center border border-white/10"
              >
                <div className="size-6 bg-white/10 rounded-full flex items-center justify-center mb-1">
                  <span className="text-[10px] font-black">E</span>
                </div>
                <Plus className="size-5 stroke-[3px]" />
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
    case "DRAFTING": return "text-blue-600 border-blue-200 bg-blue-50";
    case "RELEASED": return "text-emerald-600 border-emerald-200 bg-emerald-50";
    default: return "text-black/40 border-black/10 bg-black/5";
  }
}

function StatCard({ label, val, icon: Icon, isActive, onClick, color }: any) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "relative cursor-pointer p-5 flex flex-col gap-3 transition-all duration-300 border rounded-lg bg-white shadow-sm",
        isActive ? "border-black ring-1 ring-black/5 translate-y-[-2px] shadow-md" : "border-black/5 opacity-80 hover:opacity-100 hover:border-black/20"
      )}
    >
      <div className="flex justify-between items-start">
        <div 
          className="p-2 rounded-md" 
          style={{ backgroundColor: isActive ? `${color}15` : '#F9FAFA' }}
        >
          <Icon className="size-5" style={{ color: isActive ? color : '#707070' }} />
        </div>
        <span className="text-2xl font-bold tracking-tighter text-[#121212]">
          {val.toString().padStart(2, '0')}
        </span>
      </div>
      <span className={cn(
        "text-[10px] font-bold uppercase tracking-[0.1em]",
        isActive ? "text-black" : "text-black/40"
      )}>
        {label}
      </span>
      {isActive && (
        <div className="absolute top-2 right-2 size-1.5 rounded-full" style={{ backgroundColor: color }} />
      )}
    </div>
  );
}

const LoadingState = () => (
  <div className="flex flex-col items-center justify-center p-20 gap-3">
    <Loader2 className="size-6 animate-spin text-black/20" />
    <p className="text-[10px] font-bold uppercase tracking-widest text-black/30">Loading Drawing Protocol...</p>
  </div>
)

const EmptyState = () => (
  <div className="p-20 text-center">
    <p className="text-[10px] font-bold uppercase tracking-widest text-black/20">Drawing_Inventory // System_Null</p>
  </div>
)