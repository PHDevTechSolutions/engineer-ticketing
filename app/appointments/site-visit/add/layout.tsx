"use client"

import * as React from "react"
import { SidebarProvider } from "@/components/ui/sidebar" 
import ProtectedPageWrapper from "@/components/protected-page-wrapper"

const AppointmentContext = React.createContext<any>(null);

export default function AddAppointmentLayout({ children }: { children: React.ReactNode }) {
  // Initialize state from localStorage if available
  const [selectedAssistance, setSelectedAssistance] = React.useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("selected_assistance");
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  const [otherSpec, setOtherSpec] = React.useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("other_spec") || "";
    }
    return "";
  });

  // Sync to localStorage whenever values change
  React.useEffect(() => {
    localStorage.setItem("selected_assistance", JSON.stringify(selectedAssistance));
  }, [selectedAssistance]);

  React.useEffect(() => {
    localStorage.setItem("other_spec", otherSpec);
  }, [otherSpec]);

  return (
    <ProtectedPageWrapper>
      <SidebarProvider defaultOpen={false}>
        <AppointmentContext.Provider value={{ selectedAssistance, setSelectedAssistance, otherSpec, setOtherSpec }}>
          <div className="flex-1 flex flex-col min-h-screen bg-background">
            {children}
          </div>
        </AppointmentContext.Provider>
      </SidebarProvider>
    </ProtectedPageWrapper>
  );
}

export const useAppointmentData = () => React.useContext(AppointmentContext);