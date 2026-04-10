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
  Plus, Send, Loader2, Wrench, FileText, X, ShieldCheck, Clock, Camera, ClipboardCheck
} from "lucide-react";
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
    otherPersonnel: "",
    otherPpe: "",
    tempFacility: "No",
    safetyInduction: "No",
    safetyNotes: "",
  });

  const [siteInstallation, setSiteInstallation] = useState<string[]>([]);
  const [inHouse, setInHouse] = useState<string[]>([]);
  const [personnel, setPersonnel] = useState<string[]>([]);
  const [ppe, setPpe] = useState<string[]>([]);
  const [permits, setPermits] = useState<string[]>([]);
  const [workingDays, setWorkingDays] = useState<string[]>([]);

  useEffect(() => {
    setUserId(localStorage.getItem("userId"));
  }, []);

  const toggleItem = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, value: string) => {
    setList(list.includes(value) ? list.filter(i => i !== value) : [...list, value]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
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
        personnel,
        ppe,
        permits,
        workingDays,
        attachments: uploadedUrls, // Storing the list of links
        status: "PENDING",
        createdBy: userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast.success("Job request synced successfully.", { id: toastId });

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
          
          <main className="p-4 md:p-8 max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          {/* STEP INDICATORS */}
          <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center overflow-x-auto gap-2">
            {[
              { id: 1, label: "Assistance", icon: Wrench },
              { id: 2, label: "Scope", icon: FileText },
              { id: 3, label: "Safety", icon: ShieldCheck },
              { id: 4, label: "Logistics", icon: Clock }
            ].map((step) => (
              <button 
                key={step.id} 
                onClick={() => setCurrentStep(step.id)}
                className={`flex items-center gap-3 px-6 py-3 rounded-xl transition-all whitespace-nowrap ${currentStep === step.id ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
              >
                <step.icon size={16} /> 
                <span className="text-[10px] font-black uppercase tracking-wider">{step.label}</span>
              </button>
            ))}
          </div>

          <Card className="shadow-xl border-none rounded-[2rem] bg-white overflow-hidden min-h-[550px] flex flex-col">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-6 px-8">
              <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-3">
                <span className="bg-slate-900 text-white size-6 rounded-lg flex items-center justify-center text-[10px]">{currentStep}</span>
                {currentStep === 1 && "Job Assistance Selection"}
                {currentStep === 2 && "Scope & Site Details"}
                {currentStep === 3 && "Personnel & Safety"}
                {currentStep === 4 && "Logistics & Schedule"}
              </CardTitle>
            </CardHeader>

            <CardContent className="p-8 flex-1">
              {currentStep === 1 && (
                <div className="grid md:grid-cols-2 gap-10">
                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Site Installation</Label>
                    {["Solar LED Lights", "Non-Solar LED Lights", "Lamp Post", "Wiring Layout"].map(item => (
                      <div key={item} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer">
                        <Checkbox checked={siteInstallation.includes(item)} onCheckedChange={() => toggleItem(siteInstallation, setSiteInstallation, item)} />
                        <span className="text-[11px] font-bold text-slate-700 uppercase">{item}</span>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase text-slate-400">In-House</Label>
                    {["Rewiring", "Painting", "Assembly"].map(item => (
                      <div key={item} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer">
                        <Checkbox checked={inHouse.includes(item)} onCheckedChange={() => toggleItem(inHouse, setInHouse, item)} />
                        <span className="text-[11px] font-bold text-slate-700 uppercase">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Project Name</Label>
                    <Input className="h-12 rounded-xl font-bold" value={formData.projectName} onChange={e => setFormData({...formData, projectName: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Scope of Work</Label>
                    <Textarea className="min-h-[150px] rounded-2xl p-4 text-sm" value={formData.scopeOfWork} onChange={e => setFormData({...formData, scopeOfWork: e.target.value})} />
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-8">
                  <div className="grid md:grid-cols-2 gap-10">
                    <div className="space-y-4">
                      <Label className="text-[10px] font-black uppercase text-slate-400">Personnel</Label>
                      {["Safety Officer", "Scaffolder"].map(item => (
                        <div key={item} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100">
                          <Checkbox checked={personnel.includes(item)} onCheckedChange={() => toggleItem(personnel, setPersonnel, item)} />
                          <span className="text-[11px] font-bold text-slate-700 uppercase">{item}</span>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-4">
                      <Label className="text-[10px] font-black uppercase text-slate-400">PPE Required</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {["Hard Hat", "Safety Shoes", "Vest"].map(item => (
                          <div key={item} className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg">
                            <Checkbox checked={ppe.includes(item)} onCheckedChange={() => toggleItem(ppe, setPpe, item)} />
                            <span className="text-[9px] font-bold text-slate-600 uppercase">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 4 && (
                <div className="space-y-8">
                  <div className="grid md:grid-cols-2 gap-10">
                    <div className="space-y-4">
                      <Label className="text-[10px] font-black uppercase text-slate-400">Permits Needed</Label>
                      {["Gate Pass", "Hot Work"].map(item => (
                        <div key={item} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100">
                          <Checkbox checked={permits.includes(item)} onCheckedChange={() => toggleItem(permits, setPermits, item)} />
                          <span className="text-[11px] font-bold text-slate-700 uppercase">{item}</span>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-6">
                      <Label className="text-[10px] font-black uppercase text-slate-400">Working Days</Label>
                      <div className="flex flex-wrap gap-2">
                        {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map(day => (
                          <button key={day} onClick={() => toggleItem(workingDays, setWorkingDays, day)} className={`size-10 rounded-lg text-[9px] font-black border-2 transition-all ${workingDays.includes(day) ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-100 text-slate-400'}`}>
                            {day}
                          </button>
                        ))}
                      </div>
                      <Input className="h-12 rounded-xl" placeholder="Time (e.g. 8am-5pm)" value={formData.workingTime} onChange={e => setFormData({...formData, workingTime: e.target.value})} />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>

            <div className="p-6 border-t border-slate-100 flex justify-between bg-slate-50/30">
              <Button variant="ghost" disabled={currentStep === 1} onClick={() => setCurrentStep(prev => prev - 1)} className="h-12 px-8 font-black uppercase text-[10px]">Back</Button>
              {currentStep < 4 ? (
                <Button onClick={() => setCurrentStep(prev => prev + 1)} className="h-12 px-10 bg-slate-900 text-white font-black uppercase text-[10px]">Next Step</Button>
              ) : (
                <Button onClick={handleSubmit} disabled={isSubmitting} className="h-12 px-10 bg-emerald-600 text-white font-black uppercase text-[10px]">
                  {isSubmitting ? <Loader2 className="animate-spin" /> : <><Send size={16} className="mr-2" /> Submit Request</>}
                </Button>
              )}
            </div>
          </Card>
        </div>

        {/* SIDEBAR PHOTO SECTION */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="bg-slate-900 text-white rounded-[2.5rem] p-8 shadow-2xl">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-6 flex items-center gap-2">
              <ClipboardCheck size={14} className="text-emerald-400"/> Summary
            </h3>
            <p className="text-[9px] font-black text-slate-500 uppercase">Project Name</p>
            <p className="text-sm font-bold">{formData.projectName || "Untitled"}</p>
          </Card>

          <Card className="p-6 bg-white border border-slate-200 rounded-[2rem] shadow-sm">
            <Label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2 mb-4">
              <Camera size={12}/> Site Photos ({files.length})
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {files.map((file, idx) => (
                <div key={idx} className="aspect-square rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden relative group">
                  <img src={URL.createObjectURL(file)} className="object-cover w-full h-full" alt="preview" />
                  <button onClick={() => setFiles(files.filter((_, i) => i !== idx))} className="absolute inset-0 bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <X size={14} />
                  </button>
                </div>
              ))}
              <label className="aspect-square rounded-xl bg-slate-50 border border-slate-100 border-dashed flex items-center justify-center cursor-pointer hover:bg-slate-100">
                <Plus size={16} className="text-slate-300" />
                <input type="file" multiple className="hidden" accept="image/*" onChange={handleFileChange} />
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