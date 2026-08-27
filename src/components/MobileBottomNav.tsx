import React from "react";
import { 
  ClipboardCheck, 
  LayoutDashboard, 
  Home, 
  Trophy, 
  Settings, 
  Plus, 
  Shield, 
  Heart, 
  User,
  Sword,
  History
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

interface MobileBottomNavProps {
  activeHistoryId: string | null;
  activeTab: string;
  homeFilter: string;
  controlPanelSubTab: string;
  competitionMode: "individual" | "team";
  currentUser: any;
  hasUnsavedChanges: boolean;
  changeTab: (tab: any) => void;
  changeExitTournament: (filter: "all" | "all_list" | "active" | "followed") => Promise<void>;
  handleExitTournament: (filter?: "all" | "all_list" | "active" | "followed") => Promise<void>;
  setActiveTab: (tab: any) => void;
  setSettingsSubTab: (subTab: string) => void;
  setControlPanelSubTab: (subTab: string) => void;
  setIsNewTournamentModalOpen: (open: boolean) => void;
  setPendingTabTarget: (target: any) => void;
  setIsUnsavedModalOpen: (open: boolean) => void;
  setIsAuthModalOpen: (open: boolean) => void;
  setShowMobileRankingSelection: (open: boolean) => void;
  activePkSubTab?: "dashboard" | "lobby" | "leaderboard" | "history" | null;
  setActivePkSubTab?: (subTab: "dashboard" | "lobby" | "leaderboard" | "history") => void;
}

export function MobileBottomNav({
  activeHistoryId,
  activeTab,
  homeFilter,
  controlPanelSubTab,
  competitionMode,
  currentUser,
  hasUnsavedChanges,
  changeTab,
  changeExitTournament,
  handleExitTournament,
  setActiveTab,
  setSettingsSubTab,
  setControlPanelSubTab,
  setIsNewTournamentModalOpen,
  setPendingTabTarget,
  setIsUnsavedModalOpen,
  setIsAuthModalOpen,
  setShowMobileRankingSelection,
  activePkSubTab,
  setActivePkSubTab,
}: MobileBottomNavProps) {
  const { language } = useLanguage();
  const isTournamentActive = !!activeHistoryId;

  if (activeTab === "pk_lobby") {
    const pkSubTab = activePkSubTab || "dashboard";
    const isDashboardActive = pkSubTab === "dashboard";
    const isLobbyActive = pkSubTab === "lobby";
    const isLeaderboardActive = pkSubTab === "leaderboard";
    const isHistoryActive = pkSubTab === "history";

    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-gradient-to-b from-[#b80e16] to-[#8c0a10] border-t border-red-500/25 shadow-2xl h-16 pb-safe flex items-stretch">
        <div className="grid grid-cols-5 w-full h-full items-center text-center relative px-1">
          {/* Item 1: TỔNG QUAN / Thách Đấu PK */}
          <button
            onClick={() => setActivePkSubTab?.("dashboard")}
            className="flex flex-col items-center justify-center h-full relative cursor-pointer select-none border-none bg-transparent"
          >
            <div className={`transition-all duration-300 flex flex-col items-center ${isDashboardActive ? "-translate-y-3.5" : "translate-y-0"}`}>
              <div className={`transition-all duration-300 flex items-center justify-center ${
                isDashboardActive 
                  ? "w-12 h-12 bg-gradient-to-b from-[#d8141c] to-[#9c0c13] rounded-full border-4 border-white dark:border-slate-950 shadow-lg" 
                  : "w-9 h-9 bg-transparent"
              }`}>
                <Sword className={`w-5 h-5 transition-all duration-300 ${isDashboardActive ? "text-white scale-110" : "text-white/70"}`} />
              </div>
              <span className={`text-[8px] transition-all duration-300 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis max-w-[62px] ${
                isDashboardActive 
                  ? "font-black text-yellow-400 mt-0.5 uppercase tracking-wider" 
                  : "font-bold text-white/70 mt-1"
              }`}>
                {language === "en" ? "Overview" : "Tổng quan"}
              </span>
            </div>
          </button>

          {/* Item 2: Chờ PK (SẢNH KÈO ĐANG CHỜ) */}
          <button
            onClick={() => setActivePkSubTab?.("lobby")}
            className="flex flex-col items-center justify-center h-full relative cursor-pointer select-none border-none bg-transparent"
          >
            <div className={`transition-all duration-300 flex flex-col items-center ${isLobbyActive ? "-translate-y-3.5" : "translate-y-0"}`}>
              <div className={`transition-all duration-300 flex items-center justify-center ${
                isLobbyActive 
                  ? "w-12 h-12 bg-gradient-to-b from-[#d8141c] to-[#9c0c13] rounded-full border-4 border-white dark:border-slate-950 shadow-lg" 
                  : "w-9 h-9 bg-transparent"
              }`}>
                <ClipboardCheck className={`w-5 h-5 transition-all duration-300 ${isLobbyActive ? "text-white scale-110" : "text-white/70"}`} />
              </div>
              <span className={`text-[8px] transition-all duration-300 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis max-w-[62px] ${
                isLobbyActive 
                  ? "font-black text-yellow-400 mt-0.5 uppercase tracking-wider" 
                  : "font-bold text-white/70 mt-1"
              }`}>
                {language === "en" ? "Wait PK" : "Chờ PK"}
              </span>
            </div>
          </button>

          {/* Item 3: TRANG CHỦ */}
          <button
            onClick={() => changeExitTournament("all")}
            className="flex flex-col items-center justify-center h-full relative cursor-pointer select-none border-none bg-transparent"
          >
            <div className="transition-all duration-300 flex flex-col items-center translate-y-0">
              <div className="transition-all duration-300 flex items-center justify-center w-9 h-9 bg-transparent">
                <Home className="w-5 h-5 transition-all duration-300 text-white/70" />
              </div>
              <span className="text-[8px] transition-all duration-300 tracking-tight font-bold text-white/70 mt-1">
                {language === "en" ? "Home" : "Trang chủ"}
              </span>
            </div>
          </button>

          {/* Item 4: BXH PK (BẢNG ANH HÙNG PK) */}
          <button
            onClick={() => setActivePkSubTab?.("leaderboard")}
            className="flex flex-col items-center justify-center h-full relative cursor-pointer select-none border-none bg-transparent"
          >
            <div className={`transition-all duration-300 flex flex-col items-center ${isLeaderboardActive ? "-translate-y-3.5" : "translate-y-0"}`}>
              <div className={`transition-all duration-300 flex items-center justify-center ${
                isLeaderboardActive 
                  ? "w-12 h-12 bg-gradient-to-b from-[#d8141c] to-[#9c0c13] rounded-full border-4 border-white dark:border-slate-950 shadow-lg" 
                  : "w-9 h-9 bg-transparent"
              }`}>
                <Trophy className={`w-5 h-5 transition-all duration-300 ${isLeaderboardActive ? "text-white scale-110" : "text-white/70"}`} />
              </div>
              <span className={`text-[8px] transition-all duration-300 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis max-w-[62px] ${
                isLeaderboardActive 
                  ? "font-black text-yellow-400 mt-0.5 uppercase tracking-wider" 
                  : "font-bold text-white/70 mt-1"
              }`}>
                {language === "en" ? "PK Rank" : "BXH PK"}
              </span>
            </div>
          </button>

          {/* Item 5: THẮNG-BẠI (LỊCH SỬ KẾT QUẢ) */}
          <button
            onClick={() => setActivePkSubTab?.("history")}
            className="flex flex-col items-center justify-center h-full relative cursor-pointer select-none border-none bg-transparent"
          >
            <div className={`transition-all duration-300 flex flex-col items-center ${isHistoryActive ? "-translate-y-3.5" : "translate-y-0"}`}>
              <div className={`transition-all duration-300 flex items-center justify-center ${
                isHistoryActive 
                  ? "w-12 h-12 bg-gradient-to-b from-[#d8141c] to-[#9c0c13] rounded-full border-4 border-white dark:border-slate-950 shadow-lg" 
                  : "w-9 h-9 bg-transparent"
              }`}>
                <History className={`w-5 h-5 transition-all duration-300 ${isHistoryActive ? "text-white scale-110" : "text-white/70"}`} />
              </div>
              <span className={`text-[8px] transition-all duration-300 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis max-w-[62px] ${
                isHistoryActive 
                  ? "font-black text-yellow-400 mt-0.5 uppercase tracking-wider" 
                  : "font-bold text-white/70 mt-1"
              }`}>
                {language === "en" ? "W/L History" : "THẮNG-BẠI"}
              </span>
            </div>
          </button>
        </div>
      </div>
    );
  }

  if (isTournamentActive) {
    const isInputScoresActive = activeTab === "input_scores" || activeTab === "scoring";
    const isDashboardActive = activeTab === "dashboard";
    const isHomeActive = activeTab === "home";
    const isLeaderboardActive = activeTab === "leaderboard";
    const isSettingsActive = activeTab === "settings";

    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-gradient-to-b from-[#b80e16] to-[#8c0a10] border-t border-red-500/25 shadow-2xl h-16 pb-safe flex items-stretch">
        <div className="grid grid-cols-5 w-full h-full items-center text-center relative px-1">
          {/* Tab 1: Nhập điểm / Nhập điểm team */}
          <button
            onClick={() => changeTab("input_scores")}
            className="flex flex-col items-center justify-center h-full relative cursor-pointer select-none border-none bg-transparent"
          >
            <div className={`transition-all duration-300 flex flex-col items-center ${isInputScoresActive ? "-translate-y-3.5" : "translate-y-0"}`}>
              <div className={`transition-all duration-300 flex items-center justify-center ${
                isInputScoresActive 
                  ? "w-12 h-12 bg-gradient-to-b from-[#d8141c] to-[#9c0c13] rounded-full border-4 border-white dark:border-slate-950 shadow-lg" 
                  : "w-9 h-9 bg-transparent"
              }`}>
                <ClipboardCheck className={`w-5 h-5 transition-all duration-300 ${isInputScoresActive ? "text-white scale-110" : "text-white/70"}`} />
              </div>
              <span className={`text-[8px] transition-all duration-300 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis max-w-[62px] ${
                isInputScoresActive 
                  ? "font-black text-yellow-400 mt-0.5 uppercase tracking-wider" 
                  : "font-bold text-white/70 mt-1"
              }`}>
                {competitionMode === "team" 
                  ? (language === "en" ? "Team Scores" : "Nhập điểm team") 
                  : (language === "en" ? "Enter Scores" : "Nhập Điểm")}
              </span>
            </div>
          </button>

          {/* Tab 2: Overview (Dashboard) */}
          <button
            onClick={() => changeTab("dashboard")}
            className="flex flex-col items-center justify-center h-full relative cursor-pointer select-none border-none bg-transparent"
          >
            <div className={`transition-all duration-300 flex flex-col items-center ${isDashboardActive ? "-translate-y-3.5" : "translate-y-0"}`}>
              <div className={`transition-all duration-300 flex items-center justify-center ${
                isDashboardActive 
                  ? "w-12 h-12 bg-gradient-to-b from-[#d8141c] to-[#9c0c13] rounded-full border-4 border-white dark:border-slate-950 shadow-lg" 
                  : "w-9 h-9 bg-transparent"
              }`}>
                <LayoutDashboard className={`w-5 h-5 transition-all duration-300 ${isDashboardActive ? "text-white scale-110" : "text-white/70"}`} />
              </div>
              <span className={`text-[8px] transition-all duration-300 tracking-tight ${
                isDashboardActive 
                  ? "font-black text-yellow-400 mt-0.5 uppercase tracking-wider" 
                  : "font-bold text-white/70 mt-1"
              }`}>
                {language === "en" ? "Overview" : "Tổng quan"}
              </span>
            </div>
          </button>

          {/* Tab 3: Trang chủ */}
          <button
            onClick={() => changeExitTournament("all")}
            className="flex flex-col items-center justify-center h-full relative cursor-pointer select-none border-none bg-transparent"
          >
            <div className={`transition-all duration-300 flex flex-col items-center ${isHomeActive ? "-translate-y-3.5" : "translate-y-0"}`}>
              <div className={`transition-all duration-300 flex items-center justify-center ${
                isHomeActive 
                  ? "w-12 h-12 bg-gradient-to-b from-[#d8141c] to-[#9c0c13] rounded-full border-4 border-white dark:border-slate-950 shadow-lg" 
                  : "w-9 h-9 bg-transparent"
              }`}>
                <Home className={`w-5 h-5 transition-all duration-300 ${isHomeActive ? "text-white scale-110" : "text-white/70"}`} />
              </div>
              <span className={`text-[8px] transition-all duration-300 tracking-tight ${
                isHomeActive 
                  ? "font-black text-yellow-400 mt-0.5 uppercase tracking-wider" 
                  : "font-bold text-white/70 mt-1"
              }`}>
                {language === "en" ? "Home" : "Trang chủ"}
              </span>
            </div>
          </button>

          {/* Tab 4: BXH VSC */}
          <button
            onClick={() => setShowMobileRankingSelection(true)}
            className="flex flex-col items-center justify-center h-full relative cursor-pointer select-none border-none bg-transparent"
          >
            <div className={`transition-all duration-300 flex flex-col items-center ${isLeaderboardActive ? "-translate-y-3.5" : "translate-y-0"}`}>
              <div className={`transition-all duration-300 flex items-center justify-center ${
                isLeaderboardActive 
                  ? "w-12 h-12 bg-gradient-to-b from-[#d8141c] to-[#9c0c13] rounded-full border-4 border-white dark:border-slate-950 shadow-lg" 
                  : "w-9 h-9 bg-transparent"
              }`}>
                <Trophy className={`w-5 h-5 transition-all duration-300 ${isLeaderboardActive ? "text-white scale-110" : "text-white/70"}`} />
              </div>
              <span className={`text-[8px] transition-all duration-300 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis max-w-[62px] ${
                isLeaderboardActive 
                  ? "font-black text-yellow-400 mt-0.5 uppercase tracking-wider" 
                  : "font-bold text-white/70 mt-1"
              }`}>
                {language === "en" ? "Leaderboard" : "BXH VSC"}
              </span>
            </div>
          </button>

          {/* Tab 5: Setting (Cấu hình & Tham Số) */}
          <button
            onClick={() => changeTab("settings")}
            className="flex flex-col items-center justify-center h-full relative cursor-pointer select-none border-none bg-transparent"
          >
            <div className={`transition-all duration-300 flex flex-col items-center ${isSettingsActive ? "-translate-y-3.5" : "translate-y-0"}`}>
              <div className={`transition-all duration-300 flex items-center justify-center ${
                isSettingsActive 
                  ? "w-12 h-12 bg-gradient-to-b from-[#d8141c] to-[#9c0c13] rounded-full border-4 border-white dark:border-slate-950 shadow-lg" 
                  : "w-9 h-9 bg-transparent"
              }`}>
                <Settings className={`w-5 h-5 transition-all duration-300 ${isSettingsActive ? "text-white scale-110" : "text-white/70"}`} />
              </div>
              <span className={`text-[8px] transition-all duration-300 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis max-w-[62px] ${
                isSettingsActive 
                  ? "font-black text-yellow-400 mt-0.5 uppercase tracking-wider" 
                  : "font-bold text-white/70 mt-1"
              }`}>
                {language === "en" ? "Settings" : "Setting"}
              </span>
            </div>
          </button>
        </div>
      </div>
    );
  }

  const isPkActive = activeTab === "pk_lobby";
  const isActiveActive = activeTab === "dashboard" || (activeTab === "home" && homeFilter === "active");
  const isHomeActive = activeTab === "home" && (homeFilter === "all" || homeFilter === "all_list");
  const isFollowedActive = activeTab === "home" && homeFilter === "followed";
  const isProfileActive = activeTab === "control_panel" && controlPanelSubTab === "profile";

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-gradient-to-b from-[#b80e16] to-[#8c0a10] border-t border-red-500/25 shadow-2xl h-16 pb-safe flex items-stretch">
      <div className="grid grid-cols-5 w-full h-full items-center text-center relative px-2">
        
        {/* Button 1: THÁCH ĐẤU PK */}
        <button
          onClick={() => {
            changeTab("pk_lobby");
          }}
          className="flex flex-col items-center justify-center h-full relative cursor-pointer select-none border-none bg-transparent"
        >
          <div className={`transition-all duration-300 flex flex-col items-center ${isPkActive ? "-translate-y-3.5" : "translate-y-0"}`}>
            <div className={`transition-all duration-300 flex items-center justify-center ${
              isPkActive 
                ? "w-12 h-12 bg-gradient-to-b from-[#d8141c] to-[#9c0c13] rounded-full border-4 border-white dark:border-slate-950 shadow-lg" 
                : "w-9 h-9 bg-transparent"
            }`}>
              <Sword className={`w-5 h-5 transition-all duration-300 ${isPkActive ? "text-white scale-110" : "text-white/70"}`} />
            </div>
            <span className={`text-[8px] transition-all duration-300 tracking-tight ${
              isPkActive 
                ? "font-black text-yellow-400 mt-0.5 uppercase tracking-wider" 
                : "font-bold text-white/70 mt-1"
            }`}>
              {language === "en" ? "Battle" : "Thách Đấu"}
            </span>
          </div>
        </button>

        {/* Button 2: GIẢI ĐANG DIỄN RA */}
        <button
          onClick={() => {
            if (activeHistoryId) {
              changeTab("dashboard");
            } else {
              changeExitTournament("active");
            }
          }}
          className="flex flex-col items-center justify-center h-full relative cursor-pointer select-none border-none bg-transparent"
        >
          <div className={`transition-all duration-300 flex flex-col items-center ${isActiveActive ? "-translate-y-3.5" : "translate-y-0"}`}>
            <div className={`transition-all duration-300 flex items-center justify-center ${
              isActiveActive 
                ? "w-12 h-12 bg-gradient-to-b from-[#d8141c] to-[#9c0c13] rounded-full border-4 border-white dark:border-slate-950 shadow-lg" 
                : "w-9 h-9 bg-transparent"
            }`}>
              <Shield className={`w-5 h-5 transition-all duration-300 ${isActiveActive ? "text-white scale-110" : "text-white/70"}`} />
            </div>
            <span className={`text-[8px] transition-all duration-300 tracking-tight ${
              isActiveActive 
                ? "font-black text-yellow-400 mt-0.5 uppercase tracking-wider" 
                : "font-bold text-white/70 mt-1"
            }`}>
              {language === "en" ? "Live" : "Đang đấu"}
            </span>
          </div>
        </button>

        {/* Button 3: TRANG CHỦ */}
        <button
          onClick={() => changeExitTournament("all")}
          className="flex flex-col items-center justify-center h-full relative cursor-pointer select-none border-none bg-transparent"
        >
          <div className={`transition-all duration-300 flex flex-col items-center ${isHomeActive ? "-translate-y-3.5" : "translate-y-0"}`}>
            <div className={`transition-all duration-300 flex items-center justify-center ${
              isHomeActive 
                ? "w-12 h-12 bg-gradient-to-b from-[#d8141c] to-[#9c0c13] rounded-full border-4 border-white dark:border-slate-950 shadow-lg" 
                : "w-9 h-9 bg-transparent"
            }`}>
              <Home className={`w-5 h-5 transition-all duration-300 ${isHomeActive ? "text-white scale-110" : "text-white/70"}`} />
            </div>
            <span className={`text-[8px] transition-all duration-300 tracking-tight ${
              isHomeActive 
                ? "font-black text-yellow-400 mt-0.5 uppercase tracking-wider" 
                : "font-bold text-white/70 mt-1"
            }`}>
              Home
            </span>
          </div>
        </button>

        {/* Button 4: GIẢI ĐANG THEO DÕI */}
        <button
          onClick={() => changeExitTournament("followed")}
          className="flex flex-col items-center justify-center h-full relative cursor-pointer select-none border-none bg-transparent"
        >
          <div className={`transition-all duration-300 flex flex-col items-center ${isFollowedActive ? "-translate-y-3.5" : "translate-y-0"}`}>
            <div className={`transition-all duration-300 flex items-center justify-center ${
              isFollowedActive 
                ? "w-12 h-12 bg-gradient-to-b from-[#d8141c] to-[#9c0c13] rounded-full border-4 border-white dark:border-slate-950 shadow-lg" 
                : "w-9 h-9 bg-transparent"
            }`}>
              <Heart className={`w-5 h-5 transition-all duration-300 ${isFollowedActive ? "text-white scale-110 fill-white" : "text-white/70 fill-none"}`} />
            </div>
            <span className={`text-[8px] transition-all duration-300 tracking-tight ${
              isFollowedActive 
                ? "font-black text-yellow-400 mt-0.5 uppercase tracking-wider" 
                : "font-bold text-white/70 mt-1"
            }`}>
              {language === "en" ? "Followed" : "Theo dõi"}
            </span>
          </div>
        </button>

        {/* Button 5: HỒ SƠ VĐV CỦA TÔI */}
        <button
          onClick={() => {
            if (currentUser) {
              setActiveTab("control_panel");
              setControlPanelSubTab("profile");
            } else {
              setIsAuthModalOpen(true);
            }
          }}
          className="flex flex-col items-center justify-center h-full relative cursor-pointer select-none border-none bg-transparent"
        >
          <div className={`transition-all duration-300 flex flex-col items-center ${isProfileActive ? "-translate-y-3.5" : "translate-y-0"}`}>
            <div className={`transition-all duration-300 flex items-center justify-center ${
              isProfileActive 
                ? "w-12 h-12 bg-gradient-to-b from-[#d8141c] to-[#9c0c13] rounded-full border-4 border-white dark:border-slate-950 shadow-lg" 
                : "w-9 h-9 bg-transparent"
            }`}>
              <User className={`w-5 h-5 transition-all duration-300 ${isProfileActive ? "text-white scale-110" : "text-white/70"}`} />
            </div>
            <span className={`text-[8px] transition-all duration-300 tracking-tight ${
              isProfileActive 
                ? "font-black text-yellow-400 mt-0.5 uppercase tracking-wider" 
                : "font-bold text-white/70 mt-1"
            }`}>
              {language === "en" ? "Profile" : "Hồ sơ"}
            </span>
          </div>
        </button>

      </div>
    </div>
  );
}
