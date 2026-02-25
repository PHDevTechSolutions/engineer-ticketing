"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { BadgeCheck, Bell, ChevronsUpDown, LogOut, Loader2, User } from "lucide-react"
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface NavUserProps {
  user: {
    id?: string
    name: string
    email: string
    avatar: string
  }
}

export function NavUser({ user }: NavUserProps) {
  const router = useRouter()
  const { isMobile, setOpenMobile } = useSidebar()
  const [status, setStatus] = useState<"idle" | "logging-out" | "redirecting">("idle")
  const [progress, setProgress] = useState(0)

  const startTransition = (message: string, type: "logging-out" | "redirecting") => {
    if (isMobile) setOpenMobile(false)
    setStatus(type)
    setProgress(0)
    toast.info(message)

    let value = 0
    const interval = setInterval(() => {
      value += (type === "logging-out" ? 15 : 30)
      setProgress(value)
      if (value >= 100) clearInterval(interval)
    }, 100)
  }

  const handleLogout = async () => {
    startTransition("Signing out...", "logging-out")
    await new Promise((resolve) => setTimeout(resolve, 1000))
    sessionStorage.clear()
    localStorage.clear()
    router.replace("/login")
  }

  const handleAccountClick = async () => {
    if (!user.id) return toast.error("ID missing")
    startTransition("Loading profile...", "redirecting")
    await new Promise((resolve) => setTimeout(resolve, 600))
    router.push(`/account?userId=${user.id}`)
  }

  return (
    <>
      {/* Slim Loading Overlay */}
      {status !== "idle" && (
        <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-white/95 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-64 text-center space-y-6">
            <Loader2 className="size-8 text-red-600 animate-spin mx-auto" />
            <h2 className="text-gray-900 font-bold text-sm uppercase tracking-widest">
                {status === "logging-out" ? "Signing Out" : "Loading Profile"}
            </h2>
            <Progress value={progress} className="h-1 bg-gray-100" />
          </div>
        </div>
      )}

      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton 
                size="lg" 
                className="h-12 px-2 hover:bg-gray-100/50 active:scale-[0.97] transition-all"
              >
                <Avatar className="h-8 w-8 rounded-lg border border-gray-100 shadow-sm">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="bg-gray-900 text-white text-[10px] font-bold">
                    {user.name?.[0] || <User size={12} />}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-xs leading-tight ml-2 overflow-hidden">
                  <span className="truncate font-bold text-gray-900">{user.name}</span>
                  <span className="truncate text-[9px] text-gray-400 font-medium uppercase">{user.email}</span>
                </div>
                <ChevronsUpDown className="ml-auto size-3 text-gray-300 shrink-0" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>

            <DropdownMenuContent 
              className={cn(
                "p-1.5 shadow-xl border-gray-100 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100",
                "w-[calc(100vw-32px)] max-w-[240px] rounded-2xl", // Fixed desktop width & responsive mobile
              )} 
              align={isMobile ? "center" : "start"} 
              side={isMobile ? "bottom" : "right"} 
              sideOffset={8}
            >
              <DropdownMenuLabel className="p-2 font-normal">
                <div className="flex items-center gap-3 px-1 py-1 text-left">
                  <Avatar className="h-10 w-10 rounded-xl border border-gray-50 shadow-sm">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="bg-gray-50 text-gray-900 font-bold">
                        {user.name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left leading-tight overflow-hidden">
                    <span className="truncate font-bold text-gray-900 text-sm leading-none mb-1">{user.name}</span>
                    <span className="truncate text-[10px] text-gray-400 font-medium">{user.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator className="bg-gray-50 mx-1 my-1.5" />

              <DropdownMenuGroup className="space-y-0.5">
                <DropdownMenuItem 
                  onSelect={handleAccountClick} 
                  className="rounded-lg py-2.5 px-3 cursor-pointer hover:bg-gray-50 focus:bg-gray-50 transition-colors"
                >
                  <BadgeCheck className="mr-2.5 h-4 w-4 text-gray-400" />
                  <span className="text-xs font-semibold text-gray-700">Personal Profile</span>
                </DropdownMenuItem>

                <DropdownMenuItem className="rounded-lg py-2.5 px-3 cursor-pointer hover:bg-gray-50 focus:bg-gray-50 transition-colors">
                  <Bell className="mr-2.5 h-4 w-4 text-gray-400" />
                  <span className="text-xs font-semibold text-gray-700">Notifications</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>

              <DropdownMenuSeparator className="bg-gray-50 mx-1 my-1.5" />

              <DropdownMenuItem
                onSelect={handleLogout}
                className="rounded-lg py-2.5 px-3 text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer font-bold text-xs"
              >
                <LogOut className="mr-2.5 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </>
  )
}