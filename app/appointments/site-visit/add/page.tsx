"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useAppointmentData } from "./layout" // Using context to share data
import ProtectedPageWrapper from "@/components/protected-page-wrapper"
import { 
  ChevronLeft, 
  Check, 
  Send, 
  AlertCircle
} from "lucide-react"
import { cn } from "@/lib/utils"

// Mandatory options per FR-02
const ASSISTANCE_OPTIONS = [
  { id: "area_assessment", label: "Area Assessment" },
  { id: "retrofitting", label: "Retrofitting" },
  { id: "formal_meeting", label: "Formal Meeting" },
  { id: "product_presentation", label: "Product Presentation" },
  { id: "bidding", label: "Bidding" },
  { id: "troubleshooting", label: "Troubleshooting" },
  { id: "dialux", label: "DIAlux Simulation / Lighting Design" },
  { id: "costing", label: "Installation Costing / Implementation" },
  { id: "others", label: "Others" },
]

export default function SalesAddAppointmentPage() {
  const router = useRouter()
  // Using shared context instead of local state to persist data for Step 2
  const { 
    selectedAssistance: selectedTypes, 
    setSelectedAssistance: setSelectedTypes, 
    otherSpec: otherText, 
    setOtherSpec: setOtherText 
  } = useAppointmentData()

  const toggleAssistance = (id: string) => {
    setSelectedTypes(selectedTypes.includes(id) 
      ? selectedTypes.filter((t: string) => t !== id) 
      : [...selectedTypes, id]
    )
  }

  // FR-03: Submit logic. Button enabled only if at least 1 is selected
  // FR-02: If "others" is selected, the text field must be filled
  const isOthersValid = selectedTypes.includes("others") ? otherText.trim().length > 0 : true
  const canSubmit = selectedTypes.length > 0 && isOthersValid

  const handleNext = () => {
    if (canSubmit) {
      // Proceed to Step 2: Scheduling
      router.push('/appointments/site-visit/add/schedule')
    }
  }

  return (
    <ProtectedPageWrapper>
      <div className="flex flex-col min-h-screen bg-background">
        
        {/* CLEAN HEADER: No Hamburger/SidebarTrigger for Focus Mode */}
        <header className="flex h-16 shrink-0 items-center px-4 border-b-2 border-muted/30 bg-background/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => router.push('/appointments/site-visit')} 
              className="p-2 hover:bg-muted/50 rounded-sm group transition-colors"
            >
              <ChevronLeft className="size-5 group-hover:-translate-x-1 transition-transform" />
            </button>
            <div className="h-4 w-[1px] bg-muted/50 mx-1" />
            <div className="flex flex-col">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary italic leading-none">
                Step 1: Protocol Selection
              </h2>
              <span className="text-[8px] font-mono opacity-40 uppercase mt-1 tracking-tighter">
                Focus_Mode: Selection Required
              </span>
            </div>
          </div>
        </header>

        <main className="p-6 max-w-2xl mx-auto w-full pb-32">
          
          {/* INSTRUCTIONAL HEADER */}
          <div className="mb-8 p-4 border-l-4 border-primary bg-primary/5">
            <h1 className="text-xl font-black uppercase tracking-tighter mb-1">
              What Site Assistance Is Required?
            </h1>
            <p className="text-[9px] font-mono opacity-60 uppercase italic">
              Requirement: Mandatory Selection [FR-02]
            </p>
          </div>

          {/* SELECTION GRID */}
          <div className="grid grid-cols-1 gap-2">
            {ASSISTANCE_OPTIONS.map((option) => (
              <div 
                key={option.id}
                onClick={() => toggleAssistance(option.id)}
                className={cn(
                  "flex items-center justify-between p-4 border-2 transition-all cursor-pointer",
                  selectedTypes.includes(option.id) 
                    ? "border-primary bg-primary/5" 
                    : "border-muted/50 hover:border-primary/30 bg-muted/5"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "size-5 border-2 flex items-center justify-center transition-colors",
                    selectedTypes.includes(option.id) ? "bg-primary border-primary" : "border-muted-foreground"
                  )}>
                    {selectedTypes.includes(option.id) && <Check className="size-3 text-white" strokeWidth={4} />}
                  </div>
                  <span className={cn(
                    "text-[11px] font-black uppercase tracking-widest",
                    selectedTypes.includes(option.id) ? "text-primary" : "text-muted-foreground"
                  )}>
                    {option.label}
                  </span>
                </div>
              </div>
            ))}

            {/* OTHERS INPUT FIELD */}
            {selectedTypes.includes("others") && (
              <div className="mt-2 p-4 border-2 border-primary bg-primary/5 animate-in fade-in slide-in-from-top-2">
                <label className="text-[9px] font-black uppercase text-primary mb-2 block">
                  Please specify assistance type*
                </label>
                <input 
                  autoFocus
                  value={otherText}
                  onChange={(e) => setOtherText(e.target.value)}
                  className="w-full bg-background border-b-2 border-primary p-2 outline-none font-mono text-xs uppercase"
                  placeholder="Input requirement here..."
                />
              </div>
            )}
          </div>

          {/* ERROR FEEDBACK */}
          {!isOthersValid && selectedTypes.includes("others") && (
            <div className="mt-4 flex items-center gap-2 text-red-500 bg-red-50 p-3 border border-red-200">
              <AlertCircle className="size-4" />
              <span className="text-[9px] font-black uppercase tracking-tight">
                Specification required for "Others" selection.
              </span>
            </div>
          )}
        </main>

        {/* TACTICAL FLOATING SUBMIT BUTTON */}
        <div className="fixed bottom-8 right-8 flex flex-col items-end gap-3 z-50">
          {!canSubmit && (
             <div className="bg-background/90 backdrop-blur-md border border-muted/50 px-4 py-2 rounded-full shadow-lg">
                <p className="text-[8px] font-black uppercase tracking-tighter text-muted-foreground">
                  Select at least one protocol to unlock
                </p>
             </div>
          )}
          
          <button 
            disabled={!canSubmit}
            onClick={handleNext}
            className={cn(
              "size-16 rounded-full shadow-2xl flex items-center justify-center transition-all border-4 border-background",
              canSubmit 
                ? "bg-primary text-primary-foreground active:scale-90 hover:scale-105 shadow-primary/20" 
                : "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
            )}
          >
            <Send className={cn("size-6 ml-1", canSubmit ? "animate-pulse" : "")} />
          </button>
        </div>
      </div>
    </ProtectedPageWrapper>
  )
}