"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Bell, X, Clock, CheckCircle2, AlertCircle, 
  Info, FileText, Eye, LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { playNotificationSound } from "@/lib/notification-sounds";

export interface NotificationData {
  id: string;
  title: string;
  body: string;
  type?: "default" | "success" | "warning" | "error" | "info" | "urgent";
  url?: string;
  timestamp?: Date;
  senderName?: string;
  priority?: "low" | "normal" | "high" | "urgent";
  icon?: LucideIcon;
}

interface NotificationPopupProps {
  notification: NotificationData | null;
  onClose: () => void;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

// Elegant design system with gradients
const TYPE_STYLES = {
  default: {
    icon: Bell,
    gradient: "from-indigo-500 to-purple-600",
    bg: "bg-white",
    shadow: "shadow-indigo-500/20",
    ring: "ring-indigo-500/20",
    pulse: false,
  },
  success: {
    icon: CheckCircle2,
    gradient: "from-emerald-500 to-teal-600",
    bg: "bg-white",
    shadow: "shadow-emerald-500/20",
    ring: "ring-emerald-500/20",
    pulse: false,
  },
  warning: {
    icon: AlertCircle,
    gradient: "from-amber-500 to-orange-600",
    bg: "bg-white",
    shadow: "shadow-amber-500/20",
    ring: "ring-amber-500/20",
    pulse: false,
  },
  error: {
    icon: AlertCircle,
    gradient: "from-red-500 to-rose-600",
    bg: "bg-white",
    shadow: "shadow-red-500/20",
    ring: "ring-red-500/20",
    pulse: false,
  },
  info: {
    icon: Info,
    gradient: "from-blue-500 to-cyan-600",
    bg: "bg-white",
    shadow: "shadow-blue-500/20",
    ring: "ring-blue-500/20",
    pulse: false,
  },
  urgent: {
    icon: AlertCircle,
    gradient: "from-red-600 to-pink-600",
    bg: "bg-white",
    shadow: "shadow-red-600/30",
    ring: "ring-red-600/30",
    pulse: true,
  },
};

// Circular progress indicator
function CircularProgress({ 
  progress, 
  size = 36, 
  strokeWidth = 3,
  color 
}: { 
  progress: number; 
  size?: number; 
  strokeWidth?: number;
  color: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90 w-full h-full">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-zinc-100"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={color}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
            transition: "stroke-dashoffset 100ms linear",
          }}
        />
      </svg>
    </div>
  );
}

export function NotificationPopup({ 
  notification, 
  onClose, 
  autoClose = true,
  autoCloseDelay = 8000 
}: NotificationPopupProps) {
  const router = useRouter();
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!notification || !autoClose || isPaused) return;

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / autoCloseDelay) * 100);
      setProgress(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        onClose();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [notification, autoClose, autoCloseDelay, isPaused, onClose]);

  // Play sound when notification appears
  useEffect(() => {
    if (notification) {
      playNotificationSound();
    }
  }, [notification?.id]);

  const handleAction = () => {
    if (notification?.url) {
      router.push(notification.url);
    }
    onClose();
  };

  const handleMarkAsRead = () => {
    onClose();
  };

  if (!notification) return null;

  const type = notification.type || "default";
  const style = TYPE_STYLES[type];
  const Icon = notification.icon || style.icon;
  const priority = notification.priority || "normal";

  // Priority config
  const priorityConfig = {
    low: { label: "Low", dot: "bg-slate-400" },
    normal: { label: "Normal", dot: "bg-blue-500" },
    high: { label: "High", dot: "bg-amber-500" },
    urgent: { label: "Urgent", dot: "bg-red-500 animate-pulse" },
  }[priority];

  return (
    <div 
      className="fixed top-5 right-5 z-[120] w-[320px] animate-in slide-in-from-right-8 fade-in duration-300"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Floating card with glassmorphism */}
      <div className={cn(
        "relative rounded-[20px] overflow-hidden",
        "bg-white/95 backdrop-blur-xl",
        "shadow-[0_8px_32px_rgba(0,0,0,0.12)]",
        style.shadow,
        "ring-1 ring-white/50",
        style.pulse && "animate-pulse"
      )}>
        {/* Top gradient accent bar */}
        <div className={cn(
          "h-1 w-full bg-gradient-to-r",
          style.gradient
        )} />

        {/* Progress ring in corner */}
        {autoClose && (
          <div className="absolute top-3 right-3">
            <CircularProgress 
              progress={progress} 
              size={28} 
              strokeWidth={2}
              color={cn("text-transparent bg-gradient-to-r bg-clip-text", style.gradient).replace("text-transparent bg-gradient-to-r bg-clip-text ", "")}
            />
          </div>
        )}

        <div className="p-4">
          {/* Compact Header Row */}
          <div className="flex items-center gap-3 mb-2.5">
            {/* Icon with gradient background */}
            <div className={cn(
              "size-9 rounded-lg flex items-center justify-center flex-shrink-0",
              "bg-gradient-to-br",
              style.gradient,
              "shadow-lg"
            )}>
              <Icon size={18} className="text-white" />
            </div>
            
            {/* Title and meta */}
            <div className="flex-1 min-w-0 pr-8">
              <h4 className="font-bold text-[13px] text-zinc-900 leading-tight truncate">
                {notification.title}
              </h4>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={cn("w-1.5 h-1.5 rounded-full", priorityConfig.dot)} />
                <span className="text-[10px] font-medium text-zinc-500">
                  {priorityConfig.label} priority
                </span>
                <span className="text-zinc-300">·</span>
                <span className="text-[10px] text-zinc-400">Just now</span>
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3.5 right-3.5 p-1.5 hover:bg-zinc-100 rounded-lg transition-colors"
            >
              <X size={14} className="text-zinc-400" />
            </button>
          </div>

          {/* Body text */}
          <p className="text-[12px] text-zinc-600 leading-relaxed mb-3 pl-12 line-clamp-2">
            {notification.body}
          </p>

          {/* Action Buttons Row */}
          <div className="flex items-center gap-2 pl-12">
            {notification.url ? (
              <button
                onClick={handleAction}
                className={cn(
                  "flex-1 h-8 px-3 rounded-lg font-bold text-[10px] uppercase tracking-wider",
                  "flex items-center justify-center gap-1.5 transition-all",
                  "bg-zinc-900 text-white hover:bg-zinc-800 active:scale-[0.97]",
                  "shadow-md shadow-zinc-900/20"
                )}
              >
                <Eye size={12} />
                View
              </button>
            ) : (
              <button
                onClick={handleMarkAsRead}
                className={cn(
                  "flex-1 h-8 px-3 rounded-lg font-bold text-[10px] uppercase tracking-wider",
                  "flex items-center justify-center gap-1.5 transition-all",
                  "bg-gradient-to-r from-emerald-500 to-teal-500 text-white",
                  "hover:shadow-lg hover:shadow-emerald-500/25 active:scale-[0.97]"
                )}
              >
                <CheckCircle2 size={12} />
                Got it
              </button>
            )}

            <button
              onClick={onClose}
              className="h-8 px-3 rounded-lg font-bold text-[10px] uppercase tracking-wider text-zinc-500 hover:bg-zinc-100 transition-all"
            >
              Dismiss
            </button>
          </div>
        </div>

        {/* Bottom subtle glow */}
        <div className={cn(
          "absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-200 to-transparent"
        )} />
      </div>
    </div>
  );
}

// Queue-based notification manager
interface QueuedNotification extends NotificationData {
  createdAt: number;
}

export function useNotificationQueue() {
  const [queue, setQueue] = useState<QueuedNotification[]>([]);
  const [current, setCurrent] = useState<QueuedNotification | null>(null);

  const addNotification = (notification: NotificationData) => {
    const queued: QueuedNotification = {
      ...notification,
      id: notification.id || `notif-${Date.now()}`,
      createdAt: Date.now(),
    };

    setQueue(prev => [...prev, queued]);
    
    // If no current notification, show this one
    if (!current) {
      setCurrent(queued);
    }
  };

  const closeCurrent = () => {
    setCurrent(null);
    // Show next notification after a brief delay
    setTimeout(() => {
      setQueue(prev => {
        const next = prev[0] || null;
        if (next) {
          setCurrent(next);
          return prev.slice(1);
        }
        return prev;
      });
    }, 300);
  };

  const clearQueue = () => {
    setQueue([]);
    setCurrent(null);
  };

  return {
    current,
    queueLength: queue.length,
    addNotification,
    closeCurrent,
    clearQueue,
  };
}
