"use client"

import * as React from "react"
import { db } from "@/lib/firebase"
import { collection, onSnapshot, query, doc, setDoc, serverTimestamp, Unsubscribe, getDocs } from "firebase/firestore"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import {
    Search,
    ChevronDown,
    ChevronUp,
    CheckCircle2,
    RefreshCw,
    Users,
    Info,
    ChevronLeft,
    ChevronRight,
    X,
    RotateCcw,
    ShieldCheck,
    Loader2,
    LayoutGrid,
    Sparkles,
    Zap,
    Lightbulb,
    CheckSquare,
    Square,
    MousePointer2,
    UserPlus,
    UserMinus,
    HelpCircle
} from "lucide-react"
import ProtectedPageWrapper from "@/components/protected-page-wrapper"
import { cn } from "@/lib/utils"
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"

// --- TYPES ---
interface User {
    _id: string;
    Firstname: string;
    Lastname: string;
    Department?: string;
    Role?: string;
    ReferenceID?: string;
    profilePicture?: string;
}
type ConfirmAction =
    | { type: "toggle"; managerId: string; engName: string }
    | { type: "bulk"; managerId: string; mode: "assign_all" | "clear_all"; managerName: string }

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

/**
 * TOAST COMPONENT
 */
const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => {
    React.useEffect(() => {
        const timer = setTimeout(onClose, 3000)
        return () => clearTimeout(timer)
    }, [onClose])

    return (
        <div className={cn(
            "fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-6 py-3 rounded-2xl shadow-2xl border animate-in fade-in slide-in-from-bottom-4 duration-300",
            type === 'success' ? "bg-zinc-900 border-emerald-500/50 text-white" : "bg-rose-950 border-rose-500/50 text-white"
        )}>
            {type === 'success' ? (
                <CheckCircle2 className="size-4 text-emerald-400" />
            ) : (
                <X className="size-4 text-rose-400" />
            )}
            <span className="text-[10px] font-black uppercase tracking-widest">{message}</span>
        </div>
    )
}

// --- MAIN PAGE COMPONENT ---
export default function PICAssignmentMatrixPage() {
    // --- STATE ---
    const [salesManagers, setSalesManagers] = React.useState<User[]>([])
    const [engineers, setEngineers] = React.useState<User[]>([])
    const [assignments, setAssignments] = React.useState<Record<string, string[]>>({})
    const [isLoading, setIsLoading] = React.useState(true)
    const [isSaving, setIsSaving] = React.useState(false)
    const [currentUserId, setCurrentUserId] = React.useState<string | null>(null)

    // --- VIEW SETTINGS ---
    const [openManager, setOpenManager] = React.useState<string | null>(null)
    const [showGuide, setShowGuide] = React.useState(false)
    const [searchQuery, setSearchQuery] = React.useState("")
    const [showAssignedOnly, setShowAssignedOnly] = React.useState(false)
    const [currentPage, setCurrentPage] = React.useState(1)
    const [itemsPerPage, setItemsPerPage] = React.useState("10")
    const [confirmAction, setConfirmAction] = React.useState<ConfirmAction | null>(null)
    const [toast, setToast] = React.useState<{ message: string, type: 'success' | 'error' } | null>(null)
    const searchRef = React.useRef<HTMLInputElement>(null)
    const [engineerSearchByManager, setEngineerSearchByManager] = React.useState<Record<string, string>>({})

    // DERIVED STATE
    const filteredManagers = React.useMemo(() => {
        const q = searchQuery.toLowerCase().trim()
        const baseFiltered = salesManagers.filter(m =>
            `${m.Firstname} ${m.Lastname} ${m.ReferenceID || ''}`.toLowerCase().includes(q)
        )
        if (!showAssignedOnly) return baseFiltered
        return baseFiltered.filter((m) => (assignments[m._id] || []).length > 0)
    }, [salesManagers, searchQuery, showAssignedOnly, assignments])

    const limit = parseInt(itemsPerPage)
    const totalPages = Math.ceil(filteredManagers.length / limit)
    const paginatedManagers = filteredManagers.slice((currentPage - 1) * limit, currentPage * limit)

    const managersWithAssignments = React.useMemo(
        () => salesManagers.filter((m) => (assignments[m._id] || []).length > 0).length,
        [salesManagers, assignments]
    )

    const totalLinks = React.useMemo(
        () => Object.values(assignments).reduce((acc, curr) => acc + curr.length, 0),
        [assignments]
    )

    // 1. HYDRATION & INITIAL LOAD
    React.useEffect(() => {
        if (typeof window !== 'undefined') {
            setCurrentUserId(localStorage.getItem("userId"))
        }

        let isMounted = true
        let unsubscribeFirestore: Unsubscribe | undefined

        const fetchData = async () => {
            try {
                const res = await fetch('/api/user')
                if (!res.ok) throw new Error("Failed to fetch users")
                const allUsers: User[] = await res.json()
                
                if (!isMounted) return

                const managers = allUsers.filter(u =>
                    u.Department?.toLowerCase() === "sales" && u.Role?.toLowerCase() === "manager"
                )
                const engs = allUsers.filter(u => 
                    u.Department?.toLowerCase() === "engineering"
                )

                setSalesManagers(managers)
                setEngineers(engs)

                // Firestore Sync
                const q = query(collection(db, "pic_assignments"))
                unsubscribeFirestore = onSnapshot(q, (snapshot) => {
                    const mapping: Record<string, string[]> = {}
                    snapshot.docs.forEach(doc => { 
                        mapping[doc.id] = doc.data().assignedPics || [] 
                    })
                    setAssignments(mapping)
                    setIsLoading(false)
                }, (error) => {
                    console.error("Firestore Error:", error)
                    setToast({ message: "Cloud Sync Interrupted", type: 'error' })
                    setIsLoading(false)
                })
            } catch (err) { 
                console.error("Initialization Error:", err)
                if (isMounted) setIsLoading(false)
                setToast({ message: "Failed to load team data", type: 'error' })
            }
        }
        
        fetchData()
        return () => { 
            isMounted = false
            if (unsubscribeFirestore) unsubscribeFirestore()
        }
    }, [])

    // 2. SAVE LOGIC (Optimistic UI)
    const handleSaveAssignment = async () => {
        if (!confirmAction) return
        setIsSaving(true)
        const { managerId } = confirmAction
        const previousAssignments = { ...assignments }
        const currentBatch = assignments[managerId] || []
        const manager = salesManagers.find(m => m._id === managerId)

        let newBatch: string[] = []
        if (confirmAction.type === "toggle") {
            const { engName } = confirmAction
            const isCurrentlyAssigned = currentBatch.includes(engName)
            newBatch = isCurrentlyAssigned
                ? currentBatch.filter(n => n !== engName)
                : [...currentBatch, engName]
        } else {
            const allEngineerNames = engineers.map((eng) => `${eng.Firstname} ${eng.Lastname}`)
            newBatch = confirmAction.mode === "assign_all" ? allEngineerNames : []
        }

        // Update UI immediately
        setAssignments(prev => ({ ...prev, [managerId]: newBatch }))

        try {
            await setDoc(doc(db, "pic_assignments", managerId), {
                assignedPics: newBatch,
                updatedAt: serverTimestamp(),
                managerName: manager ? `${manager.Firstname} ${manager.Lastname}` : "Unknown Manager",
                managerRole: "Sales Manager"
            }, { merge: true })

            setToast({
                message: confirmAction.type === "toggle"
                    ? "Matrix Updated"
                    : confirmAction.mode === "assign_all"
                        ? "All engineers assigned"
                        : "All assignments cleared",
                type: 'success'
            })
            setConfirmAction(null)
        } catch (err) {
            setAssignments(previousAssignments) // Rollback
            setToast({ message: "Save failed. Check connection.", type: 'error' })
        } finally {
            setIsSaving(false)
        }
    }

    // Reset to page 1 on search
    React.useEffect(() => { setCurrentPage(1) }, [searchQuery, itemsPerPage, showAssignedOnly])

    React.useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
                e.preventDefault()
                searchRef.current?.focus()
            }
            if (e.key === "Escape" && document.activeElement?.tagName === "INPUT") {
                setSearchQuery("")
                searchRef.current?.blur()
            }
        }
        window.addEventListener("keydown", handler)
        return () => window.removeEventListener("keydown", handler)
    }, [])

    return (
        <ProtectedPageWrapper>
            <SidebarProvider defaultOpen={false}>
                <AppSidebar userId={currentUserId} />
                <SidebarInset className="bg-[#F8FAFA] pb-24 md:pb-10 min-h-screen m-0 rounded-none border-none shadow-none overflow-visible font-sans">
                    <PageHeader
                        title="Assignment Matrix"
                        version="V4.5-MATRIX"
                        trigger={<SidebarTrigger className="mr-2" />}
                        actions={
                            <div className="flex items-center gap-3">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowGuide(true)}
                                    className="rounded-xl h-9 px-4 transition-all text-[11px] font-bold uppercase text-zinc-500 hover:bg-white border border-transparent hover:border-zinc-200"
                                >
                                    <HelpCircle size={15} className="mr-2" />
                                    <span className="hidden md:inline">System Guide</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => { setIsLoading(true); window.location.reload(); }}
                                    className="rounded-xl h-9 w-9 p-0 bg-white border-zinc-200 hover:bg-zinc-50 transition-all"
                                >
                                    <RefreshCw size={14} className={cn(isLoading && "animate-spin")} />
                                </Button>
                            </div>
                        }
                    />

                    <main className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-4 md:space-y-6">
                        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3">
                            <ShieldCheck className="size-4 text-blue-500 flex-shrink-0" />
                            <p className="text-[11px] font-black text-blue-700">
                                Tip: Matrix updates are synced in real-time. Press <span className="font-mono">/</span> to search.
                            </p>
                        </div>

                        {/* Status Cards Section */}
                        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                            <DashboardCard
                                label="Sales Managers"
                                value={isLoading ? "--" : salesManagers.length}
                                icon={LayoutGrid}
                                colorClass="text-zinc-600 bg-zinc-50"
                                loading={isLoading}
                                isActive={!showAssignedOnly}
                                onClick={() => setShowAssignedOnly(false)}
                            />
                            <DashboardCard
                                label="Active Engineers"
                                value={isLoading ? "--" : engineers.length}
                                icon={Users}
                                colorClass="text-blue-600 bg-blue-50"
                                loading={isLoading}
                            />
                            <DashboardCard
                                label="With PIC Squad"
                                value={isLoading ? "--" : managersWithAssignments}
                                icon={CheckCircle2}
                                colorClass="text-emerald-600 bg-emerald-50"
                                loading={isLoading}
                                isActive={showAssignedOnly}
                                onClick={() => setShowAssignedOnly(true)}
                            />
                            <DashboardCard
                                label="Total Links"
                                value={isLoading ? "--" : totalLinks}
                                subValue="LIVE"
                                icon={ShieldCheck}
                                colorClass="text-amber-600 bg-amber-50"
                                loading={isLoading}
                            />
                        </section>

                        {/* Sticky Search & Filter Bar */}
                        <div className="sticky top-[56px] md:top-[64px] z-[45] flex flex-col xl:flex-row xl:items-center gap-3 bg-white/80 backdrop-blur-md p-2 rounded-[24px] border border-zinc-200/40 shadow-sm transition-all">
                            <div className="flex gap-1.5 overflow-x-auto pb-1 xl:pb-0 scrollbar-none flex-1">
                                <StatPill
                                    label="All Managers"
                                    count={salesManagers.length}
                                    isActive={!showAssignedOnly}
                                    onClick={() => setShowAssignedOnly(false)}
                                    loading={isLoading}
                                    icon={LayoutGrid}
                                />
                                <StatPill
                                    label="Assigned Only"
                                    count={managersWithAssignments}
                                    isActive={showAssignedOnly}
                                    onClick={() => setShowAssignedOnly(true)}
                                    loading={isLoading}
                                    icon={ShieldCheck}
                                />
                            </div>

                            <div className="flex flex-col md:flex-row gap-2 xl:min-w-[550px]">
                                <div className="relative flex-1 group">
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-zinc-300 group-focus-within:text-zinc-800 transition-colors" />
                                    <input
                                        ref={searchRef}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder='Search manager by name or ID...'
                                        className="w-full pl-10 pr-9 h-10 rounded-xl bg-white shadow-sm ring-1 ring-zinc-200 outline-none focus:ring-2 focus:ring-zinc-900 transition-all text-xs font-bold"
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                                        {searchQuery && (
                                            <button
                                                onClick={() => setSearchQuery("")}
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
                                        onClick={() => { setSearchQuery(""); setShowAssignedOnly(false); setCurrentPage(1); }}
                                        className="h-10 px-3 rounded-xl bg-white border-zinc-200 hover:bg-zinc-50 text-zinc-600 font-black text-[10px] uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm"
                                    >
                                        <RotateCcw className="size-3.5" />
                                        <span>Reset</span>
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* ── SYSTEM GUIDE DIALOG ── */}
                        <Dialog open={showGuide} onOpenChange={setShowGuide}>
                            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-[32px] border-none shadow-2xl p-0 bg-white scrollbar-thin scrollbar-thumb-zinc-200 scrollbar-track-transparent hover:scrollbar-thumb-zinc-300 transition-colors">
                                <div className="sticky top-0 bg-white/80 backdrop-blur-xl z-10 px-8 py-6 border-b border-zinc-100 flex items-center justify-between">
                                    <div>
                                        <h2 className="text-[20px] font-black text-zinc-900 tracking-tight">
                                            Assignment Matrix Guide
                                        </h2>
                                        <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Manager & PIC Mapping</p>
                                    </div>
                                </div>

                                <div className="p-8 space-y-8">
                                    <section>
                                        <div className="mb-4">
                                            <h3 className="text-[14px] font-black text-zinc-900 uppercase tracking-wide">Core Concepts</h3>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <GuideItem 
                                                icon={LayoutGrid} 
                                                title="Team View" 
                                                description="Expand any manager card to see and manage their currently assigned engineering squad."
                                                colorClass="bg-blue-50 text-blue-600"
                                            />
                                            <GuideItem 
                                                icon={UserPlus} 
                                                title="Assign PIC" 
                                                description="Click on any engineer name in the expanded view to instantly assign them to that manager."
                                                colorClass="bg-emerald-50 text-emerald-600"
                                            />
                                        </div>
                                    </section>

                                    <section>
                                        <div className="mb-4">
                                            <h3 className="text-[14px] font-black text-zinc-900 uppercase tracking-wide">Efficiency Tools</h3>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <GuideItem 
                                                icon={Zap} 
                                                title="Batch Actions" 
                                                description="Use 'Assign All' or 'Clear All' to perform mass updates for a manager's entire squad."
                                                colorClass="bg-amber-50 text-amber-600"
                                            />
                                            <GuideItem 
                                                icon={ShieldCheck} 
                                                title="Real-time Sync" 
                                                description="All assignments are synced to the cloud instantly. Discarding changes is only possible before confirmation."
                                                colorClass="bg-zinc-900 text-white"
                                            />
                                        </div>
                                    </section>

                                    <div className="bg-zinc-900 rounded-2xl p-6 text-white flex items-center justify-between gap-6 overflow-hidden relative">
                                        <div className="relative z-10">
                                            <h4 className="text-[15px] font-black mb-1">Pro Tip!</h4>
                                            <p className="text-[11px] font-medium text-zinc-400 leading-relaxed max-w-[300px]">
                                                Use the <Search className="inline size-3 text-emerald-500" /> search bar inside a manager's card to quickly find specific engineers in a large list.
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

                        {/* Managers List Section */}
                        <div className="bg-white rounded-[28px] shadow-sm border border-zinc-200/60 overflow-hidden">
                            <div className="divide-y divide-zinc-50/80 min-h-[400px]">
                                {isLoading ? (
                                    Array.from({ length: 6 }).map((_, i) => (
                                        <div key={i} className="px-6 py-6 animate-pulse flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <Skeleton className="size-12 rounded-2xl" />
                                                <div className="space-y-2">
                                                    <Skeleton className="h-4 w-40" />
                                                    <Skeleton className="h-3 w-24" />
                                                </div>
                                            </div>
                                            <Skeleton className="size-10 rounded-xl" />
                                        </div>
                                    ))
                                ) : paginatedManagers.length > 0 ? (
                                    paginatedManagers.map((manager) => {
                                        const assignedCount = assignments[manager._id]?.length || 0
                                        const isOpen = openManager === manager._id
                                        
                                        return (
                                            <Collapsible 
                                                key={manager._id} 
                                                open={isOpen} 
                                                onOpenChange={() => setOpenManager(isOpen ? null : manager._id)}
                                                className="group"
                                            >
                                                <CollapsibleTrigger className={cn(
                                                    "w-full flex items-center justify-between p-5 md:p-6 transition-all text-left outline-none",
                                                    isOpen ? "bg-zinc-50/80" : "hover:bg-zinc-50/40"
                                                )}>
                                                    <div className="flex items-center gap-4">
                                                        <div className="size-12 rounded-2xl bg-gradient-to-br from-zinc-100 to-zinc-200 flex items-center justify-center text-zinc-600 text-[13px] font-black overflow-hidden border border-zinc-200 shadow-sm shrink-0 transition-transform group-hover:scale-105">
                                                            {manager.profilePicture ? (
                                                                <img src={manager.profilePicture} alt="" className="size-full object-cover" />
                                                            ) : (
                                                                <span>{manager.Firstname?.[0]}{manager.Lastname?.[0]}</span>
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h3 className="text-[13px] font-black text-zinc-900 uppercase tracking-tight truncate">
                                                                {manager.Firstname} {manager.Lastname}
                                                            </h3>
                                                            <div className="flex flex-wrap items-center gap-x-3 mt-1">
                                                                <span className="text-[9px] font-black text-zinc-400 tracking-widest uppercase">{manager.ReferenceID || "ID-UNSET"}</span>
                                                                <div className="flex items-center gap-1.5">
                                                                    <div className={cn("size-1.5 rounded-full", assignedCount > 0 ? "bg-emerald-500" : "bg-zinc-300")} />
                                                                    <span className={cn("text-[9px] font-black uppercase tracking-tight", assignedCount > 0 ? "text-emerald-600" : "text-zinc-500")}>
                                                                        {assignedCount} {assignedCount === 1 ? 'Engineer' : 'Engineers'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className={cn(
                                                        "size-9 rounded-xl border flex items-center justify-center transition-all shrink-0 shadow-sm",
                                                        isOpen ? "bg-zinc-900 border-zinc-900 text-white" : "bg-white border-zinc-200 text-zinc-400 group-hover:border-zinc-300 group-hover:text-zinc-600"
                                                    )}>
                                                        {isOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                                                    </div>
                                                </CollapsibleTrigger>
                                                
                                                <CollapsibleContent className="bg-white border-t border-zinc-100 p-6 md:p-8 animate-in slide-in-from-top-2">
                                                    <div className="mb-6 flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between bg-zinc-50/50 p-4 rounded-2xl border border-zinc-100">
                                                        <div className="relative flex-1 max-w-md group">
                                                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400 group-focus-within:text-zinc-900 transition-colors" />
                                                            <input
                                                                value={engineerSearchByManager[manager._id] || ""}
                                                                onChange={(e) => setEngineerSearchByManager((prev) => ({ ...prev, [manager._id]: e.target.value }))}
                                                                placeholder="Search for an engineer..."
                                                                className="w-full h-10 rounded-xl border border-zinc-200 bg-white pl-10 pr-4 text-[11px] font-black uppercase outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
                                                            />
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <Button
                                                                variant="outline"
                                                                className="h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border-zinc-200 bg-white hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-all flex items-center gap-2"
                                                                onClick={() =>
                                                                    setConfirmAction({
                                                                        type: "bulk",
                                                                        managerId: manager._id,
                                                                        mode: "assign_all",
                                                                        managerName: `${manager.Firstname} ${manager.Lastname}`,
                                                                    })
                                                                }
                                                            >
                                                                <UserPlus className="size-3.5" />
                                                                <span>Assign All</span>
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                className="h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border-zinc-200 bg-white hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all flex items-center gap-2"
                                                                onClick={() =>
                                                                    setConfirmAction({
                                                                        type: "bulk",
                                                                        managerId: manager._id,
                                                                        mode: "clear_all",
                                                                        managerName: `${manager.Firstname} ${manager.Lastname}`,
                                                                    })
                                                                }
                                                            >
                                                                <UserMinus className="size-3.5" />
                                                                <span>Clear All</span>
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                                        {engineers
                                                            .filter((eng) => {
                                                                const q = (engineerSearchByManager[manager._id] || "").toLowerCase().trim()
                                                                if (!q) return true
                                                                return `${eng.Firstname} ${eng.Lastname}`.toLowerCase().includes(q)
                                                            })
                                                            .map((eng) => {
                                                                const fullName = `${eng.Firstname} ${eng.Lastname}`
                                                                const isAssigned = (assignments[manager._id] || []).includes(fullName)
                                                                
                                                                return (
                                                                    <button
                                                                        key={eng._id}
                                                                        onClick={() => setConfirmAction({ type: "toggle", managerId: manager._id, engName: fullName })}
                                                                        className={cn(
                                                                            "group flex items-center justify-between p-3.5 rounded-xl border transition-all duration-200 active:scale-95 text-left",
                                                                            isAssigned
                                                                                ? "bg-zinc-900 border-zinc-900 text-white shadow-md ring-4 ring-zinc-900/5"
                                                                                : "bg-white border-zinc-100 hover:border-zinc-300 hover:bg-zinc-50"
                                                                        )}
                                                                    >
                                                                        <div className="flex items-center gap-3 overflow-hidden">
                                                                            <div className={cn(
                                                                                "size-8 rounded-lg overflow-hidden shrink-0 border transition-colors",
                                                                                isAssigned ? "border-white/10" : "border-zinc-100"
                                                                            )}>
                                                                                {eng.profilePicture ? (
                                                                                    <img src={eng.profilePicture} alt="" className="size-full object-cover" />
                                                                                ) : (
                                                                                    <div className="size-full flex items-center justify-center bg-zinc-50 text-[9px] font-black text-zinc-400">
                                                                                        {eng.Firstname[0]}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                            <div className="min-w-0">
                                                                                <p className={cn(
                                                                                    "text-[10px] font-black uppercase tracking-tight truncate",
                                                                                    isAssigned ? "text-white" : "text-zinc-900"
                                                                                )}>{fullName}</p>
                                                                                <p className={cn(
                                                                                    "text-[8px] font-bold uppercase tracking-widest",
                                                                                    isAssigned ? "text-zinc-400" : "text-zinc-400"
                                                                                )}>ENGINEERING</p>
                                                                            </div>
                                                                        </div>
                                                                        {isAssigned && <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />}
                                                                    </button>
                                                                )
                                                        })}
                                                    </div>
                                                </CollapsibleContent>
                                            </Collapsible>
                                        )
                                    })
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
                                        <div className="p-4 bg-zinc-50 rounded-3xl mb-4 border border-zinc-100">
                                            <Search className="size-8 opacity-20" />
                                        </div>
                                        <p className="text-[11px] font-black uppercase tracking-[0.2em]">No managers found</p>
                                        <Button variant="ghost" onClick={() => { setSearchQuery(""); setShowAssignedOnly(false); }} className="mt-2 text-[10px] font-black uppercase text-blue-600 hover:bg-blue-50">Clear all filters</Button>
                                    </div>
                                )}
                            </div>

                            <div className="px-6 py-4 bg-zinc-50/50 border-t border-zinc-100 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Show</span>
                                    <Select value={itemsPerPage} onValueChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}>
                                        <SelectTrigger className="h-8 w-[85px] rounded-lg bg-white border-zinc-200 text-[10px] font-black shadow-sm focus:ring-zinc-900">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl border-zinc-200">
                                            <SelectItem value="5" className="text-[10px] font-bold uppercase">5</SelectItem>
                                            <SelectItem value="10" className="text-[10px] font-bold uppercase">10</SelectItem>
                                            <SelectItem value="25" className="text-[10px] font-bold uppercase">25</SelectItem>
                                            <SelectItem value="50" className="text-[10px] font-bold uppercase">50</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap hidden sm:inline">per page</span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mr-4 hidden sm:inline">
                                        Page {currentPage} of {totalPages || 1}
                                    </p>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage(p => p - 1)}
                                        className="size-8 rounded-lg border-zinc-200 bg-white shadow-sm hover:bg-zinc-50 active:scale-95 disabled:opacity-30"
                                    >
                                        <ChevronLeft className="size-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        disabled={currentPage === totalPages || totalPages === 0}
                                        onClick={() => setCurrentPage(p => p + 1)}
                                        className="size-8 rounded-lg border-zinc-200 bg-white shadow-sm hover:bg-zinc-50 active:scale-95 disabled:opacity-30"
                                    >
                                        <ChevronRight className="size-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </main>

                    {/* MODALS & NOTIFICATIONS */}
                    <AlertDialog open={!!confirmAction} onOpenChange={() => !isSaving && setConfirmAction(null)}>
                        <AlertDialogContent className="bg-white rounded-[32px] border-none shadow-2xl max-w-[90vw] sm:max-w-[400px] p-0 overflow-hidden">
                            <div className="bg-zinc-50/80 border-b border-zinc-100 p-8 flex flex-col items-center text-center">
                                <div className="size-20 bg-white rounded-[2rem] border border-zinc-100 shadow-xl shadow-zinc-200/50 flex items-center justify-center mb-6 relative group">
                                    {isSaving ? (
                                        <RefreshCw className="size-8 text-zinc-900 animate-spin" />
                                    ) : (
                                        <>
                                            <ShieldCheck className="size-8 text-emerald-500" />
                                            <div className="absolute inset-0 bg-emerald-500/5 animate-ping rounded-[2rem] -z-10" />
                                        </>
                                    )}
                                </div>
                                <AlertDialogTitle className="text-[20px] font-black text-zinc-900 tracking-tight uppercase">
                                    Cloud Update
                                </AlertDialogTitle>
                                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-1">Matrix Synchronization</p>
                            </div>

                            <div className="p-8">
                                <AlertDialogDescription className="text-[12px] font-bold leading-relaxed text-zinc-500 uppercase tracking-tight text-center px-2">
                                    {confirmAction?.type === "toggle" && (
                                        <>
                                            Are you sure you want to update the assignment for <span className="text-zinc-900 font-black">{confirmAction.engName}</span>? This change will be applied system-wide.
                                        </>
                                    )}
                                    {confirmAction?.type === "bulk" && (
                                        <>
                                            This will {confirmAction.mode === "assign_all" ? "assign all available engineers" : "remove all assignments"} for <span className="text-zinc-900 font-black">{confirmAction.managerName}</span>.
                                        </>
                                    )}
                                </AlertDialogDescription>

                                <div className="flex gap-3 mt-8">
                                    <AlertDialogCancel disabled={isSaving} className="flex-1 h-12 rounded-2xl border-zinc-200 bg-white text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 text-[11px] font-black uppercase tracking-widest transition-all">
                                        Discard
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={(e) => { e.preventDefault(); handleSaveAssignment(); }}
                                        disabled={isSaving}
                                        className="flex-1 h-12 rounded-2xl bg-zinc-900 text-white hover:bg-zinc-800 text-[11px] font-black uppercase tracking-widest transition-all shadow-lg shadow-zinc-200"
                                    >
                                        {isSaving ? <><Loader2 className="size-4 animate-spin mr-2" /> Syncing...</> : "Confirm"}
                                    </AlertDialogAction>
                                </div>
                            </div>
                        </AlertDialogContent>
                    </AlertDialog>

                    {toast && (
                        <Toast 
                            message={toast.message} 
                            type={toast.type} 
                            onClose={() => setToast(null)} 
                        />
                    )}
                </SidebarInset>
            </SidebarProvider>
        </ProtectedPageWrapper>
    )
}
