"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useAppointmentData } from "../layout"
import { 
  User, 
  Info, 
  Paperclip, 
  Send, 
  ChevronLeft, 
  LayoutGrid 
} from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

export default function SchedulePage() {
  const router = useRouter();
  const { selectedAssistance } = useAppointmentData();
  
  // Form State for Mandatory Fields
  const [formData, setFormData] = React.useState({ 
    client: "", 
    address: "", 
    landmark: "",
    agenda: "",
    notes: "" 
  });

  // FR-01: Auto-determine PIC based on Team and Assistance
  // In a real app, 'userTeam' would come from your Auth/Session context
  const getPIC = () => {
    if (selectedAssistance.includes("dialux")) return "Therese";
    if (selectedAssistance.includes("costing")) return "Mark / Karl";
    return "Patrick"; // Default for Team Chi / General
  };

  const pic = getPIC();

  // FR-01: Validation logic for mandatory fields
  const isComplete = 
    formData.client.trim() !== "" && 
    formData.address.trim() !== "" && 
    formData.agenda.trim() !== "";

  return (
    <div className="flex flex-col min-h-screen bg-background">
      
      {/* TACTICAL HEADER WITH BACK BUTTON */}
      {/* <header className="flex h-16 shrink-0 items-center justify-between px-4 border-b-2 border-muted/30 bg-background/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => router.push('/appointments/site-visit/add')} 
            className="p-2 hover:bg-muted/50 rounded-sm group transition-colors"
          >
            <ChevronLeft className="size-4 group-hover:-translate-x-1 transition-transform" />
          </button>
          <div className="h-4 w-[1px] bg-muted/50 mx-1" />
          <div className="flex flex-col">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary italic leading-none">
              Step 2: Logistics & Schedule
            </h2>
            <span className="text-[8px] font-mono opacity-40 uppercase">Protocol_Finalization</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
            <span className="hidden sm:block text-[8px] font-black uppercase opacity-40 tracking-widest text-right">
                Drafting_Phase
            </span>
            <SidebarTrigger className="text-primary" />
        </div>
      </header> */}
      <header className="flex h-16 shrink-0 items-center px-4 border-b-2 border-muted/30 sticky top-0 bg-background z-10">
        <button 
          onClick={() => router.back()} 
          className="p-2 hover:bg-muted/50 rounded-sm mr-4"
          aria-label="Go Back"
        >
          <ChevronLeft className="size-5" />
        </button>
        <div className="flex flex-col">
          <h2 className="text-[10px] font-black uppercase tracking-widest text-primary italic leading-none">
            Step 2: Logistics & Schedule
          </h2>
          <span className="text-[8px] font-mono opacity-40 uppercase mt-1">Focus_Mode: Active</span>
        </div>
      </header>

      <main className="p-4 md:p-8 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 pb-32">
        
        {/* LEFT COLUMN: SITE DETAILS */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* READ-ONLY PIC PANEL */}
          <section className="p-4 border-2 border-primary/20 bg-primary/5 rounded-sm flex items-center gap-4">
            <div className="size-10 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-[8px] font-bold opacity-50 uppercase tracking-widest">Assigned PIC (Read-Only)</p>
              <p className="text-sm font-black uppercase tracking-tighter">{pic}</p>
            </div>
          </section>

          {/* INPUT FIELDS */}
          <section className="space-y-4">
            <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-primary ml-1">Client Name*</label>
                <input 
                  className="w-full bg-muted/10 border-2 border-muted/50 p-3 text-xs uppercase font-mono outline-none focus:border-primary transition-all" 
                  placeholder="Enter Client Entity..." 
                  onChange={e => setFormData({...formData, client: e.target.value})} 
                />
            </div>
            
            <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-primary ml-1">Site Address*</label>
                <textarea 
                  className="w-full bg-muted/10 border-2 border-muted/50 p-3 text-xs uppercase font-mono outline-none focus:border-primary transition-all" 
                  rows={2}
                  placeholder="Complete Deployment Coordinates..." 
                  onChange={e => setFormData({...formData, address: e.target.value})} 
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-primary ml-1">Landmark</label>
                    <input 
                      className="w-full bg-muted/10 border-2 border-muted/50 p-3 text-xs uppercase font-mono outline-none focus:border-primary" 
                      placeholder="Optional Landmark..." 
                      onChange={e => setFormData({...formData, landmark: e.target.value})} 
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-primary ml-1">Agenda/Scope*</label>
                    <input 
                      className="w-full bg-muted/10 border-2 border-muted/50 p-3 text-xs uppercase font-mono outline-none focus:border-primary" 
                      placeholder="Purpose of Visit..." 
                      onChange={e => setFormData({...formData, agenda: e.target.value})} 
                    />
                </div>
            </div>

            {/* ATTACHMENT SECTION */}
            <div className="pt-4 border-t border-muted/30">
              <button className="w-full border-2 border-dashed border-muted-foreground/30 p-6 flex flex-col items-center gap-2 hover:bg-primary/5 transition-colors rounded-sm group">
                <Paperclip className="size-5 opacity-40 group-hover:text-primary group-hover:opacity-100 transition-all" />
                <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Attach Project Docs (JPG, PDF, DWG)</span>
              </button>
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: PIC CALENDAR */}
        <div className="lg:col-span-7">
          <div className="border-2 border-muted/30 p-6 bg-muted/5 rounded-sm h-full relative overflow-hidden">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black uppercase tracking-tighter">Availability Calendar</h3>
                <div className="px-3 py-1 bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest">
                    PIC: {pic}
                </div>
            </div>

            <div className="grid grid-cols-7 gap-1 bg-background p-3 border-2 border-muted/20 shadow-inner">
                {/* Simplified Calendar Logic */}
                {['S','M','T','W','T','F','S'].map(d => (
                    <div key={d} className="text-center text-[9px] font-black opacity-40 pb-2">{d}</div>
                ))}
                {Array.from({length: 31}).map((_, i) => (
                    <div key={i} className={cn(
                        "aspect-square flex items-center justify-center text-[11px] font-mono font-bold transition-all border border-transparent",
                        [5, 12, 19, 26].includes(i+1) // Mock blocked dates
                            ? "text-red-500/30 cursor-not-allowed bg-red-500/5 line-through" 
                            : "hover:bg-primary hover:text-white cursor-pointer hover:scale-110 z-10"
                    )}>
                        {i + 1}
                    </div>
                ))}
            </div>

            <div className="mt-6 flex items-center gap-6 border-t border-muted/30 pt-4">
                <div className="flex items-center gap-2">
                    <div className="size-3 bg-red-500/20 border border-red-500/50" />
                    <span className="text-[8px] font-black uppercase opacity-60 tracking-widest">Blocked</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="size-3 bg-primary" />
                    <span className="text-[8px] font-black uppercase opacity-60 tracking-widest">Selected</span>
                </div>
            </div>
          </div>
        </div>
      </main>

      {/* FLOATING SUBMIT BUTTON */}
      <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-3">
        {!isComplete && (
            <div className="bg-background/90 backdrop-blur-md border border-muted/50 px-4 py-2 rounded-full shadow-xl">
                <p className="text-[8px] font-black uppercase tracking-tighter text-muted-foreground flex items-center gap-2">
                    <Info className="size-3 text-primary" /> Complete Mandatory Fields to Proceed
                </p>
            </div>
        )}
        <button 
          disabled={!isComplete}
          className={cn(
            "h-16 px-10 rounded-full font-black uppercase text-xs tracking-[0.2em] border-4 border-background flex items-center gap-4 shadow-2xl transition-all active:scale-95",
            isComplete 
              ? "bg-primary text-white hover:bg-primary/90" 
              : "bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
          )}
        >
          Initialize Protocol
          <Send className={cn("size-5", isComplete ? "animate-pulse" : "")} />
        </button>
      </div>
    </div>
  );
}