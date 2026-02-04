"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Loader2, Lock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export default function ProtectedPageWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Artificial increment for active UI feedback
    const progressInterval = setInterval(() => {
      setProgress((prev) => (prev >= 90 ? 90 : prev + 5));
    }, 150);

    const checkSession = async () => {
      try {
        const deviceId = localStorage.getItem("deviceId") || "";
        const res = await fetch("/api/check-session", {
          headers: { "x-device-id": deviceId },
        });

        if (res.status !== 200) {
          // PROTOCOL FIX: Use absolute path "/login" to prevent nested redirects
          // If your login is inside an auth folder, use "/auth/login"
          router.push("/login"); 
          return;
        }

        // Success state
        setProgress(100);
        setTimeout(() => setLoading(false), 400);
      } catch (error) {
        console.error("Auth Protocol Violation:", error);
        router.push("/login"); // PROTOCOL FIX: Absolute path
      }
    };

    checkSession();
    return () => clearInterval(progressInterval);
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[#F9FAFA] flex flex-col items-center justify-center p-6 transition-all duration-500 font-sans">
        
        {/* Industrial Grid Detail */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
             style={{ backgroundImage: `radial-gradient(circle, #121212 1px, transparent 1px)`, backgroundSize: '30px 30px' }} />

        <div className="w-full max-w-[350px] space-y-10 z-10">
          
          {/* Status Header */}
          <div className="flex flex-col items-center space-y-6">
            <div className="relative">
              <div className="h-24 w-24 rounded-none border-2 border-black/10 flex items-center justify-center bg-white shadow-sm relative">
                <ShieldCheck className="h-10 w-10 text-[#121212] animate-pulse" />
                <Loader2 className="absolute h-full w-full p-2 text-black/20 animate-[spin_3s_linear_infinite]" />
              </div>
            </div>
            
            <div className="text-center space-y-1">
              <h2 className="text-xl font-black uppercase tracking-tighter text-[#121212]">
                Validating_Credentials
              </h2>
              <p className="text-[9px] font-bold text-black/40 uppercase tracking-[0.4em]">
                Secure Corporate Link
              </p>
            </div>
          </div>

          {/* Industrial Progress Bar */}
          <div className="space-y-3">
            <div className="flex justify-between items-end px-1">
              <span className="text-[9px] font-black uppercase tracking-widest text-[#121212]"> Clearance: ALPHA </span>
              <span className="text-[9px] font-mono font-bold text-[#121212]">{progress}%</span>
            </div>
            
            <div className="p-1 border border-black/5 bg-white rounded-none shadow-sm">
              <Progress 
                value={progress} 
                className="h-2 rounded-none bg-black/[0.03] transition-all" 
              />
            </div>
          </div>

          {/* Footer Encryption Tag */}
          <div className="flex items-center justify-center gap-3 py-4 border-t border-black/5">
            <Lock className="h-3 w-3 text-black/30" />
            <span className="text-[8px] font-black uppercase tracking-[0.3em] text-black/30">
              Encrypted Operational Session
            </span>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}