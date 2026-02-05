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
    Plus, Search, Activity, RotateCcw,
    Settings2, ClipboardCheck, ShieldCheck,
    TrendingUp, Loader2, ChevronLeft, ChevronRight,
    Info, X, ShieldAlert
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogTrigger } from "@/components/ui/dialog"
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

// FIREBASE
import { db } from "@/lib/firebase"
import { collection, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc } from "firebase/firestore"

// CUSTOM COMPONENTS
import { PageHeader } from "@/components/page-header"
import { ServiceModalContent } from "@/components/modals/service-modal"

export default function SiteVisitManagementPage() {
    const [userId, setUserId] = React.useState<string | null>(null)
    const [services, setServices] = React.useState<any[]>([])
    const [isDataLoading, setIsDataLoading] = React.useState(true)
    const [isOpen, setIsOpen] = React.useState(false)
    const [showInstructions, setShowInstructions] = React.useState(false)
    const [selectedService, setSelectedService] = React.useState<any>(null)
    const [filterActive, setFilterActive] = React.useState<boolean | null>(null)
    const [searchTerm, setSearchTerm] = React.useState("")

    // PAGINATION STATES
    const [currentPage, setCurrentPage] = React.useState(1)
    const [itemsPerPage, setItemsPerPage] = React.useState("10")

    React.useEffect(() => {
        setUserId(localStorage.getItem("userId"))

        const q = query(collection(db, "protocols"), orderBy("createdAt", "desc"))
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
            setIsDataLoading(false)
        })
        return () => unsubscribe()
    }, [])

    const deleteService = async (id: string) => {
        if (window.confirm("CONFIRM_ACTION: Permanent removal?")) {
            try { await deleteDoc(doc(db, "protocols", id)) } catch (e) { console.error(e) }
        }
    }

    const toggleServiceStatus = async (id: string, currentStatus: boolean) => {
        await updateDoc(doc(db, "protocols", id), { isActive: !currentStatus, updatedAt: new Date() })
    }

    // FILTER & PAGINATION LOGIC
    const filteredServices = services.filter(s => {
        const matchesSearch = s.label?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             s.uid?.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesStatus = filterActive === null ? true : s.isActive === filterActive
        return matchesSearch && matchesStatus
    })

    const limit = parseInt(itemsPerPage)
    const totalPages = Math.ceil(filteredServices.length / limit)
    const paginatedServices = filteredServices.slice((currentPage - 1) * limit, currentPage * limit)

    React.useEffect(() => { setCurrentPage(1) }, [searchTerm, filterActive, itemsPerPage])

    return (
        <ProtectedPageWrapper>
            <SidebarProvider defaultOpen={false}>
                <AppSidebar userId={userId} />
                <SidebarInset className="bg-[#F9FAFA] pb-24 md:pb-0 relative font-sans">

                    <PageHeader
                        title="PROTOCOL_REGISTRY"
                        version="BUILD: CORP-V2.8.ENG"
                        showBackButton={true}
                        trigger={<SidebarTrigger className="mr-2" />}
                        actions={
                            <Dialog open={isOpen} onOpenChange={(val) => { setIsOpen(val); if (!val) setSelectedService(null); }}>
                                <DialogTrigger asChild>
                                    <Button className="hidden md:flex rounded-md bg-[#121212] text-white font-bold uppercase text-[10px] tracking-widest px-6 h-10 hover:bg-black transition-all shadow-md">
                                        <Plus className="mr-2 size-4" /> Register Protocol
                                    </Button>
                                </DialogTrigger>
                                <ServiceModalContent setIsOpen={setIsOpen} initialData={selectedService} onDelete={deleteService} />
                            </Dialog>
                        }
                    />

                    <main className="flex flex-1 flex-col gap-6 p-4 md:p-10 max-w-7xl mx-auto w-full">

                        {/* DISMISSIBLE OPERATING MANUAL */}
                        {showInstructions ? (
                            <div className="bg-[#121212] p-8 rounded-lg shadow-2xl border border-white/5 relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
                                <button 
                                    onClick={() => setShowInstructions(false)} 
                                    className="absolute top-5 right-5 text-white/40 hover:text-white transition-colors"
                                >
                                    <X className="size-5" />
                                </button>
                                
                                <div className="flex items-center gap-3 mb-6">
                                    <ShieldAlert className="size-5 text-emerald-400" />
                                    <span className="text-[11px] font-black text-white uppercase tracking-[0.3em]">Engineering Operating Manual</span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    <div className="space-y-3">
                                        <h4 className="text-emerald-400 text-[10px] font-black uppercase tracking-widest">01. Registration</h4>
                                        <p className="text-[10px] text-white/50 font-bold uppercase leading-relaxed">
                                            Initialize new service nodes via the Register Protocol control. Ensure UID references follow the established naming convention.
                                        </p>
                                    </div>
                                    <div className="space-y-3">
                                        <h4 className="text-emerald-400 text-[10px] font-black uppercase tracking-widest">02. Assignment</h4>
                                        <p className="text-[10px] text-white/50 font-bold uppercase leading-relaxed">
                                            Define the engineering department PIC. Mapping correct personnel ensures data flows to the correct regional dashboards.
                                        </p>
                                    </div>
                                    <div className="space-y-3">
                                        <h4 className="text-emerald-400 text-[10px] font-black uppercase tracking-widest">03. Deployment</h4>
                                        <p className="text-[10px] text-white/50 font-bold uppercase leading-relaxed">
                                            Toggle status to ONLINE for global visibility. Inactive nodes are archived but preserved for historical audit trails.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <button 
                                onClick={() => setShowInstructions(true)} 
                                className="flex items-center gap-2 text-[10px] font-black uppercase text-black/40 hover:text-[#121212] transition-colors pl-1 w-fit"
                            >
                                <Info className="size-4" /> Open Operating Manual
                            </button>
                        )}

                        {/* STATS SECTION */}
                        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard label="Total Nodes" val={services.length} icon={ClipboardCheck} isActive={filterActive === null} onClick={() => setFilterActive(null)} color="#121212" />
                            <StatCard label="Live Ops" val={services.filter(s => s.isActive).length} icon={Activity} isActive={filterActive === true} onClick={() => setFilterActive(true)} color="#10B981" />
                            <StatCard label="Efficiency" val="94%" icon={TrendingUp} color="#121212" isStatic />
                            <StatCard label="Audit" val="READY" icon={ShieldCheck} color="#121212" isStatic />
                        </section>

                        {/* CONTROL HUD */}
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="relative flex-1 group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-black/30 group-focus-within:text-black transition-colors" />
                                <input
                                    placeholder="QUERY PROTOCOL UID OR LABEL..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-11 pr-4 rounded-md border border-black/10 bg-white h-12 text-[11px] font-bold tracking-tight focus:outline-none focus:ring-1 focus:ring-black shadow-sm transition-all uppercase font-mono"
                                />
                            </div>
                            <Button
                                variant="outline"
                                onClick={() => { setFilterActive(null); setSearchTerm(""); setCurrentPage(1); }}
                                className="rounded-md border-black/10 h-12 px-6 uppercase font-bold text-[10px] tracking-widest bg-white hover:bg-[#121212] hover:text-white transition-all shadow-sm"
                            >
                                <RotateCcw className="mr-2 size-3" /> Reset Registry
                            </Button>
                        </div>

                        {/* REGISTRY CONTAINER */}
                        <section className="bg-white border border-black/5 rounded-lg shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                            <div className="hidden md:grid grid-cols-5 bg-[#F9FAFA] border-b border-black/5 p-5">
                                {["UID_REF", "Protocol Label", "Engineering PIC", "Status", "Control"].map((h) => (
                                    <span key={h} className="text-[10px] font-bold uppercase tracking-[0.15em] text-black/40">{h}</span>
                                ))}
                            </div>

                            <div className="divide-y divide-black/5 flex-1">
                                {isDataLoading ? (
                                    <LoadingState />
                                ) : paginatedServices.length === 0 ? (
                                    <EmptyState />
                                ) : (
                                    paginatedServices.map((s) => (
                                        <div key={s.id} className="grid grid-cols-1 md:grid-cols-5 gap-4 p-5 hover:bg-[#F9FAFA] transition-all items-center group">
                                            <span className="text-[11px] font-bold text-black font-mono">[{s.uid || "N/A"}]</span>
                                            <span className="text-sm font-bold uppercase tracking-tight text-[#121212]">{s.label}</span>
                                            <div className="flex flex-wrap gap-1">
                                                {s.pic?.map((n: string) => (
                                                    <Badge key={n} variant="outline" className="rounded-sm border-black/10 text-[8px] font-black bg-white uppercase px-2 py-0">
                                                        {n}
                                                    </Badge>
                                                ))}
                                            </div>
                                            <div
                                                onClick={() => toggleServiceStatus(s.id, s.isActive)}
                                                className={cn(
                                                    "w-fit px-3 py-1 border rounded-sm text-[9px] font-black tracking-widest cursor-pointer transition-all",
                                                    s.isActive ? "bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm" : "bg-black/[0.03] border-black/10 text-black/30"
                                                )}
                                            >
                                                {s.isActive ? "● ONLINE" : "○ OFFLINE"}
                                            </div>
                                            <div className="flex justify-end">
                                                <Button
                                                    onClick={() => { setSelectedService(s); setIsOpen(true) }}
                                                    variant="ghost"
                                                    className="rounded-md text-[10px] font-bold uppercase hover:bg-[#121212] hover:text-white transition-all h-8 px-4"
                                                >
                                                    <Settings2 className="size-3 mr-2" /> Settings
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* PAGINATION FOOTER */}
                            <div className="flex flex-col md:flex-row items-center justify-between px-6 py-5 bg-[#F9FAFA] border-t border-black/5 gap-4">
                                <div className="flex items-center gap-4">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-black/40">
                                        Registry Index: {paginatedServices.length} / {filteredServices.length}
                                    </span>
                                    <div className="flex items-center gap-2 border-l border-black/10 pl-4">
                                        <span className="text-[9px] font-black uppercase text-black/30">Density:</span>
                                        <Select value={itemsPerPage} onValueChange={setItemsPerPage}>
                                            <SelectTrigger className="h-8 w-[75px] bg-white border-black/10 text-[10px] font-bold rounded-sm focus:ring-0">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-white border-black/10">
                                                {["5", "10", "20", "50"].map(v => (
                                                    <SelectItem key={v} value={v} className="text-[10px] font-bold uppercase">{v}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-black/40">
                                        Page {currentPage} / {totalPages || 1}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline" size="icon"
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                            className="size-9 rounded-md border-black/10 bg-white hover:bg-[#121212] hover:text-white transition-all shadow-sm disabled:opacity-30"
                                        >
                                            <ChevronLeft className="size-4" />
                                        </Button>
                                        <Button
                                            variant="outline" size="icon"
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            disabled={currentPage === totalPages || totalPages === 0}
                                            className="size-9 rounded-md border-black/10 bg-white hover:bg-[#121212] hover:text-white transition-all shadow-sm disabled:opacity-30"
                                        >
                                            <ChevronRight className="size-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </main>

                    {/* MOBILE FAB */}
                    <div className="md:hidden fixed bottom-8 right-6 z-50">
                        <Button
                            onClick={() => { setSelectedService(null); setIsOpen(true) }}
                            className="size-16 rounded-full bg-[#121212] text-white shadow-2xl hover:bg-black active:scale-90 transition-all flex flex-col items-center justify-center border border-white/10"
                        >
                            <div className="size-6 bg-white/10 rounded-full flex items-center justify-center mb-1">
                                <span className="text-[10px] font-black text-white">E</span>
                            </div>
                            <Plus className="size-5 stroke-[3px]" />
                        </Button>
                    </div>

                </SidebarInset>
            </SidebarProvider>
        </ProtectedPageWrapper>
    )
}

function StatCard({ label, val, icon: Icon, isActive, onClick, color, isStatic }: any) {
    return (
        <div
            onClick={!isStatic ? onClick : undefined}
            className={cn(
                "relative p-5 flex flex-col gap-3 transition-all duration-300 border rounded-lg bg-white shadow-sm",
                !isStatic && "cursor-pointer",
                isActive ? "border-black ring-1 ring-black/5 translate-y-[-2px]" : "border-black/5 opacity-80 hover:opacity-100 hover:border-black/20",
                isStatic && "opacity-60"
            )}
        >
            <div className="flex justify-between items-start">
                <div className="p-2 rounded-md" style={{ backgroundColor: isActive ? `${color}15` : '#F9FAFA' }}>
                    <Icon className="size-5" style={{ color: isActive ? color : '#707070' }} />
                </div>
                <span className="text-2xl font-bold tracking-tighter text-[#121212]">
                    {val.toString().padStart(2, '0')}
                </span>
            </div>
            <span className={cn("text-[10px] font-bold uppercase tracking-[0.1em]", isActive ? "text-black" : "text-black/40")}>
                {label}
            </span>
            {isActive && !isStatic && (
                <div className="absolute top-2 right-2 size-1.5 rounded-full" style={{ backgroundColor: color }} />
            )}
        </div>
    );
}

const LoadingState = () => (
    <div className="flex flex-col items-center justify-center p-20 gap-3 flex-1">
        <Loader2 className="size-6 animate-spin text-black/20" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-black/30">Syncing Registry...</p>
    </div>
)

const EmptyState = () => (
    <div className="p-20 text-center flex-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-black/20">Registry_Null // No Protocols Found</p>
    </div>
)