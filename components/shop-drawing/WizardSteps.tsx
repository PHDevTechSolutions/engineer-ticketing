// src/components/shop-drawing/WizardSteps.tsx
import React from "react";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Paperclip, X } from "lucide-react";

interface WizardProps {
  currentStep: number;
  formData: any;
  setFormData: (data: any) => void;
  attachedFile: File | null;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeFile: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  stats: any;
}

export const WizardSteps = ({ currentStep, formData, setFormData, attachedFile, handleFileChange, removeFile, fileInputRef, stats }: WizardProps) => {
  return (
    <>
      {/* STEP 1: COLUMN SPECS */}
      {currentStep === 1 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 animate-in fade-in">
          <Field><FieldLabel>Post Design</FieldLabel>
            <Select onValueChange={(v) => setFormData({...formData, postType: v})} value={formData.postType}>
              <SelectTrigger className="h-11"><SelectValue/></SelectTrigger>
              <SelectContent>
                <SelectItem value="straight">Straight Tapered</SelectItem>
                <SelectItem value="bent">Self Bent</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field><FieldLabel>Total Height (m)</FieldLabel>
            <div className="flex gap-3 items-center">
              <Slider className="flex-1" value={[parseFloat(formData.height) || 0]} min={3} max={20} step={0.5} onValueChange={(v) => setFormData({...formData, height: v[0].toString()})} />
              <Input className="w-16 h-11 text-center font-bold" value={formData.height} onChange={(e) => setFormData({...formData, height: e.target.value})} />
            </div>
          </Field>
          <Field><FieldLabel>Top Diameter (mm)</FieldLabel><Input className="h-11" value={formData.topDiameter} onChange={(e) => setFormData({...formData, topDiameter: e.target.value})} /></Field>
          <Field><FieldLabel>Bottom Diameter (mm)</FieldLabel><Input className="h-11" value={formData.bottomDiameter} onChange={(e) => setFormData({...formData, bottomDiameter: e.target.value})} /></Field>
          <Field className="md:col-span-2"><FieldLabel>Thickness (mm)</FieldLabel>
            <div className="grid grid-cols-5 gap-2">
              {["3.0", "4.0", "4.5", "5.0", "6.0"].map((t) => (
                <Button key={t} variant={formData.thickness === t ? "default" : "outline"} onClick={() => setFormData({...formData, thickness: t})} className="h-10 text-xs">{t}mm</Button>
              ))}
            </div>
          </Field>
        </div>
      )}

      {/* STEP 2: OUTREACH / ARM DETAILS */}
      {currentStep === 2 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 animate-in fade-in">
          <Field><FieldLabel>Arm Type</FieldLabel>
            <Select onValueChange={(v) => setFormData({...formData, armType: v})} value={formData.armType}>
              <SelectTrigger className="h-11"><SelectValue/></SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single Outreach</SelectItem>
                <SelectItem value="double">Double Outreach</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field><FieldLabel>Arm Length (m)</FieldLabel><Input className="h-11" value={formData.armLength} onChange={(e) => setFormData({...formData, armLength: e.target.value})} /></Field>
          <Field><FieldLabel>Inclination Angle (°)</FieldLabel><Input className="h-11" value={formData.boomAngle} onChange={(e) => setFormData({...formData, boomAngle: e.target.value})} /></Field>
          <Field><FieldLabel>Quantity</FieldLabel><Input className="h-11" type="number" value={formData.armQty} onChange={(e) => setFormData({...formData, armQty: e.target.value})} /></Field>
        </div>
      )}

      {/* STEP 3: FOUNDATION / BASE PLATE */}
      {currentStep === 3 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 animate-in fade-in">
          <Field><FieldLabel>Base Plate Size (mm)</FieldLabel><Input className="h-11" value={formData.basePlateSize} onChange={(e) => setFormData({...formData, basePlateSize: e.target.value})} /></Field>
          <Field><FieldLabel>Base Plate Thick (mm)</FieldLabel><Input className="h-11" value={formData.basePlateThick} onChange={(e) => setFormData({...formData, basePlateThick: e.target.value})} /></Field>
          <Field><FieldLabel>Bolt Spacing (mm)</FieldLabel><Input className="h-11" value={formData.anchorBoltSpacing} onChange={(e) => setFormData({...formData, anchorBoltSpacing: e.target.value})} /></Field>
          <Field><FieldLabel>Bolt Shape</FieldLabel>
            <Select onValueChange={(v) => setFormData({...formData, anchorBoltShape: v})} value={formData.anchorBoltShape}>
              <SelectTrigger className="h-11"><SelectValue/></SelectTrigger>
              <SelectContent>
                <SelectItem value="J">J-Bolt</SelectItem>
                <SelectItem value="L">L-Bolt</SelectItem>
                <SelectItem value="I">Straight</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field><FieldLabel>Bolt Length (mm)</FieldLabel><Input className="h-11" value={formData.anchorBoltLength} onChange={(e) => setFormData({...formData, anchorBoltLength: e.target.value})} /></Field>
        </div>
      )}

      {/* STEP 4: FINAL REVIEW */}
      {currentStep === 4 && (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-gray-50 rounded-xl border p-4 grid grid-cols-2 gap-4">
             <div><p className="text-[10px] font-bold text-gray-400">EST. WEIGHT</p><p className="text-sm font-bold">{stats.weight} kg</p></div>
             <div><p className="text-[10px] font-bold text-gray-400">SURFACE AREA</p><p className="text-sm font-bold">{stats.surfaceArea} m²</p></div>
          </div>
          <Field><FieldLabel>Surface Finish</FieldLabel>
            <Select onValueChange={(v) => setFormData({...formData, protectionFinish: v})} value={formData.protectionFinish}>
              <SelectTrigger className="h-11"><SelectValue/></SelectTrigger>
              <SelectContent>
                <SelectItem value="hdg">Hot Dip Galvanized</SelectItem>
                <SelectItem value="eg">Electro Galvanized</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field className="md:col-span-2"><FieldLabel>Project Notes</FieldLabel><Textarea placeholder="Add project name..." value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} /></Field>
          
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
          {!attachedFile ? (
            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full h-11 border-dashed border-2"><Paperclip className="mr-2" size={14} /> Attach File</Button>
          ) : (
            <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <span className="text-xs font-medium text-emerald-900 truncate">{attachedFile.name}</span>
              <button onClick={removeFile} className="text-emerald-600"><X size={14} /></button>
            </div>
          )}
        </div>
      )}
    </>
  );
};