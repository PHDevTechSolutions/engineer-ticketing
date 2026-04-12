"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, RefreshCw, Settings, AlertTriangle, CheckCircle, Keyboard, ChevronDown, ChevronUp, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CounterStatus {
  production: {
    currentNumber: number;
    lastUsed: string | null;
    startingNumber: number;
    year: number;
  };
  test: {
    currentNumber: number;
    lastUsed: string | null;
    year: number;
  };
}

export function JobCounterAdmin() {
  const [status, setStatus] = useState<CounterStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [adjustNumber, setAdjustNumber] = useState("");
  const [isTestMode, setIsTestMode] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const userRole = typeof window !== "undefined" ? localStorage.getItem("userRole") : null;
  const userDept = typeof window !== "undefined" ? localStorage.getItem("department") : null;

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/job-counter?action=status", {
        headers: {
          "x-user-role": userRole || "",
          "x-user-department": userDept || "",
        },
      });
      const data = await res.json();
      if (data.success) {
        setStatus(data.data);
      } else {
        toast.error(data.error || "Failed to fetch status");
      }
    } catch (error) {
      toast.error("Error fetching counter status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // Keyboard shortcut: Ctrl+Shift+M (or Cmd+Shift+M on Mac) to toggle test mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl+Shift+M or Cmd+Shift+M (M for "mode")
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "m") {
        e.preventDefault();
        toggleTestMode();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isTestMode]);

  const handleAdjust = async () => {
    const num = parseInt(adjustNumber);
    if (isNaN(num) || num < 1) {
      toast.error("Please enter a valid number (minimum 1)");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/job-counter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": userRole || "",
          "x-user-department": userDept || "",
        },
        body: JSON.stringify({
          action: "adjust",
          newNumber: num,
          isTest: isTestMode,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setAdjustNumber("");
        fetchStatus();
      } else {
        toast.error(data.error || "Failed to adjust counter");
      }
    } catch (error) {
      toast.error("Error adjusting counter");
    } finally {
      setLoading(false);
    }
  };

  const handleInitialize = async () => {
    const num = parseInt(adjustNumber);
    if (isNaN(num) || num < 1) {
      toast.error("Please enter a valid starting number");
      return;
    }

    if (!confirm(`Initialize counter with starting number ${num}?\nNext job request will be JR${new Date().getFullYear().toString().slice(-2)}-${String(num + 1).padStart(4, "0")}`)) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/job-counter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": userRole || "",
          "x-user-department": userDept || "",
        },
        body: JSON.stringify({
          action: "initialize",
          newNumber: num,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        fetchStatus();
      } else {
        toast.error(data.error || "Failed to initialize counter");
      }
    } catch (error) {
      toast.error("Error initializing counter");
    } finally {
      setLoading(false);
    }
  };

  const toggleTestMode = () => {
    const newMode = !isTestMode;
    setIsTestMode(newMode);
    localStorage.setItem("testMode", newMode.toString());
    toast.info(
      newMode 
        ? "🔧 Test mode enabled - numbers will have TEST- prefix\n(Ctrl+Shift+M to toggle)" 
        : "✅ Test mode disabled - using production numbers\n(Ctrl+Shift+M to toggle)",
      { duration: 3000 }
    );
  };

  return (
    <div className="w-full">
      {/* Compact Header Bar */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-full flex items-center justify-between px-4 py-2.5 rounded-xl border transition-all duration-200",
          isTestMode 
            ? "bg-amber-50/50 border-amber-200/60 hover:bg-amber-50" 
            : "bg-white/50 border-slate-200/60 hover:bg-white hover:shadow-sm"
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-1.5 rounded-lg transition-colors",
            isTestMode ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-500"
          )}>
            <Settings size={14} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              Job Counter
            </span>
            {isTestMode && (
              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-bold uppercase tracking-wider rounded">
                Test
              </span>
            )}
            <span className="text-[10px] font-normal text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
              Ctrl+Shift+M
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {status && (
            <span className="text-[10px] font-medium text-slate-400">
              Next: JR-{new Date().getFullYear()}-{String((status.production.currentNumber || 42) + 1).padStart(4, "0")}
            </span>
          )}
          <ChevronDown 
            size={14} 
            className={cn(
              "text-slate-400 transition-transform duration-200",
              isExpanded && "rotate-180"
            )} 
          />
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-2 p-4 bg-white rounded-xl border border-slate-200/60 shadow-sm space-y-4">
          {/* Counter Status */}
          <div className="space-y-3">
            {status ? (
              <div className="grid grid-cols-2 gap-2">
                {/* Production */}
                <div className="p-2.5 bg-emerald-50/50 border border-emerald-100/60 rounded-lg">
                  <div className="flex items-center gap-1.5 text-emerald-600 text-[9px] font-bold uppercase mb-1">
                    <CheckCircle size={10} />
                    Production
                  </div>
                  <div className="text-sm font-black text-emerald-800">
                    {status.production.lastUsed || `JR-${new Date().getFullYear()}-0042`}
                  </div>
                </div>

                {/* Test */}
                <div className="p-2.5 bg-amber-50/50 border border-amber-100/60 rounded-lg">
                  <div className="flex items-center gap-1.5 text-amber-600 text-[9px] font-bold uppercase mb-1">
                    <FlaskConical size={10} />
                    Test
                  </div>
                  <div className="text-sm font-black text-amber-800">
                    {status.test.lastUsed || `TEST-JR-${new Date().getFullYear()}-0001`}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-3 text-xs text-slate-400">
                <Loader2 size={12} className="animate-spin mr-2" />
                Loading...
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={fetchStatus}
              disabled={loading}
              className="w-full h-7 text-[10px] text-slate-500 hover:text-slate-700"
            >
              <RefreshCw size={12} className={cn("mr-1.5", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>

          {/* Test Mode Toggle */}
          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FlaskConical size={14} className={isTestMode ? "text-amber-500" : "text-slate-400"} />
                <div>
                  <div className="text-[11px] font-bold text-slate-700">
                    Test Mode
                  </div>
                  <div className="text-[9px] text-slate-400">
                    Prefix: TEST-
                  </div>
                </div>
              </div>
              <Button
                variant={isTestMode ? "default" : "outline"}
                size="sm"
                onClick={toggleTestMode}
                className={cn(
                  "h-6 px-3 text-[10px] font-bold",
                  isTestMode ? "bg-amber-500 hover:bg-amber-600" : "border-slate-200 text-slate-500"
                )}
              >
                {isTestMode ? "ON" : "OFF"}
              </Button>
            </div>
            <p className="text-[9px] text-slate-400 mt-2 flex items-center gap-1">
              <Keyboard size={10} />
              Shortcut: <kbd className="px-1 bg-slate-100 rounded text-slate-600 font-mono">Ctrl</kbd>+<kbd className="px-1 bg-slate-100 rounded text-slate-600 font-mono">Shift</kbd>+<kbd className="px-1 bg-slate-100 rounded text-slate-600 font-mono">M</kbd>
            </p>
          </div>

          {/* Manual Adjustment - Collapsible */}
          <div className="pt-3 border-t border-slate-100">
            <h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-2">
              Manual Adjustment
            </h3>
            
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Number"
                value={adjustNumber}
                onChange={(e) => setAdjustNumber(e.target.value)}
                min="1"
                className="h-7 text-xs"
              />
              <Button
                onClick={handleAdjust}
                disabled={loading || !adjustNumber}
                variant="secondary"
                size="sm"
                className="h-7 px-2 text-[10px]"
              >
                Adjust
              </Button>
            </div>

            <p className="text-[9px] text-slate-400 mt-2 leading-relaxed">
              Format: JR-YYYY-#### • Year resets counter to 0001
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
