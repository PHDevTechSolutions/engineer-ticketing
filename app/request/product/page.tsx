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
    Plus, Search, RotateCcw,
    TrendingUp, ChevronLeft, ChevronRight,
    ArrowRight, Clock, AlertCircle,
    Layers, PlayCircle, 
    Filter, ArrowUpDown, ChevronUp, ChevronDown,
    CheckSquare, Square, CheckCircle2,
    Download, X, Calendar, Package
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import { collection, onSnapshot, query, orderBy, doc, writeBatch, Timestamp } from "firebase/firestore"

// SHARED COMPONENTS
import { PageHeader } from "@/components/page-header"

// TYPES
interface ProductRequest {
    id: string;
    uid: string;
    projectName: string;
    productType: string; // e.g., SPF
    quantity: number;
    status: string;
    priority: string;
    createdAt: Timestamp;
    createdBy?: string;
    userId?: string;
}

const getStatusStyles = (status: string) => {
    const s = (status || "PENDING").toUpperCase();
    switch (s) {
        case "APPROVED": return "bg-emerald-50 text-emerald-700 border-emerald-200 ring-4 ring-emerald-500/5";
        case "REVIEWING": return "bg-blue-50 text-blue-700 border-blue-200 ring-4 ring-blue-500/5";
        case "REJECTED": return "bg-rose-50 text-rose-700 border-rose-200";
        default: return "bg-amber-50 text-amber-700 border-amber-200 ring-4 ring-amber-500/5";
    }
}

export default function ProductRequestPage() {
    const router = useRouter()
    const [userId, setUserId] = React.useState<string | null>(null)
    const [requests, setRequests] = React.useState<ProductRequest[]>([])
    const [isDataLoading, setIsDataLoading] = React.useState(true)
    
    const [filterStatus, setFilterStatus] = React.useState<string | null>(null)
    const [searchTerm, setSearchTerm] = React.useState("")
    const [selectedIds, setSelectedIds] = React.useState<string[]>([])

    React.useEffect(() => {
        const storedId = localStorage.getItem("userId")
        setUserId(storedId);
        
        // Fetching from a dedicated "product_requests" collection
        const q = query(collection(db, "product_requests"), orderBy("createdAt", "desc"))
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setRequests(snapshot.docs.map(doc => ({ 
                id: doc.id, 
                uid: doc.id.slice(-6).toUpperCase(), 
                ...doc.data() 
            })) as ProductRequest[]);
            setIsDataLoading(false);
        });
        return () => unsubscribe();
    }, [])

    const filteredRequests = React.useMemo(() => {
        return requests.filter(r => {
            const matchesSearch = (r.projectName + r.uid).toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = filterStatus === null || (r.status || "PENDING").toUpperCase() === filterStatus;
            return matchesSearch && matchesStatus;
        })
    }, [requests, searchTerm, filterStatus]);

    return (
        <ProtectedPageWrapper>
            <SidebarProvider defaultOpen={false}>
                <AppSidebar userId={userId} />
                <SidebarInset className="bg-[#F8FAFA] pb-24 md:pb-10">
                    <PageHeader 
                        title="PRODUCT REQUESTS" 
                        version="SPF V1.0" 
                        showBackButton 
                        trigger={<SidebarTrigger className="mr-2" />} 
                        actions={
                            <Button onClick={() => router.push('/request/product/add')} className="hidden md:flex bg-zinc-900 text-white rounded-xl h-8 text-[9px] font-bold tracking-widest px-4">
                                <Plus className="size-3 mr-1.5" /> NEW SPF REQUEST
                            </Button>
                        }
                    />

                    {/* MOBILE FAB */}
                    <Button 
                        onClick={() => router.push('/request/product/add')} 
                        className="md:hidden fixed bottom-6 right-6 size-14 rounded-full bg-zinc-900 text-white shadow-2xl z-40 p-0 flex items-center justify-center border-4 border-white"
                    >
                        <Plus className="size-7" />
                    </Button>

                    <main className="p-4 md:p-6 max-w-7xl mx-auto w-full space-y-4">
                        {/* Stats Section */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            <StatCard label="Total Requests" val={requests.length} icon={Layers} isActive={filterStatus === null} onClick={() => setFilterStatus(null)} variant="default" loading={isDataLoading} />
                            <StatCard label="Pending Approval" val={requests.filter(r => (r.status || "PENDING").toUpperCase() === "PENDING").length} icon={Clock} isActive={filterStatus === "PENDING"} onClick={() => setFilterStatus("PENDING")} variant="warning" loading={isDataLoading} />
                            <StatCard label="In Review" val={requests.filter(r => r.status?.toUpperCase() === "REVIEWING").length} icon={PlayCircle} isActive={filterStatus === "REVIEWING"} onClick={() => setFilterStatus("REVIEWING")} variant="info" loading={isDataLoading} />
                            <StatCard label="Approval Rate" val={`${requests.length > 0 ? Math.round((requests.filter(r => r.status?.toUpperCase() === "APPROVED").length / requests.length) * 100) : 0}%`} icon={TrendingUp} isStatic variant="emerald" loading={isDataLoading} />
                        </div>

                        {/* Search & Filter */}
                        <div className="flex flex-col md:flex-row gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
                                <input 
                                    placeholder="Search by project or ID..." 
                                    value={searchTerm} 
                                    onChange={(e) => setSearchTerm(e.target.value)} 
                                    className="w-full pl-11 h-11 rounded-xl bg-white shadow-sm ring-1 ring-zinc-200 outline-none focus:ring-2 focus:ring-black transition-all text-sm font-medium" 
                                />
                            </div>
                            <Button variant="outline" onClick={() => { setFilterStatus(null); setSearchTerm(""); }} className="h-11 px-4 rounded-xl bg-white font-bold text-[10px] tracking-widest border-zinc-200">
                                <RotateCcw className="size-3" />
                            </Button>
                        </div>

                        {/* Standardized Table */}
                        <div className="bg-white rounded-[24px] shadow-sm border border-zinc-200/60 overflow-hidden">
                            <div className="hidden md:grid grid-cols-[50px_1fr_2fr_1fr_1fr_60px] bg-zinc-50/50 px-6 py-4 border-b text-[9px] font-black uppercase tracking-[0.15em] text-zinc-400 items-center">
                                <Square className="size-4" />
                                <span>Ref ID</span>
                                <span>Project & Product</span>
                                <span>Status</span>
                                <span>Date</span>
                                <span className="text-right">Action</span>
                            </div>

                            <div className="divide-y divide-zinc-50">
                                {isDataLoading ? (
                                    <div className="p-10 text-center animate-pulse text-[10px] font-bold uppercase text-zinc-400">Loading Product Requests...</div>
                                ) : filteredRequests.map((r) => (
                                    <div key={r.id} className="group transition-all px-4 py-4 md:px-6 md:py-4 hover:bg-zinc-50/50">
                                        <div className="hidden md:grid md:grid-cols-[50px_1fr_2fr_1fr_1fr_60px] gap-4 items-center">
                                            <Square className="size-4 text-zinc-200" />
                                            <span className="text-[10px] font-mono font-bold text-zinc-400">#{r.uid}</span>
                                            <div className="flex flex-col">
                                                <span className="text-[13px] font-black text-zinc-900 uppercase truncate leading-none mb-1">{r.projectName}</span>
                                                <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wide flex items-center gap-1">
                                                    <Package className="size-2.5" /> {r.productType || "SPF Product"} ({r.quantity || 0} units)
                                                </span>
                                            </div>
                                            <Badge className={cn("rounded-full px-4 py-1 text-[9px] font-black border uppercase shadow-none tracking-wider w-fit", getStatusStyles(r.status))}>
                                                {r.status || "PENDING"}
                                            </Badge>
                                            <span className="text-[10px] font-bold text-zinc-400">
                                                {r.createdAt?.toDate ? new Date(r.createdAt.toDate()).toLocaleDateString() : "---"}
                                            </span>
                                            <div className="flex justify-end">
                                                <Button variant="ghost" onClick={() => router.push(`/request/product/${r.id}`)} className="h-9 w-9 p-0 rounded-xl hover:bg-black hover:text-white transition-all">
                                                    <ArrowRight className="size-4" />
                                                </Button>
                                            </div>
                                        </div>
                                        
                                        {/* Mobile View */}
                                        <div className="md:hidden space-y-3">
                                            <div className="flex justify-between items-start">
                                                <span className="text-[10px] font-mono font-bold text-zinc-400">#{r.uid}</span>
                                                <Badge className={cn("rounded-full px-3 py-0.5 text-[8px] font-black border uppercase", getStatusStyles(r.status))}>
                                                    {r.status || "PENDING"}
                                                </Badge>
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-black text-zinc-900 uppercase">{r.projectName}</h3>
                                                <p className="text-[10px] text-zinc-400 font-bold uppercase mt-1">SPF Product Request • {r.quantity} Qty</p>
                                            </div>
                                            <div className="flex items-center justify-between pt-2 border-t border-zinc-50">
                                                <span className="text-[9px] font-bold text-zinc-400 flex items-center gap-1">
                                                    <Calendar className="size-3" /> {r.createdAt?.toDate ? new Date(r.createdAt.toDate()).toLocaleDateString() : "---"}
                                                </span>
                                                <Button size="icon" variant="ghost" onClick={() => router.push(`/request/product/${r.id}`)} className="h-8 w-8 rounded-lg bg-zinc-100">
                                                    <ArrowRight className="size-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </main>
                </SidebarInset>
            </SidebarProvider>
        </ProtectedPageWrapper>
    )
}

// Reuse the StatCard component from Dialux Hub to keep visuals consistent
function StatCard({ label, val, icon: Icon, isActive, onClick, isStatic, variant = 'default', loading }: { label: string, val: any, icon: any, isActive?: boolean, onClick?: any, isStatic?: boolean, variant?: string, loading?: boolean }) {
    const vars = {
        default: "text-zinc-400 bg-zinc-100",
        warning: "text-amber-600 bg-amber-50",
        info: "text-blue-600 bg-blue-50",
        emerald: "text-emerald-700 bg-emerald-50",
    }
    return (
        <button 
            disabled={isStatic || loading} 
            onClick={onClick} 
            className={cn(
                "p-4 md:p-5 flex flex-col justify-between rounded-[24px] bg-white transition-all border text-left shadow-sm min-w-[140px]", 
                !isStatic ? "active:scale-95 cursor-pointer hover:border-zinc-400" : "cursor-default", 
                isActive ? "border-zinc-900 ring-4 ring-zinc-900/5" : "border-zinc-200/60"
            )}
        >
            <div className="flex justify-between items-start mb-3 md:mb-4">
                <div className={cn("p-2 rounded-xl", vars[variant as keyof typeof vars] || vars.default)}>
                    <Icon className="size-3.5 md:size-4" />
                </div>
                <span className="text-xl md:text-2xl font-black text-zinc-900 tracking-tighter">{loading ? "..." : val}</span>
            </div>
            <p className="text-[8px] md:text-[9px] font-black uppercase text-zinc-400 tracking-[0.12em]">{label}</p>
        </button>
    )
}