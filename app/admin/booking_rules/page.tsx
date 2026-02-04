"use client"

import * as React from "react"
import { 
  Plus, Settings2, Search, Loader2, Zap, ShieldCheck 
} from "lucide-react"
import { cn } from "@/lib/utils"

// FIREBASE
import { db } from "@/lib/firebase";
import { 
  collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc 
} from "firebase/firestore";

// SHADCN & UI COMPONENTS
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PageHeader } from "@/components/page-header"

// --- MAIN PAGE COMPONENT ---
export default function BookingRulesPage() {
  const [searchTerm, setSearchTerm] = React.useState("")
  const [isOpen, setIsOpen] = React.useState(false)
  const [rules, setRules] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [selectedRule, setSelectedRule] = React.useState<any>(null)

  // Real-time listener for booking rules
  React.useEffect(() => {
    const q = query(collection(db, "booking_rules"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRules(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const deleteRule = async (id: string) => {
    if (window.confirm("CRITICAL: Permanent deletion of assignment logic. Proceed?")) {
      await deleteDoc(doc(db, "booking_rules", id));
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
      {/* 🔹 FIXED: Dialog is now passed into the 'actions' prop to satisfy TypeScript */}
      <PageHeader 
        title="Assignment Logic" 
        version="DSI-AUTH-v1.2"
        actions={
          <Dialog open={isOpen} onOpenChange={(val) => { setIsOpen(val); if(!val) setSelectedRule(null); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8 rounded-none bg-primary text-primary-foreground font-black uppercase italic text-[10px] tracking-widest px-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]">
                <Plus className="size-3 mr-1" /> New_Rule
              </Button>
            </DialogTrigger>
            <RuleModalContent setIsOpen={setIsOpen} initialData={selectedRule} onDelete={deleteRule} />
          </Dialog>
        }
      />

      <main className="flex flex-1 flex-col gap-4 md:gap-6 p-4 md:p-6 max-w-6xl mx-auto w-full relative">
        {/* Status Bar Section */}
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

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-primary opacity-50" />
          <Input 
            placeholder="FILTER LOGIC ENGINE..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 h-12 bg-muted/5 border-2 border-muted/50 rounded-none font-mono text-xs tracking-widest uppercase"
          />
        </div>

        {/* Rules Table */}
        <div className="border-2 border-muted/50 bg-muted/5 overflow-hidden min-h-[400px]">
          <div className="bg-muted/10 border-b-2 border-muted/50 p-2 flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-[0.3em] px-2 opacity-50">Assignment_Registry</span>
            {loading && <Loader2 className="size-3 animate-spin mr-2 opacity-50" />}
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-muted/50 hover:bg-transparent uppercase font-black text-[10px]">
                <TableHead>Priority</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Assigned PIC</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRules.length === 0 && !loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-20 font-mono text-[10px] uppercase opacity-30">No_Logic_Found_In_Registry</TableCell>
                </TableRow>
              ) : (
                filteredRules.map((r) => (
                  <TableRow key={r.id} className="group border-muted/20 hover:bg-primary/5 transition-colors">
                    <TableCell>
                      <Badge className={cn("rounded-none text-[8px] font-black uppercase", r.type === 'specialist' ? "bg-amber-500 text-black" : "bg-primary text-primary-foreground")}>
                        {r.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-black uppercase italic tracking-tight">{r.condition}</TableCell>
                    <TableCell className="text-[11px] font-mono font-bold text-primary">→ {r.assignedPIC}</TableCell>
                    <TableCell className="text-right">
                      <Button onClick={() => openEditModal(r)} variant="ghost" size="icon" className="size-8 rounded-none text-primary">
                        <Settings2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  )
}

// --- MODAL COMPONENT ---
function RuleModalContent({ setIsOpen, initialData, onDelete }: any) {
    const [type, setType] = React.useState("team")
    const [condition, setCondition] = React.useState("")
    const [assignedPIC, setAssignedPIC] = React.useState("")
    const [isSubmitting, setIsSubmitting] = React.useState(false)
    const [staff, setStaff] = React.useState<any[]>([])

    // Fetch Staff List for the dropdown
    React.useEffect(() => {
      const q = query(collection(db, "staff"), orderBy("Firstname", "asc"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setStaff(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return () => unsubscribe();
    }, []);

    React.useEffect(() => {
      if (initialData) {
        setType(initialData.type);
        setCondition(initialData.condition);
        setAssignedPIC(initialData.assignedPIC);
      } else {
        setType("team");
        setCondition("");
        setAssignedPIC("");
      }
    }, [initialData]);

    const handleCommit = async () => {
      if (!condition || !assignedPIC) return;
      setIsSubmitting(true);
      try {
        const payload = { type, condition, assignedPIC, updatedAt: new Date() };
        if (initialData) {
          await updateDoc(doc(db, "booking_rules", initialData.id), payload);
        } else {
          await addDoc(collection(db, "booking_rules"), { ...payload, createdAt: new Date() });
        }
        setIsOpen(false);
      } catch (e) { 
        console.error(e); 
      } finally { 
        setIsSubmitting(false); 
      }
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
                    <Label className="text-[10px] font-black uppercase opacity-50 ml-1">Assigned PIC (Staff List)</Label>
                    <Select value={assignedPIC} onValueChange={setAssignedPIC}>
                      <SelectTrigger className="h-11 rounded-none border-2 border-muted/50 font-mono text-xs uppercase">
                        <SelectValue placeholder="SELECT ENGINEER..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-none border-2 border-primary/20 max-h-60">
                        {staff.length === 0 ? (
                          <div className="p-4 text-center text-[10px] uppercase font-bold opacity-30">No_Staff_Found</div>
                        ) : staff.map((member) => (
                          <SelectItem 
                            key={member.id} 
                            value={`${member.Firstname} ${member.Lastname}`}
                            className="font-mono text-[10px] uppercase"
                          >
                            {member.Firstname} {member.Lastname}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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