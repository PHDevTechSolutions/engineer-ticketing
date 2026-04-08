/**
 * Notification Sounds Configuration
 * Manage sound preferences and playback for notifications
 */

export type SoundType = "default" | "chime" | "bell" | "alert" | "subtle" | "none" | string;

export interface SoundConfig {
  type: SoundType;
  volume: number; // 0-1
  enabled: boolean;
}

export interface SoundDefinition {
  id: string;
  name: string;
  filename: string;
  displayName: string;
  description: string;
  enabled: boolean;
  isBuiltIn: boolean;
}

// Built-in sound paths
const BUILT_IN_PATHS: Record<string, string | null> = {
  default: "/sounds/ticket-endorsed.mp3",
  chime: "/sounds/chime.mp3",
  bell: "/sounds/bell.mp3",
  alert: "/sounds/alert.mp3",
  subtle: "/sounds/subtle.mp3",
  none: null,
};

// Dynamic sound paths (includes custom sounds)
function getSoundPath(type: string): string | null {
  // Check built-in first
  if (type in BUILT_IN_PATHS) {
    return BUILT_IN_PATHS[type];
  }
  
  // Check custom sounds
  if (typeof window !== "undefined") {
    const customSounds = getAvailableSounds().filter(s => !s.isBuiltIn);
    const custom = customSounds.find(s => s.id === type || s.name === type);
    if (custom) {
      return `/sounds/${custom.filename}`;
    }
  }
  
  return null;
}

const DEFAULT_CONFIG: SoundConfig = {
  type: "default",
  volume: 0.7,
  enabled: true,
};

const STORAGE_KEY = "notification-sound-config";
const AVAILABLE_SOUNDS_KEY = "available-notification-sounds";

// Default available sounds
const DEFAULT_AVAILABLE_SOUNDS: SoundDefinition[] = [
  { id: "default", name: "default", filename: "ticket-endorsed.mp3", displayName: "Default", description: "Classic notification sound", enabled: true, isBuiltIn: true },
  { id: "chime", name: "chime", filename: "chime.mp3", displayName: "Chime", description: "Soft chime tone", enabled: true, isBuiltIn: true },
  { id: "bell", name: "bell", filename: "bell.mp3", displayName: "Bell", description: "Traditional bell ring", enabled: true, isBuiltIn: true },
  { id: "alert", name: "alert", filename: "alert.mp3", displayName: "Alert", description: "Urgent alert tone", enabled: true, isBuiltIn: true },
  { id: "subtle", name: "subtle", filename: "subtle.mp3", displayName: "Subtle", description: "Minimal, quiet notification", enabled: true, isBuiltIn: true },
  { id: "none", name: "none", filename: "", displayName: "Silent", description: "No sound", enabled: true, isBuiltIn: true },
];

export function getAvailableSounds(): SoundDefinition[] {
  if (typeof window === "undefined") return DEFAULT_AVAILABLE_SOUNDS;
  
  try {
    const stored = localStorage.getItem(AVAILABLE_SOUNDS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    console.error("Failed to parse available sounds");
  }
  return DEFAULT_AVAILABLE_SOUNDS;
}

export function setAvailableSounds(sounds: SoundDefinition[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(AVAILABLE_SOUNDS_KEY, JSON.stringify(sounds));
}

export function getEnabledSounds(): SoundDefinition[] {
  return getAvailableSounds().filter(s => s.enabled && s.id !== "none");
}

export function getSoundConfig(): SoundConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
      // Validate that the selected sound is still enabled
      const available = getAvailableSounds();
      const selected = available.find(s => s.id === parsed.type);
      if (selected && !selected.enabled && parsed.type !== "none") {
        // Fall back to first enabled sound
        const fallback = available.find(s => s.enabled && s.id !== "none");
        parsed.type = fallback?.id || "none";
        setSoundConfig(parsed);
      }
      return parsed;
    }
  } catch {
    console.error("Failed to parse sound config");
  }
  return DEFAULT_CONFIG;
}

export function setSoundConfig(config: Partial<SoundConfig>): void {
  if (typeof window === "undefined") return;
  
  const current = getSoundConfig();
  const updated = { ...current, ...config };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function playNotificationSound(config?: SoundConfig): void {
  const { type, volume, enabled } = config || getSoundConfig();
  
  if (!enabled || type === "none") return;
  
  // Check if sound is enabled in available sounds
  const available = getAvailableSounds();
  const sound = available.find(s => s.id === type);
  if (sound && !sound.enabled) return;
  
  const path = getSoundPath(type);
  if (!path) return;
  
  const audio = new Audio(path);
  audio.volume = volume;
  audio.play().catch((err) => {
    // User interaction required or autoplay blocked
    console.debug("Sound playback blocked:", err);
  });
}

export function preloadSounds(): void {
  if (typeof window === "undefined") return;
  
  // Preload only enabled sounds
  const enabled = getEnabledSounds();
  enabled.forEach((sound) => {
    const path = getSoundPath(sound.id);
    if (path) {
      const audio = new Audio(path);
      audio.load();
    }
  });
}

// Test sound with current or provided config
export async function testSound(config?: SoundConfig): Promise<boolean> {
  const { type, volume, enabled } = config || getSoundConfig();
  
  if (!enabled || type === "none") {
    console.log("Sound is disabled or set to none");
    return false;
  }
  
  const path = getSoundPath(type);
  if (!path) return false;
  
  try {
    const audio = new Audio(path);
    audio.volume = volume;
    await audio.play();
    return true;
  } catch (err) {
    console.error("Failed to play test sound:", err);
    return false;
  }
}

// Get sound options for UI - only enabled sounds
export function getSoundOptions(): { value: SoundType; label: string; description: string }[] {
  const available = getAvailableSounds();
  return available
    .filter(s => s.enabled)
    .map(s => ({
      value: s.id,
      label: s.displayName,
      description: s.description,
    }));
}

// Legacy export for backwards compatibility - generates from available sounds
export const SOUND_OPTIONS: { value: SoundType; label: string; description: string }[] = [
  { value: "default", label: "Default", description: "Classic notification sound" },
  { value: "chime", label: "Chime", description: "Soft chime tone" },
  { value: "bell", label: "Bell", description: "Traditional bell ring" },
  { value: "alert", label: "Alert", description: "Urgent alert tone" },
  { value: "subtle", label: "Subtle", description: "Minimal, quiet notification" },
  { value: "none", label: "Silent", description: "No sound, visual only" },
];
