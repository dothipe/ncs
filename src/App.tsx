import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { 
  Plus, 
  Check,
  AlertTriangle,
  Wifi,
  WifiOff,
  RefreshCw, 
  Target, 
  Trophy, 
  Settings, 
  History, 
  UserPlus, 
  Trash2, 
  Save, 
  Undo2, 
  Search, 
  RotateCcw, 
  HelpCircle,
  Sparkles,
  Info,
  Shield,
  Users,
  User,
  Globe,
  X,
  TrendingUp,
  ClipboardCheck,
  Youtube,
  Facebook,
  Share2,
  Lock,
  Unlock,
  Eye,
  Tv,
  CloudUpload,
  LayoutDashboard
} from "lucide-react";
import { DistanceConfig, Athlete, MatchHistoryItem, StoredAthleteList, Club, VSC_DEFAULT_LOGO } from "./types";
import { useLanguage } from "./context/LanguageContext";
import { AthleteCard } from "./components/AthleteCard";
import { Leaderboard } from "./components/Leaderboard";
import { ScoringWorkspace } from "./components/ScoringWorkspace";
import { InputScoresWorkspace } from "./components/InputScoresWorkspace";
import { TeamLeaderboard } from "./components/TeamLeaderboard";
import { AthleteManagement } from "./components/AthleteManagement";
import { SettingsPanel } from "./components/SettingsPanel";
import { HistoryPanel } from "./components/HistoryPanel";
import { MainDashboard } from "./components/MainDashboard";
import { ExportModal } from "./components/ExportModal";
import { LiveBoard } from "./components/LiveBoard";
import { VSCLogo, SlingshotIcon } from "./components/VSCLogo";

// Firebase imports
import { auth, db, doc, onSnapshot } from "./firebase";
import { subscribeToTournamentDoc, updateOnlineTournament, TournamentData, subscribeToTournamentsList, createOnlineTournament, subscribeToVscSystemClubs, saveVscSystemClub, deleteVscSystemClub, getFriendlyErrorMessage, subscribeToVscSystemAthletes } from "./lib/firebaseService";
import { AthleteProfileModal } from "./components/AthleteProfileModal";
import { AuthModal } from "./components/AuthModal";
import { OnlineTournamentsPanel } from "./components/OnlineTournamentsPanel";
import { ControlPanel } from "./components/ControlPanel";
import { MemberManagementPanel } from "./components/MemberManagementPanel";
import { VscSystemDirectory } from "./components/VscSystemDirectory";
import { VscSystemClubsDirectory } from "./components/VscSystemClubsDirectory";
import { PublishDraftModal } from "./components/PublishDraftModal";
import { HeaderNavigation } from "./components/HeaderNavigation";
import { MobileBottomNav } from "./components/MobileBottomNav";
import { SportiveFooter } from "./components/SportiveFooter";
import { LeaderboardView } from "./components/LeaderboardView";
import { SettingsView } from "./components/SettingsView";
import { HomeView } from "./components/HomeView";
import { DashboardView } from "./components/DashboardView";
import { HistoryView } from "./components/HistoryView";
import { AdminQltvView } from "./components/AdminQltvView";
import { PkLobbyView } from "./components/PkLobbyView";
import { DirectMessageWidget } from "./components/DirectMessageWidget";
import {
  CompetitionModeSelectionModal,
  MobileRankingSelectionModal,
  UnlockScoreModal,
  ExitTournamentConfirmModal,
  ExitAndCreateTournamentConfirmModal,
  SwitchTournamentConfirmModal,
  SaveScoresConfirmModal,
  SaveSingleAthleteConfirmModal,
  UnsavedScoresWarningModal
} from "./components/TournamentModals";
import { Home, LogOut, Sliders, SlidersHorizontal, ChevronDown, Play, Heart, Menu } from "lucide-react";
import {
  DEFAULT_DISTANCES,
  DEFAULT_SHOTS_COUNT,
  DEFAULT_ATHLETES,
  DEFAULT_HISTORY,
  DEFAULT_STORED_LISTS,
} from "./initialData";
import { deviceStorage } from "./lib/storage";
import {
  saveAvatarsFromAthletes,
  stripBase64Avatars,
  restoreBase64Avatars,
  deepEqual,
  isTournamentEndedPast30Days
} from "./utils/avatarHelpers";
import { useOfflineSync } from "./hooks/useOfflineSync";
import { useTournamentCalculations } from "./hooks/useTournamentCalculations";
import { useTournamentDatabase } from "./hooks/useTournamentDatabase";

// PublishDraftModal is imported from "./components/PublishDraftModal"

export default function App() {
  const { language, setLanguage, t } = useLanguage();
  const [isStorageRestoring, setIsStorageRestoring] = useState(true);
  const [isNewTournamentModalOpen, setIsNewTournamentModalOpen] = useState(false);

  // --- States with clean default values (all persisted state is fully loaded from online Firestore) ---
  const [matchName, setMatchName] = useState<string>("Giải Vô Địch Bắn Ná Slingshot 2026");

  const [startDate, setStartDate] = useState<string>("");

  const [endDate, setEndDate] = useState<string>("");

  const [bannerUrl, setBannerUrl] = useState<string>("");

  const [avatarUrl, setAvatarUrl] = useState<string>("");

  const [headerTempName, setHeaderTempName] = useState<string>(matchName);

  const restoreAllData = async () => {
    try {
      let urlTourParam: string | null = null;
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        urlTourParam = params.get("tour") || params.get("id");
      }

      if (urlTourParam && urlTourParam.startsWith("tour-")) {
        setActiveHistoryId(urlTourParam);
      }
    } catch (e) {
      console.error("Critical error during online parameter parsing:", e);
    } finally {
      setIsStorageRestoring(false);
    }
  };

  useEffect(() => {
    restoreAllData();
  }, []);

  useEffect(() => {
    setHeaderTempName(matchName);
  }, [matchName]);

  const handleSaveHeaderMatchName = () => {
    const trimmed = headerTempName.trim();
    if (!trimmed) return;

    const oldName = matchName.trim();
    if (oldName && oldName.toLowerCase() !== trimmed.toLowerCase()) {
      setStoredAthleteLists((prev) => {
        return prev.map((item) => {
          if (item.name.trim().toLowerCase() === oldName.toLowerCase()) {
            return {
              ...item,
              name: trimmed,
            };
          }
          return item;
        });
      });

      setHistory((prev) => {
        return prev.map((item) => {
          if (item.matchName.trim().toLowerCase() === oldName.toLowerCase()) {
            return {
              ...item,
              matchName: trimmed,
            };
          }
          return item;
        });
      });
    }

    setMatchName(trimmed);
  };

  const [distances, setDistances] = useState<DistanceConfig[]>(() => {
    return JSON.parse(JSON.stringify(DEFAULT_DISTANCES));
  });

  const [shotsCount, setShotsCount] = useState<number>(DEFAULT_SHOTS_COUNT);

  const [athletes, setAthletes] = useState<Athlete[]>([]);

  const [competitionMode, setCompetitionMode] = useState<"individual" | "team">(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const modeParam = params.get("mode") || params.get("competitionMode");
      if (modeParam === "individual" || modeParam === "team") {
        return modeParam;
      }
    }
    return "individual";
  });

  const [tournamentType, setTournamentType] = useState<"individual" | "team" | "combined">("combined");

  useEffect(() => {
    if (tournamentType === "individual" && competitionMode !== "individual") {
      setCompetitionMode("individual");
    } else if (tournamentType === "team" && competitionMode !== "team") {
      setCompetitionMode("team");
    }
  }, [tournamentType, competitionMode]);

  const [isSpectatorModeOverridden, setIsSpectatorModeOverridden] = useState(false);
  const isSpectatorModeOverriddenRef = useRef(false);
  const loadedTournamentIdRef = useRef<string | null>(null);
  useEffect(() => {
    isSpectatorModeOverriddenRef.current = isSpectatorModeOverridden;
  }, [isSpectatorModeOverridden]);

  const {
    networkStatus,
    setNetworkStatus,
    isFirebaseQuotaExceeded,
    setIsFirebaseQuotaExceeded,
    dbHasPendingWrites,
    setDbHasPendingWrites,
  } = useOfflineSync();

  const [teamDistances, setTeamDistances] = useState<DistanceConfig[]>(() => {
    return JSON.parse(JSON.stringify(DEFAULT_DISTANCES));
  });

  const [teamShotsCount, setTeamShotsCount] = useState<number>(DEFAULT_SHOTS_COUNT);

  const [directMaxShots, setDirectMaxShots] = useState<number>(10);

  const [directMaxPoints, setDirectMaxPoints] = useState<number | undefined>(undefined);

  const [teamDirectMaxShots, setTeamDirectMaxShots] = useState<number>(10);

  const [teamDirectMaxPoints, setTeamDirectMaxPoints] = useState<number | undefined>(undefined);

  const [laneCapacity, setLaneCapacity] = useState<number>(10);

  const [teamAthletes, setTeamAthletes] = useState<Athlete[]>([]);

  const [teamInputAthletes, setTeamInputAthletes] = useState<Athlete[]>([]);

  const [masterAthletes, setMasterAthletes] = useState<Athlete[]>([]);

  const [history, setHistory] = useState<MatchHistoryItem[]>(DEFAULT_HISTORY);

  const [storedAthleteLists, setStoredAthleteLists] = useState<StoredAthleteList[]>(DEFAULT_STORED_LISTS);

  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tourParam = params.get("tour") || params.get("id");
      if (tourParam && tourParam.startsWith("tour-")) {
        return tourParam;
      }
    }
    return null;
  });

  // Authentication and realtime sync states
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentTournamentDoc, setCurrentTournamentDoc] = useState<TournamentData | null>(null);
  const [isTournamentConfigLoaded, setIsTournamentConfigLoaded] = useState(false);
  const [draftPreviewItem, setDraftPreviewItem] = useState<MatchHistoryItem | null>(null);
  const [isPublishDraftModalOpen, setIsPublishDraftModalOpen] = useState(false);
  const [onlineTournaments, setOnlineTournaments] = useState<TournamentData[]>([]);

  // VSC System Athletes & Profile Modal States
  const [vscSystemAthletes, setVscSystemAthletes] = useState<Athlete[]>([]);
  const [globalAthleteProfile, setGlobalAthleteProfile] = useState<Athlete | null>(null);
  const [globalSelectedClub, setGlobalSelectedClub] = useState<any | null>(null);

  const [isShareCopied, setIsShareCopied] = useState(false);

  const handleShareActiveTournament = () => {
    if (!activeHistoryId) return;
    const shareUrl = `${window.location.origin}${window.location.pathname}?tour=${activeHistoryId}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setIsShareCopied(true);
      setTimeout(() => setIsShareCopied(false), 2500);
    }).catch(err => {
      console.error("Failed to copy link:", err);
    });
  };

  useEffect(() => {
    let lastQuery: string | null = null;
    const handleUrlChange = () => {
      const currentQuery = window.location.search;
      if (lastQuery === null || currentQuery !== lastQuery) {
        lastQuery = currentQuery;
        const params = new URLSearchParams(currentQuery);
        
        // 1. Tour history id
        const tourParam = params.get("tour") || params.get("id");
        if (tourParam && tourParam.startsWith("tour-")) {
          setActiveHistoryId(tourParam);
          localStorage.setItem("slingshot_active_history_id", tourParam);
        } else {
          setActiveHistoryId(null);
        }

        // 2. Active Tab
        const tabParam = params.get("tab");
        const allowedTabs = ["home", "desktop", "dashboard", "scoring", "input_scores", "leaderboard", "teams", "athletes", "settings", "history", "control_panel", "qltv", "vsc_system_directory", "vsc_clubs_directory", "pk_lobby"];
        if (tabParam && allowedTabs.includes(tabParam)) {
          setActiveTab(tabParam as any);
        } else {
          if (tourParam && tourParam.startsWith("tour-")) {
            setActiveTab("dashboard");
          } else {
            setActiveTab("home");
          }
        }

        // 3. Subtabs
        const subtabParam = params.get("subtab");
        if (subtabParam) {
          if (["individual", "team"].includes(subtabParam)) {
            setRankingSubTab(subtabParam as any);
          }
          if (["athletes", "clubs", "vsc_system"].includes(subtabParam)) {
            setAthleteForceTab(subtabParam as any);
          }
          if (["config", "athletes"].includes(subtabParam)) {
            setSettingsSubTab(subtabParam as any);
          }
          if (["profile", "created", "referee"].includes(subtabParam)) {
            setControlPanelSubTab(subtabParam as any);
          }
        }

        // 4. Competition Mode
        const modeParam = params.get("mode") || params.get("competitionMode");
        if (modeParam === "individual" || modeParam === "team") {
          setCompetitionMode(modeParam);
          setIsSpectatorModeOverridden(true);
        }
      }
    };

    window.addEventListener("popstate", handleUrlChange);
    const interval = setInterval(handleUrlChange, 1000);

    // Run initial parse as well
    handleUrlChange();

    return () => {
      window.removeEventListener("popstate", handleUrlChange);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToTournamentsList((list) => {
      setOnlineTournaments(list);
    });
    return () => unsubscribe();
  }, []);

  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);

  useEffect(() => {
    let unsubDoc: (() => void) | undefined;
    const unsubAuth = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      if (unsubDoc) {
        unsubDoc();
        unsubDoc = undefined;
      }
      if (user) {
        unsubDoc = onSnapshot(doc(db, "users", user.uid), (snap) => {
          if (snap.exists()) {
            setCurrentUserProfile(snap.data());
          } else {
            setCurrentUserProfile(null);
          }
        }, (err) => {
          console.warn("Could not listen to user profile:", err);
        });
      } else {
        setCurrentUserProfile(null);
      }
    });
    return () => {
      unsubAuth();
      if (unsubDoc) unsubDoc();
    };
  }, []);

  // Deduplication safety effects
  useEffect(() => {
    const seen = new Set<string>();
    const hasDuplicates = athletes.some((a) => {
      if (!a || !a.id) return true;
      const stripped = a.id.trim();
      if (seen.has(stripped)) return true;
      seen.add(stripped);
      return false;
    });

    if (hasDuplicates) {
      const cleanSeen = new Set<string>();
      const cleaned = athletes.filter((a) => {
        if (!a || !a.id) return false;
        const stripped = a.id.trim();
        if (cleanSeen.has(stripped)) return false;
        cleanSeen.add(stripped);
        return true;
      });
      setAthletes(cleaned);
    }
  }, [athletes]);

  useEffect(() => {
    const seen = new Set<string>();
    const hasDuplicates = teamAthletes.some((a) => {
      if (!a || !a.id) return true;
      const stripped = a.id.trim();
      if (seen.has(stripped)) return true;
      seen.add(stripped);
      return false;
    });

    if (hasDuplicates) {
      const cleanSeen = new Set<string>();
      const cleaned = teamAthletes.filter((a) => {
        if (!a || !a.id) return false;
        const stripped = a.id.trim();
        if (cleanSeen.has(stripped)) return false;
        cleanSeen.add(stripped);
        return true;
      });
      setTeamAthletes(cleaned);
    }
  }, [teamAthletes]);

  useEffect(() => {
    const seen = new Set<string>();
    const hasDuplicates = masterAthletes.some((a) => {
      if (!a || !a.id) return true;
      const stripped = a.id.trim();
      if (seen.has(stripped)) return true;
      seen.add(stripped);
      return false;
    });

    if (hasDuplicates) {
      const cleanSeen = new Set<string>();
      const cleaned = masterAthletes.filter((a) => {
        if (!a || !a.id) return false;
        const stripped = a.id.trim();
        if (cleanSeen.has(stripped)) return false;
        cleanSeen.add(stripped);
        return true;
      });
      setMasterAthletes(cleaned);
    }
  }, [masterAthletes]);

  const [activeTab, setActiveTab] = useState<"home" | "desktop" | "dashboard" | "scoring" | "input_scores" | "leaderboard" | "teams" | "athletes" | "settings" | "history" | "control_panel" | "qltv" | "vsc_system_directory" | "vsc_clubs_directory" | "pk_lobby">(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      const allowedTabs = ["home", "desktop", "dashboard", "scoring", "input_scores", "leaderboard", "teams", "athletes", "settings", "history", "control_panel", "qltv", "vsc_system_directory", "vsc_clubs_directory", "pk_lobby"];
      if (tabParam && allowedTabs.includes(tabParam)) {
        return tabParam as any;
      }

      const tourParam = params.get("tour") || params.get("id");
      if (tourParam && tourParam.startsWith("tour-")) {
        return "dashboard";
      }
    }
    return "home";
  });
  const [homeFilter, setHomeFilter] = useState<"all" | "all_list" | "active" | "followed">("all");
  const [athleteForceTab, setAthleteForceTab] = useState<"athletes" | "clubs" | "vsc_system">(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const subtabParam = params.get("subtab");
      if (subtabParam === "athletes" || subtabParam === "clubs" || subtabParam === "vsc_system") {
        return subtabParam;
      }
    }
    return "athletes";
  });
  const [settingsSubTab, setSettingsSubTab] = useState<"config" | "athletes">(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const subtabParam = params.get("subtab");
      if (subtabParam === "config" || subtabParam === "athletes") {
        return subtabParam;
      }
    }
    return "config";
  });
  const [controlPanelSubTab, setControlPanelSubTab] = useState<"profile" | "club" | "created" | "referee">(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const subtabParam = params.get("subtab");
      if (subtabParam === "profile" || subtabParam === "club" || subtabParam === "created" || subtabParam === "referee") {
        return subtabParam;
      }
    }
    return "profile";
  });
  const [rankingSubTab, setRankingSubTab] = useState<"individual" | "team">(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const subtabParam = params.get("subtab");
      if (subtabParam === "individual" || subtabParam === "team") {
        return subtabParam;
      }
    }
    return "individual";
  });
  const [globalSearch, setGlobalSearch] = useState("");

  // PK Challenge redirect and deep linking states
  const [activePkChallengeId, setActivePkChallengeId] = useState<string | null>(null);
  const [pkChallengeToEditId, setPkChallengeToEditId] = useState<string | null>(null);
  const [activePkSubTab, setActivePkSubTab] = useState<"dashboard" | "lobby" | "leaderboard" | "history">("dashboard");

  // Keep non-logged in guests restricted to public-facing viewing tabs
  useEffect(() => {
    if (!currentUser && !["home", "dashboard", "leaderboard", "teams", "vsc_system_directory", "vsc_clubs_directory", "pk_lobby"].includes(activeTab)) {
      setActiveTab("home");
    }
  }, [currentUser, activeTab]);
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);
  const [showExitAndCreateConfirmModal, setShowExitAndCreateConfirmModal] = useState(false);
  const [switchingTournamentData, setSwitchingTournamentData] = useState<{ id: string; tournamentName: string; targetTab?: string } | null>(null);

  // Synchronize masterAthletes to slingshot_master_athletes_global to never lose them
  useEffect(() => {
    if (masterAthletes && masterAthletes.length > 0) {
      try {
        const savedGlobal = localStorage.getItem("slingshot_master_athletes_global");
        let currentGlobalList: Athlete[] = [];
        if (savedGlobal) {
          currentGlobalList = restoreBase64Avatars(JSON.parse(savedGlobal));
        } else {
          const legacySaved = localStorage.getItem("slingshot_master_athletes");
          if (legacySaved) {
            currentGlobalList = restoreBase64Avatars(JSON.parse(legacySaved));
          }
        }

        const updatedGlobalMap = new Map<string, Athlete>();
        currentGlobalList.forEach(ath => {
          if (ath && ath.id) updatedGlobalMap.set(ath.id, ath);
        });
        masterAthletes.forEach(ath => {
          if (ath && ath.id) {
            updatedGlobalMap.set(ath.id, ath);
          }
        });

        const mergedList = Array.from(updatedGlobalMap.values()).map((ath) => ({
          ...ath,
          scores: {},
          soloHits: {},
          soloRounds: {},
          calledBy: "",
        }));
        localStorage.setItem("slingshot_master_athletes_global", JSON.stringify(stripBase64Avatars(mergedList)));
      } catch (e) {
        console.error("Failed to sync global athletes:", e);
      }
    }
  }, [masterAthletes]);

  const handleSelectTournament = async (id: string, tournament: any, targetTab?: string) => {
    const targetId = id;
    const resolvedTargetTab = targetTab || "dashboard";

    // SAFETY CHECK: If re-selecting the EXACT SAME tournament that is already active, DO NOT reset state!
    if (activeHistoryId && activeHistoryId === targetId) {
      if (targetId) {
        setActiveTab(resolvedTargetTab as any);
      }
      return;
    }

    if (activeHistoryId && activeHistoryId !== targetId && hasUnsavedChanges) {
      setPendingTabTarget({ type: "select_tour", payload: { id: targetId, tournament, targetTab: resolvedTargetTab } });
      setIsUnsavedModalOpen(true);
      return;
    }

    if (activeHistoryId && activeHistoryId.startsWith("tour-") && (userRole === "admin" || userRole === "referee")) {
      try {
        await updateOnlineTournament(activeHistoryId, {
          matchName,
          startDate,
          endDate,
          distances,
          shotsCount,
          athletes,
          teamDistances,
          teamShotsCount,
          teamAthletes,
          inputAthletes,
          teamInputAthletes,
          directMaxPoints,
          teamDirectMaxPoints,
          directMaxShots,
          teamDirectMaxShots,
          masterAthletes,
          bannerUrl,
          avatarUrl,
          laneCapacity,
          clubs: participatingClubs
        });
      } catch (err) {
        console.error("Failed to sync previous online tournament before switch:", err);
      }
    }

    // DISARM ALL AUTO-SYNC PUBLISHERS IMMEDIATELY BEFORE SWITCHING TOURNAMENTS
    setIsTournamentConfigLoaded(false);
    setCurrentTournamentDoc(null);
    loadedTournamentIdRef.current = null;

    setAthletes([]);
    setMasterAthletes([]);
    setTeamAthletes([]);
    setInputAthletes([]);
    setTeamInputAthletes([]);
    setMatchName("");
    setHeaderTempName("");
    setStartDate("");
    setEndDate("");
    setDistances(JSON.parse(JSON.stringify(DEFAULT_DISTANCES)));
    setShotsCount(DEFAULT_SHOTS_COUNT);
    setTeamDistances(JSON.parse(JSON.stringify(DEFAULT_DISTANCES)));
    setTeamShotsCount(DEFAULT_SHOTS_COUNT);
    setCompetitionMode("individual");
    setDirectMaxPoints(undefined);
    setTeamDirectMaxPoints(undefined);

    setActiveHistoryId(targetId);
    if (targetId) {
      setActiveTab(resolvedTargetTab as any);
    }
  };

  const confirmTournamentSwitch = () => {};

  const [searchQuery, setSearchQuery] = useState("");
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isLiveBoardOpen, setIsLiveBoardOpen] = useState(false);

  // Protection and lock/unlock mode for Ghi Diem tab
  const [isScoringEditAuthorized, setIsScoringEditAuthorized] = useState(false);
  const [showUnlockScoreModal, setShowUnlockScoreModal] = useState(false);
  const [pendingScoreToggle, setPendingScoreToggle] = useState<{ athleteId: string; distanceId: string; shotIndex: number } | null>(null);
  const [pendingAddAthlete, setPendingAddAthlete] = useState(false);
  const [pendingScrollAthleteId, setPendingScrollAthleteId] = useState<string | null>(null);

  // Reset scoring edit authorization when switching tabs
  const [showInputScoresModeSelection, setShowInputScoresModeSelection] = useState(false);
  const [showScoringModeSelection, setShowScoringModeSelection] = useState(false);
  const [showMobileRankingSelection, setShowMobileRankingSelection] = useState(false);
  const [isMobileRankingExpanded, setIsMobileRankingExpanded] = useState(false);

  useEffect(() => {
    if (activeTab === "input_scores" && tournamentType === "combined") {
      setShowInputScoresModeSelection(true);
    } else {
      setShowInputScoresModeSelection(false);
    }
  }, [activeTab, tournamentType]);

  useEffect(() => {
    if (activeTab === "scoring" && tournamentType === "combined") {
      setShowScoringModeSelection(true);
    } else {
      setShowScoringModeSelection(false);
    }
  }, [activeTab, tournamentType]);

  useEffect(() => {
    if (activeTab !== "scoring") {
      setIsScoringEditAuthorized(false);
      setPendingAddAthlete(false);
      setPendingScoreToggle(null);
    }
  }, [activeTab]);

  // Smooth scroll to the imported athletes in Ghi Diem
  useEffect(() => {
    if (activeTab === "scoring" && pendingScrollAthleteId) {
      const timer = setTimeout(() => {
        const element = document.getElementById(`athlete-card-${pendingScrollAthleteId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Give it a brief elegant glow highlight
          element.classList.add("ring-8", "ring-indigo-500/20", "transition-all", "duration-500");
          setTimeout(() => {
            element.classList.remove("ring-8", "ring-indigo-500/20");
          }, 2000);
        } else {
          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        }
        setPendingScrollAthleteId(null);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [activeTab, pendingScrollAthleteId]);

  // States for the Nhập Điểm (Enter Scores) tab
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isUnsavedModalOpen, setIsUnsavedModalOpen] = useState(false);
  const [pendingTabTarget, setPendingTabTarget] = useState<{ type: "tab" | "exit" | "select_tour"; value?: string; payload?: any } | null>(null);

  const [isSaveConfirmModalOpen, setIsSaveConfirmModalOpen] = useState(false);
  const [singleAthleteToSave, setSingleAthleteToSave] = useState<Athlete | null>(null);
  const [isSavingScores, setIsSavingScores] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ success: boolean; message: string } | null>(null);

  const changeTab = (targetTab: string) => {
    setActiveTab(targetTab as any);
  };

  const changeExitTournament = async (filter: "all" | "all_list" | "active" | "followed" = "all") => {
    if (hasUnsavedChanges) {
      setPendingTabTarget({ type: "exit", value: filter });
      setIsUnsavedModalOpen(true);
    } else {
      await handleExitTournament(filter);
    }
  };

  const [inputAthletes, setInputAthletes] = useState<Athlete[]>([]);

  // Clubs/Teams list state
  const [clubs, setClubs] = useState<Club[]>([]);

  // Memoized subset of clubs participating in the active tournament (athletes or teamAthletes match)
  const participatingClubs = useMemo(() => {
    const activeNames = new Set<string>();
    athletes.forEach((a) => {
      if (a.team) activeNames.add(a.team.trim().toLowerCase());
    });
    teamAthletes.forEach((a) => {
      if (a.team) activeNames.add(a.team.trim().toLowerCase());
    });
    return clubs.filter((c) => activeNames.has(c.name.trim().toLowerCase()));
  }, [athletes, teamAthletes, clubs]);
  const [isAddingAthleteToInputBoard, setIsAddingAthleteToInputBoard] = useState(false);
  const [inputBoardAddSearch, setInputBoardAddSearch] = useState("");
  const [selectedInputBoardAthleteIds, setSelectedInputBoardAthleteIds] = useState<string[]>([]);

  // States for adding an athlete to the tournament
  const [isAddingAthleteToTournament, setIsAddingAthleteToTournament] = useState(false);
  const [tourAddSearch, setTourAddSearch] = useState("");
  const [selectedTourAthleteIds, setSelectedTourAthleteIds] = useState<string[]>([]);

  // --- Sync to LocalStorage/DeviceStorage disabled to keep system purely online and synchronized with Firestore ---

  // Synchronize state with browser URL query parameters, document title, and meta description
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Build Query Parameters
    const params = new URLSearchParams();
    if (activeHistoryId) {
      params.set("tour", activeHistoryId);
    }
    params.set("tab", activeTab);

    // Sub-tab query parameter depending on active tab
    if (activeTab === "leaderboard") {
      params.set("subtab", rankingSubTab);
      params.set("mode", competitionMode);
    } else if (activeTab === "athletes") {
      params.set("subtab", athleteForceTab);
    } else if (activeTab === "settings") {
      params.set("subtab", settingsSubTab);
    } else if (activeTab === "control_panel") {
      params.set("subtab", controlPanelSubTab);
    } else if (activeTab === "scoring" || activeTab === "input_scores") {
      params.set("mode", competitionMode);
    }

    const newSearch = params.toString();
    const currentSearch = window.location.search.replace(/^\?/, "");

    if (newSearch !== currentSearch) {
      const newUrl = `${window.location.origin}${window.location.pathname}?${newSearch}`;
      window.history.pushState({
        tour: activeHistoryId,
        tab: activeTab,
        subtab: rankingSubTab || athleteForceTab || settingsSubTab || controlPanelSubTab,
        mode: competitionMode
      }, "", newUrl);
    }

    // 2. Generate and Set Dynamic Document Title and Meta Description
    let title = "VSC - Vietnam Slingshot Championship";
    let description = "Hệ thống quản lý giải đấu Ná cao su chuyên nghiệp Việt Nam (VSC). Bảng xếp hạng trực tuyến, ghi điểm trọng tài thời gian thực.";

    const isEng = language === "en";
    const tName = matchName || (isEng ? "New Tournament" : "Giải đấu mới");

    if (activeTab === "home") {
      title = isEng 
        ? "VSC - Vietnam Slingshot Championship | Home" 
        : "VSC - Vietnam Slingshot Championship | Trang Chủ";
      description = isEng
        ? "Home of the Vietnam Slingshot Championship (VSC). Track live slingshot events, manage scores, and follow national standings."
        : "Trang chủ hệ thống giải đấu Ná cao su Việt Nam (VSC). Xem giải đấu trực tuyến đang diễn ra và theo dõi các CLB ná cao su chuyên nghiệp.";
    } else if (activeTab === "dashboard") {
      title = isEng ? `VSC | Tournament: ${tName}` : `VSC | Giải đấu: ${tName}`;
      description = isEng
        ? `View the active match details, brackets, schedules, and real-time live scoreboard of the slingshot tournament: ${tName}.`
        : `Xem chi tiết sơ đồ thi đấu, danh sách và tiến độ cập nhật điểm số trực tiếp của giải đấu ná cao su: ${tName}.`;
    } else if (activeTab === "scoring" || activeTab === "input_scores") {
      const modeText = competitionMode === "team" ? (isEng ? "Team" : "Đồng Đội") : (isEng ? "Individual" : "Cá Nhân");
      title = isEng 
        ? `VSC | ${modeText} Score Console: ${tName}` 
        : `VSC | Ghi Điểm ${modeText}: ${tName}`;
      description = isEng
        ? `Official referee console for recording ${modeText} scores and hits dynamically for ${tName}.`
        : `Bảng điều khiển tác nghiệp dành cho Trọng tài và Ban tổ chức để nhập điểm và ghi nhận điểm số từng loạt bắn ${modeText} giải ${tName}.`;
    } else if (activeTab === "leaderboard") {
      if (competitionMode === "team") {
        if (rankingSubTab === "team") {
          title = isEng ? `VSC | Team Standings TEAM: ${tName}` : `VSC | BXH Đồng Đội TEAM: ${tName}`;
          description = isEng
            ? `Live club and team collective rankings leaderboard for ${tName} in Team category.`
            : `Bảng xếp hạng tổng điểm đồng đội TEAM, câu lạc bộ trực tiếp của giải đấu ná cao su ${tName} thuộc môi trường đồng đội.`;
        } else {
          title = isEng ? `VSC | Individual Standings TEAM: ${tName}` : `VSC | BXH Cá Nhân TEAM: ${tName}`;
          description = isEng
            ? `Live individual competitor scoreboard in Team Category for ${tName}.`
            : `Bảng xếp hạng cá nhân thi đấu trong môi trường đồng đội của giải đấu ná cao su ${tName}.`;
        }
      } else {
        if (rankingSubTab === "team") {
          title = isEng ? `VSC | Team Standings: ${tName}` : `VSC | BXH Đồng Đội: ${tName}`;
          description = isEng
            ? `Live club and team collective rankings leaderboard for ${tName} in Individual Category.`
            : `Bảng xếp hạng tổng điểm đồng đội, câu lạc bộ trực tiếp của giải đấu ná cao su ${tName} thuộc môi trường cá nhân.`;
        } else {
          title = isEng ? `VSC | Individual Standings: ${tName}` : `VSC | BXH Cá Nhân: ${tName}`;
          description = isEng
            ? `Live individual competitor scoreboard for ${tName}.`
            : `Bảng xếp hạng tổng điểm cá nhân trực tiếp của giải đấu ná cao su ${tName} thuộc môi trường cá nhân.`;
        }
      }
    } else if (activeTab === "teams") {
      title = isEng ? `VSC | Registered Teams: ${tName}` : `VSC | Danh Sách Đội: ${tName}`;
      description = isEng
        ? `List of registered clubs and team formations competing in ${tName}.`
        : `Danh sách các câu lạc bộ, đơn vị và lực lượng vận động viên đại diện tham dự giải ${tName}.`;
    } else if (activeTab === "athletes") {
      if (athleteForceTab === "clubs") {
        title = isEng ? "VSC | National Slingshot Clubs Directory" : "VSC | Thư Mục Câu Lạc Bộ Toàn Quốc";
        description = isEng
          ? "Directory of certified Slingshot clubs, teams, and training associations nationwide under VSC."
          : "Cơ sở dữ liệu các câu lạc bộ, hội nhóm Ná cao su chính thức thuộc hệ thống VSC Việt Nam.";
      } else if (athleteForceTab === "vsc_system") {
        title = isEng ? "VSC | National Slingshot Federation Database" : "VSC | Cơ Sở Dữ Liệu VSC Quốc Gia";
        description = isEng
          ? "Official ranking indices, performance standards, and nationwide record keeping for Slingshot activities."
          : "Hệ thống lưu trữ chỉ số chuyên môn, định mức phân cấp và hồ sơ thành tích hoạt động của VSC Việt Nam.";
      } else {
        title = isEng ? "VSC | Master Athletes Profiles Directory" : "VSC | Danh Sách Vận Động Viên Toàn Quốc";
        description = isEng
          ? "Comprehensive profiles directory of all registered professional slingshot athletes under the Vietnam Slingshot Championship."
          : "Hồ sơ cá nhân và lịch sử thi đấu của toàn bộ các vận động viên Ná cao su chuyên nghiệp đã đăng ký thuộc hệ thống VSC.";
      }
    } else if (activeTab === "settings") {
      title = isEng ? `VSC | Tournament Settings: ${tName}` : `VSC | Cài Đặt Giải Đấu: ${tName}`;
      description = isEng
        ? `Configure match criteria, target distances, maximum points, allowed attempts, and referee authorities for ${tName}.`
        : `Thiết lập quy chế thi đấu, cự ly, số loạt bắn, cách tính điểm và phân quyền trọng tài phụ trách của giải ${tName}.`;
    } else if (activeTab === "history") {
      title = isEng ? "VSC | Archive & History Logs" : "VSC | Lưu Trữ & Lịch Sử Giải Đấu";
      description = isEng
        ? "Access local history backups, historical scorecards, and timeline logs of previous slingshot championships."
        : "Nơi truy xuất, sao lưu phục hồi dữ liệu lịch sử các giải đấu, bảng điểm cũ và nhật ký tác nghiệp ngoại tuyến.";
    } else if (activeTab === "control_panel") {
      title = isEng ? "VSC | Organizer Control Panel" : "VSC | Bảng Điều Khiển Ban Tổ Chức";
      description = isEng
        ? "Manage your credentials, host new online championships, authorize sub-admins, and oversee referee activities."
        : "Trang cá nhân của Ban tổ chức. Tạo giải đấu online mới, phân quyền trợ lý, giám sát trọng tài và chỉnh sửa thông tin.";
    } else if (activeTab === "vsc_system_directory") {
      title = isEng ? "VSC | National Athletes Database Directory" : "VSC | Danh Sách VĐV Hệ Thống Quốc Gia";
      description = isEng
        ? "Official verified database of professional slingshot competitors with long-term profiles and match histories."
        : "Cơ sở dữ liệu chính thức lưu giữ chỉ số chuyên môn, định mức phân cấp và hồ sơ thành tích thi đấu của toàn bộ các vận động viên Ná cao su chuyên nghiệp VSC Việt Nam.";
    } else if (activeTab === "vsc_clubs_directory") {
      title = isEng ? "VSC | National Slingshot Clubs Directory" : "VSC | Danh Sách CLB Hệ Thống Quốc Gia";
      description = isEng
        ? "Official verified database of professional slingshot clubs with long-term rosters and combined performance statistics."
        : "Cơ sở dữ liệu chính thức lưu trữ danh sách, chỉ số chuyên môn và cơ cấu thành viên của các Câu lạc bộ Ná cao su trên toàn quốc.";
    } else if (activeTab === "pk_lobby") {
      title = isEng ? "VSC | PK Arena & Matchmaking" : "VSC | Khán Đài PK & Thách Đấu";
      description = isEng
        ? "Host or accept 1v1 and team slingshot battles, log live scorecards, and compete for ELO standings."
        : "Nơi đăng kèo, thách đấu 1v1, thi đấu đồng đội CLB và cập nhật điểm số trực tuyến tính điểm xếp hạng ELO quốc gia.";
    }

    // Set Document Title
    document.title = title;

    // Set Meta Description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', description);

  }, [activeHistoryId, activeTab, rankingSubTab, athleteForceTab, settingsSubTab, controlPanelSubTab, language, matchName, competitionMode]);

  // Derived role properties for active tournament context
  const isOnlineTournament = activeHistoryId?.startsWith("tour-");
  const isGlobalAdmin = !!(currentUser?.email && (
    currentUser.email.toLowerCase().trim() === "nahnatofficial@gmail.com" || 
    currentUser.email.toLowerCase().trim() === "vscvietnamslingshot@gmail.com" ||
    currentUserProfile?.role === "admin" ||
    currentUserProfile?.isGlobalAdmin === true ||
    currentUser.role === "admin"
  ));
  const isTournamentOwner = currentUser && currentTournamentDoc && (currentTournamentDoc.creatorId === currentUser.uid || isGlobalAdmin);
  const isTournamentSubAdmin = currentUser && currentTournamentDoc && (currentTournamentDoc.subAdmins?.some((email: string) => email.toLowerCase().trim() === currentUser.email?.toLowerCase().trim()));
  const isTournamentReferee = currentUser && currentTournamentDoc && (currentTournamentDoc.referees?.some((email: string) => email.toLowerCase().trim() === currentUser.email?.toLowerCase().trim()));

  const hasEndedPast30Days = isOnlineTournament && isTournamentEndedPast30Days(currentTournamentDoc?.endDate, currentTournamentDoc?.startDate);

  const userRole = isGlobalAdmin
    ? "admin"
    : hasEndedPast30Days
      ? "spectator"
      : !currentUser
        ? "spectator"
        : !isOnlineTournament
          ? "admin" 
          : (isTournamentOwner || isTournamentSubAdmin) 
            ? "admin" 
            : isTournamentReferee 
              ? "referee" 
              : "spectator";

  // --- AUTOMATIC DUAL-BACKUP ENGINE ---
  const stateRefs = {
    matchName: useRef(matchName),
    distances: useRef(distances),
    shotsCount: useRef(shotsCount),
    athletes: useRef(athletes),
    teamDistances: useRef(teamDistances),
    teamShotsCount: useRef(teamShotsCount),
    teamAthletes: useRef(teamAthletes),
    inputAthletes: useRef(inputAthletes || []),
    teamInputAthletes: useRef(teamInputAthletes || []),
    directMaxPoints: useRef(directMaxPoints),
    teamDirectMaxPoints: useRef(teamDirectMaxPoints),
    directMaxShots: useRef(directMaxShots),
    teamDirectMaxShots: useRef(teamDirectMaxShots),
    masterAthletes: useRef(masterAthletes),
    history: useRef(history),
    userRole: useRef(userRole),
    activeHistoryId: useRef(activeHistoryId),
    currentTournamentDoc: useRef(currentTournamentDoc),
  };

  useEffect(() => { stateRefs.matchName.current = matchName; }, [matchName]);
  useEffect(() => { stateRefs.distances.current = distances; }, [distances]);
  useEffect(() => { stateRefs.shotsCount.current = shotsCount; }, [shotsCount]);
  useEffect(() => { stateRefs.athletes.current = athletes; }, [athletes]);
  useEffect(() => { stateRefs.teamDistances.current = teamDistances; }, [teamDistances]);
  useEffect(() => { stateRefs.teamShotsCount.current = teamShotsCount; }, [teamShotsCount]);
  useEffect(() => { stateRefs.teamAthletes.current = teamAthletes; }, [teamAthletes]);
  useEffect(() => { stateRefs.inputAthletes.current = inputAthletes || []; }, [inputAthletes]);
  useEffect(() => { stateRefs.teamInputAthletes.current = teamInputAthletes || []; }, [teamInputAthletes]);
  useEffect(() => { stateRefs.directMaxPoints.current = directMaxPoints; }, [directMaxPoints]);
  useEffect(() => { stateRefs.teamDirectMaxPoints.current = teamDirectMaxPoints; }, [teamDirectMaxPoints]);
  useEffect(() => { stateRefs.directMaxShots.current = directMaxShots; }, [directMaxShots]);
  useEffect(() => { stateRefs.teamDirectMaxShots.current = teamDirectMaxShots; }, [teamDirectMaxShots]);
  useEffect(() => { stateRefs.masterAthletes.current = masterAthletes; }, [masterAthletes]);
  useEffect(() => { stateRefs.history.current = history; }, [history]);
  useEffect(() => { stateRefs.userRole.current = userRole; }, [userRole]);
  useEffect(() => { stateRefs.activeHistoryId.current = activeHistoryId; }, [activeHistoryId]);
  useEffect(() => { stateRefs.currentTournamentDoc.current = currentTournamentDoc; }, [currentTournamentDoc]);

  const performAutoBackup = (isTimeline: boolean) => {
    // Only perform background auto-backups when inside a tournament (activeHistoryId is set)
    if (!stateRefs.activeHistoryId.current) return;

    // Only perform background auto-backups for active admins/owners and sub-admins
    if (stateRefs.userRole.current !== "admin" && stateRefs.userRole.current !== "subAdmin") return;

    // Check 15-minute creation gate
    let creationTimeMs = Date.now();
    const currentActiveId = stateRefs.activeHistoryId.current;
    const currentDoc = stateRefs.currentTournamentDoc.current;

    if (currentActiveId) {
      if (currentActiveId.startsWith("tour-") && currentDoc?.createdAt) {
        if (typeof currentDoc.createdAt.toDate === "function") {
          creationTimeMs = currentDoc.createdAt.toDate().getTime();
        } else if (currentDoc.createdAt.seconds) {
          creationTimeMs = currentDoc.createdAt.seconds * 1000;
        } else {
          const parsed = Date.parse(currentDoc.createdAt);
          if (!isNaN(parsed)) creationTimeMs = parsed;
        }
      } else {
        const storedCreated = localStorage.getItem(`slingshot_created_at_${currentActiveId}`);
        if (storedCreated) {
          creationTimeMs = Number(storedCreated);
        }
      }
    } else {
      const storedCreated = localStorage.getItem("slingshot_created_at_local");
      if (storedCreated) {
        creationTimeMs = Number(storedCreated);
      } else {
        const now = Date.now();
        localStorage.setItem("slingshot_created_at_local", now.toString());
        creationTimeMs = now;
      }
    }

    const minutesElapsed = (Date.now() - creationTimeMs) / (60 * 1000);
    if (minutesElapsed < 15) {
      console.log(`[AutoBackup] Skipped: only runs 15 minutes after creation. Elapsed: ${minutesElapsed.toFixed(1)}m`);
      return;
    }

    try {
      const backupData = {
        matchName: stateRefs.matchName.current,
        distances: stateRefs.distances.current,
        shotsCount: stateRefs.shotsCount.current,
        athletes: stripBase64Avatars(stateRefs.athletes.current),
        teamDistances: stateRefs.teamDistances.current,
        teamShotsCount: stateRefs.teamShotsCount.current,
        teamAthletes: stripBase64Avatars(stateRefs.teamAthletes.current),
        inputAthletes: stripBase64Avatars(stateRefs.inputAthletes.current),
        teamInputAthletes: stripBase64Avatars(stateRefs.teamInputAthletes.current),
        directMaxPoints: stateRefs.directMaxPoints.current,
        teamDirectMaxPoints: stateRefs.teamDirectMaxPoints.current,
        directMaxShots: stateRefs.directMaxShots.current,
        teamDirectMaxShots: stateRefs.teamDirectMaxShots.current,
        masterAthletes: stripBase64Avatars(stateRefs.masterAthletes.current),
        history: stripBase64Avatars(stateRefs.history.current),
        activeHistoryId: currentActiveId,
        backedUpAt: new Date().toISOString(),
      };

      const dataStr = JSON.stringify(backupData);
      const timestamp = Date.now();
      const currentMatchName = stateRefs.matchName.current || "Giải đấu không tên";

      // Read current local backups index
      const savedIndex = localStorage.getItem("vsc_device_backups_index");
      let backupsIndex: { id: string; timestamp: number; matchName: string; isTimeline: boolean }[] = [];
      if (savedIndex) {
        try {
          backupsIndex = JSON.parse(savedIndex);
        } catch {
          backupsIndex = [];
        }
      }

      if (isTimeline) {
        // Timeline Backup (Every 15 minutes - max 5 files)
        const newBackupId = `vsc_backup_timeline_${timestamp}`;
        localStorage.setItem(newBackupId, dataStr);

        backupsIndex.unshift({
          id: newBackupId,
          timestamp,
          matchName: currentMatchName,
          isTimeline: true
        });

        // Retain only latest 5 timeline archives
        const timelineBackups = backupsIndex.filter(b => b.isTimeline);
        if (timelineBackups.length > 5) {
          const toRemove = timelineBackups.slice(5);
          toRemove.forEach(b => {
            localStorage.removeItem(b.id);
          });
          backupsIndex = backupsIndex.filter(b => !toRemove.some(r => r.id === b.id));
        }
      } else {
        // Latest Backup (Every 5 minutes - overwrite)
        const latestId = "vsc_backup_latest";
        localStorage.setItem(latestId, dataStr);

        const latestIdx = backupsIndex.findIndex(b => b.id === latestId);
        const item = {
          id: latestId,
          timestamp,
          matchName: currentMatchName,
          isTimeline: false
        };
        if (latestIdx !== -1) {
          backupsIndex[latestIdx] = item;
        } else {
          backupsIndex.push(item);
        }
      }

      localStorage.setItem("vsc_device_backups_index", JSON.stringify(backupsIndex));
      window.dispatchEvent(new CustomEvent("vsc_backups_updated"));
      console.log(`[AutoBackup] Created ${isTimeline ? "Timeline" : "Latest"} local backup successfully.`);
    } catch (err) {
      console.warn("[AutoBackup] Failed to run background auto-backup:", err);
    }
  };

  const performHistoryAutoBackup = () => {
    // Only perform background auto-backups when inside a tournament (activeHistoryId is set)
    if (!stateRefs.activeHistoryId.current) return;

    // Only perform background auto-backups for active admins/owners and sub-admins
    if (stateRefs.userRole.current !== "admin" && stateRefs.userRole.current !== "subAdmin") return;

    // Check 15-minute creation gate
    let creationTimeMs = Date.now();
    const currentActiveId = stateRefs.activeHistoryId.current;
    const currentDoc = stateRefs.currentTournamentDoc.current;

    if (currentActiveId) {
      if (currentActiveId.startsWith("tour-") && currentDoc?.createdAt) {
        if (typeof currentDoc.createdAt.toDate === "function") {
          creationTimeMs = currentDoc.createdAt.toDate().getTime();
        } else if (currentDoc.createdAt.seconds) {
          creationTimeMs = currentDoc.createdAt.seconds * 1000;
        } else {
          const parsed = Date.parse(currentDoc.createdAt);
          if (!isNaN(parsed)) creationTimeMs = parsed;
        }
      } else {
        const storedCreated = localStorage.getItem(`slingshot_created_at_${currentActiveId}`);
        if (storedCreated) {
          creationTimeMs = Number(storedCreated);
        }
      }
    } else {
      const storedCreated = localStorage.getItem("slingshot_created_at_local");
      if (storedCreated) {
        creationTimeMs = Number(storedCreated);
      } else {
        const now = Date.now();
        localStorage.setItem("slingshot_created_at_local", now.toString());
        creationTimeMs = now;
      }
    }

    const minutesElapsed = (Date.now() - creationTimeMs) / (60 * 1000);
    if (minutesElapsed < 15) {
      console.log(`[HistoryAutoBackup] Skipped: only runs 15 minutes after creation. Elapsed: ${minutesElapsed.toFixed(1)}m`);
      return;
    }

    try {
      const pad = (n: number) => n.toString().padStart(2, "0");
      const formatBackupTime = (date: Date) => {
        const hh = pad(date.getHours());
        const mm = pad(date.getMinutes());
        const DD = pad(date.getDate());
        const MM = pad(date.getMonth() + 1);
        const YYYY = date.getFullYear();
        return `${hh}:${mm} - ${DD}/${MM}/${YYYY}`;
      };

      const currentMatchName = stateRefs.matchName.current || "Giải đấu không tên";
      const finalName = `${currentMatchName} (${formatBackupTime(new Date())})`;
      
      const restoredAthletes = restoreBase64Avatars(stateRefs.athletes.current);

      const newHistoryItem: MatchHistoryItem = {
        id: `hist-auto-${Date.now()}`,
        date: new Date().toISOString(),
        matchName: finalName,
        shotCount: stateRefs.shotsCount.current,
        distances: stateRefs.distances.current,
        athletes: restoredAthletes,
        masterCount: restoredAthletes.length,
        masterAthletes: restoredAthletes,
        teamDistances: stateRefs.teamDistances.current,
        teamShotCount: stateRefs.teamShotsCount.current,
        teamAthletes: restoreBase64Avatars(stateRefs.teamAthletes.current),
        isAutoBackup: true,
      };

      setHistory((prev) => [newHistoryItem, ...prev]);
      console.log(`[HistoryAutoBackup] Created history record archive: ${finalName}`);
    } catch (err) {
      console.warn("[HistoryAutoBackup] Failed to run history auto-backup:", err);
    }
  };

  // Run the background intervals
  useEffect(() => {
    // Overwrite backup runs every 5 minutes
    const latestTimer = setInterval(() => {
      performAutoBackup(false);
    }, 5 * 60 * 1000);

    // Snapshot timeline backup runs every 15 minutes
    const timelineTimer = setInterval(() => {
      performAutoBackup(true);
    }, 15 * 60 * 1000);

    // History auto-backup runs every 20 minutes (new requirement)
    const historyAutoTimer = setInterval(() => {
      performHistoryAutoBackup();
    }, 20 * 60 * 1000);

    return () => {
      clearInterval(latestTimer);
      clearInterval(timelineTimer);
      clearInterval(historyAutoTimer);
    };
  }, []);

  // Backups recovery and deletion handlers
  const handleRestoreDeviceBackup = (backupId: string) => {
    try {
      const dataStr = localStorage.getItem(backupId);
      if (!dataStr) {
        alert(language === "en" ? "Backup data not found!" : "Không tìm thấy dữ liệu sao lưu!");
        return false;
      }
      const success = handleImportFullBackup(dataStr);
      if (success) {
        alert(language === "en" ? "✓ Successfully restored all data from device backup!" : "✓ Đã khôi phục thành công toàn bộ dữ liệu từ Bản sao lưu nội bộ!");
      }
      return success;
    } catch (err) {
      alert((language === "en" ? "Error restoring backup: " : "Lỗi khi khôi phục bản sao lưu: ") + String(err));
      return false;
    }
  };

  const handleDeleteDeviceBackup = (backupId: string) => {
    try {
      localStorage.removeItem(backupId);
      const savedIndex = localStorage.getItem("vsc_device_backups_index");
      if (savedIndex) {
        const backupsIndex = JSON.parse(savedIndex);
        const filtered = backupsIndex.filter((b: any) => b.id !== backupId);
        localStorage.setItem("vsc_device_backups_index", JSON.stringify(filtered));
      }
      window.dispatchEvent(new CustomEvent("vsc_backups_updated"));
      return true;
    } catch (err) {
      console.error("Failed to delete device backup:", err);
      return false;
    }
  };

  // Subscribe to real-time system clubs
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = subscribeToVscSystemClubs((remoteClubs) => {
        if (remoteClubs) {
          setClubs(remoteClubs);
          localStorage.setItem("slingshot_clubs", JSON.stringify(remoteClubs));
        }
      });
    } catch (err) {
      console.warn("Could not subscribe to VSC system clubs:", err);
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [currentUser]);

  // Subscribe to real-time system athletes
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = subscribeToVscSystemAthletes((remoteAthletes) => {
        if (remoteAthletes) {
          setVscSystemAthletes(remoteAthletes);
        }
      });
    } catch (err) {
      console.warn("Could not subscribe to VSC system athletes:", err);
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Expose a global handler to open the athlete profile modal from anywhere
  useEffect(() => {
    (window as any).triggerViewAthleteProfile = (athleteIdOrName: string) => {
      if (!athleteIdOrName) return;
      const lower = athleteIdOrName.trim().toLowerCase();
      const match = vscSystemAthletes.find(
        (a) => a.id.toLowerCase() === lower || a.name.toLowerCase() === lower
      );
      if (match) {
        setGlobalAthleteProfile(match);
      }
    };
    (window as any).isVscSystemAthlete = (athleteIdOrName: string) => {
      if (!athleteIdOrName) return false;
      const lower = athleteIdOrName.trim().toLowerCase();
      return vscSystemAthletes.some(
        (a) => a.id.toLowerCase() === lower || a.name.toLowerCase() === lower
      );
    };
    (window as any).getVscSystemAthleteAvatar = (athleteIdOrName: string) => {
      if (!athleteIdOrName) return "";
      const lower = athleteIdOrName.trim().toLowerCase();
      const match = vscSystemAthletes.find(
        (a) => a.id.toLowerCase() === lower || a.name.toLowerCase() === lower
      );
      return (match && match.avatarUrl) || "";
    };
    return () => {
      delete (window as any).triggerViewAthleteProfile;
      delete (window as any).isVscSystemAthlete;
      delete (window as any).getVscSystemAthleteAvatar;
    };
  }, [vscSystemAthletes]);

  // Subscribe and publish real-time online document shifts using custom hook
  useTournamentDatabase({
    activeHistoryId,
    currentUser,
    isGlobalAdmin,
    userRole,
    dbHasPendingWrites,
    setDbHasPendingWrites,

    matchName,
    startDate,
    endDate,
    distances,
    shotsCount,
    athletes,
    teamDistances,
    teamShotsCount,
    teamAthletes,
    inputAthletes,
    teamInputAthletes,
    directMaxPoints,
    teamDirectMaxPoints,
    directMaxShots,
    teamDirectMaxShots,
    masterAthletes,
    bannerUrl,
    avatarUrl,
    laneCapacity,
    participatingClubs,
    activeTab,
    isSpectatorModeOverridden,
    VSC_DEFAULT_LOGO,
    currentTournamentDoc,
    isTournamentConfigLoaded,
    loadedTournamentIdRef,

    setMatchName,
    setHeaderTempName,
    setStartDate,
    setEndDate,
    setBannerUrl,
    setAvatarUrl,
    setTournamentType,
    setCompetitionMode,
    setShotsCount,
    setTeamShotsCount,
    setLaneCapacity,
    setDistances,
    setTeamDistances,
    setAthletes,
    setTeamAthletes,
    setInputAthletes,
    setTeamInputAthletes,
    setMasterAthletes,
    setDirectMaxPoints,
    setTeamDirectMaxPoints,
    setDirectMaxShots,
    setTeamDirectMaxShots,
    setActiveTab,
    setCurrentTournamentDoc,
    setIsTournamentConfigLoaded,
  });

  // Auto-save tournament session data (including roster and point modifications) on changes
  useEffect(() => {
    if (!matchName || !matchName.trim()) {
      return;
    }
    if (athletes.length === 0 && masterAthletes.length === 0 && teamAthletes.length === 0) {
      return;
    }

    const isOnlineTour = !!(activeHistoryId && activeHistoryId.startsWith("tour-"));
    // DO NOT run local history auto-save if we are currently viewing an online tournament
    // Online tournaments are persisted directly in Firestore and must never overwrite local offline history archives.
    if (isOnlineTour) {
      return;
    }

    const athletesToSave = masterAthletes.length > 0 ? masterAthletes : athletes;

    // 1. Update or Insert the tournament snapshot in the history archive
    setHistory((prevHistory) => {
      let existingIndex = -1;
      if (activeHistoryId) {
        existingIndex = prevHistory.findIndex((h) => h.id === activeHistoryId);
      }
      if (existingIndex === -1 && !isOnlineTour) {
        existingIndex = prevHistory.findIndex(
          (h) => h.matchName.trim().toLowerCase() === matchName.trim().toLowerCase()
        );
      }

      const matchId = existingIndex > -1 ? prevHistory[existingIndex].id : activeHistoryId || `hist-${Date.now()}`;
      
      const updatedItem: MatchHistoryItem = {
        id: matchId,
        date: new Date().toISOString(),
        matchName: matchName.trim(),
        shotCount: shotsCount,
        distances: [...distances],
        athletes: JSON.parse(JSON.stringify(athletes)),
        masterCount: masterAthletes.length,
        masterAthletes: JSON.parse(JSON.stringify(masterAthletes)),
        teamDistances: [...teamDistances],
        teamShotCount: teamShotsCount,
        teamAthletes: JSON.parse(JSON.stringify(teamAthletes)),
        startDate: startDate,
        endDate: endDate,
      };

      // Set active history ID safely (ONLY if not an online tour)
      if (!isOnlineTour && activeHistoryId !== matchId) {
        setTimeout(() => setActiveHistoryId(matchId), 0);
      }

      if (existingIndex > -1) {
        const copy = [...prevHistory];
        copy[existingIndex] = updatedItem;
        return copy;
      } else {
        return [updatedItem, ...prevHistory];
      }
    });

    // 2. Update or Insert the saved roster list under the same tournament name
    setStoredAthleteLists((prevLists) => {
      const existingIdx = prevLists.findIndex(
        (list) => list.name.trim().toLowerCase() === matchName.trim().toLowerCase()
      );

      const listId = existingIdx > -1 ? prevLists[existingIdx].id : `list-${Date.now()}`;
      const updatedList: StoredAthleteList = {
        id: listId,
        name: matchName.trim(),
        createdAt: new Date().toISOString(),
        athletes: JSON.parse(JSON.stringify(athletesToSave)),
      };

      if (existingIdx > -1) {
        const copy = [...prevLists];
        copy[existingIdx] = updatedList;
        return copy;
      } else {
        return [updatedList, ...prevLists];
      }
    });

  }, [matchName, distances, shotsCount, athletes, masterAthletes, activeHistoryId, teamDistances, teamShotsCount, teamAthletes, startDate, endDate]);

  // Combine all master athletes to display in Leaderboard using useTournamentCalculations hook
  const { leaderboardAthletes, leaderboardTeamAthletes } = useTournamentCalculations({
    masterAthletes,
    athletes,
    inputAthletes,
    distances,
    shotsCount,
    teamAthletes,
    teamInputAthletes,
    teamDistances,
    teamShotsCount,
  });

  // Synchronize basic metadata from master profiles to current active session athletes
  useEffect(() => {
    if (!masterAthletes || masterAthletes.length === 0) return;

    setAthletes((prevActive) => {
      let changed = false;
      const updated = prevActive.map((activeAth) => {
        const masterAth = masterAthletes.find((m) => m.id === activeAth.id);
        if (masterAth) {
          if (
            activeAth.name !== masterAth.name ||
            activeAth.team !== masterAth.team ||
            activeAth.gender !== masterAth.gender ||
            activeAth.avatarUrl !== masterAth.avatarUrl ||
            activeAth.idCard !== masterAth.idCard ||
            activeAth.dob !== masterAth.dob ||
            activeAth.hometown !== masterAth.hometown ||
            activeAth.province !== masterAth.province ||
            activeAth.country !== masterAth.country ||
            activeAth.countryCode !== masterAth.countryCode ||
            activeAth.status !== masterAth.status ||
            activeAth.gearSlingName !== masterAth.gearSlingName ||
            activeAth.gearForkWidth !== masterAth.gearForkWidth ||
            activeAth.gearBandSpec !== masterAth.gearBandSpec ||
            activeAth.gearAmmoSize !== masterAth.gearAmmoSize ||
            activeAth.gearStance !== masterAth.gearStance
          ) {
            changed = true;
            return {
              ...activeAth,
              name: masterAth.name,
              team: masterAth.team,
              gender: masterAth.gender,
              avatarUrl: masterAth.avatarUrl,
              idCard: masterAth.idCard,
              dob: masterAth.dob,
              hometown: masterAth.hometown,
              province: masterAth.province,
              country: masterAth.country,
              countryCode: masterAth.countryCode,
              status: masterAth.status,
              gearSlingName: masterAth.gearSlingName || "",
              gearForkWidth: masterAth.gearForkWidth || "",
              gearBandSpec: masterAth.gearBandSpec || "",
              gearAmmoSize: masterAth.gearAmmoSize || "",
              gearStance: masterAth.gearStance || "",
            };
          }
        }
        return activeAth;
      });
      return changed ? updated : prevActive;
    });

    setTeamAthletes((prevTeam) => {
      let changed = false;
      const updated = prevTeam.map((activeAth) => {
        const masterAth = masterAthletes.find((m) => m.id === activeAth.id);
        if (masterAth) {
          if (
            activeAth.name !== masterAth.name ||
            activeAth.team !== masterAth.team ||
            activeAth.gender !== masterAth.gender ||
            activeAth.avatarUrl !== masterAth.avatarUrl ||
            activeAth.idCard !== masterAth.idCard ||
            activeAth.dob !== masterAth.dob ||
            activeAth.hometown !== masterAth.hometown ||
            activeAth.province !== masterAth.province ||
            activeAth.country !== masterAth.country ||
            activeAth.countryCode !== masterAth.countryCode ||
            activeAth.status !== masterAth.status ||
            activeAth.gearSlingName !== masterAth.gearSlingName ||
            activeAth.gearForkWidth !== masterAth.gearForkWidth ||
            activeAth.gearBandSpec !== masterAth.gearBandSpec ||
            activeAth.gearAmmoSize !== masterAth.gearAmmoSize ||
            activeAth.gearStance !== masterAth.gearStance
          ) {
            changed = true;
            return {
              ...activeAth,
              name: masterAth.name,
              team: masterAth.team,
              gender: masterAth.gender,
              avatarUrl: masterAth.avatarUrl,
              idCard: masterAth.idCard,
              dob: masterAth.dob,
              hometown: masterAth.hometown,
              province: masterAth.province,
              country: masterAth.country,
              countryCode: masterAth.countryCode,
              status: masterAth.status,
              gearSlingName: masterAth.gearSlingName || "",
              gearForkWidth: masterAth.gearForkWidth || "",
              gearBandSpec: masterAth.gearBandSpec || "",
              gearAmmoSize: masterAth.gearAmmoSize || "",
              gearStance: masterAth.gearStance || "",
            };
          }
        }
        return activeAth;
      });
      return changed ? updated : prevTeam;
    });
  }, [masterAthletes]);

  // --- Handlers for Athletes Scoring ---

  // Toggles the hit state of a specific check box
  const executeToggleScore = (athleteId: string, distanceId: string, shotIndex: number) => {
    if (competitionMode === "individual") {
      setInputAthletes((prev) => prev.filter((a) => a.id !== athleteId));
      setAthletes((prev) => {
        const next = prev.map((athlete) => {
          if (athlete.id !== athleteId) return athlete;

          const currentScores = athlete.scores[distanceId] 
            ? [...athlete.scores[distanceId]] 
            : Array(shotsCount).fill(null);

          // adjust length if mismatched
          if (currentScores.length < shotsCount) {
            const diff = shotsCount - currentScores.length;
            currentScores.push(...Array(diff).fill(null));
          }

          const val = currentScores[shotIndex];
          if (val === true) {
            currentScores[shotIndex] = false; // 2nd click -> Red X / Miss
          } else if (val === false) {
            currentScores[shotIndex] = null; // 3rd click -> Empty/Unchecked
          } else {
            currentScores[shotIndex] = true; // 1st click -> Checked / Hit
          }

          return {
            ...athlete,
            scores: {
              ...athlete.scores,
              [distanceId]: currentScores,
            },
          };
        });

        if (activeHistoryId?.startsWith("tour-")) {
          updateOnlineTournament(activeHistoryId, {
            athletes: next,
            inputAthletes: stripBase64Avatars(inputAthletes.filter((a) => a.id !== athleteId))
          }).catch(err => console.error("Immediate toggle save failed:", err));
        }

        return next;
      });
    } else {
      setTeamInputAthletes((prev) => prev.filter((a) => a.id !== athleteId));
      setTeamAthletes((prev) => {
        const next = prev.map((athlete) => {
          if (athlete.id !== athleteId) return athlete;

          const currentScores = athlete.scores[distanceId] 
            ? [...athlete.scores[distanceId]] 
            : Array(teamShotsCount).fill(null);

          // adjust length if mismatched
          if (currentScores.length < teamShotsCount) {
            const diff = teamShotsCount - currentScores.length;
            currentScores.push(...Array(diff).fill(null));
          }

          const val = currentScores[shotIndex];
          if (val === true) {
            currentScores[shotIndex] = false; // 2nd click -> Red X / Miss
          } else if (val === false) {
            currentScores[shotIndex] = null; // 3rd click -> Empty/Unchecked
          } else {
            currentScores[shotIndex] = true; // 1st click -> Checked / Hit
          }

          return {
            ...athlete,
            scores: {
              ...athlete.scores,
              [distanceId]: currentScores,
            },
          };
        });

        if (activeHistoryId?.startsWith("tour-")) {
          updateOnlineTournament(activeHistoryId, {
            teamAthletes: next,
            teamInputAthletes: stripBase64Avatars(teamInputAthletes.filter((a) => a.id !== athleteId))
          }).catch(err => console.error("Immediate team toggle save failed:", err));
        }

        return next;
      });
    }
  };

  const handleToggleScore = (athleteId: string, distanceId: string, shotIndex: number) => {
    if (!isScoringEditAuthorized) {
      setPendingScoreToggle({ athleteId, distanceId, shotIndex });
      setShowUnlockScoreModal(true);
      return;
    }
    executeToggleScore(athleteId, distanceId, shotIndex);
  };

  // Modifies an athlete details safely
  const handleUpdateAthlete = (athleteId: string, name: string, team: string, customId?: string) => {
    if (userRole !== "admin") {
      alert(language === "en" ? "Only Admin can edit athlete details!" : "Chỉ Admin mới có quyền chỉnh sửa thông tin VĐV!");
      return;
    }
    const checkId = customId ? customId.trim() : athleteId;
    const isIdTaken = masterAthletes.some((a) => a.id === checkId && a.id !== athleteId);
    const finalId = isIdTaken ? athleteId : checkId;

    // Update in Master Roster first
    setMasterAthletes((prev) =>
      prev.map((ma) => {
        if (ma.id !== athleteId) return ma;
        return {
          ...ma,
          id: finalId,
          name,
          team,
        };
      })
    );

    // Update in active tournament
    if (competitionMode === "individual") {
      setAthletes((prev) => {
        return prev.map((athlete) => {
          if (athlete.id !== athleteId) return athlete;
          
          // If distances or scores fields are missing, re-populate them
          const finalScores = { ...athlete.scores };
          distances.forEach((d) => {
            if (!finalScores[d.id]) {
              finalScores[d.id] = Array(shotsCount).fill(null);
            }
          });

          return {
            ...athlete,
            id: finalId,
            name,
            team,
            scores: finalScores,
          };
        });
      });
    } else {
      setTeamAthletes((prev) => {
        return prev.map((athlete) => {
          if (athlete.id !== athleteId) return athlete;
          
          // If distances or scores fields are missing, re-populate them
          const finalScores = { ...athlete.scores };
          teamDistances.forEach((d) => {
            if (!finalScores[d.id]) {
              finalScores[d.id] = Array(teamShotsCount).fill(null);
            }
          });

          return {
            ...athlete,
            id: finalId,
            name,
            team,
            scores: finalScores,
          };
        });
      });
    }
  };

  // Delete an athlete
  const handleDeleteAthlete = (athleteId: string) => {
    if (userRole !== "admin") {
      alert(language === "en" ? "Only Admin can delete athletes from the main board!" : "Chỉ Admin mới có quyền xóa VĐV khỏi bảng điểm chính!");
      return;
    }
    if (competitionMode === "individual") {
      setAthletes((prev) => {
        const nextAthletes = prev.filter((a) => a.id !== athleteId);
        const nextInputAthletes = inputAthletes.filter((a) => a.id !== athleteId);
        if (activeHistoryId?.startsWith("tour-")) {
          updateOnlineTournament(activeHistoryId, {
            athletes: nextAthletes,
            inputAthletes: stripBase64Avatars(nextInputAthletes)
          }).catch(err => console.error("Immediate delete save failed:", err));
        }
        return nextAthletes;
      });
      setInputAthletes((prev) => prev.filter((a) => a.id !== athleteId));
    } else {
      setTeamAthletes((prev) => {
        const nextTeamAthletes = prev.filter((a) => a.id !== athleteId);
        const nextTeamInputAthletes = teamInputAthletes.filter((a) => a.id !== athleteId);
        if (activeHistoryId?.startsWith("tour-")) {
          updateOnlineTournament(activeHistoryId, {
            teamAthletes: nextTeamAthletes,
            teamInputAthletes: stripBase64Avatars(nextTeamInputAthletes)
          }).catch(err => console.error("Immediate team delete save failed:", err));
        }
        return nextTeamAthletes;
      });
      setTeamInputAthletes((prev) => prev.filter((a) => a.id !== athleteId));
    }
  };

  // Move athlete position in the main scoring list
  const handleMoveAthlete = (athleteId: string, direction: "up" | "down") => {
    if (userRole !== "admin") {
      alert(language === "en" ? "Only Admin can reorder athletes!" : "Chỉ Admin mới có quyền thay đổi thứ tự VĐV!");
      return;
    }
    if (competitionMode === "individual") {
      setAthletes((prev) => {
        const idx = prev.findIndex((a) => a.id === athleteId);
        if (idx === -1) return prev;
        const targetIdx = direction === "up" ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= prev.length) return prev;
        const copy = [...prev];
        const temp = copy[idx];
        copy[idx] = copy[targetIdx];
        copy[targetIdx] = temp;
        return copy;
      });
    } else {
      setTeamAthletes((prev) => {
        const idx = prev.findIndex((a) => a.id === athleteId);
        if (idx === -1) return prev;
        const targetIdx = direction === "up" ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= prev.length) return prev;
        const copy = [...prev];
        const temp = copy[idx];
        copy[idx] = copy[targetIdx];
        copy[targetIdx] = temp;
        return copy;
      });
    }
  };

  // Toggle score for inputAthletes
  const handleToggleInputScore = (athleteId: string, distanceId: string, shotIndex: number) => {
    const list = competitionMode === "individual" ? inputAthletes : teamInputAthletes;
    const targetA = list.find((a) => a.id === athleteId);
    if (!isGlobalAdmin && targetA?.calledBy && targetA.calledBy.toLowerCase().trim() !== (currentUser?.email || "anonymous").toLowerCase().trim()) {
      return;
    }
    setHasUnsavedChanges(true);
    if (competitionMode === "individual") {
      setInputAthletes((prev) =>
        prev.map((athlete) => {
          if (athlete.id !== athleteId) return athlete;
          
          const currentScores = athlete.scores[distanceId] 
            ? [...athlete.scores[distanceId]] 
            : Array(shotsCount).fill(null);

          // adjust length if mismatched
          if (currentScores.length < shotsCount) {
            const diff = shotsCount - currentScores.length;
            currentScores.push(...Array(diff).fill(null));
          }

          const val = currentScores[shotIndex];
          if (val === true) {
            currentScores[shotIndex] = false; // 2nd click -> Red X / Miss
          } else if (val === false) {
            currentScores[shotIndex] = null; // 3rd click -> Empty/Unchecked
          } else {
            currentScores[shotIndex] = true; // 1st click -> Checked / Hit
          }

          return {
            ...athlete,
            scores: {
              ...athlete.scores,
              [distanceId]: currentScores,
            },
          };
        })
      );
    } else {
      setTeamInputAthletes((prev) =>
        prev.map((athlete) => {
          if (athlete.id !== athleteId) return athlete;
          
          const currentScores = athlete.scores[distanceId] 
            ? [...athlete.scores[distanceId]] 
            : Array(teamShotsCount).fill(null);

          // adjust length if mismatched
          if (currentScores.length < teamShotsCount) {
            const diff = teamShotsCount - currentScores.length;
            currentScores.push(...Array(diff).fill(null));
          }

          const val = currentScores[shotIndex];
          if (val === true) {
            currentScores[shotIndex] = false; // 2nd click -> Red X / Miss
          } else if (val === false) {
            currentScores[shotIndex] = null; // 3rd click -> Empty/Unchecked
          } else {
            currentScores[shotIndex] = true; // 1st click -> Checked / Hit
          }

          return {
            ...athlete,
            scores: {
              ...athlete.scores,
              [distanceId]: currentScores,
            },
          };
        })
      );
    }
  };

  const executeDirectScoreUpdate = (athleteId: string, distanceId: string, value: number | null) => {
    if (competitionMode === "individual") {
      setInputAthletes((prev) => prev.filter((a) => a.id !== athleteId));
      setAthletes((prev) => {
        const next = prev.map((athlete) => {
          if (athlete.id !== athleteId) return athlete;

          const currentScores = athlete.scores[distanceId] 
            ? [...athlete.scores[distanceId]] 
            : [null];

          currentScores[0] = value;

          return {
            ...athlete,
            scores: {
              ...athlete.scores,
              [distanceId]: currentScores,
            },
          };
        });

        if (activeHistoryId?.startsWith("tour-")) {
          updateOnlineTournament(activeHistoryId, {
            athletes: next,
            inputAthletes: stripBase64Avatars(inputAthletes.filter((a) => a.id !== athleteId))
          }).catch(err => console.error("Immediate direct score save failed:", err));
        }

        return next;
      });
    } else {
      setTeamInputAthletes((prev) => prev.filter((a) => a.id !== athleteId));
      setTeamAthletes((prev) => {
        const next = prev.map((athlete) => {
          if (athlete.id !== athleteId) return athlete;

          const currentScores = athlete.scores[distanceId] 
            ? [...athlete.scores[distanceId]] 
            : [null];

          currentScores[0] = value;

          return {
            ...athlete,
            scores: {
              ...athlete.scores,
              [distanceId]: currentScores,
            },
          };
        });

        if (activeHistoryId?.startsWith("tour-")) {
          updateOnlineTournament(activeHistoryId, {
            teamAthletes: next,
            teamInputAthletes: stripBase64Avatars(teamInputAthletes.filter((a) => a.id !== athleteId))
          }).catch(err => console.error("Immediate team direct score save failed:", err));
        }

        return next;
      });
    }
  };

  const handleUpdateDirectScore = (athleteId: string, distanceId: string, value: number | null) => {
    if (!isScoringEditAuthorized) {
      alert(language === "en" ? "You have not enabled score editing permissions! Please enable them to continue." : "Bạn chưa bật quyền chỉnh sửa điểm số! Vui lòng bật quyền để tiếp tục.");
      return;
    }
    executeDirectScoreUpdate(athleteId, distanceId, value);
  };

  const handleUpdateDirectInputScore = (athleteId: string, distanceId: string, value: number | null) => {
    const list = competitionMode === "individual" ? inputAthletes : teamInputAthletes;
    const targetA = list.find((a) => a.id === athleteId);
    if (!isGlobalAdmin && targetA?.calledBy && targetA.calledBy.toLowerCase().trim() !== (currentUser?.email || "anonymous").toLowerCase().trim()) {
      return;
    }
    setHasUnsavedChanges(true);
    if (competitionMode === "individual") {
      setInputAthletes((prev) =>
        prev.map((athlete) => {
          if (athlete.id !== athleteId) return athlete;

          const currentScores = athlete.scores[distanceId] 
            ? [...athlete.scores[distanceId]] 
            : [null];

          currentScores[0] = value;

          return {
            ...athlete,
            scores: {
              ...athlete.scores,
              [distanceId]: currentScores,
            },
          };
        })
      );
    } else {
      setTeamInputAthletes((prev) =>
        prev.map((athlete) => {
          if (athlete.id !== athleteId) return athlete;

          const currentScores = athlete.scores[distanceId] 
            ? [...athlete.scores[distanceId]] 
            : [null];

          currentScores[0] = value;

          return {
            ...athlete,
            scores: {
              ...athlete.scores,
              [distanceId]: currentScores,
            },
          };
        })
      );
    }
  };

  // Update solo shootout hits for main athletes
  const handleUpdateSoloHits = (athleteId: string, distanceId: string, rounds: any[]) => {
    const sum = rounds.reduce<number>((s, r) => {
      if (Array.isArray(r)) {
        return s + r.filter((v: any) => v === true).length;
      } else if (typeof r === 'number') {
        return s + r;
      }
      return s;
    }, 0);

    const isAnyActive = rounds.some(r => {
      if (Array.isArray(r)) return r.some(v => v === true || v === false);
      return r !== null && r !== undefined;
    });

    const finalSum = isAnyActive ? sum : null;

    if (competitionMode === "individual") {
      setAthletes((prev) =>
        prev.map((athlete) => {
          if (athlete.id !== athleteId) return athlete;
          return {
            ...athlete,
            soloHits: {
              ...(athlete.soloHits || {}),
              [distanceId]: finalSum as any,
            },
            soloRounds: {
              ...(athlete.soloRounds || {}),
              [distanceId]: rounds as any,
            },
          };
        })
      );
    } else {
      setTeamAthletes((prev) =>
        prev.map((athlete) => {
          if (athlete.id !== athleteId) return athlete;
          return {
            ...athlete,
            soloHits: {
              ...(athlete.soloHits || {}),
              [distanceId]: finalSum as any,
            },
            soloRounds: {
              ...(athlete.soloRounds || {}),
              [distanceId]: rounds as any,
            },
          };
        })
      );
    }
  };

  // Update solo shootout hits for input board athletes
  const handleUpdateInputSoloHits = (athleteId: string, distanceId: string, rounds: any[]) => {
    const sum = rounds.reduce<number>((s, r) => {
      if (Array.isArray(r)) {
        return s + r.filter((v: any) => v === true).length;
      } else if (typeof r === 'number') {
        return s + r;
      }
      return s;
    }, 0);

    const isAnyActive = rounds.some(r => {
      if (Array.isArray(r)) return r.some(v => v === true || v === false);
      return r !== null && r !== undefined;
    });

    const finalSum = isAnyActive ? sum : null;

    setHasUnsavedChanges(true);
    if (competitionMode === "individual") {
      setInputAthletes((prev) =>
        prev.map((athlete) => {
          if (athlete.id !== athleteId) return athlete;
          return {
            ...athlete,
            soloHits: {
              ...(athlete.soloHits || {}),
              [distanceId]: finalSum as any,
            },
            soloRounds: {
              ...(athlete.soloRounds || {}),
              [distanceId]: rounds as any,
            },
          };
        })
      );
    } else {
      setTeamInputAthletes((prev) =>
        prev.map((athlete) => {
          if (athlete.id !== athleteId) return athlete;
          return {
            ...athlete,
            soloHits: {
              ...(athlete.soloHits || {}),
              [distanceId]: finalSum as any,
            },
            soloRounds: {
              ...(athlete.soloRounds || {}),
              [distanceId]: rounds as any,
            },
          };
        })
      );
    }
  };

  // Update input athlete details
  const handleUpdateInputAthlete = (athleteId: string, name: string, team: string, customId?: string) => {
    const checkId = customId ? customId.trim() : athleteId;
    if (customId && customId.trim() !== athleteId) {
      const isIdTaken = masterAthletes.some((a) => a.id.trim().toLowerCase() === checkId.toLowerCase() && a.id !== athleteId);
      if (isIdTaken) {
        const existingAthlete = masterAthletes.find((a) => a.id.trim().toLowerCase() === checkId.toLowerCase());
        alert(language === "en" 
          ? `Athlete ID "${checkId}" already exists on the system (belongs to athlete "${existingAthlete?.name || ''}" - ${existingAthlete?.team || 'Independent'}). Please choose a different ID!` 
          : `Mã số VĐV (ID) "${checkId}" đã tồn tại trên hệ thống (thuộc VĐV "${existingAthlete?.name || ''}" - ${existingAthlete?.team || 'Tự do'}). Vui lòng chọn Mã số khác!`);
        return;
      }
    }
    const finalId = checkId;

    setHasUnsavedChanges(true);
    // Update in Master Roster first
    setMasterAthletes((prev) =>
      prev.map((ma) => {
        if (ma.id !== athleteId) return ma;
        return {
          ...ma,
          id: finalId,
          name,
          team,
        };
      })
    );

    // Update in inputAthletes or teamInputAthletes
    if (competitionMode === "individual") {
      setInputAthletes((prev) => {
        return prev.map((athlete) => {
          if (athlete.id !== athleteId) return athlete;
          
          const finalScores = { ...athlete.scores };
          distances.forEach((d) => {
            if (!finalScores[d.id]) {
              finalScores[d.id] = Array(shotsCount).fill(null);
            }
          });

          return {
            ...athlete,
            id: finalId,
            name,
            team,
            scores: finalScores,
          };
        });
      });
    } else {
      setTeamInputAthletes((prev) => {
        return prev.map((athlete) => {
          if (athlete.id !== athleteId) return athlete;
          
          const finalScores = { ...athlete.scores };
          teamDistances.forEach((d) => {
            if (!finalScores[d.id]) {
              finalScores[d.id] = Array(teamShotsCount).fill(null);
            }
          });

          return {
            ...athlete,
            id: finalId,
            name,
            team,
            scores: finalScores,
          };
        });
      });
    }
  };

  // Delete an input athlete
  const handleDeleteInputAthlete = (athleteId: string) => {
    setHasUnsavedChanges(true);
    let nextList: Athlete[] = [];
    const currentList = competitionMode === "individual" ? inputAthletes : teamInputAthletes;
    const athleteObj = currentList.find((a) => a.id === athleteId);

    if (competitionMode === "individual") {
      nextList = inputAthletes.filter((a) => a.id !== athleteId);
      setInputAthletes(nextList);
      deviceStorage.set("slingshot_input_athletes", stripBase64Avatars(nextList));
      if (activeHistoryId && activeHistoryId.startsWith("tour-")) {
        updateOnlineTournament(activeHistoryId, { inputAthletes: stripBase64Avatars(nextList) });
      }
    } else {
      nextList = teamInputAthletes.filter((a) => a.id !== athleteId);
      setTeamInputAthletes(nextList);
      deviceStorage.set("slingshot_team_input_athletes", stripBase64Avatars(nextList));
      if (activeHistoryId && activeHistoryId.startsWith("tour-")) {
        updateOnlineTournament(activeHistoryId, { teamInputAthletes: stripBase64Avatars(nextList) });
      }
    }

    if (athleteObj) {
      handleAddAuditLog(language === "en"
        ? `Released/Unlocked athlete: ${athleteObj.name} (ID: ${athleteObj.id})`
        : `Đã giải phóng/Mở khóa cho VĐV: ${athleteObj.name} (Mã VĐV: ${athleteObj.id})`
      );
    }
  };

  // Move input athlete position
  const handleMoveInputAthlete = (athleteId: string, direction: "up" | "down") => {
    setHasUnsavedChanges(true);
    if (competitionMode === "individual") {
      setInputAthletes((prev) => {
        const idx = prev.findIndex((a) => a.id === athleteId);
        if (idx === -1) return prev;
        const targetIdx = direction === "up" ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= prev.length) return prev;
        const copy = [...prev];
        const temp = copy[idx];
        copy[idx] = copy[targetIdx];
        copy[targetIdx] = temp;
        return copy;
      });
    } else {
      setTeamInputAthletes((prev) => {
        const idx = prev.findIndex((a) => a.id === athleteId);
        if (idx === -1) return prev;
        const targetIdx = direction === "up" ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= prev.length) return prev;
        const copy = [...prev];
        const temp = copy[idx];
        copy[idx] = copy[targetIdx];
        copy[targetIdx] = temp;
        return copy;
      });
    }
  };

  // Save/Transfer scores from input board to Ghi Điểm page
  const handleSaveInputScoresToMain = () => {
    const activeInputList = competitionMode === "individual" ? inputAthletes : teamInputAthletes;
    const myEmail = (currentUser?.email || "anonymous").toLowerCase().trim();
    const isOnlineTour = activeHistoryId?.startsWith("tour-");
    const refereeInputList = activeInputList.filter((a) => {
      if (isOnlineTour) {
        const caller = (a.calledBy || "").toLowerCase().trim();
        return caller === myEmail;
      }
      return true;
    });

    if (refereeInputList.length === 0) {
      alert(language === "en" ? "There are no athletes called by you in the scoring grid!" : "Không có vận động viên nào do bạn gọi trong bảng Nhập Điểm!");
      return;
    }
    setSaveStatus(null);
    setIsSaveConfirmModalOpen(true);
  };

  const executeSaveScores = async () => {
    setIsSavingScores(true);
    setSaveStatus(null);

    const activeInputList = competitionMode === "individual" ? inputAthletes : teamInputAthletes;
    const myEmail = (currentUser?.email || "anonymous").toLowerCase().trim();
    const isOnlineTour = activeHistoryId?.startsWith("tour-");
    const refereeInputList = activeInputList.filter((a) => {
      if (isOnlineTour) {
        const caller = (a.calledBy || "").toLowerCase().trim();
        return caller === myEmail;
      }
      return true;
    });

    if (refereeInputList.length === 0) {
      setSaveStatus({ 
        success: false, 
        message: language === "en" ? "There are no athletes called by you in the scoring grid!" : "Không có vận động viên nào do bạn gọi trong bảng Nhập Điểm!" 
      });
      setIsSavingScores(false);
      return;
    }

    let nextAthletes = [...athletes];
    let nextTeamAthletes = [...teamAthletes];
    let nextInputAthletes = [...inputAthletes];
    let nextTeamInputAthletes = [...teamInputAthletes];

    if (competitionMode === "individual") {
      const mergedAthletes = [...athletes];
      refereeInputList.forEach((ia) => {
        const existingIdx = mergedAthletes.findIndex((a) => a.id === ia.id);
        if (existingIdx !== -1) {
          mergedAthletes[existingIdx] = {
            ...mergedAthletes[existingIdx],
            scores: {
              ...mergedAthletes[existingIdx].scores,
              ...ia.scores,
            },
            soloHits: {
              ...(mergedAthletes[existingIdx].soloHits || {}),
              ...(ia.soloHits || {}),
            },
            soloRounds: {
              ...(mergedAthletes[existingIdx].soloRounds || {}),
              ...(ia.soloRounds || {}),
            },
          };
        } else {
          mergedAthletes.push(ia);
        }
      });
      nextAthletes = mergedAthletes;
      nextInputAthletes = inputAthletes.filter((ia) => {
        return !refereeInputList.some((r) => r.id === ia.id);
      });
    } else {
      const mergedAthletes = [...teamAthletes];
      refereeInputList.forEach((ia) => {
        const existingIdx = mergedAthletes.findIndex((a) => a.id === ia.id);
        if (existingIdx !== -1) {
          mergedAthletes[existingIdx] = {
            ...mergedAthletes[existingIdx],
            scores: {
              ...mergedAthletes[existingIdx].scores,
              ...ia.scores,
            },
            soloHits: {
              ...(mergedAthletes[existingIdx].soloHits || {}),
              ...(ia.soloHits || {}),
            },
            soloRounds: {
              ...(mergedAthletes[existingIdx].soloRounds || {}),
              ...(ia.soloRounds || {}),
            },
          };
        } else {
          mergedAthletes.push(ia);
        }
      });
      nextTeamAthletes = mergedAthletes;
      nextTeamInputAthletes = teamInputAthletes.filter((ia) => {
        return !refereeInputList.some((r) => r.id === ia.id);
      });
    }

    const firstImported = refereeInputList[0];
    if (firstImported) {
      setPendingScrollAthleteId(firstImported.id);
    }

    // Instantly update states to provide lightning fast feedback
    setAthletes(nextAthletes);
    setTeamAthletes(nextTeamAthletes);
    setInputAthletes(nextInputAthletes);
    setTeamInputAthletes(nextTeamInputAthletes);
    setHasUnsavedChanges(false);

    // Local storage writes (sync)
    saveAvatarsFromAthletes(nextAthletes);
    saveAvatarsFromAthletes(nextTeamAthletes);
    deviceStorage.set("slingshot_athletes", stripBase64Avatars(nextAthletes));
    deviceStorage.set("slingshot_team_athletes", stripBase64Avatars(nextTeamAthletes));
    deviceStorage.set("slingshot_input_athletes", stripBase64Avatars(nextInputAthletes));
    deviceStorage.set("slingshot_team_input_athletes", stripBase64Avatars(nextTeamInputAthletes));

    // Handle any pending tab changes instantly
    if (pendingTabTarget) {
      if (pendingTabTarget.type === "tab") {
        setActiveTab((pendingTabTarget.value as any) || "dashboard");
      } else if (pendingTabTarget.type === "exit") {
        handleExitTournament((pendingTabTarget.value as any) || "all");
      } else if (pendingTabTarget.type === "select_tour") {
        const { id, tournament, targetTab } = pendingTabTarget.payload || {};
        handleSelectTournament(id, tournament, targetTab);
      }
      setPendingTabTarget(null);
    } else {
      // Stay at input_scores
      setActiveTab("input_scores");
    }

    // Close modal and loading states instantly
    setIsSaveConfirmModalOpen(false);
    setIsSavingScores(false);
    setSaveStatus(null);

    // Asynchronously perform background Firestore update
    if (activeHistoryId && activeHistoryId.startsWith("tour-")) {
      const athleteNames = refereeInputList.map((a) => `${a.name} (Mã: ${a.id})`).join(", ");
      handleAddAuditLog(language === "en"
        ? `Saved scores for athletes: ${athleteNames}`
        : `Đã lưu và đồng bộ điểm cho các VĐV: ${athleteNames}`
      );
      updateOnlineTournament(activeHistoryId, {
        athletes: nextAthletes,
        teamAthletes: nextTeamAthletes,
        inputAthletes: nextInputAthletes,
        teamInputAthletes: nextTeamInputAthletes,
      }).catch((err) => {
        console.error("Background full cloud save failed:", err);
      });
    }
  };

  const executeSaveSingleAthlete = async () => {
    if (!singleAthleteToSave) return;
    setIsSavingScores(true);
    setSaveStatus(null);

    const target = singleAthleteToSave;
    let nextAthletes = [...athletes];
    let nextTeamAthletes = [...teamAthletes];
    let nextInputAthletes = [...inputAthletes];
    let nextTeamInputAthletes = [...teamInputAthletes];

    if (competitionMode === "individual") {
      const mergedAthletes = [...athletes];
      const existingIdx = mergedAthletes.findIndex((a) => a.id === target.id);
      if (existingIdx !== -1) {
        mergedAthletes[existingIdx] = {
          ...mergedAthletes[existingIdx],
          scores: {
            ...mergedAthletes[existingIdx].scores,
            ...target.scores,
          },
          soloHits: {
            ...(mergedAthletes[existingIdx].soloHits || {}),
            ...(target.soloHits || {}),
          },
          soloRounds: {
            ...(mergedAthletes[existingIdx].soloRounds || {}),
            ...(target.soloRounds || {}),
          },
        };
      } else {
        mergedAthletes.push(target);
      }
      nextAthletes = mergedAthletes;
      nextInputAthletes = inputAthletes.filter((a) => a.id !== target.id);
    } else {
      const mergedAthletes = [...teamAthletes];
      const existingIdx = mergedAthletes.findIndex((a) => a.id === target.id);
      if (existingIdx !== -1) {
        mergedAthletes[existingIdx] = {
          ...mergedAthletes[existingIdx],
          scores: {
            ...mergedAthletes[existingIdx].scores,
            ...target.scores,
          },
          soloHits: {
            ...(mergedAthletes[existingIdx].soloHits || {}),
            ...(target.soloHits || {}),
          },
          soloRounds: {
            ...(mergedAthletes[existingIdx].soloRounds || {}),
            ...(target.soloRounds || {}),
          },
        };
      } else {
        mergedAthletes.push(target);
      }
      nextTeamAthletes = mergedAthletes;
      nextTeamInputAthletes = teamInputAthletes.filter((a) => a.id !== target.id);
    }

    setPendingScrollAthleteId(target.id);

    // Instantly update states to provide lightning fast feedback
    setAthletes(nextAthletes);
    setTeamAthletes(nextTeamAthletes);
    setInputAthletes(nextInputAthletes);
    setTeamInputAthletes(nextTeamInputAthletes);

    const currentActiveList = competitionMode === "individual" ? nextInputAthletes : nextTeamInputAthletes;
    if (currentActiveList.length === 0) {
      setHasUnsavedChanges(false);
    }

    // Local storage writes (sync)
    saveAvatarsFromAthletes(nextAthletes);
    saveAvatarsFromAthletes(nextTeamAthletes);
    deviceStorage.set("slingshot_athletes", stripBase64Avatars(nextAthletes));
    deviceStorage.set("slingshot_team_athletes", stripBase64Avatars(nextTeamAthletes));
    deviceStorage.set("slingshot_input_athletes", stripBase64Avatars(nextInputAthletes));
    deviceStorage.set("slingshot_team_input_athletes", stripBase64Avatars(nextTeamInputAthletes));

    // Close modal instantly
    setSingleAthleteToSave(null);
    setIsSavingScores(false);
    setSaveStatus(null);

    // Asynchronously perform background Firestore update
    if (activeHistoryId && activeHistoryId.startsWith("tour-")) {
      handleAddAuditLog(language === "en"
        ? `Saved scores for athlete: ${target.name} (ID: ${target.id})`
        : `Đã lưu và đồng bộ điểm cho VĐV: ${target.name} (Mã VĐV: ${target.id})`
      );
      updateOnlineTournament(activeHistoryId, {
        athletes: nextAthletes,
        teamAthletes: nextTeamAthletes,
        inputAthletes: nextInputAthletes,
        teamInputAthletes: nextTeamInputAthletes,
      }).catch((err) => {
        console.error("Single background cloud save failed:", err);
      });
    }
  };

  // Increments and appends a new athlete with a unique auto ID
  const handleAddAthleteCustom = (name: string, team: string) => {
    const activeAthList = competitionMode === "individual" ? athletes : teamAthletes;
    const finalName = name.trim() || `VĐV Mới ${activeAthList.length + 1}`;
    
    // Auto-generate numeric ID based on maximum current numeric ID + 1, skipping any existing IDs
    let nextIdNum = 1;
    const existingIdsSet = new Set([
      ...activeAthList.map((a) => a.id.trim().toLowerCase()),
      ...masterAthletes.map((a) => a.id.trim().toLowerCase()),
    ]);
    while (existingIdsSet.has(nextIdNum.toString().padStart(4, "0").toLowerCase())) {
      nextIdNum++;
    }
    const finalId = nextIdNum.toString().padStart(4, "0");

    if (competitionMode === "individual") {
      const freshScores: Record<string, (boolean | null)[]> = {};
      distances.forEach((dist) => {
        freshScores[dist.id] = Array(shotsCount).fill(null);
      });

      const newAthlete: Athlete = {
        id: finalId,
        name: finalName,
        team: team.trim(),
        scores: freshScores,
      };
      setAthletes((prev) => [...prev, newAthlete]);
    } else {
      const freshScores: Record<string, (boolean | null)[]> = {};
      teamDistances.forEach((dist) => {
        freshScores[dist.id] = Array(teamShotsCount).fill(null);
      });

      const newAthlete: Athlete = {
        id: finalId,
        name: finalName,
        team: team.trim(),
        scores: freshScores,
      };
      setTeamAthletes((prev) => [...prev, newAthlete]);
    }
  };

  // Instantly triggers adding athlete view (when clicking the giant '+' button at bottom)
  const handleAddBlankAthlete = () => {
    if (userRole !== "admin") {
      alert(language === "en" ? "Only Admin can add or call athletes from this page!" : "Chỉ Admin mới có quyền gọi VĐV vào giải đấu từ phần GHI ĐIỂM này!");
      return;
    }
    if (!isScoringEditAuthorized) {
      setPendingAddAthlete(true);
      setShowUnlockScoreModal(true);
      return;
    }
    setIsAddingAthleteToTournament(true);
  };

  // Add message to tournament auditLog
  const handleAddAuditLog = useCallback(async (msg: string) => {
    if (!activeHistoryId || !activeHistoryId.startsWith("tour-")) return;
    const timeStr = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
    const userIdentifier = currentUser?.email || currentUser?.uid || "Unknown";
    const newEntry = `[${timeStr}] ${userIdentifier}: ${msg}\n`;
    
    // Read current log
    const currentLog = currentTournamentDoc?.auditLog || "";
    const updatedLog = newEntry + currentLog;
    
    try {
      await updateOnlineTournament(activeHistoryId, { auditLog: updatedLog });
    } catch (err) {
      console.error("Failed to append audit log:", err);
    }
  }, [activeHistoryId, currentUser, currentTournamentDoc]);

  // --- Handlers for Settings & Administration Actions ---

  // Save current snapshot of scores to historical archive
  const handleSaveCurrentSessionToHistory = (customName?: string) => {
    const nameToSave = customName?.trim() || `${matchName} (Lưu lúc ${new Date().toLocaleTimeString("vi-VN")})`;
    
    const newHistoryItem: MatchHistoryItem = {
      id: `hist-${Date.now()}`,
      date: new Date().toISOString(),
      matchName: nameToSave,
      shotCount: shotsCount,
      distances: [...distances],
      athletes: JSON.parse(JSON.stringify(athletes)), // Only save active tournament athletes (Ghi Điểm)
      masterCount: masterAthletes.length,
      masterAthletes: JSON.parse(JSON.stringify(masterAthletes)),
      teamDistances: [...teamDistances],
      teamShotCount: teamShotsCount,
      teamAthletes: JSON.parse(JSON.stringify(teamAthletes)),
      startDate: startDate,
      endDate: endDate,
      clubs: JSON.parse(JSON.stringify(clubs)),
    };

    setHistory((prev) => {
      // If we are saving from settings with an explicit non-temporary name that matches an existing tournament, overwrite it or prepend
      const existingIndex = prev.findIndex((h) => h.matchName.toLowerCase() === nameToSave.toLowerCase());
      if (existingIndex > -1) {
        const copy = [...prev];
        copy[existingIndex] = newHistoryItem;
        return copy;
      }
      return [newHistoryItem, ...prev];
    });
    alert(language === "en" ? `Successfully saved tournament "${nameToSave}" to history list.` : `Đã lưu thành công trận đấu "${nameToSave}" vào danh sách lịch sử.`);
  };

  // Exit current tournament and reset all tournament state variables back to defaults
  const handleExitTournament = async (filter: "all" | "all_list" | "active" | "followed" = "all") => {
    const isOnlineTourExit = !!(activeHistoryId && activeHistoryId.startsWith("tour-"));

    if (isOnlineTourExit && activeHistoryId && (userRole === "admin" || userRole === "referee")) {
      try {
        await updateOnlineTournament(activeHistoryId, {
          matchName,
          startDate,
          endDate,
          distances,
          shotsCount,
          athletes,
          teamDistances,
          teamShotsCount,
          teamAthletes,
          inputAthletes,
          teamInputAthletes,
          directMaxPoints,
          teamDirectMaxPoints,
          directMaxShots,
          teamDirectMaxShots,
          masterAthletes,
          bannerUrl,
          avatarUrl,
          laneCapacity,
          clubs: participatingClubs
        });
      } catch (err) {
        console.error("Failed to sync online tournament on exit:", err);
      }
    }

    // DISARM ALL AUTO-SYNC PUBLISHERS IMMEDIATELY BEFORE EXITING
    setIsTournamentConfigLoaded(false);
    setCurrentTournamentDoc(null);
    loadedTournamentIdRef.current = null;

    // Auto-save roster to stored athlete lists on exit ONLY for local offline draft sessions (not online tournaments)
    const rosterToSave = (masterAthletes && masterAthletes.length > 0) ? masterAthletes : athletes;
    if (!isOnlineTourExit && userRole === "admin" && matchName && matchName.trim() && rosterToSave && rosterToSave.length > 0) {
      const nameToUse = matchName.trim();
      setStoredAthleteLists((prev) => {
        const existingItem = prev?.find((item) => item.name.toLowerCase() === nameToUse.toLowerCase());
        const filtered = (prev || []).filter((item) => item.name.toLowerCase() !== nameToUse.toLowerCase());
        const updatedRecord = {
          id: existingItem?.id || `list-${Date.now()}`,
          name: nameToUse,
          createdAt: existingItem?.createdAt || new Date().toISOString(),
          athletes: JSON.parse(JSON.stringify(rosterToSave)),
        };
        return [updatedRecord, ...filtered];
      });
    }

    setActiveHistoryId(null);
    setAthletes([]);
    setTeamAthletes([]);
    setInputAthletes([]);
    setTeamInputAthletes([]);

    // Clear active session rosters from storage so home re-hydration doesn't resurrect stale scores
    deviceStorage.set("slingshot_athletes", []);
    deviceStorage.set("slingshot_team_athletes", []);
    deviceStorage.set("slingshot_input_athletes", []);
    deviceStorage.set("slingshot_team_input_athletes", []);

    try {
      const savedGlobal = localStorage.getItem("slingshot_master_athletes_global") || localStorage.getItem("slingshot_master_athletes");
      if (savedGlobal) {
        const parsed = restoreBase64Avatars(JSON.parse(savedGlobal));
        const cleaned = parsed.map((a: Athlete) => ({ ...a, scores: {}, soloHits: {}, soloRounds: {}, calledBy: "" }));
        setMasterAthletes(cleaned);
      } else {
        setMasterAthletes([]);
      }
    } catch (e) {
      setMasterAthletes([]);
    }
    setMatchName("");
    setHeaderTempName("");
    setStartDate("");
    setEndDate("");
    setDistances(JSON.parse(JSON.stringify(DEFAULT_DISTANCES)));
    setShotsCount(DEFAULT_SHOTS_COUNT);
    setTeamDistances(JSON.parse(JSON.stringify(DEFAULT_DISTANCES)));
    setTeamShotsCount(DEFAULT_SHOTS_COUNT);
    setCompetitionMode("individual");
    setDirectMaxPoints(undefined);
    setTeamDirectMaxPoints(undefined);
    setSettingsSubTab("config");
    setAthleteForceTab("athletes");
    
    // Explicitly delete cached active tournament identifier
    localStorage.removeItem("slingshot_active_history_id");
    deviceStorage.remove("slingshot_active_history_id");

    setHomeFilter(filter);
    setActiveTab("home");
  };

  // Restore scores state from archive
  const handleRestoreHistoryItem = (itemId: string) => {
    const target = history.find((h) => h.id === itemId);
    if (!target) return;

    // Put into draft preview mode (activeHistoryId is null to show Offline preview draft)
    setActiveHistoryId(null);
    setDraftPreviewItem(target);

    // Now restore target match fields locally
    setMatchName(target.matchName);
    setStartDate(target.startDate || "");
    setEndDate(target.endDate || "");
    setDistances(target.distances);
    setShotsCount(target.shotCount);
    setAthletes(target.athletes);

    if (target.teamDistances) setTeamDistances(target.teamDistances);
    if (target.teamShotCount) setTeamShotsCount(target.teamShotCount);
    if (target.teamAthletes) setTeamAthletes(target.teamAthletes);
    if (target.clubs) {
      setClubs(target.clubs);
    } else {
      setClubs([]);
    }
    
    // Restore master list of that match fully into master registry (Quản lý VĐV), stripping leftover scores
    const rawMasters = target.masterAthletes && target.masterAthletes.length > 0
      ? target.masterAthletes
      : target.athletes;
    const restoredMasters = (rawMasters || []).map((a: Athlete) => ({
      ...a,
      scores: {},
      soloHits: {},
      soloRounds: {},
      calledBy: "",
    }));
    setMasterAthletes(restoredMasters);

    // Clear active temporary inputs
    setInputAthletes([]);
    setTeamInputAthletes([]);

    setActiveTab("scoring"); // redirect back to scorecards
    alert(language === "en" 
      ? `Opened offline DRAFT preview mode for tournament: "${target.matchName}". You can check the roster and scores, then click "Confirm Publish Online" on the top warning bar to sync with Cloud.`
      : `Đã mở chế độ xem trước BẢN NHÁP ngoại tuyến cho giải: "${target.matchName}". Bạn có thể kiểm tra danh sách thi đấu và bảng điểm, sau đó bấm "Xác nhận Đăng Online" ở thanh cảnh báo trên cùng để đồng bộ đám mây.`);
  };

  // Remove history snapshot
  const handleDeleteHistoryItem = (itemId: string) => {
    const target = history.find((h) => h.id === itemId);
    if (target) {
      const matchName = target.matchName;
      // Also delete the saved athlete roster list with the exact same tournament name
      setStoredAthleteLists((prev) => prev.filter((list) => list.name.toLowerCase() !== matchName.toLowerCase()));
    }
    setHistory((prev) => prev.filter((h) => h.id !== itemId));
  };

  const handleOverwriteOnlinePublish = async (selectedOnlineTourId: string) => {
    if (!draftPreviewItem) return;
    if (!selectedOnlineTourId) {
      alert(language === "en" ? "Please select an online tournament to overwrite!" : "Vui lòng chọn giải đấu online cần ghi đè!");
      return;
    }
    const targetTour = onlineTournaments.find(t => t.id === selectedOnlineTourId);
    if (!targetTour) return;

    const confirmText = language === "en"
      ? `⚠️ Are you sure you want to OVERWRITE all scores, athlete roster, and configuration of the online tournament "${targetTour.matchName}" with this draft data?\n\nAll old data of this online tournament will be permanently replaced!`
      : `⚠️ Bạn có chắc chắn muốn GHI ĐÈ toàn bộ điểm số, danh sách VĐV, và cấu hình của giải online "${targetTour.matchName}" bằng dữ liệu bản nháp này không?\n\nToàn bộ dữ liệu cũ của giải online này sẽ bị thay thế vĩnh viễn!`;
    if (!window.confirm(confirmText)) {
      return;
    }

    try {
      await updateOnlineTournament(selectedOnlineTourId, {
        matchName: targetTour.matchName,
        distances: draftPreviewItem.distances,
        shotsCount: draftPreviewItem.shotCount,
        athletes: draftPreviewItem.athletes,
        teamDistances: draftPreviewItem.teamDistances || [],
        teamShotsCount: draftPreviewItem.teamShotCount || DEFAULT_SHOTS_COUNT,
        teamAthletes: draftPreviewItem.teamAthletes || [],
        masterAthletes: draftPreviewItem.masterAthletes || draftPreviewItem.athletes || [],
        inputAthletes: draftPreviewItem.inputAthletes || [],
        teamInputAthletes: draftPreviewItem.teamInputAthletes || [],
        directMaxPoints: draftPreviewItem.directMaxPoints,
        teamDirectMaxPoints: draftPreviewItem.teamDirectMaxPoints,
        directMaxShots: draftPreviewItem.directMaxShots || 10,
        teamDirectMaxShots: draftPreviewItem.teamDirectMaxShots || 10,
        clubs: (clubs || []).filter(c =>
          (draftPreviewItem.athletes || []).some(a => a.team?.trim().toLowerCase() === c.name.trim().toLowerCase()) ||
          (draftPreviewItem.teamAthletes || []).some(a => a.team?.trim().toLowerCase() === c.name.trim().toLowerCase())
        ),
      });

      // Update local active state to this overwritten tournament
      setActiveHistoryId(selectedOnlineTourId);
      localStorage.setItem("slingshot_active_history_id", selectedOnlineTourId);
      setDraftPreviewItem(null);
      setIsPublishDraftModalOpen(false);
      setActiveTab("dashboard");

      alert(language === "en" ? `Successfully overwrote draft data onto online tournament "${targetTour.matchName}"!` : `Đã ghi đè thành công dữ liệu bản nháp lên giải online "${targetTour.matchName}"!`);
    } catch (err: any) {
      alert(language === "en" ? `Online overwrite error: ${err.message || err}` : `Lỗi ghi đè online: ${err.message || err}`);
    }
  };

  const handleCreateNewOnlinePublish = async (newOnlineTourName: string) => {
    if (!draftPreviewItem) return;
    if (!newOnlineTourName.trim()) {
      alert(language === "en" ? "Please enter a new tournament name!" : "Vui lòng nhập tên giải đấu mới!");
      return;
    }

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        alert(language === "en" ? "You need to log in to create an online tournament!" : "Bạn cần đăng nhập để khởi tạo giải đấu online!");
        return;
      }

      const creatorEmail = currentUser.email || "";
      const newTourId = await createOnlineTournament(
        newOnlineTourName.trim(),
        currentUser.uid,
        creatorEmail,
        {
          competitionMode: draftPreviewItem.teamAthletes && draftPreviewItem.teamAthletes.length > 0 ? "team" : "individual",
          shotsCount: draftPreviewItem.shotCount,
          teamShotsCount: draftPreviewItem.teamShotCount || DEFAULT_SHOTS_COUNT,
          distances: draftPreviewItem.distances,
          teamDistances: draftPreviewItem.teamDistances || [],
          athletes: draftPreviewItem.athletes,
          teamAthletes: draftPreviewItem.teamAthletes || [],
          inputAthletes: draftPreviewItem.inputAthletes || [],
          teamInputAthletes: draftPreviewItem.teamInputAthletes || [],
          masterAthletes: draftPreviewItem.masterAthletes || draftPreviewItem.athletes || [],
          clubs: (clubs || []).filter(c =>
            (draftPreviewItem.athletes || []).some(a => a.team?.trim().toLowerCase() === c.name.trim().toLowerCase()) ||
            (draftPreviewItem.teamAthletes || []).some(a => a.team?.trim().toLowerCase() === c.name.trim().toLowerCase())
          ),
        }
      );

      // Track creation time local backup gate
      localStorage.setItem(`slingshot_created_at_${newTourId}`, Date.now().toString());

      // Update active tournament id
      setActiveHistoryId(newTourId);
      localStorage.setItem("slingshot_active_history_id", newTourId);
      setDraftPreviewItem(null);
      setIsPublishDraftModalOpen(false);
      setActiveTab("dashboard");

      alert(language === "en" ? `Successfully created and published new online tournament "${newOnlineTourName.trim()}"!` : `Đã tạo mới và đăng giải online "${newOnlineTourName.trim()}" thành công!`);
    } catch (err: any) {
      alert(language === "en" ? `Error creating online tournament: ${err.message || err}` : `Lỗi tạo giải mới online: ${err.message || err}`);
    }
  };

  // Clear all scores inside boxes back to unchecked, preserving the players list
  const handleResetSession = () => {
    setAthletes((prev) =>
      prev.map((athlete) => {
        const resetScores: Record<string, (boolean | null)[]> = {};
        distances.forEach((dist) => {
          resetScores[dist.id] = Array(shotsCount).fill(null);
        });
        return {
          ...athlete,
          scores: resetScores,
          soloHits: {},
          soloRounds: {},
          calledBy: "",
        };
      })
    );

    setTeamAthletes((prev) =>
      prev.map((athlete) => {
        const resetScores: Record<string, (boolean | null)[]> = {};
        teamDistances.forEach((dist) => {
          resetScores[dist.id] = Array(teamShotsCount).fill(null);
        });
        return {
          ...athlete,
          scores: resetScores,
          soloHits: {},
          soloRounds: {},
          calledBy: "",
        };
      })
    );

    setInputAthletes([]);
    setTeamInputAthletes([]);
    deviceStorage.set("slingshot_input_athletes", []);
    deviceStorage.set("slingshot_team_input_athletes", []);
  };

  // Validate and read imported text data backup (Active tournament configuration & active athletes only)
  const handleImportSingleBackup = (dataString: string): boolean => {
    try {
      const parsed = JSON.parse(dataString);
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        Array.isArray(parsed.distances) &&
        Array.isArray(parsed.athletes)
      ) {
        const incomingName = (parsed.matchName || "Giải đấu mới").trim();
        
        // Find existing with same name in history
        const duplicateIdx = history.findIndex(
          (h) => h.matchName.trim().toLowerCase() === incomingName.toLowerCase()
        );
        
        let finalName = incomingName;
        let shouldOverwrite = false;
        let shouldAppendNew = true;
        let proceed = true;
        
        if (duplicateIdx > -1) {
          // If name matches, show overwrite, rename or cancel
          const isOverwrite = window.confirm(
            `Giải đấu "${incomingName}" đã tồn tại trong danh sách Lịch sử.\n\n` +
            `• Chọn [OK (Xác nhận)] để GHI ĐÈ giải cũ.\n` +
            `• Chọn [Hủy (Cancel)] để ĐỔI TÊN giải và lưu song song cả hai giải.`
          );
          
          if (isOverwrite) {
            shouldOverwrite = true;
            shouldAppendNew = false;
          } else {
            const newName = window.prompt(
              `Vui lòng nhập TÊN MỚI cho giải đấu phục hồi để tránh trùng lập:`,
              incomingName + " (Bản phục hồi)"
            );
            if (newName && newName.trim() !== "") {
              finalName = newName.trim();
              shouldAppendNew = true;
            } else {
              // User pressed Cancel on prompt or gave empty name -> cancel entirely
              proceed = false;
            }
          }
        }
        
        if (!proceed) {
          return false;
        }

        // Apply active states
        setMatchName(finalName);
        setDistances(parsed.distances);
        if (parsed.shotsCount) setShotsCount(parsed.shotsCount);
        
        const restoredAthletes = restoreBase64Avatars(parsed.athletes);
        setAthletes(restoredAthletes);
        saveAvatarsFromAthletes(restoredAthletes);

        // Sync team parameters if present
        if (parsed.teamDistances) setTeamDistances(parsed.teamDistances);
        if (parsed.teamShotsCount) setTeamShotsCount(parsed.teamShotsCount);
        if (parsed.teamAthletes) {
          const restoredTeam = restoreBase64Avatars(parsed.teamAthletes);
          setTeamAthletes(restoredTeam);
          saveAvatarsFromAthletes(restoredTeam);
        }

        // Put/Add this session into matches history
        const newHistoryItem: MatchHistoryItem = {
          id: shouldOverwrite ? history[duplicateIdx].id : `hist-${Date.now()}`,
          date: new Date().toISOString(),
          matchName: finalName,
          shotCount: parsed.shotsCount || shotsCount,
          distances: parsed.distances,
          athletes: restoredAthletes,
          masterCount: restoredAthletes.length,
          masterAthletes: restoredAthletes,
          teamDistances: parsed.teamDistances || [...teamDistances],
          teamShotCount: parsed.teamShotsCount || teamShotsCount,
          teamAthletes: parsed.teamAthletes ? restoreBase64Avatars(parsed.teamAthletes) : [...teamAthletes],
        };

        setHistory((prev) => {
          if (shouldOverwrite) {
            const updated = [...prev];
            updated[duplicateIdx] = newHistoryItem;
            return updated;
          } else if (shouldAppendNew) {
            // Append at the front (as modern/active item)
            return [newHistoryItem, ...prev];
          }
          return prev;
        });

        alert(language === "en" ? `Successfully restored tournament "${finalName}" and logged it in History.` : `Đã khôi phục thành công giải đấu "${finalName}" và ghi nhận vào Lịch Sử.`);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // Validate and read full database backup (Active tournament + entire history log)
  const handleImportFullBackup = (dataString: string): boolean => {
    try {
      const parsed = JSON.parse(dataString);
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        Array.isArray(parsed.distances) &&
        Array.isArray(parsed.athletes)
      ) {
        // 1. First restore active session from parsed
        const incomingActiveName = (parsed.matchName || "Giải đấu mới").trim();
        setMatchName(incomingActiveName);
        setDistances(parsed.distances);
        if (parsed.shotsCount) setShotsCount(parsed.shotsCount);
        
        const restoredAthletes = restoreBase64Avatars(parsed.athletes);
        setAthletes(restoredAthletes);
        saveAvatarsFromAthletes(restoredAthletes);

        // Sync team parameters if present
        if (parsed.teamDistances) setTeamDistances(parsed.teamDistances);
        if (parsed.teamShotsCount) setTeamShotsCount(parsed.teamShotsCount);
        if (parsed.teamAthletes) {
          const restoredTeam = restoreBase64Avatars(parsed.teamAthletes);
          setTeamAthletes(restoredTeam);
          saveAvatarsFromAthletes(restoredTeam);
        }

        // 2. Now process the history log array properly (checking duplicates)
        if (Array.isArray(parsed.history)) {
          const restoredHistory = restoreBase64Avatars(parsed.history);
          
          setHistory((currentHistory) => {
            const tempHistory = [...currentHistory];
            
            restoredHistory.forEach((importedItem: MatchHistoryItem) => {
              if (importedItem.athletes) saveAvatarsFromAthletes(importedItem.athletes);
              if (importedItem.masterAthletes) saveAvatarsFromAthletes(importedItem.masterAthletes);
              if (importedItem.teamAthletes) saveAvatarsFromAthletes(importedItem.teamAthletes);
              
              const collisionIdx = tempHistory.findIndex(
                (h) => h.matchName.trim().toLowerCase() === importedItem.matchName.trim().toLowerCase()
              );
              
              if (collisionIdx > -1) {
                // Duplicate found. Ask!
                const isOverwrite = window.confirm(
                  `Giải đấu "${importedItem.matchName}" đã tồn tại trong lịch sử của bạn.\n\n` +
                  `• Chọn [OK (Xác nhận)] để GHI ĐÈ dữ liệu từ file backup lên giải hiện tại.\n` +
                  `• Chọn [Hủy (Cancel)] để ĐỔI TÊN giải từ file backup và lưu song song.`
                );
                
                if (isOverwrite) {
                  // overwrite existing index keeping old ID
                  tempHistory[collisionIdx] = {
                    ...importedItem,
                    id: tempHistory[collisionIdx].id // keep existing id
                  };
                } else {
                  // Prompt for name change
                  const newName = window.prompt(
                    `Vui lòng nhập TÊN MỚI cho giải đấu "${importedItem.matchName}" để lưu mới:`,
                    importedItem.matchName + " (Bản phục hồi)"
                  );
                  if (newName && newName.trim() !== "") {
                    tempHistory.unshift({
                      ...importedItem,
                      id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                      matchName: newName.trim()
                    });
                  } else {
                    // skip/discard importing this particular duplicate item
                  }
                }
              } else {
                // No duplicate, prepend directly!
                tempHistory.unshift(importedItem);
              }
            });
            
            return tempHistory;
          });
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // Export full JSON backup of the active session and historical events
  const handleExportBackup = () => {
    const backupData = {
      matchName,
      distances,
      shotsCount,
      athletes,
      history,
    };
    const jsonString = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `slingshot-scoring_${matchName.replace(/\s+/g, "-")}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Filter athletes for the scoring board view list
  const filteredAthletesScoring = athletes.filter((a) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      a.name.toLowerCase().includes(query) ||
      a.id.toLowerCase().includes(query) ||
      a.team.toLowerCase().includes(query)
    );
  });

  // Filter athletes for the input board view list
  const filteredInputAthletes = inputAthletes.filter((a) => {
    const isOnlineTour = activeHistoryId?.startsWith("tour-");
    if (isOnlineTour) {
      const myEmail = (currentUser?.email || "anonymous").toLowerCase().trim();
      const calledEmail = (a.calledBy || "").toLowerCase().trim();
      if (calledEmail !== myEmail) {
        return false;
      }
    }
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      a.name.toLowerCase().includes(query) ||
      a.id.toLowerCase().includes(query) ||
      a.team.toLowerCase().includes(query)
    );
  });

  // Contextual current pointers based on active competitionMode
  const currentDistances = competitionMode === "individual" ? distances : teamDistances;
  const currentShotsCount = competitionMode === "individual" ? shotsCount : teamShotsCount;
  const currentAthletes = competitionMode === "individual" ? athletes : teamAthletes;
  const currentInputAthletes = competitionMode === "individual" ? inputAthletes : teamInputAthletes;
  const myEmailForInput = (currentUser?.email || "anonymous").toLowerCase().trim();
  const myCalledInputAthletes = currentInputAthletes.filter((a) => {
    const isOnlineTour = activeHistoryId?.startsWith("tour-");
    if (isOnlineTour) {
      const caller = (a.calledBy || "").toLowerCase().trim();
      return caller === myEmailForInput;
    }
    return true;
  });

  // Filter team athletes for the scoring board view list
  const filteredTeamAthletesScoring = teamAthletes.filter((a) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      a.name.toLowerCase().includes(query) ||
      a.id.toLowerCase().includes(query) ||
      a.team.toLowerCase().includes(query)
    );
  });

  // Filter team athletes for the input board view list
  const filteredTeamInputAthletes = teamInputAthletes.filter((a) => {
    const isOnlineTour = activeHistoryId?.startsWith("tour-");
    if (isOnlineTour) {
      const myEmail = (currentUser?.email || "anonymous").toLowerCase().trim();
      const calledEmail = (a.calledBy || "").toLowerCase().trim();
      if (calledEmail !== myEmail) {
        return false;
      }
    }
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      a.name.toLowerCase().includes(query) ||
      a.id.toLowerCase().includes(query) ||
      a.team.toLowerCase().includes(query)
    );
  });

  const activeFilteredScoringAthletes = competitionMode === "individual" ? filteredAthletesScoring : filteredTeamAthletesScoring;
  const activeFilteredInputAthletes = competitionMode === "individual" ? filteredInputAthletes : filteredTeamInputAthletes;

  if (isStorageRestoring) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))]" />
        <div className="z-10 flex flex-col items-center gap-6 max-w-sm">
          <div className="bg-white/5 p-4 rounded-3xl border border-white/10 backdrop-blur-sm shadow-xl animate-bounce duration-1000">
            <VSCLogo size={100} />
          </div>
          <div className="space-y-2 animate-pulse">
            <h2 className="text-xl font-black uppercase text-amber-500 tracking-wider">ĐANG ĐỒNG BỘ DỮ LIỆU</h2>
            <p className="text-xs text-gray-300 font-mono">Đang tải & bảo mật dữ liệu lưu trữ từ bộ nhớ điện thoại...</p>
          </div>
          <div className="w-16 h-1 mt-2 bg-gradient-to-r from-amber-500 to-rose-500 rounded-full animate-pulse" />
        </div>
      </div>
    );
  }

  const quotaHeight = isFirebaseQuotaExceeded ? 76 : 0;
  const netHeight = (networkStatus === "offline" || networkStatus === "online") ? 36 : 0;
  const draftHeight = draftPreviewItem ? 36 : 0;
  const totalBannerHeight = quotaHeight + netHeight + draftHeight;

  return (
    <div 
      style={{ paddingTop: totalBannerHeight ? `${totalBannerHeight}px` : undefined }}
      className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans pb-24 md:pb-16 transition-colors duration-200"
    >
      
      {/* Firebase Quota Exceeded Banner */}
      {isFirebaseQuotaExceeded && (
        <div className="fixed top-0 left-0 right-0 h-[76px] bg-gradient-to-r from-amber-600 via-rose-600 to-red-600 text-white text-[11px] sm:text-xs font-black py-2.5 px-4 text-center z-[10000] flex flex-col items-center justify-center gap-1.5 shadow-xl border-b border-red-500/20">
          <div className="flex items-center gap-2">
            <span className="text-sm shrink-0">⚠️</span>
            <span className="tracking-wide uppercase">
              {language === "en" 
                ? "Firebase Daily Quota Exceeded (Cloud Synced offline)" 
                : "Hạn ngạch Cloud Firebase đã đạt giới hạn trong ngày (Tự động chuyển Offline)"}
            </span>
            <button 
              onClick={() => setIsFirebaseQuotaExceeded(false)}
              className="ml-3 bg-black/30 hover:bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded transition-all cursor-pointer"
            >
              [X] Đóng / Close
            </button>
          </div>
          <p className="font-medium text-[10px] opacity-95 max-w-2xl mx-auto leading-relaxed">
            {language === "en"
              ? "The cloud database's free daily writes have been exhausted. Your data is perfectly safe and continues saving on your device. Limits reset tomorrow afternoon VN time."
              : "Ứng dụng đã hết hạn ngạch ghi đám mây miễn phí hôm nay. Toàn bộ điểm số vẫn được lưu trữ cực kỳ an toàn trên máy của bạn. Hệ thống sẽ tự động đặt lại vào chiều mai."}
          </p>
          <div className="flex gap-4 mt-1 text-[10px] font-bold">
            <a 
              href="https://console.firebase.google.com/project/ncs-vscs-asia/firestore/databases/ai-studio-ncsvscvietnamsli-8b781f81-bfed-4913-9810-6113db23caba/data?openUpgradeDialog=true" 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline hover:text-yellow-200"
            >
              {language === "en" ? "Manage Firebase Database" : "Quản lý cơ sở dữ liệu Firebase"}
            </a>
            <span className="opacity-40">|</span>
            <a 
              href="https://firebase.google.com/pricing#cloud-firestore" 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline hover:text-yellow-200"
            >
              {language === "en" ? "Firebase Spark Plan Details" : "Chi tiết hạn ngạch gói Spark"}
            </a>
          </div>
        </div>
      )}

      {/* Real-time Network connection warning overlay */}
      {networkStatus === "offline" && (
        <div 
          style={{ top: `${quotaHeight}px` }}
          className="fixed h-[36px] left-0 right-0 bg-rose-600 text-white text-[11px] sm:text-xs font-black py-2.5 px-4 text-center z-[9999] flex items-center justify-center gap-2 shadow-lg tracking-wider uppercase animate-pulse"
        >
          <span className="w-2 h-2 rounded-full bg-white animate-ping shrink-0" />
          <span>⚠️ Mất kết nối Internet! Đồng bộ Score Cloud tạm thời bị gián đoạn.</span>
        </div>
      )}
      {networkStatus === "online" && (
        <div 
          style={{ top: `${quotaHeight}px` }}
          className="fixed h-[36px] left-0 right-0 bg-emerald-600 text-white text-[11px] sm:text-xs font-black py-2.5 px-4 text-center z-[9999] flex items-center justify-center gap-2 shadow-lg tracking-wider uppercase"
        >
          <span className="shrink-0">✓</span>
          <span>Đã kết nối Internet trở lại! Đám mây đang hoạt động online.</span>
        </div>
      )}

      {/* Draft Preview Warning & Publish Banner */}
      {draftPreviewItem && (
        <div 
          style={{ top: `${quotaHeight + netHeight}px` }}
          className="fixed h-[36px] left-0 right-0 bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-500 text-white text-[11px] sm:text-xs font-black py-2.5 px-4 text-center z-[9999] flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 shadow-xl border-b border-amber-400/20"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-sm shrink-0 animate-pulse">⚡</span>
            <span className="tracking-wide">BẢN NHÁP: Bạn đang xem trước lịch sử thi đấu ngoại tuyến.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPublishDraftModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 py-1 rounded-lg text-[11px] shadow-sm flex items-center gap-1 cursor-pointer transition-all active:scale-95 shrink-0"
            >
              <CloudUpload size={13} />
              XÁC NHẬN ĐĂNG ONLINE
            </button>
            <button
              onClick={() => {
                setDraftPreviewItem(null);
                handleExitTournament();
              }}
              className="bg-slate-900 hover:bg-slate-800 text-slate-200 font-medium px-3 py-1 rounded-lg text-[11px] cursor-pointer transition-all active:scale-95 shrink-0"
            >
              Thoát bản nháp
            </button>
          </div>
        </div>
      )}

      {/* Top Header & Main Navigation Menu (VSC Style Redesign) */}
            <HeaderNavigation
        activeHistoryId={activeHistoryId}
        networkStatus={networkStatus}
        dbHasPendingWrites={dbHasPendingWrites}
        currentUser={currentUser}
        isGlobalAdmin={isGlobalAdmin}
        activeTab={activeTab}
        changeTab={changeTab}
        changeExitTournament={changeExitTournament}
        homeFilter={homeFilter}
        setHomeFilter={setHomeFilter}
        controlPanelSubTab={controlPanelSubTab}
        setControlPanelSubTab={setControlPanelSubTab}
        settingsSubTab={settingsSubTab}
        setSettingsSubTab={setSettingsSubTab}
        isNewTournamentModalOpen={isNewTournamentModalOpen}
        setIsNewTournamentModalOpen={setIsNewTournamentModalOpen}
        userRole={userRole}
        competitionMode={competitionMode}
        setCompetitionMode={setCompetitionMode}
        rankingSubTab={rankingSubTab}
        setRankingSubTab={setRankingSubTab}
        isSpectatorModeOverridden={isSpectatorModeOverridden}
        setIsSpectatorModeOverridden={setIsSpectatorModeOverridden}
        showInputScoresModeSelection={showInputScoresModeSelection}
        setShowInputScoresModeSelection={setShowInputScoresModeSelection}
        showScoringModeSelection={showScoringModeSelection}
        setShowScoringModeSelection={setShowScoringModeSelection}
        isAuthModalOpen={isAuthModalOpen}
        setIsAuthModalOpen={setIsAuthModalOpen}
        matchName={matchName}
        hasUnsavedChanges={hasUnsavedChanges}
        setPendingTabTarget={setPendingTabTarget}
        setIsUnsavedModalOpen={setIsUnsavedModalOpen}
        handleExitTournament={handleExitTournament}
        setActiveTab={setActiveTab}
        history={history}
        tournamentType={tournamentType}
        onlineTournaments={onlineTournaments}
      />

      {/* Main Core Container */}
      <main className="max-w-7xl mx-auto px-4 mt-6 flex flex-col gap-6" id="app-main">

        {/* Athlete Search query on scoring tabs */}
        {(activeTab === "scoring" || activeTab === "input_scores") && (
          <div className="flex justify-end mb-2 animate-fadeIn" id="athlete-search-context-container">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={language === "en" ? "Search athlete (Name, ID, Club)..." : "Tìm vận động viên (Tên, Mã, Đội)..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-2 w-full text-xs sm:text-sm bg-white dark:bg-slate-900 dark:border-slate-800 dark:text-white border border-gray-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-xs"
              />
            </div>
          </div>
        )}

        {/* Tab content area logic */}
        <div className="tab-content translate-y-0" id="active-tab-panel">
          
          {/* TAB -1: HOME ONLINE TOURNAMENT COMPASS BOARD */}
          {activeTab === "home" && (
            <HomeView
              isGlobalAdmin={isGlobalAdmin}
              activeHistoryId={activeHistoryId}
              onSelectTournament={handleSelectTournament}
              onOpenAuthModal={() => setIsAuthModalOpen(true)}
              handleExitTournament={handleExitTournament}
              setActiveTab={setActiveTab}
              setSettingsSubTab={setSettingsSubTab}
              setIsNewTournamentModalOpen={setIsNewTournamentModalOpen}
              matchName={matchName}
              competitionMode={competitionMode}
              shotsCount={shotsCount}
              teamShotsCount={teamShotsCount}
              directMaxPoints={directMaxPoints}
              teamDirectMaxPoints={teamDirectMaxPoints}
              distances={distances}
              teamDistances={teamDistances}
              athletes={athletes}
              teamAthletes={teamAthletes}
              inputAthletes={inputAthletes}
              teamInputAthletes={teamInputAthletes}
              startDate={startDate}
              endDate={endDate}
              tournamentType={tournamentType}
              bannerUrl={bannerUrl}
              avatarUrl={avatarUrl}
              globalSearch={globalSearch}
              setGlobalSearch={setGlobalSearch}
              homeFilter={homeFilter}
              setHomeFilter={setHomeFilter}
            />
          )}

          {/* TAB 0: SUMMARY TOURNAMENT DASHBOARD */}
          {activeTab === "dashboard" && (
            <DashboardView
              leaderboardAthletes={leaderboardAthletes}
              distances={distances}
              shotsCount={shotsCount}
              matchName={matchName}
              masterAthletes={masterAthletes}
              teamAthletes={teamAthletes}
              teamDistances={teamDistances}
              teamShotsCount={teamShotsCount}
              leaderboardTeamAthletes={leaderboardTeamAthletes}
              directMaxShots={directMaxShots}
              teamDirectMaxShots={teamDirectMaxShots}
              directMaxPoints={directMaxPoints}
              teamDirectMaxPoints={teamDirectMaxPoints}
              tournamentType={tournamentType}
              clubs={clubs}
              setIsLiveBoardOpen={setIsLiveBoardOpen}
              setIsExportModalOpen={setIsExportModalOpen}
              currentTournamentDoc={currentTournamentDoc}
              activeHistoryId={activeHistoryId}
              currentUser={currentUser}
              onOpenAuthModal={() => setIsAuthModalOpen(true)}
              userRole={userRole}
              systemClubs={clubs}
              systemAthletes={vscSystemAthletes}
            />
          )}

          {/* TAB 1: GHI ĐIỂM OFFICIAL SCORECARDS WORKSPACE */}
          {activeTab === "scoring" && (
            <ScoringWorkspace
              language={language}
              tournamentType={tournamentType}
              competitionMode={competitionMode}
              setCompetitionMode={setCompetitionMode}
              setIsSpectatorModeOverridden={setIsSpectatorModeOverridden}
              userRole={userRole}
              isScoringEditAuthorized={isScoringEditAuthorized}
              setIsScoringEditAuthorized={setIsScoringEditAuthorized}
              currentAthletes={currentAthletes}
              activeFilteredScoringAthletes={activeFilteredScoringAthletes}
              currentTournamentDoc={currentTournamentDoc}
              currentUser={currentUser}
              currentDistances={currentDistances}
              currentShotsCount={currentShotsCount}
              handleToggleScore={handleToggleScore}
              handleUpdateAthlete={handleUpdateAthlete}
              handleDeleteAthlete={handleDeleteAthlete}
              handleMoveAthlete={handleMoveAthlete}
              handleUpdateSoloHits={handleUpdateSoloHits}
              setShowUnlockScoreModal={setShowUnlockScoreModal}
              handleUpdateDirectScore={handleUpdateDirectScore}
              directMaxPoints={directMaxPoints}
              teamDirectMaxPoints={teamDirectMaxPoints}
              isAddingAthleteToTournament={isAddingAthleteToTournament}
              setIsAddingAthleteToTournament={setIsAddingAthleteToTournament}
              masterAthletes={masterAthletes}
              setAthletes={setAthletes}
              setTeamAthletes={setTeamAthletes}
              handleAddBlankAthlete={handleAddBlankAthlete}
              setActiveTab={setActiveTab}
              setSettingsSubTab={setSettingsSubTab}
            />
          )}

          {/* TAB 1B: NHẬP ĐIỂM DRAFT BOARD */}
          {activeTab === "input_scores" && (
            <InputScoresWorkspace
              language={language}
              tournamentType={tournamentType}
              competitionMode={competitionMode}
              setCompetitionMode={setCompetitionMode}
              setIsSpectatorModeOverridden={setIsSpectatorModeOverridden}
              userRole={userRole}
              currentUser={currentUser}
              activeFilteredInputAthletes={activeFilteredInputAthletes}
              currentInputAthletes={currentInputAthletes}
              currentAthletes={currentAthletes}
              currentDistances={currentDistances}
              currentShotsCount={currentShotsCount}
              directMaxPoints={directMaxPoints}
              teamDirectMaxPoints={teamDirectMaxPoints}
              isAddingAthleteToInputBoard={isAddingAthleteToInputBoard}
              setIsAddingAthleteToInputBoard={setIsAddingAthleteToInputBoard}
              inputBoardAddSearch={inputBoardAddSearch}
              setInputBoardAddSearch={setInputBoardAddSearch}
              selectedInputBoardAthleteIds={selectedInputBoardAthleteIds}
              setSelectedInputBoardAthleteIds={setSelectedInputBoardAthleteIds}
              masterAthletes={masterAthletes}
              currentTournamentDoc={currentTournamentDoc}
              inputAthletes={inputAthletes}
              setInputAthletes={setInputAthletes}
              teamInputAthletes={teamInputAthletes}
              setTeamInputAthletes={setTeamInputAthletes}
              activeHistoryId={activeHistoryId}
              handleAddAuditLog={handleAddAuditLog}
              handleToggleInputScore={handleToggleInputScore}
              handleUpdateInputAthlete={handleUpdateInputAthlete}
              handleDeleteInputAthlete={handleDeleteInputAthlete}
              handleMoveInputAthlete={handleMoveInputAthlete}
              handleUpdateInputSoloHits={handleUpdateInputSoloHits}
              handleUpdateDirectInputScore={handleUpdateDirectInputScore}
              setSingleAthleteToSave={setSingleAthleteToSave}
              setSaveStatus={setSaveStatus}
              handleSaveInputScoresToMain={handleSaveInputScoresToMain}
              setPendingScrollAthleteId={setPendingScrollAthleteId}
              setActiveTab={setActiveTab}
              setSettingsSubTab={setSettingsSubTab}
            />
          )}

          {/* TAB 2: LIVE TOURNAMENT RANKING LEADERBOARD (COMBINED RANKING TAB) */}
          {activeTab === "leaderboard" && (
            <LeaderboardView
              rankingSubTab={rankingSubTab}
              setRankingSubTab={setRankingSubTab}
              competitionMode={competitionMode}
              language={language}
              leaderboardAthletes={leaderboardAthletes}
              leaderboardTeamAthletes={leaderboardTeamAthletes}
              currentDistances={currentDistances}
              currentShotsCount={currentShotsCount}
              directMaxShots={directMaxShots}
              teamDirectMaxShots={teamDirectMaxShots}
              directMaxPoints={directMaxPoints}
              teamDirectMaxPoints={teamDirectMaxPoints}
              clubs={clubs}
            />
          )}

                    {/* TAB 3: SETTINGS CONFIGURATION MATRIX (CONTAINS ATHLETE MANAGEMENT SUBTAB) */}
          {activeTab === "settings" && (
            <SettingsView
              settingsSubTab={settingsSubTab}
              setSettingsSubTab={setSettingsSubTab}
              language={language}
              matchName={matchName}
              setMatchName={setMatchName}
              bannerUrl={bannerUrl}
              setBannerUrl={setBannerUrl}
              avatarUrl={avatarUrl}
              setAvatarUrl={setAvatarUrl}
              distances={distances}
              setDistances={setDistances}
              shotsCount={shotsCount}
              setShotsCount={setShotsCount}
              athletes={athletes}
              setAthletes={setAthletes}
              masterAthletes={masterAthletes}
              setMasterAthletes={setMasterAthletes}
              history={history}
              setHistory={setHistory}
              handleSaveCurrentSessionToHistory={handleSaveCurrentSessionToHistory}
              handleResetSession={handleResetSession}
              handleImportSingleBackup={handleImportSingleBackup}
              storedAthleteLists={storedAthleteLists}
              setStoredAthleteLists={setStoredAthleteLists}
              activeHistoryId={activeHistoryId}
              setActiveHistoryId={setActiveHistoryId}
              setInputAthletes={setInputAthletes}
              setTeamInputAthletes={setTeamInputAthletes}
              startDate={startDate}
              setStartDate={setStartDate}
              endDate={endDate}
              setEndDate={setEndDate}
              setClubs={setClubs}
              teamDistances={teamDistances}
              setTeamDistances={setTeamDistances}
              teamShotsCount={teamShotsCount}
              setTeamShotsCount={setTeamShotsCount}
              teamAthletes={teamAthletes}
              setTeamAthletes={setTeamAthletes}
              directMaxShots={directMaxShots}
              setDirectMaxShots={setDirectMaxShots}
              teamDirectMaxShots={teamDirectMaxShots}
              setTeamDirectMaxShots={setTeamDirectMaxShots}
              directMaxPoints={directMaxPoints}
              setDirectMaxPoints={setDirectMaxPoints}
              teamDirectMaxPoints={teamDirectMaxPoints}
              setTeamDirectMaxPoints={setTeamDirectMaxPoints}
              currentTournamentDoc={currentTournamentDoc}
              updateOnlineTournament={updateOnlineTournament}
              isNewTournamentModalOpen={isNewTournamentModalOpen}
              setIsNewTournamentModalOpen={setIsNewTournamentModalOpen}
              tournamentType={tournamentType}
              setTournamentType={setTournamentType}
              laneCapacity={laneCapacity}
              setLaneCapacity={setLaneCapacity}
              setActiveTab={setActiveTab}
              handleExitTournament={handleExitTournament}
              userRole={userRole}
              handleAddAuditLog={handleAddAuditLog}
              currentDistances={currentDistances}
              currentShotsCount={currentShotsCount}
              currentAthletes={currentAthletes}
              competitionMode={competitionMode}
              clubs={clubs}
              currentUser={currentUser}
              athleteForceTab={athleteForceTab}
            />
          )}

                    {/* TAB 4: SAVED HISTORY SNAPSHOTS RECORD */}
          {activeTab === "history" && (
            <HistoryView
              history={history}
              handleRestoreHistoryItem={handleRestoreHistoryItem}
              handleDeleteHistoryItem={handleDeleteHistoryItem}
              masterAthletes={masterAthletes}
              handleExportBackup={handleExportBackup}
              handleImportFullBackup={handleImportFullBackup}
              userRole={userRole}
              handleRestoreDeviceBackup={handleRestoreDeviceBackup}
              handleDeleteDeviceBackup={handleDeleteDeviceBackup}
              matchName={matchName}
              handleSaveCurrentSessionToHistory={handleSaveCurrentSessionToHistory}
              startDate={startDate}
              endDate={endDate}
              setHistory={setHistory}
              activeHistoryId={activeHistoryId}
              onlineTournaments={onlineTournaments}
            />
          )}

          {/* TAB 5: MY CONTROL PANEL */}
          {activeTab === "control_panel" && (
            <ControlPanel
              isGlobalAdmin={isGlobalAdmin}
              activeHistoryId={activeHistoryId}
              onSelectTournament={(id, tournament) => handleSelectTournament(id, tournament, "dashboard")}
              onOpenAuthModal={() => setIsAuthModalOpen(true)}
              forceSubTab={controlPanelSubTab}
              onChangeActiveTab={setActiveTab}
              systemClubs={clubs}
              vscSystemAthletes={vscSystemAthletes}
              onlineTournaments={onlineTournaments}
              onSelectPkChallenge={(id, subTab) => {
                 setActivePkChallengeId(id);
                 if (subTab) setActivePkSubTab(subTab);
                 setActiveTab("pk_lobby");
              }}
              onEditPkChallenge={(id) => {
                 setPkChallengeToEditId(id);
                 setActiveTab("pk_lobby");
              }}
              onViewClubHub={(club) => setGlobalSelectedClub(club)}
            />
          )}

          {/* TAB 6: QLTV MEMBER MANAGEMENT PANEL */}
          {activeTab === "qltv" && isGlobalAdmin && (
            <AdminQltvView
              currentUser={currentUser}
              language={language}
            />
          )}

          {/* TAB 7: VSC SYSTEM ATHLETES DIRECTORY PORTAL */}
          {activeTab === "vsc_system_directory" && (
            <VscSystemDirectory
              currentUser={currentUser}
              userRole={isGlobalAdmin ? "admin" : "user"}
              history={history}
              onlineTournaments={onlineTournaments}
              onOpenAuthModal={() => setIsAuthModalOpen(true)}
            />
          )}

          {/* TAB 8: VSC SYSTEM CLUBS DIRECTORY PORTAL */}
          {activeTab === "vsc_clubs_directory" && (
            <VscSystemClubsDirectory
              currentUser={currentUser}
              userRole={isGlobalAdmin ? "admin" : "user"}
              history={history}
              onlineTournaments={onlineTournaments}
              onOpenAuthModal={() => setIsAuthModalOpen(true)}
            />
          )}

          {/* TAB 9: VSC PK MATCHMAKING LOBBY */}
          {activeTab === "pk_lobby" && (
            <PkLobbyView
              currentUser={currentUser}
              onOpenAuthModal={() => setIsAuthModalOpen(true)}
              activeChallengeId={activePkChallengeId}
              onClearActiveChallengeId={() => setActivePkChallengeId(null)}
              activeSubTab={activePkSubTab}
              onSubTabChange={setActivePkSubTab}
              editChallengeId={pkChallengeToEditId}
              onClearEditChallengeId={() => setPkChallengeToEditId(null)}
              onViewClubHub={(club) => setGlobalSelectedClub(club)}
            />
          )}

        </div>

      </main>

            {/* Sportive Footer */}
      <SportiveFooter />

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        matchName={matchName}
        athletes={competitionMode === "individual" ? leaderboardAthletes : leaderboardTeamAthletes}
        distances={currentDistances}
        shotsCount={currentShotsCount}
        directMaxShots={directMaxShots}
        teamDirectMaxShots={teamDirectMaxShots}
        competitionMode={competitionMode}
        directMaxPoints={directMaxPoints}
        teamDirectMaxPoints={teamDirectMaxPoints}
        activeTab={activeTab}
        indAthletes={leaderboardAthletes}
        indDistances={distances}
        indShotsCount={shotsCount}
        teamAthletes={leaderboardTeamAthletes}
        teamDistances={teamDistances}
        teamShotsCount={teamShotsCount}
      />

      <LiveBoard
        isOpen={isLiveBoardOpen}
        onClose={() => setIsLiveBoardOpen(false)}
        matchName={matchName}
        athletes={leaderboardAthletes}
        distances={distances}
        shotsCount={shotsCount}
        teamAthletes={teamAthletes}
        teamDistances={teamDistances}
        teamShotsCount={teamShotsCount}
        leaderboardTeamAthletes={leaderboardTeamAthletes}
        directMaxShots={directMaxShots}
        teamDirectMaxShots={teamDirectMaxShots}
        directMaxPoints={directMaxPoints}
        teamDirectMaxPoints={teamDirectMaxPoints}
        tournamentType={tournamentType}
        clubs={clubs}
        laneCapacity={laneCapacity}
      />

      
      {/* Tournament Modals */}
      <CompetitionModeSelectionModal
        isOpen={showInputScoresModeSelection}
        onClose={() => setShowInputScoresModeSelection(false)}
        language={language}
        title={language === "en" ? "Select Score Entry Mode" : "Chọn Chế Độ Nhập Điểm"}
        subtitle={language === "en" ? "Combined Tournament Configuration" : "Cơ chế Giải đấu kết hợp (Cá nhân + Đồng đội)"}
        description={language === "en" 
          ? "This tournament supports both Individual and Team matches. Please select the environment you want to enter to score/input:"
          : "Cài đặt giải đấu hiện tại đang ở chế độ kết hợp cả Cá nhân và Đồng đội. Vui lòng lựa chọn môi trường nhập điểm cụ thể:"
        }
        onSelect={(mode) => {
          setCompetitionMode(mode);
          localStorage.setItem("slingshot_competition_mode", mode);
          setIsSpectatorModeOverridden(true);
          setShowInputScoresModeSelection(false);
        }}
      />

      <CompetitionModeSelectionModal
        isOpen={showScoringModeSelection}
        onClose={() => setShowScoringModeSelection(false)}
        language={language}
        title={language === "en" ? "Select Scoring Board Mode" : "Chọn Chế Độ Ghi Điểm"}
        subtitle={language === "en" ? "Combined Tournament Configuration" : "Cơ chế Giải đấu kết hợp (Cá nhân + Đồng đội)"}
        description={language === "en" 
          ? "This tournament supports both Individual and Team matches. Please select the environment you want to view to score:"
          : "Cài đặt giải đấu hiện tại đang ở chế độ kết hợp cả Cá nhân và Đồng đội. Vui lòng lựa chọn môi trường ghi điểm cụ thể:"
        }
        onSelect={(mode) => {
          setCompetitionMode(mode);
          localStorage.setItem("slingshot_competition_mode", mode);
          setIsSpectatorModeOverridden(true);
          setShowScoringModeSelection(false);
        }}
      />

      <MobileRankingSelectionModal
        isOpen={showMobileRankingSelection}
        onClose={() => setShowMobileRankingSelection(false)}
        language={language}
        tournamentType={tournamentType}
        onSelectCategory={(compMode, rSubTab) => {
          setCompetitionMode(compMode);
          localStorage.setItem("slingshot_competition_mode", compMode);
          setRankingSubTab(rSubTab);
          setIsSpectatorModeOverridden(true);
          changeTab("leaderboard");
          setShowMobileRankingSelection(false);
        }}
      />

      <UnlockScoreModal
        isOpen={showUnlockScoreModal}
        onClose={() => {
          setPendingScoreToggle(null);
          setPendingAddAthlete(false);
          setShowUnlockScoreModal(false);
        }}
        language={language}
        pendingAddAthlete={pendingAddAthlete}
        onConfirm={() => {
          setIsScoringEditAuthorized(true);
          if (pendingScoreToggle) {
            const { athleteId, distanceId, shotIndex } = pendingScoreToggle;
            executeToggleScore(athleteId, distanceId, shotIndex);
            setPendingScoreToggle(null);
          }
          if (pendingAddAthlete) {
            setIsAddingAthleteToTournament(true);
            setPendingAddAthlete(false);
          }
          setShowUnlockScoreModal(false);
        }}
      />

      <ExitTournamentConfirmModal
        isOpen={showExitConfirmModal}
        onClose={() => setShowExitConfirmModal(false)}
        language={language}
        onExitToConfig={() => {
          setShowExitConfirmModal(false);
          handleExitTournament();
          setActiveTab("settings");
          setIsNewTournamentModalOpen(true);
        }}
        onExitToHome={() => {
          setShowExitConfirmModal(false);
          handleExitTournament();
        }}
      />

      <ExitAndCreateTournamentConfirmModal
        isOpen={showExitAndCreateConfirmModal}
        onClose={() => setShowExitAndCreateConfirmModal(false)}
        language={language}
        onConfirm={() => {
          setShowExitAndCreateConfirmModal(false);
          handleExitTournament();
          setActiveTab("settings");
          setIsNewTournamentModalOpen(true);
        }}
      />

      <SwitchTournamentConfirmModal
        isOpen={!!switchingTournamentData}
        onClose={() => setSwitchingTournamentData(null)}
        language={language}
        currentMatchName={matchName}
        targetTournamentName={switchingTournamentData ? switchingTournamentData.tournamentName : ""}
        onConfirm={confirmTournamentSwitch}
      />

      <SaveScoresConfirmModal
        isOpen={isSaveConfirmModalOpen}
        onClose={() => {
          setIsSaveConfirmModalOpen(false);
          setSaveStatus(null);
        }}
        language={language}
        networkStatus={networkStatus}
        isSavingScores={isSavingScores}
        saveStatus={saveStatus}
        onConfirm={executeSaveScores}
      />

      <SaveSingleAthleteConfirmModal
        athlete={singleAthleteToSave}
        onClose={() => {
          setSingleAthleteToSave(null);
          setSaveStatus(null);
        }}
        language={language}
        networkStatus={networkStatus}
        isSavingScores={isSavingScores}
        saveStatus={saveStatus}
        onConfirm={executeSaveSingleAthlete}
      />

      <UnsavedScoresWarningModal
        isOpen={isUnsavedModalOpen}
        onClose={() => {
          setIsUnsavedModalOpen(false);
          setPendingTabTarget(null);
          setSaveStatus(null);
          setActiveTab("input_scores");
        }}
        language={language}
        networkStatus={networkStatus}
        isSavingScores={isSavingScores}
        saveStatus={saveStatus}
        onConfirmSave={executeSaveScores}
        onDiscard={async () => {
          setInputAthletes([]);
          setTeamInputAthletes([]);
          try {
            localStorage.removeItem("slingshot_input_athletes");
            localStorage.removeItem("slingshot_team_input_athletes");
          } catch (e) {
            console.error("Failed to clear local draft scores:", e);
          }
          if (activeHistoryId && activeHistoryId.startsWith("tour-")) {
            updateOnlineTournament(activeHistoryId, {
              inputAthletes: [],
              teamInputAthletes: [],
            }).catch(err => console.error("Cloud discard sync failed:", err));
          }
          setHasUnsavedChanges(false);
          setIsUnsavedModalOpen(false);
          setSaveStatus(null);
          if (pendingTabTarget) {
            if (pendingTabTarget.type === "tab") {
              setActiveTab((pendingTabTarget.value as any) || "dashboard");
            } else if (pendingTabTarget.type === "exit") {
              handleExitTournament((pendingTabTarget.type as any) || "all");
            } else if (pendingTabTarget.type === "select_tour") {
              const { id, tournament, targetTab } = pendingTabTarget.payload || {};
              handleSelectTournament(id, tournament, targetTab);
            }
            setPendingTabTarget(null);
          }
        }}
      />

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

      <AthleteProfileModal
        athlete={globalAthleteProfile}
        isOpen={!!globalAthleteProfile}
        onClose={() => setGlobalAthleteProfile(null)}
        history={history}
        onlineTournaments={onlineTournaments}
        currentUser={currentUser}
        isGlobalAdmin={isGlobalAdmin}
        language={language}
      />

      {globalSelectedClub && (
        <VscSystemClubsDirectory
          currentUser={currentUser}
          userRole={isGlobalAdmin ? "admin" : "user"}
          history={history}
          onlineTournaments={onlineTournaments}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          externalSelectedClub={globalSelectedClub}
          onCloseExternalSelectedClub={() => setGlobalSelectedClub(null)}
          hideDirectoryList={true}
        />
      )}

      {draftPreviewItem && (
        <PublishDraftModal
          isOpen={isPublishDraftModalOpen}
          onClose={() => setIsPublishDraftModalOpen(false)}
          draftPreviewItem={draftPreviewItem}
          onlineTournaments={onlineTournaments}
          onOverwrite={handleOverwriteOnlinePublish}
          onCreateNew={handleCreateNewOnlinePublish}
        />
      )}


            {/* Floating Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        activeHistoryId={activeHistoryId}
        activeTab={activeTab}
        homeFilter={homeFilter}
        controlPanelSubTab={controlPanelSubTab}
        competitionMode={competitionMode}
        currentUser={currentUser}
        hasUnsavedChanges={hasUnsavedChanges}
        changeTab={changeTab}
        changeExitTournament={changeExitTournament}
        handleExitTournament={handleExitTournament}
        setActiveTab={setActiveTab}
        setSettingsSubTab={setSettingsSubTab}
        setControlPanelSubTab={setControlPanelSubTab}
        setIsNewTournamentModalOpen={setIsNewTournamentModalOpen}
        setPendingTabTarget={setPendingTabTarget}
        setIsUnsavedModalOpen={setIsUnsavedModalOpen}
        setIsAuthModalOpen={setIsAuthModalOpen}
        setShowMobileRankingSelection={setShowMobileRankingSelection}
        activePkSubTab={activePkSubTab}
        setActivePkSubTab={setActivePkSubTab}
      />

      <DirectMessageWidget
        currentUser={currentUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        language={language}
      />

    </div>
  );
}
