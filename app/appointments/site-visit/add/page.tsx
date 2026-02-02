"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useAppointmentData } from "./layout" 
import ProtectedPageWrapper from "@/components/protected-page-wrapper"
import { 
  ChevronLeft, 
  Check, 
  ArrowRight,
  AlertCircle,
  HelpCircle,
  Loader2
} from "lucide-react"
import { cn } from "@/lib/utils"

import { db } from "@/lib/firebase"
import { collection, query, where, onSnapshot } from "firebase/firestore"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

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

  // --- CHANGED: Passing the whole option to use the label ---
  const toggleAssistance = (option: any) => {
    const label = option.label;
    setSelectedTypes(selectedTypes.includes(label) 
      ? selectedTypes.filter((t: string) => t !== label) 
      : [...selectedTypes, label]
    )
  }

  // --- CHANGED: Check logic to use label ---
  const isOthersSelected = selectedTypes.some(t => t.toLowerCase() === "others");

  const isOthersValid = isOthersSelected ? otherText.trim().length > 0 : true
  const canSubmit = selectedTypes.length > 0 && isOthersValid

  return (
    <TooltipProvider delayDuration={200}>
      <ProtectedPageWrapper>
        <div className="flex flex-col min-h-screen bg-background font-sans">
          
          <header className="flex h-16 shrink-0 items-center px-4 border-b-2 border-muted/30 sticky top-0 bg-background/95 backdrop-blur-md z-20">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => router.push('/appointments/site-visit')} 
              className="mr-2"
            >
              <ChevronLeft className="size-5" />
            </Button>
            
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Add_Request</span>
              <span className="text-xs font-bold uppercase tracking-tighter opacity-60">Step 01 // Selection</span>
            </div>
          </header>

          <main className="flex-1 p-6 max-w-2xl mx-auto w-full pb-32">
            
            <div className="mb-8 border-l-4 border-primary pl-4 py-1">
                <h1 className="text-2xl font-black uppercase tracking-tighter">Site Assistance Type</h1>
                <p className="text-[10px] font-mono opacity-50 uppercase tracking-widest text-primary">Requirement: Select 1 or more protocols</p>
            </div>

            <div className="flex flex-col gap-2">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-30">
                  <Loader2 className="size-8 animate-spin mb-2" />
                  <span className="text-[10px] font-black tracking-widest uppercase">Syncing_Protocols...</span>
                </div>
              ) : (
                options.map((option) => {
                  // --- CHANGED: isActive now checks the label ---
                  const isActive = selectedTypes.includes(option.label);
                  return (
                    <div key={option.id} className="group relative">
                      <div 
                        onClick={() => toggleAssistance(option)}
                        className={cn(
                          "relative flex items-center p-4 border-2 transition-all cursor-pointer",
                          isActive ? "border-foreground bg-muted/20" : "border-muted/30 hover:border-muted-foreground/50"
                        )}
                      >
                        <div className={cn(
                          "size-5 border-2 flex items-center justify-center mr-4 transition-colors",
                          isActive ? "bg-foreground border-foreground" : "bg-background border-muted-foreground/30"
                        )}>
                          {isActive && <Check className="size-3 text-background" strokeWidth={4} />}
                        </div>

                        <span className={cn(
                          "text-[11px] font-black uppercase tracking-widest",
                          isActive ? "text-foreground" : "text-muted-foreground"
                        )}>
                          {option.label}
                        </span>

                        <div className="ml-auto">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="size-3.5 text-muted-foreground/40 hover:text-primary transition-colors" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[200px] bg-black text-white border-primary rounded-none shadow-xl">
                              <p className="text-[10px] font-bold uppercase mb-1 text-primary">{option.label}</p>
                              <p className="text-[9px] leading-relaxed opacity-80">{option.desc}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {isOthersSelected && (
              <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                <div className="p-4 border-2 border-primary/40 bg-primary/5">
                  <label className="text-[9px] font-black uppercase text-primary mb-2 block tracking-widest">
                    Specify Requirement *
                  </label>
                  <Input 
                    autoFocus
                    value={otherText}
                    onChange={(e) => setOtherText(e.target.value)}
                    className="rounded-none border-0 border-b-2 border-primary/30 bg-transparent font-mono text-xs uppercase focus-visible:ring-0 focus-visible:border-primary transition-all px-0"
                    placeholder="Describe mission details..."
                  />
                </div>
              </div>
            )}
          </main>

          <div className="fixed bottom-0 left-0 right-0 p-6 bg-background/80 backdrop-blur-md border-t-2 border-muted/20">
            <div className="max-w-2xl mx-auto flex justify-end">
                <Tooltip>
                    <TooltipTrigger asChild>
                    <span className="inline-block">
                        <Button 
                        disabled={!canSubmit || loading}
                        onClick={() => router.push('/appointments/site-visit/add/schedule')}
                        className={cn(
                            "h-14 px-8 rounded-none uppercase font-black tracking-widest transition-all",
                            canSubmit 
                            ? "bg-primary text-primary-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px]" 
                            : "bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
                        )}
                        >
                        Continue <ArrowRight className="ml-3 size-4" />
                        </Button>
                    </span>
                    </TooltipTrigger>
                    {!canSubmit && !loading && (
                    <TooltipContent side="top" className="bg-red-600 text-white rounded-none border-none font-black text-[9px] px-4 py-2 mb-2">
                        <div className="flex items-center gap-2">
                        <AlertCircle className="size-3" /> 
                        PROTOCOL_MISSING: SELECT AT LEAST ONE
                        </div>
                    </TooltipContent>
                    )}
                </Tooltip>
            </div>
          </div>
        </div>
      </ProtectedPageWrapper>
    </TooltipProvider>
  )
}