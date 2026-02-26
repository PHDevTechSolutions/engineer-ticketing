"use client"

import * as React from "react"
import { 
  Lock, Globe, History, Eye, EyeOff, Sparkles, 
  Fingerprint, ShieldAlert, Asterisk, Pencil,
  SmartphoneNfc
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageHeader } from "@/components/page-header"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import ProtectedPageWrapper from "@/components/protected-page-wrapper"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export default function SecurityPage() {
  /**
   * FIX for TypeScript Error (image_becbc0.png):
   * AppSidebar expects 'string | undefined'. 
   * We initialize as 'undefined' and ensure localStorage 'null' results are converted.
   */
  const [userId, setUserId] = React.useState<string | undefined>(undefined)
  
  const [twoFactor, setTwoFactor] = React.useState(false)
  const [biometrics, setBiometrics] = React.useState(false)
  const [hasPinSet, setHasPinSet] = React.useState(false)

  const [showPass, setShowPass] = React.useState(false)
  const [isPassModalOpen, setIsPassModalOpen] = React.useState(false)
  const [isPinModalOpen, setIsPinModalOpen] = React.useState(false)

  const [passForm, setPassForm] = React.useState({ current: "", new: "", confirm: "" })
  const [pinForm, setPinForm] = React.useState({ newPin: "", confirmPin: "" })

  const pinInputRef = React.useRef<HTMLInputElement | null>(null)

  React.useEffect(() => {
    // Standardizing localStorage access
    const storedId = localStorage.getItem("userId")
    setUserId(storedId || undefined) // Conversion ensures no 'null' is passed to the sidebar
    
    setHasPinSet(!!localStorage.getItem("engiconnect_user_pin"))
    setBiometrics(localStorage.getItem("engiconnect_bio_enabled") === "true")
    setTwoFactor(localStorage.getItem("engiconnect_2fa_enabled") === "true")
  }, [])

  // --- PASSWORD GENERATOR ---
  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
    let generated = ""
    for (let i = 0; i < 14; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setPassForm({ ...passForm, new: generated, confirm: generated })
    setShowPass(true)
    toast.success("Strong password created!")
  }

  // --- STRENGTH CALCULATION ---
  const getStrength = (pass: string) => {
    if (!pass) return { label: "", color: "bg-zinc-100", width: "0%" }
    if (pass.length < 6) return { label: "Weak", color: "bg-red-500", width: "33%" }
    if (pass.length < 10) return { label: "Medium", color: "bg-amber-500", width: "66%" }
    return { label: "Strong", color: "bg-emerald-500", width: "100%" }
  }
  const strength = getStrength(passForm.new)

  const handlePinUpdate = () => {
    if (pinForm.newPin.length !== 6) return toast.error("PIN must be 6 digits")
    if (pinForm.newPin !== pinForm.confirmPin) return toast.error("PINs do not match")

    // Persisting the PIN
    localStorage.setItem("engiconnect_user_pin", pinForm.newPin)
    setHasPinSet(true)
    toast.success("PIN saved successfully!")
    setIsPinModalOpen(false)
    setPinForm({ newPin: "", confirmPin: "" })
  }

  return (
    <ProtectedPageWrapper>
      <SidebarProvider defaultOpen={false}>
        {/* Pass standardized userId */}
        <AppSidebar userId={userId} />
        
        <SidebarInset className="bg-[#F8F9F9]">
          <PageHeader 
            title="SECURITY" 
            version="V3.2" 
            showBackButton={true}
            trigger={<SidebarTrigger className="mr-2" />}
          />

          <main className="p-4 md:p-8 max-w-4xl mx-auto w-full space-y-6 pb-24">
            
            {/* SECTION 1: PASSWORD */}
            <section className="bg-white rounded-[24px] border border-zinc-200/50 p-6 md:p-8 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-zinc-900 text-white rounded-[14px]">
                    <Lock className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[11px] uppercase tracking-widest text-zinc-900">Account Password</h3>
                    <p className="text-xs text-zinc-400 font-medium">Standard sign-in method</p>
                  </div>
                </div>

                <Dialog open={isPassModalOpen} onOpenChange={setIsPassModalOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="rounded-xl text-[10px] font-bold uppercase border-zinc-200 px-5 hover:bg-zinc-50 active:scale-95">
                      Update
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[420px] rounded-[28px] p-8 border-none">
                    <DialogHeader>
                      <div className="flex items-center justify-between mb-2">
                        <DialogTitle className="font-bold text-sm uppercase tracking-widest">Update Password</DialogTitle>
                        <Button 
                          onClick={generatePassword} 
                          variant="ghost" 
                          className="h-8 text-[9px] font-bold uppercase gap-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <Sparkles className="size-3" /> Auto-Generate
                        </Button>
                      </div>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Current Password</Label>
                        <Input type="password" placeholder="••••••••" className="rounded-xl h-12 bg-zinc-50 border-none" value={passForm.current} onChange={(e) => setPassForm({...passForm, current: e.target.value})} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">New Password</Label>
                        <div className="relative">
                          <Input type={showPass ? "text" : "password"} placeholder="••••••••" className="rounded-xl h-12 bg-zinc-50 border-none" value={passForm.new} onChange={(e) => setPassForm({...passForm, new: e.target.value})} />
                          <button onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-300">
                            {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                          </button>
                        </div>
                        {passForm.new && (
                          <div className="mt-3 px-1">
                            <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                              <div className={`h-full transition-all duration-500 ${strength.color}`} style={{ width: strength.width }} />
                            </div>
                            <p className="text-[9px] font-bold text-zinc-500 mt-1.5 uppercase">Strength: {strength.label}</p>
                          </div>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Confirm New</Label>
                        <Input type={showPass ? "text" : "password"} placeholder="••••••••" className="rounded-xl h-12 bg-zinc-50 border-none" value={passForm.confirm} onChange={(e) => setPassForm({...passForm, confirm: e.target.value})} />
                      </div>
                    </div>
                    <Button onClick={() => setIsPassModalOpen(false)} className="w-full bg-zinc-900 text-white rounded-xl h-12 font-bold uppercase text-[10px] shadow-lg">Save New Password</Button>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex gap-4">
                <ShieldAlert className="size-5 text-blue-600 shrink-0" />
                <p className="text-[11px] text-blue-800 leading-relaxed font-medium">
                  <strong>engiconnect Tip:</strong> High-entropy passwords (using letters, numbers, and symbols) are required for project leads.
                </p>
              </div>
            </section>

            {/* SECTION 2: PIN & BIOMETRICS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-[24px] border border-zinc-200/50 p-8 shadow-sm">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-zinc-50 text-zinc-900 rounded-xl">
                    <Asterisk className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[11px] uppercase tracking-widest">Login PIN</h3>
                    <p className="text-[10px] text-zinc-400 font-medium">Device-specific terminal access</p>
                  </div>
                </div>
                
                <Dialog open={isPinModalOpen} onOpenChange={setIsPinModalOpen}>
                  <DialogTrigger asChild>
                    <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-dashed border-zinc-200 cursor-pointer hover:bg-zinc-100 transition-all">
                      <span className="text-sm font-bold tracking-[0.4em]">{hasPinSet ? "••••••" : "000000"}</span>
                      <div className="h-8 px-3 flex items-center rounded-lg text-[9px] font-bold uppercase bg-white border border-zinc-100">
                        <Pencil className="size-3 mr-1.5" /> {hasPinSet ? "Change" : "Set"}
                      </div>
                    </div>
                  </DialogTrigger>
                  <DialogContent className="rounded-[28px] p-8 border-none text-center">
                    <DialogHeader className="items-center">
                      <DialogTitle className="font-bold uppercase tracking-widest text-sm">Terminal Security PIN</DialogTitle>
                      <DialogDescription className="text-xs">Required for terminal authorization on this device.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-6">
                      <Input 
                        ref={pinInputRef}
                        type="password" 
                        maxLength={6} 
                        placeholder="New PIN" 
                        className="rounded-xl h-14 text-center text-2xl tracking-[0.5em] font-bold bg-zinc-50 border-none" 
                        value={pinForm.newPin} 
                        onChange={(e) => setPinForm({...pinForm, newPin: e.target.value.replace(/\D/g, '')})} 
                      />
                      <Input 
                        type="password" 
                        maxLength={6} 
                        placeholder="Confirm PIN" 
                        className="rounded-xl h-14 text-center text-2xl tracking-[0.5em] font-bold bg-zinc-50 border-none" 
                        value={pinForm.confirmPin} 
                        onChange={(e) => setPinForm({...pinForm, confirmPin: e.target.value.replace(/\D/g, '')})} 
                      />
                    </div>
                    <Button onClick={handlePinUpdate} className="w-full bg-blue-600 text-white rounded-xl h-12 font-bold uppercase text-[10px] shadow-lg shadow-blue-100">Update PIN</Button>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="bg-white rounded-[24px] border border-zinc-200/50 p-8 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                      <Fingerprint className="size-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[11px] uppercase tracking-widest">Biometrics</h3>
                      <p className="text-[10px] text-zinc-400 font-medium">Face / Touch ID</p>
                    </div>
                  </div>
                  <Switch checked={biometrics} onCheckedChange={(val) => {
                    setBiometrics(val);
                    localStorage.setItem("engiconnect_bio_enabled", String(val));
                    toast.success(val ? "Biometrics enabled" : "Biometrics disabled");
                  }} />
                </div>
                <p className="text-[10px] text-zinc-500 font-medium mt-4 leading-relaxed">Enable biometric signing for faster project approvals.</p>
              </div>
            </div>

            {/* SECTION 3: 2FA */}
            <div className="bg-white rounded-[24px] border border-zinc-200/50 p-8 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-600 text-white rounded-xl shadow-md shadow-blue-50">
                  <SmartphoneNfc className="size-5" />
                </div>
                <div>
                  <h3 className="font-bold text-[11px] uppercase tracking-widest">Two-Step Verification</h3>
                  <p className="text-xs text-zinc-400 font-medium">SMS or Authenticator App</p>
                </div>
              </div>
              <Switch checked={twoFactor} onCheckedChange={(val) => {
                setTwoFactor(val);
                localStorage.setItem("engiconnect_2fa_enabled", String(val));
                toast.success(val ? "2FA enabled" : "2FA disabled");
              }} />
            </div>

            {/* SECTION 4: ACTIVITY HISTORY */}
            <div className="bg-white rounded-[24px] border border-zinc-200/50 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-zinc-50 flex items-center gap-4 bg-zinc-50/20">
                 <History className="size-5 text-zinc-400" />
                 <h3 className="font-bold text-[11px] uppercase tracking-widest">Recent Activity</h3>
              </div>
              <div className="divide-y divide-zinc-50">
                {[
                  { device: "Chrome on Windows", location: "Quezon City, PH", time: "Active now", current: true },
                  { device: "iPhone 15 Pro", location: "Manila, PH", time: "2h ago", current: false },
                ].map((session, i) => (
                  <div key={i} className="p-6 flex items-center justify-between hover:bg-zinc-50/30 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="size-10 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-500">
                        <Globe className="size-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-zinc-900">{session.device}</p>
                          {session.current && <span className="text-[8px] font-black uppercase bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-200">Current</span>}
                        </div>
                        <p className="text-[10px] text-zinc-400 font-medium">{session.location} • {session.time}</p>
                      </div>
                    </div>
                    {!session.current && <button className="text-[10px] font-bold uppercase text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all">Terminate</button>}
                  </div>
                ))}
              </div>
            </div>

          </main>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedPageWrapper>
  )
}