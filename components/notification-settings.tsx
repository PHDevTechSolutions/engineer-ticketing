"use client";

import React, { useState, useEffect } from "react";
import { 
  Bell, Volume2, VolumeX, Play, Check, 
  X, Settings2, Speaker, Music, AlertTriangle 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  getSoundConfig, 
  setSoundConfig, 
  testSound, 
  SOUND_OPTIONS,
  SoundType 
} from "@/lib/notification-sounds";

interface NotificationSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationSettings({ isOpen, onClose }: NotificationSettingsProps) {
  const [config, setConfig] = useState(getSoundConfig());
  const [isTesting, setIsTesting] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setConfig(getSoundConfig());
    }
  }, [isOpen]);

  const handleTypeChange = (type: SoundType) => {
    const newConfig = { ...config, type };
    setConfig(newConfig);
    setSoundConfig(newConfig);
  };

  const handleVolumeChange = (volume: number) => {
    const newConfig = { ...config, volume };
    setConfig(newConfig);
    setSoundConfig(newConfig);
  };

  const handleToggleEnabled = () => {
    const newConfig = { ...config, enabled: !config.enabled };
    setConfig(newConfig);
    setSoundConfig(newConfig);
  };

  const handleTestSound = async () => {
    setIsTesting(true);
    await testSound(config);
    setTimeout(() => setIsTesting(false), 500);
  };

  const handleSave = () => {
    setSoundConfig(config);
    setShowSaveSuccess(true);
    setTimeout(() => {
      setShowSaveSuccess(false);
      onClose();
    }, 800);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-[420px] rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="relative p-6 border-b border-zinc-100">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 hover:bg-zinc-100 rounded-full transition-colors"
          >
            <X size={18} className="text-zinc-400" />
          </button>

          <div className="flex items-center gap-3">
            <div className="size-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Settings2 size={22} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-black text-zinc-900 tracking-tight">
                Notification Settings
              </h3>
              <p className="text-xs font-medium text-zinc-400">
                Customize your alert preferences
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Master Toggle */}
          <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className={cn(
                "size-10 rounded-xl flex items-center justify-center transition-colors",
                config.enabled ? "bg-indigo-100 text-indigo-600" : "bg-zinc-200 text-zinc-400"
              )}>
                {config.enabled ? <Bell size={18} /> : <VolumeX size={18} />}
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-900">Notification Sounds</p>
                <p className="text-[10px] font-medium text-zinc-400">
                  {config.enabled ? "Sounds enabled" : "Sounds muted"}
                </p>
              </div>
            </div>
            <button
              onClick={handleToggleEnabled}
              className={cn(
                "relative w-12 h-7 rounded-full transition-colors duration-200",
                config.enabled ? "bg-indigo-500" : "bg-zinc-300"
              )}
            >
              <span
                className={cn(
                  "absolute top-1 left-1 size-5 bg-white rounded-full shadow transition-transform duration-200",
                  config.enabled ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>

          {/* Sound Selection */}
          <div className={cn("space-y-3", !config.enabled && "opacity-50 pointer-events-none")}>
            <label className="text-xs font-black uppercase tracking-wider text-zinc-400 ml-1">
              Sound Style
            </label>
            <div className="grid grid-cols-2 gap-2">
              {SOUND_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleTypeChange(option.value)}
                  className={cn(
                    "p-3 rounded-xl text-left transition-all border-2",
                    config.type === option.value
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-transparent bg-zinc-50 hover:bg-zinc-100"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {option.value === "none" ? (
                      <VolumeX size={14} className="text-zinc-400" />
                    ) : option.value === "alert" ? (
                      <AlertTriangle size={14} className="text-amber-500" />
                    ) : (
                      <Music size={14} className="text-indigo-500" />
                    )}
                    <span className={cn(
                      "text-xs font-bold",
                      config.type === option.value ? "text-indigo-700" : "text-zinc-700"
                    )}>
                      {option.label}
                    </span>
                    {config.type === option.value && (
                      <Check size={12} className="text-indigo-500 ml-auto" />
                    )}
                  </div>
                  <p className="text-[9px] text-zinc-400 leading-tight">
                    {option.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Volume Control */}
          <div className={cn("space-y-3", !config.enabled && "opacity-50 pointer-events-none")}>
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-zinc-400 ml-1">
                Volume
              </label>
              <span className="text-xs font-bold text-zinc-600">
                {Math.round(config.volume * 100)}%
              </span>
            </div>
            <div className="flex items-center gap-3">
              <VolumeX size={16} className="text-zinc-400" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={config.volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="flex-1 h-2 bg-zinc-200 rounded-full appearance-none cursor-pointer accent-indigo-500"
              />
              <Volume2 size={16} className="text-zinc-600" />
            </div>
          </div>

          {/* Test Button */}
          <button
            onClick={handleTestSound}
            disabled={isTesting || !config.enabled || config.type === "none"}
            className={cn(
              "w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all",
              "flex items-center justify-center gap-2",
              isTesting || !config.enabled || config.type === "none"
                ? "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                : "bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
            )}
          >
            {isTesting ? (
              <><Speaker size={16} className="animate-pulse" /> Playing...</>
            ) : (
              <><Play size={16} /> Test Sound</>
            )}
          </button>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-100 bg-zinc-50/50">
          <button
            onClick={handleSave}
            className={cn(
              "w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
              showSaveSuccess
                ? "bg-emerald-500 text-white"
                : "bg-zinc-900 text-white hover:bg-zinc-800"
            )}
          >
            {showSaveSuccess ? (
              <span className="flex items-center justify-center gap-2">
                <Check size={16} /> Saved!
              </span>
            ) : (
              "Save Preferences"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
