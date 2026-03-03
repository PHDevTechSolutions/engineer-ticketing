"use client"

import * as React from "react"
import { useEffect, useState, useRef } from "react"
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
    ClipboardCheck, MoreHorizontal, Bell,
    Plus, Activity, CloudSun, CloudRain, Sun, CloudLightning, Cloud, Moon, CloudMoon,
} from "lucide-react";

import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { isAfter } from "date-fns";

export default function EngiconnectDashboard() {
    const router = useRouter()
    const [userId, setUserId] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [currentTime, setCurrentTime] = useState(new Date())
    const [weather, setWeather] = useState({ temp: "--", condition: "Syncing...", code: 0 });

    // Paging State for Services
    const [currentPage, setCurrentPage] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Activity Tabs State
    const [activeTab, setActiveTab] = useState("Testing");
    const tabs = ["Testing", "Projects", "Monitoring", "Admin"];

    const [userDetails, setUserDetails] = useState({
        Firstname: "",
        Position: "",
        profilePicture: ""
    })

    const [notifications, setNotifications] = useState({
        siteVisit: 0,
        jobRequest: 0, // Live Bubble for Job Request
        shopDrawing: 0,
        testingActive: 0,
        testingOverdue: 0,
        otherRequest: 0 // Live Bubble for Other Request
    })

    // Custom Streetlight Icon
    const StreetLightIcon = ({ size = 24, className = "" }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M7 22h3M9 22V7c0-2 1-3 3-3h5" /><path d="M15 4h5l1 2h-7l1-2z" /><path d="M17 9v1M14 8l-.5.5M20 8l.5.5" opacity="0.5" />
        </svg>
    );

    // Services Definition (Updated counts with notification states)
    const services = [
        { label: "Site Visit Appointment", icon: CalendarCheck, count: notifications.siteVisit, path: "/appointments/site-visit" },
        { label: "Job Request", icon: FileText, count: notifications.jobRequest, path: "/request/job" },
        { label: "Dialux Simulation", icon: Monitor, count: 0, path: "/request/dialux" },
        { label: "Product Recommendation", icon: ThumbsUp, count: 0, path: "/requests/recommendation" },
        { label: "SPF Shop Drawing Request", icon: StreetLightIcon, count: notifications.shopDrawing, path: "/request/shop-drawing" },
        { label: "Testing Monitoring", icon: ClipboardCheck, count: notifications.testingActive + notifications.testingOverdue, path: "/request/testing" },
        { label: "Other Request", icon: MoreHorizontal, count: notifications.otherRequest, path: "/request/other" },
    ];

    const itemsPerPage = 6; 
    const totalPages = Math.ceil(services.length / itemsPerPage);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const scrollLeft = e.currentTarget.scrollLeft;
        const width = e.currentTarget.offsetWidth;
        const page = Math.round(scrollLeft / width);
        setCurrentPage(page);
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

    const getWeatherIcon = (condition: string, size: number) => {
        const hour = currentTime.getHours();
        const isNight = hour >= 18 || hour < 6;
        switch (condition) {
            case "Rainy": return <CloudRain size={size} className="text-blue-500 animate-pulse" />;
            case "Stormy": return <CloudLightning size={size} className="text-purple-500 animate-pulse" />;
            case "Cloudy": return isNight ? <CloudMoon size={size} className="text-indigo-300" /> : <Cloud size={size} className="text-gray-400" />;
            case "Clear": return isNight ? <Moon size={size} className="text-yellow-200" /> : <Sun size={size} className="text-yellow-500" />;
            default: return isNight ? <CloudMoon size={size} className="text-indigo-200" /> : <CloudSun size={size} className="text-orange-500" />;
        }
    };

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
        
        // Listener for Site Visits
        const unsubSite = onSnapshot(query(collection(db, "appointments"), where("status", "==", "PENDING")),
            (snap) => setNotifications(prev => ({ ...prev, siteVisit: snap.size })));
        
        // Listener for Shop Drawings
        const unsubShop = onSnapshot(query(collection(db, "shop_drawing_requests"), where("department", "==", "ENGINEERING"), where("status", "==", "PENDING_REVIEW")),
            (snap) => setNotifications(prev => ({ ...prev, shopDrawing: snap.size })));
        
        // NEW: Listener for Job Requests
        const unsubJob = onSnapshot(query(collection(db, "job_requests"), where("status", "==", "PENDING")),
            (snap) => setNotifications(prev => ({ ...prev, jobRequest: snap.size })));

        // NEW: Listener for Other Requests
        const unsubOther = onSnapshot(query(collection(db, "other_requests"), where("status", "==", "PENDING")),
            (snap) => setNotifications(prev => ({ ...prev, otherRequest: snap.size })));

        // Listener for Testing Monitoring
        const unsubTesting = onSnapshot(collection(db, "testing_tracker"), (snap) => {
            let active = 0; let overdue = 0;
            const today = new Date();
            snap.docs.forEach(doc => {
                const d = doc.data();
                if (!d.releaseDate) {
                    const target = d.targetDate?.toDate();
                    if (target && isAfter(today, target)) overdue++;
                    else if (d.arrivalDate) active++;
                }
            });
            setNotifications(prev => ({ ...prev, testingActive: active, testingOverdue: overdue }));
        });

        return () => { 
            unsubSite(); unsubShop(); unsubTesting(); unsubJob(); unsubOther();
        };
    }, []);

    // Total notifications for the Bell icon
    const totalNotifications = notifications.siteVisit + notifications.shopDrawing + notifications.testingOverdue + notifications.jobRequest + notifications.otherRequest;

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
                            <button className="p-2.5 text-gray-400 hover:text-[#E33636] hover:bg-red-50 rounded-xl transition-all relative group">
                                <Bell size={20} />
                                {totalNotifications > 0 && <span className="absolute top-2.5 right-2.5 size-2 bg-[#E33636] rounded-full border-2 border-white" />}
                            </button>
                            <div className="flex items-center gap-4 px-4 py-2 bg-gray-50 rounded-xl border border-gray-100">
                                <div className="flex items-center gap-2">
                                    <div className="size-2 bg-green-500 rounded-full animate-pulse" />
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">System Live</span>
                                </div>
                                <div className="h-3 w-px bg-gray-300" />
                                <div className="flex items-center gap-2">
                                    {getWeatherIcon(weather.condition, 16)}
                                    <span className="text-xs font-black text-gray-900">{weather.temp}</span>
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
                                    <button className="p-2.5 bg-white/10 rounded-full border border-white/10 text-white relative">
                                        <Bell size={18} />
                                        {totalNotifications > 0 && <span className="absolute top-2 right-2.5 size-2 bg-yellow-400 rounded-full border-2 border-[#E33636]" />}
                                    </button>
                                    <SidebarTrigger className="p-2.5 bg-white text-[#E33636] rounded-full shadow-lg" />
                                </div>
                            </div>
                            <div className="bg-white rounded-2xl flex items-stretch shadow-xl overflow-hidden h-[85px]">
                                <div className="flex-[1.2] px-5 flex items-center gap-4">
                                    <div className="p-2 rounded-lg">{getWeatherIcon(weather.condition, 32)}</div>
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
                                    <span className="text-xl font-black text-gray-800 leading-none">{weather.temp}</span>
                                    <p className="text-[8px] font-bold text-gray-400 uppercase mt-1">{formattedDate.split(',')[0]}</p>
                                </div>
                            </div>
                        </div>
                    </header>

                    <main className="px-4 -mt-8 space-y-8 pb-32 relative z-20 md:mt-0 md:px-12 md:py-10">
                        
                        {/* SERVICE SECTION */}
                        <section>
                            <div className="bg-white rounded-[24px] py-1 pb-6 px-4 shadow-sm border border-gray-100">
                                
                                <div className="md:hidden">
                                    <div 
                                        className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar py-3"
                                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                                        onScroll={handleScroll}
                                        ref={scrollRef}
                                    >
                                        {[...Array(totalPages)].map((_, pageIndex) => (
                                            <div key={pageIndex} className="min-w-full grid grid-cols-3 gap-y-5 px-2 snap-center">
                                                {services.slice(pageIndex * itemsPerPage, (pageIndex + 1) * itemsPerPage).map((service, i) => (
                                                    <button 
                                                        key={i} 
                                                        onClick={() => router.push(service.path)} 
                                                        className="flex flex-col items-center"
                                                    >
                                                        <div className="size-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-3 active:scale-95 transition-all relative">
                                                            <service.icon className="text-[#E33636]" size={28} />
                                                            {service.count > 0 && (
                                                                <span className="absolute -top-1 -right-1 bg-[#E33636] text-white text-[10px] size-5 rounded-full flex items-center justify-center font-bold border-2 border-white">
                                                                    {service.count}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className="text-[11px] font-bold text-gray-600 text-center leading-tight px-1">
                                                            {service.label}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex justify-center gap-3 mt-2">
                                        {[...Array(totalPages)].map((_, i) => (
                                            <div 
                                                key={i} 
                                                className={cn(
                                                    "h-1.5 rounded-full transition-all duration-300",
                                                    currentPage === i ? "w-6 bg-[#E33636]" : "w-2 bg-gray-200"
                                                )}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <div className="hidden md:grid grid-cols-6 gap-6">
                                    {services.map((service, i) => (
                                        <button key={i} onClick={() => router.push(service.path)} className="flex flex-col items-center group">
                                            <div className="size-14 bg-gray-50 rounded-xl flex items-center justify-center mb-2 group-hover:bg-red-50 transition-all relative">
                                                <service.icon className="text-[#E33636]" size={24} />
                                                {service.count > 0 && <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[9px] size-5 rounded-full flex items-center justify-center font-bold border-2 border-white">{service.count}</span>}
                                            </div>
                                            <span className="text-[10px] font-bold text-gray-500 text-center">{service.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </section>

                        {/* Activities Section */}
                        <section className="space-y-4 px-2">
                            <div className="flex flex-col gap-4">
                                <div className="flex items-end justify-between">
                                    <h2 className="text-lg font-bold text-gray-900 tracking-tight">Activities</h2>
                                    <button className="text-[10px] font-bold text-[#E33636] uppercase tracking-wider">View All</button>
                                </div>
                                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                                    {tabs.map((tab) => (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveTab(tab)}
                                            className={cn(
                                                "px-6 py-1.5 rounded-full text-[10px] font-bold transition-all border whitespace-nowrap",
                                                activeTab === tab
                                                    ? "bg-[#E33636] text-white border-[#E33636] shadow-md"
                                                    : "bg-white text-gray-400 border-gray-100 hover:border-gray-200"
                                            )}
                                        >
                                            {tab}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-6">
                                {activeTab === "Testing" ? (
                                    <>
                                        <ActivityCard label="Upcoming" value={notifications.siteVisit} />
                                        <ActivityCard label="Overdue" value={notifications.testingOverdue} isAlert={notifications.testingOverdue > 0} />
                                        <ActivityCard label="Job Requests" value={notifications.jobRequest} />
                                        <ActivityCard label="Shop Requests" value={notifications.shopDrawing} />
                                    </>
                                ) : (
                                    <div className="col-span-2 py-10 flex flex-col items-center justify-center bg-white/50 rounded-2xl border border-dashed border-gray-200">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase">No {activeTab} Data</p>
                                    </div>
                                )}
                            </div>
                        </section>
                    </main>

                    <button
                        onClick={() => router.push('/request/testing/add')}
                        className="fixed bottom-8 right-6 size-14 bg-[#E33636] text-white rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-all z-50"
                    >
                        <Plus size={24} strokeWidth={3} />
                    </button>
                </SidebarInset>
            </SidebarProvider>

            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </ProtectedPageWrapper>
    )
}

function ActivityCard({ label, value, isAlert }: { label: string, value: number, isAlert?: boolean }) {
    return (
        <div className={cn(
            "bg-white p-4 rounded-2xl shadow-sm border flex flex-col gap-1 min-h-[100px] relative overflow-hidden transition-all",
            isAlert ? "border-red-200 ring-1 ring-red-50" : "border-gray-50"
        )}>
            <p className={cn("text-[10px] font-bold uppercase tracking-tight", isAlert ? "text-red-500" : "text-gray-400")}>{label}</p>
            <p className={cn("text-3xl font-black text-gray-900", isAlert && "text-red-600")}>{value}</p>
            <div className="absolute bottom-2 right-2 opacity-10">
                <Activity size={32} className={cn("text-[#E33636]", isAlert && "text-red-600")} />
            </div>
            {isAlert && <div className="absolute top-0 right-0 size-1.5 bg-red-500 rounded-bl-lg animate-pulse" />}
        </div>
    )
}