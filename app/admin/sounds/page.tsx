"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Upload, Volume2, Trash2, Play, Check, X, ArrowLeft,
  HardDrive, Music, AlertTriangle, RefreshCw, Plus,
  Settings, Shield, FileAudio, VolumeX, Download
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader,
  DialogTitle, DialogTrigger, DialogFooter, DialogClose,
} from "@/components/ui/dialog";

interface SoundFile {
  id: string;
  name: string;
  filename: string;
  displayName: string;
  description: string;
  enabled: boolean;
  size: number;
  duration?: number;
  uploadDate: Date;
  isBuiltIn: boolean;
}

const BUILT_IN_SOUNDS: SoundFile[] = [
  {
    id: "default",
    name: "default",
    filename: "ticket-endorsed.mp3",
    displayName: "Default",
    description: "Classic notification sound",
    enabled: true,
    size: 0,
    uploadDate: new Date(),
    isBuiltIn: true,
  },
  {
    id: "chime",
    name: "chime",
    filename: "chime.mp3",
    displayName: "Chime",
    description: "Soft chime tone",
    enabled: true,
    size: 0,
    uploadDate: new Date(),
    isBuiltIn: true,
  },
  {
    id: "bell",
    name: "bell",
    filename: "bell.mp3",
    displayName: "Bell",
    description: "Traditional bell ring",
    enabled: true,
    size: 0,
    uploadDate: new Date(),
    isBuiltIn: true,
  },
  {
    id: "alert",
    name: "alert",
    filename: "alert.mp3",
    displayName: "Alert",
    description: "Urgent alert tone",
    enabled: true,
    size: 0,
    uploadDate: new Date(),
    isBuiltIn: true,
  },
  {
    id: "subtle",
    name: "subtle",
    filename: "subtle.mp3",
    displayName: "Subtle",
    description: "Minimal, quiet notification",
    enabled: true,
    size: 0,
    uploadDate: new Date(),
    isBuiltIn: true,
  },
];

export default function SoundManagementPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sounds, setSounds] = useState<SoundFile[]>(BUILT_IN_SOUNDS);
  const [customSounds, setCustomSounds] = useState<SoundFile[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isIT, setIsIT] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    const dept = localStorage.getItem("department");
    setUserRole(role);
    setIsIT(dept === "IT" || role === "admin");

    // Load custom sounds from localStorage (in real app, this would be from server)
    const saved = localStorage.getItem("custom-sounds");
    if (saved) {
      setCustomSounds(JSON.parse(saved).map((s: any) => ({
        ...s,
        uploadDate: new Date(s.uploadDate),
      })));
    }
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("audio/")) {
      toast.error("Please select an audio file (MP3, WAV, etc.)");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size must be under 2MB");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress((p) => {
        if (p >= 90) {
          clearInterval(interval);
          return 90;
        }
        return p + 10;
      });
    }, 100);

    // Simulate upload delay
    await new Promise((r) => setTimeout(r, 1000));

    // Create sound object
    const newSound: SoundFile = {
      id: `custom-${Date.now()}`,
      name: file.name.replace(/\.[^/.]+$/, ""),
      filename: file.name,
      displayName: file.name.replace(/\.[^/.]+$/, ""),
      description: "Custom uploaded sound",
      enabled: true,
      size: file.size,
      uploadDate: new Date(),
      isBuiltIn: false,
    };

    const updated = [...customSounds, newSound];
    setCustomSounds(updated);
    localStorage.setItem("custom-sounds", JSON.stringify(updated));

    clearInterval(interval);
    setUploadProgress(100);

    setTimeout(() => {
      setIsUploading(false);
      setUploadProgress(0);
      toast.success(`"${newSound.displayName}" uploaded successfully!`);
    }, 300);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handlePlay = async (sound: SoundFile) => {
    if (playingId === sound.id) {
      setPlayingId(null);
      return;
    }

    setPlayingId(sound.id);

    const audio = new Audio(`/sounds/${sound.filename}`);
    audio.volume = 0.5;

    try {
      await audio.play();
      audio.onended = () => setPlayingId(null);
    } catch {
      toast.error("Sound file not found. Make sure the file exists in /public/sounds/");
      setPlayingId(null);
    }
  };

  const handleToggleEnabled = (sound: SoundFile) => {
    if (sound.isBuiltIn) {
      const updated = sounds.map((s) =>
        s.id === sound.id ? { ...s, enabled: !s.enabled } : s
      );
      setSounds(updated);
      toast.success(`"${sound.displayName}" ${sound.enabled ? "disabled" : "enabled"}`);
    } else {
      const updated = customSounds.map((s) =>
        s.id === sound.id ? { ...s, enabled: !s.enabled } : s
      );
      setCustomSounds(updated);
      localStorage.setItem("custom-sounds", JSON.stringify(updated));
      toast.success(`"${sound.displayName}" ${sound.enabled ? "disabled" : "enabled"}`);
    }
  };

  const handleDelete = (sound: SoundFile) => {
    if (sound.isBuiltIn) {
      toast.error("Cannot delete built-in sounds");
      return;
    }

    const updated = customSounds.filter((s) => s.id !== sound.id);
    setCustomSounds(updated);
    localStorage.setItem("custom-sounds", JSON.stringify(updated));
    setDeleteConfirmId(null);
    toast.success(`"${sound.displayName}" deleted`);
  };

  const handleUpdateDisplayName = (sound: SoundFile, newName: string) => {
    if (sound.isBuiltIn) {
      const updated = sounds.map((s) =>
        s.id === sound.id ? { ...s, displayName: newName } : s
      );
      setSounds(updated);
    } else {
      const updated = customSounds.map((s) =>
        s.id === sound.id ? { ...s, displayName: newName } : s
      );
      setCustomSounds(updated);
      localStorage.setItem("custom-sounds", JSON.stringify(updated));
    }
  };

  const handleUpdateDescription = (sound: SoundFile, newDesc: string) => {
    if (sound.isBuiltIn) {
      const updated = sounds.map((s) =>
        s.id === sound.id ? { ...s, description: newDesc } : s
      );
      setSounds(updated);
    } else {
      const updated = customSounds.map((s) =>
        s.id === sound.id ? { ...s, description: newDesc } : s
      );
      setCustomSounds(updated);
      localStorage.setItem("custom-sounds", JSON.stringify(updated));
    }
  };

  const allSounds = [...sounds, ...customSounds];
  const enabledCount = allSounds.filter((s) => s.enabled).length;

  if (!isIT) {
    return (
      <div className="min-h-screen bg-[#F4F7F7] flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="size-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Shield size={32} className="text-red-600" />
            </div>
            <h2 className="text-xl font-black text-zinc-900 mb-2">Access Denied</h2>
            <p className="text-sm text-zinc-500 mb-6">
              This page is restricted to IT administrators only.
            </p>
            <Button onClick={() => router.push("/dashboard")} className="w-full">
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F7F7] font-sans pb-10">
      <PageHeader
        title="SOUND MANAGEMENT"
        showBackButton={true}
      />

      <main className="p-4 md:p-8 max-w-4xl mx-auto w-full space-y-6">
        {/* Stats Card */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl border-0">
            <CardContent className="p-5">
              <p className="text-[10px] font-black uppercase tracking-wider opacity-70">Total Sounds</p>
              <p className="text-3xl font-black mt-1">{allSounds.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl border-0">
            <CardContent className="p-5">
              <p className="text-[10px] font-black uppercase tracking-wider opacity-70">Enabled</p>
              <p className="text-3xl font-black mt-1">{enabledCount}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-2xl border-0">
            <CardContent className="p-5">
              <p className="text-[10px] font-black uppercase tracking-wider opacity-70">Custom</p>
              <p className="text-3xl font-black mt-1">{customSounds.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Upload Section */}
        <Card className="bg-white rounded-3xl border border-zinc-200/60 shadow-sm">
          <CardHeader className="border-b border-zinc-100 p-6">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                <Upload size={20} className="text-white" />
              </div>
              <div>
                <CardTitle className="text-lg font-black text-zinc-900">Upload New Sound</CardTitle>
                <CardDescription className="text-xs text-zinc-500">
                  MP3 files only, max 2MB
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className={cn(
                "w-full h-32 rounded-2xl border-3 border-dashed transition-all flex flex-col items-center justify-center gap-3",
                isUploading
                  ? "border-indigo-300 bg-indigo-50"
                  : "border-zinc-300 hover:border-indigo-400 hover:bg-indigo-50/50 border-2"
              )}
            >
              {isUploading ? (
                <>
                  <div className="w-32 h-2 bg-zinc-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-sm font-bold text-indigo-600">
                    Uploading... {uploadProgress}%
                  </p>
                </>
              ) : (
                <>
                  <div className="size-12 rounded-full bg-indigo-100 flex items-center justify-center">
                    <Plus size={24} className="text-indigo-600" />
                  </div>
                  <p className="text-sm font-bold text-zinc-600">Click to upload sound file</p>
                  <p className="text-[10px] text-zinc-400">MP3, WAV • Max 2MB</p>
                </>
              )}
            </button>
          </CardContent>
        </Card>

        {/* Built-in Sounds */}
        <Card className="bg-white rounded-3xl border border-zinc-200/60 shadow-sm">
          <CardHeader className="border-b border-zinc-100 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-gradient-to-br from-slate-500 to-zinc-600 flex items-center justify-center">
                  <HardDrive size={20} className="text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg font-black text-zinc-900">Built-in Sounds</CardTitle>
                  <CardDescription className="text-xs text-zinc-500">
                    System default notification sounds
                  </CardDescription>
                </div>
              </div>
              <Badge variant="secondary" className="font-bold">
                {sounds.length} sounds
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-2">
              {sounds.map((sound) => (
                <SoundItem
                  key={sound.id}
                  sound={sound}
                  isPlaying={playingId === sound.id}
                  onPlay={() => handlePlay(sound)}
                  onToggle={() => handleToggleEnabled(sound)}
                  onUpdateName={(name) => handleUpdateDisplayName(sound, name)}
                  onUpdateDesc={(desc) => handleUpdateDescription(sound, desc)}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Custom Sounds */}
        {customSounds.length > 0 && (
          <Card className="bg-white rounded-3xl border border-zinc-200/60 shadow-sm">
            <CardHeader className="border-b border-zinc-100 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                    <Music size={20} className="text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-black text-zinc-900">Custom Sounds</CardTitle>
                    <CardDescription className="text-xs text-zinc-500">
                      User uploaded notification sounds
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="secondary" className="font-bold bg-amber-100 text-amber-700">
                  {customSounds.length} sounds
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-2">
                {customSounds.map((sound) => (
                  <SoundItem
                    key={sound.id}
                    sound={sound}
                    isPlaying={playingId === sound.id}
                    onPlay={() => handlePlay(sound)}
                    onToggle={() => handleToggleEnabled(sound)}
                    onUpdateName={(name) => handleUpdateDisplayName(sound, name)}
                    onUpdateDesc={(desc) => handleUpdateDescription(sound, desc)}
                    onDelete={() => setDeleteConfirmId(sound.id)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions Card */}
        <Card className="bg-blue-50 rounded-3xl border border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <div className="size-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={16} className="text-blue-600" />
              </div>
              <div>
                <p className="font-bold text-sm text-blue-900 mb-1">Important Notes</p>
                <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                  <li>Sound files must be placed in <code className="bg-blue-100 px-1 rounded">public/sounds/</code></li>
                  <li>MP3 format recommended for best browser compatibility</li>
                  <li>Keep files under 2MB for fast loading</li>
                  <li>Disabled sounds won't appear in user preferences</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black">Delete Sound?</DialogTitle>
            <DialogDescription className="text-sm text-zinc-500">
              This action cannot be undone. The sound file will be removed from the system.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3 mt-4">
            <DialogClose asChild>
              <Button variant="outline" className="flex-1 rounded-xl">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              className="flex-1 rounded-xl"
              onClick={() => {
                const sound = customSounds.find((s) => s.id === deleteConfirmId);
                if (sound) handleDelete(sound);
              }}
            >
              <Trash2 size={16} className="mr-2" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Sound Item Component
interface SoundItemProps {
  sound: SoundFile;
  isPlaying: boolean;
  onPlay: () => void;
  onToggle: () => void;
  onUpdateName: (name: string) => void;
  onUpdateDesc: (desc: string) => void;
  onDelete?: () => void;
}

function SoundItem({
  sound,
  isPlaying,
  onPlay,
  onToggle,
  onUpdateName,
  onUpdateDesc,
  onDelete,
}: SoundItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(sound.displayName);
  const [editDesc, setEditDesc] = useState(sound.description);

  const handleSave = () => {
    onUpdateName(editName);
    onUpdateDesc(editDesc);
    setIsEditing(false);
    toast.success("Sound details updated");
  };

  return (
    <div
      className={cn(
        "group flex items-center gap-3 p-3 rounded-2xl transition-all",
        sound.enabled ? "bg-zinc-50 hover:bg-zinc-100" : "bg-zinc-50/50 opacity-60"
      )}
    >
      {/* Play Button */}
      <button
        onClick={onPlay}
        className={cn(
          "size-10 rounded-xl flex items-center justify-center transition-all flex-shrink-0",
          isPlaying
            ? "bg-indigo-500 text-white animate-pulse"
            : "bg-zinc-200 text-zinc-600 hover:bg-indigo-100 hover:text-indigo-600"
        )}
      >
        {isPlaying ? <Volume2 size={18} /> : <Play size={18} />}
      </button>

      {/* Info */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="space-y-2">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="h-8 text-sm font-bold"
              placeholder="Sound name"
            />
            <Input
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              className="h-8 text-xs"
              placeholder="Description"
            />
            <div className="flex gap-2">
              <Button size="sm" className="h-7 text-xs" onClick={handleSave}>
                <Check size={12} className="mr-1" /> Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => {
                  setIsEditing(false);
                  setEditName(sound.displayName);
                  setEditDesc(sound.description);
                }}
              >
                <X size={12} className="mr-1" /> Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="cursor-pointer" onClick={() => setIsEditing(true)}>
            <div className="flex items-center gap-2">
              <p className="font-bold text-sm text-zinc-900 truncate">{sound.displayName}</p>
              {sound.isBuiltIn && (
                <Badge variant="outline" className="text-[8px] h-4">Built-in</Badge>
              )}
              {!sound.enabled && (
                <Badge variant="secondary" className="text-[8px] h-4 bg-zinc-200">Disabled</Badge>
              )}
            </div>
            <p className="text-[10px] text-zinc-500 truncate">{sound.description}</p>
            <p className="text-[9px] text-zinc-400">{sound.filename}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <Switch
          checked={sound.enabled}
          onCheckedChange={onToggle}
          className="data-[state=checked]:bg-indigo-500"
        />
        {!sound.isBuiltIn && onDelete && (
          <button
            onClick={onDelete}
            className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
