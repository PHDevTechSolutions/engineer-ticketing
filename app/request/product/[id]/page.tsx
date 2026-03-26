"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import {
  Clock, CheckCircle2, History, Loader2, ShieldCheck,
  Image as ImageIcon, MapPin, AlertCircle, Package,
  CreditCard, Phone, User, Layers, Box, BadgeDollarSign,
  Receipt, Truck, Factory, Anchor, Save, FileDown,
  FileText, ChevronDown, ChevronUp, Users, ClipboardList,
  AlertTriangle, TrendingUp, Lock, Calculator,
} from "lucide-react";

import { supabase } from "@/utils/supabase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { PageHeader } from "@/components/page-header";
import ProtectedPageWrapper from "@/components/protected-page-wrapper";

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
interface ProductCell {
  image: string;
  qty: string;
  specs: { title: string; details: string[] }[];
  unitCost: string;
  packaging: string;
  factory: string;
  port: string;
  subtotal: string;
  supplierBrand: string;
  companyName: string;
  contactName: string;
  contactNumber: string;
  sellingCost: string;
  leadTime: string;
  rowIndex: number;
  productIndex: number;
  // DB Pre-population fields added here
  l_db: string;
  w_db: string;
  h_db: string;
  pcs_carton_db: string;
}

/* ─────────────────────────────────────────────
   STATUS HELPERS
   Priority order matters — check specific first
───────────────────────────────────────────── */
const getStatusMeta = (status: string) => {
  const s = (status || "").toUpperCase().trim();
  if (s.includes("APPROVED BY PROCUREMENT") || s.includes("APPROVED")) return { color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", dot: "bg-emerald-500" };
  if (s.includes("COSTING DONE"))  return { color: "text-violet-600",  bg: "bg-violet-50",  border: "border-violet-200",  dot: "bg-violet-500"  };
  if (s.includes("REJECTED"))      return { color: "text-rose-600",    bg: "bg-rose-50",    border: "border-rose-200",    dot: "bg-rose-500"    };
  if (s.includes("PROCUREMENT"))   return { color: "text-blue-600",    bg: "bg-blue-50",    border: "border-blue-200",    dot: "bg-blue-500"    };
  return { color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", dot: "bg-amber-400" };
};

// Derive a clean normalized status key
const getStatusKey = (status: string) => {
  const s = (status || "").toUpperCase().trim();
  if (s.includes("COSTING DONE")) return "COSTING_DONE";
  if (s.includes("APPROVED"))     return "APPROVED";
  if (s.includes("REJECTED"))     return "REJECTED";
  if (s.includes("PROCUREMENT"))  return "PROCUREMENT";
  return "UNKNOWN";
};

/* ─────────────────────────────────────────────
   WORKFLOW TIMELINE
   Sales(0) → TSM(1) → Sales Head(2) → PD(3) → Procurement(4) → Approved(5) → Agent(6)
   
   Step logic (which step is currently ACTIVE):
   - spf_creation not yet created         → step 3 (at PD)
   - status = Pending For Procurement     → step 4 (at Procurement, active)
   - status = Costing Done                → step 4 (procurement done, step 5 active = Approval)
   - status includes Approved             → step 5 done, step 6 active (Agent)
   - status = Rejected                    → mark at current failed step
───────────────────────────────────────────── */
const WORKFLOW_STEPS = [
  { key: "sales",       label: "Sales Request",    icon: ClipboardList, dept: "Sales"      },
  { key: "tsm",         label: "TSM Review",        icon: Users,         dept: "TSM"        },
  { key: "saleshead",   label: "Sales Head",         icon: Users,         dept: "Sales Head" },
  { key: "pd",          label: "PD Recommendation", icon: Package,        dept: "PD"         },
  { key: "procurement", label: "Procurement",        icon: TrendingUp,    dept: "Procurement"},
  { key: "approved",    label: "Approved",           icon: CheckCircle2,  dept: "Management" },
  { key: "agent",       label: "Agent Requester",    icon: Users,         dept: "Agent"      },
];

function getActiveStep(statusKey: string): number {
  // Returns the index of the ACTIVE (current) step
  switch (statusKey) {
    case "PROCUREMENT":  return 4; // at Procurement
    case "COSTING_DONE": return 5; // kept for safety
    case "APPROVED":     return 6; // approved → at Agent
    case "REJECTED":     return 4; // rejected at procurement level
    default:             return 3; // default: at PD
  }
}

/* ─────────────────────────────────────────────
   DATA HELPERS
───────────────────────────────────────────── */
const parseSpecs = (raw: string) => {
  if (!raw || raw === "-") return [];
  if (raw.includes("~~")) {
    return raw.split("@@").map(chunk => {
      const [titlePart, rest = ""] = chunk.split("~~");
      return { title: titlePart.trim(), details: rest.split(";;").map(s => s.trim()).filter(Boolean) };
    });
  }
  const flat = raw.split(" | ").map(s => s.trim()).filter(Boolean);
  return flat.length ? [{ title: "", details: flat }] : [];
};

const formatPHP = (val: any) => {
  const num = parseFloat(val) || 0;
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(num);
};


function extractDimensions(packaging: string) {
  if (!packaging) return { l: "", w: "", h: "" };

  // Match formats like: "34 cm x 56 cm x 78 cm"
  const match = packaging.match(/(\d+)\s*cm\s*x\s*(\d+)\s*cm\s*x\s*(\d+)\s*cm/i);

  if (!match) return { l: "", w: "", h: "" };

  return {
    l: match[1],
    w: match[2],
    h: match[3],
  };
}

function parseAllProducts(offers: any): ProductCell[][] {
  if (!offers?.product_offer_image) return [];

  const split = (s: string | null | undefined) => (s ?? "").split("|ROW|");

  const rowImages       = split(offers.product_offer_image);
  const rowQtys         = split(offers.product_offer_qty);
  const rowSpecs        = split(offers.product_offer_technical_specification);
  const rowUnitCosts    = split(offers.product_offer_unit_cost);
  const rowPackaging    = split(offers.product_offer_packaging_details);
  const rowFactories    = split(offers.product_offer_factory_address);
  const rowPorts        = split(offers.product_offer_port_of_discharge);
  const rowSubtotals    = split(offers.product_offer_subtotal);
  const rowBrands       = split(offers.supplier_brand);
  const rowCompanies    = split(offers.company_name);
  const rowContactNames = split(offers.contact_name);
  const rowContactNums  = split(offers.contact_number);
  const rowSelling      = split(offers.final_selling_cost);
  const rowLeadTimes    = split(offers.proj_lead_time);

  // ✅ CORRECT FIELD FROM YOUR DB
  const rowPcsCartons = split(offers.product_offer_pcs_per_carton ?? "");

  return rowImages.map((rowStr, rIdx) =>
    rowStr.split(",").map((img, pIdx) => {
      const packagingStr = rowPackaging[rIdx]?.split(",")[pIdx]?.trim() ?? "";
      const dims = extractDimensions(packagingStr);

      return {
        image:         img.trim(),
        qty:           rowQtys[rIdx]?.split(",")[pIdx]?.trim()        ?? "0",
        specs:         parseSpecs(rowSpecs[rIdx]?.split(" || ")[pIdx] ?? ""),
        unitCost:      rowUnitCosts[rIdx]?.split(",")[pIdx]?.trim()   ?? "0",
        packaging:     packagingStr,
        factory:       rowFactories[rIdx]?.split(",")[pIdx]?.trim()   ?? "-",
        port:          rowPorts[rIdx]?.split(",")[pIdx]?.trim()       ?? "-",
        subtotal:      rowSubtotals[rIdx]?.split(",")[pIdx]?.trim()   ?? "0",
        supplierBrand: rowBrands[rIdx]?.split(",")[pIdx]?.trim()      ?? "-",
        companyName:   rowCompanies[rIdx]?.split(",")[pIdx]?.trim()   ?? "-",
        contactName:   rowContactNames[rIdx]?.split(",")[pIdx]?.trim()?? "-",
        contactNumber: rowContactNums[rIdx]?.split(",")[pIdx]?.trim() ?? "-",
        sellingCost:   rowSelling[rIdx]?.split(",")[pIdx]?.trim()     ?? "-",
        leadTime:      rowLeadTimes[rIdx]?.split(",")[pIdx]?.trim()   ?? "-",

        // ✅ AUTO POPULATED FROM PACKAGING STRING
        l_db: dims.l,
        w_db: dims.w,
        h_db: dims.h,

        // ✅ CORRECT SOURCE
        pcs_carton_db: rowPcsCartons[rIdx]?.split(",")[pIdx]?.trim() ?? "",

        rowIndex: rIdx,
        productIndex: pIdx,
      };
    })
  );
}

function rebuildStr(rows: ProductCell[][], get: (p: ProductCell) => string) {
  return rows.map(r => r.map(get).join(",")).join("|ROW|");
}

/* ─────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────── */
export default function ProcurementDetailPage() {
  const params = useParams() as { id: string };

  const [spfData, setSpfData]           = useState<any>(null);
  const [requestData, setRequestData]   = useState<any>(null);
  const [loading, setLoading]           = useState(true);
  const [isSaving, setIsSaving]         = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [rows, setRows]                 = useState<ProductCell[][]>([]);
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const [liveExchangeRate, setLiveExchangeRate] = useState("60");

  // Calculator States
  const [showCalc, setShowCalc]         = useState<Record<string, boolean>>({});
  const [calcStates, setCalcStates]     = useState<Record<string, any>>({});

  /* ── FETCH ── */
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
  
        // ✅ Fetch Live Exchange Rate (WITH FALLBACK)
        let currentRate = "60";
  
        try {
          const rateRes = await fetch("https://open.er-api.com/v6/latest/USD");
          const rateData = await rateRes.json();
  
          if (rateData?.rates?.PHP) {
            currentRate = rateData.rates.PHP.toFixed(4);
          }
        } catch (e) {
          console.error("Primary exchange rate failed", e);
        }
  
        // ✅ FALLBACK API
        if (!currentRate || currentRate === "60") {
          try {
            const res = await fetch("https://api.exchangerate.host/latest?base=USD&symbols=PHP");
            const data = await res.json();
  
            if (data?.rates?.PHP) {
              currentRate = data.rates.PHP.toFixed(4);
            }
          } catch (e) {
            console.error("Fallback exchange rate failed", e);
          }
        }
  
        // ✅ APPLY RATE
        setLiveExchangeRate(currentRate);
  
        // 🔽 YOUR ORIGINAL LOGIC (UNCHANGED)
        const { data: offer, error } = await supabase
          .from("spf_creation")
          .select("*")
          .eq("id", params.id)
          .single();
  
        if (error) throw error;
  
        setSpfData(offer);
  
        const parsed = parseAllProducts(offer);
        setRows(parsed);
  
        // Initialize Calculator state directly with DB pre-pop values and Live Rate
        const initCalcs: Record<string, any> = {};
        parsed.forEach((r, ri) =>
          r.forEach((p, pi) => {
            initCalcs[`${ri}-${pi}`] = {
              l: p.l_db || "",
              w: p.w_db || "",
              h: p.h_db || "",
              qtyPerBox: p.pcs_carton_db || "",
              shipmentCost: "520000",
              cbmContainer: "65",
              invoicePct: "1.01",
              exchangeRate: currentRate,
              gp: "0.75",
            };
          })
        );
  
        setCalcStates(initCalcs);
  
        const exp: Record<number, boolean> = {};
        parsed.forEach((_, i) => {
          exp[i] = true;
        });
        setExpandedRows(exp);
  
        if (offer?.spf_number) {
          const { data: req } = await supabase
            .from("spf_request")
            .select("*")
            .eq("spf_number", offer.spf_number)
            .single();
  
          setRequestData(req ?? null);
        }
      } catch {
        toast.error("Failed to load procurement record");
      } finally {
        setLoading(false);
      }
    }
  
    if (params.id) load();
  }, [params.id]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("https://open.er-api.com/v6/latest/USD");
        const data = await res.json();
  
        if (data?.rates?.PHP) {
          setLiveExchangeRate(data.rates.PHP.toFixed(4));
        }
      } catch (e) {
        console.error("Auto refresh exchange rate failed", e);
      }
    }, 1000 * 60 * 0.1); // every 1 min
  
    return () => clearInterval(interval);
  }, []);

  /* ── DERIVED STATE ── */
  const allCells   = useMemo(() => rows.flat(), [rows]);
  const filledCount = allCells.filter(p =>
    p.sellingCost && p.sellingCost !== "-" && p.leadTime && p.leadTime !== "-"
  ).length;
  const totalCount      = allCells.length;
  const allFilled       = filledCount === totalCount && totalCount > 0;
  const progressPct     = totalCount > 0 ? Math.round((filledCount / totalCount) * 100) : 0;
  const grandTotalSelling = allCells.reduce((sum, p) => sum + (parseFloat(p.sellingCost) || 0), 0);
  const grandTotalPD      = allCells.reduce((sum, p) => sum + (parseFloat(p.subtotal)    || 0), 0);

  const itemDescriptions = (requestData?.item_description || "").split(",").map((s: string) => s.trim());
  const itemPhotos       = (requestData?.item_photo       || "").split(",").map((s: string) => s.trim());

  const statusKey    = getStatusKey(spfData?.status ?? "");
  const statusMeta   = getStatusMeta(spfData?.status ?? "");
  const activeStep   = getActiveStep(statusKey);
  const isApproved   = statusKey === "APPROVED";
  const isRejected   = statusKey === "REJECTED";
  // Lock editing when approved or rejected
  const isLocked     = isApproved || isRejected;

  /* ── EDIT ── */
  const updateCell = (rIdx: number, pIdx: number, field: "sellingCost" | "leadTime", value: string) => {
    if (isLocked) return; // safety guard
    setRows(prev => {
      const next = prev.map(r => r.map(p => ({ ...p })));
      next[rIdx][pIdx][field] = value;
      return next;
    });
  };

  /* ── CALCULATOR LOGIC ── */
  const toggleCalc = (key: string) => setShowCalc(prev => ({ ...prev, [key]: !prev[key] }));

  const updateCalc = (key: string, field: string, val: string) => {
    setCalcStates(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] || {
          l: "", w: "", h: "", qtyPerBox: "",
          shipmentCost: "520000", cbmContainer: "65",
          invoicePct: "1.01", exchangeRate: liveExchangeRate, gp: "0.75"
        }),
        [field]: val
      }
    }));
  };

  const calculateSRP = (unitCost: string, calc: any) => {
    if (!calc) return { landed: 0, srp: 0 };
    const l = parseFloat(calc.l) || 0;
    const w = parseFloat(calc.w) || 0;
    const h = parseFloat(calc.h) || 0;
    const qtyPerBox = parseFloat(calc.qtyPerBox) || 0;
    const shipmentCost = parseFloat(calc.shipmentCost) || 0;
    const cbmContainer = parseFloat(calc.cbmContainer) || 0;
    const invoicePct = parseFloat(calc.invoicePct) || 0;
    const exchangeRate = parseFloat(calc.exchangeRate) || 0;
    const gp = parseFloat(calc.gp) || 0;
    const unitPrice = parseFloat(unitCost) || 0;

    if (!l || !w || !h || !qtyPerBox || !cbmContainer || gp >= 1) return { landed: 0, srp: 0 };

    const cbmPerBox = (l * w * h) / 1000000;
    const boxesPerContainer = cbmContainer / cbmPerBox;
    const totalItems = boxesPerContainer * qtyPerBox;
    const shippingPerItem = shipmentCost / totalItems;

    const baseCost = unitPrice * exchangeRate;
    const landedCost = (baseCost + shippingPerItem) * invoicePct;
    const srp = landedCost / (1 - gp);

    return { landed: landedCost, srp };
  };

  /* ── SAVE ── */
  const handleSave = async (markCostingDone: boolean) => {
    if (isLocked) return;
    setIsSaving(true);
    try {
      const update: any = {
        final_selling_cost: rebuildStr(rows, p => p.sellingCost),
        proj_lead_time:     rebuildStr(rows, p => p.leadTime),
        date_updated:       new Date().toISOString(),
      };
      // Only update status if user explicitly chose "Save + Approved By Procurement"
      if (markCostingDone) {
        update.status = "Approved By Procurement";
      }
      const { error } = await supabase
        .from("spf_creation")
        .update(update)
        .eq("id", params.id);
      if (error) throw error;
      // Update local state so UI reflects immediately
      setSpfData((prev: any) => ({ ...prev, ...update }));
      // If costing done, re-derive statusKey etc from new status
      toast.success(markCostingDone ? "Saved & marked Approved By Procurement ✓" : "Costing saved ✓");
    } catch (err: any) {
      toast.error(err.message || "Save failed");
    } finally {
      setIsSaving(false);
      setShowConfirm(false);
    }
  };

  if (loading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-[#F8FAFA] gap-4">
      <Loader2 className="size-8 animate-spin text-zinc-300" />
      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Loading Record...</p>
    </div>
  );

  return (
    <ProtectedPageWrapper>
      <SidebarProvider defaultOpen={false}>
        <AppSidebar userId={undefined} />
        {/* Extra bottom padding only on mobile for sticky bar */}
        <SidebarInset className={cn("bg-[#F8FAFA] min-h-screen", !isLocked ? "pb-28 md:pb-10" : "pb-10")}>
          <PageHeader
            title={`PROCUREMENT / ${spfData?.spf_number ?? "---"}`}
            version="V1.0"
            showBackButton
            trigger={<SidebarTrigger className="mr-2" />}
          />

          <main className="p-4 md:p-6 max-w-7xl mx-auto w-full space-y-4">

            {/* ── APPROVED BANNER ── */}
            {isApproved && (
              <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3">
                <CheckCircle2 className="size-4 text-emerald-500 flex-shrink-0" />
                <p className="text-[11px] font-black text-emerald-700">
                  This SPF has been approved. Costing is locked and cannot be edited.
                </p>
              </div>
            )}

            {/* ── REJECTED BANNER ── */}
            {isRejected && (
              <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3">
                <AlertCircle className="size-4 text-rose-500 flex-shrink-0" />
                <p className="text-[11px] font-black text-rose-700">
                  This SPF has been rejected. Costing is locked.
                </p>
              </div>
            )}

            {/* ── HEADER CARD ── */}
            <div className="bg-white rounded-[24px] border border-zinc-200/60 shadow-sm p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "size-12 rounded-2xl flex items-center justify-center text-white shadow-lg flex-shrink-0",
                    isApproved ? "bg-emerald-600" : isRejected ? "bg-rose-600" : "bg-zinc-900"
                  )}>
                    {isApproved ? <CheckCircle2 size={20} /> : isRejected ? <AlertCircle size={20} /> : <Package size={20} />}
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-lg font-black text-zinc-900 uppercase tracking-tighter truncate">
                      {requestData?.customer_name ?? spfData?.spf_number}
                    </h1>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                      {spfData?.tsm && (
                        <span className="text-[9px] font-black text-zinc-400 uppercase bg-zinc-100 px-2 py-0.5 rounded-lg">
                          TSM: {spfData.tsm}
                        </span>
                      )}
                      {spfData?.referenceid && (
                        <span className="text-[9px] font-black text-zinc-400 uppercase bg-zinc-100 px-2 py-0.5 rounded-lg">
                          Ref: {spfData.referenceid}
                        </span>
                      )}
                      <span className="text-[9px] font-mono font-black text-zinc-400 uppercase bg-zinc-100 px-2 py-0.5 rounded-lg">
                        {spfData?.spf_number}
                      </span>
                    </div>
                  </div>
                </div>
                <div className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-2xl border self-start sm:self-auto flex-shrink-0",
                  statusMeta.bg, statusMeta.border
                )}>
                  <div className={cn("size-2 rounded-full", statusMeta.dot)} />
                  <span className={cn("text-[10px] font-black uppercase tracking-widest", statusMeta.color)}>
                    {spfData?.status ?? "---"}
                  </span>
                </div>
              </div>

              {/* ── COSTING PROGRESS BAR — hidden when approved ── */}
              {!isApproved && !isRejected && (
                <div className="mt-5 pt-4 border-t border-zinc-100">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Costing Progress</p>
                    <p className="text-[9px] font-black text-zinc-600">
                      {filledCount} / {totalCount} options filled
                      {allFilled && <span className="text-emerald-600 ml-1">· Complete ✓</span>}
                    </p>
                  </div>
                  <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        allFilled ? "bg-emerald-500" : progressPct > 0 ? "bg-blue-500" : "bg-zinc-200"
                      )}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              )}

              {/* ── APPROVED SUMMARY ── */}
              {isApproved && (
                <div className="mt-5 pt-4 border-t border-zinc-100 flex items-center gap-3">
                  <CheckCircle2 className="size-4 text-emerald-500" />
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                    Selling Total: {formatPHP(grandTotalSelling)}
                  </p>
                </div>
              )}
            </div>

            {/* ── WORKFLOW TIMELINE ── */}
            <div className="bg-white rounded-[24px] border border-zinc-200/60 shadow-sm p-5">
              <SectionHeader icon={History} title="Workflow Timeline" />

              {/* Desktop — horizontal */}
              <div className="hidden md:flex items-center mt-5 overflow-x-auto pb-2">
                {WORKFLOW_STEPS.map((step, i) => {
                  const done    = i < activeStep;
                  const active  = i === activeStep;
                  const Icon    = step.icon;
                  // Special: if rejected, show red on active step
                  const isRejectedStep = isRejected && active;
                  return (
                    <React.Fragment key={step.key}>
                      <div className="flex flex-col items-center flex-shrink-0 w-[88px]">
                        <div className={cn(
                          "size-10 rounded-2xl flex items-center justify-center border-2 transition-all",
                          done          ? "bg-emerald-500 border-emerald-500 text-white shadow-sm" :
                          isRejectedStep? "bg-rose-500 border-rose-500 text-white shadow-rose-200 shadow-lg" :
                          active        ? "bg-blue-500 border-blue-500 text-white shadow-blue-200 shadow-lg" :
                                          "bg-zinc-50 border-zinc-200 text-zinc-300"
                        )}>
                          {done ? <CheckCircle2 size={16} /> : <Icon size={15} />}
                        </div>
                        <p className={cn(
                          "text-[8px] font-black uppercase tracking-wide text-center mt-2 leading-tight",
                          done           ? "text-emerald-600" :
                          isRejectedStep ? "text-rose-600" :
                          active         ? "text-blue-600" : "text-zinc-300"
                        )}>
                          {step.label}
                        </p>
                        <p className={cn(
                          "text-[7px] font-bold text-center mt-0.5",
                          done           ? "text-emerald-400" :
                          isRejectedStep ? "text-rose-400" :
                          active         ? "text-blue-400" : "text-zinc-200"
                        )}>
                          {step.dept}
                        </p>
                      </div>
                      {i < WORKFLOW_STEPS.length - 1 && (
                        <div className={cn(
                          "flex-1 h-0.5 mx-1 min-w-[8px] transition-all",
                          done ? "bg-emerald-300" : "bg-zinc-100"
                        )} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Mobile — vertical */}
              <div className="md:hidden mt-4">
                {WORKFLOW_STEPS.map((step, i) => {
                  const done   = i < activeStep;
                  const active = i === activeStep;
                  const Icon   = step.icon;
                  const isRejectedStep = isRejected && active;
                  return (
                    <div key={step.key} className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div className={cn(
                          "size-7 rounded-xl flex items-center justify-center border-2 flex-shrink-0 z-10",
                          done           ? "bg-emerald-500 border-emerald-500 text-white" :
                          isRejectedStep ? "bg-rose-500 border-rose-500 text-white" :
                          active         ? "bg-blue-500 border-blue-500 text-white" :
                                           "bg-zinc-50 border-zinc-200 text-zinc-300"
                        )}>
                          {done ? <CheckCircle2 size={12} /> : <Icon size={11} />}
                        </div>
                        {i < WORKFLOW_STEPS.length - 1 && (
                          <div className={cn("w-0.5 h-5", done ? "bg-emerald-200" : "bg-zinc-100")} />
                        )}
                      </div>
                      <div className="pb-3 pt-0.5">
                        <p className={cn(
                          "text-[10px] font-black uppercase tracking-tight leading-tight",
                          done           ? "text-emerald-600" :
                          isRejectedStep ? "text-rose-600" :
                          active         ? "text-blue-600" : "text-zinc-300"
                        )}>
                          {step.label}
                        </p>
                        <p className={cn(
                          "text-[8px] font-bold",
                          done ? "text-emerald-400" : active ? "text-blue-400" : "text-zinc-200"
                        )}>
                          {step.dept}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── MAIN 2-COL GRID ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

              {/* ── LEFT: Product Offers ── */}
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-white rounded-[24px] border border-zinc-200/60 shadow-sm p-5 md:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <SectionHeader
                      icon={isLocked ? Lock : Layers}
                      title={isLocked ? "PD Offer — View Only" : "PD Offer — Costing Input"}
                    />
                    {!isLocked && !allFilled && totalCount > 0 && (
                      <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5 flex-shrink-0">
                        <AlertTriangle size={10} className="text-amber-500" />
                        <span className="text-[9px] font-black text-amber-700">{totalCount - filledCount} remaining</span>
                      </div>
                    )}
                    {isLocked && (
                      <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 flex-shrink-0">
                        <Lock size={9} className="text-zinc-400" />
                        <span className="text-[9px] font-black text-zinc-500 uppercase">Locked</span>
                      </div>
                    )}
                  </div>

                  {!isLocked && (
                    <p className="text-[10px] text-zinc-400 mt-1.5 ml-9">
                      Fill <span className="font-black text-zinc-700">Selling Cost</span> &amp; <span className="font-black text-zinc-700">Lead Time</span> per option below.
                    </p>
                  )}

                  <div className="mt-5 space-y-6">
                    {rows.length === 0 ? (
                      <div className="py-16 text-center border-2 border-dashed border-zinc-100 rounded-2xl bg-zinc-50/50">
                        <Package className="size-8 text-zinc-200 mx-auto mb-2" />
                        <p className="text-zinc-300 text-[10px] font-black uppercase tracking-[0.2em]">No Product Offers Found</p>
                      </div>
                    ) : rows.map((products, rIdx) => {
                      const isExpanded = expandedRows[rIdx] ?? true;
                      const rowFilled  = products.every(p =>
                        p.sellingCost && p.sellingCost !== "-" && p.leadTime && p.leadTime !== "-"
                      );

                      return (
                        <div key={rIdx} className="border border-zinc-100 rounded-[20px] overflow-hidden">

                          {/* Collapsible row header */}
                          <button
                            className="w-full flex items-center justify-between px-4 py-3 bg-zinc-50/80 hover:bg-zinc-100/60 transition-colors"
                            onClick={() => setExpandedRows(prev => ({ ...prev, [rIdx]: !prev[rIdx] }))}
                          >
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                                Item Row #{rIdx + 1}
                              </span>
                              <span className="text-[9px] font-mono font-black text-zinc-400">
                                {spfData?.spf_number}-{String(rIdx + 1).padStart(3, "0")}
                              </span>
                              <span className={cn(
                                "text-[8px] font-black uppercase px-2 py-0.5 rounded-lg border",
                                rowFilled
                                  ? "text-emerald-600 bg-emerald-50 border-emerald-200"
                                  : isLocked
                                  ? "text-zinc-400 bg-zinc-50 border-zinc-200"
                                  : "text-amber-600 bg-amber-50 border-amber-200"
                              )}>
                                {rowFilled
                                  ? "✓ Filled"
                                  : isLocked
                                  ? "—"
                                  : `${products.filter(p => p.sellingCost !== "-" && p.leadTime !== "-").length}/${products.length} done`}
                              </span>
                            </div>
                            {isExpanded ? <ChevronUp size={14} className="text-zinc-400 flex-shrink-0" /> : <ChevronDown size={14} className="text-zinc-400 flex-shrink-0" />}
                          </button>

                          {isExpanded && (
                            <div className="divide-y divide-zinc-50">

                              {/* Client request context */}
                              {(itemDescriptions[rIdx] || itemPhotos[rIdx]) && (
                                <div className="flex gap-3 p-4 bg-amber-50/30">
                                  {itemPhotos[rIdx] && itemPhotos[rIdx] !== "-" && (
                                    <div className="size-16 rounded-xl border border-amber-100 overflow-hidden flex-shrink-0 bg-white">
                                      <img src={itemPhotos[rIdx]} alt="Client item" className="w-full h-full object-contain" />
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <p className="text-[8px] font-black uppercase tracking-widest text-amber-600 mb-1 flex items-center gap-1">
                                      <FileText size={8} /> Client Request
                                    </p>
                                    <p className="text-[11px] text-zinc-700 font-bold leading-snug whitespace-pre-wrap">
                                      {itemDescriptions[rIdx]?.replace(/\|/g, "\n") || "—"}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {/* Product options */}
                              {products.map((p, pIdx) => {
                                const optionFilled = p.sellingCost !== "-" && p.sellingCost !== "" && p.leadTime !== "-" && p.leadTime !== "";
                                
                                // Setup keys & values for calculator instance with DB fallbacks
                                const calcKey = `${rIdx}-${pIdx}`;
                                const currentCalc = calcStates[calcKey] || {
                                  l: p.l_db || "", w: p.w_db || "", h: p.h_db || "", qtyPerBox: p.pcs_carton_db || "",
                                  shipmentCost: "520000", cbmContainer: "65",
                                  invoicePct: "1.01", exchangeRate: liveExchangeRate, gp: "0.75"
                                };
                                const calcResult = calculateSRP(p.unitCost, currentCalc);

                                return (
                                  <div key={pIdx} className={cn(
                                    "transition-all",
                                    !isLocked && !optionFilled ? "bg-amber-50/10" : "bg-white"
                                  )}>
                                    {/* Supplier header */}
                                    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-zinc-100">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className={cn(
                                          "text-[9px] font-black px-2.5 py-1 rounded-full uppercase",
                                          optionFilled ? "bg-emerald-600 text-white" : "bg-zinc-900 text-white"
                                        )}>
                                          Option {pIdx + 1}
                                        </span>
                                        {p.supplierBrand !== "-" && (
                                          <span className="text-[11px] font-black text-zinc-800">{p.supplierBrand}</span>
                                        )}
                                        {p.companyName !== "-" && (
                                          <span className="text-[10px] text-zinc-400 font-bold">· {p.companyName}</span>
                                        )}
                                      </div>
                                      <div className="flex flex-wrap items-center gap-3 text-[10px] text-zinc-400 font-bold">
                                        {p.contactName !== "-" && (
                                          <span className="flex items-center gap-1"><User size={9} /> {p.contactName}</span>
                                        )}
                                        {p.contactNumber !== "-" && (
                                          <span className="flex items-center gap-1"><Phone size={9} /> {p.contactNumber}</span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Image + specs */}
                                    <div className="p-4 border-b border-zinc-50 bg-zinc-50/20">
                                      <div className="flex gap-4">
                                        <div className="size-24 md:size-28 bg-white rounded-2xl border border-zinc-100 overflow-hidden flex-shrink-0 shadow-sm">
                                          {p.image && p.image !== "-"
                                            ? <img src={p.image} alt="Product" className="w-full h-full object-contain" />
                                            : <div className="w-full h-full flex items-center justify-center"><ImageIcon size={22} className="text-zinc-200" /></div>
                                          }
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-2">Technical Specs</p>
                                          {p.specs.length > 0 ? (
                                            <div className="space-y-1.5">
                                              {p.specs.map((g, gi) => (
                                                <div key={gi}>
                                                  {g.title && <p className="text-[8px] font-black uppercase text-amber-600 mb-0.5">{g.title}</p>}
                                                  <ul className="space-y-0.5">
                                                    {g.details.slice(0, 4).map((d, di) => (
                                                      <li key={di} className="text-[10px] text-zinc-500 flex gap-1.5 leading-tight">
                                                        <span className="text-zinc-300 flex-shrink-0">•</span>
                                                        <span className="line-clamp-1">{d}</span>
                                                      </li>
                                                    ))}
                                                  </ul>
                                                </div>
                                              ))}
                                            </div>
                                          ) : <p className="text-[10px] text-zinc-300 italic">No specs.</p>}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Commercials */}
                                    <div className="p-4 space-y-3">
                                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        <CommItem icon={Receipt}         label="Unit Cost (PD/USD)" value={`$${parseFloat(p.unitCost || "0").toFixed(2)}`} hi />
                                        <CommItem icon={Box}             label="Qty"             value={`${p.qty} units`} />
                                        <CommItem icon={Truck}           label="Packaging"        value={p.packaging} />
                                        <CommItem icon={BadgeDollarSign} label="PD Subtotal"     value={formatPHP(p.subtotal)} hi />
                                      </div>
                                      <div className="grid grid-cols-2 gap-2">
                                        <InfoChip icon={Factory} label="Factory" value={p.factory} />
                                        <InfoChip icon={Anchor}  label="Port"    value={p.port} />
                                      </div>

                                      {/* ── COSTING FIELDS — editable OR read-only ── */}
                                      <div className={cn(
                                        "grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-zinc-100",
                                      )}>
                                        {/* Selling Cost */}
                                        <div className="space-y-1.5 flex flex-col justify-end">
                                          <div className="flex items-center justify-between h-[18px]">
                                            <label className={cn(
                                              "flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest",
                                              isLocked ? "text-zinc-400" : "text-blue-600"
                                            )}>
                                              <BadgeDollarSign size={9} />
                                              Selling Cost (PHP)
                                              {optionFilled && <CheckCircle2 size={9} className="text-emerald-500" />}
                                              {isLocked && <Lock size={8} className="text-zinc-300" />}
                                            </label>
                                            {!isLocked && (
                                              <button
                                                type="button"
                                                onClick={() => toggleCalc(calcKey)}
                                                className="text-[8px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-blue-100/50 hover:bg-blue-100 transition-colors px-2 py-0.5 rounded-md"
                                              >
                                                <Calculator size={9} />
                                                {showCalc[calcKey] ? "Hide Formula" : "Formula"}
                                              </button>
                                            )}
                                          </div>
                                          {isLocked ? (
                                            <div className="h-12 rounded-2xl border border-zinc-100 bg-zinc-50 px-4 flex items-center mt-1.5">
                                              <p className="text-sm font-black text-zinc-700">
                                                {p.sellingCost !== "-" ? formatPHP(p.sellingCost) : "—"}
                                              </p>
                                            </div>
                                          ) : (
                                            <Input
                                              type="number" min={0} step="any"
                                              placeholder="e.g. 12500"
                                              value={p.sellingCost === "-" ? "" : p.sellingCost}
                                              onChange={e => updateCell(rIdx, pIdx, "sellingCost", e.target.value || "-")}
                                              className="h-12 rounded-2xl border-zinc-200 bg-blue-50/40 focus-visible:ring-blue-500 font-bold text-sm mt-1.5"
                                            />
                                          )}
                                        </div>

                                        {/* Lead Time */}
                                        <div className="space-y-1.5 flex flex-col justify-end">
                                          <div className="flex items-center h-[18px]">
                                            <label className={cn(
                                              "flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest",
                                              isLocked ? "text-zinc-400" : "text-violet-600"
                                            )}>
                                              <Clock size={9} />
                                              Lead Time
                                              {optionFilled && <CheckCircle2 size={9} className="text-emerald-500" />}
                                              {isLocked && <Lock size={8} className="text-zinc-300" />}
                                            </label>
                                          </div>
                                          {isLocked ? (
                                            <div className="h-12 rounded-2xl border border-zinc-100 bg-zinc-50 px-4 flex items-center mt-1.5">
                                              <p className="text-sm font-black text-zinc-700">
                                                {p.leadTime !== "-" ? p.leadTime : "—"}
                                              </p>
                                            </div>
                                          ) : (
                                            <Input
                                              type="text"
                                              placeholder="e.g. 30 days"
                                              value={p.leadTime === "-" ? "" : p.leadTime}
                                              onChange={e => updateCell(rIdx, pIdx, "leadTime", e.target.value || "-")}
                                              className="h-12 rounded-2xl border-zinc-200 bg-violet-50/40 focus-visible:ring-violet-500 font-bold text-sm mt-1.5"
                                            />
                                          )}
                                        </div>
                                      </div>

                                      {/* ── CALCULATOR PANEL ── */}
                                      {!isLocked && showCalc[calcKey] && (
                                        <div className="mt-4 p-5 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/50 to-white shadow-inner animate-in fade-in slide-in-from-top-2 duration-300">
                                          <div className="flex items-center gap-2 mb-4">
                                            <div className="p-1.5 bg-blue-100 rounded-lg text-blue-600">
                                                <Calculator size={12} />
                                            </div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-blue-800">Landed Cost & SRP Calculator</p>
                                          </div>

                                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                                            <div className="col-span-2 sm:col-span-4 bg-white p-3 rounded-xl border border-zinc-100 grid grid-cols-4 gap-3">
                                              <p className="col-span-4 text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-1">Packaging (From PD)</p>
                                              <CalcInput label="L (cm)" value={currentCalc.l} onChange={(e) => updateCalc(calcKey, 'l', e.target.value)} />
                                              <CalcInput label="W (cm)" value={currentCalc.w} onChange={(e) => updateCalc(calcKey, 'w', e.target.value)} />
                                              <CalcInput label="H (cm)" value={currentCalc.h} onChange={(e) => updateCalc(calcKey, 'h', e.target.value)} />
                                              <CalcInput label="Qty/Box" value={currentCalc.qtyPerBox} onChange={(e) => updateCalc(calcKey, 'qtyPerBox', e.target.value)} />
                                            </div>

                                            <div className="col-span-2 sm:col-span-4 bg-white p-3 rounded-xl border border-zinc-100 grid grid-cols-2 sm:grid-cols-5 gap-3">
                                              <p className="col-span-2 sm:col-span-5 text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-1">Logistics & Rates</p>
                                              <CalcInput label="Shipment Cost" value={currentCalc.shipmentCost} onChange={(e) => updateCalc(calcKey, 'shipmentCost', e.target.value)} />
                                              <CalcInput label="CBM/Cont." value={currentCalc.cbmContainer} onChange={(e) => updateCalc(calcKey, 'cbmContainer', e.target.value)} />
                                              <CalcInput label="Invoice %" value={currentCalc.invoicePct} onChange={(e) => updateCalc(calcKey, 'invoicePct', e.target.value)} />
                                              <CalcInput label="Exch. Rate" value={currentCalc.exchangeRate} onChange={(e) => updateCalc(calcKey, 'exchangeRate', e.target.value)} />
                                              <CalcInput label="Target GP" value={currentCalc.gp} onChange={(e) => updateCalc(calcKey, 'gp', e.target.value)} />
                                            </div>
                                          </div>

                                          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white rounded-xl border border-emerald-100">
                                            <div className="flex gap-6">
                                              <div>
                                                <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-1">Calculated Landed</p>
                                                <p className="text-sm font-black text-zinc-700">{formatPHP(calcResult.landed)}</p>
                                              </div>
                                              <div>
                                                <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mb-1">Target SRP</p>
                                                <p className="text-lg font-black text-emerald-600">{formatPHP(calcResult.srp)}</p>
                                              </div>
                                            </div>
                                            <Button
                                              type="button"
                                              onClick={() => {
                                                  if (calcResult.srp > 0) {
                                                    updateCell(rIdx, pIdx, "sellingCost", calcResult.srp.toFixed(2).toString());
                                                    toggleCalc(calcKey); // auto hide after apply
                                                    toast.success("SRP applied to Selling Cost");
                                                  } else {
                                                    toast.error("Invalid calculation. Please check your inputs.");
                                                  }
                                              }}
                                              className="h-10 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest w-full sm:w-auto"
                                            >
                                              Apply to Selling Cost
                                            </Button>
                                          </div>
                                        </div>
                                      )}

                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* LOGISTICS */}
                {requestData && (
                  <div className="bg-white rounded-[24px] border border-zinc-200/60 shadow-sm p-5 md:p-6">
                    <SectionHeader icon={MapPin} title="Logistics & Delivery" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-5">
                      <InfoBlock label="Delivery Site"  value={requestData.delivery_address} icon={MapPin}     fullWidth />
                      <InfoBlock label="Contact Person" value={requestData.contact_person}   icon={User} />
                      <InfoBlock label="Mobile Number"  value={requestData.contact_number}   icon={Phone} />
                      <InfoBlock label="Payment Terms"  value={requestData.payment_terms}    icon={CreditCard} />
                      <InfoBlock label="Warranty"       value={requestData.warranty}         icon={ShieldCheck} />
                    </div>
                  </div>
                )}
              </div>

              {/* ── RIGHT: DESKTOP SIDEBAR ── */}
              <div className="hidden lg:flex flex-col gap-4">
                <div className="sticky top-4 space-y-4">

                  {/* Actions / Summary card */}
                  <div className={cn(
                    "p-6 rounded-[24px] shadow-xl text-white relative overflow-hidden",
                    isApproved ? "bg-emerald-700" : isRejected ? "bg-rose-700" : "bg-zinc-900"
                  )}>
                    <div className="absolute -right-8 -top-8 size-32 bg-white/5 rounded-full blur-3xl pointer-events-none" />
                    <SectionHeader icon={isLocked ? Lock : Save} title={isLocked ? "Summary" : "Actions"} light />

                    {/* Totals */}
                    <div className="mt-4 space-y-2 p-3 bg-white/5 rounded-2xl border border-white/10">
                      <div className="flex justify-between items-center">
                        <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">PD Total</p>
                        <p className="text-[11px] font-black text-zinc-300">{formatPHP(grandTotalPD)}</p>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Selling Total</p>
                        <p className={cn("text-[13px] font-black", grandTotalSelling > 0 ? "text-emerald-300" : "text-zinc-500")}>
                          {grandTotalSelling > 0 ? formatPHP(grandTotalSelling) : "—"}
                        </p>
                      </div>
                    </div>

                    {/* Action buttons — only shown when not locked */}
                    {!isLocked && (
                      <div className="mt-4 space-y-2.5">
                        <Button
                          onClick={() => setShowConfirm(true)}
                          disabled={isSaving}
                          className="w-full bg-white text-zinc-900 hover:bg-zinc-100 rounded-2xl h-12 font-black text-[10px] uppercase tracking-widest"
                        >
                          {isSaving ? <Loader2 className="size-4 animate-spin" /> : <><Save className="size-3.5 mr-2" /> Save Costing</>}
                        </Button>
                        {/* PDF — disabled for now */}
                        <Button
                          disabled
                          variant="outline"
                          className="w-full border-white/20 text-white/40 bg-transparent rounded-2xl h-12 font-black text-[10px] uppercase tracking-widest cursor-not-allowed"
                        >
                          <FileDown className="size-3.5 mr-2" /> Export PDF (Coming Soon)
                        </Button>
                      </div>
                    )}

                    {/* Locked state — PDF placeholder */}
                    {isLocked && (
                      <div className="mt-4 space-y-2.5">
                        <Button
                          disabled
                          variant="outline"
                          className="w-full border-white/20 text-white/40 bg-transparent rounded-2xl h-12 font-black text-[10px] uppercase tracking-widest cursor-not-allowed"
                        >
                          <FileDown className="size-3.5 mr-2" /> Export PDF (Coming Soon)
                        </Button>
                      </div>
                    )}

                    <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[9px] text-zinc-500 uppercase tracking-widest">Status</p>
                        <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-xl border", statusMeta.bg, statusMeta.border)}>
                          <div className={cn("size-1.5 rounded-full", statusMeta.dot)} />
                          <span className={cn("text-[8px] font-black uppercase", statusMeta.color)}>
                            {spfData?.status ?? "---"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-[9px] text-zinc-500 uppercase tracking-widest">Created</p>
                        <p className="text-[10px] font-bold text-zinc-300">
                          {spfData?.date_created ? new Date(spfData.date_created).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "---"}
                        </p>
                      </div>
                      {spfData?.date_updated && (
                        <div className="flex items-center justify-between">
                          <p className="text-[9px] text-zinc-500 uppercase tracking-widest">Last Saved</p>
                          <p className="text-[10px] font-bold text-zinc-300">
                            {new Date(spfData.date_updated).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        </div>
                      )}
                    </div>

                    {!isLocked && !allFilled && totalCount > 0 && (
                      <div className="mt-3 flex items-start gap-2">
                        <AlertTriangle size={10} className="text-amber-400 flex-shrink-0 mt-0.5" />
                        <p className="text-[9px] text-zinc-500 leading-relaxed">
                          {totalCount - filledCount} option{totalCount - filledCount !== 1 ? "s" : ""} still need costing.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Special instructions */}
                  {requestData?.special_instructions && (
                    <div className="bg-amber-50/60 p-5 rounded-[24px] border border-amber-100">
                      <SectionHeader icon={AlertCircle} title="Special Instructions" />
                      <p className="mt-3 text-zinc-600 text-[11px] leading-relaxed italic">
                        "{requestData.special_instructions}"
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── MOBILE SUMMARY ── */}
            <div className="lg:hidden bg-white rounded-[24px] border border-zinc-200/60 shadow-sm p-5 space-y-3">
              <SectionHeader icon={BadgeDollarSign} title="Summary" />
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="bg-zinc-50 rounded-2xl p-3">
                  <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-1">PD Total</p>
                  <p className="text-[13px] font-black text-zinc-700">{formatPHP(grandTotalPD)}</p>
                </div>
                <div className={cn("rounded-2xl p-3 border", isApproved ? "bg-emerald-50 border-emerald-100" : "bg-zinc-50 border-zinc-100")}>
                  <p className={cn("text-[8px] font-black uppercase tracking-widest mb-1", isApproved ? "text-emerald-600" : "text-zinc-400")}>
                    Selling Total
                  </p>
                  <p className={cn("text-[13px] font-black", isApproved ? "text-emerald-700" : "text-zinc-700")}>
                    {grandTotalSelling > 0 ? formatPHP(grandTotalSelling) : "—"}
                  </p>
                </div>
              </div>
              {requestData?.special_instructions && (
                <div className="bg-amber-50/60 rounded-2xl p-3 border border-amber-100">
                  <p className="text-[8px] font-black text-amber-600 uppercase tracking-widest mb-1 flex items-center gap-1">
                    <AlertCircle size={8} /> Special Instructions
                  </p>
                  <p className="text-[11px] text-zinc-600 italic leading-relaxed">"{requestData.special_instructions}"</p>
                </div>
              )}
            </div>

          </main>
        </SidebarInset>
      </SidebarProvider>

      {/* ── MOBILE STICKY BAR — only when not locked ── */}
      {!isLocked && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-t border-zinc-200 px-4 py-3 flex gap-3 shadow-2xl shadow-zinc-900/10">
          {/* PDF disabled */}
          <Button
            disabled
            variant="outline"
            className="flex-1 h-12 rounded-2xl border-zinc-200 font-black text-[10px] uppercase tracking-widest text-zinc-300 cursor-not-allowed"
          >
            <FileDown className="size-3.5 mr-1.5" /> PDF
          </Button>
          <Button
            onClick={() => setShowConfirm(true)}
            disabled={isSaving}
            className={cn(
              "flex-[2] h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest",
              allFilled ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-zinc-900 hover:bg-zinc-800 text-white"
            )}
          >
            {isSaving
              ? <Loader2 className="size-4 animate-spin" />
              : <><Save className="size-3.5 mr-1.5" /> {allFilled ? "Save & Finalize" : "Save Costing"}</>}
          </Button>
        </div>
      )}

      {/* ── CONFIRM DIALOG ── */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="rounded-[24px] max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle className="text-[13px] font-black uppercase tracking-widest">Save Costing</DialogTitle>
            <DialogDescription className="text-sm text-zinc-500 mt-2 leading-relaxed">
              Save selling costs and lead times for this SPF.
              Choosing <span className="font-black text-emerald-600">Save + Approved By Procurement</span> will mark this SPF as approved by procurement.
              {!allFilled && (
                <span className="block mt-2 text-amber-600 font-bold text-[11px]">
                  ⚠ {totalCount - filledCount} option{totalCount - filledCount !== 1 ? "s" : ""} still need costing filled in.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-2">
            <Button
              variant="outline"
              onClick={() => handleSave(false)}
              disabled={isSaving}
              className="flex-1 rounded-2xl font-black text-[10px] uppercase tracking-widest h-12"
            >
              Save Only
            </Button>
            <Button
              onClick={() => handleSave(true)}
              disabled={isSaving}
              className="flex-1 bg-zinc-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest h-12"
            >
              {isSaving ? <Loader2 className="size-4 animate-spin" /> : "Save + Approved By Procurement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </ProtectedPageWrapper>
  );
}

/* ── SUB-COMPONENTS ── */
function SectionHeader({ icon: Icon, title, light }: { icon: any; title: string; light?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className={cn("p-2 rounded-xl", light ? "bg-white/10 text-white" : "bg-zinc-100 text-zinc-400")}>
        <Icon size={15} />
      </div>
      <h2 className={cn("text-[10px] font-black uppercase tracking-[0.2em]", light ? "text-white" : "text-zinc-400")}>
        {title}
      </h2>
    </div>
  );
}

function CommItem({ icon: Icon, label, value, hi }: { icon: any; label: string; value: string; hi?: boolean }) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1">
        <Icon size={9} className="text-zinc-300" />
        <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">{label}</p>
      </div>
      <p className={cn("text-[11px] font-black leading-tight", hi ? "text-zinc-900" : "text-zinc-600")}>{value}</p>
    </div>
  );
}

function InfoChip({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 bg-zinc-50 p-2.5 rounded-xl">
      <Icon size={11} className="text-zinc-300 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-[7px] font-bold text-zinc-400 uppercase">{label}</p>
        <p className="text-[10px] font-bold text-zinc-600 truncate">{value}</p>
      </div>
    </div>
  );
}

function InfoBlock({ label, value, fullWidth, icon: Icon }: { label: string; value?: string; fullWidth?: boolean; icon?: any }) {
  return (
    <div className={cn(fullWidth ? "sm:col-span-2" : "")}>
      <p className="text-[9px] font-black uppercase tracking-widest text-zinc-300 mb-1.5">{label}</p>
      <div className="flex items-start gap-2">
        {Icon && <Icon size={13} className="mt-0.5 text-zinc-300 flex-shrink-0" />}
        <p className="text-[13px] font-bold text-zinc-900 leading-snug">{value || "---"}</p>
      </div>
    </div>
  );
}

function CalcInput({ label, value, onChange, placeholder = "" }: { label: string; value: any; onChange: (e: any) => void; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">{label}</label>
      <Input type="number" step="any" value={value} onChange={onChange} placeholder={placeholder} className="h-9 text-[11px] font-bold rounded-lg border-zinc-200 bg-zinc-50/50" />
    </div>
  );
}