"use client"

import * as React from "react"
// Note: SidebarProvider is still needed if your ProtectedPageWrapper or other components depend on it, 
// but we will not render the Sidebar or the Trigger here.
import { SidebarProvider } from "@/components/ui/sidebar" 
import ProtectedPageWrapper from "@/components/protected-page-wrapper"

const AppointmentContext = React.createContext<any>(null);

export default function AddAppointmentLayout({ children }: { children: React.ReactNode }) {
  const [selectedAssistance, setSelectedAssistance] = React.useState<string[]>([]);
  const [otherSpec, setOtherSpec] = React.useState("");

  return (
    <ProtectedPageWrapper>
      {/* We keep the provider so hooks don't break, but we don't render the AppSidebar */}
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