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
  AlertCircle
} from "lucide-react"
import { cn } from "@/lib/utils"

// FIREBASE IMPORTS
import { db } from "@/lib/firebase"
import { collection, query, where, onSnapshot } from "firebase/firestore"

// Shadcn UI Imports
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
    isHydrated 
  } = useAppointmentData()

  const [options, setOptions] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)

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
          title="CHOOSE VISIT TYPE" 
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
                Step 1 of 4
              </span>
            </div>
          }
        />

        <main className="flex-1 px-4 py-6 md:p-8 max-w-2xl mx-auto w-full pb-[160px]">
          
          <div className="mb-6 flex items-center gap-3 bg-white p-4 rounded-2xl border border-zinc-100 shadow-sm">
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

                return (                    <div 
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
        </main>

        {/* BOTTOM NAV BAR */}
        <div className="fixed bottom-6 right-4 left-4 md:left-auto md:bottom-8 md:right-8 z-[60]">
          <Button 
            onClick={() => router.push("/appointments/site-visit/add/schedule")}
            disabled={!canSubmit}
            className={cn(
              "w-full md:w-auto h-16 px-10 rounded-full font-black uppercase text-[11px] tracking-[0.2em] flex items-center justify-center gap-4 shadow-2xl transition-all active:scale-[0.95]", 
              canSubmit 
                ? "bg-zinc-900 text-white hover:bg-zinc-800 hover:scale-105" 
                : "bg-zinc-200 text-zinc-400 cursor-not-allowed shadow-none"
            )}
          >
            {isHydrated ? "Proceed to Schedule" : "Initializing..."}
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </SidebarInset>
    </TooltipProvider>
  )
}