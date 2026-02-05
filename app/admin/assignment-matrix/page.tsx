"use client"

import * as React from "react"
import { db } from "@/lib/firebase"
import { collection, onSnapshot, query, doc, setDoc } from "firebase/firestore"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Search,
    ChevronDown,
    ChevronUp,
    CheckCircle2,
    RefreshCw,
    ShieldCheck,
    AlertTriangle,
    Users,
    Info,
    ChevronLeft,
    ChevronRight,
    X,
    RotateCcw
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

export default function PICAssignmentMatrixPage() {
    const [salesManagers, setSalesManagers] = React.useState<any[]>([])
    const [engineers, setEngineers] = React.useState<any[]>([])
    const [assignments, setAssignments] = React.useState<Record<string, string[]>>({})
    const [isLoading, setIsLoading] = React.useState(true)
    const [openManager, setOpenManager] = React.useState<string | null>(null)

    // UI STATES
    const [showInstructions, setShowInstructions] = React.useState(false) // Default: Not open
    const [searchQuery, setSearchQuery] = React.useState("")
    const [currentPage, setCurrentPage] = React.useState(1)
    const [itemsPerPage, setItemsPerPage] = React.useState("10") // Uniform density

    const [confirmAction, setConfirmAction] = React.useState<{ managerId: string, engName: string } | null>(null)

    React.useEffect(() => {
        const initializeMatrix = async () => {
            try {
                const res = await fetch('/api/user')
                const allUsers = await res.json()

                const managers = allUsers.filter((u: any) =>
                    u.Department?.trim() === "Sales" && u.Role?.trim() === "Manager"
                )
                const engs = allUsers.filter((u: any) => u.Department?.toUpperCase() === "ENGINEERING")

                setSalesManagers(managers)
                setEngineers(engs)

                const q = query(collection(db, "pic_assignments"))
                const unsubscribe = onSnapshot(q, (snapshot) => {
                    const mapping: Record<string, string[]> = {}
                    snapshot.docs.forEach(doc => { mapping[doc.id] = doc.data().assignedPics || [] })
                    setAssignments(mapping)
                    setIsLoading(false)
                })
                return () => unsubscribe()
            } catch (err) { console.error("SYNC_ERROR:", err) }
        }
        initializeMatrix()
    }, [])

    const executeAssignment = async () => {
        if (!confirmAction) return
        const { managerId, engName } = confirmAction
        const currentBatch = assignments[managerId] || []
        const newBatch = currentBatch.includes(engName) ? currentBatch.filter(n => n !== engName) : [...currentBatch, engName]

        try {
            await setDoc(doc(db, "pic_assignments", managerId), {
                assignedPics: newBatch,
                updatedAt: new Date(),
                managerName: salesManagers.find(m => m._id === managerId)?.Firstname,
                managerRole: "Sales Leadership"
            }, { merge: true })
        } finally {
            setConfirmAction(null)
        }
    }

    const filteredManagers = salesManagers.filter(m =>
        `${m.Firstname} ${m.Lastname} ${m.ReferenceID || ''}`.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // UNIFIED PAGINATION LOGIC
    const limit = parseInt(itemsPerPage)
    const totalPages = Math.ceil(filteredManagers.length / limit)
    const paginatedManagers = filteredManagers.slice((currentPage - 1) * limit, currentPage * limit)

    // Reset pagination on search
    React.useEffect(() => { setCurrentPage(1) }, [searchQuery, itemsPerPage])

    return (
        <ProtectedPageWrapper>
            <SidebarProvider defaultOpen={false}>
                <AppSidebar userId={typeof window !== 'undefined' ? localStorage.getItem("userId") : null} />
                <SidebarInset className="bg-[#F9FAFA] min-h-screen">
                    <PageHeader title="ASSIGNMENT_MATRIX" version="BUILD: PIC-V4.0.ENG" trigger={<SidebarTrigger className="mr-2" />} />

                    <main className="flex-1 p-4 md:p-10 max-w-5xl mx-auto w-full space-y-6">

                        {/* DISMISSIBLE USER GUIDANCE */}
                        {showInstructions ? (
                            <div className="bg-[#121212] p-6 rounded-lg shadow-xl border border-white/5 relative overflow-hidden transition-all">
                                <button onClick={() => setShowInstructions(false)} className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors">
                                    <X className="size-4" />
                                </button>
                                <div className="flex items-center gap-3 mb-4">
                                    <Info className="size-4 text-emerald-400" />
                                    <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Assignment Manual</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <h4 className="text-emerald-400 text-[9px] font-black uppercase tracking-tight">Step 1: Locate Manager</h4>
                                        <p className="text-[9px] text-white/50 font-bold uppercase leading-relaxed">
                                            Use the search bar or pagination to find the Sales Manager. Click their name to expand the assignment panel.
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="text-emerald-400 text-[9px] font-black uppercase tracking-tight">Step 2: Assign Engineer</h4>
                                        <p className="text-[9px] text-white/50 font-bold uppercase leading-relaxed">
                                            Select the Engineering PIC from the list. Dark buttons indicate active assignments, while white buttons indicate unassigned status.
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="text-emerald-400 text-[9px] font-black uppercase tracking-tight">Step 3: Verify Change</h4>
                                        <p className="text-[9px] text-white/50 font-bold uppercase leading-relaxed">
                                            Confirm the pop-up notification. The system will automatically update the routing for the entire sales team under that manager.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <button onClick={() => setShowInstructions(true)} className="flex items-center gap-2 text-[10px] font-bold uppercase text-black/30 hover:text-black transition-colors pl-1">
                                <Info className="size-3.5" /> Open Matrix User Guide
                            </button>
                        )}

                        {/* UNIFIED SEARCH HUD */}
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="relative flex-1 group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-black/30 group-focus-within:text-black transition-colors" />
                                <input
                                    placeholder="Query Manager name or Reference ID..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-11 rounded-md border border-black/10 bg-white h-12 text-sm focus:outline-none focus:ring-1 focus:ring-black shadow-sm placeholder:text-[11px] placeholder:font-bold placeholder:uppercase placeholder:tracking-tight"
                                />
                            </div>
                            <Button
                                variant="outline"
                                onClick={() => { setSearchQuery(""); setCurrentPage(1) }}
                                className="rounded-md border-black/10 h-12 px-6 uppercase font-bold text-[10px] tracking-widest bg-white hover:bg-[#121212] hover:text-white transition-all shadow-sm"
                            >
                                <RotateCcw className="mr-2 size-3" />
                                Reset Matrix
                            </Button>
                        </div>

                        {/* REGISTRY CONTAINER */}
                        <div className="bg-white border border-black/5 rounded-lg shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                            <div className="divide-y divide-black/5 flex-1">
                                {isLoading ? (
                                    <div className="flex flex-col items-center justify-center p-20 gap-3">
                                        <RefreshCw className="size-6 animate-spin text-black/20" />
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-black/30">Loading Matrix...</p>
                                    </div>
                                ) : paginatedManagers.length === 0 ? (
                                    <div className="p-20 text-center opacity-20">
                                        <Users className="size-10 mx-auto mb-4" />
                                        <p className="text-[10px] font-bold uppercase tracking-widest">No Sales Personnel Found</p>
                                    </div>
                                ) : (
                                    paginatedManagers.map((manager) => {
                                        const count = assignments[manager._id]?.length || 0;
                                        return (
                                            <Collapsible key={manager._id} open={openManager === manager._id} onOpenChange={() => setOpenManager(openManager === manager._id ? null : manager._id)}>
                                                <CollapsibleTrigger className="w-full flex items-center justify-between p-5 hover:bg-[#F9FAFA] transition-all group">
                                                    <div className="flex items-center gap-4">
                                                        <div className="size-10 rounded-lg bg-[#121212] flex items-center justify-center text-white text-[10px] font-black shadow-sm">
                                                            {manager.profilePicture ? <img src={manager.profilePicture} className="w-full h-full object-cover rounded-lg" /> : manager.Firstname[0]}
                                                        </div>
                                                        <div className="text-left">
                                                            <h3 className="text-sm font-bold text-[#121212] uppercase tracking-tighter leading-none mb-1">{manager.Firstname} {manager.Lastname}</h3>
                                                            <div className="flex items-center gap-2">
                                                                <Badge variant="outline" className="bg-black/5 text-black/60 border-black/10 text-[8px] font-bold px-2 py-0">
                                                                    {manager.ReferenceID || "SYS-REF"}
                                                                </Badge>
                                                                <div className="flex items-center gap-1 bg-[#121212] text-white px-2 py-0.5 rounded-sm">
                                                                    <Users className="size-[10px]" />
                                                                    <span className="text-[9px] font-black">{count}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="size-8 bg-[#F9FAFA] border border-black/5 rounded-md flex items-center justify-center group-hover:bg-white transition-colors">
                                                        {openManager === manager._id ? <ChevronUp className="size-4 text-black/40" /> : <ChevronDown className="size-4 text-black/40" />}
                                                    </div>
                                                </CollapsibleTrigger>
                                                <CollapsibleContent className="bg-[#F9FAFA] border-y border-black/5 p-6 shadow-inner">
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                        {engineers.map((eng) => {
                                                            const engName = `${eng.Firstname} ${eng.Lastname}`
                                                            const isAssigned = (assignments[manager._id] || []).includes(engName)

                                                            return (
                                                                <button
                                                                    key={eng._id}
                                                                    onClick={() => setConfirmAction({ managerId: manager._id, engName })}
                                                                    className={cn(
                                                                        "flex items-center justify-between p-3 rounded-lg border text-[10px] font-black uppercase transition-all group/eng",
                                                                        isAssigned
                                                                            ? "bg-[#121212] border-[#121212] text-white shadow-lg scale-[1.02]"
                                                                            : "bg-white border-black/5 text-black hover:border-black/20 shadow-sm"
                                                                    )}
                                                                >
                                                                    <div className="flex items-center gap-2">
                                                                        {/* ENGINEER AVATAR ADDITION */}
                                                                        <div className={cn(
                                                                            "size-6 rounded-full overflow-hidden flex-shrink-0 border flex items-center justify-center transition-colors",
                                                                            isAssigned ? "border-white/20 bg-white/10" : "border-black/5 bg-[#F9FAFA]"
                                                                        )}>
                                                                            {eng.profilePicture ? (
                                                                                <img
                                                                                    src={eng.profilePicture}
                                                                                    alt={engName}
                                                                                    className="size-full object-cover"
                                                                                />
                                                                            ) : (
                                                                                <span className={cn(
                                                                                    "text-[8px] font-black",
                                                                                    isAssigned ? "text-white" : "text-black/40"
                                                                                )}>
                                                                                    {eng.Firstname[0]}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <span className="truncate max-w-[100px]">{engName}</span>
                                                                    </div>

                                                                    <div className="flex items-center gap-1.5">
                                                                        {isAssigned ? (
                                                                            <CheckCircle2 className="size-3.5 text-emerald-400" />
                                                                        ) : (
                                                                            <ShieldCheck className="size-3.5 opacity-10 group-hover/eng:opacity-30 transition-opacity" />
                                                                        )}
                                                                    </div>
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

                            {/* UNIFIED PAGINATION FOOTER */}
                            <div className="flex flex-col md:flex-row items-center justify-between px-6 py-5 bg-[#F9FAFA] border-t border-black/5 gap-4">
                                <div className="flex items-center gap-4">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-black/40">
                                        Showing {paginatedManagers.length} of {filteredManagers.length} Nodes
                                    </span>
                                    <div className="flex items-center gap-2 border-l border-black/10 pl-4">
                                        <span className="text-[9px] font-black uppercase text-black/30">Density:</span>
                                        <Select value={itemsPerPage} onValueChange={setItemsPerPage}>
                                            <SelectTrigger className="h-8 w-[75px] bg-white border-black/10 text-[10px] font-bold rounded-sm shadow-sm">
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
                        </div>
                    </main>

                    {/* SAFETY INTERLOCK */}
                    <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
                        <AlertDialogContent className="bg-white rounded-xl border-none shadow-2xl max-w-sm">
                            <AlertDialogHeader className="items-center text-center">
                                <div className="size-12 bg-amber-50 rounded-full flex items-center justify-center mb-2"><AlertTriangle className="size-5 text-amber-500" /></div>
                                <AlertDialogTitle className="font-black uppercase tracking-tight text-sm">Matrix Authorization</AlertDialogTitle>
                                <AlertDialogDescription className="text-[10px] font-medium">Verify Engineering PIC assignment for {salesManagers.find(m => m._id === confirmAction?.managerId)?.Firstname}?</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="flex-col sm:flex-row gap-2 mt-4">
                                <AlertDialogCancel className="w-full rounded-md border-black/5 text-[9px] font-black uppercase h-11">Abort</AlertDialogCancel>
                                <AlertDialogAction onClick={executeAssignment} className="w-full rounded-md bg-[#121212] text-[9px] font-black uppercase text-white h-11">Authorize</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </SidebarInset>
            </SidebarProvider>
        </ProtectedPageWrapper>
    )
}