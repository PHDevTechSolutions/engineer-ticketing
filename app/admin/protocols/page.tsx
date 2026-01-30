"use client"

import * as React from "react"
import { 
  Plus, 
  Settings2, 
  Search, 
  Terminal,
  Activity,
  Loader2,
  Trash2 
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
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

// CUSTOM COMPONENTS
import { PageHeader } from "@/components/page-header"

export default function ProtocolRegistryPage() {
  const [searchTerm, setSearchTerm] = React.useState("")
  const [isOpen, setIsOpen] = React.useState(false)
  const [protocols, setProtocols] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [selectedProtocol, setSelectedProtocol] = React.useState<any>(null)

  // REAL-TIME DATABASE SYNC
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

  // DELETE FUNCTION
  const deleteProtocol = async (id: string) => {
    if (window.confirm("CRITICAL: Permanent deletion of protocol. Proceed?")) {
      try {
        await deleteDoc(doc(db, "protocols", id));
      } catch (e) {
        console.error("Delete error: ", e);
      }
    }
  };

  // MODAL CONTROLS
  const openEditModal = (protocol: any) => {
    setSelectedProtocol(protocol);
    setIsOpen(true);
  };

  const openCreateModal = () => {
    setSelectedProtocol(null);
    setIsOpen(true);
  };

  const toggleProtocolStatus = async (id: string, currentStatus: boolean) => {
    try {
      const docRef = doc(db, "protocols", id);
      await updateDoc(docRef, { isActive: !currentStatus });
    } catch (e) {
      console.error("Update error: ", e);
    }
  };

  const filteredProtocols = protocols.filter(p => 
    p.label?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.uid?.includes(searchTerm)
  )

  return (
    <div className="flex flex-col min-h-screen bg-background font-sans antialiased text-foreground pb-24 md:pb-0">
      
      <PageHeader title="Registry Control" version="DSI-LOG-v2.4">
        <Dialog 
          open={isOpen} 
          onOpenChange={(val) => {
            setIsOpen(val);
            if(!val) setSelectedProtocol(null); 
          }}
        >
          {/* Desktop Trigger */}
          <DialogTrigger asChild>
            <Button size="sm" className="hidden md:flex h-8 rounded-none bg-primary text-primary-foreground font-black uppercase italic text-[10px] tracking-widest px-4">
              <Plus className="size-3 mr-1" /> New_Entry
            </Button>
          </DialogTrigger>
          <ProtocolModalContent 
            setIsOpen={setIsOpen} 
            initialData={selectedProtocol} 
            onDelete={deleteProtocol} 
          />
        </Dialog>
      </PageHeader>

      {/* --- MOBILE FLOATING ACTION BUTTON --- */}
      <div className="md:hidden fixed bottom-8 right-6 z-50">
        <Button 
          onClick={openCreateModal}
          size="icon"
          className="size-14 rounded-none bg-primary text-primary-foreground shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)] border-2 border-primary-foreground/20 flex items-center justify-center transition-transform active:scale-90"
        >
          <Plus className="size-8" />
        </Button>
      </div>

      <main className="flex flex-1 flex-col gap-4 md:gap-6 p-4 md:p-6 max-w-6xl mx-auto w-full relative">
        
        {/* --- SYSTEM STATUS BAR --- */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-px bg-muted/30 border border-muted/30">
            {[
                { label: "Manifest", val: protocols.length, icon: Terminal },
                { label: "Active", val: protocols.filter(p => p.isActive).length, icon: Activity },
            ].map((stat, i) => (
                <div key={i} className="bg-background p-3 md:p-4 flex flex-col gap-1">
                    <div className="flex items-center gap-2 opacity-40">
                        <stat.icon className="size-3" />
                        <span className="text-[9px] font-black uppercase tracking-widest">{stat.label}</span>
                    </div>
                    <span className="text-xl md:text-2xl font-black italic tracking-tighter">
                      {loading ? "--" : stat.val.toString().padStart(2, '0')}
                    </span>
                </div>
            ))}
        </section>

        {/* --- SEARCH --- */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-primary opacity-50" />
          <Input 
            placeholder="FILTER REGISTRY..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 h-12 bg-muted/5 border-2 border-muted/50 rounded-none font-mono text-xs tracking-widest uppercase"
          />
        </div>

        {/* --- TABLE / LIST --- */}
        <div className="border-2 border-muted/50 bg-muted/5 overflow-hidden min-h-[400px]">
            <div className="bg-muted/10 border-b-2 border-muted/50 p-2 flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-[0.3em] px-2 opacity-50">Master_Index</span>
                {loading && <Loader2 className="size-3 animate-spin mr-2 opacity-50" />}
            </div>
            
            {/* Desktop View */}
            <div className="hidden md:block">
                <Table>
                <TableHeader>
                    <TableRow className="border-muted/50 hover:bg-transparent">
                    <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">UID</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Protocol</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Status</TableHead>
                    <TableHead className="text-right"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredProtocols.map((p) => (
                    <TableRow key={p.id} className="group border-muted/20 hover:bg-primary/5 transition-colors">
                        <TableCell className="font-mono text-[10px] text-primary/60">[ {p.uid} ]</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                              <span className="text-sm font-black uppercase italic tracking-tight">{p.label}</span>
                              <span className="text-[10px] font-mono opacity-50 uppercase">{p.desc}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                        <button onClick={() => toggleProtocolStatus(p.id, p.isActive)}>
                          <Badge variant="outline" className={cn(
                              "rounded-none px-2 py-0 text-[9px] font-black uppercase border-2 cursor-pointer transition-all",
                              p.isActive ? "border-emerald-500/20 text-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10" : "border-muted text-muted-foreground"
                          )}>
                              {p.isActive ? "● ONLINE" : "○ OFFLINE"}
                          </Badge>
                        </button>
                        </TableCell>
                        <TableCell className="text-right">
                            <Button 
                                onClick={() => openEditModal(p)} 
                                variant="ghost" 
                                size="icon" 
                                className="size-8 rounded-none text-primary"
                            >
                                <Settings2 className="size-4" />
                            </Button>
                        </TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            </div>

            {/* Mobile View */}
            <div className="md:hidden divide-y-2 divide-muted/30">
                {filteredProtocols.map((p) => (
                    <div key={p.id} className="p-4 flex flex-col gap-3 bg-background relative">
                        <div className="flex justify-between items-start">
                            <span className="font-mono text-[9px] text-primary/60">[ {p.uid} ]</span>
                            <Badge onClick={() => toggleProtocolStatus(p.id, p.isActive)} variant="outline" className={cn(
                                "rounded-none px-2 py-0 text-[8px] font-black uppercase border-2",
                                p.isActive ? "border-emerald-500/20 text-emerald-500 bg-emerald-500/5" : "border-muted text-muted-foreground"
                            )}>
                                {p.isActive ? "● ONLINE" : "○ OFFLINE"}
                            </Badge>
                        </div>
                        <div>
                            <h3 className="text-sm font-black uppercase italic tracking-tight leading-none">{p.label}</h3>
                            <p className="text-[10px] font-mono opacity-50 uppercase mt-1">{p.desc}</p>
                        </div>
                        <Button 
                            onClick={() => openEditModal(p)} 
                            variant="ghost" 
                            size="icon" 
                            className="absolute bottom-4 right-4 size-8 rounded-none text-primary"
                        >
                            <Settings2 className="size-4" />
                        </Button>
                    </div>
                ))}
            </div>
        </div>
      </main>
    </div>
  )
}

function ProtocolModalContent({ 
  setIsOpen, 
  initialData, 
  onDelete 
}: { 
  setIsOpen: (val: boolean) => void, 
  initialData?: any,
  onDelete?: (id: string) => void
}) {
    const [label, setLabel] = React.useState("")
    const [desc, setDesc] = React.useState("")
    const [isActive, setIsActive] = React.useState(true)
    const [isSubmitting, setIsSubmitting] = React.useState(false)

    React.useEffect(() => {
      if (initialData) {
        setLabel(initialData.label);
        setDesc(initialData.desc);
        setIsActive(initialData.isActive);
      } else {
        setLabel("");
        setDesc("");
        setIsActive(true);
      }
    }, [initialData]);

    const isEditing = !!initialData;

    const handleCommit = async () => {
      if (!label || !desc) return;
      setIsSubmitting(true);
      try {
        if (isEditing) {
          const docRef = doc(db, "protocols", initialData.id);
          await updateDoc(docRef, { label, desc, isActive });
        } else {
          await addDoc(collection(db, "protocols"), {
            uid: `DX-${Math.floor(1000 + Math.random() * 9000)}`,
            label,
            desc,
            isActive,
            createdAt: new Date()
          });
        }
        setIsOpen(false);
      } catch (e) {
        console.error("Error saving: ", e);
      } finally {
        setIsSubmitting(false);
      }
    }

    return (
        <DialogContent className="sm:max-w-[450px] p-0 gap-0 border-2 border-primary/20 bg-background rounded-none shadow-[10px_10px_0px_0px_rgba(0,0,0,0.1)]">
            <div className="bg-primary/10 border-b-2 border-primary/20 p-6 flex justify-between items-center">
                <DialogHeader className="text-left">
                    <div className="flex items-center gap-2 mb-2">
                        <Terminal className="size-3 text-primary" />
                        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-primary">
                          {isEditing ? "Modify_Protocol" : "System_Initialize"}
                        </span>
                    </div>
                    <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter">
                      {isEditing ? `Edit: ${initialData.uid}` : "New Protocol"}
                    </DialogTitle>
                </DialogHeader>
                
                {isEditing && (
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    className="rounded-none h-7 text-[8px] font-black uppercase tracking-tighter"
                    onClick={() => {
                      onDelete?.(initialData.id);
                      setIsOpen(false);
                    }}
                  >
                    Terminate
                  </Button>
                )}
            </div>
            
            <div className="p-6 space-y-6">
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-50 ml-1">Designation</Label>
                    <Input 
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                      className="h-11 rounded-none border-2 border-muted/50 focus-visible:ring-primary/20 uppercase font-mono text-xs" 
                    />
                </div>
                
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-50 ml-1">Scope Description</Label>
                    <Input 
                      value={desc}
                      onChange={(e) => setDesc(e.target.value)}
                      className="h-11 rounded-none border-2 border-muted/50 focus-visible:ring-primary/20 uppercase font-mono text-xs" 
                    />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/10 border-2 border-muted/50">
                    <div className="space-y-0.5">
                        <Label className="text-xs font-black uppercase">Active Status</Label>
                        <p className="text-[10px] font-mono opacity-50 uppercase">Current operational state.</p>
                    </div>
                    <Switch 
                      checked={isActive}
                      onCheckedChange={setIsActive}
                      className="data-[state=checked]:bg-primary rounded-none" 
                    />
                </div>
            </div>

            <DialogFooter className="p-6 pt-0 flex flex-row gap-3">
                <Button variant="ghost" className="flex-1 rounded-none font-black text-[10px] uppercase" onClick={() => setIsOpen(false)}>
                    Discard
                </Button>
                <Button disabled={isSubmitting} onClick={handleCommit} className="flex-1 bg-primary text-primary-foreground rounded-none font-black text-[10px] uppercase italic shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]">
                    {isSubmitting ? "Syncing..." : isEditing ? "Update_Registry" : "Commit_Entry"}
                </Button>
            </DialogFooter>
        </DialogContent>
    )
}