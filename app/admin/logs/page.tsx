"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { 
  Search, ChevronRight, ChevronLeft, Loader2, Radio, RotateCcw, 
  MapPin, Monitor, Smartphone, Activity, ArrowRight, X, LogIn, LogOut, Globe
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

// FIREBASE & DATA
import { logsDb } from "@/lib/firebase" 
import { collection, getDocs, query, orderBy, Timestamp } from "firebase/firestore"

// UI COMPONENTS
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
  const totalPages = Math.ceil(filteredLogs.length / limit);
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * limit, currentPage * limit);

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

          <main className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">
            {/* STAT CARDS */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
               <StatCard label="ALL EVENTS" val={logs.length} icon={Activity} isActive={activeFilter === "ALL"} onClick={() => setActiveFilter("ALL")} />
               <StatCard label="LOGINS" val={logs.filter(l => l.action === "LOGIN").length} icon={LogIn} isActive={activeFilter === "LOGIN"} onClick={() => setActiveFilter("LOGIN")} />
               <StatCard label="LOGOUTS" val={logs.filter(l => l.action === "LOGOUT").length} icon={LogOut} isActive={activeFilter === "LOGOUT"} onClick={() => setActiveFilter("LOGOUT")} />
               <StatCard label="NODES" val="ON" icon={Radio} isActive={false} />
            </section>

            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
                <input
                  placeholder="Search activity..."
                  value={searchTerm}
                  onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}}
                  className="w-full pl-11 h-12 rounded-2xl border-none bg-white shadow-sm ring-1 ring-zinc-200 focus:ring-2 focus:ring-black outline-none text-sm"
                />
              </div>
            </div>

            <div className="bg-white rounded-[24px] shadow-sm border border-zinc-200/60 overflow-hidden">
              <div className="hidden md:grid grid-cols-12 bg-zinc-50/50 p-6 border-b border-zinc-100 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                <span className="col-span-4">User Details</span>
                <span className="col-span-2">Timestamp</span>
                <span className="col-span-2">Action</span>
                <span className="col-span-2">Network Info</span>
                <span className="text-right col-span-2">Ref ID</span>
              </div>

              <div className="divide-y divide-zinc-50">
                {paginatedLogs.map((log) => (
                  <div key={log.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-6 items-center hover:bg-zinc-50/40 transition-colors">
                    <div className="col-span-4 flex items-center gap-4">
                      <Avatar className="size-10 rounded-xl border border-zinc-100">
                        <AvatarImage src={log.user.avatar} className="object-cover" />
                        <AvatarFallback className="bg-black text-white text-[10px] font-bold">{log.user.name?.[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-zinc-900 uppercase tracking-tight">{log.user.name.replace('_', ' ')}</span>
                        <span className="text-[10px] text-zinc-400 font-medium">{log.user.email}</span>
                      </div>
                    </div>

                    <div className="col-span-2 flex flex-col">
                      <span className="text-xs font-bold text-zinc-700">{log.date_created.split(',')[0]}</span>
                      <span className="text-[10px] text-zinc-400 font-bold uppercase italic">{log.date_created.split(',')[1]}</span>
                    </div>

                    <div className="col-span-2">
                      <Badge className={cn("px-2.5 py-1 rounded-lg text-[9px] font-bold border-none", log.action === "LOGIN" ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600")}>
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
                          className="h-8 rounded-xl text-[10px] font-bold bg-black text-white hover:bg-zinc-800 gap-2 px-3"
                        >
                          <MapPin className="size-3" /> MAP
                        </Button>
                      ) : (
                        <span className="text-[10px] font-mono font-bold text-zinc-500 bg-zinc-100 px-2 py-1 rounded w-fit">#{log.details}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* RESTORED PAGINATION CONTROLS */}
              <div className="p-4 bg-zinc-50/50 border-t border-zinc-100 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Rows per page:</span>
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
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                    Page {currentPage} of {totalPages || 1}
                  </span>
                  <div className="flex gap-1">
                    <Button 
                      variant="outline" size="icon" className="size-8 rounded-lg" 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                    <Button 
                      variant="outline" size="icon" className="size-8 rounded-lg"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
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
    <div onClick={onClick} className={cn("p-6 flex flex-col gap-4 rounded-[24px] bg-white transition-all shadow-sm border-2 cursor-pointer", isActive ? "border-black shadow-md" : "border-transparent")}>
      <div className="flex justify-between items-start">
        <div className={cn("p-2.5 rounded-xl", isActive ? "bg-black text-white" : "bg-zinc-50 text-zinc-400")}>
          <Icon className="size-4 md:size-5" />
        </div>
        <span className="text-2xl font-black text-zinc-900">{typeof val === 'number' ? val.toString().padStart(2, '0') : val}</span>
      </div>
      <p className="text-[9px] font-bold uppercase text-zinc-400 tracking-widest">{label}</p>
    </div>
  )
}