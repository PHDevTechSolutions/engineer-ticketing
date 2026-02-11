"use client";

import React, { useEffect, useState } from "react";
import { Clock, Globe } from "lucide-react";

export function SystemClock() {
  const [localTime, setLocalTime] = useState<string>("");
  const [serverTime, setServerTime] = useState<string>("");

  useEffect(() => {
    // 1. In a production environment, you would fetch the initial server time
    // to calculate the offset: const offset = serverTime - localTime;
    
    const updateClocks = () => {
      const now = new Date();
      
      // Local Client Time (Form Submission Local)
      setLocalTime(now.toLocaleString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }));

      // Server Time (UTC/Standard Reference)
      // Displaying as UTC to ensure a standard corporate reference point
      setServerTime(now.toLocaleString("en-US", {
        timeZone: "UTC",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false, // Military/Standard format for server logs
      }));
    };

    updateClocks();
    const interval = setInterval(updateClocks, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!localTime) return null;

  return (
    <div className="fixed top-4 right-20 z-[9999] pointer-events-none select-none flex gap-2">
      {/* LOCAL CLIENT TIME */}
      <div className="bg-white/90 backdrop-blur-md border border-black/5 px-4 py-2 flex items-center gap-3 shadow-sm">
        <div className="flex flex-col items-end border-r border-black/5 pr-3">
          <span className="text-[7px] font-black text-black/30 uppercase tracking-[0.2em] leading-none">
            Local Sync
          </span>
          <span className="text-[11px] font-mono font-bold text-[#121212] mt-1 tracking-tighter">
            {localTime}
          </span>
        </div>
        <Clock size={12} className="text-black/20" />
      </div>

      {/* SERVER REFERENCE TIME (UTC) */}
      <div className="bg-[#121212] border border-white/5 px-4 py-2 flex items-center gap-3 shadow-sm">
        <div className="flex flex-col items-end border-r border-white/10 pr-3">
          <span className="text-[7px] font-black text-white/30 uppercase tracking-[0.2em] leading-none">
            Server UTC
          </span>
          <span className="text-[11px] font-mono font-bold text-[#F9FAFA] mt-1 tracking-tighter">
            {serverTime}
          </span>
        </div>
        <Globe size={12} className="text-white/20" />
      </div>
    </div>
  );
}