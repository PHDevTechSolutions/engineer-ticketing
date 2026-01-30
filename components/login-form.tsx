"use client"

import React, { useState, useEffect } from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Label } from "@/components/ui/label"
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Fingerprint,
  Grid3X3,
  ShieldCheck,
  AlertTriangle
} from "lucide-react"
import { v4 as uuidv4 } from "uuid";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [showOverlay, setShowOverlay] = useState(false)

  // State to hold the API error message
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const router = useRouter()

  function getDeviceId() {
    let deviceId = localStorage.getItem("deviceId");
    if (!deviceId) {
      deviceId = uuidv4();
      localStorage.setItem("deviceId", deviceId);
    }
    return deviceId;
  }

  useEffect(() => {
    if (showOverlay) {
      let value = 0
      const interval = setInterval(() => {
        value += 20
        setProgress(value)
        if (value >= 100) {
          clearInterval(interval)
          toast.success("Identity Verified")
          setTimeout(() => router.push("/dashboard"), 300)
        }
      }, 60)
    }
  }, [showOverlay, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null); // Clear previous errors on new attempt
    const deviceId = getDeviceId();

    if (!email || !password) {
      setErrorMessage("Email and Password are required.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Email: email, Password: password, deviceId }),
      });

      const result = await response.json();

      if (response.ok) {
        localStorage.setItem("userId", result.userId);
        localStorage.setItem("userName", result.Username);
        setShowOverlay(true);
      } else {
        // This captures "Invalid credentials", "Access denied", etc., from your handler
        setErrorMessage(result.message || "An unexpected error occurred.");
        toast.error(result.message || "Login failed");
      }
    } catch (error) {
      setErrorMessage("System Connection Error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("min-h-screen w-full flex bg-background", className)} {...props}>

      {showOverlay && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/95 backdrop-blur-md">
          <div className="w-full max-w-[280px] space-y-6 text-center">
            <ShieldCheck className="h-16 w-16 text-primary mx-auto animate-pulse" />
            <h2 className="text-xl font-bold tracking-tight uppercase">Authorizing...</h2>
            <Progress value={progress} className="h-1.5 w-full" />
          </div>
        </div>
      )}

      <div className="flex-[1] flex flex-col justify-center items-center px-6 md:px-12 lg:px-20 z-10 bg-background relative">
        <div className="w-full max-w-[400px] space-y-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="bg-primary p-1 rounded-lg">
                <img
                  src="/disruptive.png" // Replace with your engineering background path
                  alt="Engineering Background"
                  className="h-12 w-12 object-cover"
                />
                {/* <Lock className="text-primary-foreground h-6 w-6" /> */}
              </div>
              <div>
                <h1 className="text-xl font-black uppercase tracking-tighter leading-none">Disruptive</h1>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.3em]">Engineering System</p>
              </div>
            </div>
            <div className="space-y-1">
              <h2 className="text-3xl font-bold tracking-tight">Portal Access</h2>
              <p className="text-muted-foreground text-sm">Sign in to manage your tickets and workspace.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">

              {/* ERROR MESSAGE DISPLAY */}
              {errorMessage && (
                <div className="flex items-center gap-3 p-4 bg-destructive/10 border-l-4 border-destructive rounded-r-xl animate-in fade-in slide-in-from-top-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <div>
                    <p className="text-[10px] font-black uppercase text-destructive tracking-widest leading-none">Access Denied</p>
                    <p className="text-xs font-bold text-destructive/80 mt-1">{errorMessage}</p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-bold uppercase text-muted-foreground/70 tracking-widest">Work Email</Label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@disruptivesolutionsinc.com"
                    className="pl-10 h-14 rounded-xl border-2 border-muted bg-muted/20 focus-visible:ring-0 focus-visible:border-primary transition-all font-medium"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-bold uppercase text-muted-foreground/70 tracking-widest">Password</Label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="pl-10 pr-12 h-14 rounded-xl border-2 border-muted bg-muted/20 focus-visible:ring-0 focus-visible:border-primary transition-all font-medium"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-14 rounded-xl text-md font-bold uppercase tracking-widest transition-all active:scale-[0.98] shadow-xl shadow-primary/20"
              disabled={loading}
            >
              {loading ? "Verifying..." : "Login"}
              {!loading}
            </Button>

            <div className="relative py-2 flex items-center gap-4">
               <div className="h-[1px] flex-1 bg-muted" />
               <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Quick Access</span>
               <div className="h-[1px] flex-1 bg-muted" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-14 rounded-xl border-2 border-muted hover:border-primary/50 flex flex-col gap-1" type="button">
                <Grid3X3 className="h-4 w-4 text-primary" />
                <span className="text-[9px] font-black uppercase tracking-tighter">Pin Pad</span>
              </Button>
              <Button variant="outline" className="h-14 rounded-xl border-2 border-muted hover:border-primary/50 flex flex-col gap-1" type="button">
                <Fingerprint className="h-4 w-4 text-primary" />
                <span className="text-[9px] font-black uppercase tracking-tighter">Biometric</span>
              </Button>
            </div>
          </form>

          <div className="flex flex-col items-center gap-4 text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
             <button className="hover:text-primary transition-colors">Forgot Password?</button>
             <p>© 2026 Disruptive Solutions Inc.</p>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: THE HERO IMAGE (Hidden on Mobile) */}
      <div className="hidden lg:block flex-[1.2] relative bg-slate-900">
        <img
          src="/engineer_wallpaper.png" // Replace with your engineering background path
          alt="Engineering Background"
          className="h-full w-full object-cover"
        />
        {/* Overlay to give it depth and tie into the left side */}
        <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-transparent w-1/2" />
        
        {/* Floating Branding over Image */}
        <div className="absolute bottom-12 right-12 p-8 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 text-white max-w-sm">
            <h3 className="text-xl font-black uppercase tracking-tighter">Engineering Ticketing System</h3>
            <p className="text-xs text-white/60 mt-2 leading-relaxed">
              Authorized Personnel only. Your session is monitored and recorded for security compliance.
            </p>
        </div>
      </div>
    </div>
  )
}