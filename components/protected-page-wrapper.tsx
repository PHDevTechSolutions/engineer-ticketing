"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Loader2, Lock } from "lucide-react";
import { Progress } from "@/components/ui/progress";

// This acts like a "Stamp" - if true, we don't show the loading screen again
let hasBeenVerifiedThisSession = false;

export default function ProtectedPageWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(!hasBeenVerifiedThisSession);
  const [progress, setProgress] = useState(hasBeenVerifiedThisSession ? 100 : 0);

  useEffect(() => {
    // Skip if already verified in this session
    if (hasBeenVerifiedThisSession) {
      setLoading(false);
      return;
    }

    // Gentle progress bar animation
    const progressInterval = setInterval(() => {
      setProgress((prev) => (prev >= 95 ? 95 : prev + 5));
    }, 120);

    const checkSession = async () => {
      try {
        const deviceId = localStorage.getItem("deviceId") || "";
        const res = await fetch("/api/check-session", {
          headers: { "x-device-id": deviceId },
        });

        if (res.status !== 200) {
          router.push("/login");
          return;
        }

        // Verification successful
        hasBeenVerifiedThisSession = true;
        setProgress(100);
        setTimeout(() => setLoading(false), 400);
      } catch (error) {
        console.error("Access denied");
        router.push("/login");
      }
    };

    checkSession();
    return () => clearInterval(progressInterval);
  }, [router]);

  // Show the actual page content immediately if already verified
  if (!loading) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-[340px] space-y-10 animate-in fade-in duration-500">
        
        {/* Visual Identity Section */}
        <div className="flex flex-col items-center space-y-6">
          <div className="relative">
            {/* Subtle brand glow */}
            <div className="absolute -inset-4 bg-[#E33636]/5 rounded-full blur-2xl" />
            
            <div className="h-24 w-24 rounded-[2rem] border border-gray-100 flex items-center justify-center bg-white shadow-xl relative">
              <ShieldCheck className="h-10 w-10 text-[#0F172A]" />
              <Loader2 className="absolute h-full w-full p-1.5 text-[#E33636]/20 animate-spin" />
            </div>
          </div>
          
          <div className="text-center">
            <h2 className="text-xl font-black uppercase tracking-tight text-[#0F172A]">
              Verifying Your Identity
            </h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">
              Opening engiconnect safely
            </p>
          </div>
        </div>

        {/* User-Friendly Progress Section */}
        <div className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
              Please wait
            </span>
            <span className="text-xs font-black text-[#0F172A]">{progress}%</span>
          </div>
          
          <div className="h-3 w-full bg-white border border-gray-100 rounded-full p-1 shadow-inner">
            <Progress 
              value={progress} 
              className="h-full rounded-full bg-gray-50 transition-all [&>div]:bg-[#E33636]" 
            />
          </div>
        </div>

        {/* Footer Security Label */}
        <div className="flex items-center justify-center gap-2 pt-4 border-t border-gray-100/50">
          <Lock className="h-3 w-3 text-gray-300" />
          <span className="text-[9px] font-bold uppercase tracking-widest text-gray-300">
            Safe & Secure Connection
          </span>
        </div>
      </div>
    </div>
  );
}