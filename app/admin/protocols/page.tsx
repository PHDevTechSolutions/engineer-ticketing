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
    Info, X, ArrowRight
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog } from "@/components/ui/dialog"
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

    const filteredServices = services.filter(s => {
        const matchesSearch = s.label?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.uid?.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesStatus = filterActive === null ? true : s.isActive === filterActive
        return matchesSearch && matchesStatus
    })

    const limit = parseInt(itemsPerPage)
    const totalPages = Math.ceil(filteredServices.length / limit)
    const paginatedServices = filteredServices.slice((currentPage - 1) * limit, currentPage * limit)

    const getStaffColor = (name: string) => {
        const colors = ['bg-blue-50 text-blue-600', 'bg-purple-50 text-purple-600', 'bg-orange-50 text-orange-600', 'bg-rose-50 text-rose-600'];
        const index = name.length % colors.length;
        return colors[index];
    }

    return (
        <ProtectedPageWrapper>
            <SidebarProvider defaultOpen={false}>
                <AppSidebar userId={userId} />

                <SidebarInset className="relative bg-[#F4F7F7] pb-24 md:pb-0 font-sans">
                    <PageHeader
                        title="SERVICE HUB"
                        version="V2.8"
                        showBackButton={true}
                        trigger={<SidebarTrigger className="mr-2" />}
                        actions={
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => { setShowInstructions(!showInstructions); setGuideStep(1) }}
                                    className={cn("rounded-full h-10 w-10", showInstructions && "bg-blue-50 text-blue-600")}
                                >
                                    <Info className="size-5" />
                                </Button>
                                <Button onClick={() => { setSelectedService(null); setIsOpen(true) }} className="hidden md:flex bg-black hover:bg-zinc-800 text-white px-5 rounded-xl h-10 text-xs font-bold tracking-tight">
                                    <Plus className="mr-2 size-4" /> ADD NEW SERVICE
                                </Button>
                            </div>
                        }
                    />

                    <main className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">

                        {/* USER GUIDE */}
                        {showInstructions && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/5 pointer-events-none">
                                <div className="bg-white p-8 rounded-[24px] shadow-2xl border border-zinc-200 w-[320px] pointer-events-auto animate-in zoom-in-95 duration-200">
                                    <div className="flex justify-between items-start mb-6">
                                        <Badge className="bg-rose-500 hover:bg-rose-600 text-[10px] font-bold px-3 py-1 uppercase tracking-wider">
                                            Guide {guideStep}/3
                                        </Badge>
                                        <button onClick={() => setShowInstructions(false)} className="text-zinc-400 hover:text-zinc-900">
                                            <X className="size-5" />
                                        </button>
                                    </div>

                                    <div className="space-y-2 mb-8">
                                        <h3 className="font-black text-xl tracking-tight text-zinc-900 uppercase">
                                            {guideStep === 1 && "Monitor Items"}
                                            {guideStep === 2 && "Update Status"}
                                            {guideStep === 3 && "Search Filters"}
                                        </h3>
                                        <p className="text-sm leading-relaxed text-zinc-500">
                                            {guideStep === 1 && "The dashboard shows real-time items. Check 'Online Now' to see active services."}
                                            {guideStep === 2 && "Click on the Status badge within the list to toggle between Online and Offline."}
                                            {guideStep === 3 && "Use the search bar to find services by name or ID. Click reset to clear filters."}
                                        </p>
                                    </div>

                                    <Button
                                        onClick={() => guideStep < 3 ? setGuideStep(guideStep + 1) : setShowInstructions(false)}
                                        className="w-full bg-zinc-900 hover:bg-black text-white rounded-2xl h-12 font-bold text-xs"
                                    >
                                        {guideStep === 3 ? "GOT IT!" : "NEXT"} <ChevronRight className="ml-2 size-4" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* SUMMARY CARDS */}
                        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard label="TOTAL ITEMS" val={services.length} icon={ClipboardCheck} isActive={filterActive === null} onClick={() => setFilterActive(null)} />
                            <StatCard label="ONLINE NOW" val={services.filter(s => s.isActive).length} icon={Activity} isActive={filterActive === true} onClick={() => setFilterActive(true)} isStatus />
                            <StatCard label="PERFORMANCE" val="94%" icon={TrendingUp} isStatic />
                            <StatCard label="SECURITY" val="OK" icon={ShieldCheck} isStatic />
                        </section>

                        {/* SEARCH BAR */}
                        <div className="flex flex-col  md:flex-row gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
                                <input
                                    placeholder="Search by ID or name..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-11 h-12 rounded-2xl border-none bg-white shadow-sm ring-1 ring-zinc-200 focus:ring-2 focus:ring-black outline-none transition-all text-sm"
                                />
                            </div>
                            <Button variant="outline" onClick={() => { setFilterActive(null); setSearchTerm("") }} className="h-12 rounded-2xl bg-white border-zinc-200 font-bold text-[10px] tracking-widest uppercase">
                                <RotateCcw className="mr-2 size-3" /> RESET
                            </Button>
                        </div>

                        {/* MAIN DATA LIST - Standardized to rounded-[32px] */}
                        <div className="bg-white rounded-[24px] shadow-sm border border-zinc-200/60 overflow-hidden">
                            <div className="hidden md:grid grid-cols-6 bg-zinc-50/50 p-6 border-b border-zinc-100 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                                <span>Reference ID</span>
                                <span>Service Name</span>
                                <span className="col-span-2">Staff In Charge</span>
                                <span>Status</span>
                                <span className="text-right">Actions</span>
                            </div>

                            <div className="divide-y divide-zinc-50">
                                {isDataLoading ? (
                                    <div className="p-20 text-center flex flex-col items-center gap-3">
                                        <Loader2 className="animate-spin text-zinc-200 size-10" />
                                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Refreshing engiconnect...</p>
                                    </div>
                                ) : paginatedServices.map((s) => (
                                    <div key={s.id} className="grid grid-cols-1 md:grid-cols-6 gap-4 p-6 items-center hover:bg-zinc-50/40 transition-colors">
                                        <span className="text-[10px] font-mono font-bold text-zinc-400">#{s.uid || "SV-0000"}</span>
                                        <span className="text-sm font-bold text-zinc-900 uppercase">{s.label}</span>
                                        <div className="col-span-2 flex flex-wrap gap-2">
                                            {s.pic?.map((n: string) => (
                                                <Badge key={n} variant="outline" className={cn("px-2.5 py-1 rounded-lg text-[10px] font-bold", getStaffColor(n))}>
                                                    {n}
                                                </Badge>
                                            ))}
                                        </div>
                                        <div>
                                            <button
                                                onClick={() => toggleStatus(s.id, s.isActive)}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-2 border shadow-sm",
                                                    s.isActive ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-zinc-100 text-zinc-400 border-zinc-200"
                                                )}
                                            >
                                                <span className={cn("size-1.5 rounded-full", s.isActive ? "bg-emerald-500 animate-pulse" : "bg-zinc-400")} />
                                                {s.isActive ? "ONLINE" : "OFFLINE"}
                                            </button>
                                        </div>
                                        <div className="flex justify-end">
                                            <Button onClick={() => { setSelectedService(s); setIsOpen(true) }} variant="ghost" className="h-8 rounded-xl text-[11px] font-bold hover:bg-black hover:text-white transition-all group">
                                                Manage <ArrowRight className="size-3 ml-2 group-hover:translate-x-1" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* PAGINATION */}
                            <div className="p-5 bg-zinc-50/50 border-t border-zinc-100 flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <span className="text-[10px] font-bold text-zinc-400 uppercase">Page Size:</span>
                                    <Select value={itemsPerPage} onValueChange={setItemsPerPage}>
                                        <SelectTrigger className="w-16 h-8 bg-white border-zinc-200 rounded-lg text-xs font-bold"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {["5", "10", "20"].map(v => <SelectItem key={v} value={v} className="text-xs font-bold">{v}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} variant="outline" size="icon" className="size-9 rounded-xl bg-white"><ChevronLeft className="size-4" /></Button>
                                    <div className="px-5 py-2 bg-white rounded-xl border border-zinc-200 text-xs font-bold">{currentPage} / {totalPages || 1}</div>
                                    <Button disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(p => p + 1)} variant="outline" size="icon" className="size-9 rounded-xl bg-white"><ChevronRight className="size-4" /></Button>
                                </div>
                            </div>
                        </div>
                    </main>

                    <Dialog open={isOpen} onOpenChange={setIsOpen}>
                        <ServiceModalContent setIsOpen={setIsOpen} initialData={selectedService} />
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