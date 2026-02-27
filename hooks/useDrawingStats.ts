// src/hooks/useDrawingStats.ts
import { useMemo } from "react";

export const useDrawingStats = (formData: any) => {
  return useMemo(() => {
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
};