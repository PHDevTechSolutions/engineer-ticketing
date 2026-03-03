"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import ProtectedPageWrapper from "@/components/protected-page-wrapper"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import {
    Plus, Search, RotateCcw, Layout, Activity, AlertCircle, 
    CheckCircle2, Loader2, Calendar as CalendarIcon, ArrowRight, 
    Package, Hash, Clipboard, ChevronLeft, ChevronRight
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { format, isAfter } from "date-fns"

// DATABASE
import { db } from "@/lib/firebase"
import { collection, onSnapshot, query, orderBy } from "firebase/firestore"
import { PageHeader } from "@/components/page-header"

// Types for better code safety
interface TrackerEntry {
    id: string;
    fullId: string;
    productName?: string;
    shipmentCode?: string;
    quantity?: number;
    arrivalDate?: any;
    targetDate?: any;
    releaseDate?: any;
    autoStatus: "AWAITING" | "RELEASED" | "OVERDUE" | "TESTING";
}

export default function TestingTrackerPage() {
    const router = useRouter()
    const [userId, setUserId] = React.useState<string | null>(null)
    const [userDept, setUserDept] = React.useState("")
    
    // TRACKER STATES
    const [entries, setEntries] = React.useState<TrackerEntry[]>([])
    const [isDataLoading, setIsDataLoading] = React.useState(true)
    const [selectedStatus, setSelectedStatus] = React.useState<string | null>(null)
    const [searchTerm, setSearchTerm] = React.useState("")

    // PAGINATION STATES
    const [currentPage, setCurrentPage] = React.useState(1)
    const itemsPerPage = 10 // Show 10 items at a time

    // Identity & Dept Fetch
    React.useEffect(() => {
        const storedId = localStorage.getItem("userId")
        setUserId(storedId)
        if (!storedId) return

        const fetchProfile = async () => {
            try {
                const res = await fetch(`/api/user?id=${encodeURIComponent(storedId)}`)
                const data = await res.json()
                setUserDept(data.Department?.toLowerCase() || data.department?.toLowerCase() || "sales")
            } catch (e) { console.error("Profile error:", e) }
        }
        fetchProfile()
    }, [])

    // Real-time Firestore Sync
    React.useEffect(() => {
        setIsDataLoading(true)
        const q = query(collection(db, "testing_tracker"), orderBy("createdAt", "desc"))

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setEntries(snapshot.docs.map(doc => {
                const data = doc.data()
                const today = new Date()
                const target = data.targetDate?.toDate()
                const release = data.releaseDate?.toDate()
                const arrival = data.arrivalDate?.toDate()

                let autoStatus: TrackerEntry["autoStatus"] = "AWAITING"
                if (release) autoStatus = "RELEASED"
                else if (target && isAfter(today, target)) autoStatus = "OVERDUE"
                else if (arrival) autoStatus = "TESTING"

                return {
                    id: doc.id.slice(-6).toUpperCase(),
                    fullId: doc.id,
                    ...data,
                    autoStatus
                } as TrackerEntry
            }))
            setIsDataLoading(false)
        })
        return () => unsubscribe()
    }, [])

    // Filtering logic
    const filtered = entries.filter(e => {
        const matchesSearch = 
            (e.productName?.toLowerCase().includes(searchTerm.toLowerCase())) || 
            (e.shipmentCode?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (e.id.includes(searchTerm.toUpperCase()))
        const matchesStatus = selectedStatus ? e.autoStatus === selectedStatus : true
        return matchesSearch && matchesStatus
    })

    // PAGINATION CALCULATION
    const totalPages = Math.ceil(filtered.length / itemsPerPage)
    const indexOfLastItem = currentPage * itemsPerPage
    const indexOfFirstItem = indexOfLastItem - itemsPerPage
    const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem)

    // Reset to page 1 when searching or filtering
    React.useEffect(() => {
        setCurrentPage(1)
    }, [searchTerm, selectedStatus])

    return (
        <ProtectedPageWrapper>
            <SidebarProvider defaultOpen={false}>
                <AppSidebar userId={userId} />
                <SidebarInset className="relative bg-[#F4F7F7] min-h-screen font-sans">
                    
                    <PageHeader
                        title="Testing Tracker"
                        version="V2.1"
                        showBackButton={true}
                        trigger={<SidebarTrigger className="mr-2" />}
                        actions={
                            <Button onClick={() => router.push('/request/testing/add')} className="hidden md:flex bg-black hover:bg-zinc-800 text-white px-5 rounded-xl h-10 text-xs font-bold tracking-tight">
                                <Plus className="mr-2 size-4" /> NEW TESTING ENTRY
                            </Button>
                        }
                    />

                    <main className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6 pb-32">
                        
                        {/* Stat Cards */}
                        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard label="All Items" val={entries.length} icon={Layout} isActive={selectedStatus === null} onClick={() => setSelectedStatus(null)} />
                            <StatCard label="Testing" val={entries.filter(e => e.autoStatus === "TESTING").length} icon={Activity} isActive={selectedStatus === "TESTING"} onClick={() => setSelectedStatus("TESTING")} />
                            <StatCard label="Overdue" val={entries.filter(e => e.autoStatus === "OVERDUE").length} icon={AlertCircle} isActive={selectedStatus === "OVERDUE"} onClick={() => setSelectedStatus("OVERDUE")} isAlert />
                            <StatCard label="Released" val={entries.filter(e => e.autoStatus === "RELEASED").length} icon={CheckCircle2} isActive={selectedStatus === "RELEASED"} onClick={() => setSelectedStatus("RELEASED")} isDone />
                        </section>

                        {/* Search & Filters */}
                        <div className="flex flex-col md:flex-row gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
                                <input
                                    placeholder="Search product name, code, or #ID..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-11 h-12 rounded-2xl border-none bg-white shadow-sm ring-1 ring-zinc-200 focus:ring-2 focus:ring-black outline-none transition-all text-sm"
                                />
                            </div>
                            <Button variant="outline" onClick={() => { setSelectedStatus(null); setSearchTerm("") }} className="h-12 rounded-2xl bg-white border-zinc-200 font-bold text-[10px] tracking-widest uppercase">
                                <RotateCcw className="mr-2 size-3" /> RESET
                            </Button>
                        </div>

                        {/* Power List Container */}
                        <div className="bg-white rounded-[28px] shadow-sm border border-zinc-200/60 overflow-hidden">
                            <div className="hidden md:grid md:grid-cols-12 gap-4 px-8 py-4 bg-zinc-50/50 border-b border-zinc-100">
                                <span className="col-span-4 text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em]">Product & Shipment</span>
                                <span className="col-span-2 text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em]">Quantity</span>
                                <span className="col-span-3 text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em]">Timeline</span>
                                <span className="col-span-3 text-right text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em]">Status</span>
                            </div>

                            <div className="divide-y divide-zinc-50">
                                {isDataLoading ? (
                                    <div className="p-20 text-center flex flex-col items-center gap-3">
                                        <Loader2 className="animate-spin text-zinc-200 size-8" />
                                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Accessing Database...</p>
                                    </div>
                                ) : currentItems.length === 0 ? (
                                    <div className="p-20 text-center text-zinc-400 text-xs font-bold uppercase tracking-widest italic">No Records Found</div>
                                ) : (
                                    currentItems.map((item) => (
                                        <div 
                                            key={item.fullId} 
                                            onClick={() => router.push(`/request/testing/${item.fullId}`)} 
                                            className="flex flex-col md:grid md:grid-cols-12 gap-4 p-6 md:px-8 items-center hover:bg-zinc-50/60 transition-all cursor-pointer group"
                                        >
                                            <div className="w-full md:col-span-4 flex flex-col">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-[10px] font-mono font-bold text-zinc-300">#{item.id}</span>
                                                    <span className="text-sm font-bold text-zinc-900 uppercase truncate group-hover:text-black">
                                                        {item.productName || "Untitled Product"}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Package className="size-3 text-zinc-300" />
                                                    <span className="text-[10px] text-zinc-400 font-bold uppercase">{item.shipmentCode || "NO CODE"}</span>
                                                </div>
                                            </div>

                                            <div className="w-full md:col-span-2 flex md:flex-col items-center md:items-start justify-between">
                                                <span className="md:hidden text-[9px] font-black text-zinc-300 uppercase">Qty:</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-zinc-600">{item.quantity || "0"} <span className="text-[10px] text-zinc-300">PCS</span></span>
                                                </div>
                                            </div>

                                            <div className="w-full md:col-span-3 grid grid-cols-2 gap-4 border-y md:border-y-0 md:border-l border-zinc-50 py-3 md:py-0 md:pl-6">
                                                <div className="flex flex-col">
                                                    <span className="text-[8px] font-black text-zinc-300 uppercase mb-1">Arrival</span>
                                                    <span className="text-[11px] font-bold text-zinc-500">
                                                        {item.arrivalDate ? format(item.arrivalDate.toDate(), "MMM dd, yyyy") : "—"}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[8px] font-black text-zinc-300 uppercase mb-1">Target</span>
                                                    <span className={cn("text-[11px] font-bold", item.autoStatus === "OVERDUE" ? "text-red-500" : "text-zinc-500")}>
                                                        {item.targetDate ? format(item.targetDate.toDate(), "MMM dd, yyyy") : "—"}
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            <div className="w-full md:col-span-3 flex items-center justify-between md:justify-end gap-4">
                                                <Badge className={cn("rounded-full px-4 py-1 text-[9px] font-black border-none uppercase tracking-tight", 
                                                    item.autoStatus === "RELEASED" ? "bg-emerald-50 text-emerald-600" : 
                                                    item.autoStatus === "OVERDUE" ? "bg-red-50 text-red-600 animate-pulse" : 
                                                    item.autoStatus === "TESTING" ? "bg-blue-50 text-blue-600" : "bg-zinc-100 text-zinc-400"
                                                )}>
                                                    {item.autoStatus.replace("_", " ")}
                                                </Badge>
                                                <ArrowRight className="hidden md:block size-4 text-zinc-200 group-hover:text-black group-hover:translate-x-1 transition-all" />
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* PAGINATION CONTROLS */}
                            {!isDataLoading && totalPages > 1 && (
                                <div className="px-8 py-6 bg-zinc-50/30 border-t border-zinc-100 flex items-center justify-between">
                                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                                        Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filtered.length)} of {filtered.length}
                                    </p>
                                    <div className="flex gap-2">
                                        <Button 
                                            variant="outline" 
                                            size="icon" 
                                            disabled={currentPage === 1}
                                            onClick={() => setCurrentPage(prev => prev - 1)}
                                            className="size-10 rounded-xl border-zinc-200 bg-white"
                                        >
                                            <ChevronLeft className="size-4" />
                                        </Button>
                                        <div className="flex items-center px-4 bg-white border border-zinc-200 rounded-xl text-[10px] font-black">
                                            {currentPage} / {totalPages}
                                        </div>
                                        <Button 
                                            variant="outline" 
                                            size="icon" 
                                            disabled={currentPage === totalPages}
                                            onClick={() => setCurrentPage(prev => prev + 1)}
                                            className="size-10 rounded-xl border-zinc-200 bg-white"
                                        >
                                            <ChevronRight className="size-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </main>

                    {/* MOBILE FAB */}
                    <div className="md:hidden fixed bottom-8 right-6 z-50">
                        <Button 
                            onClick={() => router.push('/request/testing/add')}
                            className="size-16 rounded-3xl bg-black text-white shadow-2xl flex items-center justify-center border border-white/10"
                        >
                            <Plus className="size-7 stroke-[3px]" />
                        </Button>
                    </div>

                </SidebarInset>
            </SidebarProvider>
        </ProtectedPageWrapper>
    )
}

// SHARED COMPONENT
interface StatCardProps {
    label: string;
    val: number;
    icon: any;
    isActive: boolean;
    onClick: () => void;
    isDone?: boolean;
    isAlert?: boolean;
}

function StatCard({ label, val, icon: Icon, isActive, onClick, isDone, isAlert }: StatCardProps) {
    return (
        <div
            onClick={onClick}
            className={cn(
                "p-5 md:p-6 flex flex-col gap-3 rounded-[24px] bg-white transition-all shadow-sm border-2 cursor-pointer active:scale-95",
                isActive ? "border-black shadow-md" : "border-transparent hover:border-zinc-200"
            )}
        >
            <div className="flex justify-between items-start">
                <div className={cn("p-2.5 rounded-xl", 
                    isDone ? "bg-emerald-50 text-emerald-500" : 
                    isAlert ? "bg-red-50 text-red-500" : "bg-zinc-50 text-zinc-400"
                )}>
                    <Icon className="size-5" />
                </div>
                <span className="text-2xl md:text-3xl font-black text-zinc-900">{val.toString().padStart(2, '0')}</span>
            </div>
            <p className="text-[9px] md:text-[10px] font-bold uppercase text-zinc-400 tracking-[0.15em]">{label}</p>
        </div>
    )
}