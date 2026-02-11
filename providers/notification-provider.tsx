"use client";

import React, { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, limit } from "firebase/firestore";
import { toast } from "sonner";
import { X, ExternalLink, ShieldCheck } from "lucide-react";

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playedIdsRef = useRef<string[]>([]);
  const pathname = usePathname();

  useEffect(() => {
    const rawDept = localStorage.getItem("department");
    const dept = rawDept?.toUpperCase();

    if (dept !== "ENGINEERING") return;

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
            executeNotificationProtocol(docId, data, "SHOP DRAWING LEDGER");
            playedIdsRef.current.push(docId);
          }
        }
      });
    }, (error) => {
      console.error("[SYSTEM]: Service interruption.", error.message);
    });

    return () => unsubscribe();
  }, [pathname]);

  const executeNotificationProtocol = (id: string, data: any, ledgerSource: string) => {
    audioRef.current?.play().catch(() => {});

    if (pathname === "/dashboard") {
      toast("LEDGER UPDATED", {
        description: `Project Record: ${data.projectName}`,
        className: "bg-[#F9FAFA] border border-gray-200 text-[#121212] font-sans",
        duration: 3000,
      });
      return;
    }

    toast.custom((t) => (
      <div className="bg-white border border-gray-200 p-6 rounded-none shadow-[0_10px_30px_rgba(0,0,0,0.08)] flex flex-col gap-6 min-w-[380px] animate-in fade-in slide-in-from-bottom-2 duration-400">
        
        {/* Header: Corporate Branding & Source */}
        <div className="flex justify-between items-center border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="bg-[#121212] p-1.5 rounded-full">
               <ShieldCheck size={12} className="text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-[#121212] text-[10px] font-bold uppercase tracking-widest">
                Engineering Department
              </span>
              <span className="text-gray-400 text-[9px] font-medium uppercase tracking-tight">
                Official Notification
              </span>
            </div>
          </div>
          <button 
            onClick={() => toast.dismiss(t)} 
            className="text-gray-300 hover:text-[#121212] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content: Technical Record Summary */}
        <div className="space-y-3">
          <div className="flex flex-col gap-1">
            <span className="text-gray-400 text-[8px] font-bold uppercase tracking-widest">Project Assignment</span>
            <h4 className="text-[#121212] text-[15px] font-semibold tracking-tight leading-none">
              {data.projectName || "Pending Categorization"}
            </h4>
          </div>
          
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="flex flex-col border-l border-gray-100 pl-3">
              <span className="text-gray-400 text-[8px] font-bold uppercase">Source Ledger</span>
              <span className="text-[#121212] text-[10px] font-medium uppercase">{ledgerSource}</span>
            </div>
            <div className="flex flex-col border-l border-gray-100 pl-3">
              <span className="text-gray-400 text-[8px] font-bold uppercase">Asset ID</span>
              <span className="text-[#121212] text-[10px] font-mono uppercase">{id.slice(0, 8)}</span>
            </div>
          </div>
        </div>

        {/* Action: Standard Corporate Button */}
        <button 
          onClick={() => { 
            toast.dismiss(t);
            window.location.href = `/dashboard?id=${localStorage.getItem("userId")}`; 
          }}
          className="w-full bg-[#121212] hover:bg-gray-800 text-[#F9FAFA] text-[11px] font-bold py-3.5 rounded-none flex items-center justify-center gap-3 transition-all duration-200 active:bg-black"
        >
          VIEW DOCUMENTATION
          <ExternalLink size={14} strokeWidth={2.5} />
        </button>
      </div>
    ), { duration: 10000, position: 'bottom-right' });
  };

  return <>{children}</>;
}