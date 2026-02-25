"use client";

import React, { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { db, messaging } from "@/lib/firebase"; 
import { collection, query, where, onSnapshot, limit, doc, updateDoc, arrayUnion } from "firebase/firestore";
import { getToken, onMessage } from "firebase/messaging";
import { toast } from "sonner";
import { X, ExternalLink, BellRing } from "lucide-react";

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playedIdsRef = useRef<string[]>([]);
  const pathname = usePathname();

  useEffect(() => {
    const rawDept = localStorage.getItem("department");
    const userId = localStorage.getItem("userId");
    const dept = rawDept?.toUpperCase();

    if (dept !== "ENGINEERING") return;

    // --- 1. SERVICE WORKER REGISTRATION (The "Waker") ---
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/firebase-messaging-sw.js")
          .then((reg) => console.log("Night Watchman (SW) Ready:", reg.scope))
          .catch((err) => console.error("SW Registration failed:", err));
      });
    }

    // --- 2. PUSH NOTIFICATION SETUP ---
    const setupPushNotifications = async () => {
      try {
        const permission = await Notification.requestPermission();
        
        if (permission === "granted" && messaging) {
          const token = await getToken(messaging, {
            vapidKey: "YOUR_PUBLIC_VAPID_KEY_HERE", // Replace this with your actual key
          });

          if (token && userId) {
            console.log("Device Token found:", token);
            const userRef = doc(db, "users", userId);
            await updateDoc(userRef, {
              notificationTokens: arrayUnion(token),
              notificationsEnabled: true,
              lastPushSync: new Date().toISOString()
            });
          }
        }
      } catch (err) {
        console.error("Push setup issue:", err);
      }
    };

    setupPushNotifications();

    // Foreground listener
    if (messaging) {
      const unsubscribeOnMessage = onMessage(messaging, (payload) => {
        console.log("Message received in foreground:", payload);
        // If you want a toast for background-style pushes while app is open:
        toast.info(payload.notification?.title || "New Update", {
          description: payload.notification?.body
        });
      });
      return () => unsubscribeOnMessage();
    }
  }, []); // Only run once on mount

  // Separate effect for Firestore Ledger listener
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
    // Attempt to play sound
    audioRef.current?.play().catch(() => {
      console.log("Audio play blocked by browser. User must interact first.");
    });

    if (pathname === "/dashboard") {
      toast("New Project Update", {
        description: `${data.projectName} is ready for review.`,
        className: "bg-white border-gray-100 text-[#0F172A] font-sans rounded-xl shadow-lg",
        duration: 4000,
      });
      return;
    }

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
                Engineering Department
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
            window.location.href = `/dashboard?id=${localStorage.getItem("userId")}`; 
          }}
          className="w-full bg-[#0F172A] hover:bg-[#1e293b] text-white text-[12px] font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98]"
        >
          Open Ledger
          <ExternalLink size={14} />
        </button>
      </div>
    ), { duration: 8000, position: 'bottom-right' });
  };

  return <>{children}</>;
}