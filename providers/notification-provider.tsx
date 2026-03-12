"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { db, getMessagingInstance } from "@/lib/firebase"; 
import { 
    doc, setDoc, serverTimestamp, getDoc 
} from "firebase/firestore";
import { getToken, onMessage } from "firebase/messaging";
import { toast } from "sonner";
import { X, BellRing, BellOff, CheckCircle2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { subscribeUserToPush } from "@/lib/push-subscription";

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const pathname = usePathname();
    
    const [isMounted, setIsMounted] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [showPrompt, setShowPrompt] = useState(false); 

    // --- HELPER: Reliable Unique Device ID ---
    const getDeviceId = () => {
        if (typeof window === "undefined") return "unknown";
        const ua = navigator.userAgent;
        const screen = `${window.screen.width}x${window.screen.height}`;
        return btoa(`${ua}-${screen}`).replace(/[/+=]/g, "").slice(0, 24);
    };

    useEffect(() => {
        setIsMounted(true);

        const checkSubscription = async () => {
            if (typeof window === "undefined") return;
            
            const userId = localStorage.getItem("userId");
            const deviceId = getDeviceId();

            try {
                // 1. Check Service Worker/Browser status
                const reg = await navigator.serviceWorker.getRegistration();
                const sub = await reg?.pushManager.getSubscription();
                const hasBrowserSub = !!sub;

                // 2. Check Firestore status for THIS specific device
                let hasDbSub = false;
                if (userId) {
                    const deviceRef = doc(db, "users", userId, "devices", deviceId);
                    const deviceSnap = await getDoc(deviceRef);
                    hasDbSub = deviceSnap.exists() && deviceSnap.data()?.notificationsEnabled !== false;
                }

                // If browser is subbed BUT database doesn't have this device, we aren't "Synced"
                const active = hasBrowserSub && hasDbSub;
                setIsSubscribed(active);

                // Show prompt if not fully synced and on dashboard
                if (!active && pathname === "/dashboard") {
                    setTimeout(() => setShowPrompt(true), 1500);
                }
            } catch (err) {
                console.error("Check subscription error:", err);
            }
        };

        checkSubscription();

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

        const department = localStorage.getItem("department")?.toUpperCase();
        if (department === "ENGINEERING" && !audioRef.current) {
            audioRef.current = new Audio("/sounds/ticket-endorsed.mp3");
            audioRef.current.load();
        }
    }, [pathname]);

    const handleSyncPush = async () => {
        const userId = localStorage.getItem("userId");
        if (!userId) return toast.error("Error: Please re-login to sync notifications.");

        setIsSyncing(true);

        try {
            const messaging = await getMessagingInstance();
            if (!messaging) throw new Error("Messaging unsupported");

            await navigator.serviceWorker.register("/firebase-messaging-sw.js");
            
            const permission = await Notification.requestPermission();
            if (permission !== "granted") throw new Error("Permission denied");

            const fcmToken = await getToken(messaging, {
                vapidKey: process.env.NEXT_PUBLIC_VAPID_KEY?.trim(),
            });

            const fullSubscription = await subscribeUserToPush();
            const deviceId = getDeviceId();

            // --- DATABASE SYNC ---
            const deviceRef = doc(db, "users", userId, "devices", deviceId);
            
            await setDoc(deviceRef, {
                fcmToken,
                pushSubscription: fullSubscription ? JSON.parse(JSON.stringify(fullSubscription)) : null,
                platform: navigator.platform,
                userAgent: navigator.userAgent,
                lastPushSync: serverTimestamp(),
                notificationsEnabled: true,
            }, { merge: true });

            setIsSubscribed(true);
            setShowPrompt(false); 
            toast.success("This device is now synced for notifications!");
        } catch (err: any) {
            toast.error(`Sync Error: ${err.message}`);
        } finally {
            setIsSyncing(false);
        }
    };

    if (!isMounted) return <>{children}</>;

    return (
        <>
            {showPrompt && !isSubscribed && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-[380px] rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="relative p-8 flex flex-col items-center text-center">
                            <button onClick={() => setShowPrompt(false)} className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X size={20} className="text-gray-400" />
                            </button>

                            <div className="relative mb-6">
                                <div className="absolute -inset-4 bg-[#E33636]/10 rounded-full blur-xl" />
                                <div className="h-20 w-20 rounded-[2rem] bg-white border border-gray-100 shadow-xl flex items-center justify-center relative">
                                    <BellRing size={32} className="text-[#0F172A]" />
                                    <div className="absolute -top-1 -right-1 size-4 bg-[#E33636] rounded-full border-4 border-white animate-pulse" />
                                </div>
                            </div>

                            <h3 className="text-xl font-black text-[#0F172A] uppercase tracking-tight leading-tight mb-2">Sync This Device</h3>
                            <p className="text-xs font-medium text-gray-400 leading-relaxed mb-8 px-4">
                                Enable notifications on this device to receive real-time updates along with your other logged-in devices.
                            </p>

                            <div className="w-full space-y-3">
                                <button 
                                    onClick={handleSyncPush}
                                    disabled={isSyncing}
                                    className="w-full bg-[#E33636] hover:bg-[#c42d2d] text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-red-100 disabled:opacity-50"
                                >
                                    {isSyncing ? <RefreshCw size={18} className="animate-spin" /> : <>Sync Device <CheckCircle2 size={18} /></>}
                                </button>
                                <button onClick={() => setShowPrompt(false)} className="w-full bg-transparent text-gray-400 text-[10px] font-bold uppercase tracking-widest py-2 hover:text-gray-600">
                                    Maybe Later
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
                            <span className="text-[10px] font-black uppercase text-gray-900">{isSubscribed ? "Device Synced" : "Device Unsynced"}</span>
                            <span className="text-[9px] font-bold text-gray-400 uppercase">Multi-Device Push</span>
                        </div>
                    </div>
                </div>
            )}
            {children}
        </>
    );
}