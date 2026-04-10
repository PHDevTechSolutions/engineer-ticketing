"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useAppointmentData } from "./layout" 
import ProtectedPageWrapper from "@/components/protected-page-wrapper"
import { AppSidebar } from "@/components/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { 
  Check, 
  ArrowRight,
  Loader2,
  ShieldCheck,
  Info,
  Lock,
  Sparkles,
  ClipboardList,
  Wrench,
  User2,
  MessageSquare,
  AlertCircle,
  Clock,
  HardHat
} from "lucide-react"
import { cn } from "@/lib/utils"

// FIREBASE IMPORTS
import { db } from "@/lib/firebase"
import { collection, query, where, onSnapshot } from "firebase/firestore"

// Shadcn UI Imports
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// CUSTOM COMPONENTS
import { PageHeader } from "@/components/page-header"

export default function SalesAddAppointmentPage() {
  const router = useRouter()
  const [userId, setUserId] = React.useState<string>("")

  React.useEffect(() => {
    setUserId(localStorage.getItem("userId") || "")
  }, [])

  const { 
    selectedAssistance: selectedTypes, 
    setSelectedAssistance: setSelectedTypes, 
    otherSpec: otherText, 
    setOtherSpec: setOtherText,
    personnel,
    setPersonnel,
    ppe,
    setPpe,
    permits,
    setPermits,
    isHydrated 
  } = useAppointmentData()

  const [options, setOptions] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [currentStep, setCurrentStep] = React.useState(1)

  const toggleItem = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, value: string) => {
    setList(list.includes(value) ? list.filter(i => i !== value) : [...list, value]);
  };

  // 1. SYNC PROTOCOL OPTIONS FROM FIREBASE
  React.useEffect(() => {
    const q = query(collection(db, "protocols"), where("isActive", "==", true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedOptions = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          label: data.label,
          desc: data.desc,
          hasPic: Array.isArray(data.pic) ? data.pic.length > 0 : !!data.pic
        };
      });
      
      const hasOthersInDb = fetchedOptions.some(opt => opt.label.toLowerCase() === "others");
      if (!hasOthersInDb) {
        fetchedOptions.push({
          id: "others", 
          label: "Others",
          desc: "Any requirement not covered by standard protocols.",
          hasPic: true 
        });
      }
      setOptions(fetchedOptions);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const toggleAssistance = (id: string, hasPic: boolean) => {
    // SECURITY: Prevent state modification until context is hydrated
    if (!hasPic || !isHydrated) return;

    setSelectedTypes((prev: string[]) => 
      prev.includes(id) 
        ? prev.filter((t: string) => t !== id) 
        : [...prev, id]
    )
  }

  const isOthersSelected = selectedTypes.includes("others") || 
    selectedTypes.some((id: string) => options.find(o => o.id === id)?.label.toLowerCase() === "others");

  const isOthersValid = isOthersSelected ? otherText.trim().length > 0 : true
  
  // LOGIC: Enable transition only when context is recovered and criteria met
  const canSubmit = isHydrated && selectedTypes.length > 0 && isOthersValid

  return (
    <TooltipProvider delayDuration={200}>
      <AppSidebar userId={userId} />
      <SidebarInset className="bg-[#F8FAFA] pb-24 md:pb-10 min-h-screen m-0 rounded-none border-none shadow-none overflow-visible">
        <PageHeader 
          title="VISIT REQUIREMENTS" 
          version="V2.8" 
          showBackButton={true}
          trigger={<SidebarTrigger className="mr-2" />}
          actions={
            <div className="flex items-center gap-2 px-3 py-1 bg-zinc-50 border border-zinc-200 rounded-lg">
              {!isHydrated ? (
                <Loader2 className="size-3 animate-spin text-zinc-400" />
              ) : (
                <ShieldCheck className="size-3 text-zinc-400" />
              )}
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-900">
                Step {currentStep === 1 ? "1" : currentStep === 2 ? "1.5" : "1.8"} of 4
              </span>
            </div>
          }
        />

        <main className="flex-1 px-4 py-6 md:p-8 max-w-2xl mx-auto w-full pb-[160px]">
          
          {/* STEP INDICATORS */}
          <div className="mb-8 bg-white p-2 rounded-2xl shadow-sm border border-zinc-100 flex justify-between items-center gap-2 overflow-x-auto scrollbar-hide">
            {[
              { id: 1, label: "Assistance", icon: Wrench },
              { id: 2, label: "Safety", icon: ShieldCheck },
              { id: 3, label: "Logistics", icon: Clock }
            ].map((step) => (
              <button 
                key={step.id} 
                onClick={() => isHydrated && setCurrentStep(step.id)}
                className={cn(
                  "flex items-center gap-2.5 px-5 py-2.5 rounded-xl transition-all whitespace-nowrap active:scale-95",
                  currentStep === step.id 
                    ? "bg-zinc-900 text-white shadow-lg" 
                    : "text-zinc-400 hover:bg-zinc-50"
                )}
              >
                <step.icon size={14} /> 
                <span className="text-[10px] font-black uppercase tracking-widest">{step.label}</span>
              </button>
            ))}
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-zinc-100 shadow-sm">
                  <div className="size-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                    <ClipboardList size={20} />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-black text-zinc-900 uppercase tracking-tight leading-none">Visit Purpose</h3>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1.5">
                      What do you need help with during this visit?
                    </p>
                  </div>
                </div>

                <div className="grid gap-2.5">
                  {loading || !isHydrated ? (
                    <div className="flex flex-col items-center justify-center py-20 border border-zinc-100 rounded-[24px] bg-white shadow-sm">
                      <Loader2 className="size-6 animate-spin mb-3 text-zinc-200" />
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-300">
                        Loading options...
                      </span>
                    </div>
                  ) : (
                    options.map((option) => {
                      const isActive = selectedTypes.includes(option.id);
                      const isSelectable = option.hasPic;

                      return (
                        <div 
                          key={option.id}
                          onClick={() => toggleAssistance(option.id, option.hasPic)}
                          className={cn(
                            "group relative flex items-center p-4 transition-all border rounded-[20px] shadow-sm active:scale-[0.99] cursor-pointer",
                            isActive 
                              ? "border-zinc-900 bg-white ring-1 ring-zinc-900/5 shadow-md" 
                              : "border-zinc-100 bg-white hover:border-zinc-300",
                            !isSelectable && "opacity-40 cursor-not-allowed bg-zinc-50 border-dashed"
                          )}
                        >
                          <div className={cn(
                            "size-5 rounded-lg border flex items-center justify-center mr-4 transition-all",
                            isActive ? "bg-zinc-900 border-zinc-900" : "bg-zinc-50 border-zinc-200",
                          )}>
                            {isActive && <Check className="size-3 text-white stroke-[4px]" />}
                            {!isSelectable && <Lock className="size-2.5 text-zinc-400" />}
                          </div>

                          <div className="flex flex-col flex-1">
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "text-[12px] font-black uppercase tracking-tight",
                                isActive ? "text-zinc-900" : "text-zinc-500"
                              )}>
                                {option.label}
                              </span>
                              {!isSelectable && (
                                <div className="flex items-center gap-1 bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest border border-amber-100">
                                  <AlertCircle size={8} />
                                  No Staff Available
                                </div>
                              )}
                            </div>
                            <span className="text-[10px] font-bold text-zinc-400 mt-0.5 leading-tight uppercase tracking-tight">
                              {option.desc}
                            </span>
                          </div>
                          
                          {isActive && (
                            <div className="size-6 rounded-full bg-zinc-900 flex items-center justify-center text-white animate-in zoom-in duration-300">
                              <Check className="size-3" strokeWidth={3} />
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}

                  {isOthersSelected && (
                    <div className="mt-4 space-y-3 p-6 bg-zinc-50 border border-zinc-100 rounded-[24px] animate-in slide-in-from-top-4 duration-300">
                      <div className="flex items-center gap-3 mb-1">
                        <div className="size-8 rounded-lg bg-zinc-900 flex items-center justify-center text-white">
                          <Wrench size={16} />
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-tight text-zinc-900">Custom Requirement</span>
                      </div>
                      <Input
                        placeholder="Tell us more about your need..."
                        value={otherText}
                        onChange={(e) => setOtherText(e.target.value)}
                        className="rounded-xl border-zinc-200 h-12 text-xs font-bold uppercase tracking-tight px-4 focus:ring-zinc-900 transition-all"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-zinc-100 shadow-sm">
                  <div className="size-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-black text-zinc-900 uppercase tracking-tight leading-none">Personnel & Safety</h3>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1.5">
                      Safety requirements and additional manpower.
                    </p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4 p-6 bg-white border border-zinc-100 rounded-[24px] shadow-sm">
                    <Label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest flex items-center gap-2 mb-2">
                      <User2 size={12} /> Additional Personnel
                    </Label>
                    {["Safety Officer", "Scaffolder"].map(item => (
                      <div key={item} className="flex items-center gap-3 p-3.5 rounded-xl border border-zinc-50 hover:bg-zinc-50 cursor-pointer transition-all">
                        <Checkbox id={`personnel-${item}`} checked={personnel.includes(item)} onCheckedChange={() => toggleItem(personnel, setPersonnel, item)} />
                        <label htmlFor={`personnel-${item}`} className="text-[11px] font-bold text-zinc-700 uppercase cursor-pointer flex-1">{item}</label>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4 p-6 bg-white border border-zinc-100 rounded-[24px] shadow-sm">
                    <Label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest flex items-center gap-2 mb-2">
                      <HardHat size={12} /> PPE Required
                    </Label>
                    <div className="grid grid-cols-1 gap-2">
                      {["Hard Hat", "Safety Shoes", "Vest"].map(item => (
                        <div key={item} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50/50 border border-transparent hover:border-zinc-100 transition-all cursor-pointer">
                          <Checkbox id={`ppe-${item}`} checked={ppe.includes(item)} onCheckedChange={() => toggleItem(ppe, setPpe, item)} />
                          <label htmlFor={`ppe-${item}`} className="text-[10px] font-bold text-zinc-600 uppercase cursor-pointer flex-1">{item}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-zinc-100 shadow-sm">
                  <div className="size-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <Clock size={20} />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-black text-zinc-900 uppercase tracking-tight leading-none">Logistics & Schedule</h3>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1.5">
                      Access permits and working constraints.
                    </p>
                  </div>
                </div>

                <div className="space-y-4 p-6 bg-white border border-zinc-100 rounded-[24px] shadow-sm">
                  <Label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest flex items-center gap-2 mb-2">
                    <MessageSquare size={12} /> Permits Needed
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {["Gate Pass", "Hot Work", "Working at Heights"].map(item => (
                      <div key={item} className="flex items-center gap-3 p-3.5 rounded-xl border border-zinc-50 hover:bg-zinc-50 cursor-pointer transition-all">
                        <Checkbox id={`permits-${item}`} checked={permits.includes(item)} onCheckedChange={() => toggleItem(permits, setPermits, item)} />
                        <label htmlFor={`permits-${item}`} className="text-[11px] font-bold text-zinc-700 uppercase cursor-pointer flex-1">{item}</label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* BOTTOM NAV BAR */}
        <div className="fixed bottom-6 right-4 left-4 md:left-auto md:bottom-8 md:right-8 z-[60] flex gap-3">
          {currentStep > 1 && (
            <Button 
              onClick={() => setCurrentStep(prev => prev - 1)}
              variant="outline"
              className="h-16 px-8 rounded-full font-black uppercase text-[11px] tracking-[0.2em] bg-white border-zinc-200 shadow-xl"
            >
              Back
            </Button>
          )}
          {currentStep < 3 ? (
            <Button 
              onClick={() => setCurrentStep(prev => prev + 1)}
              disabled={!canSubmit}
              className={cn(
                "flex-1 md:w-auto h-16 px-10 rounded-full font-black uppercase text-[11px] tracking-[0.2em] flex items-center justify-center gap-4 shadow-2xl transition-all active:scale-[0.95]", 
                canSubmit 
                  ? "bg-zinc-900 text-white hover:bg-zinc-800 hover:scale-105" 
                  : "bg-zinc-200 text-zinc-400 cursor-not-allowed shadow-none"
              )}
            >
              Next Step
              <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button 
              onClick={() => router.push("/appointments/site-visit/add/schedule")}
              disabled={!canSubmit}
              className={cn(
                "flex-1 md:w-auto h-16 px-10 rounded-full font-black uppercase text-[11px] tracking-[0.2em] flex items-center justify-center gap-4 shadow-2xl transition-all active:scale-[0.95]", 
                canSubmit 
                  ? "bg-emerald-600 text-white hover:bg-emerald-500 hover:scale-105 shadow-emerald-200" 
                  : "bg-zinc-200 text-zinc-400 cursor-not-allowed shadow-none"
              )}
            >
              Proceed to Schedule
              <ArrowRight className="size-4" />
            </Button>
          )}
        </div>
      </SidebarInset>
    </TooltipProvider>
  )
}