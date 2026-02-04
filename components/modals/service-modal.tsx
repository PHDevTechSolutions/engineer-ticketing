"use client"

import * as React from "react"
import { Plus, Users, X, MapPin, FileText, Trash2, CheckCircle2, Loader2, Check, ChevronsUpDown, Search, UserCircle2 } from "lucide-react"
import { db } from "@/lib/firebase"
import { collection, addDoc, doc, updateDoc } from "firebase/firestore"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export function ServiceModalContent({ setIsOpen, initialData, onDelete }: any) {
  const [label, setLabel] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [selectedPics, setSelectedPics] = React.useState<string[]>([])
  const [personnel, setPersonnel] = React.useState<any[]>([])
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [openDropdown, setOpenDropdown] = React.useState(false)

  React.useEffect(() => {
    const fetchPersonnel = async () => {
      try {
        const res = await fetch('/api/user')
        if (!res.ok) throw new Error(`HTTP_${res.status}`)
        const data = await res.json()
        
        if (Array.isArray(data)) {
          const formattedStaff = data
            .filter((u: any) => u.Department?.toString().trim().toUpperCase() === "ENGINEERING")
            .map((u: any) => ({
              id: u._id || u.ReferenceID,
              ref: u.ReferenceID || "N/A",
              name: u.Firstname && u.Lastname 
                ? `${u.Firstname} ${u.Lastname}` 
                : u.Username || "Unnamed Engineer"
            }))
          setPersonnel(formattedStaff)
        }
      } catch (err) {
        console.error("DB_FETCH_ERROR:", err)
      }
    }
    fetchPersonnel()
  }, [])

  React.useEffect(() => {
    if (initialData) {
      setLabel(initialData.label || "")
      setDescription(initialData.description || "")
      setSelectedPics(initialData.pic || [])
    }
  }, [initialData])

  const handleCommit = async () => {
    if (!label || selectedPics.length === 0) return
    setIsSubmitting(true)
    try {
      const payload = { label, description, pic: selectedPics, updatedAt: new Date() }
      if (initialData?.id) {
        await updateDoc(doc(db, "protocols", initialData.id), payload)
      } else {
        await addDoc(collection(db, "protocols"), {
          ...payload,
          uid: `SV-${Math.floor(1000 + Math.random() * 9000)}`,
          createdAt: new Date()
        })
      }
      setIsOpen(false)
    } finally { setIsSubmitting(false) }
  }

  return (
    <DialogContent className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-[95vw] sm:max-w-[550px] p-0 overflow-hidden border-none shadow-2xl rounded-3xl bg-white flex flex-col h-auto max-h-[85vh]">
      {/* Header Section */}
      <div className="bg-slate-50/80 px-6 py-5 md:px-8 md:py-6 border-b border-slate-100 flex-shrink-0">
        <DialogHeader className="text-left">
          <div className="flex items-center gap-2 mb-1">
            {initialData?.uid && (
              <Badge variant="outline" className="bg-white text-slate-900 border-slate-200 px-2 py-0 text-[10px] font-black tracking-tight uppercase">
                {initialData.uid}
              </Badge>
            )}
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Operations Control</span>
          </div>
          <DialogTitle className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 leading-tight">
            {initialData ? "Update Service Protocol" : "Register Site Visit"}
          </DialogTitle>
          <DialogDescription className="text-[11px] text-slate-400 font-medium">
             Authorized Personnel: <span className="text-primary font-bold">ENGINEERING ONLY</span>
          </DialogDescription>
        </DialogHeader>
      </div>

      <div className="overflow-y-auto px-6 py-4 md:px-8 md:py-6 space-y-5 flex-grow scrollbar-hide">
        {/* Input Fields */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-2 ml-1">
              <MapPin className="size-3 text-primary" /> Service Designation
            </Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="rounded-2xl border-slate-200 bg-slate-50/30 focus:bg-white h-12 text-sm font-semibold uppercase px-4 ring-offset-0 focus-visible:ring-1 focus-visible:ring-primary transition-all"
              placeholder="CATEGORY NAME..."
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-2 ml-1">
              <FileText className="size-3 text-primary" /> Mission Objectives
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-2xl border-slate-200 bg-slate-50/30 focus:bg-white min-h-[100px] text-sm leading-relaxed p-4 ring-offset-0 focus-visible:ring-1 focus-visible:ring-primary transition-all resize-none"
              placeholder="Outline scope of work..."
            />
          </div>
        </div>

        <Separator className="bg-slate-100" />

        {/* Improved Selection Section */}
        <div className="space-y-3 pb-4">
          <div className="flex items-center justify-between ml-1">
            <Label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-2">
              <Users className="size-3 text-primary" /> Authorized Engineers
            </Label>
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
              {selectedPics.length} PIC
            </span>
          </div>

          {/* Selected Badges: Modern "Tag" Style */}
          <div className="flex flex-wrap gap-2 min-h-[32px]">
            {selectedPics.map(name => (
              <div key={name} className="group flex items-center gap-2 bg-slate-100 hover:bg-slate-900 text-slate-900 hover:text-white pl-3 pr-1 py-1.5 rounded-xl text-[10px] font-bold border border-slate-200 hover:border-slate-900 transition-all cursor-default">
                {name}
                <button 
                  onClick={() => setSelectedPics(prev => prev.filter(n => n !== name))} 
                  className="size-5 flex items-center justify-center rounded-lg hover:bg-white/20 text-slate-400 group-hover:text-white/60 transition-colors"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>

          {/* COMBROBOX: Command Palette Style */}
          <Popover open={openDropdown} onOpenChange={setOpenDropdown}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={openDropdown}
                className="w-full rounded-2xl border-dashed border-2 border-slate-200 bg-slate-50/20 h-12 text-slate-400 font-bold text-[11px] uppercase tracking-wide justify-between hover:border-primary/40 hover:bg-white transition-all shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <div className="size-6 rounded-full bg-white border border-slate-200 flex items-center justify-center">
                    <Plus className="size-3 text-slate-400" />
                  </div>
                  Add Team Member
                </div>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-30" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0 rounded-2xl overflow-hidden shadow-2xl border-slate-200" align="start">
              <Command className="bg-white">
                <div className="flex items-center border-b px-3 bg-slate-50/50">
                  <Search className="mr-2 h-4 w-4 shrink-0 opacity-30" />
                  <CommandInput placeholder="Search by name..." className="h-11 border-none focus:ring-0 text-[11px] font-bold uppercase placeholder:text-slate-300" />
                </div>
                <CommandList className="max-h-[220px] scrollbar-hide">
                  <CommandEmpty className="p-6 text-center text-[10px] font-bold text-slate-400 tracking-tighter uppercase">
                    No matching personnel in Engineering.
                  </CommandEmpty>
                  <CommandGroup className="p-2">
                    {personnel.map((p) => (
                      <CommandItem
                        key={p.id}
                        value={p.name}
                        onSelect={(currentValue) => {
                          if (!selectedPics.includes(currentValue)) {
                            setSelectedPics([...selectedPics, currentValue])
                          }
                          setOpenDropdown(false)
                        }}
                        className="rounded-xl mb-1 text-[11px] uppercase font-bold py-3 px-3 flex items-center justify-between cursor-pointer aria-selected:bg-slate-900 aria-selected:text-white transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <UserCircle2 className="size-4 opacity-40" />
                          <div className="flex flex-col">
                            <span>{p.name}</span>
                            <span className="text-[9px] opacity-50 font-medium tracking-tight">REF: {p.ref}</span>
                          </div>
                        </div>
                        <Check className={cn("ml-auto h-4 w-4", selectedPics.includes(p.name) ? "opacity-100" : "opacity-0")} />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-5 md:p-6 bg-slate-50/80 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-3 flex-shrink-0">
        <div className="hidden sm:block flex-1">
          {initialData && (
            <Button variant="ghost" size="sm" onClick={() => onDelete(initialData.id)} className="text-slate-400 hover:text-red-600 hover:bg-red-50 text-[10px] font-black uppercase tracking-tighter transition-colors">
              <Trash2 className="size-4 mr-1.5" /> Terminate Protocol
            </Button>
          )}
        </div>
        <div className="flex w-full sm:w-auto gap-2">
          <Button variant="ghost" onClick={() => setIsOpen(false)} className="flex-1 sm:flex-none rounded-2xl text-slate-500 font-black text-[10px] uppercase tracking-widest px-6 h-11 hover:bg-slate-100 transition-all">Cancel</Button>
          <Button onClick={handleCommit} disabled={isSubmitting} className="flex-1 sm:flex-none rounded-2xl bg-slate-900 text-white hover:bg-black font-black text-[10px] uppercase tracking-widest px-8 h-11 shadow-lg shadow-slate-200 active:scale-[0.98] transition-all">
            {isSubmitting ? <Loader2 className="size-4 animate-spin mr-2" /> : <CheckCircle2 className="size-4 mr-2" />}
            {initialData ? "Apply Updates" : "Finalize"}
          </Button>
        </div>
      </div>
    </DialogContent>
  )
}