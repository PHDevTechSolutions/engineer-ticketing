"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { 
  Search, ChevronRight, ChevronLeft, Radio, RotateCcw,
  MapPin, Monitor, Smartphone, Activity, X, LogIn, LogOut, Globe, ShieldCheck
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

// FIREBASE & DATA
import { logsDb } from "@/lib/firebase" 
import { collection, getDocs, query, orderBy, Timestamp } from "firebase/firestore"

// UI COMPONENTS
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader } from "@/components/page-header"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import ProtectedPageWrapper from "@/components/protected-page-wrapper"
import { Dialog, DialogContent } from "@/components/ui/dialog"

// Leaflet
import "leaflet/dist/leaflet.css"

// DYNAMIC MAP COMPONENTS
const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), { ssr: false }) as any;
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false }) as any;
const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false }) as any;

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
  ipAddress: string 
  resource: string 
  details: string
  deviceType: "mobile" | "desktop"
  coords?: [number, number]
}

export default function AccessLogsPage() {
  const [userId, setUserId] = React.useState<string | null>(null)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [activeFilter, setActiveFilter] = React.useState<string>("ALL")
  const [logs, setLogs] = React.useState<AccessLog[]>([])
  const [isFetching, setIsFetching] = React.useState(true)
  
  // PAGINATION STATE
  const [currentPage, setCurrentPage] = React.useState(1)
  const [itemsPerPage, setItemsPerPage] = React.useState("10")
  
  // MAP & ADDRESS STATE
  const [selectedLog, setSelectedLog] = React.useState<AccessLog | null>(null)
  const [readableAddress, setReadableAddress] = React.useState<string>("Locating...")
  const [L, setL] = React.useState<any>(null);
  const searchRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    import("leaflet").then((leaflet) => setL(leaflet));
    setUserId(localStorage.getItem("userId"))
  }, []);

  const fetchLogs = React.useCallback(async () => {
    setIsFetching(true);
    const toastId = toast.loading("Syncing activity logs...");
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
        const dateCreatedStr = d.date_created instanceof Timestamp ? d.date_created.toDate().toLocaleString() : d.date_created || "N/A";

        return {
          id: docSnap.id,
          date_created: dateCreatedStr,
          timestamp: d.date_created,
          action: (d.status || "Activity").toUpperCase(),
          status: d.status?.toLowerCase() === "login" ? "SUCCESS" : "WARNING",
          user: {
            name: d.email?.split('@')[0] || "Unknown",
            email: d.email || "N/A",
            avatar: photoMap.get(d.email?.toLowerCase()),
          },
          // Showing IP/Device info as requested
          ipAddress: d.ipAddress || "INTERNAL", 
          resource: d.os || 'System',
          details: d.deviceId?.slice(-6) || 'N/A',
          deviceType: d.os?.toLowerCase().includes('android') || d.os?.toLowerCase().includes('ios') ? "mobile" : "desktop",
          coords: d.location?.latitude ? [d.location.latitude, d.location.longitude] : undefined
        };
      });

      setLogs(logData);
      toast.success("Logs synchronized.", { id: toastId });
    } catch (err) {
      toast.error("Sync failed.");
    } finally {
      setIsFetching(false);
    }
  }, []);

  // REVERSE GEOCODING
  const getAddress = async (lat: number, lon: number) => {
    setReadableAddress("Fetching address...");
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
      const data = await res.json();
      setReadableAddress(data.display_name || "Address not found");
    } catch {
      setReadableAddress("Error fetching address");
    }
  };

  React.useEffect(() => { fetchLogs() }, [fetchLogs]);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSearchTerm("")
        searchRef.current?.blur()
      }
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  const filteredLogs = React.useMemo(() => {
    return logs.filter(log => {
      const searchTarget = `${log.user.name} ${log.user.email} ${log.action} ${log.ipAddress}`.toLowerCase();
      const matchesSearch = searchTarget.includes(searchTerm.toLowerCase());
      const matchesFilter = activeFilter === "ALL" ? true : log.action === activeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [logs, searchTerm, activeFilter]);

  // PAGINATION LOGIC
  const limit = parseInt(itemsPerPage);
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / limit));
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * limit, currentPage * limit);
  const hasFilters = searchTerm.trim().length > 0 || activeFilter !== "ALL"

  const resetFilters = () => {
    setSearchTerm("")
    setActiveFilter("ALL")
    setCurrentPage(1)
    setItemsPerPage("10")
  }

  const createCustomIcon = (url: string) => {
    if (!L) return null;
    return new L.DivIcon({
      className: 'custom-div-icon',
      html: `<div style="background-color: black; border: 3px solid white; border-radius: 50%; overflow: hidden; width: 45px; height: 45px; box-shadow: 0 4px 12px rgba(0,0,0,0.4);">
               <img src="${url || 'https://github.com/shadcn.png'}" style="width: 100%; height: 100%; object-fit: cover;" />
             </div>`,
      iconSize: [45, 45],
      iconAnchor: [22, 45],
    });
  };

  return (
    <ProtectedPageWrapper>
      <SidebarProvider defaultOpen={false}>
        <AppSidebar userId={userId} />
        <SidebarInset className="bg-[#F4F7F7] font-sans pb-24 md:pb-0">
          
          <PageHeader 
            title="ACTIVITY LOGS" 
            version="V3.2" 
            showBackButton={true}
            trigger={<SidebarTrigger className="mr-2" />}
            actions={
              <Button onClick={fetchLogs} variant="ghost" size="icon" className={cn("rounded-full h-10 w-10", isFetching && "bg-blue-50 text-blue-600")}>
                <RotateCcw className={cn("size-5", isFetching && "animate-spin")} />
              </Button>
            }
          />

          <main className="p-4 md:p-6 max-w-7xl mx-auto w-full space-y-4">
            <section className="flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
               <StatCard label="ALL EVENTS" val={logs.length} icon={Activity} isActive={activeFilter === "ALL"} onClick={() => setActiveFilter("ALL")} />
               <StatCard label="LOGINS" val={logs.filter(l => l.action === "LOGIN").length} icon={LogIn} isActive={activeFilter === "LOGIN"} onClick={() => setActiveFilter("LOGIN")} />
               <StatCard label="LOGOUTS" val={logs.filter(l => l.action === "LOGOUT").length} icon={LogOut} isActive={activeFilter === "LOGOUT"} onClick={() => setActiveFilter("LOGOUT")} />
               <StatCard label="SYNC" val={isFetching ? "..." : "LIVE"} icon={Radio} isActive={isFetching} />
            </section>

            <div className="flex flex-col md:flex-row gap-2">
              <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-zinc-300 group-focus-within:text-zinc-700 transition-colors" />
                <input
                  ref={searchRef}
                  placeholder='Search user/email/action/IP... (Press "/" to focus)'
                  value={searchTerm}
                  onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}}
                  className="w-full pl-11 pr-10 h-12 rounded-2xl border-none bg-white shadow-sm ring-1 ring-zinc-200 focus:ring-2 focus:ring-zinc-900 outline-none text-sm font-bold"
                />
                {searchTerm && (
                  <button
                    onClick={() => { setSearchTerm(""); setCurrentPage(1) }}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-300 hover:text-zinc-600 transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>
              <Button
                variant="outline"
                onClick={resetFilters}
                className="size-12 rounded-2xl bg-white border-zinc-200 hover:bg-zinc-50 flex-shrink-0 p-0"
                title="Reset search/filter/pagination"
              >
                <RotateCcw className="size-4 text-zinc-400" />
              </Button>
            </div>

            <div className="bg-white rounded-[28px] shadow-sm border border-zinc-200/60 overflow-hidden">
              <div className="hidden md:grid grid-cols-12 bg-zinc-50/80 px-6 py-4 border-b border-zinc-100 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">
                <span className="col-span-4">User Details</span>
                <span className="col-span-2">Timestamp</span>
                <span className="col-span-2">Action</span>
                <span className="col-span-2">Network Info</span>
                <span className="text-right col-span-2">Ref ID</span>
              </div>

              <div className="divide-y divide-zinc-50 min-h-[360px]">
                {isFetching ? (
                  Array.from({ length: parseInt(itemsPerPage) || 10 }).map((_, i) => (
                    <div key={i} className="px-5 md:px-6 py-4 animate-pulse">
                      <div className="hidden md:grid grid-cols-12 gap-4 items-center">
                        <div className="col-span-4 flex items-center gap-3">
                          <Skeleton className="size-10 rounded-xl" />
                          <div className="space-y-2">
                            <Skeleton className="h-3.5 w-28" />
                            <Skeleton className="h-2.5 w-44" />
                          </div>
                        </div>
                        <Skeleton className="col-span-2 h-3.5 w-24" />
                        <Skeleton className="col-span-2 h-5 w-20 rounded-full" />
                        <Skeleton className="col-span-2 h-3.5 w-24" />
                        <div className="col-span-2 flex justify-end"><Skeleton className="h-8 w-16 rounded-xl" /></div>
                      </div>
                      <div className="md:hidden space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Skeleton className="size-10 rounded-xl" />
                            <div className="space-y-2">
                              <Skeleton className="h-3 w-24" />
                              <Skeleton className="h-2.5 w-32" />
                            </div>
                          </div>
                          <Skeleton className="h-6 w-16 rounded-xl" />
                        </div>
                        <Skeleton className="h-3 w-44 ml-[52px]" />
                      </div>
                    </div>
                  ))
                ) : paginatedLogs.length > 0 ? (
                paginatedLogs.map((log) => (
                  <div key={log.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-zinc-50/70 transition-colors">
                    <div className="col-span-4 flex items-center gap-3">
                      <Avatar className="size-10 rounded-xl border border-zinc-100">
                        <AvatarImage src={log.user.avatar} className="object-cover" />
                        <AvatarFallback className="bg-black text-white text-[10px] font-bold">{log.user.name?.[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[12px] font-black text-zinc-900 uppercase tracking-tight truncate">{log.user.name.replace('_', ' ')}</span>
                        <span className="text-[10px] text-zinc-400 font-medium">{log.user.email}</span>
                      </div>
                    </div>

                    <div className="col-span-2 flex flex-col">
                      <span className="text-[11px] font-black text-zinc-700">{log.date_created.split(",")[0] || "---"}</span>
                      <span className="text-[9px] text-zinc-400 font-bold uppercase">{(log.date_created.split(",")[1] || "").trim() || "--:--"}</span>
                    </div>

                    <div className="col-span-2">
                      <Badge className={cn("px-2.5 py-1 rounded-lg text-[9px] font-black border-none", log.action === "LOGIN" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-700")}>
                        {log.action}
                      </Badge>
                    </div>

                    <div className="col-span-2 flex items-center gap-3">
                      <div className="p-2 bg-zinc-50 rounded-lg text-zinc-400 border border-zinc-100">
                        {log.deviceType === 'mobile' ? <Smartphone className="size-3.5" /> : <Monitor className="size-3.5" />}
                      </div>
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-[10px] font-bold text-zinc-600 uppercase truncate">{log.resource}</span>
                        <span className="text-[9px] text-zinc-400 flex items-center gap-1 font-medium"><Globe className="size-2.5" /> {log.ipAddress}</span>
                      </div>
                    </div>

                    <div className="col-span-2 flex items-center justify-between md:justify-end gap-3">
                      {log.coords ? (
                        <Button 
                          onClick={() => { setSelectedLog(log); getAddress(log.coords![0], log.coords![1]); }}
                          variant="outline" 
                          className="h-8 rounded-xl text-[10px] font-black border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 gap-2 px-3"
                        >
                          <MapPin className="size-3" /> MAP
                        </Button>
                      ) : (
                        <span className="text-[10px] font-mono font-bold text-zinc-500 bg-zinc-100 px-2 py-1 rounded w-fit">#{log.details}</span>
                      )}
                    </div>
                  </div>
                ))
                ) : (
                  <div className="py-24 flex flex-col items-center gap-3">
                    <div className="size-16 rounded-3xl bg-zinc-50 border border-zinc-100 flex items-center justify-center">
                      <ShieldCheck className="size-7 text-zinc-200" />
                    </div>
                    <p className="text-[11px] font-black uppercase text-zinc-300 tracking-widest text-center px-4">
                      No matching activity found
                    </p>
                    {hasFilters && (
                      <button
                        onClick={resetFilters}
                        className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1 hover:text-blue-700 transition-colors"
                      >
                        Clear all filters
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="px-4 md:px-6 py-3 border-t bg-zinc-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 order-2 sm:order-1">
                  <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Rows:</span>
                  <Select value={itemsPerPage} onValueChange={(val) => {setItemsPerPage(val); setCurrentPage(1);}}>
                    <SelectTrigger className="h-8 w-[70px] rounded-lg border-zinc-200 text-[10px] font-bold bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-[9px] font-black uppercase text-zinc-400 tracking-widest ml-1">
                    {filteredLogs.length === logs.length ? `${logs.length} records` : `${filteredLogs.length} of ${logs.length} records`}
                  </span>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center gap-1.5 order-1 sm:order-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className={cn(
                        "size-8 rounded-xl border flex items-center justify-center transition-all",
                        currentPage === 1 ? "border-zinc-100 text-zinc-300 cursor-not-allowed" : "border-zinc-200 text-zinc-600 hover:bg-zinc-100 active:scale-95"
                      )}
                    >
                      <ChevronLeft className="size-3.5" />
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                      .reduce<(number | "...")[]>((acc, p, i, arr) => {
                        if (i > 0 && typeof arr[i - 1] === "number" && (p as number) - (arr[i - 1] as number) > 1) acc.push("...")
                        acc.push(p)
                        return acc
                      }, [])
                      .map((p, i) =>
                        p === "..." ? (
                          <span key={`ellipsis-${i}`} className="text-[10px] text-zinc-300 px-1">...</span>
                        ) : (
                          <button
                            key={p}
                            onClick={() => setCurrentPage(p as number)}
                            className={cn(
                              "size-8 rounded-xl text-[10px] font-black transition-all active:scale-95",
                              currentPage === p ? "bg-zinc-900 text-white border border-zinc-900" : "border border-zinc-200 text-zinc-600 hover:bg-zinc-100"
                            )}
                          >
                            {p}
                          </button>
                        )
                      )}

                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                      className={cn(
                        "size-8 rounded-xl border flex items-center justify-center transition-all",
                        currentPage >= totalPages ? "border-zinc-100 text-zinc-300 cursor-not-allowed" : "border-zinc-200 text-zinc-600 hover:bg-zinc-100 active:scale-95"
                      )}
                    >
                      <ChevronRight className="size-3.5" />
                    </button>
                    <span className="text-[9px] font-black text-zinc-400 ml-1 hidden sm:block">
                      Page {currentPage} of {totalPages}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </main>

          {/* MAP DIALOG */}
          <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
            <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden rounded-[32px] border-none">
              <div className="h-[400px] w-full relative">
                {selectedLog?.coords && L && (
                  <MapContainer center={selectedLog.coords} zoom={16} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <Marker position={selectedLog.coords} icon={createCustomIcon(selectedLog.user.avatar || '')} />
                  </MapContainer>
                )}
                <Button onClick={() => setSelectedLog(null)} variant="secondary" size="icon" className="absolute top-4 right-4 z-[1000] rounded-full bg-white/90">
                  <X className="size-4" />
                </Button>
              </div>
              <div className="p-8 bg-white flex flex-col gap-2">
                <div className="flex items-center gap-2">
                    <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Verified Address</h3>
                </div>
                <p className="text-[13px] text-zinc-900 font-bold leading-relaxed">{readableAddress}</p>
                <div className="mt-2 pt-4 border-t border-zinc-50 flex items-center gap-3 text-left">
                    <Avatar className="size-8 rounded-lg">
                        <AvatarImage src={selectedLog?.user.avatar} />
                        <AvatarFallback>{selectedLog?.user.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                        <span className="text-[11px] font-black uppercase">{selectedLog?.user.name.replace('_', ' ')}</span>
                        <span className="text-[9px] text-zinc-400 font-mono">IP: {selectedLog?.ipAddress}</span>
                    </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

        </SidebarInset>
      </SidebarProvider>
    </ProtectedPageWrapper>
  )
}

function StatCard({ label, val, icon: Icon, isActive, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 px-4 py-3 rounded-2xl border bg-white shadow-sm transition-all flex-shrink-0 active:scale-95",
        isActive ? "border-zinc-900 ring-4 ring-zinc-900/5 shadow-md" : "border-zinc-200/60 hover:border-zinc-300 hover:shadow-md"
      )}
    >
      <div className={cn("p-1.5 rounded-xl", isActive ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-500")}>
        <Icon className="size-3.5" />
      </div>
      <div className="text-left min-w-[28px]">
        <p className="text-[16px] font-black text-zinc-900 leading-none">{typeof val === "number" ? val : val}</p>
        <p className="text-[8px] font-black uppercase text-zinc-400 tracking-widest mt-0.5 whitespace-nowrap">{label}</p>
      </div>
    </button>
  )
}