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
    Download
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

export default function AppointmentDetailsPage() {
    const params = useParams() as { id: string }
    const id = params.id
    const router = useRouter()

    const [loading, setLoading] = React.useState(true)
    const [data, setData] = React.useState<any>(null)
    const [userContext, setUserContext] = React.useState({ role: "", id: "", name: "" })
    const [actionLoading, setActionLoading] = React.useState(false)
    const [confNotes, setConfNotes] = React.useState("")

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
                    name: user.Name || "Unknown Unit"
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
                toast.error("COMMUNICATION_ERROR: REGISTRY_OFFLINE")
                setLoading(false)
            }
        }
        establishUplink()
        return () => unsubscribe?.()
    }, [id])

    const handleStatusUpdate = async (newStatus: string, additionalData = {}) => {
        setActionLoading(true)
        const toastId = toast.loading(`SYNCHRONIZING_STATUS: ${newStatus}...`)
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
            toast.success(`Record successfully updated to ${newStatus}.`, { id: toastId })
        } catch (err) {
            toast.error("Authorization or Sync Failure.", { id: toastId })
        } finally {
            setActionLoading(false)
        }
    }

    const handleDownload = async (url: string) => {
        const toastId = toast.loading("INITIATING_SECURE_TRANSFER...")
        try {
            const response = await fetch(url)
            const blob = await response.blob()
            const blobUrl = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = blobUrl
            link.download = `REF_${id.slice(-6).toUpperCase()}_ASSET.pdf`
            document.body.appendChild(link)
            link.click()
            link.remove()
            window.URL.revokeObjectURL(blobUrl)
            toast.success("TRANSFER_COMPLETE", { id: toastId })
        } catch (err) {
            toast.error("DOWNLOAD_ERROR: ENCRYPTED_STREAM_INTERRUPTED", { id: toastId })
        }
    }

    if (loading) return <LoadingScreen />

    const isEngineering = userContext.role === "it" || userContext.role === "engineering"
    const isSales = userContext.role === "sales"
    const status = data?.status?.toUpperCase() || "PENDING"
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
                <div className="sticky top-0 z-[100] w-full bg-[#F8FAFC]/95 backdrop-blur-sm border-b border-slate-200">
                    <header className="sticky top-0 z-40 w-full bg-[#F8FAFC]/95 backdrop-blur-md border-b border-slate-200">
                        <PageHeader
                            title={`FILE_REF: ${id.slice(-8).toUpperCase()}`}
                            version={isEngineering ? "ENG_CORE_v5.4" : "SLS_MGMT_v5.4"}
                            showBackButton={true}
                            trigger={
                                <SidebarTrigger className="group relative flex items-center justify-center size-9 bg-muted/5 hover:bg-primary/10 border-2 border-muted/50 hover:border-primary/50 transition-all duration-300 rounded-none overflow-hidden">
                                    <div className="absolute top-0 left-0 size-1 border-t border-l border-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="flex flex-col gap-1 items-end">
                                        <div className="h-[2px] w-5 bg-primary group-hover:w-3 transition-all" />
                                        <div className="h-[2px] w-4 bg-primary group-hover:w-5 transition-all" />
                                    </div>
                                </SidebarTrigger>
                            }
                        />
                    </header>
                </div>

                <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 space-y-8">

                    {/* --- DYNAMIC HUD --- */}
                    <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                        <StatBlock label="SERVICE_PROTOCOL" value={protocolDisplay} icon={ShieldAlert} />
                        <StatBlock label="UNIT_IDENTITY" value={userContext.name} icon={Fingerprint} />
                        <StatBlock label="FIELD_ENGINEER" value={data?.pic || "UNASSIGNED"} icon={User} color={!data?.pic ? "text-slate-400" : ""} />
                        <div className="col-span-1 bg-white p-4 md:p-5 border border-slate-200 shadow-sm rounded-sm flex flex-col justify-between group hover:border-blue-400 transition-colors">
                            <div className="flex items-center gap-2 mb-2">
                                <Activity size={14} className={cn("transition-colors", isPending ? "text-amber-500" : isConfirmed ? "text-blue-500" : "text-emerald-500")} />
                                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">STATUS_LOG</span>
                            </div>
                            <Badge variant="outline" className={cn(
                                "rounded-none py-2 text-[10px] font-black uppercase tracking-wider w-full flex justify-center border-2",
                                isPending ? "bg-amber-50/50 text-amber-600 border-amber-200/60" :
                                    isConfirmed ? "bg-blue-50/50 text-blue-600 border-blue-200/60" :
                                        "bg-emerald-50/50 text-emerald-600 border-emerald-200/60"
                            )}>
                                {status}
                            </Badge>
                        </div>
                    </section>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                        {/* --- LEFT COLUMN: ACTIONS & HISTORY --- */}
                        <div className="lg:col-span-5 space-y-8 order-2 lg:order-1">

                            <div className="relative group">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-slate-400 to-slate-600 rounded-sm blur opacity-5 group-hover:opacity-10 transition duration-1000"></div>

                                {isEngineering && isPending && (
                                    <div className="relative bg-slate-950 text-white p-6 md:p-8 rounded-sm shadow-2xl border border-white/10">
                                        <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-5">
                                            <div className="flex items-center gap-3">
                                                <Cpu size={18} className="text-blue-400" />
                                                <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-blue-100">Technical Disclosure</h3>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[8px] font-bold text-blue-500/50 tracking-tighter">SECURE_CHANNEL_v5</span>
                                                <div className="size-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]" />
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <Button
                                                variant="outline"
                                                onClick={() => window.location.href = `viber://chat?number=${data.requestorPhone}`}
                                                className="w-full bg-white/[0.03] hover:bg-white/[0.08] border-white/10 text-white rounded-none font-bold uppercase text-[9px] tracking-widest h-12 flex justify-between px-6 transition-all"
                                            >
                                                <span className="flex items-center gap-2">
                                                    <Radio size={14} className="text-blue-400" /> Establish Client Liaison
                                                </span>
                                                <ExternalLink size={12} className="opacity-30" />
                                            </Button>

                                            <div className="space-y-3">
                                                <div className="flex justify-between items-end">
                                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Formal Observations</label>
                                                    <span className="text-[8px] font-mono text-slate-600">INPUT_REQUIRED</span>
                                                </div>
                                                <Textarea
                                                    value={confNotes}
                                                    onChange={(e) => setConfNotes(e.target.value)}
                                                    className="min-h-[160px] rounded-none bg-black/40 border-white/5 font-mono text-[16px] md:text-xs focus:border-blue-500/30 transition-all resize-none placeholder:text-slate-800 text-slate-200"
                                                    placeholder="Document technical findings and deployment specifics..."
                                                />
                                            </div>

                                            <Button
                                                disabled={actionLoading || !confNotes}
                                                onClick={() => handleStatusUpdate("CONFIRMED", { confirmationNotes: confNotes })}
                                                className="w-full h-14 bg-blue-700 hover:bg-blue-600 text-white font-black rounded-none uppercase tracking-[0.25em] shadow-xl transition-all group"
                                            >
                                                {actionLoading ? (
                                                    <Loader2 className="animate-spin" />
                                                ) : (
                                                    <div className="flex items-center gap-3">
                                                        Submit Documentation <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                                    </div>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {isSales && isConfirmed && (
                                    <div className="relative bg-white border border-slate-200 p-8 rounded-sm shadow-xl flex flex-col gap-6">
                                        <div className="flex items-center gap-4 w-full border-b border-slate-100 pb-5">
                                            <div className="size-12 rounded-none bg-slate-950 flex items-center justify-center text-white">
                                                <ShieldCheck size={24} />
                                            </div>
                                            <div className="text-left">
                                                <h4 className="text-sm font-black uppercase text-slate-900 tracking-widest">Verification Protocol</h4>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight mt-1">Pending Management Authorization</p>
                                            </div>
                                        </div>

                                        <div className="relative p-6 bg-slate-50 border border-slate-100 italic">
                                            <div className="absolute top-0 left-0 w-1 h-full bg-slate-900" />
                                            <span className="absolute -top-2 left-4 px-2 bg-white text-[8px] font-black text-slate-400 uppercase tracking-widest border border-slate-100">Technical_Report</span>
                                            <p className="text-[13px] leading-relaxed text-slate-700 font-medium">"{data.confirmationNotes}"</p>
                                        </div>

                                        <Button
                                            disabled={actionLoading}
                                            onClick={() => handleStatusUpdate("COMPLETED")}
                                            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black rounded-none h-14 uppercase tracking-[0.25em] transition-all shadow-lg"
                                        >
                                            {actionLoading ? <Loader2 className="animate-spin" /> : "Authorize & Finalize Record"}
                                        </Button>
                                    </div>
                                )}

                                {((isEngineering && (isConfirmed || isCompleted)) || (isSales && isPending) || (isSales && isCompleted)) && (
                                    <div className="relative bg-white border border-slate-200 p-12 rounded-sm flex flex-col items-center text-center overflow-hidden">
                                        {!isCompleted && (
                                            <div className="absolute top-0 left-0 w-full h-[2px] bg-slate-100">
                                                <div className="h-full bg-slate-400 animate-[loading_4s_ease-in-out_infinite]" style={{ width: '40%' }} />
                                            </div>
                                        )}
                                        <div className="size-16 rounded-full border border-slate-100 flex items-center justify-center mb-6">
                                            {isCompleted ? (
                                                <Lock size={24} className="text-slate-900" />
                                            ) : (
                                                <Clock size={24} className="text-slate-300 animate-pulse" />
                                            )}
                                        </div>
                                        <div className="space-y-3">
                                            <h4 className="text-[11px] font-black uppercase text-slate-900 tracking-[0.4em]">Protocol Standby</h4>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed max-w-[240px] mx-auto">
                                                {isCompleted
                                                    ? "Registry record is finalized and committed to the archive."
                                                    : isEngineering
                                                        ? "Awaiting executive review and administrative closure."
                                                        : "Awaiting field disclosure from assigned technical unit."}
                                            </p>
                                        </div>
                                        {isCompleted ? (
                                            <div className="mt-8 py-2 px-4 bg-emerald-50 border border-emerald-100">
                                                <span className="text-[9px] font-black text-emerald-700 uppercase tracking-[0.2em]">Status: Archive_Committed</span>
                                            </div>
                                        ) : (
                                            <div className="mt-8 flex gap-1">
                                                <span className="size-1 bg-slate-200 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                                <span className="size-1 bg-slate-200 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                                <span className="size-1 bg-slate-200 rounded-full animate-bounce" />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* TIMELINE SECTION */}
                            <div className="bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden">
                                <div className="bg-slate-50/80 px-5 py-4 border-b border-slate-200 flex justify-between items-center">
                                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-2 text-slate-500">
                                        <History size={14} /> Audit Trail
                                    </h3>
                                    <Badge variant="secondary" className="text-[9px] rounded-none bg-slate-200 text-slate-600">v5.4</Badge>
                                </div>
                                <div className="p-6 space-y-1">
                                    <TimelineItem label="Registry Entry" time={data?.createdAt} status="done" desc="Service request initialized." />
                                    <TimelineItem label="Engineering Validation" time={data?.confirmedAt} status={isConfirmed || isCompleted ? "done" : "pending"} desc={data.confirmedBy ? `Certified by ${data.confirmedBy}` : "Awaiting technician data."} />
                                    <TimelineItem label="Final Archival" time={data?.completedAt} status={isCompleted ? "done" : "pending"} desc="Registry record finalized." isLast />
                                </div>
                            </div>
                        </div>

                        {/* --- RIGHT COLUMN: SERVICE MANIFEST --- */}
                        <div className="lg:col-span-7 space-y-8 order-1 lg:order-2">
                            <div className="bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden">
                                <div className="bg-slate-900 px-6 py-5 flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="p-1.5 bg-blue-500/20 rounded-sm">
                                            <FileText size={18} className="text-blue-400" />
                                        </div>
                                        <h3 className="text-xs font-bold text-white tracking-[0.2em] uppercase italic">Service Manifest</h3>
                                    </div>
                                </div>

                                <div className="divide-y divide-slate-100">
                                    <div className="p-6 md:p-8 bg-slate-50/40">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                                            <ManifestItem label="Operational Date" value={formatBookingDate(data.appointmentDate)} icon={Calendar} isHighlight />
                                            <ManifestItem label="Support Category" value={protocolDisplay} icon={Wrench} />
                                        </div>
                                    </div>

                                    <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                                        <ManifestItem label="Client Account" value={data.client} icon={User} />
                                        <ManifestItem label="Assigned Unit" value={data.pic} icon={Fingerprint} />
                                    </div>

                                    <div className="p-6 md:p-8 space-y-8">
                                        <ManifestItem label="Deployment Address" value={data.address} icon={MapPin} />
                                        <ManifestItem label="Agenda & Scope" value={data.agenda} icon={FileText} isLongText />
                                    </div>

                                    <div className="p-6 md:p-8">
                                        <div className="flex items-center gap-2 mb-4">
                                            <Paperclip size={14} className="text-slate-400" />
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Documentation Assets</span>
                                        </div>
                                        {data.fileUrl ? (
                                            <div className="flex flex-col md:flex-row gap-3">
                                                <a href={data.fileUrl} target="_blank" rel="noopener noreferrer" className="flex-1 inline-flex items-center gap-5 p-4 md:p-5 border border-slate-200 hover:border-blue-500 hover:bg-blue-50/30 transition-all group rounded-sm">
                                                    <div className="p-3 bg-slate-100 group-hover:bg-blue-100 text-slate-600 group-hover:text-blue-600 transition-colors rounded-sm shadow-sm"><FileText size={24} /></div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[11px] font-black uppercase text-slate-900 flex items-center gap-2">VIEW_SOURCE <ExternalLink size={12} /></span>
                                                        <span className="text-[9px] text-slate-400 uppercase tracking-tighter mt-0.5 font-mono">ENCRYPTED_PDF</span>
                                                    </div>
                                                </a>

                                                <button
                                                    onClick={() => handleDownload(data.fileUrl)}
                                                    className="inline-flex items-center gap-5 p-4 md:p-5 border border-slate-950 bg-slate-950 text-white hover:bg-slate-800 transition-all group rounded-sm md:w-auto"
                                                >
                                                    <div className="p-3 bg-white/10 group-hover:bg-white/20 text-white transition-colors rounded-sm shadow-sm">
                                                        <Download size={24} />
                                                    </div>
                                                    <div className="flex flex-col pr-4 text-left">
                                                        <span className="text-[11px] font-black uppercase tracking-widest">Local_Extract</span>
                                                        <span className="text-[8px] text-slate-400 uppercase tracking-tighter mt-0.5 font-mono">EXTRACT_TO_DISK</span>
                                                    </div>
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-3 p-5 border-2 border-dashed border-slate-100 text-slate-300 rounded-sm italic">
                                                <AlertCircle size={20} /><span className="text-[11px] font-bold uppercase tracking-widest">No digital attachments</span>
                                            </div>
                                        )}
                                    </div>

                                    {(isConfirmed || isCompleted) && (
                                        <div className="p-6 md:p-8 bg-slate-900 text-white">
                                            <div className="flex items-center gap-2 mb-4">
                                                <Cpu size={14} className="text-blue-400" />
                                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Technician Discovery Log</span>
                                            </div>
                                            <p className="text-sm italic text-slate-300 border-l border-white/20 pl-6 leading-relaxed">
                                                "{data.confirmationNotes}"
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button onClick={() => router.back()} className="w-full md:w-auto px-6 h-10 flex items-center justify-center gap-3 text-[11px] font-black text-slate-400 hover:text-blue-600 uppercase tracking-widest transition-all group">
                                <ChevronLeft className="size-4 group-hover:-translate-x-1 transition-transform" /> Return to Registry
                            </button>
                        </div>
                    </div>
                </main>
            </SidebarInset>
        </SidebarProvider>
    )
}

function TimelineItem({ label, time, status, desc, isLast = false }: any) {
    const formattedTime = time?.toDate ? time.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : "---"
    const isActive = status === "done"
    return (
        <div className="relative flex gap-6">
            {!isLast && <div className={cn("absolute left-[9px] top-6 w-[1.5px] h-full", isActive ? "bg-blue-100" : "bg-slate-50")} />}
            <div className={cn("relative z-10 size-[20px] rounded-full border-4 mt-1 flex items-center justify-center", isActive ? "bg-blue-600 border-white ring-1 ring-blue-600/20 shadow-sm" : "bg-white border-slate-100")} />
            <div className="pb-8">
                <div className="flex items-center gap-3">
                    <span className={cn("text-[10px] font-black uppercase tracking-wider", isActive ? "text-slate-900" : "text-slate-400 opacity-60")}>{label}</span>
                    {isActive && <Badge variant="secondary" className="text-[8px] h-4 px-1.5 font-mono bg-blue-50 text-blue-600 border-none">{formattedTime}</Badge>}
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase italic mt-1.5 tracking-tight">{desc}</p>
            </div>
        </div>
    )
}

function ManifestItem({ label, value, icon: Icon, isLongText = false, isHighlight = false }: any) {
    return (
        <div className="flex flex-col gap-3 group">
            <div className="flex items-center gap-2">
                <Icon size={14} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
            </div>
            <div className={cn("pl-5 border-l-2 border-slate-100 group-hover:border-blue-100 transition-colors", isLongText ? "min-h-[50px]" : "")}>
                <span className={cn("uppercase italic font-black tracking-tight block leading-tight", isHighlight ? "text-xl md:text-2xl text-blue-600" : "text-sm text-slate-800")}>
                    {value || "N/A"}
                </span>
            </div>
        </div>
    )
}

function StatBlock({ label, value, icon: Icon, color = "" }: any) {
    return (
        <div className="bg-white p-4 md:p-5 border border-slate-200 shadow-sm rounded-sm flex flex-col justify-between min-h-[105px] group">
            <div className="flex items-center gap-2 text-slate-400 mb-2">
                <Icon size={12} className="group-hover:text-blue-500 transition-colors" />
                <span className="text-[9px] font-bold uppercase tracking-[0.15em]">{label}</span>
            </div>
            <div className="flex flex-col gap-1">
                <span className={cn("text-xs md:text-sm font-black italic tracking-wider uppercase truncate", color || "text-slate-900")}>{value || "NOT_SET"}</span>
                <div className="h-[2px] w-0 group-hover:w-full bg-blue-500/20 transition-all duration-500" />
            </div>
        </div>
    )
}

function LoadingScreen() {
    return (
        <div className="h-screen flex flex-col items-center justify-center gap-8 bg-slate-50">
            <div className="relative flex items-center justify-center">
                <div className="absolute size-16 border-2 border-t-blue-600 rounded-full animate-spin" />
                <Activity className="text-blue-600 size-6 animate-pulse" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-900">Synchronizing_Record</span>
        </div>
    )
}