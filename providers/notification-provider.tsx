"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { db, getMessagingInstance } from "@/lib/firebase"; 
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { getToken, onMessage } from "firebase/messaging";
import { toast } from "sonner";
import { X, Bell, ShieldCheck, Info, ArrowRight } from "lucide-react";
import { subscribeUserToPush } from "@/lib/push-subscription";

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [isMounted, setIsMounted] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>("default");
    const [isAppReady, setIsAppReady] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        console.log("DEBUG: NotificationProvider mounted.");

        const checkReady = setInterval(() => {
            const isVerifying = document.body.getAttribute('data-verifying') === 'true';
            if (!isVerifying) {
                setIsAppReady(true);
                clearInterval(checkReady);
                console.log("DEBUG: App is ready (Verification finished).");
            }
        }, 150);

        if (typeof window !== "undefined" && "Notification" in window) {
            setPermissionStatus(Notification.permission);
            console.log("DEBUG: Current Notification Permission:", Notification.permission);

            navigator.serviceWorker.getRegistration().then(reg => {
                console.log("DEBUG: Service Worker Registration found:", !!reg);
                reg?.pushManager.getSubscription().then(sub => {
                    console.log("DEBUG: Existing Push Subscription found:", !!sub);
                    setIsSubscribed(!!sub);
                });
            });

            getMessagingInstance().then(messaging => {
                if (messaging) {
                    onMessage(messaging, (payload) => {
                        console.log("DEBUG: Foreground message received:", payload);
                        toast.info(payload.notification?.title || "New Message", {
                            description: payload.notification?.body,
                            icon: <Bell className="size-4 text-[#E33636]" />,
                        });
                    });
                }
            });
        } else {
            console.warn("DEBUG: Notifications NOT supported in this browser.");
        }
        return () => clearInterval(checkReady);
    }, []);

    const handleSubscribe = async () => {
        const userId = localStorage.getItem("userId");
        if (!userId) {
            console.error("DEBUG: No userId found in localStorage.");
            return toast.error("Please sign in to get alerts.");
        }

        console.log("DEBUG: Starting subscription for user:", userId);
        setIsSyncing(true);

        try {
            const messaging = await getMessagingInstance();
            if (!messaging) throw new Error("Browser doesn't support messaging.");
            console.log("DEBUG: Messaging instance retrieved.");

            console.log("DEBUG: Requesting permission...");
            const permission = await Notification.requestPermission();
            setPermissionStatus(permission);
            console.log("DEBUG: Permission result:", permission);

            if (permission !== "granted") throw new Error("Permission was not granted.");

            console.log("DEBUG: Waiting for Service Worker to be ready...");
            const registration = await navigator.serviceWorker.ready;
            console.log("DEBUG: Service Worker is ready.");

            console.log("DEBUG: Attempting to get FCM Token...");
            const fcmToken = await getToken(messaging, {
                vapidKey: process.env.NEXT_PUBLIC_VAPID_KEY?.trim(),
                serviceWorkerRegistration: registration,
            });

            if (!fcmToken) throw new Error("FCM Token generation failed.");
            console.log("DEBUG: FCM Token received:", fcmToken);

            console.log("DEBUG: Getting full push subscription object...");
            const fullSubscription = await subscribeUserToPush();
            console.log("DEBUG: Subscription object created.");

            console.log("DEBUG: Writing to Firestore...");
            await setDoc(doc(db, "users", userId), {
                fcmToken,
                pushSubscription: JSON.parse(JSON.stringify(fullSubscription)),
                notificationsEnabled: true,
                updatedAt: serverTimestamp(),
            }, { merge: true });

            console.log("DEBUG: Success! Database updated.");
            setIsSubscribed(true);
            toast.success("You're all set for alerts!");
        } catch (err: any) {
            console.error("DEBUG ERROR:", err);
            toast.error(err.message || "Something went wrong.");
        } finally {
            setIsSyncing(false);
            console.log("DEBUG: Subscription process ended.");
        }
    };

    if (!isMounted) return <>{children}</>;
    const showNotice = isAppReady && !isSubscribed && pathname === "/dashboard";

    return (
        <>
            {showNotice && (
                <div className="fixed inset-x-0 bottom-0 sm:inset-auto sm:top-8 sm:right-8 z-[100] p-4 sm:p-0 pointer-events-none">
                    <div className="bg-white/95 backdrop-blur-md w-full sm:w-[360px] pointer-events-auto rounded-[2.5rem] p-6 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.2)] flex flex-col border border-slate-100 animate-in slide-in-from-bottom-5 sm:slide-in-from-right-5 duration-700 ease-out">
                        
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-full border border-blue-100/50">
                                <ShieldCheck size={12} className="text-blue-600" />
                                <span className="text-[10px] font-bold uppercase tracking-wide text-blue-700">Safe & Secure</span>
                            </div>
                            <button onClick={() => setIsSubscribed(true)} className="p-1 text-slate-300 hover:text-slate-500 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex items-center gap-4 mb-6">
                            <div className="bg-[#0F172A] p-1 rounded-[1.2rem] shadow-xl overflow-hidden h-14 w-14 flex items-center justify-center border border-slate-700 shrink-0">
                                <img src="/icons/disruptive.png" alt="engiConnect Icon" className="h-full w-full object-cover" />
                            </div>
                            <div>
                                <h2 className="text-[20px] font-black text-[#0F172A] tracking-tight leading-none mb-1">
                                    engi<span className="text-[#E33636]">connect</span>
                                </h2>
                                <p className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">Stay in the loop</p>
                            </div>
                        </div>

                        <div className="space-y-4 mb-8">
                            <p className="text-slate-600 text-[14px] leading-relaxed font-medium">
                                Get a quick alert whenever a <span className="text-[#0F172A] font-bold underline decoration-[#E33636] decoration-2 underline-offset-4">Site Visit</span> is approved.
                            </p>
                        </div>

                        <button
                            onClick={handleSubscribe}
                            disabled={isSyncing}
                            className="group w-full py-4.5 bg-[#0F172A] hover:bg-slate-800 text-white rounded-[1.2rem] font-black text-[15px] transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-slate-200"
                        >
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