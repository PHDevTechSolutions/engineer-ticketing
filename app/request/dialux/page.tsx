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
    Download, X, Calendar, Briefcase
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
import { collection, onSnapshot, query, orderBy, doc, writeBatch, updateDoc, Timestamp } from "firebase/firestore"

// SHARED COMPONENTS
import { PageHeader } from "@/components/page-header"

// TYPES
interface DialuxRequest {
    id: string;
    uid: string;
    projectName: string;
    clientName?: string;
    status: string;
    priority: string;
    createdAt: Timestamp;
    createdBy?: string;
    userId?: string;
    assessment?: {
        simulationType?: string;
    };
}

type SortConfig = {
    key: 'uid' | 'projectName' | 'createdAt';
    direction: 'asc' | 'desc';
}

const getStatusStyles = (status: string) => {
    const s = (status || "PENDING").toUpperCase();
    switch (s) {
        case "COMPLETED": return "bg-emerald-50 text-emerald-700 border-emerald-200 ring-4 ring-emerald-500/5";
        case "IN PROGRESS": return "bg-blue-50 text-blue-700 border-blue-200 ring-4 ring-blue-500/5";
        case "CANCELLED": return "bg-rose-50 text-rose-700 border-rose-200";
        default: return "bg-amber-50 text-amber-700 border-amber-200 ring-4 ring-amber-500/5";
    }
}

export default function DialuxManagementPage() {
    const router = useRouter()
    const [userId, setUserId] = React.useState<string | null>(null)
    const [userDept, setUserDept] = React.useState("")
    const [requests, setRequests] = React.useState<DialuxRequest[]>([])
    const [isDataLoading, setIsDataLoading] = React.useState(true)
    
    const [filterStatus, setFilterStatus] = React.useState<string | null>(null)
    const [filterPriority, setFilterPriority] = React.useState<string>("ALL")
    const [searchTerm, setSearchTerm] = React.useState("")
    const [sortConfig, setSortConfig] = React.useState<SortConfig>({ key: 'createdAt', direction: 'desc' })
    const [selectedIds, setSelectedIds] = React.useState<string[]>([])
    const [currentPage, setCurrentPage] = React.useState(1)
    const [itemsPerPage, setItemsPerPage] = React.useState("10")

    React.useEffect(() => {
        const storedId = localStorage.getItem("userId")
        setUserId(storedId);
        if (storedId) {
            fetch(`/api/user?id=${encodeURIComponent(storedId)}`)
                .then(res => res.json())
                .then(data => setUserDept((data.Department || data.department || "").toUpperCase().trim()))
                .catch(() => setUserDept("SALES"));
        }
        const q = query(collection(db, "dialux_requests"), orderBy("createdAt", "desc"))
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setRequests(snapshot.docs.map(doc => ({ id: doc.id, uid: doc.id.slice(-6).toUpperCase(), ...doc.data() })) as DialuxRequest[]);
            setIsDataLoading(false);
        });
        return () => unsubscribe();
    }, [])

    const togglePriority = async (id: string, currentPriority: string) => {
        const newPriority = currentPriority === "URGENT" ? "NORMAL" : "URGENT";
        try {
            await updateDoc(doc(db, "dialux_requests", id), { priority: newPriority });
        } catch (error) {
            console.error("Error updating priority:", error);
        }
    }

    const handleSort = (key: SortConfig['key']) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }))
    }

    const toggleSelectAll = () => {
        if (selectedIds.length === paginatedItems.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(paginatedItems.map(item => item.id));
        }
    }

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    }

    const handleBulkUpdate = async (newStatus: string) => {
        const batch = writeBatch(db);
        selectedIds.forEach(id => {
            batch.update(doc(db, "dialux_requests", id), { status: newStatus, updatedAt: new Date() });
        });
        await batch.commit();
        setSelectedIds([]);
    }

    const exportToExcel = () => {
        const selectedData = requests.filter(r => selectedIds.includes(r.id));
        const headers = ["Ref ID,Project Name,Client,Status,Priority,Date\n"];
        const rows = selectedData.map(r => 
            `${r.uid},${r.projectName},${r.clientName || "N/A"},${r.status},${r.priority},${r.createdAt?.toDate().toLocaleDateString()}\n`
        );
        const blob = new Blob([headers.concat(rows).join("")], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `engiconnect_export_${new Date().getTime()}.csv`;
        a.click();
    }

    const filteredAndSortedRequests = React.useMemo(() => {
        let result = requests.filter(r => {
            if (userDept === "SALES" && r.createdBy !== userId && r.userId !== userId) return false;
            if (userDept === "PROCUREMENT" && r.assessment?.simulationType?.toLowerCase() !== "paid") return false;
            const matchesSearch = (r.projectName + r.uid).toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = filterStatus === null || (r.status || "PENDING").toUpperCase() === filterStatus;
            const matchesPriority = filterPriority === "ALL" || (r.priority || "NORMAL").toUpperCase() === filterPriority;
            return matchesSearch && matchesStatus && matchesPriority;
        })
        return result.sort((a, b) => {
            const valA = sortConfig.key === 'createdAt' ? (a.createdAt?.toMillis() || 0) : (a[sortConfig.key] || "").toString().toLowerCase();
            const valB = sortConfig.key === 'createdAt' ? (b.createdAt?.toMillis() || 0) : (b[sortConfig.key] || "").toString().toLowerCase();
            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        })
    }, [requests, searchTerm, filterStatus, filterPriority, userDept, userId, sortConfig]);

    const paginatedItems = filteredAndSortedRequests.slice((currentPage - 1) * parseInt(itemsPerPage), currentPage * parseInt(itemsPerPage));
    const totalPages = Math.ceil(filteredAndSortedRequests.length / parseInt(itemsPerPage));

    const SortIcon = ({ column }: { column: SortConfig['key'] }) => {
        if (sortConfig.key !== column) return <ArrowUpDown className="ml-1.5 size-3 opacity-30" />;
        return sortConfig.direction === 'asc' ? <ChevronUp className="ml-1.5 size-3 text-black" /> : <ChevronDown className="ml-1.5 size-3 text-black" />;
    }

    return (
        <ProtectedPageWrapper>
            <SidebarProvider defaultOpen={false}>
                <AppSidebar userId={userId} />
                <SidebarInset className="bg-[#F8FAFA] pb-24 md:pb-10">
                    <PageHeader 
                        title="DIALUX HUB" 
                        version="V3.1" 
                        showBackButton 
                        trigger={<SidebarTrigger className="mr-2" />} 
                        actions={<Button onClick={() => router.push('/request/dialux/add')} className="hidden md:flex bg-zinc-900 text-white rounded-xl h-8 text-[9px] font-bold tracking-widest px-4"><Plus className="size-3 mr-1.5" /> NEW REQUEST</Button>}
                    />

                    {/* MOBILE FAB - Adjusted bottom spacing */}
                    <Button 
                        onClick={() => router.push('/request/dialux/add')} 
                        className="md:hidden fixed bottom-6 right-6 size-14 rounded-full bg-zinc-900 text-white shadow-2xl z-40 p-0 flex items-center justify-center border-4 border-white active:scale-90 transition-transform"
                    >
                        <Plus className="size-7" />
                    </Button>

                    <main className="p-4 md:p-6 max-w-7xl mx-auto w-full space-y-4">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            <StatCard label="Total Pipeline" val={requests.length} icon={Layers} isActive={filterStatus === null} onClick={() => setFilterStatus(null)} variant="default" loading={isDataLoading} />
                            <StatCard label="Awaiting" val={requests.filter(r => (r.status || "PENDING").toUpperCase() === "PENDING").length} icon={Clock} isActive={filterStatus === "PENDING"} onClick={() => setFilterStatus("PENDING")} variant="warning" loading={isDataLoading} />
                            <StatCard label="In Progress" val={requests.filter(r => r.status?.toUpperCase() === "IN PROGRESS").length} icon={PlayCircle} isActive={filterStatus === "IN PROGRESS"} onClick={() => setFilterStatus("IN PROGRESS")} variant="info" loading={isDataLoading} />
                            <StatCard label="Success Rate" val={`${requests.length > 0 ? Math.round((requests.filter(r => r.status?.toUpperCase() === "COMPLETED").length / requests.length) * 100) : 0}%`} icon={TrendingUp} isStatic variant="emerald" loading={isDataLoading} />
                        </div>

                        <div className="flex flex-col md:flex-row gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
                                <input placeholder="Search projects..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-11 h-11 rounded-xl bg-white shadow-sm ring-1 ring-zinc-200 outline-none focus:ring-2 focus:ring-black transition-all text-sm font-medium" />
                            </div>
                            <div className="flex gap-2">
                                <Select value={filterPriority} onValueChange={setFilterPriority}>
                                    <SelectTrigger className="flex-1 md:w-[160px] h-11 bg-white rounded-xl border-zinc-200 text-xs font-bold uppercase tracking-wider">
                                        <div className="flex items-center gap-2"><Filter className="size-3" /><SelectValue placeholder="Priority" /></div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL" className="text-xs font-bold">ALL PRIORITIES</SelectItem>
                                        <SelectItem value="URGENT" className="text-xs font-bold text-rose-600">URGENT</SelectItem>
                                        <SelectItem value="NORMAL" className="text-xs font-bold text-zinc-500">NORMAL</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button variant="outline" onClick={() => { setFilterStatus(null); setFilterPriority("ALL"); setSearchTerm(""); setSelectedIds([]); }} className="h-11 px-4 rounded-xl bg-white font-bold text-[10px] tracking-widest border-zinc-200"><RotateCcw className="size-3" /></Button>
                            </div>
                        </div>

                        <div className="bg-white rounded-[24px] shadow-sm border border-zinc-200/60 overflow-hidden">
                            <div className="hidden md:grid grid-cols-[50px_1fr_2fr_1fr_1fr_1fr_60px] bg-zinc-50/50 px-6 py-4 border-b text-[9px] font-black uppercase tracking-[0.15em] text-zinc-400 items-center">
                                <button onClick={toggleSelectAll}>{selectedIds.length === paginatedItems.length && paginatedItems.length > 0 ? <CheckSquare className="size-4" /> : <Square className="size-4" />}</button>
                                <button onClick={() => handleSort('uid')} className="flex items-center">Ref ID <SortIcon column="uid" /></button>
                                <button onClick={() => handleSort('projectName')} className="flex items-center">Project Name <SortIcon column="projectName" /></button>
                                <span>Priority</span>
                                <span>Status</span>
                                <button onClick={() => handleSort('createdAt')} className="flex items-center">Date <SortIcon column="createdAt" /></button>
                                <span className="text-right">Action</span>
                            </div>

                            <div className="divide-y divide-zinc-50">
                                {isDataLoading ? (
                                    <div className="p-10 text-center animate-pulse text-[10px] font-bold uppercase text-zinc-400">Loading...</div>
                                ) : paginatedItems.map((r) => (
                                    <div key={r.id} className={cn("group transition-all px-4 py-4 md:px-6 md:py-4", selectedIds.includes(r.id) && "bg-zinc-50")}>
                                        {/* Mobile Layout */}
                                        <div className="md:hidden space-y-3">
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-3">
                                                    <button onClick={() => toggleSelect(r.id)}>{selectedIds.includes(r.id) ? <CheckSquare className="size-5 text-black" /> : <Square className="size-5 text-zinc-200" />}</button>
                                                    <span className="text-[10px] font-mono font-bold text-zinc-400">#{r.uid}</span>
                                                </div>
                                                <Badge className={cn("rounded-full px-3 py-0.5 text-[8px] font-black border uppercase shadow-none", getStatusStyles(r.status))}>{r.status || "PENDING"}</Badge>
                                            </div>
                                            <div onClick={() => router.push(`/request/dialux/${r.id}`)} className="cursor-pointer">
                                                <h3 className="text-sm font-black text-zinc-900 uppercase line-clamp-1">{r.projectName}</h3>
                                                <p className="text-[10px] text-zinc-400 font-bold uppercase flex items-center gap-1.5 mt-1"><Briefcase className="size-3" /> {r.clientName || "General Client"}</p>
                                            </div>
                                            <div className="flex items-center justify-between pt-2 border-t border-zinc-50">
                                                <div className="flex gap-2">
                                                    <button onClick={() => togglePriority(r.id, r.priority)} className={cn("px-2 py-0.5 rounded-full text-[8px] font-black flex items-center gap-1 border transition-all active:scale-90", r.priority === "URGENT" ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-white text-zinc-400 border-zinc-100")}>
                                                        <AlertCircle className="size-2.5" />{r.priority || "NORMAL"}
                                                    </button>
                                                    <span className="text-[9px] font-bold text-zinc-400 flex items-center gap-1"><Calendar className="size-3" /> {r.createdAt?.toDate ? new Date(r.createdAt.toDate()).toLocaleDateString() : "---"}</span>
                                                </div>
                                                <Button size="icon" variant="ghost" onClick={() => router.push(`/request/dialux/${r.id}`)} className="h-8 w-8 rounded-lg bg-zinc-100"><ArrowRight className="size-4" /></Button>
                                            </div>
                                        </div>

                                        {/* Desktop Layout */}
                                        <div className="hidden md:grid md:grid-cols-[50px_1fr_2fr_1fr_1fr_1fr_60px] gap-4 items-center">
                                            <button onClick={() => toggleSelect(r.id)}>{selectedIds.includes(r.id) ? <CheckSquare className="size-4 text-black" /> : <Square className="size-4 text-zinc-200" />}</button>
                                            <span className="text-[10px] font-mono font-bold text-zinc-400">#{r.uid}</span>
                                            <div className="flex flex-col">
                                                <span className="text-[13px] font-black text-zinc-900 uppercase truncate leading-none mb-1">{r.projectName}</span>
                                                <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wide">{r.clientName || "General Client"}</span>
                                            </div>
                                            <button onClick={() => togglePriority(r.id, r.priority)} className={cn("px-2.5 py-1 rounded-full text-[8px] font-black flex w-fit items-center gap-1.5 border shadow-sm transition-all hover:brightness-95 active:scale-95", r.priority === "URGENT" ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-white text-zinc-400 border-zinc-100")}>
                                                <AlertCircle className="size-3" />{r.priority || "NORMAL"}
                                            </button>
                                            <Badge className={cn("rounded-full px-4 py-1 text-[9px] font-black border uppercase shadow-none tracking-wider", getStatusStyles(r.status))}>{r.status || "PENDING"}</Badge>
                                            <span className="text-[10px] font-bold text-zinc-400">{r.createdAt?.toDate ? new Date(r.createdAt.toDate()).toLocaleDateString() : "---"}</span>
                                            <div className="flex justify-end"><Button variant="ghost" onClick={() => router.push(`/request/dialux/${r.id}`)} className="h-9 w-9 p-0 rounded-xl hover:bg-black hover:text-white transition-all"><ArrowRight className="size-4" /></Button></div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="p-4 bg-zinc-50/50 border-t flex flex-col sm:flex-row justify-between items-center gap-4 px-6">
                                <div className="flex items-center gap-3">
                                    <span className="text-[9px] font-black text-zinc-400 uppercase">Rows:</span>
                                    <Select value={itemsPerPage} onValueChange={(v) => { setItemsPerPage(v); setCurrentPage(1); }}>
                                        <SelectTrigger className="w-16 h-8 bg-white text-[10px] font-bold rounded-lg border-zinc-200"><SelectValue /></SelectTrigger>
                                        <SelectContent>{["5", "10", "20"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-center gap-4">
                                    <Button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} variant="outline" className="h-9 px-3 rounded-xl border-zinc-200 bg-white"><ChevronLeft className="size-4 mr-1" /> Prev</Button>
                                    <span className="text-[10px] font-black text-zinc-900">{currentPage} / {totalPages || 1}</span>
                                    <Button disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(p => p + 1)} variant="outline" className="h-9 px-3 rounded-xl border-zinc-200 bg-white">Next <ChevronRight className="size-4 ml-1" /></Button>
                                </div>
                            </div>
                        </div>

                        {selectedIds.length > 0 && (
                            <div className="fixed bottom-6 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-auto bg-zinc-900 text-white p-2 md:px-6 md:py-3 rounded-2xl shadow-2xl flex flex-col md:flex-row items-center gap-2 md:gap-6 animate-in slide-in-from-bottom-8 z-50 border border-white/10">
                                <div className="flex items-center justify-between w-full md:w-auto md:border-r md:border-white/10 md:pr-6 px-2 py-1 md:py-0">
                                    <div className="flex items-center gap-2">
                                        <span className="h-5 w-5 rounded-full bg-white text-black text-[9px] font-black flex items-center justify-center">{selectedIds.length}</span>
                                        <span className="text-[9px] font-black uppercase tracking-widest">Selected</span>
                                    </div>
                                    <button onClick={() => setSelectedIds([])} className="md:hidden"><X className="size-4 text-zinc-500" /></button>
                                </div>
                                <div className="flex items-center gap-1 w-full md:w-auto overflow-x-auto no-scrollbar">
                                    <Button onClick={() => handleBulkUpdate("IN PROGRESS")} variant="ghost" className="flex-1 md:flex-none h-9 text-[8px] font-black hover:bg-white/10 text-white uppercase"><PlayCircle className="size-3 mr-1.5 text-blue-400" /> Start</Button>
                                    <Button onClick={() => handleBulkUpdate("COMPLETED")} variant="ghost" className="flex-1 md:flex-none h-9 text-[8px] font-black hover:bg-white/10 text-white uppercase"><CheckCircle2 className="size-3 mr-1.5 text-emerald-400" /> Done</Button>
                                    <Button onClick={exportToExcel} variant="ghost" className="flex-1 md:flex-none h-9 text-[8px] font-black hover:bg-white/10 text-white uppercase"><Download className="size-3 mr-1.5 text-amber-400" /> Excel</Button>
                                </div>
                                <button onClick={() => setSelectedIds([])} className="hidden md:block hover:rotate-90 transition-transform"><X className="size-4 text-zinc-500" /></button>
                            </div>
                        )}
                    </main>
                </SidebarInset>
            </SidebarProvider>
        </ProtectedPageWrapper>
    )
}

function StatCard({ label, val, icon: Icon, isActive, onClick, isStatic, variant = 'default', loading }: { label: string, val: any, icon: any, isActive?: boolean, onClick?: any, isStatic?: boolean, variant?: string, loading?: boolean }) {
    const vars = {
        default: "text-zinc-400 bg-zinc-100",
        warning: "text-amber-600 bg-amber-50",
        info: "text-blue-600 bg-blue-50",
        emerald: "text-emerald-700 bg-emerald-50",
    }
    return (
        <button disabled={isStatic || loading} onClick={onClick} className={cn("p-4 md:p-5 flex flex-col justify-between rounded-[24px] bg-white transition-all border text-left shadow-sm min-w-[140px]", !isStatic ? "active:scale-95 cursor-pointer hover:border-zinc-400" : "cursor-default", isActive ? "border-zinc-900 ring-4 ring-zinc-900/5" : "border-zinc-200/60")}>
            <div className="flex justify-between items-start mb-3 md:mb-4">
                <div className={cn("p-2 rounded-xl", vars[variant as keyof typeof vars] || vars.default)}><Icon className="size-3.5 md:size-4" /></div>
                <span className="text-xl md:text-2xl font-black text-zinc-900 tracking-tighter">{loading ? "..." : val}</span>
            </div>
            <p className="text-[8px] md:text-[9px] font-black uppercase text-zinc-400 tracking-[0.12em]">{label}</p>
        </button>
    )
}