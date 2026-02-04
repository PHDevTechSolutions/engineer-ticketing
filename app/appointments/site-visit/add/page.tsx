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
  Info
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
    setOtherSpec: setOtherText 
  } = useAppointmentData()

  const [options, setOptions] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const q = query(collection(db, "protocols"), where("isActive", "==", true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedOptions = snapshot.docs.map(doc => ({
        id: doc.id,
        label: doc.data().label,
        desc: doc.data().desc,
      }));
      
      const hasOthersInDb = fetchedOptions.some(opt => opt.label.toLowerCase() === "others");
      if (!hasOthersInDb) {
        fetchedOptions.push({
          id: "others", 
          label: "Others",
          desc: "Any requirement not covered by standard protocols."
        });
      }
      setOptions(fetchedOptions);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const toggleAssistance = (id: string) => {
    setSelectedTypes(selectedTypes.includes(id) 
      ? selectedTypes.filter((t: string) => t !== id) 
      : [...selectedTypes, id]
    )
  }

  const isOthersSelected = selectedTypes.includes("others") || 
    selectedTypes.some((id: string) => options.find(o => o.id === id)?.label.toLowerCase() === "others");

  const isOthersValid = isOthersSelected ? otherText.trim().length > 0 : true
  const canSubmit = selectedTypes.length > 0 && isOthersValid

  return (
    <TooltipProvider delayDuration={200}>
      <ProtectedPageWrapper>
        <div className="flex flex-col min-h-[100dvh] bg-[#F9FAFA] font-sans text-[#1A1A1A] select-none">
          
          {/* STEPPER RESTORED HERE */}
          <PageHeader 
            title="SERVICE_SELECTION" 
            version="BUILD: CORP-V2.6" 
            showBackButton={true}
            actions={
              <div className="flex items-center gap-2 px-3 py-1.5 bg-black/5 border border-black/10 rounded-sm">
                <ShieldCheck className="size-3 text-black/50" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-black/70">
                  STEP 01 / 04
                </span>
              </div>
            }
          />

          <main className="flex-1 px-4 py-6 md:p-12 max-w-2xl mx-auto w-full pb-[160px]">
            
            <div className="mb-8">
                <p className="text-[15px] text-[#707070] leading-relaxed font-medium">
                    Define the operational scope for this site visit.
                </p>
            </div>

            <div className="grid gap-3">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 border border-dashed border-black/10 rounded-lg bg-white/50">
                  <Loader2 className="size-6 animate-spin mb-3 text-black/20" />
                  <span className="text-[10px] font-medium uppercase tracking-widest text-black/40">Syncing Protocol...</span>
                </div>
              ) : (
                options.map((option) => {
                  const isActive = selectedTypes.includes(option.id);
                  return (
                    <div 
                      key={option.id}
                      onClick={() => toggleAssistance(option.id)}
                      className={cn(
                        "group relative flex items-center p-5 transition-all cursor-pointer border rounded-md shadow-sm active:scale-[0.99] touch-action-manipulation",
                        isActive 
                          ? "border-black bg-white ring-1 ring-black/5" 
                          : "border-black/5 bg-white hover:border-black/20"
                      )}
                    >
                      <div className={cn(
                        "size-5 rounded-sm border flex items-center justify-center mr-5 transition-all",
                        isActive ? "bg-[#121212] border-[#121212]" : "bg-transparent border-black/10"
                      )}>
                        {isActive && <Check className="size-3.5 text-white stroke-[4px]" />}
                      </div>

                      <div className="flex flex-col flex-1">
                        <span className={cn(
                          "text-[13px] font-bold uppercase tracking-wider",
                          isActive ? "text-[#121212]" : "text-[#121212]/60"
                        )}>
                          {option.label}
                        </span>
                        <span className="text-[12px] text-[#707070] font-medium mt-0.5">
                          {option.desc}
                        </span>
                      </div>

                      <Info className="size-4 ml-4 opacity-10 group-hover:opacity-100 transition-opacity text-black hidden md:block" />
                    </div>
                  )
                })
              )}
            </div>

            {isOthersSelected && (
              <div className="mt-6 animate-in fade-in slide-in-from-top-2">
                <div className="p-6 bg-white border border-black/10 rounded-md shadow-sm border-l-4 border-l-black">
                  <label className="text-[10px] font-bold uppercase text-black/40 mb-3 block tracking-[0.2em]">
                    Additional Protocol Specs
                  </label>
                  <Input 
                    autoFocus
                    value={otherText}
                    onChange={(e) => setOtherText(e.target.value)}
                    className="h-10 rounded-none border-x-0 border-t-0 border-b border-black/20 bg-transparent text-base md:text-sm focus-visible:ring-0 focus-visible:border-black transition-all px-0 placeholder:text-black/20"
                    placeholder="Enter technical mission requirements..."
                  />
                </div>
              </div>
            )}
          </main>

          {/* CROSS-PLATFORM PWA FOOTER */}
          <div className="fixed bottom-0 left-0 right-0 p-4 md:p-8 bg-gradient-to-t from-[#F9FAFA] via-[#F9FAFA] to-transparent pb-[calc(1.5rem+env(safe-area-inset-bottom))] z-40">
            <div className="max-w-2xl mx-auto">
                <Tooltip>
                    <TooltipTrigger asChild>
                    <div className="w-full">
                        <Button 
                          disabled={!canSubmit || loading}
                          onClick={() => router.push('/appointments/site-visit/add/schedule')}
                          className={cn(
                              "w-full h-14 rounded-full uppercase font-bold tracking-[0.15em] transition-all flex items-center justify-center gap-4 shadow-2xl shadow-black/10",
                              canSubmit 
                              ? "bg-[#121212] text-white hover:bg-black active:scale-[0.97]" 
                              : "bg-[#121212]/5 text-black/20 cursor-not-allowed shadow-none border border-black/5"
                          )}
                        >
                          <div className="size-7 bg-white/10 rounded-full flex items-center justify-center border border-white/5">
                            <span className="text-[10px] font-black text-white">N</span>
                          </div>
                          CONFIRM & CONTINUE <ArrowRight className="size-4 opacity-50" />
                        </Button>
                    </div>
                    </TooltipTrigger>
                    {!canSubmit && !loading && (
                    <TooltipContent side="top" className="bg-[#121212] text-white rounded-md font-bold text-[10px] px-4 py-2 mb-4 border-none shadow-2xl tracking-widest">
                        PROTOCOL SELECTION REQUIRED
                    </TooltipContent>
                    )}
                </Tooltip>
                
                {/* Visual Department Badge for PWA look */}
                <p className="text-center mt-4 text-[9px] font-bold uppercase tracking-[0.3em] text-black/20 md:hidden">
                  Engineering Division // Build 2.6
                </p>
            </div>
          </div>
        </div>
      </ProtectedPageWrapper>
    </TooltipProvider>
  )
}