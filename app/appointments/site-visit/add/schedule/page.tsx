"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useAppointmentData } from "../layout"
import { AppSidebar } from "@/components/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { 
  Paperclip, Send, ChevronLeft, Layers, Navigation, Loader2,
  RefreshCw, ShieldCheck, X, User, ChevronRight, 
  ShieldAlert, Fingerprint, ClipboardList, MapPin, 
  Activity, Info, CheckCircle2, Globe, CalendarSearch,
  User2, Sparkles, Search, Check, ChevronDown,
  HardHat
} from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

// FIREBASE IMPORTS
import { db } from "@/lib/firebase"
import { collection, addDoc, onSnapshot, query, where, serverTimestamp, Timestamp, getDocs } from "firebase/firestore"

import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { sendPushNotification, NotificationTemplates } from "@/lib/notification-service"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { PageHeader } from "@/components/page-header"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import "leaflet/dist/leaflet.css"

export default function SchedulePage() {
  const router = useRouter();
  const [userId, setUserId] = React.useState<string>("");

  React.useEffect(() => {
    setUserId(localStorage.getItem("userId") || "");
  }, []);
  
  // 1. EXTRACT HYDRATION & PERSISTED DATA
  const { 
    selectedAssistance, 
    personnel,
    ppe,
    permits,
    isHydrated 
  } = useAppointmentData();
  
  const today = new Date(2026, 1, 5); 
  const [viewDate, setViewDate] = React.useState(new Date(2026, 1, 1)); 
  const [selectedDate, setSelectedDate] = React.useState<number | null>(null);
  const [viewingDetails, setViewingDetails] = React.useState<any | null>(null);
  
  const [assignedPics, setAssignedPics] = React.useState<any[]>([]);
  const [protocolMetadata, setProtocolMetadata] = React.useState<any[]>([]); 
  const [selectedPic, setSelectedPic] = React.useState<string>(""); 
  const [isLoadingSync, setIsLoadingSync] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isGeocoding, setIsGeocoding] = React.useState(false);
  const [coords, setCoords] = React.useState<[number, number] | null>(null);
  const [attachedFile, setAttachedFile] = React.useState<File | null>(null);
  const [existingAppointments, setExistingAppointments] = React.useState<any[]>([]);
  const [blockedSlots, setBlockedSlots] = React.useState<any[]>([]);

  // ADDRESS DROPDOWN STATES
  const [addressOptions, setAddressOptions] = React.useState<string[]>([]);
  const [openAddress, setOpenAddress] = React.useState(false);

  const [formData, setFormData] = React.useState({ 
    client: "", 
    address: "", 
    landmark: "",
    agenda: "",
    notes: "", 
    tsa: "NOT_SET", 
    tsm: "NOT_SET"  
  });

  // FETCH HISTORICAL ADDRESSES
  React.useEffect(() => {
    const fetchAddresses = async () => {
      try {
        const q = query(collection(db, "appointments"), where("department", "==", "ENGINEERING"));
        const snap = await getDocs(q);
        const addresses = Array.from(new Set(snap.docs.map(doc => doc.data().address))).filter(Boolean) as string[];
        setAddressOptions(addresses);
      } catch (err) { console.error(err); }
    };
    fetchAddresses();
  }, []);

  // 2. PROTOCOL & PIC SYNC
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
      
      setIsLoadingSync(false);
    });
    return () => unsubscribe();
  }, [selectedAssistance, isHydrated]);

  // 3. CALENDAR DATA PERSISTENCE
  React.useEffect(() => {
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

  // 4. BLOCKED SLOTS SYNC
  React.useEffect(() => {
    if (!isHydrated || !selectedPic) {
      setBlockedSlots([]);
      return;
    }

    // We fetch all blocked slots for the selected personnel (PIC)
    // The slots page now saves userName in the block document
    const q = query(
      collection(db, "blocked_slots"),
      where("userName", "==", selectedPic)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const slots = snapshot.docs.map(doc => {
        const data = doc.data();
        const date = new Date(data.dateString);
        return {
          id: doc.id,
          day: date.getDate(),
          month: date.getMonth(),
          year: date.getFullYear(),
          shiftScope: data.shiftScope,
          justification: data.justification
        };
      });
      setBlockedSlots(slots);
    });

    return () => unsubscribe();
  }, [selectedPic, isHydrated]);

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
    setSelectedDate(null);
  };

  const handleVerifyMap = async () => {
    if (formData.address.trim().length < 5) return;
    setIsGeocoding(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formData.address)}&addressdetails=1&limit=1`);
      const data = await res.json();
      if (data?.[0]) {
        setCoords([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
        toast.success("Location verified and pinned.");
      } else {
        toast.error("Could not find the address. Please try a more specific location.");
      }
    } catch (err) { 
      console.error(err);
      toast.error("Map verification failed.");
    } 
    finally { setIsGeocoding(false); }
  };

  const handleDirectUpload = async (file: File) => {
    const data = new FormData();
    data.append("file", file);
    data.append("upload_preset", "Xchire"); 

    try {
      const res = await fetch("https://api.cloudinary.com/v1_1/dhczsyzcz/image/upload", {
        method: "POST",
        body: data,
      });
      const json = await res.json();
      return json.secure_url;
    } catch (error) {
      console.error(`Cloudinary Error: ${error}`);
      return null;
    }
  };

  const handleSubmitProtocol = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const toastId = toast.loading("SYNCHRONIZING OPERATIONAL DATA...");
    
    // FETCH SUBMITTING USER ID
    const currentUserId = localStorage.getItem("userId");

    try {
      let fileUrl = "";
      if (attachedFile) {
        fileUrl = await handleDirectUpload(attachedFile);
        if (!fileUrl) throw new Error("Upload failed");
      }
      
      const appointmentDateObj = new Date(viewDate.getFullYear(), viewDate.getMonth(), selectedDate as number);
      
      await addDoc(collection(db, "appointments"), {
        ...formData, 
        pic: selectedPic, 
        appointmentDate: Timestamp.fromDate(appointmentDateObj),
        protocols: selectedAssistance || [], 
        personnel: personnel || [],
        ppe: ppe || [],
        permits: permits || [],
        fileUrl, 
        coordinates: coords, 
        status: "PENDING",
        createdAt: serverTimestamp(), 
        department: "ENGINEERING",
        submittedBy: currentUserId 
      });

      // Clear local storage context after successful submission
      localStorage.removeItem("eng_selected_assistance");
      localStorage.removeItem("eng_other_spec");
      localStorage.removeItem("eng_personnel");
      localStorage.removeItem("eng_ppe");
      localStorage.removeItem("eng_permits");

      toast.success("DEPLOYMENT INITIALIZED", { id: toastId });

      // Send push notification
      const notifResult = await sendPushNotification(
        NotificationTemplates.siteVisit.created(formData.client, selectedDate ? selectedDate.toString() : "scheduled date")
      );
      if (notifResult.success && notifResult.successCount! > 0) {
        console.log(`Push sent to ${notifResult.successCount} devices`);
      }

      setTimeout(() => router.push("/appointments/site-visit"), 1500); 
    } catch (error: any) {
      toast.error("DEPLOYMENT FAILURE", { id: toastId });
    } finally { setIsSubmitting(false); }
  };

  return (
    <>
      <AppSidebar userId={userId} />
      <SidebarInset className="bg-[#F9FAFA] pb-24 md:pb-10 min-h-screen m-0 rounded-none border-none shadow-none overflow-visible">
        
        {/* CONFLICT MODAL */}
        {viewingDetails && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#121212]/80 backdrop-blur-sm">
            <div className="bg-white border border-black/10 w-full max-w-md rounded-lg overflow-hidden shadow-2xl">
              <div className="bg-[#121212] p-4 flex justify-between items-center text-white">
                <span className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                  <ShieldAlert className="size-4 text-amber-500" /> {viewingDetails.isBlock ? "Personnel Unavailable" : "Conflict Detected"}
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
                    <span className="block text-[8px] font-bold text-black/30 uppercase tracking-widest mb-1">{viewingDetails.isBlock ? "Constraint Type" : "Entity"}</span>
                    <p className="text-xs font-bold uppercase">{viewingDetails.client}</p>
                  </div>
                  <div className="p-4 border border-black/5 rounded-md">
                    <span className="block text-[8px] font-bold text-black/30 uppercase tracking-widest mb-1">{viewingDetails.isBlock ? "Reason / Justification" : "Scope"}</span>
                    <p className="text-xs font-medium italic">{viewingDetails.agenda}</p>
                  </div>
                </div>
                <Button onClick={() => setViewingDetails(null)} className="w-full bg-[#121212] text-white font-bold uppercase text-[10px] tracking-widest h-12 rounded-none">
                  {viewingDetails.isBlock ? "Acknowledge Unavailability" : "Acknowledge Constraint"}
                </Button>
              </div>
            </div>
          </div>
        )}

        <PageHeader 
          title="PICK A DATE & PERSON" 
          version="V2.8" 
          showBackButton={true}
          trigger={<SidebarTrigger className="mr-2" />}
          actions={
            <div className="flex items-center gap-3 px-3 py-1 bg-zinc-50 border border-zinc-200 rounded-lg">
              {isLoadingSync ? (
                <Loader2 className="size-3 animate-spin text-zinc-400" />
              ) : (
                <ShieldCheck className="size-3 text-emerald-600" />
              )}
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-900">
                Step 2 of 4
              </span>
            </div>
          }
        />

        <main className="p-4 md:p-6 max-w-7xl mx-auto w-full flex flex-col lg:grid lg:grid-cols-12 gap-6 pb-32">
          
          {/* RIGHT COLUMN: CALENDAR & OVERVIEW */}
          <div className="lg:col-span-7 order-1 lg:order-2 space-y-4">
            <div className="bg-zinc-900 p-5 rounded-[24px] text-white shadow-xl flex flex-col md:flex-row justify-between items-center gap-6 border border-zinc-800">
              <div className="flex items-center gap-4">
                <div className="size-10 bg-white/10 rounded-xl flex items-center justify-center text-white">
                  <User2 size={20} />
                </div>
                <div>
                  <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1.5">Who's Going?</p>
                  <p className="text-[15px] font-black uppercase tracking-tight leading-none">{selectedPic || "Pick someone..."}</p>
                </div>
              </div>
              <div className="h-px md:h-8 w-full md:w-px bg-zinc-800" />
              <div className="flex items-center gap-4">
                <div className="size-10 bg-white/10 rounded-xl flex items-center justify-center text-white">
                  <CalendarSearch size={20} />
                </div>
                <div>
                  <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1.5">Selected Date</p>
                  <p className="text-[15px] font-black uppercase tracking-tight leading-none">
                    {selectedDate ? format(new Date(viewDate.getFullYear(), viewDate.getMonth(), selectedDate), "MMM dd, yyyy") : "Pick a date..."}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-zinc-200/60 p-5 md:p-6 rounded-[32px] shadow-sm lg:sticky lg:top-20 overflow-hidden">
              {!selectedPic ? (
                <div className="flex flex-col items-center justify-center py-24 space-y-4 text-center">
                  <div className="size-20 bg-zinc-50 rounded-[32px] border border-zinc-100 flex items-center justify-center">
                    <CalendarSearch className="size-10 text-zinc-200" />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-black uppercase tracking-widest text-zinc-900">Calendar Locked</h4>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase mt-1.5 leading-relaxed max-w-[200px] mx-auto">
                      Please select a person on the left to see their availability.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-[15px] font-black text-zinc-900 uppercase tracking-tight">{monthLabel}</h3>
                      <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">Operational Schedule</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button variant="outline" size="sm" onClick={() => handleMonthChange(-1)} disabled={viewDate.getMonth() === today.getMonth()} className="size-9 p-0 rounded-xl border-zinc-200 hover:bg-zinc-50"><ChevronLeft className="size-4" /></Button>
                      <Button variant="outline" size="sm" onClick={() => handleMonthChange(1)} className="size-9 p-0 rounded-xl border-zinc-200 hover:bg-zinc-50"><ChevronRight className="size-4" /></Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-7 gap-1.5">
                    {['SUN','MON','TUE','WED','THU','FRI','SAT'].map((d) => (
                      <div key={d} className="text-center text-[9px] font-black text-zinc-400 pb-2 uppercase tracking-widest">{d}</div>
                    ))}
                    {Array.from({ length: firstDayOfMonth }).map((_, i) => ( <div key={`pad-${i}`} className="aspect-square" /> ))}
                    {Array.from({length: daysInMonth}).map((_, i) => {
                      const dayNum = i + 1;
                      const isPast = new Date(viewDate.getFullYear(), viewDate.getMonth(), dayNum) < today;
                      
                      const bookedApp = existingAppointments.find(a => a.day === dayNum && a.month === viewDate.getMonth() && a.year === viewDate.getFullYear());
                      const blockedSlot = blockedSlots.find(s => s.day === dayNum && s.month === viewDate.getMonth() && s.year === viewDate.getFullYear());
                      
                      const isBusy = !!bookedApp;
                      const isBlocked = !!blockedSlot;

                      return (
                        <button 
                          key={i} 
                          onClick={() => {
                            if (isBusy) setViewingDetails(bookedApp);
                            else if (isBlocked) setViewingDetails({ client: "PERSONNEL_UNAVAILABLE", agenda: blockedSlot.justification, isBlock: true });
                            else setSelectedDate(dayNum);
                          }}
                          disabled={isPast} 
                          className={cn(
                            "aspect-square flex flex-col items-center justify-center text-[13px] font-black transition-all relative rounded-xl border", 
                            selectedDate === dayNum ? "bg-zinc-900 text-white border-zinc-900 shadow-md z-10 scale-105" : 
                            isPast ? "bg-zinc-50 text-zinc-200 border-transparent cursor-not-allowed opacity-50" : 
                            isBusy ? "bg-red-50 text-red-600 border-red-100" : 
                            isBlocked ? "bg-amber-50 text-amber-600 border-amber-100" :
                            "bg-white border-zinc-100 hover:border-zinc-300 hover:bg-zinc-50"
                          )}
                        >
                          <span>{dayNum}</span>
                          {isBusy && !isPast && <div className="absolute top-1 right-1 size-1.5 bg-red-500 rounded-full border border-white" />}
                          {isBlocked && !isPast && <div className="absolute top-1 right-1 size-1.5 bg-amber-500 rounded-full border border-white" />}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-8 pt-6 border-t border-zinc-100 grid grid-cols-2 gap-3">
                      <div className="p-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-center group">
                        <p className="text-[8px] font-black text-zinc-400 uppercase mb-1.5 tracking-widest leading-none">TSA Approval</p>
                        <span className="text-[11px] font-black uppercase text-zinc-900 leading-none">{formData.tsa || "—"}</span>
                      </div>
                      <div className="p-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-center group">
                        <p className="text-[8px] font-black text-zinc-400 uppercase mb-1.5 tracking-widest leading-none">TSM Approval</p>
                        <span className="text-[11px] font-black uppercase text-zinc-900 leading-none">{formData.tsm || "—"}</span>
                      </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* LEFT COLUMN: FORM DATA */}
          <div className="lg:col-span-5 space-y-6 order-2 lg:order-1">
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest flex items-center gap-2 px-1">
                <Sparkles className="size-3 text-zinc-400" /> Requirements Selected
              </p>
              <div className="flex flex-wrap gap-2">
                {protocolMetadata?.map((item: any, idx: number) => (
                  <div key={idx} className="px-3 py-1.5 bg-white border border-zinc-200/60 rounded-xl shadow-sm text-[10px] font-black uppercase flex items-center gap-2">
                    <div className="size-1.5 rounded-full bg-blue-500 shadow-lg shadow-blue-200" /> 
                    {item.label}
                  </div>
                ))}
                {personnel?.map((item: string, idx: number) => (
                  <div key={`p-${idx}`} className="px-3 py-1.5 bg-amber-50 border border-amber-100 rounded-xl shadow-sm text-[10px] font-black uppercase flex items-center gap-2 text-amber-700">
                    <User2 className="size-3" /> 
                    {item}
                  </div>
                ))}
                {ppe?.map((item: string, idx: number) => (
                  <div key={`ppe-${idx}`} className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl shadow-sm text-[10px] font-black uppercase flex items-center gap-2 text-white">
                    <HardHat className="size-3" /> 
                    {item}
                  </div>
                ))}
                {permits?.map((item: string, idx: number) => (
                  <div key={`perm-${idx}`} className="px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-xl shadow-sm text-[10px] font-black uppercase flex items-center gap-2 text-emerald-700">
                    <ClipboardList className="size-3" /> 
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <section className="p-5 bg-white border border-zinc-200/60 rounded-[28px] shadow-sm space-y-5">
              <div className="flex items-center gap-3 border-b border-zinc-50 pb-4">
                <div className="size-8 bg-zinc-900 rounded-lg flex items-center justify-center text-white">
                  <User2 size={16} />
                </div>
                <span className="text-[11px] font-black uppercase tracking-tight text-zinc-900">Resource Allocation</span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {assignedPics.map((picData, i) => {
                  const name = typeof picData === 'string' ? picData : picData.name;
                  const isSelected = selectedPic === name;
                  return (
                    <button 
                      key={i} onClick={() => handlePicChange(name)} 
                      className={cn(
                        "w-full text-left px-4 py-3 rounded-2xl border transition-all flex justify-between items-center group active:scale-[0.98]", 
                        isSelected 
                          ? "bg-zinc-900 text-white border-zinc-900 shadow-lg" 
                          : "bg-zinc-50/50 border-zinc-100 hover:border-zinc-300 hover:bg-white"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="size-9 rounded-xl border border-white/10 shadow-sm overflow-hidden">
                          <AvatarImage src={picData.profilePicture} className="object-cover" />
                          <AvatarFallback className={cn("text-[11px] font-black", isSelected ? "bg-white text-black" : "bg-zinc-900 text-white")}>
                            {name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className={cn("text-[11px] font-black uppercase tracking-tight leading-none", isSelected ? "text-white" : "text-zinc-900")}>{name}</p>
                          <p className={cn("text-[8px] font-bold uppercase tracking-widest mt-1", isSelected ? "text-zinc-400" : "text-zinc-400")}>Field Staff</p>
                        </div>
                      </div>
                      {isSelected && <CheckCircle2 className="size-4 text-emerald-400" />}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="space-y-6">
              <div className="p-5 bg-white border border-zinc-200/60 rounded-[28px] shadow-sm space-y-5">
                <div className="flex items-center gap-3 border-b border-zinc-50 pb-4">
                  <div className="size-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                    <ClipboardList size={16} />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-tight text-zinc-900">Visit Details</span>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase text-zinc-400 tracking-widest ml-1">Client Name*</label>
                  <Input className="rounded-xl border-zinc-100 text-xs font-black uppercase h-11 bg-zinc-50/50 focus:bg-white focus:ring-1 focus:ring-zinc-900 transition-all px-4" placeholder="Who are you visiting?..." value={formData.client} onChange={e => setFormData({...formData, client: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase text-zinc-400 tracking-widest ml-1">What needs to be done?</label>
                  <Input className="rounded-xl border-zinc-100 text-xs font-black uppercase h-11 bg-zinc-50/50 focus:bg-white focus:ring-1 focus:ring-zinc-900 transition-all px-4" placeholder="Brief purpose of visit..." value={formData.agenda} onChange={e => setFormData({...formData, agenda: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase text-zinc-400 tracking-widest ml-1">Additional Notes</label>
                  <Textarea className="rounded-xl border-zinc-100 text-xs font-black uppercase min-h-[100px] bg-zinc-50/50 focus:bg-white focus:ring-1 focus:ring-zinc-900 transition-all p-4 resize-none" placeholder="Any extra instructions or details..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
                </div>
              </div>

              <div className="p-5 bg-white border border-zinc-200/60 rounded-[28px] shadow-sm space-y-5">
                <div className="flex items-center gap-3 border-b border-zinc-50 pb-4">
                  <div className="size-8 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600">
                    <MapPin size={16} />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-tight text-zinc-900">Location Info</span>
                </div>
                
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[9px] font-black uppercase text-zinc-400 tracking-widest ml-1">Site Address*</label>
                    <button onClick={handleVerifyMap} className="text-[9px] font-black uppercase flex items-center gap-2 hover:text-blue-600 transition-all bg-zinc-50 px-2 py-1 rounded-lg border border-zinc-100">
                      {isGeocoding ? <Loader2 className="size-3 animate-spin" /> : <Navigation className="size-3" />} 
                      Verify Map
                    </button>
                  </div>
                  
                  <div className="flex gap-2">
                    <Popover open={openAddress} onOpenChange={setOpenAddress}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openAddress}
                          className="w-full justify-between rounded-xl border-zinc-100 h-11 bg-zinc-50/50 hover:bg-white text-xs font-black uppercase tracking-tight px-4"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Search className="size-3 text-zinc-400" />
                            <span className="truncate">{formData.address || "Select or type address..."}</span>
                          </div>
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0 rounded-2xl shadow-2xl border-zinc-100" align="start">
                        <Command className="rounded-2xl">
                          <CommandInput placeholder="Search previous locations..." className="h-11 text-xs font-bold uppercase tracking-tight" />
                          <CommandList className="max-h-[200px]">
                            <CommandEmpty className="py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-center">No history found</CommandEmpty>
                            <CommandGroup heading="Recent Addresses" className="p-2">
                              {addressOptions.map((addr) => (
                                <CommandItem
                                  key={addr}
                                  value={addr}
                                  onSelect={() => {
                                    setFormData({ ...formData, address: addr });
                                    setOpenAddress(false);
                                  }}
                                  className="rounded-xl text-[10px] font-bold uppercase tracking-tight py-3 px-4 aria-selected:bg-zinc-100"
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-3 w-3",
                                      formData.address === addr ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <span className="truncate">{addr}</span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <Textarea 
                    className="rounded-xl border-zinc-100 text-xs font-black uppercase h-20 bg-zinc-50/50 focus:bg-white focus:ring-1 focus:ring-zinc-900 transition-all p-4 resize-none" 
                    placeholder="Complete address of the site..." 
                    value={formData.address} 
                    onChange={e => setFormData({...formData, address: e.target.value})} 
                  />
                </div>

                <div className="w-full h-24 bg-zinc-50 border border-zinc-100 rounded-2xl flex flex-col items-center justify-center gap-2 overflow-hidden relative group">
                  <Globe className="size-8 text-zinc-100 group-hover:text-blue-500/10 transition-colors" />
                  <span className="text-[9px] font-black text-zinc-300 uppercase tracking-widest">Map Pin Status</span>
                  {coords && (
                    <div className="absolute inset-0 bg-emerald-50/50 flex items-center justify-center animate-in zoom-in duration-300">
                      <CheckCircle2 className="size-6 text-emerald-500" />
                      <span className="ml-2 text-[10px] font-black text-emerald-600 uppercase">Pinned</span>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase text-zinc-400 tracking-widest ml-1">Site Landmark</label>
                  <Input className="rounded-xl border-zinc-100 text-xs font-black uppercase h-11 bg-zinc-50/50 focus:bg-white focus:ring-1 focus:ring-zinc-900 transition-all px-4" placeholder="Near school, mall, etc..." value={formData.landmark} onChange={e => setFormData({...formData, landmark: e.target.value})} />
                </div>
              </div>

              <div className="p-6 border-2 border-dashed border-zinc-200 rounded-[28px] bg-white/40 text-center hover:bg-white hover:border-zinc-300 transition-all shadow-sm group">
                {attachedFile ? (
                  <div className="flex items-center justify-between bg-zinc-900 p-3 rounded-xl shadow-lg animate-in zoom-in duration-300">
                    <div className="flex items-center gap-3">
                      <Paperclip className="size-4 text-zinc-400" />
                      <span className="text-[10px] font-black text-white uppercase truncate max-w-[150px]">{attachedFile.name}</span>
                    </div>
                    <button onClick={() => setAttachedFile(null)} className="text-zinc-500 hover:text-white transition-colors"><X className="size-4" /></button>
                  </div>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center gap-2 py-4 group">
                    <div className="size-10 bg-zinc-50 rounded-xl flex items-center justify-center text-zinc-300 group-hover:bg-zinc-900 group-hover:text-white transition-all">
                      <Paperclip size={20} />
                    </div>
                    <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest mt-2">Attach Files (Optional)</span>
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
              "w-full md:w-auto h-16 px-10 rounded-full font-black uppercase text-[11px] tracking-[0.2em] flex items-center justify-center gap-4 shadow-2xl transition-all active:scale-[0.95]", 
              isComplete 
                ? "bg-zinc-900 text-white hover:bg-zinc-800 hover:scale-105" 
                : "bg-zinc-200 text-zinc-400 cursor-not-allowed shadow-none"
            )}
          >
            {isSubmitting ? "Finalizing..." : "Submit Visit Request"}
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </div>
      </SidebarInset>
    </>
  );
}