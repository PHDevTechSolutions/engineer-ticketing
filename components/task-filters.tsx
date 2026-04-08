"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import {
  Filter, Clock, Calendar, AlertTriangle, User,
  X, CheckCircle2, Briefcase
} from "lucide-react"

export type FilterType = "all" | "today" | "overdue" | "mine" | "week"

interface TaskFiltersProps {
  activeFilter: FilterType
  onFilterChange: (filter: FilterType) => void
  counts: {
    all: number
    today: number
    overdue: number
    mine: number
    week: number
  }
  className?: string
}

const FILTERS: { key: FilterType; label: string; icon: any; color: string }[] = [
  { key: "all", label: "All Tasks", icon: Briefcase, color: "bg-zinc-100 text-zinc-600 border-zinc-200" },
  { key: "today", label: "Due Today", icon: Clock, color: "bg-amber-50 text-amber-600 border-amber-200" },
  { key: "week", label: "This Week", icon: Calendar, color: "bg-blue-50 text-blue-600 border-blue-200" },
  { key: "overdue", label: "Overdue", icon: AlertTriangle, color: "bg-red-50 text-red-600 border-red-200" },
  { key: "mine", label: "Assigned to Me", icon: User, color: "bg-violet-50 text-violet-600 border-violet-200" },
]

export function TaskFilters({ activeFilter, onFilterChange, counts, className }: TaskFiltersProps) {
  const [isExpanded, setIsExpanded] = React.useState(false)

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Collapsed: Show active filter + button */}
      {!isExpanded ? (
        <>
          <div className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-xl border transition-all",
            FILTERS.find(f => f.key === activeFilter)?.color || FILTERS[0].color
          )}>
            {(() => {
              const FilterIcon = FILTERS.find(f => f.key === activeFilter)?.icon || Briefcase
              return <FilterIcon className="w-4 h-4" />
            })()}
            <span className="text-[11px] font-bold">{FILTERS.find(f => f.key === activeFilter)?.label}</span>
            <span className="text-[9px] font-black bg-white/60 px-1.5 py-0.5 rounded-full">
              {counts[activeFilter]}
            </span>
          </div>
          <button
            onClick={() => setIsExpanded(true)}
            className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all"
          >
            <Filter className="w-4 h-4 text-gray-400" />
          </button>
        </>
      ) : (
        /* Expanded: Show all filter options */
        <div className="flex items-center gap-2 animate-in fade-in duration-200">
          {FILTERS.map((filter) => {
            const Icon = filter.icon
            const isActive = activeFilter === filter.key
            const count = counts[filter.key]
            
            return (
              <button
                key={filter.key}
                onClick={() => {
                  onFilterChange(filter.key)
                  setIsExpanded(false)
                }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-xl border transition-all",
                  isActive ? filter.color : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                )}
              >
                <Icon className={cn("w-3.5 h-3.5", isActive ? "" : "text-gray-400")} />
                <span className="text-[10px] font-bold">{filter.label}</span>
                <span className={cn(
                  "text-[9px] font-black px-1.5 py-0.5 rounded-full",
                  isActive ? "bg-white/60" : "bg-gray-100 text-gray-500"
                )}>
                  {count}
                </span>
              </button>
            )
          })}
          <button
            onClick={() => setIsExpanded(false)}
            className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      )}
    </div>
  )
}

// Simplified pill version for compact spaces
export function TaskFilterPills({ activeFilter, onFilterChange, counts }: TaskFiltersProps) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {FILTERS.map((filter) => {
        const Icon = filter.icon
        const isActive = activeFilter === filter.key
        const count = counts[filter.key]
        
        return (
          <button
            key={filter.key}
            onClick={() => onFilterChange(filter.key)}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-bold transition-all",
              isActive 
                ? "bg-zinc-900 text-white" 
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            <Icon className="w-3 h-3" />
            {filter.label}
            <span className={cn(
              "ml-0.5 px-1 py-0.5 rounded text-[8px]",
              isActive ? "bg-white/20" : "bg-white"
            )}>
              {count}
            </span>
          </button>
        )
      })}
    </div>
  )
}
