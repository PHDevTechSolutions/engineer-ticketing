"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { db, getMessagingInstance } from "@/lib/firebase"; 
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { getToken, onMessage } from "firebase/messaging"; // Added onMessage
import { toast } from "sonner";
import { BellOff, CheckCircle2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [isMounted, setIsMounted] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [debugLogs, setDebugLogs] = useState<string[]>([]);

    const addLog = (msg: string) => {
        setDebugLogs(prev => [msg, ...prev].slice(0, 5));
        console.log(`[PushDebug] ${msg}`);
    };

    useEffect(() => {
        setIsMounted(true);
        
        // Setup Foreground Listener
        const setupForegroundListener = async () => {
            const messaging = await getMessagingInstance();
            if (messaging) {
                // This catches the notification while the app is OPEN
                onMessage(messaging, (payload) => {
                    addLog("Foreground Message Received!");
                    toast.success(payload.notification?.title || "New Message", {
                        description: payload.notification?.body,
                    });
                });
            }
        };

        if (typeof window !== "undefined" && "Notification" in window) {
            navigator.serviceWorker.getRegistration().then(reg => {
                reg?.pushManager.getSubscription().then(sub => setIsSubscribed(!!sub));
            });
            setupForegroundListener();
        }
    }, []);

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

            if (!fcmToken) throw new Error("Token failed");

            addLog("Saving to Main Firestore...");
            await setDoc(doc(db, "users", userId), {
                fcmToken,
                notificationsEnabled: true,
                updatedAt: serverTimestamp(),
                platform: "web-ios"
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
                            <span className="text-[10px] font-black uppercase tracking-tight text-gray-900">{isSubscribed ? "Active" : "Inactive"}</span>
                            <span className="text-[9px] font-bold text-gray-400 uppercase">Push Status</span>
                        </div>
                        <button onClick={handleSyncPush} disabled={isSyncing} className={cn("ml-2 p-2 rounded-xl text-gray-400", isSyncing && "animate-spin")}>
                            <RefreshCw size={16} />
                        </button>
                    </div>
                    {debugLogs.length > 0 && (
                        <div className="bg-black/90 text-[9px] text-green-400 p-3 rounded-xl font-mono border border-white/10 backdrop-blur-md">
                            {debugLogs.map((log, i) => <div key={i}>{`> ${log}`}</div>)}
                        </div>
                    )}
                </div>
            )}
            {children}
        </>
    );
}