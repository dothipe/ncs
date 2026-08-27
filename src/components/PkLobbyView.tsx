import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { 
  Trophy, 
  Sword, 
  Plus, 
  MapPin, 
  Calendar, 
  Clock, 
  Award, 
  Shield, 
  User, 
  Users, 
  Check, 
  X, 
  Play, 
  ChevronRight, 
  Search, 
  Flame, 
  ChevronUp, 
  CheckCircle,
  HelpCircle,
  TrendingUp,
  AlertCircle,
  Target,
  Trash2,
  Eye,
  Lock,
  Key,
  UserCheck
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { PKChallenge, Athlete, SystemClub } from "../types";
import { PkDashboardHome } from "./PkDashboardHome";
import { AthleteProfileModal } from "./AthleteProfileModal";
import { VscSystemClubsDirectory } from "./VscSystemClubsDirectory";
import { db } from "../firebase";
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  getDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove
} from "firebase/firestore";
import { subscribeToVscSystemAthletes, subscribeToVscSystemClubs, subscribeToTournamentsList } from "../lib/firebaseService";
import { getLatestAvatar } from "../utils/avatarHelpers";

interface PkLobbyViewProps {
  currentUser: any;
  onOpenAuthModal: () => void;
  activeChallengeId?: string | null;
  onClearActiveChallengeId?: () => void;
  activeSubTab?: "dashboard" | "lobby" | "leaderboard" | "history" | null;
  onSubTabChange?: (subTab: "dashboard" | "lobby" | "leaderboard" | "history") => void;
  editChallengeId?: string | null;
  onClearEditChallengeId?: () => void;
  onViewClubHub?: (club: any) => void;
}

export const PkLobbyView: React.FC<PkLobbyViewProps> = ({ 
  currentUser, 
  onOpenAuthModal,
  activeChallengeId,
  onClearActiveChallengeId,
  activeSubTab: controlledActiveSubTab,
  onSubTabChange,
  editChallengeId,
  onClearEditChallengeId,
  onViewClubHub
}) => {
  const { language } = useLanguage();
  const [internalSubTab, setInternalSubTab] = useState<"dashboard" | "lobby" | "leaderboard" | "history">("dashboard");
  const [leaderboardSubTab, setLeaderboardSubTab] = useState<"personal" | "club">("personal");
  const activeSubTab = controlledActiveSubTab || internalSubTab;

  const setActiveSubTab = useCallback((tab: "dashboard" | "lobby" | "leaderboard" | "history") => {
    setInternalSubTab(tab);
    onSubTabChange?.(tab);
  }, [onSubTabChange]);
  const [challenges, setChallenges] = useState<PKChallenge[]>([]);
  const [systemAthletes, setSystemAthletes] = useState<Athlete[]>([]);
  const [systemClubs, setSystemClubs] = useState<SystemClub[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedProfileAthlete, setSelectedProfileAthlete] = useState<Athlete | null>(null);
  const [onlineTournaments, setOnlineTournaments] = useState<any[]>([]);

  // Accept PK Challenge Flow state (PIN / Password input modal or Confirmation modal)
  const [activeAcceptChallenge, setActiveAcceptChallenge] = useState<PKChallenge | null>(null);
  const [acceptPinInput, setAcceptPinInput] = useState("");
  const [acceptError, setAcceptError] = useState("");

  // Live "Modal nổ" popup notifications when someone joins the current user's challenge
  const isFirstLoadRef = useRef(true);
  const prevActiveRequestsRef = useRef<Record<string, string[]>>({});
  const [newApplicantNotification, setNewApplicantNotification] = useState<{ challenge: PKChallenge; applicants: any[] } | null>(null);

  // Live "Modal nổ" rejection and approval notifications
  const [rejectionNotification, setRejectionNotification] = useState<{ items: { challengeTitle: string; challengerName: string }[] } | null>(null);
  const [approvedNotification, setApprovedNotification] = useState<{ items: { challengeTitle: string; challengerName: string; challengeId: string }[] } | null>(null);
  const appliedChallengesRef = useRef<Record<string, { title: string; challengerName: string }>>({});

  // Club Hub modal state
  const [selectedClubHub, setSelectedClubHub] = useState<SystemClub | null>(null);

  // Subscribe to system tournaments list to calculate athlete achievements
  useEffect(() => {
    const unsub = subscribeToTournamentsList((list) => {
      setOnlineTournaments(list);
    });
    return () => unsub();
  }, []);

  const handleViewAthleteProfile = (name: string, email?: string, athleteId?: string) => {
    let found: Athlete | undefined = undefined;
    
    // 1. If athleteId matches
    if (athleteId) {
      const cleanId = athleteId.trim().toLowerCase();
      found = systemAthletes.find(a => a.id && a.id.trim().toLowerCase() === cleanId);
    }
    
    // 2. If email matches
    if (!found && email) {
      const cleanEmail = email.trim().toLowerCase();
      found = systemAthletes.find(a => a.email && a.email.trim().toLowerCase() === cleanEmail);
    }
    
    // 3. If name matches (case-insensitive)
    if (!found && name) {
      const cleanName = name.trim().toLowerCase();
      found = systemAthletes.find(a => a.name && a.name.trim().toLowerCase() === cleanName);
    }
    
    if (found) {
      setSelectedProfileAthlete(found);
    } else {
      // Create a temporary profile so unlinked PK users can still be viewed elegantly!
      setSelectedProfileAthlete({
        id: athleteId || "TỰ DO",
        name: name,
        team: "Tự do",
        email: email || "",
        scores: {}
      });
    }
  };

  const handleProfileOrClubClick = (name: string, email?: string, athleteIdOrUid?: string) => {
    const cleanUid = athleteIdOrUid?.trim().toLowerCase();
    const cleanClubUid = cleanUid?.startsWith("club-") ? cleanUid.substring(5) : cleanUid;
    const cleanName = name?.trim().toLowerCase();
    const matchingClub = systemClubs.find(c => 
      (c.id && c.id.trim().toLowerCase() === cleanUid) ||
      (c.id && c.id.trim().toLowerCase() === cleanClubUid) ||
      (c.name && c.name.trim().toLowerCase() === cleanName)
    );
    if (matchingClub) {
      if (onViewClubHub) {
        onViewClubHub(matchingClub);
      } else {
        setSelectedClubHub(matchingClub);
      }
    } else {
      handleViewAthleteProfile(name, email, athleteIdOrUid);
    }
  };

  const getPlayerClubName = (name: string) => {
    const directClub = systemClubs.find(c => c.name?.trim().toLowerCase() === name.trim().toLowerCase());
    if (directClub) return directClub.name;

    const ath = systemAthletes.find(a => a.name?.trim().toLowerCase() === name.trim().toLowerCase());
    if (ath && ath.clubName) return ath.clubName;

    return null;
  };

  const handleClubClick = (clubName: string) => {
    const cleanName = clubName.trim().toLowerCase();
    const matchingClub = systemClubs.find(c => c.name?.trim().toLowerCase() === cleanName || c.id?.trim().toLowerCase() === cleanName);
    if (matchingClub) {
      if (onViewClubHub) {
        onViewClubHub(matchingClub);
      } else {
        setSelectedClubHub(matchingClub);
      }
    }
  };

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "solo_1v1" | "team_vs_team">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "open" | "accepted" | "ongoing">("all");

  // Create Challenge Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formType, setFormType] = useState<"solo_1v1" | "team_vs_team">("solo_1v1");
  const [formTeamSize, setFormTeamSize] = useState<number>(3);
  const [formRules, setFormRules] = useState("Tính theo Hiệp đấu (So sánh số hiệp thắng)");
  const [formDateTime, setFormDateTime] = useState("");
  const [formLocation, setFormLocation] = useState("VSC ONLINE");
  const [formDescription, setFormDescription] = useState("");
  const [formRefereeEmail, setFormRefereeEmail] = useState("");
  const [selectedAthleteId, setSelectedAthleteId] = useState("");
  const [selectedClubId, setSelectedClubId] = useState("");

  // Create Challenge Pin & Opponent designation states
  const [formPin, setFormPin] = useState("");
  const [formDesignateOpponent, setFormDesignateOpponent] = useState(false);
  const [formDesignatedOpponentAthleteId, setFormDesignatedOpponentAthleteId] = useState("");
  const [formDesignatedOpponentClubId, setFormDesignatedOpponentClubId] = useState("");

  // New challenge settings fields
  const [formDistance, setFormDistance] = useState("10m");
  const [formShotsPerSet, setFormShotsPerSet] = useState<number>(10);
  const [formSetsCountOption, setFormSetsCountOption] = useState<string>("3");
  const [formSetsCountCustom, setFormSetsCountCustom] = useState<string>("3");
  const [formWinMechanism, setFormWinMechanism] = useState<"by_sets" | "by_total_points" | "by_target_shots">("by_sets");
  const [formTargetType, setFormTargetType] = useState<"bia_muc_tieu" | "bia_giay_tinh_diem">("bia_muc_tieu");
  const [formTargetTouchShots, setFormTargetTouchShots] = useState<number>(5);

  // Edit Challenge Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<PKChallenge | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editRules, setEditRules] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editDateTime, setEditDateTime] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editRefereeEmail, setEditRefereeEmail] = useState("");
  const [editDistance, setEditDistance] = useState("10m");
  const [editShotsPerSet, setEditShotsPerSet] = useState<number>(10);
  const [editSetsCountOption, setEditSetsCountOption] = useState("3");
  const [editSetsCountCustom, setEditSetsCountCustom] = useState("3");
  const [editWinMechanism, setEditWinMechanism] = useState<"by_sets" | "by_total_points" | "by_target_shots">("by_sets");
  const [editTargetType, setEditTargetType] = useState<"bia_muc_tieu" | "bia_giay_tinh_diem">("bia_muc_tieu");
  const [editTargetTouchShots, setEditTargetTouchShots] = useState<number>(5);
  const [editType, setEditType] = useState<"solo_1v1" | "team_vs_team" | "">("solo_1v1");
  const [editTeamSize, setEditTeamSize] = useState<number>(3);
  const [editSelectedAthleteId, setEditSelectedAthleteId] = useState("");
  const [editSelectedClubId, setEditSelectedClubId] = useState("");
  const [editDesignateOpponent, setEditDesignateOpponent] = useState(false);
  const [editDesignatedOpponentAthleteId, setEditDesignatedOpponentAthleteId] = useState("");
  const [editDesignatedOpponentClubId, setEditDesignatedOpponentClubId] = useState("");
  const [editPin, setEditPin] = useState("");

  // Opponent/Referee search & suggestion states
  const [formOpponentSearch, setFormOpponentSearch] = useState("");
  const [showFormOpponentSuggestions, setShowFormOpponentSuggestions] = useState(false);
  const [editOpponentSearch, setEditOpponentSearch] = useState("");
  const [showEditOpponentSuggestions, setShowEditOpponentSuggestions] = useState(false);

  const [formRefereeSearch, setFormRefereeSearch] = useState("");
  const [showFormRefereeSuggestions, setShowFormRefereeSuggestions] = useState(false);
  const [editRefereeSearch, setEditRefereeSearch] = useState("");
  const [showEditRefereeSuggestions, setShowEditRefereeSuggestions] = useState(false);

  // Filtered lists for suggestions
  const filteredFormAthletes = useMemo(() => {
    if (!formOpponentSearch) return [];
    const queryStr = formOpponentSearch.trim().toLowerCase();
    
    const selectedAth = systemAthletes.find(a => a.id === formDesignatedOpponentAthleteId);
    if (selectedAth && `${selectedAth.name} (vsc-${selectedAth.id})`.toLowerCase() === queryStr) {
      return [];
    }

    return systemAthletes
      .filter(a => a.id !== selectedAthleteId)
      .filter((a) => {
        const idStr = String(a.id || "").toLowerCase();
        const nameStr = String(a.name || "").toLowerCase();
        return idStr.includes(queryStr) || nameStr.includes(queryStr);
      })
      .slice(0, 8);
  }, [formOpponentSearch, systemAthletes, selectedAthleteId, formDesignatedOpponentAthleteId]);

  const filteredEditAthletes = useMemo(() => {
    if (!editOpponentSearch) return [];
    const queryStr = editOpponentSearch.trim().toLowerCase();

    const selectedAth = systemAthletes.find(a => a.id === editDesignatedOpponentAthleteId);
    if (selectedAth && `${selectedAth.name} (vsc-${selectedAth.id})`.toLowerCase() === queryStr) {
      return [];
    }

    return systemAthletes
      .filter(a => a.id !== editSelectedAthleteId)
      .filter((a) => {
        const idStr = String(a.id || "").toLowerCase();
        const nameStr = String(a.name || "").toLowerCase();
        return idStr.includes(queryStr) || nameStr.includes(queryStr);
      })
      .slice(0, 8);
  }, [editOpponentSearch, systemAthletes, editSelectedAthleteId, editDesignatedOpponentAthleteId]);

  const filteredFormReferees = useMemo(() => {
    if (!formRefereeSearch) return [];
    const queryStr = formRefereeSearch.trim().toLowerCase();

    const selectedRef = systemAthletes.find(a => a.email?.toLowerCase().trim() === formRefereeEmail.toLowerCase().trim());
    if (selectedRef && `${selectedRef.name} (${selectedRef.email || selectedRef.id})`.toLowerCase() === queryStr) {
      return [];
    }

    return systemAthletes
      .filter((a) => {
        const idStr = String(a.id || "").toLowerCase();
        const nameStr = String(a.name || "").toLowerCase();
        const emailStr = String(a.email || "").toLowerCase();
        return idStr.includes(queryStr) || nameStr.includes(queryStr) || emailStr.includes(queryStr);
      })
      .slice(0, 8);
  }, [formRefereeSearch, systemAthletes, formRefereeEmail]);

  const filteredEditReferees = useMemo(() => {
    if (!editRefereeSearch) return [];
    const queryStr = editRefereeSearch.trim().toLowerCase();

    const selectedRef = systemAthletes.find(a => a.email?.toLowerCase().trim() === editRefereeEmail.toLowerCase().trim());
    if (selectedRef && `${selectedRef.name} (${selectedRef.email || selectedRef.id})`.toLowerCase() === queryStr) {
      return [];
    }

    return systemAthletes
      .filter((a) => {
        const idStr = String(a.id || "").toLowerCase();
        const nameStr = String(a.name || "").toLowerCase();
        const emailStr = String(a.email || "").toLowerCase();
        return idStr.includes(queryStr) || nameStr.includes(queryStr) || emailStr.includes(queryStr);
      })
      .slice(0, 8);
  }, [editRefereeSearch, systemAthletes, editRefereeEmail]);

  const handleWinMechanismChange = (val: "by_sets" | "by_total_points" | "by_target_shots", currentTouchShots = 5) => {
    setFormWinMechanism(val);
    if (val === "by_target_shots") {
      setFormSetsCountOption("1");
      setFormSetsCountCustom("1");
      setFormTargetTouchShots(5);
      setFormShotsPerSet(20);
      setFormRules(language === "en" ? `Target Shots (First to reach 5 hits wins)` : `Bắn chạm 5 viên`);
    } else {
      // Revert to default 10 shots, 3 sets
      setFormSetsCountOption("3");
      setFormSetsCountCustom("3");
      setFormShotsPerSet(10);
      if (val === "by_sets") {
        setFormRules(language === "en" ? "Set-by-Set (Compare won rounds)" : "Tính theo Hiệp đấu (So sánh số hiệp thắng)");
      } else if (val === "by_total_points") {
        setFormRules(language === "en" ? "Cumulative Points (Sum of all sets)" : "Cộng tổng điểm (Cộng dồn tất cả các hiệp)");
      }
    }
  };

  const handleEditWinMechanismChange = (val: "by_sets" | "by_total_points" | "by_target_shots", currentTouchShots = 5) => {
    setEditWinMechanism(val);
    if (val === "by_target_shots") {
      setEditSetsCountOption("1");
      setEditSetsCountCustom("1");
      setEditTargetTouchShots(5);
      setEditShotsPerSet(20);
      setEditRules(language === "en" ? `Target Shots (First to reach 5 hits wins)` : `Bắn chạm 5 viên`);
    } else {
      // Revert to default 10 shots, 3 sets
      setEditSetsCountOption("3");
      setEditSetsCountCustom("3");
      setEditShotsPerSet(10);
      if (val === "by_sets") {
        setEditRules(language === "en" ? "Set-by-Set (Compare won rounds)" : "Tính theo Hiệp đấu (So sánh số hiệp thắng)");
      } else if (val === "by_total_points") {
        setEditRules(language === "en" ? "Cumulative Points (Sum of all sets)" : "Cộng tổng điểm (Cộng dồn tất cả các hiệp)");
      }
    }
  };

  const handleFormTargetTouchShotsChange = (val: number) => {
    setFormTargetTouchShots(val);
    if (formWinMechanism === "by_target_shots") {
      setFormRules(language === "en" ? `Target Shots (First to reach ${val} hits wins)` : `Bắn chạm ${val} viên`);
    }
  };

  const handleEditTargetTouchShotsChange = (val: number) => {
    setEditTargetTouchShots(val);
    if (editWinMechanism === "by_target_shots") {
      setEditRules(language === "en" ? `Target Shots (First to reach ${val} hits wins)` : `Bắn chạm ${val} viên`);
    }
  };

  // Selected completed challenge for detail pop-up modal
  const [selectedDetailChallenge, setSelectedDetailChallenge] = useState<PKChallenge | null>(null);

  // Delete challenge confirmation state (Two-Step validation)
  const [deleteChallengeId, setDeleteChallengeId] = useState<string | null>(null);
  const [deleteConfirmStep, setDeleteConfirmStep] = useState<number>(0); // 0 = closed, 1 = first check, 2 = final check

  // Delete individual set confirmation state
  const [deleteSetConfirmStep, setDeleteSetConfirmStep] = useState<number>(0); // 0 = closed, 1 = first warning, 2 = final warning
  const [deletingSetIndex, setDeletingSetIndex] = useState<number | null>(null);

  // Refs for tracking active challenge to prevent snapshot overwrite loop
  const activeArenaChallengeRef = React.useRef<PKChallenge | null>(null);

  // Arena state (active match detail view)
  const [activeArenaChallenge, setActiveArenaChallenge] = useState<PKChallenge | null>(null);

  // Score editing inside Arena
  const [challengerScoresInput, setChallengerScoresInput] = useState<number[]>([0, 0, 0]);
  const [opponentScoresInput, setOpponentScoresInput] = useState<number[]>([0, 0, 0]);

  // Shot tracking (true for hit, false for miss, null for unshot)
  const [challengerShotsInput, setChallengerShotsInput] = useState<(boolean | null)[][]>([]);
  const [opponentShotsInput, setOpponentShotsInput] = useState<(boolean | null)[][]>([]);

  // State for Touch Shots viewport-centered announcement modal
  const [touchAnnouncement, setTouchAnnouncement] = useState<{ name: string; target: number } | null>(null);
  const [hasShownTouchAnnouncement, setHasShownTouchAnnouncement] = useState(false);

  // Reset announcement tracking when active match changes
  useEffect(() => {
    setHasShownTouchAnnouncement(false);
    setTouchAnnouncement(null);
  }, [activeArenaChallenge?.id]);

  useEffect(() => {
    if (!activeArenaChallenge || activeArenaChallenge.winMechanism !== "by_target_shots" || hasShownTouchAnnouncement) {
      return;
    }
    // Only show live alerts during ongoing play, not for completed matches
    if (activeArenaChallenge.status === "completed") {
      return;
    }

    const target = Number(activeArenaChallenge.targetTouchShots);
    if (!target || target <= 0) return;

    // Check first round score
    const chScore = Number(challengerScoresInput[0]) || 0;
    const opScore = Number(opponentScoresInput[0]) || 0;

    // Do not alert if scores are still empty / untouched
    if (chScore === 0 && opScore === 0) {
      return;
    }

    if (chScore >= target) {
      setTouchAnnouncement({
        name: activeArenaChallenge.challengerName,
        target: target
      });
      setHasShownTouchAnnouncement(true);
    } else if (opScore >= target) {
      setTouchAnnouncement({
        name: activeArenaChallenge.opponentName || (language === "en" ? "Opponent" : "Đối thủ"),
        target: target
      });
      setHasShownTouchAnnouncement(true);
    }
  }, [challengerScoresInput, opponentScoresInput, activeArenaChallenge, hasShownTouchAnnouncement, language]);

  // Sync ref with state
  useEffect(() => {
    activeArenaChallengeRef.current = activeArenaChallenge;
  }, [activeArenaChallenge]);

  // Loading indicator / Toast message
  const [actionLoading, setActionLoading] = useState(false);
  const [isSignConfirmModalOpen, setIsSignConfirmModalOpen] = useState(false);

  // Lock scroll when any modal is open
  useEffect(() => {
    const isAnyModalOpen = isCreateModalOpen || isEditModalOpen || (deleteConfirmStep > 0) || (deleteSetConfirmStep > 0) || (selectedDetailChallenge !== null) || (touchAnnouncement !== null) || isSignConfirmModalOpen;
    if (isAnyModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isCreateModalOpen, isEditModalOpen, deleteConfirmStep, deleteSetConfirmStep, selectedDetailChallenge, touchAnnouncement, isSignConfirmModalOpen]);

  // Subscribe to PK Challenges (Real-time updates)
  useEffect(() => {
    const q = query(collection(db, "vsc_pk_challenges"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snap) => {
      const list: PKChallenge[] = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as PKChallenge);
      });
      setChallenges(list);
      setLoading(false);

      // Check for new join requests to trigger "Modal nổ" for Challenger
      if (currentUser) {
        const currentRequestsMap: Record<string, string[]> = {};
        list.forEach((challenge) => {
          if (
            challenge.challengerUid === currentUser.uid &&
            challenge.status === "open" &&
            challenge.joinRequests &&
            challenge.joinRequests.length > 0
          ) {
            currentRequestsMap[challenge.id] = challenge.joinRequests.map(r => r.uid);
          }
        });

        if (!isFirstLoadRef.current) {
          list.forEach((challenge) => {
            if (
              challenge.challengerUid === currentUser.uid &&
              challenge.status === "open" &&
              challenge.joinRequests &&
              challenge.joinRequests.length > 0
            ) {
              const prevUids = prevActiveRequestsRef.current[challenge.id] || [];
              const currentUids = currentRequestsMap[challenge.id] || [];
              
              // Did anyone NEW request? OR is any uid present now that wasn't in prevUids?
              const hasNewRequest = currentUids.some(uid => !prevUids.includes(uid));
              if (hasNewRequest) {
                // Trigger modal with ALL current joinRequests for this challenge
                setNewApplicantNotification({
                  challenge,
                  applicants: challenge.joinRequests
                });
              }
            }
          });
        }
        prevActiveRequestsRef.current = currentRequestsMap;

        // Real-time application rejection checking
        const prevApplied = { ...appliedChallengesRef.current };
        const currentlyApplied: Record<string, { title: string; challengerName: string }> = {};

        list.forEach((challenge) => {
          const userApplied = challenge.joinRequests?.some(r => r.uid === currentUser.uid);
          if (userApplied && challenge.status === "open") {
            currentlyApplied[challenge.id] = {
              title: challenge.title || "Kèo đấu PK",
              challengerName: challenge.challengerName || "Chủ kèo"
            };
          }
        });

        if (isFirstLoadRef.current) {
          appliedChallengesRef.current = currentlyApplied;
        } else {
          const rejectionsThisTime: { challengeTitle: string; challengerName: string }[] = [];
          const approvalsThisTime: { challengeTitle: string; challengerName: string; challengeId: string }[] = [];

          Object.entries(prevApplied).forEach(([challengeId, infoVal]) => {
            const info = infoVal as { title: string; challengerName: string };
            if (!currentlyApplied[challengeId]) {
              const updatedChallenge = list.find(c => c.id === challengeId);

              if (!updatedChallenge) {
                // Challenge deleted or cancelled
                rejectionsThisTime.push({
                  challengeTitle: info.title,
                  challengerName: info.challengerName
                });
              } else if (updatedChallenge.status === "accepted") {
                // If it transitioned to accepted, check if currentUser was chosen
                if (updatedChallenge.opponentUid === currentUser.uid) {
                  approvalsThisTime.push({
                    challengeTitle: info.title,
                    challengerName: info.challengerName,
                    challengeId: updatedChallenge.id
                  });
                } else {
                  // Challenger chose someone else!
                  rejectionsThisTime.push({
                    challengeTitle: info.title,
                    challengerName: info.challengerName
                  });
                }
              } else {
                // Challenge still open but currentUser removed from requests (decline)
                rejectionsThisTime.push({
                  challengeTitle: info.title,
                  challengerName: info.challengerName
                });
              }
            }
          });

          if (rejectionsThisTime.length > 0) {
            setRejectionNotification(prev => ({
              items: [...(prev?.items || []), ...rejectionsThisTime]
            }));
          }

          if (approvalsThisTime.length > 0) {
            setApprovedNotification(prev => ({
              items: [...(prev?.items || []), ...approvalsThisTime]
            }));
          }

          appliedChallengesRef.current = currentlyApplied;
        }
      }
      isFirstLoadRef.current = false;

      // If user is currently in the arena, keep their arena challenge updated in real-time
      const activeChallenge = activeArenaChallengeRef.current;
      if (activeChallenge) {
        const updated = list.find((c) => c.id === activeChallenge.id);
        if (updated) {
          // Only update active challenge state if database contents actually differ
          if (JSON.stringify(updated) !== JSON.stringify(activeChallenge)) {
            setActiveArenaChallenge(updated);
          }
        }
      }
    }, (error) => {
      console.error("Error listening to challenges:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Auto cleanup expired/stale challenges based on criteria:
  // - Deletes "open" challenges 24h after the scheduled match time if not accepted.
  // - Deletes "accepted" or "ongoing" challenges 48h after the scheduled match time if not completed.
  useEffect(() => {
    if (challenges.length === 0) return;
    const now = Date.now();
    const toDelete: string[] = [];

    challenges.forEach((challenge) => {
      if (!challenge.id) return;
      const matchTime = challenge.dateTime ? new Date(challenge.dateTime).getTime() : null;
      if (!matchTime || isNaN(matchTime)) return;

      if (challenge.status === "open") {
        if (now - matchTime > 24 * 60 * 60 * 1000) {
          toDelete.push(challenge.id);
        }
      } else if (challenge.status === "accepted" || challenge.status === "ongoing") {
        if (now - matchTime > 48 * 60 * 60 * 1000) {
          toDelete.push(challenge.id);
        }
      }
    });

    if (toDelete.length > 0) {
      toDelete.forEach(async (id) => {
        try {
          await deleteDoc(doc(db, "vsc_pk_challenges", id));
          console.log(`Auto deleted expired/stale challenge: ${id}`);
        } catch (err) {
          console.error(`Error auto-deleting challenge ${id}:`, err);
        }
      });
    }
  }, [challenges]);

  // Subscribe to System Athletes to link profiles
  useEffect(() => {
    const unsubscribe = subscribeToVscSystemAthletes((athletesList) => {
      setSystemAthletes(athletesList);
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to System Clubs to link profiles
  useEffect(() => {
    const unsubscribe = subscribeToVscSystemClubs((clubsList: any[]) => {
      setSystemClubs(clubsList);
    });
    return () => unsubscribe();
  }, []);

  // Find linked system athlete for current logged-in user
  const loggedInAthlete = useMemo(() => {
    if (!currentUser?.email) return null;
    return systemAthletes.find(
      (a) => a.email && a.email.trim().toLowerCase() === currentUser.email.toLowerCase()
    ) || null;
  }, [currentUser, systemAthletes]);

  // Find linked club for current logged-in user (either creator or member)
  const loggedInClubs = useMemo(() => {
    if (!currentUser?.uid) return [];
    return systemClubs.filter(
      (c) => c.leaderId === currentUser.uid || c.members?.some((m) => m.userId === currentUser.uid)
    );
  }, [currentUser, systemClubs]);

  // Initialize form defaults on open
  useEffect(() => {
    if (isCreateModalOpen) {
      if (loggedInAthlete) {
        setSelectedAthleteId(loggedInAthlete.id);
      } else if (systemAthletes.length > 0) {
        setSelectedAthleteId(systemAthletes[0].id);
      }
      if (loggedInClubs.length > 0) {
        setSelectedClubId(loggedInClubs[0].id);
      }
      
      // Default dates/times
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(19, 0, 0, 0);
      const tzoffset = tomorrow.getTimezoneOffset() * 60000;
      const localISOTime = (new Date(tomorrow.getTime() - tzoffset)).toISOString().slice(0, 16);
      setFormDateTime(localISOTime);
    }
  }, [isCreateModalOpen, loggedInAthlete, systemAthletes, loggedInClubs]);

  // Reset inputs when changing active arena matches
  useEffect(() => {
    setChallengerScoresInput([]);
    setOpponentScoresInput([]);
    setChallengerShotsInput([]);
    setOpponentShotsInput([]);
  }, [activeArenaChallenge?.id]);

  // Sync arena input score states with the active arena data in real-time
  useEffect(() => {
    if (!activeArenaChallenge) return;

    const scores = activeArenaChallenge.scores;
    const finalSetsCount = scores?.challengerScores?.length || activeArenaChallenge.setsCount || 3;
    const finalShotsPerSet = activeArenaChallenge.shotsPerSet || 5;

    // 1. Get database scores
    const dbChScores = scores?.challengerScores || Array(finalSetsCount).fill(0);
    const dbOpScores = scores?.opponentScores || Array(finalSetsCount).fill(0);

    // Parse database shots
    let dbChShots: boolean[][] = [];
    let dbOpShots: boolean[][] = [];

    if (typeof scores?.challengerShots === "string" && scores.challengerShots !== "") {
      try {
        dbChShots = JSON.parse(scores.challengerShots);
      } catch (e) {
        dbChShots = Array(finalSetsCount).fill(null).map(() => Array(finalShotsPerSet).fill(null));
      }
    } else if (Array.isArray(scores?.challengerShots)) {
      dbChShots = scores.challengerShots as boolean[][];
    } else {
      dbChShots = Array(finalSetsCount).fill(null).map(() => Array(finalShotsPerSet).fill(null));
    }

    if (dbChShots.length === 0) {
      dbChShots = Array(finalSetsCount).fill(null).map(() => Array(finalShotsPerSet).fill(null));
    }

    if (typeof scores?.opponentShots === "string" && scores.opponentShots !== "") {
      try {
        dbOpShots = JSON.parse(scores.opponentShots);
      } catch (e) {
        dbOpShots = Array(finalSetsCount).fill(null).map(() => Array(finalShotsPerSet).fill(null));
      }
    } else if (Array.isArray(scores?.opponentShots)) {
      dbOpShots = scores.opponentShots as boolean[][];
    } else {
      dbOpShots = Array(finalSetsCount).fill(null).map(() => Array(finalShotsPerSet).fill(null));
    }

    if (dbOpShots.length === 0) {
      dbOpShots = Array(finalSetsCount).fill(null).map(() => Array(finalShotsPerSet).fill(null));
    }

    // 2. Decide what to sync to local state based on user role and permissions to avoid race conditions
    const isChallenger = currentUser?.uid === activeArenaChallenge.challengerUid;
    const isOpponent = currentUser?.uid === activeArenaChallenge.opponentUid;
    const hasReferee = !!(activeArenaChallenge.refereeEmail && activeArenaChallenge.refereeEmail.trim() !== "");
    
    const admins = ["vscvietnamslingshot@gmail.com", "nahnatofficial@gmail.com"];
    const isReferee = !!((activeArenaChallenge.refereeEmail && currentUser?.email && activeArenaChallenge.refereeEmail.toLowerCase() === currentUser.email.toLowerCase()) || (currentUser?.email && admins.includes(currentUser.email.toLowerCase())));

    const canEditCh = activeArenaChallenge.status !== "completed" && (isReferee || (!hasReferee && (isChallenger || isOpponent)));
    const canEditOp = activeArenaChallenge.status !== "completed" && (isReferee || (!hasReferee && (isChallenger || isOpponent)));

    if (canEditCh) {
      setChallengerScoresInput((prev) => {
        if (JSON.stringify(prev) !== JSON.stringify(dbChScores)) {
          return dbChScores;
        }
        return prev;
      });
      setChallengerShotsInput((prev) => {
        if (JSON.stringify(prev) !== JSON.stringify(dbChShots)) {
          return dbChShots;
        }
        return prev;
      });
    } else {
      setChallengerScoresInput(dbChScores);
      setChallengerShotsInput(dbChShots);
    }

    if (canEditOp) {
      setOpponentScoresInput((prev) => {
        if (JSON.stringify(prev) !== JSON.stringify(dbOpScores)) {
          return dbOpScores;
        }
        return prev;
      });
      setOpponentShotsInput((prev) => {
        if (JSON.stringify(prev) !== JSON.stringify(dbOpShots)) {
          return dbOpShots;
        }
        return prev;
      });
    } else {
      setOpponentScoresInput(dbOpScores);
      setOpponentShotsInput(dbOpShots);
    }
  }, [activeArenaChallenge, currentUser?.uid]);

  // Calculate stats dynamically for PK Leaderboard
  const pkLeaderboard = useMemo(() => {
    const stats: Record<string, { 
      id: string;
      uid: string; 
      name: string; 
      avatarUrl: string; 
      wins: number; 
      losses: number; 
      draws: number; 
      elo: number; 
      streak: number; 
      isClub?: boolean;
    }> = {};

    challenges.forEach((challenge) => {
      if (challenge.status !== "completed" || !challenge.scores) return;

      let challengerKey = challenge.challengerUid;
      let opponentKey = challenge.opponentUid;
      let finalChallengerName = challenge.challengerName;
      let finalChallengerAvatar = challenge.challengerAvatar || "";
      let finalOpponentName = challenge.opponentName || "Đối thủ";
      let finalOpponentAvatar = challenge.opponentAvatar || "";

      if (challenge.type === "team_vs_team") {
        const cleanChName = challenge.challengerName?.trim().toLowerCase();
        const cleanOpName = challenge.opponentName?.trim().toLowerCase();

        const matchChClub = systemClubs.find(c => c.name?.trim().toLowerCase() === cleanChName);
        const matchOpClub = systemClubs.find(c => c.name?.trim().toLowerCase() === cleanOpName);

        challengerKey = matchChClub ? `club-${matchChClub.id}` : `club-${challenge.challengerUid}`;
        opponentKey = matchOpClub ? `club-${matchOpClub.id}` : `club-${challenge.opponentUid}`;

        if (matchChClub) {
          finalChallengerName = matchChClub.name;
          if (matchChClub.logoUrl) finalChallengerAvatar = matchChClub.logoUrl;
        }
        if (matchOpClub) {
          finalOpponentName = matchOpClub.name;
          if (matchOpClub.logoUrl) finalOpponentAvatar = matchOpClub.logoUrl;
        }
      } else {
        challengerKey = challenge.challengerUid;
        opponentKey = challenge.opponentUid;
      }

      if (!challengerKey || !opponentKey) return;

      // Initialize if not exists
      if (!stats[challengerKey]) {
        stats[challengerKey] = { 
          id: challengerKey,
          uid: challenge.challengerUid, 
          name: finalChallengerName, 
          avatarUrl: finalChallengerAvatar, 
          wins: 0, 
          losses: 0, 
          draws: 0, 
          elo: 1000, 
          streak: 0,
          isClub: challenge.type === "team_vs_team"
        };
      }
      if (!stats[opponentKey]) {
        stats[opponentKey] = { 
          id: opponentKey,
          uid: challenge.opponentUid!, 
          name: finalOpponentName, 
          avatarUrl: finalOpponentAvatar, 
          wins: 0, 
          losses: 0, 
          draws: 0, 
          elo: 1000, 
          streak: 0,
          isClub: challenge.type === "team_vs_team"
        };
      }

      const scores = challenge.scores;
      const chScores = scores.challengerScores || [];
      const opScores = scores.opponentScores || [];
      const winMechanism = challenge.winMechanism || "by_sets";

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
      const draw = isBySets ? (chSetsWon === opSetsWon) : (chSum === opSum);

      // Simple ELO computation helper
      const rCh = stats[challengerKey].elo;
      const rOp = stats[opponentKey].elo;
      const expectedCh = 1 / (1 + Math.pow(10, (rOp - rCh) / 400));
      const expectedOp = 1 / (1 + Math.pow(10, (rCh - rOp) / 400));
      const K = 32;

      if (challengerWin) {
        // Challenger wins
        stats[challengerKey].wins += 1;
        stats[challengerKey].streak += 1;
        stats[opponentKey].losses += 1;
        stats[opponentKey].streak = 0;

        stats[challengerKey].elo = Math.round(rCh + K * (1 - expectedCh));
        stats[opponentKey].elo = Math.round(rOp + K * (0 - expectedOp));
      } else if (opponentWin) {
        // Opponent wins
        stats[opponentKey].wins += 1;
        stats[opponentKey].streak += 1;
        stats[challengerKey].losses += 1;
        stats[challengerKey].streak = 0;

        stats[opponentKey].elo = Math.round(rOp + K * (1 - expectedOp));
        stats[challengerKey].elo = Math.round(rCh + K * (0 - expectedCh));
      } else {
        // Draw
        stats[challengerKey].draws += 1;
        stats[opponentKey].draws += 1;

        stats[challengerKey].elo = Math.round(rCh + K * (0.5 - expectedCh));
        stats[opponentKey].elo = Math.round(rOp + K * (0.5 - expectedOp));
      }
    });

    return Object.values(stats).sort((a, b) => b.elo - a.elo);
  }, [challenges]);

  const filteredLeaderboard = useMemo(() => {
    if (leaderboardSubTab === "club") {
      return pkLeaderboard.filter(p => p.isClub);
    } else {
      return pkLeaderboard.filter(p => !p.isClub);
    }
  }, [pkLeaderboard, leaderboardSubTab]);

  // Handle Challenge Creation
  const handleCreateChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenAuthModal();
      return;
    }

    if (!formTitle.trim() || !formLocation.trim()) {
      alert(language === "en" ? "Please fill in all required fields!" : "Vui lòng điền đầy đủ tiêu đề và địa điểm!");
      return;
    }

    setActionLoading(true);

    try {
      let creatorName = currentUser.displayName || "Cơ thủ";
      let creatorAvatar = currentUser.photoURL || "";

      // Overwrite with linked system athlete profile info if solo
      if (formType === "solo_1v1" && selectedAthleteId) {
        const linkedAth = systemAthletes.find(a => a.id === selectedAthleteId);
        if (linkedAth) {
          creatorName = linkedAth.name;
          if (linkedAth.avatarUrl) creatorAvatar = linkedAth.avatarUrl;
        }
      }

      // Overwrite with club info if team
      if (formType === "team_vs_team" && selectedClubId) {
        const linkedClub = systemClubs.find(c => c.id === selectedClubId);
        if (linkedClub) {
          creatorName = linkedClub.name;
          if (linkedClub.logoUrl) creatorAvatar = linkedClub.logoUrl;
        }
      }

      const finalSetsCount = formSetsCountOption === "custom" 
        ? (Number(formSetsCountCustom) || 3) 
        : (Number(formSetsCountOption) || 3);

      const challengeData: any = {
        type: formType,
        title: formTitle.trim(),
        rules: formRules.trim(),
        dateTime: formDateTime,
        location: formLocation.trim(),
        description: formDescription.trim(),
        status: "open",
        challengerUid: currentUser.uid,
        challengerName: creatorName,
        challengerAvatar: creatorAvatar,
        createdAt: new Date().toISOString(),
        distance: formDistance.trim() || "10m",
        shotsPerSet: Number(formShotsPerSet) || 5,
        setsCount: finalSetsCount,
        winMechanism: formWinMechanism,
        targetType: formTargetType,
        targetTouchShots: Number(formTargetTouchShots) || 30,
      };

      if (formPin.trim()) {
        challengeData.pin = formPin.trim();
      }

      // Handle Direct Opponent Designation
      if (formDesignateOpponent) {
        let opName = "";
        let opAvatar = "";
        let opAthleteId = "";

        if (formType === "solo_1v1" && formDesignatedOpponentAthleteId) {
          const linkedAth = systemAthletes.find(a => a.id === formDesignatedOpponentAthleteId);
          if (linkedAth) {
            opName = linkedAth.name;
            opAvatar = linkedAth.avatarUrl || "";
            opAthleteId = linkedAth.id;
          }
        } else if (formType === "team_vs_team" && formDesignatedOpponentClubId) {
          const linkedClub = systemClubs.find(c => c.id === formDesignatedOpponentClubId);
          if (linkedClub) {
            opName = linkedClub.name;
            opAvatar = linkedClub.logoUrl || "";
          }
        }

        if (opName) {
          challengeData.status = "accepted";
          challengeData.opponentName = opName;
          challengeData.opponentAvatar = opAvatar;
          if (opAthleteId) {
            challengeData.opponentAthleteId = opAthleteId;
          }
          challengeData.scores = {
            challengerScores: Array(finalSetsCount).fill(0),
            opponentScores: Array(finalSetsCount).fill(0),
            challengerShots: JSON.stringify(Array(finalSetsCount).fill(null).map(() => Array(Number(formShotsPerSet) || 5).fill(null))),
            opponentShots: JSON.stringify(Array(finalSetsCount).fill(null).map(() => Array(Number(formShotsPerSet) || 5).fill(null))),
            challengerConfirm: false,
            opponentConfirm: false
          };
        }
      }

      if (formType === "team_vs_team") {
        challengeData.teamSize = formTeamSize;
      }
      if (formRefereeEmail.trim()) {
        challengeData.refereeEmail = formRefereeEmail.trim().toLowerCase();
      }

      await addDoc(collection(db, "vsc_pk_challenges"), challengeData);

      // Reset Form and close modal
      setFormTitle("");
      setFormDescription("");
      setFormLocation("VSC ONLINE");
      setFormRefereeEmail("");
      setFormPin("");
      setFormDesignateOpponent(false);
      setFormDesignatedOpponentAthleteId("");
      setFormDesignatedOpponentClubId("");
      setIsCreateModalOpen(false);

      alert(language === "en" 
        ? "Successfully created PK challenge looking for opponents!" 
        : "Đăng kèo tìm đối thủ thành công! Hãy đợi người chơi khác nhận thách đấu."
      );
    } catch (err) {
      console.error("Error creating challenge:", err);
      alert("Đã xảy ra lỗi khi tạo kèo: " + (err as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Accepting a Challenge
  const handleAcceptChallenge = async (challenge: PKChallenge) => {
    if (!currentUser) {
      onOpenAuthModal();
      return;
    }

    if (challenge.challengerUid === currentUser.uid) {
      alert(language === "en" 
        ? "You cannot accept your own challenge!" 
        : "Bạn không thể tự nhận kèo thi đấu do chính bạn tạo ra!"
      );
      return;
    }

    // Check if user already requested
    const alreadyRequested = challenge.joinRequests?.some(r => r.uid === currentUser.uid);
    if (alreadyRequested) {
      alert(language === "en"
        ? "You have already requested to join this challenge! Please wait for the Challenger to approve."
        : "Bạn đã gửi yêu cầu ứng tuyển kèo này rồi! Vui lòng chờ Chủ kèo phê duyệt."
      );
      return;
    }

    // Open custom accept modal
    setAcceptPinInput("");
    setAcceptError("");
    setActiveAcceptChallenge(challenge);
  };

  const handleImmediateJoinWithPin = async (challenge: PKChallenge) => {
    if (!currentUser) return;
    if (acceptPinInput.trim() !== challenge.pin?.trim()) {
      setAcceptError(language === "en" ? "Incorrect PIN!" : "Mã PIN không chính xác!");
      return;
    }

    setActionLoading(true);
    setAcceptError("");
    try {
      let opponentName = currentUser.displayName || "Đối thủ";
      let opponentAvatar = currentUser.photoURL || "";

      // Overwrite with linked system athlete profile info if solo
      if (challenge.type === "solo_1v1") {
        if (loggedInAthlete) {
          opponentName = loggedInAthlete.name;
          if (loggedInAthlete.avatarUrl) opponentAvatar = loggedInAthlete.avatarUrl;
        }
      } else {
        // Overwrite with first available club owned by user
        if (loggedInClubs.length > 0) {
          opponentName = loggedInClubs[0].name;
          if (loggedInClubs[0].logoUrl) opponentAvatar = loggedInClubs[0].logoUrl;
        }
      }

      const finalSetsCount = challenge.setsCount || 3;
      const finalShotsPerSet = challenge.shotsPerSet || 5;

      const challengeRef = doc(db, "vsc_pk_challenges", challenge.id);
      await updateDoc(challengeRef, {
        opponentUid: currentUser.uid,
        opponentName: opponentName,
        opponentAvatar: opponentAvatar,
        opponentAthleteId: (challenge.type === "solo_1v1" && loggedInAthlete) ? loggedInAthlete.id : "",
        status: "accepted",
        scores: {
          challengerScores: Array(finalSetsCount).fill(0),
          opponentScores: Array(finalSetsCount).fill(0),
          challengerShots: JSON.stringify(Array(finalSetsCount).fill(null).map(() => Array(finalShotsPerSet).fill(null))),
          opponentShots: JSON.stringify(Array(finalSetsCount).fill(null).map(() => Array(finalShotsPerSet).fill(null))),
          challengerConfirm: false,
          opponentConfirm: false
        },
        joinRequests: [] // Clear other requests
      });

      alert(language === "en"
        ? "Successfully joined the challenge! Match has started."
        : "Vào kèo thành công! Kèo đấu chính thức bắt đầu."
      );
      setActiveAcceptChallenge(null);
      setAcceptPinInput("");
    } catch (err: any) {
      console.error("Error joining with PIN:", err);
      setAcceptError("Lỗi: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestJoinWithoutPin = async (challenge: PKChallenge) => {
    if (!currentUser) return;
    setActionLoading(true);
    try {
      let opponentName = currentUser.displayName || "Đối thủ";
      let opponentAvatar = currentUser.photoURL || "";

      if (challenge.type === "solo_1v1") {
        if (loggedInAthlete) {
          opponentName = loggedInAthlete.name;
          if (loggedInAthlete.avatarUrl) opponentAvatar = loggedInAthlete.avatarUrl;
        }
      } else {
        if (loggedInClubs.length > 0) {
          opponentName = loggedInClubs[0].name;
          if (loggedInClubs[0].logoUrl) opponentAvatar = loggedInClubs[0].logoUrl;
        }
      }

      const requestObj = {
        uid: currentUser.uid,
        name: opponentName,
        avatar: opponentAvatar,
        athleteId: (challenge.type === "solo_1v1" && loggedInAthlete) ? loggedInAthlete.id : "",
        requestedAt: new Date().toISOString()
      };

      const challengeRef = doc(db, "vsc_pk_challenges", challenge.id);
      await updateDoc(challengeRef, {
        joinRequests: arrayUnion(requestObj)
      });

      alert(language === "en"
        ? "Successfully submitted join request! Please wait for the Challenger to approve you."
        : "Gửi yêu cầu ứng tuyển kèo thành công! Hãy đợi Chủ kèo duyệt."
      );
      setActiveAcceptChallenge(null);
    } catch (err: any) {
      console.error("Error request join:", err);
      alert("Lỗi khi ứng tuyển: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Approve Join Request
  const handleApproveJoinRequest = async (challenge: PKChallenge, request: any) => {
    if (!currentUser || currentUser.uid !== challenge.challengerUid) return;

    const confirmApprove = window.confirm(
      language === "en"
        ? `Are you sure you want to select "${request.name}" as your match opponent?`
        : `Bạn có chắc chắn muốn đồng ý chọn "${request.name}" làm đối thủ thi đấu không?`
    );
    if (!confirmApprove) return;

    setActionLoading(true);

    try {
      const finalSetsCount = challenge.setsCount || 3;
      const finalShotsPerSet = challenge.shotsPerSet || 5;

      const challengeRef = doc(db, "vsc_pk_challenges", challenge.id);
      await updateDoc(challengeRef, {
        opponentUid: request.uid,
        opponentName: request.name,
        opponentAvatar: request.avatar || "",
        opponentAthleteId: request.athleteId || "",
        status: "accepted",
        scores: {
          challengerScores: Array(finalSetsCount).fill(0),
          opponentScores: Array(finalSetsCount).fill(0),
          challengerShots: JSON.stringify(Array(finalSetsCount).fill(null).map(() => Array(finalShotsPerSet).fill(null))),
          opponentShots: JSON.stringify(Array(finalSetsCount).fill(null).map(() => Array(finalShotsPerSet).fill(null))),
          challengerConfirm: false,
          opponentConfirm: false
        },
        joinRequests: [] // Clear all pending requests upon match confirmation
      });

      alert(language === "en" 
        ? "Successfully matched with opponent! Match has started." 
        : "Ghép cặp thi đấu thành công! Kèo đấu chính thức bắt đầu."
      );
    } catch (err) {
      console.error("Error approving request:", err);
      alert("Lỗi khi phê duyệt đối thủ: " + (err as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  // Decline Join Request
  const handleDeclineJoinRequest = async (challenge: PKChallenge, request: any) => {
    if (!currentUser || currentUser.uid !== challenge.challengerUid) return;

    const confirmDecline = window.confirm(
      language === "en"
        ? `Are you sure you want to decline "${request.name}"'s request?`
        : `Bạn có chắc chắn muốn từ chối yêu cầu của "${request.name}" không?`
    );
    if (!confirmDecline) return;

    try {
      const challengeRef = doc(db, "vsc_pk_challenges", challenge.id);
      await updateDoc(challengeRef, {
        joinRequests: arrayRemove(request)
      });
    } catch (err) {
      console.error("Error declining request:", err);
      alert("Lỗi khi từ chối yêu cầu: " + (err as Error).message);
    }
  };

  // Cancel/Withdraw own Join Request
  const handleCancelJoinRequest = async (challenge: PKChallenge) => {
    if (!currentUser) return;
    
    const request = challenge.joinRequests?.find(r => r.uid === currentUser.uid);
    if (!request) return;

    const confirmCancel = window.confirm(
      language === "en"
        ? "Are you sure you want to withdraw your join request?"
        : "Bạn có chắc chắn muốn hủy yêu cầu nhận kèo PK này không?"
    );
    if (!confirmCancel) return;

    try {
      const challengeRef = doc(db, "vsc_pk_challenges", challenge.id);
      await updateDoc(challengeRef, {
        joinRequests: arrayRemove(request)
      });
    } catch (err) {
      console.error("Error cancelling join request:", err);
      alert("Lỗi khi hủy yêu cầu nhận kèo: " + (err as Error).message);
    }
  };

  // Open Edit settings modal with prepopulated values
  const openEditModal = (challenge: PKChallenge) => {
    setEditingChallenge(challenge);
    setEditTitle(challenge.title);
    setEditRules(challenge.rules);
    setEditLocation(challenge.location);
    setEditDateTime(challenge.dateTime);
    setEditDescription(challenge.description || "");
    setEditRefereeEmail(challenge.refereeEmail || "");
    setEditDistance(challenge.distance || "10m");
    setEditShotsPerSet(challenge.shotsPerSet || 10);
    setEditWinMechanism(challenge.winMechanism || "by_sets");
    setEditTargetType(challenge.targetType || "bia_muc_tieu");
    setEditTargetTouchShots(challenge.targetTouchShots || 30);

    setEditType(challenge.type || "solo_1v1");
    setEditTeamSize(challenge.teamSize || 3);
    setEditPin(challenge.pin || "");
    setEditDesignateOpponent(!!challenge.opponentName);
    setEditDesignatedOpponentAthleteId(challenge.opponentAthleteId || "");
    
    const targetAth = systemAthletes.find(a => a.id === challenge.opponentAthleteId);
    if (targetAth) {
      setEditOpponentSearch(`${targetAth.name} (VSC-${targetAth.id})`);
    } else if (challenge.opponentName) {
      setEditOpponentSearch(challenge.opponentName);
    } else {
      setEditOpponentSearch("");
    }

    const targetRef = systemAthletes.find(a => a.email?.toLowerCase().trim() === challenge.refereeEmail?.toLowerCase().trim());
    if (targetRef) {
      setEditRefereeSearch(`${targetRef.name} (${targetRef.email || targetRef.id})`);
    } else {
      setEditRefereeSearch(challenge.refereeEmail || "");
    }
    
    const matchingClub = systemClubs.find(c => c.name === challenge.opponentName);
    setEditDesignatedOpponentClubId(matchingClub?.id || "");

    const matchingAthlete = systemAthletes.find(a => a.name === challenge.challengerName);
    setEditSelectedAthleteId(matchingAthlete?.id || loggedInAthlete?.id || (systemAthletes[0] ? systemAthletes[0].id : ""));
    const matchingChallengerClub = systemClubs.find(c => c.name === challenge.challengerName);
    setEditSelectedClubId(matchingChallengerClub?.id || (loggedInClubs[0] ? loggedInClubs[0].id : "") || (systemClubs[0] ? systemClubs[0].id : ""));

    const sets = challenge.setsCount || 3;
    if ([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].includes(sets)) {
      setEditSetsCountOption(String(sets));
      setEditSetsCountCustom(String(sets));
    } else {
      setEditSetsCountOption("custom");
      setEditSetsCountCustom(String(sets));
    }

    setIsEditModalOpen(true);
  };

  useEffect(() => {
    if (activeChallengeId && challenges.length > 0) {
      const match = challenges.find((c) => c.id === activeChallengeId);
      if (match) {
        if (match.status === "completed") {
          setSelectedDetailChallenge(match);
        } else {
          setActiveArenaChallenge(match);
        }
        onClearActiveChallengeId?.();
      }
    }
  }, [activeChallengeId, challenges]);

  useEffect(() => {
    if (editChallengeId && challenges.length > 0) {
      const match = challenges.find((c) => c.id === editChallengeId);
      if (match) {
        openEditModal(match);
        onClearEditChallengeId?.();
      }
    }
  }, [editChallengeId, challenges]);

  // Submit challenge settings changes
  const handleUpdateChallengeSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !editingChallenge) return;

    setActionLoading(true);
    try {
      const challengeRef = doc(db, "vsc_pk_challenges", editingChallenge.id);
      const finalSetsCount = editSetsCountOption === "custom" 
        ? (Number(editSetsCountCustom) || 3) 
        : (Number(editSetsCountOption) || 3);
      
      let creatorName = editingChallenge.challengerName;
      let creatorAvatar = editingChallenge.challengerAvatar;

      if (editType === "solo_1v1" && editSelectedAthleteId) {
        const linkedAth = systemAthletes.find(a => a.id === editSelectedAthleteId);
        if (linkedAth) {
          creatorName = linkedAth.name;
          if (linkedAth.avatarUrl) creatorAvatar = linkedAth.avatarUrl;
        }
      } else if (editType === "team_vs_team" && editSelectedClubId) {
        const linkedClub = systemClubs.find(c => c.id === editSelectedClubId);
        if (linkedClub) {
          creatorName = linkedClub.name;
          if (linkedClub.logoUrl) creatorAvatar = linkedClub.logoUrl;
        }
      }

      const updates: any = {
        title: editTitle.trim(),
        rules: editRules.trim(),
        location: editLocation.trim(),
        dateTime: editDateTime,
        description: editDescription.trim(),
        refereeEmail: editRefereeEmail.trim().toLowerCase() || "",
        distance: editDistance.trim() || "10m",
        shotsPerSet: Number(editShotsPerSet) || 10,
        setsCount: finalSetsCount,
        winMechanism: editWinMechanism,
        targetType: editTargetType,
        targetTouchShots: Number(editTargetTouchShots) || 30,
        type: editType,
        challengerName: creatorName,
        challengerAvatar: creatorAvatar,
        pin: editPin.trim() || ""
      };

      if (editType === "team_vs_team") {
        updates.teamSize = editTeamSize;
      }

      if (editDesignateOpponent) {
        let opName = "";
        let opAvatar = "";
        let opAthleteId = "";

        if (editType === "solo_1v1" && editDesignatedOpponentAthleteId) {
          const linkedAth = systemAthletes.find(a => a.id === editDesignatedOpponentAthleteId);
          if (linkedAth) {
            opName = linkedAth.name;
            opAvatar = linkedAth.avatarUrl || "";
            opAthleteId = linkedAth.id;
          }
        } else if (editType === "team_vs_team" && editDesignatedOpponentClubId) {
          const linkedClub = systemClubs.find(c => c.id === editDesignatedOpponentClubId);
          if (linkedClub) {
            opName = linkedClub.name;
            opAvatar = linkedClub.logoUrl || "";
          }
        }

        if (opName) {
          updates.status = "accepted";
          updates.opponentName = opName;
          updates.opponentAvatar = opAvatar;
          if (opAthleteId) {
            updates.opponentAthleteId = opAthleteId;
          } else {
            updates.opponentAthleteId = "";
          }
          if (!editingChallenge.scores) {
            updates.scores = {
              challengerScores: Array(finalSetsCount).fill(0),
              opponentScores: Array(finalSetsCount).fill(0),
              challengerShots: JSON.stringify(Array(finalSetsCount).fill(null).map(() => Array(Number(editShotsPerSet) || 5).fill(null))),
              opponentShots: JSON.stringify(Array(finalSetsCount).fill(null).map(() => Array(Number(editShotsPerSet) || 5).fill(null))),
              challengerConfirm: false,
              opponentConfirm: false
            };
          }
        }
      } else {
        if (editingChallenge.status === "open" || editingChallenge.status === "accepted") {
          updates.status = "open";
          updates.opponentName = "";
          updates.opponentAvatar = "";
          updates.opponentAthleteId = "";
        }
      }

      // Recalculate score matrix dimensions if scores already exist
      if (editingChallenge.scores) {
        const currentCh = editingChallenge.scores.challengerScores || [];
        const currentOp = editingChallenge.scores.opponentScores || [];
        
        let currentChShots: boolean[][] = [];
        let currentOpShots: boolean[][] = [];

        if (typeof editingChallenge.scores.challengerShots === "string") {
          try {
            currentChShots = JSON.parse(editingChallenge.scores.challengerShots);
          } catch (e) {
            currentChShots = [];
          }
        } else if (Array.isArray(editingChallenge.scores.challengerShots)) {
          currentChShots = editingChallenge.scores.challengerShots as boolean[][];
        }

        if (typeof editingChallenge.scores.opponentShots === "string") {
          try {
            currentOpShots = JSON.parse(editingChallenge.scores.opponentShots);
          } catch (e) {
            currentOpShots = [];
          }
        } else if (Array.isArray(editingChallenge.scores.opponentShots)) {
          currentOpShots = editingChallenge.scores.opponentShots as boolean[][];
        }

        let newCh = [...currentCh];
        let newOp = [...currentOp];
        let newChShots = [...currentChShots];
        let newOpShots = [...currentOpShots];

        if (newCh.length < finalSetsCount) {
          while (newCh.length < finalSetsCount) {
            newCh.push(0);
            newOp.push(0);
            newChShots.push(Array(updates.shotsPerSet).fill(null));
            newOpShots.push(Array(updates.shotsPerSet).fill(null));
          }
        } else if (newCh.length > finalSetsCount) {
          newCh = newCh.slice(0, finalSetsCount);
          newOp = newOp.slice(0, finalSetsCount);
          newChShots = newChShots.slice(0, finalSetsCount);
          newOpShots = newOpShots.slice(0, finalSetsCount);
        }

        updates.scores = {
          ...editingChallenge.scores,
          challengerScores: newCh,
          opponentScores: newOp,
          challengerShots: JSON.stringify(newChShots),
          opponentShots: JSON.stringify(newOpShots),
        };
      }

      await updateDoc(challengeRef, updates);
      setIsEditModalOpen(false);
      setEditingChallenge(null);
      alert(language === "en" ? "Challenge settings updated successfully!" : "Cập nhật cài đặt kèo đấu thành công!");
    } catch (err) {
      console.error("Error updating challenge settings:", err);
      alert("Lỗi khi cập nhật cài đặt: " + (err as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  // Open 2-Step delete confirmation modal
  const openDeleteConfirmation = (challengeId: string) => {
    setDeleteChallengeId(challengeId);
    setDeleteConfirmStep(1);
  };

  const handleConfirmDeleteStep1 = () => {
    setDeleteConfirmStep(2);
  };

  const handleConfirmDeleteFinal = async () => {
    if (!deleteChallengeId) return;
    setActionLoading(true);
    try {
      await deleteDoc(doc(db, "vsc_pk_challenges", deleteChallengeId));
      setDeleteChallengeId(null);
      setDeleteConfirmStep(0);
      alert(language === "en" ? "Challenge deleted permanently!" : "Xóa kèo đấu vĩnh viễn thành công!");
    } catch (err) {
      console.error("Error deleting challenge:", err);
      alert("Lỗi khi xóa kèo: " + (err as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Deleting an open Challenge (fallback function maintained)
  const handleDeleteChallenge = async (challengeId: string) => {
    openDeleteConfirmation(challengeId);
  };

  // Check if current user is referee/admin for the arena match
  const isRefereeOfMatch = useMemo(() => {
    if (!currentUser || !activeArenaChallenge) return false;
    // Is designated referee by email
    if (activeArenaChallenge.refereeEmail && currentUser.email && activeArenaChallenge.refereeEmail.toLowerCase() === currentUser.email.toLowerCase()) {
      return true;
    }
    // Is global admin
    const admins = ["vscvietnamslingshot@gmail.com", "nahnatofficial@gmail.com"];
    if (currentUser.email && admins.includes(currentUser.email.toLowerCase())) {
      return true;
    }
    return false;
  }, [currentUser, activeArenaChallenge]);

  const isChallengerOfMatch = useMemo(() => {
    return !!(currentUser?.uid && activeArenaChallenge && currentUser.uid === activeArenaChallenge.challengerUid);
  }, [activeArenaChallenge, currentUser?.uid]);

  const isOpponentOfMatch = useMemo(() => {
    if (!currentUser?.uid || !activeArenaChallenge) return false;
    if (currentUser.uid === activeArenaChallenge.opponentUid) return true;
    if (activeArenaChallenge.opponentAthleteId && loggedInAthlete && loggedInAthlete.id === activeArenaChallenge.opponentAthleteId) return true;
    return false;
  }, [activeArenaChallenge, currentUser?.uid, loggedInAthlete]);
  
  const hasRefereeAssigned = useMemo(() => {
    return !!(activeArenaChallenge?.refereeEmail && activeArenaChallenge.refereeEmail.trim() !== "");
  }, [activeArenaChallenge?.refereeEmail]);

  const canEditChallenger = useMemo(() => {
    if (!activeArenaChallenge || activeArenaChallenge.status === "completed") return false;
    if (activeArenaChallenge.scores?.challengerConfirm) return false;
    if (hasRefereeAssigned) {
      return isRefereeOfMatch;
    }
    return isChallengerOfMatch || isOpponentOfMatch || isRefereeOfMatch;
  }, [activeArenaChallenge, hasRefereeAssigned, isRefereeOfMatch, isChallengerOfMatch, isOpponentOfMatch]);

  const canEditOpponent = useMemo(() => {
    if (!activeArenaChallenge || activeArenaChallenge.status === "completed") return false;
    if (activeArenaChallenge.scores?.opponentConfirm) return false;
    if (hasRefereeAssigned) {
      return isRefereeOfMatch;
    }
    return isChallengerOfMatch || isOpponentOfMatch || isRefereeOfMatch;
  }, [activeArenaChallenge, hasRefereeAssigned, isRefereeOfMatch, isChallengerOfMatch, isOpponentOfMatch]);

  // Dynamically add a new round (set) to the active arena challenge
  const handleAddRound = async () => {
    if (!currentUser || !activeArenaChallenge) return;

    if (!isChallengerOfMatch && !isRefereeOfMatch) {
      alert(language === "en" ? "Only Challenger or Referee can add a round!" : "Chỉ người mở kèo (Challenger) hoặc Trọng tài mới được quyền thêm hiệp đấu!");
      return;
    }

    const currentSetsCount = activeArenaChallenge.setsCount || 3;
    const newSetsCount = currentSetsCount + 1;
    const shotsPerSet = activeArenaChallenge.shotsPerSet || 5;

    try {
      setActionLoading(true);
      const challengeRef = doc(db, "vsc_pk_challenges", activeArenaChallenge.id);

      // Expand local state arrays
      const nextChScores = [...challengerScoresInput];
      const nextOpScores = [...opponentScoresInput];
      while (nextChScores.length < newSetsCount) {
        nextChScores.push(0);
      }
      while (nextOpScores.length < newSetsCount) {
        nextOpScores.push(0);
      }

      // Expand local shot matrices
      const nextChShots = [...challengerShotsInput];
      const nextOpShots = [...opponentShotsInput];
      while (nextChShots.length < newSetsCount) {
        nextChShots.push(Array(shotsPerSet).fill(null));
      }
      while (nextOpShots.length < newSetsCount) {
        nextOpShots.push(Array(shotsPerSet).fill(null));
      }

      // Update local state first to prevent flashing
      setChallengerScoresInput(nextChScores);
      setOpponentScoresInput(nextOpScores);
      setChallengerShotsInput(nextChShots);
      setOpponentShotsInput(nextOpShots);

      // Save to Firestore
      await updateDoc(challengeRef, {
        setsCount: newSetsCount,
        "scores.challengerScores": nextChScores,
        "scores.opponentScores": nextOpScores,
        "scores.challengerShots": JSON.stringify(nextChShots),
        "scores.opponentShots": JSON.stringify(nextOpShots),
      });

      // Update the active object in real time
      setActiveArenaChallenge((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          setsCount: newSetsCount,
          scores: {
            ...prev.scores,
            challengerScores: nextChScores,
            opponentScores: nextOpScores,
            challengerShots: JSON.stringify(nextChShots),
            opponentShots: JSON.stringify(nextOpShots),
          }
        };
      });

      alert(language === "en" ? `Added Round ${newSetsCount}!` : `Đã thêm Hiệp ${newSetsCount}!`);
    } catch (err) {
      console.error("Error adding round:", err);
      alert("Lỗi thêm hiệp đấu: " + (err as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  // Open delete set confirmation modal
  const handleOpenDeleteSetConfirm = (setIdx: number) => {
    setDeletingSetIndex(setIdx);
    setDeleteSetConfirmStep(1);
  };

  // Confirm and delete individual set from match
  const handleConfirmDeleteSet = async () => {
    if (deletingSetIndex === null || !activeArenaChallenge) return;
    
    const isChallenger = currentUser?.uid === activeArenaChallenge.challengerUid;
    const admins = ["vscvietnamslingshot@gmail.com", "nahnatofficial@gmail.com"];
    const isReferee = (activeArenaChallenge.refereeEmail && currentUser?.email && activeArenaChallenge.refereeEmail.toLowerCase() === currentUser.email.toLowerCase()) || (currentUser?.email && admins.includes(currentUser.email.toLowerCase()));
    
    if (!isChallenger && !isReferee) {
      alert(language === "en" ? "Only the Challenger or Referee can delete rounds!" : "Chỉ người mở kèo (Challenger) hoặc Trọng tài mới có quyền xóa hiệp đấu!");
      setDeleteSetConfirmStep(0);
      setDeletingSetIndex(null);
      return;
    }

    try {
      setActionLoading(true);
      const setIdx = deletingSetIndex;
      const challengeRef = doc(db, "vsc_pk_challenges", activeArenaChallenge.id);

      const currentSetsCount = activeArenaChallenge.setsCount || 3;
      if (currentSetsCount <= 1) {
        alert(language === "en" ? "Cannot delete the last remaining round!" : "Không thể xóa hiệp đấu cuối cùng còn lại!");
        setDeleteSetConfirmStep(0);
        setDeletingSetIndex(null);
        return;
      }
      const newSetsCount = currentSetsCount - 1;

      // Filter out deleted set index from inputs
      const nextChScores = challengerScoresInput.filter((_, idx) => idx !== setIdx);
      const nextOpScores = opponentScoresInput.filter((_, idx) => idx !== setIdx);
      const nextChShots = challengerShotsInput.filter((_, idx) => idx !== setIdx);
      const nextOpShots = opponentShotsInput.filter((_, idx) => idx !== setIdx);

      // Update local states
      setChallengerScoresInput(nextChScores);
      setOpponentScoresInput(nextOpScores);
      setChallengerShotsInput(nextChShots);
      setOpponentShotsInput(nextOpShots);

      // Save to Firestore
      await updateDoc(challengeRef, {
        setsCount: newSetsCount,
        "scores.challengerScores": nextChScores,
        "scores.opponentScores": nextOpScores,
        "scores.challengerShots": JSON.stringify(nextChShots),
        "scores.opponentShots": JSON.stringify(nextOpShots),
      });

      // Update activeArenaChallenge state to trigger re-renders
      setActiveArenaChallenge((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          setsCount: newSetsCount,
          scores: {
            ...prev.scores,
            challengerScores: nextChScores,
            opponentScores: nextOpScores,
            challengerShots: JSON.stringify(nextChShots),
            opponentShots: JSON.stringify(nextOpShots),
          }
        };
      });

      setDeleteSetConfirmStep(0);
      setDeletingSetIndex(null);
      alert(language === "en" ? "Round deleted successfully!" : "Đã xóa hiệp đấu thành công!");
    } catch (err) {
      console.error("Error deleting round:", err);
      alert("Lỗi khi xóa hiệp: " + (err as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  // Auto-save scores and shots to Firestore in real-time
  const saveScoresAndShotsToDb = async (
    chScores: number[],
    opScores: number[],
    chShots: (boolean | null)[][],
    opShots: (boolean | null)[][]
  ) => {
    if (!activeArenaChallenge) return;
    try {
      const challengeRef = doc(db, "vsc_pk_challenges", activeArenaChallenge.id);
      
      // Merge with latest confirmations to avoid wiping them
      const snap = await getDoc(challengeRef);
      if (snap.exists()) {
        const freshData = snap.data() as PKChallenge;
        const freshScores = freshData.scores || {};
        
        await updateDoc(challengeRef, {
          "scores.challengerScores": chScores,
          "scores.opponentScores": opScores,
          "scores.challengerShots": JSON.stringify(chShots),
          "scores.opponentShots": JSON.stringify(opShots),
          "scores.challengerConfirm": freshScores.challengerConfirm || false,
          "scores.opponentConfirm": freshScores.opponentConfirm || false,
        });
      }
    } catch (error) {
      console.error("Error auto-saving scoreboard:", error);
    }
  };

  // Submit/Update Scores in the Arena
  const handleUpdateScores = async (isConfirmStep = false) => {
    if (!currentUser || !activeArenaChallenge) return;

    try {
      const challengeRef = doc(db, "vsc_pk_challenges", activeArenaChallenge.id);
      
      // Fetch the latest fresh document from Firestore to avoid race conditions
      const freshSnap = await getDoc(challengeRef);
      if (!freshSnap.exists()) {
        throw new Error(language === "en" ? "Challenge no longer exists!" : "Kèo đấu không tồn tại!");
      }
      const freshData = freshSnap.data() as PKChallenge;
      const freshScores = freshData.scores || {};

      // Get database scores & shots
      const dbChScores = freshScores.challengerScores || [];
      const dbOpScores = freshScores.opponentScores || [];
      
      let dbChShots = [];
      if (typeof freshScores.challengerShots === "string" && freshScores.challengerShots !== "") {
        try { dbChShots = JSON.parse(freshScores.challengerShots); } catch(e) {}
      } else if (Array.isArray(freshScores.challengerShots)) {
        dbChShots = freshScores.challengerShots;
      }

      let dbOpShots = [];
      if (typeof freshScores.opponentShots === "string" && freshScores.opponentShots !== "") {
        try { dbOpShots = JSON.parse(freshScores.opponentShots); } catch(e) {}
      } else if (Array.isArray(freshScores.opponentShots)) {
        dbOpShots = freshScores.opponentShots;
      }

      const isChScoresEmpty = dbChScores.length === 0 || dbChScores.every((val: any) => Number(val) === 0);
      const isOpScoresEmpty = dbOpScores.length === 0 || dbOpScores.every((val: any) => Number(val) === 0);

      const isChallenger = currentUser.uid === activeArenaChallenge.challengerUid;
      const isOpponent = currentUser.uid === activeArenaChallenge.opponentUid;
      const isRefConfirm = isRefereeOfMatch && isConfirmStep;

      // Determine final scores & shots to save
      let finalChallengerScores = challengerScoresInput;
      let finalOpponentScores = opponentScoresInput;
      let finalChallengerShots = challengerShotsInput;
      let finalOpponentShots = opponentShotsInput;

      if (isChallenger) {
        // Source of truth for Challenger is local input, opponent comes from DB if not empty
        finalChallengerScores = challengerScoresInput;
        finalChallengerShots = challengerShotsInput;
        finalOpponentScores = isOpScoresEmpty ? opponentScoresInput : dbOpScores;
        finalOpponentShots = isOpScoresEmpty ? opponentShotsInput : dbOpShots;
      } else if (isOpponent) {
        // Source of truth for Opponent is local input, challenger comes from DB if not empty
        finalOpponentScores = opponentScoresInput;
        finalOpponentShots = opponentShotsInput;
        finalChallengerScores = isChScoresEmpty ? challengerScoresInput : dbChScores;
        finalChallengerShots = isChScoresEmpty ? challengerShotsInput : dbChShots;
      } else {
        // Referee or other: use whatever is in inputs (referee is absolute power)
        finalChallengerScores = challengerScoresInput;
        finalOpponentScores = opponentScoresInput;
        finalChallengerShots = challengerShotsInput;
        finalOpponentShots = opponentShotsInput;
      }

      const updatedScores = {
        challengerScores: finalChallengerScores,
        opponentScores: finalOpponentScores,
        challengerShots: JSON.stringify(finalChallengerShots),
        opponentShots: JSON.stringify(finalOpponentShots),
        challengerConfirm: (isConfirmStep && isChallenger) || isRefConfirm
          ? true 
          : (freshScores.challengerConfirm || false),
        opponentConfirm: (isConfirmStep && isOpponent) || isRefConfirm
          ? true 
          : (freshScores.opponentConfirm || false),
      };

      // If both sides confirmed or referee submitted, complete the match
      const bothConfirmed = updatedScores.challengerConfirm && updatedScores.opponentConfirm;
      const newStatus = (bothConfirmed || isRefConfirm) ? "completed" : "ongoing";

      await updateDoc(challengeRef, {
        status: newStatus,
        scores: updatedScores
      });

      alert(language === "en" 
        ? "Scoreboard updated successfully!" 
        : "Cập nhật bảng điểm thành công!"
      );

      if (newStatus === "completed") {
        alert(language === "en" 
          ? "Match completed! ELO ratings have been recalculated." 
          : "Trận đấu đã kết thúc chính thức! Điểm xếp hạng ELO đã được cập nhật thành công."
        );
        setActiveArenaChallenge(null);
      }
    } catch (err) {
      console.error("Error updating scores:", err);
      alert("Lỗi cập nhật bảng điểm: " + (err as Error).message);
    }
  };

  // Filter Challenges list
  const filteredChallenges = useMemo(() => {
    return challenges.filter((c) => {
      // Filter tab
      if (activeSubTab === "lobby" && c.status === "completed") return false;
      if (activeSubTab === "history" && c.status !== "completed") return false;

      // Filter input search query
      if (searchQuery.trim() !== "") {
        const queryNorm = searchQuery.toLowerCase();
        const titleMatch = c.title.toLowerCase().includes(queryNorm);
        const challengerMatch = c.challengerName.toLowerCase().includes(queryNorm);
        const opponentMatch = c.opponentName?.toLowerCase().includes(queryNorm) || false;
        const locationMatch = c.location.toLowerCase().includes(queryNorm);
        if (!titleMatch && !challengerMatch && !opponentMatch && !locationMatch) return false;
      }

      // Filter challenge type
      if (filterType !== "all" && c.type !== filterType) return false;

      // Filter status
      if (activeSubTab === "lobby" && filterStatus !== "all" && c.status !== filterStatus) return false;

      return true;
    });
  }, [challenges, activeSubTab, searchQuery, filterType, filterStatus]);

  // Format date helper
  const formatDate = (isoString: string) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 animate-fade-in" id="vsc-pk-arena-root">
      
      {/* Title & Stats Ribbon */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-100 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-50 rounded-xl text-rose-500 shadow-sm">
              <Sword className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                {language === "en" ? "VSC PK Arena & Matchmaking" : "Khán Đài PK & Tìm Đối Thủ"}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {language === "en" 
                  ? "Host customizable 1v1 and team battles, secure opponents, and compete for ELO ladder standings." 
                  : "Môi trường giao lưu PK tự do, thách đấu 1v1 hoặc CLB, tích điểm thăng hạng quân hàm ELO."}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-center">
          <button
            onClick={() => {
              if (!currentUser) {
                onOpenAuthModal();
              } else {
                setFormOpponentSearch("");
                setFormRefereeSearch("");
                setIsCreateModalOpen(true);
              }
            }}
            className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-medium px-4 py-2.5 rounded-xl shadow-md cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{language === "en" ? "Host Challenge" : "Đăng Kèo PK"}</span>
          </button>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center border-b border-gray-200 mb-6 overflow-x-auto scrollbar-none">
        <button
          onClick={() => { setActiveSubTab("dashboard"); setActiveArenaChallenge(null); }}
          className={`px-5 py-3 font-semibold text-sm transition-all relative border-b-2 whitespace-nowrap flex items-center gap-2 ${
            activeSubTab === "dashboard" && !activeArenaChallenge
              ? "border-rose-600 text-rose-600 font-bold"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <Flame className="w-4 h-4 text-rose-500 animate-pulse" />
          <span>{language === "en" ? "PK Dashboard" : "Trang Chủ Đấu Trường 🏟️"}</span>
        </button>

        <button
          onClick={() => { setActiveSubTab("lobby"); setActiveArenaChallenge(null); }}
          className={`px-5 py-3 font-semibold text-sm transition-all relative border-b-2 whitespace-nowrap flex items-center gap-2 ${
            activeSubTab === "lobby" && !activeArenaChallenge
              ? "border-rose-600 text-rose-600"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <Sword className="w-4 h-4" />
          <span>{language === "en" ? "PK Matchmaking Lobby" : "Sảnh Kèo Đang Chờ"}</span>
          {challenges.filter(c => c.status === "open").length > 0 && (
            <span className="bg-rose-500 text-white text-xs px-2 py-0.5 rounded-full font-bold ml-1">
              {challenges.filter(c => c.status === "open").length}
            </span>
          )}
        </button>

        <button
          onClick={() => { setActiveSubTab("leaderboard"); setActiveArenaChallenge(null); }}
          className={`px-5 py-3 font-semibold text-sm transition-all relative border-b-2 whitespace-nowrap flex items-center gap-2 ${
            activeSubTab === "leaderboard"
              ? "border-rose-600 text-rose-600"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>{language === "en" ? "PK ELO Standings" : "Bảng Anh Hùng PK"}</span>
        </button>

        <button
          onClick={() => { setActiveSubTab("history"); setActiveArenaChallenge(null); }}
          className={`px-5 py-3 font-semibold text-sm transition-all relative border-b-2 whitespace-nowrap flex items-center gap-2 ${
            activeSubTab === "history"
              ? "border-rose-600 text-rose-600"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <Award className="w-4 h-4" />
          <span>{language === "en" ? "Match Results History" : "Lịch Sử Kết Quả"}</span>
        </button>
      </div>

      {/* Main Container */}
      <div className="min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-500 text-sm mt-4">
              {language === "en" ? "Loading arena status..." : "Đang tải dữ liệu sảnh đấu..."}
            </p>
          </div>
        ) : activeArenaChallenge ? (
          /* ========================================================= */
          /* 🏟️ DEDICATED REAL-TIME PK ARENA VIEW                      */
          /* ========================================================= */
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden max-w-4xl mx-auto mb-10"
          >
            {/* Arena Header */}
            <div className="bg-rose-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Sword className="w-5 h-5 text-rose-400 animate-pulse" />
                <span className="font-bold uppercase tracking-wider text-xs bg-rose-800 text-rose-200 px-2.5 py-1 rounded-md">
                  {activeArenaChallenge.type === "solo_1v1" ? "1v1 Battle" : `${activeArenaChallenge.teamSize}v${activeArenaChallenge.teamSize} CLB`}
                </span>
                <span className="text-sm opacity-90 truncate max-w-xs md:max-w-md ml-2 font-medium">
                  {activeArenaChallenge.title}
                </span>
              </div>
              <button 
                onClick={() => setActiveArenaChallenge(null)}
                className="text-white hover:text-rose-200 p-1.5 hover:bg-rose-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Match Information Bar */}
            <div className="bg-rose-950/40 border-b border-gray-100 px-6 py-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                <span className="font-medium text-gray-700">
                  {language === "en" ? "Location: " : "Địa điểm: "} {activeArenaChallenge.location}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-rose-500 shrink-0" />
                <span className="font-medium text-gray-700">
                  {language === "en" ? "Scheduled: " : "Thời gian: "} {formatDate(activeArenaChallenge.dateTime)}
                </span>
              </div>
              <div className="flex items-center gap-2 col-span-1 sm:col-span-2">
                <Shield className="w-4 h-4 text-rose-500 shrink-0" />
                <span className="font-medium text-gray-700">
                  {language === "en" ? "Match Rule: " : "Luật đấu: "} {activeArenaChallenge.rules}
                </span>
              </div>
              {activeArenaChallenge.refereeEmail && (
                <div className="flex items-center gap-2 col-span-1 sm:col-span-2">
                  <User className="w-4 h-4 text-rose-500 shrink-0" />
                  <span className="font-medium text-gray-700">
                    {language === "en" ? "Assigned Referee: " : "Trọng tài chỉ định: "} {activeArenaChallenge.refereeEmail}
                  </span>
                </div>
              )}
            </div>

            {/* Real-time Match Mode Banner */}
            <div className="bg-amber-50 border-b border-amber-100 px-6 py-3 flex items-center justify-between gap-4 text-xs text-amber-800">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span className="font-semibold uppercase tracking-wider text-[10px] bg-amber-200/60 text-amber-900 px-2 py-0.5 rounded-md">
                  {isRefereeOfMatch ? (language === "en" ? "Referee Mode" : "Chế độ Trọng tài 👑") :
                   (isChallengerOfMatch || isOpponentOfMatch) ? (language === "en" ? "Athlete Mode" : "Chế độ VĐV ⚔️") :
                   (language === "en" ? "Spectator Mode" : "Chế độ Khán giả 👁️")}
                </span>
                <span className="font-medium">
                  {isRefereeOfMatch ? (language === "en" ? "You have full authority to record score and shot ticks for both sides." : "Bạn có quyền tối cao ghi điểm và tích trúng/trượt cho cả hai đấu thủ.") :
                   (isChallengerOfMatch || isOpponentOfMatch) ? (
                     hasRefereeAssigned ? (
                       language === "en" ? "Assigned match. You cannot edit; only watch the referee scoring in real-time." : "Kèo đấu có trọng tài chỉ định. VĐV không được tự chấm điểm, chỉ xem trọng tài chấm trực tiếp."
                     ) : (
                       language === "en" ? "No referee assigned. You have full rights to score for yourself and your opponent." : "Tự quản lý (Không trọng tài). Bạn và đối thủ có thể tự chấm điểm cho nhau và cho bản thân."
                     )
                   ) : (
                     language === "en" ? "Live mode is read-only. Scores are synchronized in real-time." : "Đang đồng bộ trực tiếp thời gian thực từ đấu trường (Chỉ xem)."
                   )}
                </span>
              </div>
              <div className="text-[10px] text-amber-600 font-bold hidden md:inline uppercase tracking-widest bg-white border border-amber-200 px-2.5 py-1 rounded-lg">
                {language === "en" ? "Syncing Live" : "Đồng bộ Online"}
              </div>
            </div>

            {/* Versus Arena Combatants Layout */}
            <div className="p-8 flex flex-col md:flex-row items-center justify-around gap-8 bg-gradient-to-b from-rose-50/20 to-white">
              
              {/* CHALLENGER (Bên Thách Đấu) */}
              <div className="flex flex-col items-center text-center w-full md:w-5/12">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full border-4 border-rose-500/30 overflow-hidden shadow-lg mb-4 bg-gray-50 flex items-center justify-center">
                    {activeArenaChallenge.challengerAvatar ? (
                      <img 
                        src={activeArenaChallenge.challengerAvatar} 
                        alt={activeArenaChallenge.challengerName}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <User className="w-12 h-12 text-gray-300" />
                    )}
                  </div>
                  <span className="absolute bottom-3 right-0 bg-rose-600 text-white font-bold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                    Host
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 truncate max-w-xs">{activeArenaChallenge.challengerName}</h3>
                <span className="text-xs text-gray-400 mt-0.5 uppercase tracking-widest">Challenger</span>
                
                {/* Confirmation Status Badge */}
                <div className="mt-4">
                  {activeArenaChallenge.scores?.challengerConfirm ? (
                    <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-semibold border border-green-200">
                      <CheckCircle className="w-3.5 h-3.5" />
                      {language === "en" ? "Confirmed Results" : "Đã xác nhận tỉ số"}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-xs font-semibold border border-amber-200">
                      <Clock className="w-3.5 h-3.5" />
                      {language === "en" ? "Pending Confirmation" : "Chờ xác nhận tỉ số"}
                    </span>
                  )}
                </div>
              </div>

              {/* VS SEPARATOR */}
              <div className="flex flex-col items-center justify-center shrink-0 my-2 md:my-0">
                <div className="w-16 h-16 rounded-full bg-rose-600 text-white flex items-center justify-center font-black text-xl italic shadow-lg outline-8 outline-rose-50">
                  VS
                </div>
                <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mt-2">Arena</span>
              </div>

              {/* OPPONENT (Bên Nhận Kèo) */}
              <div className="flex flex-col items-center text-center w-full md:w-5/12">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full border-4 border-gray-200 overflow-hidden shadow-lg mb-4 bg-gray-50 flex items-center justify-center">
                    {activeArenaChallenge.opponentAvatar ? (
                      <img 
                        src={activeArenaChallenge.opponentAvatar} 
                        alt={activeArenaChallenge.opponentName}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <User className="w-12 h-12 text-gray-300" />
                    )}
                  </div>
                  <span className="absolute bottom-3 right-0 bg-gray-600 text-white font-bold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                    Guest
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 truncate max-w-xs">
                  {activeArenaChallenge.opponentName || (language === "en" ? "Awaiting Guest..." : "Đang chờ đối...")}
                </h3>
                <span className="text-xs text-gray-400 mt-0.5 uppercase tracking-widest">Opponent</span>

                {/* Confirmation Status Badge */}
                <div className="mt-4">
                  {activeArenaChallenge.scores?.opponentConfirm ? (
                    <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-semibold border border-green-200">
                      <CheckCircle className="w-3.5 h-3.5" />
                      {language === "en" ? "Confirmed Results" : "Đã xác nhận tỉ số"}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-xs font-semibold border border-amber-200">
                      <Clock className="w-3.5 h-3.5" />
                      {language === "en" ? "Pending Confirmation" : "Chờ xác nhận tỉ số"}
                    </span>
                  )}
                </div>
              </div>

            </div>

            {/* Scoreboard Editor Card */}
            <div className="p-6 border-t border-gray-100 bg-gray-50/50">
              <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider text-center mb-6">
                {language === "en" ? "Interactive Set Scoreboard" : "Cập Nhật Điểm Số Từng Hiệp"}
              </h4>

              {/* Multi-set inputs */}
              <div className="max-w-xl mx-auto space-y-4 mb-6">
                {Array.from({ length: activeArenaChallenge.setsCount || 3 }).map((_, setIndex) => (
                  <div key={setIndex} className="relative bg-white p-4 pr-10 pt-6 sm:pt-4 rounded-xl border border-gray-150 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
                    
                    {/* Trash Button in top right of each set card */}
                    {activeArenaChallenge.status !== "completed" && (isChallengerOfMatch || isRefereeOfMatch) && (
                      <button
                        type="button"
                        onClick={() => handleOpenDeleteSetConfirm(setIndex)}
                        className="absolute top-2.5 right-2.5 p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                        title={language === "en" ? "Delete this set" : "Xóa hiệp đấu này"}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    <span className="font-bold text-gray-500 text-xs uppercase tracking-wider shrink-0 self-start sm:self-center">
                      {language === "en" ? `Set ${setIndex + 1}` : `Hiệp ${setIndex + 1}`}
                    </span>
 
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-3 w-full">
                      {/* Challenger Set Score & Shot Checks */}
                      <div className="flex flex-col items-center sm:items-end gap-1.5 w-full sm:w-5/12">
                        <span className="text-[11px] font-extrabold text-rose-600 truncate max-w-full flex items-center gap-1 mb-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
                          {activeArenaChallenge.challengerName}
                        </span>
                        {activeArenaChallenge.targetType === "bia_giay_tinh_diem" ? (
                          <div className="w-full">
                            <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1 text-right">
                              {language === "en" ? "Points" : "Nhập điểm"}
                            </label>
                            <input
                              type="number"
                              min="0"
                              placeholder="0"
                              disabled={!canEditChallenger}
                              value={challengerScoresInput[setIndex] !== undefined ? challengerScoresInput[setIndex] : ""}
                              onChange={(e) => {
                                const val = e.target.value === "" ? 0 : Number(e.target.value);
                                const nextScores = [...challengerScoresInput];
                                nextScores[setIndex] = val;
                                setChallengerScoresInput(nextScores);
                                saveScoresAndShotsToDb(nextScores, opponentScoresInput, challengerShotsInput, opponentShotsInput);
                              }}
                              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-black text-center text-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
                            />
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-1.5">
                              <button 
                                type="button"
                                disabled={!canEditChallenger}
                                onClick={() => {
                                  const arr = [...challengerScoresInput];
                                  arr[setIndex] = Math.max(0, (arr[setIndex] || 0) - 1);
                                  setChallengerScoresInput(arr);
                                  saveScoresAndShotsToDb(arr, opponentScoresInput, challengerShotsInput, opponentShotsInput);
                                }}
                                className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 font-bold text-xs select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                -
                              </button>
                              <span className="w-8 text-center font-black text-base text-rose-600">
                                {challengerScoresInput[setIndex] || 0}
                              </span>
                              <button 
                                type="button"
                                disabled={!canEditChallenger}
                                onClick={() => {
                                  const arr = [...challengerScoresInput];
                                  arr[setIndex] = (arr[setIndex] || 0) + 1;
                                  setChallengerScoresInput(arr);
                                  saveScoresAndShotsToDb(arr, opponentScoresInput, challengerShotsInput, opponentShotsInput);
                                }}
                                className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 font-bold text-xs select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                +
                              </button>
                            </div>
      
                            {/* Interactive Shot Boxes - Wrapped at maximum of 5 columns */}
                            <div className="flex justify-center sm:justify-end w-full">
                              <div className="grid grid-cols-5 gap-1.5 w-fit">
                                {Array.from({ length: activeArenaChallenge.shotsPerSet || 5 }).map((_, shotIdx) => {
                                  const shotVal = challengerShotsInput[setIndex]?.[shotIdx];
                                  let btnClass = "bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100";
                                  let btnTitle = `Untapped (${shotIdx + 1})`;
                                  if (shotVal === true) {
                                    btnClass = "bg-green-600 border-green-700 text-white shadow-xs";
                                    btnTitle = `Hit (${shotIdx + 1})`;
                                  } else if (shotVal === false) {
                                    btnClass = "bg-rose-600 border-rose-700 text-white shadow-xs";
                                    btnTitle = `Miss (${shotIdx + 1})`;
                                  }
                                  return (
                                    <button
                                      key={shotIdx}
                                      type="button"
                                      disabled={!canEditChallenger}
                                      onClick={() => {
                                        const nextShots = [...challengerShotsInput];
                                        if (!nextShots[setIndex]) {
                                          nextShots[setIndex] = Array(activeArenaChallenge.shotsPerSet || 5).fill(null);
                                        }
                                        const row = [...nextShots[setIndex]];
                                        const current = row[shotIdx];
                                        if (current === undefined || current === null) {
                                          row[shotIdx] = true;
                                        } else if (current === true) {
                                          row[shotIdx] = false;
                                        } else {
                                          row[shotIdx] = null;
                                        }
                                        nextShots[setIndex] = row;
                                        setChallengerShotsInput(nextShots);
      
                                        // Auto count score (only true / hits count as points)
                                        const hitCount = row.filter(v => v === true).length;
                                        const nextScores = [...challengerScoresInput];
                                        nextScores[setIndex] = hitCount;
                                        setChallengerScoresInput(nextScores);

                                        saveScoresAndShotsToDb(nextScores, opponentScoresInput, nextShots, opponentShotsInput);
                                      }}
                                      className={`w-6 h-6 text-[10px] font-black rounded-md border flex items-center justify-center transition-all cursor-pointer ${btnClass} disabled:opacity-60 disabled:cursor-not-allowed`}
                                      title={btnTitle}
                                    >
                                      {shotIdx + 1}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
 
                      <span className="font-bold text-gray-300 px-1 shrink-0 hidden sm:inline">:</span>
                      <div className="h-px bg-gray-100 w-full sm:hidden" />
 
                      {/* Opponent Set Score & Shot Checks */}
                      <div className="flex flex-col items-center sm:items-start gap-1.5 w-full sm:w-5/12">
                        <span className="text-[11px] font-extrabold text-indigo-600 truncate max-w-full flex items-center gap-1 mb-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></span>
                          {activeArenaChallenge.opponentName || (language === "en" ? "Opponent" : "Đối thủ")}
                        </span>
                        {activeArenaChallenge.targetType === "bia_giay_tinh_diem" ? (
                          <div className="w-full">
                            <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1 text-left">
                              {language === "en" ? "Points" : "Nhập điểm"}
                            </label>
                            <input
                              type="number"
                              min="0"
                              placeholder="0"
                              disabled={!canEditOpponent}
                              value={opponentScoresInput[setIndex] !== undefined ? opponentScoresInput[setIndex] : ""}
                              onChange={(e) => {
                                const val = e.target.value === "" ? 0 : Number(e.target.value);
                                const nextScores = [...opponentScoresInput];
                                nextScores[setIndex] = val;
                                setOpponentScoresInput(nextScores);
                                saveScoresAndShotsToDb(challengerScoresInput, nextScores, challengerShotsInput, opponentShotsInput);
                              }}
                              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-black text-center text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
                            />
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-1.5">
                              <button 
                                type="button"
                                disabled={!canEditOpponent}
                                onClick={() => {
                                  const arr = [...opponentScoresInput];
                                  arr[setIndex] = Math.max(0, (arr[setIndex] || 0) - 1);
                                  setOpponentScoresInput(arr);
                                  saveScoresAndShotsToDb(challengerScoresInput, arr, challengerShotsInput, opponentShotsInput);
                                }}
                                className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 font-bold text-xs select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                -
                              </button>
                              <span className="w-8 text-center font-black text-base text-gray-800">
                                {opponentScoresInput[setIndex] || 0}
                              </span>
                              <button 
                                type="button"
                                disabled={!canEditOpponent}
                                onClick={() => {
                                  const arr = [...opponentScoresInput];
                                  arr[setIndex] = (arr[setIndex] || 0) + 1;
                                  setOpponentScoresInput(arr);
                                  saveScoresAndShotsToDb(challengerScoresInput, arr, challengerShotsInput, opponentShotsInput);
                                }}
                                className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 font-bold text-xs select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                +
                              </button>
                            </div>
      
                            {/* Interactive Shot Boxes - Wrapped at maximum of 5 columns */}
                            <div className="flex justify-center sm:justify-start w-full">
                              <div className="grid grid-cols-5 gap-1.5 w-fit">
                                {Array.from({ length: activeArenaChallenge.shotsPerSet || 5 }).map((_, shotIdx) => {
                                  const shotVal = opponentShotsInput[setIndex]?.[shotIdx];
                                  let btnClass = "bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100";
                                  let btnTitle = `Untapped (${shotIdx + 1})`;
                                  if (shotVal === true) {
                                    btnClass = "bg-green-600 border-green-700 text-white shadow-xs";
                                    btnTitle = `Hit (${shotIdx + 1})`;
                                  } else if (shotVal === false) {
                                    btnClass = "bg-rose-600 border-rose-700 text-white shadow-xs";
                                    btnTitle = `Miss (${shotIdx + 1})`;
                                  }
                                  return (
                                    <button
                                      key={shotIdx}
                                      type="button"
                                      disabled={!canEditOpponent}
                                      onClick={() => {
                                        const nextShots = [...opponentShotsInput];
                                        if (!nextShots[setIndex]) {
                                          nextShots[setIndex] = Array(activeArenaChallenge.shotsPerSet || 5).fill(null);
                                        }
                                        const row = [...nextShots[setIndex]];
                                        const current = row[shotIdx];
                                        if (current === undefined || current === null) {
                                          row[shotIdx] = true;
                                        } else if (current === true) {
                                          row[shotIdx] = false;
                                        } else {
                                          row[shotIdx] = null;
                                        }
                                        nextShots[setIndex] = row;
                                        setOpponentShotsInput(nextShots);
      
                                        // Auto count score (only true / hits count as points)
                                        const hitCount = row.filter(v => v === true).length;
                                        const nextScores = [...opponentScoresInput];
                                        nextScores[setIndex] = hitCount;
                                        setOpponentScoresInput(nextScores);

                                        saveScoresAndShotsToDb(challengerScoresInput, nextScores, challengerShotsInput, nextShots);
                                      }}
                                      className={`w-6 h-6 text-[10px] font-black rounded-md border flex items-center justify-center transition-all cursor-pointer ${btnClass} disabled:opacity-60 disabled:cursor-not-allowed`}
                                      title={btnTitle}
                                    >
                                      {shotIdx + 1}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
 
                  </div>
                ))}
              </div>

              {/* Dynamic Add Round Trigger */}
              {activeArenaChallenge.status !== "completed" && (isChallengerOfMatch || isRefereeOfMatch) && (
                <div className="flex justify-center mb-6">
                  <button
                    type="button"
                    onClick={handleAddRound}
                    className="flex items-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold px-4 py-2 rounded-xl transition-all shadow-xs cursor-pointer text-xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{language === "en" ? "Add Match Round (+1 Set)" : "+ Thêm Hiệp Đấu 🎯"}</span>
                  </button>
                </div>
              )}

              {/* Action Buttons for Arena */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 border-t border-gray-100 pt-6">
                
                {/* Save Draft/Scoreboard button (Challenger, Opponent, or Ref) */}
                {(currentUser?.uid === activeArenaChallenge.challengerUid || 
                  currentUser?.uid === activeArenaChallenge.opponentUid || 
                  isRefereeOfMatch) && (
                  <button
                    type="button"
                    onClick={() => handleUpdateScores(false)}
                    className="w-full sm:w-auto bg-gray-800 hover:bg-gray-900 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors cursor-pointer text-sm"
                  >
                    {language === "en" ? "Update Scoreboard" : "Lưu điểm tạm thời 💾"}
                  </button>
                )}

                {/* Confirm Final Result Button */}
                {(currentUser?.uid === activeArenaChallenge.challengerUid || 
                  currentUser?.uid === activeArenaChallenge.opponentUid || 
                  isRefereeOfMatch) && (
                  <>
                    {/* If current user is Challenger and has already confirmed */}
                    {(currentUser?.uid === activeArenaChallenge.challengerUid && activeArenaChallenge.scores?.challengerConfirm) ? (
                      <button
                        type="button"
                        disabled
                        className="w-full sm:w-auto bg-green-50 text-green-700 border border-green-200 font-semibold px-6 py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 cursor-not-allowed opacity-80"
                      >
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>{language === "en" ? "Signed ✔️" : "Đã ký xác nhận ✔️"}</span>
                      </button>
                    ) : (currentUser?.uid === activeArenaChallenge.opponentUid && activeArenaChallenge.scores?.opponentConfirm) ? (
                      /* If current user is Opponent and has already confirmed */
                      <button
                        type="button"
                        disabled
                        className="w-full sm:w-auto bg-green-50 text-green-700 border border-green-200 font-semibold px-6 py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 cursor-not-allowed opacity-80"
                      >
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>{language === "en" ? "Signed ✔️" : "Đã ký xác nhận ✔️"}</span>
                      </button>
                    ) : (
                      /* Clickable confirm button opening modal */
                      <button
                        type="button"
                        onClick={() => setIsSignConfirmModalOpen(true)}
                        className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors cursor-pointer text-sm flex items-center justify-center gap-2 shadow-md"
                      >
                        <Check className="w-4 h-4" />
                        <span>
                          {isRefereeOfMatch 
                            ? (language === "en" ? "Referee Match Confirmation" : "Xác nhận kết quả (Trọng tài) 👑")
                            : (language === "en" ? "Submit & Lock Result" : "Ký xác nhận tỉ số ✍️")}
                        </span>
                      </button>
                    )}
                  </>
                )}

                {/* Return button */}
                <button
                  type="button"
                  onClick={() => setActiveArenaChallenge(null)}
                  className="w-full sm:w-auto border border-gray-200 hover:bg-gray-100 text-gray-700 font-semibold px-6 py-2.5 rounded-xl transition-colors cursor-pointer text-sm"
                >
                  {language === "en" ? "Exit Arena" : "Quay lại sảnh kèo"}
                </button>
              </div>

              {/* Safeguard Warnings */}
              <div className="mt-5 max-w-lg mx-auto bg-amber-50 rounded-xl p-3.5 border border-amber-200 text-[11px] text-amber-800 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">
                    {language === "en" ? "Anti-Cheat Rule: " : "Luật bảo mật chống gian lận: "}
                  </span>
                  {language === "en" 
                    ? "Both the Challenger and Opponent must click 'Submit & Lock Result' with identical scoreboards before ELO ratings will update. Designated Referees can finalize and lock scoreboards unilaterally." 
                    : "Cả 2 bên Challenger và Opponent cần cùng bấm 'Ký xác nhận tỉ số' để khớp kết quả trước khi hệ thống ghi nhận. Trọng tài được chỉ định hoặc Admin hệ thống có đặc quyền ký duyệt đơn phương."}
                </div>
              </div>
            </div>

          </motion.div>
        ) : activeSubTab === "dashboard" ? (
          /* ========================================================= */
          /* 🏟️ ARENA DASHBOARD HOME VIEW                             */
          /* ========================================================= */
          <PkDashboardHome 
            challenges={challenges}
            pkLeaderboard={pkLeaderboard}
            setActiveSubTab={setActiveSubTab}
            setActiveArenaChallenge={setActiveArenaChallenge}
            setSelectedDetailChallenge={setSelectedDetailChallenge}
            language={language}
            onViewAthleteProfile={handleViewAthleteProfile}
            currentUser={currentUser}
            onAcceptChallenge={handleAcceptChallenge}
            onOpenAuthModal={onOpenAuthModal}
            onApproveJoinRequest={handleApproveJoinRequest}
            onDeclineJoinRequest={handleDeclineJoinRequest}
            onCancelJoinRequest={handleCancelJoinRequest}
            systemClubs={systemClubs}
            systemAthletes={systemAthletes}
            onViewClubHub={onViewClubHub}
          />
        ) : activeSubTab === "lobby" ? (
          /* ========================================================= */
          /* 🏟️ CHALLEGING MATCHES LOBBY LIST VIEW                     */
          /* ========================================================= */
          <div>
            {/* Search and Filters Controls */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={language === "en" ? "Search challenges, players, venues..." : "Tìm kiếm kèo đấu, người thách đấu, địa điểm..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Match Type filter */}
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="bg-white border border-gray-200 rounded-xl text-xs px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                >
                  <option value="all">{language === "en" ? "All Formats" : "Tất cả thể thức"}</option>
                  <option value="solo_1v1">{language === "en" ? "1v1 Individual" : "Đấu đơn 1v1"}</option>
                  <option value="team_vs_team">{language === "en" ? "Club / Team Battles" : "Đấu đồng đội CLB"}</option>
                </select>

                {/* Status filter */}
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="bg-white border border-gray-200 rounded-xl text-xs px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                >
                  <option value="all">{language === "en" ? "All Statuses" : "Tất cả trạng thái"}</option>
                  <option value="open">{language === "en" ? "Awaiting Opponents" : "Đang chờ đối"}</option>
                  <option value="accepted">{language === "en" ? "Matched / Scheduled" : "Đã chốt kèo"}</option>
                  <option value="ongoing">{language === "en" ? "Ongoing Battles" : "Đang thi đấu"}</option>
                </select>
              </div>
            </div>

            {/* List of Kèo */}
            {filteredChallenges.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
                <Sword className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-base font-bold text-gray-800">
                  {language === "en" ? "No Active Challenges" : "Không có kèo đấu nào đang hiển thị"}
                </h3>
                <p className="text-gray-500 text-xs mt-1 max-w-sm mx-auto">
                  {language === "en" 
                    ? "Be the first to host a custom match in the arena by clicking 'Host Challenge' above!" 
                    : "Hiện tại sảnh đấu chưa có kèo phù hợp với điều kiện lọc. Hãy là người đầu tiên đăng kèo PK thách đấu bằng nút phía trên!"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <AnimatePresence mode="popLayout">
                  {filteredChallenges.map((challenge) => {
                    const isOwner = currentUser?.uid === challenge.challengerUid;
                    const isMatched = challenge.status !== "open";
                    const admins = ["vscvietnamslingshot@gmail.com", "nahnatofficial@gmail.com"];
                    const isAdmin = currentUser?.email && admins.includes(currentUser.email.toLowerCase());
                    const isChallenger = currentUser?.uid === challenge.challengerUid;
                    const isOpponent = currentUser?.uid === challenge.opponentUid;
                    const isReferee = challenge.refereeEmail && currentUser?.email && challenge.refereeEmail.toLowerCase() === currentUser.email.toLowerCase();
                    const isParticipantOrRef = isChallenger || isOpponent || isReferee || isAdmin;

                    return (
                      <motion.div
                        key={challenge.id}
                        layout
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden relative"
                      >
                        {/* Card Header Status Indicator */}
                        <div className="px-5 py-3.5 bg-gray-55/40 border-b border-gray-100 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                              challenge.status === "open"
                                ? "bg-rose-50 text-rose-600 border border-rose-100 animate-pulse"
                                : challenge.status === "accepted"
                                ? "bg-blue-50 text-blue-600 border border-blue-100"
                                : "bg-amber-50 text-amber-600 border border-amber-100"
                            }`}>
                              {challenge.status === "open" 
                                ? (language === "en" ? "Awaiting Guest" : "Tìm đối thủ 🔍") 
                                : challenge.status === "accepted"
                                ? (language === "en" ? "Matched / Pending Arena" : "Đã nhận kèo 🤝")
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
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleProfileOrClubClick(challenge.challengerName, challenge.challengerEmail, challenge.challengerUid);
                                }}
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
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleClubClick(getPlayerClubName(challenge.challengerName)!);
                                  }}
                                  className="text-[9px] text-indigo-600 hover:underline font-bold mt-0.5 ml-10 cursor-pointer"
                                >
                                  {getPlayerClubName(challenge.challengerName)}
                                </button>
                              )}
                            </div>

                            <span className="text-[10px] italic font-black text-rose-500 shrink-0">VS</span>

                            <div className="flex flex-col items-end max-w-[45%] text-right">
                              {isMatched ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleProfileOrClubClick(challenge.opponentName || "Đối thủ", challenge.opponentEmail, challenge.opponentUid);
                                    }}
                                    className="flex items-center gap-2 text-right justify-end hover:text-rose-600 transition-colors cursor-pointer focus:outline-none"
                                  >
                                    <span className="text-xs font-bold truncate">
                                      {challenge.opponentName}
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
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleClubClick(getPlayerClubName(challenge.opponentName)!);
                                      }}
                                      className="text-[9px] text-indigo-600 hover:underline font-bold mt-0.5 mr-10 cursor-pointer"
                                    >
                                      {getPlayerClubName(challenge.opponentName)}
                                    </button>
                                  )}
                                </>
                              ) : (
                                <span className="text-xs italic text-gray-400">
                                  {language === "en" ? "Awaiting..." : "Đang chờ đối..."}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Host join requests management view */}
                          {isOwner && challenge.status === "open" && challenge.joinRequests && challenge.joinRequests.length > 0 && (
                            <div className="mt-3 bg-rose-50/50 rounded-xl p-3 border border-rose-100/50">
                              <span className="text-[10px] font-bold text-rose-900 uppercase tracking-wide block mb-2 flex items-center gap-1.5">
                                <UserCheck className="w-3.5 h-3.5 text-rose-500" />
                                <span>{language === "en" ? `Join Requests (${challenge.joinRequests.length})` : `Yêu cầu ứng tuyển (${challenge.joinRequests.length})`}</span>
                              </span>
                              <div className="space-y-1.5 max-h-[140px] overflow-y-auto scrollbar-thin">
                                {challenge.joinRequests.map((req, idx) => (
                                  <div key={idx} className="flex items-center justify-between gap-2 bg-white p-2 rounded-lg border border-gray-100 shadow-2xs">
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
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => handleApproveJoinRequest(challenge, req)}
                                        className="bg-green-600 hover:bg-green-700 text-white text-[9px] font-bold px-2 py-1 rounded-md transition-all cursor-pointer"
                                      >
                                        {language === "en" ? "Approve" : "Duyệt"}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeclineJoinRequest(challenge, req)}
                                        className="bg-gray-100 hover:bg-gray-200 text-gray-500 text-[9px] font-bold px-1.5 py-1 rounded-md transition-all cursor-pointer"
                                      >
                                        ✕
                                      </button>
                                    </div>
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
                            {((isOwner || isAdmin) && challenge.status !== "completed") && (
                              <button
                                type="button"
                                onClick={() => openEditModal(challenge)}
                                className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200"
                              >
                                {language === "en" ? "Edit ⚙️" : "Sửa Kèo ⚙️"}
                              </button>
                            )}

                            {/* Delete Button */}
                            {(isAdmin || (isOwner && challenge.status !== "completed")) && (
                              <button
                                type="button"
                                onClick={() => openDeleteConfirmation(challenge.id)}
                                className="text-xs font-bold text-rose-600 hover:text-rose-800 transition-colors cursor-pointer bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg border border-rose-200"
                              >
                                {language === "en" ? "Delete 🗑️" : "Xóa Kèo 🗑️"}
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-2 ml-auto">
                            {!isOwner && !isMatched && (
                              (() => {
                                const alreadyRequested = challenge.joinRequests?.some(r => r.uid === currentUser?.uid);
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
                                        onClick={() => handleCancelJoinRequest(challenge)}
                                        className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 text-xs font-bold px-3 py-2 rounded-xl cursor-pointer transition-colors border border-slate-200 dark:border-slate-700"
                                      >
                                        <span>{language === "en" ? "Cancel Request" : "Hủy nhận kèo"}</span>
                                      </button>
                                    </div>
                                  );
                                }
                                return (
                                  <button
                                    type="button"
                                    onClick={() => handleAcceptChallenge(challenge)}
                                    className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer shadow-sm transition-colors"
                                  >
                                    <Sword className="w-3.5 h-3.5" />
                                    <span>{language === "en" ? "Accept Challenge" : "Nhận Kèo PK"}</span>
                                  </button>
                                );
                              })()
                            )}

                            {isMatched && (
                              isParticipantOrRef ? (
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
                              )
                            )}
                          </div>
                        </div>

                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        ) : activeSubTab === "leaderboard" ? (
          /* ========================================================= */
          /* 🏆 PK LEADERSHIP ELO RATING BOARD                        */
          /* ========================================================= */
          <div className="max-w-2xl mx-auto space-y-6">
            
            {/* Small inner sub-tabs for Leaderboard (Personal vs Club) */}
            <div className="flex bg-gray-100/85 dark:bg-slate-850 p-1 rounded-2xl w-fit mx-auto border border-gray-200/50 shadow-3xs">
              <button
                type="button"
                onClick={() => setLeaderboardSubTab("personal")}
                className={`px-5 py-2.5 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer focus:outline-none ${
                  leaderboardSubTab === "personal"
                    ? "bg-white dark:bg-slate-900 text-rose-600 shadow-sm border border-gray-100/30"
                    : "text-gray-500 hover:text-gray-850 dark:text-gray-400"
                }`}
              >
                <User className="w-4 h-4" />
                <span>{language === "en" ? "Personal Ratings" : "BXH PK CÁ NHÂN"}</span>
              </button>
              <button
                type="button"
                onClick={() => setLeaderboardSubTab("club")}
                className={`px-5 py-2.5 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer focus:outline-none ${
                  leaderboardSubTab === "club"
                    ? "bg-white dark:bg-slate-900 text-rose-600 shadow-sm border border-gray-100/30"
                    : "text-gray-500 hover:text-gray-850 dark:text-gray-400"
                }`}
              >
                <Users className="w-4 h-4" />
                <span>{language === "en" ? "Club Ratings" : "BXH PK CÂU LẠC BỘ"}</span>
              </button>
            </div>

            {/* 🥇 BẢNG TRÊN: BẢNG VÀNG TOP 3 */}
            {filteredLeaderboard.length > 0 && (
              <div className="bg-gradient-to-r from-amber-500/10 via-amber-600/5 to-amber-500/10 rounded-3xl border-2 border-amber-400/30 p-5 shadow-sm">
                <div className="text-center mb-4">
                  <span className="text-[10px] font-black uppercase text-amber-850 bg-amber-100 border border-amber-200 px-4 py-1.5 rounded-full tracking-wider flex items-center justify-center gap-1.5 w-fit mx-auto">
                    <Trophy className="w-4 h-4 text-amber-600 animate-bounce" />
                    <span>{leaderboardSubTab === "club" ? (language === "en" ? "TOP 3 GLORY CLUBS" : "BẢNG VÀNG TOP 3 CLB PK") : (language === "en" ? "TOP 3 GLORY BOARD" : "BẢNG VÀNG TOP 3 CÁ NHÂN")}</span>
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 items-end pt-4">
                  {/* Silver (Rank 2) */}
                  {filteredLeaderboard[1] ? (
                    <button
                      type="button"
                      onClick={() => handleProfileOrClubClick(filteredLeaderboard[1].name, filteredLeaderboard[1].email, filteredLeaderboard[1].athleteId || filteredLeaderboard[1].uid)}
                      className="flex flex-col items-center bg-white/85 dark:bg-slate-900/85 p-3 rounded-2xl border border-gray-100 shadow-3xs cursor-pointer text-center relative hover:scale-102 transition-all w-full"
                    >
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                        <span className="bg-gray-100 text-gray-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-gray-200">🥈 #2</span>
                      </div>
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center mt-2 shadow-xs">
                        {filteredLeaderboard[1].avatarUrl ? (
                          <img src={filteredLeaderboard[1].avatarUrl} alt={filteredLeaderboard[1].name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <User className="w-5 h-5 text-gray-300" />
                        )}
                      </div>
                      <span className="font-bold text-xs text-gray-900 dark:text-white truncate w-full mt-2 block">{filteredLeaderboard[1].name}</span>
                      <span className="font-extrabold text-xs text-rose-600 mt-1 block">{filteredLeaderboard[1].elo} ELO</span>
                    </button>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-3 text-center border border-dashed border-gray-200 rounded-2xl bg-slate-50/50">
                      <span className="text-[10px] text-gray-400">#2 Chờ...</span>
                    </div>
                  )}

                  {/* Gold (Rank 1) */}
                  {filteredLeaderboard[0] ? (
                    <button
                      type="button"
                      onClick={() => handleProfileOrClubClick(filteredLeaderboard[0].name, filteredLeaderboard[0].email, filteredLeaderboard[0].athleteId || filteredLeaderboard[0].uid)}
                      className="flex flex-col items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border-2 border-amber-350 shadow-sm cursor-pointer text-center relative hover:scale-102 transition-all -translate-y-2 w-full"
                    >
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-amber-300 flex items-center gap-0.5 shadow-xs">
                          👑 🥇 #1
                        </span>
                      </div>
                      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-amber-300 bg-gray-50 flex items-center justify-center mt-2 shadow-sm ring-2 ring-amber-100">
                        {filteredLeaderboard[0].avatarUrl ? (
                          <img src={filteredLeaderboard[0].avatarUrl} alt={filteredLeaderboard[0].name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <User className="w-6 h-6 text-gray-300" />
                        )}
                      </div>
                      <span className="font-black text-sm text-gray-950 dark:text-white truncate w-full mt-2 block">{filteredLeaderboard[0].name}</span>
                      <span className="font-black text-sm text-rose-600 mt-1 block">{filteredLeaderboard[0].elo} ELO</span>
                    </button>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-3 text-center border border-dashed border-gray-200 rounded-2xl bg-slate-50/50 -translate-y-2">
                      <span className="text-[10px] text-gray-400">#1 Chờ...</span>
                    </div>
                  )}

                  {/* Bronze (Rank 3) */}
                  {filteredLeaderboard[2] ? (
                    <button
                      type="button"
                      onClick={() => handleProfileOrClubClick(filteredLeaderboard[2].name, filteredLeaderboard[2].email, filteredLeaderboard[2].athleteId || filteredLeaderboard[2].uid)}
                      className="flex flex-col items-center bg-white/85 dark:bg-slate-900/85 p-3 rounded-2xl border border-gray-100 shadow-3xs cursor-pointer text-center relative hover:scale-102 transition-all w-full"
                    >
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                        <span className="bg-orange-50 text-orange-700 text-[10px] font-black px-2 py-0.5 rounded-full border border-orange-200">🥉 #3</span>
                      </div>
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center mt-2 shadow-xs">
                        {filteredLeaderboard[2].avatarUrl ? (
                          <img src={filteredLeaderboard[2].avatarUrl} alt={filteredLeaderboard[2].name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <User className="w-5 h-5 text-gray-300" />
                        )}
                      </div>
                      <span className="font-bold text-xs text-gray-900 dark:text-white truncate w-full mt-2 block">{filteredLeaderboard[2].name}</span>
                      <span className="font-extrabold text-xs text-rose-600 mt-1 block">{filteredLeaderboard[2].elo} ELO</span>
                    </button>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-3 text-center border border-dashed border-gray-200 rounded-2xl bg-slate-50/50">
                      <span className="text-[10px] text-gray-400">#3 Chờ...</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 🏆 BẢNG DƯỚI: DANH SÁCH XẾP HẠNG NHƯ HIỆN TẠI */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-100 bg-rose-50/20 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    <span>
                      {leaderboardSubTab === "club"
                        ? (language === "en" ? "Top PK Slingshot Clubs" : "Bảng Xếp Hạng Câu Lạc Bộ PK")
                        : (language === "en" ? "Top PK Slingshot Gladiators" : "Bảng Xếp Hạng Anh Hùng PK")
                      }
                    </span>
                  </h3>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {language === "en" 
                      ? "ELO rating scores recalculate after every officially synchronized match result." 
                      : "Điểm ELO tự động cập nhật sau mỗi trận đấu PK hoàn thành."}
                  </p>
                </div>
                <Flame className="w-5 h-5 text-rose-500 animate-pulse" />
              </div>

              {filteredLeaderboard.length === 0 ? (
                <div className="p-12 text-center text-gray-500 text-xs">
                  {language === "en" ? "No completed PK match data yet for this category." : "Chưa có dữ liệu trận đấu PK nào được hoàn thành ở bảng này."}
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {filteredLeaderboard.map((player, idx) => {
                    // Medal or Rank badge
                    let rankBadge = <span className="font-bold text-gray-500 text-sm">{idx + 1}</span>;
                    if (idx === 0) {
                      rankBadge = <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-full border border-amber-200">🥇 Gold</span>;
                    } else if (idx === 1) {
                      rankBadge = <span className="bg-gray-100 text-gray-800 text-xs font-bold px-2.5 py-1 rounded-full border border-gray-200">🥈 Silver</span>;
                    } else if (idx === 2) {
                      rankBadge = <span className="bg-amber-50 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full border border-amber-150">🥉 Bronze</span>;
                    }

                    return (
                      <button
                        type="button"
                        key={player.id || player.uid}
                        onClick={() => handleProfileOrClubClick(player.name, player.email, player.athleteId || player.uid)}
                        className="w-full text-left p-4 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors focus:outline-none cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-14 text-center shrink-0">
                            {rankBadge}
                          </div>

                          <div className="w-9 h-9 rounded-full overflow-hidden border border-gray-100 bg-gray-50 flex items-center justify-center shrink-0">
                            {player.avatarUrl ? (
                              <img 
                                src={player.avatarUrl} 
                                  alt={player.name} 
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                              />
                            ) : (
                              <User className="w-5 h-5 text-gray-300" />
                            )}
                          </div>

                          <div>
                            <div className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                              <span>{player.name}</span>
                              {player.isClub && (
                                <span className="bg-rose-50 text-rose-700 text-[9px] font-black uppercase px-1.5 py-0.2 rounded">CLB</span>
                              )}
                            </div>
                            <div className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-2">
                              <span>Win: <b className="text-green-600">{player.wins}</b></span>
                              <span>Draw: <b>{player.draws}</b></span>
                              <span>Loss: <b className="text-rose-500">{player.losses}</b></span>
                              {player.streak > 0 && (
                                <span className="text-amber-600 font-bold flex items-center gap-0.5">
                                  <Flame className="w-3 h-3 shrink-0" />
                                  <span>{player.streak} Win Streak</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-black text-rose-600 text-base tracking-tight flex items-center justify-end gap-1">
                            <span>{player.elo}</span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase">ELO</span>
                          </div>
                          <span className="text-[9px] text-gray-400 font-medium">Ranked #{(idx + 1)}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ========================================================= */
          /* 📜 COMPLETED PK MATCHES ARCHIVES LIST VIEW                 */
          /* ========================================================= */
          <div>
            {filteredChallenges.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
                <Award className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-base font-bold text-gray-800">
                  {language === "en" ? "No Match Results Found" : "Không tìm thấy kết quả nào"}
                </h3>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredChallenges.map((challenge) => {
                  const chScores = challenge.scores?.challengerScores || [];
                  const opScores = challenge.scores?.opponentScores || [];
                  const winMechanism = challenge.winMechanism || "by_sets";

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
                  const draw = isBySets ? (chSetsWon === opSetsWon) : (chSum === opSum);

                  const admins = ["vscvietnamslingshot@gmail.com", "nahnatofficial@gmail.com"];
                  const isAdmin = currentUser?.email && admins.includes(currentUser.email.toLowerCase());

                  return (
                    <div 
                      key={challenge.id}
                      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col justify-between"
                    >
                      {/* Match metadata bar */}
                      <div className="px-5 py-3.5 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                        <span>{formatDate(challenge.dateTime)}</span>
                        <span>
                          {challenge.type === "solo_1v1" ? "1v1 Solo" : "Club Team"}
                          {" • "}
                          {winMechanism === "by_sets" 
                            ? (language === "en" ? "Set-by-Set Format" : "Tính theo Hiệp") 
                            : winMechanism === "by_target_shots"
                            ? (language === "en" ? `Touch ${challenge.targetTouchShots || 15} Shots` : `Chạm ${challenge.targetTouchShots || 15} Viên`)
                            : (language === "en" ? "Total Points Format" : "Cộng tổng điểm")}
                        </span>
                      </div>

                      {/* Scoreboard block */}
                      <div className="p-6">
                        <h4 className="text-sm font-bold text-gray-900 text-center mb-2 line-clamp-1">{challenge.title}</h4>
                        
                        {/* Match Specifications subheader */}
                        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[10px] text-gray-500 font-extrabold mb-4 bg-slate-100/60 py-1.5 px-3 rounded-xl border border-slate-200/50 max-w-sm mx-auto">
                          <span className="flex items-center gap-0.5">
                            <span className="text-rose-600">🎯</span>
                            <span>{language === "en" ? "Target:" : "Mục tiêu:"}</span>
                            <span className="text-gray-800">
                              {challenge.targetType === "bia_giay_tinh_diem" 
                                ? (language === "en" ? "Paper Target" : "Bia giấy tính điểm") 
                                : (language === "en" ? "Target Plate" : "Bia mục tiêu")}
                            </span>
                          </span>
                          <span className="text-gray-300">•</span>
                          <span>
                            {language === "en" ? "Shots/Set:" : "Số viên/Hiệp:"} <span className="text-gray-800">{challenge.shotsPerSet || 5}</span>
                          </span>
                          <span className="text-gray-300">•</span>
                          <span>
                            {language === "en" ? "Sets:" : "Số Hiệp:"} <span className="text-gray-800">{challenge.setsCount || 3}</span>
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-around gap-4 bg-gray-50 p-4 rounded-xl border border-gray-50">
                          
                          {/* Challenger */}
                          <button
                            type="button"
                            onClick={() => handleProfileOrClubClick(challenge.challengerName, challenge.challengerEmail, challenge.challengerUid)}
                            className="flex flex-col items-center text-center w-5/12 focus:outline-none hover:text-rose-600 transition-colors cursor-pointer"
                          >
                            <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-100 bg-gray-50 flex items-center justify-center shadow-sm">
                              {(() => {
                                const resolvedChallengerAvatar = getLatestAvatar(challenge.challengerName, challenge.challengerAvatar || "", systemAthletes, systemClubs);
                                return resolvedChallengerAvatar ? (
                                  <img src={resolvedChallengerAvatar} alt={challenge.challengerName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  <User className="w-5 h-5 text-gray-300" />
                                );
                              })()}
                            </div>
                            <span className="text-xs font-bold mt-2 truncate max-w-full">{challenge.challengerName}</span>
                            {challengerWin && (
                              <span className="text-[9px] font-black uppercase text-green-600 bg-green-50 border border-green-100 px-1.5 py-0.2 rounded mt-1">Winner</span>
                            )}
                          </button>

                          {/* Scores Sum */}
                          <div className="text-center shrink-0 flex flex-col items-center">
                            <div className="font-black text-xl text-gray-900 leading-none">
                              {isBySets ? `${chSetsWon} - ${opSetsWon}` : `${chSum} - ${opSum}`}
                            </div>
                            <span className="text-[9px] text-gray-400 font-bold uppercase mt-1">
                              {isBySets 
                                ? (language === "en" ? `Total: ${chSum}-${opSum}` : `Tổng điểm: ${chSum}-${opSum}`) 
                                : (language === "en" ? `Sets: ${chSetsWon}-${opSetsWon}` : `Số hiệp: ${chSetsWon}-${opSetsWon}`)
                              }
                            </span>
                            <span className="text-[9px] text-gray-400 font-bold uppercase mt-1">Final</span>
                          </div>

                          {/* Opponent */}
                          <button
                            type="button"
                            onClick={() => handleProfileOrClubClick(challenge.opponentName || "Đối thủ", challenge.opponentEmail, challenge.opponentUid)}
                            className="flex flex-col items-center text-center w-5/12 focus:outline-none hover:text-rose-600 transition-colors cursor-pointer"
                          >
                            <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-100 bg-gray-50 flex items-center justify-center shadow-sm">
                              {(() => {
                                const resolvedOpponentAvatar = getLatestAvatar(challenge.opponentName || "", challenge.opponentAvatar || "", systemAthletes, systemClubs);
                                return resolvedOpponentAvatar ? (
                                  <img src={resolvedOpponentAvatar} alt={challenge.opponentName || "Opponent"} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  <User className="w-5 h-5 text-gray-300" />
                                );
                              })()}
                            </div>
                            <span className="text-xs font-bold mt-2 truncate max-w-full">{challenge.opponentName || "Guest"}</span>
                            {opponentWin && (
                              <span className="text-[9px] font-black uppercase text-green-600 bg-green-50 border border-green-100 px-1.5 py-0.2 rounded mt-1">Winner</span>
                            )}
                          </button>

                        </div>
                      </div>

                      {/* Footer Details */}
                      <div className="px-5 py-3.5 bg-gray-50/50 border-t border-gray-100 text-xs text-gray-500 flex items-center justify-between">
                        <div>
                          <span className="font-medium text-gray-600">{language === "en" ? "Location: " : "Địa điểm: "}</span>{challenge.location}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedDetailChallenge(challenge)}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded border border-indigo-200"
                          >
                            {language === "en" ? "Details 👁️" : "Xem chi tiết 👁️"}
                          </button>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => openDeleteConfirmation(challenge.id)}
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
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* ➕ HOST CHALLENGE CREATION MODAL                             */}
      {/* ========================================================= */}
      {isCreateModalOpen && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center p-4 overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh]"
          >
            {/* Modal Header */}
            <div className="bg-rose-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Sword className="w-5 h-5 text-rose-400" />
                <span>{language === "en" ? "Host New PK Challenge" : "Đăng Kèo PK Thách Đấu Mới"}</span>
              </h3>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="text-white/80 hover:text-white p-1.5 hover:bg-rose-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateChallenge} className="flex-1 overflow-y-auto p-6 space-y-4">
              
              {/* Challenge Title */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  {language === "en" ? "Challenge Title *" : "Tiêu đề kèo thách đấu *"}
                </label>
                <input
                  type="text"
                  required
                  placeholder={language === "en" ? "e.g., Evening friendly slingshot clash" : "vd: Kèo giao lưu trà đá tối thứ 7"}
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                />
              </div>

              {/* Form Type, Target Type & Size */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    {language === "en" ? "Challenge Format *" : "Thể thức thi đấu *"}
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                  >
                    <option value="solo_1v1">{language === "en" ? "Solo 1v1" : "Đấu đơn cá nhân 1v1"}</option>
                    <option value="team_vs_team">{language === "en" ? "Club / Team vs Team" : "Đấu đồng đội CLB"}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    {language === "en" ? "Target Type *" : "Mục tiêu *"}
                  </label>
                  <select
                    value={formTargetType}
                    onChange={(e) => setFormTargetType(e.target.value as any)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                  >
                    <option value="bia_muc_tieu">{language === "en" ? "Target Plate (Default)" : "Bia mục tiêu (mặc định)"}</option>
                    <option value="bia_giay_tinh_diem">{language === "en" ? "Paper Scoreboard" : "Bia giấy tính điểm"}</option>
                  </select>
                </div>

                {formType === "team_vs_team" && (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      {language === "en" ? "Team size *" : "Số lượng VĐV mỗi bên *"}
                    </label>
                    <select
                      value={formTeamSize}
                      onChange={(e) => setFormTeamSize(Number(e.target.value))}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                    >
                      <option value={2}>2v2</option>
                      <option value={3}>3v3</option>
                      <option value={4}>4v4</option>
                      <option value={5}>5v5</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Linked Athlete Profile Selection */}
              {formType === "solo_1v1" && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    {language === "en" ? "Select Athlete Profile *" : "Đại diện hồ sơ VĐV thi đấu *"}
                  </label>
                  <select
                    value={selectedAthleteId}
                    onChange={(e) => setSelectedAthleteId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  >
                    {loggedInAthlete ? (
                      <option value={loggedInAthlete.id}>
                        {loggedInAthlete.name} (VSC-{loggedInAthlete.id}) - Linked Account
                      </option>
                    ) : (
                      systemAthletes.map((ath) => (
                        <option key={ath.id} value={ath.id}>
                          {ath.name} (VSC-{ath.id})
                        </option>
                      ))
                    )}
                  </select>
                  {!loggedInAthlete && (
                    <p className="text-[10px] text-gray-400 mt-1">
                      {language === "en" 
                        ? "Note: Your account is not linked to a system athlete. Linking email in VSC System directory will lock this automatically." 
                        : "Lưu ý: Tài khoản của bạn chưa được liên kết với hồ sơ VĐV. Bạn có thể chọn tạm hồ sơ VĐV đại diện thi đấu."}
                    </p>
                  )}
                </div>
              )}

              {/* Linked Club Selection */}
              {formType === "team_vs_team" && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    {language === "en" ? "Select Club *" : "Đại diện Câu lạc bộ thi đấu *"}
                  </label>
                  <select
                    value={selectedClubId}
                    onChange={(e) => setSelectedClubId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  >
                    {loggedInClubs.length > 0 ? (
                      loggedInClubs.map((club) => (
                        <option key={club.id} value={club.id}>
                          {club.name} (CLB-{club.id})
                        </option>
                      ))
                    ) : (
                      systemClubs.map((club) => (
                        <option key={club.id} value={club.id}>
                          {club.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              )}

              {/* Direct Opponent Assignment option */}
              <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-150 space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="designateOpponent"
                    checked={formDesignateOpponent}
                    onChange={(e) => {
                      setFormDesignateOpponent(e.target.checked);
                      if (e.target.checked) {
                        if (formType === "solo_1v1") {
                          const firstOpp = systemAthletes.find(a => a.id !== selectedAthleteId);
                          setFormDesignatedOpponentAthleteId(firstOpp?.id || "");
                        } else {
                          const firstClub = systemClubs.find(c => c.id !== selectedClubId);
                          setFormDesignatedOpponentClubId(firstClub?.id || "");
                        }
                      }
                    }}
                    className="w-4 h-4 text-rose-600 focus:ring-rose-500 border-gray-300 rounded"
                  />
                  <label htmlFor="designateOpponent" className="text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer">
                    {language === "en" ? "Designate Direct Opponent" : "Chỉ định đối thủ trực tiếp ⚔️"}
                  </label>
                </div>

                {formDesignateOpponent && (
                  <div>
                    {formType === "solo_1v1" ? (
                      <div className="relative">
                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                          {language === "en" ? "Select Target Opponent Athlete" : "Tìm/Chọn VĐV Đối Thủ chỉ định:"}
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder={language === "en" ? "Search opponent by ID or Name..." : "Gõ tìm đối thủ theo ID hoặc Tên..."}
                            value={formOpponentSearch}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFormOpponentSearch(val);
                              setShowFormOpponentSuggestions(true);
                              if (!val) {
                                setFormDesignatedOpponentAthleteId("");
                              }
                            }}
                            onFocus={() => setShowFormOpponentSuggestions(true)}
                            onBlur={() => {
                              setTimeout(() => setShowFormOpponentSuggestions(false), 200);
                            }}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 pr-8"
                          />
                          {formOpponentSearch && (
                            <button
                              type="button"
                              onClick={() => {
                                setFormOpponentSearch("");
                                setFormDesignatedOpponentAthleteId("");
                              }}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                            >
                              ✕
                            </button>
                          )}
                        </div>

                        {showFormOpponentSuggestions && filteredFormAthletes.length > 0 && (
                          <div className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
                            {filteredFormAthletes.map((ath) => (
                              <div
                                key={ath.id}
                                onMouseDown={() => {
                                  setFormDesignatedOpponentAthleteId(ath.id);
                                  setFormOpponentSearch(`${ath.name} (VSC-${ath.id})`);
                                  setShowFormOpponentSuggestions(false);
                                }}
                                className="px-3 py-2 text-sm hover:bg-rose-50 cursor-pointer flex items-center justify-between border-b border-gray-50 last:border-0"
                              >
                                <span className="font-semibold text-gray-800">{ath.name}</span>
                                <span className="text-xs font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">VSC-{ath.id}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                          {language === "en" ? "Select Target Opponent Club" : "Tìm/Chọn CLB Đối Thủ chỉ định:"}
                        </label>
                        <select
                          value={formDesignatedOpponentClubId}
                          onChange={(e) => setFormDesignatedOpponentClubId(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                        >
                          <option value="">-- {language === "en" ? "Select Club" : "Chọn Câu lạc bộ đối thủ"} --</option>
                          {systemClubs
                            .filter(c => c.id !== selectedClubId)
                            .map((club) => (
                              <option key={club.id} value={club.id}>
                                {club.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    )}
                    <p className="text-[10px] text-emerald-600 mt-1 font-medium">
                      💡 {language === "en" ? "Match will start immediately upon posting. No waiting required." : "Ghép trận tự động bắt đầu ngay sau khi đăng kèo, không cần chờ đợi đối thủ nhận."}
                    </p>
                  </div>
                )}
              </div>

              {/* Match Security PIN */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>{language === "en" ? "Set Match Security PIN (Optional)" : "Đặt mã PIN bảo mật cho kèo đấu"}</span>
                  <span className="text-[10px] text-gray-400 normal-case font-medium">{language === "en" ? "Optional" : "Không bắt buộc"}</span>
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    maxLength={10}
                    placeholder={language === "en" ? "e.g., 1234 (Only players with PIN can join)" : "vd: 1234 (Chỉ đối thủ có PIN mới có thể nhận kèo)"}
                    value={formPin}
                    onChange={(e) => setFormPin(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                  />
                </div>
              </div>

              {/* Dynamic Game Parameters: Distance, Shots per round, Rounds count */}
              <div className="bg-rose-50/30 p-4 rounded-xl border border-rose-100/50 space-y-3.5">
                <span className="text-xs font-bold text-rose-900 uppercase tracking-widest block mb-1 border-b border-rose-100 pb-1">
                  {language === "en" ? "Match Settings" : "Cấu hình KÈO ĐẤU"}
                </span>

                {/* Win Mechanism */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                    {language === "en" ? "Win Mechanism *" : "Cách phân định thắng bại *"}
                  </label>
                  <select
                    value={formWinMechanism}
                    onChange={(e) => handleWinMechanismChange(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  >
                    <option value="by_sets">
                      {language === "en" ? "Set-by-Set (Compare won rounds)" : "Tính theo Hiệp đấu (So sánh số hiệp thắng)"}
                    </option>
                    <option value="by_total_points">
                      {language === "en" ? "Cumulative Points (Sum of all sets)" : "Cộng tổng điểm (Cộng dồn tất cả các hiệp)"}
                    </option>
                    <option value="by_target_shots">
                      {language === "en" ? "Target Shots (Bắn chạm X viên)" : "Bắn chạm X viên"}
                    </option>
                  </select>
                </div>

                {/* Target Touch Shots Textbox */}
                {formWinMechanism === "by_target_shots" && (
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                      {language === "en" ? "Target Touch Shots (Point to win) *" : "Số viên chạm thắng *"}
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={100}
                      value={formTargetTouchShots}
                      onChange={(e) => handleFormTargetTouchShotsChange(Math.max(1, Number(e.target.value)))}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Shots per Set */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                      {formWinMechanism === "by_target_shots"
                        ? (language === "en" ? "Max Shots Limit *" : "Max số viên sẽ bắn *")
                        : (language === "en" ? "Shots per Round *" : "Số viên / mỗi Hiệp *")}
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={100}
                      value={formShotsPerSet}
                      onChange={(e) => setFormShotsPerSet(Math.max(1, Number(e.target.value)))}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                    />
                  </div>

                  {/* Distance */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                      {language === "en" ? "Distance (e.g. 10m, 15m) *" : "Cự ly (m) *"}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="vd: 10m"
                      value={formDistance}
                      onChange={(e) => setFormDistance(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                    />
                  </div>
                </div>

                {/* Rounds Count */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                    {language === "en" ? "Number of Rounds (Sets) *" : "Hiệp đấu (Số hiệp) *"}
                  </label>
                  <div className="flex gap-2">
                    <select
                      disabled={formWinMechanism === "by_target_shots"}
                      value={formWinMechanism === "by_target_shots" ? "1" : formSetsCountOption}
                      onChange={(e) => setFormSetsCountOption(e.target.value)}
                      className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 disabled:bg-gray-100 disabled:text-gray-400"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                        <option key={num} value={String(num)}>
                          {language === "en" ? `${num} Round(s)` : `${num} Hiệp`}
                        </option>
                      ))}
                      <option value="custom">{language === "en" ? "Custom value..." : "Khác (tự nhập số hiệp)..."}</option>
                    </select>

                    {formSetsCountOption === "custom" && formWinMechanism !== "by_target_shots" && (
                      <input
                        type="number"
                        required
                        min={1}
                        max={50}
                        placeholder="vd: 12"
                        value={formSetsCountCustom}
                        onChange={(e) => setFormSetsCountCustom(String(Math.max(1, Number(e.target.value))))}
                        className="w-24 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                      />
                    )}
                  </div>
                  {formWinMechanism === "by_target_shots" && (
                    <p className="text-[10px] text-rose-600 mt-1 font-semibold">
                      {language === "en" ? "Locked to 1 round for Target Shots format" : "Mặc định 1 hiệp cho thể thức Bắn chạm X viên"}
                    </p>
                  )}
                </div>
              </div>

              {/* Match Rules Rule Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>{language === "en" ? "Match Rule & Point Format (Optional Note)" : "Ghi chú quy định luật chơi & Cách phân thắng bại"}</span>
                  <span className="text-[10px] text-gray-400 normal-case font-medium">{language === "en" ? "Optional Note" : "Không bắt buộc (Ghi chú)"}</span>
                </label>
                <input
                  type="text"
                  placeholder={language === "en" ? "e.g., Best of 3, Chạm 11 trước, hoặc Bắn 10 viên" : "vd: Trọng tài chấm điểm, chạm 11 trước, hay Best of 3..."}
                  value={formRules}
                  onChange={(e) => setFormRules(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                />
              </div>

              {/* Date & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    {language === "en" ? "Scheduled DateTime *" : "Thời gian hẹn thi đấu *"}
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formDateTime}
                    onChange={(e) => setFormDateTime(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    {language === "en" ? "Venue / Location *" : "Địa điểm / Sân thi đấu *"}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Sân ĐH Y Hà Nội"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                  />
                </div>
              </div>

              {/* Optional Referee */}
              <div className="relative">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  {language === "en" ? "Referee (Optional - ID, Name, or Email)" : "Trọng tài chỉ định (ID, Tên hoặc Email - Không bắt buộc)"}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder={language === "en" ? "Type ID, Name or Email..." : "Nhập ID, tên hoặc email trọng tài..."}
                    value={formRefereeSearch}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormRefereeSearch(val);
                      setShowFormRefereeSuggestions(true);
                      if (val.includes("@")) {
                        setFormRefereeEmail(val.trim().toLowerCase());
                      } else if (!val) {
                        setFormRefereeEmail("");
                      }
                    }}
                    onFocus={() => setShowFormRefereeSuggestions(true)}
                    onBlur={() => {
                      setTimeout(() => setShowFormRefereeSuggestions(false), 200);
                    }}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 pr-8 transition-all"
                  />
                  {formRefereeSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormRefereeSearch("");
                        setFormRefereeEmail("");
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {showFormRefereeSuggestions && filteredFormReferees.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
                    {filteredFormReferees.map((ath) => (
                      <div
                        key={ath.id}
                        onMouseDown={() => {
                          setFormRefereeEmail(ath.email || "");
                          setFormRefereeSearch(`${ath.name} (${ath.email || 'VSC-' + ath.id})`);
                          setShowFormRefereeSuggestions(false);
                        }}
                        className="px-3 py-2 text-sm hover:bg-rose-50 cursor-pointer flex flex-col border-b border-gray-50 last:border-0"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-gray-800">{ath.name}</span>
                          <span className="text-xs font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">VSC-{ath.id}</span>
                        </div>
                        {ath.email && <span className="text-xs text-gray-400 mt-0.5">{ath.email}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Challenge Description / Notes */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  {language === "en" ? "Notes / Extra description" : "Mô tả thêm / Ghi chú kèo nước"}
                </label>
                <textarea
                  rows={2}
                  placeholder="vd: Kèo bia giao lưu trà đá chia tiền sân vui vẻ..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-150 rounded-xl transition-colors cursor-pointer"
                >
                  {language === "en" ? "Discard" : "Hủy bỏ"}
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md cursor-pointer transition-colors flex items-center gap-2"
                >
                  {actionLoading ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : null}
                  <span>{language === "en" ? "Post Challenge" : "Đăng Kèo Ngay"}</span>
                </button>
              </div>

            </form>

          </motion.div>
        </div>,
        document.body
      )}

      {/* ========================================================= */}
      {/* ⚙️ EDIT CHALLENGE SETTINGS MODAL                            */}
      {/* ========================================================= */}
      {isEditModalOpen && editingChallenge && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center p-4 overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh]"
          >
            {/* Modal Header */}
            <div className="bg-blue-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-400" />
                <span>{language === "en" ? "Edit PK Challenge Settings" : "Sửa Cấu Hình KÈO PK"}</span>
              </h3>
              <button 
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingChallenge(null);
                }}
                className="text-white/80 hover:text-white p-1.5 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleUpdateChallengeSettings} className="flex-1 overflow-y-auto p-6 space-y-4">
              
              {/* Challenge Title */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  {language === "en" ? "Challenge Title *" : "Tiêu đề kèo thách đấu *"}
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-55 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              {/* Form Type, Target Type & Size */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    {language === "en" ? "Challenge Format *" : "Thể thức thi đấu *"}
                  </label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as any)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  >
                    <option value="solo_1v1">{language === "en" ? "Solo 1v1" : "Đấu đơn cá nhân 1v1"}</option>
                    <option value="team_vs_team">{language === "en" ? "Club / Team vs Team" : "Đấu đồng đội CLB"}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    {language === "en" ? "Target Type *" : "Mục tiêu *"}
                  </label>
                  <select
                    value={editTargetType}
                    onChange={(e) => setEditTargetType(e.target.value as any)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  >
                    <option value="bia_muc_tieu">{language === "en" ? "Target Plate (Default)" : "Bia mục tiêu (mặc định)"}</option>
                    <option value="bia_giay_tinh_diem">{language === "en" ? "Paper Scoreboard" : "Bia giấy tính điểm"}</option>
                  </select>
                </div>

                {editType === "team_vs_team" && (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      {language === "en" ? "Team size *" : "Số lượng VĐV mỗi bên *"}
                    </label>
                    <select
                      value={editTeamSize}
                      onChange={(e) => setEditTeamSize(Number(e.target.value))}
                      className="w-full px-4 py-2.5 bg-gray-55 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    >
                      <option value={2}>2v2</option>
                      <option value={3}>3v3</option>
                      <option value={4}>4v4</option>
                      <option value={5}>5v5</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Linked Athlete Profile Selection */}
              {editType === "solo_1v1" && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    {language === "en" ? "Select Athlete Profile *" : "Đại diện hồ sơ VĐV thi đấu *"}
                  </label>
                  <select
                    value={editSelectedAthleteId}
                    onChange={(e) => setEditSelectedAthleteId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {loggedInAthlete ? (
                      <option value={loggedInAthlete.id}>
                        {loggedInAthlete.name} (VSC-{loggedInAthlete.id}) - Linked Account
                      </option>
                    ) : (
                      systemAthletes.map((ath) => (
                        <option key={ath.id} value={ath.id}>
                          {ath.name} (VSC-{ath.id})
                        </option>
                      ))
                    )}
                  </select>
                </div>
              )}

              {/* Linked Club Selection */}
              {editType === "team_vs_team" && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    {language === "en" ? "Select Club *" : "Đại diện Câu lạc bộ thi đấu *"}
                  </label>
                  <select
                    value={editSelectedClubId}
                    onChange={(e) => setEditSelectedClubId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {loggedInClubs.length > 0 ? (
                      loggedInClubs.map((club) => (
                        <option key={club.id} value={club.id}>
                          {club.name} (CLB-{club.id})
                        </option>
                      ))
                    ) : (
                      systemClubs.map((club) => (
                        <option key={club.id} value={club.id}>
                          {club.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              )}

              {/* Direct Opponent Assignment option */}
              <div className="bg-gray-50/55 p-4 rounded-xl border border-gray-150 space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="editDesignateOpponent"
                    checked={editDesignateOpponent}
                    onChange={(e) => {
                      setEditDesignateOpponent(e.target.checked);
                      if (e.target.checked) {
                        if (editType === "solo_1v1") {
                          const firstOpp = systemAthletes.find(a => a.id !== editSelectedAthleteId);
                          setEditDesignatedOpponentAthleteId(firstOpp?.id || "");
                        } else {
                          const firstClub = systemClubs.find(c => c.id !== editSelectedClubId);
                          setEditDesignatedOpponentClubId(firstClub?.id || "");
                        }
                      }
                    }}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="editDesignateOpponent" className="text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer">
                    {language === "en" ? "Designate Direct Opponent" : "Chỉ định đối thủ trực tiếp ⚔️"}
                  </label>
                </div>

                {editDesignateOpponent && (
                  <div>
                    {editType === "solo_1v1" ? (
                      <div className="relative">
                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                          {language === "en" ? "Select Target Opponent Athlete" : "Tìm/Chọn VĐV Đối Thủ chỉ định:"}
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder={language === "en" ? "Search opponent by ID or Name..." : "Gõ tìm đối thủ theo ID hoặc Tên..."}
                            value={editOpponentSearch}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditOpponentSearch(val);
                              setShowEditOpponentSuggestions(true);
                              if (!val) {
                                setEditDesignatedOpponentAthleteId("");
                              }
                            }}
                            onFocus={() => setShowEditOpponentSuggestions(true)}
                            onBlur={() => {
                              setTimeout(() => setShowEditOpponentSuggestions(false), 200);
                            }}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 pr-8"
                          />
                          {editOpponentSearch && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditOpponentSearch("");
                                setEditDesignatedOpponentAthleteId("");
                              }}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                            >
                              ✕
                            </button>
                          )}
                        </div>

                        {showEditOpponentSuggestions && filteredEditAthletes.length > 0 && (
                          <div className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
                            {filteredEditAthletes.map((ath) => (
                              <div
                                key={ath.id}
                                onMouseDown={() => {
                                  setEditDesignatedOpponentAthleteId(ath.id);
                                  setEditOpponentSearch(`${ath.name} (VSC-${ath.id})`);
                                  setShowEditOpponentSuggestions(false);
                                }}
                                className="px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer flex items-center justify-between border-b border-gray-50 last:border-0"
                              >
                                <span className="font-semibold text-gray-800">{ath.name}</span>
                                <span className="text-xs font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">VSC-{ath.id}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                          {language === "en" ? "Select Target Opponent Club" : "Tìm/Chọn CLB Đối Thủ chỉ định:"}
                        </label>
                        <select
                          value={editDesignatedOpponentClubId}
                          onChange={(e) => setEditDesignatedOpponentClubId(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        >
                          <option value="">-- {language === "en" ? "Select Club" : "Chọn Câu lạc bộ đối thủ"} --</option>
                          {systemClubs
                            .filter(c => c.id !== editSelectedClubId)
                            .map((club) => (
                              <option key={club.id} value={club.id}>
                                {club.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Match Security PIN */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>{language === "en" ? "Set Match Security PIN (Optional)" : "Đặt mã PIN bảo mật cho kèo đấu"}</span>
                  <span className="text-[10px] text-gray-400 normal-case font-medium">{language === "en" ? "Optional" : "Không bắt buộc"}</span>
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    maxLength={10}
                    placeholder={language === "en" ? "e.g., 1234 (Only players with PIN can join)" : "vd: 1234 (Chỉ đối thủ có PIN mới có thể nhận kèo)"}
                    value={editPin}
                    onChange={(e) => setEditPin(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-gray-55 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              {/* Dynamic Game Parameters: Distance, Shots per round, Rounds count */}
              <div className="bg-blue-50/30 p-4 rounded-xl border border-blue-100/50 space-y-3.5">
                <span className="text-xs font-bold text-blue-900 uppercase tracking-widest block mb-1 border-b border-blue-100 pb-1">
                  {language === "en" ? "Match Settings" : "Cấu hình KÈO ĐẤU"}
                </span>

                {/* Win Mechanism */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                    {language === "en" ? "Win Mechanism *" : "Cách phân định thắng bại *"}
                  </label>
                  <select
                    value={editWinMechanism}
                    onChange={(e) => handleEditWinMechanismChange(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="by_sets">
                      {language === "en" ? "Set-by-Set (Compare won rounds)" : "Tính theo Hiệp đấu (So sánh số hiệp thắng)"}
                    </option>
                    <option value="by_total_points">
                      {language === "en" ? "Cumulative Points (Sum of all sets)" : "Cộng tổng điểm (Cộng dồn tất cả các hiệp)"}
                    </option>
                    <option value="by_target_shots">
                      {language === "en" ? "Target Shots (Bắn chạm X viên)" : "Bắn chạm X viên"}
                    </option>
                  </select>
                </div>

                {/* Target Touch Shots Textbox */}
                {editWinMechanism === "by_target_shots" && (
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                      {language === "en" ? "Target Touch Shots (Point to win) *" : "Số viên chạm thắng *"}
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={100}
                      value={editTargetTouchShots}
                      onChange={(e) => handleEditTargetTouchShotsChange(Math.max(1, Number(e.target.value)))}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Shots per Set */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                      {editWinMechanism === "by_target_shots"
                        ? (language === "en" ? "Max Shots Limit *" : "Max số viên sẽ bắn *")
                        : (language === "en" ? "Shots per Round *" : "Số viên / mỗi Hiệp *")}
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={100}
                      value={editShotsPerSet}
                      onChange={(e) => setEditShotsPerSet(Math.max(1, Number(e.target.value)))}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  {/* Distance */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                      {language === "en" ? "Distance (e.g. 10m, 15m) *" : "Cự ly (m) *"}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="vd: 10m"
                      value={editDistance}
                      onChange={(e) => setEditDistance(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                {/* Rounds Count */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                    {language === "en" ? "Number of Rounds (Sets) *" : "Hiệp đấu (Số hiệp) *"}
                  </label>
                  <div className="flex gap-2">
                    <select
                      disabled={editWinMechanism === "by_target_shots"}
                      value={editWinMechanism === "by_target_shots" ? "1" : editSetsCountOption}
                      onChange={(e) => setEditSetsCountOption(e.target.value)}
                      className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-gray-100 disabled:text-gray-400"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                        <option key={num} value={String(num)}>
                          {language === "en" ? `${num} Round(s)` : `${num} Hiệp`}
                        </option>
                      ))}
                      <option value="custom">{language === "en" ? "Custom value..." : "Khác (tự nhập số hiệp)..."}</option>
                    </select>

                    {editSetsCountOption === "custom" && editWinMechanism !== "by_target_shots" && (
                      <input
                        type="number"
                        required
                        min={1}
                        max={50}
                        placeholder="vd: 12"
                        value={editSetsCountCustom}
                        onChange={(e) => setEditSetsCountCustom(String(Math.max(1, Number(e.target.value))))}
                        className="w-24 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    )}
                  </div>
                  {editWinMechanism === "by_target_shots" && (
                    <p className="text-[10px] text-rose-600 mt-1 font-semibold">
                      {language === "en" ? "Locked to 1 round for Target Shots format" : "Mặc định 1 hiệp cho thể thức Bắn chạm X viên"}
                    </p>
                  )}
                </div>
              </div>

              {/* Match Rules Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>{language === "en" ? "Match Rule & Point Format (Optional Note)" : "Ghi chú quy định luật chơi & Cách phân thắng bại"}</span>
                  <span className="text-[10px] text-gray-400 normal-case font-medium">{language === "en" ? "Optional Note" : "Không bắt buộc (Ghi chú)"}</span>
                </label>
                <input
                  type="text"
                  placeholder={language === "en" ? "e.g., Best of 3, Chạm 11 trước, hoặc Bắn 10 viên" : "vd: Trọng tài chấm điểm, chạm 11 trước, hay Best of 3..."}
                  value={editRules}
                  onChange={(e) => setEditRules(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-55 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              {/* Date & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    {language === "en" ? "Scheduled DateTime *" : "Thời gian hẹn thi đấu *"}
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={editDateTime}
                    onChange={(e) => setEditDateTime(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-55 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    {language === "en" ? "Venue / Location *" : "Địa điểm / Sân thi đấu *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-55 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              {/* Optional Referee */}
              <div className="relative">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  {language === "en" ? "Referee (Optional - ID, Name, or Email)" : "Trọng tài chỉ định (ID, Tên hoặc Email - Không bắt buộc)"}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder={language === "en" ? "Type ID, Name or Email..." : "Nhập ID, tên hoặc email trọng tài..."}
                    value={editRefereeSearch}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditRefereeSearch(val);
                      setShowEditRefereeSuggestions(true);
                      if (val.includes("@")) {
                        setEditRefereeEmail(val.trim().toLowerCase());
                      } else if (!val) {
                        setEditRefereeEmail("");
                      }
                    }}
                    onFocus={() => setShowEditRefereeSuggestions(true)}
                    onBlur={() => {
                      setTimeout(() => setShowEditRefereeSuggestions(false), 200);
                    }}
                    className="w-full px-4 py-2.5 bg-gray-55 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 pr-8 transition-all"
                  />
                  {editRefereeSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditRefereeSearch("");
                        setEditRefereeEmail("");
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {showEditRefereeSuggestions && filteredEditReferees.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
                    {filteredEditReferees.map((ath) => (
                      <div
                        key={ath.id}
                        onMouseDown={() => {
                          setEditRefereeEmail(ath.email || "");
                          setEditRefereeSearch(`${ath.name} (${ath.email || 'VSC-' + ath.id})`);
                          setShowEditRefereeSuggestions(false);
                        }}
                        className="px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer flex flex-col border-b border-gray-50 last:border-0"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-gray-800">{ath.name}</span>
                          <span className="text-xs font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">VSC-{ath.id}</span>
                        </div>
                        {ath.email && <span className="text-xs text-gray-400 mt-0.5">{ath.email}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Challenge Description / Notes */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  {language === "en" ? "Notes / Extra description" : "Mô tả thêm / Ghi chú kèo nước"}
                </label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-55 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingChallenge(null);
                  }}
                  className="px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-150 rounded-xl transition-colors cursor-pointer"
                >
                  {language === "en" ? "Cancel" : "Hủy bỏ"}
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md cursor-pointer transition-colors flex items-center gap-2"
                >
                  {actionLoading ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : null}
                  <span>{language === "en" ? "Save Settings" : "Lưu Thay Đổi"}</span>
                </button>
              </div>

            </form>

          </motion.div>
        </div>,
        document.body
      )}

      {/* ========================================================= */}
      {/* 🗑️ TWO-STEP PERMANENT DELETE CONFIRMATION MODAL             */}
      {/* ========================================================= */}
      {deleteConfirmStep > 0 && deleteChallengeId && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[99999] bg-black/70 backdrop-blur-xs flex flex-col items-center justify-center p-4 overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden my-auto"
          >
            {/* Modal Header */}
            <div className="bg-rose-900 text-white px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-300 shrink-0" />
                <span>
                  {deleteConfirmStep === 1 
                    ? (language === "en" ? "Confirm Deletion (Step 1/2)" : "Xác nhận xóa kèo (Bước 1/2)")
                    : (language === "en" ? "CRITICAL CONFIRMATION (Step 2/2)" : "XÁC NHẬN NGUY HIỂM (Bước 2/2)")}
                </span>
              </h3>
              <button 
                onClick={() => {
                  setDeleteConfirmStep(0);
                  setDeleteChallengeId(null);
                }}
                className="text-white/80 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {deleteConfirmStep === 1 ? (
                <>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {language === "en" 
                      ? "Are you sure you want to delete this PK challenge? If matches are underway, this will erase temporary logs permanently." 
                      : "Bạn có chắc chắn muốn xóa kèo đấu PK này không? Kèo đấu sẽ biến mất vĩnh viễn khỏi sảnh đấu và lịch sử."}
                  </p>
                  <div className="bg-amber-50 rounded-xl p-3 border border-amber-200 text-xs text-amber-800 flex gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{language === "en" ? "This action is irreversible." : "Hành động này không thể hoàn tác."}</span>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-rose-800 font-bold leading-relaxed">
                    {language === "en" 
                      ? "WARNING: You are about to permanently purge this match from the database. This includes any scores registered, and can impact standings." 
                      : "CẢNH BÁO: Bạn đang thực hiện xóa vĩnh viễn trận đấu khỏi hệ thống cơ sở dữ liệu. Tất cả điểm số, hiệp đấu đã lưu sẽ mất hoàn toàn."}
                  </p>
                  <p className="text-xs text-gray-500">
                    {language === "en" 
                      ? "Please click 'Permanently Purge' to proceed, or close this window." 
                      : "Vui lòng bấm 'Có, hãy xóa vĩnh viễn' để tiếp tục hoặc đóng cửa sổ này."}
                  </p>
                </>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setDeleteConfirmStep(0);
                    setDeleteChallengeId(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                >
                  {language === "en" ? "Cancel" : "Hủy bỏ"}
                </button>

                {deleteConfirmStep === 1 ? (
                  <button
                    type="button"
                    onClick={handleConfirmDeleteStep1}
                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md cursor-pointer transition-colors"
                  >
                    {language === "en" ? "Continue" : "Tiếp tục bước 2"}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={handleConfirmDeleteFinal}
                    className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md cursor-pointer transition-colors flex items-center gap-1"
                  >
                    {actionLoading && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                    <span>{language === "en" ? "Permanently Purge 🗑️" : "Có, hãy xóa vĩnh viễn 🗑️"}</span>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>,
        document.body
      )}

      {/* ========================================================= */}
      {/* 🗑️ TWO-STEP INDIVIDUAL SET DELETE CONFIRMATION MODAL        */}
      {/* ========================================================= */}
      {deleteSetConfirmStep > 0 && deletingSetIndex !== null && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center p-4 overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden my-auto"
          >
            {/* Modal Header */}
            <div className="bg-rose-900 text-white px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-300 shrink-0" />
                <span>
                  {deleteSetConfirmStep === 1 
                    ? (language === "en" ? "Delete Hiệp Đấu (Step 1/2)" : "Xóa Hiệp Đấu (Cảnh báo 1/2)")
                    : (language === "en" ? "CRITICAL (Step 2/2)" : "CẢNH BÁO NGUY HIỂM (Cảnh báo 2/2)")}
                </span>
              </h3>
              <button 
                onClick={() => {
                  setDeleteSetConfirmStep(0);
                  setDeletingSetIndex(null);
                }}
                className="text-white/80 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {deleteSetConfirmStep === 1 ? (
                <>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {language === "en" 
                      ? `Are you sure you want to delete Set ${deletingSetIndex + 1}? All scored shots and points for this set will be removed.` 
                      : `Bạn có chắc chắn muốn xóa Hiệp ${deletingSetIndex + 1} không? Toàn bộ điểm số và lượt bắn của hiệp đấu này sẽ bị loại bỏ hoàn toàn.`}
                  </p>
                  <div className="bg-amber-50 rounded-xl p-3 border border-amber-200 text-xs text-amber-800 flex gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{language === "en" ? "The remaining sets will be re-numbered." : "Các hiệp đấu còn lại sẽ được tự động đánh số lại thứ tự."}</span>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-rose-800 font-bold leading-relaxed">
                    {language === "en" 
                      ? `WARNING: This action is permanent! The scores and shot lists for Set ${deletingSetIndex + 1} cannot be recovered.` 
                      : `CẢNH BÁO NGUY HIỂM: Thao tác này là vĩnh viễn! Điểm số và thông tin bắn trúng/trượt của Hiệp ${deletingSetIndex + 1} sẽ không thể khôi phục.`}
                  </p>
                  <p className="text-xs text-gray-500">
                    {language === "en" 
                      ? "Click 'Confirm Deletion' to proceed, or click 'Cancel' to keep the set." 
                      : "Bấm 'Tôi đồng ý xóa vĩnh viễn hiệp đấu' để tiến hành xóa, hoặc chọn 'Hủy bỏ' để giữ lại hiệp đấu."}
                  </p>
                </>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setDeleteSetConfirmStep(0);
                    setDeletingSetIndex(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                >
                  {language === "en" ? "Cancel" : "Hủy bỏ"}
                </button>

                {deleteSetConfirmStep === 1 ? (
                  <button
                    type="button"
                    onClick={() => setDeleteSetConfirmStep(2)}
                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md cursor-pointer transition-colors"
                  >
                    {language === "en" ? "Next Warning" : "Tiếp tục cảnh báo 2"}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={handleConfirmDeleteSet}
                    className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md cursor-pointer transition-colors flex items-center gap-1"
                  >
                    {actionLoading && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                    <span>{language === "en" ? "Confirm Deletion 🗑️" : "Tôi đồng ý xóa vĩnh viễn hiệp đấu 🗑️"}</span>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>,
        document.body
      )}

      {/* ========================================================= */}
      {/* 👁️ COMPLETED MATCH DETAILS POP-UP MODAL                   */}
      {/* ========================================================= */}
      {selectedDetailChallenge !== null && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center p-4 overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh]"
          >
            {/* Modal Header */}
            <div className="bg-indigo-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Trophy className="w-5 h-5 text-indigo-400" />
                <span>{language === "en" ? "Match Scorecard Details" : "Chi Tiết Kết Quả Kèo Đấu"}</span>
              </h3>
              <button 
                onClick={() => setSelectedDetailChallenge(null)}
                className="text-indigo-200 hover:text-white p-1.5 hover:bg-indigo-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="text-center">
                <h4 className="font-extrabold text-base text-gray-900">{selectedDetailChallenge.title}</h4>
                <p className="text-xs text-gray-500 mt-1 flex justify-center gap-4">
                  <span>{formatDate(selectedDetailChallenge.dateTime)}</span>
                  <span>•</span>
                  <span>{selectedDetailChallenge.location}</span>
                  <span>•</span>
                  <span>{language === "en" ? `Distance: ${selectedDetailChallenge.distance || "10m"}` : `Cự ly: ${selectedDetailChallenge.distance || "10m"}`}</span>
                </p>
                <div className="inline-block mt-2 px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full border border-indigo-100">
                  {selectedDetailChallenge.winMechanism === "by_total_points" 
                    ? (language === "en" ? "Rule: Cumulative Points" : "Luật: Cộng dồn tổng điểm")
                    : selectedDetailChallenge.winMechanism === "by_target_shots"
                    ? (language === "en" ? `Rule: Target Touch (${selectedDetailChallenge.targetTouchShots || 0} Shots)` : `Luật: Bắn chạm (${selectedDetailChallenge.targetTouchShots || 0} viên)`)
                    : (language === "en" ? "Rule: Set-by-Set Wins" : "Luật: Tính theo số hiệp thắng")}
                </div>
              </div>

              {/* Match Information Grid */}
              <div className="bg-indigo-50/40 p-4 rounded-xl border border-indigo-100/50 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="block text-[10px] text-indigo-800 font-bold uppercase tracking-wider mb-0.5">
                    {language === "en" ? "Target Type" : "Mục tiêu"}
                  </span>
                  <span className="font-semibold text-gray-800">
                    {selectedDetailChallenge.targetType === "bia_giay_tinh_diem" 
                      ? (language === "en" ? "Paper Scoreboard" : "Bia giấy tính điểm") 
                      : (language === "en" ? "Standard Target" : "Bia mục tiêu")}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-indigo-800 font-bold uppercase tracking-wider mb-0.5">
                    {language === "en" ? "Shots Per Round" : "Số viên mỗi hiệp"}
                  </span>
                  <span className="font-semibold text-gray-800">
                    {selectedDetailChallenge.shotsPerSet || 5} {language === "en" ? "shots" : "viên"}
                  </span>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <span className="block text-[10px] text-indigo-800 font-bold uppercase tracking-wider mb-0.5">
                    {language === "en" ? "Rounds Count" : "Hiệp đấu"}
                  </span>
                  <span className="font-semibold text-gray-800">
                    {selectedDetailChallenge.setsCount || 3} {language === "en" ? "rounds" : "hiệp"}
                  </span>
                </div>
                {selectedDetailChallenge.description && (
                  <div className="col-span-2 sm:col-span-3 border-t border-indigo-100/40 pt-3 mt-1">
                    <span className="block text-[10px] text-indigo-800 font-bold uppercase tracking-wider mb-1">
                      {language === "en" ? "Match Description" : "Mô tả kèo đấu"}
                    </span>
                    <p className="text-gray-700 leading-relaxed font-normal bg-white/75 p-2.5 rounded-lg border border-indigo-100/20 whitespace-pre-wrap">
                      {selectedDetailChallenge.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Head-to-Head display */}
              {(() => {
                const chScores = selectedDetailChallenge.scores?.challengerScores || [];
                const opScores = selectedDetailChallenge.scores?.opponentScores || [];
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

                const isBySets = selectedDetailChallenge.winMechanism === "by_sets" || !selectedDetailChallenge.winMechanism;
                const chWin = isBySets ? (chSetsWon > opSetsWon) : (chSum > opSum);
                const opWin = isBySets ? (opSetsWon > chSetsWon) : (opSum > chSum);

                let challengerShots: boolean[][] = [];
                let opponentShots: boolean[][] = [];
                if (typeof selectedDetailChallenge.scores?.challengerShots === "string") {
                  try { challengerShots = JSON.parse(selectedDetailChallenge.scores.challengerShots); } catch (e) {}
                } else if (Array.isArray(selectedDetailChallenge.scores?.challengerShots)) {
                  challengerShots = selectedDetailChallenge.scores.challengerShots;
                }
                if (typeof selectedDetailChallenge.scores?.opponentShots === "string") {
                  try { opponentShots = JSON.parse(selectedDetailChallenge.scores.opponentShots); } catch (e) {}
                } else if (Array.isArray(selectedDetailChallenge.scores?.opponentShots)) {
                  opponentShots = selectedDetailChallenge.scores.opponentShots;
                }

                return (
                  <>
                    <div className="flex items-center justify-around gap-4 bg-gray-50 p-5 rounded-2xl border border-gray-100">
                      {/* Challenger */}
                      <div className="flex flex-col items-center text-center w-5/12">
                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-indigo-200 bg-white flex items-center justify-center shadow-md">
                          {selectedDetailChallenge.challengerAvatar ? (
                            <img src={selectedDetailChallenge.challengerAvatar} alt={selectedDetailChallenge.challengerName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <User className="w-6 h-6 text-gray-300" />
                          )}
                        </div>
                        <span className="text-sm font-bold text-gray-950 mt-2">{selectedDetailChallenge.challengerName}</span>
                        {chWin && (
                          <span className="text-[10px] font-black uppercase text-green-700 bg-green-100 border border-green-200 px-2 py-0.5 rounded-md mt-1">Winner</span>
                        )}
                      </div>

                      {/* Main Score Display */}
                      <div className="text-center shrink-0">
                        <div className="font-extrabold text-2xl text-gray-950">
                          {isBySets ? `${chSetsWon} - ${opSetsWon}` : `${chSum} - ${opSum}`}
                        </div>
                        <span className="text-[10px] text-gray-500 font-bold uppercase block mt-1 tracking-wider">
                          {isBySets ? (language === "en" ? "Sets Score" : "Tỷ số Hiệp") : (language === "en" ? "Points Score" : "Tỷ số Điểm")}
                        </span>
                        <div className="text-[10px] text-gray-400 mt-1 font-semibold">
                          {isBySets 
                            ? (language === "en" ? `Total points: ${chSum} - ${opSum}` : `Tổng điểm: ${chSum} - ${opSum}`) 
                            : (language === "en" ? `Sets won: ${chSetsWon} - ${opSetsWon}` : `Số hiệp thắng: ${chSetsWon} - ${opSetsWon}`)
                          }
                        </div>
                      </div>

                      {/* Opponent */}
                      <div className="flex flex-col items-center text-center w-5/12">
                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-indigo-200 bg-white flex items-center justify-center shadow-md">
                          {selectedDetailChallenge.opponentAvatar ? (
                            <img src={selectedDetailChallenge.opponentAvatar} alt={selectedDetailChallenge.opponentName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <User className="w-6 h-6 text-gray-300" />
                          )}
                        </div>
                        <span className="text-sm font-bold text-gray-950 mt-2">{selectedDetailChallenge.opponentName || "Guest"}</span>
                        {opWin && (
                          <span className="text-[10px] font-black uppercase text-green-700 bg-green-100 border border-green-200 px-2 py-0.5 rounded-md mt-1">Winner</span>
                        )}
                      </div>
                    </div>

                    {/* Sets Breakdown */}
                    <div className="space-y-4">
                      <h5 className="font-bold text-xs text-gray-700 uppercase tracking-widest border-b border-gray-100 pb-1">
                        {language === "en" ? "Rounds Breakdown" : "Chi tiết từng hiệp đấu"}
                      </h5>

                      <div className="space-y-3">
                        {Array.from({ length: selectedDetailChallenge.setsCount || 3 }).map((_, setIdx) => {
                          const chSetScore = chScores[setIdx] ?? 0;
                          const opSetScore = opScores[setIdx] ?? 0;
                          const shotsLimit = selectedDetailChallenge.shotsPerSet || 5;

                          const chRowShots = challengerShots[setIdx] || [];
                          const opRowShots = opponentShots[setIdx] || [];

                          return (
                            <div key={setIdx} className="bg-gray-50/50 p-3.5 rounded-xl border border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                              {/* Round Number */}
                              <span className="font-extrabold text-xs text-indigo-900 uppercase shrink-0">
                                {language === "en" ? `Set ${setIdx + 1}` : `Hiệp ${setIdx + 1}`}
                              </span>

                              {/* Challenger shots & score */}
                              <div className="flex items-center gap-3 w-full sm:w-auto justify-end flex-1 sm:justify-end">
                                {selectedDetailChallenge.targetType !== "bia_giay_tinh_diem" && (
                                  <div className="grid grid-cols-5 gap-1 w-fit">
                                    {Array.from({ length: shotsLimit }).map((_, shotIdx) => {
                                      const shotVal = chRowShots[shotIdx];
                                      let cellClass = "bg-gray-50 border-gray-200 text-gray-400";
                                      let cellTitle = "Untapped";
                                      if (shotVal === true) {
                                        cellClass = "bg-green-600 border-green-700 text-white";
                                        cellTitle = "Hit";
                                      } else if (shotVal === false) {
                                        cellClass = "bg-rose-600 border-rose-700 text-white";
                                        cellTitle = "Miss";
                                      }
                                      return (
                                        <div 
                                          key={shotIdx} 
                                          className={`w-5 h-5 rounded text-[8px] font-black flex items-center justify-center border ${cellClass}`}
                                          title={cellTitle}
                                        >
                                          {shotIdx + 1}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                                <span className="font-black text-sm text-gray-800 bg-white px-2 py-0.5 rounded border border-gray-150 min-w-[28px] text-center">
                                  {chSetScore}
                                </span>
                              </div>

                              <span className="font-bold text-gray-300 hidden sm:inline">:</span>

                              {/* Opponent shots & score */}
                              <div className="flex items-center gap-3 w-full sm:w-auto justify-start flex-1 sm:justify-start">
                                <span className="font-black text-sm text-gray-800 bg-white px-2 py-0.5 rounded border border-gray-150 min-w-[28px] text-center">
                                  {opSetScore}
                                </span>
                                {selectedDetailChallenge.targetType !== "bia_giay_tinh_diem" && (
                                  <div className="grid grid-cols-5 gap-1 w-fit">
                                    {Array.from({ length: shotsLimit }).map((_, shotIdx) => {
                                      const shotVal = opRowShots[shotIdx];
                                      let cellClass = "bg-gray-50 border-gray-200 text-gray-400";
                                      let cellTitle = "Untapped";
                                      if (shotVal === true) {
                                        cellClass = "bg-green-600 border-green-700 text-white";
                                        cellTitle = "Hit";
                                      } else if (shotVal === false) {
                                        cellClass = "bg-rose-600 border-rose-700 text-white";
                                        cellTitle = "Miss";
                                      }
                                      return (
                                        <div 
                                          key={shotIdx} 
                                          className={`w-5 h-5 rounded text-[8px] font-black flex items-center justify-center border ${cellClass}`}
                                          title={cellTitle}
                                        >
                                          {shotIdx + 1}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                );
              })()}

              {/* Referee email and system stats */}
              {selectedDetailChallenge.refereeEmail && (
                <div className="bg-amber-50 rounded-xl p-3 border border-amber-100 text-xs text-amber-900 flex items-center justify-between">
                  <span className="font-bold">{language === "en" ? "Referee:" : "Trọng tài giám sát:"}</span>
                  <span className="font-medium bg-amber-100/50 px-2.5 py-0.5 rounded-lg border border-amber-200/50">{selectedDetailChallenge.refereeEmail}</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setSelectedDetailChallenge(null)}
                className="bg-indigo-900 hover:bg-indigo-950 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md cursor-pointer transition-colors"
              >
                {language === "en" ? "Close Scorecard" : "Đóng bảng điểm"}
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
       )}

      {/* ========================================================= */}
      {/* 🎯 VIEWPORT CENTER TARGET SHOTS REACHED ANNOUNCEMENT       */}
      {/* ========================================================= */}
      {touchAnnouncement !== null && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[100000] bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-amber-200 text-center relative"
          >
            {/* Elegant decorative top pattern */}
            <div className="bg-amber-500 h-2.5 w-full absolute top-0 left-0" />
            
            <div className="p-8 flex flex-col items-center">
              {/* Animated Target / Trophy Icon inside a golden ripple ring */}
              <div className="relative mb-6">
                <div className="absolute inset-0 rounded-full bg-amber-100 animate-ping opacity-75" />
                <div className="w-20 h-20 rounded-full bg-amber-50 border-4 border-amber-300 flex items-center justify-center relative z-10 shadow-inner">
                  <Trophy className="w-10 h-10 text-amber-500 animate-bounce" />
                </div>
              </div>

              {/* Header text */}
              <h3 className="text-xl font-extrabold text-amber-950 uppercase tracking-widest mb-2">
                {language === "en" ? "Target Reached!" : "Đã Chạm Mục Tiêu!"}
              </h3>
              
              <div className="bg-amber-50 border border-amber-100 rounded-2xl px-5 py-3 mb-6 w-full">
                <span className="block text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-1">
                  {language === "en" ? "Format: Target Shots Touch" : "Thể thức: Bắn chạm X viên"}
                </span>
                <span className="text-3xl font-black text-amber-600 block leading-none">
                  {touchAnnouncement.target} {language === "en" ? "Shots" : "Viên"}
                </span>
              </div>

              {/* Athlete Name Display with display style typography */}
              <div className="mb-8">
                <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1.5">
                  {language === "en" ? "Athlete Accomplished" : "Vận động viên đạt mốc"}
                </p>
                <h4 className="text-2xl font-black text-gray-900 leading-tight">
                  {touchAnnouncement.name}
                </h4>
              </div>

              {/* Dismiss Action Button */}
              <button
                type="button"
                onClick={() => setTouchAnnouncement(null)}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg hover:shadow-xl transition-all cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0 text-sm tracking-wider uppercase"
              >
                {language === "en" ? "Continue Match" : "Tiếp tục trận đấu"}
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}

      {/* ========================================================= */}
      {/* ✍️ SIGNATURE / LOCK SCORE CONFIRMATION MODAL               */}
      {/* ========================================================= */}
      {isSignConfirmModalOpen && activeArenaChallenge && typeof document !== "undefined" && (() => {
        const winMechanism = activeArenaChallenge.winMechanism || "by_sets";
        const isBySets = winMechanism === "by_sets";
        const isByTotal = winMechanism === "by_total_points";
        const isByTarget = winMechanism === "by_target_shots";

        let chScoreDisplay = 0;
        let opScoreDisplay = 0;

        if (isBySets) {
          const len = Math.max(challengerScoresInput.length, opponentScoresInput.length);
          for (let i = 0; i < len; i++) {
            const chS = Number(challengerScoresInput[i]) || 0;
            const opS = Number(opponentScoresInput[i]) || 0;
            if (chS > opS) chScoreDisplay++;
            else if (opS > chS) opScoreDisplay++;
          }
        } else {
          chScoreDisplay = challengerScoresInput.reduce((a, b) => Number(a) + Number(b), 0);
          opScoreDisplay = opponentScoresInput.reduce((a, b) => Number(a) + Number(b), 0);
        }

        return createPortal(
          <div className="fixed inset-0 z-[100001] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-100"
            >
              {/* Modal Header */}
              <div className="bg-green-700 text-white px-6 py-5 flex items-center justify-between">
                <h3 className="font-bold text-base flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-200 shrink-0" />
                  <span>{language === "en" ? "Sign & Lock Scoreboard" : "Ký Xác Nhận Tỉ Số"}</span>
                </h3>
                <button 
                  onClick={() => setIsSignConfirmModalOpen(false)}
                  className="text-white/80 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
                <div className="text-center">
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {language === "en" 
                      ? "Please review the scoreboard. Once you sign and confirm, you CANNOT modify any scores or shot ticks anymore." 
                      : "Vui lòng kiểm tra kỹ điểm số trước khi ký. Sau khi ký xác nhận, hệ thống sẽ KHÓA toàn bộ bảng điểm của bạn và không cho phép chỉnh sửa hay tích trúng trượt nữa."}
                  </p>
                </div>

                {/* Match Score Summary Card */}
                <div className="bg-gray-50 rounded-2xl p-5 border border-gray-150 space-y-4">
                  <div className="text-center text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    {language === "en" ? "CALCULATED SCORE SUMMARY" : "KẾT QUẢ TÍNH TOÁN TỈ SỐ"}
                  </div>
                  
                  <div className="flex items-stretch justify-between gap-4">
                    {/* Challenger Column */}
                    <div className="flex-1 text-center bg-white p-3 rounded-xl border border-gray-100 flex flex-col justify-between">
                      <div>
                        <span className="block text-xs font-bold text-gray-700 truncate mb-1">
                          {activeArenaChallenge.challengerName}
                        </span>
                        <span className="text-3xl font-black text-rose-600 block leading-none">
                          {chScoreDisplay}
                        </span>
                      </div>
                      
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        {isBySets ? (
                          <span className="inline-block px-2 py-0.5 rounded-md bg-rose-50 text-[10px] font-bold text-rose-700 uppercase">
                            {language === "en" ? "Sets Won" : "Hiệp Thắng"}
                          </span>
                        ) : isByTotal ? (
                          <span className="inline-block px-2 py-0.5 rounded-md bg-indigo-50 text-[10px] font-bold text-indigo-700 uppercase">
                            {language === "en" ? "Total Pts" : "Tổng Điểm"}
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-md bg-amber-50 text-[10px] font-bold text-amber-700 uppercase">
                            {language === "en" ? "Hits" : "Số Chạm"}
                          </span>
                        )}
                        {isBySets && (
                          <span className="block text-[10px] text-gray-400 font-medium mt-1">
                            {language === "en" ? "Total pts: " : "Tổng điểm: "}
                            {challengerScoresInput.reduce((a, b) => Number(a) + Number(b), 0)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* VS Center Divider */}
                    <div className="flex flex-col items-center justify-center text-gray-300 font-bold text-xs shrink-0 uppercase tracking-widest px-1">
                      <div className="h-4 w-px bg-gray-200 mb-1"></div>
                      <span>VS</span>
                      <div className="h-4 w-px bg-gray-200 mt-1"></div>
                    </div>

                    {/* Opponent Column */}
                    <div className="flex-1 text-center bg-white p-3 rounded-xl border border-gray-100 flex flex-col justify-between">
                      <div>
                        <span className="block text-xs font-bold text-gray-700 truncate mb-1">
                          {activeArenaChallenge.opponentName || (language === "en" ? "Opponent" : "Đối thủ")}
                        </span>
                        <span className="text-3xl font-black text-indigo-600 block leading-none">
                          {opScoreDisplay}
                        </span>
                      </div>

                      <div className="mt-2 pt-2 border-t border-gray-100">
                        {isBySets ? (
                          <span className="inline-block px-2 py-0.5 rounded-md bg-rose-50 text-[10px] font-bold text-rose-700 uppercase">
                            {language === "en" ? "Sets Won" : "Hiệp Thắng"}
                          </span>
                        ) : isByTotal ? (
                          <span className="inline-block px-2 py-0.5 rounded-md bg-indigo-50 text-[10px] font-bold text-indigo-700 uppercase">
                            {language === "en" ? "Total Pts" : "Tổng Điểm"}
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-md bg-amber-50 text-[10px] font-bold text-amber-700 uppercase">
                            {language === "en" ? "Hits" : "Số Chạm"}
                          </span>
                        )}
                        {isBySets && (
                          <span className="block text-[10px] text-gray-400 font-medium mt-1">
                            {language === "en" ? "Total pts: " : "Tổng điểm: "}
                            {opponentScoresInput.reduce((a, b) => Number(a) + Number(b), 0)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Format details bar */}
                  <div className="border-t border-gray-200/60 pt-3 text-center text-xs text-gray-500">
                    <span className="font-semibold uppercase text-gray-400 text-[10px] block mb-0.5">
                      {language === "en" ? "Selected Format" : "Thể thức trận đấu"}
                    </span>
                    <span className="font-bold text-gray-700">
                      {winMechanism === "by_sets" 
                        ? (language === "en" ? "🏆 Set-by-Set format (Highest won sets wins)" : "🏆 Đấu theo Hiệp (Đại diện nào thắng nhiều hiệp hơn sẽ thắng)")
                        : winMechanism === "by_total_points"
                        ? (language === "en" ? "🎯 Cumulative Points format (Sum of scores across all sets)" : "🎯 Đấu Cộng Tổng Điểm (Cộng dồn điểm số của tất cả các hiệp)")
                        : (language === "en" ? `🎯 Target Shots format (First to ${activeArenaChallenge.targetTouchShots} Hits)` : `🎯 Đấu Bắn Chạm (Đấu thủ chạm mốc ${activeArenaChallenge.targetTouchShots} viên trước sẽ thắng)`)}
                    </span>
                  </div>
                </div>

                {/* Detailed Set Breakdown List */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">
                    {language === "en" ? "Set Details Breakdown" : "Chi tiết điểm số từng hiệp"}
                  </div>
                  <div className="bg-white border border-gray-150 rounded-xl divide-y divide-gray-100 overflow-hidden max-h-40 overflow-y-auto">
                    {Array.from({ length: Math.max(challengerScoresInput.length, opponentScoresInput.length) }).map((_, idx) => {
                      const chS = Number(challengerScoresInput[idx]) || 0;
                      const opS = Number(opponentScoresInput[idx]) || 0;
                      let winnerLabel = "";
                      if (chS > opS) {
                        winnerLabel = `🏆 ${activeArenaChallenge.challengerName}`;
                      } else if (opS > chS) {
                        winnerLabel = `🏆 ${activeArenaChallenge.opponentName || (language === "en" ? "Opponent" : "Đối thủ")}`;
                      } else {
                        winnerLabel = language === "en" ? "Draw" : "Hòa";
                      }

                      return (
                        <div key={idx} className="p-3 flex items-center justify-between text-xs gap-2 hover:bg-gray-50/50">
                          <span className="font-bold text-gray-400">H{idx + 1}</span>
                          <div className="flex items-center gap-1.5 font-semibold text-gray-800">
                            <span className={chS > opS ? "text-indigo-600 font-black" : ""}>{chS}</span>
                            <span className="text-gray-300">-</span>
                            <span className={opS > chS ? "text-indigo-600 font-black" : ""}>{opS}</span>
                          </div>
                          <span className="text-[10px] text-gray-500 font-medium truncate max-w-[150px]">
                            {winnerLabel}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Directives Checklist */}
                <div className="space-y-2 text-xs text-gray-600 bg-amber-50/60 border border-amber-100 rounded-xl p-3">
                  <div className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-green-600 mt-0.5 shrink-0" />
                    <span>{language === "en" ? "Accuracy of all sets verified" : "Xác nhận điểm số các hiệp chính xác"}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-green-600 mt-0.5 shrink-0" />
                    <span>{language === "en" ? "Recalculate ELO on final signature match" : "Cập nhật bảng xếp hạng ELO sau khi khớp"}</span>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsSignConfirmModalOpen(false)}
                  className="w-full sm:w-auto border border-gray-200 hover:bg-gray-100 text-gray-700 text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer transition-colors text-center"
                >
                  {language === "en" ? "Cancel" : "Quay lại kiểm tra"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsSignConfirmModalOpen(false);
                    handleUpdateScores(true);
                  }}
                  className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md cursor-pointer transition-colors text-center"
                >
                  {language === "en" ? "Agree & Sign ✍️" : "Đồng ý Ký & Khóa kết quả ✍️"}
                </button>
              </div>
            </motion.div>
          </div>,
          document.body
        );
      })()}

      {/* Athlete System Profile Details Modal */}
      <AthleteProfileModal
        isOpen={selectedProfileAthlete !== null}
        onClose={() => setSelectedProfileAthlete(null)}
        athlete={selectedProfileAthlete}
        history={[]}
        onlineTournaments={onlineTournaments}
        currentUser={currentUser}
        isGlobalAdmin={false}
        language={language}
      />

      {/* Custom Accept Modal */}
      {activeAcceptChallenge && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center overflow-y-auto bg-slate-950/65 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-100 dark:border-slate-800 shadow-2xl text-slate-800 dark:text-slate-101 my-auto">
            <div className="flex items-center gap-2 border-b border-gray-150 dark:border-slate-800 pb-3 mb-4">
              <Sword className="w-5 h-5 text-rose-500 animate-pulse" />
              <h3 className="font-black text-sm uppercase tracking-wide">
                {activeAcceptChallenge.pin ? "Nhận Kèo Phòng Mật Khẩu" : "Xác Nhận Nhận Kèo PK"}
              </h3>
            </div>

            {activeAcceptChallenge.pin ? (
              <div className="space-y-4">
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-semibold">
                  Kèo đấu này được bảo vệ bằng mã PIN bảo mật. Vui lòng nhập mật khẩu phòng đấu để tham gia trực tiếp:
                </p>
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Mã PIN Phòng</label>
                  <input
                    type="password"
                    placeholder="••••••"
                    value={acceptPinInput}
                    onChange={(e) => {
                      setAcceptPinInput(e.target.value);
                      setAcceptError("");
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-rose-400 font-extrabold text-center tracking-widest text-slate-900 dark:text-white"
                  />
                </div>
                {acceptError && (
                  <p className="text-[10px] text-rose-500 font-bold text-center">{acceptError}</p>
                )}
                <div className="flex gap-3 justify-end mt-4">
                  <button
                    type="button"
                    onClick={() => { setActiveAcceptChallenge(null); setAcceptPinInput(""); setAcceptError(""); }}
                    className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    onClick={() => handleImmediateJoinWithPin(activeAcceptChallenge)}
                    disabled={actionLoading}
                    className="px-4 py-2 text-xs font-bold bg-green-600 hover:bg-green-700 text-white rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {actionLoading ? "Đang xử lý..." : "Xác nhận & Vào kèo"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-slate-650 leading-relaxed font-semibold">
                  Bạn có chắc chắn muốn nhận kèo đấu này của <strong className="text-slate-900 dark:text-white">"{activeAcceptChallenge.challengerName}"</strong> không?
                </p>
                <div className="bg-slate-50 dark:bg-slate-950/20 p-3 rounded-xl border border-slate-200/50 dark:border-slate-800/50 text-[11px] text-slate-500 space-y-1">
                  <div>Địa điểm: <strong className="text-slate-700 dark:text-slate-300">{activeAcceptChallenge.location}</strong></div>
                  <div>Cự ly: <strong className="text-slate-700 dark:text-slate-300">{activeAcceptChallenge.distance}m</strong></div>
                  <div>Quy cách: <strong className="text-slate-700 dark:text-slate-300">{activeAcceptChallenge.setsCount} hiệp - {activeAcceptChallenge.shotsPerSet} viên</strong></div>
                </div>
                <p className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-2.5 rounded-lg border border-amber-100 dark:border-amber-900">
                  ℹ️ Vì phòng không có mật khẩu bảo mật, yêu cầu của bạn sẽ được gửi tới Chủ kèo. Bạn vui lòng chờ duyệt kèo nếu được chấp nhận mới chính thức thi đấu.
                </p>
                <div className="flex gap-3 justify-end mt-4">
                  <button
                    type="button"
                    onClick={() => { setActiveAcceptChallenge(null); }}
                    className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRequestJoinWithoutPin(activeAcceptChallenge)}
                    disabled={actionLoading}
                    className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {actionLoading ? "Đang xử lý..." : "Xác nhận gửi yêu cầu"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Live Challenger "Modal nổ" Popup Notification */}
      {newApplicantNotification && createPortal(
        <div className="fixed inset-0 z-[10030] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-rose-100 dark:border-rose-950/50 shadow-2xl text-slate-800 dark:text-slate-101 text-center animate-bounceIn relative overflow-hidden">
            {/* Top flashing decoration */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-500 animate-pulse" />

            <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center mx-auto mb-4 border border-rose-100 dark:border-rose-900 shadow-sm animate-pulse">
              <Sword className="w-8 h-8 rotate-45" />
            </div>

            <h3 className="font-black text-base uppercase text-rose-600 tracking-wide mb-1">
              ⚡ ĐÃ CÓ YÊU CẦU ỨNG TUYỂN MỚI!
            </h3>
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-4 truncate">
              {newApplicantNotification.challenge.title}
            </p>

            {newApplicantNotification.applicants.length > 1 ? (
              <div className="max-h-48 overflow-y-auto space-y-2 mb-5 pr-1 text-left">
                {newApplicantNotification.applicants.map((app: any, idx: number) => {
                  const resolvedAvatar = getLatestAvatar(app.name, app.avatar, systemAthletes, systemClubs);
                  return (
                    <div key={idx} className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/60">
                      <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 bg-slate-100 border border-rose-100 flex items-center justify-center">
                        {resolvedAvatar ? (
                          <img src={resolvedAvatar} alt={app.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <User className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-xs text-slate-900 dark:text-white truncate">{app.name}</div>
                        <div className="text-[10px] text-rose-500 font-bold">{language === "en" ? "Wants to Join" : "Yêu cầu ứng tuyển"}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center bg-slate-50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60 mb-5">
                <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-rose-100 shrink-0 mb-2 shadow-sm bg-slate-100 flex items-center justify-center">
                  {(() => {
                    const firstApp = newApplicantNotification.applicants[0];
                    const resolvedAvatar = firstApp ? getLatestAvatar(firstApp.name, firstApp.avatar, systemAthletes, systemClubs) : "";
                    return resolvedAvatar ? (
                      <img src={resolvedAvatar} alt={firstApp?.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <User className="w-6 h-6 text-gray-400" />
                    );
                  })()}
                </div>
                <span className="font-black text-sm text-slate-900 dark:text-white">
                  {newApplicantNotification.applicants[0]?.name}
                </span>
                <span className="text-[9px] font-bold text-slate-400 italic mt-0.5">
                  Vừa gửi yêu cầu nhận kèo thách đấu của bạn
                </span>
              </div>
            )}

            <div className="flex gap-2 justify-center">
              <button
                type="button"
                onClick={() => setNewApplicantNotification(null)}
                className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
              >
                Bỏ qua
              </button>
              <button
                type="button"
                onClick={() => {
                  setNewApplicantNotification(null);
                  setActiveSubTab("dashboard"); // Bring them to dashboard control panel
                }}
                className="px-5 py-2.5 text-xs font-black bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <span>Xem và Duyệt ngay</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Live Applicant "Modal nổ" Rejection Notification */}
      {rejectionNotification && createPortal(
        <div className="fixed inset-0 z-[10030] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-amber-100 dark:border-amber-950/50 shadow-2xl text-slate-800 dark:text-slate-101 text-center animate-bounceIn relative overflow-hidden">
            {/* Top flashing decoration */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500 animate-pulse" />

            <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-100 dark:border-amber-900 shadow-sm animate-pulse">
              <AlertCircle className="w-8 h-8" />
            </div>

            <h3 className="font-black text-base uppercase text-amber-600 tracking-wide mb-1">
              ⚡ KÈO ĐẤU BỊ TỪ CHỐI
            </h3>
            {rejectionNotification.items ? (
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-4 truncate">
                {rejectionNotification.items[0]?.challengeTitle}
              </p>
            ) : null}

            {rejectionNotification.items && rejectionNotification.items.length > 1 ? (
              <div className="max-h-48 overflow-y-auto space-y-2 mb-5 pr-1 text-left">
                {rejectionNotification.items.map((item, idx) => (
                  <div key={idx} className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800/60 flex flex-col">
                    <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider truncate">
                      {item.challengeTitle}
                    </span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white mt-1">
                      Chủ kèo: {item.challengerName}
                    </span>
                  </div>
                ))}
                <p className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-2.5 rounded-lg border border-amber-100 dark:border-amber-900 mt-2 text-center leading-normal">
                  {language === "en"
                    ? "These challenges have been cancelled or the challengers matched with other opponents."
                    : "Các kèo đấu này đã bị hủy hoặc chủ kèo đã duyệt đối thủ khác."}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center bg-slate-50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60 mb-5">
                <span className="font-black text-sm text-slate-900 dark:text-white">
                  {rejectionNotification.items ? rejectionNotification.items[0]?.challengerName : ""}
                </span>
                <span className="text-[10px] font-bold text-slate-500 text-center mt-2 leading-relaxed">
                  {language === "en" 
                    ? "The challenger has declined your application or matched with another player for this challenge." 
                    : "Chủ kèo đã từ chối yêu cầu ứng tuyển của bạn hoặc đã duyệt đối thủ khác."}
                </span>
              </div>
            )}

            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setRejectionNotification(null)}
                className="px-6 py-2.5 text-xs font-black bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <span>{language === "en" ? "Close" : "Đã hiểu"}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Live Applicant "Modal nổ" Approval Notification */}
      {approvedNotification && createPortal(
        <div className="fixed inset-0 z-[10030] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-emerald-100 dark:border-emerald-950/50 shadow-2xl text-slate-800 dark:text-slate-101 text-center animate-bounceIn relative overflow-hidden">
            {/* Top flashing decoration */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500 animate-pulse" />

            <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-100 dark:border-emerald-900 shadow-sm animate-pulse">
              <CheckCircle className="w-8 h-8" />
            </div>

            <h3 className="font-black text-base uppercase text-emerald-600 tracking-wide mb-1">
              🎉 KÈO ĐẤU ĐÃ ĐƯỢC DUYỆT!
            </h3>

            {approvedNotification.items.length > 1 ? (
              <div className="max-h-48 overflow-y-auto space-y-2 mb-5 pr-1 text-left">
                {approvedNotification.items.map((item, idx) => (
                  <div key={idx} className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800/60 flex flex-col">
                    <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider truncate">
                      {item.challengeTitle}
                    </span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white mt-1">
                      Chủ kèo: {item.challengerName}
                    </span>
                  </div>
                ))}
                <p className="text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900 mt-2 text-center leading-normal">
                  {language === "en"
                    ? "You have been approved! Please coordinate the match details."
                    : "Bạn đã được phê duyệt làm đối thủ! Hãy liên hệ chủ kèo sắp xếp thời gian thi đấu nhé."}
                </p>
              </div>
            ) : (
              <>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-4 truncate">
                  {approvedNotification.items[0]?.challengeTitle}
                </p>
                <div className="flex flex-col items-center bg-slate-50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60 mb-5">
                  <span className="font-black text-sm text-slate-900 dark:text-white">
                    {approvedNotification.items[0]?.challengerName}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600 text-center mt-2 leading-relaxed">
                    {language === "en" 
                      ? "Congratulations! The challenger has approved your application. Please connect to arrange the match time." 
                      : "Chúc mừng! Chủ kèo đã phê duyệt yêu cầu của bạn. Hãy liên hệ và sắp xếp thời gian thi đấu."}
                  </span>
                </div>
              </>
            )}

            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setApprovedNotification(null)}
                className="px-6 py-2.5 text-xs font-black bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <span>{language === "en" ? "Close" : "Tuyệt vời"}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Reusable Club Hub Modal */}
      {selectedClubHub && (
        <VscSystemClubsDirectory
          currentUser={currentUser}
          userRole={currentUser?.uid === selectedClubHub.creatorUid ? "admin" : "user"}
          history={[]}
          onlineTournaments={onlineTournaments}
          onOpenAuthModal={onOpenAuthModal}
          externalSelectedClub={selectedClubHub}
          onCloseExternalSelectedClub={() => setSelectedClubHub(null)}
          hideDirectoryList={true}
        />
      )}

    </div>
  );
};
