"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import ProtectedPageWrapper from "@/components/protected-page-wrapper"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import {
    Plus, Search, RotateCcw, Layout, Clock, Hammer, 
    CheckCircle2, Loader2, User2, ArrowRight
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// DATABASE
import { db } from "@/lib/firebase"
import { collection, onSnapshot, query, orderBy, where } from "firebase/firestore"
import { PageHeader } from "@/components/page-header"

export default function ShopDrawingListPage() {
    const router = useRouter()
    const [userId, setUserId] = React.useState<string | null>(null)
    const [userDept, setUserDept] = React.useState("")
    
    // NEW: States to hold profile info for engiconnect
    const [userName, setUserName] = React.useState("")
    const [profilePicture, setProfilePicture] = React.useState("")
    
    const [drawings, setDrawings] = React.useState<any[]>([])
    const [isDataLoading, setIsDataLoading] = React.useState(true)
    const [selectedStatus, setSelectedStatus] = React.useState<string | null>(null)
    const [searchTerm, setSearchTerm] = React.useState("")
    
    // Identity & Profile Fetch
    React.useEffect(() => {
        const storedId = localStorage.getItem("userId")
        setUserId(storedId)
        if (!storedId) return

        const fetchProfile = async () => {
            try {
                const res = await fetch(`/api/user?id=${encodeURIComponent(storedId)}`)
                const data = await res.json()
                
                // SAVE PROFILE DATA
                setUserName(data.name || data.fullName || "User")
                setProfilePicture(data.profilePicture || data.image || "")
                
                // Standardize department to lowercase
                setUserDept(data.Department?.toLowerCase() || data.department?.toLowerCase() || "sales")
            } catch (e) { 
                console.error("Profile error:", e) 
            }
        }
        fetchProfile()
    }, [])

    // Real-time Sync
    React.useEffect(() => {
        if (!userId) return

        setIsDataLoading(true)
        const baseCol = collection(db, "shop_drawing_requests")
        const isStaff = userDept === "engineering" || userDept === "it"

        const q = isStaff 
            ? query(baseCol, orderBy("createdAt", "desc"))
            : query(baseCol, where("submittedBy", "==", userId), orderBy("createdAt", "desc"))

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setDrawings(snapshot.docs.map(doc => {
                const data = doc.data()
                return {
                    id: doc.id.slice(-6).toUpperCase(),
                    fullId: doc.id,
                    ...data,
                    project: data.projectName || "New Request",
                    status: (data.status || "PENDING_REVIEW").toUpperCase()
                }
            }))
            setIsDataLoading(false)
        })
        return () => unsubscribe()
    }, [userId, userDept])

    const handleCreateRequest = () => router.push('/request/shop-drawing/add')

    const filtered = drawings.filter(d => {
        const matchesSearch = d.project.toLowerCase().includes(searchTerm.toLowerCase()) || d.id.includes(searchTerm.toUpperCase())
        const matchesStatus = selectedStatus ? d.status === selectedStatus : true
        return matchesSearch && matchesStatus
    })

    return (
        <ProtectedPageWrapper>
            <SidebarProvider defaultOpen={false}>
                <AppSidebar userId={userId} />
                <SidebarInset className="relative bg-[#F4F7F7] min-h-screen font-sans">
                    
                    <PageHeader
                        title="Drawing Hub"
                        version="V2.6"
                        showBackButton={true}
                        trigger={<SidebarTrigger className="mr-2" />}
                        actions={
                            <div className="flex items-center gap-2">
                                {userDept === "sales" && (
                                    <Button onClick={handleCreateRequest} className="hidden md:flex bg-black hover:bg-zinc-800 text-white px-5 rounded-xl h-10 text-xs font-bold tracking-tight">
                                        <Plus className="mr-2 size-4" /> NEW DRAWING REQUEST
                                    </Button>
                                )}
                            </div>
                        }
                    />

                    <main className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6 pb-32 md:pb-8">
                        
                        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard label="All Projects" val={drawings.length} icon={Layout} isActive={selectedStatus === null} onClick={() => setSelectedStatus(null)} />
                            <StatCard label="Reviewing" val={drawings.filter(d => d.status === "PENDING_REVIEW").length} icon={Clock} isActive={selectedStatus === "PENDING_REVIEW"} onClick={() => setSelectedStatus("PENDING_REVIEW")} />
                            <StatCard label="Designing" val={drawings.filter(d => d.status === "IN_DEVELOPMENT").length} icon={Hammer} isActive={selectedStatus === "IN_DEVELOPMENT"} onClick={() => setSelectedStatus("IN_DEVELOPMENT")} />
                            <StatCard label="Finished" val={drawings.filter(d => d.status === "FINALIZED").length} icon={CheckCircle2} isActive={selectedStatus === "FINALIZED"} onClick={() => setSelectedStatus("FINALIZED")} isDone />
                        </section>

                        <div className="flex flex-col md:flex-row gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
                                <input
                                    placeholder="Search project name or #ID..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-11 h-12 rounded-2xl border-none bg-white shadow-sm ring-1 ring-zinc-200 focus:ring-2 focus:ring-black outline-none transition-all text-sm"
                                />
                            </div>
                            <Button variant="outline" onClick={() => { setSelectedStatus(null); setSearchTerm("") }} className="h-12 rounded-2xl bg-white border-zinc-200 font-bold text-[10px] tracking-widest uppercase">
                                <RotateCcw className="mr-2 size-3" /> RESET
                            </Button>
                        </div>

                        <div className="bg-white rounded-[24px] shadow-sm border border-zinc-200/60 overflow-hidden">
                            <div className="divide-y divide-zinc-50">
                                {isDataLoading ? (
                                    <div className="p-20 text-center flex flex-col items-center gap-3">
                                        <Loader2 className="animate-spin text-zinc-200 size-8" />
                                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Opening Files...</p>
                                    </div>
                                ) : filtered.length === 0 ? (
                                    <div className="p-20 text-center text-zinc-400 text-xs font-bold uppercase tracking-widest italic">No Records Found</div>
                                ) : (
                                    filtered.map((d) => (
                                        <div key={d.id} onClick={() => router.push(`/request/shop-drawing/${d.fullId}`)} className="flex flex-col md:grid md:grid-cols-6 gap-4 p-6 items-center hover:bg-zinc-50/40 transition-colors cursor-pointer group">
                                            <span className="hidden md:block text-[10px] font-mono font-bold text-zinc-400">#{d.id}</span>
                                            
                                            <div className="w-full md:col-span-2 flex flex-col">
                                                <div className="flex justify-between items-center md:block">
                                                    <span className="text-sm font-bold text-zinc-900 uppercase truncate group-hover:text-black">{d.project}</span>
                                                    <span className="md:hidden text-[10px] font-mono font-bold text-zinc-300">#{d.id}</span>
                                                </div>
                                                <span className="text-[10px] text-zinc-400 font-medium">Requested {d.date || "Recently"}</span>
                                            </div>

                                            <div className="w-full flex items-center justify-between md:contents">
                                                <div className="flex items-center gap-2 text-xs font-bold text-zinc-500">
                                                    <User2 className="size-3 text-zinc-300" />
                                                    {d.assignedTo ? "ENGINEERING" : "WAITING"}
                                                </div>
                                                
                                                <Badge className={cn("rounded-full px-3 py-1 text-[9px] font-bold border-none", 
                                                    d.status === "FINALIZED" || d.status === "APPROVED" ? "bg-emerald-50 text-emerald-600" : 
                                                    d.status === "IN_DEVELOPMENT" || d.status === "ACCEPTED" ? "bg-blue-50 text-blue-600" : "bg-amber-50 text-amber-600"
                                                )}>
                                                    {d.status.replace("_", " ")}
                                                </Badge>

                                                <div className="hidden md:flex justify-end">
                                                    <ArrowRight className="size-4 text-zinc-200 group-hover:text-black group-hover:translate-x-1 transition-all" />
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </main>

                    {/* MOBILE FLOATING ACTION BUTTON */}
                    {userDept === "sales" && (
                        <div className="md:hidden fixed bottom-8 right-6 z-50">
                            <Button 
                                onClick={handleCreateRequest}
                                className="size-16 rounded-3xl bg-black text-white shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center border border-white/10"
                            >
                                <Plus className="size-7 stroke-[3px]" />
                            </Button>
                        </div>
                    )}

                </SidebarInset>
            </SidebarProvider>
        </ProtectedPageWrapper>
    )
}

function StatCard({ label, val, icon: Icon, isActive, onClick, isDone }: any) {
    return (
        <div
            onClick={onClick}
            className={cn(
                "p-5 md:p-6 flex flex-col gap-3 rounded-[24px] bg-white transition-all shadow-sm border-2 cursor-pointer active:scale-95",
                isActive ? "border-black shadow-md" : "border-transparent"
            )}
        >
            <div className="flex justify-between items-start">
                <div className={cn("p-2.5 rounded-xl", isDone ? "bg-emerald-50 text-emerald-500" : "bg-zinc-50 text-zinc-400")}>
                    <Icon className="size-5" />
                </div>
                <span className="text-2xl md:text-3xl font-black text-zinc-900">{val.toString().padStart(2, '0')}</span>
            </div>
            <p className="text-[9px] md:text-[10px] font-bold uppercase text-zinc-400 tracking-[0.15em]">{label}</p>
        </div>
    )
}