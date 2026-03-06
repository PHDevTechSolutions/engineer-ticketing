"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { db, getMessagingInstance } from "@/lib/firebase"; 
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { getToken, onMessage } from "firebase/messaging";
import { toast } from "sonner";
import { X, Bell, ShieldCheck, Info, Smartphone, ArrowRight } from "lucide-react";
import { subscribeUserToPush } from "@/lib/push-subscription";

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [isMounted, setIsMounted] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>("default");

    // --- NEW: App Ready Logic ---
    // We check if we are currently in the middle of a "Verification" phase
    const [isAppReady, setIsAppReady] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        
        // Listen for the "Verification" to end
        // We give it a tiny delay to ensure the loading screen is fully gone
        const checkReady = setInterval(() => {
            if (document.body.getAttribute('data-verifying') !== 'true') {
                setIsAppReady(true);
                clearInterval(checkReady);
            }
        }, 100);

        if (typeof window !== "undefined" && "Notification" in window) {
            setPermissionStatus(Notification.permission);
            navigator.serviceWorker.getRegistration().then(reg => {
                reg?.pushManager.getSubscription().then(sub => setIsSubscribed(!!sub));
            });

            getMessagingInstance().then(messaging => {
                if (messaging) {
                    onMessage(messaging, (payload) => {
                        toast.info(payload.notification?.title || "New Message", {
                            description: payload.notification?.body,
                            icon: <Bell className="size-4 text-[#E33636]" />,
                        });
                    });
                }
            });
        }
        return () => clearInterval(checkReady);
    }, []);

    const handleSubscribe = async () => {
        const userId = localStorage.getItem("userId");
        if (!userId) return toast.error("Please sign in to continue.");
        setIsSyncing(true);
        try {
            const messaging = await getMessagingInstance();
            if (!messaging) throw new Error("This browser doesn't support notifications.");
            const permission = await Notification.requestPermission();
            setPermissionStatus(permission);
            if (permission !== "granted") throw new Error("Please allow notifications to get updates.");
            const fcmToken = await getToken(messaging, {
                vapidKey: process.env.NEXT_PUBLIC_VAPID_KEY?.trim(),
            });
            const fullSubscription = await subscribeUserToPush();
            await setDoc(doc(db, "users", userId), {
                fcmToken, pushSubscription: JSON.parse(JSON.stringify(fullSubscription)),
                notificationsEnabled: true, updatedAt: serverTimestamp(), platform: "standard-web",
            }, { merge: true });
            setIsSubscribed(true);
            toast.success("You're all set for updates!");
        } catch (err: any) {
            toast.error(err.message);
        } finally { setIsSyncing(false); }
    };

    if (!isMounted) return <>{children}</>;

    // --- FIX: Only show the alert if the App is Ready AND we aren't subscribed ---
    const showNotice = isAppReady && !isSubscribed && pathname === "/dashboard";

    return (
        <>
            {showNotice && (
                <div className="fixed inset-x-0 bottom-0 sm:inset-auto sm:top-8 sm:right-8 z-[100] p-4 sm:p-0 pointer-events-none">
                    <div className="bg-white w-full sm:w-[360px] pointer-events-auto rounded-[2.5rem] p-6 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.2)] flex flex-col border border-slate-100 animate-in slide-in-from-bottom-5 sm:slide-in-from-right-5 duration-700 ease-out">
                        
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-full border border-blue-100/50">
                                <ShieldCheck size={12} className="text-blue-600" />
                                <span className="text-[10px] font-bold uppercase tracking-wide text-blue-700">Safe & Secure</span>
                            </div>
                            <button onClick={() => setIsSubscribed(true)} className="p-1 text-slate-300 hover:text-slate-500"><X size={20} /></button>
                        </div>

                        <div className="flex items-center gap-4 mb-6">
                            <div className="bg-[#0F172A] p-4 rounded-[1.5rem] shadow-xl shrink-0"><Smartphone size={26} className="text-white" /></div>
                            <div>
                                <h2 className="text-[20px] font-black text-[#0F172A] tracking-tight leading-none mb-1">engi<span className="text-[#E33636]">connect</span></h2>
                                <p className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">Stay in the loop</p>
                            </div>
                        </div>

                        <div className="space-y-4 mb-8">
                            <p className="text-slate-600 text-[14px] leading-relaxed font-medium">
                                Get a quick ping on your phone or computer whenever a <span className="text-[#0F172A] font-bold underline decoration-[#E33636] decoration-2 underline-offset-4">Site Visit</span> is approved.
                            </p>
                            <div className="flex items-start gap-3 text-slate-400 bg-slate-50 p-3 rounded-2xl">
                                <Info size={16} className="shrink-0 mt-0.5" />
                                <p className="text-[11px] leading-snug">This works even if you don&apos;t have the website open.</p>
                            </div>
                        </div>

                        <button onClick={handleSubscribe} disabled={isSyncing} className="group w-full py-4.5 bg-[#0F172A] hover:bg-slate-800 text-white rounded-[1.2rem] font-black text-[15px] transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50">
                            {isSyncing ? "Setting things up..." : "Turn on Alerts"}
                            {!isSyncing && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
                        </button>
                    </div>
                </div>
            )}
            {children}
        </>
    );
}