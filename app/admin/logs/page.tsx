"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { 
  Search, ChevronRight, ChevronLeft, Radio, RotateCcw,
  MapPin, Monitor, Smartphone, Activity, X, LogIn, LogOut, Globe, ShieldCheck,
  FileDown, HelpCircle, Lightbulb, Zap, BarChart2, Sparkles, Filter, Calendar,
  Clock, ArrowUp, ArrowDown, ArrowUpDown
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
import { Sheet, SheetContent } from "@/components/ui/sheet"
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

type SortField = "timestamp" | "user" | "action" | "network"
type SortDir = "asc" | "desc"

/* ─────────────────────────────────────────────
   HELPERS & COMPONENTS
───────────────────────────────────────────── */

function GuideItem({ icon: Icon, title, description, colorClass }: { icon: any, title: string, description: string, colorClass: string }) {
  return (
    <div className="flex gap-4 p-4 rounded-2xl border border-zinc-100 bg-zinc-50/50 hover:bg-white hover:shadow-sm transition-all group">
      <div className={cn("p-2.5 rounded-xl flex-shrink-0 self-start", colorClass)}>
        <Icon size={18} />
      </div>
      <div>
        <h4 className="text-[13px] font-black text-zinc-900 uppercase tracking-tight mb-1">{title}</h4>
        <p className="text-[11px] font-bold text-zinc-500 leading-relaxed">{description}</p>
      </div>
    </div>
  )
}

function DashboardCard({ label, value, subValue, icon: Icon, colorClass, loading, isActive, onClick }: {
  label: string; value: string | number; subValue?: string; icon: any; colorClass: string; loading?: boolean; isActive?: boolean; onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 bg-white rounded-2xl p-3 border shadow-sm flex items-center gap-3 group transition-all min-w-0 active:scale-95 text-left",
        isActive ? "border-zinc-900 ring-4 ring-zinc-900/5 shadow-md" : "border-zinc-200/60 hover:shadow-md hover:border-zinc-300"
      )}
    >
      <div className={cn("p-2 rounded-xl flex-shrink-0 transition-colors", isActive ? "bg-zinc-900 text-white" : colorClass)}>
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 mb-0.5">
          {loading ? (
            <div className="h-4 w-12 bg-zinc-100 rounded animate-pulse" />
          ) : (
            <p className="text-[14px] font-black text-zinc-900 leading-none truncate tracking-tight">{value}</p>
          )}
          {!loading && subValue && (
            <span className="hidden xl:inline-block text-[7px] font-black text-zinc-400 uppercase tracking-widest bg-zinc-50 px-1 py-0.5 rounded border border-zinc-100 whitespace-nowrap flex-shrink-0">
              {subValue}
            </span>
          )}
        </div>
        <p className="text-[7px] font-black uppercase text-zinc-400 tracking-[0.1em] truncate">{label}</p>
      </div>
    </button>
  )
}

function StatPill({ label, count, isActive, onClick, loading }: {
  label: string; count: string | number; isActive: boolean; onClick: () => void; loading?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-xl border transition-all flex-shrink-0 active:scale-95",
        isActive
          ? "bg-zinc-900 border-zinc-900 text-white shadow-md shadow-zinc-200"
          : "bg-white border-zinc-200/60 text-zinc-500 hover:border-zinc-300 hover:bg-zinc-50"
      )}
    >
      <div className="text-left">
        {loading ? (
          <div className="h-3 w-3 bg-zinc-100 rounded animate-pulse" />
        ) : (
          <p className={cn("text-[13px] font-black leading-none", isActive ? "text-white" : "text-zinc-900")}>{count}</p>
        )}
        <p className={cn("text-[7px] font-black uppercase tracking-widest mt-1 whitespace-nowrap", isActive ? "text-zinc-400" : "text-zinc-400")}>{label}</p>
      </div>
    </button>
  )
}

function LogSortButton({
  label,
  field,
  currentField,
  dir,
  onSort,
}: {
  label: string
  field: SortField
  currentField: SortField
  dir: SortDir
  onSort: (field: SortField) => void
}) {
  const active = field === currentField
  return (
    <button
      onClick={() => onSort(field)}
      className={cn(
        "flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.2em] transition-colors",
        active ? "text-zinc-700" : "text-zinc-400 hover:text-zinc-600"
      )}
    >
      {label}
      {active
        ? dir === "asc"
          ? <ArrowUp className="size-3" />
          : <ArrowDown className="size-3" />
        : <ArrowUpDown className="size-3 opacity-40" />}
    </button>
  )
}

export default function AccessLogsPage() {
  const [userId, setUserId] = React.useState<string | null>(null)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [activeFilter, setActiveFilter] = React.useState<string>("ALL")
  const [logs, setLogs] = React.useState<AccessLog[]>([])
  const [isFetching, setIsFetching] = React.useState(true)
  const [isLiveMode, setIsLiveMode] = React.useState(false)
  const [dateFilter, setDateFilter] = React.useState<string>("ALL")
  const [sortField, setSortField] = React.useState<SortField>("timestamp")
  const [sortDir, setSortDir] = React.useState<SortDir>("desc")
  
  // PAGINATION STATE
  const [currentPage, setCurrentPage] = React.useState(1)
  const [itemsPerPage, setItemsPerPage] = React.useState("10")
  
  // UI STATES
  const [selectedLog, setSelectedLog] = React.useState<AccessLog | null>(null)
  const [readableAddress, setReadableAddress] = React.useState<string>("Locating...")
  const [L, setL] = React.useState<any>(null);
  const [showGuide, setShowGuide] = React.useState(false)
  const [logDetail, setLogDetail] = React.useState<AccessLog | null>(null)
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

  // LIVE MODE EFFECT
  React.useEffect(() => {
    let interval: any
    if (isLiveMode) {
      interval = setInterval(fetchLogs, 5000)
    }
    return () => clearInterval(interval)
  }, [isLiveMode, fetchLogs])

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
      
      let matchesDate = true
      if (dateFilter !== "ALL") {
        const logDate = new Date(log.date_created)
        const today = new Date()
        if (dateFilter === "TODAY") {
          matchesDate = logDate.toDateString() === today.toDateString()
        } else if (dateFilter === "WEEK") {
          const sevenDaysAgo = new Date(today.setDate(today.getDate() - 7))
          matchesDate = logDate >= sevenDaysAgo
        }
      }

      return matchesSearch && matchesFilter && matchesDate;
    });
  }, [logs, searchTerm, activeFilter, dateFilter]);

  const sortedLogs = React.useMemo(() => {
    return [...filteredLogs].sort((a, b) => {
      let comparison = 0
      if (sortField === "timestamp") {
        const timeA = a.timestamp instanceof Timestamp ? a.timestamp.toMillis() : new Date(a.date_created).getTime()
        const timeB = b.timestamp instanceof Timestamp ? b.timestamp.toMillis() : new Date(b.date_created).getTime()
        comparison = timeA - timeB
      } else if (sortField === "user") {
        comparison = a.user.name.localeCompare(b.user.name)
      } else if (sortField === "action") {
        comparison = a.action.localeCompare(b.action)
      } else if (sortField === "network") {
        comparison = a.ipAddress.localeCompare(b.ipAddress)
      }
      return sortDir === "asc" ? comparison : -comparison
    })
  }, [filteredLogs, sortField, sortDir])

  // PAGINATION LOGIC
  const limit = parseInt(itemsPerPage);
  const totalPages = Math.max(1, Math.ceil(sortedLogs.length / limit));
  const paginatedLogs = sortedLogs.slice((currentPage - 1) * limit, currentPage * limit);
  const hasFilters = searchTerm.trim().length > 0 || activeFilter !== "ALL"

  const handleSort = React.useCallback((field: SortField) => {
    if (field === sortField) {
      setSortDir(prev => prev === "asc" ? "desc" : "asc")
      return
    }
    setSortField(field)
    setSortDir("asc")
  }, [sortField])

  const handleExport = React.useCallback(() => {
    if (sortedLogs.length === 0) return
    const headers = ["ID", "User", "Email", "Timestamp", "Action", "IP Address", "Device", "OS"]
    const rows = sortedLogs.map(l => [
      l.id,
      l.user.name,
      l.user.email,
      l.date_created,
      l.action,
      l.ipAddress,
      l.deviceType,
      l.resource
    ])
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `Activity_Logs_Export_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success(`Exported ${sortedLogs.length} logs`)
  }, [sortedLogs])

  const resetFilters = () => {
    setSearchTerm("")
    setActiveFilter("ALL")
    setCurrentPage(1)
    setItemsPerPage("10")
    setSortField("timestamp")
    setSortDir("desc")
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
        <SidebarInset className="bg-[#F8FAFA] pb-24 md:pb-10 min-h-screen m-0 rounded-none border-none shadow-none overflow-visible pt-14 md:pt-16 font-sans">
          <PageHeader 
            title="Admin / Activity Logs" 
            version="V3.2-SECURITY" 
            trigger={<SidebarTrigger className="mr-2" />} 
            actions={
              <Button onClick={fetchLogs} variant="ghost" size="icon" className="rounded-full">
                <RotateCcw className={cn("size-4", isFetching && "animate-spin")} />
              </Button>
            }
          />
          <main className="p-4 md:p-6 max-w-7xl mx-auto w-full space-y-4">
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
               <DashboardCard 
                 label="Total Events" 
                 value={logs.length} 
                 icon={Activity} 
                 colorClass="text-zinc-600 bg-zinc-50" 
                 isActive={activeFilter === "ALL"} 
                 onClick={() => setActiveFilter("ALL")} 
                 loading={isFetching}
               />
               <DashboardCard 
                 label="Logins" 
                 value={logs.filter(l => l.action === "LOGIN").length} 
                 icon={LogIn} 
                 colorClass="text-emerald-600 bg-emerald-50" 
                 isActive={activeFilter === "LOGIN"} 
                 onClick={() => setActiveFilter("LOGIN")} 
                 loading={isFetching}
               />
               <DashboardCard 
                 label="Logouts" 
                 value={logs.filter(l => l.action === "LOGOUT").length} 
                 icon={LogOut} 
                 colorClass="text-rose-600 bg-rose-50" 
                 isActive={activeFilter === "LOGOUT"} 
                 onClick={() => setActiveFilter("LOGOUT")} 
                 loading={isFetching}
               />
               <DashboardCard 
                 label="Sync Status" 
                 value={isFetching ? "Syncing..." : "Live"} 
                 subValue="Firestore"
                 icon={Radio} 
                 colorClass={cn("transition-colors", isFetching ? "text-blue-600 bg-blue-50" : "text-emerald-600 bg-emerald-50")}
                 loading={isFetching}
               />
            </section>

            <div className="sticky top-[56px] md:top-[64px] z-[45] flex flex-col xl:flex-row xl:items-center gap-3 bg-white/80 backdrop-blur-md p-2 rounded-[24px] border border-zinc-200/40 shadow-sm transition-all">
              <div className="flex gap-1.5 overflow-x-auto pb-1 xl:pb-0 scrollbar-none flex-1">
                <StatPill
                  label="All Activity"
                  count={logs.length}
                  isActive={activeFilter === "ALL"}
                  onClick={() => setActiveFilter("ALL")}
                  loading={isFetching}
                />
                <StatPill
                  label="Logins"
                  count={logs.filter(l => l.action === "LOGIN").length}
                  isActive={activeFilter === "LOGIN"}
                  onClick={() => setActiveFilter("LOGIN")}
                  loading={isFetching}
                />
                <StatPill
                  label="Logouts"
                  count={logs.filter(l => l.action === "LOGOUT").length}
                  isActive={activeFilter === "LOGOUT"}
                  onClick={() => setActiveFilter("LOGOUT")}
                  loading={isFetching}
                />
              </div>

              <div className="flex flex-col md:flex-row gap-2 xl:min-w-[550px]">
                <div className="relative flex-1 group">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-zinc-300 group-focus-within:text-zinc-800 transition-colors" />
                  <input
                    ref={searchRef}
                    placeholder='Search user, email, action, IP...'
                    value={searchTerm}
                    onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}}
                    className="w-full pl-10 pr-9 h-10 rounded-xl bg-white shadow-sm ring-1 ring-zinc-200 outline-none focus:ring-2 focus:ring-zinc-900 transition-all text-xs font-bold"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                    {searchTerm && (
                      <button
                        onClick={() => { setSearchTerm(""); setCurrentPage(1) }}
                        className="text-zinc-300 hover:text-zinc-600 transition-colors"
                      >
                        <X className="size-3.5" />
                      </button>
                    )}
                    <div className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded border border-zinc-100 bg-zinc-50 text-[8px] font-black text-zinc-400">
                      <span>/</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger className="h-10 px-3 rounded-xl bg-white border-zinc-200 font-bold text-[10px] uppercase w-[120px] shadow-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="size-3 text-zinc-400" />
                        <SelectValue placeholder="Date" />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-zinc-100">
                      <SelectItem value="ALL" className="font-bold text-[10px] uppercase py-2">All Time</SelectItem>
                      <SelectItem value="TODAY" className="font-bold text-[10px] uppercase py-2">Today</SelectItem>
                      <SelectItem value="WEEK" className="font-bold text-[10px] uppercase py-2">Last 7 Days</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    onClick={() => setIsLiveMode(!isLiveMode)}
                    className={cn(
                      "h-10 px-3 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm",
                      isLiveMode ? "bg-emerald-50 border-emerald-100 text-emerald-600 ring-2 ring-emerald-500/20" : "bg-white border-zinc-200 text-zinc-400"
                    )}
                  >
                    <div className={cn("size-1.5 rounded-full", isLiveMode ? "bg-emerald-500 animate-pulse" : "bg-zinc-300")} />
                    <span>Live {isLiveMode ? "ON" : "OFF"}</span>
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => setShowGuide(true)}
                    className="h-10 px-3 rounded-xl bg-blue-50 border-blue-100 hover:bg-blue-100 text-blue-600 font-black text-[10px] uppercase tracking-wider transition-all flex items-center gap-1.5"
                  >
                    <HelpCircle className="size-3.5" />
                    <span>Guide</span>
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleExport}
                    className="h-10 px-3 rounded-xl bg-white border-zinc-200 hover:bg-zinc-50 text-zinc-600 font-black text-[10px] uppercase tracking-wider transition-all flex items-center gap-1.5"
                    disabled={sortedLogs.length === 0}
                  >
                    <FileDown className="size-3.5" />
                    <span>Export</span>
                  </Button>

                  <Button
                    variant="outline"
                    onClick={resetFilters}
                    className="h-10 w-10 rounded-xl bg-white border-zinc-200 hover:bg-zinc-50 flex items-center justify-center p-0 flex-shrink-0"
                    title="Reset filters"
                  >
                    <RotateCcw className="size-3.5 text-zinc-400" />
                  </Button>
                </div>
              </div>
            </div>

            {/* ── USER GUIDE DIALOG ── */}
            <Dialog open={showGuide} onOpenChange={setShowGuide}>
              <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-[32px] border-none shadow-2xl p-0 bg-white scrollbar-thin scrollbar-thumb-zinc-200 scrollbar-track-transparent hover:scrollbar-thumb-zinc-300 transition-colors">
                <div className="sticky top-0 bg-white/80 backdrop-blur-xl z-10 px-8 py-6 border-b border-zinc-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-[20px] font-black text-zinc-900 tracking-tight">
                      Activity Logs Guide
                    </h2>
                    <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mt-1">System Monitoring & Auditing</p>
                  </div>
                </div>

                <div className="p-8 space-y-8">
                  <section>
                    <div className="mb-4">
                      <h3 className="text-[14px] font-black text-zinc-900 uppercase tracking-wide">Monitoring Events</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <GuideItem 
                        icon={LogIn} 
                        title="Login Activity" 
                        description="Tracks successful user authentication events, including device info and approximate geolocation."
                        colorClass="bg-emerald-50 text-emerald-600"
                      />
                      <GuideItem 
                        icon={LogOut} 
                        title="Logout Activity" 
                        description="Logs when users manually end their sessions. Useful for tracking session duration and system usage."
                        colorClass="bg-rose-50 text-rose-600"
                      />
                    </div>
                  </section>

                  <section>
                    <div className="mb-4">
                      <h3 className="text-[14px] font-black text-zinc-900 uppercase tracking-wide">Security Insights</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <GuideItem 
                        icon={Globe} 
                        title="IP & Network" 
                        description="Every log entry captures the user's IP address and operating system to help identify unauthorized access."
                        colorClass="bg-blue-50 text-blue-600"
                      />
                      <GuideItem 
                        icon={MapPin} 
                        title="Geo-Location" 
                        description="Click the MAP button on entries with location data to view exactly where the login originated."
                        colorClass="bg-zinc-900 text-white"
                      />
                    </div>
                  </section>

                  <div className="bg-zinc-900 rounded-2xl p-6 text-white flex items-center justify-between gap-6 overflow-hidden relative">
                    <div className="relative z-10">
                      <h4 className="text-[15px] font-black mb-1">Pro Tip!</h4>
                      <p className="text-[11px] font-medium text-zinc-400 leading-relaxed max-w-[300px]">
                        Use the <FileDown className="inline size-3 text-emerald-500" /> Export feature to download logs for periodic security audits and reporting.
                      </p>
                    </div>
                    <Lightbulb className="text-amber-400 flex-shrink-0 relative z-10" size={40} />
                    <div className="absolute -right-10 -bottom-10 size-40 bg-white/5 rounded-full blur-3xl" />
                  </div>
                </div>

                <div className="p-8 pt-0 flex justify-end">
                  <Button 
                    onClick={() => setShowGuide(false)}
                    className="h-12 px-8 rounded-2xl bg-zinc-900 text-white font-black text-[12px] uppercase tracking-widest hover:bg-zinc-800 transition-all"
                  >
                    Got it!
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* ── LOG DETAIL SHEET ── */}
            <Sheet open={!!logDetail} onOpenChange={(open) => !open && setLogDetail(null)}>
              <SheetContent className="w-full sm:max-w-md rounded-l-[32px] border-none shadow-2xl p-0 bg-white">
                <div className="h-full flex flex-col">
                  <div className="px-8 py-6 border-b border-zinc-100 bg-zinc-50/50">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={cn(
                        "p-2 rounded-xl",
                        logDetail?.action === "LOGIN" ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                      )}>
                        {logDetail?.action === "LOGIN" ? <LogIn size={20} /> : <LogOut size={20} />}
                      </div>
                      <div>
                        <h2 className="text-[18px] font-black text-zinc-900 tracking-tight uppercase">{logDetail?.action} EVENT</h2>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{logDetail?.date_created}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-none">
                    <section>
                      <h3 className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-4">User Information</h3>
                      <div className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-50 border border-zinc-100">
                        <Avatar className="size-12 rounded-xl border border-white shadow-sm">
                          <AvatarImage src={logDetail?.user.avatar} />
                          <AvatarFallback className="bg-zinc-900 text-white font-bold">{logDetail?.user.name?.[0]}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-[14px] font-black text-zinc-900 uppercase truncate">{logDetail?.user.name.replace('_', ' ')}</p>
                          <p className="text-[11px] font-bold text-zinc-500 truncate">{logDetail?.user.email}</p>
                        </div>
                      </div>
                    </section>

                    <section className="space-y-4">
                      <h3 className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.2em]">Network & Device</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-100">
                          <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">IP Address</p>
                          <p className="text-[12px] font-bold text-zinc-900">{logDetail?.ipAddress}</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-100">
                          <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Device Type</p>
                          <div className="flex items-center gap-2">
                            {logDetail?.deviceType === 'mobile' ? <Smartphone size={14} className="text-zinc-500" /> : <Monitor size={14} className="text-zinc-500" />}
                            <p className="text-[12px] font-bold text-zinc-900 uppercase">{logDetail?.deviceType}</p>
                          </div>
                        </div>
                        <div className="col-span-2 p-4 rounded-2xl bg-zinc-50 border border-zinc-100">
                          <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Operating System / Resource</p>
                          <p className="text-[12px] font-bold text-zinc-900 uppercase">{logDetail?.resource}</p>
                        </div>
                      </div>
                    </section>

                    <section>
                      <h3 className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-4">Event Context</h3>
                      <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-100">
                        <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Status Details</p>
                        <div className="flex items-center gap-2">
                          <div className={cn("size-2 rounded-full", logDetail?.status === "SUCCESS" ? "bg-emerald-500" : "bg-rose-500")} />
                          <p className="text-[12px] font-bold text-zinc-900 uppercase tracking-wide">{logDetail?.status || "SUCCESS"}</p>
                        </div>
                        <p className="text-[11px] text-zinc-500 font-bold mt-2 leading-relaxed">
                          Ref ID: <span className="font-mono text-zinc-900">#{logDetail?.details}</span>
                        </p>
                      </div>
                    </section>

                    {logDetail?.coords && (
                      <Button 
                        onClick={() => { setSelectedLog(logDetail); getAddress(logDetail.coords![0], logDetail.coords![1]); setLogDetail(null); }}
                        className="w-full h-12 rounded-2xl bg-zinc-900 text-white font-black text-[11px] uppercase tracking-widest hover:bg-zinc-800 transition-all gap-2"
                      >
                        <MapPin size={16} /> View on Map
                      </Button>
                    )}
                  </div>

                  <div className="p-8 border-t border-zinc-100">
                    <Button 
                      onClick={() => setLogDetail(null)}
                      variant="outline"
                      className="w-full h-12 rounded-2xl font-black text-[11px] uppercase tracking-widest border-zinc-200 hover:bg-zinc-50"
                    >
                      Close Details
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <div className="bg-white rounded-[28px] shadow-sm border border-zinc-200/60 overflow-hidden">
              <div className="hidden md:grid grid-cols-12 bg-zinc-50/80 px-6 py-4 border-b border-zinc-100 gap-4 items-center">
                <div className="col-span-4"><LogSortButton label="User Details" field="user" currentField={sortField} dir={sortDir} onSort={handleSort} /></div>
                <div className="col-span-2"><LogSortButton label="Timestamp" field="timestamp" currentField={sortField} dir={sortDir} onSort={handleSort} /></div>
                <div className="col-span-2"><LogSortButton label="Action" field="action" currentField={sortField} dir={sortDir} onSort={handleSort} /></div>
                <div className="col-span-2"><LogSortButton label="Network Info" field="network" currentField={sortField} dir={sortDir} onSort={handleSort} /></div>
                <span className="text-right col-span-2 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">Ref ID</span>
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
                  <div 
                    key={log.id} 
                    onClick={() => setLogDetail(log)}
                    className="grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-zinc-50/70 transition-colors group cursor-pointer"
                  >
                    <div className="col-span-4 flex items-center gap-3 min-w-0">
                      <Avatar className="size-10 rounded-xl border border-zinc-100 shadow-sm transition-transform group-hover:scale-105">
                        <AvatarImage src={log.user.avatar} className="object-cover" />
                        <AvatarFallback className="bg-zinc-900 text-white text-[10px] font-bold">{log.user.name?.[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[12px] font-black text-zinc-900 uppercase tracking-tight truncate">{log.user.name.replace('_', ' ')}</span>
                        <span className="text-[10px] text-zinc-400 font-bold truncate mt-0.5">{log.user.email}</span>
                      </div>
                    </div>

                    <div className="col-span-2 flex flex-col">
                      <p className="text-[11px] font-black text-zinc-700 leading-none">{log.date_created.split(",")[0] || "---"}</p>
                      <p className="text-[9px] text-zinc-400 font-black uppercase tracking-widest mt-1.5 flex items-center gap-1">
                        <Clock size={8} className="text-zinc-300" />
                        {(log.date_created.split(",")[1] || "").trim() || "--:--"}
                      </p>
                    </div>

                    <div className="col-span-2">
                      <Badge className={cn("px-2.5 py-1 rounded-lg text-[9px] font-black border transition-colors", 
                        log.action === "LOGIN" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : 
                        log.action === "LOGOUT" ? "bg-rose-50 text-rose-700 border-rose-100" :
                        "bg-amber-50 text-amber-700 border-amber-100")}>
                        {log.action}
                      </Badge>
                    </div>

                    <div className="col-span-2 flex items-center gap-3">
                      <div className="p-2 bg-zinc-50 rounded-lg text-zinc-400 border border-zinc-100 transition-colors group-hover:bg-white group-hover:text-zinc-600 group-hover:border-zinc-200">
                        {log.deviceType === 'mobile' ? <Smartphone className="size-3.5" /> : <Monitor className="size-3.5" />}
                      </div>
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-[10px] font-black text-zinc-600 uppercase truncate leading-none">{log.resource}</span>
                        <span className="text-[9px] text-zinc-400 flex items-center gap-1 font-bold uppercase tracking-tighter mt-1.5"><Globe className="size-2.5 text-zinc-300" /> {log.ipAddress}</span>
                      </div>
                    </div>

                    <div className="col-span-2 flex items-center justify-between md:justify-end gap-3">
                      {log.coords ? (
                        <Button 
                          onClick={() => { setSelectedLog(log); getAddress(log.coords![0], log.coords![1]); }}
                          variant="outline" 
                          className="h-8 rounded-xl text-[10px] font-black border-zinc-200 bg-white hover:bg-zinc-900 hover:text-white hover:border-zinc-900 transition-all gap-2 px-3 shadow-sm active:scale-95"
                        >
                          <MapPin className="size-3" /> MAP
                        </Button>
                      ) : (
                        <div className="flex flex-col items-end">
                          <span className="text-[9px] font-mono font-black text-zinc-400 uppercase tracking-widest mb-1 opacity-50">Reference</span>
                          <span className="text-[10px] font-mono font-black text-zinc-600 bg-zinc-100/50 px-2 py-0.5 rounded-md border border-zinc-200/50 group-hover:bg-zinc-100 transition-colors">#{log.details}</span>
                        </div>
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