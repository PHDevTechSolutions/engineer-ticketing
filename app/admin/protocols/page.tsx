"use client"

import * as React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import ProtectedPageWrapper from "@/components/protected-page-wrapper"
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar"
import {
    Plus, Search, Activity, RotateCcw,
    ClipboardCheck, ShieldCheck,
    TrendingUp, Loader2, ChevronLeft, ChevronRight,
    Info, X, ArrowRight, HelpCircle, FileDown,
    Sparkles, Zap, Lightbulb, CheckSquare, Square,
    MousePointer2, Globe, Monitor, Smartphone, Settings2
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

// DATABASE TOOLS
import { db } from "@/lib/firebase"
import { collection, onSnapshot, query, orderBy, doc, updateDoc } from "firebase/firestore"

// SHARED COMPONENTS
import { PageHeader } from "@/components/page-header"
import { ServiceModalContent } from "@/components/modals/service-modal"
import { Skeleton } from "@/components/ui/skeleton"

/* ─────────────────────────────────────────────────────────
   HELPERS & COMPONENTS
───────────────────────────────────────────────────────── */

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

function StatPill({ label, count, isActive, onClick, loading, icon: Icon }: {
    label: string; count: string | number; isActive: boolean; onClick: () => void; loading?: boolean; icon?: any
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
            {Icon && <Icon className={cn("size-3.5", isActive ? "text-white/70" : "text-zinc-400")} />}
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

export default function SiteVisitManagementPage() {
    // APP STATE
    const [userId, setUserId] = React.useState<string | null>(null)
    const [services, setServices] = React.useState<any[]>([])
    const [isDataLoading, setIsDataLoading] = React.useState(true)
    const [isOpen, setIsOpen] = React.useState(false)
    const [showInstructions, setShowInstructions] = React.useState(false)
    const [guideStep, setGuideStep] = React.useState(1)
    const [selectedService, setSelectedService] = React.useState<any>(null)
    const [filterActive, setFilterActive] = React.useState<boolean | null>(null)
    const [searchTerm, setSearchTerm] = React.useState("")

    // PAGINATION
    const [currentPage, setCurrentPage] = React.useState(1)
    const [itemsPerPage, setItemsPerPage] = React.useState("10")
    const [activeTab, setActiveTab] = React.useState<string>("ALL")
    const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
    const [showGuide, setShowGuide] = React.useState(false)
    const [isBatchProcessing, setIsBatchProcessing] = React.useState(false)
    const searchInputRef = React.useRef<HTMLInputElement>(null)

    // DERIVED STATE
    const filteredServices = services.filter(s => {
        const matchesSearch = s.label?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.uid?.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesStatus = filterActive === null ? true : s.isActive === filterActive
        return matchesSearch && matchesStatus
    })

    const limit = parseInt(itemsPerPage)
    const totalPages = Math.ceil(filteredServices.length / limit)
    const paginatedServices = filteredServices.slice((currentPage - 1) * limit, currentPage * limit)

    const handleReset = React.useCallback(() => {
        setSearchTerm("")
        setFilterActive(null)
        setActiveTab("ALL")
        setCurrentPage(1)
    }, [])

    const handleExport = React.useCallback(() => {
        if (filteredServices.length === 0) return
        const headers = ["Reference ID", "Service Name", "Staff In Charge", "Status", "Created At"]
        const rows = filteredServices.map(s => [
            s.uid || "",
            s.label || "",
            s.pic?.join("; ") || "",
            s.isActive ? "ONLINE" : "OFFLINE",
            s.createdAt?.toDate?.()?.toISOString() || s.createdAt || ""
        ])
        const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n")
        const encodedUri = encodeURI(csvContent)
        const link = document.createElement("a")
        link.setAttribute("href", encodedUri)
        link.setAttribute("download", `Service_Hub_Export_${new Date().toISOString().split('T')[0]}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }, [filteredServices])

    const handleBatchStatus = async (newStatus: "ONLINE" | "OFFLINE") => {
        if (selectedIds.size === 0) return
        setIsBatchProcessing(true)
        try {
            await Promise.all(Array.from(selectedIds).map(async (id) => {
                const docRef = doc(db, "protocols", id)
                await updateDoc(docRef, { 
                    isActive: newStatus === "ONLINE",
                    updatedAt: new Date()
                })
            }))
            setSelectedIds(new Set())
        } catch (error) {
            console.error("Batch update error:", error)
        } finally {
            setIsBatchProcessing(false)
        }
    }

    const toggleSelection = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const toggleAllOnPage = () => {
        if (selectedIds.size === paginatedServices.length && paginatedServices.length > 0) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(paginatedServices.map(s => s.id)))
        }
    }

    // FETCH DATA
    React.useEffect(() => {
        setUserId(localStorage.getItem("userId"))
        const q = query(collection(db, "protocols"), orderBy("createdAt", "desc"))

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
            setIsDataLoading(false)
        })
        return () => unsubscribe()
    }, [])

    // TOGGLE STATUS
    const toggleStatus = async (id: string, current: boolean) => {
        try {
            await updateDoc(doc(db, "protocols", id), {
                isActive: !current,
                updatedAt: new Date()
            })
        } catch (e) { console.error("Update failed:", e) }
    }

    const getStaffColor = (name: string) => {
        const colors = ['bg-blue-50 text-blue-600', 'bg-purple-50 text-purple-600', 'bg-orange-50 text-orange-600', 'bg-rose-50 text-rose-600'];
        const index = name.length % colors.length;
        return colors[index];
    }

    return (
        <ProtectedPageWrapper>
            <SidebarProvider defaultOpen={false}>
                <AppSidebar userId={userId} />
                <SidebarInset className="bg-[#F8FAFA] pb-24 md:pb-10 min-h-screen m-0 rounded-none border-none shadow-none overflow-visible font-sans">
                    <PageHeader
                        title="ADMIN / SERVICE HUB"
                        version="V3.0-HUB"
                        trigger={<SidebarTrigger className="mr-2" />}
                        actions={
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowGuide(true)}
                                    className="rounded-xl h-8 px-3 transition-all text-[9px] font-black uppercase tracking-widest text-zinc-500 hover:bg-white border border-transparent hover:border-zinc-200"
                                >
                                    <HelpCircle size={14} className="mr-1.5" />
                                    <span className="hidden md:inline">Hub Guide</span>
                                </Button>

                                <Button
                                    onClick={() => { setSelectedService(null); setIsOpen(true) }}
                                    className="h-9 px-4 rounded-xl bg-zinc-900 text-white font-black text-[9px] uppercase tracking-[0.15em] hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-200 flex items-center gap-2"
                                >
                                    <Plus className="size-3.5" />
                                    <span>Add New Service</span>
                                </Button>
                            </div>
                        }
                    />

                    <main className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-4 md:space-y-6">
                        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                            <DashboardCard
                                label="Total Services"
                                value={isDataLoading ? "--" : services.length}
                                icon={ClipboardCheck}
                                colorClass="text-zinc-600 bg-zinc-50"
                                loading={isDataLoading}
                                isActive={activeTab === "ALL"}
                                onClick={() => { setActiveTab("ALL"); setFilterActive(null); }}
                            />
                            <DashboardCard
                                label="Online Now"
                                value={isDataLoading ? "--" : services.filter(p => p.isActive).length}
                                icon={Activity}
                                colorClass="text-emerald-600 bg-emerald-50"
                                loading={isDataLoading}
                                isActive={activeTab === "ONLINE"}
                                onClick={() => { setActiveTab("ONLINE"); setFilterActive(true); }}
                            />
                            <DashboardCard
                                label="Performance"
                                value="94%"
                                subValue="STABLE"
                                icon={TrendingUp}
                                colorClass="text-blue-600 bg-blue-50"
                            />
                            <DashboardCard
                                label="Sync Status"
                                value={isDataLoading ? "Syncing..." : "Live"}
                                subValue="FIRESTORE"
                                icon={ShieldCheck}
                                colorClass={cn("transition-colors", isDataLoading ? "text-amber-600 bg-amber-50" : "text-emerald-600 bg-emerald-50")}
                                loading={isDataLoading}
                            />
                        </section>

                        <div className="sticky top-0 z-[45] flex flex-col xl:flex-row xl:items-center gap-3 bg-white/80 backdrop-blur-md p-2 rounded-[24px] border border-zinc-200/40 shadow-sm transition-all">
                            <div className="flex gap-1.5 overflow-x-auto pb-1 xl:pb-0 scrollbar-none flex-1">
                                <StatPill
                                    label="All Hub"
                                    count={services.length}
                                    isActive={activeTab === "ALL"}
                                    onClick={() => { setActiveTab("ALL"); setFilterActive(null); }}
                                    loading={isDataLoading}
                                    icon={Settings2}
                                />
                                <StatPill
                                    label="Online"
                                    count={services.filter(p => p.isActive).length}
                                    isActive={activeTab === "ONLINE"}
                                    onClick={() => { setActiveTab("ONLINE"); setFilterActive(true); }}
                                    loading={isDataLoading}
                                    icon={Activity}
                                />
                                <StatPill
                                    label="Offline"
                                    count={services.filter(p => !p.isActive).length}
                                    isActive={activeTab === "OFFLINE"}
                                    onClick={() => { setActiveTab("OFFLINE"); setFilterActive(false); }}
                                    loading={isDataLoading}
                                    icon={X}
                                />
                            </div>

                            <div className="flex flex-col md:flex-row gap-2 xl:min-w-[550px]">
                                <div className="relative flex-1 group">
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-zinc-300 group-focus-within:text-zinc-800 transition-colors" />
                                    <input
                                        ref={searchInputRef}
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder='Search by ID or service name...'
                                        className="w-full pl-10 pr-9 h-10 rounded-xl bg-white shadow-sm ring-1 ring-zinc-200 outline-none focus:ring-2 focus:ring-zinc-900 transition-all text-xs font-bold"
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                                        {searchTerm && (
                                            <button
                                                onClick={() => setSearchTerm("")}
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
                                    <Button
                                        variant="outline"
                                        onClick={handleExport}
                                        className="h-10 px-3 rounded-xl bg-white border-zinc-200 hover:bg-zinc-50 text-zinc-600 font-black text-[10px] uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm"
                                        disabled={filteredServices.length === 0}
                                    >
                                        <FileDown className="size-3.5" />
                                        <span>Export</span>
                                    </Button>

                                    <Button
                                        variant="outline"
                                        onClick={handleReset}
                                        className="h-10 w-10 rounded-xl bg-white border-zinc-200 hover:bg-zinc-50 flex items-center justify-center p-0 flex-shrink-0 shadow-sm"
                                        title="Reset filters"
                                    >
                                        <RotateCcw className="size-3.5 text-zinc-400" />
                                    </Button>

                                    {selectedIds.size > 0 && (
                                        <div className="flex gap-1 animate-in slide-in-from-right-4">
                                            <Button
                                                onClick={() => handleBatchStatus("ONLINE")}
                                                disabled={isBatchProcessing}
                                                className="h-10 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm shadow-emerald-100"
                                            >
                                                <Activity className="size-3.5" />
                                                <span>Online ({selectedIds.size})</span>
                                            </Button>
                                            <Button
                                                onClick={() => handleBatchStatus("OFFLINE")}
                                                disabled={isBatchProcessing}
                                                className="h-10 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm shadow-rose-100"
                                            >
                                                <X className="size-3.5" />
                                                <span>Offline ({selectedIds.size})</span>
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ── USER GUIDE DIALOG ── */}
                        <Dialog open={showGuide} onOpenChange={setShowGuide}>
                            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-[32px] border-none shadow-2xl p-0 bg-white scrollbar-thin scrollbar-thumb-zinc-200 scrollbar-track-transparent hover:scrollbar-thumb-zinc-300 transition-colors">
                                <div className="sticky top-0 bg-white/80 backdrop-blur-xl z-10 px-8 py-6 border-b border-zinc-100 flex items-center justify-between">
                                    <div>
                                        <h2 className="text-[20px] font-black text-zinc-900 tracking-tight">
                                            Service Hub Guide
                                        </h2>
                                        <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Management & Protocols</p>
                                    </div>
                                </div>

                                <div className="p-8 space-y-8">
                                    <section>
                                        <div className="mb-4">
                                            <h3 className="text-[14px] font-black text-zinc-900 uppercase tracking-wide">Hub Features</h3>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <GuideItem 
                                                icon={Plus} 
                                                title="Service Creation" 
                                                description="Define new service protocols, assign staff, and set initial availability status."
                                                colorClass="bg-zinc-900 text-white"
                                            />
                                            <GuideItem 
                                                icon={Activity} 
                                                title="Real-time Status" 
                                                description="Toggle services between Online and Offline. Offline services won't be available for selection."
                                                colorClass="bg-emerald-50 text-emerald-600"
                                            />
                                        </div>
                                    </section>

                                    <section>
                                        <div className="mb-4">
                                            <h3 className="text-[14px] font-black text-zinc-900 uppercase tracking-wide">Workflow Tips</h3>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <GuideItem 
                                                icon={Zap} 
                                                title="Batch Actions" 
                                                description="Select multiple services to quickly change their status. Ideal for system maintenance."
                                                colorClass="bg-blue-50 text-blue-600"
                                            />
                                            <GuideItem 
                                                icon={FileDown} 
                                                title="Data Portability" 
                                                description="Export your service registry to CSV for offline analysis or documentation."
                                                colorClass="bg-amber-50 text-amber-600"
                                            />
                                        </div>
                                    </section>

                                    <div className="bg-zinc-900 rounded-2xl p-6 text-white flex items-center justify-between gap-6 overflow-hidden relative">
                                        <div className="relative z-10">
                                            <h4 className="text-[15px] font-black mb-1">Pro Tip!</h4>
                                            <p className="text-[11px] font-medium text-zinc-400 leading-relaxed max-w-[300px]">
                                                Use the <MousePointer2 className="inline size-3 text-emerald-500" /> Manage button to edit service details or update assigned personnel.
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

                        <div className="bg-white rounded-[28px] shadow-sm border border-zinc-200/60 overflow-hidden">
                            <div className="hidden md:grid grid-cols-12 bg-zinc-50/80 px-6 py-4 border-b border-zinc-100 gap-4 items-center">
                                <div className="col-span-1">
                                    <button
                                        onClick={toggleAllOnPage}
                                        className="size-9 flex items-center justify-center rounded-xl hover:bg-zinc-200/50 transition-colors"
                                    >
                                        {selectedIds.size === paginatedServices.length && paginatedServices.length > 0 ? (
                                            <CheckSquare className="size-4 text-zinc-900" />
                                        ) : (
                                            <Square className="size-4 text-zinc-300" />
                                        )}
                                    </button>
                                </div>
                                <div className="col-span-2 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">Reference ID</div>
                                <div className="col-span-3 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">Service Name</div>
                                <div className="col-span-3 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">Staff In Charge</div>
                                <div className="col-span-2 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400 text-center">Status</div>
                                <div className="col-span-1 text-right text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">Actions</div>
                            </div>

                            <div className="divide-y divide-zinc-50/80 min-h-[400px]">
                                {isDataLoading ? (
                                    Array.from({ length: 6 }).map((_, i) => (
                                        <div key={i} className="px-6 py-4 animate-pulse grid grid-cols-12 gap-4 items-center">
                                            <Skeleton className="col-span-1 size-5 rounded" />
                                            <Skeleton className="col-span-2 h-4 w-20" />
                                            <Skeleton className="col-span-3 h-4 w-40" />
                                            <div className="col-span-3 flex gap-1"><Skeleton className="h-5 w-16 rounded-full" /><Skeleton className="h-5 w-16 rounded-full" /></div>
                                            <Skeleton className="col-span-2 h-6 w-20 rounded-full mx-auto" />
                                            <Skeleton className="col-span-1 h-4 w-12 ml-auto" />
                                        </div>
                                    ))
                                ) : paginatedServices.length > 0 ? (
                                    paginatedServices.map((protocol) => {
                                        const isSelected = selectedIds.has(protocol.id)
                                        return (
                                            <div key={protocol.id} className={cn("grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-zinc-50/70 transition-colors group cursor-default", isSelected && "bg-zinc-50/50")}>
                                                <div className="col-span-1">
                                                    <button
                                                        onClick={() => toggleSelection(protocol.id)}
                                                        className="size-9 flex items-center justify-center rounded-xl hover:bg-zinc-200/50 transition-colors"
                                                    >
                                                        {isSelected ? (
                                                            <CheckSquare className="size-4 text-blue-600" />
                                                        ) : (
                                                            <Square className="size-4 text-zinc-300 group-hover:text-zinc-400" />
                                                        )}
                                                    </button>
                                                </div>

                                                <div className="col-span-2">
                                                    <span className="text-[10px] font-mono font-black text-zinc-400 uppercase tracking-widest">#{protocol.uid || "SV-0000"}</span>
                                                </div>

                                                <div className="col-span-3 flex items-center gap-3">
                                                    <div className="p-2 bg-zinc-100 rounded-xl text-zinc-500 group-hover:bg-white group-hover:text-zinc-900 transition-colors border border-transparent group-hover:border-zinc-200">
                                                        <Settings2 className="size-3.5" />
                                                    </div>
                                                    <p className="text-[12px] font-black uppercase text-zinc-900 truncate tracking-tight">{protocol.label}</p>
                                                </div>

                                                <div className="col-span-3 flex flex-wrap gap-1.5">
                                                    {protocol.pic?.map((name: string, idx: number) => (
                                                        <Badge
                                                            key={idx}
                                                            variant="secondary"
                                                            className={cn("text-[8px] font-black uppercase border border-zinc-100/50 py-0.5 px-2", getStaffColor(name))}
                                                        >
                                                            {name}
                                                        </Badge>
                                                    ))}
                                                </div>

                                                <div className="col-span-2 flex justify-center">
                                                    <button
                                                        onClick={() => toggleStatus(protocol.id, protocol.isActive)}
                                                        className={cn("px-2.5 py-1 rounded-full text-[9px] font-black border transition-colors shadow-sm flex items-center gap-1.5",
                                                            protocol.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100" : "bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-100")}
                                                    >
                                                        <div className={cn("size-1.5 rounded-full", protocol.isActive ? "bg-emerald-500 animate-pulse" : "bg-rose-500")} />
                                                        {protocol.isActive ? "ONLINE" : "OFFLINE"}
                                                    </button>
                                                </div>

                                                <div className="col-span-1 flex justify-end">
                                                    <Button
                                                        onClick={() => {
                                                            setSelectedService(protocol)
                                                            setIsOpen(true)
                                                        }}
                                                        variant="ghost"
                                                        className="h-8 rounded-xl text-[10px] font-black text-zinc-400 hover:text-zinc-900 hover:bg-white border border-transparent hover:border-zinc-200 transition-all gap-2"
                                                    >
                                                        Manage <ArrowRight className="size-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        )
                                    })
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
                                        <div className="p-4 bg-zinc-50 rounded-3xl mb-4 border border-zinc-100">
                                            <Search className="size-8 opacity-20" />
                                        </div>
                                        <p className="text-[11px] font-black uppercase tracking-[0.2em]">No services found</p>
                                        <Button variant="ghost" onClick={handleReset} className="mt-2 text-[10px] font-black uppercase text-blue-600 hover:bg-blue-50">Clear search filters</Button>
                                    </div>
                                )}
                            </div>

                            <div className="px-6 py-4 bg-zinc-50/50 border-t border-zinc-100 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Show</span>
                                    <Select value={itemsPerPage} onValueChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}>
                                        <SelectTrigger className="h-8 w-[70px] rounded-lg bg-white border-zinc-200 text-[10px] font-black shadow-sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            <SelectItem value="10" className="text-[10px] font-bold">10</SelectItem>
                                            <SelectItem value="25" className="text-[10px] font-bold">25</SelectItem>
                                            <SelectItem value="50" className="text-[10px] font-bold">50</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">per page</span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mr-4">
                                        Page {currentPage} of {totalPages || 1}
                                    </p>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage(p => p - 1)}
                                        className="size-8 rounded-lg border-zinc-200 bg-white shadow-sm"
                                    >
                                        <ChevronLeft className="size-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        disabled={currentPage === totalPages || totalPages === 0}
                                        onClick={() => setCurrentPage(p => p + 1)}
                                        className="size-8 rounded-lg border-zinc-200 bg-white shadow-sm"
                                    >
                                        <ChevronRight className="size-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </main>

                    {/* MODAL INTEGRATION */}
                    <Dialog open={isOpen} onOpenChange={setIsOpen}>
                        <DialogContent className="max-w-4xl p-0 overflow-hidden border-none rounded-[32px] shadow-2xl bg-white">
                            <ServiceModalContent setIsOpen={setIsOpen} initialData={selectedService} />
                        </DialogContent>
                    </Dialog>
                </SidebarInset>
            </SidebarProvider>
        </ProtectedPageWrapper>
    )
}

function StatCard({ label, val, icon: Icon, isActive, onClick, isStatic, isStatus }: any) {
    return (
        <div
            onClick={!isStatic ? onClick : undefined}
            className={cn(
                // Standardized to rounded-[32px]
                "p-5 md:p-6 flex flex-col gap-3 rounded-[24px] bg-white transition-all shadow-sm border-2",
                !isStatic && "cursor-pointer active:scale-95",
                isActive ? "border-black shadow-md" : "border-transparent"
            )}
        >
            <div className="flex justify-between items-start">
                <div className={cn("p-2.5 rounded-xl", isStatus ? "bg-emerald-50 text-emerald-500" : "bg-zinc-50 text-zinc-400")}>
                    <Icon className="size-4 md:size-5" />
                </div>
                <span className="text-2xl md:text-3xl font-black text-zinc-900">{val}</span>
            </div>
            <p className="text-[9px] md:text-[10px] font-bold uppercase text-zinc-400 tracking-[0.15em]">{label}</p>
        </div>
    )
}