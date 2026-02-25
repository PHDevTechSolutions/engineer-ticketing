"use client";

import React, { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { db, messaging } from "@/lib/firebase"; 
import { collection, query, where, onSnapshot, limit, doc, updateDoc, arrayUnion } from "firebase/firestore"; // Added Firestore tools
import { getToken, onMessage } from "firebase/messaging";
import { toast } from "sonner";
import { X, ExternalLink, BellRing } from "lucide-react";

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playedIdsRef = useRef<string[]>([]);
  const pathname = usePathname();

  useEffect(() => {
    const rawDept = localStorage.getItem("department");
    const userId = localStorage.getItem("userId"); // Needed to identify the user in the database
    const dept = rawDept?.toUpperCase();

    if (dept !== "ENGINEERING") return;

    // --- PWA PUSH NOTIFICATION SETUP ---
    const setupPushNotifications = async () => {
      try {
        // Ask for permission to show alerts on the phone
        const permission = await Notification.requestPermission();
        
        if (permission === "granted" && messaging) {
          // Get the unique address (token) for this specific phone/device
          const token = await getToken(messaging, {
            vapidKey: "YOUR_PUBLIC_VAPID_KEY_HERE", // Replace with your key from Firebase Console
          });

          if (token && userId) {
            console.log("Device Token found:", token);
            
            // SAVE THE TOKEN: This tells engiconnect where to send the "Mail"
            const userRef = doc(db, "users", userId);
            await updateDoc(userRef, {
              notificationTokens: arrayUnion(token), // Adds the token without deleting old ones
              notificationsEnabled: true
            });
          }
        }
      } catch (err) {
        console.error("Push notification setup failed:", err);
      }
    };

    setupPushNotifications();

    // Listener for when the user is actually using the app (Foreground)
    if (messaging) {
      onMessage(messaging, (payload) => {
        console.log("Foreground message:", payload);
      });
    }
    // ----------------------------------------

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
    }, (error) => {
      console.error("Notification issue:", error.message);
    });

    return () => unsubscribe();
  }, [pathname]);

  const showNewDrawingAlert = (id: string, data: any) => {
    audioRef.current?.play().catch(() => {});

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