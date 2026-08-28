import React from "react";
import { motion } from "motion/react";
import { 
  Trophy, 
  Sword, 
  Flame, 
  Clock, 
  MapPin, 
  User, 
  ChevronRight, 
  Lock, 
  Shield, 
  Target, 
  Play, 
  Users,
  Award,
  UserCheck,
  Eye,
  Video,
  Tv
} from "lucide-react";
import { PKChallenge } from "../types";
import { ChatWidget } from "./ChatWidget";

interface PkDashboardHomeProps {
  challenges: PKChallenge[];
  pkLeaderboard: any[];
  setActiveSubTab: (tab: "dashboard" | "lobby" | "leaderboard" | "history") => void;
  setActiveArenaChallenge: (challenge: PKChallenge | null) => void;
  setSelectedDetailChallenge?: (challenge: PKChallenge | null) => void;
  language: "en" | "vi";
  onViewAthleteProfile?: (name: string, email?: string, athleteId?: string) => void;
  currentUser?: any;
  onAcceptChallenge?: (challenge: PKChallenge) => void;
  onOpenAuthModal?: () => void;
  onApproveJoinRequest?: (challenge: PKChallenge, request: any) => void;
  onDeclineJoinRequest?: (challenge: PKChallenge, request: any) => void;
  onCancelJoinRequest?: (challenge: PKChallenge) => void;
  systemClubs?: any[];
  systemAthletes?: any[];
  onViewClubHub?: (club: any) => void;
  onEditChallenge?: (challenge: PKChallenge) => void;
  onDeleteChallenge?: (challengeId: string) => void;
  openUpdateVideoModal?: (challenge: PKChallenge) => void;
  isAdmin?: boolean;
}

export const PkDashboardHome: React.FC<PkDashboardHomeProps> = ({
  challenges,
  pkLeaderboard,
  setActiveSubTab,
  setActiveArenaChallenge,
  setSelectedDetailChallenge,
  language,
  onViewAthleteProfile,
  currentUser,
  onAcceptChallenge,
  onOpenAuthModal,
  onApproveJoinRequest,
  onDeclineJoinRequest,
  onCancelJoinRequest,
  systemClubs = [],
  systemAthletes = [],
  onViewClubHub,
  onEditChallenge,
  onDeleteChallenge,
  openUpdateVideoModal,
  isAdmin = false
}) => {
  const getPlayerClubName = (name: string) => {
    const directClub = systemClubs.find(c => c.name?.trim().toLowerCase() === name.trim().toLowerCase());
    if (directClub) return directClub.name;

    const ath = systemAthletes.find(a => a.name?.trim().toLowerCase() === name.trim().toLowerCase());
    if (ath && ath.clubName) return ath.clubName;

    // Fallback to leaderboard data
    const lbPlayer = pkLeaderboard.find(p => p.name?.trim().toLowerCase() === name.trim().toLowerCase());
    if (lbPlayer && lbPlayer.clubName) return lbPlayer.clubName;

    return null;
  };

  const handleProfileOrClubClick = (name: string, email?: string, uid?: string) => {
    const cleanUid = uid?.trim().toLowerCase();
    const cleanClubUid = cleanUid?.startsWith("club-") ? cleanUid.substring(5) : cleanUid;
    const cleanName = name?.trim().toLowerCase();
    const matchingClub = systemClubs.find(c => 
      (c.id && c.id.trim().toLowerCase() === cleanUid) ||
      (c.id && c.id.trim().toLowerCase() === cleanClubUid) ||
      (c.name && c.name.trim().toLowerCase() === cleanName)
    );
    if (matchingClub && onViewClubHub) {
      onViewClubHub(matchingClub);
    } else {
      onViewAthleteProfile?.(name, email, uid);
    }
  };

  const handleClubClick = (clubName: string) => {
    const cleanName = clubName.trim().toLowerCase();
    const matchingClub = systemClubs.find(c => c.name?.trim().toLowerCase() === cleanName || c.id?.trim().toLowerCase() === cleanName);
    if (matchingClub && onViewClubHub) {
      onViewClubHub(matchingClub);
    }
  };
  // Statistics
  const openChallenges = challenges.filter(c => c.status === "open");
  const liveMatches = challenges.filter(c => c.status === "accepted" || c.status === "ongoing");
  const completedMatches = challenges.filter(c => c.status === "completed");

  const recentCompleted = [...completedMatches]
    .sort((a, b) => (b.dateTime || b.createdAt || "").localeCompare(a.dateTime || a.createdAt || ""))
    .slice(0, 4);

  // Filter out clubs for Home Top 10 to satisfy: "ở Bảng Anh Hùng PK Đỉnh Phong (TOP 10) ở trang chủ: Yêu cầu không xếp hạng CLB"
  const personalLeaderboard = React.useMemo(() => {
    return pkLeaderboard.filter(p => !p.isClub);
  }, [pkLeaderboard]);

  // Get Top 3 players for podium
  const topThree = personalLeaderboard.slice(0, 3);
  // Reorder to [Silver, Gold, Bronze] for physical podium representation
  const podiumPlayers = (() => {
    if (topThree.length === 0) return [];
    if (topThree.length === 1) return [null, topThree[0], null];
    if (topThree.length === 2) return [topThree[1], topThree[0], null];
    return [topThree[1], topThree[0], topThree[2]];
  })();

  const formatDate = (isoString: string) => {
    if (!isoString) return "";
    try {
      let clean = isoString;
      if (clean.includes(" ") && !clean.includes("T")) {
        clean = clean.replace(" ", "T");
      }
      const date = new Date(clean);
      if (isNaN(date.getTime())) {
        return isoString;
      }
      return date.toLocaleDateString(language === "en" ? "en-US" : "vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-8 pb-10">
      {/* 🚀 Statistics Summary Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Open Matches CTA card */}
        <motion.div 
          whileHover={{ y: -2 }}
          onClick={() => setActiveSubTab("lobby")}
          className="bg-gradient-to-br from-rose-50 to-rose-100/40 p-5 rounded-2xl border border-rose-150/50 shadow-xs cursor-pointer flex items-center justify-between group transition-all"
        >
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider block">
              {language === "en" ? "Awaiting Guest Lobby" : "Sảnh Kèo Đang Chờ"}
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-rose-950">{openChallenges.length}</span>
              <span className="text-xs text-rose-700/80 font-semibold">{language === "en" ? "challenges" : "kèo đấu mở"}</span>
            </div>
            <span className="text-[10px] font-semibold text-rose-600 group-hover:text-rose-800 flex items-center gap-0.5 mt-1 transition-colors">
              <span>{language === "en" ? "View Match Lobby" : "Vào Sảnh Ghép Kèo"}</span>
              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-200/50 flex items-center justify-center text-rose-700 font-extrabold group-hover:scale-110 transition-transform">
            <Sword className="w-6 h-6" />
          </div>
        </motion.div>

        {/* Live Arena Matches CTA card */}
        <motion.div 
          whileHover={{ y: -2 }}
          onClick={() => setActiveSubTab("lobby")}
          className="bg-gradient-to-br from-amber-50 to-amber-100/40 p-5 rounded-2xl border border-amber-150/50 shadow-xs cursor-pointer flex items-center justify-between group transition-all"
        >
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
              {language === "en" ? "Live Arena Matches" : "Trận Đấu Đang Diễn Ra"}
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-amber-950">{liveMatches.length}</span>
              <span className="text-xs text-amber-700/80 font-semibold">{language === "en" ? "live" : "trận đang PK"}</span>
            </div>
            <span className="text-[10px] font-semibold text-amber-600 group-hover:text-amber-800 flex items-center gap-0.5 mt-1 transition-colors">
              <span>{language === "en" ? "Spectate Matches" : "Theo Dõi Trực Tiếp"}</span>
              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-200/50 flex items-center justify-center text-amber-700 font-extrabold group-hover:scale-110 transition-transform">
            <Flame className="w-6 h-6 text-amber-600" />
          </div>
        </motion.div>

        {/* Completed History CTA card */}
        <motion.div 
          whileHover={{ y: -2 }}
          onClick={() => setActiveSubTab("history")}
          className="bg-gradient-to-br from-blue-50 to-blue-100/40 p-5 rounded-2xl border border-blue-150/50 shadow-xs cursor-pointer flex items-center justify-between group transition-all"
        >
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider block">
              {language === "en" ? "Arena Glory History" : "Lịch Sử Kết Quả PK"}
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-blue-950">{completedMatches.length}</span>
              <span className="text-xs text-blue-700/80 font-semibold">{language === "en" ? "battles" : "trận hoàn tất"}</span>
            </div>
            <span className="text-[10px] font-semibold text-blue-600 group-hover:text-blue-800 flex items-center gap-0.5 mt-1 transition-colors">
              <span>{language === "en" ? "View Match History" : "Xem Bảng Vàng Vinh Danh"}</span>
              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-200/50 flex items-center justify-center text-blue-700 font-extrabold group-hover:scale-110 transition-transform">
            <Trophy className="w-6 h-6 text-blue-600" />
          </div>
        </motion.div>
      </div>

      {/* 💬 SẢNH CHAT CHUNG (PK LOBBY CHAT) */}
      <ChatWidget
        roomId="pk_lobby"
        roomType="pk_lobby"
        currentUser={currentUser}
        language={language}
        onOpenAuthModal={onOpenAuthModal}
        isBtcOrAdmin={isAdmin}
        systemClubs={systemClubs}
        systemAthletes={systemAthletes}
        onViewAthleteProfile={onViewAthleteProfile}
        defaultExpanded={true}
        className="shadow-sm"
      />

      {/* ⚔️ Section 2: Open Challenges Queue (Kèo Đấu Đang Chờ Tìm Đối Thủ) with full detailed info boxes */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
              <Sword className="w-4 h-4 text-rose-600" />
              <span>{language === "en" ? "Matchmaking Queue" : "Kèo Đấu Đang Chờ Tìm Đối Thủ"}</span>
            </h3>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {language === "en" ? "Open PK challenges looking for worthy challengers in the stadium" : "Danh sách kèo đấu đang chờ ứng tuyển - Bạn có thể xem thông tin và vào nhận kèo ngay"}
            </p>
          </div>
          <button 
            type="button" 
            onClick={() => setActiveSubTab("lobby")}
            className="text-xs font-bold text-rose-600 hover:text-rose-800 transition-colors flex items-center gap-0.5"
          >
            <span>{language === "en" ? "Browse All" : "Xem Tất Cả Sảnh Kèo"}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {openChallenges.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400 text-[11px] font-semibold">
            {language === "en" ? "No challenges currently in lobby." : "Hiện không có kèo đấu mở nào đang tìm đối thủ."}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {openChallenges.slice(0, 10).map((challenge) => {
              const isOwner = Boolean(currentUser?.uid && currentUser.uid === challenge.challengerUid);

              return (
                <div 
                  key={challenge.id} 
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden relative"
                >
                  {/* Card Header Status Indicator */}
                  <div className="px-5 py-3.5 bg-gray-55/40 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-100 animate-pulse">
                        {language === "en" ? "Awaiting Guest" : "Tìm đối thủ 🔍"}
                      </span>
                      {challenge.pin && (
                        <span className="flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-100 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                          <Lock className="w-2.5 h-2.5 text-amber-600" />
                          <span>PIN</span>
                        </span>
                      )}
                    </div>

                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      {challenge.type === "solo_1v1" ? "Solo 1v1" : `${challenge.teamSize}v${challenge.teamSize} Team`}
                    </span>
                  </div>

                  {/* Content Body */}
                  <div className="p-5 flex-1 flex flex-col justify-between gap-5">
                    <div>
                      <h3 className="text-base font-bold text-gray-900 line-clamp-1 mb-1">
                        {challenge.title}
                      </h3>
                      {challenge.description && (
                        <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                          {challenge.description}
                        </p>
                      )}

                      {/* Challenge Details Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 text-[11px] text-gray-600">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span className="truncate font-medium">{challenge.location}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span className="truncate font-medium">{formatDate(challenge.dateTime)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Target className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span className="truncate font-medium">
                            {language === "en" ? "Distance: " : "Cự ly: "} {challenge.distance || "10m"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Award className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span className="truncate font-medium">
                            {language === "en" ? "Target: " : "Mục tiêu: "} {challenge.targetType === "bia_giay_tinh_diem" ? (language === "en" ? "Paper Target" : "Bia giấy tính điểm") : (language === "en" ? "Target Plate" : "Bia mục tiêu")}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 sm:col-span-2">
                          <Sword className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span className="truncate font-medium">
                            {language === "en" ? "Setup: " : "Thiết lập: "} {challenge.setsCount || 3} hiệp x {challenge.shotsPerSet || 5} viên {challenge.winMechanism === "by_target_shots" ? (language === "en" ? `(Chạm ${challenge.targetTouchShots} viên)` : `(Chạm ${challenge.targetTouchShots} viên)`) : ""}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 sm:col-span-2 border-t border-gray-50 pt-2 mt-1">
                          <Shield className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span className="font-medium truncate">
                            {language === "en" ? "Rules: " : "Quy định: "} {challenge.rules}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Contestants Visualization bar */}
                    <div className="flex items-center justify-between border-t border-gray-50 pt-3.5">
                      <div className="flex flex-col items-start max-w-[45%] text-left">
                        <button
                          type="button"
                          onClick={() => handleProfileOrClubClick(challenge.challengerName, challenge.challengerEmail, challenge.challengerUid)}
                          className="flex items-center gap-2 text-left hover:text-rose-600 transition-colors cursor-pointer focus:outline-none"
                        >
                          <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-rose-100 bg-gray-50 flex items-center justify-center">
                            {challenge.challengerAvatar ? (
                              <img 
                                src={challenge.challengerAvatar} 
                                alt={challenge.challengerName} 
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <User className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                          <span className="text-xs font-bold truncate">
                            {challenge.challengerName}
                          </span>
                        </button>
                        {getPlayerClubName(challenge.challengerName) && (
                          <button
                            type="button"
                            onClick={() => handleClubClick(getPlayerClubName(challenge.challengerName)!)}
                            className="text-[9px] text-indigo-600 hover:underline font-bold mt-0.5 ml-10 cursor-pointer"
                          >
                            {getPlayerClubName(challenge.challengerName)}
                          </button>
                        )}
                      </div>

                      <span className="text-[10px] italic font-black text-rose-500 shrink-0">VS</span>

                      <div className="flex flex-col items-end max-w-[45%] text-right">
                        <span className="text-xs italic text-gray-400">
                          {language === "en" ? "Awaiting..." : "Đang chờ đối..."}
                        </span>
                      </div>
                    </div>

                    {/* Host join requests management view */}
                    {isOwner && challenge.joinRequests && challenge.joinRequests.length > 0 && (
                      <div className="mt-3 bg-rose-50/50 rounded-xl p-3 border border-rose-100/50">
                        <span className="text-[10px] font-bold text-rose-900 uppercase tracking-wide block mb-2 flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-rose-500" />
                          <span>{language === "en" ? `Join Requests (${challenge.joinRequests.length})` : `Yêu cầu ứng tuyển (${challenge.joinRequests.length})`}</span>
                        </span>
                        <div className="space-y-1.5 max-h-[140px] overflow-y-auto scrollbar-thin">
                          {challenge.joinRequests.map((req: any, idx: number) => (
                            <div key={req.uid || idx} className="flex items-center justify-between gap-2 bg-white p-2 rounded-lg border border-gray-100 shadow-2xs">
                              <div className="flex items-center gap-1.5 truncate">
                                <div className="w-5 h-5 rounded-full overflow-hidden shrink-0 border border-gray-150">
                                  {req.avatar ? (
                                    <img src={req.avatar} alt={req.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  ) : (
                                    <User className="w-3 h-3 text-gray-400 m-auto" />
                                  )}
                                </div>
                                <span className="text-[11px] font-bold text-gray-800 truncate" title={req.name}>
                                  {req.name}
                                </span>
                              </div>
                              {onApproveJoinRequest && onDeclineJoinRequest ? (
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => onApproveJoinRequest(challenge, req)}
                                    className="bg-green-600 hover:bg-green-700 text-white text-[9px] font-bold px-2 py-1 rounded-md transition-all cursor-pointer"
                                  >
                                    {language === "en" ? "Approve" : "Duyệt"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onDeclineJoinRequest(challenge, req)}
                                    className="bg-gray-100 hover:bg-gray-200 text-gray-500 text-[9px] font-bold px-1.5 py-1 rounded-md transition-all cursor-pointer"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>

                  {/* Card Footer Button Bar */}
                  <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {/* Edit Button */}
                      {(isOwner || isAdmin) && onEditChallenge && (
                        <button
                          type="button"
                          onClick={() => onEditChallenge(challenge)}
                          className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200"
                        >
                          {language === "en" ? "Edit ⚙️" : "Sửa Kèo ⚙️"}
                        </button>
                      )}

                      {/* Delete Button */}
                      {(isAdmin || isOwner) && onDeleteChallenge && (
                        <button
                          type="button"
                          onClick={() => onDeleteChallenge(challenge.id)}
                          className="text-xs font-bold text-rose-600 hover:text-rose-800 transition-colors cursor-pointer bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg border border-rose-200"
                        >
                          {language === "en" ? "Delete 🗑️" : "Xóa Kèo 🗑️"}
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2 ml-auto">
                      {!isOwner && (
                        (() => {
                          const alreadyRequested = challenge.joinRequests?.some((r: any) => r.uid === currentUser?.uid);
                          if (alreadyRequested) {
                            return (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  disabled
                                  className="flex items-center gap-1.5 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 text-xs font-bold px-3 py-2 rounded-xl border border-yellow-500/20"
                                >
                                  <Clock className="w-3.5 h-3.5 animate-pulse text-yellow-500" />
                                  <span>{language === "en" ? "Awaiting Approval" : "Đang Chờ Duyệt"}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onCancelJoinRequest && onCancelJoinRequest(challenge)}
                                  className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl cursor-pointer transition-colors border border-slate-200"
                                >
                                  <span>{language === "en" ? "Cancel Request" : "Hủy nhận kèo"}</span>
                                </button>
                              </div>
                            );
                          }
                          return (
                            <button
                              type="button"
                              onClick={() => onAcceptChallenge ? onAcceptChallenge(challenge) : setActiveSubTab("lobby")}
                              className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer shadow-sm transition-colors"
                            >
                              <Sword className="w-3.5 h-3.5" />
                              <span>{language === "en" ? "Accept Challenge" : "Nhận Kèo PK"}</span>
                            </button>
                          );
                        })()
                      )}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 🏆 Section 3: Leaderboard split (Podium on Left, TOP 4-10 list on Right completing TOP 10) */}
      {personalLeaderboard.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500 animate-bounce" />
                <span>{language === "en" ? "PK Slingshot Gladiators (TOP 10)" : "Bảng Anh Hùng PK Đỉnh Phong (TOP 10)"}</span>
              </h3>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {language === "en" ? "Arena champions podium on left and TOP 4 to 10 list on right" : "Ba kỳ thủ sở hữu điểm ELO cao nhất bên trái và danh sách từ hạng 4 đến hạng 10 bên phải"}
              </p>
            </div>
            <button 
              type="button" 
              onClick={() => setActiveSubTab("leaderboard")}
              className="text-xs font-bold text-rose-600 hover:text-rose-800 transition-colors flex items-center gap-0.5"
            >
              <span>{language === "en" ? "Full Standings" : "Xem Bảng Đầy Đủ"}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Left Section: Top 3 Podium (Bảng vàng Top 3) */}
            <div className="w-full bg-slate-50/50 p-6 rounded-2xl border border-gray-100 lg:col-span-5 flex flex-col justify-between">
              <div className="text-center mb-6">
                <span className="text-[10px] font-black uppercase text-rose-800 bg-rose-50 border border-rose-100 px-3 py-1 rounded-full">
                  {language === "en" ? "TOP 3 GLORY PODIUM" : "BẢNG VÀNG TOP 3"}
                </span>
              </div>
              <div className="max-w-xl mx-auto w-full grid grid-cols-3 gap-2 pt-2 items-end">
                {podiumPlayers.map((player, idx) => {
                  if (!player) {
                    return (
                      <div key={`empty-${idx}`} className="flex flex-col items-center justify-end pb-4">
                        <div className="w-10 h-10 rounded-full bg-gray-150 border border-dashed border-gray-200 flex items-center justify-center">
                          <User className="w-4 h-4 text-gray-300" />
                        </div>
                        <span className="text-[9px] text-gray-400 font-medium mt-1">Awaiting...</span>
                      </div>
                    );
                  }

                  const isGold = player.elo === topThree[0]?.elo;
                  const isSilver = player.elo === topThree[1]?.elo && topThree.length > 1;
                  const isBronze = player.elo === topThree[2]?.elo && topThree.length > 2;

                  let placementLabel = "2nd";
                  let placementColor = "bg-slate-200 text-slate-800 border-slate-300";
                  let podiumHeight = "h-20 sm:h-24";
                  let avatarSize = "w-12 h-12 sm:w-14 sm:h-14";

                  if (isGold) {
                    placementLabel = "1st";
                    placementColor = "bg-amber-100 text-amber-800 border-amber-200";
                    podiumHeight = "h-28 sm:h-32 bg-amber-50/50 border-amber-150";
                    avatarSize = "w-14 h-14 sm:w-18 sm:h-18 ring-4 ring-amber-300";
                  } else if (isBronze) {
                    placementLabel = "3rd";
                    placementColor = "bg-orange-100 text-orange-800 border-orange-200";
                    podiumHeight = "h-16 sm:h-18";
                  }

                  return (
                    <div key={player.id || player.uid} className="flex flex-col items-center justify-end">
                      {/* Avatar and Info */}
                      <div className="text-center space-y-1 mb-2">
                        <div className="relative mx-auto flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => handleProfileOrClubClick(player.name, player.email, player.athleteId || player.uid)}
                            className="relative block rounded-full focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-transform active:scale-95"
                          >
                            <div className={`${avatarSize} rounded-full overflow-hidden border-2 border-white shadow-md bg-gray-100`}>
                              {player.avatarUrl ? (
                                <img src={player.avatarUrl} alt={player.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <User className="w-6 h-6 text-gray-400 m-auto" />
                              )}
                            </div>
                            {isGold && (
                              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 drop-shadow-sm">
                                <span className="text-base sm:text-lg">👑</span>
                              </div>
                            )}
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleProfileOrClubClick(player.name, player.email, player.athleteId || player.uid)}
                          className="text-[10px] sm:text-[11px] font-extrabold text-gray-800 hover:text-rose-600 transition-colors block line-clamp-1 max-w-[85px] mx-auto text-center"
                        >
                          {player.name}
                        </button>
                        <span className="text-[10px] font-extrabold text-rose-600 block">ELO {player.elo}</span>
                        <span className="text-[8px] text-gray-400 font-bold block">{player.wins}W - {player.losses}L</span>
                        {getPlayerClubName(player.name) && (
                          <button
                            type="button"
                            onClick={() => handleClubClick(getPlayerClubName(player.name)!)}
                            className="text-[8px] text-indigo-600 hover:underline font-extrabold block line-clamp-1 max-w-[85px] mx-auto cursor-pointer"
                          >
                            {getPlayerClubName(player.name)}
                          </button>
                        )}
                      </div>

                      {/* Physical Podium Block */}
                      <div className={`w-full ${podiumHeight} rounded-t-xl border-t border-x flex flex-col items-center justify-center gap-1 bg-white border-gray-150 shadow-3xs`}>
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border ${placementColor}`}>
                          {placementLabel}
                        </span>
                        {isGold && <Trophy className="w-4 h-4 text-amber-500 animate-pulse" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Section: Remaining Rankings (Danh sách xếp hạng) */}
            <div className="w-full flex flex-col lg:col-span-7">
              <div className="flex items-center justify-between mb-3.5">
                <span className="text-xs font-black uppercase text-gray-800 flex items-center gap-1.5">
                  <Sword className="w-3.5 h-3.5 text-rose-600" />
                  {language === "en" ? "GLADIATORS RANKED 4 - 10" : "DANH SÁCH HẠNG 4 - HẠNG 10"}
                </span>
                <span className="text-[10px] text-gray-400 font-bold">
                  {personalLeaderboard.length} {language === "en" ? "athletes total" : "kỳ thủ hệ thống"}
                </span>
              </div>

              <div className="max-h-[340px] overflow-y-auto pr-1 border border-gray-100 rounded-xl divide-y divide-gray-50 bg-white shadow-3xs">
                {personalLeaderboard.slice(3, 10).map((player, index) => {
                  const rank = index + 4;
                  const rankBg = "bg-gray-50 text-gray-500 border-gray-100";

                  return (
                    <div 
                      key={player.id || player.uid} 
                      className="flex items-center justify-between p-2.5 sm:p-3 hover:bg-slate-50/50 transition-colors group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Rank Badge */}
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border ${rankBg} shrink-0`}>
                          {rank}
                        </div>

                        {/* Player Avatar & Name with profile link */}
                        <button
                          type="button"
                          onClick={() => handleProfileOrClubClick(player.name, player.email, player.athleteId || player.uid)}
                          className="flex items-center gap-2.5 min-w-0 text-left focus:outline-none group-hover:text-rose-600 transition-colors"
                        >
                          <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-100 bg-gray-100 shrink-0">
                            {player.avatarUrl ? (
                              <img src={player.avatarUrl} alt={player.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <User className="w-4 h-4 text-gray-400 m-auto" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-black text-gray-800 block truncate group-hover:text-rose-600 transition-colors">
                              {player.name}
                            </span>
                            {player.clubName ? (
                              <span 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleClubClick(player.clubName);
                                }}
                                className="text-[9px] text-indigo-600 hover:underline font-bold block cursor-pointer"
                              >
                                {player.clubName}
                              </span>
                            ) : getPlayerClubName(player.name) ? (
                              <span 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleClubClick(getPlayerClubName(player.name)!);
                                }}
                                className="text-[9px] text-indigo-600 hover:underline font-bold block cursor-pointer"
                              >
                                {getPlayerClubName(player.name)}
                              </span>
                            ) : (
                              <span className="text-[9px] text-gray-400 font-bold block">
                                {language === "en" ? "Independent" : "Tự do"}
                              </span>
                            )}
                          </div>
                        </button>
                      </div>

                      {/* ELO & Win-loss record */}
                      <div className="flex items-center gap-4 shrink-0 text-right">
                        <div>
                          <span className="text-xs font-black text-rose-600 block">
                            {player.elo} ELO
                          </span>
                          <span className="text-[9px] text-gray-400 font-semibold block">
                            {player.wins}W - {player.losses}L
                          </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-400 transition-colors" />
                      </div>
                    </div>
                  );
                })}

                {personalLeaderboard.length <= 3 && (
                  <div className="p-4 text-center text-xs italic text-gray-400">
                    {language === "en" ? "No more rank 4-10 gladiators found." : "Hiện chưa có thêm đấu thủ xếp hạng từ 4 đến 10."}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ⚔️ Section 4: Live/Active Matches Arena */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
              {language === "en" ? "Live Battle Arena" : "Đấu Trường Đang Thi Đấu"}
            </h3>
          </div>
          <span className="text-xs text-gray-400 font-semibold">
            {liveMatches.length} {language === "en" ? "active matches" : "trận đang đấu"}
          </span>
        </div>

        {liveMatches.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-xs">
            <Sword className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <span className="text-xs font-bold text-gray-700 block">{language === "en" ? "No matches currently active" : "Hiện tại không có trận PK nào đang diễn ra"}</span>
            <p className="text-[11px] text-gray-400 mt-1 max-w-xs mx-auto">
              {language === "en" ? "Go to lobby to host a new challenge or accept an open challenge!" : "Hãy sang tab Sảnh Kèo để thách đấu hoặc nhận kèo của người chơi khác!"}
            </p>
            <button
              onClick={() => setActiveSubTab("lobby")}
              className="mt-3 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-all"
            >
              {language === "en" ? "Go to Matchmaking" : "Vào Sảnh Ghép Kèo"}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {liveMatches.map((challenge) => {
              const isChallenger = Boolean(currentUser?.uid && currentUser.uid === challenge.challengerUid);
              const isOpponent = Boolean(currentUser?.uid && currentUser.uid === challenge.opponentUid);
              const isReferee = Boolean(challenge.refereeEmail && currentUser?.email && challenge.refereeEmail.toLowerCase() === currentUser.email.toLowerCase());
              const isParticipantOrRef = isChallenger || isOpponent || isReferee || isAdmin;
              const isOwner = isChallenger;

              return (
                <div
                  key={challenge.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden relative"
                >
                  {/* Card Header Status Indicator */}
                  <div className="px-5 py-3.5 bg-gray-55/40 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                        challenge.status === "accepted"
                          ? "bg-blue-50 text-blue-600 border border-blue-100"
                          : "bg-amber-50 text-amber-600 border border-amber-100"
                      }`}>
                        {challenge.status === "accepted"
                          ? (language === "en" ? "Matched / Ready" : "Đã nhận kèo 🤝")
                          : (language === "en" ? "Ongoing Battle" : "Đang thi đấu ⚔️")
                        }
                      </span>
                      {challenge.pin && (
                        <span className="flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-100 text-[9px] font-bold px-1.5 py-0.5 rounded-full" title="Kèo bảo mật bằng PIN">
                          <Lock className="w-2.5 h-2.5 text-amber-600" />
                          <span>PIN</span>
                        </span>
                      )}
                    </div>

                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      {challenge.type === "solo_1v1" ? "Solo 1v1" : `${challenge.teamSize}v${challenge.teamSize} Team`}
                    </span>
                  </div>

                  {/* Content Body */}
                  <div className="p-5 flex-1 flex flex-col justify-between gap-5">
                    <div>
                      <h3 className="text-base font-bold text-gray-900 line-clamp-1 mb-1">
                        {challenge.title}
                      </h3>
                      {challenge.description && (
                        <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                          {challenge.description}
                        </p>
                      )}

                      {/* Challenge Details Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 text-[11px] text-gray-600">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span className="truncate font-medium">{challenge.location}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span className="truncate font-medium">{formatDate(challenge.dateTime)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Target className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span className="truncate font-medium">
                            {language === "en" ? "Distance: " : "Cự ly: "} {challenge.distance || "10m"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Award className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span className="truncate font-medium">
                            {language === "en" ? "Target: " : "Mục tiêu: "} {challenge.targetType === "bia_giay_tinh_diem" ? (language === "en" ? "Paper Target" : "Bia giấy tính điểm") : (language === "en" ? "Target Plate" : "Bia mục tiêu")}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 sm:col-span-2">
                          <Sword className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span className="truncate font-medium">
                            {language === "en" ? "Setup: " : "Thiết lập: "} {challenge.setsCount || 3} hiệp x {challenge.shotsPerSet || 5} viên {challenge.winMechanism === "by_target_shots" ? (language === "en" ? `(Chạm ${challenge.targetTouchShots} viên)` : `(Chạm ${challenge.targetTouchShots} viên)`) : ""}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 sm:col-span-2 border-t border-gray-50 pt-2 mt-1">
                          <Shield className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span className="font-medium truncate">
                            {language === "en" ? "Rules: " : "Quy định: "} {challenge.rules}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Contestants Visualization bar */}
                    <div className="flex items-center justify-between border-t border-gray-50 pt-3.5">
                      <div className="flex flex-col items-start max-w-[45%] text-left">
                        <button
                          type="button"
                          onClick={() => handleProfileOrClubClick(challenge.challengerName, challenge.challengerEmail, challenge.challengerUid)}
                          className="flex items-center gap-2 text-left hover:text-rose-600 transition-colors cursor-pointer focus:outline-none"
                        >
                          <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-rose-100 bg-gray-50 flex items-center justify-center">
                            {challenge.challengerAvatar ? (
                              <img 
                                src={challenge.challengerAvatar} 
                                alt={challenge.challengerName} 
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <User className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                          <span className="text-xs font-bold truncate">
                            {challenge.challengerName}
                          </span>
                        </button>
                        {getPlayerClubName(challenge.challengerName) && (
                          <button
                            type="button"
                            onClick={() => handleClubClick(getPlayerClubName(challenge.challengerName)!)}
                            className="text-[9px] text-indigo-600 hover:underline font-bold mt-0.5 ml-10 cursor-pointer"
                          >
                            {getPlayerClubName(challenge.challengerName)}
                          </button>
                        )}
                      </div>

                      <span className="text-[10px] italic font-black text-rose-500 shrink-0">VS</span>

                      <div className="flex flex-col items-end max-w-[45%] text-right">
                        <button
                          type="button"
                          onClick={() => handleProfileOrClubClick(challenge.opponentName || "Đối thủ", challenge.opponentEmail, challenge.opponentUid)}
                          className="flex items-center gap-2 text-right justify-end hover:text-rose-600 transition-colors cursor-pointer focus:outline-none"
                        >
                          <span className="text-xs font-bold truncate">
                            {challenge.opponentName || "Đối thủ"}
                          </span>
                          <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-gray-200 bg-gray-50 flex items-center justify-center order-first sm:order-last">
                            {challenge.opponentAvatar ? (
                              <img 
                                src={challenge.opponentAvatar} 
                                alt={challenge.opponentName} 
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <User className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                        </button>
                        {challenge.opponentName && getPlayerClubName(challenge.opponentName) && (
                          <button
                            type="button"
                            onClick={() => handleClubClick(getPlayerClubName(challenge.opponentName)!)}
                            className="text-[9px] text-indigo-600 hover:underline font-bold mt-0.5 mr-10 cursor-pointer"
                          >
                            {getPlayerClubName(challenge.opponentName)}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Button Bar */}
                  <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {/* Edit Button */}
                      {((isOwner || isAdmin) && challenge.status !== "completed") && onEditChallenge && (
                        <button
                          type="button"
                          onClick={() => onEditChallenge(challenge)}
                          className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200"
                        >
                          {language === "en" ? "Edit ⚙️" : "Sửa Kèo ⚙️"}
                        </button>
                      )}

                      {/* Delete Button */}
                      {(isAdmin || (isOwner && challenge.status !== "completed")) && onDeleteChallenge && (
                        <button
                          type="button"
                          onClick={() => onDeleteChallenge(challenge.id)}
                          className="text-xs font-bold text-rose-600 hover:text-rose-800 transition-colors cursor-pointer bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg border border-rose-200"
                        >
                          {language === "en" ? "Delete 🗑️" : "Xóa Kèo 🗑️"}
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2 ml-auto">
                      {isParticipantOrRef ? (
                        <button
                          type="button"
                          onClick={() => setActiveArenaChallenge(challenge)}
                          className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-900 text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer shadow-sm transition-all justify-center"
                        >
                          <Play className="w-3 h-3 text-rose-500 fill-rose-500" />
                          <span>{language === "en" ? "Enter PK Arena" : "Vào Khán Đài PK 🏟️"}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setActiveArenaChallenge(challenge)}
                          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer shadow-sm transition-all justify-center"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{language === "en" ? "Watch PK Live" : "Vào Xem PK 👁️"}</span>
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 📜 Section 5: Lịch Sử Kết Quả PK Gần Đây (Hiển thị giống tab Lịch Sử Kết Quả, tối đa 4 kết quả) */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              <span>{language === "en" ? "Recent Battle Results" : "Lịch Sử Kết Quả PK Đấu Trường"}</span>
            </h3>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {language === "en" ? "4 most recent battles resolved in the arena" : "Thông tin kết quả chi tiết của 4 trận đấu gần nhất tại đấu trường"}
            </p>
          </div>
          <button 
            type="button" 
            onClick={() => setActiveSubTab("history")}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-0.5"
          >
            <span>{language === "en" ? "Full History" : "Xem Đầy Đủ Lịch Sử"}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentCompleted.length === 0 ? (
          <div className="text-center p-8 text-gray-400 text-xs italic bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            {language === "en" ? "No completed battles recorded yet." : "Hiện chưa có trận đấu nào được hoàn tất."}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {recentCompleted.map((match) => {
              const chScores = match.scores?.challengerScores || [];
              const opScores = match.scores?.opponentScores || [];
              const winMechanism = match.winMechanism || "by_sets";

              const chSum = chScores.reduce((a, b) => Number(a) + Number(b), 0);
              const opSum = opScores.reduce((a, b) => Number(a) + Number(b), 0);

              let chSetsWon = 0;
              let opSetsWon = 0;
              const len = Math.max(chScores.length, opScores.length);
              for (let i = 0; i < len; i++) {
                const chS = Number(chScores[i]) || 0;
                const opS = Number(opScores[i]) || 0;
                if (chS > opS) chSetsWon++;
                else if (opS > chS) opSetsWon++;
              }

              const isBySets = winMechanism === "by_sets";
              const challengerWin = isBySets ? (chSetsWon > opSetsWon) : (chSum > opSum);
              const opponentWin = isBySets ? (opSetsWon > chSetsWon) : (opSum > chSum);

              return (
                <div 
                  key={match.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col justify-between"
                >
                  {/* Match metadata bar */}
                  <div className="px-5 py-3 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                    <span>{formatDate(match.dateTime || match.createdAt)}</span>
                    <span>
                      {match.type === "solo_1v1" ? "1v1 Solo" : "Club Team"}
                      {" • "}
                      {winMechanism === "by_sets" 
                        ? (language === "en" ? "Set-by-Set Format" : "Tính theo Hiệp") 
                        : winMechanism === "by_target_shots"
                        ? (language === "en" ? `Touch ${match.targetTouchShots || 15} Shots` : `Chạm ${match.targetTouchShots || 15} Viên`)
                        : (language === "en" ? "Total Points Format" : "Cộng tổng điểm")}
                    </span>
                  </div>

                  {/* Scoreboard block */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-gray-900 text-center mb-1 line-clamp-1">{match.title}</h4>
                      
                      {/* Match Specifications subheader */}
                      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-[9px] text-gray-500 font-extrabold mb-4 bg-slate-100/60 py-1 px-2.5 rounded-lg border border-slate-200/50 max-w-sm mx-auto">
                        <span className="flex items-center gap-0.5">
                          <span className="text-rose-650">🎯</span>
                          <span>{language === "en" ? "Target:" : "Mục tiêu:"}</span>
                          <span className="text-gray-800">
                            {match.targetType === "bia_giay_tinh_diem" 
                              ? (language === "en" ? "Paper Target" : "Bia giấy tính điểm") 
                              : (language === "en" ? "Target Plate" : "Bia mục tiêu")}
                          </span>
                        </span>
                        <span className="text-gray-300">•</span>
                        <span>
                          {language === "en" ? "Shots/Set:" : "Số viên/Hiệp:"} <span className="text-gray-800">{match.shotsPerSet || 5}</span>
                        </span>
                        <span className="text-gray-300">•</span>
                        <span>
                          {language === "en" ? "Sets:" : "Số Hiệp:"} <span className="text-gray-800">{match.setsCount || 3}</span>
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-around gap-4 bg-gray-50 p-3.5 rounded-xl border border-gray-50">
                      
                      {/* Challenger */}
                      <div className="flex flex-col items-center text-center w-5/12">
                        <button
                          type="button"
                          onClick={() => handleProfileOrClubClick(match.challengerName, match.challengerEmail, match.challengerUid)}
                          className="flex flex-col items-center text-center focus:outline-none hover:text-rose-600 transition-colors cursor-pointer"
                        >
                          <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-100 bg-gray-50 flex items-center justify-center shadow-xs">
                            {match.challengerAvatar ? (
                              <img src={match.challengerAvatar} alt={match.challengerName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <User className="w-4 h-4 text-gray-300" />
                            )}
                          </div>
                          <span className="text-[11px] font-bold mt-1.5 truncate max-w-full text-gray-850">{match.challengerName}</span>
                        </button>
                        {getPlayerClubName(match.challengerName) && (
                          <button
                            type="button"
                            onClick={() => handleClubClick(getPlayerClubName(match.challengerName)!)}
                            className="text-[9px] text-indigo-600 hover:underline font-bold mt-0.5 cursor-pointer"
                          >
                            {getPlayerClubName(match.challengerName)}
                          </button>
                        )}
                        {challengerWin && (
                          <span className="text-[8px] font-black uppercase text-green-600 bg-green-50 border border-green-100 px-1.5 py-0.2 rounded mt-0.5">Winner</span>
                        )}
                      </div>

                      {/* Scores Sum */}
                      <div className="text-center shrink-0 flex flex-col items-center">
                        <div className="font-black text-lg text-gray-900 leading-none">
                          {isBySets ? `${chSetsWon} - ${opSetsWon}` : `${chSum} - ${opSum}`}
                        </div>
                        <span className="text-[8px] text-gray-400 font-bold uppercase mt-1">
                          {isBySets 
                            ? (language === "en" ? `Total: ${chSum}-${opSum}` : `Tổng điểm: ${chSum}-${opSum}`) 
                            : (language === "en" ? `Sets: ${chSetsWon}-${opSetsWon}` : `Số hiệp: ${chSetsWon}-${opSetsWon}`)
                          }
                        </span>
                        <span className="text-[8px] text-gray-400 font-bold uppercase mt-0.5">Final</span>
                      </div>

                      {/* Opponent */}
                      <div className="flex flex-col items-center text-center w-5/12">
                        <button
                          type="button"
                          onClick={() => handleProfileOrClubClick(match.opponentName || "Đối thủ", match.opponentEmail, match.opponentUid)}
                          className="flex flex-col items-center text-center focus:outline-none hover:text-rose-650 transition-colors cursor-pointer"
                        >
                          <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-100 bg-gray-50 flex items-center justify-center shadow-xs">
                            {match.opponentAvatar ? (
                              <img src={match.opponentAvatar} alt={match.opponentName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <User className="w-4 h-4 text-gray-300" />
                            )}
                          </div>
                          <span className="text-[11px] font-bold mt-1.5 truncate max-w-full text-gray-850">{match.opponentName || "Guest"}</span>
                        </button>
                        {match.opponentName && getPlayerClubName(match.opponentName) && (
                          <button
                            type="button"
                            onClick={() => handleClubClick(getPlayerClubName(match.opponentName)!)}
                            className="text-[9px] text-indigo-600 hover:underline font-bold mt-0.5 cursor-pointer"
                          >
                            {getPlayerClubName(match.opponentName)}
                          </button>
                        )}
                        {opponentWin && (
                          <span className="text-[8px] font-black uppercase text-green-600 bg-green-50 border border-green-100 px-1.5 py-0.2 rounded mt-0.5">Winner</span>
                        )}
                      </div>

                    </div>
                  </div>

                  {/* Footer Details */}
                  <div className="px-5 py-3.5 bg-gray-50/50 border-t border-gray-100 text-xs text-gray-500 flex items-center justify-between">
                    <div className="truncate max-w-[45%] font-medium">
                      <span className="text-gray-400">{language === "en" ? "Loc: " : "Địa điểm: "}</span>{match.location}
                    </div>
                    <div className="flex items-center gap-2">
                      {((currentUser?.uid && (currentUser.uid === match.challengerUid || currentUser.uid === match.opponentUid)) || isAdmin) && openUpdateVideoModal && (
                        <button
                          type="button"
                          onClick={() => openUpdateVideoModal(match)}
                          className="text-xs font-bold text-emerald-700 hover:text-emerald-900 transition-colors cursor-pointer bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded border border-emerald-200"
                        >
                          {language === "en" ? "Update Video 📹" : "Cập nhật Video 📹"}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          if (setSelectedDetailChallenge) {
                            setSelectedDetailChallenge(match);
                          } else {
                            setActiveArenaChallenge(match);
                          }
                        }}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded border border-indigo-200"
                      >
                        {language === "en" ? "Details 👁️" : "Xem chi tiết 👁️"}
                      </button>
                      {isAdmin && onDeleteChallenge && (
                        <button
                          type="button"
                          onClick={() => onDeleteChallenge(match.id)}
                          className="text-xs font-bold text-rose-600 hover:text-rose-800 transition-colors cursor-pointer bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded border border-rose-200"
                        >
                          {language === "en" ? "Delete 🗑️" : "Xóa Kèo 🗑️"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-center pt-3 border-t border-gray-50">
          <button
            type="button"
            onClick={() => setActiveSubTab("history")}
            className="px-5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-extrabold uppercase tracking-widest rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
          >
            {language === "en" ? "View More Matches" : "Xem Thêm Kết Quả"}
          </button>
        </div>
      </div>
    </div>
  );
};
