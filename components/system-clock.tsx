"use client";

import React, { useEffect, useState } from "react";
import { Clock } from "lucide-react";

export function SystemClock() {
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    const updateClock = () => {
      // Formats to match the "toLocaleString" standard used in form submission logs
      const now = new Date();
      setTime(now.toLocaleString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }));
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!time) return null;

  return (
    <div className="fixed top-4 right-20 z-[9999] pointer-events-none select-none">
      <div className="bg-white/80 backdrop-blur-md border border-black/5 px-4 py-2 flex items-center gap-3 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
        <div className="flex flex-col items-end border-r border-black/5 pr-3">
          <span className="text-[7px] font-black text-black/30 uppercase tracking-[0.2em] leading-none">
            Debug Sync
          </span>
          <span className="text-[11px] font-mono font-bold text-[#121212] mt-1 tracking-tighter">
            {time}
          </span>
        </div>
        <Clock size={14} className="text-black/20" />
      </div>
    </div>
  );
}