"use client";

import React, { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { db, messaging } from "@/lib/firebase"; 
import { collection, query, where, onSnapshot, limit, doc, updateDoc, arrayUnion } from "firebase/firestore";
import { getToken, onMessage } from "firebase/messaging";
import { subscribeUserToPush } from "@/lib/push-subscription";
import { toast } from "sonner";
import { X, ExternalLink, BellRing } from "lucide-react";

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playedIdsRef = useRef<string[]>([]);
  const pathname = usePathname();

  // --- EFFECT 1: SERVICE WORKER & PUSH REGISTRATION ---
  useEffect(() => {
    const userId = localStorage.getItem("userId");
    const rawDept = localStorage.getItem("department");
    if (!userId || rawDept?.toUpperCase() !== "ENGINEERING") return;

    const setupPushNotifications = async () => {
      try {
        if ("serviceWorker" in navigator) {
          // 1. Register/Verify Service Worker
          const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
          console.log("Push Guard Active:", registration.scope);

          // 2. Request Permissions
          const permission = await Notification.requestPermission();
          if (permission !== "granted") {
            console.warn("Notification permission denied by user");
            return;
          }

          // 3. Get Browser Push Subscription
          const subscription = await subscribeUserToPush();

          // 4. Get FCM Token
          let fcmToken = null;
          if (messaging) {
            fcmToken = await getToken(messaging, {
              vapidKey: process.env.NEXT_PUBLIC_VAPID_KEY,
            });
          }

          // 5. Sync to Firestore
          const userRef = doc(db, "users", userId);
          const updateData: any = {
            notificationsEnabled: true,
            lastPushSync: new Date().toISOString()
          };

          if (subscription) updateData.pushSubscription = JSON.parse(JSON.stringify(subscription));
          if (fcmToken) updateData.fcmToken = fcmToken;

          await updateDoc(userRef, updateData);
          console.log("Device synchronized with Engineering Push Server");
        }
      } catch (err) {
        console.error("Push setup issue:", err);
      }
    };

    setupPushNotifications();

    // Foreground listener for FCM messages
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

  // --- EFFECT 2: FIRESTORE LIVE LEDGER LISTENER ---
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
    audioRef.current?.play().catch(() => {
      console.log("Audio play blocked by browser. User interaction required.");
    });

    toast.custom((t) => (
      <div className="bg-white border border-gray-100 p-5 rounded-[1.5rem] shadow-[0_20px_50px_rgba(15,23,42,0.1)] flex flex-col gap-5 min-w-[360px] animate-in fade-in slide-in-from-right-4 duration-500">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="bg-[#E33636] p-2 rounded-2xl shadow-lg shadow-red-200">
               <BellRing size={18} className="text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-[#0F172A] text-xs font-black uppercase tracking-tight">
                New Drawing Request
              </span>
              <span className="text-gray-400 text-[10px] font-medium">
                Engineering Dept
              </span>
            </div>
          </div>
          <button onClick={() => toast.dismiss(t)} className="p-1 hover:bg-gray-50 rounded-full">
            <X size={18} className="text-gray-300" />
          </button>
        </div>

        <div className="bg-[#F8FAFC] p-4 rounded-2xl border border-gray-50">
          <div className="flex flex-col gap-1">
            <span className="text-gray-400 text-[9px] font-bold uppercase tracking-widest">Project Name</span>
            <h4 className="text-[#0F172A] text-[16px] font-black tracking-tight leading-tight">
              {data.projectName || "Unnamed Project"}
            </h4>
          </div>
          
          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-200/50">
            <div className="flex flex-col">
              <span className="text-gray-400 text-[8px] font-bold uppercase">Requested By</span>
              <span className="text-[#0F172A] text-[10px] font-bold italic">Field Team</span>
            </div>
            <div className="h-6 w-[1px] bg-gray-200" />
            <div className="flex flex-col">
              <span className="text-gray-400 text-[8px] font-bold uppercase">Status</span>
              <span className="text-[#E33636] text-[10px] font-bold uppercase">Urgent Review</span>
            </div>
          </div>
        </div>

        <button 
          onClick={() => { 
            toast.dismiss(t);
            window.location.href = `/request/shop-drawing`; 
          }}
          className="w-full bg-[#0F172A] hover:bg-[#1e293b] text-white text-[12px] font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98]"
        >
          Open Requests
          <ExternalLink size={14} />
        </button>
      </div>
    ), { duration: 8000, position: 'bottom-right' });
  };

  return <>{children}</>;
}