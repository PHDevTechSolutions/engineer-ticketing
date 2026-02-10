"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import ProtectedPageWrapper from "@/components/protected-page-wrapper"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import {
    Plus, Search, ChevronRight, Layout, RotateCcw,
    Clock, Hammer, User2, Loader2, CheckCircle2, ShieldCheck
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// FIREBASE
import { db } from "@/lib/firebase"
import { collection, onSnapshot, query, orderBy, where } from "firebase/firestore"
import { PageHeader } from "@/components/page-header"

/**
 * @name ShopDrawingListPage
 * @department ENGINEERING
 * @protocol Multi-Dept Visibility Rev 2.6.4-Fixed
 */
export default function ShopDrawingListPage() {
    const router = useRouter()
    const [user, setUser] = React.useState<{ id: string | null; dept: string }>({ id: null, dept: "" })
    const [isUserLoading, setIsUserLoading] = React.useState(true)
    const [drawings, setDrawings] = React.useState<any[]>([])
    const [isDataLoading, setIsDataLoading] = React.useState(true)
    const [selectedStatus, setSelectedStatus] = React.useState<string | null>(null)
    const [searchQuery, setSearchQuery] = React.useState("")

    // 1. IDENTITY & DEPARTMENT RETRIEVAL (Matching SiteVisit Logic)
    React.useEffect(() => {
        const storedId = localStorage.getItem("userId")
        if (!storedId) { 
            setIsUserLoading(false)
            setIsDataLoading(false) 
            return 
        }

        const fetchUser = async () => {
            try {
                const res = await fetch(`/api/user?id=${encodeURIComponent(storedId)}`)
                const data = await res.json()
                setUser({ 
                    id: storedId, 
                    dept: data.Department?.toUpperCase() || "SALES" 
                })
            } catch (error) {
                console.error("Profile Retrieval Error:", error)
            } finally {
                setIsUserLoading(false)
            }
        }
        fetchUser()
    }, [])

    // 2. LIVE DATA SYNC (Synchronized with SiteVisit Logic)
    React.useEffect(() => {
        if (isUserLoading || !user.id) return

        setIsDataLoading(true)
        const baseCollection = collection(db, "shop_drawing_requests")
        let q

        const userDept = user.dept.toUpperCase()
        const hasGlobalAccess = userDept === "ENGINEERING" || userDept === "IT"

        if (hasGlobalAccess) {
            // Admin View: All records
            q = query(baseCollection, orderBy("createdAt", "desc"))
        } else {
            // Restricted View: User-specific submissions
            q = query(
                baseCollection,
                where("submittedBy", "==", user.id),
                orderBy("createdAt", "desc")
            )
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const liveData = snapshot.docs.map(doc => {
                const data = doc.data()
                // Ensure date formatting is safe
                const rawDate = data.createdAt?.toDate ? data.createdAt.toDate() : new Date()
                
                return {
                    id: doc.id.slice(-6).toUpperCase(),
                    fullId: doc.id,
                    ...data,
                    project: data.projectName || data.parameters?.notes?.substring(0, 20) || "Standard Requirement",
                    date: rawDate.toLocaleDateString('en-CA'),
                    status: data.status?.toUpperCase() || "PENDING_REVIEW"
                }
            })
            setDrawings(liveData)
            setIsDataLoading(false)
        }, (error) => {
            console.error("Firestore Sync Error:", error)
            setIsDataLoading(false)
        })

        return () => unsubscribe()
    }, [user, isUserLoading]) // Monitoring the whole user object like SiteVisit

    // 3. CLIENT-SIDE FILTERING
    const filteredDrawings = drawings.filter(d => {
        const matchesSearch = d.project?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             d.id.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesStatus = selectedStatus ? d.status === selectedStatus : true
        return matchesSearch && matchesStatus
    })

    const handleCreateRequest = () => router.push('/request/shop-drawing/add')

    return (
        <ProtectedPageWrapper>
            <SidebarProvider defaultOpen={false}>
                <AppSidebar userId={user.id} />
                <SidebarInset className="bg-[#F9FAFA] font-sans pb-24 md:pb-0 relative">

                    <PageHeader
                        title="DRAWING_INVENTORY"
                        version="REV 2.6.4"
                        showBackButton={true}
                        trigger={<SidebarTrigger className="mr-2" />}
                        actions={
                            <div className="flex items-center gap-3">
                                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-black/5 border border-black/10 rounded-sm shadow-sm">
                                    <ShieldCheck className="size-3 text-black/50" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-black/70">
                                        DEPT: {user.dept}
                                    </span>
                                </div>
                                {!isUserLoading && user.dept === "SALES" && (
                                    <Button
                                        onClick={handleCreateRequest}
                                        className="hidden md:flex bg-[#121212] text-white font-bold uppercase text-[10px] tracking-widest h-10 px-6 rounded-md shadow-md hover:bg-black transition-all"
                                    >
                                        <Plus className="mr-2 size-4" /> Create Request
                                    </Button>
                                )}
                            </div>
                        }
                    />

                    <main className="flex flex-1 flex-col gap-6 p-4 md:p-10 max-w-7xl mx-auto w-full">

                        {/* ANALYTICS SECTION */}
                        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard label="Total Load" val={drawings.length} icon={Layout} isActive={selectedStatus === null} onClick={() => setSelectedStatus(null)} color="#121212" />
                            <StatCard label="Awaiting Review" val={drawings.filter(d => d.status === "PENDING_REVIEW").length} icon={Clock} isActive={selectedStatus === "PENDING_REVIEW"} onClick={() => setSelectedStatus("PENDING_REVIEW")} color="#F59E0B" />
                            <StatCard label="In Development" val={drawings.filter(d => d.status === "IN_DEVELOPMENT").length} icon={Hammer} isActive={selectedStatus === "IN_DEVELOPMENT"} onClick={() => setSelectedStatus("IN_DEVELOPMENT")} color="#3B82F6" />
                            <StatCard label="Finalized" val={drawings.filter(d => d.status === "FINALIZED").length} icon={CheckCircle2} isActive={selectedStatus === "FINALIZED"} onClick={() => setSelectedStatus("FINALIZED")} color="#10B981" />
                        </section>

                        {/* SEARCH & SYNC CONTROLS */}
                        <div className="flex flex-col md:flex-row gap-4 mt-2">
                            <div className="relative flex-1 group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-black/30 group-focus-within:text-black transition-colors" />
                                <Input
                                    placeholder="Search Project Title or Reference ID..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-11 h-12 bg-white border-black/10 rounded-md shadow-sm focus-visible:ring-black"
                                />
                            </div>
                            <Button variant="outline" onClick={() => { setSelectedStatus(null); setSearchQuery("") }} className="h-12 px-6 bg-white border-black/10 font-bold text-[10px] uppercase tracking-widest hover:bg-[#121212] hover:text-white transition-all shadow-sm">
                                <RotateCcw className="mr-2 size-3" /> Reset Sync
                            </Button>
                        </div>

                        {/* PROTOCOL LEDGER TABLE */}
                        <div className="bg-white border border-black/5 rounded-lg overflow-hidden shadow-sm">
                            <div className="hidden md:grid grid-cols-5 bg-[#F9FAFA] border-b border-black/5 p-5">
                                {["Reference", "Project Entity", "Sync Date", "Personnel", "Status"].map((h) => (
                                    <span key={h} className="text-[10px] font-black uppercase tracking-widest text-black/40">{h}</span>
                                ))}
                            </div>

                            <div className="divide-y divide-black/5">
                                {isDataLoading ? (
                                    <div className="p-20 flex flex-col items-center gap-4">
                                        <Loader2 className="animate-spin size-6 text-black/10" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-black/20">Accessing Protocol Records...</span>
                                    </div>
                                ) : filteredDrawings.length === 0 ? (
                                    <div className="p-20 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-black/20 italic">
                                        System_Null // No Department Records
                                    </div>
                                ) : (
                                    filteredDrawings.map((item) => (
                                        <div
                                            key={item.fullId}
                                            onClick={() => router.push(`/request/shop-drawing/${item.fullId}`)}
                                            className="grid grid-cols-1 md:grid-cols-5 gap-4 p-6 hover:bg-[#F9FAFA] cursor-pointer transition-all items-center active:scale-[0.99]"
                                        >
                                            <div className="flex flex-col">
                                                <span className="text-[11px] font-bold font-mono text-black">#{item.id}</span>
                                                <span className="text-[9px] uppercase text-black/40 mt-1 font-bold">DRAWING_ID</span>
                                            </div>

                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-black uppercase tracking-tight truncate pr-4">{item.project}</span>
                                                <span className="text-[9px] text-black/30 font-bold uppercase">{item.parameters?.postType || "Standard"} POLE</span>
                                            </div>

                                            <span className="text-[12px] text-black/50 font-medium italic">{item.date}</span>

                                            <div className="flex items-center gap-2 text-[11px] font-bold uppercase text-black/70">
                                                <User2 className="size-3 text-black/20" />
                                                <span className="truncate">{item.assignedTo ? "ENGINEERING_ACTIVE" : "UNASSIGNED"}</span>
                                            </div>

                                            <div className="flex items-center md:justify-end gap-4">
                                                <Badge variant="outline" className={cn("rounded-sm font-black text-[9px] uppercase border px-2.5 py-0.5", getStatusStyles(item.status))}>
                                                    {item.status.replace("_", " ")}
                                                </Badge>
                                                <ChevronRight className="size-4 text-black/10 transition-all" />
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </main>

                    {/* MOBILE FLOATING ACTION BUTTON */}
                    {!isUserLoading && user.dept === "SALES" && (
                         <div className="md:hidden fixed bottom-8 right-6 z-50">
                         <Button 
                             onClick={handleCreateRequest}
                             className="size-16 rounded-full bg-[#121212] text-white shadow-2xl hover:bg-black active:scale-95 transition-all flex items-center justify-center border border-white/10"
                         >
                             <Plus className="size-6 stroke-[3px]" />
                         </Button>
                     </div>
                    )}
                </SidebarInset>
            </SidebarProvider>
        </ProtectedPageWrapper>
    )
}

function StatCard({ label, val, icon: Icon, isActive, onClick, color }: any) {
    return (
        <div
            onClick={onClick}
            className={cn(
                "cursor-pointer p-5 flex flex-col gap-3 transition-all border rounded-lg bg-white shadow-sm",
                isActive ? "border-black ring-1 ring-black/5 translate-y-[-2px]" : "border-black/5 opacity-80 hover:opacity-100 shadow-none"
            )}
        >
            <div className="flex justify-between items-start">
                <Icon className="size-5" style={{ color: isActive ? color : '#ccc' }} />
                <span className="text-2xl font-bold tracking-tighter text-[#121212]">{val.toString().padStart(2, '0')}</span>
            </div>
            <span className={cn("text-[10px] font-bold uppercase tracking-[0.1em]", isActive ? "text-black" : "text-black/40")}>{label}</span>
        </div>
    )
}

function getStatusStyles(status: string) {
    switch (status?.toUpperCase()) {
        case "PENDING_REVIEW": return "text-amber-600 border-amber-200 bg-amber-50";
        case "IN_DEVELOPMENT": return "text-blue-600 border-blue-200 bg-blue-50";
        case "FINALIZED": return "text-emerald-600 border-emerald-200 bg-emerald-50";
        default: return "text-black/40 border-black/10 bg-black/5";
    }
}