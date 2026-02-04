"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useAppointmentData } from "../layout"
import { 
  Paperclip, Send, ChevronLeft, Layers, Navigation, Loader2,
  RefreshCw, ShieldCheck, X, User, AlertTriangle,
  ChevronRight, Info, ShieldAlert, Fingerprint,
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
  
  const today = new Date(2026, 1, 2); 
  const [viewDate, setViewDate] = React.useState(new Date(2026, 1, 1)); 
  const [selectedDate, setSelectedDate] = React.useState<number | null>(null);
  const [viewingDetails, setViewingDetails] = React.useState<any | null>(null);
  
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
    notes: "", 
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

  // LOGIC FIX: Matching protocols by ID instead of Label string
  React.useEffect(() => {
    const q = query(collection(db, "protocols"), where("isActive", "==", true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dbProtocols = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      
      // Filter based on the selectedAssistance IDs from Step 01
      const matched = dbProtocols.filter((proto: any) => 
        selectedAssistance?.includes(proto.id)
      );

      setProtocolMetadata(matched);
      const uniquePics = Array.from(new Set(matched.flatMap(p => p.pic || []))) as string[];
      const finalPics = uniquePics.length > 0 ? uniquePics : ["ENGINEERING_STAFF"];
      setAssignedPics(finalPics);
      
      if (!selectedPic || !finalPics.includes(selectedPic)) {
        const initialPic = finalPics[0];
        setSelectedPic(initialPic);
        const match = matched.find(p => p.pic?.includes(initialPic));
        if (match) {
            setFormData(prev => ({ 
                ...prev, 
                tsa: match.tsa || "NOT_SET", 
                tsm: match.tsm || "NOT_SET" 
            }));
        }
      }
      setIsLoadingSync(false);
    });
    return () => unsubscribe();
  }, [selectedAssistance]);

  React.useEffect(() => {
    if (!selectedPic) return;
    const start = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const end = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
    
    const q = query(
      collection(db, "appointments"), 
      where("pic", "==", selectedPic), 
      where("appointmentDate", ">=", start), 
      where("appointmentDate", "<=", end)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const apps = snapshot.docs.map(doc => ({ 
        day: doc.data().appointmentDate.toDate().getDate(),
        client: doc.data().client,
        agenda: doc.data().agenda || "Standard Operational Deployment",
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
    const toastId = toast.loading("SYNCHRONIZING OPERATIONAL DATA...");
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
        createdAt: serverTimestamp(),
        department: "ENGINEERING" // Constraint applied
      });
      toast.success("DEPLOYMENT INITIALIZED", { id: toastId });
      setTimeout(() => router.push("/appointments/site-visit"), 1500); 
    } catch (error: any) {
      toast.error("DEPLOYMENT FAILURE", { id: toastId });
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
      {/* CONFLICT MODAL */}
      {viewingDetails && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white border-[3px] border-black w-full max-w-md shadow-none md:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
            <div className="bg-black p-4 flex justify-between items-center text-white font-black uppercase tracking-widest text-[10px]">
              <div className="flex items-center gap-2"><ShieldAlert className="size-4 text-red-500" /> SCHEDULE_CONFLICT</div>
              <button onClick={() => setViewingDetails(null)}><X className="size-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4 pb-4 border-b-2">
                <div className="bg-red-50 p-2 border-2 border-red-100"><Fingerprint className="size-8 text-red-600" /></div>
                <div>
                  <h4 className="text-lg font-black uppercase italic">{selectedPic}</h4>
                  <p className="text-[9px] font-mono opacity-50 uppercase">Asset Allocation Conflict</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="bg-muted/30 p-3 border border-muted/50 font-mono text-xs uppercase font-bold">
                  <span className="block text-[8px] opacity-40 mb-1 tracking-widest">Account_Entity</span>
                  {viewingDetails.client}
                </div>
                <div className="bg-muted/30 p-3 border border-muted/50 font-mono text-xs uppercase italic">
                  <span className="block text-[8px] opacity-40 mb-1 tracking-widest">Operational_Scope</span>
                  {viewingDetails.agenda}
                </div>
              </div>
            </div>
            <button onClick={() => setViewingDetails(null)} className="w-full bg-black text-white py-4 font-black uppercase text-[10px] tracking-[0.3em]">Acknowledge Constraint</button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="flex h-16 shrink-0 items-center px-4 border-b-2 border-muted/30 sticky top-0 bg-background z-20 justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-muted/50 rounded-sm transition-colors"><ChevronLeft className="size-5" /></button>
          <div className="flex flex-col min-w-0">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-primary italic leading-none truncate">Step 02 // Deployment</h2>
            <span className="text-[8px] font-mono opacity-40 uppercase mt-1">Registry_Linked</span>
          </div>
        </div>
        <div className="flex items-center gap-2 px-2 py-1.5 border-2 border-primary/10 bg-primary/5 shrink-0">
          {isLoadingSync ? <RefreshCw className="size-3 animate-spin text-primary" /> : <ShieldCheck className="size-3 text-green-500" />}
          <span className="text-[9px] font-black uppercase text-primary hidden sm:inline">System_Online</span>
        </div>
      </header>

      <main className="p-4 md:p-8 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 pb-32 md:pb-8">
        
        {/* RIGHT COLUMN (CALENDAR) */}
        <div className="lg:col-span-7 order-1 lg:order-2">
          <div className="border-2 border-muted/30 p-4 md:p-8 bg-white h-full flex flex-col shadow-sm">
            <div className="flex items-center justify-between mb-6 md:mb-8">
              <div className="flex flex-col">
                <h3 className="text-xl md:text-2xl font-black uppercase tracking-tighter italic leading-none">{monthLabel}</h3>
                <span className="text-[8px] font-mono opacity-40 uppercase mt-1 tracking-[0.2em]">Deployment_Schedule: {selectedPic}</span>
              </div>
              <div className="flex items-center gap-2 bg-muted/10 p-1 border-2 border-muted/20">
                <button onClick={() => handleMonthChange(-1)} disabled={viewDate.getMonth() === today.getMonth() && viewDate.getFullYear() === today.getFullYear()} className="p-2 hover:bg-black hover:text-white transition-colors disabled:opacity-20"><ChevronLeft className="size-4" /></button>
                <div className="w-px h-4 bg-muted/30" />
                <button onClick={() => handleMonthChange(1)} className="p-2 hover:bg-black hover:text-white transition-colors"><ChevronRight className="size-4" /></button>
              </div>
            </div>
            
            <div className="grid grid-cols-7 gap-1 bg-white p-2 md:p-4 border-2 border-muted/20 flex-grow shadow-inner relative">
              {['S','M','T','W','T','F','S'].map((d, i) => (
                <div key={i} className="text-center text-[9px] font-black opacity-40 pb-2">{d}</div>
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
                      "aspect-square flex flex-col items-center justify-center text-[12px] md:text-[14px] font-mono font-bold transition-all relative border", 
                      selectedDate === dayNum ? "bg-black text-white z-10 border-black" : 
                      isPast ? "bg-muted/5 text-muted-foreground/20 cursor-not-allowed border-transparent" : 
                      isBusy ? "bg-red-50 text-red-700 border-red-200" : 
                      "border-transparent hover:bg-primary/5"
                    )}
                  >
                    <span>{dayNum}</span>
                    {isBusy && !isPast && (
                      <span className="absolute inset-x-0 bottom-0 bg-red-600 text-[5px] text-white font-black text-center py-0.5 tracking-tighter uppercase">Allocated</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 border-t-2 border-muted/10 pt-6">
               <div className="grid grid-cols-2 gap-4 md:gap-8">
                <div className="space-y-1 text-center">
                  <div className="h-8 border-b-2 border-black flex items-end justify-center">
                    <span className="text-[9px] md:text-[10px] font-mono font-bold uppercase truncate">{formData.tsa}</span>
                  </div>
                  <label className="text-[8px] font-black uppercase text-muted-foreground block">TSA Auth</label>
                </div>
                <div className="space-y-1 text-center">
                  <div className="h-8 border-b-2 border-black flex items-end justify-center">
                    <span className="text-[9px] md:text-[10px] font-mono font-bold uppercase truncate">{formData.tsm}</span>
                  </div>
                  <label className="text-[8px] font-black uppercase text-muted-foreground block">TSM Auth</label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* LEFT COLUMN (FORM) */}
        <div className="lg:col-span-5 space-y-6 order-2 lg:order-1">
          <div className="space-y-2">
            <p className="text-[8px] font-black uppercase text-primary tracking-widest flex items-center gap-2"><Layers className="size-3" /> Active Protocol Stack</p>
            <div className="flex flex-wrap gap-2">
              {protocolMetadata?.map((item: any, idx: number) => (
                <span key={idx} className="px-2 py-1 bg-muted text-[9px] font-mono font-bold uppercase border border-muted-foreground/10">{item.label}</span>
              ))}
            </div>
          </div>

          <section className="p-4 border-2 border-muted/30 bg-muted/5 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-full bg-muted flex items-center justify-center border-2 border-muted-foreground/20"><User className="size-4 text-muted-foreground/50" /></div>
              <div className="flex flex-col">
                <span className="text-[8px] font-black uppercase opacity-40 leading-none">Resource Allocation</span>
                <span className="text-[9px] font-bold italic opacity-60">Officer in Charge</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {assignedPics.map((name, i) => (
                <button key={i} onClick={() => handlePicChange(name)} className={cn("flex-1 text-[10px] font-black uppercase px-3 py-2.5 border-2 transition-all", selectedPic === name ? "bg-black text-white border-black" : "bg-white border-muted/50")}>{name}</button>
              ))}
            </div>
          </section>

          <section className="space-y-6">
            <div className="space-y-4">
                <p className="text-[8px] font-black uppercase text-primary flex items-center gap-2 opacity-50"><ClipboardList className="size-3"/> Account ID</p>
                <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-primary">Entity Designation*</label>
                    <input className="w-full bg-white border-2 border-muted/50 p-3 text-xs uppercase font-mono outline-none focus:border-primary rounded-none" placeholder="REGISTERED NAME..." value={formData.client} onChange={e => setFormData({...formData, client: e.target.value})} />
                </div>
                <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-primary">Operational Objective</label>
                    <input className="w-full bg-white border-2 border-muted/50 p-3 text-xs uppercase font-mono outline-none focus:border-primary rounded-none" placeholder="MISSION GOAL..." value={formData.agenda} onChange={e => setFormData({...formData, agenda: e.target.value})} />
                </div>
                <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-primary">Deployment Briefing</label>
                    <textarea className="w-full bg-white border-2 border-muted/50 p-3 text-xs uppercase font-mono outline-none focus:border-primary rounded-none" rows={3} placeholder="SUPPLEMENTAL NOTES..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
                </div>
            </div>

            <div className="space-y-4 pt-4 border-t-2 border-muted/10">
                <p className="text-[8px] font-black uppercase text-primary flex items-center gap-2 opacity-50"><MapPin className="size-3"/> Geospatial Data</p>
                <div className="space-y-1">
                    <div className="flex justify-between items-end">
                        <label className="text-[9px] font-black uppercase text-primary">Deployment Address*</label>
                        <button onClick={handleVerifyMap} className="text-[8px] font-bold uppercase text-primary flex items-center gap-1 p-1">
                        {isGeocoding ? <Loader2 className="size-2.5 animate-spin" /> : <Navigation className="size-2.5" />} Validate
                        </button>
                    </div>
                    <textarea className="w-full bg-white border-2 border-muted/50 p-3 text-xs uppercase font-mono outline-none focus:border-primary rounded-none" rows={2} placeholder="LOCATION..." value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                </div>
                <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-primary">Site Landmark</label>
                    <input className="w-full bg-white border-2 border-muted/50 p-3 text-xs uppercase font-mono outline-none focus:border-primary rounded-none" placeholder="REFERENCE POINT..." value={formData.landmark} onChange={e => setFormData({...formData, landmark: e.target.value})} />
                </div>
            </div>

            <div className="space-y-1 pt-4">
              <label className="text-[9px] font-black uppercase text-primary">Project Documentation</label>
              <div className={cn("border-2 border-dashed p-6 flex flex-col items-center justify-center transition-all", attachedFile ? "bg-green-500/5 border-green-500/40" : "bg-muted/5 border-muted/50")}>
                {attachedFile ? (
                  <div className="flex items-center justify-between w-full px-2">
                    <span className="text-[9px] font-mono truncate">{attachedFile.name}</span>
                    <button onClick={() => setAttachedFile(null)}><X className="size-4" /></button>
                  </div>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center gap-1 w-full">
                    <Paperclip className="size-5 opacity-30" />
                    <span className="text-[8px] font-black uppercase opacity-60">Upload Docs</span>
                    <input type="file" className="hidden" onChange={(e) => setAttachedFile(e.target.files?.[0] || null)} />
                  </label>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* FOOTER ACTION */}
      <div className="fixed bottom-0 left-0 right-0 md:bottom-8 md:right-8 md:left-auto z-50 bg-background md:bg-transparent p-4 md:p-0 border-t-2 md:border-none border-muted/20">
        <button 
            onClick={handleSubmitProtocol} 
            disabled={!isComplete || isSubmitting} 
            className={cn(
                "w-full md:w-auto h-14 md:h-16 px-10 rounded-none md:rounded-full font-black uppercase text-[10px] md:text-xs tracking-widest flex items-center justify-center gap-4 shadow-xl transition-all", 
                isComplete ? "bg-black text-white" : "bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
            )}
        >
          {isSubmitting ? "SYNCHRONIZING..." : "INITIALIZE DEPLOYMENT"}
          <Send className="size-4 md:size-5" />
        </button>
      </div>
    </div>
  );
}