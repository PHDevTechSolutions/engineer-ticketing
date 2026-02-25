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
    PenTool, ClipboardCheck, MoreHorizontal, Bell,
    Plus, Activity, Clock, CloudSun, CloudRain, Sun, CloudLightning, Cloud, Moon, CloudMoon
} from "lucide-react";

import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { cn } from "@/lib/utils"

export default function EngiconnectDashboard() {
    const router = useRouter()
    const [userId, setUserId] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [currentTime, setCurrentTime] = useState(new Date())
    const [weather, setWeather] = useState({ temp: "--", condition: "Syncing...", code: 0 });

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

    // SMART WEATHER LOGIC
    const getWeatherIcon = (condition: string, size: number) => {
        const hour = currentTime.getHours();
        const isNight = hour >= 18 || hour < 6;
        const animClass = "animate-pulse duration-2000 transition-all ease-in-out";

        switch (condition) {
            case "Rainy": return <CloudRain size={size} className={cn("text-blue-500", animClass)} />;
            case "Stormy": return <CloudLightning size={size} className={cn("text-purple-500", animClass)} />;
            case "Cloudy": return isNight ? <CloudMoon size={size} className={cn("text-indigo-300", animClass)} /> : <Cloud size={size} className={cn("text-gray-400", animClass)} />;
            case "Clear": return isNight ? <Moon size={size} className={cn("text-yellow-200", animClass)} /> : <Sun size={size} className={cn("text-yellow-500", animClass)} />;
            default: return isNight ? <CloudMoon size={size} className={cn("text-indigo-200", animClass)} /> : <CloudSun size={size} className={cn("text-orange-500", animClass)} />;
        }
    };

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000)
        return () => clearInterval(timer)
    }, [])

    useEffect(() => {
        const fetchWeather = async (lat: number, lon: number) => {
            try {
                const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
                const data = await response.json();
                const code = data.current_weather.weathercode;
                let status = "Clear";
                if (code > 0 && code < 4) status = "Cloudy";
                if (code >= 51 && code <= 67) status = "Rainy";
                if (code >= 95) status = "Stormy";
                setWeather({ temp: `${Math.round(data.current_weather.temperature)}°`, condition: status, code: code });
            } catch (error) { setWeather({ temp: "!!", condition: "Error", code: 0 }); }
        };
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition((pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude));
        }
    }, []);

    const getGreeting = () => {
        const hour = currentTime.getHours()
        if (hour < 12) return "Good Morning"
        if (hour < 18) return "Good Afternoon"
        return "Good Evening"
    }

    const formattedTime = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const formattedDate = currentTime.toLocaleDateString([], { month: 'short', day: '2-digit', year: 'numeric' })

    useEffect(() => {
        const storedUserId = localStorage.getItem("userId")
        setUserId(storedUserId)
        const fetchPersonnelRecord = async () => {
            if (!storedUserId) { setIsLoading(false); return; }
            try {
                const res = await fetch(`/api/user?id=${encodeURIComponent(storedUserId)}`)
                const data = await res.json()
                setUserDetails({ Firstname: data.Firstname || "User", Position: data.Position || "Member", profilePicture: data.profilePicture || "" })
            } catch (error) { console.error(error) } finally { setIsLoading(false) }
        }
        fetchPersonnelRecord()
    }, [])

    useEffect(() => {
        if (!db) return;
        const qSite = query(collection(db, "appointments"), where("status", "==", "PENDING"));
        const unsubSite = onSnapshot(qSite, (snap) => setNotifications(prev => ({ ...prev, siteVisit: snap.size })));
        const qShop = query(collection(db, "shop_drawing_requests"), where("department", "==", "ENGINEERING"), where("status", "==", "PENDING_REVIEW"));
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

    const totalNotifications = notifications.siteVisit + notifications.shopDrawing;

    return (
        <ProtectedPageWrapper>
            <SidebarProvider defaultOpen={false}>
                <AppSidebar userId={userId} />
                <SidebarInset className="bg-[#F2F4F7] relative min-h-screen font-sans pb-safe">

                   {/* DESKTOP HEADER */}
                    <header className="hidden md:flex h-20 items-center justify-between px-8 bg-white border-b border-gray-100 sticky top-0 z-50">
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-4">
                                <SidebarTrigger className="hover:bg-gray-100 transition-colors" />
                                <div className="h-4 w-px bg-gray-200" />
                                <div className="flex items-center gap-3">
                                    <div className="size-10 rounded-xl overflow-hidden bg-gray-900">
                                        {userDetails.profilePicture ? (
                                            <img src={userDetails.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-white font-bold text-xs uppercase">
                                                {userDetails.Firstname.substring(0, 2)}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">{getGreeting()}</p>
                                        <h2 className="text-xl font-bold text-gray-900 tracking-tight leading-none">Welcome, {userDetails.Firstname}</h2>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* DESKTOP NOTIFICATION BELL */}
                            <button className="p-2.5 text-gray-400 hover:text-[#E33636] hover:bg-red-50 rounded-xl transition-all relative group">
                                <Bell size={20} />
                                {totalNotifications > 0 && (
                                    <span className="absolute top-2.5 right-2.5 size-2 bg-[#E33636] rounded-full border-2 border-white" />
                                )}
                            </button>

                            <div className="flex items-center gap-4 px-4 py-2 bg-gray-50 rounded-xl border border-gray-100">
                                <div className="flex items-center gap-2">
                                    <div className="size-2 bg-green-500 rounded-full animate-pulse" />
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">System Live</span>
                                </div>
                                <div className="h-3 w-px bg-gray-300" />
                                <div className="flex items-center gap-2">
                                    {getWeatherIcon(weather.condition, 16)}
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">{weather.condition}</span>
                                    <span className="text-xs font-black text-gray-900">{weather.temp}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm">
                                <Clock size={16} className="text-red-600" />
                                <div className="flex flex-col border-l pl-3 border-gray-100">
                                    <span className="text-sm font-bold text-gray-900 tabular-nums leading-none">{formattedTime}</span>
                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">{formattedDate}</span>
                                </div>
                            </div>
                        </div>
                    </header>

                    {/* MOBILE HEADER */}
                    <header className="md:hidden bg-[#E33636] pt-14 pb-20 px-6 rounded-b-[40px] shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-24 -mt-24" />
                        <div className="max-w-7xl mx-auto relative z-10">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="size-11 rounded-full overflow-hidden border-2 border-white/30 bg-white/10">
                                        {userDetails.profilePicture ? (
                                            <img src={userDetails.profilePicture} alt="User" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-white font-bold">{userDetails.Firstname[0]}</div>
                                        )}
                                    </div>
                                    <div className="text-white">
                                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 leading-none mb-1">Hello,</p>
                                        <h1 className="text-xl font-extrabold tracking-tight leading-none">{userDetails.Firstname || "User"}!</h1>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {/* NOTIFICATION BUTTON INSTEAD OF SEARCH */}
                                    <button className="p-2.5 bg-white/10 rounded-full border border-white/10 text-white relative">
                                        <Bell size={18} />
                                        {totalNotifications > 0 && (
                                            <span className="absolute top-2 right-2.5 size-2 bg-yellow-400 rounded-full border-2 border-[#E33636]" />
                                        )}
                                    </button>
                                    <SidebarTrigger className="p-2.5 bg-white text-[#E33636] rounded-full shadow-lg" />
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl flex items-stretch shadow-xl overflow-hidden h-[85px]">
                                <div className="flex-[1.2] px-5 flex items-center gap-4">
                                    <div className="p-2 rounded-lg">
                                        {getWeatherIcon(weather.condition, 32)}
                                    </div>
                                    <div className="flex flex-col">
                                        <p className="text-[10px] font-bold text-gray-400 leading-none mb-1">{getGreeting()}!</p>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-2xl font-black text-gray-900 leading-none">{formattedTime.split(' ')[0]}</span>
                                            <span className="text-[10px] font-black text-gray-900">{formattedTime.split(' ')[1]}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="w-px bg-gray-100 my-4" />
                                <div className="flex-1 flex flex-col items-center justify-center">
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

                    <main className="px-4 -mt-8 space-y-8 pb-32 relative z-20 md:mt-0 md:px-12 md:py-10">
                        <section>
                            <div className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100 grid grid-cols-3 gap-y-8 gap-x-2 md:grid-cols-6 md:rounded-xl md:p-8 md:shadow-none">
                                {services.map((service, i) => (
                                    <button key={i} onClick={() => router.push(service.path)} className="flex flex-col items-center group">
                                        <div className="size-14 bg-gray-50 rounded-xl flex items-center justify-center mb-2 group-active:scale-95 transition-all relative">
                                            <service.icon className="text-[#E33636]" size={24} />
                                            {service.count > 0 && (
                                                <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[9px] size-5 rounded-full flex items-center justify-center font-bold border-2 border-white">
                                                    {service.count}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-[10px] font-bold text-gray-500 text-center leading-tight">{service.label}</span>
                                    </button>
                                ))}
                            </div>
                        </section>

                        <section className="space-y-4 px-2">
                            <div className="flex items-end justify-between">
                                <h2 className="text-lg font-bold text-gray-900 tracking-tight">Activities</h2>
                                <button className="text-[10px] font-bold text-[#E33636] uppercase tracking-wider">View All</button>
                            </div>
                            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-6">
                                <ActivityCard label="Upcoming" value={notifications.siteVisit} />
                                <ActivityCard label="Cancelled" value={0} />
                                <ActivityCard label="Attended" value={0} />
                                <ActivityCard label="For Updating" value={notifications.shopDrawing} />
                            </div>
                        </section>
                    </main>

                    <button className="fixed bottom-8 right-6 size-14 bg-[#E33636] text-white rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-all z-50">
                        <Plus size={24} strokeWidth={3} />
                    </button>
                </SidebarInset>
            </SidebarProvider>
        </ProtectedPageWrapper>
    )
}

function ActivityCard({ label, value }: { label: string, value: number }) {
    return (
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-50 flex flex-col gap-1 min-h-[90px] relative overflow-hidden">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{label}</p>
            <p className="text-2xl font-black text-gray-900">{value}</p>
            <div className="absolute bottom-2 right-2 opacity-10">
                <Activity size={32} className="text-[#E33636]" />
            </div>
        </div>
    )
}