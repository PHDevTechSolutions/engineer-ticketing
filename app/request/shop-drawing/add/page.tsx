"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { 
  Sun, Ruler, Weight, Droplets, Zap, Lock, Anchor, Paperclip
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { toast } from "sonner";

/**
 * ENGINEERING_SHOP_PROTOCOL_V18.7_FINAL
 * Restored Visualization for Foundation Components
 */
export default function CompleteShopDrawingProtocol() {
  const [activeTab, setActiveTab] = useState("schematic");

  const [formData, setFormData] = useState({
    // Left Column Fields
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
    // Right Column Fields
    basePlateSize: "400",
    basePlateThick: "20",
    anchorBoltSpacing: "300",
    anchorBoltShape: "J",
    anchorBoltLength: "700",
    bendLength: "100",
    protectionFinish: "hdg",
    stiffenerSize: "150",
    stiffenerThick: "12",
    handHole: "with",
    topCoat: "powder",
    // Extras
    ralColor: "#475569",
    notes: ""
  });

  const stats = useMemo(() => {
    const h = parseFloat(formData.height) || 0;
    const t = parseFloat(formData.thickness) || 0;
    const bd = parseFloat(formData.bottomDiameter) || 0;
    const td = parseFloat(formData.topDiameter) || 0;
    const qty = formData.armType === "double" ? 2 : 1;
    const aL = parseFloat(formData.armLength) || 0;
    
    const weight = ( (Math.PI * ((bd+td)/2000) * (t/1000) * h * 7850) * (1 + (qty * (aL * 0.08))) ).toFixed(1);
    const surfaceArea = (Math.PI * ((bd+td)/2000) * h).toFixed(2);
    return { weight, surfaceArea };
  }, [formData]);

  const render2DVisualizer = () => {
    const { 
      height, armLength, boomAngle, topDiameter, bottomDiameter, thickness, 
      postType, armType, armBaseDia, armTipDia, basePlateSize, basePlateThick,
      anchorBoltShape, anchorBoltLength, anchorBoltSpacing, bendLength, stiffenerSize, handHole, ralColor
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
    
    const scale = 350 / 15; 
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
    const groundY = 420; // Adjusted up to see bolts better

    return (
      <svg viewBox="0 0 300 500" className="w-full h-full overflow-visible transition-all duration-500">
        <defs>
          <linearGradient id="lightBeamGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FDE68A" stopOpacity="0.4" />
            <stop offset="80%" stopColor="#FBBF24" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
          </linearGradient>
          <filter id="lightBloom"><feGaussianBlur stdDeviation="6" result="blur" /><feComposite in="SourceGraphic" in2="blur" operator="over" /></filter>
        </defs>

        {/* ANCHOR BOLTS - Enhanced Visibility */}
        <g stroke={activeTab === 'photometric' ? '#334155' : '#94a3b8'} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
          {/* Left Bolt */}
          <path d={`M ${150 - visBoltSpacing/2} ${groundY} v ${visBoltL} ${anchorBoltShape === 'J' ? `q 0 ${visBendL/2} -${visBendL} 0` : anchorBoltShape === 'L' ? `h -${visBendL}` : ''}`} />
          {/* Right Bolt */}
          <path d={`M ${150 + visBoltSpacing/2} ${groundY} v ${visBoltL} ${anchorBoltShape === 'J' ? `q 0 ${visBendL/2} ${visBendL} 0` : anchorBoltShape === 'L' ? `h ${visBendL}` : ''}`} />
        </g>

        {/* GROUND LINE */}
        <rect x="0" y={groundY} width="300" height="80" fill={activeTab === 'photometric' ? '#020617' : '#f1f5f9'} opacity="0.9" />

        {/* PHOTOMETRIC BEAMS */}
        {activeTab === "photometric" && (
          <g filter="url(#lightBloom)" opacity="0.8">
            <path d={`M ${150 + visTopD/2 + armRun} ${groundY - poleH - armRise} L ${150 + visTopD/2 + armRun + 60} ${groundY} L ${150 + visTopD/2 + armRun - 60} ${groundY} Z`} fill="url(#lightBeamGrad)" />
            {armType === "double" && (
              <path d={`M ${150 - visTopD/2 - armRun} ${groundY - poleH - armRise} L ${150 - visTopD/2 - armRun + 60} ${groundY} L ${150 - visTopD/2 - armRun - 60} ${groundY} Z`} fill="url(#lightBeamGrad)" />
            )}
          </g>
        )}

        {/* STIFFENERS */}
        <path d={`M ${150 - visBotD/2} ${groundY - visBPT} L ${150 - visBotD/2 - visStiff} ${groundY - visBPT} L ${150 - visBotD/2} ${groundY - visBPT - visStiff} Z`} fill={activeTab === 'photometric' ? '#1e293b' : '#94a3b8'} opacity="0.8" />
        <path d={`M ${150 + visBotD/2} ${groundY - visBPT} L ${150 + visBotD/2 + visStiff} ${groundY - visBPT} L ${150 + visBotD/2} ${groundY - visBPT - visStiff} Z`} fill={activeTab === 'photometric' ? '#1e293b' : '#94a3b8'} opacity="0.8" />

        {/* BASE PLATE */}
        <rect x={150 - visBP/2} y={groundY - visBPT} width={visBP} height={visBPT} fill={activeTab === 'photometric' ? '#1e293b' : '#475569'} rx="1" />
        
        {/* SHAFT */}
        <path 
          d={`M ${150 - visBotD/2} ${groundY - visBPT} L ${150 + visBotD/2} ${groundY - visBPT} L ${150 + visTopD/2} ${groundY - poleH} L ${150 - visTopD/2} ${groundY - poleH} Z`}
          fill={activeTab === 'photometric' ? '#0f172a' : ralColor} 
          stroke={activeTab === 'photometric' ? '#334155' : '#121212'} 
          strokeWidth={thick / 4}
        />

        {/* HAND HOLE */}
        {handHole === "with" && <rect x={147} y={groundY - 60} width={6} height={12} rx="1" fill="#000" opacity="0.2" />}

        {/* ARM ASSEMBLY */}
        <g transform={`translate(150, ${groundY - poleH})`}>
          {postType === "straight" ? (
            <>
              <path d={`M ${visTopD/2} ${-visABase/4} L ${visTopD/2 + armRun} ${-armRise - visATip/2} L ${visTopD/2 + armRun} ${-armRise + visATip/2} L ${visTopD/2} ${visABase/4} Z`} fill={activeTab === 'photometric' ? '#0f172a' : ralColor} stroke={activeTab === 'photometric' ? '#334155' : '#121212'} strokeWidth="0.5" />
              {armType === "double" && <path d={`M ${-visTopD/2} ${-visABase/4} L ${-visTopD/2 - armRun} ${-armRise - visATip/2} L ${-visTopD/2 - armRun} ${-armRise + visATip/2} L ${-visTopD/2} ${visABase/4} Z`} fill={activeTab === 'photometric' ? '#0f172a' : ralColor} stroke={activeTab === 'photometric' ? '#334155' : '#121212'} strokeWidth="0.5" />}
            </>
          ) : (
            <>
              <path d={`M ${visTopD/2} 0 Q ${visTopD/2} ${-armRise * 0.7} ${visTopD/2 + armRun} ${-armRise}`} fill="none" stroke={activeTab === 'photometric' ? '#334155' : ralColor} strokeWidth={(visABase + visATip)/2} strokeLinecap="round" />
              {armType === "double" && <path d={`M ${-visTopD/2} 0 Q ${-visTopD/2} ${-armRise * 0.7} ${-visTopD/2 - armRun} ${-armRise}`} fill="none" stroke={activeTab === 'photometric' ? '#334155' : ralColor} strokeWidth={(visABase + visATip)/2} strokeLinecap="round" />}
            </>
          )}
        </g>
      </svg>
    );
  };

  return (
    <div className="min-h-screen bg-[#F9FAFA] font-sans pb-32">
      <PageHeader title="ENGINEERING_SHOP_PROTOCOL" version="AUDITED_V18.7_FINAL" showBackButton={true} />
      
      <main className="p-4 md:p-10 max-w-[1750px] mx-auto grid grid-cols-1 xl:grid-cols-12 gap-10">
        
        {/* INPUT COLUMN (21 Fields Total) */}
        <div className="xl:col-span-7 space-y-8">
          
          {/* 01: SHAFT CONFIG */}
          <Card className="shadow-sm border-black/5 rounded-2xl bg-white overflow-hidden border">
            <CardHeader className="bg-[#121212] py-4 px-8 flex flex-row items-center justify-between">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-white flex items-center gap-2">
                <Lock size={12} className="text-emerald-400" /> 01_Shaft_Specifications
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 grid grid-cols-2 gap-x-12 gap-y-10">
              <Field><FieldLabel>Lamp Post Type</FieldLabel>
                <Select onValueChange={(v) => setFormData({...formData, postType: v})} value={formData.postType}>
                  <SelectTrigger className="h-12"><SelectValue/></SelectTrigger>
                  <SelectContent><SelectItem value="straight">Straight Tapered</SelectItem><SelectItem value="bent">Self Bent</SelectItem></SelectContent>
                </Select>
              </Field>
              <Field className="space-y-4">
                <div className="flex justify-between items-center"><FieldLabel className="mb-0">Height (m)</FieldLabel><Input className="w-16 h-8 text-center text-[10px] font-bold" value={formData.height} onChange={(e) => setFormData({...formData, height: e.target.value})} /></div>
                <Slider value={[parseFloat(formData.height) || 0]} min={3} max={20} step={0.5} onValueChange={(v) => setFormData({...formData, height: v[0].toString()})} />
              </Field>
              <Field className="space-y-4"><FieldLabel>Top Diameter (mm)</FieldLabel><Slider value={[parseFloat(formData.topDiameter) || 0]} min={60} max={250} onValueChange={(v) => setFormData({...formData, topDiameter: v[0].toString()})} /><Input className="h-10 text-xs font-mono" value={formData.topDiameter} onChange={(e) => setFormData({...formData, topDiameter: e.target.value})} /></Field>
              <Field className="space-y-4"><FieldLabel>Bottom Diameter (mm)</FieldLabel><Slider value={[parseFloat(formData.bottomDiameter) || 0]} min={120} max={500} onValueChange={(v) => setFormData({...formData, bottomDiameter: v[0].toString()})} /><Input className="h-10 text-xs font-mono" value={formData.bottomDiameter} onChange={(e) => setFormData({...formData, bottomDiameter: e.target.value})} /></Field>
              <div className="col-span-2"><Field className="space-y-4"><div className="flex justify-between items-center"><FieldLabel className="mb-0">Pole Thickness (mm)</FieldLabel><span className="text-[10px] font-black text-emerald-600">{formData.thickness}mm</span></div><Slider value={[parseFloat(formData.thickness) || 0]} min={3} max={10} step={0.5} onValueChange={(v) => setFormData({...formData, thickness: v[0].toString()})} /></Field></div>
            </CardContent>
          </Card>

          {/* 02: ARM CONFIG */}
          <Card className="shadow-sm border-black/5 rounded-2xl bg-white overflow-hidden border">
            <CardHeader className="bg-[#F9FAFA] py-4 px-8 border-b border-black/5 flex justify-between items-center"><CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-black">02_Arm_Specification</CardTitle></CardHeader>
            <CardContent className="p-8 grid grid-cols-2 gap-x-12 gap-y-10">
              <Field><FieldLabel>Arm Type</FieldLabel>
                <Select onValueChange={(v) => setFormData({...formData, armType: v})} value={formData.armType}><SelectTrigger className="h-12"><SelectValue/></SelectTrigger>
                  <SelectContent><SelectItem value="single">Single Outreach</SelectItem><SelectItem value="double">Double Outreach</SelectItem></SelectContent>
                </Select>
              </Field>
              <Field><FieldLabel>Arm Quantity</FieldLabel><Input className="h-12 font-mono" value={formData.armQty} onChange={(e) => setFormData({...formData, armQty: e.target.value})} /></Field>
              <Field className="space-y-4 col-span-2"><div className="flex justify-between items-center"><FieldLabel className="mb-0">Arm Length (m)</FieldLabel><span className="text-[10px] font-black">{formData.armLength}m</span></div><Slider value={[parseFloat(formData.armLength) || 0]} min={0.5} max={5} step={0.1} onValueChange={(v) => setFormData({...formData, armLength: v[0].toString()})} /></Field>
              <Field className="space-y-4"><FieldLabel>Arm Diameter (Base)</FieldLabel><Slider value={[parseFloat(formData.armBaseDia) || 0]} min={40} max={150} onValueChange={(v) => setFormData({...formData, armBaseDia: v[0].toString()})} /><Input className="h-10 text-xs font-mono text-center" value={formData.armBaseDia} onChange={(e) => setFormData({...formData, armBaseDia: e.target.value})} /></Field>
              <Field className="space-y-4"><FieldLabel>Arm Diameter (Tip)</FieldLabel><Slider value={[parseFloat(formData.armTipDia) || 0]} min={20} max={100} onValueChange={(v) => setFormData({...formData, armTipDia: v[0].toString()})} /><Input className="h-10 text-xs font-mono text-center" value={formData.armTipDia} onChange={(e) => setFormData({...formData, armTipDia: e.target.value})} /></Field>
              <div className="col-span-2"><Field className="space-y-4"><div className="flex justify-between items-center"><FieldLabel className="mb-0">Boom Angle (Degree)</FieldLabel><span className="text-[10px] font-black">{formData.boomAngle}°</span></div><Slider value={[parseFloat(formData.boomAngle) || 0]} min={0} max={90} step={1} onValueChange={(v) => setFormData({...formData, boomAngle: v[0].toString()})} /></Field></div>
            </CardContent>
          </Card>

          {/* 03: FOUNDATION & FINISH */}
          <Card className="shadow-sm border-black/5 rounded-2xl bg-white border">
            <CardHeader className="py-4 px-8 border-b border-black/5 bg-[#F9FAFA]"><CardTitle className="text-[10px] font-black uppercase tracking-[0.3em]">03_Foundation_and_Finish</CardTitle></CardHeader>
            <CardContent className="p-8 grid grid-cols-2 gap-x-12 gap-y-10">
              <Field className="space-y-4"><FieldLabel>Base Plate Size</FieldLabel><Slider value={[parseFloat(formData.basePlateSize) || 0]} min={200} max={800} onValueChange={(v) => setFormData({...formData, basePlateSize: v[0].toString()})} /><Input className="h-10 text-xs font-mono" value={formData.basePlateSize} onChange={(e) => setFormData({...formData, basePlateSize: e.target.value})} /></Field>
              <Field className="space-y-4"><div className="flex justify-between items-center"><FieldLabel className="mb-0">Base Plate Thickness</FieldLabel></div><Slider value={[parseFloat(formData.basePlateThick) || 0]} min={10} max={50} onValueChange={(v) => setFormData({...formData, basePlateThick: v[0].toString()})} /><Input className="h-10 text-xs font-mono" value={formData.basePlateThick} onChange={(e) => setFormData({...formData, basePlateThick: e.target.value})} /></Field>
              <Field className="space-y-4"><FieldLabel>Spacing of Anchor Bolt</FieldLabel><Slider value={[parseFloat(formData.anchorBoltSpacing) || 0]} min={100} max={600} onValueChange={(v) => setFormData({...formData, anchorBoltSpacing: v[0].toString()})} /><Input className="h-10 text-xs font-mono" value={formData.anchorBoltSpacing} onChange={(e) => setFormData({...formData, anchorBoltSpacing: e.target.value})} /></Field>
              <Field className="space-y-4"><FieldLabel>Anchor Bolt Shape</FieldLabel>
                <Select onValueChange={(v) => setFormData({...formData, anchorBoltShape: v})} value={formData.anchorBoltShape}>
                  <SelectTrigger className="h-10"><SelectValue/></SelectTrigger>
                  <SelectContent><SelectItem value="J">J-Bolt</SelectItem><SelectItem value="L">L-Bolt</SelectItem><SelectItem value="I">Straight</SelectItem></SelectContent>
                </Select>
              </Field>
              <Field className="space-y-4"><FieldLabel>Anchor Bolt Length</FieldLabel><Slider value={[parseFloat(formData.anchorBoltLength) || 0]} min={300} max={1500} step={50} onValueChange={(v) => setFormData({...formData, anchorBoltLength: v[0].toString()})} /><Input className="h-10 text-xs font-mono" value={formData.anchorBoltLength} onChange={(e) => setFormData({...formData, anchorBoltLength: e.target.value})} /></Field>
              <Field className="space-y-4"><FieldLabel>Bend Length (For J & L only)</FieldLabel><Slider value={[parseFloat(formData.bendLength) || 0]} min={50} max={300} onValueChange={(v) => setFormData({...formData, bendLength: v[0].toString()})} /><Input className="h-10 text-xs font-mono" value={formData.bendLength} onChange={(e) => setFormData({...formData, bendLength: e.target.value})} /></Field>
              <Field className="space-y-4"><FieldLabel>Protection / Finish</FieldLabel>
                <Select onValueChange={(v) => setFormData({...formData, protectionFinish: v})} value={formData.protectionFinish}>
                  <SelectTrigger className="h-10"><SelectValue/></SelectTrigger>
                  <SelectContent><SelectItem value="hdg">Hot Dip Galvanize</SelectItem><SelectItem value="eg">Electro Galvanize</SelectItem></SelectContent>
                </Select>
              </Field>
              <Field className="space-y-4"><FieldLabel>Stiffener Plate Size</FieldLabel><Slider value={[parseFloat(formData.stiffenerSize) || 0]} min={0} max={300} onValueChange={(v) => setFormData({...formData, stiffenerSize: v[0].toString()})} /><Input className="h-10 text-xs font-mono" value={formData.stiffenerSize} onChange={(e) => setFormData({...formData, stiffenerSize: e.target.value})} /></Field>
              <Field className="space-y-4"><FieldLabel>Stiffener Plate Thck</FieldLabel><Slider value={[parseFloat(formData.stiffenerThick) || 0]} min={3} max={25} onValueChange={(v) => setFormData({...formData, stiffenerThick: v[0].toString()})} /><Input className="h-10 text-xs font-mono" value={formData.stiffenerThick} onChange={(e) => setFormData({...formData, stiffenerThick: e.target.value})} /></Field>
              <Field className="space-y-4"><FieldLabel>Hand Hole</FieldLabel>
                <Select onValueChange={(v) => setFormData({...formData, handHole: v})} value={formData.handHole}>
                  <SelectTrigger className="h-10"><SelectValue/></SelectTrigger>
                  <SelectContent><SelectItem value="with">Required</SelectItem><SelectItem value="none">None</SelectItem></SelectContent>
                </Select>
              </Field>
              <Field className="space-y-4"><FieldLabel>Top Coat</FieldLabel>
                <Select onValueChange={(v) => setFormData({...formData, topCoat: v})} value={formData.topCoat}>
                  <SelectTrigger className="h-10"><SelectValue/></SelectTrigger>
                  <SelectContent><SelectItem value="spray">Spray Paint</SelectItem><SelectItem value="powder">Powder Coat</SelectItem></SelectContent>
                </Select>
              </Field>
              <Field><FieldLabel>RAL Color</FieldLabel>
                <div className="flex gap-4"><Input type="color" className="w-12 h-10 p-1" value={formData.ralColor} onChange={(e) => setFormData({...formData, ralColor: e.target.value})} /><Input className="h-10 flex-1 font-mono text-xs" value={formData.ralColor} onChange={(e) => setFormData({...formData, ralColor: e.target.value})} /></div>
              </Field>
            </CardContent>
          </Card>

          {/* NOTES & ATTACH */}
          <div className="flex gap-6 items-stretch">
            <div className="flex-1 bg-white p-8 rounded-2xl border border-black/5 shadow-sm">
                <FieldLabel className="text-black/30 italic">“Notes and Instructions”</FieldLabel>
                <Textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} className="min-h-[80px] border-none bg-transparent focus-visible:ring-0" />
            </div>
            <Button variant="outline" className="w-48 border-dashed border-2 flex flex-col gap-2 font-black text-[9px] uppercase tracking-widest rounded-2xl hover:bg-slate-50">
                <Paperclip size={20} className="text-black/20" /> ATTACH FILE
            </Button>
          </div>
        </div>

        {/* VISUALIZATION COLUMN */}
        <div className="xl:col-span-5">
          <div className="sticky top-10 space-y-6">
            <Card className="border-black/5 bg-white shadow-2xl overflow-hidden rounded-[2.5rem] border p-8">
              <div className="w-full flex items-center justify-between mb-8">
                <span className="text-[10px] font-black text-[#121212] uppercase tracking-[0.1em]">Engine_Core_v18.7_STABLE</span>
                <Tabs defaultValue="schematic" onValueChange={setActiveTab} className="bg-slate-100 p-1 rounded-xl">
                  <TabsList className="h-10 bg-transparent border-none">
                    <TabsTrigger value="schematic" className="rounded-lg text-[9px] font-black px-6">DRAFT</TabsTrigger>
                    <TabsTrigger value="photometric" className="rounded-lg text-[9px] font-black px-6">LIGHT</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className={`w-full relative rounded-[2rem] p-10 min-h-[600px] flex items-center justify-center transition-all duration-700 ${activeTab === 'photometric' ? 'bg-[#020617]' : 'bg-[#F9FAFA] border border-black/5'}`}>
                {render2DVisualizer()}
                <div className={`absolute top-8 right-8 p-4 rounded-xl border transition-all ${activeTab === 'photometric' ? 'bg-white/10 text-white border-white/20' : 'bg-white/80 text-black border-black/5'} backdrop-blur-md`}>
                  <div className="text-[9px] font-black uppercase tracking-widest flex items-center gap-2"><Weight size={10}/> {stats.weight} KG EST.</div>
                  <div className="text-[9px] font-black uppercase tracking-widest flex items-center gap-2 mt-2"><Droplets size={10}/> {stats.surfaceArea} M² S.A.</div>
                </div>
              </div>

              <Button onClick={() => toast.success("SHOP_DRAWING_SYNCHRONIZED")} className="w-full mt-10 h-20 bg-[#121212] text-white rounded-[1.5rem] font-black uppercase tracking-[0.5em] text-[10px] shadow-lg active:scale-95 transition-transform">
                Synchronize Shop Drawing
              </Button>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}