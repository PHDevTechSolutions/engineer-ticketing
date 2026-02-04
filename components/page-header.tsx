"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Terminal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: string;
  version?: string;
  trigger?: React.ReactNode; 
  actions?: React.ReactNode; 
  showBackButton?: boolean;
  className?: string; // Added for page-specific overrides
}

export function PageHeader({ 
  title, 
  version = "DSI-SYS-v2.5", 
  trigger,
  actions, 
  showBackButton = true,
  className
}: PageHeaderProps) {
  const router = useRouter()

  return (
    <header className={cn(
      "sticky top-0 z-[50] flex h-16 shrink-0 items-center px-4 md:px-6",
      "border-b border-white/10 bg-background/80 backdrop-blur-md",
      "justify-between overflow-hidden transition-all",
      className
    )}>
      {/* BACKGROUND DECORATION: Industrial Grid */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[length:20px_20px] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)]" />
      
      {/* LEFT SECTION */}
      <div className="flex items-center gap-4 relative z-10">
        <div className="hidden md:block">
          {trigger}
        </div>

        {showBackButton && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.back()} 
            className="size-9 rounded-none border border-white/5 hover:border-primary/30 hover:bg-primary/5 text-primary transition-all group"
          >
            <ChevronLeft className="size-5 group-hover:-translate-x-0.5 transition-transform" />
          </Button>
        )}
        
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <Terminal size={12} className="text-primary/50 hidden xs:block" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary leading-none italic">
              {title.replace(/\s+/g, "_")}
            </span>
          </div>
          <span className="text-[9px] font-mono font-bold uppercase tracking-tighter text-muted-foreground mt-1 opacity-70">
            Build: {version}
          </span>
        </div>
      </div>

      {/* RIGHT SECTION */}
      <div className="flex items-center gap-2 md:gap-3 relative z-10">
        {actions}
        {/* Mobile Trigger shows only if provided */}
        <div className="md:hidden">
          {trigger}
        </div>
      </div>

      {/* BOTTOM ACCENT LINE */}
      <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
    </header>
  )
}