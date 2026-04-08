"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Clock, CheckCircle2, AlertCircle, ArrowRight,
  FileText, CalendarCheck, ClipboardCheck, Package
} from "lucide-react"

interface PipelineItem {
  id: string
  title: string
  type: string
  status: "pending" | "in-progress" | "completed" | "overdue"
  date: Date
  assignee?: string
}

interface WorkflowPipelineProps {
  items: PipelineItem[]
  userId?: string | null
  className?: string
}

const STATUS_CONFIG = {
  pending: { 
    label: "Pending", 
    color: "bg-amber-50 text-amber-600 border-amber-200",
    icon: Clock
  },
  "in-progress": { 
    label: "In Progress", 
    color: "bg-blue-50 text-blue-600 border-blue-200",
    icon: FileText
  },
  completed: { 
    label: "Completed", 
    color: "bg-emerald-50 text-emerald-600 border-emerald-200",
    icon: CheckCircle2
  },
  overdue: { 
    label: "Overdue", 
    color: "bg-red-50 text-red-600 border-red-200",
    icon: AlertCircle
  }
}

const TYPE_ICONS: Record<string, any> = {
  "Site Visit": CalendarCheck,
  "Job Request": FileText,
  "Testing": ClipboardCheck,
  "Product": Package,
}

export function WorkflowPipeline({ items, userId, className }: WorkflowPipelineProps) {
  const router = useRouter()

  // Group items by status
  const grouped = React.useMemo(() => {
    return {
      overdue: items.filter(i => i.status === "overdue"),
      pending: items.filter(i => i.status === "pending"),
      "in-progress": items.filter(i => i.status === "in-progress"),
      completed: items.filter(i => i.status === "completed"),
    }
  }, [items])

  const appendId = (url: string) => userId
    ? url.includes("?") ? `${url}&userId=${userId}` : `${url}?userId=${userId}`
    : url

  return (
    <div className={cn("bg-white rounded-2xl border border-gray-100 overflow-hidden", className)}>
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-violet-50">
            <ArrowRight className="w-4 h-4 text-violet-600" />
          </div>
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Workflow Pipeline</h3>
        </div>
        <span className="text-[9px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-full">
          {items.length} Active
        </span>
      </div>

      {/* Pipeline Columns */}
      <div className="grid grid-cols-4 divide-x divide-gray-100">
        {(Object.keys(grouped) as Array<keyof typeof grouped>).map((status) => {
          const config = STATUS_CONFIG[status]
          const statusItems = grouped[status]
          const Icon = config.icon

          return (
            <div key={status} className="min-h-[200px]">
              <div className={cn("p-2 border-b flex items-center justify-between", config.color)}>
                <div className="flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-black uppercase">{config.label}</span>
                </div>
                <span className="text-[10px] font-bold">{statusItems.length}</span>
              </div>

              <div className="p-2 space-y-2">
                {statusItems.slice(0, 5).map((item) => {
                  const TypeIcon = TYPE_ICONS[item.type] || FileText
                  return (
                    <div
                      key={item.id}
                      onClick={() => router.push(appendId(`/request/${item.type.toLowerCase().replace(" ", "-")}/${item.id}`))}
                      className={cn(
                        "p-2 rounded-lg border cursor-pointer transition-all hover:shadow-md",
                        config.color
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <TypeIcon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold truncate">{item.title}</p>
                          <p className="text-[8px] opacity-70 mt-0.5">
                            {item.date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
                {statusItems.length > 5 && (
                  <div className="text-center py-1">
                    <span className="text-[9px] font-bold text-gray-400">
                      +{statusItems.length - 5} more
                    </span>
                  </div>
                )}
                {statusItems.length === 0 && (
                  <div className="text-center py-4">
                    <span className="text-[9px] font-bold text-gray-300">Empty</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
