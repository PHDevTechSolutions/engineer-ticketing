"use client"

import * as React from "react"
import { db } from "@/lib/firebase"
import { collection, onSnapshot, query, doc, setDoc, serverTimestamp } from "firebase/firestore"
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

/**
 * ALERT POPUP (Toast)
 * A simple message that slides in to confirm success or show an error.
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
    // --- APP MEMORY (State) ---
    const [salesManagers, setSalesManagers] = React.useState<any[]>([])
    const [engineers, setEngineers] = React.useState<any[]>([])
    const [assignments, setAssignments] = React.useState<Record<string, string[]>>({})
    const [isLoading, setIsLoading] = React.useState(true)
    const [isSaving, setIsSaving] = React.useState(false)

    // --- VIEW SETTINGS ---
    const [openManager, setOpenManager] = React.useState<string | null>(null)
    const [showInstructions, setShowInstructions] = React.useState(false)
    const [searchQuery, setSearchQuery] = React.useState("")
    const [currentPage, setCurrentPage] = React.useState(1)
    const [itemsPerPage, setItemsPerPage] = React.useState("10")
    const [confirmAction, setConfirmAction] = React.useState<{ managerId: string, engName: string } | null>(null)
    const [toast, setToast] = React.useState<{ message: string, type: 'success' | 'error' } | null>(null)

    // 1. CLOUD SYNC: Fetching and listening to engiconnect data
    React.useEffect(() => {
        let isMounted = true
        let unsubscribeFirestore: (() => void) | undefined

        const loadInitialData = async () => {
            try {
                const res = await fetch('/api/user')
                const allUsers = await res.json()
                
                if (!isMounted) return

                // Separate users by department and role
                const managers = allUsers.filter((u: any) =>
                    u.Department?.toLowerCase() === "sales" && u.Role?.toLowerCase() === "manager"
                )
                const engs = allUsers.filter((u: any) => 
                    u.Department?.toLowerCase() === "engineering"
                )

                setSalesManagers(managers)
                setEngineers(engs)

                // Listen to real-time updates from the database
                const q = query(collection(db, "pic_assignments"))
                unsubscribeFirestore = onSnapshot(q, (snapshot) => {
                    const mapping: Record<string, string[]> = {}
                    snapshot.docs.forEach(doc => { 
                        mapping[doc.id] = doc.data().assignedPics || [] 
                    })
                    setAssignments(mapping)
                    setIsLoading(false)
                }, (error) => {
                    console.error("Connection Error:", error)
                    setIsLoading(false)
                })
            } catch (err) { 
                console.error("Load Error:", err)
                if (isMounted) setIsLoading(false)
            }
        }
        
        loadInitialData()
        return () => { 
            isMounted = false
            if (unsubscribeFirestore) unsubscribeFirestore()
        }
    }, [])

    // 2. SAVE HANDLER: Logic for assigning/unassigning engineers
    const handleSaveAssignment = async () => {
        if (!confirmAction) return
        setIsSaving(true)
        
        const { managerId, engName } = confirmAction
        const previousAssignments = { ...assignments } // Backup for safety
        const currentBatch = assignments[managerId] || []
        const isCurrentlyAssigned = currentBatch.includes(engName)
        
        const newBatch = isCurrentlyAssigned
            ? currentBatch.filter(n => n !== engName)
            : [...currentBatch, engName]

        // Update UI instantly (Optimistic Update)
        setAssignments(prev => ({ ...prev, [managerId]: newBatch }))

        const manager = salesManagers.find(m => m._id === managerId)

        try {
            await setDoc(doc(db, "pic_assignments", managerId), {
                assignedPics: newBatch,
                updatedAt: serverTimestamp(),
                managerName: `${manager?.Firstname} ${manager?.Lastname}`,
                managerRole: "Sales Manager"
            }, { merge: true })
            
            setToast({ message: "Sync Successful", type: 'success' })
            setConfirmAction(null)
        } catch (err) {
            setAssignments(previousAssignments) // Revert if save fails
            setToast({ message: "Sync Failed: Try Again", type: 'error' })
        } finally {
            setIsSaving(false)
        }
    }

    // 3. SEARCH & PAGES: Organizing the list
    const filteredManagers = React.useMemo(() => {
        const q = searchQuery.toLowerCase()
        return salesManagers.filter(m =>
            `${m.Firstname} ${m.Lastname} ${m.ReferenceID || ''}`.toLowerCase().includes(q)
        )
    }, [salesManagers, searchQuery])

    const limit = parseInt(itemsPerPage)
    const totalPages = Math.ceil(filteredManagers.length / limit)
    const paginatedManagers = filteredManagers.slice((currentPage - 1) * limit, currentPage * limit)

    React.useEffect(() => { setCurrentPage(1) }, [searchQuery, itemsPerPage])

    return (
        <ProtectedPageWrapper>
            <SidebarProvider defaultOpen={false}>
                <AppSidebar userId={typeof window !== 'undefined' ? localStorage.getItem("userId") : null} />
                <SidebarInset className="bg-[#F8FAFC] min-h-screen">
                    <PageHeader
                        title="Assignment Matrix"
                        version="v4.2"
                        trigger={<SidebarTrigger className="mr-2" />}
                    />

                    <main className="flex-1 p-3 md:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-4 md:space-y-6">

                        {/* HELP GUIDE */}
                        <div className="w-full">
                            {showInstructions ? (
                                <div className="bg-slate-900 p-6 md:p-8 rounded-2xl md:rounded-3xl shadow-xl border border-slate-800 relative overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                                    <button onClick={() => setShowInstructions(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors p-2">
                                        <X className="size-5" />
                                    </button>
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="size-9 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                                            <Info className="size-4 text-emerald-400" />
                                        </div>
                                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Guide</span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                        {[
                                            { title: "Expand", desc: "Click a manager to see their assigned team." },
                                            { title: "Edit", desc: "Click any engineer's card to assign or remove them." },
                                            { title: "Auto-Save", desc: "Changes sync automatically to engiconnect cloud." }
                                        ].map((item, idx) => (
                                            <div key={idx} className="space-y-1.5 border-l-2 border-slate-800 pl-4">
                                                <h4 className="text-emerald-400 text-[10px] font-black uppercase tracking-tight">{item.title}</h4>
                                                <p className="text-[11px] text-slate-400 font-medium leading-relaxed">{item.desc}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <button onClick={() => setShowInstructions(true)} className="group flex items-center gap-2 text-[10px] font-bold uppercase text-slate-500 hover:text-emerald-600 transition-all tracking-widest px-2 py-1">
                                    <Info className="size-3.5" /> Show Matrix Instructions
                                </button>
                            )}
                        </div>

                        {/* SEARCH BAR */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                                <input
                                    placeholder="Search by name or ID..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full h-12 md:h-14 pl-11 pr-4 rounded-xl border border-slate-200 bg-white text-[13px] focus:outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500/30 transition-all shadow-sm"
                                />
                            </div>
                            <Button
                                variant="outline"
                                onClick={() => { setSearchQuery(""); setCurrentPage(1) }}
                                className="rounded-xl border-slate-200 h-12 md:h-14 px-6 uppercase font-bold text-[10px] tracking-widest bg-white"
                            >
                                <RotateCcw className="mr-2 size-3.5" /> Reset
                            </Button>
                        </div>

                        {/* MANAGER LIST */}
                        <div className="bg-white border border-slate-200 rounded-2xl md:rounded-3xl shadow-sm overflow-hidden flex flex-col">
                            <div className="divide-y divide-slate-100">
                                {isLoading ? (
                                    <div className="flex flex-col items-center justify-center py-24 gap-3">
                                        <RefreshCw className="size-8 animate-spin text-emerald-500" />
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Loading Cloud Data...</p>
                                    </div>
                                ) : paginatedManagers.length === 0 ? (
                                    <div className="py-24 text-center">
                                        <Users className="size-12 text-slate-200 mx-auto mb-3" />
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">No managers found</p>
                                    </div>
                                ) : (
                                    paginatedManagers.map((manager) => {
                                        const count = assignments[manager._id]?.length || 0
                                        const isOpen = openManager === manager._id
                                        return (
                                            <Collapsible key={manager._id} open={isOpen} onOpenChange={() => setOpenManager(isOpen ? null : manager._id)}>
                                                <CollapsibleTrigger className={cn(
                                                    "w-full flex items-center justify-between p-4 md:p-6 transition-all",
                                                    isOpen ? "bg-slate-50/80" : "hover:bg-slate-50/40"
                                                )}>
                                                    <div className="flex items-center gap-4">
                                                        <div className="size-10 md:size-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 text-xs font-black overflow-hidden border border-slate-200 shrink-0">
                                                            {manager.profilePicture ? (
                                                                <img src={manager.profilePicture} alt="" className="size-full object-cover" />
                                                            ) : (
                                                                <span>{manager.Firstname?.[0]}{manager.Lastname?.[0]}</span>
                                                            )}
                                                        </div>
                                                        <div className="text-left">
                                                            <h3 className="text-[11px] md:text-xs font-black text-slate-800 uppercase tracking-tight">
                                                                {manager.Firstname} {manager.Lastname}
                                                            </h3>
                                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                                                                <span className="text-[9px] font-bold text-slate-400 tracking-widest">{manager.ReferenceID || "ID-NEW"}</span>
                                                                <span className="h-1 w-1 rounded-full bg-slate-300" />
                                                                <span className="text-[9px] font-black uppercase text-emerald-600">
                                                                    {count} Assigned
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className={cn(
                                                        "size-7 md:size-8 rounded-lg border flex items-center justify-center transition-all shrink-0",
                                                        isOpen ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-200 text-slate-400"
                                                    )}>
                                                        {isOpen ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                                                    </div>
                                                </CollapsibleTrigger>
                                                <CollapsibleContent className="bg-white border-t border-slate-50 p-4 md:p-6 animate-in slide-in-from-top-1 duration-200">
                                                    <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-3">
                                                        {engineers.map((eng) => {
                                                            const engName = `${eng.Firstname} ${eng.Lastname}`
                                                            const isAssigned = (assignments[manager._id] || []).includes(engName)
                                                            return (
                                                                <button
                                                                    key={eng._id}
                                                                    onClick={() => setConfirmAction({ managerId: manager._id, engName })}
                                                                    className={cn(
                                                                        "flex items-center justify-between p-3 rounded-xl border text-[10px] font-black uppercase transition-all active:scale-[0.98]",
                                                                        isAssigned
                                                                            ? "bg-slate-900 border-slate-900 text-white shadow-sm"
                                                                            : "bg-white border-slate-100 text-slate-500 hover:border-slate-300"
                                                                    )}
                                                                >
                                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                                        <div className={cn("size-6 rounded-md overflow-hidden shrink-0", isAssigned ? "bg-white/10" : "bg-slate-50")}>
                                                                            {eng.profilePicture ? (
                                                                                <img src={eng.profilePicture} alt="" className="size-full object-cover" />
                                                                            ) : (
                                                                                <div className="size-full flex items-center justify-center text-[8px]">{eng.Firstname[0]}</div>
                                                                            )}
                                                                        </div>
                                                                        <span className="truncate">{engName}</span>
                                                                    </div>
                                                                    {isAssigned && <CheckCircle2 className="size-3 text-emerald-400 shrink-0" />}
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

                            {/* TABLE FOOTER */}
                            <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 bg-slate-50/50 border-t border-slate-100 gap-4 mt-auto">
                                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-bold uppercase text-slate-400">Viewing</span>
                                        <span className="text-[10px] font-black text-slate-900">{filteredManagers.length} Total</span>
                                    </div>
                                    <Select value={itemsPerPage} onValueChange={setItemsPerPage}>
                                        <SelectTrigger className="h-8 w-16 bg-white border-slate-200 text-[10px] font-black rounded-lg">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {["5", "10", "20", "50"].map(v => <SelectItem key={v} value={v} className="text-xs">{v}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                                    <span className="text-[9px] font-bold uppercase text-slate-400">
                                        Page {currentPage} of {totalPages || 1}
                                    </span>
                                    <div className="flex gap-1">
                                        <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="size-9 rounded-lg bg-white shadow-sm">
                                            <ChevronLeft className="size-4" />
                                        </Button>
                                        <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="size-9 rounded-lg bg-white shadow-sm">
                                            <ChevronRight className="size-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </main>

                    {/* CONFIRMATION POPUP */}
                    <AlertDialog open={!!confirmAction} onOpenChange={() => !isSaving && setConfirmAction(null)}>
                        <AlertDialogContent className="bg-white rounded-[2rem] border-none shadow-2xl max-w-[90vw] sm:max-w-[340px] p-8">
                            <AlertDialogHeader className="items-center text-center">
                                <div className="size-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4">
                                    {isSaving ? <RefreshCw className="size-7 text-emerald-600 animate-spin" /> : <ShieldCheck className="size-7 text-emerald-600" />}
                                </div>
                                <AlertDialogTitle className="font-black uppercase tracking-tight text-sm text-slate-900">
                                    Confirm Change
                                </AlertDialogTitle>
                                <AlertDialogDescription className="text-[10px] font-medium leading-relaxed text-slate-500 uppercase px-2">
                                    Update <span className="text-slate-900 font-black">{confirmAction?.engName}</span> in this group?
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="flex flex-row gap-2 mt-8 w-full">
                                <AlertDialogCancel disabled={isSaving} className="flex-1 rounded-xl border-slate-100 bg-slate-50 text-[10px] font-black uppercase h-12 m-0">
                                    Back
                                </AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={(e) => { e.preventDefault(); handleSaveAssignment(); }}
                                    disabled={isSaving}
                                    className="flex-1 rounded-xl bg-slate-900 text-[10px] font-black uppercase text-white h-12 hover:bg-black transition-all m-0"
                                >
                                    {isSaving ? "Saving..." : "Confirm"}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>

                    {/* TOAST SYSTEM */}
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