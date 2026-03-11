"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  Send, Loader2, X, Paperclip, FileText, 
  Image as ImageIcon, MessageSquare, Save 
} from "lucide-react";
import { toast } from "sonner";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/page-header";

// Database
import { db } from "@/lib/firebase";
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  getDocs, 
  doc, 
  getDoc 
} from "firebase/firestore";

export default function AddOtherRequestPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({ title: "", description: "" });

  useEffect(() => {
    setUserId(localStorage.getItem("userId"));
  }, []);

  // DIRECT CLOUDINARY UPLOAD
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
      console.error("Cloudinary Error:", error);
      return null;
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting || !userId) return;
    if (!formData.title.trim() || !formData.description.trim()) {
      return toast.error("Please fill in all fields.");
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Syncing with engiconnect...");

    try {
      let finalFileUrl = "";

      // 1. Get Submitting User Name for the Notification body
      const userRef = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);
      const userName = userSnap.data()?.displayName || userSnap.data()?.fullName || "A Team Member";

      // 2. Upload if file exists
      if (attachedFile) {
        finalFileUrl = await handleDirectUpload(attachedFile);
        if (!finalFileUrl) throw new Error("Upload failed");
      }

      // 3. Save to Firestore
      await addDoc(collection(db, "other_requests"), {
        ...formData,
        submittedBy: userId,
        submittedByName: userName,
        attachmentUrl: finalFileUrl,
        status: "PENDING",
        createdAt: serverTimestamp(),
      });

      // 4. NOTIFICATION LOGIC: Fetch all subscribers' tokens
      const allTokens: string[] = [];
      const usersSnap = await getDocs(collection(db, "users"));
      
      // Loop through all users to get tokens from their 'devices' sub-collection
      for (const uDoc of usersSnap.docs) {
        const devicesSnap = await getDocs(collection(db, "users", uDoc.id, "devices"));
        devicesSnap.forEach((d) => {
          const token = d.data().fcmToken;
          if (token && !allTokens.includes(token)) {
            allTokens.push(token);
          }
        });
      }

      // 5. Send Push Notification if tokens exist
      if (allTokens.length > 0) {
        await fetch("/api/send-push", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: `New Request: ${formData.title}`,
            body: `${userName} just submitted a new entry.`,
            tokens: allTokens,
            url: "/request/other", // Redirect path for users who click the notification
          }),
        });
      }

      toast.success("Request synced successfully.", { id: toastId });
      router.push("/request/other");
    } catch (e) {
      console.error("Submission Error:", e);
      toast.error("System connection error.", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7F7] font-sans pb-10">
      <PageHeader 
        title="OTHER REQUEST" 
        version="V3.2" 
        showBackButton={true} 
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
            {/* Subject Field */}
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

            {/* Description Field */}
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

            {/* Attachment Section */}
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
                <div className="flex items-center justify-between p-4 bg-zinc-900 text-white rounded-[16px] animate-in fade-in zoom-in duration-300">
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

          {/* Footer Actions */}
          <div className="p-6 border-t border-zinc-100 flex flex-col md:flex-row justify-between items-center bg-zinc-50/30 gap-4">
            <Button 
              variant="ghost" 
              onClick={() => router.back()} 
              className="font-bold uppercase text-[10px] text-zinc-400 hover:text-black"
            >
              Cancel Entry
            </Button>

            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting} 
              className="w-full md:w-64 h-12 rounded-[12px] bg-black text-white hover:opacity-90 font-bold uppercase text-[10px] tracking-widest gap-2 shadow-lg active:scale-95 transition-all"
            >
              {isSubmitting ? <Loader2 className="animate-spin size-4" /> : <Save size={14} />}
              {isSubmitting ? "Syncing..." : "Submit to Engiconnect"}
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
}