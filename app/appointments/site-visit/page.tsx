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
  Plus, 
  Search, 
  MapPin, 
  Calendar, 
  ChevronRight, 
  Filter,
  ArrowLeft,
  LayoutGrid,
  List as ListIcon
} from "lucide-react"

// shadcn components
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"

// Mock Data for UI Testing
const visits = [
  { id: "DSI-7721", site: "North Sector Hub", date: "2024-05-20", status: "Pending", tech: "A. Rivera" },
  { id: "DSI-8802", site: "East Power Plant", date: "2024-05-22", status: "Approved", tech: "M. Chen" },
  { id: "DSI-9910", site: "South Data Center", date: "2024-05-25", status: "In-Progress", tech: "J. Doe" },
]

export default function SiteVisitListPage() {
  const router = useRouter()
  const [userId, setUserId] = React.useState<string | null>(null)

  React.useEffect(() => {
    setUserId(localStorage.getItem("userId"))
  }, [])

  return (
    <ProtectedPageWrapper>
      <SidebarProvider defaultOpen={false}>
        <AppSidebar userId={userId} />
        <SidebarInset className="bg-background">
          
          {/* TERMINAL HEADER */}
          <header className="flex h-16 shrink-0 items-center justify-between px-4 border-b-2 border-muted/30 bg-background/80 backdrop-blur-md sticky top-0 z-10">
            <div className="flex items-center gap-2">
               <button onClick={() => router.push('/dashboard')} className="p-2 hover:bg-muted/50 rounded-sm group transition-colors">
                  <ArrowLeft className="size-4 group-hover:-translate-x-1 transition-transform" />
               </button>
               <div className="flex flex-col">
                  <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary italic leading-none">
                    Registry: Site Operations
                  </h2>
                  <span className="text-[8px] font-mono opacity-40 uppercase">System_Logs_Active</span>
               </div>
            </div>

            <div className="flex items-center gap-2">
              <Button 
                variant="default" 
                size="sm" 
                className="h-8 rounded-none uppercase text-[10px] font-black tracking-widest bg-primary hover:bg-primary/90"
                onClick={() => router.push('/appointments/site-visit/add')}
              >
                <Plus className="mr-1.5 size-3" />
                Initiate Visit
              </Button>
              <div className="w-[1px] h-4 bg-muted/50 mx-1" />
              <SidebarTrigger className="text-primary" />
            </div>
          </header>

          <main className="p-4 md:p-8 max-w-7xl mx-auto w-full">
            
            {/* SEARCH & FILTERS SECTION */}
            <section className="flex flex-col sm:flex-row gap-3 mb-8">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 opacity-40" />
                    <input 
                        className="w-full bg-muted/10 border-2 border-muted/50 p-2.5 pl-10 focus:border-primary outline-none font-mono text-xs uppercase transition-all" 
                        placeholder="Search logs by ID or Location..." 
                    />
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="border-2 rounded-none border-muted/50 h-11 flex-1 sm:flex-none">
                        <Filter className="mr-2 size-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Filter</span>
                    </Button>
                </div>
            </section>

            {/* DESKTOP VIEW: SHADCN TABLE */}
            <div className="hidden md:block border-2 border-muted/30 bg-muted/5 overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/10">
                  <TableRow className="hover:bg-transparent border-b-2 border-muted/30">
                    <TableHead className="w-[120px] text-[10px] font-black uppercase tracking-widest">Protocol ID</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Site Reference</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Deployment</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Assigned Tech</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visits.map((item) => (
                    <TableRow 
                      key={item.id} 
                      className="cursor-pointer hover:bg-primary/5 transition-colors border-muted/20 group"
                      onClick={() => router.push(`/appointments/site-visit/${item.id}`)}
                    >
                      <TableCell className="font-mono text-xs font-bold text-primary">{item.id}</TableCell>
                      <TableCell className="text-xs font-bold uppercase tracking-tight">{item.site}</TableCell>
                      <TableCell className="text-xs font-mono opacity-70">{item.date}</TableCell>
                      <TableCell className="text-xs font-medium uppercase italic">{item.tech}</TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-2">
                            <span className="text-[9px] font-black uppercase px-2 py-1 bg-primary/10 text-primary border border-primary/20">
                                {item.status}
                            </span>
                            <ChevronRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* MOBILE VIEW: TACTICAL CARDS */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {visits.map((item) => (
                <div 
                  key={item.id} 
                  className="bg-muted/5 border-2 border-muted/30 p-5 active:bg-primary/5 transition-all"
                  onClick={() => router.push(`/appointments/site-visit/${item.id}`)}
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] font-mono text-primary font-bold tracking-tighter">{item.id}</span>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-primary/10 text-primary border border-primary/20">
                        {item.status}
                    </span>
                  </div>
                  <h3 className="text-md font-black uppercase tracking-tighter mb-3">{item.site}</h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-[10px] font-mono opacity-60">
                        <Calendar className="size-3" />
                        <span>{item.date}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-mono opacity-60">
                        <MapPin className="size-3" />
                        <span>{item.tech}</span>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-muted/30 flex justify-between items-center">
                    <span className="text-[8px] font-black uppercase tracking-widest opacity-40">View Full Protocol</span>
                    <ChevronRight className="size-4 text-primary" />
                  </div>
                </div>
              ))}
            </div>

          </main>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedPageWrapper>
  )
}