"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar"
import ProtectedPageWrapper from "../../components/protected-page-wrapper";

import {
    CalendarCheck, FileText, Monitor, ThumbsUp,
    PenTool, ClipboardCheck, MoreHorizontal, Search,
    Terminal as TerminalIcon, Activity
} from "lucide-react";

import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { PageHeader } from "@/components/page-header"
import { cn } from "@/lib/utils"

export default function TerminalDashboard() {
    const router = useRouter()
    const [userId, setUserId] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [greeting, setGreeting] = useState({ main: "", sub: "" })
    const [userDetails, setUserDetails] = useState({ Firstname: "", Position: "" })

    const [notifications, setNotifications] = useState({
        siteVisit: 0,
        jobRequest: 0,
        shopDrawing: 0,
        other: 0
    })

    useEffect(() => {
        const storedUserId = localStorage.getItem("userId")
        setUserId(storedUserId)

        const hour = new Date().getHours()
        if (hour < 12) setGreeting({ main: "Initial Shift Protocol", sub: "AM Operational Cycle Active" })
        else if (hour < 17) setGreeting({ main: "Mid-Day Core Session", sub: "Peak Business Hours Verified" })
        else setGreeting({ main: "Evening Oversight Review", sub: "Operational Summary Pending" })

        const fetchPersonnelRecord = async () => {
            if (!storedUserId) { setIsLoading(false); return; }
            try {
                const res = await fetch(`/api/user?id=${encodeURIComponent(storedUserId)}`)
                const data = await res.json()
                setUserDetails({
                    Firstname: data.Firstname || "Authorized Personnel",
                    Position: data.Position || "Senior Consultant",
                })
            } catch (error) {
                console.error("Critical Sync Error:", error)
            } finally {
                setIsLoading(false)
            }
        }
        fetchPersonnelRecord()
    }, [])

    useEffect(() => {
        if (!db) return;
        const qSite = query(collection(db, "appointments"), where("status", "==", "PENDING"));
        const unsubSite = onSnapshot(qSite, (snap) => {
            setNotifications(prev => ({ ...prev, siteVisit: snap.size }));
        });
        const qShop = query(collection(db, "shop_drawings"), where("status", "==", "REVIEW_REQUIRED"));
        const unsubShop = onSnapshot(qShop, (snap) => {
            setNotifications(prev => ({ ...prev, shopDrawing: snap.size }));
        });
        return () => { unsubSite(); unsubShop(); };
    }, []);

    const services = [
        { label: "Deployment Scheduling", icon: CalendarCheck, count: notifications.siteVisit, path: "/appointments/site-visit" },
        { label: "Job Requisition", icon: FileText, count: notifications.jobRequest, path: "/requests/job" },
        { label: "Dialux Simulation", icon: Monitor, count: 0, path: "/requests/dialux" },
        { label: "Product Validation", icon: ThumbsUp, count: 0, path: "/requests/recommendation" },
        { label: "Technical Shop Drawing", icon: PenTool, count: notifications.shopDrawing, path: "/requests/shop-drawing" },
        { label: "Field Testing Monitor", icon: ClipboardCheck, count: 0, path: "/requests/testing" },
        { label: "Miscellaneous Protocol", icon: MoreHorizontal, count: notifications.other, path: "/requests/other" },
        { label: "Enterprise Tracker", icon: Search, count: 0, path: "/tracker" },
    ];

    return (
        <ProtectedPageWrapper>
            <SidebarProvider defaultOpen={false} style={{ "--sidebar-width": "19rem" } as React.CSSProperties}>
                <AppSidebar userId={userId} />
                <SidebarInset className="bg-[#F9FAFA] pb-10 md:pb-0 relative font-sans">

                    <PageHeader
                        title="COMMAND_CENTER"
                        version="CORP: 2026.Q1"
                        showBackButton={false}
                        trigger={<SidebarTrigger className="mr-2" />}
                        actions={
                            <div className="flex items-center gap-2 px-3 py-1 bg-white border border-black/5 rounded-full shadow-sm">
                                <div className="size-1.5 rounded-full bg-emerald-600 animate-pulse" />
                                <span className="text-[9px] font-bold text-black/50 tracking-tighter uppercase italic">Registry: Active</span>
                            </div>
                        }
                    />

                    <main className="flex flex-1 flex-col gap-6 p-4 md:p-10 max-w-7xl mx-auto w-full">

                        {/* CORPORATE GREETING */}
                        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-black/10 pb-6">
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="bg-[#121212] text-white text-[8px] font-black px-1.5 py-0.5 rounded-[2px] tracking-[0.2em] uppercase">ENGINEERING</span>
                                    <Activity className="size-3 text-black/20" />
                                    <span className="text-[9px] font-bold text-black/30 uppercase tracking-tighter italic">{greeting.sub}</span>
                                </div>
                                <h1 className="text-2xl font-black text-[#121212] tracking-tight uppercase leading-none">
                                    {greeting.main}, <span className="text-black/30 font-medium tracking-normal normal-case">{isLoading ? "..." : userDetails.Firstname}</span>
                                </h1>
                                <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest mt-2 flex items-center gap-2">
                                    <span className="size-1 bg-black/20 rounded-full" />
                                    {userDetails.Position || "Operational Lead"}
                                </p>
                            </div>

                            <div className="flex gap-2">
                                <StatCardMini label="Pending" val={notifications.siteVisit + notifications.shopDrawing} color="text-red-600" />
                                <StatCardMini label="Network" val="Secure" color="text-black" />
                            </div>
                        </section>

                        {/* WORKFLOW GRID */}
                        <section className="flex flex-col gap-4">
                            <div className="flex items-center gap-2 opacity-40">
                                <TerminalIcon className="size-3" />
                                <h2 className="text-[10px] font-bold uppercase tracking-[0.2em]">Operational Workflow Matrix</h2>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                {services.map((service, i) => (
                                    <CompactProtocolCard 
                                        key={i} 
                                        service={service} 
                                        onClick={() => router.push(service.path)} 
                                    />
                                ))}
                            </div>
                        </section>
                    </main>
                </SidebarInset>
            </SidebarProvider>
        </ProtectedPageWrapper>
    )
}

function CompactProtocolCard({ service, onClick }: any) {
    const hasAlert = service.count > 0;
    
    return (
        <button
            onClick={onClick}
            className={cn(
                "group relative flex flex-row items-center md:flex-col md:items-start p-4 md:p-6 bg-white border border-black/5 rounded-xl transition-all hover:border-black hover:shadow-xl hover:shadow-black/5 active:scale-[0.98] text-left",
                hasAlert && "ring-1 ring-black/5"
            )}
        >
            {hasAlert && (
                <div className="absolute top-3 right-3 flex items-center justify-center">
                    <span className="absolute size-2 bg-red-500 rounded-full animate-ping opacity-75" />
                    <span className="relative size-2 bg-red-600 rounded-full border border-white" />
                </div>
            )}

            <div className={cn(
                "size-10 md:size-12 rounded-full flex items-center justify-center mr-4 md:mr-0 md:mb-5 transition-all border shadow-inner",
                hasAlert ? "bg-[#121212] text-white border-black" : "bg-black/[0.03] text-black/30 border-transparent group-hover:bg-black group-hover:text-white"
            )}>
                <service.icon className={cn("size-4 md:size-5", hasAlert && "animate-pulse")} />
            </div>

            <div className="flex flex-col gap-0.5">
                <span className={cn(
                    "text-[10px] md:text-[11px] font-black uppercase tracking-tight leading-tight transition-colors",
                    hasAlert ? "text-black" : "text-black/50 group-hover:text-black"
                )}>
                    {service.label}
                </span>
                
                {hasAlert ? (
                    <span className="text-[9px] font-bold uppercase text-red-600 tracking-tight">
                        {service.count} Action{service.count > 1 ? 's' : ''} Required
                    </span>
                ) : (
                    <span className="text-[8px] font-medium text-black/20 uppercase tracking-[0.1em]">Compliance Verified</span>
                )}
            </div>
        </button>
    )
}

function StatCardMini({ label, val, color }: { label: string, val: string | number, color: string }) {
    return (
        <div className="flex flex-col items-end px-3 py-1.5 bg-white border border-black/5 rounded-lg shadow-sm min-w-[85px]">
            <span className="text-[7px] font-black uppercase tracking-[0.2em] text-black/20 leading-none mb-1">{label}</span>
            <span className={cn("text-[11px] font-black tracking-tight uppercase leading-none", color)}>{val}</span>
        </div>
    )
}