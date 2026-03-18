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
    Users, Search, ShieldCheck,
    ChevronRight, ChevronLeft, Loader2, RefreshCw,
    Cpu, X, ShieldAlert, Activity, Key, Info,
    LogOut, Ban, Shield, Filter
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

// FIREBASE DIRECT ACCESS
import { db } from "@/lib/firebase"
import { doc, getDoc, setDoc, updateDoc, collection, getDocs } from "firebase/firestore"

// SHADCN + CUSTOM
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/page-header"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
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

const ITEMS_PER_PAGE = 10

export default function StaffDirectoryPage() {
    const [userId, setUserId] = React.useState<string | null>(null)
    const [searchTerm, setSearchTerm] = React.useState("")
    const [activeDept, setActiveDept] = React.useState<string>("ALL")
    const [staff, setStaff] = React.useState<any[]>([])
    const [isFetching, setIsFetching] = React.useState(true)

    // Pagination State
    const [currentPage, setCurrentPage] = React.useState(1)

    // Security States
    const [selectedStaff, setSelectedStaff] = React.useState<any | null>(null)
    const [pendingRole, setPendingRole] = React.useState<string | null>(null)
    const [confirmType, setConfirmType] = React.useState<"ROLE" | "TERMINATE" | "SUSPEND" | null>(null)
    const [isProcessing, setIsProcessing] = React.useState(false)

    const updateStaffList = React.useCallback(async () => {
        setIsFetching(true)
        try {
            const res = await fetch("/api/UserManagement/Fetch")
            const mongoUsers = await res.json()

            const firestoreSnap = await getDocs(collection(db, "users"))
            const securityMap: Record<string, any> = {}
            firestoreSnap.forEach(doc => {
                securityMap[doc.id] = doc.data()
            })

            const mergedData = mongoUsers.map((u: any) => {
                const security = securityMap[u._id] || {
                    isActive: false,
                    Role: "MEMBER"
                }
                return {
                    ...u,
                    isActive: security.isActive,
                    Role: security.Role,
                    hasSecurityDoc: !!securityMap[u._id]
                }
            })

            setStaff(mergedData || [])
        } catch (err) {
            console.error(err)
            toast.error("Database synchronization failed")
        } finally {
            // Small timeout to prevent layout jumping if the API is too fast
            setTimeout(() => setIsFetching(false), 300)
        }
    }, [])

    const executeSecurityAction = async () => {
        if (!selectedStaff) return
        setIsProcessing(true)
        const toastId = toast.loading("Updating Firestore Security Registry...")

        try {
            const targetId = selectedStaff._id
            const userDocRef = doc(db, "users", targetId)
            const docSnap = await getDoc(userDocRef)

            let updateData: any = {
                lastSecurityUpdate: new Date().toISOString(),
                updatedBy: userId
            }

            if (confirmType === "ROLE") {
                updateData.Role = pendingRole
            } else if (confirmType === "TERMINATE") {
                updateData.sessionRevoked = true
                updateData.isActive = false
            } else if (confirmType === "SUSPEND") {
                updateData.isActive = selectedStaff.isActive === false
            }

            if (!docSnap.exists()) {
                await setDoc(userDocRef, {
                    ...updateData,
                    isActive: confirmType === "SUSPEND" ? true : false,
                    Role: pendingRole || "MEMBER", // <--- SAVED AS "Role" (Capital R)
                    email: selectedStaff.Email
                }, { merge: true })
            } else {
                await updateDoc(userDocRef, updateData) // updateData also uses "Role"
            }

            toast.success("Security Policy Applied", { id: toastId })
            await updateStaffList()

            setConfirmType(null)
            setPendingRole(null)
            setSelectedStaff(null)
        } catch (err) {
            console.error("Firestore Error:", err)
            toast.error("Write failed. Check Firestore Rules.", { id: toastId })
        } finally {
            setIsProcessing(false)
        }
    }

    React.useEffect(() => {
        setUserId(localStorage.getItem("userId"))
        updateStaffList()
    }, [updateStaffList])

    const departments = React.useMemo(() => {
        const depts = staff.map(s => s.Department?.toUpperCase()).filter(Boolean)
        return Array.from(new Set(depts))
    }, [staff])

    const filteredStaff = React.useMemo(() => {
        return staff.filter(person => {
            const search = searchTerm.toLowerCase()
            const fullName = `${person.Firstname} ${person.Lastname}`.toLowerCase()
            const matchesSearch = fullName.includes(search) || person.Email?.toLowerCase().includes(search)
            const matchesDept = activeDept === "ALL" ? true :
                activeDept === "SUSPENDED" ? person.isActive === false :
                    person.Department?.toUpperCase() === activeDept
            return matchesSearch && matchesDept
        })
    }, [staff, searchTerm, activeDept])

    const totalPages = Math.ceil(filteredStaff.length / ITEMS_PER_PAGE)
    const paginatedStaff = filteredStaff.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    )

    React.useEffect(() => {
        setCurrentPage(1)
    }, [searchTerm, activeDept])

    return (
        <ProtectedPageWrapper>
            <SidebarProvider defaultOpen={false}>
                <AppSidebar userId={userId} />
                <SidebarInset className="relative bg-[#F8FAFA] font-sans">
                    <PageHeader
                        title="STAFF DIRECTORY"
                        version="V4.5-SECURITY"
                        showBackButton={true}
                        trigger={<SidebarTrigger className="mr-2" />}
                        actions={
                            <Button onClick={updateStaffList} variant="ghost" size="icon" className="rounded-full">
                                <RefreshCw className={cn("size-4", isFetching && "animate-spin")} />
                            </Button>
                        }
                    />

                    <main className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">
                        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard label="Total Staff" val={isFetching ? "--" : staff.length} icon={Users} isActive={activeDept === "ALL"} onClick={() => setActiveDept("ALL")} />
                            <StatCard label="Engineers" val={isFetching ? "--" : staff.filter(s => s.Department?.toUpperCase() === "ENGINEERING").length} icon={Cpu} isActive={activeDept === "ENGINEERING"} onClick={() => setActiveDept("ENGINEERING")} />
                            <StatCard label="Authorized" val={isFetching ? "--" : staff.filter(s => s.isActive === true).length} icon={ShieldCheck} isActive={false} onClick={() => { }} />
                            <StatCard label="No Access" val={isFetching ? "--" : staff.filter(s => s.isActive === false).length} icon={Ban} isActive={activeDept === "SUSPENDED"} onClick={() => setActiveDept("SUSPENDED")} />
                        </section>

                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="relative group flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-zinc-400 group-focus-within:text-black transition-colors" />
                                <input
                                    placeholder="Search MongoDB profiles..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-11 h-14 rounded-2xl border-none bg-white shadow-sm ring-1 ring-zinc-200 focus:ring-2 focus:ring-black outline-none transition-all text-sm"
                                />
                            </div>

                            <Select value={activeDept} onValueChange={setActiveDept}>
                                <SelectTrigger className="w-full md:w-[220px] h-14 rounded-2xl bg-white border-none ring-1 ring-zinc-200 shadow-sm font-bold text-[10px] uppercase px-6">
                                    <div className="flex items-center gap-3">
                                        <Filter className="size-4 text-zinc-400" />
                                        <SelectValue placeholder="Filter Dept" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-zinc-100">
                                    <SelectItem value="ALL" className="font-bold text-[10px] uppercase py-3">All Staff</SelectItem>
                                    {departments.map(d => (
                                        <SelectItem key={d} value={d} className="font-bold text-[10px] uppercase py-3">{d}</SelectItem>
                                    ))}
                                    <SelectItem value="SUSPENDED" className="font-bold text-[10px] uppercase py-3 text-red-500">Not Authorized</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="bg-white rounded-[24px] shadow-sm border border-zinc-200/60 overflow-hidden">
                            <div className="hidden md:grid grid-cols-6 bg-zinc-50/50 p-6 text-[10px] font-bold uppercase tracking-widest text-zinc-500 border-b">
                                <span className="col-span-2">Staff Identity (MongoDB)</span>
                                <span>Department</span>
                                <span>Access Level</span>
                                <span>Security Status</span>
                                <span className="text-right">Action</span>
                            </div>

                            <div className="divide-y divide-zinc-50 min-h-[400px]">
                                {isFetching ? (
                                    // SKELETON LOADING STATE
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <div key={i} className="grid grid-cols-1 md:grid-cols-6 gap-4 p-5 items-center">
                                            <div className="col-span-2 flex items-center gap-4">
                                                <Skeleton className="size-10 rounded-xl" />
                                                <div className="space-y-2">
                                                    <Skeleton className="h-4 w-32" />
                                                    <Skeleton className="h-3 w-48" />
                                                </div>
                                            </div>
                                            <Skeleton className="h-6 w-20 rounded-lg" />
                                            <Skeleton className="h-4 w-24" />
                                            <Skeleton className="h-4 w-24" />
                                            <div className="flex justify-end"><Skeleton className="h-9 w-28 rounded-xl" /></div>
                                        </div>
                                    ))
                                ) : paginatedStaff.length > 0 ? (
                                    paginatedStaff.map((person) => (
                                        <div key={person._id} className="grid grid-cols-1 md:grid-cols-6 gap-4 p-5 items-center hover:bg-zinc-50/30 transition-colors">
                                            <div className="col-span-2 flex items-center gap-4">
                                                <Avatar className="size-10 rounded-xl border border-zinc-100 shadow-sm">
                                                    <AvatarImage src={person.profilePicture} className="object-cover" />
                                                    <AvatarFallback className="bg-zinc-900 text-white text-[10px] font-bold">{person.Firstname?.[0]}{person.Lastname?.[0]}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold uppercase tracking-tight text-zinc-800">{person.Firstname} {person.Lastname}</span>
                                                    <span className="text-[10px] text-zinc-400 font-medium">{person.Email}</span>
                                                </div>
                                            </div>
                                            <div><Badge variant="secondary" className="bg-zinc-100 text-zinc-600 text-[9px] font-bold uppercase border-none">{person.Department || "N/A"}</Badge></div>
                                            <div>
                                                <div className="flex items-center gap-1.5">
                                                    <Key className="size-3 text-zinc-400" />
                                                    <span className="text-[10px] font-bold uppercase text-zinc-600">{person.Role || "No Role"}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className={cn("size-2 rounded-full shadow-inner", person.isActive === true ? "bg-emerald-500" : "bg-zinc-300")} />
                                                <span className={cn("text-[10px] font-black uppercase tracking-tighter", person.isActive === true ? "text-emerald-600" : "text-zinc-400")}>
                                                    {person.isActive === true ? "Authorized" : "Revoked"}
                                                </span>
                                            </div>
                                            <div className="flex justify-end">
                                                <Button onClick={() => setSelectedStaff(person)} variant="ghost" className="h-9 px-4 rounded-xl text-[10px] font-bold uppercase hover:bg-black hover:text-white transition-all group">
                                                    Security Panel <ChevronRight className="size-3 ml-2 group-hover:translate-x-1 transition-transform" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    // TRUE EMPTY STATE (Only after loading)
                                    <div className="p-20 text-center flex flex-col items-center justify-center gap-3">
                                        <Users className="size-10 text-zinc-200" />
                                        <p className="text-xs font-bold uppercase text-zinc-400 tracking-widest">No matching staff found</p>
                                    </div>
                                )}
                            </div>

                            {/* Pagination */}
                            <div className="p-6 bg-zinc-50/50 border-t flex items-center justify-between">
                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                                    {isFetching ? "Syncing..." : `Displaying ${paginatedStaff.length} of ${filteredStaff.length} profiles`}
                                </p>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={currentPage === 1 || isFetching}
                                        onClick={() => setCurrentPage(prev => prev - 1)}
                                        className="rounded-xl h-10 px-4 border-zinc-200 text-[10px] font-bold uppercase"
                                    >
                                        <ChevronLeft className="size-3 mr-2" /> Prev
                                    </Button>
                                    <div className="flex items-center gap-1.5 px-4 font-black text-[10px]">
                                        <span className="text-zinc-900">{currentPage}</span>
                                        <span className="text-zinc-300">/</span>
                                        <span className="text-zinc-400">{totalPages || 1}</span>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={currentPage >= totalPages || isFetching}
                                        onClick={() => setCurrentPage(prev => prev + 1)}
                                        className="rounded-xl h-10 px-4 border-zinc-200 text-[10px] font-bold uppercase"
                                    >
                                        Next <ChevronRight className="size-3 ml-2" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </main>

                    {/* Security Sheet */}
                    <Sheet open={!!selectedStaff} onOpenChange={() => !isProcessing && setSelectedStaff(null)}>
                        <SheetContent side="right" className="sm:max-w-md w-full p-0 border-l border-zinc-100 flex flex-col shadow-2xl">
                            {selectedStaff && (
                                <>
                                    <div className="h-40 bg-[#0A0A0B] shrink-0 relative overflow-hidden">
                                        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_50%_50%,#3b82f6,transparent_70%)]" />
                                        <Button onClick={() => setSelectedStaff(null)} variant="ghost" className="absolute top-6 right-6 text-white/40 hover:text-white rounded-full h-10 w-10"><X className="size-5" /></Button>
                                    </div>

                                    <div className="px-10 -mt-14 flex-1 flex flex-col overflow-hidden">
                                        <Avatar className="size-28 rounded-[32px] border-[6px] border-white shadow-2xl mb-6 bg-white">
                                            <AvatarImage src={selectedStaff.profilePicture} className="object-cover" />
                                            <AvatarFallback className="bg-zinc-800 text-white text-3xl font-black">{selectedStaff.Firstname?.[0]}{selectedStaff.Lastname?.[0]}</AvatarFallback>
                                        </Avatar>

                                        <div className="mb-8">
                                            <h2 className="text-3xl font-black uppercase tracking-tighter leading-[0.85] text-zinc-900">{selectedStaff.Firstname} <br /> {selectedStaff.Lastname}</h2>
                                            <div className="flex items-center gap-3 mt-4">
                                                <div className={cn("flex items-center gap-1.5 py-1 px-2.5 rounded-lg border", selectedStaff.isActive ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-zinc-50 text-zinc-400 border-zinc-100")}>
                                                    <Activity className="size-3" />
                                                    <span className="text-[9px] font-black uppercase tracking-widest">{selectedStaff.isActive ? "Authorized Access" : "No Access"}</span>
                                                </div>
                                                <span className="text-[10px] text-zinc-400 font-medium">ID: {selectedStaff._id.slice(-6).toUpperCase()}</span>
                                            </div>
                                        </div>

                                        <div className="space-y-8 overflow-y-auto no-scrollbar pr-1 pb-36">
                                            <section className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Firestore Access Policy</p>
                                                    <div className="h-px bg-zinc-100 flex-1 ml-4" />
                                                </div>

                                                <div className="p-6 rounded-[28px] bg-zinc-50 border border-zinc-100 space-y-6">
                                                    <div className="space-y-3">
                                                        <label className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-2">
                                                            <Shield className="size-3" /> Assigned Permission Role
                                                        </label>
                                                        <Select defaultValue={selectedStaff.Role?.toUpperCase() || "MEMBER"} onValueChange={setPendingRole}>
                                                            <SelectTrigger className="h-12 bg-white border-zinc-200 rounded-2xl font-bold text-xs shadow-sm">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent className="rounded-2xl border-zinc-100">
                                                                {["SUPER ADMIN", "MANAGER", "LEADER", "MEMBER"].map(r => (
                                                                    <SelectItem key={r} value={r} className="font-bold text-[10px] uppercase py-3">{r}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-zinc-100 shadow-sm">
                                                        <div className="flex flex-col">
                                                            <span className="text-[11px] font-black uppercase text-zinc-800">Authorization Switch</span>
                                                            <span className="text-[10px] text-zinc-400">Grant or Revoke App Access</span>
                                                        </div>
                                                        <Switch
                                                            checked={selectedStaff.isActive === true}
                                                            onCheckedChange={() => setConfirmType("SUSPEND")}
                                                            className="data-[state=checked]:bg-emerald-500"
                                                        />
                                                    </div>
                                                </div>
                                            </section>

                                            <section className="space-y-4">
                                                <p className="text-[10px] font-black text-red-500/50 uppercase tracking-[0.2em]">Danger Zone</p>
                                                <Button
                                                    onClick={() => setConfirmType("TERMINATE")}
                                                    variant="outline"
                                                    className="w-full h-14 rounded-2xl border-red-100 text-red-600 hover:bg-red-50 hover:text-red-700 font-bold text-[10px] uppercase tracking-[0.2em] transition-all shadow-sm"
                                                >
                                                    <LogOut className="mr-3 size-4" /> Force Logout (Revoke Tokens)
                                                </Button>
                                                <div className="flex gap-2 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                                                    <Info className="size-4 text-amber-600 shrink-0" />
                                                    <p className="text-[9px] text-amber-700 leading-relaxed font-medium">
                                                        Gagamitin ang Firestore `sessionRevoked` flag. Ang susunod na request ng user sa app ay madi-deny at mapipilitan silang mag-relogin.
                                                    </p>
                                                </div>
                                            </section>
                                        </div>

                                        <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-white via-white to-transparent pt-14">
                                            {pendingRole && pendingRole !== selectedStaff.Role?.toUpperCase() ? (
                                                <Button
                                                    onClick={() => setConfirmType("ROLE")}
                                                    className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase text-[11px] tracking-widest shadow-xl shadow-blue-200 transition-all hover:-translate-y-0.5"
                                                >
                                                    Synchronize Role to Firestore
                                                </Button>
                                            ) : (
                                                <Button
                                                    onClick={() => setSelectedStaff(null)}
                                                    className="w-full h-14 rounded-2xl bg-zinc-900 text-white font-bold uppercase text-[11px] tracking-widest hover:bg-black transition-colors"
                                                >
                                                    Close Panel
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </SheetContent>
                    </Sheet>

                    {/* Confirmation Dialog */}
                    <AlertDialog open={!!confirmType} onOpenChange={() => !isProcessing && setConfirmType(null)}>
                        <AlertDialogContent className="rounded-[32px] border-none shadow-2xl p-10 max-w-sm">
                            <AlertDialogHeader className="items-center text-center">
                                <div className={cn(
                                    "size-16 rounded-3xl flex items-center justify-center mb-6 shadow-lg",
                                    confirmType === "ROLE" ? "bg-blue-600 text-white" : "bg-red-600 text-white"
                                )}>
                                    <ShieldAlert className="size-8" />
                                </div>
                                <AlertDialogTitle className="text-2xl font-black uppercase tracking-tighter text-zinc-900">
                                    Confirm Action
                                </AlertDialogTitle>
                                <AlertDialogDescription className="text-zinc-500 text-sm font-medium mt-2">
                                    {confirmType === "ROLE" && `Set ${selectedStaff?.Firstname}'s security role to ${pendingRole}?`}
                                    {confirmType === "TERMINATE" && `Invalidate all active sessions for ${selectedStaff?.Firstname}?`}
                                    {confirmType === "SUSPEND" && `Update access rights for ${selectedStaff?.Firstname}?`}
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="mt-10 sm:flex-col gap-3">
                                <AlertDialogAction
                                    onClick={(e) => { e.preventDefault(); executeSecurityAction(); }}
                                    className={cn(
                                        "h-14 rounded-2xl font-bold uppercase text-[11px] tracking-widest w-full order-1 sm:order-2",
                                        confirmType === "ROLE" ? "bg-blue-600" : "bg-red-600"
                                    )}
                                >
                                    {isProcessing ? <Loader2 className="animate-spin size-5" /> : "Confirm Security Write"}
                                </AlertDialogAction>
                                <AlertDialogCancel className="h-14 rounded-2xl font-bold uppercase text-[11px] tracking-widest w-full border-zinc-100 order-2 sm:order-1">
                                    Cancel
                                </AlertDialogCancel>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
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
                "p-6 flex flex-col gap-5 rounded-[28px] bg-white transition-all shadow-sm border-2 cursor-pointer",
                isActive ? "border-zinc-900 ring-8 ring-zinc-900/5 -translate-y-1" : "border-transparent hover:border-zinc-100"
            )}
        >
            <div className="flex justify-between items-start">
                <div className={cn("p-3 rounded-2xl shadow-sm", isActive ? "bg-zinc-900 text-white" : "bg-zinc-50 text-zinc-400")}>
                    <Icon className="size-5" />
                </div>
                <span className="text-3xl font-black tracking-tighter text-zinc-900">{val}</span>
            </div>
            <p className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.15em] leading-none">{label}</p>
        </div>
    )
}