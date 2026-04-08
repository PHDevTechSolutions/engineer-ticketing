"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Bell, Volume2, VolumeX, Play, Check, ArrowLeft,
  Settings, Smartphone, Mail, Clock, Music, AlertCircle,
  Save, RotateCcw, Sparkles, Shield, HardDrive
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  getSoundConfig,
  setSoundConfig,
  testSound,
  getSoundOptions,
  SoundType,
  preloadSounds,
  getEnabledSounds
} from "@/lib/notification-sounds";

interface NotificationPreference {
  pushEnabled: boolean;
  emailEnabled: boolean;
  soundEnabled: boolean;
  desktopEnabled: boolean;
  doNotDisturb: boolean;
  dndStart: string;
  dndEnd: string;
}

const DEFAULT_PREFERENCES: NotificationPreference = {
  pushEnabled: true,
  emailEnabled: true,
  soundEnabled: true,
  desktopEnabled: true,
  doNotDisturb: false,
  dndStart: "22:00",
  dndEnd: "08:00",
};

export default function NotificationSettingsPage() {
  const router = useRouter();
  const [soundConfig, setLocalSoundConfig] = useState(getSoundConfig());
  const [preferences, setPreferences] = useState<NotificationPreference>(DEFAULT_PREFERENCES);
  const [isTesting, setIsTesting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isIT, setIsIT] = useState(false);
  const [soundOptions, setSoundOptions] = useState(getSoundOptions());

  useEffect(() => {
    // Load user info
    const role = localStorage.getItem("userRole");
    const dept = localStorage.getItem("department");
    setUserRole(role);
    setIsIT(dept === "IT" || role === "admin");

    // Load saved preferences
    const saved = localStorage.getItem("notification-preferences");
    if (saved) {
      setPreferences({ ...DEFAULT_PREFERENCES, ...JSON.parse(saved) });
    }

    // Load sound options
    setSoundOptions(getSoundOptions());

    // Preload sounds
    preloadSounds();
  }, []);

  const handleSoundTypeChange = (type: SoundType) => {
    const newConfig = { ...soundConfig, type };
    setLocalSoundConfig(newConfig);
    setSoundConfig(newConfig);
    setHasChanges(true);
  };

  const handleVolumeChange = (value: number[]) => {
    const newConfig = { ...soundConfig, volume: value[0] };
    setLocalSoundConfig(newConfig);
    setSoundConfig(newConfig);
    setHasChanges(true);
  };

  const handleToggleSound = (enabled: boolean) => {
    const newConfig = { ...soundConfig, enabled };
    setLocalSoundConfig(newConfig);
    setSoundConfig(newConfig);
    setHasChanges(true);
  };

  const handleTestSound = async () => {
    setIsTesting(true);
    const success = await testSound(soundConfig);
    if (!success) {
      toast.error("Could not play sound. Make sure your device audio is enabled.");
    }
    setTimeout(() => setIsTesting(false), 500);
  };

  const handlePreferenceChange = (key: keyof NotificationPreference, value: any) => {
    const newPrefs = { ...preferences, [key]: value };
    setPreferences(newPrefs);
    localStorage.setItem("notification-preferences", JSON.stringify(newPrefs));
    setHasChanges(true);
    toast.success("Preference updated");
  };

  const handleSave = () => {
    setSoundConfig(soundConfig);
    localStorage.setItem("notification-preferences", JSON.stringify(preferences));
    setHasChanges(false);
    toast.success("Notification settings saved successfully!");
  };

  const handleReset = () => {
    setLocalSoundConfig({ type: "default", volume: 0.7, enabled: true });
    setPreferences(DEFAULT_PREFERENCES);
    setSoundConfig({ type: "default", volume: 0.7, enabled: true });
    localStorage.setItem("notification-preferences", JSON.stringify(DEFAULT_PREFERENCES));
    setHasChanges(true);
    toast.info("Settings reset to defaults");
  };

  return (
    <div className="min-h-screen bg-[#F4F7F7] font-sans pb-10">
      <PageHeader
        title="NOTIFICATION SETTINGS"
        showBackButton={true}
      />

      <main className="p-4 md:p-8 max-w-4xl mx-auto w-full space-y-6">
        {/* Header Card */}
        <Card className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white rounded-3xl border-0 shadow-xl overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -top-20 -right-20 w-60 h-60 bg-white rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-purple-400 rounded-full blur-3xl" />
          </div>
          <CardContent className="relative p-8">
            <div className="flex items-center gap-4">
              <div className="size-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Bell size={32} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight">Stay Informed</h1>
                <p className="text-white/80 text-sm mt-1">
                  Customize how and when you receive notifications
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sound Settings Section */}
        <Card className="bg-white rounded-3xl border border-zinc-200/60 shadow-sm">
          <CardHeader className="border-b border-zinc-100 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
                  <Music size={20} className="text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg font-black text-zinc-900">Sound Alerts</CardTitle>
                  <CardDescription className="text-xs text-zinc-500">
                    Choose your notification sound style
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-zinc-500 uppercase">
                  {soundConfig.enabled ? "On" : "Off"}
                </span>
                <Switch
                  checked={soundConfig.enabled}
                  onCheckedChange={handleToggleSound}
                  className="data-[state=checked]:bg-indigo-500"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Sound Type Selection */}
            <div className={cn("space-y-3", !soundConfig.enabled && "opacity-50 pointer-events-none")}>
              <Label className="text-xs font-black uppercase tracking-wider text-zinc-400">
                Sound Style
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {soundOptions.map((option: { value: SoundType; label: string; description: string }) => (
                  <button
                    key={option.value}
                    onClick={() => handleSoundTypeChange(option.value)}
                    className={cn(
                      "p-4 rounded-2xl text-left transition-all border-2 relative overflow-hidden",
                      soundConfig.type === option.value
                        ? "border-indigo-500 bg-indigo-50/50"
                        : "border-zinc-100 bg-zinc-50/50 hover:border-zinc-200 hover:bg-zinc-50"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {option.value === "none" ? (
                        <VolumeX size={16} className="text-zinc-400" />
                      ) : option.value === "alert" ? (
                        <AlertCircle size={16} className="text-rose-500" />
                      ) : (
                        <Music size={16} className="text-indigo-500" />
                      )}
                      <span className={cn(
                        "text-sm font-bold",
                        soundConfig.type === option.value ? "text-indigo-700" : "text-zinc-700"
                      )}>
                        {option.label}
                      </span>
                      {soundConfig.type === option.value && (
                        <Check size={14} className="text-indigo-500 ml-auto" />
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-500 leading-tight">
                      {option.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <Separator className="bg-zinc-100" />

            {/* Volume Control */}
            <div className={cn("space-y-4", !soundConfig.enabled && "opacity-50 pointer-events-none")}>
              <div className="flex items-center justify-between">
                <Label className="text-xs font-black uppercase tracking-wider text-zinc-400">
                  Volume Level
                </Label>
                <Badge variant="secondary" className="font-bold text-xs">
                  {Math.round(soundConfig.volume * 100)}%
                </Badge>
              </div>
              <div className="flex items-center gap-4">
                <VolumeX size={18} className="text-zinc-400" />
                <Slider
                  value={[soundConfig.volume]}
                  onValueChange={handleVolumeChange}
                  max={1}
                  step={0.1}
                  className="flex-1"
                />
                <Volume2 size={18} className="text-zinc-600" />
              </div>
            </div>

            {/* Test Sound Button */}
            <Button
              onClick={handleTestSound}
              disabled={isTesting || !soundConfig.enabled || soundConfig.type === "none"}
              variant="outline"
              className={cn(
                "w-full h-12 rounded-xl font-bold text-xs uppercase tracking-widest transition-all",
                "border-2 border-dashed",
                isTesting
                  ? "border-indigo-300 text-indigo-500"
                  : "border-zinc-300 text-zinc-600 hover:border-indigo-300 hover:text-indigo-600"
              )}
            >
              {isTesting ? (
                <><Sparkles size={16} className="animate-pulse mr-2" /> Playing...</>
              ) : (
                <><Play size={16} className="mr-2" /> Test Sound</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Delivery Preferences */}
        <Card className="bg-white rounded-3xl border border-zinc-200/60 shadow-sm">
          <CardHeader className="border-b border-zinc-100 p-6">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                <Smartphone size={20} className="text-white" />
              </div>
              <div>
                <CardTitle className="text-lg font-black text-zinc-900">Delivery Methods</CardTitle>
                <CardDescription className="text-xs text-zinc-500">
                  How you want to receive notifications
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                  <Bell size={18} className="text-indigo-600" />
                </div>
                <div>
                  <p className="font-bold text-sm text-zinc-900">Push Notifications</p>
                  <p className="text-[10px] text-zinc-500">In-app and browser notifications</p>
                </div>
              </div>
              <Switch
                checked={preferences.pushEnabled}
                onCheckedChange={(v) => handlePreferenceChange("pushEnabled", v)}
                className="data-[state=checked]:bg-indigo-500"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <Mail size={18} className="text-amber-600" />
                </div>
                <div>
                  <p className="font-bold text-sm text-zinc-900">Email Notifications</p>
                  <p className="text-[10px] text-zinc-500">Receive summaries via email</p>
                </div>
              </div>
              <Switch
                checked={preferences.emailEnabled}
                onCheckedChange={(v) => handlePreferenceChange("emailEnabled", v)}
                className="data-[state=checked]:bg-indigo-500"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-purple-100 flex items-center justify-center">
                  <HardDrive size={18} className="text-purple-600" />
                </div>
                <div>
                  <p className="font-bold text-sm text-zinc-900">Desktop Alerts</p>
                  <p className="text-[10px] text-zinc-500">System-level desktop notifications</p>
                </div>
              </div>
              <Switch
                checked={preferences.desktopEnabled}
                onCheckedChange={(v) => handlePreferenceChange("desktopEnabled", v)}
                className="data-[state=checked]:bg-indigo-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Do Not Disturb */}
        <Card className="bg-white rounded-3xl border border-zinc-200/60 shadow-sm">
          <CardHeader className="border-b border-zinc-100 p-6">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-gradient-to-br from-slate-500 to-zinc-600 flex items-center justify-center">
                <Clock size={20} className="text-white" />
              </div>
              <div>
                <CardTitle className="text-lg font-black text-zinc-900">Quiet Hours</CardTitle>
                <CardDescription className="text-xs text-zinc-500">
                  Temporarily pause notifications
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-slate-200 flex items-center justify-center">
                  <MoonIcon size={18} className="text-slate-600" />
                </div>
                <div>
                  <p className="font-bold text-sm text-zinc-900">Do Not Disturb</p>
                  <p className="text-[10px] text-zinc-500">Silence all non-urgent notifications</p>
                </div>
              </div>
              <Switch
                checked={preferences.doNotDisturb}
                onCheckedChange={(v) => handlePreferenceChange("doNotDisturb", v)}
                className="data-[state=checked]:bg-slate-500"
              />
            </div>

            {preferences.doNotDisturb && (
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
                <div className="flex-1 space-y-2">
                  <Label className="text-xs font-bold text-zinc-500">Start Time</Label>
                  <input
                    type="time"
                    value={preferences.dndStart}
                    onChange={(e) => handlePreferenceChange("dndStart", e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-zinc-200 text-sm font-bold"
                  />
                </div>
                <div className="text-zinc-400">→</div>
                <div className="flex-1 space-y-2">
                  <Label className="text-xs font-bold text-zinc-500">End Time</Label>
                  <input
                    type="time"
                    value={preferences.dndEnd}
                    onChange={(e) => handlePreferenceChange("dndEnd", e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-zinc-200 text-sm font-bold"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* IT Admin Section */}
        {isIT && (
          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl border-2 border-amber-200 shadow-sm">
            <CardHeader className="border-b border-amber-200/60 p-6">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                  <Shield size={20} className="text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg font-black text-zinc-900">IT Admin Controls</CardTitle>
                  <CardDescription className="text-xs text-zinc-600">
                    Manage notification sounds for all users
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-4">
              <div className="p-4 bg-white/70 backdrop-blur-sm rounded-2xl border border-amber-200/50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <HardDrive size={18} className="text-amber-600" />
                    <span className="font-bold text-sm text-zinc-900">Sound Library</span>
                  </div>
                  <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">
                    5 sounds
                  </Badge>
                </div>
                <p className="text-xs text-zinc-600 mb-4">
                  Upload and manage notification sounds available to all users
                </p>
                <Button
                  onClick={() => router.push("/admin/sounds")}
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-xs uppercase tracking-widest hover:shadow-lg"
                >
                  <Settings size={16} className="mr-2" />
                  Manage Sound Library
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 pt-4">
          <Button
            onClick={handleReset}
            variant="outline"
            className="flex-1 h-14 rounded-2xl font-bold text-xs uppercase tracking-widest text-zinc-500 hover:text-zinc-700 border-2 border-zinc-200"
          >
            <RotateCcw size={16} className="mr-2" />
            Reset Defaults
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges}
            className={cn(
              "flex-[2] h-14 rounded-2xl font-black text-xs uppercase tracking-widest transition-all",
              hasChanges
                ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-xl"
                : "bg-zinc-200 text-zinc-400 cursor-not-allowed"
            )}
          >
            <Save size={16} className="mr-2" />
            Save Changes
          </Button>
        </div>
      </main>
    </div>
  );
}

// Moon icon component
function MoonIcon({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}
