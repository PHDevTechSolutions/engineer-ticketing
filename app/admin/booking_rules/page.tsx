"use client"

import * as React from "react"
import { 
  Plus, 
  Settings2, 
  Search, 
  Terminal,
  Activity,
  Loader2,
  Trash2,
  Zap,
  ShieldCheck,
  Users
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// CUSTOM COMPONENTS
import { PageHeader } from "@/components/page-header"

export default function BookingRulesPage() {
  const [searchTerm, setSearchTerm] = React.useState("")
  const [isOpen, setIsOpen] = React.useState(false)
  const [rules, setRules] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [selectedRule, setSelectedRule] = React.useState<any>(null)

  // REAL-TIME DATABASE SYNC
  React.useEffect(() => {
    const q = query(collection(db, "booking_rules"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ruleList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRules(ruleList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const deleteRule = async (id: string) => {
    if (window.confirm("CRITICAL: Permanent deletion of assignment logic. Proceed?")) {
      try {
        await deleteDoc(doc(db, "booking_rules", id));
      } catch (e) {
        console.error("Delete error: ", e);
      }
    }
  };

  const openEditModal = (rule: any) => {
    setSelectedRule(rule);
    setIsOpen(true);
  };

  const filteredRules = rules.filter(r => 
    r.condition?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.assignedPIC?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="flex flex-col min-h-screen bg-background font-sans antialiased text-foreground pb-24 md:pb-0">
      
      <PageHeader title="Assignment Logic" version="DSI-AUTH-v1.2">
        <Dialog 
          open={isOpen} 
          onOpenChange={(val) => {
            setIsOpen(val);
            if(!val) setSelectedRule(null); 
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm" className="hidden md:flex h-8 rounded-none bg-primary text-primary-foreground font-black uppercase italic text-[10px] tracking-widest px-4">
              <Plus className="size-3 mr-1" /> New_Rule
            </Button>
          </DialogTrigger>
          <RuleModalContent 
            setIsOpen={setIsOpen} 
            initialData={selectedRule} 
            onDelete={deleteRule} 
          />
        </Dialog>
      </PageHeader>

      <main className="flex flex-1 flex-col gap-4 md:gap-6 p-4 md:p-6 max-w-6xl mx-auto w-full relative">
        
        {/* --- SYSTEM STATUS BAR --- */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-px bg-muted/30 border border-muted/30">
            {[
                { label: "Active_Rules", val: rules.length, icon: Zap },
                { label: "Specialists", val: rules.filter(r => r.type === "specialist").length, icon: ShieldCheck },
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
            placeholder="FILTER LOGIC ENGINE..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 h-12 bg-muted/5 border-2 border-muted/50 rounded-none font-mono text-xs tracking-widest uppercase"
          />
        </div>

        {/* --- RULES TABLE --- */}
        <div className="border-2 border-muted/50 bg-muted/5 overflow-hidden min-h-[400px]">
            <div className="bg-muted/10 border-b-2 border-muted/50 p-2 flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-[0.3em] px-2 opacity-50">Assignment_Registry</span>
                {loading && <Loader2 className="size-3 animate-spin mr-2 opacity-50" />}
            </div>
            
            <div className="hidden md:block">
                <Table>
                <TableHeader>
                    <TableRow className="border-muted/50 hover:bg-transparent">
                    <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Priority</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Condition (Team/Keyword)</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Assigned PIC</TableHead>
                    <TableHead className="text-right"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredRules.map((r) => (
                    <TableRow key={r.id} className="group border-muted/20 hover:bg-primary/5 transition-colors">
                        <TableCell>
                          <Badge className={cn(
                            "rounded-none text-[8px] font-black uppercase italic",
                            r.type === 'specialist' ? "bg-amber-500 text-black" : "bg-primary text-primary-foreground"
                          )}>
                            {r.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-black uppercase italic tracking-tight">{r.condition}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-[11px] font-mono font-bold text-primary">→ {r.assignedPIC}</span>
                        </TableCell>
                        <TableCell className="text-right">
                            <Button 
                                onClick={() => openEditModal(r)} 
                                variant="ghost" size="icon" 
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
        </div>
      </main>
    </div>
  )
}

function RuleModalContent({ setIsOpen, initialData, onDelete }: any) {
    const [type, setType] = React.useState("team")
    const [condition, setCondition] = React.useState("")
    const [assignedPIC, setAssignedPIC] = React.useState("")
    const [isSubmitting, setIsSubmitting] = React.useState(false)

    React.useEffect(() => {
      if (initialData) {
        setType(initialData.type);
        setCondition(initialData.condition);
        setAssignedPIC(initialData.assignedPIC);
      }
    }, [initialData]);

    const handleCommit = async () => {
      if (!condition || !assignedPIC) return;
      setIsSubmitting(true);
      try {
        if (initialData) {
          await updateDoc(doc(db, "booking_rules", initialData.id), { type, condition, assignedPIC });
        } else {
          await addDoc(collection(db, "booking_rules"), {
            type, condition, assignedPIC, createdAt: new Date()
          });
        }
        setIsOpen(false);
      } catch (e) { console.error(e); } finally { setIsSubmitting(false); }
    }

    return (
        <DialogContent className="sm:max-w-[450px] p-0 gap-0 border-2 border-primary/20 bg-background rounded-none shadow-[10px_10px_0px_0px_rgba(0,0,0,0.1)]">
            <div className="bg-primary/10 border-b-2 border-primary/20 p-6 flex justify-between items-center">
                <DialogHeader className="text-left">
                    <div className="flex items-center gap-2 mb-2">
                        <Zap className="size-3 text-primary" />
                        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-primary">Logic_Initialization</span>
                    </div>
                    <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter">
                      {initialData ? "Update Rule" : "New Assignment"}
                    </DialogTitle>
                </DialogHeader>
                {initialData && (
                  <Button variant="destructive" size="sm" className="rounded-none h-7 text-[8px] font-black uppercase" onClick={() => { onDelete(initialData.id); setIsOpen(false); }}>
                    Delete
                  </Button>
                )}
            </div>
            
            <div className="p-6 space-y-6">
                <div className="grid gap-2">
                    <Label className="text-[10px] font-black uppercase opacity-50 ml-1">Logic Priority</Label>
                    <Select value={type} onValueChange={setType}>
                      <SelectTrigger className="h-11 rounded-none border-2 border-muted/50 font-mono text-xs uppercase">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-none border-2 border-primary/20">
                        <SelectItem value="team">Standard Team Mapping</SelectItem>
                        <SelectItem value="specialist">Keyword Specialist Override</SelectItem>
                      </SelectContent>
                    </Select>
                </div>
                
                <div className="grid gap-2">
                    <Label className="text-[10px] font-black uppercase opacity-50 ml-1">Condition Name</Label>
                    <Input value={condition} onChange={(e) => setCondition(e.target.value)} placeholder="E.G. TEAM CHI OR DIALUX" className="h-11 rounded-none border-2 border-muted/50 uppercase font-mono text-xs" />
                </div>

                <div className="grid gap-2">
                    <Label className="text-[10px] font-black uppercase opacity-50 ml-1">Target PIC</Label>
                    <Input value={assignedPIC} onChange={(e) => setAssignedPIC(e.target.value)} placeholder="ENGINEER NAME" className="h-11 rounded-none border-2 border-muted/50 uppercase font-mono text-xs" />
                </div>
            </div>

            <DialogFooter className="p-6 pt-0 flex flex-row gap-3">
                <Button variant="ghost" className="flex-1 rounded-none font-black text-[10px] uppercase" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button disabled={isSubmitting} onClick={handleCommit} className="flex-1 bg-primary text-primary-foreground rounded-none font-black text-[10px] uppercase italic shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]">
                  {isSubmitting ? "Syncing..." : "Commit_Logic"}
                </Button>
            </DialogFooter>
        </DialogContent>
    )
}