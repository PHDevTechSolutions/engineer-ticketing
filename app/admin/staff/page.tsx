"use client"

import * as React from "react"
import { 
  Users, Search, Terminal, ShieldCheck, Briefcase, 
  ChevronRight, Fingerprint, Mail, Hash, Activity
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

// SHADCN + CUSTOM
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/page-header"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default function StaffDirectoryPage() {
  const [searchTerm, setSearchTerm] = React.useState("")
  const [activeDept, setActiveDept] = React.useState<string>("ALL")
  const [staff, setStaff] = React.useState<any[]>([])
  const [isFetching, setIsFetching] = React.useState(true)

  const ALLOWED_DEPTS = ["IT", "ENGINEERING", "SALES"]
  const DEPARTMENTS_FILTER = ["ALL", ...ALLOWED_DEPTS]

  React.useEffect(() => {
    const fetchAccounts = async () => {
      setIsFetching(true)
      const toastId = toast.loading("Accessing Personnel Manifest...")
      try {
        const res = await fetch("/api/UserManagement/Fetch")
        if (!res.ok) throw new Error("Network response was not ok")
        const data = await res.json()
        setStaff(data || [])
        toast.success("Personnel records synchronized.", { id: toastId })
      } catch (err) {
        console.error("REGISTRY_FETCH_ERROR:", err)
        toast.error("Failed to establish uplink with server.", { id: toastId })
      } finally {
        setIsFetching(false)
      }
    }
    fetchAccounts()
  }, [])

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

  const getDeptCount = (dept: string) => staff.filter(s => normalize(s.Department) === dept).length
  const totalVisibleCount = staff.filter(s => ALLOWED_DEPTS.includes(normalize(s.Department))).length

  return (
    <div className="flex flex-col min-h-screen bg-background font-sans antialiased text-foreground pb-10 md:pb-8">
      <PageHeader title="Staff Personnel" version="IAM-SYS-v4.2" />

      <main className="flex flex-1 flex-col gap-4 md:gap-6 p-4 md:p-6 max-w-6xl mx-auto w-full relative">
        
        {/* Statistics Bar */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-px bg-muted/30 border border-muted/30">
            {[
              { label: "Total_Visible", val: totalVisibleCount, icon: Users }, 
              { label: "Sales_Force", val: getDeptCount("SALES"), icon: Briefcase },
              { label: "Security_IT", val: getDeptCount("IT"), icon: ShieldCheck },
              { label: "Engineering", val: getDeptCount("ENGINEERING"), icon: Terminal }
            ].map((stat, i) => (
                <div key={i} className="bg-background p-3 md:p-4 flex flex-col gap-1 border-l-2 border-primary/10">
                    <div className="flex items-center gap-2 opacity-40">
                        <stat.icon className="size-3" />
                        <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest">{stat.label}</span>
                    </div>
                    <span className="text-xl md:text-2xl font-black italic tracking-tighter tabular-nums">
                      {isFetching ? "--" : stat.val.toString().padStart(2, '0')}
                    </span>
                </div>
            ))}
        </section>

        {/* Filters & Improved Search HUD */}
        <div className="flex flex-col gap-0 sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b-2 border-muted/50 -mx-4 md:mx-0">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-3 px-4 md:px-0">
            {DEPARTMENTS_FILTER.map((dept) => (
              <button
                key={dept}
                onClick={() => setActiveDept(dept)}
                className={cn(
                  "whitespace-nowrap px-4 py-2 text-[10px] font-black uppercase tracking-tighter transition-all border-2 flex items-center gap-2 rounded-none",
                  normalize(activeDept) === normalize(dept) 
                    ? "bg-primary text-primary-foreground border-primary shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] -translate-y-0.5" 
                    : "bg-muted/10 border-transparent opacity-60 hover:opacity-100"
                )}
              >
                {normalize(activeDept) === normalize(dept) && <Fingerprint className="size-3" />}
                {dept}
              </button>
            ))}
          </div>

          {/* THE IMPROVED SEARCH PART */}
          <div className="relative pb-4 px-4 md:px-0 group/search">
            <div className="relative flex items-center transition-all duration-300">
              {/* Animated Icon Container */}
              <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center z-10">
                <Search className={cn(
                    "size-4 transition-all duration-300",
                    searchTerm ? "text-primary scale-110" : "text-muted-foreground opacity-50"
                )} />
              </div>

              <Input 
                placeholder="INPUT_QUERY_FOR_PERSONNEL_MANIFEST..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={cn(
                    "pl-10 pr-32 h-12 md:h-12 bg-muted/5 border-0 border-l-4 border-primary/20 rounded-none font-mono text-[11px] uppercase transition-all duration-300",
                    "focus-visible:ring-0 focus-visible:border-primary focus-visible:bg-primary/[0.02]",
                    searchTerm && "border-l-primary"
                )}
              />

              {/* Status Indicator inside Search Bar */}
              <div className="absolute right-4 hidden md:flex items-center gap-3 pointer-events-none">
                {searchTerm && (
                    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
                        <div className="h-4 w-[1px] bg-muted-foreground/20" />
                        <span className="text-[9px] font-black text-primary italic tracking-widest">
                            {filteredStaff.length} MATCHES_FOUND
                        </span>
                        <Activity className="size-3 text-primary animate-pulse" />
                    </div>
                )}
              </div>
            </div>
            
            {/* Subtle Focus Glow Effect */}
            <div className="absolute inset-x-0 bottom-4 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-focus-within/search:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* MOBILE CARDS */}
        <div className="flex flex-col gap-3 md:hidden">
          {isFetching ? (
             <div className="py-20 text-center font-mono text-[10px] opacity-50 animate-pulse tracking-[0.2em]">INITIALIZING_UPLINK...</div>
          ) : filteredStaff.length > 0 ? (
            filteredStaff.map((person) => (
              <div key={person._id} className="group relative bg-muted/5 border border-muted-foreground/10 p-0 overflow-hidden active:bg-primary/5 transition-colors">
                <div className="absolute top-0 left-0 w-1 h-full bg-primary/40 group-active:bg-primary" />
                <div className="p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div className="flex gap-3">
                      <div className="relative">
                        <Avatar className="size-12 rounded-none border-2 border-muted-foreground/20 grayscale group-hover:grayscale-0 transition-all">
                          <AvatarImage src={person.profilePicture} className="object-cover" />
                          <AvatarFallback className="rounded-none bg-muted font-black text-xs">{person.Firstname?.[0]}</AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-1 -right-1 size-3 bg-emerald-500 border-2 border-background rounded-full" />
                      </div>
                      <div className="flex flex-col justify-center min-w-0">
                        <h3 className="text-xs font-black uppercase italic tracking-tight truncate leading-none mb-1">
                          {person.Firstname} {person.Lastname}
                        </h3>
                        <div className="flex items-center gap-1 opacity-60">
                          <Hash className="size-2 text-primary" />
                          <span className="text-[9px] font-mono leading-none tracking-tighter">{person.ReferenceID || "NO_REF"}</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className={cn(
                      "rounded-none text-[8px] px-1.5 py-0 font-black uppercase tracking-widest border-primary/20",
                      normalize(person.Department) === "SALES" ? "text-amber-500" : 
                      normalize(person.Department) === "IT" ? "text-blue-500" : "text-emerald-500"
                    )}>
                      {person.Department}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 border-t border-muted-foreground/5 pt-3">
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="size-3 text-primary opacity-50" />
                      <span className="text-[9px] font-mono opacity-60 truncate">{person.Email}</span>
                    </div>
                    <div className="flex justify-end">
                       <button className="flex items-center gap-1 text-[9px] font-black uppercase italic text-primary hover:underline">
                         View_Full_Record <ChevronRight className="size-3" />
                       </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-20 flex flex-col items-center gap-4 opacity-20 italic animate-in fade-in duration-700">
               <Fingerprint className="size-10" />
               <p className="text-[10px] font-black uppercase tracking-[0.3em]">No_Results_Found</p>
            </div>
          )}
        </div>

        {/* DESKTOP TABLE */}
        <div className="hidden md:block border-2 border-muted/50 bg-muted/5 overflow-hidden">
            <Table>
                <TableHeader className="bg-muted/10">
                    <TableRow className="border-muted/50 hover:bg-transparent">
                        <TableHead className="text-[10px] font-black uppercase py-4 pl-6">ID_Bio</TableHead>
                        <TableHead className="text-[10px] font-black uppercase">Personnel_Details</TableHead>
                        <TableHead className="text-[10px] font-black uppercase">Department</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-center">Ref_Key</TableHead>
                        <TableHead className="text-right pr-6">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isFetching ? (
                      <TableRow><TableCell colSpan={5} className="h-32 text-center font-mono text-[10px] opacity-50 animate-pulse tracking-[0.2em]">SYNCHRONIZING_DATA...</TableCell></TableRow>
                    ) : filteredStaff.length > 0 ? (
                      filteredStaff.map((person) => (
                        <TableRow key={person._id} className="border-muted/20 hover:bg-primary/5 transition-colors group">
                            <TableCell className="pl-6">
                                <Avatar className="size-10 rounded-none border-2 border-muted-foreground/10 grayscale hover:grayscale-0 transition-all">
                                  <AvatarImage src={person.profilePicture} className="object-cover" />
                                  <AvatarFallback className="rounded-none bg-muted font-black text-[10px]">{person.Firstname?.[0]}</AvatarFallback>
                                </Avatar>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col py-2">
                                  <span className="text-sm font-black uppercase italic tracking-tight">{person.Firstname} {person.Lastname}</span>
                                  <span className="font-mono text-[9px] opacity-40 uppercase tracking-tighter">{person.Email}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                                <Badge className={cn(
                                  "rounded-none px-2 py-0 border text-[9px] font-black uppercase italic",
                                  normalize(person.Department) === "SALES" ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : 
                                  normalize(person.Department) === "IT" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                                  normalize(person.Department) === "ENGINEERING" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                                  "bg-primary/5 text-primary border-primary/20"
                                )}>
                                  {person.Department}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-center font-mono text-[10px] opacity-40">
                               {person.ReferenceID || "NULL"}
                            </TableCell>
                            <TableCell className="text-right pr-6">
                                <Button variant="ghost" size="sm" className="h-7 rounded-none text-[9px] font-black uppercase italic text-primary border border-transparent hover:border-primary/30 transition-all">
                                  Open_Terminal
                                </Button>
                            </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="h-48 text-center font-mono text-[10px] opacity-30 uppercase tracking-[0.2em]">
                           NO_RECORDS_MATCH_PARAMETERS
                        </TableCell>
                      </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
      </main>
    </div>
  )
}