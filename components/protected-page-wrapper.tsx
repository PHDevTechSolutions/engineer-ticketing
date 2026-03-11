"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, Loader2, Lock } from "lucide-react";
import { Progress } from "@/components/ui/progress";

let hasBeenVerifiedThisSession = false;

function ProtectedContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(!hasBeenVerifiedThisSession);
  const [progress, setProgress] = useState(hasBeenVerifiedThisSession ? 100 : 0);

  useEffect(() => {
    if (hasBeenVerifiedThisSession) {
      setLoading(false);
      return;
    }

    const progressInterval = setInterval(() => {
      setProgress((prev) => (prev >= 95 ? 95 : prev + 5));
    }, 120);

    const checkSession = async () => {
      try {
        const deviceId = localStorage.getItem("deviceId") || "";
        
        // ✅ 1. NULL-SAFE PARAMETER CHECK
        // We look for userId but don't crash if it is null (Direct access)
        let delegatedUserId = null;
        try {
            // Next.js searchParams hook
            delegatedUserId = searchParams ? searchParams.get("userId") : null;
        } catch (e) {
            // Fallback to native browser API if hook isn't ready
            const params = new URLSearchParams(window.location.search);
            delegatedUserId = params.get("userId");
        }

        const API_BASE = "https://conx.mtechsolutions.cloud";
        const headers: HeadersInit = { "x-device-id": deviceId };

        // ✅ 2. ONLY attach the header if delegatedUserId actually exists
        if (delegatedUserId && delegatedUserId !== "null") {
          headers["x-delegated-user-id"] = delegatedUserId;
        }

        const res = await fetch(`${API_BASE}/api/check-session`, { 
          method: "GET",
          headers 
        });

        if (res.status !== 200) {
          // If the API says unauthorized, we send them to login
          router.push("/login");
          return;
        }

        // ✅ 3. Sync local storage ONLY if we got a valid ID from the URL
        if (delegatedUserId && delegatedUserId !== "null") {
          localStorage.setItem("userId", delegatedUserId);
        }

        hasBeenVerifiedThisSession = true;
        setProgress(100);
        setTimeout(() => setLoading(false), 400);
      } catch (error) {
        console.error("Session verification failed:", error);
        router.push("/login");
      }
    };

    checkSession();
    return () => clearInterval(progressInterval);
  }, [router, searchParams]);

  if (!loading) return <>{children}</>;

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-[340px] space-y-10 animate-in fade-in duration-500">
        <div className="flex flex-col items-center space-y-6">
          <div className="relative">
            <div className="absolute -inset-4 bg-[#E33636]/5 rounded-full blur-2xl" />
            <div className="h-24 w-24 rounded-[2rem] border border-gray-100 flex items-center justify-center bg-white shadow-xl relative">
              <ShieldCheck className="h-10 w-10 text-[#0F172A]" />
              <Loader2 className="absolute h-full w-full p-1.5 text-[#E33636]/20 animate-spin" />
            </div>
          </div>
          <div className="text-center">
            <h2 className="text-xl font-black uppercase tracking-tight text-[#0F172A]">Verifying Identity</h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">Opening engiconnect safely</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Please wait</span>
            <span className="text-xs font-black text-[#0F172A]">{progress}%</span>
          </div>
          <div className="h-3 w-full bg-white border border-gray-100 rounded-full p-1 shadow-inner">
            <Progress value={progress} className="h-full rounded-full bg-gray-50 transition-all [&>div]:bg-[#E33636]" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProtectedPageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F8FAFC]" />}>
      <ProtectedContent>{children}</ProtectedContent>
    </Suspense>
  );
}