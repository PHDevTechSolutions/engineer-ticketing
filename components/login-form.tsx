"use client";

import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, 
  DialogDescription, DialogFooter 
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Mail, Lock, Eye, EyeOff, Fingerprint, Grid3X3, ShieldCheck, AlertTriangle
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";

import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db, logsDb } from "@/lib/firebase"; 
import { supabase } from "@/utils/supabase-ticket";

// Force dynamic to prevent Vercel build errors with Supabase/LocalStorage
export const dynamic = 'force-dynamic';

type Ticket = {
  ticket_id: string;
  department: string;
  requestor_name: string;
  mode: string;
  status: string;
  ticket_subject: string;
  date_created: string;
};

export function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showOverlay, setShowOverlay] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [pendingLoginData, setPendingLoginData] = useState<any | null>(null);
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [showTicketDialog, setShowTicketDialog] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [ticketSubmitting, setTicketSubmitting] = useState(false);
  const [existingTickets, setExistingTickets] = useState<Ticket[]>([]);

  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const router = useRouter();

  const handleRequestReset = async () => {
    if (!resetEmail) {
      toast.error("Please enter your email.");
      return;
    }
    setResetLoading(true);
    try {
      const res = await fetch("/api/request-reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail }),
      });
      const data = await res.json();
      toast.success(data.message || "Reset link sent if account exists.");
      setResetSent(true);
    } catch {
      toast.error("Failed to send reset link.");
    } finally {
      setResetLoading(false);
    }
  };

  // Safe Device ID retrieval for SSR
  const getDeviceId = useCallback(() => {
    if (typeof window === "undefined") return "";
    let deviceId = localStorage.getItem("deviceId");
    if (!deviceId) {
      deviceId = uuidv4();
      localStorage.setItem("deviceId", deviceId);
    }
    return deviceId;
  }, []);

  const getLocation = async () => {
    if (typeof window === "undefined" || !navigator.geolocation) return null;
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
      );
      return { latitude: position.coords.latitude, longitude: position.coords.longitude };
    } catch {
      return null;
    }
  };

  const fetchTickets = useCallback(async () => {
    try {
      const { data } = await supabase.from("tickets").select("ticket_id, date_created");
      if (data) setExistingTickets(data);
    } catch (e) {
      console.error("Supabase fetch failed", e);
    }
  }, []);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const generateTicketID = () => {
    const prefix = "DSI";
    const datePart = new Date().toISOString().split('T')[0];
    const todayIds = existingTickets.filter(t => t.ticket_id.startsWith(`${prefix}-${datePart}`));
    const nextSeq = String(todayIds.length + 1).padStart(3, "0");
    return `${prefix}-${datePart}-${nextSeq}`;
  };

  const submitTicket = async () => {
    if (!remarks.trim()) return;
    setTicketSubmitting(true);
    try {
      const { error } = await supabase.from("tickets").insert([{
        ticket_id: generateTicketID(),
        department: "ENGINEERING", // Protocol: Set to Department ENGINEERING
        requestor_name: email || "Engineering Portal User",
        mode: "System Directory",
        status: "Pending",
        ticket_subject: `Account Locked - ${email}`,
        date_created: new Date().toISOString(),
      }]);
      if (error) throw error;
      toast.success("Ticket submitted successfully.");
      setRemarks("");
      setShowTicketDialog(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit ticket.");
    } finally {
      setTicketSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
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

      if (!response.ok) {
        if (result.locked) {
          setShowTicketDialog(true);
        } else {
          setErrorMessage(result.message || "Login failed.");
          toast.error(result.message || "Login failed");
        }
        setLoading(false);
        return;
      }

      setPendingLoginData({ email, deviceId, result });
      setShowLocationDialog(true);
    } catch (error) {
      setErrorMessage("System Connection Error.");
    } finally {
      setLoading(false);
    }
  };

  const handlePostLogin = async (location: any) => {
    if (!pendingLoginData) return;
    setShowLocationDialog(false);
    setShowOverlay(true);

    const { email, deviceId, result } = pendingLoginData;

    try {
      await addDoc(collection(logsDb, "activity_logs"), {
        email,
        status: "login",
        deviceId,
        location,
        browser: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
        os: typeof navigator !== "undefined" ? navigator.platform : "unknown",
        userId: result.userId,
        date_created: serverTimestamp(),
      });
    } catch (err) {
      console.error("Logging failure", err);
    }

    localStorage.setItem("userId", result.userId);
    localStorage.setItem("userName", result.Username);

    let value = 0;
    const interval = setInterval(() => {
      value += 20;
      setProgress(value);
      if (value >= 100) {
        clearInterval(interval);
        toast.success("Identity Verified");
        setTimeout(() => router.push(`/dashboard?id=${result.userId}`), 300);
      }
    }, 60);
  };

  return (
    <div className={cn("min-h-screen w-full flex bg-[#F9FAFA]", className)} {...props}>
      {/* AUTHORIZATION OVERLAY */}
      {showOverlay && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#121212]/95 backdrop-blur-md">
          <div className="w-full max-w-[280px] space-y-6 text-center">
            <ShieldCheck className="h-16 w-16 text-white mx-auto animate-pulse" />
            <h2 className="text-xl font-bold tracking-tight uppercase text-white">Authorizing...</h2>
            <Progress value={progress} className="h-1.5 w-full bg-white/20" />
          </div>
        </div>
      )}

      {/* LEFT SIDE: LOGIN FORM */}
      <div className="flex-[1] flex flex-col justify-center items-center px-6 md:px-12 lg:px-20 z-10 bg-white relative shadow-2xl">
        <div className="w-full max-w-[400px] space-y-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="bg-[#121212] p-2 rounded-full shadow-lg">
                <img src="/disruptive.png" alt="Engineering Logo" className="h-10 w-10 object-contain" />
              </div>
              <div>
                <h1 className="text-xl font-black uppercase tracking-tighter leading-none text-[#121212]">Disruptive</h1>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.3em]">Engineering System</p>
              </div>
            </div>
            <div className="space-y-1">
              <h2 className="text-3xl font-bold tracking-tight text-[#121212]">Portal Access</h2>
              <p className="text-muted-foreground text-sm font-medium">Internal Engineering Protocol.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              {errorMessage && (
                <div className="flex items-center gap-3 p-4 bg-red-50 border-l-4 border-red-600 rounded-r-xl">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="text-[10px] font-black uppercase text-red-600 tracking-widest leading-none">Access Denied</p>
                    <p className="text-xs font-bold text-red-800/80 mt-1">{errorMessage}</p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-bold uppercase text-muted-foreground/70 tracking-widest">Work Email</Label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-[#121212] transition-colors" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@disruptivesolutionsinc.com"
                    className="pl-10 h-14 rounded-xl border-2 border-muted bg-[#F9FAFA] focus-visible:ring-0 focus-visible:border-[#121212] transition-all font-medium"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-bold uppercase text-muted-foreground/70 tracking-widest">Password</Label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-[#121212] transition-colors" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="pl-10 pr-12 h-14 rounded-xl border-2 border-muted bg-[#F9FAFA] focus-visible:ring-0 focus-visible:border-[#121212] transition-all font-medium"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-[#121212] transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-14 rounded-xl text-md font-bold uppercase tracking-widest transition-all bg-[#121212] hover:bg-black active:scale-[0.98] shadow-xl shadow-black/10"
              disabled={loading}
            >
              {loading ? "Verifying..." : "Secure Login"}
            </Button>

            <div className="relative py-2 flex items-center gap-4">
               <div className="h-[1px] flex-1 bg-muted" />
               <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Biometric Protocol</span>
               <div className="h-[1px] flex-1 bg-muted" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-14 rounded-xl border-2 border-muted hover:border-[#121212] flex flex-col gap-1" type="button">
                <Grid3X3 className="h-4 w-4 text-[#121212]" />
                <span className="text-[9px] font-black uppercase tracking-tighter">Pin Pad</span>
              </Button>
              <Button variant="outline" className="h-14 rounded-xl border-2 border-muted hover:border-[#121212] flex flex-col gap-1" type="button">
                <Fingerprint className="h-4 w-4 text-[#121212]" />
                <span className="text-[9px] font-black uppercase tracking-tighter">Biometric</span>
              </Button>
            </div>
          </form>

          <div className="flex flex-col items-center gap-4 text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
             <button 
                onClick={() => {
                  setResetSent(false);
                  setShowResetDialog(true);
                }} 
                className="hover:text-[#121212] transition-colors underline decoration-dotted"
              >
                Request Recovery
              </button>
             <p>© 2026 Disruptive Solutions Inc.</p>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: IMAGE */}
      <div className="hidden lg:block flex-[1.2] relative bg-slate-900 overflow-hidden">
        <img src="/engineer_wallpaper.png" alt="Engineering Background" className="h-full w-full object-cover opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-r from-white via-transparent to-transparent w-full" />
        <div className="absolute bottom-12 right-12 p-8 bg-[#121212]/80 backdrop-blur-xl rounded-2xl border border-white/20 text-white max-w-sm shadow-2xl">
            <h3 className="text-xl font-black uppercase tracking-tighter">ENGINEERING DEPARTMENT</h3>
            <p className="text-xs text-white/60 mt-2 leading-relaxed">
              System monitoring active. This terminal is a secure access point for Disruptive Solutions Engineering protocols.
            </p>
        </div>
      </div>

      {/* --- FORGOT PASSWORD DIALOG --- */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent className="sm:max-w-md bg-[#F9FAFA] border-none shadow-2xl">
          {resetSent ? (
            <div className="space-y-6 py-4">
               <Alert className="flex items-center p-4 gap-4 border-none bg-white shadow-sm">
                <div className="flex-1">
                  <AlertTitle className="text-lg font-bold text-[#121212]">Link Sent</AlertTitle>
                  <AlertDescription className="text-xs text-muted-foreground font-medium">
                    Check your work email. A recovery sequence has been initiated.
                  </AlertDescription>
                </div>
                <ShieldCheck className="w-12 h-12 text-green-600" />
              </Alert>
              <Button onClick={() => setShowResetDialog(false)} className="w-full h-12 rounded-xl uppercase font-bold text-xs tracking-widest bg-[#121212]">
                Dismiss
              </Button>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="uppercase font-black text-xl tracking-tight text-[#121212]">Recovery Request</DialogTitle>
                <DialogDescription className="text-xs font-medium">
                  Enter your email to receive recovery instructions.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="reset-email" className="text-[10px] font-bold uppercase text-muted-foreground">Work Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="name@disruptivesolutionsinc.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="h-12 rounded-xl border-2 border-muted bg-white"
                  />
                </div>
                <Button 
                  onClick={handleRequestReset} 
                  disabled={resetLoading || !resetEmail} 
                  className="w-full h-12 rounded-xl uppercase font-bold tracking-widest text-xs bg-[#121212]"
                >
                  {resetLoading ? "Processing..." : "Initiate Recovery"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* LOCATION DIALOG */}
      <Dialog open={showLocationDialog} onOpenChange={setShowLocationDialog}>
        <DialogContent className="sm:max-w-md bg-[#F9FAFA] border-none">
          <DialogHeader>
            <DialogTitle className="uppercase font-black tracking-tight">Geo-Verification</DialogTitle>
            <div className="flex justify-center my-4">
              <div className="h-32 w-32 bg-white rounded-full flex items-center justify-center shadow-inner">
                <iframe src="https://lottie.host/embed/2cbdf7c4-ad28-4a75-8bfd-68e4cd759a26/9PTYn6qNh6.lottie" className="border-none h-24 w-24"></iframe>
              </div>
            </div>
            <DialogDescription className="text-center font-medium">
              Logging site coordinates for engineering compliance.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-center gap-2 sm:justify-center">
            <Button variant="outline" className="rounded-xl px-8" onClick={() => handlePostLogin(null)}>Skip</Button>
            <Button className="bg-[#121212] rounded-xl px-8" onClick={async () => handlePostLogin(await getLocation())}>Verify</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ACCOUNT LOCKED / TICKET DIALOG */}
      <Dialog open={showTicketDialog} onOpenChange={setShowTicketDialog}>
        <DialogContent className="bg-[#F9FAFA] border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-red-600 uppercase font-black text-2xl tracking-tighter">Access Locked</DialogTitle>
            <DialogDescription className="font-medium">
              Maximum failed attempts reached. Submit a ticket to the Engineering Support desk.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Incident Remarks</Label>
              <Input
                id="remarks"
                placeholder="Briefly describe the request..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="h-12 border-2 bg-white rounded-xl"
              />
            </div>
            <Button 
              onClick={submitTicket} 
              disabled={ticketSubmitting || !remarks.trim()} 
              className="w-full h-14 rounded-xl uppercase font-bold tracking-widest bg-red-600 hover:bg-red-700 shadow-lg shadow-red-200"
            >
              {ticketSubmitting ? "Submitting..." : "Submit Incident Ticket"}
            </Button>
            <Button variant="ghost" onClick={() => setShowTicketDialog(false)} className="w-full text-[10px] uppercase font-bold text-muted-foreground hover:bg-transparent">
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}