"use client"

import * as React from "react"
import { SidebarProvider } from "@/components/ui/sidebar" 
import ProtectedPageWrapper from "@/components/protected-page-wrapper"
import { Loader2 } from "lucide-react"

// Define the corporate context interface for type safety
interface AppointmentContextType {
  selectedAssistance: string[];
  setSelectedAssistance: React.Dispatch<React.SetStateAction<string[]>>;
  otherSpec: string;
  setOtherSpec: React.Dispatch<React.SetStateAction<string>>;
  isHydrated: boolean;
}

const AppointmentContext = React.createContext<AppointmentContextType | null>(null);

export default function AddAppointmentLayout({ children }: { children: React.ReactNode }) {
  // 1. HYDRATION STATE: Prevents race conditions during refresh
  const [isHydrated, setIsHydrated] = React.useState(false);

  // 2. CORE OPERATIONAL STATE
  const [selectedAssistance, setSelectedAssistance] = React.useState<string[]>([]);
  const [otherSpec, setOtherSpec] = React.useState("");

  // 3. DATA RECONSTRUCTION: Restore state from local storage on mount
  React.useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const savedAssistance = localStorage.getItem("eng_selected_assistance");
        const savedSpec = localStorage.getItem("eng_other_spec");

        if (savedAssistance) {
          setSelectedAssistance(JSON.parse(savedAssistance));
        }
        if (savedSpec) {
          setOtherSpec(savedSpec);
        }
      }
    } catch (error) {
      console.error("CONTEXT_RECONSTRUCTION_ERROR:", error);
    } finally {
      // Signal system readiness
      setIsHydrated(true);
    }
  }, []);

  // 4. PERSISTENCE SYNC: Auto-save state changes to disk
  React.useEffect(() => {
    if (isHydrated) {
      localStorage.setItem("eng_selected_assistance", JSON.stringify(selectedAssistance));
      localStorage.setItem("eng_other_spec", otherSpec);
    }
  }, [selectedAssistance, otherSpec, isHydrated]);

  return (
    <ProtectedPageWrapper>
      <SidebarProvider defaultOpen={false}>
        <AppointmentContext.Provider value={{ 
          selectedAssistance, 
          setSelectedAssistance, 
          otherSpec, 
          setOtherSpec,
          isHydrated 
        }}>
          <div className="flex-1 flex flex-col min-h-screen bg-[#F9FAFA]">
            {!isHydrated ? (
              // FULL-PAGE GATING: Ensures Page 2 doesn't load with empty IDs
              <div className="flex-1 flex items-center justify-center bg-[#F9FAFA] animate-pulse">
                <div className="flex flex-col items-center gap-4">
                  <div className="size-10 rounded-full border-2 border-black/5 flex items-center justify-center">
                    <Loader2 className="size-5 animate-spin text-black/40" />
                  </div>
                  <div className="space-y-1 text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-black">
                      Restoring_Context
                    </p>
                    <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-black/20">
                      Engineering Division // System Sync
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              children
            )}
          </div>
        </AppointmentContext.Provider>
      </SidebarProvider>
    </ProtectedPageWrapper>
  );
}

export const useAppointmentData = () => {
  const context = React.useContext(AppointmentContext);
  if (!context) {
    throw new Error("useAppointmentData must be used within an AppointmentProvider");
  }
  return context;
};