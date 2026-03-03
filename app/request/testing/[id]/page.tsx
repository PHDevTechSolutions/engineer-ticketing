"use client"

import * as React from "react"
import { useRouter, useParams } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import ProtectedPageWrapper from "@/components/protected-page-wrapper"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { 
    ChevronLeft, Loader2, Package, 
    Calendar as CalendarIcon, Clipboard, Trash2, CheckCircle2,
    Clock, AlertTriangle, Lock
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// DATABASE
import { db } from "@/lib/firebase"
import { doc, getDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore"
import { PageHeader } from "@/components/page-header"

export default function TestingDetailPage() {
    const router = useRouter()
    const params = useParams()
    // Fix for the 'id' error: explicitly tell the code 'id' is a string
    const id = params?.id as string 
    
    const [loading, setLoading] = React.useState(true)
    const [isUpdating, setIsUpdating] = React.useState(false)
    const [userId, setUserId] = React.useState<string | null>(null)
    const [userDept, setUserDept] = React.useState("")

    // Form State
    const [formData, setFormData] = React.useState<any>(null)

    // PERMISSION CHECK
    const isStaff = userDept === "engineering" || userDept === "it"

    React.useEffect(() => {
        const storedId = localStorage.getItem("userId")
        setUserId(storedId)
        
        const fetchProfile = async () => {
            try {
                const res = await fetch(`/api/user?id=${encodeURIComponent(storedId || "")}`)
                const data = await res.json()
                setUserDept(data.Department?.toLowerCase() || data.department?.toLowerCase() || "sales")
            } catch (e) { console.error(e) }
        }

        fetchProfile()
        fetchEntry()
    }, [id])

    const fetchEntry = async () => {
        try {
            const docRef = doc(db, "testing_tracker", id)
            const docSnap = await getDoc(docRef)

            if (docSnap.exists()) {
                const data = docSnap.data()
                setFormData({
                    ...data,
                    arrivalDate: data.arrivalDate ? data.arrivalDate.toDate().toISOString().split('T')[0] : "",
                    targetDate: data.targetDate ? data.targetDate.toDate().toISOString().split('T')[0] : "",
                    releaseDate: data.releaseDate ? data.releaseDate.toDate().toISOString().split('T')[0] : "",
                })
            } else {
                toast.error("Entry not found")
                router.push("/request/testing")
            }
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!isStaff) return 
        
        setIsUpdating(true)
        try {
            const docRef = doc(db, "testing_tracker", id)
            await updateDoc(docRef, {
                ...formData,
                arrivalDate: formData.arrivalDate ? new Date(formData.arrivalDate) : null,
                targetDate: formData.targetDate ? new Date(formData.targetDate) : null,
                releaseDate: formData.releaseDate ? new Date(formData.releaseDate) : null,
                updatedAt: serverTimestamp(),
                updatedBy: userId 
            })
            toast.success("Tracker updated")
            router.push("/request/testing")
        } catch (e) {
            toast.error("Update failed")
        } finally {
            setIsUpdating(false)
        }
    }

    const handleDelete = async () => {
        if (!isStaff) return
        if (!confirm("Are you sure you want to delete this entry?")) return
        try {
            await deleteDoc(doc(db, "testing_tracker", id))
            toast.success("Entry deleted")
            router.push("/request/testing")
        } catch (e) {
            toast.error("Delete failed")
        }
    }

    if (loading) return <LoadingScreen />

    return (
        <ProtectedPageWrapper>
            <SidebarProvider defaultOpen={false}>
                <AppSidebar userId={userId} />
                <SidebarInset className="bg-[#F4F7F7] min-h-screen">
                    <PageHeader 
                        title={`Entry #${id?.toString().slice(-4).toUpperCase()}`} 
                        version="V1.1" 
                        showBackButton 
                        trigger={<SidebarTrigger className="mr-2" />} 
                    />

                    <main className="p-4 md:p-8 max-w-5xl mx-auto w-full pb-32">
                        
                        {!isStaff && (
                            <div className="mb-6 p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-center gap-3">
                                <Lock className="text-amber-600 size-4" />
                                <p className="text-[10px] font-black uppercase text-amber-600 tracking-tight">
                                    Read-Only: Only Engineering or IT can edit these records.
                                </p>
                            </div>
                        )}

                        <form onSubmit={handleUpdate} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 space-y-6">
                                <div className="bg-white rounded-[32px] p-8 border border-zinc-200/60 shadow-sm space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <DetailInput disabled={!isStaff} label="Product Name" value={formData.productName} onChange={(v: string) => setFormData({...formData, productName: v})} />
                                        <DetailInput disabled={!isStaff} label="Shipment Code" value={formData.shipmentCode} onChange={(v: string) => setFormData({...formData, shipmentCode: v})} />
                                        <DetailInput disabled={!isStaff} label="Quantity" type="number" value={formData.quantity} onChange={(v: string) => setFormData({...formData, quantity: v})} />
                                        <DetailInput disabled={!isStaff} label="PI Number" value={formData.piNumber} onChange={(v: string) => setFormData({...formData, piNumber: v})} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-zinc-400">Notes</label>
                                        <textarea 
                                            disabled={!isStaff}
                                            value={formData.notes} 
                                            onChange={(e) => setFormData({...formData, notes: e.target.value})}
                                            className="w-full bg-zinc-50 rounded-2xl p-4 text-sm border-none focus:ring-2 focus:ring-black h-32 outline-none disabled:opacity-60"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="bg-zinc-900 rounded-[32px] p-8 text-white shadow-xl space-y-6">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Timeline Management</h3>
                                    <DetailInput disabled={!isStaff} dark label="Arrival Date" type="date" value={formData.arrivalDate} onChange={(v: string) => setFormData({...formData, arrivalDate: v})} />
                                    <DetailInput disabled={!isStaff} dark label="Target Completion" type="date" value={formData.targetDate} onChange={(v: string) => setFormData({...formData, targetDate: v})} />
                                    <div className="pt-4 border-t border-zinc-800">
                                        <DetailInput disabled={!isStaff} dark label="Release Date (Completion)" type="date" value={formData.releaseDate} onChange={(v: string) => setFormData({...formData, releaseDate: v})} />
                                        <p className="text-[9px] text-zinc-500 mt-2 italic font-medium">* Setting a Release Date marks this as FINISHED.</p>
                                    </div>
                                </div>

                                {isStaff && (
                                    <div className="flex flex-col gap-3">
                                        <Button type="submit" disabled={isUpdating} className="h-14 rounded-2xl bg-black text-white font-bold text-[11px] uppercase tracking-widest">
                                            {isUpdating ? <Loader2 className="animate-spin" /> : "Save Changes"}
                                        </Button>
                                        <Button type="button" onClick={handleDelete} variant="ghost" className="h-14 rounded-2xl text-red-500 hover:bg-red-50 font-bold text-[11px] uppercase tracking-widest">
                                            <Trash2 className="mr-2 size-4" /> Delete Entry
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </form>
                    </main>
                </SidebarInset>
            </SidebarProvider>
        </ProtectedPageWrapper>
    )
}

// Added types to the component props to solve the "implicitly has an any type" error
interface DetailInputProps {
    label: string
    value: string
    onChange: (val: string) => void
    type?: string
    dark?: boolean
    disabled?: boolean
}

function DetailInput({ label, value, onChange, type = "text", dark, disabled }: DetailInputProps) {
    return (
        <div className="space-y-2">
            <label className={cn("text-[10px] font-black uppercase tracking-widest", dark ? "text-zinc-500" : "text-zinc-400")}>{label}</label>
            <input 
                type={type}
                value={value} 
                disabled={disabled}
                onChange={(e) => onChange(e.target.value)}
                className={cn(
                    "w-full h-12 rounded-xl px-4 text-sm font-bold outline-none transition-all",
                    dark 
                        ? "bg-zinc-800 border-none text-white focus:ring-1 focus:ring-zinc-600 disabled:opacity-50" 
                        : "bg-zinc-50 border-none text-zinc-900 focus:ring-2 focus:ring-black disabled:bg-zinc-100 disabled:text-zinc-400"
                )}
            />
        </div>
    )
}

function LoadingScreen() {
    return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-[#F4F7F7] gap-4">
            <Loader2 className="animate-spin text-zinc-300 size-10" />
            <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Loading Record...</span>
        </div>
    )
}