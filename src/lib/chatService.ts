import { 
  db, 
  auth, 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  serverTimestamp 
} from "../firebase";
import { handleFirestoreError, OperationType } from "./firebaseService";

export interface DirectChat {
  id: string;
  participants: string[];
  updatedAt: any;
  lastMessage?: {
    text: string;
    senderId: string;
    timestamp: any;
  };
  unreadCount?: Record<string, number>;
  // Temporary UI helper fields
  recipientName?: string;
  recipientAvatar?: string;
  recipientEmail?: string;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: any;
  read: boolean;
}

// Generate deterministic Chat ID based on participant UIDs
export function getChatId(uid1: string, uid2: string): string {
  if (!uid1 || !uid2) return "";
  return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
}

// Find a registered user by email in "users" collection
export async function findUserByEmail(email: string): Promise<any | null> {
  const path = "users";
  try {
    const q = query(collection(db, path), where("email", "==", email.trim().toLowerCase()));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const firstDoc = snap.docs[0];
    return { uid: firstDoc.id, ...firstDoc.data() };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

// Find a registered user by UID
export async function findUserByUid(uid: string): Promise<any | null> {
  const path = `users/${uid}`;
  try {
    const docRef = doc(db, "users", uid);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return { uid: snap.id, ...snap.data() };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

// Get all system users to search or start a chat
export async function getAllUsers(): Promise<any[]> {
  const path = "users";
  try {
    const snap = await getDocs(collection(db, path));
    const list: any[] = [];
    snap.forEach((d) => {
      list.push({ uid: d.id, ...d.data() });
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

// Get or create a private chat room between two users
export async function getOrCreateChat(uid1: string, uid2: string): Promise<string> {
  const chatId = getChatId(uid1, uid2);
  if (!chatId) return "";
  
  const path = `vsc_chats/${chatId}`;
  try {
    const chatRef = doc(db, "vsc_chats", chatId);
    const chatSnap = await getDoc(chatRef);
    
    if (chatSnap.exists()) {
      return chatId;
    }
    
    // Create new conversation
    const newChat: DirectChat = {
      id: chatId,
      participants: [uid1, uid2],
      updatedAt: serverTimestamp(),
      unreadCount: {
        [uid1]: 0,
        [uid2]: 0
      }
    };
    
    await setDoc(chatRef, newChat);
    return chatId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

// Send a private message and update the conversation details
export async function sendDirectMessage(chatId: string, senderId: string, recipientId: string, text: string): Promise<void> {
  const pathMsg = `vsc_chats/${chatId}/messages`;
  const pathChat = `vsc_chats/${chatId}`;
  try {
    const timestamp = serverTimestamp();
    
    // Add message
    const messagesColl = collection(db, "vsc_chats", chatId, "messages");
    const msgDocRef = doc(messagesColl); // auto-ID
    
    const newMsg: DirectMessage = {
      id: msgDocRef.id,
      senderId,
      text: text.trim(),
      timestamp,
      read: false
    };
    
    await setDoc(msgDocRef, newMsg);
    
    // Read current unreadCount to increment for the recipient
    const chatRef = doc(db, "vsc_chats", chatId);
    const chatSnap = await getDoc(chatRef);
    let currentUnread = 0;
    
    if (chatSnap.exists()) {
      const data = chatSnap.data() as DirectChat;
      currentUnread = data.unreadCount?.[recipientId] || 0;
    }
    
    // Update chat root document
    await updateDoc(chatRef, {
      updatedAt: timestamp,
      lastMessage: {
        text: text.trim(),
        senderId,
        timestamp
      },
      [`unreadCount.${recipientId}`]: currentUnread + 1
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, pathMsg);
    throw error;
  }
}

// Reset unread count for a participant in a chat room
export async function markChatAsRead(chatId: string, uid: string): Promise<void> {
  const path = `vsc_chats/${chatId}`;
  try {
    const chatRef = doc(db, "vsc_chats", chatId);
    await updateDoc(chatRef, {
      [`unreadCount.${uid}`]: 0
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Listen to my chats in real-time
export function listenMyChats(uid: string, onUpdate: (chats: DirectChat[]) => void): () => void {
  const path = "vsc_chats";
  const q = query(
    collection(db, path),
    where("participants", "array-contains", uid)
  );
  
  return onSnapshot(q, async (snapshot) => {
    const rawChats: DirectChat[] = [];
    snapshot.forEach((d) => {
      rawChats.push({ id: d.id, ...d.data() } as DirectChat);
    });
    
    // Sort locally because compound query requires extra index
    rawChats.sort((a, b) => {
      const tA = a.updatedAt?.seconds || 0;
      const tB = b.updatedAt?.seconds || 0;
      return tB - tA;
    });
    
    onUpdate(rawChats);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
}

// Listen to messages of a chat room in real-time
export function listenMessages(chatId: string, limitCount: number, onUpdate: (messages: DirectMessage[]) => void): () => void {
  const path = `vsc_chats/${chatId}/messages`;
  const q = query(
    collection(db, "vsc_chats", chatId, "messages"),
    orderBy("timestamp", "asc")
  );
  
  return onSnapshot(q, (snapshot) => {
    const list: DirectMessage[] = [];
    snapshot.forEach((d) => {
      list.push({ id: d.id, ...d.data() } as DirectMessage);
    });
    // Support basic limit on client-side if needed, but Firebase keeps messages lightweight
    onUpdate(list.slice(-limitCount));
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
}
