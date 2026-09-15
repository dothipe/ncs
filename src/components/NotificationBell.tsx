import React, { useState, useEffect, useRef } from "react";
import { 
  Bell, 
  Check, 
  Trash2, 
  Sword, 
  Users, 
  MessageSquare, 
  Sparkles, 
  Clock,
  X,
  Send
} from "lucide-react";
import { db, collection, query, where, onSnapshot } from "../firebase";
import { 
  VscNotification, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  deleteNotification, 
  clearAllNotifications,
  sendTestNotification
} from "../lib/notificationService";
import { showToast } from "../utils/toast";

interface NotificationBellProps {
  currentUser: any;
  setActiveTab: (tab: any) => void;
  setControlPanelSubTab?: (subTab: string) => void;
  setSettingsSubTab?: (subTab: string) => void;
  language: "vi" | "en";
}

export function NotificationBell({
  currentUser,
  setActiveTab,
  setControlPanelSubTab,
  setSettingsSubTab,
  language
}: NotificationBellProps) {
  const [notifications, setNotifications] = useState<VscNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [readGlobalIds, setReadGlobalIds] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevUnreadCountRef = useRef<number>(0);
  const isFirstLoadRef = useRef<boolean>(true);

  // Initialize readGlobalIds from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("vsc_read_global_notifications");
      if (saved) {
        setReadGlobalIds(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Error reading readGlobalIds from localStorage:", e);
    }
  }, []);

  const isNotificationRead = (notif: VscNotification) => {
    if (notif.recipientUid === "all") {
      return notif.isRead || readGlobalIds.includes(notif.id);
    }
    return notif.isRead;
  };

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!currentUser?.uid) {
      setNotifications([]);
      return;
    }

    // Query on single field filter without orderBy to prevent missing composite index errors
    const q = query(
      collection(db, "vsc_notifications"),
      where("recipientUid", "in", [currentUser.uid, "all"])
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: VscNotification[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          list.push({
            id: doc.id,
            ...data
          } as VscNotification);
        });

        // In-memory robust sort by timestamp descending (newest first)
        list.sort((a, b) => {
          const getTime = (val: any) => {
            if (!val) return 0;
            if (val.toMillis) return val.toMillis();
            if (val.toDate) return val.toDate().getTime();
            if (val.seconds) return val.seconds * 1000;
            const parsed = new Date(val).getTime();
            return isNaN(parsed) ? 0 : parsed;
          };
          return getTime(b.createdAt) - getTime(a.createdAt);
        });

        let currentReadGlobalIds: string[] = [];
        try {
          const saved = localStorage.getItem("vsc_read_global_notifications");
          if (saved) {
            currentReadGlobalIds = JSON.parse(saved);
          }
        } catch (e) {
          console.error(e);
        }

        const isReadCheck = (n: VscNotification) => {
          if (n.recipientUid === "all") {
            return n.isRead || currentReadGlobalIds.includes(n.id);
          }
          return n.isRead;
        };

        const unread = list.filter((n) => !isReadCheck(n)).length;

        // Toast on new unread notification arriving while in app
        if (!isFirstLoadRef.current && unread > prevUnreadCountRef.current) {
          const newest = list.find((n) => !isReadCheck(n));
          if (newest) {
            showToast(`🔔 ${newest.title}`);
          }
        }
        isFirstLoadRef.current = false;
        prevUnreadCountRef.current = unread;

        setNotifications(list);
      },
      (error) => {
        console.error("Error listening to notifications:", error);
      }
    );

    return () => unsubscribe();
  }, [currentUser?.uid]);

  // Click outside listener to close dropdown
  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !isNotificationRead(n)).length;

  const handleNotificationClick = async (notif: VscNotification) => {
    try {
      // 1. Mark as read
      if (!isNotificationRead(notif)) {
        if (notif.recipientUid === "all") {
          const updated = [...readGlobalIds, notif.id];
          setReadGlobalIds(updated);
          localStorage.setItem("vsc_read_global_notifications", JSON.stringify(updated));
        } else {
          await markNotificationAsRead(notif.id);
        }
      }
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
    setIsOpen(false);

    // 2. Parse link and navigate
    if (notif.link) {
      try {
        const params = new URLSearchParams(notif.link);
        const targetTab = params.get("tab") || "control_panel";
        const targetSubtab = params.get("subtab");

        setActiveTab(targetTab);
        if (targetTab === "control_panel" && targetSubtab && setControlPanelSubTab) {
          setControlPanelSubTab(targetSubtab);
        } else if (targetTab === "settings" && targetSubtab && setSettingsSubTab) {
          setSettingsSubTab(targetSubtab);
        }
      } catch (err) {
        console.error("Error navigating from notification link:", err);
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      // 1. Mark non-global as read in Firestore
      const individualUnread = notifications.filter((n) => n.recipientUid !== "all" && !n.isRead);
      if (individualUnread.length > 0) {
        await markAllNotificationsAsRead(currentUser.uid);
      }

      // 2. Mark all global as read in localStorage
      const globalUnreadIds = notifications
        .filter((n) => n.recipientUid === "all" && !readGlobalIds.includes(n.id))
        .map((n) => n.id);
      if (globalUnreadIds.length > 0) {
        const updated = [...readGlobalIds, ...globalUnreadIds];
        setReadGlobalIds(updated);
        localStorage.setItem("vsc_read_global_notifications", JSON.stringify(updated));
      }
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  };

  const handleSendTestNotification = async () => {
    if (!currentUser || isSendingTest) return;
    setIsSendingTest(true);
    try {
      await sendTestNotification(currentUser, language);
      showToast(language === "en" ? "🔔 Test notification sent!" : "🔔 Đã gửi thông báo thử nghiệm!");
    } catch (err) {
      console.error("Error sending test notification:", err);
    } finally {
      setIsSendingTest(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "pk_request":
      case "pk_approved":
      case "pk_declined":
        return (
          <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
            <Sword className="w-4 h-4" />
          </div>
        );
      case "club_join":
        return (
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4" />
          </div>
        );
      case "chat_reply":
        return (
          <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <MessageSquare className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
        );
    }
  };

  const formatTime = (createdAt: any) => {
    if (!createdAt) return language === "en" ? "Just now" : "Vừa xong";
    try {
      const date = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return language === "en" ? "Just now" : "Vừa xong";
      if (diffMins < 60) return language === "en" ? `${diffMins}m ago` : `${diffMins} phút trước`;
      if (diffHours < 24) return language === "en" ? `${diffHours}h ago` : `${diffHours} giờ trước`;
      if (diffDays < 7) return language === "en" ? `${diffDays}d ago` : `${diffDays} ngày trước`;
      
      return date.toLocaleDateString(language === "en" ? "en-US" : "vi-VN", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (e) {
      return language === "en" ? "Recently" : "Gần đây";
    }
  };

  if (!currentUser) return null;

  return (
    <div className="relative font-sans inline-block" ref={containerRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-white/10 text-white cursor-pointer active:scale-95 transition-all flex items-center justify-center w-9 h-9 border-none bg-transparent"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-white" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-yellow-500 text-slate-950 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#002e6e] shadow-md animate-bounce">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown (Facebook style) */}
      {isOpen && (
        <div className="absolute right-0 mt-3.5 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-[999] overflow-hidden flex flex-col text-slate-800 dark:text-slate-101 max-h-[480px]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 shrink-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-1.5">
                🔔 {language === "en" ? "Notifications" : "Thông báo"}
              </h3>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                  {unreadCount} {language === "en" ? "New" : "Mới"}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSendTestNotification}
                disabled={isSendingTest}
                className="text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 px-2 py-1 rounded-md flex items-center gap-1 cursor-pointer border border-amber-200/50 dark:border-amber-800/50 transition-all"
                title={language === "en" ? "Send a test notification" : "Gửi thử 1 thông báo"}
              >
                <Send className="w-3 h-3" />
                <span>{isSendingTest ? "..." : (language === "en" ? "Test Bell" : "Thử chuông")}</span>
              </button>
              <button 
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-full cursor-pointer bg-transparent border-none"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          {notifications.length > 0 && (
            <div className="flex items-center justify-between px-4 py-1.5 bg-slate-100/50 dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold shrink-0">
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer border-none bg-transparent"
              >
                <Check className="w-3.5 h-3.5" />
                {language === "en" ? "Mark all as read" : "Đánh dấu tất cả đã đọc"}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(language === "en" ? "Are you sure you want to clear all notifications?" : "Bạn có chắc chắn muốn xóa toàn bộ thông báo?")) {
                    clearAllNotifications(currentUser.uid);
                  }
                }}
                className="text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer border-none bg-transparent"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {language === "en" ? "Clear all" : "Xóa tất cả"}
              </button>
            </div>
          )}

          {/* Notifications List */}
          <div className="overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 flex-1 max-h-[340px] scrollbar-thin">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mb-3">
                  <Bell className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  {language === "en" ? "You're all caught up!" : "Tuyệt vời! Bạn không có thông báo nào."}
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 max-w-[260px]">
                  {language === "en" ? "PK challenge alerts, club requests, and schedules will appear here." : "Yêu cầu thách đấu PK, đơn duyệt CLB và lịch trình giải đấu sẽ xuất hiện tại đây."}
                </p>
                <button
                  type="button"
                  onClick={handleSendTestNotification}
                  disabled={isSendingTest}
                  className="mt-4 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1.5 shadow-sm transition-all border-none"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSendingTest ? (language === "en" ? "Sending..." : "Đang gửi...") : (language === "en" ? "Send a test notification" : "Gửi thử 1 thông báo")}</span>
                </button>
              </div>
            ) : (
              notifications.map((notif) => {
                const isRead = isNotificationRead(notif);
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`flex gap-3 p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer text-left relative group ${
                      !isRead ? "bg-amber-500/5 hover:bg-amber-500/10" : ""
                    }`}
                  >
                    {/* Unread Indicator Dot */}
                    {!isRead && (
                      <span className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0 shadow-sm animate-pulse" />
                    )}

                    {/* Icon */}
                    {getNotificationIcon(notif.type)}

                    {/* Content */}
                    <div className="flex-1 min-w-0 pr-6">
                      <p className={`text-xs text-slate-900 dark:text-slate-50 leading-normal ${
                        !isRead ? "font-black text-amber-600 dark:text-amber-400" : "font-medium text-slate-600 dark:text-slate-300"
                      }`}>
                        {notif.title}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal mt-1 break-words">
                        {notif.message}
                      </p>
                      <div className="flex items-center gap-1.5 text-[9px] text-slate-400 dark:text-slate-500 mt-2 font-semibold">
                        <Clock className="w-3 h-3" />
                        <span>{formatTime(notif.createdAt)}</span>
                      </div>
                    </div>

                    {/* Individual Actions on Hover */}
                    <div className="flex flex-col gap-1.5 shrink-0 self-center opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                      {!isRead && (
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              if (notif.recipientUid === "all") {
                                const updated = [...readGlobalIds, notif.id];
                                setReadGlobalIds(updated);
                                localStorage.setItem("vsc_read_global_notifications", JSON.stringify(updated));
                              } else {
                                await markNotificationAsRead(notif.id);
                              }
                            } catch (err) {
                              console.error("Error marking notification as read:", err);
                            }
                          }}
                          className="text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded-lg cursor-pointer border-none bg-transparent transition-all"
                          title={language === "en" ? "Mark as read" : "Đánh dấu đã đọc"}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          try {
                            if (notif.recipientUid === "all") {
                              const updated = [...readGlobalIds, notif.id];
                              setReadGlobalIds(updated);
                              localStorage.setItem("vsc_read_global_notifications", JSON.stringify(updated));
                            } else {
                              deleteNotification(notif.id);
                            }
                          } catch (err) {
                            console.error("Error deleting notification:", err);
                          }
                        }}
                        className="text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded-lg cursor-pointer border-none bg-transparent transition-all"
                        title={language === "en" ? "Delete" : "Xóa"}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
            <span className="text-[10px] text-slate-400">
              {notifications.length} {language === "en" ? "notifications" : "thông báo"}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs font-extrabold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer border-none bg-transparent"
            >
              {language === "en" ? "Close" : "Đóng"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

