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
    Settings2, ClipboardCheck, Users, ShieldCheck, 
    TrendingUp, Loader2, FilterX
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogTrigger } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

// FIREBASE
import { db } from "@/lib/firebase"
import { collection, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc } from "firebase/firestore"

// CUSTOM COMPONENTS
import { PageHeader } from "@/components/page-header"
import { ServiceModalContent } from "@/components/modals/service-modal"

export default function SiteVisitManagementPage() {
    const router = useRouter()
    const [userId, setUserId] = React.useState<string | null>(null)
    const [isOpen, setIsOpen] = React.useState(false)
    const [services, setServices] = React.useState<any[]>([])
    const [isDataLoading, setIsDataLoading] = React.useState(true)
    const [selectedService, setSelectedService] = React.useState<any>(null)
    const [filterActive, setFilterActive] = React.useState<boolean | null>(null)
    const [searchTerm, setSearchTerm] = React.useState("")

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

    const filteredServices = services.filter(s => {
        const matchesSearch = s.label?.toLowerCase().includes(searchTerm.toLowerCase()) || s.uid?.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesStatus = filterActive === null ? true : s.isActive === filterActive
        return matchesSearch && matchesStatus
    })

    return (
        <ProtectedPageWrapper>
            <SidebarProvider defaultOpen={false}>
                <AppSidebar userId={userId} />
                <SidebarInset className="bg-[#F9FAFA] pb-24 md:pb-0 relative font-sans">
                    
                    <PageHeader 
                        title="PROTOCOL_MANAGEMENT" 
                        version="BUILD: CORP-V2.6" 
                        showBackButton={true}
                        trigger={<SidebarTrigger className="mr-2" />}
                        actions={
                            <Dialog open={isOpen} onOpenChange={(val) => { setIsOpen(val); if (!val) setSelectedService(null); }}>
                                <DialogTrigger asChild>
                                    <Button className="hidden md:flex rounded-md bg-[#121212] text-white font-bold uppercase text-[10px] tracking-widest px-6 h-10 hover:bg-black transition-all shadow-md">
                                        <Plus className="mr-2 size-4" /> Register New Protocol
                                    </Button>
                                </DialogTrigger>
                                <ServiceModalContent setIsOpen={setIsOpen} initialData={selectedService} onDelete={deleteService} />
                            </Dialog>
                        }
                    />

                    <main className="flex flex-1 flex-col gap-6 p-4 md:p-10 max-w-7xl mx-auto w-full">
                        
                        {/* SYNCHRONIZED STAT CARDS */}
                        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard 
                                label="Total Matrix" 
                                val={services.length} 
                                icon={ClipboardCheck} 
                                isActive={filterActive === null} 
                                onClick={() => setFilterActive(null)} 
                                color="#121212"
                            />
                            <StatCard 
                                label="Active Ops" 
                                val={services.filter(s => s.isActive).length} 
                                icon={Activity} 
                                isActive={filterActive === true} 
                                onClick={() => setFilterActive(true)} 
                                color="#10B981"
                            />
                            <StatCard label="Efficiency" val="94%" icon={TrendingUp} color="#3B82F6" isStatic />
                            <StatCard label="Audit" val="READY" icon={ShieldCheck} color="#121212" isStatic />
                        </section>

                        {/* SEARCH & FILTERS */}
                        <div className="flex flex-col md:flex-row gap-4 mt-2">
                            <div className="relative flex-1 group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-black/30 group-focus-within:text-black transition-colors" />
                                <input 
                                    placeholder="Filter by UID or Service Label..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-11 pr-4 rounded-md border border-black/10 bg-white h-12 text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black shadow-sm transition-all uppercase font-mono"
                                />
                            </div>
                            <Button 
                                variant="outline" 
                                onClick={() => {setFilterActive(null); setSearchTerm("")}} 
                                className="rounded-md border-black/10 h-12 px-6 uppercase font-bold text-[10px] tracking-widest bg-white hover:bg-black hover:text-white transition-all shadow-sm"
                            >
                                <RotateCcw className="mr-2 size-3" /> Reset Matrix
                            </Button>
                        </div>

                        {/* PROTOCOL LIST CONTAINER */}
                        <section className="bg-white border border-black/5 rounded-lg shadow-sm overflow-hidden">
                            <div className="hidden md:grid grid-cols-5 bg-[#F9FAFA] border-b border-black/5 p-5">
                                {["UID_REF", "Service Label", "Personnel", "Status", "Control"].map((h) => (
                                    <span key={h} className="text-[10px] font-bold uppercase tracking-[0.15em] text-black/40">{h}</span>
                                ))}
                            </div>

                            <div className="divide-y divide-black/5">
                                {isDataLoading ? (
                                    <LoadingState />
                                ) : filteredServices.length === 0 ? (
                                    <EmptyState />
                                ) : (
                                    filteredServices.map((s) => (
                                        <div key={s.id} className="grid grid-cols-1 md:grid-cols-5 gap-4 p-5 hover:bg-[#F9FAFA] transition-all items-center">
                                            <span className="text-[11px] font-bold text-black font-mono">[{s.uid}]</span>
                                            
                                            <span className="text-sm font-bold uppercase tracking-tight text-black">{s.label}</span>

                                            <div className="flex flex-wrap gap-1">
                                                {s.pic?.map((n: string) => (
                                                    <Badge key={n} variant="outline" className="rounded-sm border-black/10 text-[9px] font-bold bg-white uppercase px-2 py-0">
                                                        {n}
                                                    </Badge>
                                                ))}
                                            </div>

                                            <div 
                                                onClick={() => toggleServiceStatus(s.id, s.isActive)} 
                                                className={cn(
                                                    "w-fit px-3 py-1 border rounded-sm text-[9px] font-bold tracking-widest cursor-pointer transition-all",
                                                    s.isActive 
                                                        ? "bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm" 
                                                        : "bg-black/[0.03] border-black/10 text-black/30"
                                                )}
                                            >
                                                {s.isActive ? "● ONLINE" : "○ OFFLINE"}
                                            </div>

                                            <div className="flex justify-end">
                                                <Button 
                                                    onClick={() => { setSelectedService(s); setIsOpen(true) }} 
                                                    variant="ghost" 
                                                    className="rounded-md text-[10px] font-bold uppercase hover:bg-black hover:text-white transition-all h-8"
                                                >
                                                    <Settings2 className="size-3 mr-2" /> Settings
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </section>
                    </main>

                    {/* MOBILE FAB - CONSISTENT WITH ACTIVITY LIST */}
                    <div className="md:hidden fixed bottom-8 right-6 z-50">
                        <Button 
                            onClick={() => { setSelectedService(null); setIsOpen(true) }} 
                            className="size-16 rounded-full bg-[#121212] text-white shadow-2xl hover:bg-black active:scale-90 transition-all flex flex-col items-center justify-center border border-white/10"
                        >
                            <div className="size-6 bg-white/10 rounded-full flex items-center justify-center mb-1">
                                <span className="text-[10px] font-black">P</span>
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
                <div 
                    className="p-2 rounded-md" 
                    style={{ backgroundColor: isActive ? `${color}15` : '#F9FAFA' }}
                >
                    <Icon className="size-5" style={{ color: isActive ? color : '#707070' }} />
                </div>
                <span className="text-2xl font-bold tracking-tighter text-[#121212]">
                    {val.toString().padStart(2, '0')}
                </span>
            </div>
            <span className={cn(
                "text-[10px] font-bold uppercase tracking-[0.1em]",
                isActive ? "text-black" : "text-black/40"
            )}>
                {label}
            </span>
            {isActive && !isStatic && (
                <div className="absolute top-2 right-2 size-1.5 rounded-full" style={{ backgroundColor: color }} />
            )}
        </div>
    );
}

const LoadingState = () => (
    <div className="flex flex-col items-center justify-center p-20 gap-3">
        <Loader2 className="size-6 animate-spin text-black/20" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-black/30">Syncing Registry...</p>
    </div>
)

const EmptyState = () => (
    <div className="p-20 text-center">
        <p className="text-[10px] font-bold uppercase tracking-widest text-black/20">Registry_Null // No Protocols Found</p>
    </div>
)