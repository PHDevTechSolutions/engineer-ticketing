/**
 * Notification Service
 * Reusable push notification system for all services
 */

import { collectionGroup, getDocs, query, getFirestore } from "firebase/firestore";

interface NotificationPayload {
  title: string;
  body: string;
  url?: string;
}

/**
 * Send push notification to all subscribed devices
 */
export async function sendPushNotification(payload: NotificationPayload): Promise<{
  success: boolean;
  successCount?: number;
  failureCount?: number;
  message: string;
}> {
  try {
    // Get all tokens
    const db = getFirestore();
    const devicesQuery = query(collectionGroup(db, "devices"));
    const devicesSnap = await getDocs(devicesQuery);
    
    const tokens: string[] = [];
    devicesSnap.forEach((d) => {
      const deviceData = d.data();
      if (deviceData.fcmToken && deviceData.notificationsEnabled !== false) {
        tokens.push(deviceData.fcmToken);
      }
    });

    const uniqueTokens = [...new Set(tokens)];

    if (uniqueTokens.length === 0) {
      return { success: true, successCount: 0, failureCount: 0, message: "No tokens found" };
    }

    // Send push notification
    const pushRes = await fetch("/api/send-push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: payload.title,
        body: payload.body,
        tokens: uniqueTokens,
        url: payload.url || "/dashboard",
      }),
    });

    const pushData = await pushRes.json();

    return {
      success: pushData.success,
      successCount: pushData.successCount || 0,
      failureCount: pushData.failureCount || 0,
      message: pushData.success 
        ? `Sent to ${pushData.successCount} devices` 
        : pushData.error || "Failed to send",
    };
  } catch (error: any) {
    console.error("Push notification error:", error);
    return { 
      success: false, 
      successCount: 0, 
      failureCount: 0, 
      message: error.message || "Unknown error" 
    };
  }
}

/**
 * Service-specific notification helpers
 */
export const NotificationTemplates = {
  // Site Visit Appointments
  siteVisit: {
    created: (clientName: string, date: string) => ({
      title: "New Site Visit Scheduled",
      body: `${clientName} scheduled a site visit for ${date}`,
      url: "/appointments/site-visit",
    }),
    updated: (clientName: string) => ({
      title: "Site Visit Updated",
      body: `${clientName} updated their site visit details`,
      url: "/appointments/site-visit",
    }),
  },

  // Job Requests
  jobRequest: {
    created: (companyName: string, projectTitle: string) => ({
      title: "New Job Request",
      body: `${companyName} submitted "${projectTitle}"`,
      url: "/request/job",
    }),
    statusChanged: (projectTitle: string, newStatus: string) => ({
      title: "Job Request Status Update",
      body: `"${projectTitle}" is now ${newStatus}`,
      url: "/request/job",
    }),
  },

  // DIAlux Requests
  dialux: {
    created: (clientName: string, projectName: string) => ({
      title: "New DIAlux Simulation",
      body: `${clientName} requested simulation for "${projectName}"`,
      url: "/request/dialux",
    }),
    completed: (projectName: string) => ({
      title: "DIAlux Simulation Complete",
      body: `"${projectName}" simulation has been completed`,
      url: "/request/dialux",
    }),
  },

  // Shop Drawing Requests
  shopDrawing: {
    created: (projectName: string) => ({
      title: "New Shop Drawing Request",
      body: `New request for "${projectName}" requires review`,
      url: "/request/shop-drawing",
    }),
    statusChanged: (projectName: string, newStatus: string) => ({
      title: "Shop Drawing Update",
      body: `"${projectName}" is now ${newStatus}`,
      url: "/request/shop-drawing",
    }),
  },

  // Testing/Monitoring
  testing: {
    created: (productName: string, targetDate: string) => ({
      title: "New Testing Item",
      body: `"${productName}" scheduled for ${targetDate}`,
      url: "/request/testing",
    }),
    overdue: (productName: string, daysOverdue: number) => ({
      title: "⚠️ Testing Item Overdue",
      body: `"${productName}" is ${daysOverdue} day${daysOverdue > 1 ? "s" : ""} overdue`,
      url: "/request/testing",
    }),
    completed: (productName: string) => ({
      title: "Testing Complete",
      body: `"${productName}" has passed testing`,
      url: "/request/testing",
    }),
  },

  // Other Requests
  otherRequest: {
    created: (title: string, userName: string) => ({
      title: `New Request: ${title}`,
      body: `${userName} just submitted a new entry`,
      url: "/request/other",
    }),
  },

  // SPF Product Requests
  productRequest: {
    created: (productName: string, quantity: number) => ({
      title: "New SPF Product Request",
      body: `Request for ${quantity} unit${quantity > 1 ? "s" : ""} of ${productName}`,
      url: "/request/product",
    }),
    approved: (productName: string) => ({
      title: "SPF Request Approved",
      body: `"${productName}" has been approved`,
      url: "/request/product",
    }),
  },

  // Product Recommendations
  recommendation: {
    created: (productName: string, clientName: string) => ({
      title: "New Product Recommendation",
      body: `${clientName} recommended "${productName}"`,
      url: "/requests/recommendation",
    }),
  },

  // System/Messages
  message: {
    newMessage: (senderName: string) => ({
      title: "New Message",
      body: `${senderName} sent you a message`,
      url: "/messages",
    }),
  },
};

/**
 * Send notification with template
 */
export async function sendNotification(
  template: { title: string; body: string; url?: string }
): Promise<{ success: boolean; message: string }> {
  const result = await sendPushNotification(template);
  return { success: result.success, message: result.message };
}
