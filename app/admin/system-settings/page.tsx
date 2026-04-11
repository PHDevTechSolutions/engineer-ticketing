"use client"

import * as React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import ProtectedPageWrapper from "@/components/protected-page-wrapper"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Shield, Plus, X, Save, RefreshCw, Globe, Lock, AlertTriangle } from "lucide-react"

import { db } from "@/lib/firebase"
import { doc, getDoc, setDoc } from "firebase/firestore"

export default function SystemSettingsPage() {
  const [userId, setUserId] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [allowedOrigins, setAllowedOrigins] = React.useState<string[]>([])
  const [newOrigin, setNewOrigin] = React.useState("")

  React.useEffect(() => {
    setUserId(localStorage.getItem("userId"))
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const docRef = doc(db, "system_config", "security")
      const docSnap = await getDoc(docRef)
      if (docSnap.exists()) {
        setAllowedOrigins(docSnap.data().allowedIframeOrigins || [])
      }
    } catch (error) {
      console.error("Error fetching settings:", error)
      toast.error("Failed to load security settings")
    } finally {
      setLoading(false)
    }
  }

  const handleAddOrigin = () => {
    if (!newOrigin) return
    if (!newOrigin.startsWith("http://") && !newOrigin.startsWith("https://")) {
      toast.error("Origin must start with http:// or https://")
      return
    }
    if (allowedOrigins.includes(newOrigin)) {
      toast.error("Origin already exists")
      return
    }
    setAllowedOrigins([...allowedOrigins, newOrigin])
    setNewOrigin("")
  }

  const handleRemoveOrigin = (origin: string) => {
    setAllowedOrigins(allowedOrigins.filter(o => o !== origin))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const docRef = doc(db, "system_config", "security")
      await setDoc(docRef, {
        allowedIframeOrigins: allowedOrigins,
        updatedAt: new Date().toISOString(),
        updatedBy: userId
      }, { merge: true })
      toast.success("Security settings updated successfully")
    } catch (error) {
      console.error("Error saving settings:", error)
      toast.error("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  return (
    <ProtectedPageWrapper>
      <SidebarProvider defaultOpen={false}>
        <AppSidebar userId={userId} />
        <SidebarInset className="bg-[#F8FAFA] min-h-screen">
          <PageHeader
            title="SYSTEM SETTINGS"
            version="V1.0"
            showBackButton
            trigger={<SidebarTrigger className="mr-2" />}
          />

          <main className="p-4 md:p-8 max-w-4xl mx-auto w-full space-y-6 pb-24">
            {/* Header Banner */}
            <div className="bg-zinc-900 rounded-[24px] p-8 text-white relative overflow-hidden shadow-xl border border-white/5">
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
                    <Shield className="size-6 text-emerald-400" />
                  </div>
                  <h2 className="text-2xl font-black tracking-tight">Security Configuration</h2>
                </div>
                <p className="text-zinc-400 text-sm max-w-xl leading-relaxed font-medium">
                  Manage core system security policies, including frame-ancestors CSP headers. 
                  These settings control which external domains are authorized to embed the platform dashboard.
                </p>
              </div>
              <div className="absolute right-[-20px] bottom-[-20px] opacity-10 rotate-12">
                <Lock size={200} />
              </div>
            </div>

            <div className="grid gap-6">
              <Card className="rounded-[24px] border-zinc-200/60 shadow-sm overflow-hidden">
                <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg shadow-sm border border-zinc-100">
                        <Globe className="size-4 text-zinc-600" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-black uppercase tracking-widest">Allowed Iframe Origins</CardTitle>
                        <CardDescription className="text-[10px] font-bold uppercase tracking-tight text-zinc-400 mt-0.5">
                          frame-ancestors 'self' [origins]
                        </CardDescription>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={fetchSettings} disabled={loading} className="h-8 rounded-lg text-[10px] font-bold uppercase tracking-wider gap-2">
                      <RefreshCw className={loading ? "animate-spin" : ""} size={12} />
                      Refresh
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        placeholder="https://example.com"
                        value={newOrigin}
                        onChange={(e) => setNewOrigin(e.target.value)}
                        className="h-11 rounded-xl border-zinc-200 font-bold text-sm focus:ring-zinc-900 pr-10"
                        onKeyDown={(e) => e.key === "Enter" && handleAddOrigin()}
                      />
                    </div>
                    <Button onClick={handleAddOrigin} className="h-11 px-6 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-black text-[10px] uppercase tracking-widest gap-2 shadow-lg active:scale-95 transition-all">
                      <Plus size={14} />
                      Add Origin
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest px-1">Authorized Domains</p>
                    {allowedOrigins.length === 0 ? (
                      <div className="py-12 border-2 border-dashed border-zinc-100 rounded-2xl flex flex-col items-center justify-center text-zinc-300">
                        <Globe size={32} className="mb-2 opacity-20" />
                        <p className="text-[10px] font-bold uppercase tracking-widest">No origins configured</p>
                      </div>
                    ) : (
                      <div className="grid gap-2">
                        {allowedOrigins.map((origin) => (
                          <div key={origin} className="flex items-center justify-between p-3.5 bg-zinc-50 border border-zinc-100 rounded-xl group hover:bg-white hover:border-zinc-200 transition-all">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="size-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200" />
                              <span className="text-xs font-mono font-bold text-zinc-700 truncate">{origin}</span>
                            </div>
                            <button
                              onClick={() => handleRemoveOrigin(origin)}
                              className="p-1.5 text-zinc-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex gap-3">
                    <AlertTriangle className="size-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[11px] font-black text-amber-900 uppercase tracking-tight mb-1">Important Note</p>
                      <p className="text-[10px] font-medium text-amber-700 leading-relaxed">
                        Changes to iframe origins will be applied immediately via the system middleware. 
                        Ensure all domains include the protocol (http/https) and are correctly formatted to avoid locking out authorized embeds.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>

          {/* Action Bar */}
          <div className="fixed bottom-6 right-4 left-4 md:left-auto md:bottom-8 md:right-8 z-50">
            <Button
              onClick={handleSave}
              disabled={saving || loading}
              className="w-full md:w-auto h-14 px-10 rounded-full bg-zinc-900 text-white hover:bg-zinc-800 font-black uppercase text-[11px] tracking-[0.2em] flex items-center justify-center gap-4 shadow-2xl active:scale-[0.95] transition-all group"
            >
              {saving ? <RefreshCw className="size-4 animate-spin" /> : <Save className="size-4 group-hover:scale-110 transition-transform" />}
              {saving ? "Updating Policy..." : "Commit Security Changes"}
            </Button>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedPageWrapper>
  )
}
