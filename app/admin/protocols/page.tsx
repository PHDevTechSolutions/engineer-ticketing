"use client"

import * as React from "react"
import { 
  Plus, 
  Settings2, 
  Search, 
  Terminal,
  Activity,
  UserCheck,
  X,
  ChevronDown,
  ShieldAlert,
  MoreVertical
} from "lucide-react"
import { cn } from "@/lib/utils"

// FIREBASE IMPORTS
import { db } from "@/lib/firebase";
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy,
  doc,
  updateDoc,
  deleteDoc 
} from "firebase/firestore";

// SHADCN COMPONENTS
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// CUSTOM COMPONENTS
import { PageHeader } from "@/components/page-header"

export default function ProtocolRegistryPage() {
  const [searchTerm, setSearchTerm] = React.useState("")
  const [isOpen, setIsOpen] = React.useState(false)
  const [protocols, setProtocols] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [selectedProtocol, setSelectedProtocol] = React.useState<any>(null)

  React.useEffect(() => {
    const q = query(collection(db, "protocols"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const protocolList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProtocols(protocolList);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const deleteProtocol = async (id: string) => {
    if (window.confirm("CRITICAL: Permanent deletion?")) {
      try { await deleteDoc(doc(db, "protocols", id)); } 
      catch (e) { console.error(e); }
    }
  };

  const openEditModal = (protocol: any) => {
    setSelectedProtocol(protocol);
    setIsOpen(true);
  };

  const toggleProtocolStatus = async (id: string, currentStatus: boolean) => {
    try { 
      await updateDoc(doc(db, "protocols", id), { 
        isActive: !currentStatus,
        updatedAt: new Date() 
      }); 
    } catch (e) { console.error(e); }
  };

  const filteredProtocols = protocols.filter(p => 
    p.label?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.uid?.includes(searchTerm) ||
    p.pic?.some((name: string) => name.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <div className="flex flex-col min-h-screen bg-background font-sans antialiased text-foreground pb-24 md:pb-8">
      <PageHeader title="Registry Control" version="DSI-LOG-v2.6">
        <Dialog open={isOpen} onOpenChange={(val) => { setIsOpen(val); if(!val) setSelectedProtocol(null); }}>
          <DialogTrigger asChild>
            {/* DESKTOP BUTTON */}
            <Button size="sm" className="hidden md:flex h-8 rounded-none bg-primary text-primary-foreground font-black uppercase italic text-[10px] tracking-widest px-4 border-b-2 border-primary-foreground/20 active:translate-y-[1px] active:border-b-0">
              <Plus className="size-3 mr-1" /> New_Entry
            </Button>
          </DialogTrigger>
          
          {/* MOBILE FLOATING ACTION BUTTON */}
          <DialogTrigger asChild>
            <Button className="md:hidden fixed bottom-6 right-6 size-14 rounded-none bg-primary shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-50 flex items-center justify-center border-2 border-primary-foreground/20">
              <Plus className="size-6 text-primary-foreground" />
            </Button>
          </DialogTrigger>

          <ProtocolModalContent setIsOpen={setIsOpen} initialData={selectedProtocol} onDelete={deleteProtocol} />
        </Dialog>
      </PageHeader>

      <main className="flex flex-1 flex-col gap-4 md:gap-6 p-4 md:p-6 max-w-6xl mx-auto w-full relative">
        {/* Statistics Bar */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-px bg-muted/30 border border-muted/30">
            {[{ label: "Manifest", val: protocols.length, icon: Terminal }, { label: "Active", val: protocols.filter(p => p.isActive).length, icon: Activity }].map((stat, i) => (
                <div key={i} className="bg-background p-4 flex flex-col gap-1 border-l-2 border-primary/10">
                    <div className="flex items-center gap-2 opacity-40">
                        <stat.icon className="size-3" />
                        <span className="text-[9px] font-black uppercase tracking-widest">{stat.label}</span>
                    </div>
                    <span className="text-2xl font-black italic tracking-tighter tabular-nums">
                      {loading ? "--" : stat.val.toString().padStart(2, '0')}
                    </span>
                </div>
            ))}
        </section>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-primary opacity-50" />
          <Input 
            placeholder="FILTER REGISTRY OR PIC..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 h-12 bg-muted/5 border-2 border-muted/50 rounded-none font-mono text-xs uppercase focus:border-primary transition-all shadow-inner"
          />
        </div>

        {/* DESKTOP TABLE VIEW */}
        <div className="hidden md:block border-2 border-muted/50 bg-muted/5 overflow-hidden min-h-[400px]">
            <Table>
                <TableHeader className="bg-muted/10">
                    <TableRow className="border-muted/50">
                        <TableHead className="text-[10px] font-black uppercase py-4 pl-6">UID</TableHead>
                        <TableHead className="text-[10px] font-black uppercase">Protocol & Team</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-center">Status</TableHead>
                        <TableHead className="text-right pr-6"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredProtocols.map((p) => (
                    <TableRow key={p.id} className="border-muted/20 hover:bg-primary/5 transition-colors group">
                        <TableCell className="font-mono text-[10px] text-primary/60 pl-6">[ {p.uid} ]</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1.5 py-2">
                              <span className="text-sm font-black uppercase italic tracking-tight">{p.label}</span>
                              <div className="flex flex-wrap gap-1">
                                {p.pic?.map((name: string) => (
                                  <Badge key={name} variant="secondary" className="rounded-none bg-primary/10 text-primary border-none text-[8px] font-bold h-4 px-1.5 uppercase">
                                    <UserCheck className="size-2 mr-1" /> {name}
                                  </Badge>
                                ))}
                              </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                            <Badge 
                              onClick={() => toggleProtocolStatus(p.id, p.isActive)} 
                              className={cn(
                                "rounded-none px-2 py-0.5 text-[9px] font-black cursor-pointer border transition-all tabular-nums", 
                                p.isActive 
                                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                                  : "bg-muted text-muted-foreground border-transparent"
                              )}
                            >
                                {p.isActive ? "● ONLINE" : "○ OFFLINE"}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                            <Button onClick={() => openEditModal(p)} variant="ghost" size="icon" className="size-8 rounded-none text-primary hover:bg-primary hover:text-primary-foreground transition-colors">
                              <Settings2 className="size-4" />
                            </Button>
                        </TableCell>
                    </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>

        {/* MOBILE CARD VIEW */}
        <div className="md:hidden flex flex-col gap-4">
          {filteredProtocols.map((p) => (
            <div key={p.id} className="border-2 border-muted/50 bg-background p-4 space-y-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)]">
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-[10px] text-primary/60">[ {p.uid} ]</span>
                  <h3 className="text-lg font-black uppercase italic leading-none">{p.label}</h3>
                </div>
                <Badge 
                  onClick={() => toggleProtocolStatus(p.id, p.isActive)} 
                  className={cn(
                    "rounded-none px-2 py-1 text-[9px] font-black cursor-pointer border", 
                    p.isActive 
                      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                      : "bg-muted text-muted-foreground border-transparent"
                  )}
                >
                  {p.isActive ? "● ONLINE" : "○ OFFLINE"}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {p.pic?.map((name: string) => (
                  <Badge key={name} className="rounded-none bg-muted text-foreground border-none text-[9px] font-bold py-0.5 uppercase">
                    {name}
                  </Badge>
                ))}
              </div>

              <div className="pt-2 border-t border-muted/30 flex justify-between items-center">
                <span className="text-[8px] font-mono opacity-40 uppercase">System Ready</span>
                <Button onClick={() => openEditModal(p)} variant="outline" size="sm" className="h-8 rounded-none font-black text-[10px] uppercase gap-2 border-2">
                  <Settings2 className="size-3" /> Config
                </Button>
              </div>
            </div>
          ))}
        </div>

        {filteredProtocols.length === 0 && !loading && (
          <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed border-muted text-[10px] font-mono opacity-30 uppercase text-center p-6">
            <ShieldAlert className="size-6 mb-2" />
            No matching protocols found in registry
          </div>
        )}
      </main>
    </div>
  )
}

function ProtocolModalContent({ setIsOpen, initialData, onDelete }: any) {
    const [label, setLabel] = React.useState("")
    const [desc, setDesc] = React.useState("")
    const [selectedPics, setSelectedPics] = React.useState<string[]>([])
    const [isActive, setIsActive] = React.useState(true)
    const [isSubmitting, setIsSubmitting] = React.useState(false)
    const [engineers, setEngineers] = React.useState<any[]>([])
    const [staffSearch, setStaffSearch] = React.useState("")

    React.useEffect(() => {
      fetch('/api/staff').then(res => res.json()).then(data => {
        if(Array.isArray(data)) setEngineers(data)
      }).catch(e => console.error(e))
    }, []);

    React.useEffect(() => {
      if (initialData) {
        setLabel(initialData.label || ""); 
        setDesc(initialData.desc || "");
        setSelectedPics(initialData.pic || []); 
        setIsActive(initialData.isActive ?? true);
      } else {
        setLabel(""); setDesc(""); setSelectedPics([]); setIsActive(true);
      }
    }, [initialData]);

    const handleRemoveMember = (e: React.MouseEvent, nameToRemove: string) => {
      e.preventDefault();
      e.stopPropagation();
      setSelectedPics(prev => prev.filter(name => name !== nameToRemove));
    };

    const handleCommit = async () => {
      if (!label || selectedPics.length === 0) return;
      setIsSubmitting(true);
      try {
        const payload = { label, desc, pic: selectedPics, isActive, updatedAt: new Date() };
        if (initialData) { 
          await updateDoc(doc(db, "protocols", initialData.id), payload); 
        } else { 
          await addDoc(collection(db, "protocols"), { 
            ...payload, 
            uid: `DX-${Math.floor(1000 + Math.random() * 9000)}`, 
            createdAt: new Date() 
          }); 
        }
        setIsOpen(false);
      } finally { setIsSubmitting(false); }
    }

    return (
        <DialogContent className="w-[95vw] sm:max-w-[450px] p-0 border-2 border-primary/20 bg-background rounded-none shadow-[10px_10px_0px_0px_rgba(0,0,0,0.1)] overflow-hidden">
            <div className="bg-primary/10 border-b-2 border-primary/20 p-4 md:p-6 flex justify-between items-center">
                <DialogHeader>
                    <div className="flex items-center gap-2 mb-1">
                        <Terminal className="size-3 text-primary" />
                        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-primary">
                          {initialData ? "Modify_Protocol" : "System_Initialize"}
                        </span>
                    </div>
                    <DialogTitle className="text-xl md:text-2xl font-black uppercase italic tracking-tighter">
                      {initialData ? initialData.uid : "New Protocol"}
                    </DialogTitle>
                </DialogHeader>
                {initialData && (
                  <Button variant="destructive" size="sm" className="rounded-none h-7 text-[8px] font-black uppercase" onClick={() => { onDelete(initialData.id); setIsOpen(false); }}>
                    Terminate
                  </Button>
                )}
            </div>
            
            <div className="p-4 md:p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase opacity-50 ml-1">Designation</Label>
                    <Input value={label} onChange={(e) => setLabel(e.target.value)} className="h-11 rounded-none border-2 border-muted/50 uppercase font-mono text-xs focus:border-primary" />
                </div>

                <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase opacity-50 ml-1">Assign Engineering Team</Label>
                    <div className="flex flex-wrap gap-2 min-h-[44px] p-2 border-2 border-dashed border-muted/50 bg-muted/5">
                      {selectedPics.length === 0 ? (
                        <span className="text-[9px] font-mono opacity-20 italic flex items-center px-1">Awaiting personnel assignment...</span>
                      ) : (
                        selectedPics.map(name => (
                          <Badge key={name} className="rounded-none bg-primary text-primary-foreground text-[9px] font-black flex items-center gap-2 pr-1 h-6">
                            {name} 
                            <button type="button" onClick={(e) => handleRemoveMember(e, name)} className="hover:bg-black/20 rounded-sm p-0.5"><X className="size-3" /></button>
                          </Badge>
                        ))
                      )}
                    </div>

                    <Select onValueChange={(val) => !selectedPics.includes(val) && setSelectedPics(prev => [...prev, val])}>
                      <SelectTrigger className="h-11 rounded-none border-2 border-muted/50 font-mono text-xs uppercase focus:ring-0">
                        <SelectValue placeholder="ADD_TEAM_MEMBER..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-none border-2 border-primary/20 p-0 max-h-64">
                        <div className="p-2 border-b border-muted/50 bg-muted/10 flex items-center gap-2 sticky top-0 bg-background z-10">
                          <Search className="size-3 opacity-50" />
                          <input 
                            className="bg-transparent border-none outline-none text-[10px] font-mono w-full uppercase" 
                            placeholder="SEARCH_STAFF..."
                            value={staffSearch}
                            onChange={(e) => setStaffSearch(e.target.value)}
                            onKeyDown={(e) => e.stopPropagation()} 
                          />
                        </div>
                        <div className="overflow-y-auto">
                          {engineers.filter(e => `${e.Firstname} ${e.Lastname}`.toLowerCase().includes(staffSearch.toLowerCase())).map((eng) => {
                              const name = `${eng.Firstname} ${eng.Lastname}`.trim();
                              return <SelectItem key={eng._id} value={name} className="font-mono text-[10px] uppercase">{name}</SelectItem>
                          })}
                        </div>
                      </SelectContent>
                    </Select>
                </div>
                
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase opacity-50 ml-1">Scope Description</Label>
                    <Input value={desc} onChange={(e) => setDesc(e.target.value)} className="h-11 rounded-none border-2 border-muted/50 uppercase font-mono text-xs focus:border-primary" />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/10 border-2 border-muted/50">
                    <Label className="text-xs font-black uppercase">Active Status</Label>
                    <Switch checked={isActive} onCheckedChange={setIsActive} className="data-[state=checked]:bg-primary rounded-none" />
                </div>
            </div>

            <DialogFooter className="p-4 md:p-6 pt-0 flex flex-row gap-3">
                <Button variant="ghost" className="flex-1 rounded-none font-black text-[10px] uppercase" onClick={() => setIsOpen(false)}>Discard</Button>
                <Button 
                  disabled={isSubmitting || !label || selectedPics.length === 0} 
                  onClick={handleCommit} 
                  className="flex-1 bg-primary text-primary-foreground rounded-none font-black text-[10px] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]"
                >
                  {isSubmitting ? "Syncing..." : "Commit_Entry"}
                </Button>
            </DialogFooter>
        </DialogContent>
    )
}