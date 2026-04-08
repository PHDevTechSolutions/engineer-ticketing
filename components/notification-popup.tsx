"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Bell, X, Clock, ExternalLink, Check, 
  Calendar, FileText, AlertTriangle, 
  MessageSquare, Wrench, Package, Eye,
  LucideIcon
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

const TYPE_CONFIG = {
  default: {
    icon: Bell,
    bg: "bg-white",
    accent: "border-l-4 border-indigo-500",
    iconBg: "bg-indigo-100",
    iconColor: "text-indigo-600",
  },
  success: {
    icon: Check,
    bg: "bg-white",
    accent: "border-l-4 border-emerald-500",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
  },
  warning: {
    icon: AlertTriangle,
    bg: "bg-white",
    accent: "border-l-4 border-amber-500",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
  },
  error: {
    icon: AlertTriangle,
    bg: "bg-white",
    accent: "border-l-4 border-red-500",
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
  },
  info: {
    icon: FileText,
    bg: "bg-white",
    accent: "border-l-4 border-blue-500",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  urgent: {
    icon: AlertTriangle,
    bg: "bg-white",
    accent: "border-l-4 border-red-600",
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
  },
};

const PRIORITY_BADGES = {
  low: { text: "LOW", color: "bg-slate-100 text-slate-600" },
  normal: { text: "NORMAL", color: "bg-blue-100 text-blue-600" },
  high: { text: "HIGH", color: "bg-amber-100 text-amber-600" },
  urgent: { text: "URGENT", color: "bg-red-100 text-red-600 animate-pulse" },
};

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
  const config = TYPE_CONFIG[type];
  const Icon = notification.icon || config.icon;
  const priority = notification.priority || "normal";
  const priorityBadge = PRIORITY_BADGES[priority];

  return (
    <div 
      className="fixed top-4 right-4 z-[120] max-w-[380px] w-full animate-in slide-in-from-right-full duration-300"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className={cn(
        "relative rounded-2xl shadow-2xl overflow-hidden",
        config.bg,
        config.accent
      )}>
        {/* Progress bar */}
        {autoClose && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-zinc-100">
            <div 
              className={cn(
                "h-full transition-all duration-100",
                type === "urgent" ? "bg-red-500" : 
                type === "warning" ? "bg-amber-500" :
                type === "success" ? "bg-emerald-500" : "bg-indigo-500"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        <div className="p-4 pt-5">
          {/* Header */}
          <div className="flex items-start gap-3 mb-3">
            <div className={cn(
              "size-12 rounded-xl flex items-center justify-center flex-shrink-0",
              config.iconBg
            )}>
              <Icon size={22} className={config.iconColor} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-black text-sm text-zinc-900 leading-tight truncate">
                  {notification.title}
                </h4>
                {notification.priority && (
                  <span className={cn(
                    "text-[8px] font-black px-1.5 py-0.5 rounded-full",
                    priorityBadge.color
                  )}>
                    {priorityBadge.text}
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-400">
                <Clock size={10} />
                <span>Just now</span>
                {notification.senderName && (
                  <>
                    <span className="mx-1">•</span>
                    <span>from {notification.senderName}</span>
                  </>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 hover:bg-zinc-100 rounded-lg transition-colors flex-shrink-0"
            >
              <X size={16} className="text-zinc-400" />
            </button>
          </div>

          {/* Body */}
          <p className="text-sm font-medium text-zinc-600 leading-relaxed mb-4 line-clamp-3">
            {notification.body}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {notification.url ? (
              <button
                onClick={handleAction}
                className={cn(
                  "flex-1 py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-widest",
                  "flex items-center justify-center gap-2 transition-all",
                  "bg-zinc-900 text-white hover:bg-zinc-800 active:scale-[0.98]"
                )}
              >
                <Eye size={14} />
                View Details
              </button>
            ) : (
              <button
                onClick={handleMarkAsRead}
                className={cn(
                  "flex-1 py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-widest",
                  "flex items-center justify-center gap-2 transition-all",
                  "bg-emerald-500 text-white hover:bg-emerald-600 active:scale-[0.98]"
                )}
              >
                <Check size={14} />
                Mark as Read
              </button>
            )}

            <button
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-widest text-zinc-500 hover:bg-zinc-100 transition-all"
            >
              Dismiss
            </button>
          </div>
        </div>

        {/* Subtle pattern overlay */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-[0.02]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
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
