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
    CalendarDays, HelpCircle, Plus, ChevronRight, ChevronLeft, Clock, Info, Bell
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

// Updated brand colors for engiconnect
const COLORS = {
    pageBg: "bg-[#F8FAFC]",
    cardBg: "bg-white",
    navy: "bg-[#0F172A]",
    redAccent: "text-[#E33636]",
    border: "border-gray-100"
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
    const [totalNotifications, setTotalNotifications] = useState(0) // Logic placeholder

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
                        trigger={<SidebarTrigger className="size-9 rounded-xl bg-white border border-gray-200 text-gray-600 shadow-sm" />}
                        showBackButton={true}
                        actions={
                            <div className="flex items-center gap-3">
                                {/* NOTIFICATION BELL INTEGRATION */}
                                <button className="p-2 text-gray-400 hover:text-[#E33636] hover:bg-red-50 rounded-xl transition-all relative group">
                                    <Bell size={20} />
                                    {totalNotifications > 0 && (
                                        <span className="absolute top-2 right-2 size-2 bg-[#E33636] rounded-full border-2 border-white" />
                                    )}
                                </button>

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setTourStep(1)}
                                    className={cn(
                                        "rounded-xl h-9 px-4 transition-all text-[11px] font-bold uppercase",
                                        tourStep !== null ? "bg-[#0F172A] text-white" : "text-gray-500 hover:bg-white border border-transparent hover:border-gray-200"
                                    )}
                                >
                                    <HelpCircle size={15} className={cn("md:mr-2", tourStep !== null && "animate-pulse")} />
                                    <span className="hidden md:inline">Setup Guide</span>
                                </Button>
                            </div>
                        }
                    />

                    <main className="p-4 md:p-8 max-w-[1600px] mx-auto w-full space-y-6 flex-1">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                            {/* STEP 1: CALENDAR */}
                            <div ref={stepRefs[1]} className={cn("lg:col-span-4 transition-all duration-500", tourStep === 1 ? "relative z-[1001] scale-[1.01]" : "relative z-0")}>
                                <div className={cn("bg-white rounded-2xl border border-gray-100 p-6 shadow-sm overflow-hidden min-h-[480px]", tourStep === 1 && "ring-4 ring-red-500/10 border-red-200")}>
                                    <div className="flex items-center gap-3 mb-8">
                                        <div className="p-2.5 bg-gray-50 rounded-xl">
                                            <CalendarDays size={18} className="text-gray-400" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 leading-none mb-1">Step 01</p>
                                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Select Date</h3>
                                        </div>
                                    </div>

                                    <div className="flex justify-center w-full">
                                        <Calendar
                                            mode="single"
                                            selected={selectedDate}
                                            onSelect={setSelectedDate}
                                            className="w-full p-0"
                                            classNames={{
                                                months: "w-full",
                                                month: "w-full space-y-6",
                                                caption: "flex justify-center relative items-center mb-4",
                                                caption_label: "text-sm font-black uppercase tracking-[0.2em] text-gray-900",
                                                nav: "flex items-center gap-1",
                                                nav_button: cn(
                                                    "h-9 w-9 bg-transparent p-0 opacity-50 hover:opacity-100 border border-gray-100 rounded-xl transition-all flex items-center justify-center hover:bg-gray-50"
                                                ),
                                                nav_button_previous: "absolute left-1",
                                                nav_button_next: "absolute right-1",
                                                table: "w-full border-collapse space-y-1",
                                                head_row: "flex w-full mb-2",
                                                head_cell: "text-gray-400 rounded-md w-full font-bold text-[10px] uppercase tracking-tighter flex-1",
                                                row: "flex w-full mt-2",
                                                cell: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 flex-1",
                                                day: cn(
                                                    "h-10 w-10 p-0 font-bold aria-selected:opacity-100 mx-auto flex items-center justify-center rounded-xl transition-all",
                                                    "hover:bg-gray-100 focus:bg-gray-100"
                                                ),
                                                day_selected: "bg-[#0F172A] text-white hover:bg-[#0F172A] hover:text-white focus:bg-[#0F172A] focus:text-white shadow-lg shadow-navy/20",
                                                day_today: "text-[#E33636] underline decoration-2 underline-offset-4",
                                                day_outside: "text-gray-300 opacity-50",
                                                day_disabled: "text-gray-300 opacity-50",
                                            }}
                                            modifiers={{
                                                blocked: (date) => blockedDateStrings.has(date.toDateString())
                                            }}
                                            modifiersClassNames={{
                                                blocked: "bg-red-50 text-[#E33636] font-black hover:bg-red-100 rounded-full"
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* STEP 2: SCHEDULER */}
                            <div ref={stepRefs[2]} className={cn("lg:col-span-8 xl:col-span-5 transition-all duration-500", tourStep === 2 ? "relative z-[1001] scale-[1.01]" : "relative z-0")}>
                                <div className={cn("bg-white rounded-2xl border border-gray-100 p-6 shadow-sm relative transition-all", tourStep === 2 && "ring-4 ring-red-500/10 border-red-200")}>
                                    <div className="flex justify-between items-start mb-8">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 bg-red-50 rounded-xl"><Clock size={18} className="text-[#E33636]" /></div>
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-[#E33636] leading-none mb-1">Step 02</p>
                                                <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">
                                                    {selectedDate?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </h2>
                                            </div>
                                        </div>
                                        <Badge className={cn("rounded-lg px-3 py-1 text-[10px] font-bold uppercase shadow-none border-none", isPastDate ? "bg-gray-100 text-gray-400" : "bg-green-50 text-green-600")}>
                                            {isPastDate ? "Past Date" : "Active"}
                                        </Badge>
                                    </div>

                                    <div className={cn("space-y-8", isPastDate && "opacity-40 grayscale pointer-events-none")}>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Shift Type</label>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                                {(["AM", "PM", "FULL_DAY", "CUSTOM"] as const).map((type) => (
                                                    <button key={type} onClick={() => applyShiftPreset(type)} className={cn("h-11 text-[10px] font-bold uppercase rounded-xl border transition-all", timeScope === type ? "bg-[#0F172A] text-white border-[#0F172A] shadow-md shadow-navy/20" : "bg-white text-gray-500 border-gray-100 hover:border-gray-300")}>
                                                        {type.replace('_', ' ')}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Hours</label>
                                                <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                                    <input type="time" value={startTime} onChange={(e) => { setStartTime(e.target.value); setTimeScope("CUSTOM") }} className="bg-transparent text-sm font-black text-gray-900 outline-none w-full" />
                                                    <span className="text-gray-300 font-bold text-[10px] uppercase">to</span>
                                                    <input type="time" value={endTime} onChange={(e) => { setEndTime(e.target.value); setTimeScope("CUSTOM") }} className="bg-transparent text-sm font-black text-gray-900 outline-none w-full" />
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Public Note</label>
                                                <div className="relative">
                                                    <input value={restrictionReason} onChange={(e) => setRestrictionReason(e.target.value)} placeholder="e.g. Maintenance break" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 h-[54px] text-sm font-medium outline-none focus:ring-2 focus:ring-gray-900/5 transition-all" />
                                                    <Info size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300" />
                                                </div>
                                            </div>
                                        </div>

                                        <Button disabled={!selectedDate || isPastDate} onClick={() => setIsPendingCommit(true)} className="w-full h-14 rounded-xl bg-[#0F172A] hover:bg-gray-800 text-white font-black text-[11px] uppercase tracking-[0.2em] transition-all shadow-lg shadow-gray-900/10">
                                            <Plus size={18} className="mr-2" /> Sync to engiconnect
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* STEP 3: LIVE FEED */}
                            <div ref={stepRefs[3]} className={cn("lg:col-span-12 xl:col-span-3 transition-all duration-500", tourStep === 3 ? "relative z-[1001] scale-[1.01]" : "relative z-0")}>
                                <div className={cn("bg-[#0F172A] rounded-2xl p-6 shadow-2xl min-h-[450px] flex flex-col text-white border border-white/5")}>
                                    <div className="flex items-center justify-between mb-8">
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-1">Step 03</p>
                                            <h4 className="text-sm font-black uppercase tracking-widest text-white">Live Feed</h4>
                                        </div>
                                        <div className="size-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/10"><Activity size={18} className="text-red-500 animate-pulse" /></div>
                                    </div>

                                    <div className="space-y-4 flex-1 overflow-y-auto max-h-[400px] pr-1 custom-scrollbar">
                                        {filteredSlots.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-40 border border-white/10 border-dashed rounded-2xl">
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">No active blocks</p>
                                            </div>
                                        ) : (
                                            filteredSlots.map((d) => (
                                                <div key={d.id} className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/[0.08] transition-all group">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div className="space-y-1">
                                                            <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">{d.shiftScope}</span>
                                                            <p className="text-md font-black tracking-tight">{d.startTime} — {d.endTime}</p>
                                                        </div>
                                                        <button onClick={() => removeSlot(d.id)} className="size-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-red-500 transition-all"><X size={16} /></button>
                                                    </div>
                                                    <div className="bg-black/40 p-3 rounded-lg border border-white/5"><p className="text-[11px] text-gray-400 font-medium leading-relaxed italic">"{d.justification}"</p></div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </main>

                    {/* INTERACTIVE GUIDE (UPGRADED) */}
                    {tourStep !== null && (
                        <div className="fixed inset-0 z-[9999] pointer-events-none flex items-end justify-center pb-6 md:items-center md:pb-0">
                            <div className={cn(
                                "absolute bg-white rounded-2xl p-8 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] w-[92%] md:max-w-[340px] animate-in zoom-in-95 duration-300 border border-gray-100 pointer-events-auto",
                                "md:bottom-auto",
                                tourStep === 1 && "md:right-12 md:top-1/3 md:translate-x-0",
                                tourStep === 2 && "md:left-12 md:bottom-12 md:translate-x-0",
                                tourStep === 3 && "md:left-12 md:bottom-12 md:translate-x-0 md:top-auto",
                                "bottom-4 left-1/2 -translate-x-1/2 md:translate-y-0"
                            )}>
                                <div className="flex justify-between items-center mb-6">
                                    <Badge className="bg-[#E33636] text-white text-[9px] font-black px-2.5 py-1 rounded-md uppercase tracking-widest">Guide {tourStep}/3</Badge>
                                    <button onClick={() => setTourStep(null)} className="size-8 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-50 hover:text-gray-900 transition-colors"><X size={20} /></button>
                                </div>
                                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-2">
                                    {tourStep === 1 && "Pick a Date"}
                                    {tourStep === 2 && "Set the Shift"}
                                    {tourStep === 3 && "Go Live"}
                                </h3>
                                <p className="text-sm text-gray-500 mb-8 leading-relaxed font-medium">
                                    {tourStep === 1 && "Select the day to block. Red marks show current active blocks."}
                                    {tourStep === 2 && "Choose a preset or custom range. These updates reflect on engiconnect instantly."}
                                    {tourStep === 3 && "Review your changes here. You can manage or delete them in real-time."}
                                </p>
                                <div className="flex gap-3">
                                    {tourStep > 1 && (
                                        <Button variant="outline" className="flex-1 rounded-xl font-black text-[10px] uppercase h-12 border-gray-200" onClick={() => setTourStep(tourStep - 1)}>
                                            <ChevronLeft size={16} className="mr-1" /> Back
                                        </Button>
                                    )}
                                    <Button className="flex-[2] bg-[#0F172A] rounded-xl font-black text-[10px] uppercase h-12 text-white shadow-lg shadow-navy/20" onClick={() => tourStep < 3 ? setTourStep(tourStep + 1) : setTourStep(null)}>
                                        {tourStep < 3 ? "Next" : "Finish"}
                                        {tourStep < 3 && <ChevronRight size={16} className="ml-1" />}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* CONFIRMATION DIALOG (SQUARED OFF) */}
                    <AlertDialog open={isPendingCommit} onOpenChange={setIsPendingCommit}>
                        <AlertDialogContent className="bg-white rounded-2xl p-8 max-w-[400px] border-none shadow-2xl">
                            <AlertDialogHeader className="items-center text-center">
                                <div className="size-20 bg-red-50 rounded-full flex items-center justify-center mb-6"><AlertTriangle className="size-10 text-[#E33636]" /></div>
                                <AlertDialogTitle className="font-black text-2xl text-gray-900 uppercase tracking-tighter">Push to Live?</AlertDialogTitle>
                                <AlertDialogDescription className="text-sm font-medium text-gray-500 mt-2 leading-relaxed">
                                    This will update the live schedule for <strong>engiconnect</strong>. Continue?
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="flex flex-col gap-3 mt-10">
                                <AlertDialogAction onClick={executeRegistryUpdate} className="bg-[#0F172A] hover:bg-gray-800 h-14 rounded-xl text-[11px] font-black uppercase tracking-[0.2em]">Update Schedule</AlertDialogAction>
                                <AlertDialogCancel className="h-14 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] border-gray-100 text-gray-400">Cancel</AlertDialogCancel>
                            </div>
                        </AlertDialogContent>
                    </AlertDialog>

                </SidebarInset>
            </SidebarProvider>
        </ProtectedPageWrapper>
    )
}