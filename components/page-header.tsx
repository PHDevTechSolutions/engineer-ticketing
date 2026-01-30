"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PageHeaderProps {
  title: string;
  version?: string;
  children?: React.ReactNode; // For the "Add" button or other actions
  showBackButton?: boolean;
}

export function PageHeader({ 
  title, 
  version = "DSI-SYS-v2.0", 
  children, 
  showBackButton = true 
}: PageHeaderProps) {
  const router = useRouter()

  return (
    <header className="flex h-16 shrink-0 items-center px-4 md:px-6 border-b-2 border-muted/30 bg-background/80 backdrop-blur-md sticky top-0 z-30 justify-between">
      <div className="flex items-center gap-4">
        {showBackButton && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.back()} 
            className="hover:bg-primary/10 text-primary transition-colors"
          >
            <ChevronLeft className="size-5" />
          </Button>
        )}
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary leading-none italic">
            {title.replace(" ", "_")}
          </span>
          <span className="text-xs font-bold uppercase tracking-tighter text-foreground/70">
            {version}
          </span>
        </div>
      </div>

      {/* Action Slot (Desktop Add Buttons, etc.) */}
      <div className="hidden md:flex items-center gap-4">
        {children}
      </div>

      {/* Mobile Badge (Optional: visual indicator for mobile users) */}
      {/* <div className="md:hidden flex items-center gap-2">
        <div className="size-1.5 rounded-full bg-primary animate-pulse" />
      </div> */}
    </header>
  )
}