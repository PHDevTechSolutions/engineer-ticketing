"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar"
import ProtectedPageWrapper from "../../components/protected-page-wrapper";

import { 
    MessageSquare, ChevronLeft, Search, 
    Monitor, FileText, CalendarCheck, MoreHorizontal 
} from "lucide-react";

import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { cn } from "@/lib/utils";

// Custom Streetlight Icon for Shop Drawings
const StreetLightIcon = ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M7 22h3M9 22V7c0-2 1-3 3-3h5" /><path d="M15 4h5l1 2h-7l1-2z" /><path d="M17 9v1M14 8l-.5.5M20 8l.5.5" opacity="0.5" />
    </svg>
);

export default function InternalMessagesPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const requestId = searchParams.get('id') // Assumes you pass the request ID in the URL
    
    const [userId, setUserId] = useState<string | null>(null)
    const [messages, setMessages] = useState<any[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [projectName, setProjectName] = useState("")

    useEffect(() => {
        setUserId(localStorage.getItem("userId"))
    }, [])

    useEffect(() => {
        if (!db || !requestId) return;

        // Fetching from shop_drawing_requests because that is where your messages array lives
        const docRef = doc(db, "shop_drawing_requests", requestId);
        
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setProjectName(data.projectName || "Shop Drawing Request");
                
                // Access the 'messages' array field directly from the document
                const msgsArray = data.messages || [];

                // Sort by time (newest first for the inbox view)
                const sortedMsgs = [...msgsArray].sort((a, b) => {
                    const timeA = new Date(b.time).getTime();
                    const timeB = new Date(a.time).getTime();
                    return timeA - timeB;
                });

                setMessages(sortedMsgs);
            }
        }, (error) => {
            console.error("Firestore Error:", error);
        });

        return () => unsubscribe();
    }, [requestId]);

    const getServiceIcon = (role: string) => {
        switch (role?.toLowerCase()) {
            case 'it': return <Monitor size={18} />;
            case 'sales': return <FileText size={18} />;
            case 'engineering': return <StreetLightIcon size={18} />;
            default: return <MessageSquare size={18} />;
        }
    };

    const filteredMessages = messages.filter(msg => 
        msg.senderName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.role?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <ProtectedPageWrapper>
            <SidebarProvider defaultOpen={false}>
                <AppSidebar userId={userId} />
                <SidebarInset className="bg-[#F2F4F7] min-h-screen font-sans">
                    
                    <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-6 sticky top-0 z-50">
                        <div className="flex items-center gap-4">
                            <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-all">
                                <ChevronLeft size={24} />
                            </button>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900 leading-none truncate max-w-[200px] md:max-w-none">
                                    {projectName || "Internal Inbox"}
                                </h1>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Communication Hub</p>
                            </div>
                        </div>
                        <SidebarTrigger className="md:hidden" />
                    </header>

                    <main className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
                        
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input 
                                type="text"
                                placeholder="Search project messages or names..."
                                className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-medium"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="space-y-3">
                            {filteredMessages.length > 0 ? (
                                filteredMessages.map((msg, index) => (
                                    <div 
                                        key={msg.id || index} 
                                        className={cn(
                                            "bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-start gap-4 transition-all",
                                            msg.role === 'it' ? "border-l-4 border-l-blue-600" : "border-l-4 border-l-emerald-600"
                                        )}
                                    >
                                        <div className={cn(
                                            "size-12 rounded-xl flex items-center justify-center shrink-0",
                                            msg.role === 'it' ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"
                                        )}>
                                            {getServiceIcon(msg.role)}
                                        </div>
                                        
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[9px] font-black px-2 py-0.5 bg-gray-100 text-gray-500 rounded uppercase tracking-widest">
                                                        {msg.role || "Member"}
                                                    </span>
                                                </div>
                                                <span className="text-[10px] font-bold text-gray-400 whitespace-nowrap">
                                                    {msg.time ? new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                                                </span>
                                            </div>
                                            
                                            <h3 className="text-sm font-bold text-gray-900 truncate">
                                                {msg.senderName}
                                            </h3>
                                            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                                                {msg.text}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-20 flex flex-col items-center justify-center bg-white/50 rounded-3xl border border-dashed border-gray-200">
                                    <div className="size-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                        <MessageSquare size={24} className="text-gray-400" />
                                    </div>
                                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No messages found</p>
                                    <p className="text-[10px] text-gray-400 mt-2 italic px-8 text-center">
                                        Ensure the request ID is correct and messages exist in the database.
                                    </p>
                                </div>
                            )}
                        </div>
                    </main>

                </SidebarInset>
            </SidebarProvider>
            <style jsx global>{`.no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
        </ProtectedPageWrapper>
    )
}