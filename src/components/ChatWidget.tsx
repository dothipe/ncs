import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  MessageSquare, 
  Send, 
  Pin, 
  Smile, 
  Trash2, 
  Reply, 
  ChevronDown, 
  ChevronUp, 
  Flame, 
  Trophy, 
  Target, 
  ThumbsUp, 
  Sparkles, 
  ShieldCheck, 
  Lock, 
  User, 
  Maximize2, 
  Minimize2,
  ExternalLink,
  Volume2,
  VolumeX,
  Radio,
  Share2
} from "lucide-react";
import { ChatMessage, Athlete } from "../types";
import { 
  subscribeChatMessages, 
  sendChatMessage, 
  togglePinChatMessage, 
  toggleMessageReaction, 
  deleteChatMessage,
  subscribeToVscSystemAthletes,
  subscribeToTournamentsList
} from "../lib/firebaseService";
import { AthleteProfileModal } from "./AthleteProfileModal";

interface ChatWidgetProps {
  roomId: string;
  roomType: "tournament_live" | "pk_lobby" | "pk_match";
  title?: string;
  subtitle?: string;
  currentUser?: any;
  language: "en" | "vi";
  onOpenAuthModal?: () => void;
  isBtcOrAdmin?: boolean;
  isReferee?: boolean;
  challengerUid?: string;
  opponentUid?: string;
  defaultExpanded?: boolean;
  maxHeight?: string;
  systemClubs?: any[];
  systemAthletes?: any[];
  onViewAthleteProfile?: (name: string, email?: string, uid?: string) => void;
  className?: string;
}

const COMMON_EMOJIS = ["🔥", "🎯", "👍", "👏", "🏆", "❤️", "🤩", "⚡"];

const QUICK_CHIPS = {
  tournament_live: [
    "🏆 Chúc giải đấu thành công tốt đẹp!",
    "🎯 Chúc các VĐV bắn tốt!",
    "🔥 Các xạ thủ thi đấu xuất sắc quá!",
    "📢 BTC cập nhật tiến độ liên tục nhé!",
    "💪 CLB cố lên!",
    "👏 Pha bắn đỉnh cao!"
  ],
  pk_lobby: [
    "🎯 Có ai nhận kèo 10m solo không?",
    "🔥 Tìm đối thủ solo 1v1 giao lưu!",
    "⚔️ Kèo chạm 15 viên bia mục tiêu nào!",
    "🤝 Chúc anh em thi đấu vui vẻ!",
    "💪 Sẵn sàng nhận mọi kèo đấu!",
    "📍 Đang online chờ đối thủ!"
  ],
  pk_match: [
    "📹 Link livestream trận đấu đã sẵn sàng!",
    "⏱️ Hai cơ thủ chuẩn bị vào trận!",
    "🎯 Chúc 2 bên thi đấu fair-play!",
    "🔥 Trận đấu quá kịch tính!",
    "👏 Bắn chuẩn xác quá!",
    "🤝 Tâm phục khẩu phục!"
  ]
};

export const ChatWidget: React.FC<ChatWidgetProps> = ({
  roomId,
  roomType,
  title,
  subtitle,
  currentUser,
  language,
  onOpenAuthModal,
  isBtcOrAdmin = false,
  isReferee = false,
  challengerUid,
  opponentUid,
  defaultExpanded = true,
  maxHeight = "400px",
  systemClubs = [],
  systemAthletes = [],
  onViewAthleteProfile,
  className = ""
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [showEmojiPickerFor, setShowEmojiPickerFor] = useState<string | null>(null);
  const [hasNewMessagesPill, setHasNewMessagesPill] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const [localSystemAthletes, setLocalSystemAthletes] = useState<Athlete[]>(systemAthletes && systemAthletes.length > 0 ? systemAthletes : []);
  const [localTournaments, setLocalTournaments] = useState<any[]>([]);
  const [selectedProfileAthlete, setSelectedProfileAthlete] = useState<Athlete | null>(null);

  useEffect(() => {
    let unsubAthletes: (() => void) | null = null;
    let unsubTours: (() => void) | null = null;

    if (systemAthletes && systemAthletes.length > 0) {
      setLocalSystemAthletes(systemAthletes);
    } else {
      try {
        unsubAthletes = subscribeToVscSystemAthletes((list) => {
          if (list) setLocalSystemAthletes(list);
        });
      } catch (err) {
        console.warn("Could not subscribe to system athletes inside ChatWidget:", err);
      }
    }

    try {
      unsubTours = subscribeToTournamentsList((list) => {
        if (list) setLocalTournaments(list);
      });
    } catch (err) {
      console.warn("Could not subscribe to tournaments inside ChatWidget:", err);
    }

    return () => {
      if (unsubAthletes) unsubAthletes();
      if (unsubTours) unsubTours();
    };
  }, [systemAthletes]);

  const handleViewProfileInternally = (senderName: string, senderEmail?: string) => {
    let found: Athlete | undefined = undefined;

    // 1. Try matching by email
    if (senderEmail) {
      const cleanEmail = senderEmail.trim().toLowerCase();
      found = localSystemAthletes.find(a => a.email && a.email.trim().toLowerCase() === cleanEmail);
    }

    // 2. Try matching by name
    if (!found && senderName) {
      const cleanName = senderName.trim().toLowerCase();
      found = localSystemAthletes.find(a => a.name && a.name.trim().toLowerCase() === cleanName);
    }

    if (onViewAthleteProfile) {
      onViewAthleteProfile(senderName, senderEmail);
    } else {
      if (found) {
        setSelectedProfileAthlete(found);
      } else {
        setSelectedProfileAthlete({
          id: "TMP-" + Date.now(),
          name: senderName,
          email: senderEmail || "",
          team: "",
          avatarUrl: "",
          status: "Thi đấu",
          scores: {},
          vscPoints: 0,
          gender: "Nam"
        } as Athlete);
      }
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const prevMsgCountRef = useRef(0);

  // Subscribe to real-time chat messages
  useEffect(() => {
    if (!roomId) return;
    
    const unsubscribe = subscribeChatMessages(roomId, (newMsgs) => {
      setMessages(newMsgs);

      // Play soft audio beep or show new message indicator if new message arrived
      if (newMsgs.length > prevMsgCountRef.current && prevMsgCountRef.current > 0) {
        const latestMsg = newMsgs[newMsgs.length - 1];
        if (latestMsg && latestMsg.senderUid !== currentUser?.uid) {
          if (!isAtBottomRef.current) {
            setHasNewMessagesPill(true);
          }
        }
      }
      prevMsgCountRef.current = newMsgs.length;

      // If already at bottom, auto scroll
      if (isAtBottomRef.current) {
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 80);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [roomId, currentUser?.uid]);

  // Handle scroll to check if user is at bottom
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isBottom = scrollHeight - scrollTop - clientHeight < 50;
    isAtBottomRef.current = isBottom;
    if (isBottom) {
      setHasNewMessagesPill(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setHasNewMessagesPill(false);
    isAtBottomRef.current = true;
  };

  // Determine user's role badge
  const getUserBadge = (): string => {
    if (!currentUser) return "";
    const adminEmails = ["vscvietnamslingshot@gmail.com", "nahnatofficial@gmail.com"];
    const isGlobalAdmin = currentUser.email && adminEmails.includes(currentUser.email.toLowerCase());

    if (isGlobalAdmin) return "Admin";
    if (isBtcOrAdmin) return "BTC";
    if (isReferee) return "Trọng tài";
    if (challengerUid && currentUser.uid === challengerUid) return "Chủ kèo";
    if (opponentUid && currentUser.uid === opponentUid) return "Đối thủ";
    return "";
  };

  // Determine user club
  const getUserClub = (): string => {
    if (!currentUser) return "";
    if (currentUser.club) return currentUser.club;
    const matchingAth = systemAthletes.find(
      a => (a.email && a.email.toLowerCase() === currentUser.email?.toLowerCase()) ||
           (a.name && a.name.toLowerCase() === currentUser.displayName?.toLowerCase())
    );
    if (matchingAth?.team) return matchingAth.team;
    return "";
  };

  // Send message handler
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isSending) return;

    if (!currentUser) {
      onOpenAuthModal?.();
      return;
    }

    const textToSend = inputText.trim();
    setInputText("");
    setIsSending(true);

    try {
      const badge = getUserBadge();
      const club = getUserClub();

      await sendChatMessage({
        roomId,
        senderUid: currentUser.uid,
        senderName: currentUser.displayName || currentUser.email?.split("@")[0] || "Xạ thủ VSC",
        senderEmail: currentUser.email || "",
        senderAvatar: currentUser.photoURL || "",
        senderRole: isBtcOrAdmin ? "btc" : isReferee ? "referee" : "user",
        senderBadge: badge,
        senderClub: club,
        content: textToSend,
        replyTo: replyingTo ? {
          id: replyingTo.id,
          senderName: replyingTo.senderName,
          content: replyingTo.content.substring(0, 80),
          senderUid: replyingTo.senderUid
        } : undefined
      });

      setReplyingTo(null);
      setTimeout(scrollToBottom, 60);
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setIsSending(false);
    }
  };

  // Pin message handler
  const handleTogglePin = async (msg: ChatMessage) => {
    if (!currentUser) return;
    try {
      await togglePinChatMessage(msg.roomId || roomId, msg.id, !msg.isPinned, currentUser.displayName || "BTC");
    } catch (err) {
      console.error("Failed to pin/unpin message:", err);
    }
  };

  // Reaction handler
  const handleReaction = async (roomIdParam: string, msgId: string, emoji: string) => {
    if (!currentUser) {
      onOpenAuthModal?.();
      return;
    }
    setShowEmojiPickerFor(null);
    try {
      await toggleMessageReaction(roomIdParam, msgId, emoji, currentUser.uid);
    } catch (err) {
      console.error("Failed to toggle reaction:", err);
    }
  };

  // Delete message handler
  const handleDelete = async (roomIdParam: string, msgId: string) => {
    if (!currentUser) return;
    try {
      await deleteChatMessage(roomIdParam, msgId);
    } catch (err) {
      console.error("Failed to delete message:", err);
    }
  };

  // Auto-link renderer for text
  const renderMessageContent = (content: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = content.split(urlRegex);

    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        const isFacebook = part.includes("facebook.com") || part.includes("fb.watch");
        const isYoutube = part.includes("youtube.com") || part.includes("youtu.be");
        
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline break-all inline-flex items-center gap-1 font-semibold hover:bg-blue-50/80 px-1 py-0.5 rounded transition-colors"
          >
            <span>{isFacebook ? "📹 Link Facebook" : isYoutube ? "📺 Link YouTube" : part}</span>
            <ExternalLink className="w-3 h-3 inline" />
          </a>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  const pinnedMessages = messages.filter(m => m.isPinned);
  const chips = QUICK_CHIPS[roomType] || QUICK_CHIPS.tournament_live;

  const defaultTitles = {
    tournament_live: language === "en" ? "TOURNAMENT LIVE CHAT" : "TRÒ CHUYỆN & THÔNG BÁO GIẢI ĐẤU (LIVE CHAT)",
    pk_lobby: language === "en" ? "PK ARENA LOBBY CHAT" : "SẢNH GIAO LƯU & TÌM KÈO ĐẤU (PK LOBBY CHAT)",
    pk_match: language === "en" ? "MATCH ROOM LIVE CHAT" : "PHÒNG GIAO LƯU & BÌNH LUẬN TRẬN ĐẤU"
  };

  const defaultSubtitles = {
    tournament_live: language === "en" 
      ? "Official tournament live chat: BTC announcements, athlete cheers & club networking" 
      : "Kênh trao đổi chung cho toàn bộ giải đấu - BTC ghim thông báo & VĐV/CLB giao lưu trực tiếp",
    pk_lobby: language === "en" 
      ? "Lobby chat for all online slingers: connect, call out matches, and find worthy challengers" 
      : "Kênh chat chung cho tất cả các VĐV đang online tìm kèo, giao lưu và bắt cặp đấu",
    pk_match: language === "en" 
      ? "Private match stream room: athletes, referee & spectators live discussion" 
      : "Nơi 2 VĐV, Trọng tài và Khán giả trao đổi link livestream, thống nhất thời gian và cổ vũ"
  };

  const displayTitle = title || defaultTitles[roomType];
  const displaySubtitle = subtitle || defaultSubtitles[roomType];

  return (
    <div className={`bg-white rounded-2xl border border-gray-150 shadow-xs overflow-hidden transition-all ${className}`}>
      
      {/* ========================================================= */}
      {/* 🏷️ CHAT HEADER BAR                                         */}
      {/* ========================================================= */}
      <div className={`px-4 sm:px-5 py-3 border-b flex items-center justify-between gap-3 ${
        roomType === "tournament_live" 
          ? "bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-slate-800" 
          : roomType === "pk_lobby"
          ? "bg-gradient-to-r from-rose-900 via-red-950 to-rose-900 text-white border-rose-800"
          : "bg-gradient-to-r from-emerald-900 via-teal-950 to-emerald-900 text-white border-emerald-800"
      }`}>
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="relative shrink-0">
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              {roomType === "tournament_live" ? (
                <Trophy className="w-4 h-4 text-amber-300" />
              ) : roomType === "pk_lobby" ? (
                <Flame className="w-4 h-4 text-rose-300" />
              ) : (
                <Target className="w-4 h-4 text-emerald-300" />
              )}
            </div>
            {/* Live Indicator pulse */}
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider truncate text-white">
                {displayTitle}
              </h3>
              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-white/15 text-white/90">
                {messages.length} {language === "en" ? "msgs" : "tin nhắn"}
              </span>
            </div>
            <p className="text-[10px] text-white/70 truncate">
              {displaySubtitle}
            </p>
          </div>
        </div>

        {/* Action controls on right */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/90 transition-colors cursor-pointer text-xs flex items-center gap-1"
            title={isExpanded ? (language === "en" ? "Collapse Chat" : "Thu gọn") : (language === "en" ? "Expand Chat" : "Mở rộng")}
          >
            {isExpanded ? (
              <>
                <span className="hidden sm:inline text-[10px] font-semibold">{language === "en" ? "Collapse" : "Thu gọn"}</span>
                <ChevronUp className="w-4 h-4" />
              </>
            ) : (
              <>
                <span className="hidden sm:inline text-[10px] font-semibold">{language === "en" ? "Open Live Chat" : "Mở chat"}</span>
                <ChevronDown className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 📌 PINNED ANNOUNCEMENT BAR (IF ANY)                        */}
      {/* ========================================================= */}
      {isExpanded && pinnedMessages.length > 0 && (
        <div className="bg-amber-50/90 border-b border-amber-200 px-4 py-2.5 flex items-start justify-between gap-3 text-xs text-amber-900 shadow-inner">
          <div className="flex items-start gap-2 min-w-0 flex-1">
            <Pin className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 fill-amber-500" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-[11px] uppercase tracking-wider text-amber-950">
                  {language === "en" ? "Pinned Announcement" : "Thông báo đã ghim từ BTC"}
                </span>
                {pinnedMessages[0].pinnedBy && (
                  <span className="text-[10px] text-amber-700 font-semibold">
                    ({pinnedMessages[0].pinnedBy})
                  </span>
                )}
              </div>
              <p className="text-xs font-semibold text-amber-900 mt-0.5 whitespace-pre-wrap line-clamp-3">
                {pinnedMessages[0].content}
              </p>
            </div>
          </div>

          {(isBtcOrAdmin || (currentUser?.email && ["vscvietnamslingshot@gmail.com", "nahnatofficial@gmail.com"].includes(currentUser.email.toLowerCase()))) && (
            <button
              type="button"
              onClick={() => handleTogglePin(pinnedMessages[0])}
              className="text-[10px] font-bold text-amber-700 hover:text-amber-900 bg-amber-200/60 hover:bg-amber-200 px-2 py-1 rounded transition-colors cursor-pointer shrink-0"
            >
              {language === "en" ? "Unpin" : "Gỡ ghim"}
            </button>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 💬 CHAT BODY & MESSAGE LIST                                */}
      {/* ========================================================= */}
      {isExpanded && (
        <div className="flex flex-col bg-slate-50/40 relative">
          
          {/* Scrollable messages box */}
          <div 
            ref={scrollContainerRef}
            onScroll={handleScroll}
            style={{ maxHeight, minHeight: "260px" }}
            className="overflow-y-auto p-4 space-y-3.5 divide-y divide-gray-100/60 scrollbar-thin"
          >
            {messages.length === 0 ? (
              <div className="py-12 text-center text-gray-400 space-y-2">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto text-gray-400">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <p className="text-xs font-semibold text-gray-500">
                  {language === "en" ? "No messages yet." : "Chưa có tin nhắn nào trong phòng chat."}
                </p>
                <p className="text-[11px] text-gray-400 max-w-xs mx-auto">
                  {language === "en" 
                    ? "Be the first to share greetings, discuss tactics, or post live match updates!" 
                    : "Hãy là người đầu tiên gửi lời chào, bình luận hoặc chia sẻ thông tin trận đấu!"}
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = currentUser?.uid === msg.senderUid;
                const adminEmails = ["vscvietnamslingshot@gmail.com", "nahnatofficial@gmail.com"];
                const isSenderAdmin = msg.senderEmail && adminEmails.includes(msg.senderEmail.toLowerCase());
                const canManageMsg = isMe || isBtcOrAdmin || (currentUser?.email && adminEmails.includes(currentUser.email.toLowerCase()));

                // Format timestamp
                const dateObj = new Date(msg.createdAt);
                const timeStr = isNaN(dateObj.getTime()) ? "" : dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                return (
                  <div 
                    key={msg.id}
                    className={`pt-3 first:pt-0 group transition-all ${msg.isPinned ? "bg-amber-50/40 p-2 rounded-xl border border-amber-200/50" : ""}`}
                  >
                    <div className="flex items-start gap-2.5">
                      
                      {/* Avatar */}
                      <div 
                        onClick={() => handleViewProfileInternally(msg.senderName, msg.senderEmail)}
                        className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-gray-200 bg-white flex items-center justify-center cursor-pointer shadow-2xs hover:ring-2 hover:ring-blue-400 transition-all"
                      >
                        {(() => {
                          const senderProfile = localSystemAthletes.find(
                            a => (msg.senderEmail && a.email && a.email.trim().toLowerCase() === msg.senderEmail.trim().toLowerCase()) ||
                                 (a.name && msg.senderName && a.name.trim().toLowerCase() === msg.senderName.trim().toLowerCase())
                          );
                          const effectiveAvatar = senderProfile?.avatarUrl || msg.senderAvatar;
                          return effectiveAvatar ? (
                            <img 
                              src={effectiveAvatar} 
                              alt={msg.senderName} 
                              className="w-full h-full object-cover" 
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className={`w-full h-full flex items-center justify-center font-bold text-xs ${
                              isSenderAdmin ? "bg-rose-600 text-white" :
                              msg.senderRole === "btc" ? "bg-amber-500 text-white" :
                              msg.senderRole === "referee" ? "bg-purple-600 text-white" :
                              "bg-blue-600 text-white"
                            }`}>
                              {msg.senderName.charAt(0).toUpperCase()}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Content Column */}
                      <div className="flex-1 min-w-0">
                        {/* Header info (Name, Badges, Time) */}
                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                          <button
                            type="button"
                            onClick={() => handleViewProfileInternally(msg.senderName, msg.senderEmail)}
                            className="font-bold text-xs text-gray-900 hover:text-blue-600 cursor-pointer transition-colors"
                          >
                            {msg.senderName}
                          </button>

                          {/* Role Badges */}
                          {isSenderAdmin ? (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-rose-100 text-rose-700 border border-rose-200">
                              Admin VSC
                            </span>
                          ) : msg.senderBadge ? (
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase ${
                              msg.senderBadge === "BTC" ? "bg-amber-100 text-amber-800 border border-amber-300" :
                              msg.senderBadge === "Trọng tài" ? "bg-purple-100 text-purple-800 border border-purple-200" :
                              msg.senderBadge === "Chủ kèo" ? "bg-rose-100 text-rose-800 border border-rose-200" :
                              msg.senderBadge === "Đối thủ" ? "bg-indigo-100 text-indigo-800 border border-indigo-200" :
                              "bg-gray-100 text-gray-700 border border-gray-200"
                            }`}>
                              {msg.senderBadge}
                            </span>
                          ) : null}

                          {/* Club Tag */}
                          {msg.senderClub && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 truncate max-w-[120px]">
                              {msg.senderClub}
                            </span>
                          )}

                          {/* Timestamp */}
                          <span className="text-[10px] text-gray-400 ml-auto">
                            {timeStr}
                          </span>
                        </div>

                        {/* Reply reference banner if this message replied to someone */}
                        {msg.replyTo && (
                          <div className="bg-gray-100/80 border-l-2 border-indigo-500 px-2 py-1 rounded text-[11px] text-gray-600 mb-1.5 flex items-center gap-1.5">
                            <Reply className="w-3 h-3 text-indigo-500 shrink-0" />
                            <span className="font-bold text-gray-800">{msg.replyTo.senderName}:</span>
                            <span className="truncate">{msg.replyTo.content}</span>
                          </div>
                        )}

                        {/* Message content bubble */}
                        <div className="text-xs text-gray-800 leading-relaxed break-words whitespace-pre-wrap">
                          {renderMessageContent(msg.content)}
                        </div>

                        {/* Message reactions bar & bottom actions */}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {/* Rendered Reaction Pills */}
                          {msg.reactions && Object.entries(msg.reactions).map(([emoji, uids]) => {
                            const uidList = Array.isArray(uids) ? (uids as string[]) : [];
                            if (uidList.length === 0) return null;
                            const hasReacted = Boolean(currentUser && uidList.includes(currentUser.uid));

                            return (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => handleReaction(msg.roomId || roomId, msg.id, emoji)}
                                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                                  hasReacted 
                                    ? "bg-blue-50 border-blue-300 text-blue-700 shadow-2xs scale-105" 
                                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                                }`}
                              >
                                <span>{emoji}</span>
                                <span>{uidList.length}</span>
                              </button>
                            );
                          })}

                          {/* Action icons on hover */}
                          <div className="flex items-center gap-1 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                            {/* Quick Emoji Reaction button */}
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setShowEmojiPickerFor(showEmojiPickerFor === msg.id ? null : msg.id)}
                                className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                                title={language === "en" ? "React" : "Thả cảm xúc"}
                              >
                                <Smile className="w-3.5 h-3.5" />
                              </button>

                              {/* Emoji Picker Popover */}
                              {showEmojiPickerFor === msg.id && (
                                <div className="absolute z-50 bottom-full left-0 mb-1 bg-white border border-gray-200 rounded-xl shadow-xl p-1.5 flex items-center gap-1 animate-scaleUp">
                                  {COMMON_EMOJIS.map((emoji) => (
                                    <button
                                      key={emoji}
                                      type="button"
                                      onClick={() => handleReaction(msg.roomId || roomId, msg.id, emoji)}
                                      className="p-1 text-base hover:scale-125 transition-transform cursor-pointer"
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Reply button */}
                            <button
                              type="button"
                              onClick={() => {
                                setReplyingTo(msg);
                                const inputElem = document.getElementById(`chat-input-${roomId}`);
                                inputElem?.focus();
                              }}
                              className="p-1 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                              title={language === "en" ? "Reply" : "Trả lời"}
                            >
                              <Reply className="w-3.5 h-3.5" />
                            </button>

                            {/* Pin / Unpin button (BTC & Admins only) */}
                            {(isBtcOrAdmin || (currentUser?.email && adminEmails.includes(currentUser.email.toLowerCase()))) && (
                              <button
                                type="button"
                                onClick={() => handleTogglePin(msg)}
                                className={`p-1 rounded transition-colors cursor-pointer ${
                                  msg.isPinned 
                                    ? "text-amber-600 hover:bg-amber-50" 
                                    : "text-gray-400 hover:text-amber-600 hover:bg-amber-50"
                                }`}
                                title={msg.isPinned ? (language === "en" ? "Unpin" : "Gỡ ghim") : (language === "en" ? "Pin Announcement" : "Ghim thông báo")}
                              >
                                <Pin className={`w-3.5 h-3.5 ${msg.isPinned ? "fill-amber-500" : ""}`} />
                              </button>
                            )}

                            {/* Delete message button */}
                            {canManageMsg && (
                              <button
                                type="button"
                                onClick={() => handleDelete(msg.roomId || roomId, msg.id)}
                                className="p-1 rounded text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title={language === "en" ? "Delete Message" : "Xóa tin nhắn"}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                        </div>
                      </div>

                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* New message floating pill */}
          {hasNewMessagesPill && (
            <button
              type="button"
              onClick={scrollToBottom}
              className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 animate-bounce cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{language === "en" ? "New messages below ↓" : "Có tin nhắn mới ↓"}</span>
            </button>
          )}

          {/* Quick Banter / Cheering Chips */}
          <div className="px-3 py-1.5 bg-white border-t border-gray-100 overflow-x-auto flex items-center gap-1.5 scrollbar-none">
            <span className="text-[10px] font-extrabold uppercase text-gray-400 shrink-0 flex items-center gap-1 pl-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span className="hidden sm:inline">{language === "en" ? "Quick:" : "Mẫu:"}</span>
            </span>
            {chips.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  if (!currentUser) {
                    onOpenAuthModal?.();
                    return;
                  }
                  setInputText(chip);
                  const inputElem = document.getElementById(`chat-input-${roomId}`);
                  inputElem?.focus();
                }}
                className="shrink-0 px-2.5 py-1 rounded-lg bg-gray-50 hover:bg-blue-50 text-gray-600 hover:text-blue-700 border border-gray-200 text-[11px] font-medium transition-colors cursor-pointer"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Replying banner */}
          {replyingTo && (
            <div className="px-4 py-2 bg-indigo-50 border-t border-indigo-100 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 truncate">
                <Reply className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="text-gray-500">{language === "en" ? "Replying to" : "Đang trả lời"} <strong className="text-indigo-900">{replyingTo.senderName}</strong>:</span>
                <span className="text-gray-600 truncate italic">"{replyingTo.content}"</span>
              </div>
              <button
                type="button"
                onClick={() => setReplyingTo(null)}
                className="text-gray-400 hover:text-gray-600 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Bottom input area */}
          <div className="p-3 bg-white border-t border-gray-150">
            {currentUser ? (
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <input
                  id={`chat-input-${roomId}`}
                  type="text"
                  maxLength={1000}
                  placeholder={
                    roomType === "tournament_live" 
                      ? (language === "en" ? "Send a tournament message or announcement..." : "Nhập tin nhắn giao lưu hoặc thông báo giải đấu...")
                      : roomType === "pk_lobby"
                      ? (language === "en" ? "Chat in lobby, call out opponents..." : "Nhập tin nhắn tìm kèo, giao lưu cùng anh em xạ thủ...")
                      : (language === "en" ? "Send a message in this match room..." : "Nhập tin nhắn trao đổi kèo đấu, link live...")
                  }
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="flex-1 px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-800"
                />

                <button
                  type="submit"
                  disabled={!inputText.trim() || isSending}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white p-2 sm:px-4 sm:py-2 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">{language === "en" ? "Send" : "Gửi"}</span>
                </button>
              </form>
            ) : (
              <div className="py-2 px-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Lock className="w-4 h-4 text-gray-400 shrink-0" />
                  <span>{language === "en" ? "Sign in to participate in the live chat" : "Đăng nhập tài khoản để gửi tin nhắn và bình luận trực tiếp"}</span>
                </div>
                <button
                  type="button"
                  onClick={onOpenAuthModal}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  {language === "en" ? "Sign In" : "Đăng nhập ngay"}
                </button>
              </div>
            )}
          </div>

        </div>
      )}

      {selectedProfileAthlete && (
        <AthleteProfileModal
          athlete={selectedProfileAthlete}
          isOpen={true}
          onClose={() => setSelectedProfileAthlete(null)}
          history={[]}
          onlineTournaments={localTournaments}
          currentUser={currentUser}
          isGlobalAdmin={Boolean(isBtcOrAdmin || (currentUser?.email && ["vscvietnamslingshot@gmail.com", "nahnatofficial@gmail.com"].includes(currentUser.email.toLowerCase())))}
          language={language}
        />
      )}

    </div>
  );
};
