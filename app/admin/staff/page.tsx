"use client"

import * as React from "react"
import { 
  Users, Search, Terminal, ShieldCheck, Briefcase, 
  ChevronRight, ChevronLeft, Fingerprint, Activity,
  MoreHorizontal, Loader2, UserCheck, RotateCcw
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

// SHADCN + CUSTOM
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/page-header"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function StaffDirectoryPage() {
  const [searchTerm, setSearchTerm] = React.useState("")
  const [activeDept, setActiveDept] = React.useState<string>("ENGINEERING")
  const [staff, setStaff] = React.useState<any[]>([])
  const [isFetching, setIsFetching] = React.useState(true)

  // PAGINATION & DENSITY STATE
  const [currentPage, setCurrentPage] = React.useState(1)
  const [itemsPerPage, setItemsPerPage] = React.useState("10")

  const ALLOWED_DEPTS = ["IT", "ENGINEERING", "SALES"]

  const fetchAccounts = React.useCallback(async () => {
    setIsFetching(true)
    const toastId = toast.loading("Uplinking to Personnel Registry...")
    try {
      const res = await fetch("/api/UserManagement/Fetch")
      if (!res.ok) throw new Error("Registry Uplink Failed")
      const data = await res.json()
      setStaff(data || [])
      toast.success("Manifest Synchronized.", { id: toastId })
    } catch (err) {
      console.error("REGISTRY_FETCH_ERROR:", err)
      toast.error("Failed to synchronize personnel records.", { id: toastId })
    } finally {
      setIsFetching(false)
    }
  }, [])

  React.useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  // Reset pagination on filter or density change
  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, activeDept, itemsPerPage])

  const normalize = (str: string) => str?.trim().toUpperCase() || ""

  const filteredStaff = React.useMemo(() => {
    return staff.filter(person => {
      const staffDept = normalize(person.Department)
      const targetDept = normalize(activeDept)
      const fullName = `${person.Firstname || ''} ${person.Lastname || ''}`.toLowerCase()
      const matchesSearch = fullName.includes(searchTerm.toLowerCase()) || 
                            person.ReferenceID?.toLowerCase().includes(searchTerm.toLowerCase())
      
      let matchesDept = targetDept === "ALL" ? ALLOWED_DEPTS.includes(staffDept) : staffDept === targetDept
      return matchesSearch && matchesDept
    })
  }, [staff, searchTerm, activeDept])

  // PAGINATION LOGIC
  const limit = parseInt(itemsPerPage)
  const totalPages = Math.ceil(filteredStaff.length / limit)
  const paginatedStaff = filteredStaff.slice(
    (currentPage - 1) * limit,
    currentPage * limit
  )

  const getDeptCount = (dept: string) => staff.filter(s => normalize(s.Department) === dept).length

  return (
    <div className="flex flex-col min-h-screen bg-[#F9FAFA] font-sans antialiased text-[#121212] pb-24 md:pb-10">
      <PageHeader title="PERSONNEL_REGISTRY" version="BUILD: IAM-V4.2.ENGINEERING" />

      <main className="flex flex-1 flex-col gap-6 p-4 md:p-10 max-w-7xl mx-auto w-full">
        
        {/* UNIFIED STAT HUD */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            label="Total Personnel" 
            val={staff.filter(s => ALLOWED_DEPTS.includes(normalize(s.Department))).length} 
            icon={Users} 
            isActive={activeDept === "ALL"} 
            onClick={() => setActiveDept("ALL")} 
            color="#121212"
            desc="Global headcount"
          />
          <StatCard 
            label="Engineering" 
            val={getDeptCount("ENGINEERING")} 
            icon={Terminal} 
            isActive={activeDept === "ENGINEERING"} 
            onClick={() => setActiveDept("ENGINEERING")} 
            color="#121212"
            desc="System Architects"
          />
          <StatCard 
            label="IT Security" 
            val={getDeptCount("IT")} 
            icon={ShieldCheck} 
            isActive={activeDept === "IT"} 
            onClick={() => setActiveDept("IT")} 
            color="#3B82F6"
            desc="Network Defense"
          />
          <StatCard 
            label="Sales Force" 
            val={getDeptCount("SALES")} 
            icon={Briefcase} 
            isActive={activeDept === "SALES"} 
            onClick={() => setActiveDept("SALES")} 
            color="#F59E0B"
            desc="Client Operations"
          />
        </section>

        {/* SEARCH HUD */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-black/30 group-focus-within:text-black transition-colors" />
            <Input 
              placeholder="Query name or Reference ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 rounded-md border-black/10 bg-white h-12 text-sm focus-visible:ring-1 focus-visible:ring-black shadow-sm"
            />
          </div>
          <Button 
            variant="outline" 
            onClick={() => {setActiveDept("ENGINEERING"); setSearchTerm("")}} 
            className="rounded-md border-black/10 h-12 px-6 uppercase font-bold text-[10px] tracking-widest bg-white hover:bg-[#121212] hover:text-white transition-all shadow-sm"
          >
            <RotateCcw className="mr-2 size-3" />
            Reset Manifest
          </Button>
        </div>

        {/* DATA TABLE CONTAINER */}
        <section className="bg-white border border-black/5 rounded-lg shadow-sm overflow-hidden flex flex-col">
          <div className="hidden md:grid grid-cols-5 bg-[#F9FAFA] border-b border-black/5 p-5">
            {["Identity", "Reference_ID", "Department", "Verification", "Actions"].map((h) => (
              <span key={h} className="text-[10px] font-bold uppercase tracking-[0.15em] text-black/40">{h}</span>
            ))}
          </div>

          <div className="divide-y divide-black/5 flex-1 min-h-[400px]">
            {isFetching && staff.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-20 gap-3">
                <Loader2 className="size-6 animate-spin text-black/20" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-black/30">Accessing Records...</p>
              </div>
            ) : paginatedStaff.length === 0 ? (
              <div className="p-20 text-center opacity-20">
                <Fingerprint className="size-10 mx-auto mb-4" />
                <p className="text-[10px] font-bold uppercase tracking-widest">System_Null // No Matches</p>
              </div>
            ) : (
              paginatedStaff.map((person) => (
                <div 
                  key={person._id} 
                  className="group grid grid-cols-1 md:grid-cols-5 gap-4 p-5 hover:bg-[#F9FAFA] transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="size-10 rounded-lg border border-black/5 grayscale group-hover:grayscale-0 transition-all shadow-sm">
                      <AvatarImage src={person.profilePicture} className="object-cover" />
                      <AvatarFallback className="bg-[#121212] text-white text-[10px] font-black">{person.Firstname?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-[#121212] uppercase tracking-tighter leading-none mb-1">
                        {person.Firstname} {person.Lastname}
                      </span>
                      <span className="text-[9px] font-medium text-black/40 truncate">{person.Email}</span>
                    </div>
                  </div>

                  <div className="flex flex-col justify-center">
                    <span className="text-[11px] font-bold text-black font-mono tracking-tight">
                      {person.ReferenceID || "SYS-NULL"}
                    </span>
                    <span className="text-[9px] text-black/40 italic">ID_Verified</span>
                  </div>

                  <div className="flex items-center">
                    <Badge variant="outline" className={cn(
                      "rounded-sm font-bold text-[9px] uppercase border px-2.5 py-0.5",
                      normalize(person.Department) === "ENGINEERING" ? "bg-black text-white border-black" : "bg-black/5 text-black/60 border-black/10"
                    )}>
                      {person.Department}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    <UserCheck className="size-3 text-emerald-500" />
                    <span className="text-[10px] font-bold uppercase text-black/40 tracking-tight">Verified_Internal</span>
                  </div>

                  <div className="flex items-center md:justify-end gap-4">
                    <Button variant="ghost" size="icon" className="size-8 text-black/20 hover:text-black hover:bg-black/5">
                      <MoreHorizontal className="size-4" />
                    </Button>
                    <ChevronRight className="size-4 text-black/20 group-hover:text-black group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* PAGINATION FOOTER */}
          <div className="flex flex-col md:flex-row items-center justify-between px-6 py-4 bg-[#F9FAFA] border-t border-black/5 gap-4">
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-black/40">
                Displaying {paginatedStaff.length} of {filteredStaff.length} results
              </span>
              <div className="flex items-center gap-2 border-l border-black/10 pl-4">
                <span className="text-[9px] font-black uppercase text-black/30">Density:</span>
                <Select value={itemsPerPage} onValueChange={setItemsPerPage}>
                  <SelectTrigger className="h-7 w-[70px] bg-white border-black/10 text-[10px] font-bold rounded-sm">
                    <SelectValue placeholder="10" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-black/10">
                    {["10", "20", "50", "100"].map(v => (
                      <SelectItem key={v} value={v} className="text-[10px] font-bold uppercase">{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-black/40">
                Page {currentPage} / {totalPages || 1}
              </span>
              <div className="flex items-center gap-1">
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                  disabled={currentPage === 1} 
                  className="size-8 rounded-sm border-black/10 bg-white hover:bg-[#121212] hover:text-white transition-all shadow-sm"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                  disabled={currentPage === totalPages || totalPages === 0} 
                  className="size-8 rounded-sm border-black/10 bg-white hover:bg-[#121212] hover:text-white transition-all shadow-sm"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FAB */}
      <div className="fixed bottom-8 right-6 z-50">
        <Button 
          className="size-16 rounded-full bg-[#121212] text-white shadow-2xl hover:scale-105 active:scale-95 transition-all flex flex-col items-center justify-center border border-white/10 group"
          onClick={() => fetchAccounts()}
        >
          <div className="size-6 bg-white/10 rounded-full flex items-center justify-center mb-1 group-hover:bg-white/20">
            <span className="text-[10px] font-black italic">E</span>
          </div>
          <Activity className="size-5 stroke-[2.5px]" />
        </Button>
      </div>
    </div>
  )
}

function StatCard({ label, val, icon: Icon, isActive, onClick, color, desc }: any) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "relative cursor-pointer p-5 flex flex-col gap-1 transition-all duration-300 border rounded-lg bg-white shadow-sm",
        isActive ? "border-black ring-1 ring-black/5 translate-y-[-2px]" : "border-black/5 opacity-80 hover:opacity-100 hover:border-black/20"
      )}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="p-2 rounded-md bg-[#F9FAFA] border border-black/5">
          <Icon className="size-4" style={{ color: isActive ? color : '#A0A0A0' }} />
        </div>
        <span className="text-2xl font-bold tracking-tighter text-[#121212]">
          {val.toString().padStart(2, '0')}
        </span>
      </div>
      <div className="flex flex-col">
        <span className={cn(
          "text-[10px] font-black uppercase tracking-[0.1em]",
          isActive ? "text-black" : "text-black/40"
        )}>
          {label}
        </span>
        <span className="text-[9px] text-black/30 font-medium leading-tight">
          {desc}
        </span>
      </div>
      {isActive && (
        <div className="absolute top-3 right-3 size-1.5 rounded-full bg-black animate-pulse" />
      )}
    </div>
  );
}