"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useAppointmentData } from "./layout" 
import ProtectedPageWrapper from "@/components/protected-page-wrapper"
import { 
  Check, 
  ArrowRight,
  Loader2,
  ShieldCheck,
  Info,
  Lock
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
      <ProtectedPageWrapper>
        <div className="flex flex-col min-h-[100dvh] bg-[#F9FAFA] font-sans text-[#1A1A1A] select-none">
          
          <PageHeader 
            title="SERVICE_SELECTION" 
            version="BUILD: CORP-V2.6" 
            showBackButton={true}
            actions={
              <div className="flex items-center gap-2 px-3 py-1.5 bg-black/5 border border-black/10 rounded-sm">
                {!isHydrated ? (
                  <Loader2 className="size-3 animate-spin text-black/20" />
                ) : (
                  <ShieldCheck className="size-3 text-black/50" />
                )}
                <span className="text-[10px] font-bold uppercase tracking-widest text-black/70">
                  STEP 01 / 04
                </span>
              </div>
            }
          />

          <main className="flex-1 px-4 py-6 md:p-12 max-w-2xl mx-auto w-full pb-[160px]">
            
            <div className="mb-8 border-l-2 border-black/10 pl-4">
                <p className="text-[14px] text-[#707070] font-medium tracking-tight">
                    Define the operational scope for this site visit.
                </p>
            </div>

            <div className="grid gap-3">
              {loading || !isHydrated ? (
                <div className="flex flex-col items-center justify-center py-20 border border-black/5 rounded-lg bg-white/50 shadow-sm">
                  <Loader2 className="size-6 animate-spin mb-3 text-black/10" />
                  <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-black/30">
                    Restoring_Operational_Context...
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
                        "group relative flex items-center p-5 transition-all border rounded-md shadow-sm active:scale-[0.99] cursor-pointer",
                        isActive 
                          ? "border-black bg-white ring-1 ring-black/5 shadow-md" 
                          : "border-black/5 bg-white hover:border-black/20",
                        !isSelectable && "opacity-40 cursor-not-allowed bg-black/[0.02] border-dashed"
                      )}
                    >
                      <div className={cn(
                        "size-5 rounded-sm border flex items-center justify-center mr-5 transition-all",
                        isActive ? "bg-[#121212] border-[#121212]" : "bg-transparent border-black/10",
                      )}>
                        {isActive && <Check className="size-3.5 text-white stroke-[4px]" />}
                        {!isSelectable && <Lock className="size-2.5 text-black/40" />}
                      </div>

                      <div className="flex flex-col flex-1">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-[12px] font-bold uppercase tracking-wider",
                            isActive ? "text-[#121212]" : "text-[#121212]/60"
                          )}>
                            {option.label}
                          </span>
                          {!isSelectable && (
                            <span className="text-[8px] font-black bg-black/5 px-1.5 py-0.5 rounded text-black/40 tracking-tighter">
                              NO_PERSONNEL_LINKED
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-[#707070] font-medium mt-0.5 leading-tight">
                          {option.desc}
                        </span>
                      </div>
                      <Info className="size-4 ml-4 opacity-5 group-hover:opacity-100 transition-opacity text-black hidden md:block" />
                    </div>
                  )
                })
              )}
            </div>

            {isOthersSelected && isHydrated && (
              <div className="mt-6 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="p-6 bg-white border border-black/10 rounded-md shadow-sm border-l-4 border-l-black">
                  <label className="text-[9px] font-black uppercase text-black/40 mb-3 block tracking-[0.2em]">
                    Additional Protocol Specs
                  </label>
                  <Input 
                    autoFocus
                    value={otherText}
                    onChange={(e) => setOtherText(e.target.value)}
                    className="h-10 rounded-none border-x-0 border-t-0 border-b border-black/20 bg-transparent text-sm focus-visible:ring-0 focus-visible:border-black transition-all px-0 placeholder:text-black/20 font-bold"
                    placeholder="Enter technical mission requirements..."
                  />
                </div>
              </div>
            )}
          </main>

          {/* PERSISTENT FOOTER ACTION */}
          <div className="fixed bottom-0 left-0 right-0 p-6 md:p-10 bg-gradient-to-t from-[#F9FAFA] via-[#F9FAFA] to-transparent z-40">
            <div className="max-w-2xl mx-auto">
                <Tooltip>
                    <TooltipTrigger asChild>
                    <div className="w-full">
                        <Button 
                          disabled={!canSubmit}
                          onClick={() => router.push('/appointments/site-visit/add/schedule')}
                          className={cn(
                              "w-full h-16 rounded-full uppercase font-bold tracking-[0.15em] transition-all flex items-center justify-center gap-4 shadow-2xl",
                              canSubmit 
                              ? "bg-[#121212] text-white hover:bg-black active:scale-[0.97]" 
                              : "bg-[#121212]/5 text-black/20 cursor-not-allowed shadow-none border border-black/5"
                          )}
                        >
                          <div className="size-7 bg-white/10 rounded-full flex items-center justify-center border border-white/5">
                            <span className="text-[10px] font-black text-white">ENG</span>
                          </div>
                          CONFIRM & CONTINUE <ArrowRight className="size-4" />
                        </Button>
                    </div>
                    </TooltipTrigger>
                    {!canSubmit && isHydrated && (
                    <TooltipContent side="top" className="bg-[#121212] text-white rounded-md font-bold text-[10px] px-4 py-2 mb-4 border-none shadow-2xl tracking-widest">
                        PROTOCOL SELECTION REQUIRED
                    </TooltipContent>
                    )}
                </Tooltip>
                
                <p className="text-center mt-4 text-[9px] font-bold uppercase tracking-[0.3em] text-black/10">
                  Engineering Division // Deployment Protocol 2.6
                </p>
            </div>
          </div>
        </div>
      </ProtectedPageWrapper>
    </TooltipProvider>
  )
}