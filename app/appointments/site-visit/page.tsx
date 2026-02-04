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
    Ticket, Wrench, User2, Loader2, CheckCircle2
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

  interface VisitRecord {
    id: string
    fullId: string
    site: string
    date: string
    status: string
    tech: string
    type: string
  }

  export default function SiteVisitListPage() {
    const router = useRouter()
    const [user, setUser] = React.useState<{ id: string | null; dept: string }>({ id: null, dept: "" })
    const [isUserLoading, setIsUserLoading] = React.useState(true)
    const [visits, setVisits] = React.useState<VisitRecord[]>([])
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
      const q = query(collection(db, "appointments"), orderBy("createdAt", "desc"))
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const liveData = snapshot.docs.map(doc => {
          const data = doc.data()
          const rawDate = data.appointmentDate?.toDate ? data.appointmentDate.toDate() : new Date()
          return {
            id: doc.id.slice(-6).toUpperCase(),
            fullId: doc.id,
            site: data.client || "Client Not Specified",
            date: rawDate.toLocaleDateString('en-CA'), 
            status: data.status?.toUpperCase() || "PENDING",
            tech: data.pic || "UNASSIGNED",
            type: Array.isArray(data.protocols) ? data.protocols.join(" + ") : (data.protocols || "Standard Engagement")
          }
        })
        setVisits(liveData)
        setIsDataLoading(false)
      })
      return () => unsubscribe()
    }, [])

    const filteredVisits = visits.filter(v => {
      const matchesSearch = v.site.toLowerCase().includes(searchQuery.toLowerCase()) || v.id.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = selectedStatus ? v.status === selectedStatus : true
      return matchesSearch && matchesStatus
    })

    const isSales = user.dept.trim().toLowerCase() === "sales"
    const handleAddNew = () => router.push('/appointments/site-visit/add')

    return (
      <ProtectedPageWrapper>
        <SidebarProvider defaultOpen={false}>
          <AppSidebar userId={user.id} />
          <SidebarInset className="bg-background pb-24 md:pb-0 relative">
            
            <PageHeader 
              title="Activity Overview" 
              version="v2.5.0-SITE-OPS" 
              showBackButton={true}
              trigger={
                <SidebarTrigger className="group relative flex items-center justify-center size-9 bg-muted/5 hover:bg-primary/10 border-2 border-muted/50 hover:border-primary/50 transition-all duration-300 rounded-none overflow-hidden">
                  <div className="absolute top-0 left-0 size-1 border-t border-l border-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex flex-col gap-1 items-end">
                    <div className="h-[2px] w-5 bg-primary group-hover:w-3 transition-all" />
                    <div className="h-[2px] w-4 bg-primary group-hover:w-5 transition-all" />
                  </div>
                </SidebarTrigger>
              }
              actions={
                !isUserLoading && isSales && (
                  <Button 
                    onClick={handleAddNew}
                    className="hidden md:flex rounded-none bg-primary text-primary-foreground font-black uppercase text-[10px] tracking-widest px-4 h-9 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all border border-black/10"
                  >
                    <Plus className="mr-2 size-3" /> New Engagement
                  </Button>
                )
              }
            />

            <main className="flex flex-1 flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
              
              {/* MINIMAL INTERACTIVE STAT CARDS */}
              <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatCard 
                    label="All Records" 
                    val={visits.length} 
                    icon={Activity} 
                    isActive={selectedStatus === null} 
                    onClick={() => setSelectedStatus(null)} 
                    type="default" 
                  />
                  <StatCard 
                    label="Pending" 
                    val={visits.filter(v => v.status === "PENDING").length} 
                    icon={Ticket} 
                    isActive={selectedStatus === "PENDING"} 
                    onClick={() => setSelectedStatus("PENDING")} 
                    type="pending" 
                  />
                  <StatCard 
                    label="Confirmed" 
                    val={visits.filter(v => v.status === "CONFIRMED").length} 
                    icon={Wrench} 
                    isActive={selectedStatus === "CONFIRMED"} 
                    onClick={() => setSelectedStatus("CONFIRMED")} 
                    type="confirmed" 
                  />
                  <StatCard 
                    label="Completed" 
                    val={visits.filter(v => v.status === "COMPLETED").length} 
                    icon={CheckCircle2} 
                    isActive={selectedStatus === "COMPLETED"} 
                    onClick={() => setSelectedStatus("COMPLETED")} 
                    type="completed" 
                  />
              </section>

              {/* FILTERS */}
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input 
                    placeholder="SEARCH_BY_CLIENT_OR_ENTITY..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 rounded-none border-2 border-muted/50 bg-background font-mono uppercase text-[10px] h-12 focus-visible:ring-0 focus-visible:border-primary"
                  />
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => {setSelectedStatus(null); setSearchQuery("")}} 
                  className="rounded-none border-2 border-muted/50 h-12 px-6 uppercase font-black text-[10px] tracking-widest bg-background"
                >
                  <RotateCcw className="mr-2 size-3" /> Reset_Filters
                </Button>
              </div>

              {/* LIST SECTION */}
              <section className="relative flex flex-col border-2 border-muted/50 overflow-hidden bg-background min-h-[400px]">
                <div className="hidden md:grid grid-cols-5 bg-muted/10 border-b-2 border-muted/50 p-4">
                    {["Reference", "Client Name", "Appointment Date", "Personnel", "Current Status"].map((h) => (
                      <span key={h} className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{h}</span>
                    ))}
                </div>

                <div className="flex flex-col divide-y-2 divide-muted/20">
                  {isDataLoading ? <LoadingState /> : filteredVisits.length === 0 ? <EmptyState /> : (
                    filteredVisits.map((item) => (
                      <div 
                        key={item.fullId}
                        onClick={() => router.push(`/appointments/site-visit/${item.fullId}`)}
                        className="group relative grid grid-cols-1 md:grid-cols-5 gap-4 p-5 hover:bg-primary/[0.03] cursor-pointer transition-colors border-l-4 border-l-transparent hover:border-l-primary"
                      >
                        <div className="flex flex-col justify-center">
                            <span className="text-[10px] font-mono text-primary font-bold">[{item.id}]</span>
                            <span className="text-[8px] font-black uppercase text-muted-foreground truncate leading-tight mt-1">{item.type}</span>
                        </div>
                        <div className="flex flex-col justify-center">
                            <span className="text-sm md:text-base font-black uppercase italic tracking-tighter group-hover:text-primary transition-colors">{item.site}</span>
                            <span className="md:hidden text-[9px] font-mono opacity-50 mt-1">{item.date}</span>
                        </div>
                        <div className="hidden md:flex flex-col justify-center font-mono text-[11px] opacity-60 italic">{item.date}</div>
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase opacity-80">
                            <User2 className="size-3 text-primary" /> 
                            <span className="truncate">{item.tech}</span>
                        </div>
                        <div className="flex items-center md:justify-end">
                            <Badge variant="outline" className={cn("rounded-none font-black text-[9px] uppercase border-2 py-0.5 px-2", getStatusStyles(item.status))}>
                                {item.status}
                            </Badge>
                            <ChevronRight className="md:hidden ml-auto size-5 text-primary" />
                            <ChevronRight className="hidden md:block ml-4 size-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </main>

            {/* SIMPLE CORPORATE TACTICAL FAB */}
            {!isUserLoading && isSales && (
              <div className="md:hidden fixed bottom-8 right-8 z-[100]">
                <Button 
                  onClick={handleAddNew}
                  className={cn(
                    "group relative size-16 rounded-full transition-all duration-300",
                    "bg-slate-950 text-white border border-white/10",
                    "shadow-[0_10px_20px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.05)]",
                    "hover:bg-primary active:scale-95 flex flex-col items-center justify-center"
                  )}
                >
                  <div className="absolute top-3 left-3 size-1.5 border-t border-l border-white/30 group-hover:border-white/60 transition-colors" />
                  <div className="absolute bottom-3 right-3 size-1.5 border-b border-r border-white/30 group-hover:border-white/60 transition-colors" />
                  
                  <div className="relative z-10 flex flex-col items-center">
                    <Plus className="size-6 stroke-[3.5px]" />
                    <span className="text-[7px] font-black tracking-[0.2em] uppercase opacity-70 group-hover:opacity-100">
                      ADD_NEW
                    </span>
                  </div>
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
      case "PENDING": return "text-amber-500 border-amber-500/20 bg-amber-500/5";
      case "CONFIRMED": return "text-blue-500 border-blue-500/20 bg-blue-500/5";
      case "COMPLETED": return "text-emerald-500 border-emerald-500/20 bg-emerald-500/5";
      default: return "text-muted-foreground border-muted bg-muted/5";
    }
  }

  function StatCard({ label, val, icon: Icon, isActive, onClick, type }: any) {
    // Styles applied only when CLICKED (Active)
    const activeTheme: any = {
      pending: "border-amber-500 bg-amber-500 text-white shadow-[0_8px_15px_rgba(245,158,11,0.2)]",
      confirmed: "border-blue-500 bg-blue-500 text-white shadow-[0_8px_15px_rgba(59,130,246,0.2)]",
      completed: "border-emerald-500 bg-emerald-500 text-white shadow-[0_8px_15px_rgba(16,185,129,0.2)]",
      default: "border-primary bg-primary text-white shadow-[0_8px_15px_rgba(0,0,0,0.1)]"
    };

    const currentTheme = activeTheme[type] || activeTheme.default;

    return (
      <div 
        onClick={onClick}
        className={cn(
          "relative cursor-pointer p-4 flex items-center gap-4 transition-all duration-300 border-2 rounded-none",
          // Default Minimalist Monochromatic State
          "bg-background border-muted/20 opacity-60 grayscale hover:opacity-100 hover:grayscale-0 hover:border-muted-foreground/30",
          // Active Color State
          isActive && `opacity-100 grayscale-0 translate-y-[-4px] ${currentTheme}`
        )}
      >
        <div className={cn(
          "p-2 border transition-all duration-300",
          isActive ? "bg-white/20 border-white/40" : "bg-muted/5 border-muted/20"
        )}>
          <Icon className={cn("size-5", !isActive && "text-muted-foreground")} />
        </div>
        <div className="flex flex-col">
          <span className={cn(
            "text-[8px] font-black uppercase tracking-widest leading-none mb-1 transition-colors",
            isActive ? "text-white/80" : "text-muted-foreground"
          )}>
            {label}
          </span>
          <span className="text-xl font-black italic tracking-tighter leading-none">
            {val.toString().padStart(2, '0')}
          </span>
        </div>
        
        {/* Decorative corner accent for active state */}
        {isActive && (
            <div className="absolute top-0 right-0 size-2 border-t-2 border-r-2 border-white/40" />
        )}
      </div>
    );
  }

  const LoadingState = () => (
    <div className="flex flex-col items-center justify-center p-20 gap-3 opacity-20">
      <Loader2 className="size-8 animate-spin text-primary" />
      <p className="text-[10px] font-black uppercase tracking-widest italic">Syncing_Data_Stream...</p>
    </div>
  )

  const EmptyState = () => (
    <div className="p-20 text-center opacity-30">
      <p className="text-[10px] font-black uppercase tracking-widest">Null_ResultSet</p>
    </div>
  )