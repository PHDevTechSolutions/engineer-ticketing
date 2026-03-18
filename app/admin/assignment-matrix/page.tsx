"use client"

import * as React from "react"
import { db } from "@/lib/firebase"
import { collection, onSnapshot, query, doc, setDoc, serverTimestamp, Unsubscribe } from "firebase/firestore"
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
            type === 'success' ? "bg-slate-900 border-emerald-500/50 text-white" : "bg-red-950 border-red-500/50 text-white"
        )}>
            {type === 'success' ? (
                <CheckCircle2 className="size-4 text-emerald-400" />
            ) : (
                <X className="size-4 text-red-400" />
            )}
            <span className="text-[10px] font-black uppercase tracking-widest">{message}</span>
        </div>
    )
}

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
    const [showInstructions, setShowInstructions] = React.useState(false)
    const [searchQuery, setSearchQuery] = React.useState("")
    const [currentPage, setCurrentPage] = React.useState(1)
    const [itemsPerPage, setItemsPerPage] = React.useState("10")
    const [confirmAction, setConfirmAction] = React.useState<{ managerId: string, engName: string } | null>(null)
    const [toast, setToast] = React.useState<{ message: string, type: 'success' | 'error' } | null>(null)

    // 1. HYDRATION & INITIAL LOAD
    React.useEffect(() => {
        // Safe localStorage access
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
        
        const { managerId, engName } = confirmAction
        const previousAssignments = { ...assignments }
        const currentBatch = assignments[managerId] || []
        const isCurrentlyAssigned = currentBatch.includes(engName)
        
        const newBatch = isCurrentlyAssigned
            ? currentBatch.filter(n => n !== engName)
            : [...currentBatch, engName]

        // Update UI immediately
        setAssignments(prev => ({ ...prev, [managerId]: newBatch }))

        const manager = salesManagers.find(m => m._id === managerId)

        try {
            await setDoc(doc(db, "pic_assignments", managerId), {
                assignedPics: newBatch,
                updatedAt: serverTimestamp(),
                managerName: manager ? `${manager.Firstname} ${manager.Lastname}` : "Unknown Manager",
                managerRole: "Sales Manager"
            }, { merge: true })
            
            setToast({ message: "Matrix Updated", type: 'success' })
            setConfirmAction(null)
        } catch (err) {
            setAssignments(previousAssignments) // Rollback
            setToast({ message: "Save failed. Check connection.", type: 'error' })
        } finally {
            setIsSaving(false)
        }
    }

    // 3. FILTER & PAGINATION ENGINE
    const filteredManagers = React.useMemo(() => {
        const q = searchQuery.toLowerCase().trim()
        if (!q) return salesManagers
        return salesManagers.filter(m =>
            `${m.Firstname} ${m.Lastname} ${m.ReferenceID || ''}`.toLowerCase().includes(q)
        )
    }, [salesManagers, searchQuery])

    const limit = parseInt(itemsPerPage)
    const totalPages = Math.max(1, Math.ceil(filteredManagers.length / limit))
    const paginatedManagers = filteredManagers.slice((currentPage - 1) * limit, currentPage * limit)

    // Reset to page 1 on search
    React.useEffect(() => { setCurrentPage(1) }, [searchQuery, itemsPerPage])

    return (
        <ProtectedPageWrapper>
            <SidebarProvider defaultOpen={false}>
                <AppSidebar userId={currentUserId} />
                <SidebarInset className="bg-[#F8FAFC] min-h-screen">
                    <PageHeader
                        title="Assignment Matrix"
                        version="v4.2"
                        trigger={<SidebarTrigger className="mr-2" />}
                    />

                    <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">

                        {/* INSTRUCTIONS */}
                        <div className="w-full">
                            {showInstructions ? (
                                <div className="bg-slate-900 p-6 md:p-8 rounded-3xl shadow-xl border border-slate-800 relative overflow-hidden animate-in fade-in slide-in-from-top-2">
                                    <button 
                                        onClick={() => setShowInstructions(false)} 
                                        className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
                                    >
                                        <X className="size-5" />
                                    </button>
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="size-9 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                                            <Info className="size-4 text-emerald-400" />
                                        </div>
                                        <span className="text-[10px] font-black text-white uppercase tracking-widest">System Guide</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                        {[
                                            { title: "Team View", desc: "Select a manager to expand their current engineering squad." },
                                            { title: "Assign PIC", desc: "Toggle engineers to assign or remove them from a manager's group." },
                                            { title: "Real-time", desc: "All changes are synced instantly across the cloud for the whole team." }
                                        ].map((item, idx) => (
                                            <div key={idx} className="space-y-2 border-l-2 border-slate-800 pl-5">
                                                <h4 className="text-emerald-400 text-[10px] font-black uppercase tracking-widest">{item.title}</h4>
                                                <p className="text-[11px] text-slate-400 font-medium leading-relaxed">{item.desc}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <button onClick={() => setShowInstructions(true)} className="flex items-center gap-2 text-[10px] font-bold uppercase text-slate-400 hover:text-emerald-600 transition-colors tracking-widest px-2">
                                    <Info className="size-3.5" /> View Matrix Instructions
                                </button>
                            )}
                        </div>

                        {/* SEARCH & FILTERS */}
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                                <input
                                    placeholder="Search by name or reference ID..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full h-14 pl-12 pr-4 rounded-2xl border border-slate-200 bg-white text-[13px] focus:outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500/30 transition-all shadow-sm"
                                />
                            </div>
                            <Button
                                variant="outline"
                                onClick={() => { setSearchQuery(""); setCurrentPage(1) }}
                                className="rounded-2xl border-slate-200 h-14 px-8 uppercase font-bold text-[10px] tracking-widest bg-white hover:bg-slate-50 active:scale-95 transition-all"
                            >
                                <RotateCcw className="mr-2 size-4" /> Reset Filters
                            </Button>
                        </div>

                        {/* MAIN DATA CONTAINER */}
                        <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden flex flex-col min-h-[400px]">
                            <div className="divide-y divide-slate-100">
                                {isLoading ? (
                                    <div className="flex flex-col items-center justify-center py-32 gap-4">
                                        <div className="relative">
                                            <RefreshCw className="size-10 animate-spin text-emerald-500" />
                                            <div className="absolute inset-0 blur-xl bg-emerald-500/20 animate-pulse" />
                                        </div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Syncing with Cloud</p>
                                    </div>
                                ) : paginatedManagers.length === 0 ? (
                                    <div className="py-32 text-center">
                                        <Users className="size-16 text-slate-100 mx-auto mb-4" />
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">No matching managers found</p>
                                    </div>
                                ) : (
                                    paginatedManagers.map((manager) => {
                                        const assignedCount = assignments[manager._id]?.length || 0
                                        const isOpen = openManager === manager._id
                                        
                                        return (
                                            <Collapsible 
                                                key={manager._id} 
                                                open={isOpen} 
                                                onOpenChange={() => setOpenManager(isOpen ? null : manager._id)}
                                            >
                                                <CollapsibleTrigger className={cn(
                                                    "w-full flex items-center justify-between p-5 md:p-7 transition-all",
                                                    isOpen ? "bg-slate-50/80" : "hover:bg-slate-50/40"
                                                )}>
                                                    <div className="flex items-center gap-5">
                                                        <div className="size-12 md:size-14 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-600 text-sm font-black overflow-hidden border border-slate-200 shadow-inner shrink-0">
                                                            {manager.profilePicture ? (
                                                                <img src={manager.profilePicture} alt="" className="size-full object-cover" />
                                                            ) : (
                                                                <span>{manager.Firstname?.[0]}{manager.Lastname?.[0]}</span>
                                                            )}
                                                        </div>
                                                        <div className="text-left">
                                                            <h3 className="text-xs md:text-[13px] font-black text-slate-800 uppercase tracking-tight">
                                                                {manager.Firstname} {manager.Lastname}
                                                            </h3>
                                                            <div className="flex flex-wrap items-center gap-x-3 mt-1.5">
                                                                <span className="text-[9px] font-bold text-slate-400 tracking-widest">{manager.ReferenceID || "ID-UNSET"}</span>
                                                                <span className="h-1 w-1 rounded-full bg-slate-300" />
                                                                <div className="flex items-center gap-1.5">
                                                                    <div className={cn("size-1.5 rounded-full", assignedCount > 0 ? "bg-emerald-500 animate-pulse" : "bg-slate-300")} />
                                                                    <span className="text-[9px] font-black uppercase text-slate-600">
                                                                        {assignedCount} {assignedCount === 1 ? 'Engineer' : 'Engineers'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className={cn(
                                                        "size-8 md:size-10 rounded-xl border flex items-center justify-center transition-all shrink-0 shadow-sm",
                                                        isOpen ? "bg-slate-900 border-slate-900 text-white rotate-0" : "bg-white border-slate-200 text-slate-400"
                                                    )}>
                                                        {isOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                                                    </div>
                                                </CollapsibleTrigger>
                                                
                                                <CollapsibleContent className="bg-white border-t border-slate-50 p-6 md:p-8 animate-in slide-in-from-top-1">
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                                        {engineers.map((eng) => {
                                                            const fullName = `${eng.Firstname} ${eng.Lastname}`
                                                            const isAssigned = (assignments[manager._id] || []).includes(fullName)
                                                            
                                                            return (
                                                                <button
                                                                    key={eng._id}
                                                                    onClick={() => setConfirmAction({ managerId: manager._id, engName: fullName })}
                                                                    className={cn(
                                                                        "group flex items-center justify-between p-3.5 rounded-xl border text-[10px] font-black uppercase transition-all duration-200 active:scale-95",
                                                                        isAssigned
                                                                            ? "bg-slate-900 border-slate-900 text-white shadow-md ring-4 ring-slate-900/5"
                                                                            : "bg-white border-slate-100 text-slate-500 hover:border-emerald-500/40 hover:bg-emerald-50/30"
                                                                    )}
                                                                >
                                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                                        <div className={cn(
                                                                            "size-7 rounded-lg overflow-hidden shrink-0 border",
                                                                            isAssigned ? "border-white/10" : "border-slate-100"
                                                                        )}>
                                                                            {eng.profilePicture ? (
                                                                                <img src={eng.profilePicture} alt="" className="size-full object-cover" />
                                                                            ) : (
                                                                                <div className="size-full flex items-center justify-center bg-slate-50 text-[8px]">{eng.Firstname[0]}</div>
                                                                            )}
                                                                        </div>
                                                                        <span className="truncate tracking-tight">{fullName}</span>
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
                                )}
                            </div>

                            {/* FOOTER & PAGINATION */}
                            <div className="flex flex-col sm:flex-row items-center justify-between px-8 py-6 bg-slate-50/50 border-t border-slate-100 gap-6 mt-auto">
                                <div className="flex items-center gap-6 w-full sm:w-auto">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-bold uppercase text-slate-400 tracking-[0.1em]">Database</span>
                                        <span className="text-xs font-black text-slate-900">{filteredManagers.length} Managers</span>
                                    </div>
                                    <div className="h-8 w-[1px] bg-slate-200 hidden sm:block" />
                                    <Select value={itemsPerPage} onValueChange={setItemsPerPage}>
                                        <SelectTrigger className="h-9 w-20 bg-white border-slate-200 text-[10px] font-black rounded-xl shadow-sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {["5", "10", "20", "50"].map(v => <SelectItem key={v} value={v} className="text-xs">{v} Per Page</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">
                                        Page <span className="text-slate-900">{currentPage}</span> of {totalPages}
                                    </span>
                                    <div className="flex gap-2">
                                        <Button 
                                            variant="outline" 
                                            size="icon" 
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                                            disabled={currentPage === 1} 
                                            className="size-10 rounded-xl bg-white shadow-sm hover:bg-slate-50 disabled:opacity-30"
                                        >
                                            <ChevronLeft className="size-5" />
                                        </Button>
                                        <Button 
                                            variant="outline" 
                                            size="icon" 
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                                            disabled={currentPage === totalPages} 
                                            className="size-10 rounded-xl bg-white shadow-sm hover:bg-slate-50 disabled:opacity-30"
                                        >
                                            <ChevronRight className="size-5" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </main>

                    {/* MODALS & NOTIFICATIONS */}
                    <AlertDialog open={!!confirmAction} onOpenChange={() => !isSaving && setConfirmAction(null)}>
                        <AlertDialogContent className="bg-white rounded-[2.5rem] border-none shadow-2xl max-w-[90vw] sm:max-w-[380px] p-10">
                            <AlertDialogHeader className="items-center text-center">
                                <div className="size-20 bg-emerald-50 rounded-[2rem] flex items-center justify-center mb-6 relative">
                                    {isSaving ? (
                                        <RefreshCw className="size-8 text-emerald-600 animate-spin" />
                                    ) : (
                                        <>
                                            <ShieldCheck className="size-8 text-emerald-600" />
                                            <div className="absolute inset-0 bg-emerald-500/10 animate-ping rounded-[2rem] -z-10" />
                                        </>
                                    )}
                                </div>
                                <AlertDialogTitle className="font-black uppercase tracking-widest text-base text-slate-900">
                                    Sync Update?
                                </AlertDialogTitle>
                                <AlertDialogDescription className="text-[11px] font-bold leading-relaxed text-slate-400 uppercase tracking-tight px-4 mt-2">
                                    Confirming this will update the PIC list for <span className="text-emerald-600 font-black">{confirmAction?.engName}</span> in the matrix.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="flex flex-col sm:flex-row gap-3 mt-10 w-full">
                                <AlertDialogCancel disabled={isSaving} className="flex-1 rounded-2xl border-none bg-slate-50 text-[10px] font-black uppercase h-14 hover:bg-slate-100 transition-all">
                                    Discard
                                </AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={(e) => { e.preventDefault(); handleSaveAssignment(); }}
                                    disabled={isSaving}
                                    className="flex-1 rounded-2xl bg-slate-900 text-[10px] font-black uppercase text-white h-14 hover:bg-black shadow-lg hover:shadow-xl transition-all"
                                >
                                    {isSaving ? "Syncing..." : "Confirm"}
                                </AlertDialogAction>
                            </AlertDialogFooter>
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