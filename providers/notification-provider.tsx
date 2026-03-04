"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { db, getMessagingInstance } from "@/lib/firebase"; 
import { 
    collection, query, where, onSnapshot, limit, 
    doc, setDoc, serverTimestamp 
} from "firebase/firestore";
import { getToken, onMessage } from "firebase/messaging";
import { toast } from "sonner";
import { X, ExternalLink, BellRing, BellOff, CheckCircle2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const playedIdsRef = useRef<string[]>([]);
    const pathname = usePathname();
    
    const [isMounted, setIsMounted] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [debugLogs, setDebugLogs] = useState<string[]>([]);

    const addLog = (msg: string) => {
        setDebugLogs(prev => [msg, ...prev].slice(0, 5));
        console.log(`[PushDebug] ${msg}`);
    };

    // --- 1. INITIALIZATION & FOREGROUND LISTENERS ---
    useEffect(() => {
        setIsMounted(true);
        const department = localStorage.getItem("department")?.toUpperCase();

        if (typeof window !== "undefined" && "Notification" in window) {
            // Check existing subscription status
            navigator.serviceWorker.getRegistration().then(reg => {
                reg?.pushManager.getSubscription().then(sub => setIsSubscribed(!!sub));
            });

            // Setup Foreground Push Listener
            getMessagingInstance().then(messaging => {
                if (messaging) {
                    onMessage(messaging, (payload) => {
                        addLog("Foreground Push Received");
                        toast.info(payload.notification?.title || "New Update", {
                            description: payload.notification?.body,
                            icon: <BellRing className="size-4" />
                        });
                    });
                }
            });
        }

        // Initialize Audio for Shop Drawing Alerts
        if (department === "ENGINEERING" && !audioRef.current) {
            audioRef.current = new Audio("/sounds/ticket-endorsed.mp3");
            audioRef.current.load();
        }
    }, []);

    // --- 2. LIVE LEDGER LISTENER (Shop Drawings) ---
    useEffect(() => {
        const department = localStorage.getItem("department")?.toUpperCase();
        if (department !== "ENGINEERING") return;

        addLog("Starting Live Ledger Listener...");
        const q = query(
            collection(db, "shop_drawing_requests"),
            where("department", "==", "ENGINEERING"),
            where("status", "==", "PENDING_REVIEW"),
            limit(10)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                    const docId = change.doc.id;
                    const data = change.doc.data();
                    if (!playedIdsRef.current.includes(docId)) {
                        showNewDrawingAlert(docId, data);
                        playedIdsRef.current.push(docId);
                    }
                }
            });
        }, (err) => addLog(`Ledger Error: ${err.message}`));

        return () => unsubscribe();
    }, [pathname]);

    // --- 3. RELIABLE SYNC LOGIC ---
    const handleSyncPush = async () => {
        const userId = localStorage.getItem("userId");
        if (!userId) return addLog("Error: No userId. Please re-login.");

        setIsSyncing(true);
        addLog("Syncing with Main Project...");

        try {
            const messaging = await getMessagingInstance();
            if (!messaging) throw new Error("Messaging unsupported");

            await navigator.serviceWorker.register("/firebase-messaging-sw.js");
            
            const permission = await Notification.requestPermission();
            if (permission !== "granted") throw new Error("Permission denied");

            const fcmToken = await getToken(messaging, {
                vapidKey: process.env.NEXT_PUBLIC_VAPID_KEY?.trim(),
            });

            if (!fcmToken) throw new Error("Token generation failed");

            addLog("Saving to Main Firestore...");
            // Use setDoc + merge to ensure the record is created/updated safely
            await setDoc(doc(db, "users", userId), {
                fcmToken,
                notificationsEnabled: true,
                updatedAt: serverTimestamp(),
                platform: "web-ios",
                lastPushSync: new Date().toISOString()
            }, { merge: true });

            setIsSubscribed(true);
            addLog("SUCCESS: Device Synced!");
            toast.success("Notifications Active");
        } catch (err: any) {
            addLog(`FAILED: ${err.message}`);
            toast.error(`Sync Error: ${err.message}`);
        } finally {
            setIsSyncing(false);
        }
    };

    const showNewDrawingAlert = (id: string, data: any) => {
        audioRef.current?.play().catch(() => {});
        toast.custom((t) => (
            <div className="bg-white border border-gray-100 p-5 rounded-[1.5rem] shadow-xl flex flex-col gap-5 min-w-[340px] animate-in fade-in slide-in-from-right-4">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        <div className="bg-[#E33636] p-2 rounded-2xl shadow-lg shadow-red-200">
                            <BellRing size={18} className="text-white" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[#0F172A] text-xs font-black uppercase">New Drawing Request</span>
                            <span className="text-gray-400 text-[10px]">Engineering Dept</span>
                        </div>
                    </div>
                    <button onClick={() => toast.dismiss(t)} className="p-1 hover:bg-gray-50 rounded-full">
                        <X size={18} className="text-gray-300" />
                    </button>
                </div>
                <div className="bg-[#F8FAFC] p-4 rounded-2xl border border-gray-50">
                    <span className="text-gray-400 text-[9px] font-bold uppercase tracking-widest">Project Name</span>
                    <h4 className="text-[#0F172A] text-[16px] font-black leading-tight">{data.projectName || "Unnamed Project"}</h4>
                </div>
                <button 
                    onClick={() => { toast.dismiss(t); window.location.href = `/request/shop-drawing`; }}
                    className="w-full bg-[#0F172A] text-white text-[12px] font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg"
                >
                    Open Requests <ExternalLink size={14} />
                </button>
            </div>
        ), { duration: 8000, position: 'bottom-right' });
    };

    if (!isMounted) return <>{children}</>;

    return (
        <>
            {pathname === "/dashboard" && (
                <div className="fixed bottom-6 left-6 z-50 flex flex-col gap-2">
                    <div className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-xl bg-white",
                        isSubscribed ? "border-green-100" : "border-red-100"
                    )}>
                        <div className={cn("size-8 rounded-full flex items-center justify-center", isSubscribed ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600")}>
                            {isSubscribed ? <CheckCircle2 size={18} /> : <BellOff size={18} />}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-tight text-gray-900">{isSubscribed ? "Push Active" : "Push Inactive"}</span>
                            <span className="text-[9px] font-bold text-gray-400 uppercase">Device Status</span>
                        </div>
                        <button onClick={handleSyncPush} disabled={isSyncing} className={cn("ml-2 p-2 rounded-xl text-gray-400 transition-all", isSyncing && "animate-spin")}>
                            <RefreshCw size={16} />
                        </button>
                    </div>
                    {debugLogs.length > 0 && (
                        <div className="bg-black/90 text-[9px] text-green-400 p-3 rounded-xl font-mono border border-white/10 backdrop-blur-md max-w-xs">
                            {debugLogs.map((log, i) => <div key={i} className="truncate">{`> ${log}`}</div>)}
                        </div>
                    )}
                </div>
            )}
            {children}
        </>
    );
}