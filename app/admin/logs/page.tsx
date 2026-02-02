"use client"

import * as React from "react"
import { 
  ShieldAlert, 
  Terminal, 
  History, 
  Globe, 
  Search,
  FileJson,
  Activity,
  Fingerprint,
  ChevronRight,
  Database,
  Lock,
  Calendar
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

// SHADCN + CUSTOM COMPONENTS
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/page-header"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface AccessLog {
  _id: string
  timestamp: string
  action: string
  status: "SUCCESS" | "FAILURE" | "WARNING"
  user: {
    name: string
    email: string
    avatar?: string
  }
  ipAddress: string
  resource: string
  details: string
}

export default function AccessLogsPage() {
  const [searchTerm, setSearchTerm] = React.useState("")
  const [activeFilter, setActiveFilter] = React.useState<string>("ALL")
  const [logs, setLogs] = React.useState<AccessLog[]>([])
  const [isFetching, setIsFetching] = React.useState(true)

  const FILTERS = ["ALL", "SUCCESS", "FAILURE", "WARNING"]

  React.useEffect(() => {
    const fetchLogs = async () => {
      setIsFetching(true)
      const toastId = toast.loading("Accessing Security Manifest...")
      try {
        // Simulated Fetch
        const mockLogs: AccessLog[] = [
          {
            _id: "L101",
            timestamp: "2024-05-20T10:30:45Z",
            action: "SYS_LOGIN",
            status: "SUCCESS",
            user: { name: "Maricris Mercado", email: "m.mercado@ecoshiftcorp.com" },
            ipAddress: "192.168.1.42",
            resource: "Auth Service",
            details: "Standard encrypted login via Web Interface"
          },
          {
            _id: "L102",
            timestamp: "2024-05-20T11:15:20Z",
            action: "DATA_EXPORT",
            status: "WARNING",
            user: { name: "Babyrose Nebril", email: "b.nebril@disruptivesolutions.com" },
            ipAddress: "203.0.113.5",
            resource: "Staff Registry",
            details: "Full manifest download initiated"
          },
          {
            _id: "L103",
            timestamp: "2024-05-20T12:05:10Z",
            action: "API_REJECTED",
            status: "FAILURE",
            user: { name: "Unknown Entity", email: "system@root.local" },
            ipAddress: "45.79.12.110",
            resource: "API Gateway",
            details: "Invalid bearer token detected in header"
          }
        ]
        setLogs(mockLogs)
        toast.success("Security logs synchronized.", { id: toastId })
      } catch (err) {
        toast.error("Uplink synchronization failed.", { id: toastId })
      } finally {
        setIsFetching(false)
      }
    }
    fetchLogs()
  }, [])

  const filteredLogs = React.useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = 
        log.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.ipAddress.includes(searchTerm)
      
      const matchesFilter = activeFilter === "ALL" || log.status === activeFilter
      return matchesSearch && matchesFilter
    })
  }, [logs, searchTerm, activeFilter])

  return (
    <div className="flex flex-col min-h-screen bg-background font-sans antialiased text-foreground pb-10">
      <PageHeader title="Access & Security Logs" version="LOG-AUDIT-v1.4" />

      <main className="flex flex-1 flex-col gap-4 md:gap-6 p-4 md:p-6 max-w-6xl mx-auto w-full relative">
        
        {/* Statistics Bar */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-px bg-muted/30 border border-muted/30">
          {[
            { label: "Uplink_Status", val: "ACTIVE", icon: Activity, color: "text-emerald-500" }, 
            { label: "Total_Events", val: logs.length, icon: History, color: "text-primary" },
            { label: "Failures_24H", val: "03", icon: ShieldAlert, color: "text-red-500" },
            { label: "Active_Gateway", val: "10.0.4.1", icon: Globe, color: "text-blue-500" }
          ].map((stat, i) => (
            <div key={i} className="bg-background p-3 md:p-4 flex flex-col gap-1 border-l-2 border-primary/10">
              <div className="flex items-center gap-2 opacity-40">
                <stat.icon className="size-3" />
                <span className="text-[9px] font-black uppercase tracking-widest">{stat.label}</span>
              </div>
              <span className={cn("text-xl md:text-2xl font-black italic tracking-tighter tabular-nums", stat.color)}>
                {isFetching ? "--" : stat.val.toString().padStart(2, '0')}
              </span>
            </div>
          ))}
        </section>

        {/* Filters & Search HUD */}
        <div className="flex flex-col gap-0 sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b-2 border-muted/50 -mx-4 md:mx-0">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-3 px-4 md:px-0">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={cn(
                  "whitespace-nowrap px-4 py-2 text-[10px] font-black uppercase tracking-tighter transition-all border-2 flex items-center gap-2 rounded-none",
                  activeFilter === f 
                    ? "bg-primary text-primary-foreground border-primary shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] -translate-y-0.5" 
                    : "bg-muted/10 border-transparent opacity-60 hover:opacity-100"
                )}
              >
                {activeFilter === f && <Fingerprint className="size-3" />}
                {f}
              </button>
            ))}
          </div>

          <div className="relative pb-4 px-4 md:px-0 group/search">
            <div className="relative flex items-center">
              <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center z-10">
                <Search className={cn(
                  "size-4 transition-all duration-300",
                  searchTerm ? "text-primary scale-110" : "text-muted-foreground opacity-50"
                )} />
              </div>

              <Input 
                placeholder="SEARCH_BY_IDENTITY_ACTION_OR_IP..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={cn(
                  "pl-10 pr-32 h-12 bg-muted/5 border-0 border-l-4 border-primary/20 rounded-none font-mono text-[11px] uppercase transition-all duration-300",
                  "focus-visible:ring-0 focus-visible:border-primary focus-visible:bg-primary/[0.02]",
                  searchTerm && "border-l-primary"
                )}
              />

              <div className="absolute right-4 hidden md:flex items-center gap-3 pointer-events-none">
                {searchTerm && (
                  <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
                    <span className="text-[9px] font-black text-primary italic tracking-widest">
                      {filteredLogs.length} MATCHES_FOUND
                    </span>
                    <Activity className="size-3 text-primary animate-pulse" />
                  </div>
                )}
                <Button variant="outline" className="h-7 rounded-none border-muted text-[8px] font-black pointer-events-auto">
                  <FileJson className="mr-1 size-3" /> EXPORT
                </Button>
              </div>
            </div>
            <div className="absolute inset-x-0 bottom-4 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-focus-within/search:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* MOBILE CARDS */}
        <div className="flex flex-col gap-3 md:hidden">
          {isFetching ? (
            <div className="py-20 text-center font-mono text-[10px] opacity-50 animate-pulse tracking-[0.2em]">INITIALIZING_UPLINK...</div>
          ) : filteredLogs.length > 0 ? (
            filteredLogs.map((log) => (
              <div key={log._id} className="group relative bg-muted/5 border border-muted-foreground/10 p-0 overflow-hidden active:bg-primary/5 transition-colors">
                <div className={cn(
                  "absolute top-0 left-0 w-1 h-full",
                  log.status === "SUCCESS" ? "bg-emerald-500/40" : log.status === "WARNING" ? "bg-amber-500/40" : "bg-red-500/40"
                )} />
                <div className="p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div className="flex gap-3">
                      <Avatar className="size-10 rounded-none border-2 border-muted-foreground/20 grayscale">
                        <AvatarImage src={log.user.avatar} />
                        <AvatarFallback className="rounded-none bg-muted font-black text-xs">{log.user.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col justify-center min-w-0">
                        <h3 className="text-xs font-black uppercase italic tracking-tight truncate leading-none mb-1">{log.user.name}</h3>
                        <div className="flex items-center gap-1 opacity-60 italic">
                          <Terminal className="size-2 text-primary" />
                          <span className="text-[9px] font-mono leading-none tracking-tighter">{log.action}</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className={cn(
                      "rounded-none text-[8px] px-1.5 py-0 font-black uppercase tracking-widest",
                      log.status === "SUCCESS" ? "text-emerald-500 border-emerald-500/20" : 
                      log.status === "WARNING" ? "text-amber-500 border-amber-500/20" : "text-red-500 border-red-500/20"
                    )}>
                      {log.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 border-t border-muted-foreground/5 pt-3">
                    <div className="flex items-center gap-2 truncate">
                      <Globe className="size-3 text-primary opacity-50" />
                      <span className="text-[9px] font-mono opacity-60 truncate">{log.ipAddress}</span>
                    </div>
                    <div className="flex justify-end">
                       <button className="flex items-center gap-1 text-[9px] font-black uppercase italic text-primary">
                         Audit_Record <ChevronRight className="size-3" />
                       </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-20 flex flex-col items-center gap-4 opacity-20 italic">
               <ShieldAlert className="size-10" />
               <p className="text-[10px] font-black uppercase tracking-[0.3em]">No_Security_Match</p>
            </div>
          )}
        </div>

        {/* DESKTOP TABLE */}
        <div className="hidden md:block border-2 border-muted/50 bg-muted/5 overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/10">
              <TableRow className="border-muted/50 hover:bg-transparent">
                <TableHead className="text-[10px] font-black uppercase py-4 pl-6">ID_Bio</TableHead>
                <TableHead className="text-[10px] font-black uppercase">Timestamp_Event</TableHead>
                <TableHead className="text-[10px] font-black uppercase">Infrastructure</TableHead>
                <TableHead className="text-[10px] font-black uppercase">Gateway_IP</TableHead>
                <TableHead className="text-right pr-6 text-[10px] font-black uppercase">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isFetching ? (
                <TableRow><TableCell colSpan={5} className="h-32 text-center font-mono text-[10px] opacity-50 animate-pulse tracking-[0.2em]">SYNCHRONIZING_AUDIT_TRAIL...</TableCell></TableRow>
              ) : filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <TableRow key={log._id} className="border-muted/20 hover:bg-primary/5 transition-colors group">
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3 py-1">
                        <Avatar className="size-10 rounded-none border-2 border-muted-foreground/10 grayscale group-hover:grayscale-0 transition-all">
                          <AvatarImage src={log.user.avatar} />
                          <AvatarFallback className="rounded-none bg-muted font-black text-[10px]">{log.user.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-[11px] font-black uppercase italic tracking-tight leading-none mb-1">{log.user.name}</span>
                          <span className="font-mono text-[9px] opacity-40 uppercase tracking-tighter">{log.user.email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5 text-[10px] font-black opacity-80">
                          <Calendar className="size-3 text-primary" /> {new Date(log.timestamp).toISOString().split('T')[0]}
                        </div>
                        <span className="font-mono text-[9px] text-primary italic">{new Date(log.timestamp).toISOString().split('T')[1].replace('Z','')}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-primary uppercase flex items-center gap-1">
                          <Database className="size-3" /> {log.action}
                        </span>
                        <span className="text-[9px] opacity-50 truncate max-w-[180px] font-mono">{log.resource}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-[10px] opacity-60">
                      <div className="flex items-center gap-2">
                         <Lock className="size-3 opacity-30" /> {log.ipAddress}
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Badge className={cn(
                        "rounded-none px-2 py-0 border text-[9px] font-black uppercase italic",
                        log.status === "SUCCESS" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : 
                        log.status === "WARNING" ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                        "bg-red-500/10 text-red-500 border-red-500/20"
                      )}>
                        {log.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-48 text-center font-mono text-[10px] opacity-30 uppercase tracking-[0.2em]">
                    Manifest_Empty_For_Query
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