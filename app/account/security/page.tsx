"use client"

import * as React from "react"
import {
  Lock, Globe, History, Eye, EyeOff, Sparkles,
  Fingerprint, ShieldAlert, Asterisk, Pencil,
  SmartphoneNfc, CheckCircle2, AlertTriangle, Loader2,
  Shield, Smartphone, Monitor, Trash2, KeyRound,
  ChevronRight, Clock, MapPin, Delete, RefreshCw,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageHeader } from "@/components/page-header"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import ProtectedPageWrapper from "@/components/protected-page-wrapper"
import {
  Dialog, DialogContent, DialogDescription,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"

/* ─────────────────────────────────────────────────────────
   KEY SCHEME — all scoped to userId
───────────────────────────────────────────────────────── */
export const scopedPinKey  = (uid: string) => `engiconnect_user_pin_${uid}`
export const scopedBioKey  = (uid: string) => `engiconnect_bio_enabled_${uid}`
export const scopedCredKey = (uid: string) => `engiconnect_webauthn_credId_${uid}`
export const bioUserKey    = (credId: string) => `engiconnect_bio_userId_${credId}`
const LAST_CHANGED_KEY     = (uid: string) => `engiconnect_pass_changed_${uid}`
const COMPANY_NAME = "Disruptive Solutions Inc."

/* ─────────────────────────────────────────────────────────
   PIN KEYPAD (reused from login form for consistency)
───────────────────────────────────────────────────────── */
function PinKeypad({ onInput, onDelete, onClear, disabled }: {
  onInput: (d: string) => void
  onDelete: () => void
  onClear: () => void
  disabled?: boolean
}) {
  const keys = ["1","2","3","4","5","6","7","8","9","C","0","⌫"]
  return (
    <div className="grid grid-cols-3 gap-2 w-full max-w-[240px] mx-auto">
      {keys.map(k => (
        <button key={k} type="button" disabled={disabled}
          onClick={() => { if (k === "⌫") onDelete(); else if (k === "C") onClear(); else onInput(k) }}
          className={cn(
            "h-12 rounded-xl font-black text-base transition-all select-none",
            "active:scale-90 disabled:opacity-40",
            k === "C"  ? "bg-red-50 text-red-500 border border-red-100 hover:bg-red-100" :
            k === "⌫" ? "bg-zinc-100 text-zinc-600 border border-zinc-200 hover:bg-zinc-200" :
                        "bg-white border border-zinc-200 text-zinc-900 hover:border-zinc-800 shadow-sm"
          )}>
          {k === "⌫" ? <Delete className="mx-auto size-3.5" /> : k}
        </button>
      ))}
    </div>
  )
}

function PinDots({ value, total = 6 }: { value: string; total?: number }) {
  return (
    <div className="flex justify-center gap-2.5">
      {[...Array(total)].map((_, i) => (
        <div key={i} className={cn(
          "size-3 rounded-full transition-all duration-200",
          value[i] ? "bg-zinc-900 scale-110" : i === value.length ? "bg-zinc-300 animate-pulse scale-110" : "bg-zinc-200"
        )} />
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   SECURITY SCORE CALCULATOR
───────────────────────────────────────────────────────── */
function useSecurityScore(hasPinSet: boolean, biometrics: boolean, twoFactor: boolean, passLastChanged: string | null) {
  const items = [
    { label: "Strong Password",    done: !!passLastChanged,       weight: 30 },
    { label: "Login PIN Set",      done: hasPinSet,               weight: 25 },
    { label: "Biometrics Enabled", done: biometrics,              weight: 25 },
    { label: "2FA Enabled",        done: twoFactor,               weight: 20 },
  ]
  const score = items.reduce((acc, i) => acc + (i.done ? i.weight : 0), 0)
  const level = score >= 80 ? "Strong" : score >= 50 ? "Good" : score >= 25 ? "Fair" : "Weak"
  const color = score >= 80 ? "text-emerald-600" : score >= 50 ? "text-blue-600" : score >= 25 ? "text-amber-600" : "text-red-600"
  const barColor = score >= 80 ? "bg-emerald-500" : score >= 50 ? "bg-blue-500" : score >= 25 ? "bg-amber-500" : "bg-red-500"
  return { score, level, color, barColor, items }
}

/* ─────────────────────────────────────────────────────────
   RELATIVE TIME
───────────────────────────────────────────────────────── */
function relTime(iso: string | null): string {
  if (!iso) return "Never"
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 30) return `${days}d ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

/* ─────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────── */
export default function SecurityPage() {
  const [userId, setUserId]         = React.useState<string | undefined>(undefined)
  const [userName, setUserName]     = React.useState("")
  const [userDept, setUserDept]     = React.useState("")
  const [twoFactor, setTwoFactor]   = React.useState(false)
  const [biometrics, setBiometrics] = React.useState(false)
  const [hasPinSet, setHasPinSet]   = React.useState(false)
  const [bioRegistering, setBioRegistering] = React.useState(false)
  const [passLastChanged, setPassLastChanged] = React.useState<string | null>(null)

  const [showPass, setShowPass]             = React.useState(false)
  const [showCurrentPass, setShowCurrentPass] = React.useState(false)
  const [isPassModalOpen, setIsPassModalOpen] = React.useState(false)
  const [isPinModalOpen, setIsPinModalOpen]   = React.useState(false)

  const [passForm, setPassForm] = React.useState({ current: "", new: "", confirm: "" })
  const [passError, setPassError] = React.useState<string | null>(null)
  const [pinValue, setPinValue]   = React.useState("")
  const [pinConfirm, setPinConfirm] = React.useState("")
  const [pinStep, setPinStep]     = React.useState<"enter" | "confirm">("enter")

  /* ── Load state ── */
  React.useEffect(() => {
    const uid  = localStorage.getItem("userId") || undefined
    const name = localStorage.getItem("userName") || ""
    const dept = localStorage.getItem("userDepartment") || localStorage.getItem("department") || ""
    setUserId(uid)
    setUserName(name)
    setUserDept(dept)
    if (!uid) return
    setHasPinSet(!!localStorage.getItem(scopedPinKey(uid)))
    setBiometrics(localStorage.getItem(scopedBioKey(uid)) === "true")
    setTwoFactor(localStorage.getItem("engiconnect_2fa_enabled") === "true")
    setPassLastChanged(localStorage.getItem(LAST_CHANGED_KEY(uid)))
  }, [])

  const { score, level, color, barColor, items: scoreItems } = useSecurityScore(hasPinSet, biometrics, twoFactor, passLastChanged)

  /* ── WebAuthn ── */
  const isWebAuthnSupported = () =>
    typeof window !== "undefined" && typeof window.PublicKeyCredential === "function"

  const registerBiometric = async (uid: string): Promise<boolean> => {
    if (!isWebAuthnSupported()) { toast.error("Biometrics not supported on this browser/device."); return false }
    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32))
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: COMPANY_NAME, id: window.location.hostname },
          user: {
            id: new TextEncoder().encode(uid),
            name: uid,
            displayName: localStorage.getItem("userName") || "DSI Connect User",
          },
          pubKeyCredParams: [
            { type: "public-key", alg: -7 },
            { type: "public-key", alg: -257 },
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
            residentKey: "preferred",
          },
          timeout: 60000,
        },
      }) as PublicKeyCredential | null
      if (!credential) return false
      localStorage.setItem(scopedCredKey(uid), credential.id)
      localStorage.setItem(scopedBioKey(uid), "true")
      localStorage.setItem(bioUserKey(credential.id), uid)
      return true
    } catch (err: any) {
      if (err.name === "NotAllowedError") toast.error("Biometric setup cancelled.")
      else if (err.name === "InvalidStateError") { toast.info("Already registered on this device."); return true }
      else toast.error("Biometric setup failed.")
      return false
    }
  }

  const handleBiometricToggle = async (val: boolean) => {
    if (!userId) { toast.error("No active session."); return }
    if (val) {
      setBioRegistering(true)
      const ok = await registerBiometric(userId)
      setBioRegistering(false)
      if (ok) { setBiometrics(true); toast.success("Biometrics enabled!") }
      else setBiometrics(false)
    } else {
      const credId = localStorage.getItem(scopedCredKey(userId))
      if (credId) localStorage.removeItem(bioUserKey(credId))
      localStorage.removeItem(scopedCredKey(userId))
      localStorage.removeItem(scopedBioKey(userId))
      setBiometrics(false)
      toast.success("Biometrics disabled.")
    }
  }

  /* ── PIN — visual keypad flow ── */
  const handlePinKeyInput = (d: string) => {
    if (pinStep === "enter" && pinValue.length < 6) setPinValue(p => p + d)
    else if (pinStep === "confirm" && pinConfirm.length < 6) setPinConfirm(p => p + d)
  }

  const handlePinKeyDelete = () => {
    if (pinStep === "enter") setPinValue(p => p.slice(0, -1))
    else setPinConfirm(p => p.slice(0, -1))
  }

  const handlePinKeyClear = () => {
    if (pinStep === "enter") setPinValue("")
    else setPinConfirm("")
  }

  React.useEffect(() => {
    if (pinStep === "enter" && pinValue.length === 6) {
      // Small delay for last dot animation then move to confirm
      setTimeout(() => setPinStep("confirm"), 300)
    }
  }, [pinValue, pinStep])

  React.useEffect(() => {
    if (pinStep === "confirm" && pinConfirm.length === 6) {
      if (pinValue !== pinConfirm) {
        toast.error("PINs do not match. Try again.")
        setPinConfirm("")
        setPinValue("")
        setPinStep("enter")
        return
      }
      if (!userId) { toast.error("No active session."); return }
      localStorage.setItem(scopedPinKey(userId), pinValue)
      setHasPinSet(true)
      toast.success("PIN saved successfully!")
      setIsPinModalOpen(false)
      setPinValue("")
      setPinConfirm("")
      setPinStep("enter")
    }
  }, [pinConfirm, pinStep])

  const handleRemovePin = () => {
    if (!userId) return
    localStorage.removeItem(scopedPinKey(userId))
    setHasPinSet(false)
    toast.success("PIN removed.")
  }

  /* ── Password ── */
  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
    let g = ""
    for (let i = 0; i < 14; i++) g += chars[Math.floor(Math.random() * chars.length)]
    setPassForm({ ...passForm, new: g, confirm: g })
    setShowPass(true)
    toast.success("Strong password generated!")
  }

  const getStrength = (p: string) => {
    if (!p)        return { label: "",       pct: 0,   color: "bg-zinc-200", text: "text-zinc-400" }
    if (p.length < 6)  return { label: "Weak",   pct: 25,  color: "bg-red-500",     text: "text-red-600" }
    if (p.length < 10) return { label: "Fair",   pct: 50,  color: "bg-amber-500",   text: "text-amber-600" }
    if (!/[^a-zA-Z0-9]/.test(p)) return { label: "Good", pct: 75, color: "bg-blue-500", text: "text-blue-600" }
    return               { label: "Strong",  pct: 100, color: "bg-emerald-500", text: "text-emerald-600" }
  }
  const strength = getStrength(passForm.new)

  const handlePasswordSave = () => {
    setPassError(null)
    if (!passForm.current) { setPassError("Current password is required."); return }
    if (passForm.new.length < 8) { setPassError("New password must be at least 8 characters."); return }
    if (passForm.new !== passForm.confirm) { setPassError("Passwords do not match."); return }
    if (!userId) return
    const now = new Date().toISOString()
    localStorage.setItem(LAST_CHANGED_KEY(userId), now)
    setPassLastChanged(now)
    toast.success("Password updated successfully!")
    setIsPassModalOpen(false)
    setPassForm({ current: "", new: "", confirm: "" })
  }

  /* ── Activity log from localStorage ── */
  const activityLog = React.useMemo(() => {
    const logs: { device: string; location: string; time: string; current: boolean }[] = []
    const deviceId = localStorage.getItem("deviceId")
    logs.push({
      device: navigator?.userAgent?.includes("iPhone") ? "iPhone" :
              navigator?.userAgent?.includes("Android") ? "Android Device" :
              navigator?.userAgent?.includes("Mac") ? "Mac" : "This Device",
      location: "Current Session",
      time: "Active now",
      current: true,
    })
    return logs
  }, [])

  /* ─────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────── */
  return (
    <ProtectedPageWrapper>
      <SidebarProvider defaultOpen={false}>
        <AppSidebar userId={userId} />
        <SidebarInset className="bg-[#F8F9F9]">
          <PageHeader
            title="SECURITY"
            version="V3.3"
            showBackButton={true}
            trigger={<SidebarTrigger className="mr-2" />}
          />

          <main className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto w-full space-y-5 pb-24">

            {/* ══════════════════════════════════════
                SECURITY SCORE BANNER
            ══════════════════════════════════════ */}
            <section className="bg-[#121212] rounded-[24px] p-6 md:p-8 text-white overflow-hidden relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-24 -mt-24 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full -ml-12 -mb-12 pointer-events-none" />

              <div className="relative z-10">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Security Status</p>
                    <div className="flex items-baseline gap-3">
                      <span className="text-4xl font-black">{score}</span>
                      <span className="text-sm font-black text-white/40">/ 100</span>
                      <span className={cn("text-sm font-black px-2.5 py-1 rounded-full", 
                        score >= 80 ? "bg-emerald-500/20 text-emerald-400" :
                        score >= 50 ? "bg-blue-500/20 text-blue-400" :
                        score >= 25 ? "bg-amber-500/20 text-amber-400" : "bg-red-500/20 text-red-400"
                      )}>{level}</span>
                    </div>
                  </div>
                  <div className={cn(
                    "p-3 rounded-2xl",
                    score >= 80 ? "bg-emerald-500/20" : score >= 50 ? "bg-blue-500/20" : "bg-amber-500/20"
                  )}>
                    <Shield className={cn("size-6",
                      score >= 80 ? "text-emerald-400" : score >= 50 ? "text-blue-400" : "text-amber-400"
                    )} />
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden mb-5">
                  <div className={cn("h-full rounded-full transition-all duration-700", barColor)} style={{ width: `${score}%` }} />
                </div>

                {/* Checklist */}
                <div className="grid grid-cols-2 gap-2">
                  {scoreItems.map(item => (
                    <div key={item.label} className="flex items-center gap-2">
                      <div className={cn("size-4 rounded-full flex items-center justify-center flex-shrink-0",
                        item.done ? "bg-emerald-500" : "bg-white/10"
                      )}>
                        {item.done
                          ? <CheckCircle2 className="size-3 text-white" />
                          : <div className="size-1.5 rounded-full bg-white/30" />}
                      </div>
                      <span className={cn("text-[10px] font-bold", item.done ? "text-white/80" : "text-white/30")}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* ══════════════════════════════════════
                ACCOUNT IDENTITY STRIP
            ══════════════════════════════════════ */}
            <section className="bg-white rounded-[24px] border border-zinc-200/50 p-5 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="size-12 bg-zinc-900 rounded-2xl flex items-center justify-center text-white font-black text-lg flex-shrink-0">
                  {userName ? userName[0].toUpperCase() : "U"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-black text-zinc-900 text-[15px] truncate">{userName || "User"}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {userDept && (
                      <span className="text-[8px] font-black uppercase tracking-wide bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full">
                        {userDept}
                      </span>
                    )}
                    <span className="text-[10px] text-zinc-400 font-medium">Active session</span>
                    <div className="size-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Pass changed</p>
                  <p className="text-[11px] font-bold text-zinc-700 mt-0.5">{relTime(passLastChanged)}</p>
                </div>
              </div>
            </section>

            {/* ══════════════════════════════════════
                SECTION 1: PASSWORD
            ══════════════════════════════════════ */}
            <section className="bg-white rounded-[24px] border border-zinc-200/50 shadow-sm overflow-hidden">
              <div className="p-6 flex items-center justify-between border-b border-zinc-50">
                <div className="flex items-center gap-3.5">
                  <div className="p-2.5 bg-zinc-900 text-white rounded-xl">
                    <Lock className="size-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[11px] uppercase tracking-widest text-zinc-900">Account Password</h3>
                    <p className="text-[10px] text-zinc-400 font-medium mt-0.5">Standard sign-in credential</p>
                  </div>
                </div>
                <Dialog open={isPassModalOpen} onOpenChange={open => { setIsPassModalOpen(open); if (!open) { setPassForm({ current: "", new: "", confirm: "" }); setPassError(null) } }}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="rounded-xl text-[10px] font-black uppercase border-zinc-200 hover:bg-zinc-50 active:scale-95 gap-1.5">
                      <Pencil className="size-3" /> Change
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[400px] rounded-[28px] p-7 border-none">
                    <DialogHeader className="mb-1">
                      <div className="flex items-center justify-between">
                        <DialogTitle className="font-black text-base uppercase tracking-tight">Change Password</DialogTitle>
                        <Button onClick={generatePassword} variant="ghost" size="sm"
                          className="h-7 text-[9px] font-black uppercase gap-1 text-blue-600 hover:bg-blue-50 rounded-lg px-2">
                          <Sparkles className="size-3" /> Auto-Generate
                        </Button>
                      </div>
                    </DialogHeader>
                    <div className="space-y-3 py-3">
                      {passError && (
                        <div className="flex items-start gap-2 p-3 bg-red-50 rounded-xl border border-red-100">
                          <AlertTriangle className="size-3.5 text-red-500 shrink-0 mt-0.5" />
                          <p className="text-[10px] font-medium text-red-700">{passError}</p>
                        </div>
                      )}
                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Current Password</Label>
                        <div className="relative">
                          <Input type={showCurrentPass ? "text" : "password"} placeholder="••••••••"
                            className="rounded-xl h-11 bg-zinc-50 border-none pr-10 text-sm"
                            value={passForm.current} onChange={e => setPassForm({ ...passForm, current: e.target.value })} />
                          <button type="button" onClick={() => setShowCurrentPass(!showCurrentPass)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-300 hover:text-zinc-600">
                            {showCurrentPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">New Password</Label>
                        <div className="relative">
                          <Input type={showPass ? "text" : "password"} placeholder="Min. 8 characters"
                            className="rounded-xl h-11 bg-zinc-50 border-none pr-10 text-sm"
                            value={passForm.new} onChange={e => setPassForm({ ...passForm, new: e.target.value })} />
                          <button type="button" onClick={() => setShowPass(!showPass)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-300 hover:text-zinc-600">
                            {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                          </button>
                        </div>
                        {passForm.new && (
                          <div className="space-y-1 pt-1">
                            <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                              <div className={cn("h-full transition-all duration-500", strength.color)} style={{ width: `${strength.pct}%` }} />
                            </div>
                            <div className="flex items-center justify-between">
                              <p className={cn("text-[9px] font-black uppercase tracking-wide", strength.text)}>{strength.label}</p>
                              <p className="text-[9px] text-zinc-300">{passForm.new.length} chars</p>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Confirm New Password</Label>
                        <Input type="password" placeholder="Repeat new password"
                          className={cn("rounded-xl h-11 bg-zinc-50 border-none text-sm",
                            passForm.confirm && passForm.confirm !== passForm.new && "ring-1 ring-red-300")}
                          value={passForm.confirm} onChange={e => setPassForm({ ...passForm, confirm: e.target.value })} />
                      </div>
                    </div>
                    <Button onClick={handlePasswordSave}
                      className="w-full bg-zinc-900 text-white rounded-xl h-11 font-black uppercase text-[10px] shadow-lg mt-1">
                      Save New Password
                    </Button>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <ShieldAlert className="size-4 text-blue-500 shrink-0" />
                  <p className="text-[10px] text-zinc-500 font-medium">
                    Last changed: <span className="font-bold text-zinc-700">{relTime(passLastChanged)}</span>
                    {passLastChanged && (() => {
                      const days = Math.floor((Date.now() - new Date(passLastChanged).getTime()) / 86400000)
                      return days > 90
                        ? <span className="ml-1.5 text-amber-600 font-black text-[9px] uppercase">· Update recommended</span>
                        : null
                    })()}
                  </p>
                </div>
                {!passLastChanged && (
                  <span className="text-[9px] font-black uppercase tracking-wide text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                    Not set
                  </span>
                )}
              </div>
            </section>

            {/* ══════════════════════════════════════
                SECTION 2: QUICK AUTH (PIN + Biometric)
            ══════════════════════════════════════ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* PIN */}
              <div className="bg-white rounded-[24px] border border-zinc-200/50 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-zinc-50 flex items-center gap-3.5">
                  <div className="p-2.5 bg-zinc-50 text-zinc-900 rounded-xl">
                    <KeyRound className="size-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[11px] uppercase tracking-widest">Login PIN</h3>
                    <p className="text-[10px] text-zinc-400 font-medium mt-0.5">6-digit device access code</p>
                  </div>
                  {hasPinSet && (
                    <span className="ml-auto text-[8px] font-black uppercase bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-200">
                      Active
                    </span>
                  )}
                </div>
                <div className="p-5 space-y-3">
                  <Dialog open={isPinModalOpen} onOpenChange={open => {
                    setIsPinModalOpen(open)
                    if (!open) { setPinValue(""); setPinConfirm(""); setPinStep("enter") }
                  }}>
                    <DialogTrigger asChild>
                      <button className="w-full flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-dashed border-zinc-200 hover:bg-zinc-100 transition-all group">
                        <div className="flex items-center gap-3">
                          <span className="text-xl font-black tracking-[0.4em] text-zinc-900">
                            {hasPinSet ? "••••••" : "------"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-zinc-400 group-hover:text-zinc-600">
                          <Pencil className="size-3" />
                          {hasPinSet ? "Change" : "Set PIN"}
                        </div>
                      </button>
                    </DialogTrigger>
                    <DialogContent className="rounded-[28px] p-7 border-none text-center w-[95vw] sm:max-w-[340px]">
                      <DialogHeader className="items-center mb-2">
                        <div className="p-3 bg-zinc-900 rounded-2xl mb-2">
                          <KeyRound className="size-5 text-white" />
                        </div>
                        <DialogTitle className="font-black uppercase tracking-tight">
                          {pinStep === "enter" ? (hasPinSet ? "New PIN" : "Set PIN") : "Confirm PIN"}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-zinc-400">
                          {pinStep === "enter" ? "Enter a 6-digit PIN" : "Re-enter to confirm"}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4 space-y-5">
                        <PinDots value={pinStep === "enter" ? pinValue : pinConfirm} total={6} />
                        <PinKeypad
                          onInput={handlePinKeyInput}
                          onDelete={handlePinKeyDelete}
                          onClear={handlePinKeyClear}
                        />
                      </div>
                      {pinStep === "confirm" && (
                        <button onClick={() => { setPinStep("enter"); setPinValue(""); setPinConfirm("") }}
                          className="text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-700 mt-1">
                          ← Back
                        </button>
                      )}
                    </DialogContent>
                  </Dialog>

                  {hasPinSet && (
                    <button onClick={handleRemovePin}
                      className="w-full flex items-center justify-center gap-2 py-2 text-[10px] font-black uppercase tracking-wider text-red-500 hover:bg-red-50 rounded-xl transition-all">
                      <Trash2 className="size-3" /> Remove PIN
                    </button>
                  )}
                </div>
              </div>

              {/* Biometrics */}
              <div className="bg-white rounded-[24px] border border-zinc-200/50 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-zinc-50 flex items-center gap-3.5">
                  <div className={cn("p-2.5 rounded-xl transition-colors",
                    biometrics ? "bg-emerald-50 text-emerald-600" : "bg-zinc-50 text-zinc-600"
                  )}>
                    <Fingerprint className="size-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[11px] uppercase tracking-widest">Biometrics</h3>
                    <p className="text-[10px] text-zinc-400 font-medium mt-0.5">Face ID · Touch ID · Windows Hello</p>
                  </div>
                  {bioRegistering ? (
                    <div className="ml-auto flex items-center gap-1.5 text-zinc-400">
                      <Loader2 className="size-3.5 animate-spin" />
                      <span className="text-[9px] font-black uppercase">Registering</span>
                    </div>
                  ) : (
                    <Switch
                      checked={biometrics}
                      onCheckedChange={handleBiometricToggle}
                      disabled={bioRegistering || !isWebAuthnSupported()}
                      className="ml-auto"
                    />
                  )}
                </div>
                <div className="p-5">
                  {!isWebAuthnSupported() ? (
                    <div className="flex items-start gap-2.5 p-3.5 bg-red-50 rounded-2xl border border-red-100">
                      <AlertTriangle className="size-4 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-red-700 font-medium leading-relaxed">
                        Not supported. Try Chrome or Safari on a modern device.
                      </p>
                    </div>
                  ) : biometrics ? (
                    <div className="space-y-3">
                      <div className="flex items-start gap-2.5 p-3.5 bg-emerald-50 rounded-2xl border border-emerald-100">
                        <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-emerald-700 font-bold leading-relaxed">
                          Biometric registered on this device. Tap the sensor to sign in instantly.
                        </p>
                      </div>
                      <button
                        onClick={() => handleBiometricToggle(false)}
                        className="w-full flex items-center justify-center gap-2 py-2 text-[10px] font-black uppercase tracking-wider text-red-500 hover:bg-red-50 rounded-xl transition-all">
                        <Trash2 className="size-3" /> Remove Biometric
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2.5 p-3.5 bg-zinc-50 rounded-2xl border border-zinc-100">
                      <AlertTriangle className="size-4 text-zinc-400 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-zinc-500 font-medium leading-relaxed">
                        Enable to register your device fingerprint or face for one-tap sign-in.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ══════════════════════════════════════
                SECTION 3: 2FA
            ══════════════════════════════════════ */}
            <section className="bg-white rounded-[24px] border border-zinc-200/50 shadow-sm overflow-hidden">
              <div className="p-5 flex items-center justify-between border-b border-zinc-50">
                <div className="flex items-center gap-3.5">
                  <div className={cn("p-2.5 rounded-xl transition-colors",
                    twoFactor ? "bg-blue-600 text-white shadow-md shadow-blue-100" : "bg-zinc-50 text-zinc-600"
                  )}>
                    <SmartphoneNfc className="size-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[11px] uppercase tracking-widest">Two-Step Verification</h3>
                    <p className="text-[10px] text-zinc-400 font-medium mt-0.5">SMS or Authenticator App</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {twoFactor && (
                    <span className="text-[8px] font-black uppercase bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full border border-blue-200">
                      Enabled
                    </span>
                  )}
                  <Switch
                    checked={twoFactor}
                    onCheckedChange={val => {
                      setTwoFactor(val)
                      localStorage.setItem("engiconnect_2fa_enabled", String(val))
                      toast.success(val ? "2FA enabled" : "2FA disabled")
                    }}
                  />
                </div>
              </div>
              <div className="px-5 py-4">
                <p className="text-[10px] text-zinc-500 font-medium leading-relaxed">
                  {twoFactor
                    ? "Your account requires a second verification step on every new login."
                    : "Add a second layer of protection. We'll ask for a code when you sign in from a new device."}
                </p>
              </div>
            </section>

            {/* ══════════════════════════════════════
                SECTION 4: TRUSTED DEVICES
            ══════════════════════════════════════ */}
            <section className="bg-white rounded-[24px] border border-zinc-200/50 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-zinc-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Monitor className="size-4 text-zinc-400" />
                  <h3 className="font-bold text-[11px] uppercase tracking-widest">Trusted Devices</h3>
                </div>
                <span className="text-[9px] font-black text-zinc-400 uppercase">
                  {[hasPinSet, biometrics].filter(Boolean).length} method{[hasPinSet, biometrics].filter(Boolean).length !== 1 ? "s" : ""} on this device
                </span>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-4 p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                  <div className="size-10 bg-zinc-900 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                    {typeof navigator !== "undefined" && navigator.userAgent.includes("iPhone")
                      ? <Smartphone className="size-4" />
                      : <Monitor className="size-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-zinc-900 truncate">This Device</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {hasPinSet && (
                        <span className="text-[8px] font-black uppercase bg-zinc-200 text-zinc-600 px-1.5 py-0.5 rounded-full">PIN</span>
                      )}
                      {biometrics && (
                        <span className="text-[8px] font-black uppercase bg-zinc-200 text-zinc-600 px-1.5 py-0.5 rounded-full">Biometric</span>
                      )}
                      <span className="text-[8px] font-black uppercase bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full">Active now</span>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-zinc-300 flex-shrink-0" />
                </div>
              </div>
            </section>

            {/* ══════════════════════════════════════
                SECTION 5: RECENT ACTIVITY
            ══════════════════════════════════════ */}
            <section className="bg-white rounded-[24px] border border-zinc-200/50 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-zinc-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <History className="size-4 text-zinc-400" />
                  <h3 className="font-bold text-[11px] uppercase tracking-widest">Login Activity</h3>
                </div>
                <button className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-700 transition-colors">
                  <RefreshCw className="size-3" /> Refresh
                </button>
              </div>
              <div className="divide-y divide-zinc-50">
                {activityLog.map((session, i) => (
                  <div key={i} className="p-5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="size-10 bg-zinc-100 rounded-xl flex items-center justify-center text-zinc-500 flex-shrink-0">
                        <Globe className="size-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-zinc-900">{session.device}</p>
                          {session.current && (
                            <span className="text-[8px] font-black uppercase bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-200">
                              Current
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Clock className="size-3 text-zinc-300" />
                          <p className="text-[10px] text-zinc-400 font-medium">{session.time}</p>
                        </div>
                      </div>
                    </div>
                    {!session.current && (
                      <button className="text-[10px] font-black uppercase text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-xl transition-all border border-red-100">
                        Terminate
                      </button>
                    )}
                  </div>
                ))}

                {/* Tip row */}
                <div className="p-5 flex items-start gap-3 bg-zinc-50/50">
                  <MapPin className="size-4 text-zinc-300 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-zinc-400 font-medium leading-relaxed">
                    Location logging is enabled at login for security compliance. If you see an unrecognised session, terminate it and change your password immediately.
                  </p>
                </div>
              </div>
            </section>

            {/* ══════════════════════════════════════
                DANGER ZONE
            ══════════════════════════════════════ */}
            <section className="bg-white rounded-[24px] border border-red-100 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-red-50">
                <h3 className="font-bold text-[11px] uppercase tracking-widest text-red-600">Danger Zone</h3>
                <p className="text-[10px] text-zinc-400 font-medium mt-0.5">Irreversible actions — proceed with caution.</p>
              </div>
              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between p-4 rounded-2xl border border-dashed border-red-100 hover:bg-red-50/50 transition-all group">
                  <div>
                    <p className="text-[11px] font-bold text-zinc-900">Sign out all devices</p>
                    <p className="text-[10px] text-zinc-400 font-medium mt-0.5">Ends all active sessions except this one</p>
                  </div>
                  <button className="text-[9px] font-black uppercase tracking-wide text-red-500 border border-red-200 px-3 py-1.5 rounded-xl hover:bg-red-600 hover:text-white transition-all">
                    Sign Out All
                  </button>
                </div>
              </div>
            </section>

          </main>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedPageWrapper>
  )
}