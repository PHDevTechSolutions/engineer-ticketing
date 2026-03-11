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
import { X, ExternalLink, BellRing, BellOff, CheckCircle2, RefreshCw, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { subscribeUserToPush } from "@/lib/push-subscription";

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const playedIdsRef = useRef<string[]>([]);
    const pathname = usePathname();
    
    const [isMounted, setIsMounted] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [showPrompt, setShowPrompt] = useState(false);
    const [debugLogs, setDebugLogs] = useState<string[]>([]);

    const addLog = (msg: string) => {
        setDebugLogs(prev => [msg, ...prev].slice(0, 5));
        console.log(`[PushDebug] ${msg}`);
    };

    // --- 1. INITIALIZATION & iOS SAFE CHECK ---
    useEffect(() => {
        setIsMounted(true);
        const department = localStorage.getItem("department")?.toUpperCase();

        const checkSubscription = async () => {
            if (typeof window === "undefined") return;

            // iOS requires a Service Worker to be ready before checking pushManager
            if ("serviceWorker" in navigator) {
                try {
                    const registration = await navigator.serviceWorker.getRegistration();
                    if (registration) {
                        const sub = await registration.pushManager.getSubscription();
                        const active = !!sub;
                        setIsSubscribed(active);

                        // Trigger Popup if not subscribed and on Dashboard
                        if (!active && pathname === "/dashboard") {
                            setTimeout(() => setShowPrompt(true), 2000);
                        }
                    } else {
                        // No service worker yet, definitely not subscribed
                        if (pathname === "/dashboard") setShowPrompt(true);
                    }
                } catch (err) {
                    addLog("Sub Check Error: " + err);
                }
            }

            // Foreground Push Listener
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
        };

        checkSubscription();

        if (department === "ENGINEERING" && !audioRef.current) {
            audioRef.current = new Audio("/sounds/ticket-endorsed.mp3");
            audioRef.current.load();
        }
    }, [pathname]);

    // --- 2. SYNC LOGIC ---
    const handleSyncPush = async () => {
        const userId = localStorage.getItem("userId");
        if (!userId) return addLog("Error: No userId.");

        setIsSyncing(true);
        addLog("Syncing Device...");

        try {
            const messaging = await getMessagingInstance();
            if (!messaging) throw new Error("Push unsupported on this browser");

            // Register SW specifically for iOS/Mobile
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
            setShowPrompt(false);
            toast.success("Notifications Active");
        } catch (err: any) {
            addLog(`FAILED: ${err.message}`);
            toast.error(`Error: ${err.message}`);
        } finally {
            setIsSyncing(false);
        }
    };

    if (!isMounted) return <>{children}</>;

    return (
        <>
            {/* --- POPUP MODAL (Visible on iOS/Android/Desktop) --- */}
            {showPrompt && !isSubscribed && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-[380px] rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="relative p-8 flex flex-col items-center text-center">
                            <button onClick={() => setShowPrompt(false)} className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full">
                                <X size={20} className="text-gray-400" />
                            </button>

                            <div className="relative mb-6">
                                <div className="absolute -inset-4 bg-[#E33636]/10 rounded-full blur-xl" />
                                <div className="h-20 w-20 rounded-[2rem] bg-white border border-gray-100 shadow-xl flex items-center justify-center relative">
                                    <BellRing size={32} className="text-[#0F172A]" />
                                    <div className="absolute -top-1 -right-1 size-4 bg-[#E33636] rounded-full border-4 border-white animate-pulse" />
                                </div>
                            </div>

                            <h3 className="text-xl font-black text-[#0F172A] uppercase tracking-tight leading-tight mb-2">Stay Updated</h3>
                            <p className="text-xs font-medium text-gray-400 leading-relaxed mb-8 px-4">
                                Enable notifications to get real-time alerts for drawing requests on your mobile device.
                            </p>

                            <div className="w-full space-y-3">
                                <button 
                                    onClick={handleSyncPush}
                                    disabled={isSyncing}
                                    className="w-full bg-[#E33636] text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-red-100 disabled:opacity-50"
                                >
                                    {isSyncing ? <RefreshCw size={18} className="animate-spin" /> : "Enable Now"}
                                </button>
                                <button onClick={() => setShowPrompt(false)} className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Maybe Later</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {children}
        </>
    );
}