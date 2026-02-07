"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useAppointmentData } from "../layout"
import { 
  Paperclip, Send, ChevronLeft, Layers, Navigation, Loader2,
  RefreshCw, ShieldCheck, X, User, ChevronRight, 
  ShieldAlert, Fingerprint, ClipboardList, MapPin, 
  Activity, Info, CheckCircle2, Globe, CalendarSearch
} from "lucide-react"
import { cn } from "@/lib/utils"

// FIREBASE IMPORTS
import { db, storage } from "@/lib/firebase"
import { collection, addDoc, onSnapshot, query, where, serverTimestamp, Timestamp } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"

import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { PageHeader } from "@/components/page-header"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import "leaflet/dist/leaflet.css"

export default function SchedulePage() {
  const router = useRouter();
  
  // 1. EXTRACT HYDRATION & PERSISTED DATA
  const { selectedAssistance, isHydrated } = useAppointmentData();
  
  const today = new Date(2026, 1, 5); 
  const [viewDate, setViewDate] = React.useState(new Date(2026, 1, 1)); 
  const [selectedDate, setSelectedDate] = React.useState<number | null>(null);
  const [viewingDetails, setViewingDetails] = React.useState<any | null>(null);
  
  const [assignedPics, setAssignedPics] = React.useState<any[]>([]);
  const [protocolMetadata, setProtocolMetadata] = React.useState<any[]>([]); 
  const [selectedPic, setSelectedPic] = React.useState<string>(""); // START EMPTY
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

  // 2. PROTOCOL & PIC SYNC (REMOVED AUTO-SELECT)
  React.useEffect(() => {
    if (!isHydrated) return;

    const activeProtocols = selectedAssistance || [];
    if (activeProtocols.length === 0) {
      setIsLoadingSync(false);
      return;
    }

    const q = query(collection(db, "protocols"), where("isActive", "==", true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dbProtocols = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      const matched = dbProtocols.filter((proto: any) => activeProtocols.includes(proto.id));
      setProtocolMetadata(matched);
      
      const uniquePics = Array.from(new Set(matched.flatMap(p => p.pic || []))) as any[];
      setAssignedPics(uniquePics.length > 0 ? uniquePics : ["ENGINEERING_STAFF"]);
      
      // LOGIC: No auto-selection of PIC here.
      setIsLoadingSync(false);
    });
    return () => unsubscribe();
  }, [selectedAssistance, isHydrated]);

  // 3. CALENDAR DATA PERSISTENCE (TRIGGERS ONLY ON SELECTION)
  React.useEffect(() => {
    // If no PIC is selected, clear appointments and abort query
    if (!isHydrated || !selectedPic) {
      setExistingAppointments([]);
      return;
    }

    const startOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1, 0, 0, 0);
    const endOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0, 23, 59, 59);
    
    const q = query(
      collection(db, "appointments"), 
      where("pic", "==", selectedPic), 
      where("appointmentDate", ">=", Timestamp.fromDate(startOfMonth)), 
      where("appointmentDate", "<=", Timestamp.fromDate(endOfMonth))
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const apps = snapshot.docs.map(doc => {
        const data = doc.data();
        const date = data.appointmentDate.toDate();
        return { 
          id: doc.id, 
          day: date.getDate(), 
          month: date.getMonth(), 
          year: date.getFullYear(),
          client: data.client, 
          agenda: data.agenda || "Standard Operational Deployment", 
          status: data.status
        };
      });
      setExistingAppointments(apps);
    }, (error) => { 
      console.error("UPLINK_SYNC_ERROR", error);
    });

    return () => unsubscribe();
  }, [selectedPic, viewDate, isHydrated]);

  // TSA/TSM metadata updates
  React.useEffect(() => {
    if (!selectedPic || !isHydrated) {
       setFormData(prev => ({ ...prev, tsa: "NOT_SET", tsm: "NOT_SET" }));
       return;
    }
    const match = protocolMetadata.find(p => p.pic?.includes(selectedPic) || p.pic?.some((person:any) => person.name === selectedPic));
    if (match) {
      setFormData(prev => ({ ...prev, tsa: match.tsa || "NOT_SET", tsm: match.tsm || "NOT_SET" }));
    }
  }, [selectedPic, protocolMetadata, isHydrated]);

  if (!isHydrated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F9FAFA]">
        <Loader2 className="size-8 animate-spin text-[#121212]/10 mb-4" />
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#121212]/40 italic">
          Initializing_Systems...
        </p>
      </div>
    );
  }

  const isComplete = Boolean(formData.client.trim() && formData.address.trim() && selectedDate !== null && selectedPic !== "");
  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
  const monthLabel = viewDate.toLocaleString('default', { month: 'long', year: 'numeric' }).toUpperCase();

  const handleMonthChange = (offset: number) => {
    const newMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1);
    if (newMonth < new Date(today.getFullYear(), today.getMonth(), 1)) return;
    setViewDate(newMonth);
    setSelectedDate(null);
  };

  const handlePicChange = (name: string) => {
    setSelectedPic(name);
    setSelectedDate(null); // Clear selected date when switching personnel to check new availability
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
        department: "ENGINEERING"
      });
      toast.success("DEPLOYMENT INITIALIZED", { id: toastId });
      setTimeout(() => router.push("/appointments/site-visit"), 1500); 
    } catch (error: any) {
      toast.error("DEPLOYMENT FAILURE", { id: toastId });
    } finally { setIsSubmitting(false); }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F9FAFA] text-[#121212] font-sans pb-24 md:pb-0 animate-in fade-in duration-700">
      
      {/* CONFLICT MODAL */}
      {viewingDetails && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#121212]/80 backdrop-blur-sm">
          <div className="bg-white border border-black/10 w-full max-w-md rounded-lg overflow-hidden shadow-2xl">
            <div className="bg-[#121212] p-4 flex justify-between items-center text-white">
              <span className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                <ShieldAlert className="size-4 text-amber-500" /> Conflict Detected
              </span>
              <button onClick={() => setViewingDetails(null)}><X className="size-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4 p-4 bg-[#F9FAFA] border border-black/5 rounded-md">
                <Fingerprint className="size-6 text-black/40" />
                <div>
                  <p className="text-[10px] font-bold text-black/40 uppercase tracking-tighter">Assigned Personnel</p>
                  <p className="text-sm font-bold uppercase">{selectedPic}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="p-4 border border-black/5 rounded-md">
                  <span className="block text-[8px] font-bold text-black/30 uppercase tracking-widest mb-1">Entity</span>
                  <p className="text-xs font-bold uppercase">{viewingDetails.client}</p>
                </div>
                <div className="p-4 border border-black/5 rounded-md">
                  <span className="block text-[8px] font-bold text-black/30 uppercase tracking-widest mb-1">Scope</span>
                  <p className="text-xs font-medium italic">{viewingDetails.agenda}</p>
                </div>
              </div>
              <Button onClick={() => setViewingDetails(null)} className="w-full bg-[#121212] text-white font-bold uppercase text-[10px] tracking-widest h-12 rounded-none">
                Acknowledge Constraint
              </Button>
            </div>
          </div>
        </div>
      )}

      <PageHeader 
        title="SCHEDULE_DEPLOYMENT" 
        version="STEP: 02" 
        showBackButton={true}
        actions={
          <div className="flex items-center gap-3 px-3 md:px-4 py-2 bg-black/5 border border-black/10 rounded-sm shadow-sm">
            {isLoadingSync ? <RefreshCw className="size-3 animate-spin opacity-40" /> : <ShieldCheck className="size-3 text-emerald-600" />}
            <span className="text-[9px] font-bold uppercase tracking-widest hidden sm:block">System_Sync_Active</span>
          </div>
        }
      />

      <main className="p-4 md:p-10 max-w-7xl mx-auto w-full flex flex-col lg:grid lg:grid-cols-12 gap-8 md:gap-10 pb-32">
        
        {/* RIGHT COLUMN: CALENDAR & OVERVIEW */}
        <div className="lg:col-span-7 order-1 lg:order-2 space-y-6">
          
          <div className="bg-[#121212] p-6 rounded-lg text-white shadow-xl flex flex-col md:flex-row justify-between items-center gap-6 border border-white/5">
            <div className="flex items-center gap-5">
              <div className="p-3 bg-white/10 rounded-full">
                <Activity className="size-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Target Personnel</p>
                <p className="text-lg font-bold uppercase tracking-tighter">{selectedPic || "AWAITING_SELECTION"}</p>
              </div>
            </div>
            <div className="h-px md:h-10 w-full md:w-px bg-white/10" />
            <div className="flex items-center gap-5">
              <div className="p-3 bg-white/10 rounded-full">
                <CheckCircle2 className="size-6 text-blue-400" />
              </div>
              <div>
                <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Status Readiness</p>
                <p className="text-lg font-bold uppercase tracking-tighter">{selectedDate ? `FEB ${selectedDate}, 2026` : "DATE_PENDING"}</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-black/5 p-4 md:p-8 rounded-lg shadow-sm lg:sticky lg:top-10 overflow-hidden">
            {!selectedPic ? (
              // NEUTRAL STATE UI
              <div className="flex flex-col items-center justify-center py-24 space-y-4 text-center">
                <div className="p-6 bg-[#F9FAFA] rounded-full border border-black/5">
                  <CalendarSearch className="size-12 text-black/10" />
                </div>
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#121212]">Deployment Calendar Locked</h4>
                  <p className="text-[9px] font-bold text-black/30 uppercase mt-1">Select Personnel to Synchronize Availability</p>
                </div>
              </div>
            ) : (
              // ACTIVE CALENDAR UI
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="flex items-center justify-between mb-6 md:mb-8">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-black/30 uppercase tracking-[0.2em]">Operational Schedule</span>
                    <h3 className="text-xl md:text-2xl font-bold uppercase tracking-tighter italic">{monthLabel}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => handleMonthChange(-1)} disabled={viewDate.getMonth() === today.getMonth()} className="size-9 md:size-10 rounded border-black/10 hover:bg-black/5"><ChevronLeft className="size-4" /></Button>
                    <Button variant="outline" size="icon" onClick={() => handleMonthChange(1)} className="size-9 md:size-10 rounded border-black/10 hover:bg-black/5"><ChevronRight className="size-4" /></Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-7 gap-1">
                  {['SUN','MON','TUE','WED','THU','FRI','SAT'].map((d) => (
                    <div key={d} className="text-center text-[8px] md:text-[9px] font-bold text-black/20 pb-2 md:pb-4">{d}</div>
                  ))}
                  {Array.from({ length: firstDayOfMonth }).map((_, i) => ( <div key={`pad-${i}`} className="aspect-square" /> ))}
                  {Array.from({length: daysInMonth}).map((_, i) => {
                    const dayNum = i + 1;
                    const isPast = new Date(viewDate.getFullYear(), viewDate.getMonth(), dayNum) < today;
                    const bookedApp = existingAppointments.find(a => a.day === dayNum);
                    const isBusy = !!bookedApp;

                    return (
                      <button 
                        key={i} 
                        onClick={() => isBusy ? setViewingDetails(bookedApp) : setSelectedDate(dayNum)}
                        disabled={isPast} 
                        className={cn(
                          "aspect-square flex flex-col items-center justify-center text-xs font-bold transition-all relative rounded border", 
                          selectedDate === dayNum ? "bg-[#121212] text-white border-black shadow-md z-10" : 
                          isPast ? "bg-[#F9FAFA] text-black/10 border-transparent cursor-not-allowed" : 
                          isBusy ? "bg-red-50 text-red-600 border-red-100" : "bg-white border-black/5 hover:border-black/20"
                        )}
                      >
                        <span>{dayNum}</span>
                        {isBusy && !isPast && <div className="absolute top-1 right-1 size-1 bg-red-500 rounded-full" />}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6 md:mt-10 pt-6 md:pt-8 border-t border-black/5 grid grid-cols-2 gap-4">
                    <div className="p-3 md:p-4 bg-[#F9FAFA] border border-black/5 rounded text-center">
                      <p className="text-[8px] font-bold text-black/30 uppercase mb-1 tracking-tighter">TSA_AUTHORITY</p>
                      <span className="text-[9px] md:text-[10px] font-bold uppercase">{formData.tsa}</span>
                    </div>
                    <div className="p-3 md:p-4 bg-[#F9FAFA] border border-black/5 rounded text-center">
                      <p className="text-[8px] font-bold text-black/30 uppercase mb-1 tracking-tighter">TSM_AUTHORITY</p>
                      <span className="text-[9px] md:text-[10px] font-bold uppercase">{formData.tsm}</span>
                    </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* LEFT COLUMN: FORM DATA */}
        <div className="lg:col-span-5 space-y-6 md:space-y-8 order-2 lg:order-1">
          
          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase text-black/40 tracking-widest flex items-center gap-2">
              <Layers className="size-3" /> Engineering Protocol Stack
            </p>
            <div className="flex flex-wrap gap-2">
              {protocolMetadata?.map((item: any, idx: number) => (
                <div key={idx} className="px-3 py-1.5 bg-white border border-black/10 rounded-sm shadow-sm text-[9px] font-bold uppercase flex items-center gap-2">
                  <div className="size-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" /> {item.label}
                </div>
              ))}
            </div>
          </div>

          <section className="p-4 md:p-6 bg-white border border-black/5 rounded-lg shadow-sm space-y-4 md:space-y-6">
            <div className="flex items-center gap-3 border-b border-black/5 pb-4">
              <User className="size-4 text-black/30" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Resource Allocation</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {assignedPics.map((picData, i) => {
                const name = typeof picData === 'string' ? picData : picData.name;
                const isSelected = selectedPic === name;
                
                return (
                  <button 
                    key={i} onClick={() => handlePicChange(name)} 
                    className={cn(
                      "w-full text-left px-4 py-3 rounded-md border transition-all font-bold uppercase text-[10px] tracking-widest flex justify-between items-center group", 
                      isSelected ? "bg-[#121212] text-white border-black shadow-lg" : "bg-white border-black/5 hover:border-black/20 shadow-sm"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8 rounded-lg border border-black/5 grayscale group-hover:grayscale-0 transition-all shadow-sm">
                        <AvatarImage src={picData.profilePicture} className="object-cover" />
                        <AvatarFallback className={cn("text-[10px] font-black", isSelected ? "bg-white text-black" : "bg-[#121212] text-white")}>
                          {name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      {name}
                    </div>
                    {isSelected && <Info className="size-3 text-white/40" />}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Registry, Geospatial, and File Attachment sections remain identical */}
          <section className="space-y-6">
            <div className="p-4 md:p-6 bg-white border border-black/5 rounded-lg shadow-sm space-y-5">
              <div className="flex items-center gap-3 border-b border-black/5 pb-4">
                <ClipboardList className="size-4 text-black/30" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Operational Registry</span>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold uppercase text-black/50 ml-1">Client / Entity Identifier*</label>
                <Input className="rounded-md border-black/10 text-xs font-bold uppercase h-12 bg-[#F9FAFA]/50 focus:bg-white" placeholder="ID: REGISTERED NAME..." value={formData.client} onChange={e => setFormData({...formData, client: e.target.value})} />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-bold uppercase text-black/50 ml-1">Operational Objective</label>
                <Input className="rounded-md border-black/10 text-xs font-bold uppercase h-12 bg-[#F9FAFA]/50 focus:bg-white" placeholder="SPECIFY GOAL..." value={formData.agenda} onChange={e => setFormData({...formData, agenda: e.target.value})} />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-bold uppercase text-black/50 ml-1">Deployment Briefing</label>
                <Textarea className="rounded-md border-black/10 text-xs font-bold uppercase min-h-[100px] bg-[#F9FAFA]/50 focus:bg-white" placeholder="SUPPLEMENTAL PROTOCOLS..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
              </div>
            </div>

            <div className="p-4 md:p-6 bg-white border border-black/5 rounded-lg shadow-sm space-y-5">
              <div className="flex items-center gap-3 border-b border-black/5 pb-4">
                <MapPin className="size-4 text-black/30" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Geospatial Logistics</span>
              </div>

              <div className="w-full h-32 bg-[#F9FAFA] border border-black/5 rounded-md flex flex-col items-center justify-center gap-2 overflow-hidden relative group">
                <Globe className="size-8 text-black/10 group-hover:text-blue-500/20 transition-colors" />
                <span className="text-[8px] font-bold text-black/20 uppercase tracking-widest">Waiting for Coordinate Lock</span>
                {coords && <div className="absolute inset-0 bg-blue-500/5 flex items-center justify-center"><CheckCircle2 className="size-6 text-blue-500" /></div>}
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[9px] font-bold uppercase text-black/50 ml-1">Deployment Address*</label>
                  <button onClick={handleVerifyMap} className="text-[9px] font-bold uppercase flex items-center gap-1.5 hover:text-blue-600 transition-colors">
                    {isGeocoding ? <Loader2 className="size-3 animate-spin" /> : <Navigation className="size-3" />} Verify Lock
                  </button>
                </div>
                <Textarea className="rounded-md border-black/10 text-xs font-bold uppercase h-20 bg-[#F9FAFA]/50" placeholder="LOCATION COORDINATES..." value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-bold uppercase text-black/50 ml-1">Site Landmark</label>
                <Input className="rounded-md border-black/10 text-xs font-bold uppercase h-12 bg-[#F9FAFA]/50" placeholder="VISUAL REFERENCE..." value={formData.landmark} onChange={e => setFormData({...formData, landmark: e.target.value})} />
              </div>
            </div>

            <div className="p-6 border-2 border-dashed border-black/10 rounded-lg bg-white/40 text-center hover:bg-white hover:border-black/20 transition-all shadow-sm">
              {attachedFile ? (
                <div className="flex items-center justify-between bg-white p-3 border border-black/10 rounded shadow-sm">
                  <span className="text-[10px] font-bold uppercase truncate max-w-[200px]">{attachedFile.name}</span>
                  <button onClick={() => setAttachedFile(null)} className="text-red-500 hover:scale-110 transition-transform"><X className="size-4" /></button>
                </div>
              ) : (
                <label className="cursor-pointer flex flex-col items-center gap-2 py-4 group">
                  <Paperclip className="size-5 text-black/20 group-hover:text-black/40 transition-colors" />
                  <span className="text-[9px] font-bold uppercase text-black/40 tracking-widest">Attach Deployment Manifest</span>
                  <input type="file" className="hidden" onChange={(e) => setAttachedFile(e.target.files?.[0] || null)} />
                </label>
              )}
            </div>
          </section>
        </div>
      </main>

      <div className="fixed bottom-6 right-4 left-4 md:left-auto md:bottom-8 md:right-8 z-[60]">
        <Button 
          onClick={handleSubmitProtocol} 
          disabled={!isComplete || isSubmitting} 
          className={cn(
            "w-full md:w-auto h-16 px-10 rounded-full font-bold uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-4 shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/10 transition-all", 
            isComplete ? "bg-[#121212] text-white hover:bg-black hover:scale-105 active:scale-95" : "bg-[#121212]/10 text-black/20 cursor-not-allowed"
          )}
        >
          {isSubmitting ? "Processing..." : "Confirm Deployment"}
          {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </Button>
      </div>
    </div>
  );
}