import React, { useState, useEffect } from "react";
import { 
  Plus, 
  ChevronDown, 
  Home, 
  Play, 
  Heart, 
  Users, 
  ClipboardCheck, 
  Target, 
  Trophy, 
  Settings, 
  History, 
  X, 
  TrendingUp, 
  Menu, 
  User 
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { VSCLogo } from "./VSCLogo";
import { auth } from "../firebase";
import { HeroBanner } from "./HeroBanner";

interface HeaderNavigationProps {
  activeHistoryId: string | null;
  networkStatus: string;
  dbHasPendingWrites: boolean;
  currentUser: any;
  isGlobalAdmin: boolean;
  activeTab: string;
  changeTab: (tab: any) => void;
  changeExitTournament: (filter: "all" | "all_list" | "active" | "followed") => Promise<void>;
  homeFilter: string;
  setHomeFilter: (filter: string) => void;
  controlPanelSubTab: string;
  setControlPanelSubTab: (subTab: string) => void;
  settingsSubTab: string;
  setSettingsSubTab: (subTab: string) => void;
  isNewTournamentModalOpen: boolean;
  setIsNewTournamentModalOpen: (open: boolean) => void;
  userRole: string;
  competitionMode: "individual" | "team";
  setCompetitionMode: (mode: "individual" | "team") => void;
  rankingSubTab: "individual" | "team";
  setRankingSubTab: (subTab: any) => void;
  isSpectatorModeOverridden: boolean;
  setIsSpectatorModeOverridden: (overridden: boolean) => void;
  showInputScoresModeSelection: boolean;
  setShowInputScoresModeSelection: (show: boolean) => void;
  showScoringModeSelection: boolean;
  setShowScoringModeSelection: (show: boolean) => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  matchName: string;
  hasUnsavedChanges: boolean;
  setPendingTabTarget: (target: any) => void;
  setIsUnsavedModalOpen: (open: boolean) => void;
  handleExitTournament: (filter?: any) => Promise<void>;
  setActiveTab: (tab: any) => void;
  history: any[];
  tournamentType: "individual" | "team" | "combined";
  onlineTournaments: any[];
}

export function HeaderNavigation({
  activeHistoryId,
  networkStatus,
  dbHasPendingWrites,
  currentUser,
  isGlobalAdmin,
  activeTab,
  changeTab,
  changeExitTournament,
  homeFilter,
  setHomeFilter,
  controlPanelSubTab,
  setControlPanelSubTab,
  settingsSubTab,
  setSettingsSubTab,
  isNewTournamentModalOpen,
  setIsNewTournamentModalOpen,
  userRole,
  competitionMode,
  setCompetitionMode,
  rankingSubTab,
  setRankingSubTab,
  isSpectatorModeOverridden,
  setIsSpectatorModeOverridden,
  showInputScoresModeSelection,
  setShowInputScoresModeSelection,
  showScoringModeSelection,
  setShowScoringModeSelection,
  isAuthModalOpen,
  setIsAuthModalOpen,
  matchName,
  hasUnsavedChanges,
  setPendingTabTarget,
  setIsUnsavedModalOpen,
  handleExitTournament,
  setActiveTab,
  history,
  tournamentType,
  onlineTournaments,
}: HeaderNavigationProps) {
  const { language, setLanguage, t } = useLanguage();

  // Local UI States
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isEntryDropdownOpen, setIsEntryDropdownOpen] = useState(false);
  const [isRankingDropdownOpen, setIsRankingDropdownOpen] = useState(false);
  const [isMobileRankingExpanded, setIsMobileRankingExpanded] = useState(false);

  // Document click listener to close dropdowns when clicking outside
  useEffect(() => {
    const handleDocumentClick = () => {
      setIsEntryDropdownOpen(false);
      setIsRankingDropdownOpen(false);
    };
    document.addEventListener("click", handleDocumentClick);
    return () => {
      document.removeEventListener("click", handleDocumentClick);
    };
  }, []);

  // Click-outside handler to close user menu dropdown
  useEffect(() => {
    if (!isUserMenuOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const container = document.getElementById("user-header-menu-container");
      const containerMobile = document.getElementById("user-header-menu-container-mobile");
      if (
        (container && container.contains(e.target as Node)) ||
        (containerMobile && containerMobile.contains(e.target as Node))
      ) {
        return;
      }
      setIsUserMenuOpen(false);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isUserMenuOpen]);

  // Close dropdowns on route changes
  useEffect(() => {
    setIsEntryDropdownOpen(false);
    setIsRankingDropdownOpen(false);
    setIsUserMenuOpen(false);
  }, [activeTab]);

  return (
    <header className="w-full flex flex-col font-sans" id="app-header">
      {/* Desktop Header Navigation (hidden on mobile/tablet) */}
      <div className="hidden md:flex flex-col">
        {/* 1. Top slim bar (bg-[#002e6e]) */}
        <div className="bg-[#002e6e] text-white text-[11px] font-bold py-2 px-4 shadow-xs border-b border-white/5 relative z-50">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            {/* Left side text */}
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span>{language === "en" ? "System developed by VSC" : "Hệ thống được phát triển bởi VSC"}</span>
              {activeHistoryId && activeHistoryId.startsWith("tour-") && (
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ml-2 ${
                  networkStatus === "offline"
                    ? "bg-rose-500/20 text-rose-300"
                    : dbHasPendingWrites
                    ? "bg-amber-500/20 text-amber-300 animate-pulse"
                    : "bg-emerald-500/20 text-emerald-300"
                }`}>
                  {networkStatus === "offline" 
                    ? (language === "en" ? "Offline" : "Ngoại tuyến") 
                    : dbHasPendingWrites 
                    ? (language === "en" ? "Syncing..." : "Đang đồng bộ...") 
                    : (language === "en" ? "Cloud Sync OK" : "Đồng bộ Cloud OK")}
                </span>
              )}
            </div>

            {/* Right side options: Lang selection & Auth drop-down */}
            <div className="flex items-center gap-4">
              {/* Language Selection Toggle */}
              <div className="flex items-center gap-1 border-r border-white/20 pr-3 mr-1">
                <button
                  onClick={() => setLanguage("vi")}
                  className={`px-1.5 py-0.5 rounded-sm text-[9px] font-black transition-all cursor-pointer border-none bg-transparent ${
                    language === "vi" ? "bg-amber-500 text-slate-950 font-black shadow-xs" : "text-slate-300 hover:text-white"
                  }`}
                >
                  VIE
                </button>
                <button
                  onClick={() => setLanguage("en")}
                  className={`px-1.5 py-0.5 rounded-sm text-[9px] font-black transition-all cursor-pointer border-none bg-transparent ${
                    language === "en" ? "bg-amber-500 text-slate-950 font-black shadow-xs" : "text-slate-300 hover:text-white"
                  }`}
                >
                  ENG
                </button>
              </div>

              {/* Login dropdown if authenticated */}
              {currentUser ? (
                <div className="relative" id="user-header-menu-container">
                  <button
                    type="button"
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-1.5 cursor-pointer hover:opacity-90 transition-all text-left font-bold border-none bg-transparent"
                  >
                    <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-[9px] text-white font-black uppercase shrink-0">
                      {currentUser.displayName?.[0] || currentUser.email?.[0] || "U"}
                    </div>
                    <span className="truncate max-w-[120px] text-white">
                      {currentUser.displayName || currentUser.email}
                    </span>
                    <ChevronDown className="w-3 h-3 text-zinc-350 shrink-0" />
                  </button>

                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-905 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl z-50 p-1 flex flex-col text-slate-700 dark:text-slate-200 text-left">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab("control_panel");
                          setControlPanelSubTab("profile");
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs font-bold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex items-center gap-2 cursor-pointer border-none bg-transparent"
                      >
                        👤 {language === "en" ? "My Athlete Bio" : "Hồ Sơ VĐV của Tôi"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab("control_panel");
                          setControlPanelSubTab("created");
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs font-bold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex items-center gap-2 cursor-pointer border-none bg-transparent"
                      >
                        🏆 {language === "en" ? "My Created Tournaments" : "Giải Tôi Tạo"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab("control_panel");
                          setControlPanelSubTab("referee");
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs font-bold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex items-center gap-2 cursor-pointer border-none bg-transparent"
                      >
                        ⏱️ {language === "en" ? "Tournaments I Referee" : "Giải Tôi Làm Trọng Tài"}
                      </button>
                      <div className="border-t border-slate-100 dark:border-slate-800 my-1" />
                      <button
                        type="button"
                        onClick={() => {
                          auth.signOut();
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors flex items-center gap-2 cursor-pointer border-none bg-transparent"
                      >
                        🚪 {language === "en" ? "Logout" : "Thoát"}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(true)}
                  className="hover:text-yellow-400 font-extrabold uppercase transition-all tracking-wider cursor-pointer flex items-center gap-1 border-none bg-transparent"
                >
                  {language === "en" ? "REGISTER | LOGIN" : "ĐĂNG KÝ | ĐĂNG NHẬP"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 2. Main Navigation Red Bar (bg-[#9c0c13]) */}
        <div className="bg-[#9c0c13] text-white relative shadow-md z-40">
          <div className="max-w-7xl mx-auto flex justify-between items-stretch">
            
            {/* Logo Brand Box on the left with blue slanted design */}
            <div 
              className="relative bg-[#004ca3] px-5 sm:px-8 py-3.5 flex items-center shrink-0 pr-10 cursor-pointer hover:opacity-95 transition-all select-none"
              style={{ clipPath: 'polygon(0 0, 100% 0, calc(100% - 20px) 100%, 0 100%)' }}
              onClick={() => changeExitTournament("all")}
            >
              <div className="flex items-center gap-2">
                <div className="bg-white/10 p-1 rounded-lg border border-white/20 shadow-inner">
                  <VSCLogo size={24} />
                </div>
                <span className="font-extrabold tracking-tight text-white text-base sm:text-lg italic uppercase">
                  VSCS<span className="text-yellow-400">.ASIA</span>
                </span>
              </div>
            </div>

            {/* Menu Items on the right */}
            <div className={`flex items-center ${isEntryDropdownOpen || isRankingDropdownOpen ? "overflow-visible" : "overflow-x-auto scrollbar-none"} whitespace-nowrap scroll-smooth max-w-full font-sans select-none pr-4`}>
              <button
                onClick={() => changeExitTournament("all")}
                className={`px-4.5 py-4 text-xs sm:text-sm font-extrabold uppercase tracking-wider transition-all hover:bg-black/15 flex items-center gap-1.5 border-none bg-transparent ${
                  activeTab === "home" && homeFilter === "all" ? "bg-black/25 text-yellow-400 border-b-4 border-yellow-400 font-black" : "text-white"
                }`}
              >
                <Home className="w-4 h-4" />
                {language === "en" ? "Home" : "Trang Chủ"}
              </button>

              {activeTab === "home" && (
                <>
                  <button
                    onClick={() => changeExitTournament("active")}
                    className={`px-4.5 py-4 text-xs sm:text-sm font-extrabold uppercase tracking-wider transition-all hover:bg-black/15 flex items-center gap-1.5 border-none bg-transparent ${
                      homeFilter === "active" ? "bg-black/25 text-yellow-400 border-b-4 border-yellow-400 font-black" : "text-white"
                    }`}
                  >
                    <Play className="w-4 h-4 text-emerald-400 fill-emerald-400/25" />
                    {language === "en" ? "Live Tournaments" : "Giải Đang Diễn Ra"}
                  </button>

                  <button
                    onClick={() => changeExitTournament("followed")}
                    className={`px-4.5 py-4 text-xs sm:text-sm font-extrabold uppercase tracking-wider transition-all hover:bg-black/15 flex items-center gap-1.5 border-none bg-transparent ${
                      homeFilter === "followed" ? "bg-black/25 text-yellow-400 border-b-4 border-yellow-400 font-black" : "text-white"
                    }`}
                  >
                    <Heart className="w-4 h-4 text-rose-500 fill-rose-500/25" />
                    {language === "en" ? "Followed" : "Giải Đang Theo Dõi"}
                  </button>
                </>
              )}

              {!activeHistoryId && (
                <>
                  <button
                    onClick={() => {
                      changeTab("vsc_system_directory");
                    }}
                    className={`px-4.5 py-4 text-xs sm:text-sm font-extrabold uppercase tracking-wider transition-all hover:bg-black/15 flex items-center gap-1.5 border-none bg-transparent ${
                      activeTab === "vsc_system_directory" ? "bg-black/25 text-yellow-400 border-b-4 border-yellow-400 font-black" : "text-white"
                    }`}
                  >
                    <Users className="w-4 h-4 text-amber-300" />
                    {language === "en" ? "System Athletes" : "VĐV Hệ Thống"}
                  </button>

                  <button
                    onClick={() => {
                      changeTab("vsc_clubs_directory");
                    }}
                    className={`px-4.5 py-4 text-xs sm:text-sm font-extrabold uppercase tracking-wider transition-all hover:bg-black/15 flex items-center gap-1.5 border-none bg-transparent ${
                      activeTab === "vsc_clubs_directory" ? "bg-black/25 text-yellow-400 border-b-4 border-yellow-400 font-black" : "text-white"
                    }`}
                  >
                    <Users className="w-4 h-4 text-emerald-450" />
                    {language === "en" ? "System Clubs" : "CLB Hệ Thống"}
                  </button>
                </>
              )}

              {activeHistoryId && (
                <button
                  onClick={() => changeTab("dashboard")}
                  className={`px-4.5 py-4 text-xs sm:text-sm font-extrabold uppercase tracking-wider transition-all hover:bg-black/15 flex items-center gap-1.5 border-none bg-transparent ${
                    activeTab === "dashboard" ? "bg-black/25 text-yellow-400 border-b-4 border-yellow-400 font-black" : "text-white"
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  {language === "en" ? "Overview" : "Tổng Hợp"}
                </button>
              )}

              {/* NHẬP/GHI ĐIỂM DROPDOWN TAB */}
              {activeHistoryId && (userRole === "admin" || userRole === "referee") && (
                <div className="relative h-full flex items-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEntryDropdownOpen(!isEntryDropdownOpen);
                      setIsRankingDropdownOpen(false);
                    }}
                    className={`px-4.5 py-4 text-xs sm:text-sm font-extrabold uppercase tracking-wider transition-all hover:bg-black/15 flex items-center gap-1.5 cursor-pointer h-full border-none bg-transparent ${
                      activeTab === "input_scores" || activeTab === "scoring" ? "bg-black/25 text-yellow-400 border-b-4 border-yellow-400 font-black" : "text-white"
                    }`}
                  >
                    <ClipboardCheck className="w-4 h-4" />
                    <span>{language === "en" ? "Entry & Scoring" : "NHẬP/GHI ĐIỂM"}</span>
                    <ChevronDown className="w-3.5 h-3.5 transition-transform duration-200" style={{ transform: isEntryDropdownOpen ? "rotate(180deg)" : "none" }} />
                  </button>

                  {isEntryDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-1.5 min-w-[240px] z-50 flex flex-col font-sans text-left">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          changeTab("input_scores");
                          setIsEntryDropdownOpen(false);
                        }}
                        className={`px-4 py-2.5 text-xs sm:text-sm font-bold text-left flex items-center gap-2.5 transition-all hover:bg-slate-100 dark:hover:bg-slate-800 border-none bg-transparent ${
                          activeTab === "input_scores"
                            ? "text-blue-600 dark:text-blue-400 font-extrabold bg-blue-50/50 dark:bg-blue-950/30"
                            : "text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        <ClipboardCheck className="w-4 h-4 shrink-0 text-emerald-500" />
                        <span>
                          {competitionMode === "team" ? (language === "en" ? "Enter Team Scores" : "Nhập Điểm Team") : (language === "en" ? "Enter Scores" : "Nhập Điểm")}
                        </span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          changeTab("scoring");
                          setIsEntryDropdownOpen(false);
                        }}
                        className={`px-4 py-2.5 text-xs sm:text-sm font-bold text-left flex items-center gap-2.5 transition-all hover:bg-slate-100 dark:hover:bg-slate-800 border-none bg-transparent ${
                          activeTab === "scoring"
                            ? "text-blue-600 dark:text-blue-400 font-extrabold bg-blue-50/50 dark:bg-blue-950/30"
                            : "text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        <Target className="w-4 h-4 shrink-0 text-indigo-500" />
                        <span>
                          {competitionMode === "team" ? (language === "en" ? "Record Team Scores" : "Ghi Điểm Team") : (language === "en" ? "Record Scores" : "Ghi Điểm")}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* RANKING DROPDOWN TAB */}
              {activeHistoryId && (
                <div className="relative h-full flex items-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsRankingDropdownOpen(!isRankingDropdownOpen);
                      setIsEntryDropdownOpen(false);
                    }}
                    className={`px-4.5 py-4 text-xs sm:text-sm font-extrabold uppercase tracking-wider transition-all hover:bg-black/15 flex items-center gap-1.5 cursor-pointer h-full border-none bg-transparent ${
                      activeTab === "leaderboard" ? "bg-black/25 text-yellow-400 border-b-4 border-yellow-400 font-black" : "text-white"
                    }`}
                  >
                    <Trophy className="w-4 h-4" />
                    <span>Ranking</span>
                    <ChevronDown className="w-3.5 h-3.5 transition-transform duration-200" style={{ transform: isRankingDropdownOpen ? "rotate(180deg)" : "none" }} />
                  </button>

                  {isRankingDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-1.5 min-w-[240px] z-50 flex flex-col font-sans text-left">
                      {tournamentType === "combined" ? (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setCompetitionMode("individual");
                              localStorage.setItem("slingshot_competition_mode", "individual");
                              setRankingSubTab("individual");
                              setIsSpectatorModeOverridden(true);
                              changeTab("leaderboard");
                              setIsRankingDropdownOpen(false);
                            }}
                            className={`px-4 py-2.5 text-xs sm:text-sm font-bold text-left flex items-center gap-2.5 transition-all hover:bg-slate-100 dark:hover:bg-slate-800 border-none bg-transparent ${
                              activeTab === "leaderboard" && competitionMode === "individual" && rankingSubTab === "individual"
                                ? "text-blue-600 dark:text-blue-400 font-extrabold bg-blue-50/50 dark:bg-blue-950/30"
                                : "text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            <Trophy className="w-4 h-4 shrink-0 text-amber-500" />
                            <span>{language === "en" ? "Individual Standings" : "BXH Cá Nhân"}</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setCompetitionMode("team");
                              localStorage.setItem("slingshot_competition_mode", "team");
                              setRankingSubTab("team");
                              setIsSpectatorModeOverridden(true);
                              changeTab("leaderboard");
                              setIsRankingDropdownOpen(false);
                            }}
                            className={`px-4 py-2.5 text-xs sm:text-sm font-bold text-left flex items-center gap-2.5 transition-all hover:bg-slate-100 dark:hover:bg-slate-800 border-none bg-transparent ${
                              activeTab === "leaderboard" && competitionMode === "team" && rankingSubTab === "team"
                                ? "text-blue-600 dark:text-blue-400 font-extrabold bg-blue-50/50 dark:bg-blue-950/30"
                                : "text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            <Users className="w-4 h-4 shrink-0 text-blue-500" />
                            <span>{language === "en" ? "Club/Team Standings TEAM" : "BXH Đồng Đội TEAM"}</span>
                          </button>
                        </>
                      ) : tournamentType === "team" ? (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setCompetitionMode("team");
                              localStorage.setItem("slingshot_competition_mode", "team");
                              setRankingSubTab("individual");
                              setIsSpectatorModeOverridden(true);
                              changeTab("leaderboard");
                              setIsRankingDropdownOpen(false);
                            }}
                            className={`px-4 py-2.5 text-xs sm:text-sm font-bold text-left flex items-center gap-2.5 transition-all hover:bg-slate-100 dark:hover:bg-slate-800 border-none bg-transparent ${
                              activeTab === "leaderboard" && competitionMode === "team" && rankingSubTab === "individual"
                                ? "text-blue-600 dark:text-blue-400 font-extrabold bg-blue-50/50 dark:bg-blue-950/30"
                                : "text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            <Trophy className="w-4 h-4 shrink-0 text-amber-500" />
                            <span>{language === "en" ? "Individual Standings TEAM" : "BXH Cá Nhân TEAM"}</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setCompetitionMode("team");
                              localStorage.setItem("slingshot_competition_mode", "team");
                              setRankingSubTab("team");
                              setIsSpectatorModeOverridden(true);
                              changeTab("leaderboard");
                              setIsRankingDropdownOpen(false);
                            }}
                            className={`px-4 py-2.5 text-xs sm:text-sm font-bold text-left flex items-center gap-2.5 transition-all hover:bg-slate-100 dark:hover:bg-slate-800 border-none bg-transparent ${
                              activeTab === "leaderboard" && competitionMode === "team" && rankingSubTab === "team"
                                ? "text-blue-600 dark:text-blue-400 font-extrabold bg-blue-50/50 dark:bg-blue-950/30"
                                : "text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            <Users className="w-4 h-4 shrink-0 text-blue-500" />
                            <span>{language === "en" ? "Club/Team Standings TEAM" : "BXH Đồng Đội TEAM"}</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setCompetitionMode("individual");
                              localStorage.setItem("slingshot_competition_mode", "individual");
                              setRankingSubTab("individual");
                              setIsSpectatorModeOverridden(true);
                              changeTab("leaderboard");
                              setIsRankingDropdownOpen(false);
                            }}
                            className={`px-4 py-2.5 text-xs sm:text-sm font-bold text-left flex items-center gap-2.5 transition-all hover:bg-slate-100 dark:hover:bg-slate-800 border-none bg-transparent ${
                              activeTab === "leaderboard" && competitionMode === "individual" && rankingSubTab === "individual"
                                ? "text-blue-600 dark:text-blue-400 font-extrabold bg-blue-50/50 dark:bg-blue-950/30"
                                : "text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            <Trophy className="w-4 h-4 shrink-0 text-amber-500" />
                            <span>{language === "en" ? "Individual Standings" : "BXH Cá Nhân"}</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setCompetitionMode("individual");
                              localStorage.setItem("slingshot_competition_mode", "individual");
                              setRankingSubTab("team");
                              setIsSpectatorModeOverridden(true);
                              changeTab("leaderboard");
                              setIsRankingDropdownOpen(false);
                            }}
                            className={`px-4 py-2.5 text-xs sm:text-sm font-bold text-left flex items-center gap-2.5 transition-all hover:bg-slate-100 dark:hover:bg-slate-800 border-none bg-transparent ${
                              activeTab === "leaderboard" && competitionMode === "individual" && rankingSubTab === "team"
                                ? "text-blue-600 dark:text-blue-400 font-extrabold bg-blue-50/50 dark:bg-blue-950/30"
                                : "text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            <Users className="w-4 h-4 shrink-0 text-blue-500" />
                            <span>{language === "en" ? "Club/Team Standings" : "BXH Đồng Đội"}</span>
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeHistoryId && userRole === "admin" && (
                <button
                  onClick={() => {
                    changeTab("settings");
                    setSettingsSubTab("config");
                  }}
                  className={`px-4.5 py-4 text-xs sm:text-sm font-extrabold uppercase tracking-wider transition-all hover:bg-black/15 flex items-center gap-1.5 border-none bg-transparent ${
                    activeTab === "settings" && settingsSubTab === "config" ? "bg-black/25 text-yellow-400 border-b-4 border-yellow-400 font-black" : "text-white"
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  {language === "en" ? "Settings" : "Cài Đặt"}
                </button>
              )}

              {userRole === "admin" && (
                <button
                  onClick={() => changeTab("history")}
                  className={`px-4.5 py-4 text-xs sm:text-sm font-extrabold uppercase tracking-wider transition-all hover:bg-black/15 flex items-center gap-1.5 relative border-none bg-transparent ${
                    activeTab === "history" ? "bg-black/25 text-yellow-400 border-b-4 border-yellow-400 font-black" : "text-white"
                  }`}
                >
                  <History className="w-4 h-4" />
                  {language === "en" ? "Backups" : "Lịch Sử"}
                  {history.length > 0 && (
                    <span className="absolute top-2 right-1.5 bg-amber-500 text-white border border-[#9c0c13] rounded-full text-[8px] font-bold w-3.5 h-3.5 flex items-center justify-center font-sans">
                      {history.length}
                    </span>
                  )}
                </button>
              )}

              {isGlobalAdmin && (
                <button
                  onClick={() => changeTab("qltv")}
                  className={`px-4.5 py-4 text-xs sm:text-sm font-extrabold uppercase tracking-wider transition-all hover:bg-black/15 flex items-center gap-1.5 relative border-none bg-transparent ${
                    activeTab === "qltv" ? "bg-black/25 text-yellow-400 border-b-4 border-yellow-400 font-black" : "text-white"
                  }`}
                >
                  <Users className="w-4 h-4 text-amber-300" />
                  QLTV
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Header Bar (visible only on mobile/tablet) */}
      <div className="flex md:hidden bg-[#9c0c13] text-white h-16 items-center justify-between px-4 sticky top-0 z-[100] border-b border-red-800 shadow-md">
        {/* Left Side: 3-bar menu icon */}
        <div className="flex items-center">
          <button
            onClick={() => setIsMobileDrawerOpen(true)}
            className="fixed top-3 left-3 z-[150] p-2 bg-[#9c0c13] text-white rounded-full shadow-lg border border-red-700 hover:bg-[#850a0f] active:scale-95 transition-all cursor-pointer flex items-center justify-center w-10 h-10"
            id="mobile-floating-menu-btn"
          >
            <Menu className="w-5.5 h-5.5 text-white" />
          </button>
          {/* Spacer to preserve layout structure when menu is positioned fixed */}
          <div className="w-10 h-10" />
          <div className="h-6 w-[1px] bg-white/20 ml-2" />
        </div>

        {/* Center Side: Logo and Title */}
        <div 
          onClick={() => changeExitTournament("all")} 
          className="flex items-center gap-2.5 cursor-pointer select-none"
        >
          <div className="bg-white/10 p-1.5 rounded-full border border-white/20 shrink-0">
            <VSCLogo size={24} />
          </div>
          <div className="flex flex-col items-center">
            <span className="font-extrabold tracking-tight text-white text-[15px] italic uppercase leading-none">
              VSCS<span className="text-yellow-450">.ASIA</span>
            </span>
            <span className="text-[8px] text-white/80 font-medium tracking-wide mt-0.5">
              Hệ thống giải đấu VSC
            </span>
          </div>
        </div>

        {/* Right Side: Profile drop-down */}
        <div className="relative" id="user-header-menu-container-mobile">
          {currentUser ? (
            <button
              type="button"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-1 bg-black/15 py-1.5 px-2.5 rounded-lg border border-white/10 text-white font-bold cursor-pointer hover:bg-black/25 active:scale-95 transition-all text-xs border-none"
            >
              <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-[9px] text-white font-black uppercase shrink-0">
                {currentUser.displayName?.[0] || currentUser.email?.[0] || "U"}
              </div>
              <ChevronDown className="w-3 h-3 text-zinc-350 shrink-0" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-1 bg-black/15 py-1.5 px-2.5 rounded-lg border border-white/10 text-white font-bold cursor-pointer hover:bg-black/25 active:scale-95 transition-all text-xs uppercase border-none"
            >
              <User className="w-3.5 h-3.5 text-white" />
              <ChevronDown className="w-3 h-3 text-zinc-350 shrink-0" />
            </button>
          )}

          {/* Mobile User Dropdown menu overlay */}
          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-905 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl z-50 p-1 flex flex-col text-slate-700 dark:text-slate-200 text-left">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("control_panel");
                  setControlPanelSubTab("profile");
                  setIsUserMenuOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 text-xs font-bold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex items-center gap-2 cursor-pointer border-none bg-transparent"
              >
                👤 {language === "en" ? "My Athlete Bio" : "Hồ Sơ VĐV của Tôi"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("control_panel");
                  setControlPanelSubTab("created");
                  setIsUserMenuOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 text-xs font-bold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex items-center gap-2 cursor-pointer border-none bg-transparent"
              >
                🏆 {language === "en" ? "My Created Tournaments" : "Giải Tôi Tạo"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("control_panel");
                  setControlPanelSubTab("referee");
                  setIsUserMenuOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 text-xs font-bold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex items-center gap-2 cursor-pointer border-none bg-transparent"
              >
                ⏱️ {language === "en" ? "Tournaments I Referee" : "Giải Tôi Làm Trọng Tài"}
              </button>
              <div className="border-t border-slate-100 dark:border-slate-800 my-1" />
              <button
                type="button"
                onClick={() => {
                  auth.signOut();
                  setIsUserMenuOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors flex items-center gap-2 cursor-pointer border-none bg-transparent"
              >
                🚪 {language === "en" ? "Logout" : "Thoát"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 3Gach Mobile Sidebar Drawer Menu */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-[99998] md:hidden">
          {/* Backdrop Overlay */}
          <div 
            className="fixed inset-0 bg-slate-950/65 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setIsMobileDrawerOpen(false)}
          />

          {/* Drawer Panel content */}
          <div className="fixed top-0 left-0 bottom-0 w-[280px] max-w-[85vw] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-2xl z-[99999] flex flex-col animate-slideInLeft text-left">
            {/* Drawer Header */}
            <div className="p-4 bg-[#9c0c13] text-white flex items-center justify-between">
              <div className="flex items-center gap-2 select-none">
                <VSCLogo size={24} />
                <span className="font-extrabold text-[15px] italic">VSC MENU</span>
              </div>
              <button 
                onClick={() => setIsMobileDrawerOpen(false)}
                className="p-1 rounded-full hover:bg-black/10 transition-colors cursor-pointer border-none bg-transparent"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Drawer Items - Scrollable content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              
              {/* Category 1: Navigation */}
              <div className="space-y-1">
                <div className="text-[10px] font-black tracking-wider text-slate-400 dark:text-slate-500 uppercase px-2 mb-1">
                  {language === "en" ? "SYSTEM PORTAL" : "HỆ THỐNG CHÍNH"}
                </div>
                
                {/* Home link */}
                <button
                  onClick={() => {
                    changeExitTournament("all");
                    setIsMobileDrawerOpen(false);
                  }}
                  className={`w-full px-3 py-2.5 rounded-lg text-xs font-extrabold flex items-center gap-3 transition-all border-none bg-transparent ${
                    activeTab === "home" && homeFilter === "all"
                      ? "bg-red-50 text-[#9c0c13] dark:bg-red-950/20 dark:text-red-400"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <Home className="w-4 h-4 shrink-0" />
                  <span>{language === "en" ? "Home Portal" : "Trang Chủ VSC"}</span>
                </button>

                {/* Live Tournaments */}
                <button
                  onClick={() => {
                    changeExitTournament("active");
                    setIsMobileDrawerOpen(false);
                  }}
                  className={`w-full px-3 py-2.5 rounded-lg text-xs font-extrabold flex items-center gap-3 transition-all border-none bg-transparent ${
                    activeTab === "home" && homeFilter === "active"
                      ? "bg-red-50 text-[#9c0c13] dark:bg-red-950/20 dark:text-red-400"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <Play className="w-4 h-4 shrink-0 text-emerald-500" />
                  <span>{language === "en" ? "Live Tournaments" : "Giải Đang Diễn Ra"}</span>
                </button>

                {/* Followed Tournaments */}
                <button
                  onClick={() => {
                    changeExitTournament("followed");
                    setIsMobileDrawerOpen(false);
                  }}
                  className={`w-full px-3 py-2.5 rounded-lg text-xs font-extrabold flex items-center gap-3 transition-all border-none bg-transparent ${
                    activeTab === "home" && homeFilter === "followed"
                      ? "bg-red-50 text-[#9c0c13] dark:bg-red-950/20 dark:text-red-400"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <Heart className="w-4 h-4 shrink-0 text-rose-500 fill-rose-500/10" />
                  <span>{language === "en" ? "Followed Tournaments" : "Giải Đang Theo Dõi"}</span>
                </button>

                {!activeHistoryId && (
                  <>
                    {/* VSC System Athletes Directory */}
                    <button
                      onClick={() => {
                        changeTab("vsc_system_directory");
                        setIsMobileDrawerOpen(false);
                      }}
                      className={`w-full px-3 py-2.5 rounded-lg text-xs font-extrabold flex items-center gap-3 transition-all border-none bg-transparent ${
                        activeTab === "vsc_system_directory"
                          ? "bg-red-50 text-[#9c0c13] dark:bg-red-950/20 dark:text-red-400"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      }`}
                    >
                      <Users className="w-4 h-4 shrink-0 text-amber-500" />
                      <span>{language === "en" ? "System Athletes" : "VĐV Hệ Thống"}</span>
                    </button>

                    {/* VSC System Clubs */}
                    <button
                      onClick={() => {
                        changeTab("vsc_clubs_directory");
                        setIsMobileDrawerOpen(false);
                      }}
                      className={`w-full px-3 py-2.5 rounded-lg text-xs font-extrabold flex items-center gap-3 transition-all border-none bg-transparent ${
                        activeTab === "vsc_clubs_directory"
                          ? "bg-red-50 text-[#9c0c13] dark:bg-red-950/20 dark:text-red-400"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      }`}
                    >
                      <Users className="w-4 h-4 shrink-0 text-emerald-500" />
                      <span>{language === "en" ? "System Clubs" : "CLB Hệ Thống"}</span>
                    </button>
                  </>
                )}

                {/* Create Tournament */}
                <button
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    if (activeHistoryId) {
                      if (hasUnsavedChanges) {
                        setPendingTabTarget({ type: "exit", value: "all" });
                        setIsUnsavedModalOpen(true);
                        return;
                      }
                      handleExitTournament();
                    }
                    setActiveTab("settings");
                    setSettingsSubTab("config");
                    setIsNewTournamentModalOpen(true);
                  }}
                  className="w-full px-3 py-2.5 rounded-lg text-xs font-extrabold flex items-center gap-3 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all border-none bg-transparent"
                >
                  <Plus className="w-4 h-4 shrink-0 text-amber-500" />
                  <span>{language === "en" ? "Create Tournament" : "Tạo Giải Đấu Mới"}</span>
                </button>
              </div>

              {/* Category 2: Active Tournament (if loaded) */}
              {activeHistoryId && (
                <div className="space-y-1 pt-3 border-t border-slate-100 dark:border-slate-800/50">
                  <div className="text-[10px] font-black tracking-wider text-slate-400 dark:text-slate-500 uppercase px-2 mb-1">
                    {language === "en" ? "ACTIVE TOURNAMENT" : "GIẢI ĐANG CHỌN"}
                  </div>

                  {/* Overview */}
                  <button
                    onClick={() => {
                      changeTab("dashboard");
                      setIsMobileDrawerOpen(false);
                    }}
                    className={`w-full px-3 py-2.5 rounded-lg text-xs font-extrabold flex items-center gap-3 transition-all border-none bg-transparent ${
                      activeTab === "dashboard"
                        ? "bg-red-50 text-[#9c0c13] dark:bg-red-950/20 dark:text-red-400"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    <TrendingUp className="w-4 h-4 shrink-0" />
                    <span>{language === "en" ? "Dashboard Hub" : "Tổng Hợp Trận Đấu"}</span>
                  </button>

                  {/* Leaderboards */}
                  <div>
                    <button
                      onClick={() => {
                        changeTab("leaderboard");
                        setIsMobileRankingExpanded(!isMobileRankingExpanded);
                      }}
                      className={`w-full px-3 py-2.5 rounded-lg text-xs font-extrabold flex items-center justify-between transition-all border-none bg-transparent ${
                        activeTab === "leaderboard"
                          ? "bg-red-50 text-[#9c0c13] dark:bg-red-950/20 dark:text-red-400"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Trophy className="w-4 h-4 shrink-0 text-amber-550" />
                        <span>{language === "en" ? "Ranking Standings" : "Bảng Xếp Hạng"}</span>
                      </div>
                      <ChevronDown className="w-3.5 h-3.5 transition-transform duration-200" style={{ transform: isMobileRankingExpanded ? "rotate(180deg)" : "none" }} />
                    </button>

                    {/* Sub-menu options (Chẻ nhánh) */}
                    {isMobileRankingExpanded && (
                      <div className="mt-1 ml-4 pl-3 border-l border-slate-100 dark:border-slate-800 space-y-1">
                        {tournamentType === "combined" ? (
                          <>
                            {/* Option 1: Thi Đấu Cá Nhân */}
                            <button
                              onClick={() => {
                                setCompetitionMode("individual");
                                localStorage.setItem("slingshot_competition_mode", "individual");
                                setRankingSubTab("individual");
                                setIsSpectatorModeOverridden(true);
                                changeTab("leaderboard");
                                setIsMobileDrawerOpen(false);
                              }}
                              className={`w-full px-3 py-2 rounded-md text-[11px] font-bold flex items-center gap-2 transition-all border-none bg-transparent ${
                                activeTab === "leaderboard" && competitionMode === "individual" && rankingSubTab === "individual"
                                  ? "text-blue-650 dark:text-blue-405 font-extrabold bg-blue-50/40"
                                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                              }`}
                            >
                              <Trophy className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                              <span>{language === "en" ? "Individual Standings" : "Thi Đấu Cá Nhân"}</span>
                            </button>

                            {/* Option 2: Thi Đấu Đồng Đội */}
                            <button
                              onClick={() => {
                                setCompetitionMode("team");
                                localStorage.setItem("slingshot_competition_mode", "team");
                                setRankingSubTab("team");
                                setIsSpectatorModeOverridden(true);
                                changeTab("leaderboard");
                                setIsMobileDrawerOpen(false);
                              }}
                              className={`w-full px-3 py-2 rounded-md text-[11px] font-bold flex items-center gap-2 transition-all border-none bg-transparent ${
                                activeTab === "leaderboard" && competitionMode === "team" && rankingSubTab === "team"
                                  ? "text-blue-650 dark:text-blue-405 font-extrabold bg-blue-50/40"
                                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                              }`}
                            >
                              <Users className="w-3.5 h-3.5 shrink-0 text-blue-500" />
                              <span>{language === "en" ? "Club/Team Standings" : "Thi Đấu Đồng Đội"}</span>
                            </button>
                          </>
                        ) : tournamentType === "team" ? (
                          <>
                            <button
                              onClick={() => {
                                setCompetitionMode("team");
                                localStorage.setItem("slingshot_competition_mode", "team");
                                setRankingSubTab("individual");
                                setIsSpectatorModeOverridden(true);
                                changeTab("leaderboard");
                                setIsMobileDrawerOpen(false);
                              }}
                              className={`w-full px-3 py-2 rounded-md text-[11px] font-bold flex items-center gap-2 transition-all border-none bg-transparent ${
                                activeTab === "leaderboard" && competitionMode === "team" && rankingSubTab === "individual"
                                  ? "text-blue-650 dark:text-blue-405 font-extrabold bg-blue-50/40"
                                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                              }`}
                            >
                              <Trophy className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                              <span>{language === "en" ? "Individual Standings TEAM" : "Cá Nhân TEAM"}</span>
                            </button>

                            <button
                              onClick={() => {
                                setCompetitionMode("team");
                                localStorage.setItem("slingshot_competition_mode", "team");
                                setRankingSubTab("team");
                                setIsSpectatorModeOverridden(true);
                                changeTab("leaderboard");
                                setIsMobileDrawerOpen(false);
                              }}
                              className={`w-full px-3 py-2 rounded-md text-[11px] font-bold flex items-center gap-2 transition-all border-none bg-transparent ${
                                activeTab === "leaderboard" && competitionMode === "team" && rankingSubTab === "team"
                                  ? "text-blue-650 dark:text-blue-405 font-extrabold bg-blue-50/40"
                                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                              }`}
                            >
                              <Users className="w-3.5 h-3.5 shrink-0 text-blue-500" />
                              <span>{language === "en" ? "Club/Team Standings TEAM" : "Đồng Đội TEAM"}</span>
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setCompetitionMode("individual");
                                localStorage.setItem("slingshot_competition_mode", "individual");
                                setRankingSubTab("individual");
                                setIsSpectatorModeOverridden(true);
                                changeTab("leaderboard");
                                setIsMobileDrawerOpen(false);
                              }}
                              className={`w-full px-3 py-2 rounded-md text-[11px] font-bold flex items-center gap-2 transition-all border-none bg-transparent ${
                                activeTab === "leaderboard" && competitionMode === "individual" && rankingSubTab === "individual"
                                  ? "text-blue-650 dark:text-blue-405 font-extrabold bg-blue-50/40"
                                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                              }`}
                            >
                              <Trophy className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                              <span>{language === "en" ? "Individual Standings" : "Thi Đấu Cá Nhân"}</span>
                            </button>

                            <button
                              onClick={() => {
                                setCompetitionMode("individual");
                                localStorage.setItem("slingshot_competition_mode", "individual");
                                setRankingSubTab("team");
                                setIsSpectatorModeOverridden(true);
                                changeTab("leaderboard");
                                setIsMobileDrawerOpen(false);
                              }}
                              className={`w-full px-3 py-2 rounded-md text-[11px] font-bold flex items-center gap-2 transition-all border-none bg-transparent ${
                                activeTab === "leaderboard" && competitionMode === "individual" && rankingSubTab === "team"
                                  ? "text-blue-650 dark:text-blue-405 font-extrabold bg-blue-50/40"
                                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                              }`}
                            >
                              <Users className="w-3.5 h-3.5 shrink-0 text-blue-500" />
                              <span>{language === "en" ? "Club/Team Standings" : "Thi Đấu Đồng Đội"}</span>
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Scoring & Entries for Admins/Referees */}
                  {(userRole === "admin" || userRole === "referee") && (
                    <div className="space-y-1">
                      {/* Entry Board */}
                      <button
                        onClick={() => {
                          changeTab("input_scores");
                          setIsMobileDrawerOpen(false);
                        }}
                        className={`w-full px-3 py-2.5 rounded-lg text-xs font-extrabold flex items-center gap-3 transition-all border-none bg-transparent ${
                          activeTab === "input_scores"
                            ? "bg-red-50 text-[#9c0c13] dark:bg-red-950/20 dark:text-red-400"
                            : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        }`}
                      >
                        <ClipboardCheck className="w-4 h-4 shrink-0 text-emerald-500" />
                        <span>
                          {competitionMode === "team" ? (language === "en" ? "Enter Team Scores" : "Nhập Điểm Team") : (language === "en" ? "Enter Scores" : "Nhập Điểm")}
                        </span>
                      </button>

                      {/* Ghi Điểm */}
                      <button
                        onClick={() => {
                          changeTab("scoring");
                          setIsMobileDrawerOpen(false);
                        }}
                        className={`w-full px-3 py-2.5 rounded-lg text-xs font-extrabold flex items-center gap-3 transition-all border-none bg-transparent ${
                          activeTab === "scoring"
                            ? "bg-red-50 text-[#9c0c13] dark:bg-red-950/20 dark:text-red-400"
                            : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        }`}
                      >
                        <Target className="w-4 h-4 shrink-0 text-indigo-500" />
                        <span>
                          {competitionMode === "team" ? (language === "en" ? "Record Team Scores" : "Ghi Điểm Team") : (language === "en" ? "Record Scores" : "Ghi Điểm")}
                        </span>
                      </button>
                    </div>
                  )}

                  {/* Configuration Settings (Admins only) */}
                  {userRole === "admin" && (
                    <button
                      onClick={() => {
                        changeTab("settings");
                        setSettingsSubTab("config");
                        setIsMobileDrawerOpen(false);
                      }}
                      className={`w-full px-3 py-2.5 rounded-lg text-xs font-extrabold flex items-center gap-3 transition-all border-none bg-transparent ${
                        activeTab === "settings" && settingsSubTab === "config"
                          ? "bg-red-50 text-[#9c0c13] dark:bg-red-950/20 dark:text-red-400"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      }`}
                    >
                      <Settings className="w-4 h-4 shrink-0 text-amber-500" />
                      <span>{language === "en" ? "Settings" : "Cấu Hình & Tham Số"}</span>
                    </button>
                  )}

                  {/* Exit current tournament */}
                  <button
                    onClick={() => {
                      setIsMobileDrawerOpen(false);
                      if (hasUnsavedChanges) {
                        setPendingTabTarget({ type: "exit", value: "all" });
                        setIsUnsavedModalOpen(true);
                        return;
                      }
                      handleExitTournament();
                    }}
                    className="w-full px-3 py-2.5 rounded-lg text-xs font-extrabold flex items-center gap-3 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/10 transition-all border-none bg-transparent"
                  >
                    <X className="w-4 h-4 shrink-0" />
                    <span>{language === "en" ? "Exit Tournament" : "Thoát Trận Hiện Tại"}</span>
                  </button>
                </div>
              )}

              {/* Category 3: Settings & Lang */}
              <div className="space-y-1 pt-3 border-t border-slate-100 dark:border-slate-800/50">
                <div className="text-[10px] font-black tracking-wider text-slate-400 dark:text-slate-500 uppercase px-2 mb-1">
                  {language === "en" ? "PREFERENCES" : "CÁ NHÂN HÓA"}
                </div>

                {/* QLTV for Global Admins */}
                {isGlobalAdmin && (
                  <button
                    onClick={() => {
                      changeTab("qltv");
                      setIsMobileDrawerOpen(false);
                    }}
                    className={`w-full px-3 py-2.5 rounded-lg text-xs font-extrabold flex items-center gap-3 transition-all border-none bg-transparent ${
                      activeTab === "qltv"
                        ? "bg-red-50 text-[#9c0c13] dark:bg-red-950/20 dark:text-red-400"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    <Users className="w-4 h-4 shrink-0 text-amber-300" />
                    <span>QLTV (Global Admin)</span>
                  </button>
                )}

                {/* My Bio */}
                <button
                  onClick={() => {
                    if (currentUser) {
                      setActiveTab("control_panel");
                      setControlPanelSubTab("profile");
                    } else {
                      setIsAuthModalOpen(true);
                    }
                    setIsMobileDrawerOpen(false);
                  }}
                  className={`w-full px-3 py-2.5 rounded-lg text-xs font-extrabold flex items-center gap-3 transition-all border-none bg-transparent ${
                    activeTab === "control_panel" && controlPanelSubTab === "profile"
                      ? "bg-red-50 text-[#9c0c13] dark:bg-red-950/20 dark:text-red-400"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <User className="w-4 h-4 shrink-0 text-emerald-500" />
                  <span>{language === "en" ? "My Bio & History" : "Hồ Sơ & Lịch Sử VĐV"}</span>
                </button>

                {/* Logged in User actions */}
                {currentUser && (
                  <>
                    <button
                      onClick={() => {
                        setActiveTab("control_panel");
                        setControlPanelSubTab("created");
                        setIsMobileDrawerOpen(false);
                      }}
                      className={`w-full px-3 py-2.5 rounded-lg text-xs font-extrabold flex items-center gap-3 transition-all border-none bg-transparent ${
                        activeTab === "control_panel" && controlPanelSubTab === "created"
                          ? "bg-red-50 text-[#9c0c13] dark:bg-red-950/20 dark:text-red-400"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      }`}
                    >
                      <Trophy className="w-4 h-4 shrink-0 text-blue-500" />
                      <span>{language === "en" ? "My Created Tournaments" : "Giải Tôi Đã Tạo"}</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab("control_panel");
                        setControlPanelSubTab("referee");
                        setIsMobileDrawerOpen(false);
                      }}
                      className={`w-full px-3 py-2.5 rounded-lg text-xs font-extrabold flex items-center gap-3 transition-all border-none bg-transparent ${
                        activeTab === "control_panel" && controlPanelSubTab === "referee"
                          ? "bg-red-50 text-[#9c0c13] dark:bg-red-950/20 dark:text-red-400"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      }`}
                    >
                      <ClipboardCheck className="w-4 h-4 shrink-0 text-amber-500" />
                      <span>{language === "en" ? "Tournaments I Referee" : "Giải Tôi Làm Trọng Tài"}</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Language Selector inside Mobile Drawer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-905 flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {language === "en" ? "Select Language" : "Chọn Ngôn Ngữ"}
              </span>
              <div className="flex gap-1.5 bg-slate-200/50 dark:bg-slate-800 p-0.5 rounded-lg">
                <button
                  onClick={() => setLanguage("vi")}
                  className={`px-2.5 py-1 rounded text-[10px] font-black border-none cursor-pointer ${
                    language === "vi" ? "bg-[#9c0c13] text-white shadow-sm" : "text-slate-500 dark:text-slate-400 bg-transparent"
                  }`}
                >
                  VIE
                </button>
                <button
                  onClick={() => setLanguage("en")}
                  className={`px-2.5 py-1 rounded text-[10px] font-black border-none cursor-pointer ${
                    language === "en" ? "bg-[#9c0c13] text-white shadow-sm" : "text-slate-500 dark:text-slate-400 bg-transparent"
                  }`}
                >
                  ENG
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Hero Banner Background (below header, visible ONLY on "home" screen) */}
      <HeroBanner activeTab={activeTab} onlineTournaments={onlineTournaments} />
    </header>
  );
}
