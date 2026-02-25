"use client"

import * as React from "react"
import { useState, useEffect, useMemo, useRef } from "react"
import { db } from "@/lib/firebase"
import { collection, addDoc, query, onSnapshot, deleteDoc, doc, serverTimestamp, orderBy } from "firebase/firestore"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { PageHeader } from "@/components/page-header"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    X, AlertTriangle, Activity,
    CalendarDays, HelpCircle, Plus, ChevronRight, ChevronLeft, Clock, Info
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

const COLORS = {
    pageBg: "bg-[#F8FAFC]",
    cardBg: "bg-white",
    primary: "bg-[#0F172A]",
    accent: "bg-[#3B82F6]",
    border: "border-slate-200/60"
}

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
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
    const [blockedDates, setBlockedDates] = useState<BlockedSlot[]>([])
    const [userId, setUserId] = useState<string | null>(null)
    const [isPendingCommit, setIsPendingCommit] = useState(false)
    const [tourStep, setTourStep] = useState<number | null>(null)

    const stepRefs = {
        1: useRef<HTMLDivElement>(null),
        2: useRef<HTMLDivElement>(null),
        3: useRef<HTMLDivElement>(null),
    }

    const [restrictionReason, setRestrictionReason] = useState("")
    const [timeScope, setTimeScope] = useState("FULL_DAY")
    const [startTime, setStartTime] = useState("09:00")
    const [endTime, setEndTime] = useState("17:00")

    useEffect(() => {
        setUserId(typeof window !== 'undefined' ? localStorage.getItem("userId") : null)
        const q = query(collection(db, "blocked_slots"), orderBy("createdAt", "desc"))
        const unsub = onSnapshot(q, (snap) => {
            const dates = snap.docs.map(d => ({ id: d.id, ...d.data() } as BlockedSlot))
            setBlockedDates(dates)
        })
        return () => unsub()
    }, [])

    const blockedDateStrings = useMemo(() => {
        return new Set(blockedDates.map(d => d.dateString));
    }, [blockedDates]);

    useEffect(() => {
        if (tourStep && stepRefs[tourStep as keyof typeof stepRefs].current) {
            const target = stepRefs[tourStep as keyof typeof stepRefs].current;
            target?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    }, [tourStep]);

    const isPastDate = useMemo(() => {
        if (!selectedDate) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const compareDate = new Date(selectedDate);
        compareDate.setHours(0, 0, 0, 0);
        return compareDate < today;
    }, [selectedDate]);

    const filteredSlots = useMemo(() => {
        return blockedDates.filter(d => d.dateString === selectedDate?.toDateString());
    }, [blockedDates, selectedDate]);

    const applyShiftPreset = (type: "FULL_DAY" | "AM" | "PM" | "CUSTOM") => {
        if (isPastDate) return;
        setTimeScope(type)
        if (type === "FULL_DAY") { setStartTime("09:00"); setEndTime("17:00") }
        else if (type === "AM") { setStartTime("09:00"); setEndTime("13:00") }
        else if (type === "PM") { setStartTime("13:00"); setEndTime("17:00") }
    }

    const typeOfShiftLabel = () => {
        const labels: Record<string, string> = {
            "FULL_DAY": "All Day",
            "AM": "Morning",
            "PM": "Afternoon",
            "CUSTOM": "Custom Range"
        };
        return labels[timeScope] || "Custom Range";
    }

    const executeRegistryUpdate = async () => {
        if (!selectedDate || isPastDate) return
        try {
            await addDoc(collection(db, "blocked_slots"), {
                dateString: selectedDate.toDateString(),
                timestamp: selectedDate,
                authorizedBy: userId,
                justification: restrictionReason || "Closed for business",
                shiftScope: typeOfShiftLabel(),
                startTime,
                endTime,
                createdAt: serverTimestamp(),
            })
            setRestrictionReason("")
            toast.success("Schedule Updated")
        } catch (error) {
            toast.error("Could not save changes")
        } finally {
            setIsPendingCommit(false)
        }
    }

    const removeSlot = async (id: string) => {
        try {
            await deleteDoc(doc(db, "blocked_slots", id))
            toast.success("Removed successfully")
        } catch (error) {
            toast.error("Error removing item")
        }
    }

    return (
        <ProtectedPageWrapper>
            <SidebarProvider defaultOpen={false}>
                <AppSidebar userId={userId} />
                <SidebarInset className={cn(COLORS.pageBg, "min-h-screen relative flex flex-col")}>

                    <PageHeader
                        title="Availability Slots"
                        version="SYS-v2.6"
                        trigger={<SidebarTrigger className="size-9 rounded-lg bg-white border border-slate-200 text-slate-600 shadow-sm" />}
                        showBackButton={true}
                        actions={
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setTourStep(1)}
                                className={cn(
                                    "rounded-lg h-9 px-4 transition-all text-[11px] font-bold uppercase",
                                    tourStep !== null ? "bg-[#0F172A] text-white" : "text-slate-500 hover:bg-white border border-transparent hover:border-slate-200"
                                )}
                            >
                                <HelpCircle size={15} className={cn("md:mr-2", tourStep !== null && "animate-pulse")} />
                                <span className="hidden md:inline">Setup Guide</span>
                            </Button>
                        }
                    />

                    <main className="p-4 md:p-8 max-w-[1600px] mx-auto w-full space-y-6 flex-1">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                            {/* STEP 1: CALENDAR */}
                            <div ref={stepRefs[1]} className={cn("lg:col-span-4 transition-all duration-500", tourStep === 1 ? "relative z-[1001] scale-[1.01]" : "relative z-0")}>
                                <div className={cn("bg-white rounded-xl border border-slate-200/60 p-5 shadow-sm", tourStep === 1 && "ring-4 ring-blue-500/20 border-blue-400")}>
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-2 bg-slate-50 rounded-md"><CalendarDays size={18} className="text-slate-500" /></div>
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 leading-none mb-1">Step 01</p>
                                            <h3 className="text-sm font-bold text-slate-700">Select Date</h3>
                                        </div>
                                    </div>
                                    <Calendar
                                        mode="single"
                                        selected={selectedDate}
                                        onSelect={setSelectedDate}
                                        className="w-full"
                                        // This part identifies which days in the calendar should have the "blocked" styling
                                        modifiers={{
                                            blocked: (date) => blockedDateStrings.has(date.toDateString())
                                        }}
                                        // This part applies the red dot and styling to those identified days
                                        modifiersClassNames={{
                                            blocked: "relative text-red-600 font-bold hover:bg-red-50 focus:bg-red-100 after:content-[''] after:absolute after:bottom-2 after:left-1/2 after:-translate-x-1/2 after:size-1 after:bg-red-500 after:rounded-full"
                                        }}
                                    />
                                </div>
                            </div>

                            {/* STEP 2: SCHEDULER */}
                            <div ref={stepRefs[2]} className={cn("lg:col-span-8 xl:col-span-5 transition-all duration-500", tourStep === 2 ? "relative z-[1001] scale-[1.01]" : "relative z-0")}>
                                <div className={cn("bg-white rounded-xl border border-slate-200/60 p-6 shadow-sm relative transition-all", tourStep === 2 && "ring-4 ring-blue-500/20 border-blue-400")}>
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-50 rounded-md"><Clock size={18} className="text-blue-600" /></div>
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500 leading-none mb-1">Step 02</p>
                                                <h2 className="text-lg font-bold text-slate-900">{selectedDate?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</h2>
                                            </div>
                                        </div>
                                        <Badge className={cn("rounded-md px-2 py-0.5 text-[10px] font-bold uppercase shadow-none border-none", isPastDate ? "bg-slate-100 text-slate-400" : "bg-emerald-50 text-emerald-600")}>
                                            {isPastDate ? "Past Date" : "Active"}
                                        </Badge>
                                    </div>

                                    <div className={cn("space-y-6", isPastDate && "opacity-40 grayscale pointer-events-none")}>
                                        <div className="space-y-3">
                                            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Shift Type</label>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                                {(["AM", "PM", "FULL_DAY", "CUSTOM"] as const).map((type) => (
                                                    <button key={type} onClick={() => applyShiftPreset(type)} className={cn("h-10 text-[10px] font-bold uppercase rounded-lg border transition-all", timeScope === type ? "bg-[#0F172A] text-white border-[#0F172A]" : "bg-white text-slate-500 border-slate-200 hover:border-slate-300")}>
                                                        {type.replace('_', ' ')}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Hours</label>
                                                <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                                    <input type="time" value={startTime} onChange={(e) => { setStartTime(e.target.value); setTimeScope("CUSTOM") }} className="bg-transparent text-sm font-bold text-slate-700 outline-none w-full" />
                                                    <span className="text-slate-300 text-xs">to</span>
                                                    <input type="time" value={endTime} onChange={(e) => { setEndTime(e.target.value); setTimeScope("CUSTOM") }} className="bg-transparent text-sm font-bold text-slate-700 outline-none w-full" />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Public Note</label>
                                                <div className="relative">
                                                    <input value={restrictionReason} onChange={(e) => setRestrictionReason(e.target.value)} placeholder="Maintenance break" className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 h-[46px] text-sm outline-none" />
                                                    <Info size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300" />
                                                </div>
                                            </div>
                                        </div>

                                        <Button disabled={!selectedDate || isPastDate} onClick={() => setIsPendingCommit(true)} className="w-full h-12 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-[11px] uppercase tracking-widest transition-all">
                                            <Plus size={16} className="mr-2" /> Sync to engiconnect
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* STEP 3: LIVE FEED */}
                            <div ref={stepRefs[3]} className={cn("lg:col-span-12 xl:col-span-3 transition-all duration-500", tourStep === 3 ? "relative z-[1001] scale-[1.01]" : "relative z-0")}>
                                <div className={cn("bg-[#0F172A] rounded-xl p-6 shadow-xl min-h-[450px] flex flex-col text-white")}>
                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-1">Step 03</p>
                                            <h4 className="text-sm font-bold uppercase tracking-widest text-white">Live Feed</h4>
                                        </div>
                                        <div className="size-9 bg-white/10 rounded-lg flex items-center justify-center"><Activity size={16} className="text-blue-400 animate-pulse" /></div>
                                    </div>

                                    <div className="space-y-3 flex-1 overflow-y-auto max-h-[400px] pr-1">
                                        {filteredSlots.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-32 border border-white/10 border-dashed rounded-lg">
                                                <p className="text-xs text-slate-500">No blocks for this date</p>
                                            </div>
                                        ) : (
                                            filteredSlots.map((d) => (
                                                <div key={d.id} className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/[0.07] transition-colors group">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="space-y-1">
                                                            <span className="text-[9px] font-bold text-blue-400 uppercase tracking-tight">{d.shiftScope}</span>
                                                            <p className="text-sm font-bold">{d.startTime} — {d.endTime}</p>
                                                        </div>
                                                        <button onClick={() => removeSlot(d.id)} className="size-7 rounded-md flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-400/10"><X size={14} /></button>
                                                    </div>
                                                    <div className="bg-black/20 p-2 rounded-md"><p className="text-[11px] text-slate-400 italic leading-relaxed">"{d.justification}"</p></div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </main>

                    {/* INTERACTIVE GUIDE (SQUARED OFF) */}
                    {tourStep !== null && (
                        <div className="fixed inset-0 z-[9999] pointer-events-none flex items-end justify-center pb-6 md:items-center md:pb-0">
                            <div className={cn(
                                "absolute bg-white/98 backdrop-blur-2xl rounded-xl p-6 shadow-2xl w-[92%] md:max-w-[320px] animate-in zoom-in-95 duration-300 border border-slate-200 pointer-events-auto",
                                "md:bottom-auto",
                                tourStep === 1 && "md:right-12 md:top-1/3 md:translate-x-0",
                                tourStep === 2 && "md:left-12 md:bottom-12 md:translate-x-0",
                                tourStep === 3 && "md:left-12 md:bottom-12 md:translate-x-0 md:top-auto",
                                "bottom-4 left-1/2 -translate-x-1/2 md:translate-y-0"
                            )}>
                                <div className="flex justify-between items-center mb-4">
                                    <Badge className="bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-sm">STEP {tourStep} OF 3</Badge>
                                    <button onClick={() => setTourStep(null)} className="size-7 rounded-md flex items-center justify-center text-slate-400 hover:bg-slate-50"><X size={18} /></button>
                                </div>
                                <h3 className="text-md font-bold text-slate-900 mb-2">
                                    {tourStep === 1 && "Pick a Target Date"}
                                    {tourStep === 2 && "Configure the Shift"}
                                    {tourStep === 3 && "Verify Live Update"}
                                </h3>
                                <p className="text-[12px] text-slate-500 mb-6 leading-relaxed">
                                    {tourStep === 1 && "Select the day you want to adjust. Red dots show existing blocked slots."}
                                    {tourStep === 2 && "Pick a preset or enter hours. These appear live on the main app."}
                                    {tourStep === 3 && "Changes appear here instantly. You can delete or edit them anytime."}
                                </p>
                                <div className="flex gap-2">
                                    {tourStep > 1 && (
                                        <Button variant="outline" className="flex-1 rounded-lg font-bold text-[10px] uppercase h-10 border-slate-200" onClick={() => setTourStep(tourStep - 1)}>
                                            <ChevronLeft size={14} className="mr-1" /> Back
                                        </Button>
                                    )}
                                    <Button className="flex-[2] bg-[#0F172A] rounded-lg font-bold text-[10px] uppercase h-10 text-white" onClick={() => tourStep < 3 ? setTourStep(tourStep + 1) : setTourStep(null)}>
                                        {tourStep < 3 ? "Next" : "Finish"}
                                        {tourStep < 3 && <ChevronRight size={14} className="ml-1" />}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* CONFIRMATION DIALOG (SQUARED OFF) */}
                    <AlertDialog open={isPendingCommit} onOpenChange={setIsPendingCommit}>
                        <AlertDialogContent className="bg-white rounded-xl p-8 max-w-[380px] border-none shadow-2xl">
                            <AlertDialogHeader className="items-center text-center">
                                <div className="size-16 bg-amber-50 rounded-full flex items-center justify-center mb-4"><AlertTriangle className="size-8 text-amber-500" /></div>
                                <AlertDialogTitle className="font-bold text-xl text-slate-900">Push to Live?</AlertDialogTitle>
                                <AlertDialogDescription className="text-sm text-slate-500 mt-2">Update the live engiconnect schedule with these hours?</AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="flex flex-col gap-2 mt-8">
                                <AlertDialogAction onClick={executeRegistryUpdate} className="bg-[#0F172A] hover:bg-slate-800 h-12 rounded-lg text-[10px] font-bold uppercase">Update Schedule</AlertDialogAction>
                                <AlertDialogCancel className="h-12 rounded-lg text-[10px] font-bold uppercase border-slate-100 text-slate-400">Cancel</AlertDialogCancel>
                            </div>
                        </AlertDialogContent>
                    </AlertDialog>

                </SidebarInset>
            </SidebarProvider>
        </ProtectedPageWrapper>
    )
}