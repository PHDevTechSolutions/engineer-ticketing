"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Keyboard, X, Command, CornerDownLeft } from "lucide-react"

interface Shortcut {
  key: string
  description: string
  context?: string
}

const SHORTCUTS: Shortcut[] = [
  { key: "N", description: "Open quick create menu", context: "Global" },
  { key: "Esc", description: "Close menus / Cancel", context: "Global" },
  { key: "/", description: "Focus search", context: "Global" },
  { key: "S", description: "Go to Site Visits", context: "Navigation" },
  { key: "J", description: "Go to Job Requests", context: "Navigation" },
  { key: "T", description: "Go to Testing", context: "Navigation" },
  { key: "M", description: "Open Messages", context: "Navigation" },
  { key: "D", description: "Go to Dashboard", context: "Navigation" },
  { key: "?", description: "Show keyboard shortcuts", context: "Help" },
]

export function KeyboardShortcuts() {
  const [isOpen, setIsOpen] = React.useState(false)

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return
        e.preventDefault()
        setIsOpen(prev => !prev)
      }
      if (e.key === "Escape") {
        setIsOpen(false)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-zinc-100">
              <Keyboard className="w-4 h-4 text-zinc-600" />
            </div>
            <h3 className="text-sm font-black text-gray-900">Keyboard Shortcuts</h3>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {["Global", "Navigation", "Help"].map((context) => (
            <div key={context} className="mb-4 last:mb-0">
              <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-2">
                {context}
              </h4>
              <div className="space-y-2">
                {SHORTCUTS.filter(s => s.context === context).map((shortcut) => (
                  <div key={shortcut.key} className="flex items-center justify-between py-1">
                    <span className="text-[12px] font-medium text-gray-600">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.key === "Esc" ? (
                        <kbd className="px-2 py-1 rounded-lg bg-gray-100 border border-gray-200 text-[10px] font-bold text-gray-700">
                          ESC
                        </kbd>
                      ) : shortcut.key === "Enter" ? (
                        <CornerDownLeft className="w-3.5 h-3.5 text-gray-400" />
                      ) : shortcut.key.length > 1 ? (
                        <kbd className="px-2 py-1 rounded-lg bg-gray-100 border border-gray-200 text-[10px] font-bold text-gray-700">
                          {shortcut.key}
                        </kbd>
                      ) : (
                        <kbd className="w-7 h-7 flex items-center justify-center rounded-lg bg-zinc-900 text-white text-[11px] font-black">
                          {shortcut.key}
                        </kbd>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 bg-gray-50 border-t border-gray-100 text-center">
          <p className="text-[9px] font-bold text-gray-400">
            Press <kbd className="px-1 py-0.5 rounded bg-white border border-gray-200 text-gray-600">?</kbd> anytime to show this help
          </p>
        </div>
      </div>
    </div>
  )
}

// Mini hint that shows in the footer
export function KeyboardHint() {
  const [showHint, setShowHint] = React.useState(true)

  React.useEffect(() => {
    const timer = setTimeout(() => setShowHint(false), 5000)
    return () => clearTimeout(timer)
  }, [])

  if (!showHint) return null

  return (
    <div className="fixed bottom-20 right-6 z-40 bg-zinc-900 text-white px-3 py-2 rounded-lg shadow-lg text-[10px] font-bold animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-2">
        <span>Press</span>
        <kbd className="px-1.5 py-0.5 rounded bg-white/20 text-white">?</kbd>
        <span>for shortcuts</span>
        <button onClick={() => setShowHint(false)} className="ml-1 text-white/50 hover:text-white">
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}
