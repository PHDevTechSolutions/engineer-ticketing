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
    ArrowUpRight, Clock, CheckCircle2, AlertTriangle, Layers, MessageSquare, ChevronRight
} from "lucide-react";

import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, limit, orderBy } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { isAfter } from "date-fns";

export default function EngiconnectDashboard() {
    const router = useRouter()
    const [userId, setUserId] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [currentTime, setCurrentTime] = useState(new Date())
    const [weather, setWeather] = useState({ temp: "--", condition: "Syncing...", code: 0 });

    const [currentPage, setCurrentPage] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);
    const notifRef = useRef<HTMLDivElement>(null);

    const [activeTab, setActiveTab] = useState("Monitoring");
    const [showNotifDropdown, setShowNotifDropdown] = useState(false);
    const tabs = ["Monitoring", "Projects", "Requests", "Admin"];

    const [userDetails, setUserDetails] = useState({
        Firstname: "",
        Position: "",
        profilePicture: ""
    })

    const [notifications, setNotifications] = useState({
        siteVisit: 0,
        jobRequest: 0,
        shopDrawing: 0,
        testingActive: 0,
        testingOverdue: 0,
        otherRequest: 0,
        dialuxRequest: 0,
        dialuxInProgress: 0,
        dialuxCompleted: 0,
        unreadMessages: 0,
        unreadByService: {
            dialux: 0,
            jobRequest: 0,
            siteVisit: 0,
            shopDrawing: 0
        }
    })

    const [recentActivity, setRecentActivity] = useState<any[]>([]);

    const StreetLightIcon = ({ size = 24, className = "" }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M7 22h3M9 22V7c0-2 1-3 3-3h5" /><path d="M15 4h5l1 2h-7l1-2z" /><path d="M17 9v1M14 8l-.5.5M20 8l.5.5" opacity="0.5" />
        </svg>
    );

    const services = [
        { label: "Site Visit Appointment", icon: CalendarCheck, count: notifications.siteVisit, msgCount: notifications.unreadByService.siteVisit, path: "/appointments/site-visit" },
        { label: "Job Request", icon: FileText, count: notifications.jobRequest, msgCount: notifications.unreadByService.jobRequest, path: "/request/job" },
        { label: "Dialux Simulation", icon: Monitor, count: notifications.dialuxRequest, msgCount: notifications.unreadByService.dialux, path: "/request/dialux" },
        { label: "Product Recommendation", icon: ThumbsUp, count: 0, msgCount: 0, path: "/requests/recommendation" },
        { label: "SPF Shop Drawing Request", icon: StreetLightIcon, count: notifications.shopDrawing, msgCount: notifications.unreadByService.shopDrawing, path: "/request/shop-drawing" },
        { label: "Testing Monitoring", icon: ClipboardCheck, count: notifications.testingActive + notifications.testingOverdue, msgCount: 0, path: "/request/testing" },
        { label: "Other Request", icon: MoreHorizontal, count: notifications.otherRequest, msgCount: 0, path: "/request/other" },
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
        const handleClickOutside = (event: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
                setShowNotifDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

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
        if (!db || !userId) return;
        
        const unsubSite = onSnapshot(query(collection(db, "appointments"), where("status", "==", "PENDING")),
            (snap) => setNotifications(prev => ({ ...prev, siteVisit: snap.size })));
        
        const unsubShop = onSnapshot(query(collection(db, "shop_drawing_requests"), where("department", "==", "ENGINEERING"), where("status", "==", "PENDING_REVIEW")),
            (snap) => setNotifications(prev => ({ ...prev, shopDrawing: snap.size })));
        
        const unsubJob = onSnapshot(query(collection(db, "job_requests"), where("status", "==", "PENDING")),
            (snap) => setNotifications(prev => ({ ...prev, jobRequest: snap.size })));

        const unsubOther = onSnapshot(query(collection(db, "other_requests"), where("status", "==", "PENDING")),
            (snap) => setNotifications(prev => ({ ...prev, otherRequest: snap.size })));

        const unsubDialuxPending = onSnapshot(query(collection(db, "dialux_requests"), where("status", "==", "PENDING")),
            (snap) => setNotifications(prev => ({ ...prev, dialuxRequest: snap.size })));

        const unsubDialuxProgress = onSnapshot(query(collection(db, "dialux_requests"), where("status", "==", "IN_PROGRESS")),
            (snap) => setNotifications(prev => ({ ...prev, dialuxInProgress: snap.size })));

        const unsubDialuxDone = onSnapshot(query(collection(db, "dialux_requests"), where("status", "==", "COMPLETED")),
            (snap) => setNotifications(prev => ({ ...prev, dialuxCompleted: snap.size })));

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

        const calculateUnread = (snap: any) => {
            let totalUnreadInService = 0;
            snap.docs.forEach((doc: any) => {
                const data = doc.data();
                // Safety check for old data structure
                if (data.messages && Array.isArray(data.messages)) {
                    const lastSeenValue = data.lastSeenBy?.[userId];
                    const lastSeenTime = lastSeenValue ? new Date(lastSeenValue).getTime() : 0;
                    
                    const unreadInDoc = data.messages.filter((m: any) => {
                        if (!m.time || !m.senderId) return false;
                        const messageTime = new Date(m.time).getTime();
                        return m.senderId !== userId && messageTime > lastSeenTime;
                    }).length;
                    
                    totalUnreadInService += unreadInDoc;
                }
            });
            return totalUnreadInService;
        };

        const unsubMsgShop = onSnapshot(collection(db, "shop_drawing_requests"), (snap) => {
            setNotifications(prev => ({ ...prev, unreadByService: { ...prev.unreadByService, shopDrawing: calculateUnread(snap) } }));
        });

        const unsubMsgDialux = onSnapshot(collection(db, "dialux_requests"), (snap) => {
            setNotifications(prev => ({ ...prev, unreadByService: { ...prev.unreadByService, dialux: calculateUnread(snap) } }));
        });

        const unsubMsgJob = onSnapshot(collection(db, "job_requests"), (snap) => {
            setNotifications(prev => ({ ...prev, unreadByService: { ...prev.unreadByService, jobRequest: calculateUnread(snap) } }));
        });

        const unsubMsgSite = onSnapshot(collection(db, "appointments"), (snap) => {
            setNotifications(prev => ({ ...prev, unreadByService: { ...prev.unreadByService, siteVisit: calculateUnread(snap) } }));
        });

        return () => { 
            unsubSite(); unsubShop(); unsubTesting(); unsubJob(); unsubOther(); 
            unsubDialuxPending(); unsubDialuxProgress(); unsubDialuxDone();
            unsubMsgShop(); unsubMsgDialux(); unsubMsgJob(); unsubMsgSite();
        };
    }, [userId]);

    useEffect(() => {
        const total = Object.values(notifications.unreadByService).reduce((a, b) => a + b, 0);
        setNotifications(prev => ({ ...prev, unreadMessages: total }));
    }, [notifications.unreadByService]);

    useEffect(() => {
        if (!db) return;
        const qDialux = query(collection(db, "dialux_requests"), orderBy("createdAt", "desc"), limit(2));
        const qJob = query(collection(db, "job_requests"), orderBy("createdAt", "desc"), limit(2));
        const qShop = query(collection(db, "shop_drawing_requests"), orderBy("createdAt", "desc"), limit(2));

        const activitiesMap = new Map();
        function updateActivity(type: string, docs: any[]) {
            docs.forEach(doc => {
                const data = doc.data();
                activitiesMap.set(doc.id, { id: doc.id, type, ...data });
            });
            const sorted = Array.from(activitiesMap.values())
                .sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0))
                .slice(0, 5);
            setRecentActivity(sorted);
        }

        const unsubDialux = onSnapshot(qDialux, (snap) => updateActivity('DIAlux', snap.docs));
        const unsubJob = onSnapshot(qJob, (snap) => updateActivity('Job', snap.docs));
        const unsubShop = onSnapshot(qShop, (snap) => updateActivity('Shop', snap.docs));

        return () => { unsubDialux(); unsubJob(); unsubShop(); };
    }, []);

    const totalNotifications = notifications.siteVisit + notifications.shopDrawing + notifications.testingOverdue + notifications.jobRequest + notifications.otherRequest + notifications.dialuxRequest;

    return (
        <ProtectedPageWrapper>
            <SidebarProvider defaultOpen={false}>
                <AppSidebar userId={userId} />
                <SidebarInset className="bg-[#F2F4F7] relative min-h-screen font-sans pb-safe">

                    {/* Desktop Header */}
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
                            <button onClick={() => router.push('/messages')} className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all relative">
                                <MessageSquare size={20} />
                                {notifications.unreadMessages > 0 && (
                                    <span className="absolute -top-1 -right-1 flex min-w-[20px] h-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white border-2 border-white px-1 shadow-sm">
                                        {notifications.unreadMessages}
                                    </span>
                                )}
                            </button>
                            
                            {/* Functional Notification Bell with Bubble (Desktop) */}
                            <div className="relative" ref={notifRef}>
                                <button 
                                    onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                                    className={cn(
                                        "p-2.5 rounded-xl transition-all relative",
                                        showNotifDropdown ? "bg-red-50 text-[#E33636]" : "text-gray-400 hover:text-[#E33636] hover:bg-red-50"
                                    )}
                                >
                                    <Bell size={20} />
                                    {totalNotifications > 0 && (
                                        <span className="absolute -top-1 -right-1 flex min-w-[20px] h-5 items-center justify-center rounded-full bg-[#E33636] text-[10px] font-bold text-white border-2 border-white px-1 shadow-sm">
                                            {totalNotifications}
                                        </span>
                                    )}
                                </button>

                                {showNotifDropdown && (
                                    <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-gray-100 py-4 z-[60] animate-in fade-in zoom-in duration-200">
                                        <div className="px-5 pb-3 border-b border-gray-50 flex justify-between items-center">
                                            <h3 className="font-bold text-gray-900 text-sm">Notifications</h3>
                                            <span className="text-[10px] bg-red-100 text-[#E33636] px-2 py-0.5 rounded-full font-black uppercase">
                                                {totalNotifications} Alerts
                                            </span>
                                        </div>
                                        <div className="max-h-[380px] overflow-y-auto no-scrollbar py-2">
                                            {totalNotifications === 0 ? (
                                                <div className="py-10 text-center">
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase italic">No pending tasks</p>
                                                </div>
                                            ) : (
                                                <>
                                                    {notifications.siteVisit > 0 && <NotifItem label="Site Visits" count={notifications.siteVisit} icon={CalendarCheck} path="/appointments/site-visit" onClick={() => setShowNotifDropdown(false)} />}
                                                    {notifications.jobRequest > 0 && <NotifItem label="Job Requests" count={notifications.jobRequest} icon={FileText} path="/request/job" onClick={() => setShowNotifDropdown(false)} />}
                                                    {notifications.shopDrawing > 0 && <NotifItem label="Shop Drawings" count={notifications.shopDrawing} icon={StreetLightIcon} path="/request/shop-drawing" onClick={() => setShowNotifDropdown(false)} />}
                                                    {notifications.testingOverdue > 0 && <NotifItem label="Testing Critical" count={notifications.testingOverdue} icon={AlertTriangle} path="/request/testing" color="text-red-600" onClick={() => setShowNotifDropdown(false)} />}
                                                    {notifications.dialuxRequest > 0 && <NotifItem label="DIAlux Requests" count={notifications.dialuxRequest} icon={Monitor} path="/request/dialux" onClick={() => setShowNotifDropdown(false)} />}
                                                    {notifications.otherRequest > 0 && <NotifItem label="Misc Requests" count={notifications.otherRequest} icon={MoreHorizontal} path="/request/other" onClick={() => setShowNotifDropdown(false)} />}
                                                </>
                                            )}
                                        </div>
                                        <button 
                                            onClick={() => { router.push('/notifications'); setShowNotifDropdown(false); }}
                                            className="w-full mt-2 pt-3 border-t border-gray-50 text-center text-[10px] font-bold text-[#E33636] uppercase tracking-widest hover:bg-gray-50 py-2 transition-colors"
                                        >
                                            View Full History
                                        </button>
                                    </div>
                                )}
                            </div>

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

                    {/* Mobile Header */}
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
                                    <button onClick={() => router.push('/messages')} className="p-2.5 bg-white/10 rounded-full border border-white/10 text-white relative">
                                        <MessageSquare size={18} />
                                        {notifications.unreadMessages > 0 && (
                                            <span className="absolute -top-1 -right-1 flex min-w-[16px] h-4 items-center justify-center rounded-full bg-blue-400 text-[9px] font-bold text-white border-2 border-[#E33636] px-0.5 shadow-sm">
                                                {notifications.unreadMessages}
                                            </span>
                                        )}
                                    </button>
                                    {/* Mobile Bell with Bubble */}
                                    <button onClick={() => router.push('/notifications')} className="p-2.5 bg-white/10 rounded-full border border-white/10 text-white relative">
                                        <Bell size={18} />
                                        {totalNotifications > 0 && (
                                            <span className="absolute -top-1 -right-1 flex min-w-[16px] h-4 items-center justify-center rounded-full bg-yellow-400 text-[9px] font-bold text-[#E33636] border-2 border-[#E33636] px-0.5 shadow-sm">
                                                {totalNotifications}
                                            </span>
                                        )}
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
                        {/* Service Grid Section */}
                        <section>
                            <div className="bg-white rounded-[24px] py-6 pb-6 px-4 shadow-sm border border-gray-100">
                                <div className="md:hidden">
                                    <div 
                                        className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar py-3"
                                        onScroll={handleScroll}
                                        ref={scrollRef}
                                    >
                                        {[...Array(totalPages)].map((_, pageIndex) => (
                                            <div key={pageIndex} className="min-w-full grid grid-cols-3 gap-y-5 px-2 snap-center">
                                                {services.slice(pageIndex * itemsPerPage, (pageIndex + 1) * itemsPerPage).map((service, i) => (
                                                    <button key={i} onClick={() => router.push(service.path)} className="flex flex-col items-center">
                                                        <div className="size-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-3 active:scale-95 transition-all relative">
                                                            <service.icon className="text-[#E33636]" size={28} />
                                                            {service.count > 0 && <span className="absolute -top-1 -right-1 bg-[#E33636] text-white text-[10px] min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center font-bold border-2 border-white">{service.count}</span>}
                                                            {service.msgCount > 0 && <span className="absolute -bottom-1 -left-1 bg-blue-600 text-white text-[9px] size-5 rounded-full flex items-center justify-center font-bold border-2 border-white"><MessageSquare size={10} fill="currentColor" /></span>}
                                                        </div>
                                                        <span className="text-[11px] font-bold text-gray-600 text-center leading-tight px-1">{service.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-center gap-3 mt-2">
                                        {[...Array(totalPages)].map((_, i) => (
                                            <div key={i} className={cn("h-1.5 rounded-full transition-all duration-300", currentPage === i ? "w-6 bg-[#E33636]" : "w-2 bg-gray-200")} />
                                        ))}
                                    </div>
                                </div>

                                <div className="hidden md:grid grid-cols-6 gap-6">
                                    {services.map((service, i) => (
                                        <button key={i} onClick={() => router.push(service.path)} className="flex flex-col items-center group">
                                            <div className="size-14 bg-gray-50 rounded-xl flex items-center justify-center mb-2 group-hover:bg-red-50 transition-all relative">
                                                <service.icon className="text-[#E33636]" size={24} />
                                                {service.count > 0 && <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[9px] min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center font-bold border-2 border-white">{service.count}</span>}
                                                {service.msgCount > 0 && <span className="absolute -bottom-1.5 -left-1.5 bg-blue-600 text-white text-[9px] size-5 rounded-full flex items-center justify-center font-bold border-2 border-white shadow-md animate-bounce"><MessageSquare size={10} fill="currentColor" /></span>}
                                            </div>
                                            <span className="text-[10px] font-bold text-gray-500 text-center">{service.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </section>

                        {/* Summary Stats */}
                        <section className="grid grid-cols-3 gap-3">
                             <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center">
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter mb-1">Total Pending</span>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-xl font-black text-[#E33636]">{totalNotifications}</span>
                                    <Layers size={10} className="text-gray-300" />
                                </div>
                             </div>
                             <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center">
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter mb-1">Unread Chat</span>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-xl font-black text-blue-600">{notifications.unreadMessages}</span>
                                    <MessageSquare size={10} className="text-gray-300" />
                                </div>
                             </div>
                             <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center">
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter mb-1">Success</span>
                                <span className="text-xl font-black text-green-600">{notifications.dialuxCompleted}</span>
                             </div>
                        </section>

                        {/* Collaboration Clusters */}
                        <section className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-bold text-gray-900 tracking-tight">Collaboration Clusters</h2>
                                <button onClick={() => router.push('/messages')} className="text-[10px] font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1">
                                    Open Inbox <MessageSquare size={12} />
                                </button>
                            </div>
                            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center space-y-3">
                                <div className="flex items-center gap-6 overflow-x-auto no-scrollbar w-full justify-center">
                                    {Object.entries(notifications.unreadByService).map(([service, count]) => (
                                        count > 0 && (
                                            <button 
                                                key={service} 
                                                onClick={() => router.push(`/messages?filter=${service}`)} 
                                                className="flex flex-col items-center active:scale-95 transition-transform"
                                            >
                                                <div className="size-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center relative mb-1">
                                                    <MessageSquare size={20} fill="currentColor" />
                                                    <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[8px] min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center border-2 border-white font-bold">
                                                        {count}
                                                    </span>
                                                </div>
                                                <span className="text-[8px] font-black text-gray-400 uppercase">{service.replace(/([A-Z])/g, ' $1').trim()}</span>
                                            </button>
                                        )
                                    ))}
                                    {notifications.unreadMessages === 0 && <p className="text-[10px] font-bold text-gray-400 uppercase italic">All conversations read</p>}
                                </div>
                            </div>
                        </section>

                        {/* Recent Activity */}
                        <section className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-bold text-gray-900 tracking-tight">Recent Activity</h2>
                                <button onClick={() => router.push('/notifications')} className="text-[10px] font-bold text-[#E33636] uppercase tracking-wider flex items-center gap-1">
                                    View All <ArrowUpRight size={12} />
                                </button>
                            </div>
                            <div className="space-y-3">
                                {recentActivity.length > 0 ? recentActivity.map((item) => (
                                    <div key={item.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group active:scale-[0.98] transition-all cursor-pointer" 
                                         onClick={() => {
                                             const paths: Record<string, string> = { 'DIAlux': `/request/dialux/${item.id}`, 'Job': `/request/job/${item.id}`, 'Shop': `/request/shop-drawing/${item.id}` };
                                             router.push(paths[item.type] || '#');
                                         }}>
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "size-10 rounded-xl flex items-center justify-center",
                                                item.type === 'DIAlux' ? "bg-indigo-50 text-indigo-600" : 
                                                item.type === 'Job' ? "bg-orange-50 text-orange-600" : "bg-emerald-50 text-emerald-600"
                                            )}>
                                                {item.type === 'DIAlux' ? <Monitor size={18} /> : item.type === 'Job' ? <FileText size={18} /> : <StreetLightIcon size={18} />}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className="text-[8px] font-black px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded uppercase tracking-widest">{item.type}</span>
                                                    <p className="text-xs font-bold text-gray-900 line-clamp-1">{item.projectTitle || item.requestTitle || "New Activity"}</p>
                                                </div>
                                                <p className="text-[10px] font-medium text-gray-400">{item.company || "General"} • {item.createdAt?.toDate().toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {item.status === 'PENDING' && <div className="size-2 bg-red-500 rounded-full animate-pulse" />}
                                            <ChevronRight size={14} className="text-gray-300 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </div>
                                )) : <div className="py-8 flex flex-col items-center justify-center bg-white/50 rounded-2xl border border-dashed border-gray-200"><p className="text-[10px] font-bold text-gray-400 uppercase">System Idle</p></div>}
                            </div>
                        </section>

                        {/* Overview Tabs */}
                        <section className="space-y-4 px-2">
                            <div className="flex flex-col gap-4">
                                <div className="flex items-end justify-between">
                                    <h2 className="text-lg font-bold text-gray-900 tracking-tight">Overview</h2>
                                    <button className="text-[10px] font-bold text-[#E33636] uppercase tracking-wider">Reports</button>
                                </div>
                                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                                    {tabs.map((tab) => (
                                        <button key={tab} onClick={() => setActiveTab(tab)} className={cn("px-6 py-1.5 rounded-full text-[10px] font-bold transition-all border whitespace-nowrap", activeTab === tab ? "bg-[#E33636] text-white border-[#E33636] shadow-md" : "bg-white text-gray-400 border-gray-100 hover:border-gray-200")}>{tab}</button>
                                    ))}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-6">
                                {activeTab === "Monitoring" && (
                                    <>
                                        <ActivityCard label="In-Testing" value={notifications.testingActive} icon={ClipboardCheck} />
                                        <ActivityCard label="Critical" value={notifications.testingOverdue} icon={AlertTriangle} isAlert={notifications.testingOverdue > 0} />
                                        <ActivityCard label="Site Visits" value={notifications.siteVisit} icon={CalendarCheck} />
                                        <ActivityCard label="Shop Review" value={notifications.shopDrawing} icon={StreetLightIcon} />
                                    </>
                                )}
                                {activeTab === "Requests" && (
                                    <>
                                        <ActivityCard label="DIAlux" value={notifications.dialuxRequest} icon={Monitor} />
                                        <ActivityCard label="Job" value={notifications.jobRequest} icon={FileText} />
                                        <ActivityCard label="Misc" value={notifications.otherRequest} icon={MoreHorizontal} />
                                        <ActivityCard label="Total" value={totalNotifications} icon={Bell} />
                                    </>
                                )}
                                {(activeTab === "Projects" || activeTab === "Admin") && (
                                   <div className="col-span-2 md:col-span-4 py-10 flex flex-col items-center justify-center bg-white rounded-2xl border border-dashed border-gray-200">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase">{activeTab} Tracking Coming Soon</p>
                                    </div>
                                )}
                            </div>
                        </section>
                    </main>

                    <button onClick={() => router.push('/request/testing/add')} className="fixed bottom-8 right-6 size-14 bg-[#E33636] text-white rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-all z-50">
                        <Plus size={24} strokeWidth={3} />
                    </button>
                </SidebarInset>
            </SidebarProvider>
            <style jsx global>{`.no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
        </ProtectedPageWrapper>
    )
}

function ActivityCard({ label, value, icon: Icon, isAlert }: { label: string, value: number, icon?: any, isAlert?: boolean }) {
    return (
        <div className={cn("bg-white p-4 rounded-2xl shadow-sm border flex flex-col gap-1 min-h-[100px] relative overflow-hidden transition-all", isAlert ? "border-red-200 ring-1 ring-red-50" : "border-gray-100")}>
            <p className={cn("text-[10px] font-bold uppercase tracking-tight", isAlert ? "text-red-500" : "text-gray-400")}>{label}</p>
            <p className={cn("text-3xl font-black text-gray-900", isAlert && "text-red-600")}>{value}</p>
            <div className="absolute bottom-2 right-2 opacity-10">
                {Icon ? <Icon size={32} className={cn("text-[#E33636]", isAlert && "text-red-600")} /> : <Activity size={32} className={cn("text-[#E33636]", isAlert && "text-red-600")} />}
            </div>
            {isAlert && <div className="absolute top-0 right-0 size-1.5 bg-red-500 rounded-bl-lg animate-pulse" />}
        </div>
    )
}

function NotifItem({ label, count, icon: Icon, path, color = "text-gray-900", onClick }: any) {
    const router = useRouter();
    return (
        <button 
            onClick={() => { router.push(path); onClick(); }}
            className="w-full px-5 py-3 hover:bg-gray-50 flex items-center justify-between group transition-colors border-b border-gray-50 last:border-0"
        >
            <div className="flex items-center gap-3">
                <div className="size-8 bg-gray-50 rounded-lg flex items-center justify-center text-[#E33636] group-hover:bg-red-50">
                    <Icon size={16} />
                </div>
                <p className={cn("text-[10px] font-bold uppercase tracking-tight", color)}>{label}</p>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md group-hover:bg-red-100 group-hover:text-[#E33636]">
                    {count}
                </span>
                <ChevronRight size={12} className="text-gray-300 group-hover:translate-x-0.5 transition-transform" />
            </div>
        </button>
    );
}