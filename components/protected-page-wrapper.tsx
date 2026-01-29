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
    // Artificial increment to ensure the UI feels "active" during the check
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
          router.push("auth/login");
          return;
        }

        // Snap to 100 on success
        setProgress(100);
        setTimeout(() => setLoading(false), 400);
      } catch (error) {
        router.push("auth/login");
      }
    };

    checkSession();
    return () => clearInterval(progressInterval);
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-background flex flex-col items-center justify-center p-6 transition-all duration-500">
        
        {/* Background Detail: Industrial Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
             style={{ backgroundImage: `radial-gradient(circle, hsl(var(--primary)) 1px, transparent 1px)`, backgroundSize: '30px 30px' }} />

        <div className="w-full max-w-[350px] space-y-10 z-10">
          
          {/* Status Header */}
          <div className="flex flex-col items-center space-y-6">
            <div className="relative">
              <div className="h-24 w-24 rounded-none border-2 border-primary/30 flex items-center justify-center bg-muted/20 relative">
                <ShieldCheck className="h-12 w-12 text-primary animate-pulse" />
                {/* Loader spinning around the shield */}
                <Loader2 className="absolute h-full w-full text-primary/40 animate-[spin_3s_linear_infinite]" />
              </div>
            </div>
            
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-black uppercase tracking-tighter italic text-foreground">
                Authenticating
              </h2>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.4em]">
                Secure Terminal Link
              </p>
            </div>
          </div>

          {/* Solid Industrial Progress Bar */}
          <div className="space-y-3">
            <div className="flex justify-between items-end px-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-primary"> Clearance Level: Alpha </span>
              <span className="text-[10px] font-mono font-bold text-primary">{progress}%</span>
            </div>
            
            {/* Custom Shadcn Progress wrapper */}
            <div className="p-1 border-2 border-muted bg-muted/20 rounded-none">
              <Progress 
                value={progress} 
                className="h-3 rounded-none bg-transparent transition-all" 
              />
            </div>
          </div>

          {/* Footer Encryption Tag */}
          <div className="flex items-center justify-center gap-3 py-4 border-t border-muted/30">
            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              DSI Encrypted Session
            </span>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}