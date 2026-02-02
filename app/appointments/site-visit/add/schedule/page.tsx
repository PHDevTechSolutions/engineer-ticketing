"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useAppointmentData } from "../layout"
import { 
  Paperclip, Send, ChevronLeft, Layers, Navigation, Loader2,
  RefreshCw, ShieldCheck, X, User, AlertTriangle,
  ChevronRight, CalendarDays, Info, ShieldAlert, Fingerprint,
  ClipboardList, MapPin
} from "lucide-react"
import { cn } from "@/lib/utils"

// FIREBASE IMPORTS
import { db, storage } from "@/lib/firebase"
import { collection, addDoc, onSnapshot, query, where, serverTimestamp, Timestamp } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"

import { toast } from "sonner"
import "leaflet/dist/leaflet.css"

export default function SchedulePage() {
  const router = useRouter();
  const { selectedAssistance } = useAppointmentData();
  
  // --- CALENDAR LOGIC STATE ---
  const today = new Date(2026, 1, 2); 
  const [viewDate, setViewDate] = React.useState(new Date(2026, 1, 1)); 
  const [selectedDate, setSelectedDate] = React.useState<number | null>(null);
  const [viewingDetails, setViewingDetails] = React.useState<any | null>(null);
  
  // --- OTHER STATES ---
  const [assignedPics, setAssignedPics] = React.useState<string[]>([]);
  const [protocolMetadata, setProtocolMetadata] = React.useState<any[]>([]); 
  const [selectedPic, setSelectedPic] = React.useState<string>(""); 
  const [isLoadingSync, setIsLoadingSync] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isGeocoding, setIsGeocoding] = React.useState(false);
  const [coords, setCoords] = React.useState<[number, number] | null>(null);
  const [attachedFile, setAttachedFile] = React.useState<File | null>(null);
  const [existingAppointments, setExistingAppointments] = React.useState<any[]>([]);

  const [formData, setFormData] = React.useState({ 
    client: "", 
    address: "", 
    landmark: "",
    agenda: "",
    notes: "", // RESTORED
    tsa: "NOT_SET", 
    tsm: "NOT_SET"  
  });

  const isComplete = Boolean(formData.client.trim() && formData.address.trim() && selectedDate !== null);

  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
  const monthLabel = viewDate.toLocaleString('default', { month: 'long', year: 'numeric' }).toUpperCase();

  const handleMonthChange = (offset: number) => {
    const newMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1);
    if (newMonth < new Date(today.getFullYear(), today.getMonth(), 1)) return;
    setViewDate(newMonth);
    setSelectedDate(null);
  };

  // --- SYNC PERSONNEL DATA ---
  React.useEffect(() => {
    const q = query(collection(db, "protocols"), where("isActive", "==", true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dbProtocols = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      const matched = dbProtocols.filter((proto: any) => 
        selectedAssistance?.some((service: string) => 
          service.trim().toLowerCase() === proto.label?.trim().toLowerCase()
        )
      );
      setProtocolMetadata(matched);
      const uniquePics = Array.from(new Set(matched.flatMap(p => p.pic || []))) as string[];
      const finalPics = uniquePics.length > 0 ? uniquePics : ["Patrick"];
      setAssignedPics(finalPics);
      
      if (!selectedPic || !finalPics.includes(selectedPic)) {
        const initialPic = finalPics[0];
        setSelectedPic(initialPic);
        const match = matched.find(p => p.pic?.includes(initialPic));
        if (match) setFormData(prev => ({ ...prev, tsa: match.tsa || "NOT_SET", tsm: match.tsm || "NOT_SET" }));
      }
      setIsLoadingSync(false);
    });
    return () => unsubscribe();
  }, [selectedAssistance]);

  // --- REAL-TIME BUSY SYNC ---
  React.useEffect(() => {
    if (!selectedPic) return;
    const start = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const end = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
    const q = query(collection(db, "appointments"), where("pic", "==", selectedPic), where("appointmentDate", ">=", start), where("appointmentDate", "<=", end));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const apps = snapshot.docs.map(doc => ({ 
        day: doc.data().appointmentDate.toDate().getDate(),
        client: doc.data().client,
        agenda: doc.data().agenda || "Routine Site Visit",
        status: doc.data().status
      }));
      setExistingAppointments(apps);
    });
    return () => unsubscribe();
  }, [selectedPic, viewDate]);

  const handlePicChange = (name: string) => {
    setSelectedPic(name);
    setSelectedDate(null);
    const match = protocolMetadata.find(p => p.pic?.includes(name));
    if (match) setFormData(prev => ({ ...prev, tsa: match.tsa || "NOT_SET", tsm: match.tsm || "NOT_SET" }));
  };

  const handleSubmitProtocol = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const toastId = toast.loading("INITIALIZING PROTOCOL...");
    try {
      let fileUrl = "";
      if (attachedFile) {
        const fileRef = ref(storage, `appointments/${Date.now()}_${attachedFile.name}`);
        await uploadBytes(fileRef, attachedFile);
        fileUrl = await getDownloadURL(fileRef);
      }
      const appointmentDateObj = new Date(viewDate.getFullYear(), viewDate.getMonth(), selectedDate as number);
      await addDoc(collection(db, "appointments"), {
        ...formData,
        pic: selectedPic,
        appointmentDate: Timestamp.fromDate(appointmentDateObj),
        protocols: selectedAssistance || [],
        fileUrl,
        coordinates: coords,
        status: "PENDING",
        createdAt: serverTimestamp()
      });
      toast.success("PROTOCOL INITIALIZED", { id: toastId });
      setTimeout(() => router.push("/appointments/site-visit"), 1500); 
    } catch (error: any) {
      toast.error("PROTOCOL FAILED", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyMap = async () => {
    if (formData.address.trim().length < 5) return;
    setIsGeocoding(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formData.address)}`);
      const data = await res.json();
      if (data?.[0]) setCoords([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
    } catch (err) { console.error(err); } 
    finally { setIsGeocoding(false); }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-sans relative overflow-x-hidden">
      {/* IMPROVED DETAILS MODAL */}
      {viewingDetails && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border-[3px] border-black w-full max-w-md overflow-hidden shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
            <div className="bg-black p-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ShieldAlert className="size-4 text-red-500" />
                <span className="text-white text-[10px] font-black uppercase tracking-[0.2em]">Conflict Insight</span>
              </div>
              <button onClick={() => setViewingDetails(null)} className="text-white/60 hover:text-white transition-colors">
                <X className="size-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="flex items-start gap-4 pb-4 border-b-2 border-muted/20">
                <div className="bg-red-50 p-3 border-2 border-red-100">
                  <Fingerprint className="size-8 text-red-600" />
                </div>
                <div>
                  <h4 className="text-lg font-black uppercase leading-none italic">{selectedPic}</h4>
                  <p className="text-[10px] font-mono opacity-50 mt-1 uppercase tracking-tighter">Current Assignment Found</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1">
                  <span className="text-[8px] font-black uppercase text-primary">Target Entity</span>
                  <div className="bg-muted/30 p-3 border border-muted/50 font-mono text-xs font-bold uppercase">
                    {viewingDetails.client}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[8px] font-black uppercase text-primary">Mission/Agenda</span>
                  <div className="bg-muted/30 p-3 border border-muted/50 font-mono text-xs font-bold uppercase italic">
                    {viewingDetails.agenda}
                  </div>
                </div>
              </div>

              <div className="bg-red-600/5 p-3 border border-red-600/20 flex gap-3 items-center">
                <AlertTriangle className="size-4 text-red-600 shrink-0" />
                <p className="text-[9px] font-bold text-red-900 leading-tight uppercase">
                  Double booking prevented. Personnel is locked to the registry above.
                </p>
              </div>
            </div>

            <button 
              onClick={() => setViewingDetails(null)} 
              className="w-full bg-black text-white py-4 font-black uppercase text-[10px] tracking-[0.3em] hover:bg-zinc-800 transition-all flex items-center justify-center gap-2"
            >
              Acknowledge & Close
            </button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="flex h-16 shrink-0 items-center px-4 border-b-2 border-muted/30 sticky top-0 bg-background z-20 justify-between">
        <div className="flex items-center">
          <button onClick={() => router.back()} className="p-2 hover:bg-muted/50 rounded-sm mr-4 transition-colors">
            <ChevronLeft className="size-5" />
          </button>
          <div className="flex flex-col">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-primary italic leading-none">Step 2: Logistics & Schedule</h2>
            <span className="text-[8px] font-mono opacity-40 uppercase mt-1">Registry_Linked</span>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 border-2 border-primary/10 bg-primary/5">
          {isLoadingSync ? <RefreshCw className="size-3 animate-spin text-primary" /> : <ShieldCheck className="size-3 text-green-500" />}
          <span className="text-[9px] font-black uppercase text-primary">Database_Active</span>
        </div>
      </header>

      <main className="p-4 md:p-8 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 pb-32">
        {/* LEFT COLUMN: FORM (RESTORED & IMPROVED) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="space-y-2">
            <p className="text-[8px] font-black uppercase text-primary tracking-widest flex items-center gap-2"><Layers className="size-3" /> Selected Protocols</p>
            <div className="flex flex-wrap gap-2">
              {selectedAssistance?.map((item: string, idx: number) => (
                <span key={idx} className="px-2 py-1 bg-muted text-[10px] font-mono font-bold uppercase border border-muted-foreground/10">{item}</span>
              ))}
            </div>
          </div>

          <section className="p-4 border-2 border-muted/30 bg-muted/5 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-muted flex items-center justify-center border-2 border-muted-foreground/20"><User className="size-6 text-muted-foreground/50" /></div>
              <div className="flex flex-col">
                <span className="text-[8px] font-black uppercase opacity-40 leading-none">Assign Personnel</span>
                <span className="text-[10px] font-bold italic opacity-60">PIC Selection</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {assignedPics.map((name, i) => (
                <button key={i} onClick={() => handlePicChange(name)} className={cn("flex-1 text-[11px] font-black uppercase px-4 py-2 border-2 transition-all", selectedPic === name ? "bg-black text-white border-black" : "bg-white border-muted/50")}>{name}</button>
              ))}
            </div>
          </section>

          {/* FORM INPUTS */}
          <section className="space-y-6">
            {/* CLIENT SECTION */}
            <div className="space-y-4">
                <p className="text-[8px] font-black uppercase text-primary flex items-center gap-2 opacity-50"><ClipboardList className="size-3"/> Client Identification</p>
                <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-primary">Client Name*</label>
                    <input className="w-full bg-white border-2 border-muted/50 p-3 text-xs uppercase font-mono outline-none focus:border-primary" placeholder="CLIENT ENTITY..." value={formData.client} onChange={e => setFormData({...formData, client: e.target.value})} />
                </div>
                <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-primary">Agenda/Scope</label>
                    <input className="w-full bg-white border-2 border-muted/50 p-3 text-xs uppercase font-mono outline-none focus:border-primary" placeholder="PURPOSE..." value={formData.agenda} onChange={e => setFormData({...formData, agenda: e.target.value})} />
                </div>
                {/* RESTORED NOTES FIELD */}
                <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-primary">Notes or Instructions</label>
                    <textarea className="w-full bg-white border-2 border-muted/50 p-3 text-xs uppercase font-mono outline-none focus:border-primary" rows={3} placeholder="SPECIAL INSTRUCTIONS OR REMARKS..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
                </div>
            </div>

            {/* SITE SECTION */}
            <div className="space-y-4 pt-4 border-t-2 border-muted/10">
                <p className="text-[8px] font-black uppercase text-primary flex items-center gap-2 opacity-50"><MapPin className="size-3"/> Geographical Data</p>
                <div className="space-y-1">
                <div className="flex justify-between items-end">
                    <label className="text-[9px] font-black uppercase text-primary">Site Address*</label>
                    <button onClick={handleVerifyMap} className="text-[8px] font-bold uppercase text-primary flex items-center gap-1">
                    {isGeocoding ? <Loader2 className="size-2.5 animate-spin" /> : <Navigation className="size-2.5" />} Verify
                    </button>
                </div>
                <textarea className="w-full bg-white border-2 border-muted/50 p-3 text-xs uppercase font-mono outline-none focus:border-primary" rows={2} placeholder="ADDRESS..." value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                </div>
                <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-primary">Landmark</label>
                <input className="w-full bg-white border-2 border-muted/50 p-3 text-xs uppercase font-mono outline-none focus:border-primary" placeholder="E.G. NEAR SHELL..." value={formData.landmark} onChange={e => setFormData({...formData, landmark: e.target.value})} />
                </div>
            </div>

            <div className="space-y-1 pt-4">
              <label className="text-[9px] font-black uppercase text-primary">Project Documents</label>
              <div className={cn("border-2 border-dashed p-4 flex flex-col items-center justify-center transition-all", attachedFile ? "bg-green-500/5 border-green-500/40" : "bg-muted/5 border-muted/50")}>
                {attachedFile ? (
                  <div className="flex items-center justify-between w-full px-2">
                    <span className="text-[10px] font-mono truncate">{attachedFile.name}</span>
                    <button onClick={() => setAttachedFile(null)}><X className="size-4" /></button>
                  </div>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center gap-1 w-full">
                    <Paperclip className="size-4 opacity-30" />
                    <span className="text-[8px] font-black uppercase opacity-60">Attach Project Docs</span>
                    <input type="file" className="hidden" onChange={(e) => setAttachedFile(e.target.files?.[0] || null)} />
                  </label>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: CALENDAR */}
        <div className="lg:col-span-7">
          <div className="border-2 border-muted/30 p-8 bg-white h-full flex flex-col shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div className="flex flex-col">
                <h3 className="text-2xl font-black uppercase tracking-tighter italic leading-none">{monthLabel}</h3>
                <span className="text-[8px] font-mono opacity-40 uppercase mt-1 tracking-[0.2em]">Deployment_Schedule</span>
              </div>
              <div className="flex items-center gap-2 bg-muted/10 p-1 border-2 border-muted/20">
                <button onClick={() => handleMonthChange(-1)} disabled={viewDate.getMonth() === today.getMonth() && viewDate.getFullYear() === today.getFullYear()} className="p-2 hover:bg-black hover:text-white transition-colors disabled:opacity-20"><ChevronLeft className="size-4" /></button>
                <div className="w-px h-4 bg-muted/30" />
                <button onClick={() => handleMonthChange(1)} className="p-2 hover:bg-black hover:text-white transition-colors"><ChevronRight className="size-4" /></button>
              </div>
            </div>
            
            <div className="grid grid-cols-7 gap-1 bg-white p-4 border-2 border-muted/20 flex-grow shadow-inner relative">
              {['SUN','MON','TUE','WED','THU','FRI','SAT'].map((d) => (
                <div key={d} className="text-center text-[10px] font-black opacity-40 pb-4">{d}</div>
              ))}
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`pad-${i}`} className="aspect-square opacity-5" />
              ))}
              {Array.from({length: daysInMonth}).map((_, i) => {
                const dayNum = i + 1;
                const dateToCheck = new Date(viewDate.getFullYear(), viewDate.getMonth(), dayNum);
                const isPast = dateToCheck < new Date(today.getFullYear(), today.getMonth(), today.getDate());
                const bookedApp = existingAppointments.find(a => a.day === dayNum);
                const isBusy = !!bookedApp;

                return (
                  <button 
                    key={i} 
                    onClick={() => isBusy ? setViewingDetails(bookedApp) : setSelectedDate(dayNum)}
                    disabled={isPast} 
                    className={cn(
                      "aspect-square flex flex-col items-center justify-center text-[14px] font-mono font-bold transition-all relative border", 
                      selectedDate === dayNum ? "bg-black text-white scale-110 z-10 border-black shadow-lg" : 
                      isPast ? "bg-muted/5 text-muted-foreground/20 cursor-not-allowed border-transparent line-through" : 
                      isBusy ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100" : 
                      "border-transparent hover:bg-primary/5 hover:border-muted/30"
                    )}
                  >
                    <span>{dayNum}</span>
                    {isBusy && !isPast && (
                      <div className="absolute top-1 right-1"><Info className="size-2" /></div>
                    )}
                    {isBusy && !isPast && (
                      <span className="absolute inset-x-0 bottom-0 bg-red-600 text-[6px] text-white font-black text-center py-0.5 tracking-tighter uppercase">Occupied</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-8 border-t-2 border-muted/10 pt-6">
               <div className="grid grid-cols-2 gap-8">
                <div className="space-y-1 text-center">
                  <div className="h-10 border-b-2 border-black flex items-end justify-center">
                    <span className="text-[10px] font-mono font-bold uppercase">{formData.tsa}</span>
                  </div>
                  <label className="text-[9px] font-black uppercase text-muted-foreground block">TSA Approval</label>
                </div>
                <div className="space-y-1 text-center">
                  <div className="h-10 border-b-2 border-black flex items-end justify-center">
                    <span className="text-[10px] font-mono font-bold uppercase">{formData.tsm}</span>
                  </div>
                  <label className="text-[9px] font-black uppercase text-muted-foreground block">TSM Approval</label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER ACTION */}
      <div className="fixed bottom-8 right-8 z-50">
        <button 
            onClick={handleSubmitProtocol} 
            disabled={!isComplete || isSubmitting} 
            className={cn(
                "h-16 px-10 rounded-full font-black uppercase text-xs tracking-widest border-4 border-background flex items-center gap-4 shadow-2xl transition-all", 
                isComplete ? "bg-black text-white hover:bg-zinc-800" : "bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
            )}
        >
          {isSubmitting ? "SYNCING..." : "INITIALIZE PROTOCOL"}
          <Send className="size-5" />
        </button>
      </div>
    </div>
  );
}