"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bell, CalendarCheck, PenTool, BellRing, ChevronRight } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuPortal, // Added this
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface NotificationBellProps {
    counts: {
        siteVisit: number;
        shopDrawing: number;
    };
    isMobile?: boolean;
}

export function NotificationBell({ counts, isMobile = false }: NotificationBellProps) {
    const router = useRouter();
    const total = (counts?.siteVisit || 0) + (counts?.shopDrawing || 0);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button" // Explicitly set type to prevent form issues
                    className={cn(
                        "relative transition-all outline-none active:scale-95 group shrink-0",
                        isMobile
                            ? "p-2.5 bg-white/10 rounded-full border border-white/10 text-white"
                            : "p-2.5 text-gray-400 hover:text-[#E33636] hover:bg-red-50 rounded-xl"
                    )}
                >
                    <Bell size={isMobile ? 18 : 20} className={cn(total > 0 && "animate-pulse")} />

                    {total > 0 && (
                        <span
                            className={cn(
                                "absolute rounded-full border-2",
                                isMobile
                                    ? "top-2 right-2.5 size-2.5 bg-yellow-400 border-[#E33636]"
                                    : "top-2 right-2 size-2.5 bg-[#E33636] border-white"
                            )}
                        />
                    )}
                </button>
            </DropdownMenuTrigger>

            {/* Using Portal ensures it floats above the sidebar/header */}
            <DropdownMenuPortal>
                <DropdownMenuContent
                    align="end"
                    sideOffset={8}
                    className="w-80 p-2 rounded-2xl shadow-2xl border-gray-100 bg-white z-[999] animate-in fade-in zoom-in-95"
                >
                    <DropdownMenuLabel className="px-3 py-3">
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-sm font-black text-[#0F172A] tracking-tight">Updates</span>
                                <span className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">engiconnect system</span>
                            </div>
                            {total > 0 && (
                                <span className="text-[10px] bg-red-600 text-white px-2 py-1 rounded-lg font-black shadow-sm">
                                    {total} NEW
                                </span>
                            )}
                        </div>
                    </DropdownMenuLabel>

                    <DropdownMenuSeparator className="bg-gray-50 mx-2" />

                    <div className="max-h-[400px] overflow-y-auto py-1">
                        {counts.siteVisit > 0 && (
                            <DropdownMenuItem
                                onClick={() => router.push("/appointments/site-visit")}
                                className="flex items-center gap-4 p-3 rounded-xl focus:bg-gray-50 cursor-pointer group/item transition-colors"
                            >
                                <div className="size-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                                    <CalendarCheck size={18} />
                                </div>
                                <div className="flex flex-col flex-1 gap-0.5">
                                    <span className="text-[12px] font-bold text-gray-900">Site Visit Requests</span>
                                    <p className="text-[10px] text-gray-500 leading-tight">
                                        {counts.siteVisit} pending bookings need your confirmation.
                                    </p>
                                </div>
                                <ChevronRight size={14} className="text-gray-300 group-hover/item:translate-x-1 transition-transform" />
                            </DropdownMenuItem>
                        )}

                        {counts.shopDrawing > 0 && (
                            <DropdownMenuItem
                                onClick={() => router.push("/request/shop-drawing")}
                                className="flex items-center gap-4 p-3 rounded-xl focus:bg-gray-50 cursor-pointer group/item transition-colors"
                            >
                                <div className="size-10 bg-red-50 rounded-xl flex items-center justify-center text-red-600 shrink-0">
                                    <PenTool size={18} />
                                </div>
                                <div className="flex flex-col flex-1 gap-0.5">
                                    <span className="text-[12px] font-bold text-gray-900">Engineering Review</span>
                                    <p className="text-[10px] text-gray-500 leading-tight">
                                        {counts.shopDrawing} new drawings are waiting for review.
                                    </p>
                                </div>
                                <ChevronRight size={14} className="text-gray-300 group-hover/item:translate-x-1 transition-transform" />
                            </DropdownMenuItem>
                        )}

                        {total === 0 && (
                            <div className="py-12 flex flex-col items-center justify-center text-center">
                                <div className="size-14 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                                    <BellRing size={24} className="text-gray-200" />
                                </div>
                                <p className="text-[11px] font-black uppercase tracking-widest text-gray-400">
                                    Inbox is empty
                                </p>
                                <p className="text-[10px] text-gray-300 mt-1">No pending engineering tasks.</p>
                            </div>
                        )}
                    </div>

                    {total > 0 && (
                        <>
                            <DropdownMenuSeparator className="bg-gray-50 mx-2" />
                            <div className="p-2">
                                <button 
                                    className="w-full py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors"
                                    onClick={() => {/* add logic here later */}}
                                >
                                    Mark all as seen
                                </button>
                            </div>
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenuPortal>
        </DropdownMenu>
    );
}