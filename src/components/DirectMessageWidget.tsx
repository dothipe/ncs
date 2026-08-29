import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  MessageSquare, 
  Send, 
  X, 
  ChevronLeft, 
  Search, 
  User, 
  Loader2, 
  Check, 
  Users,
  BellRing
} from "lucide-react";
import { 
  DirectChat, 
  DirectMessage, 
  listenMyChats, 
  listenMessages, 
  sendDirectMessage, 
  markChatAsRead, 
  findUserByEmail, 
  findUserByUid, 
  getOrCreateChat, 
  getAllUsers 
} from "../lib/chatService";
import { subscribeToVscSystemAthletes } from "../lib/firebaseService";
import { Athlete } from "../types";

interface DirectMessageWidgetProps {
  currentUser: any;
  onOpenAuthModal: () => void;
  language?: "vi" | "en";
}

export const DirectMessageWidget: React.FC<DirectMessageWidgetProps> = ({
  currentUser,
  onOpenAuthModal,
  language = "vi",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isBubbleDismissed, setIsBubbleDismissed] = useState(false);
  const [chats, setChats] = useState<DirectChat[]>([]);
  const [activeChat, setActiveChat] = useState<DirectChat | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  
  // UI views: "list" (chats list), "search" (directory search to start a new chat), "chat" (active chat room)
  const [view, setView] = useState<"list" | "search" | "chat">("list");
  
  // Inputs & loaders
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [userDirectory, setUserDirectory] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [userCache, setUserCache] = useState<Record<string, any>>({});
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Auto scroll ref
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [systemAthletes, setSystemAthletes] = useState<Athlete[]>([]);

  // Load system athletes for ID lookup
  useEffect(() => {
    const unsubscribe = subscribeToVscSystemAthletes((athletes) => {
      setSystemAthletes(athletes || []);
    });
    return () => unsubscribe();
  }, []);

  // Listen to global open messenger event
  useEffect(() => {
    const handleOpenVscMessenger = () => {
      setIsOpen(true);
      setIsBubbleDismissed(false);
    };
    window.addEventListener("open_vsc_messenger", handleOpenVscMessenger);
    return () => window.removeEventListener("open_vsc_messenger", handleOpenVscMessenger);
  }, []);

  // Show bubble again when there is a new unread message in any chat thread
  const prevUnreadRef = useRef(0);
  useEffect(() => {
    const currentUnread = chats.reduce((sum, c) => {
      if (currentUser && c.unreadCount) {
        return sum + (c.unreadCount[currentUser.uid] || 0);
      }
      return sum;
    }, 0);
    if (currentUnread > prevUnreadRef.current) {
      setIsBubbleDismissed(false);
    }
    prevUnreadRef.current = currentUnread;
  }, [chats, currentUser?.uid]);

  // Listen to active conversations when user is logged in
  useEffect(() => {
    if (!currentUser) {
      setChats([]);
      setActiveChat(null);
      setView("list");
      return;
    }

    const unsub = listenMyChats(currentUser.uid, async (updatedChats) => {
      // Resolve recipient names and avatars for each chat thread
      const enrichedChats = await Promise.all(
        updatedChats.map(async (c) => {
          const otherUid = c.participants.find(p => p !== currentUser.uid) || "";
          if (!otherUid) return c;

          // Check cache first
          let details = userCache[otherUid];
          if (!details) {
            details = await findUserByUid(otherUid);
            if (details) {
              setUserCache(prev => ({ ...prev, [otherUid]: details }));
            }
          }

          return {
            ...c,
            recipientName: details?.displayName || details?.email || (language === "en" ? "System User" : "Hội viên VSC"),
            recipientAvatar: details?.photoURL || "",
            recipientEmail: details?.email || "",
          };
        })
      );

      setChats(enrichedChats);

      // If there is an active chat, update its reference to get the latest unreadCount or lastMessage sync
      if (activeChat) {
        const matchingActive = enrichedChats.find(ec => ec.id === activeChat.id);
        if (matchingActive) {
          setActiveChat(matchingActive);
        }
      }
    });

    return () => unsub();
  }, [currentUser?.uid, language]);

  // Load user directory for searching new connections
  useEffect(() => {
    if (view === "search" && currentUser) {
      setIsSearching(true);
      getAllUsers()
        .then((users) => {
          // Filter out current user
          const filtered = users.filter(u => u.uid !== currentUser.uid);
          setUserDirectory(filtered);
        })
        .finally(() => setIsSearching(false));
    }
  }, [view, currentUser?.uid]);

  // Subscribe to messages when an active chat is selected
  useEffect(() => {
    if (!activeChat || !currentUser) {
      setMessages([]);
      return;
    }

    setIsLoadingMessages(true);
    // Read & clear unread counts instantly
    markChatAsRead(activeChat.id, currentUser.uid);

    const unsub = listenMessages(activeChat.id, 50, (newMessages) => {
      setMessages(newMessages);
      setIsLoadingMessages(false);
      // Automatically scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    });

    return () => unsub();
  }, [activeChat?.id, currentUser?.uid]);

  // Intercept global custom event "open_direct_chat" to open chat dynamically from other components
  useEffect(() => {
    const handleOpenDirectChatEvent = async (e: Event) => {
      const customEvent = e as CustomEvent;
      const { email, name } = customEvent.detail || {};
      if (!email) return;

      if (!currentUser) {
        // Prompt login if not authenticated
        setIsOpen(true);
        return;
      }

      setSearchError("");
      setIsSearching(true);
      setIsOpen(true);

      try {
        const foundUser = await findUserByEmail(email);
        if (foundUser) {
          const chatId = await getOrCreateChat(currentUser.uid, foundUser.uid);
          
          const targetChat: DirectChat = {
            id: chatId,
            participants: [currentUser.uid, foundUser.uid],
            updatedAt: null,
            recipientName: foundUser.displayName || foundUser.email || name || "Hội viên VSC",
            recipientAvatar: foundUser.photoURL || "",
            recipientEmail: foundUser.email || "",
          };

          setActiveChat(targetChat);
          setView("chat");
        } else {
          // Athlete has an email but hasn't logged in/created an account on VSC App yet
          alert(
            language === "en" 
              ? `This athlete (${name || email}) has not registered or activated their account on the VSC app yet. You can only direct message active app users.`
              : `Vận động viên này (${name || email}) chưa đăng ký hoặc chưa kích hoạt tài khoản liên kết trên hệ thống. Bạn chỉ có thể nhắn tin cho hội viên đã kích hoạt tài khoản.`
          );
        }
      } catch (err) {
        console.error("Error opening chat from global event:", err);
      } finally {
        setIsSearching(false);
      }
    };

    window.addEventListener("open_direct_chat", handleOpenDirectChatEvent);
    return () => window.removeEventListener("open_direct_chat", handleOpenDirectChatEvent);
  }, [currentUser?.uid, language]);

  // Handle sending a message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeChat || !currentUser) return;

    const textToSend = inputText;
    setInputText(""); // clear immediately for snappy response

    const recipientId = activeChat.participants.find(p => p !== currentUser.uid) || "";
    if (!recipientId) return;

    try {
      await sendDirectMessage(activeChat.id, currentUser.uid, recipientId, textToSend);
    } catch (err) {
      console.error("Failed to send direct message:", err);
    }
  };

  // Start chat session from directory search
  const handleSelectUserFromDirectory = async (user: any) => {
    if (!currentUser) return;
    setIsSearching(true);
    try {
      const chatId = await getOrCreateChat(currentUser.uid, user.uid);
      const targetChat: DirectChat = {
        id: chatId,
        participants: [currentUser.uid, user.uid],
        updatedAt: null,
        recipientName: user.displayName || user.email || "Hội viên VSC",
        recipientAvatar: user.photoURL || "",
        recipientEmail: user.email || "",
      };
      setActiveChat(targetChat);
      setView("chat");
    } catch (err) {
      console.error("Failed to create chat room:", err);
    } finally {
      setIsSearching(false);
    }
  };

  // Calculate total unread chats
  const totalUnread = chats.reduce((sum, c) => {
    if (currentUser && c.unreadCount) {
      return sum + (c.unreadCount[currentUser.uid] || 0);
    }
    return sum;
  }, 0);

  // Filtered users for manual directory search
  const filteredUsers = userDirectory.filter(u => {
    const nameStr = (u.displayName || "").toLowerCase();
    const emailStr = (u.email || "").toLowerCase();
    
    // Find matching system athlete to search by VSC ID
    const matchedAthlete = systemAthletes.find(
      (a) => a.email && a.email.trim().toLowerCase() === u.email?.trim().toLowerCase()
    );
    const athleteIdStr = matchedAthlete ? String(matchedAthlete.id).toLowerCase() : "";

    const query = searchQuery.toLowerCase();
    return (
      nameStr.includes(query) || 
      emailStr.includes(query) || 
      (athleteIdStr && athleteIdStr.includes(query))
    );
  });

  if (isBubbleDismissed && !isOpen) return null;

  return (
    <div className="fixed bottom-20 right-4 sm:bottom-24 sm:right-6 z-[9999]">
      {/* 🔮 Floating Chat Bubble Trigger */}
      <div className="relative group">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-14 h-14 bg-gradient-to-tr from-[#9c0c13] to-rose-600 text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer border border-rose-500/20 relative"
          title={language === "en" ? "VSC Private Messages" : "Trò chuyện riêng Hội viên"}
        >
          <MessageSquare className="w-6 h-6 animate-pulse" />
          {totalUnread > 0 && (
            <span className="absolute -top-1.5 -left-1.5 bg-yellow-400 text-[#9c0c13] text-[10px] font-black rounded-full h-5 min-w-5 px-1 flex items-center justify-center border-2 border-white animate-bounce shadow-sm">
              {totalUnread}
            </span>
          )}
        </button>

        {/* ❌ Tiny close button at 2 o'clock (top-right) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsBubbleDismissed(true);
          }}
          className="absolute -top-1 -right-1 bg-slate-900 hover:bg-rose-600 text-white border-2 border-white rounded-full w-5.5 h-5.5 flex items-center justify-center shadow-md cursor-pointer hover:scale-115 active:scale-90 transition-all z-20"
          title={language === "en" ? "Close bubble" : "Tắt bong bóng chat"}
        >
          <X className="w-3 h-3 font-bold" />
        </button>
      </div>

      {/* 📬 Messaging Slide-out / Pop-up Dialog */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute bottom-16 right-0 w-[92vw] sm:w-[380px] h-[500px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden text-slate-850 dark:text-slate-100"
          >
            {/* Header */}
            <div className="bg-[#9c0c13] text-white p-4 flex items-center justify-between shadow-sm border-b border-red-800">
              <div className="flex items-center gap-2">
                <div className="bg-white/10 p-1.5 rounded-lg border border-white/10">
                  <MessageSquare className="w-4 h-4 text-yellow-300" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-yellow-300">
                    {language === "en" ? "VSC Messenger" : "Hộp Thư Hội Viên"}
                  </h3>
                  <p className="text-[9px] text-red-100">
                    {language === "en" ? "Direct Messages (1v1)" : "Trò chuyện trực tiếp 1v1"}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-full hover:bg-black/10 text-white cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* If NOT Authenticated */}
            {!currentUser ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-slate-50 dark:bg-slate-950/20">
                <BellRing className="w-12 h-12 text-[#9c0c13] mb-4 animate-bounce" />
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">
                  {language === "en" ? "Login Required" : "Yêu Cầu Đăng Nhập"}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed mb-5">
                  {language === "en" 
                    ? "Please register or log in to your VSCS account to message other slingshot athletes." 
                    : "Vui lòng đăng ký hoặc đăng nhập tài khoản để nhắn tin trò chuyện với các vận động viên bắn ná khác."}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onOpenAuthModal();
                    setIsOpen(false);
                  }}
                  className="px-5 py-2.5 bg-[#9c0c13] hover:bg-red-800 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer uppercase"
                >
                  {language === "en" ? "LOGIN NOW" : "ĐĂNG NHẬP NGAY"}
                </button>
              </div>
            ) : (
              /* Active Messaging Panel Content */
              <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950/20 overflow-hidden">
                
                {/* Loader Overlay */}
                {isSearching && (
                  <div className="absolute inset-0 bg-white/70 dark:bg-slate-950/75 z-20 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-[#9c0c13] animate-spin" />
                  </div>
                )}

                {/* VIEW 1: Conversations List */}
                {view === "list" && (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Action Bar */}
                    <div className="p-3 border-b border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setView("search")}
                        className="flex-1 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-left text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-2 cursor-pointer transition-all"
                      >
                        <Search className="w-3.5 h-3.5" />
                        <span>{language === "en" ? "Search / New chat..." : "Tìm kiếm hội viên mới..."}</span>
                      </button>
                    </div>

                    {/* Chats List */}
                    <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
                      {chats.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                          <MessageSquare className="w-10 h-10 text-slate-300 mb-2 animate-pulse" />
                          <span className="text-xs font-bold block mb-1">
                            {language === "en" ? "Inbox is empty" : "Hộp thư chưa có tin nhắn"}
                          </span>
                          <span className="text-[10px] max-w-[240px] leading-relaxed">
                            {language === "en" 
                              ? "Click button below or view an athlete profile sheet to start private chatting!" 
                              : "Hãy nhấp vào nút Tìm kiếm hoặc xem Hồ sơ VĐV bất kỳ để gửi lời mời trò chuyện!"}
                          </span>
                          <button
                            type="button"
                            onClick={() => setView("search")}
                            className="mt-4 px-4 py-2 bg-[#004ca3] hover:bg-[#003b80] text-white text-[10px] font-black rounded-lg uppercase shadow-3xs cursor-pointer"
                          >
                            {language === "en" ? "Find athletes" : "Tìm kiếm VĐV"}
                          </button>
                        </div>
                      ) : (
                        chats.map((chat) => {
                          const hasUnread = chat.unreadCount && (chat.unreadCount[currentUser.uid] || 0) > 0;
                          return (
                            <div
                              key={chat.id}
                              onClick={() => {
                                setActiveChat(chat);
                                setView("chat");
                              }}
                              className={`p-3 bg-white dark:bg-slate-900 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                                hasUnread 
                                  ? "border-rose-300 dark:border-rose-900/60 bg-rose-50/15 font-black shadow-3xs" 
                                  : "border-slate-150 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <div className="relative shrink-0">
                                  {chat.recipientAvatar ? (
                                    <img 
                                      src={chat.recipientAvatar} 
                                      alt={chat.recipientName}
                                      className="w-10 h-10 rounded-full object-cover border border-slate-200"
                                      referrerPolicy="no-referrer"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-full bg-[#9c0c13]/5 text-[#9c0c13] flex items-center justify-center font-bold text-sm border border-[#9c0c13]/10">
                                      {chat.recipientName?.[0]?.toUpperCase() || "V"}
                                    </div>
                                  )}
                                  {hasUnread && (
                                    <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-600 rounded-full border-2 border-white animate-ping" />
                                  )}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate flex items-center justify-between gap-1.5">
                                    <span>{chat.recipientName}</span>
                                    {chat.updatedAt && (
                                      <span className="text-[8px] text-slate-400 font-normal shrink-0">
                                        {new Date(chat.updatedAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    )}
                                  </div>
                                  <p className={`text-[10px] truncate mt-0.5 ${hasUnread ? "text-slate-800 dark:text-slate-100 font-black" : "text-slate-500 dark:text-slate-450"}`}>
                                    {chat.lastMessage 
                                      ? (chat.lastMessage.senderId === currentUser.uid ? `✓ ` : "") + chat.lastMessage.text 
                                      : (language === "en" ? "Chat room created" : "Bắt đầu cuộc trò chuyện...")}
                                  </p>
                                </div>
                              </div>

                              {hasUnread && (
                                <span className="bg-red-600 text-white text-[9px] font-black rounded-full h-4.5 min-w-4.5 px-1 flex items-center justify-center shrink-0">
                                  {chat.unreadCount?.[currentUser.uid]}
                                </span>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* VIEW 2: Search User Directory */}
                {view === "search" && (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Header Action */}
                    <div className="p-3 border-b border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2">
                      <button
                        onClick={() => {
                          setView("list");
                          setSearchQuery("");
                        }}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4 text-slate-500" />
                      </button>
                      <div className="relative flex-1">
                        <input
                          type="text"
                          placeholder={language === "en" ? "Enter name or email..." : "Nhập tên hoặc email VĐV..."}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#9c0c13] focus:bg-white"
                        />
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      </div>
                    </div>

                    {/* Directory list */}
                    <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                      {filteredUsers.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                          <Users className="w-8 h-8 text-slate-300 mb-2" />
                          <span className="text-xs font-bold block mb-1">
                            {language === "en" ? "No members found" : "Không tìm thấy hội viên"}
                          </span>
                          <span className="text-[10px]">
                            {language === "en" ? "Try searching for another keyword" : "Vui lòng nhập từ khóa tìm kiếm khác"}
                          </span>
                        </div>
                      ) : (
                        filteredUsers.map((user) => (
                          <div
                            key={user.uid}
                            onClick={() => handleSelectUserFromDirectory(user)}
                            className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-150 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer flex items-center gap-2.5"
                          >
                            {user.photoURL ? (
                              <img 
                                src={user.photoURL} 
                                alt={user.displayName}
                                className="w-9 h-9 rounded-full object-cover border border-slate-200"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-[#004ca3]/5 text-[#004ca3] flex items-center justify-center font-bold text-xs border border-[#004ca3]/10">
                                {user.displayName?.[0]?.toUpperCase() || "V"}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                                  {user.displayName || (language === "en" ? "System Athlete" : "VĐV Liên kết")}
                                </span>
                                {(() => {
                                  const matchedAthlete = systemAthletes.find(
                                    (a) => a.email && a.email.trim().toLowerCase() === user.email?.trim().toLowerCase()
                                  );
                                  if (matchedAthlete) {
                                    return (
                                      <span className="bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-[9px] font-extrabold px-1.5 py-0.5 rounded border border-blue-100 dark:border-blue-900/50 uppercase tracking-tight shrink-0">
                                        ID: {matchedAthlete.id}
                                      </span>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                              <span className="text-[10px] text-slate-500 dark:text-slate-450 truncate block mt-0.5">
                                {user.email}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* VIEW 3: Active Chat Room */}
                {view === "chat" && activeChat && (
                  <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900">
                    {/* Active chat header */}
                    <div className="px-3 py-2 border-b border-slate-150 dark:border-slate-800 flex items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-950/20 shrink-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <button
                          onClick={() => {
                            setView("list");
                            setActiveChat(null);
                          }}
                          className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                        >
                          <ChevronLeft className="w-4 h-4 text-slate-600" />
                        </button>

                        <div className="flex items-center gap-2 min-w-0">
                          {activeChat.recipientAvatar ? (
                            <img 
                              src={activeChat.recipientAvatar} 
                              alt={activeChat.recipientName}
                              className="w-8 h-8 rounded-full object-cover border border-slate-200"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-[#9c0c13]/5 text-[#9c0c13] flex items-center justify-center font-bold text-xs border border-[#9c0c13]/10">
                              {activeChat.recipientName?.[0]?.toUpperCase() || "V"}
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate block">
                              {activeChat.recipientName}
                            </span>
                            <span className="text-[8px] text-slate-400 truncate block">
                              {activeChat.recipientEmail}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Messages Body */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-slate-50/30 dark:bg-slate-950/10 custom-scrollbar">
                      {isLoadingMessages ? (
                        <div className="h-full flex items-center justify-center">
                          <Loader2 className="w-6 h-6 text-[#9c0c13] animate-spin" />
                        </div>
                      ) : messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                          <MessageSquare className="w-8 h-8 text-slate-300 mb-2" />
                          <span className="text-xs font-bold block mb-1">
                            {language === "en" ? "No messages yet" : "Chưa có cuộc trò chuyện"}
                          </span>
                          <p className="text-[10px] max-w-[220px] leading-relaxed">
                            {language === "en" 
                              ? "Say hello to start the discussion!" 
                              : "Hãy gửi lời chào đầu tiên để bắt đầu cuộc trò chuyện!"}
                          </p>
                        </div>
                      ) : (
                        messages.map((msg) => {
                          const isMe = msg.senderId === currentUser.uid;
                          return (
                            <div
                              key={msg.id}
                              className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                            >
                              <div className="max-w-[80%] flex flex-col">
                                <div
                                  className={`px-3 py-2 text-xs leading-relaxed break-words shadow-3xs ${
                                    isMe
                                      ? "bg-[#9c0c13] text-white rounded-2xl rounded-tr-none"
                                      : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-2xl rounded-tl-none border border-slate-200 dark:border-slate-700/60"
                                  }`}
                                >
                                  {msg.text}
                                </div>
                                {msg.timestamp && (
                                  <span className={`text-[8px] text-slate-400 mt-1 font-medium ${isMe ? "text-right" : "text-left"}`}>
                                    {new Date(msg.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Chat Input Form */}
                    <form 
                      onSubmit={handleSendMessage}
                      className="p-3 border-t border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-2 shrink-0"
                    >
                      <input
                        type="text"
                        placeholder={language === "en" ? "Type a message..." : "Nhập nội dung tin nhắn..."}
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#9c0c13] focus:bg-white"
                      />
                      <button
                        type="submit"
                        disabled={!inputText.trim()}
                        className="w-9 h-9 bg-[#9c0c13] disabled:bg-slate-200 disabled:text-slate-400 hover:bg-red-800 text-white rounded-xl flex items-center justify-center shrink-0 transition-colors cursor-pointer shadow-3xs"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
