"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { MoveLeft, ShieldAlert, LayoutDashboard, HelpCircle } from "lucide-react"

export default function NotFound() {
  const [typedText, setTypedText] = React.useState("")
  const fullMessage = "> system_check: link_broken... redirecting_suggested..."

  // Change this variable to match your actual dashboard route
  const dashboardRoute = "/dashboard" 

  React.useEffect(() => {
    let i = 0
    const interval = setInterval(() => {
      setTypedText(fullMessage.slice(0, i))
      i++
      if (i > fullMessage.length) clearInterval(interval)
    }, 40)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-[#F4F7F7] p-6 overflow-hidden font-sans">
      
      {/* Background Subtle Elements */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
        <div className="absolute w-[400px] h-[400px] border border-zinc-200/50 rounded-full" />
        <div className="absolute w-[700px] h-[700px] border border-zinc-100/50 rounded-full" />
      </div>

      <main className="relative z-10 w-full max-w-[420px] flex flex-col items-center">
        
        {/* Scaled Icon Container */}
        <div className="relative mb-6">
          <div className="relative p-5 bg-white rounded-[24px] shadow-sm border border-zinc-200/60">
            <ShieldAlert className="size-10 text-zinc-900" strokeWidth={1.5} />
            <div className="absolute -top-1 -right-1 size-3 bg-red-500 rounded-full border-2 border-white animate-pulse" />
          </div>
        </div>

        {/* Tightened Error Text */}
        <div className="text-center space-y-1 mb-8">
          <h1 className="text-7xl font-black text-zinc-900 tracking-tighter leading-none">
            404
          </h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400">
            Page Not Found
          </p>
        </div>

        {/* Content Card */}
        <div className="w-full bg-white border border-zinc-200/60 p-8 rounded-[32px] shadow-sm mb-6 text-center">
          <h3 className="text-base font-bold text-zinc-900 mb-2 uppercase tracking-tight">Connection Lost</h3>
          <p className="text-zinc-500 text-[13px] font-medium leading-relaxed px-2">
            The link you followed may be broken or the page has been moved. 
            Your <span className="text-zinc-900 font-bold">engiconnect</span> session remains active.
          </p>
          
          <div className="mt-8 space-y-3">
            {/* Primary Action to Dashboard */}
            <Link href={dashboardRoute} className="block w-full">
              <Button className="w-full h-12 rounded-xl bg-black text-white hover:bg-zinc-800 transition-all font-bold text-[10px] tracking-widest uppercase gap-3 shadow-md">
                <LayoutDashboard className="size-3.5" />
                Go to Homepage
              </Button>
            </Link>
            
            <div className="flex gap-2 pt-2">
               {/* Secondary Action - Also to Dashboard */}
               <Link href={dashboardRoute} className="flex-1">
                 <Button 
                  variant="ghost" 
                  className="w-full h-10 rounded-lg text-[9px] font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50"
                 >
                   <MoveLeft className="mr-2 size-3" /> Dashboard
                 </Button>
               </Link>

               <Button 
                variant="ghost" 
                className="flex-1 h-10 rounded-lg text-[9px] font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50"
               >
                 <HelpCircle className="mr-2 size-3" /> Get Help
               </Button>
            </div>
          </div>
        </div>

        {/* Terminal Style Log */}
        <div className="px-4 py-2 bg-zinc-100/50 rounded-full border border-zinc-200/40">
          <p className="font-mono text-[9px] text-zinc-400 font-bold tracking-tight">
            {typedText}<span className="animate-pulse">_</span>
          </p>
        </div>
      </main>

      {/* Standard Footer Branding */}
      <footer className="fixed bottom-10">
        <div className="flex items-center gap-4">
          <div className="size-8 bg-zinc-900 rounded-lg flex items-center justify-center text-white font-black text-xs">E</div>
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-300">
            engiconnect system
          </span>
        </div>
      </footer>
    </div>
  )
}