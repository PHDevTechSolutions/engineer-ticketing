/**
 * Notification Service
 * Reusable push notification system for all services
 * 
 * SECURITY PROTOCOL:
 * - Notifications are targeted to specific users based on role hierarchy
 * - IT/SUPER ADMIN/LEADER/MANAGER: Receive all relevant notifications
 * - TSM: Receive notifications for own items + subordinate items
 * - TSA/MEMBER: Only receive notifications for their own items
 */

import { collectionGroup, getDocs, query, getFirestore, collection, where, doc, getDoc } from "firebase/firestore";

interface NotificationPayload {
  title: string;
  body: string;
  url?: string;
}

interface NotificationOptions {
  /** Target specific users by their user IDs. If not provided, sends to all admins/IT. */
  targetUserIds?: string[];
  /** The user who triggered the notification (excluded from recipients to avoid self-notification) */
  triggeredBy?: string;
  /** Whether to include all admin users (IT, SUPER ADMIN, LEADER, MANAGER) regardless of relationship */
  includeAdmins?: boolean;
  /** The department this notification relates to (for department-specific filtering) */
  department?: string;
}

/**
 * Get admin users who should receive all notifications
 */
async function getAdminUserIds(db: any): Promise<string[]> {
  const adminIds: string[] = [];
  
  try {
    // Get users collection
    const usersSnap = await getDocs(collection(db, "users"));
    
    usersSnap.forEach((userDoc: any) => {
      const userData = userDoc.data();
      const role = (userData.Role || userData.role || "").toUpperCase();
      const dept = (userData.Department || userData.department || "").toUpperCase();
      
      // IT, SUPER ADMIN, LEADER, MANAGER get global notifications
      if (dept === "IT" || ["SUPER ADMIN", "LEADER", "MANAGER"].includes(role)) {
        adminIds.push(userDoc.id);
      }
    });
  } catch (error) {
    console.error("Error fetching admin users:", error);
  }
  
  return adminIds;
}

/**
 * Get TSM's subordinate user IDs
 */
async function getSubordinateIds(db: any, tsmUserId: string): Promise<string[]> {
  const subordinateIds: string[] = [];
  
  try {
    const tsmDoc = await getDoc(doc(db, "users", tsmUserId));
    if (!tsmDoc.exists()) return [];
    
    const tsmData = tsmDoc.data();
    const tsmName = `${tsmData.Firstname || ""} ${tsmData.Lastname || ""}`.trim();
    const tsmRefId = (tsmData.ReferenceID || "").toUpperCase();
    
    // Fetch all users to find subordinates
    const usersSnap = await getDocs(collection(db, "users"));
    
    const clean = (n: string) => (n || "").replace(/,/g, "").replace(/\s+/g, " ").trim().toUpperCase();
    const myCleanName = clean(tsmName);
    
    usersSnap.forEach((userDoc: any) => {
      const userData = userDoc.data();
      const uTSM = clean(userData.TSM);
      const uTSMName = clean(userData.TSMName);
      const uTSM_low = clean(userData.tsm);
      const uTSMName_low = clean(userData.tsmName);
      const uMan = clean(userData.Manager);
      const uManName = clean(userData.ManagerName);
      
      // Check if this user is a subordinate
      const isSubordinate = 
        uTSM === myCleanName || uTSM === tsmRefId || 
        uTSMName === myCleanName || uTSM_low === myCleanName ||
        uTSM_low === tsmRefId || uTSMName_low === myCleanName ||
        uMan === myCleanName || uMan === tsmRefId ||
        uManName === myCleanName;
      
      if (isSubordinate && userDoc.id !== tsmUserId) {
        subordinateIds.push(userDoc.id);
      }
    });
  } catch (error) {
    console.error("Error fetching subordinates:", error);
  }
  
  return subordinateIds;
}

/**
 * Send push notification to targeted users' devices
 * 
 * SECURITY: Only sends to devices belonging to the specified target users.
 * If no targets specified, defaults to admin users only.
 */
export async function sendPushNotification(
  payload: NotificationPayload,
  options: NotificationOptions = {}
): Promise<{
  success: boolean;
  successCount?: number;
  failureCount?: number;
  message: string;
}> {
  try {
    const db = getFirestore();
    
    // Build list of target user IDs
    let targetUserIds: string[] = options.targetUserIds || [];
    
    // If includeAdmins is true (or not specified), add admin users
    if (options.includeAdmins !== false) {
      const adminIds = await getAdminUserIds(db);
      // Add admins that aren't already in the target list
      adminIds.forEach(id => {
        if (!targetUserIds.includes(id)) {
          targetUserIds.push(id);
        }
      });
    }
    
    // Remove the triggering user to avoid self-notification
    if (options.triggeredBy) {
      targetUserIds = targetUserIds.filter(id => id !== options.triggeredBy);
    }
    
    if (targetUserIds.length === 0) {
      return { success: true, successCount: 0, failureCount: 0, message: "No target users" };
    }
    
    // Get devices only for target users
    const deviceTokens = new Map<string, { token: string; lastSync: any }>();
    
    for (const userId of targetUserIds) {
      const devicesCol = collection(db, "users", userId, "devices");
      const devicesSnap = await getDocs(devicesCol);
      
      devicesSnap.forEach((d) => {
        const deviceData = d.data();
        const deviceId = deviceData.deviceId || d.id;
        
        if (deviceData.fcmToken && deviceData.notificationsEnabled !== false) {
          const existing = deviceTokens.get(deviceId);
          const currentSync = deviceData.lastPushSync?.toDate?.() || new Date(0);
          
          if (!existing || currentSync > existing.lastSync) {
            deviceTokens.set(deviceId, { 
              token: deviceData.fcmToken, 
              lastSync: currentSync 
            });
          }
        }
      });
    }

    const uniqueTokens = Array.from(deviceTokens.values()).map(v => v.token);

    if (uniqueTokens.length === 0) {
      return { success: true, successCount: 0, failureCount: 0, message: "No tokens found for target users" };
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
        ? `Sent to ${pushData.successCount} devices (${targetUserIds.length} users)` 
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
 * Send notification to a user's manager/TSM hierarchy
 */
export async function sendNotificationToHierarchy(
  payload: NotificationPayload,
  submittedByUserId: string,
  options: { triggeredBy?: string; includeSubmitter?: boolean } = {}
): Promise<{ success: boolean; message: string }> {
  try {
    const db = getFirestore();
    
    // Get the submitter's info
    const submitterDoc = await getDoc(doc(db, "users", submittedByUserId));
    if (!submitterDoc.exists()) {
      return { success: false, message: "Submitter not found" };
    }
    
    const submitterData = submitterDoc.data();
    const submitterRole = (submitterData.Role || submitterData.role || "MEMBER").toUpperCase();
    
    // Build target list
    const targetUserIds: string[] = [];
    
    // Always include admins
    const adminIds = await getAdminUserIds(db);
    targetUserIds.push(...adminIds);
    
    // For TSA/MEMBER, also notify their TSM and Manager
    if (submitterRole === "MEMBER" || submitterRole === "TSA") {
      const clean = (n: string) => (n || "").replace(/,/g, "").replace(/\s+/g, " ").trim().toUpperCase();
      const submitterName = clean(`${submitterData.Firstname || ""} ${submitterData.Lastname || ""}`);
      const submitterRefId = clean(submitterData.ReferenceID || "");
      
      // Find TSM/Manager based on TSM fields
      const usersSnap = await getDocs(collection(db, "users"));
      
      usersSnap.forEach((userDoc: any) => {
        const userData = userDoc.data();
        const userRole = (userData.Role || userData.role || "").toUpperCase();
        
        // Check if this user is the submitter's TSM
        if (userRole === "TSM") {
          const tsmName = clean(`${userData.Firstname || ""} ${userData.Lastname || ""}`);
          const tsmRefId = clean(userData.ReferenceID || "");
          
          // Check if submitter references this TSM
          const uTSM = clean(userData.TSM);
          const uTSMName = clean(userData.TSMName);
          
          // Reverse check: if this TSM's name matches the submitter's TSM field
          const submitterTSM = clean(submitterData.TSM);
          const submitterTSMName = clean(submitterData.TSMName);
          
          if (submitterTSM === tsmName || submitterTSM === tsmRefId ||
              submitterTSMName === tsmName || submitterTSMName === tsmRefId) {
            if (!targetUserIds.includes(userDoc.id)) {
              targetUserIds.push(userDoc.id);
            }
          }
        }
        
        // Check if this user is the submitter's Manager
        if (userRole === "MANAGER") {
          const managerName = clean(`${userData.Firstname || ""} ${userData.Lastname || ""}`);
          const managerRefId = clean(userData.ReferenceID || "");
          
          const submitterManager = clean(submitterData.Manager);
          const submitterManagerName = clean(submitterData.ManagerName);
          
          if (submitterManager === managerName || submitterManager === managerRefId ||
              submitterManagerName === managerName || submitterManagerName === managerRefId) {
            if (!targetUserIds.includes(userDoc.id)) {
              targetUserIds.push(userDoc.id);
            }
          }
        }
      });
    }
    
    // Include submitter if requested (for updates about their own items)
    if (options.includeSubmitter && !targetUserIds.includes(submittedByUserId)) {
      targetUserIds.push(submittedByUserId);
    }
    
    // Send to targets (excluding the triggering user)
    const result = await sendPushNotification(payload, {
      targetUserIds,
      triggeredBy: options.triggeredBy,
      includeAdmins: false, // Already included above
    });
    
    return { success: result.success, message: result.message };
  } catch (error: any) {
    console.error("Hierarchy notification error:", error);
    return { success: false, message: error.message };
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
