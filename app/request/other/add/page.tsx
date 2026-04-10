"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  Loader2, X, Paperclip, FileText, 
  Image as ImageIcon, MessageSquare, Save, Terminal 
} from "lucide-react";
import { toast } from "sonner";
import { sendPushNotification, NotificationTemplates } from "@/lib/notification-service";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/page-header";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import ProtectedPageWrapper from "@/components/protected-page-wrapper";

// Database
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";

export default function AddOtherRequestPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isIT, setIsIT] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({ title: "", description: "" });
  
  // --- DEBUG STATE ---
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const addLog = (msg: string) => {
    setDebugLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`].slice(-10));
    console.log(msg);
  };

  useEffect(() => {
    const id = localStorage.getItem("userId");
    const dept = localStorage.getItem("department");
    
    setUserId(id);
    setIsIT(dept === "IT");

    const fetchUserData = async () => {
      if (id) {
        try {
          const userRef = doc(db, "users", id);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const role = userSnap.data()?.role;
            addLog(`System: User ${id} loaded with role: ${role}`);
          }
        } catch (err) {
          console.error("Error fetching role:", err);
        }
      }
    };
    
    fetchUserData();
  }, []);

  const handleDirectUpload = async (file: File) => {
    addLog("Cloudinary: Starting upload...");
    const data = new FormData();
    data.append("file", file);
    data.append("upload_preset", "Xchire"); 

    try {
      const res = await fetch("https://api.cloudinary.com/v1_1/dhczsyzcz/image/upload", {
        method: "POST",
        body: data,
      });
      const json = await res.json();
      addLog("Cloudinary: Upload successful");
      return json.secure_url;
    } catch (error) {
      addLog(`Cloudinary Error: ${error}`);
      return null;
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting || !userId) return;
    if (!formData.title.trim() || !formData.description.trim()) {
      return toast.error("Please fill in all fields.");
    }

    setIsSubmitting(true);
    setDebugLogs([]); 
    addLog("Submit: Beginning sync...");
    const toastId = toast.loading("Syncing with engiconnect...");

    try {
      let finalFileUrl = "";

      // 1. Get Submitting User Info
      const userRef = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.data();
      const userName = userData?.displayName || userData?.fullName || "A Team Member";

      // 2. Upload Attachment if exists
      if (attachedFile) {
        finalFileUrl = await handleDirectUpload(attachedFile);
        if (!finalFileUrl) throw new Error("Upload failed");
      }

      // 3. Save to Firestore
      addLog("Firestore: Creating 'other_requests' doc...");
      await addDoc(collection(db, "other_requests"), {
        ...formData,
        submittedBy: userId,
        submittedByName: userName,
        attachmentUrl: finalFileUrl,
        status: "PENDING",
        createdAt: serverTimestamp(),
      });
      addLog("Firestore: Document saved");

      // 4. Send push notification using new service
      addLog("FCM: Sending notification via service...");
      const notifResult = await sendPushNotification(
        NotificationTemplates.otherRequest.created(formData.title, userName)
      );
      addLog(`FCM: ${notifResult.message}`);

      toast.success("Request synced successfully.", { id: toastId });
      setTimeout(() => router.push("/request/other"), 2000); 
    } catch (e: any) {
      addLog(`Fatal Error: ${e.message}`);
      toast.error("System connection error.", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ProtectedPageWrapper>
      <SidebarProvider defaultOpen={false}>
        <AppSidebar userId={userId || ""} />
        <SidebarInset className="bg-[#F4F7F7] min-h-screen">
          <PageHeader 
            title="OTHER REQUEST" 
            version="V3.2.2" 
            showBackButton={true}
            trigger={<SidebarTrigger className="mr-2" />}
          />
          
          <main className="p-4 md:p-8 max-w-3xl mx-auto w-full space-y-6">
        <Card className="bg-white rounded-[24px] border border-zinc-200/60 shadow-sm overflow-hidden">
          <CardHeader className="border-b border-zinc-100 p-8">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-zinc-900 text-white rounded-[8px]">
                <MessageSquare size={16} />
              </div>
              <span className="font-black text-[10px] uppercase tracking-widest text-zinc-500">
                New Entry Details
              </span>
            </CardTitle>
          </CardHeader>

          <CardContent className="p-8 space-y-8">
            <div className="space-y-1.5">
              <FieldLabel className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest ml-1">
                Subject / Topic
              </FieldLabel>
              <Input 
                placeholder="What do you need help with?" 
                className="h-12 rounded-[12px] border-zinc-100 font-bold"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
              />
            </div>

            <div className="space-y-1.5">
              <FieldLabel className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest ml-1">
                Details
              </FieldLabel>
              <Textarea 
                placeholder="Explain the request..." 
                className="min-h-[150px] rounded-[12px] border-zinc-100 p-4 bg-zinc-50/50"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>

            <div className="space-y-4">
              <FieldLabel className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest ml-1">
                Supporting Files
              </FieldLabel>
              
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={(e) => e.target.files?.[0] && setAttachedFile(e.target.files[0])} 
                className="hidden" 
              />
                
              {!attachedFile ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => fileInputRef.current?.click()} 
                    className="h-20 border-dashed border-2 rounded-[18px] gap-3 text-[10px] font-bold uppercase text-zinc-400 bg-zinc-50/30 hover:bg-zinc-50 transition-all"
                  >
                    <div className="p-2 bg-white rounded-lg shadow-sm text-zinc-900"><FileText size={18} /></div>
                    Attach Document
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => fileInputRef.current?.click()} 
                    className="h-20 border-dashed border-2 rounded-[18px] gap-3 text-[10px] font-bold uppercase text-zinc-400 bg-zinc-50/30 hover:bg-zinc-50 transition-all"
                  >
                    <div className="p-2 bg-white rounded-lg shadow-sm text-zinc-900"><ImageIcon size={18} /></div>
                    Attach Photo
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between p-4 bg-zinc-900 text-white rounded-[16px]">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-zinc-800 rounded-lg"><Paperclip size={16} /></div>
                    <span className="text-[10px] font-bold uppercase tracking-tight truncate max-w-[200px]">
                      {attachedFile.name}
                    </span>
                  </div>
                  <button onClick={() => setAttachedFile(null)} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
                    <X size={18} />
                  </button>
                </div>
              )}
            </div>
          </CardContent>

          <div className="p-6 border-t border-zinc-100 flex flex-col md:flex-row justify-between items-center bg-zinc-50/30 gap-4">
            <Button variant="ghost" onClick={() => router.back()} className="font-bold uppercase text-[10px] text-zinc-400 hover:text-black">
              Cancel Entry
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting} 
              className="w-full md:w-64 h-12 rounded-[12px] bg-black text-white hover:opacity-90 font-bold uppercase text-[10px] tracking-widest gap-2 shadow-lg active:scale-95 transition-all"
            >
              {isSubmitting ? <Loader2 className="animate-spin size-4" /> : <Save size={14} />}
              {isSubmitting ? "Syncing..." : "Submit"}
            </Button>
          </div>
        </Card>

        {isIT && (
          <div className="mt-10 rounded-[16px] bg-zinc-900 p-4 shadow-xl border-t-4 border-yellow-500">
            <div className="flex items-center gap-2 mb-3 text-yellow-500">
              <Terminal size={14} />
              <span className="text-[9px] font-black uppercase tracking-[2px]">IT Debug Logs</span>
            </div>
            <div className="space-y-1 font-mono text-[10px]">
              {debugLogs.length === 0 && <div className="text-zinc-600 italic">Awaiting action...</div>}
              {debugLogs.map((log, i) => (
                <div key={i} className="text-zinc-300 border-l border-zinc-700 pl-2">
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
      </SidebarInset>
    </SidebarProvider>
  </ProtectedPageWrapper>
  );
}