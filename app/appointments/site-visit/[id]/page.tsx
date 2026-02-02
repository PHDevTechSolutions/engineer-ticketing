"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { 
  ShieldCheck, MapPin, User, FileText, 
  Loader2, Activity, ShieldAlert,
  Terminal, ChevronLeft, Fingerprint, MessageSquare, 
  Wrench, Paperclip, Clock, 
  Cpu, Layers, CheckCircle2, History, ExternalLink,
  Calendar // Added Calendar icon
} from "lucide-react"

import { db } from "@/lib/firebase"
import { doc, onSnapshot, updateDoc, serverTimestamp } from "firebase/firestore"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/page-header"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"

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
        toast.error("UPLINK_FAILURE: REGISTRY_OFFLINE")
        setLoading(false)
      }
    }
    establishUplink()
    return () => unsubscribe?.()
  }, [id])

  const handleStatusUpdate = async (newStatus: string, additionalData = {}) => {
    setActionLoading(true)
    const toastId = toast.loading(`SYNCING_REGISTRY: ${newStatus}...`)
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
      toast.success(`Protocol updated to ${newStatus}.`, { id: toastId })
    } catch (err) {
      toast.error("Failed to update registry.", { id: toastId })
    } finally {
      setActionLoading(false)
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

  // Helper to format the booking date
  const formatBookingDate = (ts: any) => {
    if (!ts) return "DATE_NOT_SET"
    const date = ts.toDate ? ts.toDate() : new Date(ts)
    return date.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
    }).toUpperCase()
  }
 
  return (
    <div className="flex flex-col min-h-screen bg-background font-sans antialiased text-foreground pb-20">
      <PageHeader 
        title={`FILE:_${id.slice(-8).toUpperCase()}`} 
        version={isEngineering ? "ENG-PROTO-v5.4" : "SLS-PROTO-v5.4"} 
      />

      <main className="flex-1 w-full max-w-[1400px] mx-auto p-4 md:p-8 space-y-8">
        
        {/* --- HUD STATS --- */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
            <StatBlock label="OPERATIONAL_PROTOCOL" value={protocolDisplay} icon={ShieldAlert} color="text-primary" subValue="VERIFIED_LOGIC" isScanner />
            <StatBlock label="USER_CLEARANCE" value={userContext.role} icon={Fingerprint} subValue={`PATH_ID: ${userContext.id.slice(0, 8)}`} />
            <StatBlock label="ASSIGNED_ENGINEER" value={data?.pic || "UNASSIGNED"} icon={User} subValue="ACTIVE_FIELD_UNIT" />
            
            <div className="relative overflow-hidden bg-background p-5 border-2 border-muted/50 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)]">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Activity size={12} className={cn("animate-pulse", isPending ? "text-amber-500" : isConfirmed ? "text-primary" : "text-emerald-500")} />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">STATUS</span>
                    </div>
                </div>
                <Badge className={cn(
                    "rounded-none px-4 py-2 border-2 text-[11px] font-black uppercase italic w-full flex justify-center tracking-[0.2em]",
                    isPending ? "bg-amber-500/10 text-amber-500 border-amber-500/40" : 
                    isConfirmed ? "bg-primary/10 text-primary border-primary/40" : 
                    "bg-emerald-500/10 text-emerald-500 border-emerald-500/40"
                )}>
                    {status}
                </Badge>
            </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 space-y-6">
            
            {/* DYNAMIC ACTION CARD */}
            <div className="transition-all duration-300">
                {isEngineering && isPending && (
                <div className="bg-background border-2 border-primary p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <div className="space-y-6">
                        <Button onClick={() => window.location.href = `viber://chat?number=${data.requestorPhone}`} className="w-full bg-amber-400 text-black rounded-none border-2 border-black font-black italic shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            <MessageSquare className="mr-2" size={18} /> PING_VIBER_UPLINK
                        </Button>
                        <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-widest flex items-center gap-2 italic"> <Terminal size={12} /> Technical Notes </label>
                            <Textarea value={confNotes} onChange={(e) => setConfNotes(e.target.value)} className="min-h-[150px] rounded-none border-l-4 border-primary/20 bg-muted/5 font-mono text-[11px] uppercase p-4" placeholder="LOG_DETAILS..." />
                        </div>
                        <Button disabled={actionLoading} onClick={() => handleStatusUpdate("CONFIRMED", { confirmationNotes: confNotes })} className="w-full h-14 bg-primary text-white font-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            {actionLoading ? <Loader2 className="animate-spin" /> : "CONFIRM_AS_ENGINEER"}
                        </Button>
                    </div>
                </div>
                )}

                {isSales && isConfirmed && (
                <div className="bg-emerald-500/5 border-2 border-emerald-500 p-8 flex flex-col items-center text-center gap-6">
                    <ShieldCheck className="text-emerald-500 size-16" />
                    <h4 className="text-2xl font-black uppercase italic text-emerald-700 leading-none">ENGINEER_SUBMITTED</h4>
                    <div className="p-5 bg-white border-l-4 border-emerald-500 w-full text-left font-mono text-[11px] italic shadow-sm">
                        <span className="text-[8px] font-black uppercase opacity-40 block mb-1 underline tracking-tighter">Report From {data.confirmedBy}:</span>
                        "{data.confirmationNotes}"
                    </div>
                    <Button disabled={actionLoading} onClick={() => handleStatusUpdate("COMPLETED")} className="w-full bg-emerald-500 text-white font-black rounded-none h-14 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        {actionLoading ? <Loader2 className="animate-spin" /> : "ACKNOWLEDGE_&_CLOSE_FILE"}
                    </Button>
                </div>
                )}

                {/* PASSIVE STATE VIEW */}
                {((isEngineering && !isPending) || (isSales && !isConfirmed)) && (
                <div className="bg-muted/5 border-2 border-muted/50 p-8 flex flex-col items-center text-center gap-4 grayscale opacity-80">
                    {isCompleted ? <CheckCircle2 className="size-10 text-emerald-500" /> : <Clock className="size-10 text-amber-500 animate-pulse" />}
                    <h4 className="text-lg font-black uppercase italic tracking-tighter">{isCompleted ? "MISSION_COMPLETE" : "WAITING_FOR_DATA"}</h4>
                    <p className="text-[10px] font-mono uppercase opacity-60 italic">{isPending ? `Awaiting technical report from ${data.pic}` : `Awaiting sales sign-off.`}</p>
                </div>
                )}
            </div>

            {/* --- TIMELINE --- */}
            <div className="border-2 border-muted/50 bg-background overflow-hidden shadow-[10px_10px_0px_0px_rgba(0,0,0,0.03)]">
                <div className="bg-muted/10 border-b-2 border-muted/50 p-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2 italic">
                        <History size={14} className="text-primary" /> SYSTEM_TIMELINE
                    </h3>
                </div>
                <div className="p-6 space-y-6">
                    <TimelineItem label="REQUEST_LOGGED" time={data?.createdAt} status="done" desc="Order entered into registry." />
                    <TimelineItem label="FIELD_VERIFIED" time={data?.confirmedAt} status={isConfirmed || isCompleted ? "done" : "pending"} desc={data.confirmedBy ? `Verified by ${data.confirmedBy}` : "Awaiting Engineer."} />
                    <TimelineItem label="FILE_ARCHIVED" time={data?.completedAt} status={isCompleted ? "done" : "pending"} desc={data.completedBy ? `Closed by ${data.completedBy}` : "Pending final sign-off."} isLast />
                </div>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-6">
            <div className="border-2 border-muted/50 bg-background overflow-hidden shadow-[10px_10px_0px_0px_rgba(0,0,0,0.03)]">
                <div className="bg-muted/10 border-b-2 border-muted/50 p-4">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.3em] flex items-center gap-3"> <Terminal size={16} className="text-primary" /> SITE_VISIT_MANIFEST </h3>
                </div>
                <div className="divide-y divide-muted/20">
                    {/* ADDED BOOKING DATE ITEM */}
                    <div className="p-6 bg-primary/[0.03] border-b-2 border-primary/10">
                        <div className="flex items-center gap-2 mb-2">
                            <Calendar size={14} className="text-primary" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Scheduled_Visit_Date:</span>
                        </div>
                        <div className="pl-6">
                            <span className="text-xl font-black text-foreground uppercase italic tracking-tighter">
                                {formatBookingDate(data.appointmentDate)}
                            </span>
                        </div>
                    </div>

                    <ManifestItem label="Assistance Type:" value={protocolDisplay} icon={Wrench} />
                    <ManifestItem label="Client's Name:" value={data.client} icon={User} />
                    <ManifestItem label="Site Address:" value={data.address} icon={MapPin} />
                    <ManifestItem label="Agenda/Scope:" value={data.agenda} icon={FileText} isLongText />
                    
                    <div className="p-6">
                        <div className="flex items-center gap-2 mb-2">
                            <Paperclip size={14} className="text-primary opacity-50" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Attached_Files:</span>
                        </div>
                        <div className="border-l-2 border-muted/30 pl-4 py-1">
                            {data.fileUrl ? (
                                <a 
                                    href={data.fileUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-xs font-black text-primary uppercase italic hover:bg-primary/5 p-2 border border-primary/20 transition-all"
                                >
                                    <FileText size={14} /> VIEW_ATTACHED_DOCUMENT <ExternalLink size={10} />
                                </a>
                            ) : (
                                <span className="text-xs font-black text-muted-foreground uppercase italic opacity-40">NO_FILES_DETECTED</span>
                            )}
                        </div>
                    </div>

                    <div className="p-6 bg-primary/[0.01]">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground block mb-3 italic">Other Instructions:</span>
                        <div className="border-l-4 border-primary/20 pl-4 py-1 italic">
                            <p className="text-sm font-black text-foreground uppercase leading-tight tracking-tight">{data.notes || "NO_NOTES_PROVIDED"}</p>
                        </div>
                    </div>
                </div>
            </div>
            <Button variant="ghost" onClick={() => router.back()} className="h-8 text-[10px] font-black uppercase italic text-muted-foreground group hover:text-primary transition-colors">
                <ChevronLeft className="size-4 mr-2 group-hover:-translate-x-1" /> Return_To_Registry
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}

function TimelineItem({ label, time, status, desc, isLast = false }: any) {
    const formattedTime = time?.toDate ? time.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "---"
    const isActive = status === "done"
    return (
        <div className="relative flex gap-4">
            {!isLast && <div className={cn("absolute left-[7px] top-4 w-[1px] h-full", isActive ? "bg-primary/40" : "bg-muted/30")} />}
            <div className={cn("relative z-10 size-4 rounded-full border-2 mt-1", isActive ? "bg-primary border-primary shadow-[0_0_5px_rgba(var(--primary),0.5)]" : "bg-background border-muted/50")} />
            <div className="space-y-1">
                <div className="flex items-center gap-3">
                    <span className={cn("text-[9px] font-black uppercase tracking-[0.2em]", isActive ? "text-foreground" : "text-muted-foreground opacity-40")}>{label}</span>
                    {isActive && <span className="text-[8px] font-mono text-primary/70 bg-primary/5 px-1">{formattedTime}</span>}
                </div>
                <p className="text-[9px] font-mono text-muted-foreground uppercase italic leading-none">{desc}</p>
            </div>
        </div>
    )
}

function ManifestItem({ label, value, icon: Icon, isLongText = false }: any) {
  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className="text-primary opacity-50" />
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
      </div>
      <div className={cn("border-l-2 border-muted/30 pl-4 py-1", isLongText ? "min-h-[60px]" : "")}>
        <span className="text-sm font-black text-foreground uppercase italic tracking-tight leading-none">{value || "NULL"}</span>
      </div>
    </div>
  )
}

function StatBlock({ label, value, icon: Icon, color = "", subValue = "", isScanner = false }: any) {
  return (
    <div className="relative overflow-hidden bg-background p-5 border-2 border-muted/50 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)] min-h-[110px] flex flex-col justify-between">
      {isScanner && <div className="absolute inset-0 w-full h-[2px] bg-primary/10 -translate-y-full animate-[scan_4s_linear_infinite]" />}
      <div className="flex items-center gap-2 opacity-50 mb-1">
        <Icon size={12} className="text-primary" />
        <span className="text-[9px] font-black uppercase tracking-[0.2em]">{label}</span>
      </div>
      <div className="flex flex-col">
        <span className={cn("text-lg font-black italic tracking-tighter uppercase truncate leading-none", color || "text-foreground")}>{value || "---"}</span>
        {subValue && <span className="text-[8px] font-mono uppercase opacity-40">{subValue}</span>}
      </div>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div className="h-screen flex flex-col items-center justify-center gap-6 bg-background">
      <Loader2 className="animate-spin text-primary size-12" />
      <span className="text-[10px] font-black uppercase tracking-[0.5em] text-primary">Establishing_Uplink...</span>
    </div>
  )
}