"use client"

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
  CalendarCheck, 
  FileText, 
  Monitor, 
  ThumbsUp, 
  PenTool, 
  ClipboardCheck, 
  MoreHorizontal, 
  Search,
  Ticket,
  Wrench
} from "lucide-react";

// CUSTOM COMPONENTS
import { PageHeader } from "@/components/page-header"

export default function Page() {
    const router = useRouter()
    const [userId, setUserId] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [greeting, setGreeting] = useState<string>("")

    const [userDetails, setUserDetails] = useState({
        Firstname: "",
        Lastname: "",
        Position: "",
        Department: "",
    })

    useEffect(() => {
        const storedUserId = localStorage.getItem("userId")
        setUserId(storedUserId)

        const hour = new Date().getHours()
        if (hour < 12) setGreeting("Good Morning")
        else if (hour < 18) setGreeting("Good Afternoon")
        else setGreeting("Good Evening")

        const fetchUserData = async () => {
            if (!storedUserId) {
                setIsLoading(false)
                return
            }

            try {
                const res = await fetch(`/api/user?id=${encodeURIComponent(storedUserId)}`)
                const data = await res.json()
                
                setUserDetails({
                    Firstname: data.Firstname || "Technician",
                    Lastname: data.Lastname || "",
                    Position: data.Position || "Staff",
                    Department: data.Department || "",
                })
            } catch (error) {
                console.error("Failed to fetch dashboard user data:", error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchUserData()
    }, [])

    const handleNavigation = (path: string) => {
        if (path) router.push(path)
    }

    return (
        <ProtectedPageWrapper>
            <SidebarProvider
                defaultOpen={false}
                style={{ "--sidebar-width": "19rem" } as React.CSSProperties}
            >
                <AppSidebar userId={userId} />
                
                <SidebarInset className="bg-background pb-20 md:pb-0">
                    
                    {/* UPDATED TO REUSABLE PAGEHEADER */}
                    <PageHeader 
                        title="Terminal" 
                        version="DSI-SYS-v2.0" 
                        showBackButton={false}
                    >
                        {/* Desktop-only status indicators */}
                        <div className="flex items-center gap-3 pr-2">
                            <span className="text-[9px] font-black uppercase opacity-40 tracking-widest hidden sm:block">System.Active</span>
                            <div className="size-2 rounded-full bg-primary animate-pulse hidden sm:block" />
                            <SidebarTrigger className="hidden md:flex border-none hover:bg-transparent text-primary" />
                        </div>
                    </PageHeader>

                    {/* Mobile-only Sidebar Trigger (Since PageHeader hides children on mobile) */}
                    <div className="md:hidden fixed top-3 right-4 z-[40]">
                        <SidebarTrigger className="text-primary" />
                    </div>
              
                    <main className="flex flex-1 flex-col gap-8 p-6">
                        {/* GREETING SECTION */}
                        <section className="flex flex-col border-l-4 border-primary pl-4 py-1">
                            <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-primary animate-pulse">
                                {isLoading ? "Synchronizing..." : "System Access Granted"}
                            </span>
                            <h1 className="text-2xl font-black uppercase italic tracking-tighter">
                                {greeting}, <span className="text-primary">
                                    {isLoading ? "..." : `${userDetails.Firstname}`}
                                </span>
                            </h1>
                            <p className="text-[10px] font-mono opacity-50 uppercase mt-1">
                                [ {new Date().toLocaleDateString()} // {userDetails.Position || "ID_PENDING"} ]
                            </p>
                        </section>

                        {/* SYSTEM SNAPSHOT */}
                        <section className="flex flex-col gap-3">
                            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground px-1">System Snapshot</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[
                                    { label: "Pending Tickets", val: "12", icon: Ticket, color: "text-red-500", border: "border-red-500/20" },
                                    { label: "Active Jobs", val: "08", icon: Wrench, color: "text-emerald-500", border: "border-emerald-500/20" },
                                ].map((stat, i) => (
                                    <div key={i} className={`bg-muted/10 border-2 ${stat.border} p-5 flex items-center gap-5 transition-transform hover:translate-y-[-2px]`}>
                                        <div className="bg-background p-3 border border-muted/50">
                                            <stat.icon className={`size-6 ${stat.color}`} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{stat.label}</span>
                                            <span className="text-2xl font-black italic tracking-tighter leading-none">{stat.val}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* SERVICE GRID */}
                        <section className="flex flex-col">
                            <div className="bg-muted/10 border-x-2 border-t-2 border-muted/50 p-4 relative overflow-hidden">
                                <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.05)_50%)] bg-[length:100%_4px]" />
                                <h2 className="text-center text-lg font-black uppercase tracking-[.25em] text-foreground italic relative z-5">
                                    Book an Engineering Service
                                </h2>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 border-2 border-muted/50 bg-muted/5">
                                {[
                                    { label: "Site Visit Appointment", icon: CalendarCheck, count: 5, path: "/appointments/site-visit" },
                                    { label: "Job Request", icon: FileText, count: 2, path: "/requests/job" },
                                    { label: "Dialux Simulation", icon: Monitor, count: 0, path: "/requests/dialux" },
                                    { label: "Product Recommendation", icon: ThumbsUp, count: 0, path: "/requests/recommendation" },
                                    { label: "SPF Shop Drawing", icon: PenTool, count: 12, path: "/requests/shop-drawing" },
                                    { label: "Testing Monitoring", icon: ClipboardCheck, count: 0, path: "/requests/testing" },
                                    { label: "Other Request", icon: MoreHorizontal, count: 1, path: "/requests/other" },
                                    { label: "Request Tracker", icon: Search, count: 0, path: "/tracker" },
                                ].map((service, i) => (
                                    <button 
                                        key={i} 
                                        onClick={() => handleNavigation(service.path)}
                                        className="group relative flex flex-col items-center justify-center gap-4 p-8 border border-muted/20 bg-background hover:bg-primary/5 transition-all"
                                    >
                                        {service.count > 0 && (
                                            <div className="absolute top-3 right-3 flex flex-col items-end">
                                                <div className="bg-primary text-primary-foreground px-1.5 py-0.5 text-[10px] font-black leading-none shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]">
                                                    {service.count.toString().padStart(2, '0')}
                                                </div>
                                                <span className="text-[7px] font-bold uppercase text-primary mt-0.5 tracking-tighter">Pending</span>
                                            </div>
                                        )}
                                        <div className="relative border-2 border-muted p-5 group-hover:border-primary/50 transition-colors">
                                            <service.icon className="size-10 text-foreground group-hover:text-primary transition-colors" />
                                            <div className="absolute top-[-2px] left-[-2px] w-2 h-2 border-t-2 border-l-2 border-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                        <span className="text-[11px] font-black uppercase tracking-tight text-center max-w-[120px] leading-tight group-hover:text-primary">
                                            {service.label}
                                        </span>
                                        <div className="absolute bottom-3 right-3">
                                            <div className={`size-1.5 rounded-full transition-all ${
                                                service.count > 0 ? 'bg-primary animate-pulse' : 'bg-muted/30'
                                            }`} />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </section>

                        {/* FOOTER */}
                        <div className="mt-4 pt-6 border-t border-muted/50 flex flex-col items-center opacity-40">
                            <p className="text-[9px] font-black tracking-[0.4em] uppercase">Engineering Ticketing System</p>
                            <p className="text-[8px] font-mono tracking-tighter italic">DISRUPTIVE SOLUTIONS INC. // STATION_{userDetails.Position?.toUpperCase() || "UNKNOWN"}</p>
                        </div>
                    </main>
                </SidebarInset>
            </SidebarProvider>
        </ProtectedPageWrapper>
    )
}