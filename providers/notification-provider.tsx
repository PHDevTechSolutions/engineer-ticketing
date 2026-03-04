"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { db, getMessagingInstance } from "@/lib/firebase"; 
import { collection, query, where, onSnapshot, limit, doc, updateDoc } from "firebase/firestore";
import { getToken, onMessage } from "firebase/messaging";
import { subscribeUserToPush } from "@/lib/push-subscription";
import { toast } from "sonner";
import { X, ExternalLink, BellRing, BellOff, CheckCircle2, RefreshCw, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const playedIdsRef = useRef<string[]>([]);
    const pathname = usePathname();
    
    // Status & Hydration States
    const [isMounted, setIsMounted] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
    const [isSyncing, setIsSyncing] = useState(false);
    const [debugLogs, setDebugLogs] = useState<string[]>([]);

    const addLog = (msg: string) => {
        setDebugLogs(prev => [msg, ...prev].slice(0, 5));
        console.log(`[PushDebug] ${msg}`);
    };

    // Fix React #418 by ensuring we only render UI on the client
    useEffect(() => {
        setIsMounted(true);
        if ("Notification" in window) {
            setPermission(Notification.permission);
            navigator.serviceWorker.getRegistration().then(reg => {
                reg?.pushManager.getSubscription().then(sub => setIsSubscribed(!!sub));
            });
        }
    }, []);

    const handleSyncPush = async () => {
        const userId = localStorage.getItem("userId");
        if (!userId) return addLog("Error: No userId");

        setIsSyncing(true);
        addLog("Syncing...");

        try {
            const messaging = await getMessagingInstance();
            if (!messaging) throw new Error("Messaging not supported/initialized");

            addLog("Registering SW...");
            await navigator.serviceWorker.register("/firebase-messaging-sw.js");
            
            const auth = await Notification.requestPermission();
            setPermission(auth);

            if (auth === "granted") {
                addLog("Getting Token...");
                const fcmToken = await getToken(messaging, {
                    vapidKey: process.env.NEXT_PUBLIC_VAPID_KEY?.trim(), // Clean spaces
                });

                if (!fcmToken) throw new Error("FCM Token failed");
                addLog("Token OK.");

                const subscription = await subscribeUserToPush();

                addLog("Saving to DB...");
                await updateDoc(doc(db, "users", userId), {
                    pushSubscription: subscription ? JSON.parse(JSON.stringify(subscription)) : null,
                    fcmToken,
                    notificationsEnabled: true,
                    lastPushSync: new Date().toISOString()
                });

                setIsSubscribed(true);
                addLog("Sync Success!");
                toast.success("Notifications Active");
            }
        } catch (err: any) {
            addLog(`FAILED: ${err.message}`);
            toast.error(`Sync Error: ${err.message}`);
        } finally {
            setIsSyncing(false);
        }
    };

    // Foreground listener
    useEffect(() => {
        if (!isMounted) return;
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
    }, [isMounted]);

    if (!isMounted) return <>{children}</>;

    return (
        <>
            {pathname === "/dashboard" && (
                <div className="fixed bottom-6 left-6 z-50 flex flex-col gap-2">
                    <div className={cn("flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-xl bg-white", isSubscribed ? "border-green-100" : "border-red-100")}>
                        <div className={cn("size-8 rounded-full flex items-center justify-center", isSubscribed ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600")}>
                            {isSubscribed ? <CheckCircle2 size={18} /> : <BellOff size={18} />}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-tight text-gray-900">{isSubscribed ? "Active" : "Inactive"}</span>
                            <span className="text-[9px] font-bold text-gray-400 uppercase">{permission}</span>
                        </div>
                        <button onClick={handleSyncPush} disabled={isSyncing} className={cn("ml-2 p-2 rounded-xl text-gray-400", isSyncing && "animate-spin")}>
                            <RefreshCw size={16} />
                        </button>
                    </div>
                    {debugLogs.length > 0 && (
                        <div className="bg-black/90 text-[9px] text-green-400 p-3 rounded-xl font-mono border border-white/10">
                            {debugLogs.map((log, i) => <div key={i}>{`> ${log}`}</div>)}
                        </div>
                    )}
                </div>
            )}
            {children}
        </>
    );
}