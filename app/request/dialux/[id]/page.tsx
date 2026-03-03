"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Clock, CheckCircle2, History, Loader2,
  ShieldCheck, ChevronLeft, Image as ImageIcon, ExternalLink,
  Check, Timer, FileText, MapPin, Lightbulb, Ruler, Building2,
  Briefcase, AlertCircle, PlayCircle
} from "lucide-react";

// DATABASE
import { db } from "@/lib/firebase";
import { doc, onSnapshot, updateDoc, serverTimestamp } from "firebase/firestore";

// UI COMPONENTS
import { toast } from "sonner";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { CollaborationHub } from "@/components/collaboration-hub";

export default function DialuxRequestReviewPage() {
  const params = useParams() as { id: string };
  const router = useRouter();

  // STATE
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [userContext, setUserContext] = useState({
    role: "", id: "", name: "", profilePicture: "", department: ""
  });

  // ASSESSMENT FORM STATE
  const [assessment, setAssessment] = useState({
    ctrlNo: "",
    simulationType: "",
    size: "",
    complexity: "",
    leadTime: "",
    designerSig: "",
    managerSig: ""
  });

  const [isUpdating, setIsUpdating] = useState(false);
  const [countdown, setCountdown] = useState("03:00:00");
  const [isOverdue, setIsOverdue] = useState(false);

  // Status Helper
  const status = (data?.status || "PENDING").toUpperCase();

  // Department checks
  const isAdmin = ["it", "engineering", "admin"].includes(userContext.department);
  const isSales = userContext.department === "sales";

  // UPDATED: DYNAMIC SLA TIMER (3h for Engineering, 24h for Sales, 1h for Designing/Free)
  useEffect(() => {
    const timerInterval = setInterval(() => {
      let referenceTime = data?.createdAt;
      let hoursLimit = 3;

      if (status === "REVIEWING_ASSESSMENT") {
        referenceTime = data?.assessmentCompletedAt;
        hoursLimit = 24;
      } else if (status === "IN_QUEUE") {
        referenceTime = data?.acknowledgedAt;
        hoursLimit = 1;
      } else if (status === "IN_DESIGN") {
        // You can set a custom limit for the actual design phase if needed
        referenceTime = data?.designStartedAt;
        hoursLimit = 48; 
      }

      if (referenceTime) {
        const start = new Date(referenceTime.seconds * 1000).getTime();
        const limit = start + (hoursLimit * 60 * 60 * 1000); 
        
        const now = new Date().getTime();
        const diff = limit - now;
        const absDiff = Math.abs(diff);

        const hours = Math.floor(absDiff / (1000 * 60 * 60));
        const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((absDiff % (1000 * 60)) / 1000);

        const timeString = `${diff < 0 ? '-' : ''}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        setCountdown(timeString);
        setIsOverdue(diff < 0);
      }
    }, 1000);
    
    return () => clearInterval(timerInterval);
  }, [data, status]);

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

        const docRef = doc(db, "dialux_requests", params.id);
        unsubscribe = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            const reqData = docSnap.data();
            setData(reqData);
            if (reqData.assessment) setAssessment(reqData.assessment);
            if (reqData.attachments?.length > 0) setSelectedImage(reqData.attachments[0] || "");
          } else {
            toast.error("Simulation record not found.");
          }
          setLoading(false);
        });
      } catch (err) {
        toast.error("Sync failed.");
        setLoading(false);
      }
    };

    loadUserAndData();
    return () => unsubscribe?.();
  }, [params.id]);

  // STAGE 1: Engineering Submits Assessment
  const handleSubmitAssessment = async () => {
    if (!assessment.ctrlNo || !assessment.simulationType || !assessment.designerSig || !assessment.managerSig) {
      return toast.error("Please complete all required fields and signatures.");
    }

    setIsUpdating(true);
    const toastId = toast.loading("Filing engineering assessment...");

    try {
      const docRef = doc(db, "dialux_requests", params.id);
      await updateDoc(docRef, {
        assessment: assessment,
        status: "REVIEWING_ASSESSMENT", 
        updatedAt: serverTimestamp(),
        assessmentCompletedAt: serverTimestamp(), 
        processedBy: userContext.name,
      });

      toast.success("Assessment submitted for requestor review.", { id: toastId });
    } catch (error) {
      toast.error("Submission failed.", { id: toastId });
    } finally {
      setIsUpdating(false);
    }
  };

  // STAGE 2: Requestor Actions (Sales only)
  const handleRequestorAction = async () => {
    if (!assessment.designerSig || !assessment.managerSig) {
      return toast.error("Assessment is invalid: Missing signatures.");
    }

    setIsProcessingAction(true);
    const isPaid = assessment.simulationType === "PAID";
    const toastId = toast.loading(isPaid ? "Submitting Costing Request..." : "Acknowledging Assessment...");

    try {
      const docRef = doc(db, "dialux_requests", params.id);
      
      const updatePayload: any = {
        updatedAt: serverTimestamp(),
        [`${isPaid ? 'costingRequestedAt' : 'acknowledgedAt'}`]: serverTimestamp(),
      };

      if (isPaid) {
        updatePayload.status = "PENDING_COSTING"; 
        updatePayload.procurementTicketCreated = false; 
      } else {
        updatePayload.status = "IN_QUEUE"; 
      }

      await updateDoc(docRef, updatePayload);
      toast.success(isPaid ? "Procurement notified for costing." : "Request moved to Execution Queue.", { id: toastId });
    } catch (error) {
      toast.error("Action failed. Please try again.", { id: toastId });
    } finally {
      setIsProcessingAction(false);
    }
  };

  // NEW STAGE: Start Designing (Engineering/Admin)
  const handleStartDesign = async () => {
    setIsProcessingAction(true);
    const toastId = toast.loading("Moving to Design Phase...");

    try {
      const docRef = doc(db, "dialux_requests", params.id);
      await updateDoc(docRef, {
        status: "IN_DESIGN",
        designStartedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast.success("Project is now In Design.", { id: toastId });
    } catch (error) {
      toast.error("Failed to start design.", { id: toastId });
    } finally {
      setIsProcessingAction(false);
    }
  };

  if (loading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center gap-4 bg-[#F4F7F7]">
      <Loader2 className="animate-spin text-zinc-900" size={32} />
      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">
        Syncing Engiconnect...<br />Loading Simulation Details
      </p>
    </div>
  );

  const hasImages = data?.attachments && data.attachments.length > 0;

  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar userId={userContext.id} />
      <SidebarInset className="bg-[#F4F7F7]">

        <header className="flex h-16 items-center justify-between border-b bg-white px-4 md:px-6 sticky top-0 z-50">
          <div className="flex items-center gap-2 md:gap-4 min-w-0">
            <Button variant="ghost" size="icon" className="text-zinc-400 shrink-0" onClick={() => router.back()}>
              <ChevronLeft size={20} />
            </Button>
            <Separator orientation="vertical" className="h-4 hidden xs:block" />
            <div className="truncate">
              <h1 className="text-[11px] md:text-sm font-black text-zinc-900 uppercase tracking-tight truncate">
                {data?.projectName || "Dialux Request"}
              </h1>
              <p className="text-[8px] md:text-[9px] text-zinc-400 font-bold uppercase tracking-widest truncate">
                PROJECT REF: {params.id.slice(-8).toUpperCase()}
              </p>
            </div>
          </div>

          <div className={cn(
            "flex items-center gap-2 md:gap-3 px-2 md:px-3 py-1.5 rounded-lg border transition-all shrink-0 ml-2",
            isOverdue ? "bg-red-50 border-red-200" : "bg-zinc-50 border-zinc-200"
          )}>
            <div className="flex flex-col items-end border-r pr-2 md:pr-3 border-zinc-200">
              <span className={cn(
                "text-[6px] md:text-[7px] font-black uppercase tracking-widest leading-none",
                isOverdue ? "text-red-500" : "text-zinc-400"
              )}>
                {isOverdue ? "SLA Breach" : "SLA Window"}
              </span>
              <span className={cn(
                "text-[8px] md:text-[9px] font-bold uppercase mt-0.5",
                isOverdue ? "text-red-600" : "text-zinc-500"
              )}>
                {status === "PENDING" ? "Engineering (3h)" : status === "IN_QUEUE" ? "Designing (1h)" : status === "IN_DESIGN" ? "Work Phase" : "Review/Sales (24h)"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 md:gap-2">
              <Timer size={14} className={cn("shrink-0", isOverdue ? "text-red-500" : "text-blue-500")} />
              <span className={cn(
                "text-sm md:text-lg font-mono font-black tabular-nums leading-none tracking-tighter",
                isOverdue ? "text-red-600" : "text-zinc-900"
              )}>
                {countdown}
              </span>
            </div>
          </div>
        </header>

        <main className="p-4 md:p-8 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 pb-32">

          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white rounded-[24px] border border-zinc-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
              <div className="p-4 border-b flex items-center justify-between bg-zinc-50/50">
                <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest flex items-center gap-2">
                  <ImageIcon size={14} /> Room Layouts & Reference Photos
                </span>
                {selectedImage && (
                  <a href={selectedImage} target="_blank" rel="noreferrer" className="text-[9px] font-bold text-blue-600 uppercase flex items-center gap-1">
                    View Full Res <ExternalLink size={12} />
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
                            src={selectedImage || ""}
                            alt="Simulation Reference"
                            className="max-w-full max-h-[400px] object-contain rounded-lg shadow-sm"
                          />
                        </TransformComponent>
                      </TransformWrapper>
                    </div>

                    {data.attachments.length > 1 && (
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
                            <img src={img} className="w-full h-full object-cover" alt={`Thumb ${idx}`} />
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center space-y-2">
                    <FileText size={40} className="mx-auto text-zinc-300" />
                    <p className="text-[10px] font-bold text-zinc-400 uppercase">No Reference Uploaded</p>
                  </div>
                )}
              </div>

              <div className="p-8 bg-white border-t space-y-8">
                <div>
                  <h3 className="text-[10px] font-black uppercase text-zinc-400 mb-3 tracking-widest">Client & Project Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                    <DetailItem icon={Building2} label="Client Name" value={data?.clientName} />
                    <DetailItem icon={Building2} label="Project Type" value={data?.projectType} />
                    <DetailItem icon={MapPin} label="Site Address" value={data?.siteAddress} />
                  </div>
                </div>
                <Separator />
                <div>
                  <h3 className="text-[10px] font-black uppercase text-zinc-400 mb-3 tracking-widest">Simulation Parameters</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                    <DetailItem icon={Ruler} label="Mounting Height" value={data?.mountingHeight ? `${data?.mountingHeight}m` : "Not Specified"} />
                    <DetailItem icon={Lightbulb} label="Lighting Req." value={data?.lightingRequirement} />
                    <DetailItem icon={Briefcase} label="Fixture Details" value={data?.fixtureDetails} />
                    <DetailItem icon={CheckCircle2} label="Preferred Lux" value={data?.preferredLux} />
                  </div>
                </div>
              </div>
            </div>

            <CollaborationHub
              requestId={params.id}
              messages={data?.messages || []}
              currentUserId={userContext.id}
              userName={userContext.name}
              profilePicture={userContext.profilePicture}
              userRole={userContext.role}
              status={status}
            />
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-[24px] border border-zinc-200 p-8 shadow-sm">
              <h3 className="text-[10px] font-black uppercase text-zinc-400 flex items-center gap-2 tracking-widest mb-8">
                <History size={14} /> Simulation Journey
              </h3>
              <div className="space-y-8 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-100">
                <TimelineStep title="Request Filed" date={data?.createdAt} status="completed" />
                <TimelineStep 
                   title="Engineering Assessment" 
                   date={data?.assessmentCompletedAt} 
                   status={data?.assessmentCompletedAt ? 'completed' : 'active'} 
                />
                
                {assessment.simulationType === "PAID" ? (
                  <TimelineStep 
                    title="Costing Request" 
                    date={data?.costingRequestedAt} 
                    status={data?.costingRequestedAt ? 'completed' : (status === 'PENDING_COSTING' ? 'active' : 'pending')} 
                  />
                ) : (
                  <TimelineStep 
                    title="Awaiting Execution" 
                    date={data?.acknowledgedAt} 
                    status={data?.acknowledgedAt ? 'completed' : (status === 'IN_QUEUE' ? 'active' : 'pending')} 
                  />
                )}
                
                <TimelineStep 
                  title="Design Phase" 
                  date={data?.designStartedAt}
                  status={status === 'IN_DESIGN' ? 'active' : (status === 'COMPLETED' ? 'completed' : 'pending')} 
                />
              </div>
            </div>

            <div className="bg-zinc-100 rounded-[24px] border-2 border-zinc-200 p-6 shadow-sm space-y-6">
              <div className="bg-zinc-200/50 p-3 rounded-xl border border-zinc-300">
                <h2 className="text-center font-black text-[11px] uppercase tracking-tighter text-zinc-700">Engineering Assessment</h2>
              </div>

              <div className="space-y-4">
                <AssessmentField label="Ctrl #:" value={assessment.ctrlNo} disabled={status !== "PENDING" || !isAdmin} 
                  onChange={(val) => setAssessment({ ...assessment, ctrlNo: val })} />
                
                <div>
                  <label className="text-[9px] font-black uppercase text-zinc-500 ml-1">Type of Simulation:</label>
                  <Select 
                    disabled={status !== "PENDING" || !isAdmin} 
                    value={assessment.simulationType}
                    onValueChange={(val) => setAssessment({ ...assessment, simulationType: val })}
                  >
                    <SelectTrigger className="bg-white border-zinc-300 h-9 text-xs font-bold uppercase">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FREE">Free DIAlux</SelectItem>
                      <SelectItem value="PAID">Paid DIAlux</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <AssessmentField label="Size:" value={assessment.size} disabled={status !== "PENDING" || !isAdmin}
                    onChange={(val) => setAssessment({ ...assessment, size: val })} />
                  <AssessmentField label="Complexity:" value={assessment.complexity} disabled={status !== "PENDING" || !isAdmin}
                    onChange={(val) => setAssessment({ ...assessment, complexity: val })} />
                </div>

                <AssessmentField label="Lead Time:" value={assessment.leadTime} disabled={status !== "PENDING" || !isAdmin}
                  onChange={(val) => setAssessment({ ...assessment, leadTime: val })} />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-200">
                <div className="text-center">
                  <label className="text-[8px] font-black uppercase text-zinc-400 block mb-1">Designer Signature</label>
                  <Input
                    placeholder="Type Name"
                    disabled={status !== "PENDING" || !isAdmin}
                    className="h-8 text-[10px] bg-white border-zinc-300 italic text-center"
                    value={assessment.designerSig}
                    onChange={(e) => setAssessment({ ...assessment, designerSig: e.target.value })}
                  />
                </div>
                <div className="text-center">
                  <label className="text-[8px] font-black uppercase text-zinc-400 block mb-1">Manager Signature</label>
                  <Input
                    placeholder="Type Name"
                    disabled={status !== "PENDING" || !isAdmin}
                    className="h-8 text-[10px] bg-white border-zinc-300 italic text-center"
                    value={assessment.managerSig}
                    onChange={(e) => setAssessment({ ...assessment, managerSig: e.target.value })}
                  />
                </div>
              </div>

              {/* STAGE 1 ACTION: ENGINEERING SUBMITS */}
              {isAdmin && status === "PENDING" && (
                <Button
                  className="w-full bg-zinc-900 hover:bg-black text-white font-black uppercase text-[10px] h-12 rounded-xl shadow-lg"
                  onClick={handleSubmitAssessment}
                  disabled={isUpdating}
                >
                  {isUpdating ? <Loader2 className="animate-spin mr-2" /> : "Submit Assessment"}
                </Button>
              )}

              {/* STAGE 2 ACTION: SALES ACKNOWLEDGES */}
              {status === "REVIEWING_ASSESSMENT" && (
                <>
                  {isSales ? (
                    <div className="flex flex-col gap-2">
                      <Button
                        className="w-full bg-[#00C853] hover:bg-[#00B24A] text-white font-black uppercase text-[10px] h-12 rounded-xl shadow-lg"
                        onClick={handleRequestorAction}
                        disabled={isProcessingAction}
                      >
                        {assessment.simulationType === "PAID" ? "Request Costing" : "Acknowledge Assessment"}
                      </Button>
                      <p className="text-[8px] text-center text-zinc-400 font-bold uppercase tracking-tighter px-2">
                        {assessment.simulationType === "PAID" 
                          ? "Costing request will trigger procurement ticket creation."
                          : "Acknowledgment will move this request to the execution queue."}
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 bg-zinc-200/50 rounded-xl border border-zinc-300 flex items-center gap-3">
                      <AlertCircle className="text-zinc-500" size={16} />
                      <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-tight">
                        Awaiting Sales acknowledgement
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* NEW STAGE: IN DESIGN QUEUE -> START DESIGNING */}
              {status === "IN_QUEUE" && (
                <div className="flex flex-col gap-2">
                  {isAdmin ? (
                    <Button
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-[10px] h-12 rounded-xl shadow-lg"
                      onClick={handleStartDesign}
                      disabled={isProcessingAction}
                    >
                      {isProcessingAction ? <Loader2 className="animate-spin mr-2" /> : <><PlayCircle className="mr-2" size={16}/> Start Designing</>}
                    </Button>
                  ) : (
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-center gap-3">
                      <Clock className="text-blue-500" size={16} />
                      <p className="text-[9px] font-bold text-blue-600 uppercase tracking-tight">
                        Project is in the design queue
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

// HELPER COMPONENTS
function AssessmentField({ label, value, onChange, disabled }: { label: string, value: string, onChange: (v: string) => void, disabled: boolean }) {
  return (
    <div>
      <label className="text-[9px] font-black uppercase text-zinc-500 ml-1">{label}</label>
      <Input
        className="bg-white border-zinc-300 h-9 text-xs font-bold disabled:opacity-80 disabled:bg-zinc-50"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function DetailItem({ icon: Icon, label, value }: { icon: any, label: string, value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="p-2 bg-zinc-50 rounded-lg border border-zinc-100">
        <Icon size={14} className="text-zinc-400" />
      </div>
      <div>
        <p className="text-[9px] font-black text-zinc-400 uppercase tracking-tighter">{label}</p>
        <p className="text-xs font-bold text-zinc-900">{value || "---"}</p>
      </div>
    </div>
  )
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
            {new Date(date.seconds * 1000).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
          </p>
        )}
      </div>
    </div>
  );
}