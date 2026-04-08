"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import ProtectedPageWrapper from "@/components/protected-page-wrapper"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { 
    ChevronLeft, Save, Loader2, Package, 
    Calendar as CalendarIcon, Clipboard, Info 
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { sendPushNotification, NotificationTemplates } from "@/lib/notification-service"

// DATABASE
import { db } from "@/lib/firebase"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { PageHeader } from "@/components/page-header"

export default function AddTestingEntryPage() {
    const router = useRouter()
    const [isSaving, setIsSaving] = React.useState(false)
    const [userId, setUserId] = React.useState<string | null>(null)

    // Form State
    const [formData, setFormData] = React.useState({
        productName: "",
        productCode: "",
        shipmentCode: "",
        quantity: "",
        piNumber: "",
        arrivalDate: "",
        targetDate: "",
        notes: ""
    })

    React.useEffect(() => {
        setUserId(localStorage.getItem("userId"))
    }, [])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.productName || !formData.shipmentCode) {
            toast.error("Please fill in the Product Name and Shipment Code")
            return
        }

        setIsSaving(true)
        try {
            await addDoc(collection(db, "testing_tracker"), {
                ...formData,
                // Convert string dates to JS Date objects for Firestore
                arrivalDate: formData.arrivalDate ? new Date(formData.arrivalDate) : null,
                targetDate: formData.targetDate ? new Date(formData.targetDate) : null,
                createdAt: serverTimestamp(),
                submittedBy: userId,
                status: "AWAITING" // Initial status
            })

            toast.success("Testing entry created successfully!")

            // Send push notification
            const notifResult = await sendPushNotification(
                NotificationTemplates.testing.created(formData.productName, formData.targetDate || "scheduled date")
            );
            if (notifResult.success && notifResult.successCount! > 0) {
                console.log(`Push sent to ${notifResult.successCount} devices`);
            }

            router.push("/request/testing") // Go back to the list
        } catch (error) {
            console.error("Error adding document: ", error)
            toast.error("Failed to save. Please try again.")
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <ProtectedPageWrapper>
            <SidebarProvider defaultOpen={false}>
                <AppSidebar userId={userId} />
                <SidebarInset className="bg-[#F4F7F7] min-h-screen">
                    
                    <PageHeader 
                        title="New Testing Entry" 
                        version="V1.0"
                        showBackButton 
                        trigger={<SidebarTrigger className="mr-2" />}
                    />

                    <main className="p-4 md:p-8 max-w-4xl mx-auto w-full pb-20">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            
                            {/* SECTION 1: PRODUCT INFO */}
                            <div className="bg-white rounded-[32px] p-6 md:p-10 border border-zinc-200/60 shadow-sm space-y-8">
                                <div className="flex items-center gap-3 border-b border-zinc-50 pb-6">
                                    <div className="p-3 bg-zinc-900 rounded-2xl text-white">
                                        <Package size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-black uppercase tracking-widest text-zinc-900">Product Information</h2>
                                        <p className="text-[10px] text-zinc-400 font-bold uppercase">Basic details for the testing unit</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <FormInput label="Product Name" name="productName" placeholder="e.g. Solar Inverter 5KW" value={formData.productName} onChange={handleInputChange} required />
                                    <FormInput label="Product Code" name="productCode" placeholder="e.g. INV-5000-X" value={formData.productCode} onChange={handleInputChange} />
                                    <FormInput label="Shipment Code / SN" name="shipmentCode" placeholder="e.g. SHIP-99021" value={formData.shipmentCode} onChange={handleInputChange} required />
                                    <FormInput label="Quantity" name="quantity" type="number" placeholder="0" value={formData.quantity} onChange={handleInputChange} />
                                    <FormInput label="PI Number" name="piNumber" placeholder="e.g. PI-2024-001" value={formData.piNumber} onChange={handleInputChange} />
                                </div>
                            </div>

                            {/* SECTION 2: TIMELINE */}
                            <div className="bg-white rounded-[32px] p-6 md:p-10 border border-zinc-200/60 shadow-sm space-y-8">
                                <div className="flex items-center gap-3 border-b border-zinc-50 pb-6">
                                    <div className="p-3 bg-blue-500 rounded-2xl text-white">
                                        <CalendarIcon size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-black uppercase tracking-widest text-zinc-900">Testing Timeline</h2>
                                        <p className="text-[10px] text-zinc-400 font-bold uppercase">Important arrival and target dates</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <FormInput label="Arrival of Items" name="arrivalDate" type="date" value={formData.arrivalDate} onChange={handleInputChange} />
                                    <FormInput label="Target Completion Date" name="targetDate" type="date" value={formData.targetDate} onChange={handleInputChange} />
                                </div>
                            </div>

                            {/* SECTION 3: ADDITIONAL NOTES */}
                            <div className="bg-white rounded-[32px] p-6 md:p-10 border border-zinc-200/60 shadow-sm space-y-6">
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                                    <Info size={14} /> Remarks / Special Instructions
                                </label>
                                <textarea 
                                    name="notes"
                                    rows={4}
                                    value={formData.notes}
                                    onChange={handleInputChange}
                                    placeholder="Enter any specific testing requirements or notes here..."
                                    className="w-full bg-zinc-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-black outline-none transition-all resize-none"
                                />
                            </div>

                            {/* SUBMIT BUTTON */}
                            <div className="flex justify-end gap-3 pt-4">
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    onClick={() => router.back()}
                                    className="h-14 px-8 rounded-2xl font-bold text-[11px] uppercase tracking-widest border-zinc-200"
                                >
                                    Cancel
                                </Button>
                                <Button 
                                    type="submit" 
                                    disabled={isSaving}
                                    className="h-14 px-10 rounded-2xl bg-black hover:bg-zinc-800 text-white font-bold text-[11px] uppercase tracking-widest shadow-xl shadow-black/10 disabled:opacity-50"
                                >
                                    {isSaving ? (
                                        <><Loader2 className="mr-2 size-4 animate-spin" /> Saving...</>
                                    ) : (
                                        <><Save className="mr-2 size-4" /> Save Entry</>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </main>

                </SidebarInset>
            </SidebarProvider>
        </ProtectedPageWrapper>
    )
}

// --- REUSABLE INPUT COMPONENT ---
function FormInput({ label, required, ...props }: any) {
    return (
        <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <input 
                {...props}
                className="w-full h-12 bg-zinc-50 border-none rounded-xl px-4 text-sm font-bold text-zinc-900 placeholder:text-zinc-300 focus:ring-2 focus:ring-black outline-none transition-all"
            />
        </div>
    )
}