"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { db, messaging } from "@/lib/firebase"; 
import { collection, query, where, onSnapshot, limit, doc, updateDoc } from "firebase/firestore";
import { getToken, onMessage } from "firebase/messaging";
import { subscribeUserToPush } from "@/lib/push-subscription";
import { toast } from "sonner";
import { X, ExternalLink, BellRing, BellOff, CheckCircle2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const playedIdsRef = useRef<string[]>([]);
    const pathname = usePathname();
    
    // Status States
    const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
    const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
    const [isSyncing, setIsSyncing] = useState(false);

    // --- 1. CORE SYNC LOGIC ---
    const handleSyncPush = async () => {
        const userId = localStorage.getItem("userId");
        if (!userId) return;

        setIsSyncing(true);
        try {
            if (!("serviceWorker" in navigator)) return;

            // Register SW
            await navigator.serviceWorker.register("/firebase-messaging-sw.js");
            
            // Request Permission (This satisfies the iOS "User Gesture" rule)
            const auth = await Notification.requestPermission();
            setPermission(auth);

            if (auth === "granted") {
                const subscription = await subscribeUserToPush();
                let fcmToken = null;
                
                if (messaging) {
                    fcmToken = await getToken(messaging, {
                        vapidKey: process.env.NEXT_PUBLIC_VAPID_KEY,
                    });
                }

                const userRef = doc(db, "users", userId);
                await updateDoc(userRef, {
                    pushSubscription: subscription ? JSON.parse(JSON.stringify(subscription)) : null,
                    fcmToken: fcmToken,
                    notificationsEnabled: true,
                    lastPushSync: new Date().toISOString()
                });

                setIsSubscribed(!!subscription);
                toast.success("Push Notifications Active");
            }
        } catch (err) {
            console.error("Sync error:", err);
            toast.error("Failed to sync device");
        } finally {
            setIsSyncing(false);
        }
    };

    // --- 2. INITIALIZATION & FOREGROUND FCM ---
    useEffect(() => {
        const rawDept = localStorage.getItem("department");
        if (rawDept?.toUpperCase() !== "ENGINEERING") return;

        // Check current status on load
        if ("Notification" in window) {
            setPermission(Notification.permission);
            navigator.serviceWorker.getRegistration().then(reg => {
                reg?.pushManager.getSubscription().then(sub => setIsSubscribed(!!sub));
            });
        }

        if (messaging) {
            const unsubscribeOnMessage = onMessage(messaging, (payload) => {
                toast.info(payload.notification?.title || "New Update", {
                    description: payload.notification?.body,
                    icon: <BellRing className="size-4" />
                });
            });
            return () => unsubscribeOnMessage();
        }
    }, []);

    // --- 3. FIRESTORE LIVE LEDGER LISTENER (For Active App Use) ---
    useEffect(() => {
        const rawDept = localStorage.getItem("department");
        if (rawDept?.toUpperCase() !== "ENGINEERING") return;

        if (!audioRef.current) {
            audioRef.current = new Audio("/sounds/ticket-endorsed.mp3");
            audioRef.current.load();
        }

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
        });
        return () => unsubscribe();
    }, [pathname]);

    const showNewDrawingAlert = (id: string, data: any) => {
        audioRef.current?.play().catch(() => {});
        toast.custom((t) => (
            <div className="bg-white border border-gray-100 p-5 rounded-[1.5rem] shadow-[0_20px_50px_rgba(15,23,42,0.1)] flex flex-col gap-5 min-w-[340px] animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        <div className="bg-[#E33636] p-2 rounded-2xl shadow-lg shadow-red-200">
                            <BellRing size={18} className="text-white" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[#0F172A] text-xs font-black uppercase tracking-tight">New Drawing Request</span>
                            <span className="text-gray-400 text-[10px] font-medium">Engineering Dept</span>
                        </div>
                    </div>
                    <button onClick={() => toast.dismiss(t)} className="p-1 hover:bg-gray-50 rounded-full">
                        <X size={18} className="text-gray-300" />
                    </button>
                </div>
                <div className="bg-[#F8FAFC] p-4 rounded-2xl border border-gray-50">
                    <span className="text-gray-400 text-[9px] font-bold uppercase tracking-widest">Project Name</span>
                    <h4 className="text-[#0F172A] text-[16px] font-black tracking-tight leading-tight">{data.projectName || "Unnamed Project"}</h4>
                </div>
                <button 
                    onClick={() => { toast.dismiss(t); window.location.href = `/request/shop-drawing`; }}
                    className="w-full bg-[#0F172A] text-white text-[12px] font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98]"
                >
                    Open Requests <ExternalLink size={14} />
                </button>
            </div>
        ), { duration: 8000, position: 'bottom-right' });
    };

    // --- 4. STATUS UI ---
    const renderStatusBadge = () => {
        const rawDept = localStorage.getItem("department");
        if (rawDept?.toUpperCase() !== "ENGINEERING" || pathname !== "/dashboard") return null;

        return (
            <div className="fixed bottom-6 left-6 z-50 flex flex-col gap-2 pointer-events-auto">
                <div className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-xl transition-all bg-white",
                    isSubscribed ? "border-green-100" : "border-red-100"
                )}>
                    <div className={cn("size-8 rounded-full flex items-center justify-center", isSubscribed ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600")}>
                        {isSubscribed ? <CheckCircle2 size={18} /> : <BellOff size={18} />}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-tight text-gray-900">{isSubscribed ? "Push Active" : "Push Inactive"}</span>
                        <span className="text-[9px] font-bold text-gray-400 uppercase">{permission === "granted" ? "Permission: OK" : `Status: ${permission}`}</span>
                    </div>
                    <button onClick={handleSyncPush} disabled={isSyncing} className={cn("ml-2 p-2 rounded-xl hover:bg-gray-50 text-gray-400 transition-transform active:rotate-180", isSyncing && "animate-spin")}>
                        <RefreshCw size={16} />
                    </button>
                </div>
                {!isSubscribed && (
                    <p className="text-[8px] font-bold text-red-500 bg-red-50 px-3 py-1 rounded-full animate-pulse border border-red-100 self-start">
                        Tap refresh to sync iPhone notifications
                    </p>
                )}
            </div>
        );
    };

    return (
        <>
            {renderStatusBadge()}
            {children}
        </>
    );
}