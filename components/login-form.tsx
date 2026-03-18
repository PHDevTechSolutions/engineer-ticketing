"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, 
  DialogDescription, DialogFooter, DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Mail, Lock, Eye, EyeOff, Fingerprint, Grid3X3, ShieldCheck, AlertTriangle, Loader2 
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";

// Logic Imports
import { addDoc, collection, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { db, logsDb } from "@/lib/firebase"; 
import { supabase } from "@/utils/supabase-ticket";

export const dynamic = 'force-dynamic';

type TicketSummary = {
  ticket_id: string;
  date_created: string;
};

export default function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [pendingLoginData, setPendingLoginData] = useState<any | null>(null);
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [showTicketDialog, setShowTicketDialog] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [ticketSubmitting, setTicketSubmitting] = useState(false);
  const [existingTickets, setExistingTickets] = useState<TicketSummary[]>([]);

  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pinValue, setPinValue] = useState("");
  const [pinLoading, setPinLoading] = useState(false);
  const pinInputRef = useRef<HTMLInputElement>(null);

  const router = useRouter();

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
    } catch { return null; }
  };

  const fetchTickets = useCallback(async () => {
    try {
      const { data, error } = await supabase.from("tickets").select("ticket_id, date_created");
      if (data && !error) setExistingTickets(data as TicketSummary[]);
    } catch (e) { console.error("Ticket load error", e); }
  }, []);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const generateTicketID = () => {
    const prefix = "DSI";
    const datePart = new Date().toISOString().split('T')[0];
    const todayIds = existingTickets.filter(t => t.ticket_id.startsWith(`${prefix}-${datePart}`));
    const nextSeq = String(todayIds.length + 1).padStart(3, "0");
    return `${prefix}-${datePart}-${nextSeq}`;
  };

  const handlePostLogin = async (location: any) => {
    if (!pendingLoginData) return;
    setShowLocationDialog(false);
    setIsAuthorizing(true);

    const { email, deviceId, result } = pendingLoginData;

    try {
      // 1. Fetch from Firestore for Permissions
      const userDocRef = doc(db, "users", result.userId);
      const userDocSnap = await getDoc(userDocRef);
      
      let firestoreRole = "GUEST"; 
      if (userDocSnap.exists()) {
        firestoreRole = userDocSnap.data().Role?.toUpperCase() || "GUEST";
      }

      console.log(firestoreRole);

      // 2. Define user details and Save to LocalStorage
      const displayName = result.Firstname || email?.split('@')[0] || "Staff Member";
      const userDept = result.Department?.toUpperCase() || "";

      localStorage.setItem("userId", result.userId);
      localStorage.setItem("userName", displayName);
      localStorage.setItem("userRole", firestoreRole);
      localStorage.setItem("department", userDept);

      // 3. Log the activity
      await addDoc(collection(logsDb, "activity_logs"), {
        email: email || result.Email || "System User",
        status: "login",
        deviceId,
        location,
        userId: result.userId,
        project: "engiconnect",
        date_created: serverTimestamp(),
      });

      // 4. Progress bar animation before routing
      let value = 0;
      const interval = setInterval(() => {
        value += 20;
        setProgress(value);
        if (value >= 100) {
          clearInterval(interval);
          
          // --- IT BYPASS LOGIC ---
          // Kung IT ang department, bypass na agad (Always Allowed)
          // Kung hindi IT, i-check kung GUEST (Restricted)
          const isIT = userDept === "IT";

          if (isIT || firestoreRole !== "GUEST") {
            toast.success(`Identity Verified: Welcome ${displayName}`);
            router.push(`/dashboard?id=${result.userId}`);
          } else {
            toast.error("Access Denied: Your account is currently restricted (GUEST).");
            setIsAuthorizing(false);
            setProgress(0);
          }
        }
      }, 60);

    } catch (err) { 
      console.error("Auth sync error", err);
      toast.error("Security verification failed. Contact IT.");
      setIsAuthorizing(false);
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
        if (result.locked) setShowTicketDialog(true);
        else setErrorMessage(result.message || "Login failed.");
        setLoading(false);
        return;
      }

      setPendingLoginData({ email, deviceId, result });
      setShowLocationDialog(true);
    } catch { setErrorMessage("System Connection Error."); } 
    finally { setLoading(false); }
  };

  const handlePinSubmit = async () => {
    if (pinValue.length < 6) return;
    setPinLoading(true);
    
    const deviceId = getDeviceId();
    const savedPin = localStorage.getItem("engiconnect_user_pin"); 

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinValue, savedPin: savedPin, deviceId, mode: "pin" }),
      });
      const result = await response.json();

      if (!response.ok) {
        toast.error(result.message || "Invalid Terminal PIN");
        setPinValue("");
        setPinLoading(false);
        return;
      }

      setShowPinDialog(false);
      setPendingLoginData({ email: result.Email, deviceId, result });
      setShowLocationDialog(true);
    } catch {
      toast.error("Terminal sync failed.");
    } finally {
      setPinLoading(false);
    }
  };

  const handleBiometricLogin = () => {
    toast.info("Initializing biometric scanner...");
    setTimeout(() => {
      toast.error("Biometric identity not recognized. Use PIN or Password.");
    }, 1500);
  };

  const handleRequestReset = async () => {
    if (!resetEmail) { toast.error("Please enter your email."); return; }
    setResetLoading(true);
    try {
      const res = await fetch("/api/request-reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail }),
      });
      const data = await res.json();
      toast.success(data.message || "Reset link sent if account exists.");
      setShowResetDialog(false);
    } catch { toast.error("Failed to send reset link."); } 
    finally { setResetLoading(false); }
  };

  const submitTicket = async () => {
    if (!remarks.trim()) return;
    setTicketSubmitting(true);
    try {
      const { error } = await supabase.from("tickets").insert([{
        ticket_id: generateTicketID(),
        department: "ENGINEERING", 
        requestor_name: email || "engiconnect User",
        mode: "System Directory",
        status: "Pending",
        ticket_subject: `Account Locked - ${email}`,
        date_created: new Date().toISOString(),
      }]);
      if (error) throw error;
      toast.success("Incident ticket submitted.");
      setShowTicketDialog(false);
      setRemarks("");
      fetchTickets();
    } catch (err: any) { toast.error("Submission failed."); } 
    finally { setTicketSubmitting(false); }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#F9FAFA] relative font-sans">
      <div className="flex-[1] flex flex-col justify-center items-center px-6 md:px-12 lg:px-20 z-10 bg-white relative shadow-2xl">
        <div className="w-full max-w-[400px] space-y-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="bg-[#121212] p-2 rounded-xl shadow-lg rotate-[-2deg]">
                <img src="/disruptive.png" alt="Logo" className="h-10 w-10 object-contain" />
              </div>
              <div>
                <h1 className="text-xl font-black uppercase tracking-tighter leading-none text-[#121212]">Disruptive</h1>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.3em]">Engineering System</p>
              </div>
            </div>
            <div className="space-y-1">
              <h2 className="text-3xl font-bold tracking-tight text-[#121212]">Portal Access</h2>
              <p className="text-muted-foreground text-sm font-medium border-l-2 border-red-600 pl-3">Internal Protocol: engiconnect</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
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
              <Label className="text-xs font-bold uppercase text-muted-foreground/70 tracking-widest">Work Email</Label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-[#121212] transition-colors" />
                <Input
                  type="email"
                  placeholder="name@disruptivesolutionsinc.com"
                  className="pl-10 h-14 rounded-xl border-2 border-muted bg-[#F9FAFA] focus-visible:ring-0 focus-visible:border-[#121212] transition-all font-medium"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground/70 tracking-widest">Password</Label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-[#121212] transition-colors" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="pl-10 pr-12 h-14 rounded-xl border-2 border-muted bg-[#F9FAFA] focus-visible:ring-0 focus-visible:border-[#121212] transition-all font-medium"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-[#121212]">
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <Button
              disabled={loading || isAuthorizing}
              className="w-full h-14 bg-[#121212] hover:bg-black text-white rounded-xl text-md font-bold uppercase tracking-widest relative overflow-hidden transition-all active:scale-[0.98] shadow-xl shadow-black/10"
            >
              <div className="relative z-10 flex items-center justify-center gap-2">
                {(loading || pinLoading) && <Loader2 className="h-5 w-5 animate-spin" />}
                {isAuthorizing && <ShieldCheck className="h-5 w-5 animate-pulse" />}
                <span>{isAuthorizing ? `Authorizing ${progress}%` : "Secure Login"}</span>
              </div>
              {isAuthorizing && (
                <div className="absolute left-0 top-0 h-full bg-white/20 transition-all duration-300" style={{ width: `${progress}%` }} />
              )}
            </Button>

            <div className="grid grid-cols-2 gap-3">
               <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
                 <DialogTrigger asChild>
                    <Button variant="outline" className="h-14 rounded-xl border-2 border-muted hover:border-[#121212] flex flex-col gap-1" type="button">
                      <Grid3X3 className="h-4 w-4 text-[#121212]" />
                      <span className="text-[9px] font-black uppercase tracking-tighter">Pin Pad</span>
                    </Button>
                 </DialogTrigger>
                 <DialogContent className="rounded-[20px] p-6 sm:p-8 border-none text-center bg-[#F9FAFA] w-[95vw] sm:max-w-[400px]">
                    <DialogHeader className="items-center">
                      <div className="p-3 bg-[#121212] rounded-xl mb-2"><Lock className="text-white size-6" /></div>
                      <DialogTitle className="font-black uppercase tracking-tight text-lg">Device PIN</DialogTitle>
                      <DialogDescription className="text-xs font-medium">Enter 6-digit terminal code.</DialogDescription>
                    </DialogHeader>
                    
                    <div className="relative flex justify-center gap-1.5 sm:gap-2 py-6 sm:py-8 cursor-text" onClick={() => pinInputRef.current?.focus()}>
                      <input
                        ref={pinInputRef}
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={pinValue}
                        onChange={(e) => setPinValue(e.target.value.replace(/\D/g, ''))}
                        className="absolute inset-0 opacity-0 z-10"
                      />
                      {[...Array(6)].map((_, i) => (
                        <div 
                          key={i} 
                          className={cn(
                            "size-10 sm:size-12 rounded-lg sm:rounded-xl border-2 flex items-center justify-center text-lg font-black transition-all",
                            pinValue[i] ? "border-[#121212] bg-[#121212] text-white" : "border-muted bg-white"
                          )}
                        >
                          {pinValue[i] ? "●" : ""}
                        </div>
                      ))}
                    </div>
                    
                    <Button 
                      onClick={handlePinSubmit} 
                      disabled={pinValue.length < 6 || pinLoading} 
                      className="w-full bg-[#121212] h-12 rounded-xl font-bold uppercase text-[10px] tracking-widest shadow-lg"
                    >
                      {pinLoading ? <Loader2 className="animate-spin h-4 w-4" /> : "Verify Terminal PIN"}
                    </Button>
                 </DialogContent>
               </Dialog>

               <Button onClick={handleBiometricLogin} variant="outline" className="h-14 rounded-xl border-2 border-muted hover:border-[#121212] flex flex-col gap-1" type="button">
                  <Fingerprint className="h-4 w-4 text-[#121212]" />
                  <span className="text-[9px] font-black uppercase tracking-tighter">Biometric</span>
               </Button>
            </div>
          </form>

          <div className="flex flex-col items-center gap-4 text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
             <button onClick={() => setShowResetDialog(true)} className="hover:text-[#121212] transition-colors underline decoration-dotted">
               Request Recovery
             </button>
             <p>© 2026 Disruptive Solutions Inc.</p>
          </div>
        </div>
      </div>

      <div className="hidden lg:block flex-[1.2] relative bg-slate-900 overflow-hidden">
        <img src="/engineer_wallpaper.png" alt="Wallpaper" className="h-full w-full object-cover opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-r from-white via-transparent to-transparent w-full" />
        <div className="absolute bottom-12 right-12 p-8 bg-[#121212]/80 backdrop-blur-xl rounded-2xl border border-white/20 text-white max-w-sm shadow-2xl">
            <h3 className="text-xl font-black uppercase tracking-tighter">ENGINEERING DEPARTMENT</h3>
            <p className="text-xs text-white/60 mt-2 leading-relaxed">
              System monitoring active. Secure access point for engiconnect protocols.
            </p>
        </div>
      </div>

      <Dialog open={showLocationDialog} onOpenChange={setShowLocationDialog}>
        <DialogContent className="w-[95vw] sm:max-w-md bg-[#F9FAFA] border-none text-center rounded-[20px]">
          <DialogHeader><DialogTitle className="uppercase font-black tracking-tight text-center">Geo-Verification</DialogTitle></DialogHeader>
          <div className="py-4 space-y-4">
             <div className="h-16 w-16 bg-[#121212] rounded-full flex items-center justify-center mx-auto shadow-lg"><ShieldCheck className="text-white h-8 w-8" /></div>
             <p className="text-sm font-medium text-muted-foreground text-center">Logging site coordinates for engineering compliance.</p>
          </div>
          <DialogFooter className="flex flex-row justify-center gap-2">
            <Button variant="outline" className="rounded-xl px-6 flex-1 sm:flex-none" onClick={() => handlePostLogin(null)}>Skip</Button>
            <Button className="bg-[#121212] rounded-xl px-6 flex-1 sm:flex-none" onClick={async () => handlePostLogin(await getLocation())}>Verify</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showTicketDialog} onOpenChange={setShowTicketDialog}>
        <DialogContent className="w-[95vw] sm:max-w-md bg-[#F9FAFA] border-none shadow-2xl rounded-[20px]">
          <DialogHeader>
            <DialogTitle className="text-red-600 uppercase font-black text-2xl tracking-tighter">Access Locked</DialogTitle>
            <DialogDescription className="font-medium">Manual incident report required.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Incident Remarks</Label>
              <Input placeholder="Describe the request..." value={remarks} onChange={(e) => setRemarks(e.target.value)} className="h-12 border-2 bg-white rounded-xl" />
            </div>
            <Button onClick={submitTicket} disabled={ticketSubmitting || !remarks.trim()} className="w-full h-14 bg-red-600 hover:bg-red-700 text-white rounded-xl uppercase font-bold tracking-widest shadow-lg shadow-red-200">
              {ticketSubmitting ? "Submitting..." : "Submit Incident Ticket"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent className="w-[95vw] sm:max-w-md bg-[#F9FAFA] border-none shadow-2xl rounded-[20px]">
          <DialogHeader>
            <DialogTitle className="uppercase font-black text-xl tracking-tight text-[#121212]">Recovery Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground">Work Email</Label>
              <Input placeholder="name@disruptivesolutionsinc.com" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} className="h-12 rounded-xl border-2 border-muted bg-white" />
            </div>
            <Button onClick={handleRequestReset} disabled={resetLoading || !resetEmail} className="w-full h-12 bg-[#121212] text-white rounded-xl uppercase font-bold tracking-widest text-xs">
              {resetLoading ? "Processing..." : "Initiate Recovery"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}