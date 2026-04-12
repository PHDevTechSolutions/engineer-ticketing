"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Clock, RefreshCcw, CheckCircle2, History, Loader2, 
  ShieldCheck, ChevronLeft, Image as ImageIcon, ExternalLink,
  Check, X, Timer, FileText, Briefcase, MapPin, User
} from "lucide-react";

// DATABASE
import { db } from "@/lib/firebase";
import { doc, onSnapshot, updateDoc, serverTimestamp } from "firebase/firestore";

// UI COMPONENTS
import { toast } from "sonner";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
// CUSTOM COMPONENTS
import { PageHeader } from "@/components/page-header";
import { CollaborationHub } from "@/components/collaboration-hub";

function DetailItem({ icon: Icon, label, value }: { icon: any, label: string, value: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-50 border border-zinc-100 hover:border-zinc-200 transition-all group">
      <div className="size-8 rounded-xl bg-white flex items-center justify-center text-zinc-400 group-hover:bg-zinc-900 group-hover:text-white transition-all shadow-sm">
        <Icon size={14} />
      </div>
      <div>
        <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest leading-none mb-1">{label}</p>
        <p className="text-[12px] font-bold text-zinc-900 leading-none">{value}</p>
      </div>
    </div>
  )
}

export default function JobRequestReviewPage() {
  const params = useParams() as { id: string };
  const router = useRouter();
  
  // STATE
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [userContext, setUserContext] = useState({ 
    role: "", id: "", name: "", profilePicture: "", department: "" 
  });
  const [notes, setNotes] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [elapsedTime, setElapsedTime] = useState("00:00:00");

  // TIMER LOGIC
  useEffect(() => {
    const timerInterval = setInterval(() => {
      if (data?.createdAt) {
        const start = new Date(data.createdAt.seconds * 1000).getTime();
        const now = new Date().getTime();
        const diff = now - start;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setElapsedTime(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }
    }, 1000);
    return () => clearInterval(timerInterval);
  }, [data]);

  // DATA SYNC
  useEffect(() => {
    let unsubscribe: () => void;
    const loadUserAndData = async () => {
      const storedId = localStorage.getItem("userId");
      if (!storedId) return toast.error("Please log in.");

      try {
        const res = await fetch(`/api/user?id=${encodeURIComponent(storedId)}`);
        const user = await res.json();
        const dept = (user.Department || "").toLowerCase();
        
        setUserContext({
          role: user.Role || "staff",
          id: storedId,
          name: `${user.Firstname} ${user.Lastname}`,
          profilePicture: user.profilePicture || "",
          department: dept
        });

        const docRef = doc(db, "job_requests", params.id);
        unsubscribe = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            const reqData = docSnap.data();
            setData(reqData);
            setNotes(reqData.adminNotes || "");
            
            // Set default image if not already set
            if (reqData.attachments && reqData.attachments.length > 0) {
              setSelectedImage(reqData.attachments[0]);
            } else if (reqData.attachmentUrl) {
              setSelectedImage(reqData.attachmentUrl);
            }
          } else {
            toast.error("Job record not found.");
          }
          setLoading(false);
        });
      } catch (err) {
        toast.error("Failed to sync data.");
        setLoading(false);
      }
    };

    loadUserAndData();
    return () => unsubscribe?.();
  }, [params.id]);

  const handleUpdateStatus = async (status: string) => {
    setIsUpdating(true);
    const toastId = toast.loading(`Updating job status to ${status}...`);
    
    try {
      const docRef = doc(db, "job_requests", params.id);
      await updateDoc(docRef, {
        status: status.toUpperCase(),
        adminNotes: notes,
        updatedAt: serverTimestamp(),
        processedBy: userContext.name
      });
      toast.success("Job updated successfully.", { id: toastId });
    } catch (error) {
      toast.error("Update failed.");
    } finally {
      setIsUpdating(false); 
    }
  };

  if (loading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center gap-4 bg-[#F4F7F7]">
      <Loader2 className="animate-spin text-zinc-900" size={32} />
      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Syncing Engiconnect...</p>
    </div>
  );

  const status = (data?.status || "PENDING").toUpperCase();
  const isAdmin = userContext.department === "it" || userContext.department === "engineering" || userContext.department === "admin";
  const hasImages = (data?.attachments && data.attachments.length > 0) || data?.attachmentUrl;

  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar userId={userContext.id} />
      <SidebarInset className="bg-[#F4F7F7]">
        
        <PageHeader 
          title={data?.projectName || "JOB REQUEST"} 
          version="V3.2" 
          showBackButton={true}
          actions={
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1">
                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-wider">Ref:</span>
                <span className="text-[10px] font-black text-zinc-900 uppercase">#{params.id.slice(-6).toUpperCase()}</span>
              </div>
              <Badge className={cn(
                "font-black text-[10px] uppercase px-4 py-1.5 rounded-xl border-none shadow-sm",
                status === "COMPLETED" || status === "APPROVED" ? "bg-emerald-500 text-white" : "bg-zinc-900 text-white"
              )}>
                {status}
              </Badge>
            </div>
          }
        />

        <main className="p-4 md:p-8 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 pb-32">
          
          <div className="lg:col-span-8 space-y-6">
            
            {/* ENHANCED FILE VIEW PANEL */}
            <div className="bg-white rounded-[24px] border border-zinc-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
              <div className="p-4 border-b flex items-center justify-between bg-zinc-50/50">
                <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest flex items-center gap-2">
                   <ImageIcon size={14} /> Attachment Viewer 
                   {data?.attachments?.length > 1 && <span className="text-zinc-300">| {data.attachments.length} Photos</span>}
                </span>
                {selectedImage && (
                    <a href={selectedImage} target="_blank" className="text-[9px] font-bold text-blue-600 uppercase flex items-center gap-1">
                        Open Original <ExternalLink size={12} />
                    </a>
                )}
              </div>
              
              <div className="flex-1 bg-zinc-100 flex flex-col items-center justify-center relative p-4 min-h-[450px]">
                {hasImages ? (
                  <>
                    <div className="flex-1 w-full flex items-center justify-center overflow-hidden">
                       <TransformWrapper>
                        <TransformComponent wrapperClass="!w-full !h-full flex items-center justify-center">
                           <img 
                            src={selectedImage || data?.attachmentUrl || data?.attachments?.[0]} 
                            alt="Job Attachment" 
                            className="max-w-full max-h-[400px] object-contain rounded-lg shadow-sm" 
                           />
                        </TransformComponent>
                       </TransformWrapper>
                    </div>

                    {/* Thumbnail Strip for multiple images */}
                    {data?.attachments?.length > 1 && (
                      <div className="w-full flex gap-2 mt-4 overflow-x-auto py-2 px-1">
                        {data.attachments.map((img: string, idx: number) => (
                          <button 
                            key={idx}
                            onClick={() => setSelectedImage(img)}
                            className={cn(
                              "size-14 rounded-md border-2 overflow-hidden flex-shrink-0 transition-all",
                              selectedImage === img ? "border-blue-500 scale-105 shadow-md" : "border-transparent opacity-50 hover:opacity-100"
                            )}
                          >
                            <img src={img} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center space-y-2">
                    <FileText size={40} className="mx-auto text-zinc-300" />
                    <p className="text-[10px] font-bold text-zinc-400 uppercase">No Drawing Attached</p>
                  </div>
                )}
              </div>

              <div className="p-8 bg-white border-t grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="size-2 bg-blue-500 rounded-full" />
                    <h3 className="text-[10px] font-black uppercase text-zinc-900 tracking-widest">Scope of Work</h3>
                  </div>
                  <div className="p-5 rounded-[20px] bg-zinc-50 border border-zinc-100">
                    <p className="text-[13px] font-medium text-zinc-600 leading-relaxed italic">
                      "{data?.scopeOfWork || data?.description || "No specific instructions provided."}"
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="size-2 bg-zinc-900 rounded-full" />
                      <h3 className="text-[10px] font-black uppercase text-zinc-900 tracking-widest">Project Details</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <DetailItem icon={MapPin} label="Location" value={data?.location || "Not Specified"} />
                        <DetailItem icon={User} label="Client" value={data?.clientName || "General Client"} />
                        <DetailItem icon={Briefcase} label="Priority" value={data?.priority || "NORMAL"} />
                        <DetailItem icon={Timer} label="Working Time" value={data?.workingTime || "Standard"} />
                    </div>
                </div>
              </div>
            </div>

            <CollaborationHub
              requestId={params.id}
              collectionName="job_requests" // Explicitly tell it which collection to use
              messages={data?.messages || []}
              currentUserId={userContext.id}
              userName={userContext.name}
              profilePicture={userContext.profilePicture}
              userRole={userContext.role}
              status={status}
              title={data?.title || "dsiconnect"}
            />
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-[24px] border border-zinc-200 p-8 shadow-sm">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-[10px] font-black uppercase text-zinc-400 flex items-center gap-2 tracking-widest">
                  <History size={14} /> Job Journey
                </h3>
                <Badge variant="outline" className="text-[10px] font-mono border-zinc-100 text-zinc-500 bg-zinc-50 flex gap-1.5 items-center px-3 py-1 rounded-lg">
                  <Timer size={12} className="animate-pulse" /> {elapsedTime}
                </Badge>
              </div>
              
              <div className="space-y-8 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-100">
                <TimelineStep title="Request Filed" date={data?.createdAt} status="completed" />
                <TimelineStep title="Assigned / In Progress" status={status === 'PENDING' ? 'active' : 'completed'} />
                <TimelineStep title="Final Review" status={status === 'COMPLETED' ? 'completed' : (status === 'IN_PROGRESS' ? 'active' : 'pending')} />
              </div>
            </div>

            {isAdmin && status !== "COMPLETED" && (
              <div className="bg-zinc-900 rounded-[24px] p-8 shadow-xl text-white space-y-6">
                <div className="flex items-center gap-2 text-zinc-400">
                  <ShieldCheck size={18} />
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-white">Project Controls</h3>
                </div>
                
                <Textarea
                  placeholder="Add internal feedback or job notes..."
                  className="bg-white/10 border-none text-white min-h-[120px] rounded-xl placeholder:text-zinc-500 text-xs"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />

                <div className="grid grid-cols-1 gap-3">
                  <Button 
                    className="w-full bg-[#00C853] hover:bg-[#00B24A] font-black uppercase text-[10px] tracking-widest h-12 rounded-xl"
                    onClick={() => handleUpdateStatus("COMPLETED")}
                    disabled={isUpdating}
                  >
                    {isUpdating ? <Loader2 className="animate-spin size-4 mr-2" /> : <Check size={16} className="mr-2" />}
                    Mark as Completed
                  </Button>
                  
                  <Button 
                    variant="ghost"
                    className="w-full text-zinc-400 hover:text-white hover:bg-white/5 font-black uppercase text-[10px] tracking-widest h-12"
                    onClick={() => handleUpdateStatus("CANCELLED")}
                    disabled={isUpdating}
                  >
                    Cancel Project
                  </Button>
                </div>
              </div>
            )}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function TimelineStep({ title, date, status }: { title: string; date?: any; status: 'completed' | 'active' | 'pending' }) {
  const iconColor = status === 'completed' ? 'bg-[#00C853]' : status === 'active' ? 'bg-blue-500 animate-pulse' : 'bg-zinc-200';
  return (
    <div className="flex gap-4 relative z-10">
      <div className={`size-[24px] flex-shrink-0 rounded-full ${iconColor} flex items-center justify-center ring-4 ring-white`}>
        {status === 'completed' ? <CheckCircle2 size={12} className="text-white" /> : <div className="size-1.5 bg-white rounded-full" />}
      </div>
      <div>
        <p className={`text-[11px] font-black ${status === 'pending' ? 'text-zinc-300' : 'text-zinc-900 uppercase'}`}>{title}</p>
        {date && (
          <p className="text-[9px] text-zinc-400 font-bold italic">
            {new Date(date.seconds * 1000).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
}