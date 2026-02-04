"use client"

import * as React from "react"
import { 
  History, Search, Activity, Fingerprint, ChevronRight, ChevronLeft,
  RotateCcw, Loader2, ShieldCheck, MapPin, Globe, MoreHorizontal, 
  Users, Radio, Cpu, UserCheck
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

// FIREBASE & DATA
import { logsDb } from "@/lib/firebase" 
import { collection, getDocs, query, orderBy, Timestamp } from "firebase/firestore"

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

interface AccessLog {
  id: string
  date_created: string
  timestamp: any 
  action: string 
  status: "SUCCESS" | "FAILURE" | "WARNING"
  user: {
    name: string
    email: string
    avatar?: string
  }
  browser?: string
  os?: string
  ipAddress: string 
  resource: string 
  details: string
}

export default function AccessLogsPage() {
  const [searchTerm, setSearchTerm] = React.useState("")
  const [activeFilter, setActiveFilter] = React.useState<string>("ALL")
  const [logs, setLogs] = React.useState<AccessLog[]>([])
  const [isFetching, setIsFetching] = React.useState(true)
  
  const [currentPage, setCurrentPage] = React.useState(1)
  const [itemsPerPage, setItemsPerPage] = React.useState("10")

  const fetchPersonnelRecords = React.useCallback(async () => {
    setIsFetching(true);
    const toastId = toast.loading("Uplinking to LogsDB Archive...");
    
    try {
      const registryRes = await fetch("/api/UserManagement/Fetch");
      const registryData = await registryRes.json();
      
      const photoMap = new Map();
      registryData.forEach((person: any) => {
        if (person.Email && person.profilePicture) {
          photoMap.set(person.Email.toLowerCase(), person.profilePicture);
        }
      });

      const q = query(collection(logsDb, "activity_logs"), orderBy("date_created", "desc"));
      const querySnapshot = await getDocs(q);

      const logData: AccessLog[] = querySnapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        const email = d.email?.toLowerCase() || "";
        const dateCreatedStr = d.date_created instanceof Timestamp
          ? d.date_created.toDate().toLocaleString()
          : d.date_created || "N/A";

        let displayLocation = "INTERNAL_NODE";
        if (typeof d.location === 'string') displayLocation = d.location;
        else if (d.location?.latitude) displayLocation = `${d.location.latitude.toFixed(4)}, ${d.location.longitude.toFixed(4)}`;

        const userName = d.email?.split('@')[0] || "Personnel_Unknown";

        return {
          id: docSnap.id,
          date_created: dateCreatedStr,
          timestamp: d.date_created,
          action: (d.status || "Activity").toUpperCase(),
          status: d.status?.toLowerCase() === "login" ? "SUCCESS" : 
                  d.status?.toLowerCase() === "logout" ? "WARNING" : "SUCCESS",
          user: {
            name: userName,
            email: d.email || "N/A",
            avatar: photoMap.get(email) || `https://ui-avatars.com/api/?name=${userName}&background=121212&color=fff`,
          },
          browser: d.browser,
          os: d.os,
          ipAddress: displayLocation, 
          resource: `${d.os || 'N/A'} / ${d.browser || 'N/A'}`,
          details: `Ref_ID: ${d.deviceId || 'Unregistered'}`
        };
      });

      setLogs(logData);
      toast.success("Manifest Synchronized.", { id: toastId });
    } catch (err) {
      toast.error("Protocol Error: LogsDB unreachable.", { id: toastId });
    } finally {
      setIsFetching(false);
    }
  }, []);

  React.useEffect(() => { fetchPersonnelRecords() }, [fetchPersonnelRecords]);

  React.useEffect(() => { setCurrentPage(1) }, [searchTerm, activeFilter, itemsPerPage]);

  const filteredLogs = React.useMemo(() => {
    return logs.filter(log => {
      const searchTarget = `${log.user.name} ${log.user.email} ${log.action}`.toLowerCase();
      const matchesSearch = searchTarget.includes(searchTerm.toLowerCase());
      const matchesFilter = activeFilter === "ALL" || log.status === activeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [logs, searchTerm, activeFilter]);

  const uniqueUsersCount = React.useMemo(() => new Set(logs.map(l => l.user.email)).size, [logs]);
  const integrityRate = React.useMemo(() => {
    if (logs.length === 0) return "0%";
    const success = logs.filter(l => l.status === "SUCCESS").length;
    return `${Math.round((success / logs.length) * 100)}%`;
  }, [logs]);

  const limit = parseInt(itemsPerPage);
  const totalPages = Math.ceil(filteredLogs.length / limit);
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * limit, currentPage * limit);

  return (
    <div className="flex flex-col min-h-screen bg-[#F9FAFA] font-sans antialiased text-[#121212] pb-24 md:pb-10">
      <PageHeader title="OPERATIONAL_ACTIVITY_LOG" version="BUILD: IAM-V4.2.ENGINEERING" />

      <main className="flex flex-1 flex-col gap-6 p-4 md:p-10 max-w-7xl mx-auto w-full">
        
        {/* STAT HUD */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Transmissions" val={logs.length} icon={Radio} isActive={activeFilter === "ALL"} onClick={() => setActiveFilter("ALL")} color="#121212" desc="Cumulative stream" />
          <StatCard label="Active Personnel" val={uniqueUsersCount} icon={Users} isActive={false} color="#121212" desc="Unique Auth IDs" />
          <StatCard label="Security Integrity" val={integrityRate} icon={ShieldCheck} isActive={activeFilter === "SUCCESS"} onClick={() => setActiveFilter("SUCCESS")} color="#121212" desc="Verified access rate" />
          <StatCard label="System Latency" val="24ms" icon={Cpu} isActive={false} color="#3B82F6" desc="Node: Firebase_Global" />
        </section>

        {/* SEARCH HUD */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-black/30 group-focus-within:text-black transition-colors" />
            <Input 
              placeholder="Query name, Email, or Reference ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 rounded-md border-black/10 bg-white h-12 text-sm focus-visible:ring-1 focus-visible:ring-black shadow-sm"
            />
          </div>
          <Button 
            variant="outline" 
            onClick={fetchPersonnelRecords} 
            className="rounded-md border-black/10 h-12 px-6 uppercase font-bold text-[10px] tracking-widest bg-white hover:bg-[#121212] hover:text-white transition-all shadow-sm"
          >
            <RotateCcw className="mr-2 size-3" />
            Reset Manifest
          </Button>
        </div>

        {/* DATA TABLE CONTAINER */}
        <section className="bg-white border border-black/5 rounded-lg shadow-sm overflow-hidden flex flex-col">
          <div className="hidden md:grid grid-cols-5 bg-[#F9FAFA] border-b border-black/5 p-5">
            {["Identity", "Timestamp", "Context", "Access_Point", "Verification"].map((h) => (
              <span key={h} className="text-[10px] font-bold uppercase tracking-[0.15em] text-black/40">{h}</span>
            ))}
          </div>

          <div className="divide-y divide-black/5 flex-1 min-h-[400px]">
            {isFetching && logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-20 gap-3">
                <Loader2 className="size-6 animate-spin text-black/20" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-black/30">Syncing Records...</p>
              </div>
            ) : paginatedLogs.length === 0 ? (
              <div className="p-20 text-center opacity-20">
                <Fingerprint className="size-10 mx-auto mb-4" />
                <p className="text-[10px] font-bold uppercase tracking-widest">System_Null // No Matches</p>
              </div>
            ) : paginatedLogs.map((log) => (
              <div key={log.id} className="group grid grid-cols-1 md:grid-cols-5 gap-4 p-5 hover:bg-[#F9FAFA] transition-all cursor-pointer">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="size-10 rounded-lg border border-black/5 grayscale group-hover:grayscale-0 transition-all shadow-sm">
                    <AvatarImage src={log.user.avatar} className="object-cover" />
                    <AvatarFallback className="bg-[#121212] text-white text-[10px] font-black">{log.user.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold text-[#121212] uppercase tracking-tighter leading-none mb-1">{log.user.name.replace('_', ' ')}</span>
                    <span className="text-[9px] font-medium text-black/40 truncate">{log.user.email}</span>
                  </div>
                </div>

                <div className="flex flex-col justify-center">
                  <span className="text-[11px] font-bold text-black font-mono tracking-tight">{log.date_created.split(',')[0]}</span>
                  <span className="text-[9px] text-black/40 italic">{log.date_created.split(',')[1] || "—"}</span>
                </div>

                <div className="flex flex-col justify-center">
                  <Badge variant="outline" className="w-fit rounded-sm font-bold text-[9px] uppercase border-black/10 bg-black/5 text-black/60 mb-1">{log.action}</Badge>
                  <span className="text-[9px] text-black/40 truncate italic leading-none">{log.resource}</span>
                </div>

                <div className="flex items-center gap-2">
                  <MapPin className="size-3 text-black/20" />
                  <span className="text-[10px] font-mono text-black/60 truncate uppercase tracking-tighter">{log.ipAddress}</span>
                </div>

                <div className="flex items-center md:justify-end gap-4">
                  <Badge variant="outline" className={cn(
                    "rounded-sm font-bold text-[9px] uppercase border px-2.5 py-0.5",
                    log.status === "SUCCESS" ? "bg-black text-white border-black" : 
                    log.status === "WARNING" ? "bg-amber-500 text-white border-amber-500" : "bg-red-600 text-white border-red-600"
                  )}>
                    {log.status === "SUCCESS" ? "Verified" : log.status === "WARNING" ? "Flagged" : "Denied"}
                  </Badge>
                  <ChevronRight className="size-4 text-black/20 group-hover:text-black group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            ))}
          </div>

          {/* PAGINATION FOOTER */}
          <div className="flex flex-col md:flex-row items-center justify-between px-6 py-4 bg-[#F9FAFA] border-t border-black/5 gap-4">
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-black/40">
                Displaying {paginatedLogs.length} of {filteredLogs.length} results
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
              <span className="text-[10px] font-bold uppercase tracking-widest text-black/40">Page {currentPage} / {totalPages || 1}</span>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="size-8 rounded-sm border-black/10 bg-white hover:bg-[#121212] hover:text-white transition-all shadow-sm">
                  <ChevronLeft className="size-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="size-8 rounded-sm border-black/10 bg-white hover:bg-[#121212] hover:text-white transition-all shadow-sm">
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
          onClick={() => fetchPersonnelRecords()}
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
    <div onClick={onClick} className={cn("relative cursor-pointer p-5 flex flex-col gap-1 transition-all duration-300 border rounded-lg bg-white shadow-sm", isActive ? "border-black ring-1 ring-black/5 translate-y-[-2px]" : "border-black/5 opacity-80 hover:opacity-100 hover:border-black/20")}>
      <div className="flex justify-between items-start mb-2">
        <div className="p-2 rounded-md bg-[#F9FAFA] border border-black/5">
          <Icon className="size-4" style={{ color: isActive ? color : '#A0A0A0' }} />
        </div>
        <span className="text-2xl font-bold tracking-tighter text-[#121212]">{typeof val === 'number' ? val.toString().padStart(2, '0') : val}</span>
      </div>
      <div className="flex flex-col">
        <span className={cn("text-[10px] font-black uppercase tracking-[0.1em]", isActive ? "text-black" : "text-black/40")}>{label}</span>
        <span className="text-[9px] text-black/30 font-medium leading-tight">{desc}</span>
      </div>
      {isActive && <div className="absolute top-3 right-3 size-1.5 rounded-full bg-black animate-pulse" />}
    </div>
  );
}