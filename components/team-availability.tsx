"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Users, Circle, Briefcase, Clock } from "lucide-react"

interface TeamMember {
  id: string
  name: string
  role: string
  status: "online" | "busy" | "offline" | "away"
  currentTask?: string
  avatar?: string
}

interface TeamAvailabilityProps {
  members: TeamMember[]
  department: string
  className?: string
}

const STATUS_CONFIG = {
  online: { color: "bg-emerald-500", label: "Online" },
  busy: { color: "bg-red-500", label: "Busy" },
  away: { color: "bg-amber-500", label: "Away" },
  offline: { color: "bg-gray-300", label: "Offline" }
}

export function TeamAvailability({ members, department, className }: TeamAvailabilityProps) {
  // Sort: online first, then busy, away, offline
  const sorted = React.useMemo(() => {
    const statusOrder = { online: 0, busy: 1, away: 2, offline: 3 }
    return [...members].sort((a, b) => statusOrder[a.status] - statusOrder[b.status])
  }, [members])

  const onlineCount = members.filter(m => m.status === "online").length
  const busyCount = members.filter(m => m.status === "busy").length

  return (
    <div className={cn("bg-white rounded-2xl border border-gray-100 overflow-hidden", className)}>
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-50">
            <Users className="w-4 h-4 text-cyan-600" />
          </div>
          <div>
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Team Status</h3>
            <p className="text-[9px] font-bold text-gray-400">{department} Department</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-50">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] font-bold text-emerald-600">{onlineCount} Online</span>
          </div>
          {busyCount > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-red-50">
              <Briefcase className="w-3 h-3 text-red-500" />
              <span className="text-[9px] font-bold text-red-600">{busyCount} Busy</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-3">
        <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto">
          {sorted.map((member) => {
            const status = STATUS_CONFIG[member.status]
            return (
              <div
                key={member.id}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors"
              >
                {/* Avatar */}
                <div className="relative">
                  <div className="w-9 h-9 rounded-full bg-zinc-200 flex items-center justify-center text-zinc-600 font-black text-xs">
                    {member.avatar ? (
                      <img src={member.avatar} alt={member.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      member.name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className={cn(
                    "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white",
                    status.color
                  )} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[12px] font-bold text-gray-900 truncate">{member.name}</p>
                    <span className="text-[8px] font-black text-gray-400 uppercase bg-gray-100 px-1.5 py-0.5 rounded">
                      {member.role}
                    </span>
                  </div>
                  {member.currentTask ? (
                    <p className="text-[10px] text-gray-500 truncate flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {member.currentTask}
                    </p>
                  ) : (
                    <p className="text-[10px] text-gray-400">{status.label}</p>
                  )}
                </div>

                {/* Status indicator */}
                <div className={cn("w-2 h-2 rounded-full", status.color)} />
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="px-4 py-2 border-t border-gray-100 flex items-center gap-4">
        {(Object.keys(STATUS_CONFIG) as Array<keyof typeof STATUS_CONFIG>).map((status) => (
          <div key={status} className="flex items-center gap-1.5">
            <div className={cn("w-2 h-2 rounded-full", STATUS_CONFIG[status].color)} />
            <span className="text-[9px] font-bold text-gray-400 capitalize">{status}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
