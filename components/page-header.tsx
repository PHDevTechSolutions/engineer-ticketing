"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: string;
  version?: string;
  trigger?: React.ReactNode; 
  actions?: React.ReactNode; 
  showBackButton?: boolean;
  className?: string;
  // Matching your Sidebar user object structure
  user?: {
    id: string | null;
    name: string;
    email: string;
    avatar?: string;
  };
}

export function PageHeader({ 
  title, 
  version = "v2.6", 
  trigger,
  actions, 
  showBackButton = true,
  className,
  user
}: PageHeaderProps) {
  const router = useRouter()

  // Helper to get initials if the profile picture is missing
  const getInitials = (name: string) => {
    if (!name || name === "Loading...") return "EC";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className={cn(
      "sticky top-0 z-[100] flex h-16 shrink-0 items-center px-3 md:px-8",
      "border-b border-slate-200 bg-white/80 backdrop-blur-xl",
      "justify-between transition-all",
      className
    )}>
      
      {/* LEFT SECTION: Navigation & Title */}
      <div className="flex items-center gap-2 md:gap-4">
        <div className="flex items-center gap-1.5">
          {trigger && (
            <div className="shrink-0">
              {trigger}
            </div>
          )}
          
          {showBackButton && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => router.back()} 
              className="size-8 md:size-9 rounded-lg border border-slate-100 hover:bg-slate-50 text-slate-500 transition-all group"
            >
              <ChevronLeft className="size-4 md:size-5 group-hover:-translate-x-0.5 transition-transform" />
            </Button>
          )}
        </div>

        {/* Title Stack - Sharper border and spacing */}
        <div className="flex flex-col border-l border-slate-200 pl-3 md:pl-4 ml-0.5 md:ml-1">
          <div className="flex items-center gap-2">
            <h1 className="text-[11px] md:text-[12px] font-bold uppercase tracking-wider md:tracking-[0.15em] text-[#0F172A] leading-none truncate max-w-[120px] md:max-w-none">
              {title}
            </h1>
            <div className="size-1 rounded-full bg-blue-500 animate-pulse hidden sm:block" />
          </div>
          <span className="hidden md:block text-[9px] font-bold uppercase tracking-widest text-slate-400 mt-1.5">
            engiconnect system <span className="mx-1 opacity-30">•</span> {version}
          </span>
        </div>
      </div>

      {/* RIGHT SECTION: Actions & Profile */}
      <div className="flex items-center gap-3">
        {actions && (
          <div className="flex items-center">
            {actions}
          </div>
        )}
        
        {/* Profile Group: Matching your SidebarFooter data */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-100">
          <div className="hidden lg:flex flex-col items-end">
            <span className="text-[10px] font-bold text-[#0F172A] leading-none">
              {user?.name || "Guest User"}
            </span>
            <span className="text-[9px] text-slate-400 mt-1 truncate max-w-[120px]">
              {user?.email || "No email provided"}
            </span>
          </div>

          <div className="size-8 md:size-9 rounded-lg bg-[#0F172A] flex items-center justify-center overflow-hidden shadow-sm border border-slate-200 shrink-0">
            {user?.avatar ? (
              <img 
                src={user.avatar} 
                alt={user.name} 
                className="size-full object-cover"
                onError={(e) => {
                  // Fallback if image fails to load
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <span className="text-[10px] font-bold text-white uppercase">
                {getInitials(user?.name || "EC")}
              </span>
            )}
          </div>
        </div>
      </div>

    </header>
  )
}