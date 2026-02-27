// components/shop-drawing/form-controls.tsx
"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button"; // Corrected import
import { Lock, Paperclip, Info, X, ClipboardCheck } from "lucide-react";

interface FormControlsProps {
  formData: any;
  setFormData: (data: any) => void;
  showInstructions: boolean;
  setShowInstructions: (show: boolean) => void;
}

export function FormControls({ 
  formData, 
  setFormData, 
  showInstructions, 
  setShowInstructions 
}: FormControlsProps) {
  return (
    <div className="space-y-8">
      {showInstructions ? (
        <div className="bg-[#121212] p-6 rounded-lg shadow-xl border border-white/5 relative overflow-hidden transition-all">
          <button onClick={() => setShowInstructions(false)} className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors">
            <X className="size-4" />
          </button>
          <div className="flex items-center gap-3 mb-4">
            <ClipboardCheck className="size-4 text-emerald-400" />
            <span className="text-[10px] font-bold text-white uppercase tracking-[0.2em]">Standard Operating Procedure</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h4 className="text-emerald-400 text-[9px] font-black uppercase tracking-tight">Requirement Entry</h4>
              <p className="text-[9px] text-white/50 font-bold uppercase leading-relaxed">Input specific client requirements to generate real-time logistical estimates.</p>
            </div>
            <div className="space-y-2">
              <h4 className="text-emerald-400 text-[9px] font-black uppercase tracking-tight">Visual Verification</h4>
              <p className="text-[9px] text-white/50 font-bold uppercase leading-relaxed">Confirm the structural profile and lighting coverage via the visualization portal.</p>
            </div>
            <div className="space-y-2">
              <h4 className="text-emerald-400 text-[9px] font-black uppercase tracking-tight">Final Authorization</h4>
              <p className="text-[9px] text-white/50 font-bold uppercase leading-relaxed">Submit the finalized request for departmental review and processing.</p>
            </div>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowInstructions(true)} className="flex items-center gap-2 text-[10px] font-bold uppercase text-black/30 hover:text-black transition-colors pl-1">
          <Info className="size-3.5" /> View Submission Guidelines
        </button>
      )}

      {/* Section 1: Core Geometry (Fields 1-5) */}
      <Card className="shadow-sm border-black/5 rounded-2xl bg-white overflow-hidden border">
        <CardHeader className="bg-[#121212] py-4 px-8 flex flex-row items-center justify-between">
          <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-white flex items-center gap-2">
            <Lock size={12} className="text-emerald-400" /> Client Specifications
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
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
          <div className="col-span-1 md:col-span-2"><Field className="space-y-4"><div className="flex justify-between items-center"><FieldLabel className="mb-0">Structural Thickness (mm)</FieldLabel><span className="text-[10px] font-black text-emerald-600">{formData.thickness}mm</span></div><Slider value={[parseFloat(formData.thickness) || 0]} min={3} max={10} step={0.5} onValueChange={(v) => setFormData({...formData, thickness: v[0].toString()})} /></Field></div>
        </CardContent>
      </Card>

      {/* Section 2: Arm Metrics (Fields 6-11) */}
      <Card className="shadow-sm border-black/5 rounded-2xl bg-white overflow-hidden border">
        <CardHeader className="bg-[#F9FAFA] py-4 px-8 border-b border-black/5 flex justify-between items-center"><CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-black">Outreach Configuration</CardTitle></CardHeader>
        <CardContent className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
          <Field><FieldLabel>Arm Type</FieldLabel>
            <Select onValueChange={(v) => setFormData({...formData, armType: v})} value={formData.armType}><SelectTrigger className="h-12"><SelectValue/></SelectTrigger>
              <SelectContent><SelectItem value="single">Single Outreach</SelectItem><SelectItem value="double">Double Outreach</SelectItem></SelectContent>
            </Select>
          </Field>
          <Field><FieldLabel>Arm Quantity</FieldLabel><Input className="h-12 font-mono" value={formData.armQty} onChange={(e) => setFormData({...formData, armQty: e.target.value})} /></Field>
          <Field className="space-y-4 col-span-1 md:col-span-2"><div className="flex justify-between items-center"><FieldLabel className="mb-0">Arm Length (m)</FieldLabel><span className="text-[10px] font-black">{formData.armLength}m</span></div><Slider value={[parseFloat(formData.armLength) || 0]} min={0.5} max={5} step={0.1} onValueChange={(v) => setFormData({...formData, armLength: v[0].toString()})} /></Field>
          <Field className="space-y-4"><FieldLabel>Arm Base Diameter</FieldLabel><Slider value={[parseFloat(formData.armBaseDia) || 0]} min={40} max={150} onValueChange={(v) => setFormData({...formData, armBaseDia: v[0].toString()})} /><Input className="h-10 text-xs font-mono text-center" value={formData.armBaseDia} onChange={(e) => setFormData({...formData, armBaseDia: e.target.value})} /></Field>
          <Field className="space-y-4"><FieldLabel>Arm Tip Diameter</FieldLabel><Slider value={[parseFloat(formData.armTipDia) || 0]} min={20} max={100} onValueChange={(v) => setFormData({...formData, armTipDia: v[0].toString()})} /><Input className="h-10 text-xs font-mono text-center" value={formData.armTipDia} onChange={(e) => setFormData({...formData, armTipDia: e.target.value})} /></Field>
          <div className="col-span-1 md:col-span-2"><Field className="space-y-4"><div className="flex justify-between items-center"><FieldLabel className="mb-0">Inclination Angle</FieldLabel><span className="text-[10px] font-black">{formData.boomAngle}°</span></div><Slider value={[parseFloat(formData.boomAngle) || 0]} min={0} max={90} step={1} onValueChange={(v) => setFormData({...formData, boomAngle: v[0].toString()})} /></Field></div>
        </CardContent>
      </Card>

      {/* Section 3: Finishing (Fields 12-24) */}
      <Card className="shadow-sm border-black/5 rounded-2xl bg-white border">
        <CardHeader className="py-4 px-8 border-b border-black/5 bg-[#F9FAFA]"><CardTitle className="text-[10px] font-black uppercase tracking-[0.3em]">Anchorage & Finish</CardTitle></CardHeader>
        <CardContent className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
          <Field className="space-y-4"><FieldLabel>Base Plate Dimension</FieldLabel><Slider value={[parseFloat(formData.basePlateSize) || 0]} min={200} max={800} onValueChange={(v) => setFormData({...formData, basePlateSize: v[0].toString()})} /><Input className="h-10 text-xs font-mono" value={formData.basePlateSize} onChange={(e) => setFormData({...formData, basePlateSize: e.target.value})} /></Field>
          <Field className="space-y-4"><FieldLabel>Plate Thickness</FieldLabel><Slider value={[parseFloat(formData.basePlateThick) || 0]} min={10} max={50} onValueChange={(v) => setFormData({...formData, basePlateThick: v[0].toString()})} /><Input className="h-10 text-xs font-mono" value={formData.basePlateThick} onChange={(e) => setFormData({...formData, basePlateThick: e.target.value})} /></Field>
          <Field className="space-y-4"><FieldLabel>Bolt Spacing</FieldLabel><Slider value={[parseFloat(formData.anchorBoltSpacing) || 0]} min={100} max={600} onValueChange={(v) => setFormData({...formData, anchorBoltSpacing: v[0].toString()})} /><Input className="h-10 text-xs font-mono" value={formData.anchorBoltSpacing} onChange={(e) => setFormData({...formData, anchorBoltSpacing: e.target.value})} /></Field>
          <Field className="space-y-4"><FieldLabel>Bolt Shape</FieldLabel>
            <Select onValueChange={(v) => setFormData({...formData, anchorBoltShape: v})} value={formData.anchorBoltShape}>
              <SelectTrigger className="h-10"><SelectValue/></SelectTrigger>
              <SelectContent><SelectItem value="J">J-Bolt</SelectItem><SelectItem value="L">L-Bolt</SelectItem><SelectItem value="I">Straight</SelectItem></SelectContent>
            </Select>
          </Field>
          <Field className="space-y-4"><FieldLabel>Bolt Length</FieldLabel><Slider value={[parseFloat(formData.anchorBoltLength) || 0]} min={300} max={1500} step={50} onValueChange={(v) => setFormData({...formData, anchorBoltLength: v[0].toString()})} /><Input className="h-10 text-xs font-mono" value={formData.anchorBoltLength} onChange={(e) => setFormData({...formData, anchorBoltLength: e.target.value})} /></Field>
          <Field className="space-y-4"><FieldLabel>Bend Dimension</FieldLabel><Slider value={[parseFloat(formData.bendLength) || 0]} min={50} max={300} onValueChange={(v) => setFormData({...formData, bendLength: v[0].toString()})} /><Input className="h-10 text-xs font-mono" value={formData.bendLength} onChange={(e) => setFormData({...formData, bendLength: e.target.value})} /></Field>
          <Field className="space-y-4"><FieldLabel>Surface Protection</FieldLabel>
            <Select onValueChange={(v) => setFormData({...formData, protectionFinish: v})} value={formData.protectionFinish}>
              <SelectTrigger className="h-10"><SelectValue/></SelectTrigger>
              <SelectContent><SelectItem value="hdg">Hot Dip Galvanize</SelectItem><SelectItem value="eg">Electro Galvanize</SelectItem></SelectContent>
            </Select>
          </Field>
          <Field className="space-y-4"><FieldLabel>Stiffener Dimension</FieldLabel><Slider value={[parseFloat(formData.stiffenerSize) || 0]} min={0} max={300} onValueChange={(v) => setFormData({...formData, stiffenerSize: v[0].toString()})} /><Input className="h-10 text-xs font-mono" value={formData.stiffenerSize} onChange={(e) => setFormData({...formData, stiffenerSize: e.target.value})} /></Field>
          <Field className="space-y-4"><FieldLabel>Stiffener Thickness</FieldLabel><Slider value={[parseFloat(formData.stiffenerThick) || 0]} min={3} max={25} onValueChange={(v) => setFormData({...formData, stiffenerThick: v[0].toString()})} /><Input className="h-10 text-xs font-mono" value={formData.stiffenerThick} onChange={(e) => setFormData({...formData, stiffenerThick: e.target.value})} /></Field>
          <Field className="space-y-4"><FieldLabel>Access Point</FieldLabel>
            <Select onValueChange={(v) => setFormData({...formData, handHole: v})} value={formData.handHole}>
              <SelectTrigger className="h-10"><SelectValue/></SelectTrigger>
              <SelectContent><SelectItem value="with">Required</SelectItem><SelectItem value="none">None</SelectItem></SelectContent>
            </Select>
          </Field>
          <Field className="space-y-4"><FieldLabel>Final Coating</FieldLabel>
            <Select onValueChange={(v) => setFormData({...formData, topCoat: v})} value={formData.topCoat}>
              <SelectTrigger className="h-10"><SelectValue/></SelectTrigger>
              <SelectContent><SelectItem value="spray">Spray Paint</SelectItem><SelectItem value="powder">Powder Coat</SelectItem></SelectContent>
            </Select>
          </Field>
          <Field><FieldLabel>Color Selection</FieldLabel>
            <div className="flex gap-4"><Input type="color" className="w-12 h-10 p-1" value={formData.ralColor} onChange={(e) => setFormData({...formData, ralColor: e.target.value})} /><Input className="h-10 flex-1 font-mono text-xs uppercase" value={formData.ralColor} onChange={(e) => setFormData({...formData, ralColor: e.target.value})} /></div>
          </Field>
        </CardContent>
      </Card>

      {/* Field 25: Notes + Assets */}
      <div className="flex flex-col md:flex-row gap-6 items-stretch pb-20">
        <div className="flex-1 bg-white p-8 rounded-2xl border border-black/5 shadow-sm">
          <FieldLabel className="text-black/30 italic">Project Notes</FieldLabel>
          <Textarea placeholder="Detail specific project constraints..." value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} className="min-h-[80px] border-none bg-transparent focus-visible:ring-0" />
        </div>
        <Button variant="outline" className="w-full md:w-48 border-dashed border-2 h-auto py-6 flex flex-col gap-2 font-bold text-[9px] uppercase tracking-widest rounded-2xl hover:bg-slate-50">
          <Paperclip size={20} className="text-black/20" /> Client Assets
        </Button>
      </div>
    </div>
  );
}