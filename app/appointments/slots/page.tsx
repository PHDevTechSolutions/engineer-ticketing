"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { db } from "@/lib/firebase"
import { collection, addDoc, query, onSnapshot, deleteDoc, doc, serverTimestamp, orderBy } from "firebase/firestore"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { PageHeader } from "@/components/page-header"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
    Lock, Unlock, X, Info, AlertTriangle, Activity, ShieldCheck,
    Sun, Moon, Sunrise, Clock, Plus, Filter
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import ProtectedPageWrapper from "@/components/protected-page-wrapper"
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

// --- INTERFACES ---
interface BlockedSlot {
    id: string;
    dateString: string;
    justification: string;
    shiftScope: string;
    startTime: string;
    endTime: string;
    authorizedBy: string | null;
}

export default function AvailabilitySlotsPage() {
    // --- CORE STATE ---
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
    const [blockedDates, setBlockedDates] = useState<BlockedSlot[]>([])
    const [userId, setUserId] = useState<string | null>(null)
    const [showInstructions, setShowInstructions] = useState(false)
    const [isPendingCommit, setIsPendingCommit] = useState(false)
    
    // --- FORM STATE ---
    const [restrictionReason, setRestrictionReason] = useState("")
    const [timeScope, setTimeScope] = useState("FULL_DAY")
    const [startTime, setStartTime] = useState("09:00")
    const [endTime, setEndTime] = useState("17:00")

    // --- LOGIC GATES ---
    const isPastDate = selectedDate 
        ? selectedDate < new Date(new Date().setHours(0, 0, 0, 0)) 
        : false;

    // FILTER: Only show slots for the selected date
    const filteredSlots = blockedDates.filter(d => d.dateString === selectedDate?.toDateString());

    // --- SIDE EFFECTS ---
    useEffect(() => {
        setUserId(typeof window !== 'undefined' ? localStorage.getItem("userId") : null)
        
        const q = query(collection(db, "blocked_slots"), orderBy("createdAt", "desc"))
        const unsub = onSnapshot(q, (snap) => {
            const dates = snap.docs.map(d => ({ id: d.id, ...d.data() } as BlockedSlot))
            setBlockedDates(dates)
        })
        return () => unsub()
    }, [])

    // --- HANDLERS ---
    const applyShiftPreset = (type: "FULL_DAY" | "AM" | "PM" | "CUSTOM") => {
        if (isPastDate) return;
        setTimeScope(type)
        if (type === "FULL_DAY") { setStartTime("09:00"); setEndTime("17:00") }
        else if (type === "AM") { setStartTime("09:00"); setEndTime("13:00") }
        else if (type === "PM") { setStartTime("13:00"); setEndTime("17:00") }
    }

    const executeRegistryUpdate = async () => {
        if (!selectedDate || isPastDate) return
        const dateString = selectedDate.toDateString()

        try {
            await addDoc(collection(db, "blocked_slots"), {
                dateString,
                timestamp: selectedDate,
                authorizedBy: userId,
                justification: restrictionReason || "Standard Operational Adjustment",
                shiftScope: timeScope,
                startTime,
                endTime,
                createdAt: serverTimestamp(),
                entryStatus: "LOCKED"
            })
            setRestrictionReason("")
            toast.error("ENTRY_LOGGED: Specific slot restricted.")
        } finally {
            setIsPendingCommit(false)
        }
    }

    const removeSlot = async (id: string) => {
        try {
            await deleteDoc(doc(db, "blocked_slots", id))
            toast.success("AMENDMENT_SUCCESS: Slot removed.")
        } catch (error) {
            toast.error("ERROR: Authorization failed.")
        }
    }

    return (
        <ProtectedPageWrapper>
            <SidebarProvider defaultOpen={false}>
                <AppSidebar userId={userId} />
                <SidebarInset className="bg-[#F9FAFA] min-h-screen">
                    <PageHeader 
                        title="AVAILABILITY_REGISTRY" 
                        version="REL-2026.Q1" 
                        trigger={<SidebarTrigger className="mr-2" />} 
                    />

                    <main className="flex-1 p-4 md:p-10 max-w-5xl mx-auto w-full space-y-6">
                        
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <h1 className="text-sm font-black uppercase tracking-tighter text-black/80">Logistics Control Panel</h1>
                                <div className="flex items-center gap-2">
                                    <Activity className="size-3 text-emerald-500" />
                                    <p className="text-[9px] font-bold text-black/40 uppercase tracking-widest">Engineering Division • Personnel Management</p>
                                </div>
                            </div>
                            <button onClick={() => setShowInstructions(!showInstructions)} className="text-[10px] font-bold uppercase text-black/30 hover:text-black transition-colors">
                                <Info className="size-3.5 inline mr-1" /> {showInstructions ? "Close Guide" : "User Guide"}
                            </button>
                        </div>

                        {showInstructions && (
                            <div className="bg-[#121212] p-6 rounded-lg border border-white/5">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <h4 className="text-emerald-400 text-[9px] font-black uppercase">Date Filtering</h4>
                                        <p className="text-[9px] text-white/50 font-bold uppercase leading-relaxed">The Audit Trail now reflects only the data for the active calendar selection.</p>
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="text-emerald-400 text-[9px] font-black uppercase">Archival View</h4>
                                        <p className="text-[9px] text-white/50 font-bold uppercase leading-relaxed">Historical dates are read-only. Current and future dates allow infinite modifications.</p>
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="text-emerald-400 text-[9px] font-black uppercase">Authorization</h4>
                                        <p className="text-[9px] text-white/50 font-bold uppercase leading-relaxed">Every individual slot requires a separate commit to ensure audit accuracy.</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            {/* LEFT: CALENDAR & FORM */}
                            <div className="lg:col-span-7 space-y-6">
                                <div className="bg-white border border-black/5 p-6 shadow-sm rounded-lg">
                                    <Calendar
                                        mode="single"
                                        selected={selectedDate}
                                        onSelect={setSelectedDate}
                                        className="w-full"
                                        modifiers={{ 
                                            blocked: (date: Date) => blockedDates.some(d => d.dateString === date.toDateString()) 
                                        }}
                                        modifiersClassNames={{
                                            blocked: "bg-red-50 text-red-600 font-bold border border-red-200"
                                        }}
                                    />
                                </div>

                                <div className={cn(
                                    "bg-white border border-black/5 p-6 shadow-sm rounded-lg space-y-6 transition-all",
                                    isPastDate ? "opacity-40 grayscale pointer-events-none" : "opacity-100"
                                )}>
                                    <div className="flex items-center justify-between border-b border-black/5 pb-2">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-black/40">New Entry Parameters</span>
                                        <div className="flex gap-1">
                                            {(["AM", "PM", "FULL_DAY", "CUSTOM"] as const).map((type) => (
                                                <button 
                                                    key={type}
                                                    onClick={() => applyShiftPreset(type)} 
                                                    className={cn(
                                                        "px-2 py-1 text-[8px] font-black uppercase rounded flex items-center gap-1 transition-all", 
                                                        timeScope === type ? "bg-black text-white" : "bg-black/5 text-black/40"
                                                    )}
                                                >
                                                    {type === "AM" && <Sunrise size={10} />}
                                                    {type === "PM" && <Moon size={10} />}
                                                    {type === "FULL_DAY" && <Sun size={10} />}
                                                    {type === "CUSTOM" && <Clock size={10} />}
                                                    {type.replace("_", " ")}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[8px] font-black uppercase text-black/30">Temporal Window</label>
                                            <div className="flex gap-2">
                                                <input type="time" value={startTime} onChange={(e) => {setStartTime(e.target.value); setTimeScope("CUSTOM")}} className="flex-1 bg-[#F9FAFA] border border-black/5 rounded px-2 py-2 text-[10px] font-bold focus:outline-none" />
                                                <input type="time" value={endTime} onChange={(e) => {setEndTime(e.target.value); setTimeScope("CUSTOM")}} className="flex-1 bg-[#F9FAFA] border border-black/5 rounded px-2 py-2 text-[10px] font-bold focus:outline-none" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[8px] font-black uppercase text-black/30">Justification Remark</label>
                                            <input value={restrictionReason} onChange={(e) => setRestrictionReason(e.target.value)} placeholder="Audit note..." className="w-full bg-[#F9FAFA] border border-black/5 rounded px-3 py-2 text-[11px] font-bold focus:outline-none" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT: ACTION & AUDIT */}
                            <div className="lg:col-span-5 space-y-6">
                                <div className="bg-[#121212] p-8 rounded-lg text-white shadow-xl relative overflow-hidden">
                                    <div className="relative z-10 space-y-6">
                                        <div className="space-y-1">
                                            <p className="text-[8px] font-black uppercase tracking-[0.3em] opacity-40">Registry Date</p>
                                            <h3 className="text-xl font-bold tracking-tight uppercase">
                                                {selectedDate ? selectedDate.toLocaleDateString('en-US', { dateStyle: 'full' }) : "Select Date"}
                                            </h3>
                                        </div>
                                        
                                        <Button 
                                            onClick={() => setIsPendingCommit(true)}
                                            disabled={!selectedDate || isPastDate}
                                            className={cn(
                                                "w-full h-14 rounded-md font-black text-[10px] uppercase tracking-[0.2em] transition-all bg-white text-black hover:bg-white/90",
                                                isPastDate && "bg-white/5 text-white/20 border border-white/10"
                                            )}
                                        >
                                            {isPastDate ? (
                                                <><Lock size={14} className="mr-2"/> History Locked</>
                                            ) : (
                                                <><Plus size={14} className="mr-2"/> Commit New Restriction</>
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                <div className="bg-white border border-black/5 rounded-lg flex flex-col h-[465px] shadow-sm">
                                    <div className="p-4 border-b border-black/5 flex items-center justify-between bg-[#F9FAFA]">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-black/40">Daily Audit Trail</span>
                                            <span className="text-[7px] font-bold text-black/30 uppercase italic">{selectedDate?.toDateString()}</span>
                                        </div>
                                        <Badge variant="outline" className="text-[9px] border-black/10 bg-black text-white">
                                            {filteredSlots.length} Active
                                        </Badge>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                        {filteredSlots.length === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center opacity-10">
                                                <Clock size={40} />
                                                <p className="text-[10px] font-black uppercase mt-2">No Active Restrictions</p>
                                            </div>
                                        ) : (
                                            filteredSlots.map((d) => {
                                                // --- AUDIT LABEL LOGIC ---
                                                let displayScope = "CUSTOM WINDOW";
                                                if (d.shiftScope === "FULL_DAY") displayScope = "WHOLE DAY";
                                                else if (d.shiftScope === "AM") displayScope = "HALF DAY (AM)";
                                                else if (d.shiftScope === "PM") displayScope = "HALF DAY (PM)";

                                                return (
                                                    <div key={d.id} className="p-4 rounded border border-emerald-200 bg-emerald-50/30 transition-all">
                                                        <div className="flex justify-between items-start">
                                                            <div className="space-y-1">
                                                                <div className="flex flex-col gap-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={cn(
                                                                            "text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter",
                                                                            d.shiftScope === "FULL_DAY" ? "bg-black text-white" : "bg-emerald-600 text-white"
                                                                        )}>
                                                                            {displayScope}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5">
                                                                        <Clock size={10} className="text-black/30" />
                                                                        <span className="text-[10px] font-black text-black/80 uppercase">
                                                                            {d.startTime} — {d.endTime}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <p className="text-[10px] font-bold text-black/40 uppercase mt-1 italic border-l-2 border-emerald-200 pl-2">
                                                                    "{d.justification}"
                                                                </p>
                                                            </div>
                                                            {!isPastDate && (
                                                                <button onClick={() => removeSlot(d.id)} className="text-black/10 hover:text-red-600 transition-colors p-1">
                                                                    <X size={14} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                )
                                            })
                                        )}
                                    </div>
                                    {/* FOOTER: Global Context */}
                                    <div className="p-3 border-t border-black/5 bg-black/[0.02]">
                                        <p className="text-[8px] font-black uppercase text-black/20 text-center tracking-widest">
                                            Total System Entries: {blockedDates.length}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </main>

                    <AlertDialog open={isPendingCommit} onOpenChange={setIsPendingCommit}>
                        <AlertDialogContent className="bg-white rounded-lg border-none shadow-2xl max-w-sm">
                            <AlertDialogHeader className="items-center text-center">
                                <div className="size-12 bg-amber-50 rounded-full flex items-center justify-center mb-2"><AlertTriangle className="size-5 text-amber-500" /></div>
                                <AlertDialogTitle className="font-black uppercase tracking-tight text-sm">Registry Authorization</AlertDialogTitle>
                                <AlertDialogDescription className="text-[10px] font-medium uppercase">Confirm temporal restriction update for {selectedDate?.toDateString()}?</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="flex-col sm:flex-row gap-2 mt-4">
                                <AlertDialogCancel className="w-full rounded-md border-black/5 text-[9px] font-black uppercase h-11">Abort</AlertDialogCancel>
                                <AlertDialogAction onClick={executeRegistryUpdate} className="w-full rounded-md bg-[#121212] text-[9px] font-black uppercase text-white h-11">Authorize</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </SidebarInset>
            </SidebarProvider>
        </ProtectedPageWrapper>
    )
}