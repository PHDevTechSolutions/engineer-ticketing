"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { 
  MessageSquare, Send, X, Minus, Search, ImagePlus, 
  Loader2, Reply, CornerDownRight, ChevronDown, Activity, CheckCircle2 
} from "lucide-react";
import { db } from "@/lib/firebase"; 
import { doc, updateDoc, serverTimestamp, arrayUnion } from "firebase/firestore";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const EngiConnectLogo = () => (
  <div className="flex items-center justify-center size-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg rotate-3">
    <div className="relative flex items-center justify-center size-full">
      <Activity size={18} className="text-white animate-pulse" />
      <div className="absolute inset-0 border-2 border-white/20 rounded-xl scale-90" />
    </div>
  </div>
);

interface Message {
  id: string; 
  text: string;
  senderId: string;
  senderName: string;
  senderImage?: string;
  role: string;
  time: string;
  isResolved?: boolean;
  imageUrl?: string;
  replyTo?: {
    text: string;
    senderName: string;
    senderId?: string;
    originalMsgId?: string; 
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
  const [isSending, setIsSending] = useState(false);
  const [lastSeenTime, setLastSeenTime] = useState<number>(Date.now());
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  // NEW: Track which message is "active" (clicked) on mobile/desktop
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const unreadRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAtBottom = useRef(true);
  const prevMessagesCount = useRef(messages.length);
  const sentSound = useRef<HTMLAudioElement | null>(null);
  const receivedSound = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    sentSound.current = new Audio("https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3");
    receivedSound.current = new Audio("https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3");
    if (sentSound.current) sentSound.current.volume = 0.3;
    if (receivedSound.current) receivedSound.current.volume = 0.3;
  }, []);

  const scrollToMessage = (msgId: string) => {
    const element = document.getElementById(`msg-${msgId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.classList.add("ring-2", "ring-blue-400", "ring-offset-2", "rounded-xl");
      setTimeout(() => {
        element.classList.remove("ring-2", "ring-blue-400", "ring-offset-2", "rounded-xl");
      }, 2000);
    } else {
      toast.error("Message not found in history");
    }
  };

  const unreadCount = useMemo(() => {
    return messages.filter(msg => 
      msg.senderId !== currentUserId && 
      new Date(msg.time).getTime() > lastSeenTime
    ).length;
  }, [messages, lastSeenTime, currentUserId]);

  const firstUnreadIndex = useMemo(() => {
    return messages.findIndex(msg =>
      msg.senderId !== currentUserId && new Date(msg.time).getTime() > lastSeenTime
    );
  }, [messages, lastSeenTime, currentUserId]);

  const filteredMessages = useMemo(() => {
    if (!searchQuery) return messages;
    return messages.filter(m => m.text?.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [messages, searchQuery]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior });
      setLastSeenTime(Date.now());
    }
  }, []);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const distanceToBottom = scrollHeight - scrollTop - clientHeight;
      isAtBottom.current = distanceToBottom < 50;
      setShowScrollButton(distanceToBottom > 100); 
      if (isAtBottom.current && isOpen) setLastSeenTime(Date.now());
    }
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (unreadRef.current) unreadRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' });
        else scrollToBottom("auto");
      }, 200);
    }
  }, [isOpen, scrollToBottom]);

  useEffect(() => {
    if (messages.length > prevMessagesCount.current) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.senderId !== currentUserId && isOpen) {
        receivedSound.current?.play().catch(() => {});
      }
    }
    prevMessagesCount.current = messages.length;
  }, [messages, currentUserId, isOpen]);

  const sendChat = async () => {
    if (!chatMessage.trim() || isSending) return;
    setIsSending(true);
    const content = chatMessage;
    const currentReply = replyingTo;
    setChatMessage(""); 
    setReplyingTo(null);

    try {
      const docRef = doc(db, "shop_drawing_requests", requestId);
      await updateDoc(docRef, {
        messages: arrayUnion({
          id: Math.random().toString(36).substring(2, 11),
          text: content,
          senderId: currentUserId,
          senderName: userName, 
          senderImage: profilePicture || "",
          role: userRole,
          time: new Date().toISOString(),
          isResolved: false,
          replyTo: currentReply ? {
            text: currentReply.text,
            senderName: currentReply.senderName,
            originalMsgId: currentReply.id
          } : null
        }),
        updatedAt: serverTimestamp()
      });
      sentSound.current?.play().catch(() => {});
      setLastSeenTime(Date.now());
      setTimeout(() => scrollToBottom("auto"), 100);
    } catch (e) {
      toast.error("Message failed to send.");
      setChatMessage(content);
    } finally {
      setIsSending(false);
    }
  };

  const toggleResolve = async (msgId: string) => {
    try {
      const docRef = doc(db, "shop_drawing_requests", requestId);
      const updatedMessages = messages.map(m => 
        m.id === msgId ? { ...m, isResolved: !m.isResolved } : m
      );
      await updateDoc(docRef, { messages: updatedMessages });
      toast.success("Status updated");
      setActiveMessageId(null); // Close the menu after action
    } catch (e) {
      toast.error("Failed to update");
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      <Popover open={isOpen} onOpenChange={(val) => {
        setIsOpen(val);
        if (!val) {
          setLastSeenTime(Date.now());
          setActiveMessageId(null);
        }
      }}>
        <PopoverTrigger asChild>
          <button className={cn(
            "h-16 w-16 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 border-4 border-white relative flex items-center justify-center text-white outline-none",
            isOpen ? "bg-slate-900 rotate-90" : "bg-blue-600"
          )}>
            {isOpen ? <X size={28} /> : <MessageSquare size={28} />}
            {unreadCount > 0 && !isOpen && (
              <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border-2 border-white animate-bounce">
                {unreadCount}
              </span>
            )}
          </button>
        </PopoverTrigger>

        <PopoverContent side="top" align="end" sideOffset={20} className="w-[380px] p-0 border-none shadow-2xl rounded-[32px] overflow-hidden max-w-[95vw]">
          <div className="flex flex-col h-[580px] bg-[#f8fafc] max-h-[85vh] relative">
            
            <div className="p-5 bg-slate-900 text-white shrink-0">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-3">
                  <EngiConnectLogo />
                  <div>
                    <h3 className="text-sm font-bold tracking-tight text-white">engiconnect</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="size-1.5 bg-green-400 rounded-full animate-pulse" />
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Online</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-white rounded-full" onClick={() => setIsSearching(!isSearching)}>
                    <Search size={18} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-white rounded-full" onClick={() => setIsOpen(false)}>
                    <Minus size={20} />
                  </Button>
                </div>
              </div>
              {isSearching && (
                <input
                  autoFocus
                  className="w-full bg-white/10 border-none rounded-xl px-4 py-2 text-xs text-white placeholder:text-slate-500 outline-none ring-1 ring-white/20 focus:ring-blue-500"
                  placeholder="Search project history..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              )}
            </div>

            <div 
              ref={scrollRef} 
              onScroll={handleScroll} 
              onClick={() => setActiveMessageId(null)} // Close active menus when clicking background
              className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#f1f5f9]/50 scroll-smooth"
            >
              {filteredMessages.map((msg, i) => {
                const isMe = msg.senderId === currentUserId;
                const isFirstUnread = i === firstUnreadIndex;
                const isActive = activeMessageId === msg.id;

                return (
                  <React.Fragment key={msg.id}>
                    {isFirstUnread && (
                      <div ref={unreadRef} className="flex items-center justify-center my-6">
                        <span className="px-4 py-1 bg-blue-100 text-blue-600 text-[9px] font-black uppercase rounded-full border border-blue-200">
                          New Messages Below
                        </span>
                      </div>
                    )}

                    <div 
                      id={`msg-${msg.id}`} 
                      className={cn("flex gap-3 group relative transition-all duration-300", isMe ? "flex-row-reverse" : "flex-row")}
                    >
                      <Avatar className="h-9 w-9 shrink-0 self-end border-2 border-white shadow-sm">
                        <AvatarImage src={isMe ? profilePicture : msg.senderImage} className="object-cover" />
                        <AvatarFallback className="bg-blue-600 text-[10px] text-white">{(msg.senderName || "U").charAt(0)}</AvatarFallback>
                      </Avatar>

                      <div className={cn("flex flex-col gap-1 max-w-[75%]", isMe ? "items-end" : "items-start")}>
                        {!isMe && <span className="text-[10px] text-slate-500 font-bold ml-1">{msg.senderName}</span>}
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMessageId(isActive ? null : msg.id);
                          }}
                          className={cn(
                            "px-4 py-2.5 text-[13px] shadow-sm relative transition-all duration-300 cursor-pointer touch-manipulation",
                            isMe ? "bg-blue-600 text-white rounded-2xl rounded-br-none" : "bg-white text-slate-800 rounded-2xl rounded-bl-none",
                            msg.isResolved && "opacity-60 grayscale-[0.5]",
                            isActive && "ring-2 ring-blue-400 ring-offset-1"
                          )}
                        >
                          {/* UPDATED: Buttons now visible on click/active OR hover */}
                          <div className={cn(
                            "absolute -top-6 flex items-center gap-2 transition-all z-20",
                            (isActive) ? "opacity-100 scale-100 visible" : "opacity-0 scale-95 invisible group-hover:opacity-100 group-hover:scale-100 group-hover:visible",
                            isMe ? "right-0" : "left-0"
                          )}>
                            <button 
                              onClick={(e) => { e.stopPropagation(); setReplyingTo(msg); setActiveMessageId(null); }} 
                              className="p-2 bg-white shadow-lg rounded-full text-blue-600 border border-slate-100 active:bg-blue-50"
                            >
                              <Reply size={16} />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); toggleResolve(msg.id); }} 
                              className="p-2 bg-white shadow-lg rounded-full text-green-600 border border-slate-100 active:bg-green-50"
                            >
                              <CheckCircle2 size={16} />
                            </button>
                            {/* Close active menu button for mobile */}
                            <button className="md:hidden p-2 bg-white shadow-lg rounded-full text-slate-400 border border-slate-100">
                               <X size={16} />
                            </button>
                          </div>

                          {msg.isResolved && (
                            <div className="flex items-center gap-1 mb-1 text-[9px] font-black uppercase text-green-500 bg-green-50 px-2 py-0.5 rounded-full w-fit">
                              <CheckCircle2 size={10} /> Resolved
                            </div>
                          )}

                          {msg.replyTo && (
                            <div 
                              onClick={(e) => {
                                e.stopPropagation();
                                if (msg.replyTo?.originalMsgId) scrollToMessage(msg.replyTo.originalMsgId);
                              }}
                              className="mb-2 p-2 bg-black/10 rounded-lg text-[10px] opacity-90 border-l-2 border-white/50 cursor-pointer hover:bg-black/20 transition-all"
                            >
                              <p className="font-bold truncate text-inherit opacity-70">{msg.replyTo.senderName}</p>
                              <p className="truncate line-clamp-1 italic text-inherit">"{msg.replyTo.text}"</p>
                            </div>
                          )}
                          
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                          <div className={cn("text-[9px] mt-1 opacity-60 text-right font-medium", isMe ? "text-blue-100" : "text-slate-400")}>
                            {new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>

            {showScrollButton && (
              <button 
                onClick={() => scrollToBottom()}
                className="absolute bottom-28 right-6 h-11 w-11 bg-white border border-slate-200 rounded-full shadow-2xl flex items-center justify-center text-blue-600 hover:scale-110 transition-all z-[60] animate-in fade-in zoom-in"
              >
                <ChevronDown size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border-2 border-white">
                    {unreadCount}
                  </span>
                )}
              </button>
            )}

            <div className="p-4 bg-white border-t border-slate-100 relative shadow-[0_-4px_15px_rgba(0,0,0,0.05)]">
              {replyingTo && (
                <div className="mb-3 p-2 bg-blue-50 rounded-xl flex items-center justify-between border-l-4 border-blue-500 animate-in slide-in-from-bottom-2">
                  <div className="flex items-center gap-2 overflow-hidden text-[11px]">
                    <CornerDownRight size={14} className="text-blue-500 shrink-0" />
                    <div className="truncate">
                      <span className="font-bold text-blue-600">Reply to {replyingTo.senderName}</span>
                      <p className="truncate text-slate-500 italic">"{replyingTo.text}"</p>
                    </div>
                  </div>
                  <button onClick={() => setReplyingTo(null)} className="text-slate-400 hover:text-red-500 p-1"><X size={16} /></button>
                </div>
              )}
              
              {status !== "APPROVED" && status !== "FINALIZED" ? (
                <div className="flex items-center gap-3">
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" />
                  <Button size="icon" variant="ghost" disabled={isSending} onClick={() => fileInputRef.current?.click()} className="h-11 w-11 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-colors">
                    <ImagePlus size={20} />
                  </Button>
                  <input 
                    className="flex-1 bg-slate-100 rounded-2xl px-5 py-3.5 text-sm outline-none border-none focus:ring-2 focus:ring-blue-500/10 transition-all placeholder:text-slate-400" 
                    placeholder={isSending ? "Syncing..." : "Type your message..."} 
                    value={chatMessage} 
                    disabled={isSending}
                    onChange={(e) => setChatMessage(e.target.value)} 
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendChat()}
                  />
                  <Button 
                    size="icon" 
                    onClick={() => sendChat()} 
                    disabled={!chatMessage.trim() || isSending} 
                    className="bg-blue-600 hover:bg-blue-700 h-11 w-11 rounded-2xl shadow-lg transition-all active:scale-95"
                  >
                    {isSending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                  </Button>
                </div>
              ) : (
                <div className="py-2 text-center text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  Project Archive Read Only
                </div>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}