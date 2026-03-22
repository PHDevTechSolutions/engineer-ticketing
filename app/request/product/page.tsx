"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import ProtectedPageWrapper from "@/components/protected-page-wrapper"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import {
  Search, RotateCcw, ArrowRight, Clock,
  Package, CheckCircle2, LayoutGrid, Calendar,
  XCircle, AlertTriangle, ShieldCheck,
  ChevronLeft, ChevronRight, ArrowUpDown,
  ArrowUp, ArrowDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { supabase } from "@/utils/supabase"
import { PageHeader } from "@/components/page-header"

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
interface SPFCreation {
  id: string
  spf_number: string
  referenceid?: string
  tsm?: string
  status: string
  date_created: string
  date_updated?: string
  final_selling_cost?: string
  proj_lead_time?: string
}

type SortField = "date_created" | "date_updated" | "spf_number"
type SortDir   = "asc" | "desc"

/* ─────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────── */
const PAGE_SIZE = 10

const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
  PROCUREMENT: {
    label: "Pending For Procurement",
    color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", dot: "bg-amber-400",
  },
  "APPROVED BY PROCUREMENT": {
    label: "Approved By Procurement",
    color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", dot: "bg-emerald-500",
  },
  REJECTED: {
    label: "Rejected",
    color: "text-rose-700", bg: "bg-rose-50", border: "border-rose-200", dot: "bg-rose-500",
  },
}

const FILTERS = [
  { key: null,                      label: "All",                     icon: LayoutGrid,  variant: "default" },
  { key: "PROCUREMENT",             label: "Pending For Procurement", icon: Clock,       variant: "warning" },
  { key: "APPROVED BY PROCUREMENT", label: "Approved By Procurement", icon: CheckCircle2,variant: "emerald" },
  { key: "REJECTED",                label: "Rejected",                icon: XCircle,     variant: "rose"    },
]

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function getStatusMeta(status: string) {
  const s = (status || "").toUpperCase().trim()
  if (s.includes("APPROVED BY PROCUREMENT") || s.includes("APPROVED")) return STATUS_META["APPROVED BY PROCUREMENT"]
  if (s.includes("REJECTED"))    return STATUS_META["REJECTED"]
  if (s.includes("PROCUREMENT")) return STATUS_META["PROCUREMENT"]
  return { label: status || "Pending For Procurement", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", dot: "bg-amber-400" }
}

function isCostingFilled(r: SPFCreation) {
  if (!r.final_selling_cost) return false
  return !r.final_selling_cost.split("|ROW|").some(row =>
    row.split(",").some(v => !v || v.trim() === "-")
  )
}

function isPendingStatus(status: string) {
  const s = (status || "").toUpperCase().trim()
  return s === "PENDING FOR PROCUREMENT" || (s.includes("PROCUREMENT") && !s.includes("APPROVED"))
}

function relativeTime(dateStr?: string): string {
  if (!dateStr) return "—"
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins < 1)   return "Just now"
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7)   return `${days}d ago`
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

/* ─────────────────────────────────────────────
   SKELETON ROW
───────────────────────────────────────────── */
function SkeletonRow() {
  return (
    <div className="px-6 py-4 animate-pulse">
      {/* Desktop */}
      <div className="hidden md:grid grid-cols-[44px_1.6fr_1.2fr_0.7fr_1.4fr_1fr_44px] gap-4 items-center">
        <div className="size-9 rounded-xl bg-zinc-100" />
        <div className="space-y-2">
          <div className="h-3 w-28 bg-zinc-100 rounded-full" />
          <div className="h-2 w-20 bg-zinc-100 rounded-full" />
        </div>
        <div className="h-3 w-24 bg-zinc-100 rounded-full" />
        <div className="h-3 w-14 bg-zinc-100 rounded-full" />
        <div className="h-5 w-36 bg-zinc-100 rounded-full" />
        <div className="h-3 w-20 bg-zinc-100 rounded-full" />
        <div className="size-8 rounded-xl bg-zinc-100" />
      </div>
      {/* Mobile */}
      <div className="md:hidden space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-zinc-100" />
            <div className="space-y-2">
              <div className="h-3 w-28 bg-zinc-100 rounded-full" />
              <div className="h-2 w-20 bg-zinc-100 rounded-full" />
            </div>
          </div>
          <div className="h-6 w-24 bg-zinc-100 rounded-xl" />
        </div>
        <div className="flex items-center gap-2 pl-[52px]">
          <div className="h-5 w-14 bg-zinc-100 rounded-lg" />
          <div className="h-3 w-16 bg-zinc-100 rounded-full" />
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   STAT PILL
───────────────────────────────────────────── */
function StatPill({ label, count, icon: Icon, variant, isActive, onClick, loading }: {
  label: string; count: string; icon: any; variant: string
  isActive: boolean; onClick: () => void; loading?: boolean
}) {
  const colors: Record<string, string> = {
    default: "text-zinc-500 bg-zinc-100",
    warning: "text-amber-600 bg-amber-50",
    emerald: "text-emerald-600 bg-emerald-50",
    rose:    "text-rose-600 bg-rose-50",
  }
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 px-4 py-3 rounded-2xl border bg-white shadow-sm transition-all flex-shrink-0 active:scale-95",
        isActive ? "border-zinc-900 ring-4 ring-zinc-900/5 shadow-md" : "border-zinc-200/60 hover:border-zinc-300 hover:shadow-md"
      )}
    >
      <div className={cn("p-1.5 rounded-xl", colors[variant] || colors.default)}>
        <Icon className="size-3.5" />
      </div>
      <div className="text-left min-w-[28px]">
        {loading ? (
          <div className="h-4 w-5 bg-zinc-100 rounded animate-pulse mb-1" />
        ) : (
          <p className="text-[16px] font-black text-zinc-900 leading-none">{count}</p>
        )}
        <p className="text-[8px] font-black uppercase text-zinc-400 tracking-widest mt-0.5 whitespace-nowrap">{label}</p>
      </div>
    </button>
  )
}

/* ─────────────────────────────────────────────
   SORT HEADER BUTTON
───────────────────────────────────────────── */
function SortButton({ label, field, currentField, dir, onSort }: {
  label: string; field: SortField; currentField: SortField; dir: SortDir
  onSort: (f: SortField) => void
}) {
  const active = field === currentField
  return (
    <button
      onClick={() => onSort(field)}
      className={cn(
        "flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.2em] transition-colors",
        active ? "text-zinc-700" : "text-zinc-400 hover:text-zinc-600"
      )}
    >
      {label}
      {active
        ? dir === "asc"
          ? <ArrowUp className="size-3" />
          : <ArrowDown className="size-3" />
        : <ArrowUpDown className="size-3 opacity-40" />}
    </button>
  )
}

/* ─────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────── */
export default function ProcurementListPage() {
  const router = useRouter()

  const [userId, setUserId]           = React.useState<string | null>(null)
  const [userDepartment, setUserDept] = React.useState<string | null>(null)
  const [requests, setRequests]       = React.useState<SPFCreation[]>([])
  const [isLoading, setIsLoading]     = React.useState(true)
  const [filterStatus, setFilter]     = React.useState<string | null>(null)
  const [searchTerm, setSearch]       = React.useState("")
  const [page, setPage]               = React.useState(1)
  const [sortField, setSortField]     = React.useState<SortField>("date_created")
  const [sortDir, setSortDir]         = React.useState<SortDir>("desc")

  const searchRef = React.useRef<HTMLInputElement>(null)

  /* ── FETCH ── */
  const fetchRequests = React.useCallback(async (dept?: string | null) => {
    setIsLoading(true)
    try {
      const department = dept ?? userDepartment
      const isIT = (department || "").toUpperCase() === "IT"

      let query = supabase
        .from("spf_creation")
        .select("id, spf_number, referenceid, tsm, status, date_created, date_updated, final_selling_cost, proj_lead_time")
        .order("date_created", { ascending: false })

      if (!isIT) {
        query = query.or("status.eq.Pending For Procurement,status.eq.Approved By Procurement")
      }

      const { data, error } = await query
      if (error) throw error
      setRequests(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [userDepartment])

  /* ── INIT ── */
  React.useEffect(() => {
    const uid  = localStorage.getItem("userId")
    const dept = localStorage.getItem("userDepartment")
    setUserId(uid)
    setUserDept(dept)
    fetchRequests(dept)
    const ch = supabase
      .channel("spf_creation_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "spf_creation" }, () => fetchRequests(dept))
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [fetchRequests])

  /* ── KEYBOARD: Escape clears search, "/" focuses search ── */
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setSearch(""); searchRef.current?.blur() }
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  /* ── RESET page on filter/search change ── */
  React.useEffect(() => { setPage(1) }, [filterStatus, searchTerm, sortField, sortDir])

  /* ── DERIVED ── */
  const isIT = (userDepartment || "").toUpperCase() === "IT"

  const filtered = React.useMemo(() => {
    let list = requests.filter(r => {
      const s = `${r.spf_number} ${r.referenceid || ""} ${r.tsm || ""}`.toLowerCase()
      const matchSearch = s.includes(searchTerm.toLowerCase())
      const matchStatus = (() => {
        if (filterStatus === null) return true
        const st = (r.status || "").toUpperCase().trim()
        if (filterStatus === "PROCUREMENT")             return isPendingStatus(r.status)
        if (filterStatus === "APPROVED BY PROCUREMENT") return st.includes("APPROVED")
        return st.includes(filterStatus)
      })()
      return matchSearch && matchStatus
    })

    // Sort
    list = [...list].sort((a, b) => {
      let va = "", vb = ""
      if (sortField === "spf_number") { va = a.spf_number; vb = b.spf_number }
      else if (sortField === "date_updated") { va = a.date_updated || ""; vb = b.date_updated || "" }
      else { va = a.date_created; vb = b.date_created }
      return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va)
    })

    return list
  }, [requests, searchTerm, filterStatus, sortField, sortDir])

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const countFor = (key: string | null) => {
    if (key === null) return requests.length
    return requests.filter(r => {
      const s = (r.status || "").toUpperCase().trim()
      if (key === "PROCUREMENT")             return isPendingStatus(r.status)
      if (key === "APPROVED BY PROCUREMENT") return s.includes("APPROVED")
      return s.includes(key)
    }).length
  }

  const pendingCosting = requests.filter(r => isPendingStatus(r.status) && !isCostingFilled(r)).length

  const handleSort = (field: SortField) => {
    if (field === sortField) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortField(field); setSortDir("desc") }
  }

  const handleReset = () => {
    setFilter(null)
    setSearch("")
    setPage(1)
    setSortField("date_created")
    setSortDir("desc")
    fetchRequests(userDepartment)
  }

  /* ── EMPTY STATE MESSAGE ── */
  const emptyMessage = () => {
    if (searchTerm) return `No results for "${searchTerm}"`
    if (filterStatus === "PROCUREMENT")             return "No pending records right now"
    if (filterStatus === "APPROVED BY PROCUREMENT") return "No approved records yet"
    if (filterStatus === "REJECTED")                return "No rejected records"
    return "No records found"
  }

  return (
    <ProtectedPageWrapper>
      <SidebarProvider defaultOpen={false}>
        <AppSidebar userId={userId} />
        <SidebarInset className="bg-[#F8FAFA] pb-24 md:pb-10 min-h-screen">
          <PageHeader
            title="SPF PROCUREMENT"
            version="V1.0"
            showBackButton
            trigger={<SidebarTrigger className="mr-2" />}
          />

          <main className="p-4 md:p-6 max-w-7xl mx-auto w-full space-y-4">

            {/* ── IT BANNER ── */}
            {!isLoading && isIT && (
              <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3">
                <ShieldCheck className="size-4 text-blue-500 flex-shrink-0" />
                <p className="text-[11px] font-black text-blue-700">
                  IT Access — viewing all records across all statuses.
                </p>
              </div>
            )}

            {/* ── NEEDS COSTING BANNER ── */}
            {!isLoading && !isIT && pendingCosting > 0 && (
              <div className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="size-4 text-amber-500 flex-shrink-0" />
                  <p className="text-[11px] font-black text-amber-700">
                    {pendingCosting} record{pendingCosting > 1 ? "s" : ""} still need costing filled in.
                  </p>
                </div>
                <button
                  onClick={() => { setFilter("PROCUREMENT"); setPage(1) }}
                  className="text-[9px] font-black text-amber-700 underline underline-offset-2 flex-shrink-0"
                >
                  View →
                </button>
              </div>
            )}

            {/* ── STAT FILTER PILLS ── */}
            <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-none">
              {FILTERS.map(f => (
                <StatPill
                  key={String(f.key)}
                  label={f.label}
                  count={String(countFor(f.key))}
                  icon={f.icon}
                  variant={f.variant}
                  isActive={filterStatus === f.key}
                  onClick={() => setFilter(f.key)}
                  loading={isLoading}
                />
              ))}
            </div>

            {/* ── SEARCH + RESET ── */}
            <div className="flex gap-2">
              <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-zinc-300 group-focus-within:text-zinc-800 transition-colors" />
                <input
                  ref={searchRef}
                  placeholder='Search SPF#, Reference ID, or TSM... (Press "/" to focus)'
                  value={searchTerm}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-11 pr-10 h-12 rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200 outline-none focus:ring-2 focus:ring-zinc-900 transition-all text-sm font-bold"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-300 hover:text-zinc-600 transition-colors"
                  >
                    <XCircle className="size-4" />
                  </button>
                )}
              </div>
              <Button
                variant="outline"
                onClick={handleReset}
                className="size-12 rounded-2xl bg-white border-zinc-200 hover:bg-zinc-50 flex-shrink-0 p-0"
                title="Reset all filters"
              >
                <RotateCcw className="size-4 text-zinc-400" />
              </Button>
            </div>

            {/* ── TABLE ── */}
            <div className="bg-white rounded-[28px] shadow-sm border border-zinc-200/60 overflow-hidden">

              {/* Desktop column headers with sort */}
              <div className="hidden md:grid grid-cols-[44px_1.6fr_1.2fr_0.7fr_1.4fr_1fr_44px] bg-zinc-50/80 px-6 py-4 border-b gap-4 items-center">
                <span />
                <SortButton label="SPF # / Date"   field="spf_number"   currentField={sortField} dir={sortDir} onSort={handleSort} />
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">Reference ID</span>
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">TSM</span>
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">Status</span>
                <SortButton label="Last Updated"   field="date_updated" currentField={sortField} dir={sortDir} onSort={handleSort} />
                <span />
              </div>

              <div className="divide-y divide-zinc-50/80">
                {isLoading ? (
                  /* ── SKELETON ── */
                  Array.from({ length: PAGE_SIZE }).map((_, i) => (
                    <SkeletonRow key={i} />
                  ))
                ) : paginated.length === 0 ? (
                  /* ── EMPTY STATE ── */
                  <div className="py-24 flex flex-col items-center gap-3">
                    <div className="size-16 rounded-3xl bg-zinc-50 border border-zinc-100 flex items-center justify-center">
                      <Package className="size-7 text-zinc-200" />
                    </div>
                    <p className="text-[11px] font-black uppercase text-zinc-300 tracking-widest text-center px-4">
                      {emptyMessage()}
                    </p>
                    {(searchTerm || filterStatus) && (
                      <button
                        onClick={handleReset}
                        className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1 hover:text-blue-700 transition-colors"
                      >
                        Clear all filters
                      </button>
                    )}
                  </div>
                ) : (
                  paginated.map(r => {
                    const meta    = getStatusMeta(r.status)
                    const filled  = isCostingFilled(r)
                    const pending = isPendingStatus(r.status)

                    return (
                      <div
                        key={r.id}
                        className="group cursor-pointer hover:bg-zinc-50/80 active:bg-zinc-100/60 transition-colors"
                        onClick={() => router.push(`/request/product/${r.id}`)}
                      >
                        {/* ── DESKTOP ROW ── */}
                        <div className="hidden md:grid grid-cols-[44px_1.6fr_1.2fr_0.7fr_1.4fr_1fr_44px] px-6 py-4 items-center gap-4">
                          <div className="size-9 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center group-hover:bg-zinc-900 group-hover:border-zinc-900 transition-all">
                            <Package size={14} className="text-zinc-300 group-hover:text-white transition-colors" />
                          </div>

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-[12px] font-mono font-black text-zinc-900">{r.spf_number}</p>
                              {pending && !filled && (
                                <span className="text-[8px] font-black text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-lg uppercase tracking-wide">
                                  ⚠ Needs Costing
                                </span>
                              )}
                            </div>
                            <p className="text-[9px] text-zinc-400 font-bold mt-0.5 flex items-center gap-1">
                              <Calendar size={9} />
                              {r.date_created ? new Date(r.date_created).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "---"}
                            </p>
                          </div>

                          <p className="text-[11px] font-bold text-zinc-600 truncate pr-2">{r.referenceid || "—"}</p>
                          <p className="text-[11px] font-bold text-zinc-700 uppercase truncate">{r.tsm || "—"}</p>

                          <div className="flex items-center gap-2">
                            <div className={cn("size-2 rounded-full flex-shrink-0 animate-pulse", meta.dot,
                              pending && !filled ? "animate-pulse" : "animate-none"
                            )} />
                            <span className={cn("text-[10px] font-black uppercase tracking-wide truncate", meta.color)}>
                              {r.status || "Pending For Procurement"}
                            </span>
                          </div>

                          <div>
                            <p className="text-[10px] font-bold text-zinc-700">{relativeTime(r.date_updated)}</p>
                            {r.date_updated && (
                              <p className="text-[8px] text-zinc-400 mt-0.5">
                                {new Date(r.date_updated).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                              </p>
                            )}
                          </div>

                          <div className="flex justify-end">
                            <div className="size-8 flex items-center justify-center rounded-xl border border-transparent group-hover:border-zinc-200 group-hover:bg-white transition-all">
                              <ArrowRight className="size-3.5 text-zinc-300 group-hover:text-zinc-800 transition-colors" />
                            </div>
                          </div>
                        </div>

                        {/* ── MOBILE CARD ── */}
                        <div className="md:hidden px-4 py-4">
                          <div className="flex items-start justify-between gap-2 mb-2.5">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="size-10 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center flex-shrink-0 group-hover:bg-zinc-900 transition-all">
                                <Package size={14} className="text-zinc-300 group-hover:text-white" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[13px] font-mono font-black text-zinc-900 leading-tight truncate">{r.spf_number}</p>
                                <p className="text-[10px] text-zinc-400 font-bold truncate">{r.referenceid || "No Reference ID"}</p>
                              </div>
                            </div>
                            <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-xl border flex-shrink-0", meta.bg, meta.border)}>
                              <div className={cn("size-1.5 rounded-full", meta.dot)} />
                              <span className={cn("text-[8px] font-black uppercase tracking-wide", meta.color)}>
                                {meta.label}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pl-[52px]">
                            <div className="flex flex-wrap items-center gap-2">
                              {r.tsm && (
                                <span className="text-[9px] bg-zinc-100 rounded-lg px-2 py-0.5 uppercase font-bold text-zinc-600">{r.tsm}</span>
                              )}
                              <span className="flex items-center gap-1 text-[9px] text-zinc-400 font-bold">
                                <Calendar size={9} />
                                {r.date_created ? new Date(r.date_created).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "2-digit" }) : "---"}
                              </span>
                              {r.date_updated && (
                                <span className="text-[9px] text-zinc-400 font-bold">· {relativeTime(r.date_updated)}</span>
                              )}
                              {pending && !filled && (
                                <span className="text-amber-600 font-black text-[8px] bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-lg">
                                  ⚠ Needs Costing
                                </span>
                              )}
                            </div>
                            <ArrowRight className="size-4 text-zinc-200 group-hover:text-zinc-500 transition-colors flex-shrink-0 ml-2" />
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* ── FOOTER: pagination + count ── */}
              {!isLoading && filtered.length > 0 && (
                <div className="px-4 md:px-6 py-3 border-t bg-zinc-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
                  {/* Record info */}
                  <p className="text-[9px] font-black uppercase text-zinc-400 tracking-widest order-2 sm:order-1">
                    {filtered.length === requests.length
                      ? `${requests.length} records`
                      : `${filtered.length} of ${requests.length} records`}
                    {filterStatus ? ` · filtered` : ""}
                    {searchTerm ? ` · "${searchTerm}"` : ""}
                  </p>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center gap-1.5 order-1 sm:order-2">
                      <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className={cn(
                          "size-8 rounded-xl border flex items-center justify-center transition-all",
                          page === 1
                            ? "border-zinc-100 text-zinc-300 cursor-not-allowed"
                            : "border-zinc-200 text-zinc-600 hover:bg-zinc-100 active:scale-95"
                        )}
                      >
                        <ChevronLeft className="size-3.5" />
                      </button>

                      {/* Page number pills */}
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                        .reduce<(number | "...")[]>((acc, p, i, arr) => {
                          if (i > 0 && typeof arr[i - 1] === "number" && (p as number) - (arr[i - 1] as number) > 1) acc.push("...")
                          acc.push(p)
                          return acc
                        }, [])
                        .map((p, i) =>
                          p === "..." ? (
                            <span key={`ellipsis-${i}`} className="text-[10px] text-zinc-300 px-1">···</span>
                          ) : (
                            <button
                              key={p}
                              onClick={() => setPage(p as number)}
                              className={cn(
                                "size-8 rounded-xl text-[10px] font-black transition-all active:scale-95",
                                page === p
                                  ? "bg-zinc-900 text-white border border-zinc-900"
                                  : "border border-zinc-200 text-zinc-600 hover:bg-zinc-100"
                              )}
                            >
                              {p}
                            </button>
                          )
                        )}

                      <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className={cn(
                          "size-8 rounded-xl border flex items-center justify-center transition-all",
                          page === totalPages
                            ? "border-zinc-100 text-zinc-300 cursor-not-allowed"
                            : "border-zinc-200 text-zinc-600 hover:bg-zinc-100 active:scale-95"
                        )}
                      >
                        <ChevronRight className="size-3.5" />
                      </button>

                      <span className="text-[9px] font-black text-zinc-400 ml-1 hidden sm:block">
                        Page {page} of {totalPages}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedPageWrapper>
  )
}