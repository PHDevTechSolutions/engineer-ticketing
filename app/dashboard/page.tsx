"use client"

import * as React from "react"
import { useEffect, useState, useRef, useMemo } from "react"
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
    ArrowUpRight, Clock, CheckCircle2, AlertTriangle, Layers, MessageSquare, ChevronRight,
    LucideProps, LucideIcon, Package, TrendingUp, LayoutDashboard,
} from "lucide-react";

import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, limit, orderBy, doc } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { isAfter, format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/utils/supabase";
import { FloatingActionButton } from "@/components/floating-action-button";
import { DashboardGuide } from "@/components/dashboard-guide";

/* ─────────────────────────────────────────────
   CUSTOM ICON
───────────────────────────────────────────── */
const StreetLightIcon = ({ size = 24, className = "", ...props }: LucideProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
        <path d="M7 22h3M9 22V7c0-2 1-3 3-3h5" />
        <path d="M15 4h5l1 2h-7l1-2z" />
        <path d="M17 9v1M14 8l-.5.5M20 8l.5.5" opacity="0.5" />
    </svg>
);

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function relativeTime(date?: Date | null): string {
    if (!date) return ""
    const diff = Date.now() - date.getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (mins < 1) return "Just now"
    if (mins < 60) return `${mins}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days === 1) return "Yesterday"
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

/* ─────────────────────────────────────────────
   SKELETON COMPONENTS
───────────────────────────────────────────── */
function ServiceSkeleton() {
    return (
        <div className="flex flex-col items-center gap-2 animate-pulse">
            <div className="size-14 md:size-16 rounded-2xl bg-gray-100" />
            <div className="h-2 w-14 bg-gray-100 rounded-full" />
        </div>
    )
}

function ActivitySkeleton() {
    return (
        <div className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center gap-4 animate-pulse">
            <div className="size-10 rounded-xl bg-gray-100 flex-shrink-0" />
            <div className="flex-1 space-y-2">
                <div className="h-3 w-2/3 bg-gray-100 rounded-full" />
                <div className="h-2 w-1/3 bg-gray-100 rounded-full" />
            </div>
        </div>
    )
}

/* ─────────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────────── */
function StatCard({ label, value, icon: Icon, color, loading, onClick }: {
    label: string; value: any; icon: any; color: string; loading: boolean; onClick?: () => void
}) {
    return (
        <button
            onClick={onClick}
            disabled={!onClick || loading}
            className={cn(
                "bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col text-left w-full transition-all",
                onClick && !loading ? "hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer" : "cursor-default"
            )}
        >
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{label}</span>
            <div className="flex items-baseline gap-1.5 mt-1.5">
                {loading
                    ? <div className="h-6 w-8 bg-gray-100 rounded animate-pulse" />
                    : <span className={cn("text-2xl font-black leading-none", color)}>{value}</span>}
                <Icon size={10} className="text-gray-200" />
            </div>
        </button>
    )
}

function ActivityCard({ label, value, icon: Icon, isAlert, loading, onClick }: {
    label: string; value: number; icon?: any; isAlert?: boolean; loading: boolean; onClick?: () => void
}) {
    return (
        <button
            onClick={onClick}
            disabled={!onClick || loading}
            className={cn(
                "bg-white p-4 rounded-2xl shadow-sm border flex flex-col gap-1 min-h-[90px] relative overflow-hidden transition-all text-left w-full",
                isAlert && value > 0 ? "border-red-200" : "border-gray-100",
                onClick && !loading ? "hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer" : "cursor-default"
            )}
        >
            <p className={cn("text-[9px] font-black uppercase tracking-tight", isAlert && value > 0 ? "text-red-500" : "text-gray-400")}>{label}</p>
            {loading
                ? <div className="h-7 w-8 bg-gray-100 rounded animate-pulse mt-1" />
                : <p className={cn("text-2xl font-black text-gray-900 mt-0.5", isAlert && value > 0 && "text-red-600")}>{value}</p>}
            {Icon && <div className="absolute bottom-2 right-2 opacity-[0.07]"><Icon size={34} className="text-[#E33636]" /></div>}
        </button>
    )
}

function NotifItem({ label, count, icon: Icon, path, color = "text-gray-900", onClick }: {
    label: string; count: number; icon: any; path: string; color?: string; onClick: () => void
}) {
    const router = useRouter();
    return (
        <button
            onClick={() => { router.push(path); onClick(); }}
            className="w-full px-4 py-3 hover:bg-gray-50 flex items-center justify-between group transition-colors border-b border-gray-50 last:border-0"
        >
            <div className="flex items-center gap-3">
                <div className="size-8 bg-red-50 rounded-xl flex items-center justify-center text-[#E33636]">
                    <Icon size={15} />
                </div>
                <p className={cn("text-[11px] font-bold", color)}>{label}</p>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-white bg-[#E33636] px-2 py-0.5 rounded-full min-w-[22px] text-center">{count}</span>
                <ChevronRight size={12} className="text-gray-300 group-hover:translate-x-0.5 transition-transform" />
            </div>
        </button>
    );
}

/* ─────────────────────────────────────────────
   MAIN DASHBOARD
───────────────────────────────────────────── */
export default function EngiconnectDashboard() {
    const router = useRouter()
    const [userId, setUserId] = useState<string | null>(null)
    const [userRole, setUserRole] = useState<string | null>(null)
    const [isDataLoading, setIsDataLoading] = useState<boolean>(true)
    const [currentTime, setCurrentTime] = useState(new Date())
    const [weather, setWeather] = useState({ temp: "--", condition: "Syncing...", code: 0 })
    const [dynamicPermissions, setDynamicPermissions] = useState<any[]>([])
    const [currentPage, setCurrentPage] = useState(0)
    const scrollRef = useRef<HTMLDivElement>(null)
    const notifRef = useRef<HTMLDivElement>(null)
    const [activeTab, setActiveTab] = useState("Monitoring")
    const [showNotifDropdown, setShowNotifDropdown] = useState(false)
    const [userDept, setUserDept] = useState<string | null>(null)
    const [userDetails, setUserDetails] = useState({
        Firstname: "", Position: "", Department: "", profilePicture: ""
    })
    const [notifications, setNotifications] = useState({
        siteVisit: 0, jobRequest: 0, shopDrawing: 0,
        testingActive: 0, testingOverdue: 0, otherRequest: 0,
        dialuxRequest: 0, dialuxInProgress: 0, dialuxCompleted: 0,
        unreadMessages: 0,
        unreadByService: { dialux: 0, jobRequest: 0, siteVisit: 0, shopDrawing: 0, product: 0 },
        productRequest: 0
    })
    const [recentActivity, setRecentActivity] = useState<any[]>([])
    const [scheduleData, setScheduleData] = useState<{ today: any[], upcoming: any[], next: any | null }>({
        today: [], upcoming: [], next: null
    })
    const [myTasks, setMyTasks] = useState<{ siteVisits: any[], jobRequests: any[], testingItems: any[] }>({
        siteVisits: [], jobRequests: [], testingItems: []
    })
    const [perms, setPerms] = useState<any>(null)

    /* ── AUTH & PERMISSIONS ── */
    useEffect(() => {
        const storedUserId = localStorage.getItem("userId")
        if (!storedUserId) { setIsDataLoading(false); return }
        setUserId(storedUserId)

        fetch(`/api/user?id=${encodeURIComponent(storedUserId)}`)
            .then(res => res.json())
            .then(mongoData => {
                const dept = mongoData.Department || mongoData.department || ""
                setUserDetails({
                    Firstname: mongoData.Firstname || "User",
                    Position: mongoData.Position || "Member",
                    Department: dept,
                    profilePicture: mongoData.profilePicture || ""
                })
                setUserDept(dept)
                localStorage.setItem("userDepartment", dept)
                localStorage.setItem("userName", mongoData.Firstname || "User")
            })
            .catch(err => console.error("Error fetching user details:", err))

        const userDocRef = doc(db, "users", storedUserId)
        const unsubUser = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data()
                const role = data.Role || data.role || "MEMBER"
                setUserRole(role)
                localStorage.setItem("userRole", role)
            } else {
                setUserRole("MEMBER")
            }
        })

        const permissionsRef = collection(db, "role_permissions")
        const unsubPermissions = onSnapshot(permissionsRef, (snap) => {
            const allPerms = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            setDynamicPermissions(allPerms)
            
            if (storedUserId) {
                // Determine target ID for current user
                const roleKey = localStorage.getItem("userRole")?.toUpperCase() || "MEMBER"
                const deptKey = localStorage.getItem("userDepartment")?.toUpperCase().trim() || ""
                const targetId = deptKey ? `${deptKey}_${roleKey}` : `_${roleKey}`
                const myPerms = allPerms.find(p => p.id === targetId) || allPerms.find(p => p.id.endsWith(`_${roleKey}`))
                setPerms(myPerms)
            }
            setIsDataLoading(false)
        })

        return () => { unsubUser(); unsubPermissions() }
    }, [])

    /* ── CLOCK ── */
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000)
        return () => clearInterval(timer)
    }, [])

    /* ── WEATHER ── */
    useEffect(() => {
        const fetchWeather = async (lat: number, lon: number) => {
            try {
                const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`)
                const data = await res.json()
                const code = data.current_weather.weathercode
                let status = "Clear"
                if (code > 0 && code < 4) status = "Cloudy"
                if (code >= 51 && code <= 67) status = "Rainy"
                if (code >= 95) status = "Stormy"
                setWeather({ temp: `${Math.round(data.current_weather.temperature)}°`, condition: status, code })
            } catch { setWeather({ temp: "!!", condition: "Error", code: 0 }) }
        }
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(pos =>
                fetchWeather(pos.coords.latitude, pos.coords.longitude)
            )
        }
    }, [])

    /* ── CLICK OUTSIDE NOTIF ── */
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(e.target as Node))
                setShowNotifDropdown(false)
        }
        document.addEventListener("mousedown", handler)
        return () => document.removeEventListener("mousedown", handler)
    }, [])

    /* ── FIREBASE LISTENERS ── */
    useEffect(() => {
        if (!db || !userId) return

        // 1. General System Notifications (for Stat Cards & Dropdown)
        const unsubSite = onSnapshot(collection(db, "appointments"), snap => {
            const pending = snap.docs.filter(d => d.data().status === "PENDING").length
            const unread = calculateUnread(snap)
            setNotifications(prev => ({ 
                ...prev, 
                siteVisit: pending,
                unreadByService: { ...prev.unreadByService, siteVisit: unread }
            }))
            // Also update My Tasks for Site Visits
            setMyTasks(prev => ({
                ...prev,
                siteVisits: snap.docs
                    .filter(d => d.data().pic === userId && d.data().status !== "COMPLETED")
                    .map(doc => ({ id: doc.id, ...doc.data() }))
            }))
        })

        const unsubShop = onSnapshot(collection(db, "shop_drawing_requests"), snap => {
            const pending = snap.docs.filter(d => d.data().department === "ENGINEERING" && d.data().status === "PEND_REVIEW").length
            const unread = calculateUnread(snap)
            setNotifications(prev => ({ 
                ...prev, 
                shopDrawing: pending,
                unreadByService: { ...prev.unreadByService, shopDrawing: unread }
            }))
        })

        const unsubJob = onSnapshot(collection(db, "job_requests"), snap => {
            const pending = snap.docs.filter(d => d.data().status === "PENDING").length
            const unread = calculateUnread(snap)
            setNotifications(prev => ({ 
                ...prev, 
                jobRequest: pending,
                unreadByService: { ...prev.unreadByService, jobRequest: unread }
            }))
            // Also update My Tasks for Job Requests
            setMyTasks(prev => ({
                ...prev,
                jobRequests: snap.docs
                    .filter(d => d.data().assignedTo === userId && d.data().status !== "COMPLETED")
                    .map(doc => ({ id: doc.id, ...doc.data() }))
            }))
        })

        const unsubOther = onSnapshot(query(collection(db, "other_requests"), where("status", "==", "PENDING")),
            snap => setNotifications(prev => ({ ...prev, otherRequest: snap.size })))

        const unsubDialux = onSnapshot(collection(db, "dialux_requests"), snap => {
            const pending = snap.docs.filter(d => d.data().status === "PENDING").length
            const completed = snap.docs.filter(d => d.data().status === "COMPLETED").length
            const unread = calculateUnread(snap)
            setNotifications(prev => ({ 
                ...prev, 
                dialuxRequest: pending, 
                dialuxCompleted: completed,
                unreadByService: { ...prev.unreadByService, dialux: unread }
            }))
        })

        const unsubTesting = onSnapshot(collection(db, "testing_tracker"), snap => {
            let active = 0; let overdue = 0
            const today = new Date()
            const myItems: any[] = []

            snap.docs.forEach(doc => {
                const d = doc.data()
                if (!d.releaseDate) {
                    const target = d.targetDate?.toDate()
                    if (target && isAfter(today, target)) overdue++
                    else if (d.arrivalDate) active++
                }
                if (d.assignedTo === userId && d.status !== "RELEASED") {
                    myItems.push({ id: doc.id, ...d })
                }
            })
            setNotifications(prev => ({ ...prev, testingActive: active, testingOverdue: overdue }))
            setMyTasks(prev => ({ ...prev, testingItems: myItems }))
        })

        const calculateUnread = (snap: any) => {
            let total = 0
            snap.docs.forEach((doc: any) => {
                const data = doc.data()
                if (data.messages && Array.isArray(data.messages)) {
                    const lastSeen = data.lastSeenBy?.[userId]
                    const lastSeenTime = lastSeen ? new Date(lastSeen).getTime() : 0
                    total += data.messages.filter((m: any) =>
                        m.senderId !== userId && new Date(m.time).getTime() > lastSeenTime
                    ).length
                }
            })
            return total
        }

        return () => {
            unsubSite(); unsubShop(); unsubTesting(); unsubJob(); unsubOther(); unsubDialux()
        }
    }, [userId])

    /* ── UNREAD TOTAL ── */
    useEffect(() => {
        const total = Object.values(notifications.unreadByService).reduce((a, b) => a + b, 0)
        setNotifications(prev => ({ ...prev, unreadMessages: total }))
    }, [notifications.unreadByService])

    /* ── RECENT ACTIVITY ── */
    useEffect(() => {
        if (!db) return
        const qDialux = query(collection(db, "dialux_requests"), orderBy("createdAt", "desc"), limit(2))
        const qJob = query(collection(db, "job_requests"), orderBy("createdAt", "desc"), limit(2))
        const qShop = query(collection(db, "shop_drawing_requests"), orderBy("createdAt", "desc"), limit(2))
        const activitiesMap = new Map()

        function updateActivity(type: string, docs: any[]) {
            docs.forEach(doc => activitiesMap.set(doc.id, { id: doc.id, type, ...doc.data() }))
            const sorted = Array.from(activitiesMap.values())
                .sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0))
                .slice(0, 5)
            setRecentActivity(sorted)
        }

        const unsubDialux = onSnapshot(qDialux, snap => updateActivity("DIAlux", snap.docs))
        const unsubJob = onSnapshot(qJob, snap => updateActivity("Job", snap.docs))
        const unsubShop = onSnapshot(qShop, snap => updateActivity("Shop", snap.docs))
        return () => { unsubDialux(); unsubJob(); unsubShop() }
    }, [])

    /* ── SCHEDULE & TASKS ── */
    useEffect(() => {
        if (!db) return
        
        const qApps = query(collection(db, "appointments"), orderBy("appointmentDate", "asc"))
        const qTesting = query(collection(db, "testing_tracker"), orderBy("targetDate", "asc"))

        const unsubApps = onSnapshot(qApps, snap => {
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            
            const tomorrow = new Date(today)
            tomorrow.setDate(tomorrow.getDate() + 1)

            const apps = snap.docs.map(doc => {
                const data = doc.data()
                return { id: doc.id, type: "Site Visit", date: data.appointmentDate?.toDate(), title: data.client || "Untitled Visit", ...data }
            }).filter(a => a.date)

            setScheduleData(prev => {
                const combined = [...apps, ...prev.upcoming.filter(i => i.type === "Testing")].sort((a, b) => a.date.getTime() - b.date.getTime())
                const todayItems = combined.filter(i => i.date >= today && i.date < tomorrow)
                const upcomingItems = combined.filter(i => i.date >= tomorrow)
                const nextItem = combined.find(i => i.date >= new Date()) || null
                
                return { today: todayItems, upcoming: upcomingItems, next: nextItem }
            })
        })

        const unsubTesting = onSnapshot(qTesting, snap => {
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            
            const tomorrow = new Date(today)
            tomorrow.setDate(tomorrow.getDate() + 1)

            const items = snap.docs.map(doc => {
                const data = doc.data()
                return { 
                    id: doc.id, 
                    type: "Testing", 
                    date: data.targetDate?.toDate(), 
                    title: data.productName || "Untitled Product", 
                    releaseDate: data.releaseDate,
                    ...data 
                }
            }).filter(a => a.date && !a.releaseDate)

            setScheduleData(prev => {
                const combined = [...items, ...prev.today.filter(i => i.type === "Site Visit"), ...prev.upcoming.filter(i => i.type === "Site Visit")].sort((a, b) => a.date.getTime() - b.date.getTime())
                const todayItems = combined.filter(i => i.date >= today && i.date < tomorrow)
                const upcomingItems = combined.filter(i => i.date >= tomorrow)
                const nextItem = combined.find(i => i.date >= new Date()) || null
                
                return { today: todayItems, upcoming: upcomingItems, next: nextItem }
            })
        })

        return () => { unsubApps(); unsubTesting() }
    }, [])

    /* ── DERIVED ── */
    const tabs = useMemo(() => {
        const dept = (userDept || "").toUpperCase()
        const role = (userRole || "").toUpperCase()
        
        let base = ["Monitoring"]
        
        if (dept === "ENGINEERING") base = ["Monitoring", "My Tasks", "Schedule"]
        else if (dept === "SALES") base = ["Job Requests", "My Tasks", "Site Visits"]
        else if (dept === "PROCUREMENT" || dept === "WAREHOUSE OPERATIONS") base = ["Product Requests", "Testing"]
        else if (dept === "IT") base = ["Monitoring", "System", "Schedule"]

        if (role === "SUPER ADMIN" || role === "MANAGER") {
            if (!base.includes("Admin")) base.push("Admin")
        }
        
        return base
    }, [userRole, userDept, perms])

    const quickActions = useMemo(() => {
        const dept = (userDept || "").toUpperCase()
        const actions = [
            { label: "Site Visit", icon: CalendarCheck, path: "/appointments/site-visit/add", color: "bg-blue-50 text-blue-600", depts: ["ENGINEERING", "SALES", "IT"] },
            { label: "Job Request", icon: FileText, path: "/request/job/add", color: "bg-orange-50 text-orange-600", depts: ["SALES", "ENGINEERING", "IT"] },
            { label: "DIAlux", icon: Monitor, path: "/request/dialux/add", color: "bg-indigo-50 text-indigo-600", depts: ["SALES", "IT"] },
            { label: "Product SPF", icon: Package, path: "/request/product/add", color: "bg-emerald-50 text-emerald-600", depts: ["SALES", "PROCUREMENT", "IT"] },
            { label: "Shop Drawing", icon: StreetLightIcon, path: "/request/shop-drawing/add", color: "bg-violet-50 text-violet-600", depts: ["ENGINEERING", "IT"] },
            { label: "Testing", icon: ClipboardCheck, path: "/request/testing/add", color: "bg-red-50 text-[#E33636]", depts: ["ENGINEERING", "PROCUREMENT", "IT"] },
        ]
        return actions.filter(a => !a.depts || a.depts.includes(dept))
    }, [userDept])

    /* ── SPF PRODUCT (SUPABASE - CORRECT) ── */
    useEffect(() => {
        const fetchSPFNotifications = async () => {
            try {
                const { data, error } = await supabase
                    .from("spf_creation")
                    .select("status, final_selling_cost");

                if (error) throw error;

                let count = 0;

                data?.forEach((item) => {
                    const status = (item.status || "").toUpperCase().trim();

                    const isPending =
                        status === "PENDING FOR PROCUREMENT" ||
                        (status.includes("PROCUREMENT") && !status.includes("APPROVED"));

                    if (isPending) count++;
                });

                setNotifications(prev => ({
                    ...prev,
                    productRequest: count
                }));

            } catch (err) {
                console.error("SPF notif error:", err);
            }
        };

        fetchSPFNotifications();

        // ✅ Realtime sync (same pattern as your procurement page)
        const channel = supabase
            .channel("spf_creation_dashboard")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "spf_creation" },
                fetchSPFNotifications
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const services = useMemo(() => {
        const all = [
            { label: "Site Visit Appointment", icon: CalendarCheck, count: notifications.siteVisit, msgCount: notifications.unreadByService.siteVisit, path: "/appointments/site-visit", key: "siteVisit" },
            { label: "Job Request", icon: FileText, count: notifications.jobRequest, msgCount: notifications.unreadByService.jobRequest, path: "/request/job", key: "jobRequest" },
            { label: "Dialux Simulation", icon: Monitor, count: notifications.dialuxRequest, msgCount: notifications.unreadByService.dialux, path: "/request/dialux", key: "dialux" },
            { label: "Product Recommendation", icon: ThumbsUp, count: 0, msgCount: 0, path: "/requests/recommendation", key: "recommendation" },
            { label: "SPF Shop Drawing Request", icon: StreetLightIcon as LucideIcon, count: notifications.shopDrawing, msgCount: notifications.unreadByService.shopDrawing, path: "/request/shop-drawing", key: "shopDrawing" },
            { label: "Testing Monitoring", icon: ClipboardCheck, count: notifications.testingActive + notifications.testingOverdue, msgCount: 0, path: "/request/testing", key: "testing" },
            { label: "SPF Product Request", icon: Package, count: notifications.productRequest || 0, msgCount: notifications.unreadByService.product || 0, path: "/request/product", key: "productRequest" },
            { label: "Other Request", icon: MoreHorizontal, count: notifications.otherRequest, msgCount: 0, path: "/request/other", key: "other" },
        ]

        if (!userRole || dynamicPermissions.length === 0) return []
        const roleKey = userRole.toUpperCase()
        const deptKey = userDept ? userDept.toUpperCase().trim() : ""
        const targetId = deptKey ? `${deptKey}_${roleKey}` : `_${roleKey}`
        const perms = dynamicPermissions.find(p => p.id === targetId) || dynamicPermissions.find(p => p.id.endsWith(`_${roleKey}`))
        if (!perms?.services) return []
        return all.filter(s => perms.services[s.key === "other" ? "others" : s.key] === true)
    }, [userRole, userDept, notifications, dynamicPermissions])

    const itemsPerPage = 6
    const totalPages = Math.ceil(services.length / itemsPerPage)
    const totalNotifications = notifications.siteVisit + notifications.shopDrawing + notifications.testingOverdue + notifications.jobRequest + notifications.otherRequest + notifications.dialuxRequest + notifications.productRequest

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const page = Math.round(e.currentTarget.scrollLeft / e.currentTarget.offsetWidth)
        setCurrentPage(page)
    }

    const getWeatherIcon = (condition: string, size: number) => {
        const isNight = currentTime.getHours() >= 18 || currentTime.getHours() < 6
        switch (condition) {
            case "Rainy": return <CloudRain size={size} className="text-blue-400" />
            case "Stormy": return <CloudLightning size={size} className="text-purple-400" />
            case "Cloudy": return isNight ? <CloudMoon size={size} className="text-indigo-300" /> : <Cloud size={size} className="text-gray-400" />
            case "Clear": return isNight ? <Moon size={size} className="text-yellow-300" /> : <Sun size={size} className="text-yellow-500" />
            default: return isNight ? <CloudMoon size={size} className="text-indigo-200" /> : <CloudSun size={size} className="text-orange-400" />
        }
    }

    const getGreeting = () => {
        const h = currentTime.getHours()
        if (h < 12) return "Good Morning"
        if (h < 18) return "Good Afternoon"
        return "Good Evening"
    }

    const formattedTime = currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    const formattedDate = currentTime.toLocaleDateString([], { month: "short", day: "2-digit", year: "numeric" })

    const activityTypeConfig: Record<string, { bg: string; text: string; icon: any }> = {
        DIAlux: { bg: "bg-indigo-50", text: "text-indigo-600", icon: Monitor },
        Job: { bg: "bg-orange-50", text: "text-orange-600", icon: FileText },
        Shop: { bg: "bg-emerald-50", text: "text-emerald-600", icon: StreetLightIcon },
    }

    return (
        <ProtectedPageWrapper>
            <SidebarProvider defaultOpen={false}>
                <AppSidebar userId={userId} />
                <SidebarInset className="bg-[#F2F4F7] relative min-h-screen font-sans">

                    {/* ══════════════════════
                        DESKTOP HEADER
                    ══════════════════════ */}
                    <header className="hidden md:flex h-16 items-center justify-between px-6 lg:px-10 bg-white border-b border-gray-100 sticky top-0 z-50">
                        <div className="flex items-center gap-4">
                            <SidebarTrigger className="hover:bg-gray-100 rounded-xl transition-colors p-2" />
                            <div className="h-4 w-px bg-gray-200" />
                            <div className="flex items-center gap-3">
                                {/* Avatar */}
                                <div className="size-9 rounded-xl overflow-hidden bg-zinc-900 flex-shrink-0 ring-2 ring-gray-100">
                                    {userDetails.profilePicture ? (
                                        <img src={userDetails.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-white font-black text-[11px]">
                                            {userDetails.Firstname ? userDetails.Firstname.substring(0, 2).toUpperCase() : "EN"}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">{getGreeting()}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <h2 className="text-[15px] font-black text-gray-900 tracking-tight leading-none">
                                            {userDetails.Firstname || "User"}
                                        </h2>
                                        {userDetails.Department && (
                                            <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 uppercase tracking-wide">
                                                {userDetails.Department}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right: status + actions */}
                        <div className="flex items-center gap-2">
                            {/* Live / weather / time */}
                            <div className="hidden lg:flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-xl border border-gray-100 text-gray-500">
                                <div className="flex items-center gap-1.5">
                                    <div className="size-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Live</span>
                                </div>
                                <div className="h-3 w-px bg-gray-200" />
                                <div className="flex items-center gap-1.5">
                                    {getWeatherIcon(weather.condition, 14)}
                                    <span className="text-[11px] font-black text-gray-700">{weather.temp}</span>
                                </div>
                                <div className="h-3 w-px bg-gray-200" />
                                <span className="text-[10px] font-bold text-gray-600">{formattedTime}</span>
                            </div>

                            {/* Messages */}
                            <button
                                onClick={() => router.push("/messages")}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all relative"
                            >
                                <MessageSquare size={18} />
                                {notifications.unreadMessages > 0 && (
                                    <span className="absolute -top-1 -right-1 flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-blue-600 text-[9px] font-bold text-white border-2 border-white px-0.5">
                                        {notifications.unreadMessages > 99 ? "99+" : notifications.unreadMessages}
                                    </span>
                                )}
                            </button>

                            {/* Notifications */}
                            <div className="relative" ref={notifRef}>
                                <button
                                    onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                                    className={cn("p-2 rounded-xl transition-all relative", showNotifDropdown ? "bg-red-50 text-[#E33636]" : "text-gray-400 hover:text-[#E33636] hover:bg-red-50")}
                                >
                                    <Bell size={18} />
                                    {totalNotifications > 0 && (
                                        <span className="absolute -top-1 -right-1 flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-[#E33636] text-[9px] font-bold text-white border-2 border-white px-0.5">
                                            {totalNotifications > 99 ? "99+" : totalNotifications}
                                        </span>
                                    )}
                                </button>

                                {showNotifDropdown && (
                                    <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl shadow-gray-200/80 border border-gray-100 py-3 z-[60] animate-in fade-in slide-in-from-top-2 duration-150">
                                        <div className="px-4 pb-3 border-b border-gray-50 flex justify-between items-center">
                                            <h3 className="font-black text-gray-900 text-[13px]">Notifications</h3>
                                            <span className="text-[9px] bg-[#E33636] text-white px-2.5 py-1 rounded-full font-black">
                                                {totalNotifications} Pending
                                            </span>
                                        </div>
                                        <div className="max-h-[320px] overflow-y-auto py-1">
                                            {totalNotifications === 0 ? (
                                                <div className="py-8 text-center">
                                                    <CheckCircle2 size={22} className="text-emerald-400 mx-auto mb-2" />
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase">All Clear</p>
                                                </div>
                                            ) : (
                                                <>
                                                    {notifications.testingOverdue > 0 && <NotifItem label="Testing Critical" count={notifications.testingOverdue} icon={AlertTriangle} path="/request/testing" color="text-red-600" onClick={() => setShowNotifDropdown(false)} />}
                                                    {notifications.siteVisit > 0 && <NotifItem label="Site Visits" count={notifications.siteVisit} icon={CalendarCheck} path="/appointments/site-visit" onClick={() => setShowNotifDropdown(false)} />}
                                                    {notifications.jobRequest > 0 && <NotifItem label="Job Requests" count={notifications.jobRequest} icon={FileText} path="/request/job" onClick={() => setShowNotifDropdown(false)} />}
                                                    {notifications.shopDrawing > 0 && <NotifItem label="Shop Drawings" count={notifications.shopDrawing} icon={StreetLightIcon as LucideIcon} path="/request/shop-drawing" onClick={() => setShowNotifDropdown(false)} />}
                                                    {notifications.dialuxRequest > 0 && <NotifItem label="DIAlux Queue" count={notifications.dialuxRequest} icon={Monitor} path="/request/dialux" onClick={() => setShowNotifDropdown(false)} />}
                                                    {notifications.productRequest > 0 && <NotifItem label="SPF Products" count={notifications.productRequest} icon={Package} path="/request/product" onClick={() => setShowNotifDropdown(false)} />}
                                                </>
                                            )}
                                        </div>
                                        <div className="px-4 pt-2 border-t border-gray-50">
                                            <button onClick={() => { router.push("/notifications"); setShowNotifDropdown(false) }} className="w-full text-[9px] font-black text-[#E33636] uppercase tracking-widest py-1 text-center hover:underline">
                                                View All →
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </header>

                    {/* ══════════════════════
                        MOBILE HEADER
                        (kept close to original feel)
                    ══════════════════════ */}
                    <header className="md:hidden bg-[#E33636] pt-14 pb-20 px-6 rounded-b-[40px] shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-24 -mt-24 pointer-events-none" />

                        <div className="max-w-7xl mx-auto relative z-10">
                            {/* Top row: avatar + name + actions */}
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="size-11 rounded-full overflow-hidden border-2 border-white/30 bg-white/10 flex-shrink-0">
                                        {userDetails.profilePicture ? (
                                            <img src={userDetails.profilePicture} alt="User" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-white font-black text-sm">
                                                {userDetails.Firstname ? userDetails.Firstname[0].toUpperCase() : "E"}
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-white">
                                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 leading-none mb-1">{getGreeting()}</p>
                                        <h1 className="text-xl font-extrabold tracking-tight leading-none">{userDetails.Firstname || "User"}!</h1>
                                        {userDetails.Department && (
                                            <p className="text-[9px] font-bold uppercase tracking-widest opacity-60 mt-0.5">{userDetails.Department}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => router.push("/messages")} className="p-2.5 bg-white/10 rounded-full border border-white/10 text-white relative">
                                        <MessageSquare size={18} />
                                        {notifications.unreadMessages > 0 && (
                                            <span className="absolute -top-1 -right-1 flex min-w-[16px] h-4 items-center justify-center rounded-full bg-blue-400 text-[9px] font-bold text-white border-2 border-[#E33636] px-0.5 shadow-sm">
                                                {notifications.unreadMessages > 9 ? "9+" : notifications.unreadMessages}
                                            </span>
                                        )}
                                    </button>
                                    <div className="relative" ref={notifRef}>
                                        <button onClick={() => setShowNotifDropdown(!showNotifDropdown)} className="p-2.5 bg-white/10 rounded-full border border-white/10 text-white relative">
                                            <Bell size={18} />
                                            {totalNotifications > 0 && (
                                                <span className="absolute -top-1 -right-1 flex min-w-[16px] h-4 items-center justify-center rounded-full bg-white text-[9px] font-black text-[#E33636] border-2 border-[#E33636] px-0.5">
                                                    {totalNotifications > 9 ? "9+" : totalNotifications}
                                                </span>
                                            )}
                                        </button>
                                        {/* Mobile notif dropdown */}
                                        {showNotifDropdown && (
                                            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 py-3 z-[60] animate-in fade-in duration-150">
                                                <div className="px-4 pb-2 border-b border-gray-50 flex justify-between items-center">
                                                    <h3 className="font-black text-gray-900 text-[12px]">Notifications</h3>
                                                    <span className="text-[9px] bg-[#E33636] text-white px-2 py-0.5 rounded-full font-black">{totalNotifications}</span>
                                                </div>
                                                <div className="max-h-[240px] overflow-y-auto py-1">
                                                    {totalNotifications === 0 ? (
                                                        <div className="py-6 text-center"><p className="text-[10px] text-gray-400 font-bold">All clear!</p></div>
                                                    ) : (
                                                        <>
                                                            {notifications.testingOverdue > 0 && <NotifItem label="Testing Critical" count={notifications.testingOverdue} icon={AlertTriangle} path="/request/testing" color="text-red-600" onClick={() => setShowNotifDropdown(false)} />}
                                                            {notifications.siteVisit > 0 && <NotifItem label="Site Visits" count={notifications.siteVisit} icon={CalendarCheck} path="/appointments/site-visit" onClick={() => setShowNotifDropdown(false)} />}
                                                            {notifications.jobRequest > 0 && <NotifItem label="Job Requests" count={notifications.jobRequest} icon={FileText} path="/request/job" onClick={() => setShowNotifDropdown(false)} />}
                                                            {notifications.shopDrawing > 0 && <NotifItem label="Shop Drawings" count={notifications.shopDrawing} icon={StreetLightIcon as LucideIcon} path="/request/shop-drawing" onClick={() => setShowNotifDropdown(false)} />}
                                                            {notifications.productRequest > 0 && <NotifItem label="SPF Products" count={notifications.productRequest} icon={Package} path="/request/product" onClick={() => setShowNotifDropdown(false)} />}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <SidebarTrigger className="p-2.5 bg-white text-[#E33636] rounded-full shadow-lg" />
                                </div>
                            </div>

                            {/* Weather + time card — same as original but slightly refined */}
                            <div className="bg-white rounded-2xl flex items-stretch shadow-xl overflow-hidden h-[80px]">
                                <div className="flex-[1.2] px-4 flex items-center gap-3">
                                    <div className="p-1.5 rounded-lg">{getWeatherIcon(weather.condition, 28)}</div>
                                    <div>
                                        <p className="text-[9px] font-bold text-gray-400 leading-none mb-1">{getGreeting()}!</p>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-xl font-black text-gray-900 leading-none">{formattedTime.split(" ")[0]}</span>
                                            <span className="text-[10px] font-black text-gray-700">{formattedTime.split(" ")[1]}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="w-px bg-gray-100 my-3" />
                                <div className="flex-1 flex flex-col items-center justify-center">
                                    <p className="text-[9px] font-bold text-gray-300 uppercase mb-0.5">{weather.condition}</p>
                                    <span className="text-xl font-black text-gray-800 leading-none">{weather.temp}</span>
                                    <p className="text-[8px] font-bold text-gray-400 uppercase mt-1">{formattedDate.split(",")[0]}</p>
                                </div>
                            </div>
                        </div>
                    </header>

                    {/* ══════════════════════
                        MAIN CONTENT
                    ══════════════════════ */}
                    <main className="px-4 -mt-8 space-y-6 pb-32 relative z-20 md:mt-0 md:px-6 lg:px-10 md:py-6 max-w-7xl mx-auto animate-in fade-in duration-500">

                        {/* ── UPCOMING NEXT SUMMARY ── */}
                        {!isDataLoading && scheduleData.next && (
                            <div className="bg-white rounded-2xl p-4 border border-zinc-200/60 shadow-sm flex items-center justify-between group cursor-pointer hover:shadow-md transition-all active:scale-[0.99]"
                                onClick={() => {
                                    const paths: Record<string, string> = {
                                        "Site Visit": `/appointments/site-visit/${scheduleData.next.id}`,
                                        "Testing": `/request/testing/${scheduleData.next.id}`,
                                        "Job Request": `/request/job/${scheduleData.next.id}`
                                    }
                                    router.push(paths[scheduleData.next.type] || "#")
                                }}>
                                <div className="flex items-center gap-4">
                                    <div className="size-10 bg-zinc-900 rounded-xl flex items-center justify-center text-white shadow-lg shadow-zinc-200">
                                        <CalendarCheck size={20} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Upcoming Next</p>
                                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight leading-none">{scheduleData.next.title}</h3>
                                        <p className="text-[9px] text-gray-400 font-bold mt-1 uppercase tracking-wider">
                                            {format(scheduleData.next.date, "EEEE, MMM dd · HH:mm")}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100 uppercase tracking-widest">
                                        {scheduleData.next.type}
                                    </span>
                                    <ArrowUpRight size={14} className="text-gray-300 group-hover:text-zinc-900 transition-colors" />
                                </div>
                            </div>
                        )}

                        {/* ── CRITICAL ALERT ── */}
                        {!isDataLoading && perms?.dashboard?.showAlertBanner !== false && notifications.testingOverdue > 0 && (
                            <div
                                className="flex items-center justify-between gap-3 bg-[#E33636] text-white px-4 py-3 rounded-2xl shadow-lg cursor-pointer active:scale-[0.99] transition-all"
                                onClick={() => router.push("/request/testing")}
                            >
                                <div className="flex items-center gap-2.5">
                                    <AlertTriangle size={15} className="flex-shrink-0" />
                                    <p className="text-[11px] font-black uppercase tracking-wide">
                                        {notifications.testingOverdue} Critical Testing Item{notifications.testingOverdue > 1 ? "s" : ""} — Action Required
                                    </p>
                                </div>
                                <ChevronRight size={14} className="flex-shrink-0 opacity-70" />
                            </div>
                        )}

                        {/* ── SERVICES ── */}
                        <section className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Services</h2>
                                {!isDataLoading && services.length > 0 && (
                                    <span className="text-[9px] font-black text-gray-300 uppercase">{services.length} Available</span>
                                )}
                            </div>

                            {isDataLoading ? (
                                <div className="grid grid-cols-3 md:grid-cols-6 gap-5">
                                    {[...Array(6)].map((_, i) => <ServiceSkeleton key={i} />)}
                                </div>
                            ) : services.length === 0 ? (
                                <div className="py-8 text-center">
                                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">No services configured</p>
                                </div>
                            ) : (
                                <>
                                    {/* Mobile: paginated scroll (original behavior) */}
                                    <div className="md:hidden">
                                        <div
                                            className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar py-2"
                                            onScroll={handleScroll}
                                            ref={scrollRef}
                                        >
                                            {[...Array(totalPages)].map((_, pageIndex) => (
                                                <div key={pageIndex} className="min-w-full grid grid-cols-3 gap-y-5 px-2 snap-center">
                                                    {services.slice(pageIndex * itemsPerPage, (pageIndex + 1) * itemsPerPage).map((service, i) => (
                                                        <button key={i} onClick={() => router.push(service.path)} className="flex flex-col items-center transition-all active:scale-90">
                                                            <div className="size-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-2.5 relative">
                                                                <service.icon className="text-[#E33636]" size={26} />
                                                                {service.count > 0 && <span className="absolute -top-1 -right-1 bg-[#E33636] text-white text-[10px] min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center font-bold border-2 border-white">{service.count > 99 ? "99+" : service.count}</span>}
                                                                {service.msgCount > 0 && <span className="absolute -bottom-1 -left-1 bg-blue-600 text-white text-[9px] size-5 rounded-full flex items-center justify-center font-bold border-2 border-white"><MessageSquare size={10} fill="currentColor" /></span>}
                                                            </div>
                                                            <span className="text-[11px] font-bold text-gray-600 text-center leading-tight px-1">{service.label}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                        {totalPages > 1 && (
                                            <div className="flex justify-center gap-2 mt-3">
                                                {[...Array(totalPages)].map((_, i) => (
                                                    <div key={i} className={cn("h-1.5 rounded-full transition-all duration-300", currentPage === i ? "w-6 bg-[#E33636]" : "w-1.5 bg-gray-200")} />
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Desktop: grid */}
                                    <div className="hidden md:grid grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-5">
                                        {services.map((service, i) => (
                                            <button key={i} onClick={() => router.push(service.path)} className="flex flex-col items-center group transition-all hover:-translate-y-1">
                                                <div className="size-14 bg-gray-50 rounded-xl flex items-center justify-center mb-2 group-hover:bg-red-50 transition-all relative border border-gray-100">
                                                    <service.icon className="text-[#E33636]" size={22} />
                                                    {service.count > 0 && <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[9px] min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center font-bold border-2 border-white">{service.count > 99 ? "99+" : service.count}</span>}
                                                    {service.msgCount > 0 && <span className="absolute -bottom-1.5 -left-1.5 bg-blue-600 text-white text-[9px] size-5 rounded-full flex items-center justify-center font-bold border-2 border-white shadow-md animate-bounce"><MessageSquare size={10} fill="currentColor" /></span>}
                                                </div>
                                                <span className="text-[10px] font-bold text-gray-500 text-center leading-tight">{service.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </section>

                        {/* ── STATS ROW ── */}
                        {perms?.dashboard?.showStats !== false && (
                            <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                <StatCard label="Pending" value={isDataLoading ? "--" : totalNotifications} icon={Layers} color={totalNotifications > 0 ? "text-[#E33636]" : "text-gray-400"} loading={isDataLoading} onClick={totalNotifications > 0 ? () => setShowNotifDropdown(true) : undefined} />
                                <StatCard label="Messages" value={isDataLoading ? "--" : notifications.unreadMessages} icon={MessageSquare} color={notifications.unreadMessages > 0 ? "text-blue-600" : "text-gray-400"} loading={isDataLoading} onClick={() => router.push("/messages")} />
                                <StatCard label="Next Task" value={isDataLoading ? "--" : (scheduleData.next ? format(scheduleData.next.date, "HH:mm") : "None")} icon={Clock} color="text-violet-600" loading={isDataLoading} />
                                <StatCard label="Success" value={isDataLoading ? "--" : notifications.dialuxCompleted} icon={CheckCircle2} color="text-emerald-600" loading={isDataLoading} />
                            </section>
                        )}

                        {/* ── BOTTOM: Activity + Overview (desktop side by side) ── */}
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

                            {/* Recent Activity */}
                            {perms?.dashboard?.showRecentActivity !== false && (
                                <section className="lg:col-span-3 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-lg font-bold text-gray-900 tracking-tight">Recent Activity</h2>
                                        <button onClick={() => router.push("/notifications")} className="text-[10px] font-bold text-[#E33636] uppercase tracking-wider flex items-center gap-1 hover:gap-1.5 transition-all">
                                            View All <ArrowUpRight size={12} />
                                        </button>
                                    </div>
                                    <div className="space-y-2.5">
                                        {isDataLoading ? (
                                            [...Array(3)].map((_, i) => <ActivitySkeleton key={i} />)
                                        ) : recentActivity.length > 0 ? (
                                            recentActivity.map(item => {
                                                const cfg = activityTypeConfig[item.type] || activityTypeConfig.DIAlux
                                                const Icon = cfg.icon
                                                const paths: Record<string, string> = {
                                                    DIAlux: `/request/dialux/${item.id}`,
                                                    Job: `/request/job/${item.id}`,
                                                    Shop: `/request/shop-drawing/${item.id}`,
                                                }
                                                return (
                                                    <div
                                                        key={item.id}
                                                        className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group active:scale-[0.98] transition-all cursor-pointer hover:shadow-md hover:border-gray-200"
                                                        onClick={() => router.push(paths[item.type] || "#")}
                                                    >
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className={cn("size-10 rounded-xl flex items-center justify-center flex-shrink-0", cfg.bg, cfg.text)}>
                                                                <Icon size={17} />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-2 mb-0.5">
                                                                    <span className="text-[8px] font-black px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded uppercase tracking-widest flex-shrink-0">{item.type}</span>
                                                                    <p className="text-xs font-bold text-gray-900 truncate">{item.projectTitle || item.requestTitle || "New Activity"}</p>
                                                                </div>
                                                                <p className="text-[10px] font-medium text-gray-400">
                                                                    {item.company || "General"}
                                                                    {item.createdAt && <span className="text-gray-300 ml-1">· {relativeTime(item.createdAt.toDate())}</span>}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <ChevronRight size={13} className="text-gray-300 group-hover:translate-x-0.5 transition-transform flex-shrink-0 ml-2" />
                                                    </div>
                                                )
                                            })
                                        ) : (
                                            <div className="py-10 flex flex-col items-center justify-center bg-white/60 rounded-2xl border border-dashed border-gray-200">
                                                <Activity size={22} className="text-gray-200 mb-2" />
                                                <p className="text-[10px] font-bold text-gray-400 uppercase">System Idle</p>
                                            </div>
                                        )}
                                    </div>
                                </section>
                            )}

                            {/* Overview */}
                            <section className={cn("space-y-3", perms?.dashboard?.showRecentActivity === false ? "lg:col-span-5" : "lg:col-span-2")}>
                                {perms?.dashboard?.showOverviewTabs !== false && (
                                    <>
                                        <h2 className="text-lg font-bold text-gray-900 tracking-tight">Overview</h2>
                                        {/* Tabs */}
                                        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                                            {tabs.map(tab => (
                                                <button
                                                    key={tab}
                                                    onClick={() => setActiveTab(tab)}
                                                    className={cn(
                                                        "px-5 py-1.5 rounded-full text-[10px] font-bold transition-all border whitespace-nowrap",
                                                        activeTab === tab
                                                            ? "bg-[#E33636] text-white border-[#E33636] shadow-md"
                                                            : "bg-white text-gray-400 border-gray-100 hover:border-gray-200"
                                                    )}
                                                >
                                                    {tab}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                                {/* Tab content */}
                                {activeTab === "Monitoring" ? (
                                    <div className="grid grid-cols-2 gap-3">
                                        <ActivityCard label="In-Testing" value={notifications.testingActive} icon={ClipboardCheck} loading={isDataLoading} onClick={() => router.push("/request/testing")} />
                                        <ActivityCard label="Critical" value={notifications.testingOverdue} icon={AlertTriangle} loading={isDataLoading} isAlert={notifications.testingOverdue > 0} onClick={() => router.push("/request/testing")} />
                                        <ActivityCard label="Site Visits" value={notifications.siteVisit} icon={CalendarCheck} loading={isDataLoading} onClick={() => router.push("/appointments/site-visit")} />
                                        <ActivityCard label="Shop Review" value={notifications.shopDrawing} icon={StreetLightIcon as LucideIcon} loading={isDataLoading} onClick={() => router.push("/request/shop-drawing")} />
                                    </div>
                                ) : activeTab === "My Tasks" ? (
                                    <div className="space-y-2">
                                        {Object.values(myTasks).every(arr => arr.length === 0) ? (
                                            <div className="py-10 flex flex-col items-center justify-center bg-white rounded-2xl border border-dashed border-gray-200">
                                                <ThumbsUp size={20} className="text-gray-200 mb-2" />
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">All tasks completed!</p>
                                            </div>
                                        ) : (
                                            <>
                                                {myTasks.siteVisits.map(task => (
                                                    <div key={task.id} className="bg-white p-3 rounded-2xl border border-gray-100 flex items-center justify-between group hover:shadow-sm transition-all cursor-pointer" onClick={() => router.push(`/appointments/site-visit/${task.id}`)}>
                                                        <div className="flex items-center gap-3">
                                                            <div className="size-8 rounded-xl flex items-center justify-center bg-blue-50 text-blue-600">
                                                                <CalendarCheck size={14} />
                                                            </div>
                                                            <div>
                                                                <p className="text-[11px] font-black text-gray-900 uppercase truncate max-w-[120px]">{task.client || "Site Visit"}</p>
                                                                <p className="text-[9px] text-gray-400 font-bold">
                                                                    {task.appointmentDate ? format(task.appointmentDate.toDate(), "MMM dd") : "No date"} · Site Visit
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <ChevronRight size={12} className="text-gray-300 group-hover:translate-x-0.5 transition-transform" />
                                                    </div>
                                                ))}
                                                {myTasks.jobRequests.map(task => (
                                                    <div key={task.id} className="bg-white p-3 rounded-2xl border border-gray-100 flex items-center justify-between group hover:shadow-sm transition-all cursor-pointer" onClick={() => router.push(`/request/job/${task.id}`)}>
                                                        <div className="flex items-center gap-3">
                                                            <div className="size-8 rounded-xl flex items-center justify-center bg-orange-50 text-orange-600">
                                                                <FileText size={14} />
                                                            </div>
                                                            <div>
                                                                <p className="text-[11px] font-black text-gray-900 uppercase truncate max-w-[120px]">{task.projectName || "Job Request"}</p>
                                                                <p className="text-[9px] text-gray-400 font-bold">
                                                                    {task.createdAt ? format(task.createdAt.toDate(), "MMM dd") : "No date"} · Job Request
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <ChevronRight size={12} className="text-gray-300 group-hover:translate-x-0.5 transition-transform" />
                                                    </div>
                                                ))}
                                                {myTasks.testingItems.map(task => (
                                                    <div key={task.id} className="bg-white p-3 rounded-2xl border border-gray-100 flex items-center justify-between group hover:shadow-sm transition-all cursor-pointer" onClick={() => router.push(`/request/testing/${task.id}`)}>
                                                        <div className="flex items-center gap-3">
                                                            <div className="size-8 rounded-xl flex items-center justify-center bg-violet-50 text-violet-600">
                                                                <ClipboardCheck size={14} />
                                                            </div>
                                                            <div>
                                                                <p className="text-[11px] font-black text-gray-900 uppercase truncate max-w-[120px]">{task.productName || "Testing"}</p>
                                                                <p className="text-[9px] text-gray-400 font-bold">
                                                                    {task.targetDate ? format(task.targetDate.toDate(), "MMM dd") : "No date"} · Testing
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <ChevronRight size={12} className="text-gray-300 group-hover:translate-x-0.5 transition-transform" />
                                                    </div>
                                                ))}
                                            </>
                                        )}
                                    </div>
                                ) : activeTab === "Schedule" ? (
                                    <div className="space-y-4">
                                        {/* TODAY */}
                                        <div className="space-y-2">
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Today</p>
                                            {scheduleData.today.length > 0 ? (
                                                scheduleData.today.map(item => (
                                                    <div key={item.id} className="bg-white p-3 rounded-2xl border border-gray-100 flex items-center justify-between group hover:shadow-sm transition-all">
                                                        <div className="flex items-center gap-3">
                                                            <div className={cn("size-8 rounded-xl flex items-center justify-center", item.type === "Site Visit" ? "bg-blue-50 text-blue-600" : "bg-violet-50 text-violet-600")}>
                                                                {item.type === "Site Visit" ? <CalendarCheck size={14} /> : <ClipboardCheck size={14} />}
                                                            </div>
                                                            <div>
                                                                <p className="text-[11px] font-black text-gray-900 uppercase truncate max-w-[120px]">{item.title}</p>
                                                                <p className="text-[9px] text-gray-400 font-bold">{format(item.date, "HH:mm")} · {item.type}</p>
                                                            </div>
                                                        </div>
                                                        <ChevronRight size={12} className="text-gray-300 group-hover:translate-x-0.5 transition-transform" />
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="p-4 bg-gray-50/50 rounded-2xl border border-dashed border-gray-100 text-center">
                                                    <p className="text-[9px] font-black text-gray-300 uppercase">No items today</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* UPCOMING */}
                                        <div className="space-y-2">
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Upcoming</p>
                                            {scheduleData.upcoming.length > 0 ? (
                                                scheduleData.upcoming.slice(0, 3).map(item => (
                                                    <div key={item.id} className="bg-white p-3 rounded-2xl border border-gray-100 flex items-center justify-between group hover:shadow-sm transition-all">
                                                        <div className="flex items-center gap-3">
                                                            <div className={cn("size-8 rounded-xl flex items-center justify-center", item.type === "Site Visit" ? "bg-blue-50 text-blue-600" : "bg-violet-50 text-violet-600")}>
                                                                {item.type === "Site Visit" ? <CalendarCheck size={14} /> : <ClipboardCheck size={14} />}
                                                            </div>
                                                            <div>
                                                                <p className="text-[11px] font-black text-gray-900 uppercase truncate max-w-[120px]">{item.title}</p>
                                                                <p className="text-[9px] text-gray-400 font-bold">{format(item.date, "MMM dd")} · {item.type}</p>
                                                            </div>
                                                        </div>
                                                        <ChevronRight size={12} className="text-gray-300 group-hover:translate-x-0.5 transition-transform" />
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="p-4 bg-gray-50/50 rounded-2xl border border-dashed border-gray-100 text-center">
                                                    <p className="text-[9px] font-black text-gray-300 uppercase">No upcoming items</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : activeTab === "Job Requests" ? (
                                    <div className="grid grid-cols-2 gap-3">
                                        <ActivityCard label="Pending" value={notifications.jobRequest} icon={FileText} loading={isDataLoading} onClick={() => router.push("/request/job")} />
                                        <ActivityCard label="Messages" value={notifications.unreadByService.jobRequest} icon={MessageSquare} loading={isDataLoading} onClick={() => router.push("/request/job")} />
                                    </div>
                                ) : activeTab === "Site Visits" ? (
                                    <div className="grid grid-cols-2 gap-3">
                                        <ActivityCard label="Pending" value={notifications.siteVisit} icon={CalendarCheck} loading={isDataLoading} onClick={() => router.push("/appointments/site-visit")} />
                                        <ActivityCard label="Today" value={scheduleData.today.filter(i => i.type === "Site Visit").length} icon={Clock} loading={isDataLoading} onClick={() => router.push("/appointments/site-visit")} />
                                    </div>
                                ) : activeTab === "Product Requests" ? (
                                    <div className="grid grid-cols-2 gap-3">
                                        <ActivityCard label="Pending" value={notifications.productRequest} icon={Package} loading={isDataLoading} onClick={() => router.push("/request/product")} />
                                        <ActivityCard label="Messages" value={notifications.unreadByService.product || 0} icon={MessageSquare} loading={isDataLoading} onClick={() => router.push("/request/product")} />
                                    </div>
                                ) : activeTab === "Testing" ? (
                                    <div className="grid grid-cols-2 gap-3">
                                        <ActivityCard label="Active" value={notifications.testingActive} icon={ClipboardCheck} loading={isDataLoading} onClick={() => router.push("/request/testing")} />
                                        <ActivityCard label="Critical" value={notifications.testingOverdue} icon={AlertTriangle} loading={isDataLoading} isAlert={notifications.testingOverdue > 0} onClick={() => router.push("/request/testing")} />
                                    </div>
                                ) : (
                                    <div className="py-12 flex flex-col items-center justify-center bg-white rounded-2xl border border-dashed border-gray-200">
                                        <TrendingUp size={20} className="text-gray-200 mb-2" />
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{activeTab} Details Syncing...</p>
                                    </div>
                                )}

                                {/* User info strip */}
                                {!isDataLoading && userDetails.Department && (
                                    <div className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-3">
                                        <div className="size-9 rounded-xl bg-zinc-900 flex-shrink-0 overflow-hidden">
                                            {userDetails.profilePicture ? (
                                                <img src={userDetails.profilePicture} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-white font-black text-[10px]">
                                                    {userDetails.Firstname ? userDetails.Firstname.substring(0, 2).toUpperCase() : "EN"}
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[12px] font-black text-gray-900 truncate">{userDetails.Firstname}</p>
                                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">{userDetails.Position} · {userDetails.Department}</p>
                                        </div>
                                        <div className="ml-auto flex items-center gap-1.5 flex-shrink-0">
                                            <div className="size-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                            <span className="text-[9px] font-black text-gray-400 uppercase">Active</span>
                                        </div>
                                    </div>
                                )}
                            </section>

                            {/* My Tasks Section */}
                            {perms?.dashboard?.showMyTasks !== false && (
                                <div className="space-y-3 mt-6">
                                    <h2 className="text-lg font-bold text-gray-900 tracking-tight">My Tasks</h2>
                                    {(myTasks.siteVisits.length > 0 || myTasks.jobRequests.length > 0 || myTasks.testingItems.length > 0) ? (
                                        <div className="space-y-2">
                                            {myTasks.siteVisits.map(task => (
                                                <div key={task.id} className="bg-white p-3 rounded-2xl border border-gray-100 flex items-center justify-between group hover:shadow-sm transition-all">
                                                    <div className="flex items-center gap-3">
                                                        <div className="size-8 rounded-xl flex items-center justify-center bg-blue-50 text-blue-600">
                                                            <CalendarCheck size={14} />
                                                        </div>
                                                        <div>
                                                            <p className="text-[11px] font-black text-gray-900 uppercase truncate max-w-[120px]">{task.client || "Site Visit"}</p>
                                                            <p className="text-[9px] text-gray-400 font-bold">{format(task.appointmentDate.toDate(), "MMM dd, HH:mm")} · Site Visit</p>
                                                        </div>
                                                    </div>
                                                    <ChevronRight size={12} className="text-gray-300 group-hover:translate-x-0.5 transition-transform" />
                                                </div>
                                            ))}
                                            {myTasks.jobRequests.map(task => (
                                                <div key={task.id} className="bg-white p-3 rounded-2xl border border-gray-100 flex items-center justify-between group hover:shadow-sm transition-all">
                                                    <div className="flex items-center gap-3">
                                                        <div className="size-8 rounded-xl flex items-center justify-center bg-orange-50 text-orange-600">
                                                            <FileText size={14} />
                                                        </div>
                                                        <div>
                                                            <p className="text-[11px] font-black text-gray-900 uppercase truncate max-w-[120px]">{task.projectName || "Job Request"}</p>
                                                            <p className="text-[9px] text-gray-400 font-bold">{format(task.createdAt.toDate(), "MMM dd, HH:mm")} · Job Request</p>
                                                        </div>
                                                    </div>
                                                    <ChevronRight size={12} className="text-gray-300 group-hover:translate-x-0.5 transition-transform" />
                                                </div>
                                            ))}
                                            {myTasks.testingItems.map(task => (
                                                <div key={task.id} className="bg-white p-3 rounded-2xl border border-gray-100 flex items-center justify-between group hover:shadow-sm transition-all">
                                                    <div className="flex items-center gap-3">
                                                        <div className="size-8 rounded-xl flex items-center justify-center bg-violet-50 text-violet-600">
                                                            <ClipboardCheck size={14} />
                                                        </div>
                                                        <div>
                                                            <p className="text-[11px] font-black text-gray-900 uppercase truncate max-w-[120px]">{task.productName || "Testing Item"}</p>
                                                            <p className="text-[9px] text-gray-400 font-bold">{format(task.targetDate.toDate(), "MMM dd, HH:mm")} · Testing</p>
                                                        </div>
                                                    </div>
                                                    <ChevronRight size={12} className="text-gray-300 group-hover:translate-x-0.5 transition-transform" />
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="py-10 flex flex-col items-center justify-center bg-white/60 rounded-2xl border border-dashed border-gray-200">
                                            <Activity size={22} className="text-gray-200 mb-2" />
                                            <p className="text-[10px] font-bold text-gray-400 uppercase">No tasks assigned</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </main>

                    {/* ── FLOATING ACTION BUTTON (New) ── */}
                    <FloatingActionButton department={userDept || ""} userId={userId} />

                    {/* ── DASHBOARD GUIDE / FEATURES TUTORIAL ── */}
                    <DashboardGuide department={userDept || ""} role={userRole || "MEMBER"} />
                </SidebarInset>
            </SidebarProvider>
            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </ProtectedPageWrapper>
    )
}