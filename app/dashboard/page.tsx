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

// FINALIZED ICON SET
import {
    CalendarCheck, FileText, Monitor, ThumbsUp,
    PenTool, ClipboardCheck, MoreHorizontal, Search,
    Ticket, Wrench, Terminal as TerminalIcon, ShieldAlert,
    Activity, Database, ShieldCheck, Menu
} from "lucide-react";

// FIREBASE REAL-TIME IMPORTS
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

// CUSTOM COMPONENTS
import { PageHeader } from "@/components/page-header"
import { cn } from "@/lib/utils"

export default function TerminalDashboard() {
    const router = useRouter()
    const [userId, setUserId] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [greeting, setGreeting] = useState<string>("")
    const [userDetails, setUserDetails] = useState({
        Firstname: "",
        Position: "",
    })

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
        if (hour < 12) setGreeting("Professional Greetings")
        else if (hour < 18) setGreeting("Good Afternoon")
        else setGreeting("Good Evening")

        const fetchPersonnelRecord = async () => {
            if (!storedUserId) { setIsLoading(false); return; }
            try {
                const res = await fetch(`/api/user?id=${encodeURIComponent(storedUserId)}`)
                const data = await res.json()
                setUserDetails({
                    Firstname: data.Firstname || "Authorized Personnel",
                    Position: data.Position || "Operational Lead",
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

    const handleNavigation = (path: string) => { if (path) router.push(path); }

    const services = [
        { label: "Deployment Scheduling", icon: CalendarCheck, count: notifications.siteVisit, path: "/appointments/site-visit", priority: "high" },
        { label: "Job Requisition", icon: FileText, count: notifications.jobRequest, path: "/requests/job", priority: "standard" },
        { label: "Dialux Simulation", icon: Monitor, count: 0, path: "/requests/dialux", priority: "none" },
        { label: "Product Validation", icon: ThumbsUp, count: 0, path: "/requests/recommendation", priority: "none" },
        { label: "Technical Shop Drawing", icon: PenTool, count: notifications.shopDrawing, path: "/requests/shop-drawing", priority: "high" },
        { label: "Field Testing Monitor", icon: ClipboardCheck, count: 0, path: "/requests/testing", priority: "none" },
        { label: "Miscellaneous Protocol", icon: MoreHorizontal, count: notifications.other, path: "/requests/other", priority: "low" },
        { label: "Enterprise Tracker", icon: Search, count: 0, path: "/tracker", priority: "none" },
    ];

    return (
        <ProtectedPageWrapper>
            <SidebarProvider defaultOpen={false} style={{ "--sidebar-width": "19rem" } as React.CSSProperties}>
                <AppSidebar userId={userId} />
                <SidebarInset className="bg-background pb-24 md:pb-0 relative">

                    {/* TACTICAL PAGE HEADER INTEGRATION */}
                    <PageHeader
                        title="Command Center"
                        version="v2.5.0-STABLE"
                        showBackButton={false}
                        trigger={
                            <SidebarTrigger className="group relative flex items-center justify-center size-9 bg-muted/5 hover:bg-primary/10 border-2 border-muted/50 hover:border-primary/50 transition-all duration-300 rounded-none overflow-hidden">
                                {/* Decorative Corner */}
                                <div className="absolute top-0 left-0 size-1 border-t border-l border-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="flex flex-col gap-1 items-end">
                                    <div className="h-[2px] w-5 bg-primary group-hover:w-3 transition-all" />
                                    <div className="h-[2px] w-4 bg-primary group-hover:w-5 transition-all" />
                                </div>
                            </SidebarTrigger>
                        }
                        actions={
                            <div className="flex items-center gap-4 pr-2">
                                <div className="hidden sm:flex flex-col items-end">
                                    <span className="text-[8px] font-black uppercase opacity-40 tracking-widest leading-none">Linkage_Status</span>
                                    <span className="text-[9px] font-mono text-primary font-bold">ENCRYPTED_AES_256</span>
                                </div>
                                <div className="size-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
                            </div>
                        }
                    />

                    <main className="flex flex-1 flex-col gap-8 p-4 md:p-6 max-w-6xl mx-auto w-full">

                        {/* ACCESS VERIFICATION SECTION */}
                        <section className="flex flex-col border-l-4 border-primary pl-4 py-2 mt-4">
                            <div className="flex items-center gap-2 mb-1">
                                <ShieldCheck className="size-3 text-primary" />
                                <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-primary">
                                    {isLoading ? "Synchronizing..." : "Access_Verified"}
                                </span>
                            </div>
                            <h1 className="text-xl md:text-2xl font-black uppercase italic tracking-tighter leading-none">
                                {greeting}, <span className="text-primary">{isLoading ? "..." : userDetails.Firstname}</span>
                            </h1>
                            <p className="text-[9px] font-mono opacity-50 uppercase mt-2">
                                [ {new Date().toLocaleDateString()} // ASSET_CONTROL_{userDetails.Position?.replace(/\s+/g, "_").toUpperCase() || "PENDING"} ]
                            </p>
                        </section>

                        {/* DASHBOARD STATS */}
                        <section className="grid grid-cols-2 gap-3 md:gap-4">
                            {[
                                { label: "Outstanding Actions", val: notifications.siteVisit + notifications.shopDrawing, icon: Activity, color: "text-red-500", border: "border-red-500/20" },
                                { label: "System Uptime", val: "100%", icon: Wrench, color: "text-emerald-500", border: "border-emerald-500/20" },
                            ].map((stat, i) => (
                                <div key={i} className={cn("bg-muted/5 border-2 p-3 md:p-5 flex items-center gap-3 md:gap-5", stat.border)}>
                                    <stat.icon className={cn("size-5 md:size-6 hidden xs:block", stat.color)} />
                                    <div className="flex flex-col">
                                        <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground">{stat.label}</span>
                                        <span className="text-xl md:text-2xl font-black italic tracking-tighter leading-none">{stat.val}</span>
                                    </div>
                                </div>
                            ))}
                        </section>

                        {/* LIVE SERVICE GRID */}
                        <section className="flex flex-col">
                            <div className="bg-muted/10 border-x-2 border-t-2 border-muted/50 p-4 relative overflow-hidden">
                                <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.05)_50%)] bg-[length:100%_4px] opacity-20" />
                                <h2 className="text-center text-xs md:text-lg font-black uppercase tracking-[.25em] text-foreground italic relative z-10 flex items-center justify-center gap-3">
                                    <TerminalIcon className="size-4" />
                                    Operational Workflow Matrix
                                </h2>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-2 border-muted/50 bg-muted/5">
                                {services.map((service, i) => {
                                    const hasAlert = service.count > 0;
                                    const isHighPriority = service.priority === "high";

                                    return (
                                        <button
                                            key={i}
                                            onClick={() => handleNavigation(service.path)}
                                            className={cn(
                                                "group relative flex flex-row sm:flex-col items-center gap-4 p-4 md:p-8 border border-muted/20 bg-background transition-all",
                                                hasAlert ? "hover:bg-primary/5" : "hover:bg-muted/5"
                                            )}
                                        >
                                            {hasAlert && (
                                                <div className="absolute top-2 right-2 flex flex-col items-end z-20">
                                                    <div className={cn(
                                                        "px-1.5 py-0.5 text-[9px] font-black shadow-[2px_2px_0px_rgba(0,0,0,0.3)]",
                                                        isHighPriority ? "bg-red-600 text-white animate-pulse" : "bg-primary text-primary-foreground"
                                                    )}>
                                                        {service.count.toString().padStart(2, '0')}
                                                    </div>
                                                </div>
                                            )}

                                            <div className={cn(
                                                "relative border-2 p-3 md:p-5 transition-all",
                                                hasAlert ? "border-primary/40 group-hover:border-primary group-hover:bg-primary/5" : "border-muted group-hover:border-muted-foreground/50"
                                            )}>
                                                <service.icon className={cn("size-6 md:size-10", hasAlert ? "text-primary" : "text-muted-foreground")} />
                                            </div>

                                            <div className="flex flex-col items-start sm:items-center text-left sm:text-center">
                                                <span className={cn("text-[10px] md:text-[11px] font-black uppercase tracking-tight", hasAlert ? "text-foreground" : "text-muted-foreground")}>
                                                    {service.label}
                                                </span>
                                                {hasAlert && (
                                                    <div className="flex items-center gap-1 mt-1 sm:hidden">
                                                        <ShieldAlert className="size-2 text-primary" />
                                                        <span className="text-[8px] font-mono font-bold text-primary uppercase">Action Required</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="ml-auto sm:absolute sm:bottom-3 sm:right-3">
                                                <div className={cn("size-1.5 rounded-full", hasAlert ? (isHighPriority ? "bg-red-500 shadow-[0_0_6px_red]" : "bg-primary shadow-[0_0_6px_rgba(var(--primary),0.5)]") : "bg-muted/30")} />
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </section>

                        <footer className="mt-4 pt-6 border-t border-muted/50 flex flex-col items-center opacity-40">
                            <p className="text-[9px] font-black tracking-[0.4em] uppercase">Enterprise Engineering Logistics</p>
                            <p className="text-[8px] font-mono italic">DISRUPTIVE SOLUTIONS INC. // ASSET_CONTROL_{userDetails.Position?.replace(/\s+/g, "_").toUpperCase() || "VERIFYING"}</p>
                        </footer>
                    </main>
                </SidebarInset>
            </SidebarProvider>
        </ProtectedPageWrapper>
    )
}