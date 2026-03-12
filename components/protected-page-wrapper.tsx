"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

// Use a session-wide variable to prevent re-verification on every internal navigation
let hasBeenVerifiedThisSession = false;

function ProtectedContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(!hasBeenVerifiedThisSession);
  const [progress, setProgress] = useState(hasBeenVerifiedThisSession ? 100 : 0);

  useEffect(() => {
    // Skip verification if already done in this browser session
    if (hasBeenVerifiedThisSession) {
      setLoading(false);
      return;
    }

    // Visual progress bar animation
    const progressInterval = setInterval(() => {
      setProgress((prev) => (prev >= 95 ? 95 : prev + 5));
    }, 120);

    const checkSession = async () => {
      try {
        const deviceId = localStorage.getItem("deviceId") || "";
        let delegatedUserId = null;

        // 1. Extract userId from URL (handles Next.js searchParams or native URL fallback)
        try {
          delegatedUserId = searchParams ? searchParams.get("userId") : null;
        } catch (e) {
          const params = new URLSearchParams(window.location.search);
          delegatedUserId = params.get("userId");
        }

        // 2. ✅ TRIPLE-ENVIRONMENT API SELECTION
        // Automatically selects the correct backend based on the current domain
        const hostname = window.location.hostname;
        const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
        const isVercel = hostname.includes("vercel.app");

        const API_BASE = isLocal 
          ? "http://localhost:3000" 
          : isVercel 
            ? "https://engiconnect.vercel.app" 
            : "https://conx.mtechsolutions.cloud";

        const headers: HeadersInit = { "x-device-id": deviceId };

        // 3. Attach delegated user ID to headers if present
        if (delegatedUserId && delegatedUserId !== "null") {
          headers["x-delegated-user-id"] = delegatedUserId;
        }

        // 4. Verify session with the selected API_BASE
        const res = await fetch(`${API_BASE}/api/check-session`, { 
          method: "GET",
          headers 
        });

        // 5. Handle Unauthorized
        if (res.status !== 200) {
          router.push("/login");
          return;
        }

        // 6. Sync userId to local storage for persistence across the app
        if (delegatedUserId && delegatedUserId !== "null") {
          localStorage.setItem("userId", delegatedUserId);
        }

        // Success: Mark as verified and clear loading state
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

  // Render children immediately if verified
  if (!loading) return <>{children}</>;

  // Loading/Verification UI
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

/**
 * Main wrapper to handle Next.js Suspense requirements when using useSearchParams
 */
export default function ProtectedPageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F8FAFC]" />}>
      <ProtectedContent>{children}</ProtectedContent>
    </Suspense>
  );
}