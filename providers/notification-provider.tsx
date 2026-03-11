"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { db, getMessagingInstance } from "@/lib/firebase"; 
import { 
    doc, setDoc, serverTimestamp, query, collection, where, limit, onSnapshot 
} from "firebase/firestore";
import { getToken, onMessage } from "firebase/messaging";
import { toast } from "sonner";
import { X, BellRing, CheckCircle2, RefreshCw, Smartphone } from "lucide-react";
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

    // --- 1. AUTO-DETECTION LOGIC ---
    useEffect(() => {
        setIsMounted(true);

        const checkStatusAndPrompt = async () => {
            if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

            try {
                // On iOS, we need to wait for the registration to be ready
                const reg = await navigator.serviceWorker.ready;
                const sub = await reg.pushManager.getSubscription();
                
                const active = !!sub;
                setIsSubscribed(active);

                // AUTO-SHOW: If on dashboard and not subscribed, show the modal
                if (!active && pathname === "/dashboard") {
                    // Small delay to ensure smooth entry after page load
                    setTimeout(() => setShowPrompt(true), 1500);
                }
            } catch (err) {
                console.error("Push check failed:", err);
            }
        };

        checkStatusAndPrompt();

        // Foreground Listener
        getMessagingInstance().then(messaging => {
            if (messaging) {
                onMessage(messaging, (payload) => {
                    toast.info(payload.notification?.title || "Update", {
                        description: payload.notification?.body,
                        icon: <BellRing className="size-4" />
                    });
                });
            }
        });

        const department = localStorage.getItem("department")?.toUpperCase();
        if (department === "ENGINEERING" && !audioRef.current) {
            audioRef.current = new Audio("/sounds/ticket-endorsed.mp3");
            audioRef.current.load();
        }
    }, [pathname]);

    // --- 2. SYNC LOGIC ---
    const handleSyncPush = async () => {
        const userId = localStorage.getItem("userId");
        if (!userId) return toast.error("Please re-login to enable notifications.");

        setIsSyncing(true);

        try {
            const messaging = await getMessagingInstance();
            if (!messaging) throw new Error("Notifications not supported");

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
                platform: "web-pwa-auto",
                lastPushSync: new Date().toISOString()
            }, { merge: true });

            setIsSubscribed(true);
            setShowPrompt(false);
            toast.success("Push Notifications Enabled!");
        } catch (err: any) {
            toast.error(`Sync Failed: ${err.message}`);
        } finally {
            setIsSyncing(false);
        }
    };

    if (!isMounted) return <>{children}</>;

    return (
        <>
            {/* --- MODAL PROMPT --- */}
            {showPrompt && !isSubscribed && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-[380px] rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="relative p-8 flex flex-col items-center text-center">
                            <button 
                                onClick={() => setShowPrompt(false)}
                                className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X size={20} className="text-gray-400" />
                            </button>

                            <div className="relative mb-6">
                                <div className="absolute -inset-4 bg-[#E33636]/10 rounded-full blur-xl" />
                                <div className="h-20 w-20 rounded-[2rem] bg-white border border-gray-100 shadow-xl flex items-center justify-center relative">
                                    <BellRing size={32} className="text-[#0F172A]" />
                                    <div className="absolute -top-1 -right-1 size-4 bg-[#E33636] rounded-full border-4 border-white animate-pulse" />
                                </div>
                            </div>

                            <h3 className="text-xl font-black text-[#0F172A] uppercase tracking-tight leading-tight mb-2">
                                Stay Updated
                            </h3>
                            <p className="text-xs font-medium text-gray-400 leading-relaxed mb-8 px-4">
                                Enable notifications to get real-time alerts for drawing requests on your device.
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
                        </div>
                    </div>
                </div>
            )}
            
            {children}
        </>
    );
}