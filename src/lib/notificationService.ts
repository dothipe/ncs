import { 
  db, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  getDocs,
  query,
  where,
  writeBatch
} from "../firebase";

export interface VscNotification {
  id: string;
  recipientUid: string;
  senderUid?: string;
  senderName?: string;
  senderAvatar?: string;
  type: string; // 'pk_request' | 'pk_approved' | 'pk_declined' | 'tournament_schedule' | 'referee_assigned' | 'club_join' | 'chat_reply' | 'system_alert'
  title: string;
  message: string;
  link: string; // e.g., "tab=control_panel&subtab=pk_challenges"
  isRead: boolean;
  createdAt: any;
}

/**
 * Sends a real-time notification to a persistent Firestore collection
 */
export async function sendNotification(
  recipientUid: string,
  type: string,
  title: string,
  message: string,
  link: string = "",
  senderUid?: string,
  senderName?: string,
  senderAvatar?: string
): Promise<void> {
  if (!recipientUid) return;
  try {
    await addDoc(collection(db, "vsc_notifications"), {
      recipientUid,
      type,
      title,
      message,
      link,
      isRead: false,
      senderUid: senderUid || "",
      senderName: senderName || "",
      senderAvatar: senderAvatar || "",
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error sending notification:", error);
  }
}

/**
 * Marks a single notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  if (!notificationId) return;
  try {
    const docRef = doc(db, "vsc_notifications", notificationId);
    await updateDoc(docRef, {
      isRead: true
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
  }
}

/**
 * Marks all notifications as read for a specific user
 */
export async function markAllNotificationsAsRead(recipientUid: string): Promise<void> {
  if (!recipientUid) return;
  try {
    const q = query(
      collection(db, "vsc_notifications"), 
      where("recipientUid", "==", recipientUid),
      where("isRead", "==", false)
    );
    const snap = await getDocs(q);
    
    // Use write batch for atomicity and efficiency
    const batch = writeBatch(db);
    snap.docs.forEach((d) => {
      batch.update(d.ref, { isRead: true });
    });
    await batch.commit();
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
  }
}

/**
 * Deletes a single notification
 */
export async function deleteNotification(notificationId: string): Promise<void> {
  if (!notificationId) return;
  try {
    const docRef = doc(db, "vsc_notifications", notificationId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting notification:", error);
  }
}

/**
 * Clears/Deletes all notifications for a specific user
 */
export async function clearAllNotifications(recipientUid: string): Promise<void> {
  if (!recipientUid) return;
  try {
    const q = query(
      collection(db, "vsc_notifications"), 
      where("recipientUid", "==", recipientUid)
    );
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.docs.forEach((d) => {
      batch.delete(d.ref);
    });
    await batch.commit();
  } catch (error) {
    console.error("Error clearing all notifications:", error);
  }
}
