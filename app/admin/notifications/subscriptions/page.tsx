"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Bell, Smartphone, Laptop, Tablet, Monitor,
  Trash2, RefreshCw, Search, Shield, User,
  ArrowLeft, ExternalLink, Mail, Clock, AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/firebase";
import { 
  collectionGroup, getDocs, query, orderBy, 
  deleteDoc, doc, collection, getDoc 
} from "firebase/firestore";

interface DeviceSubscription {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  platform: string;
  userAgent: string;
  deviceId: string;
  fcmToken: string;
  lastPushSync: any;
  notificationsEnabled: boolean;
  lastSyncDate: Date | null;
}

export default function SubscriptionManagementPage() {
  const router = useRouter();
  const [subscriptions, setSubscriptions] = useState<DeviceSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isIT, setIsIT] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    const dept = localStorage.getItem("department");
    const admin = dept === "IT" || role === "admin";
    setIsIT(admin);

    if (!admin) {
      toast.error("Access denied. Admin only.");
      router.push("/dashboard");
      return;
    }

    fetchAllSubscriptions();
  }, []);

  const fetchAllSubscriptions = async () => {
    setLoading(true);
    try {
      const devicesQuery = query(collectionGroup(db, "devices"), orderBy("lastPushSync", "desc"));
      const snap = await getDocs(devicesQuery);
      
      const subs: DeviceSubscription[] = [];
      
      // Fetch user names for each device
      const userCache = new Map<string, { name: string; email: string }>();

      for (const d of snap.docs) {
        const data = d.data();
        const pathParts = d.ref.path.split("/");
        const userId = pathParts[1]; // users/{userId}/devices/{deviceId}
        
        let userInfo = userCache.get(userId);
        if (!userInfo) {
          const userDoc = await getDoc(doc(db, "users", userId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            userInfo = { 
              name: userData.Firstname || userData.userName || "Unknown", 
              email: userData.Email || "No Email" 
            };
            userCache.set(userId, userInfo);
          } else {
            userInfo = { name: "Deleted User", email: "N/A" };
          }
        }

        subs.push({
          id: d.id,
          userId,
          userName: userInfo.name,
          userEmail: userInfo.email,
          platform: data.platform || "Unknown",
          userAgent: data.userAgent || "Unknown",
          deviceId: data.deviceId || d.id,
          fcmToken: data.fcmToken,
          lastPushSync: data.lastPushSync,
          notificationsEnabled: data.notificationsEnabled !== false,
          lastSyncDate: data.lastPushSync?.toDate?.() || null,
        } as DeviceSubscription);
      }
      
      setSubscriptions(subs);
    } catch (err) {
      console.error("Fetch all subscriptions error:", err);
      toast.error("Failed to load subscriptions");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSubscription = async (sub: DeviceSubscription) => {
    if (!confirm(`Remove subscription for ${sub.userName} on ${sub.platform}?`)) return;

    try {
      await deleteDoc(doc(db, "users", sub.userId, "devices", sub.id));
      setSubscriptions(prev => prev.filter(s => s.id !== sub.id));
      toast.success("Subscription removed");
    } catch (err) {
      toast.error("Failed to remove subscription");
    }
  };

  const filteredSubs = subscriptions.filter(s => 
    s.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.platform?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.deviceId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isIT) return null;

  return (
    <div className="min-h-screen bg-[#F4F7F7] font-sans pb-10">
      <PageHeader
        title="PUSH SUBSCRIPTIONS"
        version="V1.0"
        showBackButton={true}
      />

      <main className="p-4 md:p-8 max-w-6xl mx-auto w-full space-y-6">
        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-white rounded-3xl border border-zinc-200/60 shadow-sm overflow-hidden">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="size-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Bell size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total Subscriptions</p>
                <p className="text-2xl font-black text-zinc-900">{subscriptions.length}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white rounded-3xl border border-zinc-200/60 shadow-sm overflow-hidden">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="size-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <User size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Unique Users</p>
                <p className="text-2xl font-black text-zinc-900">
                  {new Set(subscriptions.map(s => s.userId)).size}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white rounded-3xl border border-zinc-200/60 shadow-sm overflow-hidden">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="size-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
                <Smartphone size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Active Devices</p>
                <p className="text-2xl font-black text-zinc-900">
                  {subscriptions.filter(s => s.notificationsEnabled).length}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search & Actions */}
        <Card className="bg-white rounded-3xl border border-zinc-200/60 shadow-sm overflow-hidden">
          <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 size-4" />
              <Input
                placeholder="Search by user, email, or device..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11 rounded-xl border-zinc-200 focus:ring-zinc-900"
              />
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <Button 
                onClick={fetchAllSubscriptions}
                disabled={loading}
                variant="outline"
                className="h-11 rounded-xl font-bold text-xs flex-1 md:flex-none"
              >
                <RefreshCw size={14} className={cn("mr-2", loading && "animate-spin")} />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Subscriptions List */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-zinc-300">
              <RefreshCw size={32} className="text-zinc-200 animate-spin mb-4" />
              <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Loading subscriptions...</p>
            </div>
          ) : filteredSubs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-zinc-300">
              <AlertTriangle size={32} className="text-zinc-200 mb-4" />
              <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest">No subscriptions found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSubs.map((sub) => {
                const isMobile = sub.userAgent?.toLowerCase().includes("mobile");
                const isMac = sub.userAgent?.toLowerCase().includes("mac os");
                
                return (
                  <Card key={sub.id} className="bg-white rounded-3xl border border-zinc-200/60 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                    <CardHeader className="p-5 border-b border-zinc-50 bg-zinc-50/30">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-2xl bg-zinc-900 text-white flex items-center justify-center">
                            <User size={18} />
                          </div>
                          <div>
                            <p className="font-black text-sm text-zinc-900 leading-none">{sub.userName}</p>
                            <p className="text-[10px] text-zinc-500 mt-1 font-medium">{sub.userEmail}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteSubscription(sub)}
                          className="size-8 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-600">
                          {isMobile ? <Smartphone size={14} /> : isMac ? <Laptop size={14} /> : <Monitor size={14} />}
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <p className="text-xs font-bold text-zinc-800 truncate">{sub.platform}</p>
                          <p className="text-[9px] text-zinc-400 font-medium uppercase tracking-wider">Device Platform</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-600">
                          <Clock size={14} />
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <p className="text-xs font-bold text-zinc-800 truncate">
                            {sub.lastSyncDate ? sub.lastSyncDate.toLocaleString() : "Unknown"}
                          </p>
                          <p className="text-[9px] text-zinc-400 font-medium uppercase tracking-wider">Last Sync</p>
                        </div>
                      </div>

                      <div className="pt-2 flex items-center justify-between border-t border-zinc-50">
                        <div className="flex items-center gap-1.5">
                          <div className={cn("size-2 rounded-full", sub.notificationsEnabled ? "bg-emerald-500" : "bg-red-500")} />
                          <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
                            {sub.notificationsEnabled ? "Enabled" : "Disabled"}
                          </span>
                        </div>
                        <p className="text-[9px] font-mono text-zinc-300">
                          ID: {sub.deviceId.substring(0, 8)}...
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
