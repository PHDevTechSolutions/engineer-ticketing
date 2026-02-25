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
    Plus, Activity, Clock, CloudSun
} from "lucide-react";

import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { cn } from "@/lib/utils"

export default function EngiconnectDashboard() {
    const router = useRouter()
    const [userId, setUserId] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [currentTime, setCurrentTime] = useState(new Date())
    
    // Real Weather State
    const [weather, setWeather] = useState({ temp: "--", condition: "Syncing..." });

    // User details state
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

    // 1. Live Clock Logic
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000)
        return () => clearInterval(timer)
    }, [])

    // 2. Real Weather Fetching Logic
    useEffect(() => {
        const fetchWeather = async (lat: number, lon: number) => {
            try {
                const response = await fetch(
                    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
                );
                const data = await response.json();
                const code = data.current_weather.weathercode;
                
                // Simple weather mapping
                let status = "Clear";
                if (code > 0 && code < 4) status = "Cloudy";
                if (code >= 51 && code <= 67) status = "Rainy";
                if (code >= 95) status = "Stormy";

                setWeather({
                    temp: `${Math.round(data.current_weather.temperature)}°C`,
                    condition: status
                });
            } catch (error) {
                setWeather({ temp: "!!", condition: "Error" });
            }
        };

        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition((pos) => {
                fetchWeather(pos.coords.latitude, pos.coords.longitude);
            });
        }
    }, []);

    const getGreeting = () => {
        const hour = currentTime.getHours()
        if (hour < 12) return "Good Morning"
        if (hour < 18) return "Good Afternoon"
        return "Good Evening"
    }

    const formattedTime = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const formattedDate = currentTime.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })

    // 3. Fetch User Data
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

    // 4. Firebase Notifications
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

                        <div className="flex items-center gap-4">
                            {/* SYSTEM & WEATHER BAR */}
                            <div className="flex items-center gap-4 px-4 py-2 bg-gray-50 rounded-xl border border-gray-100">
                                <div className="flex items-center gap-2">
                                    <div className="size-2 bg-green-500 rounded-full animate-pulse" />
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">System Live</span>
                                </div>
                                <div className="h-3 w-px bg-gray-300" />
                                <div className="flex items-center gap-2">
                                    <CloudSun size={14} className="text-gray-400" />
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">{weather.condition}</span>
                                    <span className="text-xs font-black text-gray-900">{weather.temp}</span>
                                </div>
                            </div>

                            {/* TIME BOX */}
                            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm">
                                <Clock size={16} className="text-red-600" />
                                <div className="flex flex-col border-l pl-3 border-gray-100">
                                    <span className="text-sm font-bold text-gray-900 tabular-nums leading-none">{formattedTime}</span>
                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">{formattedDate}</span>
                                </div>
                            </div>

                            {/* PROFILE */}
                            <div className="flex items-center gap-4 pl-4 border-l border-gray-100">
                                <div className="flex flex-col items-end">
                                    <span className="text-xs font-bold text-gray-900 uppercase tracking-tight">{userDetails.Firstname}</span>
                                    <span className="text-[9px] font-medium text-gray-500 uppercase tracking-widest">{userDetails.Position}</span>
                                </div>
                                <div className="size-11 rounded-xl overflow-hidden bg-gray-900 border-2 border-white shadow-md">
                                    {userDetails.profilePicture ? (
                                        <img src={userDetails.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-white font-bold text-xs uppercase">
                                            {userDetails.Firstname.substring(0, 2)}
                                        </div>
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
                                    <div className="size-12 rounded-2xl overflow-hidden border-2 border-white/20 bg-white/10 flex items-center justify-center">
                                        {userDetails.profilePicture ? (
                                            <img src={userDetails.profilePicture} alt="User" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-white font-bold">{userDetails.Firstname[0]}</span>
                                        )}
                                    </div>
                                    <div className="text-white">
                                        <div className="flex items-center gap-2 opacity-70 mb-1">
                                            <div className="size-1.5 bg-green-400 rounded-full animate-pulse" />
                                            <p className="text-[10px] font-bold uppercase tracking-widest">{getGreeting()}</p>
                                        </div>
                                        <h1 className="text-2xl font-bold tracking-tight">Hi, {userDetails.Firstname}</h1>
                                    </div>
                                </div>
                                <SidebarTrigger className="p-3 bg-white text-[#E33636] rounded-2xl shadow-xl" />
                            </div>

                            <div className="bg-white/95 backdrop-blur-md rounded-[28px] p-5 flex justify-between items-center shadow-2xl">
                                <div className="flex items-center gap-4">
                                    <div className="bg-red-50 p-3 rounded-2xl text-[#E33636]">
                                        <Clock size={24} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 font-black uppercase mb-0.5">Time</p>
                                        <div className="flex items-baseline gap-1">
                                            <p className="text-3xl font-black text-gray-900 tabular-nums leading-none">{formattedTime.split(' ')[0]}</p>
                                            <p className="text-[10px] font-black text-red-600 uppercase">{formattedTime.split(' ')[1]}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right border-l pl-4 border-gray-100">
                                    <p className="text-[9px] font-bold text-gray-300 uppercase mb-1">{weather.condition}</p>
                                    <div className="flex items-center justify-end gap-1">
                                        <span className="text-xl font-black text-gray-800 leading-none">{weather.temp}</span>
                                        <div className="size-2 bg-orange-400 rounded-full" />
                                    </div>
                                    <p className="text-[8px] font-bold text-gray-400 uppercase mt-1">{formattedDate.split(',')[0]}</p>
                                </div>
                            </div>
                        </div>
                    </header>

                    {/* MAIN CONTENT AREA */}
                    <main className="px-5 md:px-12 -mt-10 md:mt-0 space-y-10 pb-24 max-w-7xl mx-auto w-full relative z-20 md:py-10">
                        <section>
                            <div className="flex items-center gap-2 mb-5 px-1">
                                <div className="size-1.5 bg-red-600 rounded-full" />
                                <h2 className="text-[10px] font-bold text-gray-400 md:text-gray-900 uppercase tracking-widest">Quick Menu</h2>
                            </div>
                            <div className="bg-white rounded-[35px] md:rounded-2xl p-5 md:p-8 shadow-2xl md:shadow-none md:border md:border-gray-100 grid grid-cols-3 md:grid-cols-6 gap-y-10 md:gap-x-6">
                                {services.map((service, i) => (
                                    <button key={i} onClick={() => router.push(service.path)} className="flex flex-col items-center group">
                                        <div className="size-16 md:size-20 bg-[#F8F9FA] rounded-[24px] md:rounded-2xl flex items-center justify-center mb-3 group-hover:bg-red-600 transition-all relative">
                                            <service.icon className="text-gray-400 group-hover:text-white" size={24} />
                                            {service.count > 0 && (
                                                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] size-5 md:size-6 rounded-full flex items-center justify-center font-bold border-4 border-white">
                                                    {service.count}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-[9px] md:text-[10px] font-bold text-gray-500 group-hover:text-gray-900 text-center uppercase px-1">
                                            {service.label}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </section>

                        <section className="space-y-6">
                            <div className="flex items-end justify-between px-2">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">Recent Activity</h2>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase">Task Overview</p>
                                </div>
                                <button className="text-[10px] font-bold text-[#E33636] uppercase hover:bg-red-50 px-4 py-2 rounded-full transition-all">View History</button>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                                <ActivityCard label="Pending" value={notifications.siteVisit} icon={<Search size={18} />} />
                                <ActivityCard label="Cancelled" value={0} icon={<MoreHorizontal size={18} />} />
                                <ActivityCard label="Completed" value={0} icon={<ThumbsUp size={18} />} />
                                <ActivityCard label="New Items" value={notifications.shopDrawing} icon={<PenTool size={18} />} />
                            </div>
                        </section>
                    </main>

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
        <div className="bg-white p-6 rounded-[30px] md:rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-all group relative overflow-hidden">
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