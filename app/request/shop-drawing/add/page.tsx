"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  Weight, Droplets, Send, Loader2, ChevronRight, ChevronLeft,
  LayoutGrid, Ruler, Anchor, Paintbrush, Eye, Paperclip, X,
  ZoomIn, ZoomOut, Maximize2, RefreshCcw, FileDown, ClipboardCheck,
  FileText
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { toast } from "sonner";

// ZOOM & EXPORT INTEGRATION
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// FIREBASE INTEGRATION
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

/**
 * engiconnect: Shop Drawing Protocol
 * Version 4.3.2 (Added Technical Drawing Tab)
 */
export default function CompleteShopDrawingProtocol() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const visualizerRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState("schematic");
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);

  // Identity Check
  useEffect(() => {
    const storedId = localStorage.getItem("userId");
    if (storedId) {
      setCurrentUserId(storedId);
    } else {
      toast.error("Identity Missing", { description: "Log in to ensure project visibility." });
    }
  }, []);

  // Main Design State
  const [formData, setFormData] = useState({
    postType: "straight",
    height: "10",
    topDiameter: "90",
    bottomDiameter: "190",
    thickness: "4.5",
    armType: "double",
    armQty: "2",
    armLength: "3.3",
    armBaseDia: "101",
    armTipDia: "37",
    boomAngle: "37",
    basePlateSize: "400",
    basePlateThick: "20",
    anchorBoltSpacing: "300",
    anchorBoltShape: "J",
    anchorBoltLength: "700",
    bendLength: "100",
    stiffenerSize: "150",
    stiffenerThick: "12",
    protectionFinish: "hdg",
    topCoat: "powder",
    handHole: "with",
    application: "street",
    ralColor: "#475569",
    notes: ""
  });

  // Calculate Weight and Area
  const stats = useMemo(() => {
    const h = parseFloat(formData.height) || 0;
    const t = parseFloat(formData.thickness) || 0;
    const bd = parseFloat(formData.bottomDiameter) || 0;
    const td = parseFloat(formData.topDiameter) || 0;
    const qty = formData.armType === "double" ? 2 : 1;
    const aL = parseFloat(formData.armLength) || 0;

    const weight = ((Math.PI * ((bd + td) / 2000) * (t / 1000) * h * 7850) * (1 + (qty * (aL * 0.08)))).toFixed(1);
    const surfaceArea = (Math.PI * ((bd + td) / 2000) * h).toFixed(2);
    return { weight, surfaceArea };
  }, [formData]);

  // PDF Export Logic
  const downloadDrawingPDF = async () => {
    const svgElement = exportRef.current?.querySelector("svg");
    if (!svgElement) {
      toast.error("Drawing not ready for export");
      return;
    }

    const toastId = toast.loading("Generating Technical Drawing...");

    try {
      const canvas = await html2canvas(exportRef.current!, {
        scale: 3,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        ignoreElements: (element) => element.classList.contains('z-20')
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(18);
      pdf.text("ENGICONNECT SHOP DRAWING", 105, 20, { align: "center" });

      pdf.setLineWidth(0.5);
      pdf.line(20, 25, 190, 25);

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      const leftCol = 20;
      const rightCol = 110;

      pdf.text(`Height: ${formData.height}m`, leftCol, 35);
      pdf.text(`Thickness: ${formData.thickness}mm`, leftCol, 40);
      pdf.text(`Weight (est): ${stats.weight}kg`, leftCol, 45);

      pdf.text(`Finish: ${formData.protectionFinish.toUpperCase()}`, rightCol, 35);
      pdf.text(`Top Coat: ${formData.topCoat}`, rightCol, 40);
      pdf.text(`Project: ${formData.notes?.substring(0, 30) || 'Standard Design'}`, rightCol, 45);

      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth() - 40;
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, "PNG", 20, 55, pdfWidth, pdfHeight);

      pdf.save(`ShopDrawing_${formData.height}M_${new Date().getTime()}.pdf`);
      toast.success("PDF Generated Successfully", { id: toastId });
    } catch (error) {
      toast.error("Failed to generate PDF", { id: toastId });
    }
  };

  const toggleFullScreen = () => {
    if (!visualizerRef.current) return;
    if (!document.fullscreenElement) {
      visualizerRef.current.requestFullscreen().catch(() => {
        toast.error("Error", { description: "Cannot enter full screen." });
      });
    } else {
      document.exitFullscreen();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAttachedFile(e.target.files[0]);
      toast.success("File attached", { description: e.target.files[0].name });
    }
  };

  const removeFile = () => {
    setAttachedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (isSubmitting || !currentUserId) return;
    setIsSubmitting(true);
    const toastId = toast.loading("Saving and notifying team...");

    try {
      const payload = {
        projectName: formData.notes?.substring(0, 25) || `POLE-${formData.height}M`,
        submittedBy: currentUserId,
        department: "ENGINEERING",
        status: "PENDING_REVIEW",
        parameters: { ...formData },
        metrics: { ...stats },
        fileName: attachedFile ? attachedFile.name : null,
        createdAt: serverTimestamp(),
      };

      // 1. Save to Firestore
      await addDoc(collection(db, "shop_drawing_requests"), payload);

      // 2. Fetch Engineering tokens to notify the team
      const { getDocs, query, where, collection: coll } = await import("firebase/firestore");
      const userQuery = query(coll(db, "users"), where("department", "==", "ENGINEERING"));
      const userSnapshot = await getDocs(userQuery);

      const tokens: string[] = [];
      userSnapshot.forEach(doc => {
        const token = doc.data().fcmToken;
        if (token) tokens.push(token);
      });

      // 3. Trigger the Push Notification
      if (tokens.length > 0) {
        await fetch("/api/send-push", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: "New Shop Drawing!",
            body: `Project: ${payload.projectName} requires review.`,
            tokens: tokens
          })
        });
      }

      toast.success("Protocol saved & Team Notified!", { id: toastId });
      setTimeout(() => router.push("/request/shop-drawing"), 800);
    } catch (e) {
      toast.error("Failed to save.", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const render2DVisualizer = () => {
    const {
      height, armLength, boomAngle, topDiameter, bottomDiameter, thickness,
      postType, armType, armBaseDia, armTipDia, basePlateSize, basePlateThick,
      anchorBoltShape, anchorBoltLength, anchorBoltSpacing, bendLength, stiffenerSize, ralColor
    } = formData;

    const h = parseFloat(height) || 0;
    const aL = parseFloat(armLength) || 0;
    const angle = parseFloat(boomAngle) || 0;
    const topD = parseFloat(topDiameter) || 0;
    const botD = parseFloat(bottomDiameter) || 0;
    const thick = parseFloat(thickness) || 3;
    const bpS = parseFloat(basePlateSize) || 400;
    const bpT = parseFloat(basePlateThick) || 20;
    const stiffH = parseFloat(stiffenerSize) || 0;

    const scale = 300 / 15;
    const poleH = h * scale;
    const armW = aL * scale;
    const armRun = Math.cos(angle * Math.PI / 180) * armW;
    const armRise = Math.sin(angle * Math.PI / 180) * armW;

    const visBotD = (botD / 8);
    const visTopD = (topD / 8);
    const visABase = (parseFloat(armBaseDia) / 8);
    const visATip = (parseFloat(armTipDia) / 8);
    const visBP = (bpS / 10);
    const visBPT = (bpT / 2);
    const visStiff = (stiffH / 10);
    const visBoltL = (parseFloat(anchorBoltLength) / 20);
    const visBoltSpacing = (parseFloat(anchorBoltSpacing) / 10);
    const visBendL = (parseFloat(bendLength) / 10);
    const groundY = 380;

    // Technical Drawing View (Blue Print Style)
    const isTech = activeTab === "technical";

    return (
      <TransformWrapper initialScale={1} minScale={0.5} maxScale={8} centerOnInit>
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            <div className="absolute bottom-4 left-4 flex gap-1 z-20">
              <Button size="sm" variant="secondary" className="h-8 w-8 p-0 rounded-md shadow-sm bg-white/80 backdrop-blur" onClick={() => zoomIn()}><ZoomIn size={14} /></Button>
              <Button size="sm" variant="secondary" className="h-8 w-8 p-0 rounded-md shadow-sm bg-white/80 backdrop-blur" onClick={() => zoomOut()}><ZoomOut size={14} /></Button>
              <Button size="sm" variant="secondary" className="h-8 w-8 p-0 rounded-md shadow-sm bg-white/80 backdrop-blur" onClick={() => resetTransform()}><RefreshCcw size={14} /></Button>
              <Button size="sm" variant="secondary" className="h-8 w-8 p-0 rounded-md shadow-sm bg-white/80 backdrop-blur" onClick={toggleFullScreen}><Maximize2 size={14} /></Button>
              <Button size="sm" variant="secondary" className="h-8 w-8 p-0 rounded-md shadow-sm bg-white/80 backdrop-blur text-emerald-600" onClick={downloadDrawingPDF}><FileDown size={14} /></Button>
            </div>

            <TransformComponent wrapperClass="!w-full !h-full" contentClass="w-full h-full flex items-center justify-center">
              <div ref={exportRef} className={`cursor-grab active:cursor-grabbing p-10 rounded-lg ${isTech ? 'bg-white' : ''}`}>
                <svg viewBox="0 0 300 450" className="w-[300px] h-[450px] overflow-visible transition-all duration-500">
                  <defs>
                    <linearGradient id="lightBeamGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#FDE68A" stopOpacity="0.4" />
                      <stop offset="80%" stopColor="#FBBF24" stopOpacity="0.1" />
                      <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
                    </linearGradient>
                    <filter id="lightBloom"><feGaussianBlur stdDeviation="6" result="blur" /><feComposite in="SourceGraphic" in2="blur" operator="over" /></filter>
                  </defs>

                  {/* Anchor Bolts */}
                  <g stroke={activeTab === 'photometric' ? '#334155' : isTech ? '#121212' : '#94a3b8'} strokeWidth={isTech ? "1" : "2"} fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <path d={`M ${150 - visBoltSpacing / 2} ${groundY} v ${visBoltL} ${anchorBoltShape === 'J' ? `q 0 ${visBendL / 2} -${visBendL} 0` : anchorBoltShape === 'L' ? `h -${visBendL}` : ''}`} />
                    <path d={`M ${150 + visBoltSpacing / 2} ${groundY} v ${visBoltL} ${anchorBoltShape === 'J' ? `q 0 ${visBendL / 2} ${visBendL} 0` : anchorBoltShape === 'L' ? `h ${visBendL}` : ''}`} />
                  </g>

                  {/* Ground Line */}
                  {!isTech && <rect x="0" y={groundY} width="300" height="60" fill={activeTab === 'photometric' ? '#020617' : '#f1f5f9'} opacity="0.9" />}
                  {isTech && <line x1="50" y1={groundY} x2="250" y2={groundY} stroke="#121212" strokeWidth="0.5" strokeDasharray="4" />}

                  {/* Photometric Layer */}
                  {activeTab === "photometric" && (
                    <g filter="url(#lightBloom)" opacity="0.8">
                      <path d={`M ${150 + visTopD / 2 + armRun} ${groundY - poleH - armRise} L ${150 + visTopD / 2 + armRun + 50} ${groundY} L ${150 + visTopD / 2 + armRun - 50} ${groundY} Z`} fill="url(#lightBeamGrad)" />
                      {armType === "double" && (
                        <path d={`M ${150 - visTopD / 2 - armRun} ${groundY - poleH - armRise} L ${150 - visTopD / 2 - armRun + 50} ${groundY} L ${150 - visTopD / 2 - armRun - 50} ${groundY} Z`} fill="url(#lightBeamGrad)" />
                      )}
                    </g>
                  )}

                  {/* Stiffeners and Base Plate */}
                  <path d={`M ${150 - visBotD / 2} ${groundY - visBPT} L ${150 - visBotD / 2 - visStiff} ${groundY - visBPT} L ${150 - visBotD / 2} ${groundY - visBPT - visStiff} Z`} fill={activeTab === 'photometric' ? '#1e293b' : isTech ? 'none' : '#94a3b8'} stroke={isTech ? '#121212' : 'none'} opacity="0.8" />
                  <path d={`M ${150 + visBotD / 2} ${groundY - visBPT} L ${150 + visBotD / 2 + visStiff} ${groundY - visBPT} L ${150 + visBotD / 2} ${groundY - visBPT - visStiff} Z`} fill={activeTab === 'photometric' ? '#1e293b' : isTech ? 'none' : '#94a3b8'} stroke={isTech ? '#121212' : 'none'} opacity="0.8" />
                  <rect x={150 - visBP / 2} y={groundY - visBPT} width={visBP} height={visBPT} fill={activeTab === 'photometric' ? '#1e293b' : isTech ? 'none' : '#475569'} stroke={isTech ? '#121212' : 'none'} rx="1" />

                  {/* Main Pole Body */}
                  <path d={`M ${150 - visBotD / 2} ${groundY - visBPT} L ${150 + visBotD / 2} ${groundY - visBPT} L ${150 + visTopD / 2} ${groundY - poleH} L ${150 - visTopD / 2} ${groundY - poleH} Z`} fill={activeTab === 'photometric' ? '#0f172a' : isTech ? 'none' : ralColor} stroke={activeTab === 'photometric' ? '#334155' : '#121212'} strokeWidth={isTech ? 1 : thick / 4} />

                  {/* Outreach / Arms */}
                  <g transform={`translate(150, ${groundY - poleH})`}>
                    {postType === "straight" ? (
                      <>
                        <path d={`M ${visTopD / 2} ${-visABase / 4} L ${visTopD / 2 + armRun} ${-armRise - visATip / 2} L ${visTopD / 2 + armRun} ${-armRise + visATip / 2} L ${visTopD / 2} ${visABase / 4} Z`} fill={activeTab === 'photometric' ? '#0f172a' : isTech ? 'none' : ralColor} stroke="#121212" strokeWidth={isTech ? 1 : 0.5} />
                        {armType === "double" && <path d={`M ${-visTopD / 2} ${-visABase / 4} L ${-visTopD / 2 - armRun} ${-armRise - visATip / 2} L ${-visTopD / 2 - armRun} ${-armRise + visATip / 2} L ${-visTopD / 2} ${visABase / 4} Z`} fill={activeTab === 'photometric' ? '#0f172a' : isTech ? 'none' : ralColor} stroke="#121212" strokeWidth={isTech ? 1 : 0.5} />}
                      </>
                    ) : (
                      <>
                        <path d={`M ${visTopD / 2} 0 Q ${visTopD / 2} ${-armRise * 0.7} ${visTopD / 2 + armRun} ${-armRise}`} fill="none" stroke={activeTab === 'photometric' ? '#334155' : isTech ? '#121212' : ralColor} strokeWidth={(visABase + visATip) / 2} strokeLinecap="round" />
                        {armType === "double" && <path d={`M ${-visTopD / 2} 0 Q ${-visTopD / 2} ${-armRise * 0.7} ${-visTopD / 2 - armRun} ${-armRise}`} fill="none" stroke={activeTab === 'photometric' ? '#334155' : isTech ? '#121212' : ralColor} strokeWidth={(visABase + visATip) / 2} strokeLinecap="round" />}
                      </>
                    )}
                  </g>

                  {/* Technical Annotations */}
                  {isTech && (
                    <g className="text-[6px] fill-black font-mono">
                      {/* Height Dim */}
                      <line x1="80" y1={groundY} x2="80" y2={groundY - poleH} stroke="black" strokeWidth="0.5" />
                      <text x="75" y={groundY - poleH / 2} transform={`rotate(-90, 75, ${groundY - poleH / 2})`}>{height}m Height</text>

                      {/* Diameters */}
                      <text x="150" y={groundY + 10} textAnchor="middle">{bottomDiameter}mm Bottom Dia</text>
                      <text x="150" y={groundY - poleH - 10} textAnchor="middle">{topDiameter}mm Top Dia</text>

                      {/* Arm Length */}
                      <text x={150 + armRun} y={groundY - poleH - armRise - 10} textAnchor="middle">{armLength}m Arm</text>

                      {/* Thickness */}
                      <text x={150 + visBotD} y={groundY - poleH / 4} textAnchor="start">{thickness}mm Wall</text>
                    </g>
                  )}
                </svg>
              </div>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
    );
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] font-sans pb-10">
      <PageHeader title="Shop Drawing Wizard" version="4.3.2" showBackButton={true} />

      <main className="p-3 md:p-6 max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* FORM SIDE */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center overflow-x-auto gap-3">
            {[
              { id: 1, label: "Column", icon: LayoutGrid },
              { id: 2, label: "Outreach", icon: Ruler },
              { id: 3, label: "Base", icon: Anchor },
              { id: 4, label: "Review", icon: ClipboardCheck }
            ].map((step) => (
              <button key={step.id} onClick={() => setCurrentStep(step.id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap ${currentStep === step.id ? 'bg-black text-white' : 'text-gray-400 hover:bg-gray-50'}`}>
                <step.icon size={14} /> <span className="text-[9px] font-bold uppercase">{step.label}</span>
              </button>
            ))}
          </div>

          <Card className="shadow-lg border-none rounded-2xl bg-white overflow-hidden flex flex-col">
            <CardHeader className="bg-gray-50 border-b border-gray-100 py-4 px-6">
              <CardTitle className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
                <span className="bg-black text-white size-5 rounded-full flex items-center justify-center text-[9px]">{currentStep}</span>
                {currentStep === 1 && "Column Specs"}
                {currentStep === 2 && "Arm Details"}
                {currentStep === 3 && "Foundation Details"}
                {currentStep === 4 && "Final Review & Finish"}
              </CardTitle>
            </CardHeader>

            <CardContent className="p-6 flex-1 overflow-y-auto max-h-[600px]">
              {currentStep === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 animate-in fade-in slide-in-from-bottom-2">
                  <Field><FieldLabel>Post Design</FieldLabel>
                    <Select onValueChange={(v) => setFormData({ ...formData, postType: v })} value={formData.postType}>
                      <SelectTrigger className="h-11 rounded-lg"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="straight">Straight Tapered</SelectItem><SelectItem value="bent">Self Bent</SelectItem></SelectContent>
                    </Select>
                  </Field>
                  <Field><FieldLabel>Total Height (m)</FieldLabel>
                    <div className="flex gap-3 items-center"><Slider className="flex-1" value={[parseFloat(formData.height) || 0]} min={3} max={20} step={0.5} onValueChange={(v) => setFormData({ ...formData, height: v[0].toString() })} /><Input className="w-16 h-11 text-center font-bold text-md rounded-lg" value={formData.height} onChange={(e) => setFormData({ ...formData, height: e.target.value })} /></div>
                  </Field>
                  <Field><FieldLabel>Top Diameter (mm)</FieldLabel><Input className="h-11 rounded-lg font-mono" value={formData.topDiameter} onChange={(e) => setFormData({ ...formData, topDiameter: e.target.value })} /></Field>
                  <Field><FieldLabel>Bottom Diameter (mm)</FieldLabel><Input className="h-11 rounded-lg font-mono" value={formData.bottomDiameter} onChange={(e) => setFormData({ ...formData, bottomDiameter: e.target.value })} /></Field>
                  <Field className="md:col-span-2"><FieldLabel>Thickness (mm)</FieldLabel>
                    <div className="grid grid-cols-5 gap-2">{["3.0", "4.0", "4.5", "5.0", "6.0"].map((t) => (
                      <Button key={t} variant={formData.thickness === t ? "default" : "outline"} onClick={() => setFormData({ ...formData, thickness: t })} className="h-10 rounded-lg text-xs">{t}mm</Button>
                    ))}</div>
                  </Field>
                </div>
              )}

              {currentStep === 2 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 animate-in fade-in slide-in-from-right-2">
                  <Field><FieldLabel>Arm Type</FieldLabel>
                    <Select onValueChange={(v) => setFormData({ ...formData, armType: v })} value={formData.armType}>
                      <SelectTrigger className="h-11 rounded-lg"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="single">Single Outreach</SelectItem><SelectItem value="double">Double Outreach</SelectItem></SelectContent>
                    </Select>
                  </Field>
                  <Field><FieldLabel>Quantity</FieldLabel><Input className="h-11 rounded-lg" type="number" value={formData.armQty} onChange={(e) => setFormData({ ...formData, armQty: e.target.value })} /></Field>
                  <Field><FieldLabel>Length (m)</FieldLabel><Input className="h-11 rounded-lg font-mono" value={formData.armLength} onChange={(e) => setFormData({ ...formData, armLength: e.target.value })} /></Field>
                  <Field><FieldLabel>Inclination Angle (°)</FieldLabel><Input className="h-11 rounded-lg font-mono" value={formData.boomAngle} onChange={(e) => setFormData({ ...formData, boomAngle: e.target.value })} /></Field>
                  <Field><FieldLabel>Arm Base Dia (mm)</FieldLabel><Input className="h-11 rounded-lg font-mono" value={formData.armBaseDia} onChange={(e) => setFormData({ ...formData, armBaseDia: e.target.value })} /></Field>
                  <Field><FieldLabel>Arm Tip Dia (mm)</FieldLabel><Input className="h-11 rounded-lg font-mono" value={formData.armTipDia} onChange={(e) => setFormData({ ...formData, armTipDia: e.target.value })} /></Field>
                </div>
              )}

              {currentStep === 3 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 animate-in fade-in slide-in-from-right-2">
                  <Field><FieldLabel>Base Plate Size (mm)</FieldLabel><Input className="h-11 rounded-lg" value={formData.basePlateSize} onChange={(e) => setFormData({ ...formData, basePlateSize: e.target.value })} /></Field>
                  <Field><FieldLabel>Base Plate Thick (mm)</FieldLabel><Input className="h-11 rounded-lg" value={formData.basePlateThick} onChange={(e) => setFormData({ ...formData, basePlateThick: e.target.value })} /></Field>
                  <Field><FieldLabel>Bolt Spacing (mm)</FieldLabel><Input className="h-11 rounded-lg" value={formData.anchorBoltSpacing} onChange={(e) => setFormData({ ...formData, anchorBoltSpacing: e.target.value })} /></Field>
                  <Field><FieldLabel>Bolt Shape</FieldLabel>
                    <Select onValueChange={(v) => setFormData({ ...formData, anchorBoltShape: v })} value={formData.anchorBoltShape}>
                      <SelectTrigger className="h-11 rounded-lg"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="J">J-Bolt</SelectItem><SelectItem value="L">L-Bolt</SelectItem><SelectItem value="I">Straight</SelectItem></SelectContent>
                    </Select>
                  </Field>
                  <Field><FieldLabel>Bolt Length (mm)</FieldLabel><Input className="h-11 rounded-lg" value={formData.anchorBoltLength} onChange={(e) => setFormData({ ...formData, anchorBoltLength: e.target.value })} /></Field>
                  <Field><FieldLabel>Bend Dimension (mm)</FieldLabel><Input className="h-11 rounded-lg" value={formData.bendLength} onChange={(e) => setFormData({ ...formData, bendLength: e.target.value })} /></Field>
                  <Field><FieldLabel>Stiffener Size (mm)</FieldLabel><Input className="h-11 rounded-lg" value={formData.stiffenerSize} onChange={(e) => setFormData({ ...formData, stiffenerSize: e.target.value })} /></Field>
                  <Field><FieldLabel>Stiffener Thick (mm)</FieldLabel><Input className="h-11 rounded-lg" value={formData.stiffenerThick} onChange={(e) => setFormData({ ...formData, stiffenerThick: e.target.value })} /></Field>
                </div>
              )}

              {currentStep === 4 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-2">
                  {/* Summary Table */}
                  <div className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                    <div className="grid grid-cols-2 border-b border-gray-100">
                      <div className="p-3 border-r border-gray-100">
                        <p className="text-[8px] font-bold text-gray-400 uppercase">Column</p>
                        <p className="text-xs font-medium">{formData.height}m ({formData.thickness}mm)</p>
                      </div>
                      <div className="p-3">
                        <p className="text-[8px] font-bold text-gray-400 uppercase">Arm</p>
                        <p className="text-xs font-medium">{formData.armLength}m ({formData.armType})</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2">
                      <div className="p-3 border-r border-gray-100">
                        <p className="text-[8px] font-bold text-gray-400 uppercase">Base Plate</p>
                        <p className="text-xs font-medium">{formData.basePlateSize}x{formData.basePlateThick}mm</p>
                      </div>
                      <div className="p-3">
                        <p className="text-[8px] font-bold text-gray-400 uppercase">Weight</p>
                        <p className="text-xs font-medium">{stats.weight}kg</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <Field><FieldLabel>Surface Finish</FieldLabel>
                      <Select onValueChange={(v) => setFormData({ ...formData, protectionFinish: v })} value={formData.protectionFinish}>
                        <SelectTrigger className="h-11 rounded-lg"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="hdg">Hot Dip Galvanized</SelectItem><SelectItem value="eg">Electro Galvanized</SelectItem></SelectContent>
                      </Select>
                    </Field>
                    <Field><FieldLabel>Top Coat</FieldLabel>
                      <Select onValueChange={(v) => setFormData({ ...formData, topCoat: v })} value={formData.topCoat}>
                        <SelectTrigger className="h-11 rounded-lg"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="powder">Powder Coated</SelectItem><SelectItem value="epoxy">Epoxy Paint</SelectItem></SelectContent>
                      </Select>
                    </Field>

                    <Field className="md:col-span-2"><FieldLabel>Color (RAL / HEX)</FieldLabel>
                      <div className="flex gap-3"><Input type="color" className="w-16 h-11 p-1 rounded-lg cursor-pointer" value={formData.ralColor} onChange={(e) => setFormData({ ...formData, ralColor: e.target.value })} /><Input className="h-11 flex-1 font-mono text-md uppercase rounded-lg" value={formData.ralColor} onChange={(e) => setFormData({ ...formData, ralColor: e.target.value })} /></div>
                    </Field>

                    <div className="md:col-span-2 space-y-2">
                      <FieldLabel>Supporting Documents</FieldLabel>
                      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                      {!attachedFile ? (
                        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full h-11 border-dashed border-2 rounded-xl gap-2 text-xs text-gray-500">
                          <Paperclip size={14} /> Attach File / Drawing
                        </Button>
                      ) : (
                        <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <Paperclip className="text-emerald-600 shrink-0" size={14} />
                            <span className="text-xs font-medium text-emerald-900 truncate">{attachedFile.name}</span>
                          </div>
                          <button onClick={removeFile} className="p-1 hover:bg-emerald-100 rounded-full text-emerald-600"><X size={14} /></button>
                        </div>
                      )}
                    </div>

                    <Field className="md:col-span-2"><FieldLabel>Project Notes</FieldLabel><Textarea placeholder="Add project name or reference..." value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="min-h-[80px] rounded-xl p-3 bg-gray-50 border-none text-sm" /></Field>
                  </div>
                </div>
              )}
            </CardContent>

            <div className="p-5 border-t border-gray-100 flex justify-between bg-gray-50/50">
              <Button variant="ghost" disabled={currentStep === 1} onClick={() => setCurrentStep(prev => prev - 1)} className="h-11 px-6 rounded-xl gap-2 font-bold uppercase text-[10px]">
                <ChevronLeft size={14} /> Back
              </Button>
              {currentStep < 4 ? (
                <Button onClick={() => setCurrentStep(prev => prev + 1)} className="h-11 px-8 rounded-xl gap-2 bg-black text-white hover:bg-gray-800 font-bold uppercase text-[10px] shadow-md">
                  Next Step <ChevronRight size={14} />
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={isSubmitting} className="h-11 px-8 rounded-xl gap-2 bg-emerald-600 text-white hover:bg-emerald-700 font-bold uppercase text-[10px] shadow-md">
                  {isSubmitting ? <Loader2 className="animate-spin" /> : <><Send size={14} /> Submit to engiconnect</>}
                </Button>
              )}
            </div>
          </Card>
        </div>

        {/* PREVIEW SIDE */}
        <div className="lg:col-span-5">
          <div className="sticky top-6 space-y-4">
            <Card className="bg-white border-none shadow-xl rounded-[2rem] overflow-hidden">
              <div className="p-5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-[10px] font-black uppercase tracking-tighter text-gray-400 flex items-center gap-2"><Eye size={12} /> Live Visualizer</h3>
                  <Tabs defaultValue="schematic" onValueChange={setActiveTab} className="bg-gray-100 p-0.5 rounded-lg">
                    <TabsList className="bg-transparent h-7">
                      <TabsTrigger value="schematic" className="text-[9px] font-bold px-3">Profile</TabsTrigger>
                      <TabsTrigger value="technical" className="text-[9px] font-bold px-3 flex gap-1"><FileText size={10} /> Technical</TabsTrigger>
                      <TabsTrigger value="photometric" className="text-[9px] font-bold px-3">Light</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                <div ref={visualizerRef} className={`relative rounded-2xl flex items-center justify-center transition-all min-h-[420px] overflow-hidden ${activeTab === 'photometric' ? 'bg-[#020617]' : activeTab === 'technical' ? 'bg-white border-2 border-dashed border-gray-200' : 'bg-gray-50'}`}>
                  {render2DVisualizer()}

                  {/* Floating Metrics Badge */}
                  <div className="absolute top-4 right-4 flex flex-col gap-2 z-20">
                    <div className="bg-white/90 backdrop-blur shadow-sm border border-gray-100 p-2 rounded-xl flex items-center gap-2">
                      <div className="bg-black text-white p-1.5 rounded-md"><Weight size={12} /></div>
                      <div><p className="text-[7px] font-bold text-gray-400 uppercase">Weight</p><p className="text-xs font-black">{stats.weight} kg</p></div>
                    </div>
                    <div className="bg-white/90 backdrop-blur shadow-sm border border-gray-100 p-2 rounded-xl flex items-center gap-2">
                      <div className="bg-black text-white p-1.5 rounded-md"><Droplets size={12} /></div>
                      <div><p className="text-[7px] font-bold text-gray-400 uppercase">Area</p><p className="text-xs font-black">{stats.surfaceArea} m²</p></div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}