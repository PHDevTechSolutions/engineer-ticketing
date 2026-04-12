"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  Plus, Send, Loader2, Wrench, FileText, X, ShieldCheck, Clock, Camera, ClipboardCheck,
  AlertCircle, CheckCircle2, ChevronRight, Calendar, Info
} from "lucide-react";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PageHeader } from "@/components/page-header";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import ProtectedPageWrapper from "@/components/protected-page-wrapper";
import { toast } from "sonner";
import { sendPushNotification, NotificationTemplates } from "@/lib/notification-service";

// Database
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export default function JobRequestWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);

  // FORM STATES
  const [formData, setFormData] = useState({
    projectName: "",
    scopeOfWork: "",
    mountingHeight: "",
    workingTime: "",
    otherAssistance: "",
    otherDocuments: "",
    priority: "MEDIUM",
    tempFacility: "No",
    safetyInduction: "No",
    safetyNotes: "",
  });

  const [siteInstallation, setSiteInstallation] = useState<string[]>([]);
  const [inHouse, setInHouse] = useState<string[]>([]);
  const [permits, setPermits] = useState<string[]>([]);
  const [workingDays, setWorkingDays] = useState<string[]>([]);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    setUserId(localStorage.getItem("userId"));
    
    // Load from localStorage if exists
    const saved = localStorage.getItem("job_request_draft");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFormData(parsed.formData);
        setSiteInstallation(parsed.siteInstallation);
        setInHouse(parsed.inHouse);
        setPermits(parsed.permits);
        setWorkingDays(parsed.workingDays);
        if (parsed.savedAt) setLastSaved(new Date(parsed.savedAt));
      } catch (e) {
        console.error("Failed to load draft:", e);
      }
    }
  }, []);

  // Save draft on changes
  useEffect(() => {
    if (userId) {
      const timer = setTimeout(() => {
        localStorage.setItem("job_request_draft", JSON.stringify({
          formData, siteInstallation, inHouse, permits, workingDays,
          savedAt: new Date().toISOString()
        }));
        setLastSaved(new Date());
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [formData, siteInstallation, inHouse, permits, workingDays, userId]);

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        if (currentStep < 3) {
          if (currentStep === 2) {
            if (!formData.projectName.trim() || !formData.scopeOfWork.trim()) {
              return toast.error("Please fill in Project Name and Scope of Work.");
            }
          }
          setCurrentStep(prev => prev + 1);
        } else if (currentStep === 3 && !isSubmitting) {
          handleSubmit();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentStep, formData, isSubmitting]);

  const clearDraft = () => {
    localStorage.removeItem("job_request_draft");
  };

  const toggleItem = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, value: string) => {
    setList(list.includes(value) ? list.filter(i => i !== value) : [...list, value]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const imageFiles = selectedFiles.filter(file => file.type.startsWith("image/"));
      
      if (imageFiles.length !== selectedFiles.length) {
        toast.error("Only image files are allowed. Some files were skipped.");
      }

      if (imageFiles.length > 0) {
        setFiles((prev) => [...prev, ...imageFiles]);
      }
    }
  };

  // --- UPDATED UPLOAD LOGIC (Matching your working reference) ---
  const handleDirectUpload = async (file: File) => {
    const data = new FormData();
    data.append("file", file);
    data.append("upload_preset", "Xchire"); // Your working preset

    try {
      // Using your working Cloudinary URL
      const res = await fetch("https://api.cloudinary.com/v1_1/dhczsyzcz/image/upload", {
        method: "POST",
        body: data,
      });
      const json = await res.json();
      return json.secure_url;
    } catch (error) {
      console.error("Cloudinary Error:", error);
      return null;
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting || !userId) return;
    if (!formData.projectName.trim()) {
      return toast.error("Please enter a Project Name.");
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Syncing with engiconnect...");

    try {
      let uploadedUrls: string[] = [];

      // 1. Upload all images if they exist
      if (files.length > 0) {
        toast.loading(`Uploading ${files.length} photos...`, { id: toastId });
        
        // Upload all files at the same time
        const uploadPromises = files.map(file => handleDirectUpload(file));
        const results = await Promise.all(uploadPromises);
        
        // Filter out any that failed
        uploadedUrls = results.filter((url): url is string => url !== null);
        
        if (uploadedUrls.length === 0) {
          throw new Error("Photo upload failed. Please try again.");
        }
      }

      // 2. Save to Firestore
      await addDoc(collection(db, "job_requests"), {
        ...formData,
        siteInstallation,
        inHouse,
        permits,
        workingDays,
        attachments: uploadedUrls, // Storing the list of links
        status: "PENDING",
        createdBy: userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast.success("Job request synced successfully.", { id: toastId });
      clearDraft(); // Clear draft after successful submission

      // Send push notification
      const userName = localStorage.getItem("userName") || "A user";
      const notifResult = await sendPushNotification(
        NotificationTemplates.jobRequest.created(userName, formData.projectName)
      );
      if (notifResult.success && notifResult.successCount! > 0) {
        console.log(`Push sent to ${notifResult.successCount} devices`);
      }

      router.push("/request/job");
    } catch (e: any) {
      console.error("Submission Error:", e);
      toast.error(e.message || "System connection error.", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ProtectedPageWrapper>
      <SidebarProvider defaultOpen={false}>
        <AppSidebar userId={userId || ""} />
        <SidebarInset className="bg-[#F8FAFC] min-h-screen">
          <PageHeader 
            title="New Job Request" 
            version="2.2.1" 
            showBackButton={true}
            trigger={<SidebarTrigger className="mr-2" />}
          />
          
          <main className="p-2 md:p-4 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-140px)] overflow-hidden">
            <div className="lg:col-span-8 flex flex-col min-h-0 space-y-3">
              {/* STEP INDICATORS & PROGRESS */}
              <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-200 space-y-1.5 shrink-0">
                <div className="grid grid-cols-3 gap-1 w-full relative">
                  {[
                    { id: 1, label: "Assistance", icon: Wrench },
                    { id: 2, label: "Scope", icon: FileText },
                    { id: 3, label: "Logistics", icon: Clock }
                  ].map((step) => (
                    <button 
                      key={step.id} 
                      onClick={() => {
                        // Simple validation before allowing step jump
                        if (currentStep === 1 && step.id > 1) {
                          // Allow going to Scope without validation if coming from Assistance
                        }
                        if (currentStep === 2 && step.id > 2) {
                          if (!formData.projectName.trim() || !formData.scopeOfWork.trim()) {
                            return toast.error("Please fill in Project Name and Scope of Work.");
                          }
                        }
                        setCurrentStep(step.id);
                      }}
                      className={`group flex items-center justify-center gap-2 px-2 py-2 rounded-lg transition-all w-full min-w-0 ${currentStep === step.id ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
                    >
                      <step.icon size={12} className={`shrink-0 ${currentStep === step.id ? 'animate-pulse' : ''}`} /> 
                      <span className="text-[11px] font-black uppercase tracking-tight truncate">{step.label}</span>
                      {currentStep > step.id && <CheckCircle2 size={12} className="shrink-0 text-emerald-400 ml-1" />}
                      
                      {/* Tooltip on hover */}
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                        Go to {step.label}
                      </div>
                    </button>
                  ))}
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden px-1">
                  <div 
                    className="h-full bg-slate-900 transition-all duration-500 ease-out rounded-full" 
                    style={{ width: `${(currentStep / 3) * 100}%` }}
                  />
                </div>
              </div>

              <Card className="shadow-lg border-none rounded-[1.2rem] bg-white overflow-hidden flex flex-col flex-1 min-h-0 ring-1 ring-slate-200/50">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-2.5 px-6 shrink-0 flex flex-row items-center justify-between">
                  <CardTitle className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-500 flex items-center gap-2">
                    <span className="bg-slate-900 text-white size-5 rounded flex items-center justify-center text-[10px] animate-bounce">{currentStep}</span>
                    {currentStep === 1 && "Assistance Selection"}
                    {currentStep === 2 && "Scope & Site Details"}
                    {currentStep === 3 && "Logistics & Schedule"}
                  </CardTitle>
                  
                  {lastSaved && (
                    <div className="flex items-center gap-1.5 text-[8px] font-black uppercase text-emerald-500 animate-in fade-in duration-500">
                      <div className="size-1 bg-emerald-500 rounded-full animate-pulse" />
                      Draft Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </CardHeader>

                <CardContent className="p-5 flex-1 overflow-y-auto">
                  {currentStep === 1 && (
                    <div className="w-full space-y-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <Label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1.5">
                            Site Installation
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Info size={10} className="text-slate-300 hover:text-slate-500 transition-colors" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-[9px] font-bold">Select the type of installation service needed</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </Label>
                          <div className="grid grid-cols-1 gap-2">
                            {["New Installation", "Replacement", "Solar LED Lights", "Non-Solar LED Lights"].map(item => (
                              <div key={item} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors w-full group">
                                <Checkbox checked={siteInstallation.includes(item)} onCheckedChange={() => toggleItem(siteInstallation, setSiteInstallation, item)} />
                                <span className="text-[11px] font-bold text-slate-700 uppercase group-hover:text-slate-900 transition-colors">{item}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-3">
                          <Label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1.5">
                            Item Modification
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Info size={10} className="text-slate-300 hover:text-slate-500 transition-colors" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-[9px] font-bold">Select any modifications required for existing items</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </Label>
                          <div className="grid grid-cols-1 gap-2">
                            {["Rewiring", "Painting", "Assembly"].map(item => (
                              <div key={item} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors w-full group">
                                <Checkbox checked={inHouse.includes(item)} onCheckedChange={() => toggleItem(inHouse, setInHouse, item)} />
                                <span className="text-[11px] font-bold text-slate-700 uppercase group-hover:text-slate-900 transition-colors">{item}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {currentStep === 2 && (
                    <div className="w-full space-y-4 animate-in slide-in-from-right-4 duration-300">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1.5">
                            Project Name <span className="text-red-500 font-black">*</span>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Info size={10} className="text-slate-300" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-[9px] font-bold">The name of the client or the specific project site</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </Label>
                          <Input className="h-11 rounded-xl font-bold text-[12px] w-full focus:ring-2 focus:ring-slate-900/10 transition-all" placeholder="Client ABC - Solar Lights" value={formData.projectName} onChange={e => setFormData({...formData, projectName: e.target.value})} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1.5">
                            Priority <span className="text-red-500 font-black">*</span>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Info size={10} className="text-slate-300" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-[9px] font-bold">How urgent is this request?</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </Label>
                          <div className="flex gap-2 w-full">
                            {["LOW", "MEDIUM", "HIGH"].map(p => (
                              <button
                                key={p}
                                onClick={() => setFormData({...formData, priority: p})}
                                className={`flex-1 py-2.5 rounded-xl text-[10px] font-black transition-all border-2 ${formData.priority === p ? (p === 'HIGH' ? 'bg-red-500 border-red-500 text-white' : p === 'MEDIUM' ? 'bg-orange-500 border-orange-500 text-white' : 'bg-blue-500 border-blue-500 text-white') : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                              >
                                {p}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1.5 w-full">
                        <Label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1.5">
                          Scope of Work <span className="text-red-500 font-black">*</span>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Info size={10} className="text-slate-300" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-[9px] font-bold">Detailed description of tasks to be performed</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </Label>
                        <Textarea className="min-h-[160px] rounded-xl p-3 text-[12px] w-full focus:ring-2 focus:ring-slate-900/10 transition-all" placeholder="QTY, Item Name, Provide details or works to be accomplished..." value={formData.scopeOfWork} onChange={e => setFormData({...formData, scopeOfWork: e.target.value})} />
                      </div>
                    </div>
                  )}

                  {currentStep === 3 && (
                    <div className="w-full space-y-4 animate-in slide-in-from-right-4 duration-300">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <Label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1.5">
                            Documents Need for Work Permit
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Info size={12} className="text-slate-300 hover:text-slate-500 transition-colors" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-[9px] font-bold">Standard site requirements for workers</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </Label>
                          <div className="space-y-2">
                            {[
                              { id: "Medical Certificate", label: "Medical Certificate" },
                              { id: "NBI Clearance", label: "NBI Clearance" },
                              { id: "NC2 Certification", label: "NC2 Certification for Skilled Workers (Electrician, Scaffolder, etc)" },
                              { id: "Safety Officer Cert", label: "Safety Officer Certification" }
                            ].map(item => (
                              <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors w-full group">
                                <Checkbox checked={permits.includes(item.id)} onCheckedChange={() => toggleItem(permits, setPermits, item.id)} />
                                <span className="text-[11px] font-bold text-slate-700 uppercase leading-tight group-hover:text-slate-900 transition-colors">{item.label}</span>
                              </div>
                            ))}
                          </div>
                          <div className="space-y-1.5 mt-3">
                            <Label className="text-[10px] font-black uppercase text-slate-400">Others: Input Details</Label>
                            <Textarea 
                              className="min-h-[80px] rounded-xl text-[11px] font-bold uppercase w-full focus:ring-2 focus:ring-slate-900/10 transition-all" 
                              placeholder="List other documents here..."
                              value={formData.otherDocuments} 
                              onChange={e => setFormData({...formData, otherDocuments: e.target.value})} 
                            />
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400">Working Days</Label>
                            <div className="flex flex-wrap gap-2 w-full">
                              {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map(day => (
                                <button key={day} onClick={() => toggleItem(workingDays, setWorkingDays, day)} className={`size-9 rounded-lg text-[10px] font-black border-2 transition-all ${workingDays.includes(day) ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}>
                                  {day}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400">Time Range</Label>
                            <Input className="h-11 rounded-xl text-[12px] w-full focus:ring-2 focus:ring-slate-900/10 transition-all" placeholder="Time (e.g. 8am-5pm)" value={formData.workingTime} onChange={e => setFormData({...formData, workingTime: e.target.value})} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>

                <div className="p-4 border-t border-slate-100 flex justify-between bg-slate-50/30 shrink-0 items-center">
                  <div className="flex items-center gap-4">
                    <Button variant="ghost" disabled={currentStep === 1} onClick={() => setCurrentStep(prev => prev - 1)} className="h-11 px-6 font-black uppercase text-[10px]">Back</Button>
                    <span className="hidden md:block text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                      Press <kbd className="px-1.5 py-0.5 rounded border border-slate-200 bg-white">Ctrl + Enter</kbd> to proceed
                    </span>
                  </div>
                  {currentStep < 3 ? (
                    <Button 
                      onClick={() => {
                        if (currentStep === 2) {
                          if (!formData.projectName.trim() || !formData.scopeOfWork.trim()) {
                            return toast.error("Please fill in Project Name and Scope of Work.");
                          }
                        }
                        setCurrentStep(prev => prev + 1);
                      }} 
                      className="h-11 px-8 bg-slate-900 text-white font-black uppercase text-[10px] shadow-lg shadow-slate-200 hover:shadow-xl transition-all"
                    >
                      Next Step
                    </Button>
                  ) : (
                    <Button onClick={handleSubmit} disabled={isSubmitting} className="h-11 px-8 bg-emerald-600 text-white font-black uppercase text-[10px] shadow-lg shadow-emerald-100 hover:shadow-xl transition-all">
                      {isSubmitting ? <Loader2 className="animate-spin" /> : <><Send size={14} className="mr-2" /> Submit Request</>}
                    </Button>
                  )}
                </div>
              </Card>
            </div>

            {/* SIDEBAR PHOTO SECTION */}
            <div className="lg:col-span-4 flex flex-col min-h-0 space-y-3 overflow-y-auto pr-1">
              <Card className="bg-slate-900 text-white rounded-[1.5rem] p-4 shadow-xl overflow-hidden relative border-none shrink-0">
                <div className="relative z-10">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4 flex items-center gap-1.5">
                    <ShieldCheck size={12} className="text-emerald-400"/> Live Summary
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Project & Priority</p>
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-bold truncate flex-1">{formData.projectName || "Untitled Request"}</p>
                        <span className={`px-2 py-0.5 rounded-[4px] text-[8px] font-black ${formData.priority === 'HIGH' ? 'bg-red-500/20 text-red-400' : formData.priority === 'MEDIUM' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}>
                          {formData.priority}
                        </span>
                      </div>
                    </div>

                    {(siteInstallation.length > 0 || inHouse.length > 0) && (
                      <div className="space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Selected Services</p>
                        <div className="flex flex-wrap gap-1.5">
                          {[...siteInstallation, ...inHouse].map(item => (
                            <span key={item} className="px-1.5 py-0.5 bg-slate-800 rounded text-[8px] font-bold text-slate-300 ring-1 ring-white/10 hover:bg-slate-700 transition-colors">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-2 border-t border-white/5 mt-2 flex items-center justify-between">
                      <div className="flex flex-col">
                        <p className="text-[7px] font-black text-slate-500 uppercase">Step Progress</p>
                        <p className="text-[10px] font-bold text-emerald-400">{Math.round((currentStep/3)*100)}% Complete</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={clearDraft}
                        className="h-6 px-2 text-[8px] font-black uppercase text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all"
                      >
                        Reset Form
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-5 bg-white border border-slate-200 rounded-[1.5rem] shadow-sm">
                <Label className="text-[11px] font-black uppercase text-slate-400 flex items-center gap-1.5 mb-4">
                  <Camera size={12}/> Site Photos ({files.length})
                </Label>
                <div className="grid grid-cols-3 gap-1.5">
                  {files.map((file, idx) => (
                    <div key={idx} className="aspect-square rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden relative group">
                      <img src={URL.createObjectURL(file)} className="object-cover w-full h-full" alt="preview" />
                      <button onClick={() => setFiles(files.filter((_, i) => i !== idx))} className="absolute inset-0 bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  <label className="aspect-square rounded-lg bg-slate-50 border border-slate-100 border-dashed flex items-center justify-center cursor-pointer hover:bg-slate-100 transition-colors">
                    <Plus size={14} className="text-slate-300" />
                    <input type="file" multiple className="hidden" accept="image/png, image/jpeg, image/jpg, image/webp, image/gif" onChange={handleFileChange} />
                  </label>
                </div>
              </Card>
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedPageWrapper>
  );
}
