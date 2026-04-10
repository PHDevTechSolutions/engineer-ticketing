"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import {
    ShieldCheck, MapPin, User, FileText,
    Loader2, Activity, ShieldAlert,
    Terminal, ChevronLeft, Fingerprint, MessageSquare,
    Wrench, Paperclip, Clock,
    Cpu, History, ExternalLink,
    Calendar, CheckCircle2, AlertCircle, ArrowRight,
    PauseCircle,
    Lock,
    Radio,
    Download,
    Copy,
    Building2,
    ClipboardList,
    Timer
} from "lucide-react"

import { db } from "@/lib/firebase"
import { doc, onSnapshot, updateDoc, serverTimestamp } from "firebase/firestore"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/page-header"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"

import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"

import { AppSidebar } from "@/components/app-sidebar"
import { CollaborationHub } from "@/components/collaboration-hub"

export default function AppointmentDetailsPage() {
    const params = useParams() as { id: string }
    const id = params.id
    const router = useRouter()

    const [loading, setLoading] = React.useState(true)
    const [data, setData] = React.useState<any>(null)
    const [userContext, setUserContext] = React.useState({ role: "", id: "", name: "", profilePicture: "" })
    const [actionLoading, setActionLoading] = React.useState(false)
    const [confNotes, setConfNotes] = React.useState("")

    const [countdown, setCountdown] = React.useState("00:00:00")
    const [isOverdue, setIsOverdue] = React.useState(false)

    const status = data?.status?.toUpperCase() || "PENDING"

    // SLA TIMER LOGIC
    React.useEffect(() => {
        const timerInterval = setInterval(() => {
            let referenceTime = data?.createdAt
            let hoursLimit = 24 // Default SLA 24h

            if (status === "CONFIRMED") {
                referenceTime = data?.confirmedAt
                hoursLimit = 12 // Manager approval SLA 12h
            }

            if (referenceTime) {
                const start = new Date(referenceTime.seconds * 1000).getTime()
                const limit = start + (hoursLimit * 60 * 60 * 1000)
                const now = new Date().getTime()
                const diff = limit - now
                const absDiff = Math.abs(diff)

                const hours = Math.floor(absDiff / (1000 * 60 * 60))
                const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60))
                const seconds = Math.floor((absDiff % (1000 * 60)) / 1000)

                const timeString = `${diff < 0 ? '-' : ''}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
                setCountdown(timeString)
                setIsOverdue(diff < 0)
            }
        }, 1000)
        return () => clearInterval(timerInterval)
    }, [data, status])

    React.useEffect(() => {
        let unsubscribe: () => void
        const establishUplink = async () => {
            const storedId = localStorage.getItem("userId")
            if (!storedId) return

            try {
                const res = await fetch(`/api/user?id=${encodeURIComponent(storedId)}`)
                const user = await res.json()
                setUserContext({
                    role: user.Department?.toLowerCase() || "",
                    id: storedId,
                    name: user.Firstname + " " + user.Lastname,
                    profilePicture: user.profilePicture || ""
                })

                const docRef = doc(db, "appointments", id)
                unsubscribe = onSnapshot(docRef, (docSnap) => {
                    if (docSnap.exists()) {
                        const appointmentData = docSnap.data()
                        setData(appointmentData)
                        setConfNotes((prev) => prev || appointmentData.confirmationNotes || "")
                    }
                    setLoading(false)
                })
            } catch (err) {
                toast.error("Failed to connect to the server.")
                setLoading(false)
            }
        }
        establishUplink()
        return () => unsubscribe?.()
    }, [id])

    const handleStatusUpdate = async (newStatus: string, additionalData = {}) => {
        setActionLoading(true)
        const toastId = toast.loading(`Updating status to ${newStatus.toLowerCase()}...`)
        try {
            const docRef = doc(db, "appointments", id)
            const statusKey = `${newStatus.toLowerCase()}At`
            const actorKey = `${newStatus.toLowerCase()}By`

            await updateDoc(docRef, {
                status: newStatus.toUpperCase(),
                updatedAt: serverTimestamp(),
                [statusKey]: serverTimestamp(),
                [actorKey]: userContext.name,
                lastModifiedBy: userContext.id,
                ...additionalData
            })
            toast.success(`Visit successfully marked as ${newStatus.toLowerCase()}.`, { id: toastId })
        } catch (err) {
            toast.error("Failed to update status. Please try again.", { id: toastId })
        } finally {
            setActionLoading(false)
        }
    }

    const handleDownload = async (url: string) => {
        const toastId = toast.loading("Preparing download...")
        try {
            const response = await fetch(url)
            const blob = await response.blob()
            const blobUrl = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = blobUrl
            link.download = `Reference_${id.slice(-6).toUpperCase()}_Document.pdf`
            document.body.appendChild(link)
            link.click()
            link.remove()
            window.URL.revokeObjectURL(blobUrl)
            toast.success("Download complete.", { id: toastId })
        } catch (err) {
            toast.error("Failed to download the document.", { id: toastId })
        }
    }

    if (loading) return <LoadingScreen />

    const isEngineering = userContext.role === "it" || userContext.role === "engineering"
    const isSales = userContext.role === "sales"
    const isPending = status === "PENDING"
    const isConfirmed = status === "CONFIRMED"
    const isCompleted = status === "COMPLETED"

    const protocolDisplay = Array.isArray(data?.protocols)
        ? data.protocols.join(" + ").toUpperCase()
        : (data?.protocols?.toUpperCase() || "NOT_DEFINED")

    const formatBookingDate = (ts: any) => {
        if (!ts) return "UNSCHEDULED"
        const date = ts.toDate ? ts.toDate() : new Date(ts)
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        }).toUpperCase()
    }

    return (
        <SidebarProvider defaultOpen={false}>
            <AppSidebar userId={userContext.id} />
            <SidebarInset className="bg-[#F8FAFC] pb-24 md:pb-0 relative flex flex-col min-h-screen">

                {/* --- STICKY HEADER SECTION --- */}
                <PageHeader
                    title={`REFERENCE ID: ${id.slice(-8).toUpperCase()}`}
                    version="Visit Management"
                    showBackButton={true}
                    trigger={<SidebarTrigger className="mr-2" />}
                    actions={
                        <div className="flex items-center gap-4">
                            {!isCompleted && (
                                <div className={cn(
                                    "flex items-center gap-2 md:gap-3 px-3 py-1.5 rounded-xl border transition-all shrink-0",
                                    isOverdue ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-200"
                                )}>
                                    <div className="flex flex-col items-end border-r pr-3 border-slate-200">
                                        <span className={cn(
                                            "text-[7px] font-black uppercase tracking-widest leading-none",
                                            isOverdue ? "text-red-500" : "text-slate-400"
                                        )}>
                                            {isOverdue ? "SLA Breach" : "SLA Window"}
                                        </span>
                                        <span className={cn(
                                            "text-[9px] font-bold uppercase mt-0.5",
                                            isOverdue ? "text-red-600" : "text-slate-500"
                                        )}>
                                            {isPending ? "Visit (24h)" : "Approval (12h)"}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Timer size={14} className={cn("shrink-0", isOverdue ? "text-red-500" : "text-blue-500")} />
                                        <span className={cn(
                                            "text-sm font-mono font-black tabular-nums leading-none tracking-tighter",
                                            isOverdue ? "text-red-600" : "text-slate-900"
                                        )}>
                                            {countdown}
                                        </span>
                                    </div>
                                </div>
                            )}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    navigator.clipboard.writeText(id.toUpperCase())
                                    toast.success("Reference ID copied to clipboard")
                                }}
                                className="h-9 rounded-xl border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all text-[10px] font-bold uppercase tracking-widest gap-2 bg-white"
                            >
                                <Copy size={12} />
                                Copy ID
                            </Button>
                        </div>
                    }
                />

                <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 space-y-6">

                    {/* --- STATUS BANNERS --- */}
                    {isCompleted && (
                        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 shadow-sm shadow-emerald-100/50 animate-in fade-in slide-in-from-top-2 duration-500">
                            <div className="p-2 bg-emerald-500 rounded-xl text-white shadow-lg shadow-emerald-200">
                                <ShieldCheck size={18} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-emerald-900">Visit Successfully Completed</p>
                                <p className="text-[11px] font-medium text-emerald-600/80 uppercase tracking-tight">This record has been finalized and archived.</p>
                            </div>
                        </div>
                    )}

                    {isConfirmed && (
                        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-2xl px-5 py-4 shadow-sm shadow-blue-100/50 animate-in fade-in slide-in-from-top-2 duration-500">
                            <div className="p-2 bg-blue-500 rounded-xl text-white shadow-lg shadow-blue-200">
                                <Clock size={18} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-blue-900">Visit Report Submitted</p>
                                <p className="text-[11px] font-medium text-blue-600/80 uppercase tracking-tight">Waiting for final approval from the sales department.</p>
                            </div>
                        </div>
                    )}

                    {/* --- DYNAMIC HUD --- */}
                    <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                        <StatBlock label="SERVICE TYPE" value={protocolDisplay} icon={ShieldAlert} />
                        <StatBlock label="REQUESTED BY" value={userContext.name} icon={Fingerprint} />
                        <StatBlock label="ASSIGNED ENGINEER" value={data?.pic || "UNASSIGNED"} icon={User} color={!data?.pic ? "text-slate-400" : ""} />
                        <div className="bg-white p-5 border border-slate-200/60 shadow-sm rounded-2xl flex flex-col justify-between group hover:shadow-md transition-all">
                            <div className="flex items-center gap-2.5 mb-3">
                                <div className={cn(
                                    "p-2 rounded-xl transition-all",
                                    isPending ? "bg-amber-50 text-amber-500" : isConfirmed ? "bg-blue-50 text-blue-500" : "bg-emerald-50 text-emerald-500"
                                )}>
                                    <Activity size={14} />
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">VISIT STATUS</span>
                            </div>
                            <Badge variant="outline" className={cn(
                                "rounded-xl py-2 text-[11px] font-black uppercase tracking-wider w-full flex justify-center border-2 transition-all",
                                isPending ? "bg-amber-50/50 text-amber-600 border-amber-100 shadow-sm shadow-amber-50" :
                                    isConfirmed ? "bg-blue-50/50 text-blue-600 border-blue-100 shadow-sm shadow-blue-50" :
                                        "bg-emerald-50/50 text-emerald-600 border-emerald-100 shadow-sm shadow-emerald-50"
                            )}>
                                {status}
                            </Badge>
                        </div>
                    </section>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                        {/* --- LEFT COLUMN: ACTIONS & HISTORY --- */}
                        <div className="lg:col-span-5 space-y-8 order-2 lg:order-1">

                            <div className="relative">
                                {isEngineering && isPending && (
                                    <div className="relative bg-slate-900 text-white p-8 rounded-[24px] shadow-2xl border border-white/5 overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                            <Wrench size={120} />
                                        </div>
                                        
                                        <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-6">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-blue-500 rounded-xl text-white">
                                                    <Cpu size={18} />
                                                </div>
                                                <h3 className="text-sm font-black uppercase tracking-tight">Engineer's Report</h3>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="size-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_12px_#3b82f6]" />
                                                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Active Report</span>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <Button
                                                variant="outline"
                                                onClick={() => window.location.href = `viber://chat?number=${data.requestorPhone}`}
                                                className="w-full bg-white/5 hover:bg-white/10 border-white/10 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest h-12 flex justify-between px-6 transition-all"
                                            >
                                                <span className="flex items-center gap-2">
                                                    <Radio size={14} className="text-blue-400" /> Contact Client via Viber
                                                </span>
                                                <ExternalLink size={12} className="opacity-30" />
                                            </Button>

                                            <div className="space-y-3">
                                                <div className="flex justify-between items-end">
                                                    <label className="text-[11px] font-bold uppercase text-slate-400 tracking-widest ml-1">Field Notes</label>
                                                    <span className="text-[9px] font-medium text-slate-500 uppercase">Mandatory Field</span>
                                                </div>
                                                <Textarea
                                                    value={confNotes}
                                                    onChange={(e) => setConfNotes(e.target.value)}
                                                    className="min-h-[160px] rounded-2xl bg-black/20 border-white/10 font-medium text-[15px] focus:border-blue-500/50 transition-all resize-none placeholder:text-slate-700 text-slate-200 p-5"
                                                    placeholder="Describe the findings and actions taken during the visit..."
                                                />
                                            </div>

                                            <Button
                                                disabled={actionLoading || !confNotes}
                                                onClick={() => handleStatusUpdate("CONFIRMED", { confirmationNotes: confNotes })}
                                                className="w-full h-14 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl uppercase tracking-widest shadow-xl shadow-blue-900/20 transition-all group"
                                            >
                                                {actionLoading ? (
                                                    <Loader2 className="animate-spin" />
                                                ) : (
                                                    <div className="flex items-center gap-3">
                                                        Submit Report <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                                    </div>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {isSales && isConfirmed && (
                                    <div className="relative bg-white border border-slate-200/60 p-8 rounded-[24px] shadow-xl flex flex-col gap-6">
                                        <div className="flex items-center gap-4 w-full border-b border-slate-100 pb-6">
                                            <div className="size-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-100">
                                                <ShieldCheck size={28} />
                                            </div>
                                            <div className="text-left">
                                                <h4 className="text-base font-black uppercase text-slate-900 tracking-tight">Review Report</h4>
                                                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Approval Required</p>
                                            </div>
                                        </div>

                                        <div className="relative p-6 bg-slate-50 rounded-2xl border border-slate-100">
                                            <div className="absolute top-0 left-6 -translate-y-1/2 px-3 py-1 bg-white rounded-full text-[9px] font-black text-slate-400 uppercase tracking-widest border border-slate-100 shadow-sm">Engineer's Field Notes</div>
                                            <p className="text-[14px] leading-relaxed text-slate-700 font-medium italic">"{data.confirmationNotes}"</p>
                                        </div>

                                        <Button
                                            disabled={actionLoading}
                                            onClick={() => handleStatusUpdate("COMPLETED")}
                                            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black rounded-2xl h-14 uppercase tracking-widest transition-all shadow-lg shadow-slate-200"
                                        >
                                            {actionLoading ? <Loader2 className="animate-spin" /> : "Approve Visit"}
                                        </Button>
                                    </div>
                                )}

                                {((isEngineering && (isConfirmed || isCompleted)) || (isSales && isPending) || (isSales && isCompleted)) && (
                                    <div className="relative bg-white border border-slate-200/60 p-12 rounded-[24px] flex flex-col items-center text-center overflow-hidden shadow-sm">
                                        {!isCompleted && (
                                            <div className="absolute top-0 left-0 w-full h-[3px] bg-slate-50">
                                                <div className="h-full bg-blue-500 animate-[loading_4s_ease-in-out_infinite]" style={{ width: '40%' }} />
                                            </div>
                                        )}
                                        <div className={cn(
                                            "size-20 rounded-3xl border flex items-center justify-center mb-6 transition-all",
                                            isCompleted ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-slate-50 border-slate-100 text-slate-300"
                                        )}>
                                            {isCompleted ? (
                                                <CheckCircle2 size={32} />
                                            ) : (
                                                <Clock size={32} className="animate-pulse" />
                                            )}
                                        </div>
                                        <div className="space-y-3">
                                            <h4 className="text-sm font-black uppercase text-slate-900 tracking-widest">
                                                {isCompleted ? "Record Finalized" : "Visit in Progress"}
                                            </h4>
                                            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide leading-relaxed max-w-[260px] mx-auto">
                                                {isCompleted
                                                    ? "This visit record has been successfully completed and archived."
                                                    : isEngineering
                                                        ? "Your report is submitted. Waiting for management review."
                                                        : "The engineer is currently handling the visit. Waiting for report submission."}
                                            </p>
                                        </div>
                                        {isCompleted ? (
                                            <div className="mt-8 py-2 px-5 bg-emerald-50 rounded-full border border-emerald-100">
                                                <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Finalized</span>
                                            </div>
                                        ) : (
                                            <div className="mt-8 flex gap-1.5">
                                                <span className="size-1.5 bg-blue-200 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                                <span className="size-1.5 bg-blue-200 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                                <span className="size-1.5 bg-blue-200 rounded-full animate-bounce" />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* TIMELINE SECTION */}
                            <div className="bg-white border border-slate-200/60 rounded-[24px] shadow-sm overflow-hidden">
                                <div className="bg-slate-50/50 px-6 py-5 border-b border-slate-100 flex justify-between items-center">
                                    <h3 className="text-[11px] font-bold uppercase tracking-widest flex items-center gap-2.5 text-slate-500">
                                        <div className="p-1.5 bg-white rounded-lg shadow-sm">
                                            <History size={14} />
                                        </div>
                                        Activity History
                                    </h3>
                                    <Badge variant="secondary" className="text-[9px] rounded-full bg-white text-slate-400 border border-slate-100 font-mono">v5.4</Badge>
                                </div>
                                <div className="p-8 space-y-1">
                                    <TimelineItem label="Request Initiated" time={data?.createdAt} status="done" desc="The visit request was successfully created." />
                                    <TimelineItem label="Report Submitted" time={data?.confirmedAt} status={isConfirmed || isCompleted ? "done" : "pending"} desc={data.confirmedBy ? `Field notes submitted by ${data.confirmedBy}` : "Waiting for engineer report."} />
                                    <TimelineItem label="Final Approval" time={data?.completedAt} status={isCompleted ? "done" : "pending"} desc="Record approved and officially closed." isLast />
                                </div>
                            </div>

                            {/* QUICK STATS PANEL */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-center gap-1.5 hover:shadow-md transition-all">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">SLA Compliance</span>
                                    <span className={cn(
                                        "text-[11px] font-black uppercase tracking-tight",
                                        isOverdue ? "text-red-500" : isCompleted ? "text-emerald-500" : "text-blue-500"
                                    )}>
                                        {isOverdue ? "Breach Detected" : isCompleted ? "Completed On-Time" : "Within Window"}
                                    </span>
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-center gap-1.5 hover:shadow-md transition-all">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Priority Level</span>
                                    <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight">
                                        Standard Visit
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* --- RIGHT COLUMN: VISIT DETAILS --- */}
                        <div className="lg:col-span-7 space-y-8 order-1 lg:order-2">
                            <div className="bg-white border border-slate-200/60 rounded-[24px] shadow-sm overflow-hidden">
                                <div className="bg-slate-900 px-8 py-6 flex justify-between items-center relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-8 opacity-10">
                                        <FileText size={80} className="text-white" />
                                    </div>
                                    <div className="flex items-center gap-3 relative z-10">
                                        <div className="p-2 bg-blue-500 rounded-xl text-white shadow-lg shadow-blue-500/20">
                                            <FileText size={20} />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black text-white tracking-widest uppercase">Visit Details</h3>
                                            <p className="text-[9px] font-bold text-blue-400 uppercase tracking-[0.2em] mt-0.5">Service Information</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="divide-y divide-slate-100">
                                    <div className="p-8 md:p-10 bg-slate-50/30">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16">
                                            <ManifestItem label="Appointment Date" value={formatBookingDate(data.appointmentDate)} icon={Calendar} isHighlight />
                                            <ManifestItem label="Support Category" value={protocolDisplay} icon={Wrench} />
                                        </div>
                                    </div>

                                    <div className="p-8 md:p-10 grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16">
                                        <ManifestItem label="Client / Company" value={data.client} icon={Building2} />
                                        <ManifestItem label="Assigned Engineer" value={data.pic} icon={User} />
                                    </div>

                                    <div className="p-8 md:p-10 space-y-10">
                                        <ManifestItem label="Site Location" value={data.address} icon={MapPin} />
                                        <ManifestItem label="Agenda / Purpose" value={data.agenda} icon={ClipboardList} isLongText />
                                    </div>

                                    <div className="p-8 md:p-10">
                                        <div className="flex items-center gap-2.5 mb-6">
                                            <div className="p-1.5 bg-slate-100 rounded-lg text-slate-400">
                                                <Paperclip size={14} />
                                            </div>
                                            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Attachments & Documents</span>
                                        </div>
                                        {data.fileUrl ? (
                                            <div className="flex flex-col md:flex-row gap-4">
                                                <a href={data.fileUrl} target="_blank" rel="noopener noreferrer" className="flex-1 inline-flex items-center gap-5 p-5 border border-slate-200 rounded-[20px] hover:border-blue-500 hover:bg-blue-50/30 transition-all group shadow-sm hover:shadow-md">
                                                    <div className="p-4 bg-slate-100 group-hover:bg-blue-100 text-slate-600 group-hover:text-blue-600 transition-all rounded-2xl shadow-sm">
                                                        <FileText size={28} />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[12px] font-black uppercase text-slate-900 flex items-center gap-2 tracking-tight">View Document <ExternalLink size={12} className="opacity-40" /></span>
                                                        <span className="text-[10px] text-slate-400 uppercase tracking-widest mt-1 font-bold">PDF Reference</span>
                                                    </div>
                                                </a>

                                                <button
                                                    onClick={() => handleDownload(data.fileUrl)}
                                                    className="inline-flex items-center gap-5 p-5 bg-slate-900 text-white hover:bg-slate-800 transition-all group rounded-[20px] md:w-auto shadow-lg shadow-slate-200"
                                                >
                                                    <div className="p-4 bg-white/10 group-hover:bg-white/20 text-white transition-all rounded-2xl">
                                                        <Download size={28} />
                                                    </div>
                                                    <div className="flex flex-col pr-6 text-left">
                                                        <span className="text-[12px] font-black uppercase tracking-widest">Download</span>
                                                        <span className="text-[9px] text-slate-400 uppercase tracking-widest mt-1 font-bold">Offline Copy</span>
                                                    </div>
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-4 p-8 border-2 border-dashed border-slate-100 bg-slate-50/50 text-slate-300 rounded-[24px] justify-center">
                                                <div className="p-3 bg-white rounded-2xl shadow-sm">
                                                    <AlertCircle size={24} />
                                                </div>
                                                <span className="text-[12px] font-bold uppercase tracking-widest">No documents attached</span>
                                            </div>
                                        )}
                                    </div>

                                    {(isConfirmed || isCompleted) && (
                                        <div className="p-8 md:p-10 bg-slate-900 text-white relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-8 opacity-5">
                                                <ShieldCheck size={100} />
                                            </div>
                                            <div className="flex items-center gap-2.5 mb-6 relative z-10">
                                                <div className="p-1.5 bg-blue-500/20 rounded-lg text-blue-400">
                                                    <Cpu size={14} />
                                                </div>
                                                <span className="text-[11px] font-black uppercase tracking-widest">Official Report Summary</span>
                                            </div>
                                            <div className="relative pl-8 border-l-2 border-blue-500/30 z-10">
                                                <p className="text-[15px] italic text-slate-300 leading-relaxed font-medium">
                                                    "{data.confirmationNotes}"
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button onClick={() => router.back()} className="w-full md:w-auto px-8 h-12 flex items-center justify-center gap-3 text-[11px] font-black text-slate-400 hover:text-blue-600 uppercase tracking-widest transition-all group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md">
                                <ChevronLeft className="size-4 group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
                            </button>
                        </div>
                    </div>
                </main>

                <CollaborationHub
                    requestId={id}
                    collectionName="appointments"
                    messages={data?.messages || []}
                    currentUserId={userContext.id}
                    userName={userContext.name}
                    profilePicture={userContext.profilePicture}
                    userRole={userContext.role}
                    status={status}
                    title={data?.client || "dsiconnect"}
                />
            </SidebarInset>
        </SidebarProvider>
    )
}

function TimelineItem({ label, time, status, desc, isLast = false }: any) {
    const formattedTime = time?.toDate ? time.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : "---"
    const isActive = status === "done"
    return (
        <div className="relative flex gap-6">
            {!isLast && <div className={cn("absolute left-[9px] top-6 w-[1.5px] h-full", isActive ? "bg-blue-100" : "bg-slate-100")} />}
            <div className={cn(
                "relative z-10 size-[20px] rounded-full border-4 mt-1 flex items-center justify-center transition-all",
                isActive ? "bg-blue-600 border-white ring-4 ring-blue-50 shadow-sm" : "bg-white border-slate-200"
            )} />
            <div className="pb-8">
                <div className="flex items-center gap-3">
                    <span className={cn("text-xs font-bold uppercase tracking-tight", isActive ? "text-slate-900" : "text-slate-400 opacity-60")}>{label}</span>
                    {isActive && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-600 border border-blue-100">
                            {formattedTime}
                        </span>
                    )}
                </div>
                <p className="text-[11px] text-slate-500 mt-1 font-medium leading-relaxed">{desc}</p>
            </div>
        </div>
    )
}

function ManifestItem({ label, value, icon: Icon, isLongText = false, isHighlight = false }: any) {
    return (
        <div className="flex flex-col gap-2.5 group">
            <div className="flex items-center gap-2">
                <div className="p-1.5 bg-slate-100 rounded-lg text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-all">
                    <Icon size={14} />
                </div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{label}</span>
            </div>
            <div className={cn(
                "pl-4 border-l-2 border-slate-100 group-hover:border-blue-200 transition-all",
                isLongText ? "min-h-[50px]" : ""
            )}>
                <span className={cn(
                    "block leading-snug font-semibold",
                    isHighlight ? "text-xl md:text-2xl text-blue-600 font-black tracking-tight" : "text-[15px] text-slate-800"
                )}>
                    {value || "N/A"}
                </span>
            </div>
        </div>
    )
}

function StatBlock({ label, value, icon: Icon, color = "" }: any) {
    return (
        <div className="bg-white p-5 border border-slate-200/60 shadow-sm rounded-2xl flex flex-col justify-between min-h-[110px] group hover:shadow-md transition-all">
            <div className="flex items-center gap-2.5 text-slate-400 mb-3">
                <div className="p-2 bg-slate-50 rounded-xl group-hover:bg-blue-50 group-hover:text-blue-500 transition-all">
                    <Icon size={14} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</span>
            </div>
            <div className="flex flex-col gap-1.5">
                <span className={cn("text-sm md:text-base font-bold tracking-tight truncate", color || "text-slate-900")}>
                    {value || "NOT_SET"}
                </span>
                <div className="h-[3px] w-8 bg-slate-100 rounded-full group-hover:w-full group-hover:bg-blue-500/20 transition-all duration-500" />
            </div>
        </div>
    )
}

function LoadingScreen() {
    return (
        <div className="h-screen flex flex-col items-center justify-center gap-6 bg-slate-50">
            <div className="relative flex items-center justify-center">
                <div className="absolute size-20 border-2 border-t-blue-600 rounded-full animate-spin border-slate-200" />
                <div className="size-12 bg-white rounded-2xl shadow-lg flex items-center justify-center">
                    <Activity className="text-blue-600 size-6 animate-pulse" />
                </div>
            </div>
            <div className="flex flex-col items-center gap-1">
                <span className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-900 ml-1">Loading Appointment</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Synchronizing Record...</span>
            </div>
        </div>
    )
}