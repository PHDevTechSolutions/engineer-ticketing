"use client";

import * as React from "react";
import { useEffect, useState, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { 
    Search, Loader2, MessageSquare, ChevronLeft, Hash, 
    LayoutGrid, Lightbulb, FileText, Hammer, Layers, 
    Sparkles, Bell, Clock, Filter, ExternalLink, Activity,
    Users, Settings2
} from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { cn } from "@/lib/utils";

// Components
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import ProtectedPageWrapper from "../../components/protected-page-wrapper";
import { PageHeader } from "@/components/page-header";
import { CollaborationHub } from "@/components/collaboration-hub";

const COLLECTIONS = [
    { id: "dialux_requests", label: "DIALux", icon: Lightbulb, color: "text-amber-500", bg: "bg-amber-50" },
    { id: "job_requests", label: "Job Requests", icon: Hammer, color: "text-blue-500", bg: "bg-blue-50" },
    { id: "shop_drawing_requests", label: "Shop Drawings", icon: Layers, color: "text-emerald-500", bg: "bg-emerald-50" },
    { id: "other_requests", label: "Others", icon: FileText, color: "text-slate-500", bg: "bg-slate-50" }
];

const formatRelativeTime = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 84400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

function MessagesContent() {
    const searchParams = useSearchParams();
    const initialId = searchParams?.get('id');
    
    const [userId, setUserId] = useState<string | null>(null);
    const [userData, setUserData] = useState<any>(null);
    const [allRequests, setAllRequests] = useState<any[]>([]);
    const [selectedRequest, setSelectedRequest] = useState<{id: string, coll: string} | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterCategory, setFilterCategory] = useState<string>("all");

    const getProjectLink = (coll: string, id: string) => {
        const path = coll.replace('_requests', '').replace('_', '-');
        return `/request/${path}/${id}`;
    };

    // User Data Initialization
    useEffect(() => {
        const storedId = localStorage.getItem("userId");
        setUserId(storedId);
        if (storedId) {
            fetch(`/api/user?id=${encodeURIComponent(storedId)}`)
                .then(res => res.json())
                .then(data => setUserData(data))
                .catch(console.error);
        }
    }, []);

    // Real-time Firestore Sync
    useEffect(() => {
        if (!db || !userId) return;

        const unsubscribes = COLLECTIONS.map(coll => {
            return onSnapshot(collection(db, coll.id), (snapshot) => {
                setAllRequests(prev => {
                    const others = prev.filter(p => p.sourceCollection !== coll.id);
                    const current = snapshot.docs.map(d => {
                        const data = d.data();
                        const unreadCount = (data.messages || []).filter((m: any) => 
                            m.senderId !== userId && !m.seenBy?.includes(userId)
                        ).length;

                        const lastMessageTime = data.messages?.length > 0 
                            ? data.messages[data.messages.length - 1].timestamp 
                            : null;
                        
                        const sortDate = lastMessageTime || data.updatedAt || 0;

                        return {
                            id: d.id,
                            shortId: d.id.slice(-6).toUpperCase(),
                            sourceCollection: coll.id,
                            unreadCount,
                            sortKey: sortDate?.seconds ? sortDate.seconds * 1000 : new Date(sortDate).getTime(),
                            lastUpdated: sortDate,
                            ...data
                        };
                    });

                    const merged = [...others, ...current].sort((a, b) => b.sortKey - a.sortKey);
                    
                    if (initialId && !selectedRequest) {
                        const target = merged.find(r => r.id === initialId);
                        if (target) setSelectedRequest({id: target.id, coll: target.sourceCollection});
                    }
                    return merged;
                });
            });
        });

        return () => unsubscribes.forEach(unsub => unsub());
    }, [userId, initialId, selectedRequest]);

    const filteredRequests = useMemo(() => {
        return allRequests.filter(req => {
            const matchesSearch = (req.projectName?.toLowerCase() || "").includes(searchTerm.toLowerCase()) || 
                                 (req.shortId || "").toLowerCase().includes(searchTerm.toLowerCase());
            
            if (filterCategory === "unread") return matchesSearch && req.unreadCount > 0;
            if (filterCategory !== "all") return matchesSearch && req.sourceCollection === filterCategory;
            return matchesSearch;
        });
    }, [allRequests, searchTerm, filterCategory]);

    const activeData = useMemo(() => 
        allRequests.find(r => r.id === selectedRequest?.id),
    [allRequests, selectedRequest]);

    const activeCategory = COLLECTIONS.find(c => c.id === activeData?.sourceCollection);

    return (
        <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden bg-white">
            {/* Sidebar List */}
            <aside className={cn(
                "w-full md:w-[380px] lg:w-[420px] border-r border-slate-100 flex flex-col shrink-0 bg-[#F9FAFB] transition-all duration-300",
                selectedRequest ? "hidden md:flex" : "flex"
            )}>
                <div className="p-5 pb-3 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Collaboration Clusters</h2>
                            <p className="text-[13px] font-bold text-slate-900 mt-1">Workspace Activity</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button className="p-2 hover:bg-slate-200 rounded-lg transition-colors relative">
                                <Bell size={16} className="text-slate-600" />
                                {allRequests.some(r => r.unreadCount > 0) && (
                                    <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-blue-600 border-2 border-[#F9FAFB]" />
                                )}
                            </button>
                        </div>
                    </div>
                    
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                        <input 
                            placeholder="Find project or ID..." 
                            className="w-full pl-11 h-11 rounded-2xl border-none bg-white shadow-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-600 outline-none text-sm transition-all placeholder:text-slate-400"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                        <button
                            onClick={() => setFilterCategory("all")}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all shrink-0 border",
                                filterCategory === "all" ? "bg-slate-900 text-white border-slate-900 shadow-md" : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                            )}
                        >
                            <LayoutGrid size={12}/> All
                        </button>
                        <button
                            onClick={() => setFilterCategory("unread")}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all shrink-0 border",
                                filterCategory === "unread" ? "bg-blue-600 text-white border-blue-600 shadow-md" : "bg-white text-blue-600 border-blue-100 hover:bg-blue-50"
                            )}
                        >
                            <Sparkles size={12}/> Unread
                        </button>
                        <div className="w-px h-6 bg-slate-200 mx-1 self-center shrink-0" />
                        {COLLECTIONS.map((coll) => (
                            <button
                                key={coll.id}
                                onClick={() => setFilterCategory(coll.id)}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all shrink-0 border",
                                    filterCategory === coll.id ? "bg-white text-slate-900 border-slate-900 shadow-sm" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                                )}
                            >
                                <coll.icon size={12} className={coll.color} /> 
                                {coll.label.split(' ')[0]}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar px-3 pb-6 space-y-1">
                    {filteredRequests.length > 0 ? filteredRequests.map((req) => {
                        const isActive = selectedRequest?.id === req.id;
                        const category = COLLECTIONS.find(c => c.id === req.sourceCollection);
                        const lastMsg = req.messages?.[req.messages.length - 1];
                        
                        return (
                            <button 
                                key={req.id}
                                onClick={() => setSelectedRequest({id: req.id, coll: req.sourceCollection})}
                                className={cn(
                                    "w-full p-4 flex items-center gap-4 rounded-[24px] transition-all relative group mb-1",
                                    isActive ? "bg-blue-600 text-white shadow-xl shadow-blue-100 z-10" : "hover:bg-white text-slate-900"
                                )}
                            >
                                <div className={cn(
                                    "size-12 rounded-[16px] flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
                                    isActive ? "bg-white/20 backdrop-blur-md" : (category?.bg || "bg-slate-100")
                                )}>
                                    {category ? <category.icon size={20} className={isActive ? "text-white" : category.color} /> : <Hash size={18} />}
                                </div>
                                
                                <div className="flex-1 min-w-0 text-left">
                                    <div className="flex justify-between items-center mb-1">
                                        <h4 className="text-[13px] font-black truncate uppercase tracking-tight leading-none">
                                            {req.projectName || "Untitled Project"}
                                        </h4>
                                        <span className={cn("text-[9px] font-bold shrink-0 ml-2", isActive ? "text-blue-200" : "text-slate-400")}>
                                            {formatRelativeTime(req.lastUpdated)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 mb-1.5">
                                        {req.unreadCount > 0 && !isActive && (
                                            <div className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
                                        )}
                                        <span className={cn("text-[9px] font-bold font-mono px-2 py-0.5 rounded-md", isActive ? "bg-black/20 text-blue-100" : "bg-slate-100 text-slate-500")}>
                                            #{req.shortId}
                                        </span>
                                    </div>
                                    <p className={cn("text-[11px] truncate font-medium", isActive ? "text-blue-50 opacity-90" : "text-slate-500")}>
                                        {lastMsg ? (
                                            <span className="flex items-center gap-1">
                                                <span className="font-bold shrink-0 uppercase text-[9px]">{lastMsg.senderName.split(' ')[0]}:</span>
                                                <span className="truncate">"{lastMsg.text}"</span>
                                            </span>
                                        ) : "No activity recorded"}
                                    </p>
                                </div>
                            </button>
                        );
                    }) : (
                        <div className="flex flex-col items-center justify-center py-20 opacity-30">
                            <Filter size={40} className="text-slate-400" />
                            <p className="text-[10px] font-black uppercase mt-4 tracking-widest">No projects found</p>
                        </div>
                    )}
                </div>
            </aside>

            {/* Chat Content */}
            <main className={cn("flex-1 relative bg-white", !selectedRequest ? "hidden md:flex" : "flex")}>
                {selectedRequest && activeData ? (
                    <div className="flex flex-col w-full h-full animate-in slide-in-from-right-4 duration-300">
                        
                        {/* ADAPTIVE HEADER */}
                        <header className="flex flex-col border-b border-slate-100 bg-white/80 backdrop-blur-md z-20">
                            <div className="px-4 md:px-8 py-4 flex items-center justify-between">
                                <div className="flex items-center gap-4 min-w-0">
                                    <button 
                                        onClick={() => setSelectedRequest(null)} 
                                        className="md:hidden p-2.5 bg-slate-100 rounded-xl active:scale-95 transition-transform"
                                    >
                                        <ChevronLeft size={20}/>
                                    </button>
                                    
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-sm md:text-base font-black uppercase tracking-tight truncate text-slate-900">
                                                {activeData.projectName}
                                            </h3>
                                            <span className="hidden sm:inline-block px-2 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-black rounded-md border border-blue-100">
                                                V4.0
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 mt-0.5">
                                            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">#{activeData.shortId}</p>
                                            <div className="size-1 rounded-full bg-slate-300" />
                                            <span className={cn(
                                                "text-[9px] font-black uppercase px-2 py-0.5 rounded-full",
                                                activeData.status === "COMPLETED" ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-600"
                                            )}>
                                                {activeData.status}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="hidden lg:flex flex-col items-end mr-4">
                                        <span className="text-[8px] font-black text-slate-400 uppercase">Last Interaction</span>
                                        <span className="text-[10px] font-bold text-slate-700">{formatRelativeTime(activeData.lastUpdated)}</span>
                                    </div>
                                    <Link 
                                        href={getProjectLink(activeData.sourceCollection, activeData.id)}
                                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase hover:bg-blue-600 transition-all shadow-lg shadow-slate-200"
                                    >
                                        <span className="hidden sm:inline">Project</span> Details
                                        <ExternalLink size={12} />
                                    </Link>
                                </div>
                            </div>

                            {/* Secondary Metadata Bar (Desktop) */}
                            <div className="hidden md:flex px-8 py-2.5 bg-slate-50/50 border-t border-slate-100 items-center justify-between">
                                <div className="flex items-center gap-6">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-white rounded-lg shadow-sm">
                                            {activeCategory && <activeCategory.icon size={12} className={activeCategory.color} />}
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{activeCategory?.label} Cluster</span>
                                    </div>
                                    <div className="h-4 w-px bg-slate-200" />
                                    <div className="flex items-center gap-2">
                                        <Activity size={12} className="text-blue-500" />
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{activeData.messages?.length || 0} Total Actions</span>
                                    </div>
                                </div>
                                
                                <div className="flex -space-x-2">
                                    {activeData.messages?.slice(-4).map((m: any, i: number) => (
                                        <div key={i} className="size-6 rounded-full border-2 border-white bg-slate-200 overflow-hidden ring-1 ring-slate-100">
                                            <img 
                                                src={m.senderImage || `https://api.dicebear.com/7.x/initials/svg?seed=${m.senderName}`} 
                                                className="object-cover size-full" 
                                                alt="participant" 
                                            />
                                        </div>
                                    ))}
                                    {activeData.messages?.length > 4 && (
                                        <div className="size-6 rounded-full border-2 border-white bg-slate-900 flex items-center justify-center text-[7px] font-black text-white">
                                            +{activeData.messages.length - 4}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </header>

                        <div className="flex-1 relative overflow-hidden bg-[#FDFEFF]">
                            <CollaborationHub 
                                key={selectedRequest.id}
                                requestId={selectedRequest.id}
                                collectionName={selectedRequest.coll}
                                messages={activeData.messages || []}
                                currentUserId={userId || ""}
                                userName={`${userData?.Firstname || ''} ${userData?.Lastname || ''}`}
                                userRole={userData?.Position || "Staff"}
                                status={activeData.status || "PENDING"}
                                profilePicture={userData?.Image}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="hidden md:flex flex-col items-center justify-center w-full bg-[#FCFDFF] p-12 text-center">
                        <div className="relative mb-8">
                            <div className="absolute -inset-10 bg-blue-50 rounded-full blur-3xl animate-pulse" />
                            <div className="relative size-28 bg-white rounded-[40px] shadow-2xl shadow-blue-100 flex items-center justify-center border border-slate-50 rotate-3">
                                <MessageSquare size={40} className="text-blue-600" />
                            </div>
                            <div className="absolute -bottom-2 -right-2 size-10 bg-white rounded-2xl shadow-lg flex items-center justify-center border border-slate-50 -rotate-12">
                                <Sparkles size={18} className="text-amber-500" />
                            </div>
                        </div>
                        <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-[0.4em] mb-3">EngiConnect Hub</h3>
                        <p className="text-[11px] font-bold text-slate-400 uppercase max-w-[280px] leading-relaxed">
                            Select a project cluster from the sidebar to begin internal collaboration
                        </p>
                        
                        <div className="grid grid-cols-2 gap-3 mt-12 opacity-50">
                            {COLLECTIONS.slice(0, 4).map(c => (
                                <div key={c.id} className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-slate-100 shadow-sm">
                                    <c.icon size={12} className={c.color} />
                                    <span className="text-[9px] font-black uppercase">{c.label.split(' ')[0]}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

export default function InternalMessagesPage() {
    const [userId, setUserId] = useState<string | null>(null);
    useEffect(() => { setUserId(localStorage.getItem("userId")) }, []);

    return (
        <ProtectedPageWrapper>
            <SidebarProvider defaultOpen={false}>
                <AppSidebar userId={userId} />
                <SidebarInset className="bg-white min-h-screen">
                    <PageHeader 
                        title="Project Workspace" 
                        version="V4.0" 
                        showBackButton={true} 
                        trigger={<SidebarTrigger className="mr-2" />} 
                    />
                    <Suspense fallback={
                        <div className="h-screen flex flex-col items-center justify-center gap-4 bg-white">
                            <div className="relative">
                                <Loader2 className="animate-spin text-blue-600" size={40} />
                                <div className="absolute inset-0 blur-xl bg-blue-400/20 animate-pulse" />
                            </div>
                            <div className="flex flex-col items-center gap-1">
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-900">Syncing Database</span>
                                <span className="text-[8px] font-bold uppercase text-slate-400">Fetching cluster data...</span>
                            </div>
                        </div>
                    }>
                        <MessagesContent />
                    </Suspense>
                </SidebarInset>
            </SidebarProvider>
            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </ProtectedPageWrapper>
    );
}