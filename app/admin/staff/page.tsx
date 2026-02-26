"use client"

import * as React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import ProtectedPageWrapper from "@/components/protected-page-wrapper"
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar"
import { 
    Users, Search, ShieldCheck, Briefcase, 
    ChevronRight, ChevronLeft, Loader2, RefreshCw,
    Cpu, Mail, X, Fingerprint, ShieldAlert, Globe,
    ArrowRight, CheckCircle2
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

// SHADCN + CUSTOM
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/page-header"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Sheet,
    SheetContent,
} from "@/components/ui/sheet"

export default function StaffDirectoryPage() {
    // APP STATE
    const [userId, setUserId] = React.useState<string | null>(null)
    const [searchTerm, setSearchTerm] = React.useState("")
    const [activeDept, setActiveDept] = React.useState<string>("ALL")
    const [staff, setStaff] = React.useState<any[]>([])
    const [selectedStaff, setSelectedStaff] = React.useState<any | null>(null)
    const [isFetching, setIsFetching] = React.useState(true)

    // PAGINATION
    const [currentPage, setCurrentPage] = React.useState(1)
    const [itemsPerPage, setItemsPerPage] = React.useState("10")

    const updateStaffList = React.useCallback(async () => {
        setIsFetching(true)
        const toastId = toast.loading("Updating staff list...")
        try {
            const res = await fetch("/api/UserManagement/Fetch")
            if (!res.ok) throw new Error("Connection failed")
            const data = await res.json()
            setStaff(data || [])
            toast.success("Staff list updated.", { id: toastId })
        } catch (err) {
            toast.error("Could not update staff.", { id: toastId })
        } finally {
            setIsFetching(false)
        }
    }, [])

    React.useEffect(() => { 
        setUserId(localStorage.getItem("userId"))
        updateStaffList() 
    }, [updateStaffList])

    const filteredStaff = React.useMemo(() => {
        return staff.filter(person => {
            const dept = person.Department?.toUpperCase() || ""
            const search = searchTerm.toLowerCase()
            const fullName = `${person.Firstname} ${person.Lastname}`.toLowerCase()
            const matchesSearch = fullName.includes(search) || person.ReferenceID?.toLowerCase().includes(search)
            const matchesDept = activeDept === "ALL" ? true : dept === activeDept
            return matchesSearch && matchesDept
        })
    }, [staff, searchTerm, activeDept])

    const limit = parseInt(itemsPerPage)
    const totalPages = Math.ceil(filteredStaff.length / limit)
    const paginatedStaff = filteredStaff.slice((currentPage - 1) * limit, currentPage * limit)

    return (
        <ProtectedPageWrapper>
            <SidebarProvider defaultOpen={false}>
                <AppSidebar userId={userId} />

                <SidebarInset className="relative bg-[#F4F7F7] pb-24 md:pb-0 font-sans">
                    <PageHeader 
                        title="STAFF DIRECTORY" 
                        version="V2.8" 
                        showBackButton={true}
                        trigger={<SidebarTrigger className="mr-2" />}
                        actions={
                            <Button 
                                onClick={updateStaffList} 
                                variant="ghost" 
                                size="icon" 
                                className={cn("rounded-full h-10 w-10", isFetching && "bg-blue-50 text-blue-600")}
                            >
                                <RefreshCw className={cn("size-5", isFetching && "animate-spin")} />
                            </Button>
                        }
                    />

                    <main className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">
                        
                        {/* SUMMARY CARDS */}
                        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard label="ALL STAFF" val={staff.length} icon={Users} isActive={activeDept === "ALL"} onClick={() => setActiveDept("ALL")} />
                            <StatCard label="ENGINEERING" val={staff.filter(s => s.Department?.toUpperCase() === "ENGINEERING").length} icon={Cpu} isActive={activeDept === "ENGINEERING"} onClick={() => setActiveDept("ENGINEERING")} />
                            <StatCard label="IT SUPPORT" val={staff.filter(s => s.Department?.toUpperCase() === "IT").length} icon={ShieldCheck} isActive={activeDept === "IT"} onClick={() => setActiveDept("IT")} />
                            <StatCard label="SALES TEAM" val={staff.filter(s => s.Department?.toUpperCase() === "SALES").length} icon={Briefcase} isActive={activeDept === "SALES"} onClick={() => setActiveDept("SALES")} />
                        </section>

                        {/* SEARCH BAR */}
                        <div className="flex flex-col md:flex-row gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
                                <input
                                    placeholder="Search by ID or name..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-11 h-12 rounded-2xl border-none bg-white shadow-sm ring-1 ring-zinc-200 focus:ring-2 focus:ring-black outline-none transition-all text-sm"
                                />
                            </div>
                            <Button variant="outline" onClick={() => { setActiveDept("ALL"); setSearchTerm("") }} className="h-12 rounded-2xl bg-white border-zinc-200 font-bold text-[10px] tracking-widest uppercase px-6">
                                <RefreshCw className="mr-2 size-3" /> RESET
                            </Button>
                        </div>

                        {/* MAIN DATA LIST */}
                        <div className="bg-white rounded-[24px] shadow-sm border border-zinc-200/60 overflow-hidden">
                            <div className="hidden md:grid grid-cols-6 bg-zinc-50/50 p-6 border-b border-zinc-100 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                                <span className="col-span-2">Member Details</span>
                                <span>Reference ID</span>
                                <span>Department</span>
                                <span>Status</span>
                                <span className="text-right">Actions</span>
                            </div>

                            <div className="divide-y divide-zinc-50">
                                {isFetching && staff.length === 0 ? (
                                    <div className="p-20 text-center flex flex-col items-center gap-3">
                                        <Loader2 className="animate-spin text-zinc-200 size-10" />
                                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Updating engiconnect...</p>
                                    </div>
                                ) : paginatedStaff.map((person) => (
                                    <div key={person._id} className="grid grid-cols-1 md:grid-cols-6 gap-4 p-6 items-center hover:bg-zinc-50/40 transition-colors">
                                        <div className="col-span-2 flex items-center gap-4">
                                            <Avatar className="size-10 rounded-xl border border-zinc-100 shadow-sm">
                                                <AvatarImage src={person.profilePicture} className="object-cover" />
                                                <AvatarFallback className="bg-black text-white text-[10px] font-bold">{person.Firstname?.[0]}{person.Lastname?.[0]}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-zinc-900 uppercase">{person.Firstname} {person.Lastname}</span>
                                                <span className="text-[10px] text-zinc-400 font-medium">{person.Email}</span>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-mono font-bold text-zinc-500 bg-zinc-100 px-2 py-1 rounded w-fit">#{person.ReferenceID || "UNASSIGNED"}</span>
                                        <div>
                                            <Badge variant="outline" className={cn("px-2.5 py-1 rounded-lg text-[10px] font-bold border-zinc-200", person.Department?.toUpperCase() === "ENGINEERING" ? "bg-blue-50 text-blue-600" : "bg-zinc-50 text-zinc-600")}>
                                                {person.Department}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-tight">Verified</span>
                                        </div>
                                        <div className="flex justify-end">
                                            <Button onClick={() => setSelectedStaff(person)} variant="ghost" className="h-8 rounded-xl text-[11px] font-bold hover:bg-black hover:text-white transition-all group">
                                                View Profile <ArrowRight className="size-3 ml-2 group-hover:translate-x-1" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* PAGINATION */}
                            <div className="p-5 bg-zinc-50/50 border-t border-zinc-100 flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <span className="text-[10px] font-bold text-zinc-400 uppercase">Show:</span>
                                    <Select value={itemsPerPage} onValueChange={setItemsPerPage}>
                                        <SelectTrigger className="w-16 h-8 bg-white border-zinc-200 rounded-lg text-xs font-bold"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {["5", "10", "20"].map(v => <SelectItem key={v} value={v} className="text-xs font-bold">{v}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} variant="outline" size="icon" className="size-9 rounded-xl bg-white"><ChevronLeft className="size-4" /></Button>
                                    <div className="px-5 py-2 bg-white rounded-xl border border-zinc-200 text-xs font-bold">{currentPage} / {totalPages || 1}</div>
                                    <Button disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(p => p + 1)} variant="outline" size="icon" className="size-9 rounded-xl bg-white"><ChevronRight className="size-4" /></Button>
                                </div>
                            </div>
                        </div>
                    </main>

                    {/* USER PROFILE SLIDER (DRAWER) */}
                    <Sheet open={!!selectedStaff} onOpenChange={() => setSelectedStaff(null)}>
                        <SheetContent side="right" className="sm:max-w-md w-full p-0 border-l border-zinc-100 overflow-hidden">
                            {selectedStaff && (
                                <div className="flex flex-col h-full bg-white relative">
                                    {/* Cover / Header Section */}
                                    <div className="h-40 bg-zinc-950 w-full relative">
                                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-zinc-700/20 via-transparent to-transparent" />
                                        <Button 
                                            onClick={() => setSelectedStaff(null)} 
                                            variant="ghost" 
                                            className="absolute top-4 right-4 text-white/70 hover:text-white hover:bg-white/10 rounded-full h-10 w-10 p-0 z-20"
                                        >
                                            <X className="size-5" />
                                        </Button>
                                        
                                        {/* Profile Avatar Overlap */}
                                        <div className="absolute -bottom-10 left-8">
                                            <Avatar className="size-24 rounded-[28px] border-[6px] border-white shadow-xl">
                                                <AvatarImage src={selectedStaff.profilePicture} className="object-cover" />
                                                <AvatarFallback className="bg-zinc-800 text-white text-2xl font-black uppercase">
                                                    {selectedStaff.Firstname?.[0]}{selectedStaff.Lastname?.[0]}
                                                </AvatarFallback>
                                            </Avatar>
                                        </div>
                                    </div>

                                    {/* Content Section */}
                                    <div className="mt-14 px-8 flex flex-col flex-1 overflow-hidden">
                                        <div className="mb-8">
                                            <h2 className="text-2xl font-black tracking-tighter text-zinc-900 uppercase leading-tight">
                                                {selectedStaff.Firstname} <br /> {selectedStaff.Lastname}
                                            </h2>
                                            <div className="flex items-center gap-2 mt-2">
                                                <Badge className="bg-zinc-100 text-zinc-600 border-none hover:bg-zinc-100 font-bold text-[9px] px-2 py-0.5 uppercase tracking-widest">
                                                    {selectedStaff.Department}
                                                </Badge>
                                                <div className="flex items-center gap-1.5 ml-2">
                                                    <div className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-tighter">System Verified</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Scrollable Info Area */}
                                        <div className="space-y-3 overflow-y-auto pr-2 pb-6 flex-1 custom-scrollbar">
                                            <p className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.25em] mb-4">Identification Details</p>
                                            
                                            <InfoRow icon={Mail} label="Professional Email" value={selectedStaff.Email} />
                                            <InfoRow icon={Fingerprint} label="Reference ID" value={selectedStaff.ReferenceID || "Not Assigned"} />
                                            <InfoRow icon={ShieldAlert} label="Unit Clearance" value={selectedStaff.Department} />
                                            <InfoRow icon={Globe} label="Region Access" value="Global / HQ" />

                                            <div className="mt-6 p-5 rounded-[20px] bg-zinc-50 border border-zinc-100 space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Trust Score</span>
                                                    <span className="text-[10px] font-black text-emerald-600 uppercase">98% Secure</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-zinc-200 rounded-full overflow-hidden">
                                                    <div className="h-full bg-emerald-500 w-[98%]" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Bottom Action Area */}
                                        <div className="py-8 bg-white border-t border-zinc-50">
                                            <Button 
                                                onClick={() => setSelectedStaff(null)} 
                                                className="w-full h-14 rounded-2xl bg-black hover:bg-zinc-800 text-white font-bold uppercase text-[11px] tracking-[0.2em] shadow-lg shadow-black/10 transition-all active:scale-[0.98]"
                                            >
                                                Return to Directory
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </SheetContent>
                    </Sheet>
                </SidebarInset>
            </SidebarProvider>
        </ProtectedPageWrapper>
    )
}

function StatCard({ label, val, icon: Icon, isActive, onClick }: any) {
    return (
        <div
            onClick={onClick}
            className={cn(
                "p-5 md:p-6 flex flex-col gap-3 rounded-[24px] bg-white transition-all shadow-sm border-2 cursor-pointer active:scale-95",
                isActive ? "border-black shadow-md" : "border-transparent"
            )}
        >
            <div className="flex justify-between items-start">
                <div className={cn("p-2.5 rounded-xl", isActive ? "bg-black text-white" : "bg-zinc-50 text-zinc-400")}>
                    <Icon className="size-4 md:size-5" />
                </div>
                <span className="text-2xl md:text-3xl font-black text-zinc-900">{val.toString().padStart(2, '0')}</span>
            </div>
            <p className="text-[9px] md:text-[10px] font-bold uppercase text-zinc-400 tracking-[0.15em]">{label}</p>
        </div>
    )
}

function InfoRow({ icon: Icon, label, value }: any) {
    return (
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-50/50 border border-zinc-100 hover:bg-white hover:border-zinc-200 transition-all group">
            <div className="size-10 rounded-xl bg-white border border-zinc-100 flex items-center justify-center text-zinc-400 shadow-sm group-hover:text-black transition-colors">
                <Icon className="size-4" />
            </div>
            <div className="flex flex-col overflow-hidden">
                <span className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">{label}</span>
                <span className="text-sm font-bold text-zinc-900 truncate">{value}</span>
            </div>
        </div>
    )
}