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
  LayoutGrid, Ticket, Wrench, User2, Loader2, CheckCircle2
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

// FIREBASE IMPORTS
import { db } from "@/lib/firebase"
import { collection, onSnapshot, query, orderBy } from "firebase/firestore"

// CUSTOM COMPONENTS
import { PageHeader } from "@/components/page-header"

export default function SiteVisitListPage() {
  const router = useRouter()
  const [userId, setUserId] = React.useState<string | null>(null)
  const [userDept, setUserDept] = React.useState<string>("")
  const [isLoading, setIsLoading] = React.useState(true)
  const [isDataLoading, setIsDataLoading] = React.useState(true)
  
  const [visits, setVisits] = React.useState<any[]>([])
  const [selectedStatus, setSelectedStatus] = React.useState<string | null>(null)
  const [searchQuery, setSearchQuery] = React.useState("")

  React.useEffect(() => {
    const storedId = localStorage.getItem("userId")
    setUserId(storedId)

    const fetchUserDept = async () => {
      if (!storedId) { setIsLoading(false); return; }
      try {
        const res = await fetch(`/api/user?id=${encodeURIComponent(storedId)}`)
        const data = await res.json()
        setUserDept(data.Department || "")
      } catch (error) { console.error(error) } finally { setIsLoading(false) }
    }
    fetchUserDept()
  }, [])

  React.useEffect(() => {
    const q = query(collection(db, "appointments"), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const liveData = snapshot.docs.map(doc => {
        const data = doc.data();
        let formattedDate = "N/A";
        if (data.appointmentDate?.toDate) {
          formattedDate = data.appointmentDate.toDate().toLocaleDateString('en-CA'); 
        }

        const protocolType = Array.isArray(data.protocols) && data.protocols.length > 0 
          ? data.protocols.join(" + ") 
          : (data.protocols || "General Visit");

        return {
          id: doc.id.slice(-6).toUpperCase(),
          fullId: doc.id,
          site: data.client || "Unknown Site",
          date: formattedDate,
          status: data.status || "PENDING",
          tech: data.pic || "UNASSIGNED",
          type: protocolType 
        };
      });
      
      setVisits(liveData);
      setIsDataLoading(false);
    }, (error) => {
      console.error("Firestore Error:", error);
      setIsDataLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const isSales = userDept.trim().toLowerCase() === "sales"

  // UPDATED STATUS STYLES TO MATCH NEW WORKFLOW
  const getStatusStyles = (status: string) => {
    switch (status.toUpperCase()) {
      case "PENDING": return "text-amber-500 border-amber-500/20 bg-amber-500/5";
      case "CONFIRMED": return "text-primary border-primary/20 bg-primary/5";
      case "COMPLETED": return "text-emerald-500 border-emerald-500/20 bg-emerald-500/5";
      default: return "text-muted-foreground border-muted bg-muted/5";
    }
  }

  const filteredVisits = visits.filter(visit => {
    const matchesSearch = 
      visit.site.toLowerCase().includes(searchQuery.toLowerCase()) || 
      visit.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      visit.type.toLowerCase().includes(searchQuery.toLowerCase()); 
    
    const matchesStatus = selectedStatus ? visit.status.toUpperCase() === selectedStatus.toUpperCase() : true
    return matchesSearch && matchesStatus
  })

  return (
    <ProtectedPageWrapper>
      <SidebarProvider defaultOpen={false}>
        <AppSidebar userId={userId} />
        <SidebarInset className="bg-background pb-20 md:pb-0">
          
          <PageHeader title="Registry" version="Site_Visits" showBackButton={true}>
            <div className="flex items-center gap-3">
               {!isLoading && isSales && (
                 <Button 
                  onClick={() => router.push('/appointments/site-visit/add')}
                  className="hidden md:flex rounded-none bg-primary text-primary-foreground font-black uppercase text-[10px] tracking-widest px-4 h-9 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all border border-black/10"
                 >
                  <Plus className="mr-2 size-3" /> Initiate Protocol
                 </Button>
               )}
               <SidebarTrigger className="hover:bg-transparent">
                  <div className="border-2 border-muted/50 p-1.5 hover:border-primary transition-colors bg-background">
                    <LayoutGrid className="size-4 text-primary" />
                  </div>
               </SidebarTrigger>
            </div>
          </PageHeader>

          <main className="flex flex-1 flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
            
            {/* UPDATED STAT CARDS FOR NEW STATUSES */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="Total Logs" val={visits.length} icon={Activity} isActive={selectedStatus === null} onClick={() => setSelectedStatus(null)} />
                <StatCard label="Pending" val={visits.filter(v => v.status.toUpperCase() === "PENDING").length} icon={Ticket} isActive={selectedStatus === "PENDING"} onClick={() => setSelectedStatus("PENDING")} />
                <StatCard label="Confirmed" val={visits.filter(v => v.status.toUpperCase() === "CONFIRMED").length} icon={Wrench} isActive={selectedStatus === "CONFIRMED"} onClick={() => setSelectedStatus("CONFIRMED")} />
                <StatCard label="Completed" val={visits.filter(v => v.status.toUpperCase() === "COMPLETED").length} icon={CheckCircle2} isActive={selectedStatus === "COMPLETED"} onClick={() => setSelectedStatus("COMPLETED")} />
            </section>

            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1 group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input 
                  placeholder="QUERY_PROTOCOL_OR_TYPE..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 rounded-none border-2 border-muted/50 bg-background font-mono uppercase text-xs h-12 focus-visible:ring-0 focus-visible:border-primary"
                />
              </div>
              <Button variant="outline" onClick={() => {setSelectedStatus(null); setSearchQuery("")}} className="rounded-none border-2 border-muted/50 h-12 px-6 uppercase font-black text-[10px] tracking-widest bg-background">
                <RotateCcw className="mr-2 size-3" /> Reset_Refine
              </Button>
            </div>

            <section className="flex flex-col border-2 border-muted/50 overflow-hidden bg-background min-h-[400px]">
              <div className="hidden md:grid grid-cols-5 bg-muted/10 border-b-2 border-muted/50 p-4">
                  {["Protocol", "Site_Designation", "Timestamp", "Personnel", "Status"].map((h) => (
                    <span key={h} className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{h}</span>
                  ))}
              </div>

              <div className="flex flex-col divide-y-2 divide-muted/20">
                {isDataLoading ? (
                  <div className="flex flex-col items-center justify-center p-20 gap-3 opacity-20">
                    <Loader2 className="size-8 animate-spin" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Accessing_Database...</p>
                  </div>
                ) : filteredVisits.length === 0 ? (
                  <div className="p-20 text-center opacity-30">
                    <p className="text-[10px] font-black uppercase tracking-widest">No Records Found</p>
                  </div>
                ) : (
                  filteredVisits.map((item) => (
                    <div 
                      key={item.fullId}
                      onClick={() => router.push(`/appointments/site-visit/${item.fullId}`)}
                      className="group relative grid grid-cols-1 md:grid-cols-5 gap-4 p-5 hover:bg-primary/[0.02] cursor-pointer transition-colors"
                    >
                      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.01)_50%)] bg-[length:100%_4px] opacity-0 group-hover:opacity-100 transition-opacity" />
                      
                      <div className="flex flex-col justify-center">
                          <span className="text-[10px] font-mono text-primary font-bold">[{item.id}]</span>
                          <span className="text-[9px] font-black uppercase text-muted-foreground truncate leading-tight mt-1">
                            {item.type}
                          </span>
                      </div>
                      
                      <div className="flex flex-col justify-center">
                          <span className="text-sm md:text-base font-black uppercase italic tracking-tighter group-hover:text-primary transition-colors">
                            {item.site}
                          </span>
                      </div>

                      <div className="flex flex-col justify-center font-mono text-[11px] opacity-60">{item.date}</div>

                      <div className="flex items-center gap-2 text-xs font-bold uppercase opacity-80">
                          <User2 className="size-3 text-primary" /> {item.tech}
                      </div>

                      <div className="flex items-center md:justify-end">
                          <Badge variant="outline" className={`rounded-none font-black text-[9px] uppercase border-2 ${getStatusStyles(item.status)}`}>
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
        </SidebarInset>
      </SidebarProvider>
    </ProtectedPageWrapper>
  )
}

function StatCard({ label, val, icon: Icon, isActive, onClick }: any) {
  return (
    <div 
      onClick={onClick}
      className={`relative cursor-pointer p-4 flex items-center gap-4 transition-all bg-background border-2 ${
        isActive ? "border-foreground shadow-[0_4px_10px_rgba(0,0,0,0.05)] translate-y-[-2px]" : "border-muted/20 opacity-70 hover:opacity-100"
      }`}
    >
      {isActive && <div className="absolute -top-[2px] -left-[2px] w-3 h-3 border-t-[3px] border-l-[3px] border-primary z-20" />}
      <div className={`p-2 border-2 transition-colors ${isActive ? 'bg-foreground border-foreground' : 'bg-transparent border-muted/20'}`}>
        <Icon className={`size-5 ${isActive ? 'text-background' : 'text-foreground'}`} />
      </div>
      <div className="flex flex-col">
        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground leading-none mb-1">{label}</span>
        <span className="text-xl font-black italic tracking-tighter leading-none">{val.toString().padStart(2, '0')}</span>
      </div>
    </div>
  )
}