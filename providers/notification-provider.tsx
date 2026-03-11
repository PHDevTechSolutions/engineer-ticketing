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
import { X, ExternalLink, BellRing, BellOff, CheckCircle2, RefreshCw, Smartphone, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { subscribeUserToPush } from "@/lib/push-subscription";

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const playedIdsRef = useRef<string[]>([]);
    const pathname = usePathname();
    
    const [isMounted, setIsMounted] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [showPrompt, setShowPrompt] = useState(false); // Controls the Modal
    const [debugLogs, setDebugLogs] = useState<string[]>([]);

    const addLog = (msg: string) => {
        setDebugLogs(prev => [msg, ...prev].slice(0, 5));
        console.log(`[PushDebug] ${msg}`);
    };

    // --- 1. INITIALIZATION ---
    useEffect(() => {
        setIsMounted(true);
        const department = localStorage.getItem("department")?.toUpperCase();

        if (typeof window !== "undefined" && "Notification" in window) {
            // Check existing subscription
            navigator.serviceWorker.getRegistration().then(reg => {
                reg?.pushManager.getSubscription().then(sub => {
                    const active = !!sub;
                    setIsSubscribed(active);
                    
                    // AUTO-SHOW POPUP: If on dashboard and not subscribed
                    if (!active && pathname === "/dashboard") {
                        setTimeout(() => setShowPrompt(true), 1500); // Slight delay for better UX
                    }
                });
            });

            getMessagingInstance().then(messaging => {
                if (messaging) {
                    onMessage(messaging, (payload) => {
                        toast.info(payload.notification?.title || "New Update", {
                            description: payload.notification?.body,
                            icon: <BellRing className="size-4" />
                        });
                    });
                }
            });
        }

        if (department === "ENGINEERING" && !audioRef.current) {
            audioRef.current = new Audio("/sounds/ticket-endorsed.mp3");
            audioRef.current.load();
        }
    }, [pathname]);

    // --- 2. SYNC LOGIC (Triggered by Popup or Manual Button) ---
    const handleSyncPush = async () => {
        const userId = localStorage.getItem("userId");
        if (!userId) return addLog("Error: No userId. Please re-login.");

        setIsSyncing(true);
        addLog("Requesting Permission...");

        try {
            const messaging = await getMessagingInstance();
            if (!messaging) throw new Error("Messaging unsupported");

            // Register service worker
            await navigator.serviceWorker.register("/firebase-messaging-sw.js");
            
            const permission = await Notification.requestPermission();
            if (permission !== "granted") throw new Error("Permission denied");

            const fcmToken = await getToken(messaging, {
                vapidKey: process.env.NEXT_PUBLIC_VAPID_KEY?.trim(),
            });

            const fullSubscription = await subscribeUserToPush();

            await setDoc(doc(db, "users", userId), {
                fcmToken,
                pushSubscription: JSON.parse(JSON.stringify(fullSubscription)),
                notificationsEnabled: true,
                updatedAt: serverTimestamp(),
                platform: "web-pwa",
                lastPushSync: new Date().toISOString()
            }, { merge: true });

            setIsSubscribed(true);
            setShowPrompt(false); // Close popup on success
            toast.success("Notifications Enabled!");
        } catch (err: any) {
            addLog(`FAILED: ${err.message}`);
            toast.error(`Sync Error: ${err.message}`);
        } finally {
            setIsSyncing(false);
        }
    };

    if (!isMounted) return <>{children}</>;

    return (
        <>
            {/* --- NEW POPUP MODAL --- */}
            {showPrompt && !isSubscribed && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-[380px] rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="relative p-8 flex flex-col items-center text-center">
                            {/* Close Button */}
                            <button 
                                onClick={() => setShowPrompt(false)}
                                className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X size={20} className="text-gray-400" />
                            </button>

                            {/* Icon Header */}
                            <div className="relative mb-6">
                                <div className="absolute -inset-4 bg-[#E33636]/10 rounded-full blur-xl" />
                                <div className="h-20 w-20 rounded-[2rem] bg-white border border-gray-100 shadow-xl flex items-center justify-center relative">
                                    <BellRing size={32} className="text-[#0F172A]" />
                                    <div className="absolute -top-1 -right-1 size-4 bg-[#E33636] rounded-full border-4 border-white animate-pulse" />
                                </div>
                            </div>

                            <h3 className="text-xl font-black text-[#0F172A] uppercase tracking-tight leading-tight mb-2">
                                Never Miss <br /> An Update
                            </h3>
                            <p className="text-xs font-medium text-gray-400 leading-relaxed mb-8 px-4">
                                Enable push notifications to receive real-time alerts for shop drawings and project updates on your device.
                            </p>

                            <div className="w-full space-y-3">
                                <button 
                                    onClick={handleSyncPush}
                                    disabled={isSyncing}
                                    className="w-full bg-[#E33636] hover:bg-[#c42d2d] text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-red-100 disabled:opacity-50"
                                >
                                    {isSyncing ? (
                                        <RefreshCw size={18} className="animate-spin" />
                                    ) : (
                                        <>Enable Notifications <CheckCircle2 size={18} /></>
                                    )}
                                </button>
                                
                                <button 
                                    onClick={() => setShowPrompt(false)}
                                    className="w-full bg-transparent text-gray-400 text-[10px] font-bold uppercase tracking-widest py-2 hover:text-gray-600 transition-colors"
                                >
                                    Maybe Later
                                </button>
                            </div>

                            {/* Platform indicators */}
                            <div className="mt-6 flex items-center gap-4 pt-6 border-t border-gray-50 w-full justify-center">
                                <div className="flex items-center gap-1.5 opacity-30">
                                    <Smartphone size={14} />
                                    <span className="text-[9px] font-black uppercase">iOS</span>
                                </div>
                                <div className="flex items-center gap-1.5 opacity-30">
                                    <Smartphone size={14} />
                                    <span className="text-[9px] font-black uppercase">Android</span>
                                </div>
                                <div className="flex items-center gap-1.5 opacity-30">
                                    <Smartphone size={14} />
                                    <span className="text-[9px] font-black uppercase">Desktop</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Status Indicator (Bottom Left) */}
            {pathname === "/dashboard" && (
                <div className="fixed bottom-6 left-6 z-30 flex flex-col gap-2">
                    <div className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-xl bg-white cursor-pointer hover:bg-gray-50 transition-colors",
                        isSubscribed ? "border-green-100" : "border-red-100"
                    )} onClick={() => !isSubscribed && setShowPrompt(true)}>
                        <div className={cn("size-8 rounded-full flex items-center justify-center", isSubscribed ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600")}>
                            {isSubscribed ? <CheckCircle2 size={18} /> : <BellOff size={18} />}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-tight text-gray-900">{isSubscribed ? "Push Active" : "Push Inactive"}</span>
                            <span className="text-[9px] font-bold text-gray-400 uppercase">Device Status</span>
                        </div>
                    </div>
                </div>
            )}
            
            {children}
        </>
    );
}