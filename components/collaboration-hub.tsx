"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { MessageSquare, Send, X, Minus, ChevronDown, Search, ImagePlus, Loader2, Reply, CornerDownRight } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, updateDoc, serverTimestamp, arrayUnion } from "firebase/firestore";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Message {
  text: string;
  senderId: string;
  senderName: string;
  senderImage?: string;
  role: string;
  time: string;
  imageUrl?: string;
  replyTo?: {
    text: string;
    senderName: string;
  } | null;
}

interface CollaborationHubProps {
  requestId: string;
  messages: Message[];
  currentUserId: string;
  userName: string;
  profilePicture?: string;
  userRole: string;
  status: string;
}

export function CollaborationHub({
  requestId,
  messages = [],
  currentUserId,
  userName,
  profilePicture,
  userRole,
  status
}: CollaborationHubProps) {
  const [chatMessage, setChatMessage] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [lastSeenTime, setLastSeenTime] = useState<number>(Date.now());
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  // New states for mobile reply triggering
  const [swipingId, setSwipingId] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const touchStart = useRef<number | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const unreadRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAtBottom = useRef(true);

  // --- Mobile Touch Handlers ---
  const handleTouchStart = (e: React.TouchEvent, index: number, msg: Message) => {
    touchStart.current = e.targetTouches[0].clientX;
    setSwipingId(index);

    // Long press logic
    longPressTimer.current = setTimeout(() => {
      setReplyingTo(msg);
      if (window.navigator.vibrate) window.navigator.vibrate(50);
    }, 600);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart.current !== null) {
      const currentTouch = e.targetTouches[0].clientX;
      const diff = currentTouch - touchStart.current;
      
      if (Math.abs(diff) > 10 && longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }

      // Swipe right movement
      if (diff > 0 && diff < 70) {
        setSwipeOffset(diff);
      }
    }
  };

  const handleTouchEnd = (msg: Message) => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    
    // If swiped far enough, trigger reply
    if (swipeOffset > 45) {
      setReplyingTo(msg);
      if (window.navigator.vibrate) window.navigator.vibrate(10);
    }

    setSwipingId(null);
    setSwipeOffset(0);
    touchStart.current = null;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("That image is too large. Please keep it under 5MB.");
      return;
    }

    setIsUploading(true);
    const loadingToast = toast.loading("Sending image...");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "engiconnect_uploads");

    try {
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/your_cloud_name/image/upload`,
        { method: "POST", body: formData }
      );

      const fileData = await res.json();
      if (fileData.secure_url) {
        await sendChat(fileData.secure_url);
        toast.success("Shared!", { id: loadingToast });
      }
    } catch (err) {
      toast.error("Failed to upload image.", { id: loadingToast });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const filteredMessages = useMemo(() => {
    if (!searchQuery) return messages;
    return messages.filter(m => m.text?.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [messages, searchQuery]);

  const firstUnreadIndex = useMemo(() => {
    return messages.findIndex(msg =>
      msg.senderId !== currentUserId && new Date(msg.time).getTime() > lastSeenTime
    );
  }, [messages, lastSeenTime, currentUserId]);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior });
  };

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const distanceToBottom = scrollHeight - scrollTop - clientHeight;
      isAtBottom.current = distanceToBottom < 100;
      setShowScrollButton(distanceToBottom > 150);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (unreadRef.current) {
          unreadRef.current.scrollIntoView({ block: 'center', behavior: 'auto' });
        } else {
          scrollToBottom("auto");
        }
      }, 150);
    } else {
      setLastSeenTime(Date.now());
    }
  }, [isOpen]);

  const sendChat = async (imageUrl?: string) => {
    if (!chatMessage.trim() && !imageUrl) return;

    try {
      const docRef = doc(db, "shop_drawing_requests", requestId);

      await updateDoc(docRef, {
        messages: arrayUnion({
          text: imageUrl ? "Sent an image" : chatMessage,
          senderId: currentUserId,
          senderName: userName || "Staff Member",
          senderImage: profilePicture || "",
          role: userRole,
          time: new Date().toISOString(),
          imageUrl: imageUrl || null,
          replyTo: replyingTo ? {
            text: replyingTo.imageUrl ? "Image" : replyingTo.text,
            senderName: replyingTo.senderName || "User"
          } : null
        }),
        updatedAt: serverTimestamp()
      });

      setChatMessage("");
      setReplyingTo(null);
      setTimeout(() => scrollToBottom("smooth"), 100);
    } catch (e) {
      toast.error("Message failed to send.");
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button className={cn(
            "h-16 w-16 rounded-full shadow-xl transition-all duration-300 hover:scale-110 border-4 border-white relative flex items-center justify-center text-white outline-none",
            isOpen ? "bg-slate-900 rotate-90" : "bg-blue-600"
          )}>
            {isOpen ? <X size={28} /> : <MessageSquare size={28} />}
            {firstUnreadIndex !== -1 && !isOpen && (
              <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border-2 border-white animate-bounce">
                {messages.length - firstUnreadIndex}
              </span>
            )}
          </button>
        </PopoverTrigger>

        <PopoverContent side="top" align="end" sideOffset={20} className="w-[380px] p-0 border-none shadow-2xl rounded-[24px] overflow-hidden">
          <div className="flex flex-col h-[550px] bg-[#f0f2f5] max-h-[80vh] relative">
            
            {/* Header */}
            <div className="p-4 bg-[#0f172a] text-white shrink-0">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                    <MessageSquare size={16} />
                  </div>
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-widest">engiconnect</h3>
                    <p className="text-[8px] text-slate-400 font-bold uppercase">Team Chat</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white" onClick={() => setIsSearching(!isSearching)}>
                    <Search size={18} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white" onClick={() => setIsOpen(false)}>
                    <Minus size={20} />
                  </Button>
                </div>
              </div>
              {isSearching && (
                <input
                  autoFocus
                  className="w-full bg-white/10 border-none rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none ring-1 ring-white/20 focus:ring-blue-500"
                  placeholder="Search messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              )}
            </div>

            {/* Chat Area */}
            <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 space-y-4 overflow-x-hidden">
              {filteredMessages.map((msg, i) => {
                const isMe = msg.senderId === currentUserId;
                const safeName = msg.senderName || "User";

                return (
                  <div 
                    key={i} 
                    className={cn(
                      "flex gap-2.5 group relative transition-transform duration-150", 
                      isMe ? "flex-row-reverse" : "flex-row"
                    )}
                    style={{ 
                      transform: swipingId === i ? `translateX(${swipeOffset}px)` : 'none' 
                    }}
                    onTouchStart={(e) => handleTouchStart(e, i, msg)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={() => handleTouchEnd(msg)}
                  >
                    {/* Visual cue for swipe reply */}
                    {swipingId === i && swipeOffset > 10 && (
                      <div className="absolute left-[-30px] top-1/2 -translate-y-1/2 text-blue-500 opacity-50">
                        <Reply size={20} />
                      </div>
                    )}

                    <Avatar className="h-8 w-8 shrink-0 self-end border-2 border-white">
                      <AvatarImage src={isMe ? profilePicture : msg.senderImage} className="object-cover" />
                      <AvatarFallback className="bg-blue-600 text-[10px] text-white">
                        {safeName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>

                    <div className={cn("flex flex-col gap-1 max-w-[80%]", isMe ? "items-end" : "items-start")}>
                      {!isMe && <span className="text-[9px] text-slate-500 font-bold uppercase ml-1">{safeName}</span>}
                      
                      <div className={cn(
                        "px-3 py-2 text-[12px] shadow-sm relative",
                        isMe ? "bg-[#d9fdd3] rounded-[15px] rounded-br-none" : "bg-white rounded-[15px] rounded-bl-none"
                      )}>
                        {msg.replyTo && (
                          <div className="mb-2 p-2 bg-black/5 rounded-lg border-l-4 border-blue-500 text-[10px] opacity-70">
                            <p className="font-bold text-blue-600">{msg.replyTo.senderName || "User"}</p>
                            <p className="truncate">{msg.replyTo.text}</p>
                          </div>
                        )}

                        {msg.imageUrl && (
                          <img src={msg.imageUrl} className="rounded-lg mb-2 max-h-60 w-full object-cover cursor-pointer" onClick={() => window.open(msg.imageUrl, '_blank')} />
                        )}
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                        
                        <button 
                          onClick={() => setReplyingTo(msg)}
                          className={cn(
                            "absolute top-0 -right-8 p-1 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-blue-600",
                            isMe && "-left-8 right-auto"
                          )}
                        >
                          <Reply size={16} />
                        </button>

                        <div className="text-[8px] text-slate-400 text-right mt-1 font-medium">
                          {new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-slate-200">
              {replyingTo && (
                <div className="mb-2 p-2 bg-slate-50 rounded-lg flex items-center justify-between border-l-4 border-blue-500 animate-in slide-in-from-bottom-2">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <CornerDownRight size={14} className="text-blue-500" />
                    <div className="text-[10px] truncate">
                      <span className="font-bold">Replying to {replyingTo.senderName || "User"}:</span>
                      <p className="truncate text-slate-500">{replyingTo.imageUrl ? "Image" : replyingTo.text}</p>
                    </div>
                  </div>
                  <button onClick={() => setReplyingTo(null)} className="text-slate-400 hover:text-red-500"><X size={14} /></button>
                </div>
              )}

              {status !== "APPROVED" && status !== "FINALIZED" ? (
                <div className="flex items-center gap-2">
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                  <Button size="icon" variant="ghost" disabled={isUploading} onClick={() => fileInputRef.current?.click()} className="h-10 w-10 text-slate-400 hover:text-blue-600">
                    {isUploading ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
                  </Button>
                  <input 
                    className="flex-1 bg-slate-100 rounded-xl px-4 py-3 text-xs outline-none focus:ring-1 focus:ring-blue-500" 
                    placeholder="Type a message..." 
                    value={chatMessage} 
                    onChange={(e) => setChatMessage(e.target.value)} 
                    onKeyDown={(e) => e.key === 'Enter' && sendChat()}
                  />
                  <Button size="icon" onClick={() => sendChat()} disabled={!chatMessage.trim() && !isUploading} className="bg-blue-600 h-10 w-10 rounded-xl">
                    <Send size={18} />
                  </Button>
                </div>
              ) : (
                <p className="text-[10px] text-center font-bold text-slate-400 uppercase py-2">Ticket Closed</p>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}