"use client"

import * as React from "react"
import Image from "next/image"
import { 
  User, Mail, ShieldCheck, MapPin, 
  Camera, Save, Fingerprint, 
  Phone, PenTool, Eraser, CheckCircle2,
  Building2, Briefcase
} from "lucide-react"
import SignatureCanvas from "react-signature-canvas"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageHeader } from "@/components/page-header"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import ProtectedPageWrapper from "@/components/protected-page-wrapper"

export default function ProfilePage() {
  const [userId, setUserId] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const sigCanvas = React.useRef<SignatureCanvas>(null)

  // System State - Initialized to match your payload structure
  const [userDetails, setUserDetails] = React.useState<any>({
    _id: "",
    Firstname: "",
    Lastname: "",
    Email: "",
    ContactNumber: "",
    Address: "",
    Role: "",
    Department: "",
    Position: "",
    Company: "",
    profilePicture: "",
    signatureImage: ""
  })

  React.useEffect(() => {
    const storedId = localStorage.getItem("userId")
    setUserId(storedId)
    if (storedId) fetchUserData(storedId)
  }, [])

  // --- API: FETCH USER DATA ---
  async function fetchUserData(id: string) {
    try {
      const res = await fetch(`/api/user?id=${encodeURIComponent(id)}`)
      const data = await res.json()
      setUserDetails(data)
    } catch (e) {
      toast.error("System could not sync your data.")
    } finally {
      setLoading(false)
    }
  }

  // --- API: SAVE CHANGES (Fixes the "User ID is required" error) ---
  const handleSave = async () => {
    if (!userDetails._id) {
      toast.error("System Error: No User ID found.");
      return;
    }

    setSaving(true)
    try {
      const res = await fetch("/api/profile-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // We map _id from the database to "id" for the API
        body: JSON.stringify({
          ...userDetails,
          id: userDetails._id 
        }),
      })
      
      const result = await res.json()

      if (res.ok) {
        toast.success("Account updated successfully.")
      } else {
        toast.error(result.error || "Update failed.")
      }
    } catch (error) {
      toast.error("Could not connect to the server.")
    } finally {
      setSaving(false)
    }
  }

  // --- API: CLOUDINARY UPLOAD ---
  const handleUpload = async (file: File | string, type: "profile" | "signature") => {
    const data = new FormData()
    data.append("file", file)
    data.append("upload_preset", "Xchire") 

    try {
      const res = await fetch("https://api.cloudinary.com/v1_1/dhczsyzcz/image/upload", {
        method: "POST",
        body: data,
      })
      const json = await res.json()
      const field = type === "profile" ? "profilePicture" : "signatureImage"
      
      setUserDetails((prev: any) => ({ ...prev, [field]: json.secure_url }))
      toast.success(`${type === "profile" ? "Photo" : "Signature"} synced to system.`)
    } catch {
      toast.error("Upload failed.")
    }
  }

  if (loading) return (
    <div className="flex h-screen items-center justify-center font-black text-[10px] tracking-[0.3em] uppercase opacity-40">
      Syncing Engiconnect...
    </div>
  )

  return (
    <ProtectedPageWrapper>
      <SidebarProvider defaultOpen={false}>
        <AppSidebar userId={userId} />
        <SidebarInset className="bg-[#F4F7F7] font-sans">
          
          <PageHeader 
            title="MY ACCOUNT" 
            version="V3.2" 
            showBackButton={true}
            trigger={<SidebarTrigger className="mr-2" />}
            actions={
              <Button 
                onClick={handleSave}
                disabled={saving}
                className="h-10 rounded-xl bg-black text-white hover:bg-zinc-800 font-bold text-[10px] tracking-widest uppercase px-6 gap-2 shadow-md transition-all active:scale-95"
              >
                <Save className={`size-4 ${saving ? "animate-spin" : ""}`} /> 
                {saving ? "Updating..." : "Save Changes"}
              </Button>
            }
          />

          <main className="p-4 md:p-8 max-w-5xl mx-auto w-full space-y-6 pb-20">
            
            {/* 1. IDENTITY HEADER */}
            <div className="bg-white rounded-[32px] border border-zinc-200/60 p-8 shadow-sm flex flex-col md:flex-row items-center gap-8">
              <div className="relative group">
                <div className="size-32 bg-zinc-100 rounded-[40px] flex items-center justify-center border-4 border-white shadow-inner overflow-hidden relative">
                  {userDetails.profilePicture ? (
                    <Image src={userDetails.profilePicture} alt="User" fill className="object-cover" />
                  ) : (
                    <User className="size-16 text-zinc-300" />
                  )}
                </div>
                <button 
                  onClick={() => document.getElementById("profile-upload")?.click()}
                  className="absolute bottom-0 right-0 p-2.5 bg-black text-white rounded-xl shadow-lg hover:scale-105 transition-transform"
                >
                  <Camera className="size-4" />
                </button>
                <input 
                  id="profile-upload" type="file" className="hidden" 
                  onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], "profile")} 
                />
              </div>
              
              <div className="text-center md:text-left space-y-1">
                <h2 className="text-2xl font-black text-zinc-900 uppercase tracking-tight">
                  {userDetails.Firstname} {userDetails.Lastname}
                </h2>
                <p className="text-sm font-medium text-zinc-400">
                  {userDetails.Position} • {userDetails.Department}
                </p>
                <div className="pt-2 flex flex-wrap justify-center md:justify-start gap-2">
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-lg uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="size-3" /> {userDetails.Status}
                  </span>
                  <span className="px-3 py-1 bg-zinc-100 text-zinc-500 text-[10px] font-bold rounded-lg uppercase tracking-wider">
                    {userDetails.Role} Access
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* 2. PERSONAL DETAILS */}
              <div className="bg-white rounded-[32px] border border-zinc-200/60 p-8 shadow-sm space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-zinc-900 text-white rounded-lg"><Fingerprint className="size-4" /></div>
                  <h3 className="font-black text-[10px] uppercase tracking-widest text-zinc-900">Personal Details</h3>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest ml-1">First Name</Label>
                      <Input 
                        value={userDetails.Firstname} 
                        onChange={(e) => setUserDetails({...userDetails, Firstname: e.target.value})}
                        className="h-12 rounded-2xl border-zinc-100 focus:ring-black" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Last Name</Label>
                      <Input 
                        value={userDetails.Lastname} 
                        onChange={(e) => setUserDetails({...userDetails, Lastname: e.target.value})}
                        className="h-12 rounded-2xl border-zinc-100 focus:ring-black" 
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Contact Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-zinc-300" />
                      <Input 
                        value={userDetails.ContactNumber || ""} 
                        onChange={(e) => setUserDetails({...userDetails, ContactNumber: e.target.value})}
                        className="pl-11 h-12 rounded-2xl border-zinc-100 focus:ring-black" 
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Work Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-zinc-300" />
                      <Input disabled value={userDetails.Email} className="pl-11 h-12 rounded-2xl bg-zinc-50 border-none text-zinc-400 cursor-not-allowed" />
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. SIGNATURE PAD */}
              <div className="bg-white rounded-[32px] border border-zinc-200/60 p-8 shadow-sm space-y-6 flex flex-col">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-zinc-900 text-white rounded-lg"><PenTool className="size-4" /></div>
                    <h3 className="font-black text-[10px] uppercase tracking-widest text-zinc-900">E-Signature Pad</h3>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => sigCanvas.current?.clear()} className="text-[9px] font-bold uppercase hover:bg-zinc-50 px-3">
                    <Eraser className="size-3 mr-1" /> Clear
                  </Button>
                </div>

                <div className="flex-1 min-h-[140px] border border-dashed border-zinc-200 rounded-2xl bg-zinc-50/50 flex flex-col items-center justify-center p-2 relative">
                  <SignatureCanvas 
                    ref={sigCanvas} 
                    penColor="black" 
                    canvasProps={{ className: "w-full h-32 cursor-crosshair" }} 
                  />
                  <Button 
                    size="sm" 
                    onClick={() => {
                      const data = sigCanvas.current?.getTrimmedCanvas().toDataURL("image/png");
                      if (data) handleUpload(data, "signature");
                    }}
                    className="mt-2 w-full bg-white border border-zinc-200 text-black text-[9px] font-black h-8 rounded-xl hover:bg-zinc-100 shadow-sm"
                  >
                    SYNC TO PROFILE
                  </Button>
                </div>
                
                {userDetails.signatureImage && (
                  <div className="flex items-center gap-4 p-3 bg-white rounded-2xl border border-zinc-100 shadow-inner mt-2">
                    <div className="text-[8px] font-black text-zinc-300 uppercase rotate-90 leading-none">ACTIVE</div>
                    <div className="relative w-full h-10">
                      <Image src={userDetails.signatureImage} alt="Active Sign" fill className="object-contain" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 4. COMPANY ASSIGNMENT (READ-ONLY) */}
            <div className="bg-white rounded-[32px] border border-zinc-200/60 p-8 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-zinc-900 text-white rounded-lg"><Building2 className="size-4" /></div>
                <h3 className="font-black text-[10px] uppercase tracking-widest text-zinc-900">Organization Info</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Company</p>
                  <p className="text-sm font-bold text-zinc-700">{userDetails.Company}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Reference ID</p>
                  <p className="text-sm font-bold text-zinc-700">{userDetails.ReferenceID}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Location Group</p>
                  <p className="text-sm font-bold text-zinc-700">{userDetails.Location}</p>
                </div>
              </div>
            </div>

          </main>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedPageWrapper>
  )
}