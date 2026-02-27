// src/components/shop-drawing/DrawingVisualizer.tsx
import React from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, RefreshCcw, Maximize2, FileDown } from "lucide-react";

interface VisualizerProps {
  formData: any;
  activeTab: string;
  stats: { weight: string; surfaceArea: string };
  exportRef: React.RefObject<HTMLDivElement>;
  toggleFullScreen: () => void;
  downloadDrawingPDF: () => void;
}

export const DrawingVisualizer = ({ 
  formData, activeTab, stats, exportRef, toggleFullScreen, downloadDrawingPDF 
}: VisualizerProps) => {
  
  // All the math for drawing goes here
  const { height, armLength, boomAngle, topDiameter, bottomDiameter, thickness, postType, armType, ralColor } = formData;
  const h = parseFloat(height) || 0;
  const aL = parseFloat(armLength) || 0;
  const angle = parseFloat(boomAngle) || 0;
  
  const scale = 300 / 15; 
  const poleH = h * scale;
  const groundY = 380;
  const isTech = activeTab === "technical";

  return (
    <TransformWrapper initialScale={1} minScale={0.5} maxScale={8} centerOnInit>
      {({ zoomIn, zoomOut, resetTransform }) => (
        <>
          {/* Floating Controls */}
          <div className="absolute bottom-4 left-4 flex gap-1 z-20">
            <Button size="sm" variant="secondary" onClick={() => zoomIn()}><ZoomIn size={14} /></Button>
            <Button size="sm" variant="secondary" onClick={() => zoomOut()}><ZoomOut size={14} /></Button>
            <Button size="sm" variant="secondary" onClick={() => resetTransform()}><RefreshCcw size={14} /></Button>
            <Button size="sm" variant="secondary" onClick={toggleFullScreen}><Maximize2 size={14} /></Button>
            <Button size="sm" variant="secondary" className="text-emerald-600" onClick={downloadDrawingPDF}><FileDown size={14} /></Button>
          </div>

          <TransformComponent wrapperClass="!w-full !h-full">
            <div ref={exportRef} className={`p-10 ${isTech ? 'bg-white' : ''}`}>
              <svg viewBox="0 0 300 450" className="w-[300px] h-[450px] overflow-visible">
                {/* SVG Drawing Logic (The path tags you sent earlier go here) */}
                <rect x="145" y={groundY - poleH} width="10" height={poleH} fill={ralColor} stroke="#121212" />
              </svg>
            </div>
          </TransformComponent>
        </>
      )}
    </TransformWrapper>
  );
};