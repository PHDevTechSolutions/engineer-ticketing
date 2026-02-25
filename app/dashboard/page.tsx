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
    Bell, Plus, Activity, Clock
} from "lucide-react";

import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { cn } from "@/lib/utils"

export default function EngiconnectDashboard() {
    const router = useRouter()
    const [userId, setUserId] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [currentTime, setCurrentTime] = useState(new Date())
    
    // State for user info including profile picture
    const [userDetails, setUserDetails] = useState({ 
        Firstname: "", 
        Position: "", 
        profilePicture: "" 
    })
    
    const [notifications, setNotifications] = useState({ 
        siteVisit: 0, 
        jobRequest: 0, 
        shopDrawing: 0 
    })

    // Live Clock Logic
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000)
        return () => clearInterval(timer)
    }, [])

    const getGreeting = () => {
        const hour = currentTime.getHours()
        if (hour < 12) return "Good Morning"
        if (hour < 18) return "Good Afternoon"
        return "Good Evening"
    }

    const formattedTime = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const formattedDate = currentTime.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })

    // Fetch User Data from API
    useEffect(() => {
        const storedUserId = localStorage.getItem("userId")
        setUserId(storedUserId)

        const fetchPersonnelRecord = async () => {
            if (!storedUserId) { setIsLoading(false); return; }
            try {
                const res = await fetch(`/api/user?id=${encodeURIComponent(storedUserId)}`)
                const data = await res.json()
                setUserDetails({
                    Firstname: data.Firstname || "User",
                    Position: data.Position || "Member",
                    profilePicture: data.profilePicture || "", 
                })
            } catch (error) { 
                console.error("Dashboard Fetch Error:", error) 
            } finally { 
                setIsLoading(false) 
            }
        }
        fetchPersonnelRecord()
    }, [])

    // Real-time Notifications from Firebase
    useEffect(() => {
        if (!db) return;
        const qSite = query(collection(db, "appointments"), where("status", "==", "PENDING"));
        const unsubSite = onSnapshot(qSite, (snap) => setNotifications(prev => ({ ...prev, siteVisit: snap.size })));

        const qShop = query(collection(db, "shop_drawing_requests"), 
            where("department", "==", "ENGINEERING"), where("status", "==", "PENDING_REVIEW"));
        const unsubShop = onSnapshot(qShop, (snap) => setNotifications(prev => ({ ...prev, shopDrawing: snap.size })));

        return () => { unsubSite(); unsubShop(); };
    }, []);

    const services = [
        { label: "Bookings", icon: CalendarCheck, count: notifications.siteVisit, path: "/appointments/site-visit" },
        { label: "Projects", icon: FileText, count: notifications.jobRequest, path: "/request/job" },
        { label: "Monitoring", icon: Monitor, count: 0, path: "/requests/dialux" },
        { label: "Approvals", icon: ThumbsUp, count: 0, path: "/requests/recommendation" },
        { label: "Requests", icon: PenTool, count: notifications.shopDrawing, path: "/request/shop-drawing" },
        { label: "Checklist", icon: ClipboardCheck, count: 0, path: "/requests/testing" },
    ];

    return (
        <ProtectedPageWrapper>
            <SidebarProvider defaultOpen={false}>
                <AppSidebar userId={userId} />
                <SidebarInset className="bg-[#F8F9FA] relative min-h-screen font-sans">
                    
                    {/* DESKTOP HEADER */}
                    <header className="hidden md:flex h-20 items-center justify-between px-8 bg-white border-b border-gray-100 sticky top-0 z-50">
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-4">
                                <SidebarTrigger className="hover:bg-gray-100 transition-colors" />
                                <div className="h-4 w-px bg-gray-200" />
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">{getGreeting()}</p>
                                    <h2 className="text-xl font-bold text-gray-900 tracking-tight leading-none">Welcome, {userDetails.Firstname}</h2>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-8">
                            <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
                                <Clock size={16} className="text-red-600" />
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-gray-900 tabular-nums leading-none">{formattedTime}</span>
                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tight">{formattedDate}</span>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-4 pl-4 border-l border-gray-100">
                                <div className="flex flex-col items-end">
                                    <span className="text-xs font-bold text-gray-900 uppercase tracking-tight">{userDetails.Firstname}</span>
                                    <span className="text-[9px] font-medium text-gray-500 uppercase tracking-widest">{userDetails.Position}</span>
                                </div>
                                
                                {/* Desktop Profile Image */}
                                <div className="size-11 rounded-xl overflow-hidden bg-gray-900 border-2 border-white shadow-sm flex items-center justify-center">
                                    {userDetails.profilePicture ? (
                                        <img 
                                            src={userDetails.profilePicture} 
                                            alt="Profile" 
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <span className="text-white font-bold text-xs">
                                            {userDetails.Firstname.substring(0, 2).toUpperCase()}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </header>

                    {/* MOBILE HEADER */}
                    <header className="md:hidden bg-[#E33636] pt-8 pb-24 px-6 rounded-b-[40px] shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32" />
                        <div className="max-w-7xl mx-auto relative z-10">
                            <div className="flex justify-between items-center mb-8">
                                <div className="flex items-center gap-4">
                                    {/* Mobile Profile Image */}
                                    <div className="size-12 rounded-2xl overflow-hidden border-2 border-white/20 shadow-xl bg-white/10 flex items-center justify-center">
                                        {userDetails.profilePicture ? (
                                            <img src={userDetails.profilePicture} alt="User" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-white font-bold">{userDetails.Firstname[0]}</span>
                                        )}
                                    </div>
                                    <div className="text-white">
                                        <div className="flex items-center gap-2 opacity-70 mb-1">
                                            <Clock size={10} />
                                            <p className="text-[10px] font-bold uppercase tracking-widest">{getGreeting()}</p>
                                        </div>
                                        <h1 className="text-2xl font-bold tracking-tight leading-none">
                                            Hi, {isLoading ? "..." : userDetails.Firstname}
                                        </h1>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <SidebarTrigger className="p-3 bg-white text-[#E33636] rounded-2xl shadow-xl border-none" />
                                </div>
                            </div>

                            <div className="bg-white/95 backdrop-blur-md rounded-[28px] p-6 flex justify-between items-center shadow-2xl">
                                <div className="flex items-center gap-4">
                                    <div className="bg-red-50 p-3 rounded-2xl text-[#E33636]">
                                        <Activity size={28} strokeWidth={2.5} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Current Time</p>
                                        <div className="flex items-baseline gap-1">
                                            <p className="text-3xl font-bold text-gray-900 tracking-tighter tabular-nums">{formattedTime.split(' ')[0]}</p>
                                            <p className="text-xs font-bold text-red-600 uppercase">{formattedTime.split(' ')[1]}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">Today's Date</p>
                                    <p className="text-lg font-bold text-gray-800 tracking-tight">{formattedDate.split(',')[0]}</p>
                                </div>
                            </div>
                        </div>
                    </header>

                    {/* MAIN CONTENT AREA */}
                    <main className="px-5 md:px-12 -mt-10 md:mt-0 space-y-10 md:space-y-14 pb-24 max-w-7xl mx-auto w-full relative z-20 md:py-10">
                        
                        {/* Quick Menu Section */}
                        <section>
                            <div className="flex items-center gap-2 mb-5 px-1">
                                <div className="size-1.5 bg-red-600 rounded-full" />
                                <h2 className="text-[10px] font-bold text-gray-400 md:text-gray-900 uppercase tracking-widest">Quick Menu</h2>
                            </div>
                            <div className="bg-white rounded-[35px] md:rounded-2xl p-5 md:p-8 shadow-2xl md:shadow-none md:border md:border-gray-100 grid grid-cols-3 md:grid-cols-6 gap-y-10 md:gap-x-6">
                                {services.map((service, i) => (
                                    <button 
                                        key={i} 
                                        onClick={() => router.push(service.path)}
                                        className="flex flex-col items-center group"
                                    >
                                        <div className="size-16 md:size-20 bg-[#F8F9FA] rounded-[24px] md:rounded-2xl flex items-center justify-center mb-3 group-hover:bg-red-600 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-red-100 relative">
                                            <service.icon className="text-gray-400 group-hover:text-white transition-colors" size={24} />
                                            {service.count > 0 && (
                                                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] size-5 md:size-6 rounded-full flex items-center justify-center font-bold border-4 border-white">
                                                    {service.count}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-[9px] md:text-[10px] font-bold text-gray-500 group-hover:text-gray-900 text-center uppercase tracking-tight px-1 leading-tight">
                                            {service.label}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </section>

                        {/* Recent Activity Section */}
                        <section className="space-y-6">
                            <div className="flex items-end justify-between px-2">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Recent Activity</h2>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Your task overview</p>
                                </div>
                                <button className="text-[10px] font-bold text-[#E33636] uppercase tracking-widest hover:bg-red-50 px-4 py-2 rounded-full transition-all">View History</button>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                                <ActivityCard label="Pending" value={notifications.siteVisit} icon={<Search size={18}/>} />
                                <ActivityCard label="Cancelled" value={0} icon={<MoreHorizontal size={18}/>} />
                                <ActivityCard label="Completed" value={0} icon={<ThumbsUp size={18}/>} />
                                <ActivityCard label="New Items" value={notifications.shopDrawing} icon={<PenTool size={18}/>} />
                            </div>
                        </section>
                    </main>

                    {/* Floating Action Button */}
                    <button className="fixed bottom-8 right-8 size-16 md:size-14 bg-gray-900 text-white rounded-[24px] md:rounded-xl shadow-2xl flex items-center justify-center hover:bg-red-600 hover:scale-110 transition-all z-50">
                        <Plus size={28} strokeWidth={3} />
                    </button>

                </SidebarInset>
            </SidebarProvider>
        </ProtectedPageWrapper>
    )
}

function ActivityCard({ label, value, icon }: { label: string, value: number, icon: React.ReactNode }) {
    return (
        <div className="bg-white p-6 md:p-6 rounded-[30px] md:rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-all group relative overflow-hidden">
            <div className="relative z-10">
                <p className="text-[9px] font-bold text-gray-400 mb-2 uppercase tracking-widest">{label}</p>
                <p className={cn("text-4xl font-bold tracking-tighter", value > 0 ? "text-gray-900" : "text-gray-200")}>
                    {value}
                </p>
            </div>
            <div className="mt-4 text-gray-300 group-hover:text-red-600 transition-colors">
                {icon}
            </div>
        </div>
    )
}