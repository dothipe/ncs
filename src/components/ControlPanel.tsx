import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { 
  subscribeToTournamentsList, 
  deleteOnlineTournament,
  createOnlineTournament,
  getUserProfile,
  updateUserProfile,
  getVscSystemAthletes,
  saveVscSystemAthletes,
  TournamentData,
  createSystemClub,
  requestToJoinClub,
  cancelJoinRequest,
  handleClubJoinRequest,
  leaveClub,
  kickClubMember,
  addClubMemberDirectly,
  transferClubLeadership,
  updateClubProfile,
  getUserProfileByEmail
} from "../lib/firebaseService";
import { auth, db, collection, query, orderBy, onSnapshot, doc, deleteDoc, updateDoc, addDoc } from "../firebase";
import { motion } from "motion/react";
import { VIETNAM_PROVINCES } from "../utils/provinces";
import { 
  Activity,
  Trophy, 
  Users, 
  Calendar, 
  Search, 
  User, 
  Award, 
  Trash2, 
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Sliders,
  LogIn,
  SlidersHorizontal,
  Inbox,
  AlertTriangle,
  UserCheck,
  CreditCard,
  MapPin,
  Building,
  Image as ImageIcon,
  Save,
  CheckCircle,
  HelpCircle,
  Clock,
  Copy,
  RefreshCw,
  Plus,
  LogOut,
  Sword,
  X,
  Key,
  Target,
  Tv,
  Video,
  ExternalLink
} from "lucide-react";
import { Athlete, DistanceConfig, SystemClub, PKChallenge, TrainingSession } from "../types";
import { getHitCount } from "../utils/qualification";
import { useLanguage } from "../context/LanguageContext";
import { Club } from "../types";
import { VscSystemClubsDirectory } from "./VscSystemClubsDirectory";
import TrainingTracker from "./TrainingTracker";

interface ControlPanelProps {
  isGlobalAdmin?: boolean;
  onSelectTournament: (id: string, tournament: TournamentData) => void;
  activeHistoryId: string | null;
  onOpenAuthModal: () => void;
  forceSubTab?: "profile" | "club" | "created" | "referee" | "pk_challenges" | "training";
  systemClubs?: SystemClub[];
  vscSystemAthletes?: Athlete[];
  onlineTournaments?: TournamentData[];
  onChangeActiveTab?: (tab: "home" | "desktop" | "dashboard" | "scoring" | "input_scores" | "leaderboard" | "teams" | "athletes" | "settings" | "history" | "control_panel" | "qltv" | "vsc_system_directory" | "vsc_clubs_directory" | "pk_lobby") => void;
  onSelectPkChallenge?: (id: string, subTab?: "dashboard" | "lobby" | "leaderboard" | "history") => void;
  onEditPkChallenge?: (id: string) => void;
  onViewClubHub?: (club: SystemClub) => void;
}

export const resolveTournamentType = (tour: TournamentData): "individual" | "team" | "combined" => {
  if (tour.tournamentType) return tour.tournamentType;
  if (tour.competitionMode === "team") return "team";
  if (tour.competitionMode === "individual") {
    if ((tour.teamDistances && tour.teamDistances.length > 0) || (tour.teamAthletes && tour.teamAthletes.length > 0)) {
      return "combined";
    }
    return "individual";
  }
  return "combined";
};

const getTournamentModeLabel = (tour: TournamentData, lang: "vi" | "en" = "vi"): string => {
  const mode = resolveTournamentType(tour);
  if (mode === "combined") {
    return lang === "en" ? "Individual & Team (Combined)" : "Cá Nhân & Đồng Đội (Kết hợp)";
  } else if (mode === "team") {
    return lang === "en" ? "Team Standings" : "Đồng Đội";
  } else {
    return lang === "en" ? "Individual" : "Cá Nhân";
  }
};

export const getClubStats = (club: SystemClub, tournamentsList: any[]) => {
  let totalShots = 0;
  let totalHits = 0;
  let podiums = 0;

  const memberEmails = new Set(club.members?.map(m => m.email?.toLowerCase().trim()).filter(Boolean) || []);
  const memberAthleteIds = new Set(club.members?.map(m => m.athleteId?.toLowerCase().trim()).filter(Boolean) || []);

  tournamentsList.forEach(tour => {
    // To avoid double counting the same athlete (e.g. if present in both tour.athletes and tour.masterAthletes)
    const uniqueAthletesMap = new Map<string, any>();
    
    // We process masterAthletes first, then overwrite/prefer inputAthletes and athletes which are the active ones with scores
    const candidateAthletes = [
      ...(tour.masterAthletes || []),
      ...(tour.inputAthletes || []),
      ...(tour.athletes || [])
    ];
    
    candidateAthletes.forEach(ath => {
      if (!ath) return;
      const idKey = ath.id ? ath.id.trim().toLowerCase() : "";
      const emailKey = ath.email ? ath.email.trim().toLowerCase() : "";
      const key = idKey || emailKey || (ath.name ? ath.name.trim().toLowerCase() : "");
      if (!key) return;
      
      const existing = uniqueAthletesMap.get(key);
      if (!existing) {
        uniqueAthletesMap.set(key, ath);
      } else {
        const existingScoreCount = existing.scores ? Object.keys(existing.scores).length : 0;
        const currentScoreCount = ath.scores ? Object.keys(ath.scores).length : 0;
        if (currentScoreCount >= existingScoreCount) {
          uniqueAthletesMap.set(key, ath);
        }
      }
    });
    
    const allAthletes = Array.from(uniqueAthletesMap.values());

    const tournamentMembers = allAthletes.filter(ath => {
      const emailMatch = ath.email && memberEmails.has(ath.email.toLowerCase().trim());
      const idMatch = ath.id && memberAthleteIds.has(ath.id.toLowerCase().trim());
      return emailMatch || idMatch;
    });

    tournamentMembers.forEach(ath => {
      const distances = tour.distances || [];
      distances.forEach((dist: any) => {
        const hits = ath.scores?.[dist.id] || [];
        const wasShot = Array.isArray(hits) && hits.length > 0 && hits.some(v => v !== null && v !== undefined);
        
        if (wasShot) {
          const hitCount = getHitCount(hits);
          const shotsCount = tour.shotsCount || 10;
          const isPointMode = shotsCount === 1 && tour.directMaxPoints !== undefined && tour.directMaxPoints > 0;
          
          let distShots = shotsCount;
          let distHits = hitCount;
          
          if (isPointMode) {
            const mult = dist.multiplier || 1;
            distShots = (tour.directMaxPoints || 1) * mult;
            distHits = hitCount * mult;
          }
          
          totalShots += distShots;
          totalHits += distHits;
        }
      });
    });

    if (tour.distances && tour.distances.length > 0) {
      const activeAthletes = allAthletes.filter(a => a.status !== "Bỏ thi");
      const standings = activeAthletes.map(athlete => {
        let totalScore = 0;
        tour.distances.forEach((dist: any) => {
          const hits = athlete.scores?.[dist.id] || [];
          const hitCount = getHitCount(hits);
          totalScore += hitCount * dist.multiplier;
        });
        return { ...athlete, totalScore };
      }).sort((a, b) => b.totalScore - a.totalScore);

      standings.slice(0, Math.min(3, standings.length)).forEach(ath => {
        const isMember = (ath.email && memberEmails.has(ath.email.toLowerCase().trim())) ||
                         (ath.id && memberAthleteIds.has(ath.id.toLowerCase().trim()));
        if (isMember) {
          podiums++;
        }
      });
    }

    const teamsList = tour.teamAthletes || [];
    if (teamsList.length > 0) {
      const teamStandings = [...teamsList].sort((a, b) => {
        const scoreA = typeof a.score === "number" ? a.score : 0;
        const scoreB = typeof b.score === "number" ? b.score : 0;
        return scoreB - scoreA;
      });

      teamStandings.slice(0, Math.min(3, teamStandings.length)).forEach(team => {
        if (team.name && team.name.toLowerCase().trim() === club.name.toLowerCase().trim()) {
          podiums++;
        }
      });
    }
  });

  const hitRate = totalShots > 0 ? (totalHits / totalShots) * 100 : 0;

  return {
    totalShots,
    totalHits,
    hitRate,
    podiums
  };
};

export const ControlPanel: React.FC<ControlPanelProps> = ({
  isGlobalAdmin,
  onSelectTournament,
  activeHistoryId,
  onOpenAuthModal,
  forceSubTab,
  systemClubs = [],
  vscSystemAthletes = [],
  onlineTournaments = [],
  onChangeActiveTab,
  onSelectPkChallenge,
  onEditPkChallenge,
  onViewClubHub
}) => {
  const { language } = useLanguage();
  const [tournaments, setTournaments] = useState<TournamentData[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  const [showConfirmDeleteId, setShowConfirmDeleteId] = useState<string | null>(null);

  // PK Challenge Modals States
  const [selectedDetailChallenge, setSelectedDetailChallenge] = useState<PKChallenge | null>(null);
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
  const [actionLoading, setActionLoading] = useState(false);

  // States for 2-step confirmation to cancel a challenge
  const [cancelChallengeId, setCancelChallengeId] = useState<string | null>(null);
  const [cancelStep, setCancelStep] = useState<number>(0); // 0 = closed, 1 = first confirm, 2 = second confirm

  // State for Club Hub Modal
  const [selectedClubHub, setSelectedClubHub] = useState<SystemClub | null>(null);

  // States for Video Links Update Modal
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [videoTargetChallenge, setVideoTargetChallenge] = useState<PKChallenge | null>(null);
  const [videoChallengerUrl, setVideoChallengerUrl] = useState("");
  const [videoOpponentUrl, setVideoOpponentUrl] = useState("");
  const [videoSaving, setVideoSaving] = useState(false);

  const openUpdateVideoModal = (challenge: PKChallenge) => {
    setVideoTargetChallenge(challenge);
    setVideoChallengerUrl(challenge.challengerLiveUrl || "");
    setVideoOpponentUrl(challenge.opponentLiveUrl || "");
    setIsVideoModalOpen(true);
  };

  const handleUpdateVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoTargetChallenge) return;
    setVideoSaving(true);
    try {
      const challengeRef = doc(db, "pk_challenges", videoTargetChallenge.id);
      await updateDoc(challengeRef, {
        challengerLiveUrl: videoChallengerUrl.trim() || null,
        opponentLiveUrl: videoOpponentUrl.trim() || null
      });

      if (selectedDetailChallenge && selectedDetailChallenge.id === videoTargetChallenge.id) {
        setSelectedDetailChallenge({
          ...selectedDetailChallenge,
          challengerLiveUrl: videoChallengerUrl.trim() || null,
          opponentLiveUrl: videoOpponentUrl.trim() || null
        });
      }

      setIsVideoModalOpen(false);
      setVideoTargetChallenge(null);
    } catch (err) {
      console.error("Error updating video URLs:", err);
      alert(language === "en" ? "Failed to update video links. Please try again." : "Không thể cập nhật liên kết video. Vui lòng thử lại.");
    } finally {
      setVideoSaving(false);
    }
  };

  const loggedInAthlete = useMemo(() => {
    if (!currentUser || !vscSystemAthletes) return null;
    const myEmail = currentUser.email?.toLowerCase().trim();
    return vscSystemAthletes.find(a => a.email && a.email.toLowerCase().trim() === myEmail) || null;
  }, [currentUser, vscSystemAthletes]);

  const loggedInClubs = useMemo(() => {
    if (!currentUser || !systemClubs) return [];
    return systemClubs.filter(club => {
      if (club.creatorUid === currentUser.uid) return true;
      const members = club.members || [];
      return members.some(m => m.uid === currentUser.uid);
    });
  }, [currentUser, systemClubs]);

  const getPlayerClubName = (name: string) => {
    const directClub = systemClubs.find(c => c.name?.trim().toLowerCase() === name.trim().toLowerCase());
    if (directClub) return directClub.name;

    const ath = vscSystemAthletes.find(a => a.name?.trim().toLowerCase() === name.trim().toLowerCase());
    if (ath && ath.clubName) return ath.clubName;

    return null;
  };

  const handleClubClick = (clubName: string) => {
    const matchingClub = systemClubs.find(c => c.name?.trim().toLowerCase() === clubName.trim().toLowerCase());
    if (matchingClub) {
      if (onViewClubHub) onViewClubHub(matchingClub);
      else setSelectedClubHub(matchingClub);
    }
  };

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

  const handleEditWinMechanismChange = (val: "by_sets" | "by_total_points" | "by_target_shots") => {
    setEditWinMechanism(val);
    if (val === "by_target_shots") {
      setEditSetsCountOption("1");
      setEditSetsCountCustom("1");
      setEditTargetTouchShots(5);
      setEditShotsPerSet(20);
      setEditRules(language === "en" ? `Target Shots (First to reach 5 hits wins)` : `Bắn chạm 5 viên`);
    } else {
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

  const handleEditTargetTouchShotsChange = (val: number) => {
    setEditTargetTouchShots(val);
    setEditRules(language === "en" ? `Target Shots (First to reach ${val} hits wins)` : `Bắn chạm ${val} viên`);
  };

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
    
    const matchingClub = systemClubs.find(c => c.name === challenge.opponentName);
    setEditDesignatedOpponentClubId(matchingClub?.id || "");

    const matchingAthlete = vscSystemAthletes.find(a => a.name === challenge.challengerName);
    setEditSelectedAthleteId(matchingAthlete?.id || loggedInAthlete?.id || (vscSystemAthletes[0] ? vscSystemAthletes[0].id : ""));
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
        const linkedAth = vscSystemAthletes.find(a => a.id === editSelectedAthleteId);
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
          const linkedAth = vscSystemAthletes.find(a => a.id === editDesignatedOpponentAthleteId);
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
  
  // State for Copy Tournament Modal
  const [copyModalTour, setCopyModalTour] = useState<TournamentData | null>(null);
  const [copyMatchName, setCopyMatchName] = useState("");
  const [isCopying, setIsCopying] = useState(false);

  const handleOpenCopyModal = (tour: TournamentData) => {
    setCopyModalTour(tour);
    setCopyMatchName(`${tour.matchName} (Bản sao)`);
  };

  const handleConfirmCopy = async () => {
    if (!copyModalTour || !currentUser) return;
    if (!copyMatchName.trim()) {
      alert(language === "en" ? "Please enter a new tournament name!" : "Vui lòng nhập tên giải đấu mới!");
      return;
    }
    setIsCopying(true);
    try {
      const cleanAthleteScores = (ath: Athlete): Athlete => ({
        ...ath,
        scores: {},
        soloHits: {},
        soloRounds: {},
        calledBy: "",
      });

      const mapCleanUniqueAthletes = (...lists: (Athlete[] | undefined)[]): Athlete[] => {
        const map = new Map<string, Athlete>();
        lists.forEach(list => {
          (list || []).forEach(ath => {
            if (ath && ath.id && !map.has(ath.id)) {
              map.set(ath.id, cleanAthleteScores(ath));
            }
          });
        });
        return Array.from(map.values());
      };

      const allMasterAthletes = mapCleanUniqueAthletes(
        copyModalTour.masterAthletes,
        copyModalTour.inputAthletes,
        copyModalTour.athletes,
        copyModalTour.teamInputAthletes,
        copyModalTour.teamAthletes
      );

      const newTourId = await createOnlineTournament(
        copyMatchName.trim(),
        currentUser.uid,
        currentUser.email || "",
        {
          competitionMode: copyModalTour.competitionMode || "individual",
          tournamentType: copyModalTour.tournamentType || "individual",
          shotsCount: copyModalTour.shotsCount || 10,
          teamShotsCount: copyModalTour.teamShotsCount || 10,
          laneCapacity: copyModalTour.laneCapacity,
          directMaxPoints: copyModalTour.directMaxPoints,
          teamDirectMaxPoints: copyModalTour.teamDirectMaxPoints,
          directMaxShots: copyModalTour.directMaxShots,
          teamDirectMaxShots: copyModalTour.teamDirectMaxShots,
          distances: copyModalTour.distances || [],
          teamDistances: copyModalTour.teamDistances || [],
          athletes: [], // Clean individual recorded scores
          teamAthletes: [], // Clean team recorded scores
          inputAthletes: [], // Empty draft scoring grid
          teamInputAthletes: [], // Empty draft team scoring grid
          masterAthletes: allMasterAthletes,
          clubs: copyModalTour.clubs || [],
          avatarUrl: copyModalTour.avatarUrl,
          bannerUrl: copyModalTour.bannerUrl,
          referees: copyModalTour.referees || [],
          subAdmins: copyModalTour.subAdmins || [],
          startDate: copyModalTour.startDate,
          endDate: copyModalTour.endDate,
        }
      );

      alert(language === "en" ? `Successfully copied new tournament "${copyMatchName.trim()}"! All previous scores have been cleared, while configuration and athlete roster are preserved.` : `Đã copy thành công giải đấu mới "${copyMatchName.trim()}"! Toàn bộ điểm số cũ đã được xóa sạch, giữ nguyên cấu hình và danh sách VĐV.`);
      setCopyModalTour(null);
      if (newTourId && onSelectTournament) {
        onSelectTournament(newTourId, { id: newTourId, matchName: copyMatchName.trim() });
      }
    } catch (err: any) {
      console.error("Failed to copy tournament:", err);
      alert(language === "en" ? `Error copying tournament: ${err.message || err}` : `Lỗi khi sao chép giải đấu: ${err.message || err}`);
    } finally {
      setIsCopying(false);
    }
  };
  
  const handleCancelPkChallenge = async (challengeId: string) => {
    try {
      await deleteDoc(doc(db, "vsc_pk_challenges", challengeId));
      alert(language === "en" ? "Challenge cancelled successfully!" : "Hủy và xóa kèo đấu thành công!");
    } catch (err: any) {
      console.error("Error deleting challenge:", err);
      alert(language === "en" ? `Error cancelling challenge: ${err.message}` : `Lỗi khi hủy kèo đấu: ${err.message}`);
    } finally {
      setCancelChallengeId(null);
      setCancelStep(0);
    }
  };

  const handleApproveJoinRequest = async (challenge: PKChallenge, request: any) => {
    const confirmApprove = window.confirm(
      language === "en"
        ? `Are you sure you want to select "${request.name}" as your match opponent?`
        : `Bạn có chắc chắn muốn đồng ý chọn "${request.name}" làm đối thủ thi đấu không?`
    );
    if (!confirmApprove) return;

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
    } catch (err: any) {
      console.error("Error approving request:", err);
      alert("Lỗi khi phê duyệt đối thủ: " + err.message);
    }
  };

  const handleDeclineJoinRequest = async (challenge: PKChallenge, request: any) => {
    const confirmDecline = window.confirm(
      language === "en"
        ? `Are you sure you want to decline "${request.name}"'s request?`
        : `Bạn có chắc chắn muốn từ chối yêu cầu của "${request.name}" không?`
    );
    if (!confirmDecline) return;

    try {
      const challengeRef = doc(db, "vsc_pk_challenges", challenge.id);
      await updateDoc(challengeRef, {
        joinRequests: challenge.joinRequests?.filter(r => r.uid !== request.uid) || []
      });
      alert(language === "en" ? "Declined request." : "Đã từ chối yêu cầu ứng tuyển.");
    } catch (err: any) {
      console.error("Error declining request:", err);
      alert("Lỗi khi từ chối yêu cầu: " + err.message);
    }
  };

  // Tab can be profile (hồ sơ của tôi), club (câu lạc bộ), created (giải tôi tạo), referee (giải tôi trọng tài), pk_challenges (thách đấu PK), training (tiến trình tập luyện)
  const [subTab, setSubTab] = useState<"profile" | "club" | "created" | "referee" | "pk_challenges" | "training">("profile");

  // Sync subtab if forceSubTab changes
  useEffect(() => {
    if (forceSubTab) {
      setSubTab(forceSubTab);
    }
  }, [forceSubTab]);

  // Profile management state
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // Club Management states
  const [newClubName, setNewClubName] = useState("");
  const [newClubProvince, setNewClubProvince] = useState("");
  const [newClubLogoUrl, setNewClubLogoUrl] = useState("");
  const [newClubDesc, setNewClubDesc] = useState("");
  const [isCreatingClub, setIsCreatingClub] = useState(false);

  const [editClubName, setEditClubName] = useState("");
  const [editClubProvince, setEditClubProvince] = useState("");
  const [editClubLogoUrl, setEditClubLogoUrl] = useState("");
  const [editClubDesc, setEditClubDesc] = useState("");
  const [isUpdatingClub, setIsUpdatingClub] = useState(false);
  const [isEditingClubProfile, setIsEditingClubProfile] = useState(false);

  const [clubSearchQuery, setClubSearchQuery] = useState("");
  const [isSubmittingJoinRequest, setIsSubmittingJoinRequest] = useState(false);
  const [directAthleteId, setDirectAthleteId] = useState("");
  const [isAddingDirectMember, setIsAddingDirectMember] = useState(false);
  const [transferTargetUserId, setTransferTargetUserId] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showLeaveClubModalStep, setShowLeaveClubModalStep] = useState<number>(0);
  const [showKickMemberModalStep, setShowKickMemberModalStep] = useState<number>(0);
  const [kickTargetUserId, setKickTargetUserId] = useState("");
  const [kickTargetName, setKickTargetName] = useState("");

  // Profile fields state
  const [dispName, setDispName] = useState("");
  const [idCard, setIdCard] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [address, setAddress] = useState("");
  const [province, setProvince] = useState("");
  const [clubName, setClubName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  // Gear & Tech Profile fields state
  const [gearSlingName, setGearSlingName] = useState("");
  const [gearForkWidth, setGearForkWidth] = useState("");
  const [gearBandSpec, setGearBandSpec] = useState("");
  const [gearAmmoSize, setGearAmmoSize] = useState("");
  const [gearStance, setGearStance] = useState("");

  // Club Memos and Stats Engine
  const myClub = useMemo(() => {
    if (!currentUser) return null;
    return systemClubs.find((club) =>
      club.members?.some((m) => m.userId === currentUser.uid)
    ) || null;
  }, [systemClubs, currentUser]);

  const myPendingRequestClub = useMemo(() => {
    if (!currentUser) return null;
    return systemClubs.find((club) =>
      club.pendingRequests?.some((r) => r.userId === currentUser.uid)
    ) || null;
  }, [systemClubs, currentUser]);

  // Load club details for editing when myClub is available
  useEffect(() => {
    if (myClub) {
      setEditClubName(myClub.name || "");
      setEditClubProvince(myClub.province || "");
      setEditClubLogoUrl(myClub.logoUrl || "");
      setEditClubDesc(myClub.description || "");
      setClubName(myClub.name || "");
    }
  }, [myClub]);

  // Track Auth changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Fetch /users/{uid} document on load or user shifts
  useEffect(() => {
    if (!currentUser) {
      setProfile(null);
      return;
    }
    const loadProfile = async () => {
      setProfileLoading(true);
      try {
        const fetched = await getUserProfile(currentUser.uid);
        if (fetched) {
          setProfile(fetched);
          setDispName(fetched.displayName || fetched.email?.split("@")[0] || "");
          setIdCard(fetched.cccd || "");
          setBirthDate(fetched.birthDate || "");
          setAddress(fetched.address || "");
          setProvince(fetched.province || "");
          setClubName(fetched.club || "");
          setAvatarUrl(fetched.avatarUrl || fetched.photoURL || "");
          setGearSlingName(fetched.gearSlingName || "");
          setGearForkWidth(fetched.gearForkWidth || "");
          setGearBandSpec(fetched.gearBandSpec || "");
          setGearAmmoSize(fetched.gearAmmoSize || "");
          setGearStance(fetched.gearStance || "");
        } else {
          // Fallback init profile
          const defName = currentUser.email ? currentUser.email.split("@")[0] : "Người dùng";
          setDispName(defName);
          setAvatarUrl(currentUser.photoURL || "");
          setGearSlingName("");
          setGearForkWidth("");
          setGearBandSpec("");
          setGearAmmoSize("");
          setGearStance("");
        }
      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        setProfileLoading(false);
      }
    };
    loadProfile();
  }, [currentUser]);

  // Subscribe to tournaments live database
  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToTournamentsList((list) => {
      setTournaments(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const [pkChallenges, setPkChallenges] = useState<PKChallenge[]>([]);

  // Subscribe to PK challenges to compute personal PK ELO
  useEffect(() => {
    const q = query(collection(db, "vsc_pk_challenges"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const list: PKChallenge[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as PKChallenge);
      });
      setPkChallenges(list);
    }, (error) => {
      console.warn("Error subscribing to PK challenges in ControlPanel:", error);
    });
    return () => unsub();
  }, []);

  // Compute my PK Stats dynamically based on my system athlete profile name
  const myPkStats = useMemo(() => {
    const myEmail = currentUser?.email?.toLowerCase().trim();
    const mySystemAthlete = vscSystemAthletes?.find(
      (a) => a.email && a.email.toLowerCase().trim() === myEmail
    );
    const myName = mySystemAthlete?.name || profile?.fullName || currentUser?.displayName || "";
    
    if (!myName || pkChallenges.length === 0) {
      return { elo: 1000, wins: 0, losses: 0, draws: 0, streak: 0, totalMatches: 0 };
    }

    const stats: Record<string, { 
      uid: string; 
      name: string; 
      wins: number; 
      losses: number; 
      draws: number; 
      elo: number; 
      streak: number; 
    }> = {};

    // Play through all completed matches chronologically to calculate ELO
    const sortedChallenges = [...pkChallenges]
      .filter(c => c.status === "completed" && c.scores)
      .sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));

    sortedChallenges.forEach((challenge) => {
      const challengerKey = challenge.type === "solo_1v1" ? challenge.challengerUid : `club-${challenge.challengerUid}`;
      const opponentKey = challenge.type === "solo_1v1" ? challenge.opponentUid : `club-${challenge.opponentUid}`;

      if (!challengerKey || !opponentKey) return;

      if (!stats[challengerKey]) {
        stats[challengerKey] = { 
          uid: challenge.challengerUid, 
          name: challenge.challengerName, 
          wins: 0, 
          losses: 0, 
          draws: 0, 
          elo: 1000, 
          streak: 0,
        };
      }
      if (!stats[opponentKey]) {
        stats[opponentKey] = { 
          uid: challenge.opponentUid!, 
          name: challenge.opponentName || "Đối thủ", 
          wins: 0, 
          losses: 0, 
          draws: 0, 
          elo: 1000, 
          streak: 0,
        };
      }

      const scores = challenge.scores!;
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

      const rCh = stats[challengerKey].elo;
      const rOp = stats[opponentKey].elo;
      const expectedCh = 1 / (1 + Math.pow(10, (rOp - rCh) / 400));
      const expectedOp = 1 / (1 + Math.pow(10, (rCh - rOp) / 400));
      const K = 32;

      if (challengerWin) {
        stats[challengerKey].wins += 1;
        stats[challengerKey].streak += 1;
        stats[opponentKey].losses += 1;
        stats[opponentKey].streak = 0;

        stats[challengerKey].elo = Math.round(rCh + K * (1 - expectedCh));
        stats[opponentKey].elo = Math.round(rOp + K * (0 - expectedOp));
      } else if (opponentWin) {
        stats[opponentKey].wins += 1;
        stats[opponentKey].streak += 1;
        stats[challengerKey].losses += 1;
        stats[challengerKey].streak = 0;

        stats[challengerKey].elo = Math.round(rCh + K * (0 - expectedCh));
        stats[opponentKey].elo = Math.round(rOp + K * (1 - expectedOp));
      } else {
        stats[challengerKey].draws += 1;
        stats[opponentKey].draws += 1;

        stats[challengerKey].elo = Math.round(rCh + K * (0.5 - expectedCh));
        stats[opponentKey].elo = Math.round(rOp + K * (0.5 - expectedOp));
      }
    });

    const playerStats = Object.values(stats).find(s => {
      return s.name.trim().toLowerCase() === myName.trim().toLowerCase();
    });

    if (playerStats) {
      return {
        elo: playerStats.elo,
        wins: playerStats.wins,
        losses: playerStats.losses,
        draws: playerStats.draws,
        streak: playerStats.streak,
        totalMatches: playerStats.wins + playerStats.losses + playerStats.draws
      };
    }

    return { elo: 1000, wins: 0, losses: 0, draws: 0, streak: 0, totalMatches: 0 };
  }, [currentUser, vscSystemAthletes, profile, pkChallenges]);

  // Filter tournaments by search
  const filteredTournaments = useMemo(() => {
    const seen = new Set<string>();
    const unique = tournaments.filter(t => {
      if (!t.id || seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
    if (!search.trim()) return unique;
    const query = search.toLowerCase();
    return unique.filter(t => t.matchName.toLowerCase().includes(query));
  }, [tournaments, search]);

  // Created & co-administered tournaments
  const myCreatedTournaments = useMemo(() => {
    if (!currentUser) return [];
    const email = currentUser.email?.toLowerCase().trim() || "";
    return filteredTournaments.filter(
      t => t.creatorId === currentUser.uid || 
           (email && t.creatorEmail && t.creatorEmail.toLowerCase().trim() === email) ||
           (t.subAdmins && t.subAdmins.some(subEmail => subEmail.toLowerCase().trim() === email))
    );
  }, [filteredTournaments, currentUser]);

  // Referee tournaments
  const myRefereeTournaments = useMemo(() => {
    if (!currentUser || !currentUser.email) return [];
    const email = currentUser.email.toLowerCase().trim();
    return filteredTournaments.filter(
      t => t.referees && t.referees.some(refEmail => refEmail.toLowerCase().trim() === email)
    );
  }, [filteredTournaments, currentUser]);

  // User PK Challenges
  const userPkChallenges = useMemo(() => {
    if (!currentUser) return [];
    const myUid = currentUser.uid;
    const myEmail = currentUser.email?.toLowerCase().trim() || "";
    // Also try to find user's name from vscSystemAthletes or profile to match name
    const mySystemAthlete = vscSystemAthletes?.find(
      (a) => a.email && a.email.toLowerCase().trim() === myEmail
    );
    const myName = mySystemAthlete?.name?.toLowerCase().trim() || profile?.fullName?.toLowerCase().trim() || "";

    return pkChallenges.filter((challenge) => {
      const isChallenger = challenge.challengerUid === myUid || 
                           (myEmail && challenge.challengerEmail?.toLowerCase().trim() === myEmail) ||
                           (myName && challenge.challengerName?.toLowerCase().trim() === myName);
      const isOpponent = challenge.opponentUid === myUid || 
                         (myEmail && challenge.opponentEmail?.toLowerCase().trim() === myEmail) ||
                         (myName && challenge.opponentName?.toLowerCase().trim() === myName);
      const isCreator = challenge.createdBy === myUid;
      return isChallenger || isOpponent || isCreator;
    });
  }, [currentUser, pkChallenges, vscSystemAthletes, profile]);

  const { activeUserPk, completedUserPk } = useMemo(() => {
    const activeUserPk = userPkChallenges.filter(c => c.status !== "completed" && c.status !== "cancelled");
    const completedUserPk = userPkChallenges.filter(c => c.status === "completed");
    return { activeUserPk, completedUserPk };
  }, [userPkChallenges]);

  // Compute 30 days display name restriction countdown
  const nameCooldownInfo = useMemo(() => {
    if (!profile?.lastDisplayNameUpdate) {
      return { canChange: true, daysRemaining: 0 };
    }
    const lastUpdateDate = new Date(profile.lastDisplayNameUpdate);
    const now = new Date();
    const diffTime = now.getTime() - lastUpdateDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    return {
      canChange: diffDays >= 30,
      daysRemaining: 30 - diffDays,
      lastDateStr: lastUpdateDate.toLocaleDateString("vi-VN")
    };
  }, [profile]);

  // Real scan tracking athlete achievements across all parsed Match lists
  const myAchievements = useMemo(() => {
    if (!currentUser || !currentUser.email) return [];
    const myEmail = currentUser.email.toLowerCase().trim();

    // Dynamically retrieve user's VSC system athlete ID if possible to match by ID too
    const mySystemAthlete = vscSystemAthletes?.find(
      (a) => a.email && a.email.toLowerCase().trim() === myEmail
    );
    const myAthleteId = mySystemAthlete?.id?.toLowerCase().trim();
    
    interface AchievementItem {
      tourId: string;
      matchName: string;
      mode: string;
      dateStr: string;
      rank: number;
      score: number;
      totalAthletes: number;
    }

    const resultsList: AchievementItem[] = [];

    // Filter cloud tournaments where this user email or ID is registered as vđv
    tournaments.forEach(tour => {
      const isTeam = tour.competitionMode === "team";
      const athletesList = (isTeam ? tour.teamAthletes : tour.athletes) || [];
      const distancesList = (isTeam ? tour.teamDistances : tour.distances) || [];

      const foundMe = athletesList.find(a => {
        const emailMatch = a.email && a.email.toLowerCase().trim() === myEmail;
        const idMatch = myAthleteId && a.id && a.id.toLowerCase().trim() === myAthleteId;
        return emailMatch || idMatch;
      });

      if (foundMe) {
        const activeAthletes = athletesList.filter(a => a.status !== "Bỏ thi");
        const playersWithScores = activeAthletes.map(p => {
          let totalScore = 0;
          distancesList.forEach(dist => {
            const hits = p.scores?.[dist.id] || [];
            const hitCount = getHitCount(hits);
            totalScore += hitCount * dist.multiplier;
          });
          return { id: p.id, name: p.name, email: p.email, score: totalScore };
        });

        playersWithScores.sort((a, b) => b.score - a.score);
        
        let rank = 1;
        const myIdx = playersWithScores.findIndex(p => {
          const emailMatch = p.email && p.email.toLowerCase().trim() === myEmail;
          const idMatch = myAthleteId && p.id && p.id.toLowerCase().trim() === myAthleteId;
          return emailMatch || idMatch;
        });

        if (myIdx !== -1) {
          rank = myIdx + 1;
        }

        const dateStr = tour.createdAt && typeof tour.createdAt.toDate === "function"
          ? tour.createdAt.toDate().toLocaleDateString("vi-VN")
          : "Gần đây";

        resultsList.push({
          tourId: tour.id,
          matchName: tour.matchName,
          mode: isTeam ? "Đồng Đội" : "Cá Nhân",
          dateStr,
          rank,
          score: playersWithScores[myIdx]?.score || 0,
          totalAthletes: activeAthletes.length
        });
      }
    });

    return resultsList;
  }, [tournaments, currentUser, vscSystemAthletes]);

  // Helper athlete count stats (total registered vs active shooting)
  const getTournamentAthleteStats = (tour: TournamentData) => {
    if (!tour) return { total: 0, active: 0 };

    const isTeam = tour.competitionMode === "team";
    const activeList = isTeam ? (tour.teamAthletes || []) : (tour.athletes || []);
    const activeCount = activeList.length;

    const uniqueIds = new Set<string>();
    const addList = (list?: Athlete[]) => {
      if (Array.isArray(list)) {
        list.forEach((a) => {
          if (a && (a.id || a.name)) {
            uniqueIds.add((a.id || a.name).toString().trim().toLowerCase());
          }
        });
      }
    };

    addList(tour.masterAthletes);
    addList(tour.teamMasterAthletes);
    addList(tour.athletes);
    addList(tour.teamAthletes);
    addList(tour.inputAthletes);
    addList(tour.teamInputAthletes);

    let totalCount = uniqueIds.size;
    if (totalCount === 0 && typeof tour.masterCount === "number" && tour.masterCount > 0) {
      totalCount = tour.masterCount;
    }
    if (totalCount < activeCount) {
      totalCount = activeCount;
    }

    return {
      total: totalCount,
      active: activeCount,
    };
  };

  // Helper score summaries
  const getTopAthletes = (athletesList: Athlete[], distancesList: DistanceConfig[]): { name: string; score: number }[] => {
    if (!athletesList || athletesList.length === 0) return [];
    const activeList = athletesList.filter(a => a.status !== "Bỏ thi");
    const computed = activeList.map(athlete => {
      let totalScore = 0;
      distancesList.forEach(dist => {
        const hits = athlete.scores?.[dist.id] || [];
        const hitCount = getHitCount(hits);
        totalScore += hitCount * dist.multiplier;
      });
      return { name: athlete.name, score: totalScore };
    });
    return computed.sort((a, b) => b.score - a.score).slice(0, 3);
  };

  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!dispName.trim()) {
      alert(language === "en" ? "Display name cannot be empty!" : "Họ và tên hiển thị không được để trống!");
      return;
    }

    setSavingProfile(true);
    try {
      const originalName = profile?.displayName || currentUser.email?.split("@")[0] || "";
      const isNameChanged = dispName.trim().toLowerCase() !== originalName.trim().toLowerCase();

      const payload: any = {
        cccd: idCard.trim(),
        birthDate,
        address: address.trim(),
        province: province.trim(),
        club: clubName.trim(),
        avatarUrl,
        gearSlingName: gearSlingName.trim(),
        gearForkWidth: gearForkWidth.trim(),
        gearBandSpec: gearBandSpec.trim(),
        gearAmmoSize: gearAmmoSize.trim(),
        gearStance: gearStance.trim(),
      };

      if (isNameChanged) {
        if (!nameCooldownInfo.canChange) {
          alert(language === "en" ? `You/Athlete recently updated name on ${nameCooldownInfo.lastDateStr}. Please wait ${nameCooldownInfo.daysRemaining} more days before updating again!` : `Bạn/VĐV đổi tên gần đây vào ngày ${nameCooldownInfo.lastDateStr}. Hãy đợi thêm ${nameCooldownInfo.daysRemaining} ngày để đổi tên tiếp theo nhé!`);
          setSavingProfile(false);
          return;
        }
        payload.displayName = dispName.trim();
        payload.lastDisplayNameUpdate = new Date().toISOString();
      }

      await updateUserProfile(currentUser.uid, payload);
      
      // Sync to VSC System Athletes list
      try {
        const athletes = await getVscSystemAthletes();
        const userEmailLower = currentUser.email?.trim().toLowerCase();
        if (userEmailLower) {
          const existingIndex = athletes.findIndex(
            (a) => a.email && a.email.trim().toLowerCase() === userEmailLower
          );

          if (existingIndex !== -1) {
            // Update existing profile
            const existingAthlete = athletes[existingIndex];
            const finalNameEditCount = (existingAthlete.nameEditCount || 0) + (isNameChanged ? 1 : 0);
            athletes[existingIndex] = {
              ...existingAthlete,
              name: dispName.trim(),
              idCard: idCard.trim(),
              dob: birthDate,
              hometown: address.trim(),
              province: province.trim(),
              team: clubName.trim() || existingAthlete.team || (language === "en" ? "Independent" : "Tự do"),
              avatarUrl: avatarUrl,
              nameEditCount: finalNameEditCount,
              gearSlingName: gearSlingName.trim(),
              gearForkWidth: gearForkWidth.trim(),
              gearBandSpec: gearBandSpec.trim(),
              gearAmmoSize: gearAmmoSize.trim(),
              gearStance: gearStance.trim(),
            };
            await saveVscSystemAthletes(athletes);
          }
        }
      } catch (syncErr) {
        console.error("Failed to sync profile to VSC system directory:", syncErr);
      }
      
      // Update local profile representation
      setProfile((prev: any) => ({
        ...prev,
        ...payload,
        email: currentUser.email
      }));

      alert(language === "en" ? "Athlete profile updated successfully!" : "Cập nhật thông tin profile Vận động viên thành công!");
    } catch (err) {
      console.error(err);
      alert(language === "en" ? "Database update error. Please reconnect!" : "Đã xảy ra lỗi cập nhật cơ sở dữ liệu. Vui lòng kết nối lại!");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      if (activeHistoryId === id && onSelectTournament) {
        onSelectTournament("", null);
      }
      await deleteOnlineTournament(id);
      setShowConfirmDeleteId(null);
    } catch (err) {
      console.error(err);
      alert(language === "en" ? "Cannot delete this tournament. You are not the tournament owner or do not have permission!" : "Không thể xóa giải đấu này. Bạn không phải trưởng giải hoặc không có quyền!");
    }
  };

  // Club Operations Handlers
  const handleCreateClubSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!newClubName.trim()) {
      alert(language === "en" ? "Club name cannot be empty!" : "Tên câu lạc bộ không được để trống!");
      return;
    }
    if (!newClubProvince) {
      alert(language === "en" ? "Please select a province!" : "Vui lòng chọn tỉnh thành hoạt động chính!");
      return;
    }
    
    setIsCreatingClub(true);
    try {
      await createSystemClub(
        newClubName.trim(),
        newClubLogoUrl.trim(),
        newClubProvince,
        currentUser.uid,
        profile?.displayName || currentUser.email?.split("@")[0] || "Trưởng CLB",
        currentUser.email || "",
        newClubDesc.trim()
      );
      alert(language === "en" ? "Club created successfully!" : "Tạo câu lạc bộ mới thành công!");
      setNewClubName("");
      setNewClubProvince("");
      setNewClubLogoUrl("");
      setNewClubDesc("");
    } catch (err: any) {
      console.error(err);
      alert(language === "en" ? `Error creating club: ${err.message || err}` : `Lỗi khi tạo câu lạc bộ: ${err.message || err}`);
    } finally {
      setIsCreatingClub(false);
    }
  };

  const handleJoinRequestSubmit = async (clubId: string) => {
    if (!currentUser) return;
    setIsSubmittingJoinRequest(true);
    try {
      let athleteId = "";
      try {
        const athletes = await getVscSystemAthletes();
        const matched = athletes.find(a => a.email?.trim().toLowerCase() === currentUser.email?.trim().toLowerCase());
        if (matched) {
          athleteId = matched.id;
        }
      } catch (e) {
        console.warn("Could not retrieve system athlete ID for request:", e);
      }

      await requestToJoinClub(
        clubId,
        currentUser.uid,
        athleteId,
        profile?.displayName || currentUser.email?.split("@")[0] || "VĐV",
        currentUser.email || ""
      );
      alert(language === "en" ? "Join request sent successfully!" : "Gửi yêu cầu gia nhập câu lạc bộ thành công!");
    } catch (err: any) {
      console.error(err);
      let msg = err.message || String(err);
      if (msg === "ALREADY_IN_CLUB") {
        alert(language === "en" ? "You are already a member of a club!" : "Bạn hiện đã là thành viên của một câu lạc bộ khác!");
      } else if (msg === "ALREADY_REQUESTED") {
        alert(language === "en" ? "You have already sent a request to join a club!" : "Bạn đã có yêu cầu gia nhập đang chờ duyệt!");
      } else {
        alert(language === "en" ? `Error: ${msg}` : `Lỗi: ${msg}`);
      }
    } finally {
      setIsSubmittingJoinRequest(false);
    }
  };

  const handleCancelJoinRequest = async (clubId: string) => {
    if (!currentUser) return;
    try {
      await cancelJoinRequest(clubId, currentUser.uid);
      alert(language === "en" ? "Withdrew join request!" : "Đã rút lại yêu cầu gia nhập!");
    } catch (err: any) {
      console.error(err);
      alert(language === "en" ? `Error: ${err.message || err}` : `Lỗi: ${err.message || err}`);
    }
  };

  const handleUpdateClubSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myClub) return;
    if (!editClubName.trim()) {
      alert(language === "en" ? "Club name cannot be empty!" : "Tên câu lạc bộ không được để trống!");
      return;
    }
    if (!editClubProvince) {
      alert(language === "en" ? "Please select a province!" : "Vui lòng chọn tỉnh thành!");
      return;
    }

    setIsUpdatingClub(true);
    try {
      await updateClubProfile(myClub.id, {
        name: editClubName.trim(),
        logoUrl: editClubLogoUrl.trim(),
        province: editClubProvince,
        description: editClubDesc.trim()
      });
      alert(language === "en" ? "Club profile updated successfully!" : "Cập nhật hồ sơ câu lạc bộ thành công!");
      setIsEditingClubProfile(false);
    } catch (err: any) {
      console.error(err);
      alert(language === "en" ? `Error: ${err.message || err}` : `Lỗi: ${err.message || err}`);
    } finally {
      setIsUpdatingClub(false);
    }
  };

  const handleLeaveClubClick = () => {
    if (!myClub || !currentUser) return;
    if (myClub.leaderId === currentUser.uid) {
      alert(language === "en"
        ? "As the Club Leader, you must transfer leadership to another member before leaving!"
        : "Là Trưởng CLB, bạn phải chuyển nhượng quyền trưởng câu lạc bộ cho thành viên khác trước khi rời đi!");
      return;
    }
    setShowLeaveClubModalStep(1);
  };

  const handleConfirmLeaveClubStep2 = async () => {
    if (!myClub || !currentUser) return;
    try {
      await leaveClub(myClub.id, currentUser.uid);
      setShowLeaveClubModalStep(0);
      alert(language === "en" ? "Left club successfully!" : "Đã rời khỏi câu lạc bộ thành công!");
    } catch (err: any) {
      console.error(err);
      setShowLeaveClubModalStep(0);
      if (err.message === "LEADER_MUST_TRANSFER") {
        alert(language === "en"
          ? "As the Club Leader, you must transfer leadership to another member before leaving!"
          : "Là Trưởng CLB, bạn phải chuyển nhượng quyền trưởng câu lạc bộ cho thành viên khác trước khi rời đi!");
      } else {
        alert(language === "en" ? `Error: ${err.message || err}` : `Lỗi: ${err.message || err}`);
      }
    }
  };

  const handleKickMemberClick = (userId: string, memberName: string) => {
    if (!myClub) return;
    setKickTargetUserId(userId);
    setKickTargetName(memberName);
    setShowKickMemberModalStep(1);
  };

  const handleConfirmKickMemberStep2 = async () => {
    if (!myClub || !kickTargetUserId) return;
    try {
      await kickClubMember(myClub.id, kickTargetUserId);
      setShowKickMemberModalStep(0);
      setKickTargetUserId("");
      setKickTargetName("");
      alert(language === "en" ? "Member removed successfully!" : "Đã loại thành viên thành công!");
    } catch (err: any) {
      setShowKickMemberModalStep(0);
      console.error(err);
      alert(language === "en" ? `Error: ${err.message || err}` : `Lỗi: ${err.message || err}`);
    }
  };

  const handleAddDirectMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myClub) return;
    if (!directAthleteId.trim()) {
      alert(language === "en" ? "Please enter an Athlete ID!" : "Vui lòng nhập Mã số VĐV Hệ Thống!");
      return;
    }

    setIsAddingDirectMember(true);
    try {
      await addClubMemberDirectly(myClub.id, directAthleteId.trim(), vscSystemAthletes);
      alert(language === "en" ? "Member added directly successfully!" : "Đã thêm thành viên trực tiếp thành công!");
      setDirectAthleteId("");
    } catch (err: any) {
      console.error(err);
      let msg = err.message || String(err);
      if (msg === "ATHLETE_NOT_FOUND") {
        alert(language === "en" ? "Athlete ID not found in system Roster!" : "Không tìm thấy Mã số VĐV này trong danh sách hệ thống!");
      } else if (msg === "ATHLETE_ALREADY_IN_CLUB") {
        alert(language === "en" ? "This athlete is already a member of another club!" : "Vận động viên này đã thuộc câu lạc bộ khác!");
      } else {
        alert(language === "en" ? `Error: ${msg}` : `Lỗi: ${msg}`);
      }
    } finally {
      setIsAddingDirectMember(false);
    }
  };

  const handleRequestAction = async (requestUserId: string, action: "approve" | "reject") => {
    if (!myClub) return;
    try {
      await handleClubJoinRequest(myClub.id, requestUserId, action);
      alert(action === "approve"
        ? (language === "en" ? "Request approved!" : "Đã duyệt yêu cầu gia nhập!")
        : (language === "en" ? "Request rejected!" : "Đã từ chối yêu cầu gia nhập!")
      );
    } catch (err: any) {
      console.error(err);
      alert(language === "en" ? `Error: ${err.message || err}` : `Lỗi: ${err.message || err}`);
    }
  };

  const handleTransferLeadershipSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myClub || !transferTargetUserId) return;
    const targetMember = myClub.members?.find(m => m.userId === transferTargetUserId);
    if (!targetMember) return;

    const confirmText = language === "en"
      ? `Are you sure you want to transfer leadership to ${targetMember.name}? You will be demoted to a regular member.`
      : `Bạn có chắc chắn muốn chuyển nhượng quyền Trưởng CLB cho ${targetMember.name}? Bạn sẽ tự động hạ cấp xuống thành viên thường.`;
    if (!confirm(confirmText)) return;

    setIsTransferring(true);
    try {
      await transferClubLeadership(myClub.id, transferTargetUserId);
      alert(language === "en" ? "Leadership transferred successfully!" : "Đã chuyển nhượng quyền Trưởng CLB thành công!");
      setShowTransferModal(false);
      setTransferTargetUserId("");
    } catch (err: any) {
      console.error(err);
      alert(language === "en" ? `Error: ${err.message || err}` : `Lỗi: ${err.message || err}`);
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-2 text-slate-800 dark:text-slate-100 font-sans">
      
      {/* Title block */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between border-b border-slate-205 dark:border-slate-800/80 pb-5">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <SlidersHorizontal className="w-6 h-6 text-indigo-650 dark:text-indigo-400" /> {language === "en" ? "MY CONTROL PANEL" : "BẢNG ĐIỀU KHIỂN CÁ NHÂN (CONTROL PANEL)"}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
            {language === "en" ? "Centralized dashboard for tracking online tournaments you created or are assigned as referee." : "Nơi tập trung theo dõi các giải đấu trực tuyến do chính bạn kiến tạo, hoặc các giải đấu mà bạn làm Trọng tài phân công."}
          </p>
        </div>

        {currentUser && (
          <div className="flex items-center gap-2.5 bg-slate-100/60 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 rounded-xl px-3 py-1.5 shrink-0 select-none">
            {currentUser.photoURL ? (
              <img src={currentUser.photoURL} alt="avatar" className="w-5 h-5 rounded-full pointer-events-none" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center text-[10px] text-white font-bold uppercase pointer-events-none">
                {currentUser.email ? currentUser.email[0] : "U"}
              </div>
            )}
            <span className="text-xs font-bold text-slate-700 dark:text-slate-350">{currentUser.email}</span>
          </div>
        )}
      </div>

      {!currentUser ? (
        /* Call to Action for Auth */
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800/90 p-8 text-center max-w-xl mx-auto flex flex-col items-center gap-5 my-8 shadow-sm">
          <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl">
            <LogIn className="w-10 h-10 text-indigo-600 dark:text-indigo-400 animate-pulse" />
          </div>
          <div className="flex flex-col gap-1.5">
            <h3 className="text-base sm:text-lg font-extrabold text-slate-905 dark:text-white">
              {language === "en" ? "Cloud Account Login Required" : "Yêu cầu đăng nhập tài khoản Cloud"}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-md">
              {language === "en" ? "Please connect with your Google account to use this Control Panel. The system will automatically scan and filter tournaments you created or are assigned to as cloud referee." : "Vui lòng kết nối với tài khoản Google để sử dụng Bảng Điều Khiển này. Hệ thống sẽ tự động quét và lọc ra toàn bộ giải đấu do bạn khởi tạo hoặc được phân bổ làm trọng tài đám mây."}
            </p>
          </div>
          <button
            onClick={onOpenAuthModal}
            className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer mt-1"
          >
            {language === "en" ? "Sign in with Google Account" : "Đăng nhập bằng Google Account"}
          </button>
        </div>
      ) : (
        /* Connected user dashboard panel */
        <div className="flex flex-col gap-5">
          
          {/* Sub Navigation Tabs */}
          <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-100/70 dark:bg-slate-950/40 p-1.5 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 gap-3">
            <div className="flex gap-2 w-full sm:w-auto overflow-x-auto">
              <button
                onClick={() => setSubTab("profile")}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                  subTab === "profile"
                    ? "bg-white dark:bg-slate-800 shadow-xs text-indigo-700 dark:text-indigo-400 border border-slate-200/40 dark:border-slate-700/40"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                }`}
              >
                <UserCheck className="w-4 h-4" />
                {language === "en" ? "My Athlete Profile" : "Hồ Sơ VĐV của Tôi"}
              </button>
              {/* Removed My Club tab button per request */}
              <button
                onClick={() => setSubTab("training")}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                  subTab === "training"
                    ? "bg-white dark:bg-slate-800 shadow-xs text-indigo-700 dark:text-indigo-400 border border-slate-200/40 dark:border-slate-700/40"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                }`}
              >
                <Target className="w-4 h-4 text-emerald-500" />
                {language === "en" ? "Practice Progress" : "Tiến Trình Tập Luyện"}
              </button>
              <button
                onClick={() => setSubTab("pk_challenges")}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                  subTab === "pk_challenges"
                    ? "bg-white dark:bg-slate-800 shadow-xs text-rose-600 dark:text-rose-400 border border-slate-200/40 dark:border-slate-700/40"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                }`}
              >
                <Sword className="w-4 h-4 text-rose-500" />
                {language === "en" ? `PK Challenges (${userPkChallenges.length})` : `Thách đấu PK (${userPkChallenges.length})`}
              </button>
              <button
                onClick={() => setSubTab("created")}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                  subTab === "created"
                    ? "bg-white dark:bg-slate-800 shadow-xs text-indigo-700 dark:text-indigo-400 border border-slate-200/40 dark:border-slate-700/40"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                {language === "en" ? `Created Tournaments (${myCreatedTournaments.length})` : `Giải tôi tạo (${myCreatedTournaments.length})`}
              </button>
              <button
                onClick={() => setSubTab("referee")}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                  subTab === "referee"
                    ? "bg-white dark:bg-slate-800 shadow-xs text-amber-750 dark:text-amber-400 border border-slate-200/40 dark:border-slate-700/40"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                }`}
              >
                <Award className="w-4 h-4" />
                {language === "en" ? `Referee Tournaments (${myRefereeTournaments.length})` : `Giải tôi làm Trọng tài (${myRefereeTournaments.length})`}
              </button>
            </div>

            {/* Quick search (Only show when viewing tournament lists) */}
            {subTab !== "profile" && subTab !== "pk_challenges" && subTab !== "training" && (
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={language === "en" ? "Filter tournament name..." : "Lọc tên giải đấu..."}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-3 py-1.5 w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 transition-all text-slate-800 dark:text-slate-100"
                />
              </div>
            )}
          </div>

          {/* List display */}
          {loading ? (
            <div className="p-12 text-center flex flex-col justify-center items-center gap-2">
              <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-indigo-500 animate-spin"></div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {language === "en" ? "Loading Cloud data..." : "Đang tải dữ liệu Cloud..."}
              </span>
            </div>
          ) : (
            <>
              {subTab === "profile" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
                  {/* Left Column: Form Profile */}
                  <form onSubmit={handleSaveProfile} className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/85 dark:border-slate-800 p-6 flex flex-col gap-5 shadow-xs">
                    <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-850 pb-3">
                      <User className="w-5 h-5 text-indigo-650 dark:text-indigo-400" /> THÔNG TIN HỒ SƠ VẬN ĐỘNG VIÊN LIÊN KẾT
                    </h3>

                    {profileLoading ? (
                      <div className="py-20 text-center flex flex-col justify-center items-center gap-2">
                        <div className="w-7 h-7 rounded-full border-2 border-slate-250 border-t-indigo-550 animate-spin"></div>
                        <span className="text-xs text-slate-400">Đang đồng bộ hồ sơ đám mây...</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-col sm:flex-row gap-6 items-center border-b border-slate-100 dark:border-slate-805 pb-5">
                          {/* Avatar preview and uploader */}
                          <div className="flex flex-col items-center gap-2.5">
                            <div className="relative w-24 h-24 rounded-full border border-slate-200 dark:border-slate-850 shadow-inner overflow-hidden bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
                              {avatarUrl ? (
                                <img src={avatarUrl} alt="Avatar VĐV" className="w-full h-full object-cover" />
                              ) : (
                                <User className="w-12 h-12 text-slate-300" />
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:bg-slate-950 dark:hover:bg-slate-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-3 py-1.5 rounded-lg cursor-pointer flex items-center gap-1 transition-all active:scale-95">
                                <ImageIcon className="w-3.5 h-3.5" /> Thay ảnh
                                <input type="file" accept="image/*" onChange={handleAvatarFile} className="hidden" />
                              </label>
                              {(currentUser?.photoURL || currentUser?.email) && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (currentUser?.photoURL) {
                                      setAvatarUrl(currentUser.photoURL);
                                      return;
                                    }
                                    if (currentUser?.email) {
                                      try {
                                        const pr = await getUserProfileByEmail(currentUser.email);
                                        if (pr && (pr.avatarUrl || pr.photoURL)) {
                                          setAvatarUrl(pr.avatarUrl || pr.photoURL);
                                        } else {
                                          alert(language === "en" ? "No Google avatar found on Cloud." : "Không tìm thấy ảnh đại diện Google nào trên Cloud.");
                                        }
                                      } catch (e) {
                                        console.error(e);
                                      }
                                    }
                                  }}
                                  title={language === "en" ? "Sync Google avatar" : "Đồng bộ ảnh đại diện từ Google"}
                                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-indigo-50 dark:bg-slate-950 hover:bg-indigo-100 dark:hover:bg-slate-800 text-indigo-700 dark:text-indigo-300 active:scale-95 transition-all flex items-center justify-center"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Display Name (restricted) */}
                            <div className="sm:col-span-2">
                              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1 flex justify-between">
                                <span className="flex items-center gap-1">Tên hiển thị VĐV (Đại diện): <span className="text-red-500">*</span></span>
                                {!nameCooldownInfo.canChange && (
                                  <span className="text-amber-600 font-bold normal-case flex items-center gap-0.5">
                                    <Clock className="w-3.5 h-3.5" /> Đổi tiếp sau {nameCooldownInfo.daysRemaining} ngày
                                  </span>
                                )}
                              </label>
                              <input
                                type="text"
                                value={dispName}
                                onChange={(e) => setDispName(e.target.value)}
                                disabled={!nameCooldownInfo.canChange}
                                placeholder="Nguyễn Văn A"
                                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-955 disabled:bg-slate-100/50 dark:disabled:bg-slate-900 disabled:cursor-not-allowed border border-gray-300 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold text-slate-900 dark:text-white"
                              />
                              <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
                                Tên này hiển thị như tên VĐV. Mặc định là phần tiền tố email. <strong>Chỉ tự đổi được 30 ngày một lần</strong> nhằm chống gian lận lịch sử và lưu trữ điểm số.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* CCCD */}
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                              Số CCCD / Hộ chiếu (Passport):
                            </label>
                            <input
                              type="text"
                              value={idCard}
                              onChange={(e) => setIdCard(e.target.value)}
                              placeholder="Số căn cước hoặc Passport..."
                              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-955 border border-gray-300 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-slate-900 dark:text-white"
                            />
                          </div>

                          {/* Birthdate */}
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                              Ngày tháng năm sinh:
                            </label>
                            <input
                              type="date"
                              value={birthDate}
                              onChange={(e) => setBirthDate(e.target.value)}
                              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-955 border border-gray-300 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white"
                            />
                          </div>

                          {/* Club */}
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                              Câu lạc bộ (CLB) / Nhóm:
                            </label>
                            {myClub ? (
                              <input
                                type="text"
                                value={myClub.name}
                                disabled={true}
                                className="w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold bg-slate-100 dark:bg-slate-900 border-gray-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed select-none opacity-80"
                              />
                            ) : (
                              <select
                                value={clubName}
                                onChange={(e) => setClubName(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold bg-slate-50 dark:bg-slate-955 text-slate-900 dark:text-white"
                              >
                                <option value="">{language === "en" ? "-- Free Agent / Independent Athlete --" : "-- Vận động viên tự do --"}</option>
                                {clubName && !systemClubs.some(c => c.name.toLowerCase().trim() === clubName.toLowerCase().trim()) && (
                                  <option value={clubName}>{clubName} ({language === "en" ? "Legacy/Current" : "Hiện tại"})</option>
                                )}
                                {systemClubs.map((club) => (
                                  <option key={club.id} value={club.name}>
                                    {club.name} ({club.province || (language === "en" ? "Other" : "Khác")})
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>

                          {/* Province / State */}
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                              Tỉnh / Thành phố:
                            </label>
                            <select
                              value={province && !VIETNAM_PROVINCES.includes(province) ? "Khác" : province}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === "Khác") {
                                  setProvince("Nước Ngoài");
                                } else {
                                  setProvince(val);
                                }
                              }}
                              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-955 border border-gray-300 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold text-slate-900 dark:text-white"
                            >
                              <option value="">-- Chọn Tỉnh / Thành phố --</option>
                              {VIETNAM_PROVINCES.map((prov) => (
                                <option key={prov} value={prov}>{prov}</option>
                              ))}
                              <option value="Khác">Khác (Tự nhập)</option>
                            </select>
                            {(province === "Khác" || (province && !VIETNAM_PROVINCES.includes(province))) && (
                              <input
                                type="text"
                                value={province === "Khác" ? "" : province}
                                onChange={(e) => setProvince(e.target.value)}
                                placeholder="Nhập tỉnh thành khác..."
                                className="mt-2 w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-955 border border-gray-300 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white font-bold"
                              />
                            )}
                          </div>

                          {/* Address Contact */}
                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                              Địa chỉ cụ thể (Nơi ở hiện tại):
                            </label>
                            <input
                              type="text"
                              value={address}
                              onChange={(e) => setAddress(e.target.value)}
                              placeholder="Số nhà, ngõ/ngách, xã phường..."
                              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-955 border border-gray-300 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white"
                            />
                          </div>

                          {/* ----------------- Trang bị & Kỹ thuật ----------------- */}
                          <div className="sm:col-span-2 border-t border-slate-100 dark:border-slate-850 pt-4 mt-2">
                            <h5 className="text-[11px] font-black uppercase text-indigo-650 dark:text-indigo-400 tracking-wider mb-1 flex items-center gap-1.5">
                              <span>🎯</span> {language === "en" ? "Gear & Technical Profile" : "Cấu hình Trang bị & Kỹ thuật VĐV"}
                            </h5>
                          </div>

                          {/* Tên loại ná */}
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                              {language === "en" ? "Slingshot Model:" : "Tên loại ná:"}
                            </label>
                            <input
                              type="text"
                              value={gearSlingName}
                              onChange={(e) => setGearSlingName(e.target.value)}
                              placeholder="Vô cực, VIP, Hổ, CNC..."
                              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-955 border border-gray-300 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold text-slate-850 dark:text-white"
                            />
                          </div>

                          {/* Độ rộng chạc */}
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                              {language === "en" ? "Fork Width:" : "Độ rộng chạc:"}
                            </label>
                            <input
                              type="text"
                              value={gearForkWidth}
                              onChange={(e) => setGearForkWidth(e.target.value)}
                              placeholder="7, 7.5, 8... (cm)"
                              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-955 border border-gray-300 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold text-slate-855 dark:text-white"
                            />
                          </div>

                          {/* Khổ thun sử dụng */}
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                              {language === "en" ? "Band Specs:" : "Khổ thun sử dụng:"}
                            </label>
                            <input
                              type="text"
                              value={gearBandSpec}
                              onChange={(e) => setGearBandSpec(e.target.value)}
                              placeholder="10-20-150 dày 0.55mm..."
                              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-955 border border-gray-300 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold text-slate-855 dark:text-white"
                            />
                          </div>

                          {/* Bi sử dụng */}
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                              {language === "en" ? "Ammo Size:" : "Bi sử dụng (Kích cỡ):"}
                            </label>
                            <input
                              type="text"
                              value={gearAmmoSize}
                              onChange={(e) => setGearAmmoSize(e.target.value)}
                              placeholder="7, 8, 9... (mm)"
                              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-955 border border-gray-300 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold text-slate-855 dark:text-white"
                            />
                          </div>

                          {/* Tư thế bắn */}
                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                              {language === "en" ? "Shooting Stance:" : "Tư thế bắn:"}
                            </label>
                            <input
                              type="text"
                              value={gearStance}
                              onChange={(e) => setGearStance(e.target.value)}
                              placeholder="Tới má, Semi-butterfly, Full..."
                              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-955 border border-gray-300 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold text-slate-855 dark:text-white"
                            />
                          </div>
                        </div>

                        {/* Save submission button */}
                        <div className="flex justify-end gap-3 mt-4 border-t border-slate-100 dark:border-slate-850 pt-4">
                          <button
                            type="submit"
                            disabled={savingProfile}
                            className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all active:scale-95"
                          >
                            <Save className="w-4 h-4" />
                            {savingProfile ? "Đang lưu trữ..." : "Lưu hồ sơ VĐV Cloud"}
                          </button>
                        </div>
                      </>
                    )}
                  </form>

                  {/* Right Column: Achievements & Stats */}
                  <div className="flex flex-col gap-6">
                    {/* PK Challenge Arena Stats Box */}
                    <div className="bg-gradient-to-br from-rose-50 to-amber-50 dark:from-slate-900/80 dark:to-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-3xl p-6 flex flex-col gap-4 shadow-sm">
                      <h3 className="text-sm font-black tracking-tight text-rose-900 dark:text-rose-400 flex items-center gap-2 border-b border-rose-100/60 dark:border-rose-900/20 pb-3">
                        <Sword className="w-4 h-4 text-rose-600" /> THÀNH TÍCH ĐẤU TRƯỜNG PK
                      </h3>
                      
                      <div className="grid grid-cols-2 gap-3 text-center">
                        <div className="bg-white dark:bg-slate-950 p-4 rounded-2xl border border-rose-150/40 dark:border-slate-800 shadow-xs">
                          <div className="text-[10px] font-extrabold text-rose-700/80 dark:text-rose-400 uppercase tracking-wider">
                            ELO PK HIỆN TẠI
                          </div>
                          <div className="text-2xl font-black text-rose-600 mt-1">{myPkStats.elo}</div>
                        </div>
                        <div className="bg-white dark:bg-slate-950 p-4 rounded-2xl border border-rose-150/40 dark:border-slate-800 shadow-xs">
                          <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                            TỔNG TRẬN ĐẤU
                          </div>
                          <div className="text-2xl font-black text-slate-700 dark:text-slate-200 mt-1">{myPkStats.totalMatches}</div>
                        </div>
                        <div className="bg-white dark:bg-slate-950 p-3.5 rounded-2xl border border-rose-150/40 dark:border-slate-800 shadow-xs col-span-2 sm:col-span-1">
                          <div className="text-[9px] font-extrabold text-emerald-600 uppercase tracking-wide">
                            THẮNG - THUA
                          </div>
                          <div className="text-lg font-black text-emerald-600 mt-0.5">
                            {myPkStats.wins}W - {myPkStats.losses}L
                          </div>
                        </div>
                        <div className="bg-white dark:bg-slate-950 p-3.5 rounded-2xl border border-rose-150/40 dark:border-slate-800 shadow-xs col-span-2 sm:col-span-1">
                          <div className="text-[9px] font-extrabold text-amber-600 uppercase tracking-wide">
                            CHUỖI THẮNG LỚN
                          </div>
                          <div className="text-lg font-black text-amber-500 mt-0.5">
                            {myPkStats.streak > 0 ? `🔥 ${myPkStats.streak}` : "---"}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Achievements Box */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/85 dark:border-slate-800 p-6 flex flex-col gap-4 shadow-xs">
                      <h3 className="text-sm font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-850 pb-3">
                        <Trophy className="w-4 h-4 text-amber-500" /> THÀNH TÍCH ĐIỂM SỐ CLOUD
                      </h3>

                      {myAchievements.length === 0 ? (
                        <div className="p-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center flex flex-col items-center justify-center gap-2.5 bg-slate-50/20 dark:bg-slate-950/20">
                          <Trophy className="w-6 h-6 text-slate-300 dark:text-slate-700" />
                          <div>
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Chưa có kết quả lưu trữ</h4>
                            <p className="text-[10px] text-slate-400 leading-normal max-w-xs mt-1">
                              Khi ban tổ chức nhập email <strong className="text-indigo-650 dark:text-indigo-400">{currentUser.email}</strong> vào vận động viên tham dự giải đấu, toàn bộ lịch sử điểm số, xếp hạng tranh tài của bạn sẽ hiển thị đầy đủ tại đây!
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3">
                          <p className="text-[10px] text-slate-400 mb-1 leading-normal">
                            Báo cáo kết quả thứ hạng chính thức của bạn tại các đấu trường trực tuyến:
                          </p>
                          <div className="max-h-96 overflow-y-auto pr-1 flex flex-col gap-2.5">
                            {myAchievements.map((item, idx) => {
                              const isPodium = item.rank <= 3;
                              const medalColor = item.rank === 1 ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800" :
                                                item.rank === 2 ? "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800/40 dark:text-slate-300 dark:border-slate-705" :
                                                "bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/25 dark:text-amber-450 dark:border-amber-900";

                              return (
                                <div key={idx} className="bg-slate-50/50 dark:bg-slate-950/30 rounded-2xl border border-slate-200/50 dark:border-slate-800/70 p-3 flex flex-col gap-2 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                                  <div className="flex justify-between items-start gap-1">
                                    <h4 className="text-[11px] font-black text-slate-900 dark:text-white leading-normal line-clamp-1 flex-1">
                                      {item.matchName}
                                    </h4>
                                    <span className="text-[8px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300 px-1.5 py-0.5 rounded-md self-center">
                                      {item.mode}
                                    </span>
                                  </div>

                                  <div className="flex justify-between items-center border-t border-slate-200/40 dark:border-slate-800/40 pt-2 text-[10px] text-slate-500">
                                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-slate-400" /> {item.dateStr}</span>
                                    <span className="font-bold text-slate-700 dark:text-slate-300">{item.score} Điểm</span>
                                  </div>

                                  <div className="flex items-center justify-between mt-0.5">
                                    <span className="text-[10px] text-slate-400">Xem BXH giải</span>
                                    {isPodium ? (
                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-0.5 ${medalColor}`}>
                                        <Award className="w-3.5 h-3.5" /> Hạng {item.rank} / {item.totalAthletes}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-bold px-2 py-0.5 rounded-full border border-slate-200/30 dark:border-slate-750">
                                        Hạng {item.rank} / {item.totalAthletes}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {subTab === "club" && (
                <div className="flex flex-col gap-6">
                  {!currentUser ? (
                    <div className="p-10 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-center flex flex-col items-center justify-center gap-3 bg-slate-50/20 dark:bg-slate-950/10">
                      <Users className="w-8 h-8 text-slate-400" />
                      <div>
                        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">
                          {language === "en" ? "Authentication Required" : "Yêu Cầu Đăng Nhập"}
                        </h4>
                        <p className="text-xs text-slate-400 max-w-xs mt-1 leading-relaxed">
                          {language === "en"
                            ? "Please log in to your account to view your club status, search for clubs, or create a new one."
                            : "Vui lòng đăng nhập để xem thông tin câu lạc bộ, tìm kiếm gia nhập hoặc đăng ký thành lập CLB mới."}
                        </p>
                      </div>
                      <button
                        onClick={onOpenAuthModal}
                        className="mt-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md transition-all duration-200"
                      >
                        {language === "en" ? "Sign In / Register" : "Đăng nhập / Đăng ký"}
                      </button>
                    </div>
                  ) : myClub ? (
                    // USER HAS A CLUB
                    <div className="flex flex-col gap-6">
                      {/* Club Header Banner Card */}
                      <div className="relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                        <div className="flex flex-col sm:flex-row gap-5 items-center">
                          <img
                            src={myClub.logoUrl || "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=150"}
                            alt={myClub.name}
                            className="w-20 h-20 rounded-2xl object-cover border-2 border-indigo-100 dark:border-indigo-950/40 shadow-xs"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=150";
                            }}
                          />
                          <div className="text-center sm:text-left">
                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                              <h2 className="text-xl font-black tracking-tight text-slate-800 dark:text-white">
                                {myClub.name}
                              </h2>
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-950">
                                {myClub.province}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1 flex items-center justify-center sm:justify-start gap-1">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              {language === "en" ? "Leader:" : "Trưởng CLB:"} <strong className="text-slate-600 dark:text-slate-300">{myClub.leaderName}</strong> ({myClub.leaderEmail})
                            </p>
                            {myClub.description && (
                              <p className="text-xs text-slate-500 mt-2 max-w-lg leading-relaxed italic">
                                "{myClub.description}"
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
                          {onChangeActiveTab && (
                            <button
                              onClick={() => onChangeActiveTab("vsc_clubs_directory")}
                              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl cursor-pointer transition-all shadow-xs"
                            >
                              <Building className="w-3.5 h-3.5" />
                              {language === "en" ? "Open System Club" : "Mở Không Gian CLB"}
                            </button>
                          )}
                          {myClub.leaderId === currentUser.uid ? (
                            <>
                              <button
                                onClick={() => setIsEditingClubProfile(!isEditingClubProfile)}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl cursor-pointer transition-all"
                              >
                                <SlidersHorizontal className="w-3.5 h-3.5" />
                                {isEditingClubProfile
                                  ? (language === "en" ? "View Roster" : "Xem Danh Sách")
                                  : (language === "en" ? "Edit Profile" : "Chỉnh Sửa Hồ Sơ")}
                              </button>
                              <button
                                onClick={() => setShowTransferModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/20 dark:hover:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/40 dark:border-amber-900/40 text-xs font-bold rounded-xl cursor-pointer transition-all"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                {language === "en" ? "Transfer Leadership" : "Chuyển Trưởng CLB"}
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={handleLeaveClubClick}
                              className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200/40 dark:border-red-900/40 text-xs font-bold rounded-xl cursor-pointer transition-all"
                            >
                              <LogOut className="w-3.5 h-3.5" />
                              {language === "en" ? "Leave Club" : "Rời Câu Lạc Bộ"}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Lifetime Statistics Engine Block */}
                      {(() => {
                        const stats = getClubStats(myClub, onlineTournaments);
                        return (
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 p-4 rounded-xl shadow-xs">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                {language === "en" ? "Total System Shots" : "Tổng Số Đường Bắn"}
                              </span>
                              <div className="flex items-center gap-2 mt-1">
                                <Activity className="w-4 h-4 text-indigo-500" />
                                <span className="text-xl font-black text-slate-800 dark:text-white">
                                  {stats.totalShots}
                                </span>
                              </div>
                            </div>
                            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 p-4 rounded-xl shadow-xs">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                {language === "en" ? "Total System Hits" : "Tổng Số Hit Đánh Trúng"}
                              </span>
                              <div className="flex items-center gap-2 mt-1">
                                <CheckCircle className="w-4 h-4 text-emerald-500" />
                                <span className="text-xl font-black text-slate-800 dark:text-white">
                                  {stats.totalHits}
                                </span>
                              </div>
                            </div>
                            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 p-4 rounded-xl shadow-xs">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                {language === "en" ? "Overall Hit Rate" : "Tỷ Lệ Trúng Trung Bình"}
                              </span>
                              <div className="flex items-center gap-2 mt-1">
                                <Sliders className="w-4 h-4 text-amber-500" />
                                <span className="text-xl font-black text-slate-800 dark:text-white">
                                  {stats.hitRate.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 p-4 rounded-xl shadow-xs">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                {language === "en" ? "Podium Finishes" : "Số Lần Đạt Bục (Top 3)"}
                              </span>
                              <div className="flex items-center gap-2 mt-1">
                                <Trophy className="w-4 h-4 text-yellow-500" />
                                <span className="text-xl font-black text-slate-800 dark:text-white">
                                  {stats.podiums}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* VSC Club Directory Navigation Banner */}
                      {onChangeActiveTab && (
                        <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 dark:from-indigo-500/20 dark:to-pink-500/20 border border-indigo-200/50 dark:border-indigo-800/40 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                          <div className="flex items-start gap-3.5 text-left">
                            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
                              <Building className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="text-xs sm:text-sm font-black text-slate-800 dark:text-white">
                                {language === "en" ? "Interactive Club Workspace Available" : "Không Gian Câu Lạc Bộ Chuyên Nghiệp Đã Sẵn Sàng"}
                              </h4>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed max-w-xl">
                                {language === "en"
                                  ? "Go to the VSC System Clubs tab to access complete details, review historical tournament rosters, approve pending shoot requests, or delete your club."
                                  : "Truy cập ngay tab CLB Hệ Thống để quản lý đầy đủ danh sách, phê duyệt thành viên xin gia nhập, cập nhật ảnh logo/banner nén chất lượng cao, hoặc giải tán câu lạc bộ."}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => onChangeActiveTab("vsc_clubs_directory")}
                            className="w-full sm:w-auto px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black cursor-pointer shadow-md flex items-center justify-center gap-2 whitespace-nowrap transition-colors"
                          >
                            <span>{language === "en" ? "Go to System Clubs" : "Truy Cập Hệ Thống CLB"}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* EDIT PROFILE PANEL */}
                      {isEditingClubProfile && myClub.leaderId === currentUser.uid ? (
                        <form
                          onSubmit={handleUpdateClubSubmit}
                          className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-6 shadow-xs flex flex-col gap-4"
                        >
                          <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                            <SlidersHorizontal className="w-4 h-4 text-indigo-500" />
                            {language === "en" ? "Edit Club Information" : "Chỉnh Sửa Thông Tin Câu Lạc Bộ"}
                          </h3>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
                                {language === "en" ? "Club Name *" : "Tên Câu Lạc Bộ *"}
                              </label>
                              <input
                                type="text"
                                required
                                value={editClubName}
                                onChange={(e) => setEditClubName(e.target.value)}
                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
                                {language === "en" ? "Primary Province *" : "Tỉnh Thành Hoạt Động *"}
                              </label>
                              <select
                                required
                                value={editClubProvince}
                                onChange={(e) => setEditClubProvince(e.target.value)}
                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                              >
                                <option value="">-- {language === "en" ? "Select Province" : "Chọn Tỉnh Thành"} --</option>
                                {VIETNAM_PROVINCES.map((p) => (
                                  <option key={p} value={p}>
                                    {p}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
                              {language === "en" ? "Club Logo URL (HTTPS)" : "Đường Dẫn Logo (Ảnh HTTPS)"}
                            </label>
                            <input
                              type="url"
                              value={editClubLogoUrl}
                              onChange={(e) => setEditClubLogoUrl(e.target.value)}
                              placeholder="https://example.com/logo.png"
                              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
                              {language === "en" ? "Club Motto / Description" : "Giới Thiệu / Tôn Chỉ Hoạt Động"}
                            </label>
                            <textarea
                              rows={3}
                              value={editClubDesc}
                              onChange={(e) => setEditClubDesc(e.target.value)}
                              placeholder={language === "en" ? "Brief club motto or description..." : "Giới thiệu ngắn gọn về câu lạc bộ..."}
                              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 resize-none"
                            />
                          </div>

                          <div className="flex justify-end gap-2 mt-2">
                            <button
                              type="button"
                              onClick={() => setIsEditingClubProfile(false)}
                              className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 cursor-pointer"
                            >
                              {language === "en" ? "Cancel" : "Hủy Bỏ"}
                            </button>
                            <button
                              type="submit"
                              disabled={isUpdatingClub}
                              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50 flex items-center gap-1"
                            >
                              <Save className="w-3.5 h-3.5" />
                              {isUpdatingClub
                                ? (language === "en" ? "Saving..." : "Đang lưu...")
                                : (language === "en" ? "Save Changes" : "Lưu Thay Đổi")}
                            </button>
                          </div>
                        </form>
                      ) : (
                        // ROSTER AND MANAGEMENT BLOCKS
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          {/* Official Members Roster */}
                          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-6 shadow-xs flex flex-col gap-4">
                            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                              <span className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-indigo-500" />
                                {language === "en" ? "Club Roster" : "Thành Viên Chính Thức"}
                              </span>
                              <span className="text-xs text-slate-400 bg-slate-50 dark:bg-slate-950 px-2.5 py-1 rounded-full border border-slate-100 dark:border-slate-850">
                                {myClub.members?.length || 0} VĐV
                              </span>
                            </h3>

                            <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800/50">
                              {myClub.members?.map((member) => (
                                <div key={member.userId} className="py-3 flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 flex items-center justify-center font-bold text-xs text-indigo-600">
                                      {member.name ? member.name.charAt(0).toUpperCase() : "M"}
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-bold text-slate-800 dark:text-white">
                                          {member.name}
                                        </span>
                                        {member.role === "leader" && (
                                          <span className="inline-flex items-center gap-0.5 px-2 py-0.2 rounded-full text-[9px] font-bold bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-950">
                                            {language === "en" ? "Leader" : "Trưởng CLB"}
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex flex-wrap items-center gap-x-2 text-[10px] text-slate-400 mt-0.5">
                                        <span>{member.email}</span>
                                        {member.athleteId && (
                                          <>
                                            <span className="text-slate-200 dark:text-slate-800">•</span>
                                            <span className="font-extrabold text-indigo-500">{member.athleteId}</span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    {myClub.leaderId === currentUser.uid && member.userId !== currentUser.uid && (
                                      <button
                                        onClick={() => handleKickMemberClick(member.userId, member.name)}
                                        className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-400 hover:text-red-500 rounded-lg transition-all cursor-pointer"
                                        title={language === "en" ? "Remove Member" : "Loại khỏi CLB"}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Leader Management Panel */}
                          <div className="flex flex-col gap-6">
                            {myClub.leaderId === currentUser.uid && (
                              <>
                                {/* Direct Invitation / Member Link Add */}
                                <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs flex flex-col gap-3">
                                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                                    {language === "en" ? "Add Athlete Directly" : "Thêm Thành Viên Trực Tiếp"}
                                  </h4>
                                  <p className="text-[11px] text-slate-400 leading-relaxed">
                                    {language === "en"
                                      ? "Enter an official System Athlete ID (e.g. VSC-0001) to link and add them to your club roster."
                                      : "Nhập Mã số VĐV Hệ Thống (VSC-xxxx) để thêm trực tiếp vận động viên đã có hồ sơ vào câu lạc bộ của bạn."}
                                  </p>

                                  <form onSubmit={handleAddDirectMemberSubmit} className="flex gap-2 mt-1">
                                    <input
                                      type="text"
                                      value={directAthleteId}
                                      onChange={(e) => setDirectAthleteId(e.target.value)}
                                      placeholder="vd: VSC-0001"
                                      className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                                    />
                                    <button
                                      type="submit"
                                      disabled={isAddingDirectMember}
                                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center justify-center"
                                    >
                                      {isAddingDirectMember ? (
                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                      ) : (
                                        <Plus className="w-4 h-4" />
                                      )}
                                    </button>
                                  </form>
                                </div>

                                {/* Pending Join Requests */}
                                <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs flex flex-col gap-3">
                                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                                    <span>{language === "en" ? "Pending Requests" : "Yêu Cầu Gia Nhập"}</span>
                                    {myClub.pendingRequests && myClub.pendingRequests.length > 0 && (
                                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px] animate-pulse">
                                        {myClub.pendingRequests.length}
                                      </span>
                                    )}
                                  </h4>

                                  {(!myClub.pendingRequests || myClub.pendingRequests.length === 0) ? (
                                    <div className="py-6 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-1 bg-slate-50/20 dark:bg-slate-950/10 rounded-xl border border-dashed border-slate-100 dark:border-slate-800">
                                      <Inbox className="w-5 h-5 text-slate-300" />
                                      <span>{language === "en" ? "No pending requests" : "Không có yêu cầu nào chờ duyệt"}</span>
                                    </div>
                                  ) : (
                                    <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                                      {myClub.pendingRequests.map((req) => (
                                        <div key={req.userId} className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-xl flex flex-col gap-2">
                                          <div>
                                            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                              {req.name}
                                            </div>
                                            <div className="text-[10px] text-slate-400 mt-0.5">
                                              {req.email} {req.athleteId && <span className="text-indigo-500 font-extrabold ml-1">({req.athleteId})</span>}
                                            </div>
                                          </div>
                                          <div className="flex justify-end gap-1">
                                            <button
                                              onClick={() => handleRequestAction(req.userId, "reject")}
                                              className="px-2.5 py-1 text-[10px] font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg cursor-pointer transition-all"
                                            >
                                              {language === "en" ? "Reject" : "Từ Chối"}
                                            </button>
                                            <button
                                              onClick={() => handleRequestAction(req.userId, "approve")}
                                              className="px-3 py-1 text-[10px] font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg cursor-pointer transition-all shadow-xs"
                                            >
                                              {language === "en" ? "Approve" : "Duyệt"}
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : myPendingRequestClub ? (
                    // USER HAS A PENDING REQUEST
                    <div className="p-8 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl shadow-xs max-w-lg mx-auto text-center flex flex-col items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center">
                        <Clock className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                          {language === "en" ? "Join Request Pending" : "Yêu Cầu Gia Nhập Đang Chờ Duyệt"}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                          {language === "en"
                            ? "You have submitted a request to join the following club. The leader will review and approve your membership soon."
                            : "Yêu cầu gia nhập của bạn đã được gửi thành công. Trưởng câu lạc bộ sẽ duyệt hồ sơ của bạn sớm."}
                        </p>
                      </div>

                      <div className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-850 p-4 rounded-xl flex items-center gap-3 text-left">
                        <img
                          src={myPendingRequestClub.logoUrl}
                          className="w-12 h-12 rounded-xl object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=150";
                          }}
                        />
                        <div>
                          <div className="text-xs font-bold text-slate-800 dark:text-white">{myPendingRequestClub.name}</div>
                          <div className="text-[10px] text-indigo-500 mt-0.5 font-bold uppercase tracking-wider">{myPendingRequestClub.province}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">Trưởng CLB: {myPendingRequestClub.leaderName}</div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleCancelJoinRequest(myPendingRequestClub.id)}
                        className="px-4 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-200/40 dark:border-red-900/40 text-xs font-bold rounded-xl cursor-pointer transition-all mt-2"
                      >
                        {language === "en" ? "Withdraw Join Request" : "Rút Lại Yêu Cầu"}
                      </button>
                    </div>
                  ) : (
                    // USER HAS NO CLUB AND NO REQUESTS -> DIRECTORY AND CREATION
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                      {/* Search and Join Directory Panel */}
                      <div className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-6 shadow-xs flex flex-col gap-4">
                        <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                          <Search className="w-4 h-4 text-indigo-500" />
                          {language === "en" ? "Join a Slingshot Club" : "Gia Nhập Câu Lạc Bộ Toàn Quốc"}
                        </h3>

                        {/* Search Bar */}
                        <div className="relative">
                          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            placeholder={language === "en" ? "Search clubs by name or province..." : "Tìm câu lạc bộ theo tên hoặc tỉnh thành..."}
                            value={clubSearchQuery}
                            onChange={(e) => setClubSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                          />
                        </div>

                        {/* Directory List */}
                        {(() => {
                          const query = clubSearchQuery.toLowerCase().trim();
                          const filtered = systemClubs.filter((c) =>
                            c.name.toLowerCase().includes(query) ||
                            c.province.toLowerCase().includes(query)
                          );

                          if (filtered.length === 0) {
                            return (
                              <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2 bg-slate-50/20 dark:bg-slate-950/10 border border-dashed border-slate-100 dark:border-slate-800 rounded-xl">
                                <Inbox className="w-6 h-6 text-slate-300" />
                                <span>{language === "en" ? "No clubs found" : "Không tìm thấy câu lạc bộ nào phù hợp"}</span>
                              </div>
                            );
                          }

                          return (
                            <div className="flex flex-col gap-3 max-h-120 overflow-y-auto pr-1">
                              {filtered.map((club) => (
                                <div
                                  key={club.id}
                                  className="p-4 bg-white dark:bg-slate-950 border border-slate-200/40 dark:border-slate-850 rounded-xl flex items-center justify-between gap-4 shadow-2xs hover:border-indigo-500/30 transition-all"
                                >
                                  <div className="flex items-center gap-3">
                                    <img
                                      src={club.logoUrl || "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=150"}
                                      alt={club.name}
                                      className="w-11 h-11 rounded-xl object-cover border border-slate-100 dark:border-slate-850"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=150";
                                      }}
                                    />
                                    <div>
                                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                        <span className="text-xs font-extrabold text-slate-800 dark:text-white">
                                          {club.name}
                                        </span>
                                        <span className="inline-flex text-[9px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.2 rounded-md">
                                          {club.province}
                                        </span>
                                      </div>
                                      <div className="text-[10px] text-slate-400 mt-0.5">
                                        Trưởng CLB: <strong>{club.leaderName}</strong> • {club.members?.length || 0} thành viên
                                      </div>
                                    </div>
                                  </div>

                                  <button
                                    onClick={() => handleJoinRequestSubmit(club.id)}
                                    disabled={isSubmittingJoinRequest}
                                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 text-[11px] font-black rounded-lg cursor-pointer transition-all"
                                  >
                                    {language === "en" ? "Join" : "Xin Vào"}
                                  </button>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Create New Club Form Panel */}
                      <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-6 shadow-xs flex flex-col gap-4">
                        <div>
                          <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <Plus className="w-4 h-4 text-emerald-500" />
                            {language === "en" ? "Register Slingshot Club" : "Thành Lập Câu Lạc Bộ Mới"}
                          </h3>
                          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                            {language === "en"
                              ? "Launch an official club on the national database to invite members and monitor combined performance stats."
                              : "Đăng ký thành lập CLB mới trên hệ thống để bắt đầu quản lý thành viên, theo dõi biểu đồ phong độ và thi đấu."}
                          </p>
                        </div>

                        <form onSubmit={handleCreateClubSubmit} className="flex flex-col gap-3.5">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                              {language === "en" ? "Club Name *" : "Tên Câu Lạc Bộ *"}
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="vd: 36 Slingshot Club"
                              value={newClubName}
                              onChange={(e) => setNewClubName(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                              {language === "en" ? "Primary Province *" : "Tỉnh Thành Hoạt Động *"}
                            </label>
                            <select
                              required
                              value={newClubProvince}
                              onChange={(e) => setNewClubProvince(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                            >
                              <option value="">-- {language === "en" ? "Select Province" : "Chọn Tỉnh Thành"} --</option>
                              {VIETNAM_PROVINCES.map((p) => (
                                <option key={p} value={p}>
                                  {p}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                              {language === "en" ? "Club Logo URL (HTTPS Image)" : "Đường Dẫn Logo (Ảnh HTTPS)"}
                            </label>
                            <input
                              type="url"
                              placeholder="https://example.com/logo.jpg"
                              value={newClubLogoUrl}
                              onChange={(e) => setNewClubLogoUrl(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                              {language === "en" ? "Motto / Description" : "Mô Tả Hoạt Động / Khẩu Hiệu"}
                            </label>
                            <textarea
                              rows={2}
                              placeholder={language === "en" ? "Tập hợp các xạ thủ Sling..." : "Giới thiệu ngắn gọn..."}
                              value={newClubDesc}
                              onChange={(e) => setNewClubDesc(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 resize-none"
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={isCreatingClub}
                            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black cursor-pointer shadow-md shadow-emerald-500/10 transition-all text-center flex items-center justify-center gap-1.5"
                          >
                            <Plus className="w-4 h-4" />
                            {isCreatingClub ? (language === "en" ? "Registering..." : "Đang tạo CLB...") : (language === "en" ? "Create Slingshot Club" : "Thành Lập CLB Ngay")}
                          </button>
                        </form>
                      </div>
                    </div>
                  )}

                  {/* Transfer Leadership Modal */}
                  {showTransferModal && myClub && (
                    <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl flex flex-col gap-4">
                        <div>
                          <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <UserCheck className="w-5 h-5 text-amber-500" />
                            {language === "en" ? "Transfer Club Leadership" : "Chuyển Nhượng Quyền Trưởng CLB"}
                          </h3>
                          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                            {language === "en"
                              ? "Select an official member of the club to hand over leadership responsibility. You will be demoted to a regular member."
                              : "Chọn một thành viên chính thức để chuyển giao vai trò Trưởng câu lạc bộ. Vai trò của bạn sẽ tự động hạ cấp xuống thành viên thường."}
                          </p>
                        </div>

                        <form onSubmit={handleTransferLeadershipSubmit} className="flex flex-col gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                              {language === "en" ? "Select New Leader" : "Chọn Trưởng CLB Mới"}
                            </label>
                            <select
                              required
                              value={transferTargetUserId}
                              onChange={(e) => setTransferTargetUserId(e.target.value)}
                              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                            >
                              <option value="">-- {language === "en" ? "Select Member" : "Chọn Thành Viên"} --</option>
                              {myClub.members
                                ?.filter((m) => m.userId !== currentUser.uid)
                                .map((m) => (
                                  <option key={m.userId} value={m.userId}>
                                    {m.name} ({m.email})
                                  </option>
                                ))}
                            </select>
                          </div>

                          <div className="flex justify-end gap-2 mt-2">
                            <button
                              type="button"
                              onClick={() => {
                                setShowTransferModal(false);
                                setTransferTargetUserId("");
                              }}
                              className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 cursor-pointer"
                            >
                              {language === "en" ? "Cancel" : "Hủy Bỏ"}
                            </button>
                            <button
                              type="submit"
                              disabled={isTransferring || !transferTargetUserId}
                              className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50"
                            >
                              {isTransferring
                                ? (language === "en" ? "Transferring..." : "Đang chuyển nhượng...")
                                : (language === "en" ? "Confirm Transfer" : "Xác Nhận Chuyển Nhượng")}
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {subTab === "created" && (
                <div>
                  {myCreatedTournaments.length === 0 ? (
                    <div className="p-10 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-center flex flex-col items-center justify-center gap-3 bg-slate-50/20 dark:bg-slate-950/10">
                      <Inbox className="w-8 h-8 text-slate-400/80" />
                      <div>
                        <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">Chưa có giải đấu do bạn tạo</h4>
                        <p className="text-[11px] text-slate-400 max-w-xs mt-1 leading-relaxed">
                          Bạn có thể ra <strong>Trang Chủ</strong> để đăng một giải đấu nội bộ hiện tại của mình lên đám mây Cloud để quản lý dễ dàng hơn.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      {myCreatedTournaments.map((tour, idx) => {
                        const isTeam = tour.competitionMode === "team";
                        const activeAthletesList = isTeam ? (tour.teamAthletes || []) : (tour.athletes || []);
                        const activeDistancesList = isTeam ? (tour.teamDistances || []) : (tour.distances || []);
                        const topAthletes = getTopAthletes(activeAthletesList, activeDistancesList);
                        const athleteStats = getTournamentAthleteStats(tour);
                        const isActive = activeHistoryId === tour.id;

                        const dateStr = tour.createdAt && typeof tour.createdAt.toDate === "function" 
                          ? tour.createdAt.toDate().toLocaleDateString("vi-VN", { hour: "2-digit", minute: "2-digit" }) 
                          : "Gần đây";

                        const isCreator = tour.creatorId === currentUser?.uid || (currentUser?.email && tour.creatorEmail && tour.creatorEmail.toLowerCase().trim() === currentUser.email.toLowerCase().trim());

                        return (
                          <div
                            key={`ctrl-created-${tour.id}-${idx}`}
                            className={`relative bg-white dark:bg-slate-900 rounded-3xl border p-5 flex flex-col gap-4 shadow-xs transition-all ${
                              isActive 
                                ? "border-indigo-500 ring-2 ring-indigo-500/15" 
                                : "border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                            }`}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                                  <Calendar className="w-3 h-3" /> {dateStr}
                                </span>
                                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100 line-clamp-1 mt-0.5">
                                  {tour.matchName}
                                </h3>
                              </div>
                              <span className={`text-[9px] font-black uppercase tracking-wider text-white px-2 py-0.5 rounded-md ${isCreator ? "bg-emerald-500" : "bg-teal-600"}`}>
                                {isCreator ? "QR Trưởng Giải" : "QR Ban Tổ Chức"}
                              </span>
                            </div>

                            {/* Summary info */}
                            <div className="bg-slate-50 dark:bg-slate-950/40 rounded-2xl p-3 border border-slate-100 dark:border-slate-800/20 text-xs flex flex-col gap-1.5">
                              <div className="flex justify-between items-center text-slate-500">
                                <span>Chế độ: <strong className="text-slate-700 dark:text-slate-300">{getTournamentModeLabel(tour, language)}</strong></span>
                                <span>VĐV tham gia: <strong className="text-slate-700 dark:text-slate-300">{athleteStats.total} VĐV {athleteStats.active > 0 && athleteStats.active !== athleteStats.total ? `(${athleteStats.active} đã thi đấu)` : ""}</strong></span>
                              </div>
                              <div className="flex justify-between items-center text-slate-500 border-t border-slate-200/40 dark:border-slate-800/40 pt-1.5">
                                <span>Trọng tài phụ trợ:</span>
                                <span className="font-bold text-slate-700 dark:text-slate-300">
                                  {tour.referees && tour.referees.length > 0 ? `${tour.referees.length} người` : "Chưa chỉ định"}
                                </span>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2 justify-end mt-1 border-t border-slate-100 dark:border-slate-800/40 pt-3">
                              <button
                                onClick={() => {
                                  setShowConfirmDeleteId(tour.id);
                                }}
                                className="p-2 text-rose-500 hover:text-white hover:bg-rose-500 border border-rose-200 hover:border-transparent dark:border-rose-950 dark:hover:bg-rose-900 rounded-xl transition-all cursor-pointer text-xs flex items-center gap-1"
                                title="Xóa giải này khỏi Cloud"
                              >
                                <Trash2 className="w-4 h-4" /> Xóa
                              </button>

                              <button
                                onClick={() => handleOpenCopyModal(tour)}
                                className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                                title="Copy giải thành giải mới (Xóa hết điểm số cũ, giữ nguyên cấu hình)"
                              >
                                <Copy className="w-3.5 h-3.5" /> Sao chép
                              </button>
                              
                              <button
                                onClick={() => onSelectTournament(tour.id, tour)}
                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                              >
                                Quản lý giải đấu <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {subTab === "referee" && (
                <div>
                  {myRefereeTournaments.length === 0 ? (
                    <div className="p-10 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-center flex flex-col items-center justify-center gap-3 bg-slate-50/20 dark:bg-slate-950/10">
                      <Award className="w-8 h-8 text-slate-400" />
                      <div>
                        <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">Chưa thấy giải được mời làm Trọng tài</h4>
                        <p className="text-[11px] text-slate-400 max-w-sm mt-1 leading-relaxed">
                          Để được phân quyền làm Trọng Tài phụ trợ nhập điểm trên mây: Hãy nhờ <strong>Trưởng giải</strong> truy cập vào tab <strong>"Cấu Hình"</strong> của giải đó &rarr; kéo xuống phần <strong>"Quản lý trọng tài (Cloud)"</strong> và thêm email <strong className="text-indigo-600 dark:text-indigo-400">{currentUser.email}</strong> của bạn vào đó nhé!
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      {myRefereeTournaments.map((tour, idx) => {
                        const isTeam = tour.competitionMode === "team";
                        const activeAthletesList = isTeam ? (tour.teamAthletes || []) : (tour.athletes || []);
                        const activeDistancesList = isTeam ? (tour.teamDistances || []) : (tour.distances || []);
                        const refAthleteStats = getTournamentAthleteStats(tour);
                        const isActive = activeHistoryId === tour.id;

                        const dateStr = tour.createdAt && typeof tour.createdAt.toDate === "function" 
                          ? tour.createdAt.toDate().toLocaleDateString("vi-VN", { hour: "2-digit", minute: "2-digit" }) 
                          : "Gần đây";

                        return (
                          <div
                            key={`ctrl-ref-${tour.id}-${idx}`}
                            className={`p-5 rounded-3xl border bg-white dark:bg-slate-900 flex flex-col gap-4 shadow-xs transition-all ${
                              isActive 
                                ? "border-amber-500 ring-2 ring-amber-500/15" 
                                : "border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                            }`}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                                  <Calendar className="w-3 h-3" /> {dateStr}
                                </span>
                                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-101 line-clamp-1 mt-0.5">
                                  {tour.matchName}
                                </h3>
                              </div>
                              <span className="text-[9px] font-black uppercase tracking-wider bg-amber-550 text-white px-2 py-0.5 rounded-md bg-amber-500">
                                Trọng Tài
                              </span>
                            </div>

                            {/* Details with Creator */}
                            <div className="bg-slate-50 dark:bg-slate-950/40 rounded-2xl p-3 border border-slate-100 dark:border-slate-800/20 text-xs flex flex-col gap-2">
                              <div className="flex justify-between items-center text-slate-500">
                                <span>Chế độ: <strong className="text-slate-700 dark:text-slate-300">{getTournamentModeLabel(tour, language)}</strong></span>
                                <span>VĐV tham gia: <strong className="text-slate-700 dark:text-slate-300">{refAthleteStats.total} VĐV {refAthleteStats.active > 0 && refAthleteStats.active !== refAthleteStats.total ? `(${refAthleteStats.active} đã thi đấu)` : ""}</strong></span>
                              </div>
                              <div className="flex justify-wrap gap-1 items-center text-[10px] text-slate-400 border-t border-slate-200/40 dark:border-slate-800/40 pt-2 leading-relaxed">
                                <User className="w-3 h-3 text-indigo-505" />
                                <span>Trưởng giải tạo: <strong className="text-indigo-650 dark:text-indigo-400">{tour.creatorEmail}</strong></span>
                              </div>
                            </div>

                            <div className="flex justify-end mt-1 border-t border-slate-100 dark:border-slate-800/40 pt-3">
                              <button
                                onClick={() => onSelectTournament(tour.id, tour)}
                                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                              >
                                <Award className="w-4 h-4" /> Vào ghi điểm / giám sát
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {subTab === "pk_challenges" && (
                <div className="space-y-6">
                  {/* 1. Athlete ELO & stats card */}
                  <div className="bg-gradient-to-br from-rose-50 to-slate-50 dark:from-rose-950/20 dark:to-slate-900 border border-rose-100/40 dark:border-rose-900/30 p-6 rounded-3xl shadow-xs flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-rose-500 bg-white flex items-center justify-center shadow-md">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt={dispName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <User className="w-6 h-6 text-slate-400" />
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] text-rose-500 font-extrabold uppercase tracking-widest bg-rose-50 dark:bg-rose-950 px-2 py-0.5 rounded border border-rose-100/40 dark:border-rose-900/20">Athlete PK Pro</span>
                        <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-101 mt-1">{dispName}</h3>
                        <p className="text-[11px] text-slate-400 font-bold uppercase mt-0.5">{profile?.club || (language === "en" ? "Independent" : "Tự do")}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-center sm:justify-end gap-x-6 gap-y-3">
                      {/* ELO Rank */}
                      <div className="text-center sm:text-right bg-white dark:bg-slate-950/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/20 min-w-[90px] shadow-xs">
                        <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">{language === "en" ? "ELO Rating" : "Điểm ELO"}</span>
                        <div className="text-xl font-black text-rose-600 flex items-center justify-center sm:justify-end gap-1 mt-0.5">
                          <Sword className="w-4 h-4 fill-rose-500 text-rose-500" />
                          <span>{myPkStats.elo}</span>
                        </div>
                      </div>

                      {/* Record Wins/Losses */}
                      <div className="text-center sm:text-right bg-white dark:bg-slate-950/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/20 min-w-[100px] shadow-xs">
                        <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">{language === "en" ? "W / D / L Record" : "Kỷ lục T/H/B"}</span>
                        <div className="text-sm font-black text-slate-800 dark:text-slate-200 mt-1">
                          <span className="text-green-600">{myPkStats.wins}T</span>
                          <span className="text-slate-300 mx-1">•</span>
                          <span className="text-gray-500">{myPkStats.draws}H</span>
                          <span className="text-slate-300 mx-1">•</span>
                          <span className="text-rose-600">{myPkStats.losses}B</span>
                        </div>
                      </div>

                      {/* Current Streak */}
                      <div className="text-center sm:text-right bg-white dark:bg-slate-950/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/20 min-w-[90px] shadow-xs">
                        <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">{language === "en" ? "Current Streak" : "Chuỗi hiện tại"}</span>
                        <div className="text-sm font-black text-amber-600 dark:text-amber-500 flex items-center justify-center sm:justify-end gap-1 mt-1">
                          <span>🔥</span>
                          <span>{myPkStats.streak} {language === "en" ? "Wins" : "Trận thắng"}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2. Active & Pending challenges */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Activity className="w-4 h-4 text-rose-500 animate-pulse" />
                      <span>{language === "en" ? "My Active & Pending Challenges" : "Kèo Đấu Đang Hoạt Động & Chờ Tìm Đối Thủ"}</span>
                    </h3>

                    {activeUserPk.length === 0 ? (
                      <div className="p-10 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-center flex flex-col items-center justify-center gap-3 bg-slate-50/20 dark:bg-slate-950/10">
                        <Inbox className="w-8 h-8 text-slate-400/80" />
                        <div>
                          <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">Không có kèo đấu hoạt động</h4>
                          <p className="text-[11px] text-slate-400 max-w-sm mt-1 leading-relaxed">
                            Bạn không có kèo đấu PK nào đang chờ hoặc đang diễn ra. Hãy ra <strong>Sảnh Đấu Trường PK</strong> để nhận kèo đấu hoặc tự tạo kèo thách đấu mới!
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onChangeActiveTab?.("pk_lobby")}
                          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                        >
                          {language === "en" ? "Go to PK Arena Lobby" : "Đến Sảnh Thách Đấu PK 🏟️"}
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {activeUserPk.map((challenge) => {
                          const isCreator = challenge.createdBy === currentUser?.uid || challenge.challengerUid === currentUser?.uid;
                          const winMechanism = challenge.winMechanism || "by_sets";
                          const formattedDate = challenge.createdAt 
                            ? (typeof challenge.createdAt.toDate === "function" 
                              ? challenge.createdAt.toDate().toLocaleDateString("vi-VN", { hour: "2-digit", minute: "2-digit" })
                              : new Date(challenge.createdAt).toLocaleDateString("vi-VN", { hour: "2-digit", minute: "2-digit" }))
                            : "Vừa xong";

                          return (
                            <div 
                              key={`ctrl-pk-active-${challenge.id}`}
                              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 flex flex-col justify-between shadow-xs hover:border-rose-200 transition-all relative overflow-hidden"
                            >
                              {/* Status Tag */}
                              <div className="absolute top-4 right-4">
                                {challenge.status === "open" ? (
                                  <span className="text-[8px] font-black uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-100 px-2 py-0.5 rounded-md animate-pulse">
                                    {language === "en" ? "Awaiting opponent" : "Đang tìm đối thủ"}
                                  </span>
                                ) : (
                                  <span className="text-[8px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-0.5 rounded-md">
                                    {language === "en" ? "Accepted & Live" : "Đã nhận kèo"}
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-col gap-1.5">
                                <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" /> {formattedDate}
                                </span>
                                <h4 className="text-sm font-black text-slate-900 dark:text-slate-101 pr-16 line-clamp-1 mt-0.5">
                                  {challenge.title}
                                </h4>

                                {/* Specifications Subheader block */}
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] text-gray-500 font-extrabold my-2 bg-slate-50 dark:bg-slate-950/40 py-1 px-2.5 rounded-lg border border-slate-150 dark:border-slate-800/30">
                                  <span className="flex items-center gap-0.5">
                                    <span>🎯</span>
                                    <span>{language === "en" ? "Target:" : "Mục tiêu:"}</span>
                                    <span className="text-gray-800 dark:text-gray-200">
                                      {challenge.targetType === "bia_giay_tinh_diem" 
                                        ? (language === "en" ? "Paper Target" : "Bia giấy tính điểm") 
                                        : (language === "en" ? "Target Plate" : "Bia mục tiêu")}
                                    </span>
                                  </span>
                                  <span className="text-gray-300">•</span>
                                  <span>
                                    {language === "en" ? "Shots/Set:" : "Số viên/Hiệp:"} <span className="text-gray-800 dark:text-gray-200">{challenge.shotsPerSet || 5}</span>
                                  </span>
                                  <span className="text-gray-300">•</span>
                                  <span>
                                    {language === "en" ? "Sets:" : "Số Hiệp:"} <span className="text-gray-800 dark:text-gray-200">{challenge.setsCount || 3}</span>
                                  </span>
                                </div>

                                <div className="text-xs text-slate-500 mt-1 space-y-1 bg-slate-50/50 dark:bg-slate-950/10 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/10">
                                  <div>{language === "en" ? "Location: " : "Địa điểm: "} <strong className="text-slate-700 dark:text-slate-300">{challenge.location}</strong></div>
                                  <div>{language === "en" ? "Win Mechanism: " : "Cách phân định: "} <strong className="text-slate-700 dark:text-slate-300">
                                    {winMechanism === "by_sets" 
                                      ? (language === "en" ? "Set-by-set win" : "Tính theo Hiệp") 
                                      : winMechanism === "by_target_shots"
                                      ? (language === "en" ? `Touch target first to ${challenge.targetTouchShots || 15}` : `Chạm ${challenge.targetTouchShots || 15} viên trước`)
                                      : (language === "en" ? "Cumulative points" : "Cộng tổng điểm")}
                                  </strong></div>
                                  <div>{language === "en" ? "Matchup: " : "Cặp Trận: "} <strong className="text-slate-700 dark:text-slate-300">
                                    <span 
                                      className="hover:underline hover:text-indigo-600 cursor-pointer transition-colors"
                                      onClick={() => {
                                        const matchingClub = systemClubs?.find(c => c.name?.trim().toLowerCase() === challenge.challengerName?.trim().toLowerCase());
                                        if (matchingClub) {
                                          if (onViewClubHub) onViewClubHub(matchingClub);
                                          else setSelectedClubHub(matchingClub);
                                        }
                                      }}
                                    >
                                      {challenge.challengerName}
                                    </span>
                                    {getPlayerClubName(challenge.challengerName) && (
                                      <span 
                                        className="text-[10px] text-indigo-600 hover:underline cursor-pointer ml-1 font-bold font-mono" 
                                        onClick={() => handleClubClick(getPlayerClubName(challenge.challengerName)!)}
                                      >
                                        ({getPlayerClubName(challenge.challengerName)})
                                      </span>
                                    )}
                                    {" vs "}
                                    <span 
                                      className="hover:underline hover:text-indigo-600 cursor-pointer transition-colors"
                                      onClick={() => {
                                        if (challenge.opponentName) {
                                          const matchingClub = systemClubs?.find(c => c.name?.trim().toLowerCase() === challenge.opponentName?.trim().toLowerCase());
                                          if (matchingClub) {
                                            if (onViewClubHub) onViewClubHub(matchingClub);
                                            else setSelectedClubHub(matchingClub);
                                          }
                                        }
                                      }}
                                    >
                                      {challenge.opponentName || "?"}
                                    </span>
                                    {challenge.opponentName && getPlayerClubName(challenge.opponentName) && (
                                      <span 
                                        className="text-[10px] text-indigo-600 hover:underline cursor-pointer ml-1 font-bold font-mono" 
                                        onClick={() => handleClubClick(getPlayerClubName(challenge.opponentName)!)}
                                      >
                                        ({getPlayerClubName(challenge.opponentName)})
                                      </span>
                                    )}
                                  </strong></div>
                                </div>

                                {/* Applicant requests list */}
                                {challenge.joinRequests && challenge.joinRequests.length > 0 && (
                                  <div className="mt-3 bg-rose-50/50 dark:bg-rose-950/10 p-3 rounded-xl border border-rose-100/50 dark:border-rose-950/20 text-xs">
                                    <div className="flex items-center gap-1 text-rose-700 dark:text-rose-400 font-black text-[10px] uppercase tracking-wider mb-2">
                                      <Users className="w-3.5 h-3.5" />
                                      <span>Yêu Cầu Ứng Tuyển ({challenge.joinRequests.length})</span>
                                    </div>
                                    <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                                      {challenge.joinRequests.map((req: any) => (
                                        <div key={req.uid} className="flex items-center justify-between gap-2 bg-white dark:bg-slate-800 p-2 rounded-lg border border-gray-100 dark:border-slate-750/50 shadow-3xs">
                                          <div className="flex items-center gap-2 min-w-0">
                                            <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 bg-slate-50">
                                              {req.avatar ? (
                                                <img src={req.avatar} alt={req.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                              ) : (
                                                <User className="w-3.5 h-3.5 text-gray-400 m-auto" />
                                              )}
                                            </div>
                                            <span className="font-bold text-gray-800 dark:text-gray-200 truncate max-w-[110px]">
                                              {req.name}
                                            </span>
                                          </div>
                                          {isCreator ? (
                                            <div className="flex items-center gap-1 shrink-0">
                                              <button
                                                type="button"
                                                onClick={() => handleApproveJoinRequest(challenge, req)}
                                                className="bg-green-600 hover:bg-green-750 text-white text-[9px] font-bold px-2 py-1 rounded cursor-pointer transition-colors"
                                              >
                                                {language === "en" ? "Approve" : "Duyệt"}
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleDeclineJoinRequest(challenge, req)}
                                                className="bg-rose-100 hover:bg-rose-200 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 text-[9px] font-bold px-2 py-1 rounded cursor-pointer transition-colors"
                                              >
                                                {language === "en" ? "Decline" : "Từ chối"}
                                              </button>
                                            </div>
                                          ) : (
                                            <span className="text-[9px] text-amber-600 font-bold italic">
                                              {language === "en" ? "Pending..." : "Chờ duyệt..."}
                                            </span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="flex justify-end gap-2.5 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/40">
                                {challenge.status === "open" && isCreator && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCancelChallengeId(challenge.id);
                                      setCancelStep(1);
                                    }}
                                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:text-rose-400 dark:bg-rose-950/20 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border border-rose-100"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>{language === "en" ? "Cancel Challenge" : "Hủy Kèo"}</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (challenge.status === "open") {
                                      openEditModal(challenge);
                                    } else {
                                      if (onSelectPkChallenge) {
                                        onSelectPkChallenge(challenge.id, "dashboard");
                                      } else {
                                        onChangeActiveTab?.("pk_lobby");
                                      }
                                    }
                                  }}
                                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs text-white ${
                                    challenge.status === "open"
                                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                                      : "bg-rose-600 hover:bg-rose-700 text-white"
                                  }`}
                                >
                                  {challenge.status === "open" ? (
                                    <>
                                      <span>⚙️</span>
                                      <span>{language === "en" ? "Edit Challenge" : "Sửa Kèo ⚙️"}</span>
                                    </>
                                  ) : (
                                    <>
                                      <Sword className="w-3.5 h-3.5 fill-white" />
                                      <span>{language === "en" ? "Enter PK Spectator" : "Vào Khán Đài PK 🏟️"}</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* 3. Completed history matches */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-500" />
                      <span>{language === "en" ? "My Completed Battle History" : "Lịch Sử Kèo Đấu Đã Hoàn Tất của Tôi"}</span>
                    </h3>

                    {completedUserPk.length === 0 ? (
                      <div className="p-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-center text-slate-400 text-xs italic bg-slate-50/20 dark:bg-slate-950/10">
                        {language === "en" ? "No completed battle records found." : "Chưa có lịch sử kèo đấu nào được ghi nhận hoàn tất."}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {completedUserPk.map((match) => {
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

                          const formattedDate = match.dateTime || match.createdAt
                            ? (typeof match.dateTime === "string" ? match.dateTime : (match.createdAt ? (typeof match.createdAt.toDate === "function" ? match.createdAt.toDate().toLocaleDateString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : new Date(match.createdAt).toLocaleDateString("vi-VN", { hour: "2-digit", minute: "2-digit" })) : ""))
                            : "";

                          return (
                            <div 
                              key={`ctrl-pk-hist-${match.id}`}
                              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-xs overflow-hidden flex flex-col justify-between"
                            >
                              {/* Top Bar */}
                              <div className="px-4 py-2 bg-slate-50/50 dark:bg-slate-950/30 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                                <span>{formattedDate}</span>
                                <span>
                                  {match.type === "solo_1v1" ? "1v1 Solo" : "Club Team"}
                                  {" • "}
                                  {winMechanism === "by_sets" 
                                    ? (language === "en" ? "Sets" : "Tính theo Hiệp") 
                                    : winMechanism === "by_target_shots"
                                    ? (language === "en" ? `Touch ${match.targetTouchShots || 15}` : `Chạm ${match.targetTouchShots || 15} Viên`)
                                    : (language === "en" ? "Total Points" : "Cộng tổng điểm")}
                                </span>
                              </div>

                              {/* Card Content */}
                              <div className="p-4 flex-1 flex flex-col justify-between">
                                <div>
                                  <h4 className="text-xs font-black text-slate-900 dark:text-slate-101 text-center mb-1 line-clamp-1">{match.title}</h4>
                                  
                                  {/* Specifications info subheader */}
                                  <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-[9px] text-gray-500 font-extrabold mb-3 bg-slate-100/60 dark:bg-slate-950/30 py-1 px-2.5 rounded-lg border border-slate-200/50 dark:border-slate-800/30 max-w-sm mx-auto">
                                    <span className="flex items-center gap-0.5">
                                      <span>🎯</span>
                                      <span>{language === "en" ? "Target:" : "Mục tiêu:"}</span>
                                      <span className="text-gray-800 dark:text-gray-200">
                                        {match.targetType === "bia_giay_tinh_diem" 
                                          ? (language === "en" ? "Paper" : "Bia giấy tính điểm") 
                                          : (language === "en" ? "Plate" : "Bia mục tiêu")}
                                      </span>
                                    </span>
                                    <span className="text-gray-300">•</span>
                                    <span>
                                      {language === "en" ? "Shots/Set:" : "Số viên/Hiệp:"} <span className="text-gray-800 dark:text-gray-200">{match.shotsPerSet || 5}</span>
                                    </span>
                                    <span className="text-gray-300">•</span>
                                    <span>
                                      {language === "en" ? "Sets:" : "Số Hiệp:"} <span className="text-gray-800 dark:text-gray-200">{match.setsCount || 3}</span>
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center justify-around gap-4 bg-slate-50/50 dark:bg-slate-950/10 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/10">
                                  {/* Challenger */}
                                  <div className="flex flex-col items-center text-center w-5/12">
                                    <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800 bg-white flex items-center justify-center shadow-xs">
                                      {match.challengerAvatar ? (
                                        <img src={match.challengerAvatar} alt={match.challengerName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                      ) : (
                                        <User className="w-4 h-4 text-slate-300" />
                                      )}
                                    </div>
                                    <span className="text-[10px] font-bold mt-1 text-slate-850 dark:text-slate-250 truncate max-w-full">{match.challengerName}</span>
                                    {challengerWin && (
                                      <span className="text-[7px] font-black uppercase text-green-600 bg-green-50 border border-green-100 px-1 py-0.2 rounded mt-0.5">Winner</span>
                                    )}
                                  </div>

                                  {/* Score Sum */}
                                  <div className="text-center shrink-0 flex flex-col items-center">
                                    <div className="font-black text-base text-slate-900 dark:text-slate-101 leading-none">
                                      {isBySets ? `${chSetsWon} - ${opSetsWon}` : `${chSum} - ${opSum}`}
                                    </div>
                                    <span className="text-[8px] text-slate-400 font-bold uppercase mt-1">
                                      {isBySets 
                                        ? (language === "en" ? `Total: ${chSum}-${opSum}` : `Tổng điểm: ${chSum}-${opSum}`) 
                                        : (language === "en" ? `Sets: ${chSetsWon}-${opSetsWon}` : `Số hiệp: ${chSetsWon}-${opSetsWon}`)
                                      }
                                    </span>
                                  </div>

                                  {/* Opponent */}
                                  <div className="flex flex-col items-center text-center w-5/12">
                                    <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800 bg-white flex items-center justify-center shadow-xs">
                                      {match.opponentAvatar ? (
                                        <img src={match.opponentAvatar} alt={match.opponentName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                      ) : (
                                        <User className="w-4 h-4 text-slate-300" />
                                      )}
                                    </div>
                                    <span className="text-[10px] font-bold mt-1 text-slate-850 dark:text-slate-250 truncate max-w-full">{match.opponentName || "Guest"}</span>
                                    {opponentWin && (
                                      <span className="text-[7px] font-black uppercase text-green-600 bg-green-50 border border-green-100 px-1 py-0.2 rounded mt-0.5">Winner</span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Footer details */}
                              <div className="px-4 py-2 bg-slate-50/50 dark:bg-slate-950/30 border-t border-slate-100 dark:border-slate-800/40 text-[10px] text-slate-500 flex items-center justify-between">
                                <span className="truncate max-w-[45%] font-medium">
                                  <span className="text-slate-400">{language === "en" ? "Loc: " : "Địa điểm: "}</span>{match.location}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  {(currentUser?.uid === match.challengerUid || currentUser?.uid === match.opponentUid || isGlobalAdmin) && (
                                    <button
                                      type="button"
                                      onClick={() => openUpdateVideoModal(match)}
                                      className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 transition-colors cursor-pointer bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 px-2 py-1 rounded border border-emerald-200 dark:border-emerald-800"
                                    >
                                      {language === "en" ? "Video 📹" : "Video 📹"}
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedDetailChallenge(match);
                                    }}
                                    className="text-[9px] font-black text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 transition-colors cursor-pointer bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 px-2.5 py-1 rounded border border-rose-200 dark:border-rose-900/40 shadow-xs"
                                  >
                                    {language === "en" ? "Details 👁️" : "Chi tiết 👁️"}
                                  </button>
                                  {isGlobalAdmin && (
                                    <button
                                      type="button"
                                      onClick={() => handleCancelPkChallenge(match.id)}
                                      className="text-[9px] font-bold text-rose-600 hover:text-rose-800 transition-colors cursor-pointer bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded border border-rose-200"
                                    >
                                      {language === "en" ? "Delete 🗑️" : "Xóa 🗑️"}
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
                </div>
              )}

              {subTab === "training" && (
                <TrainingTracker currentUser={currentUser} />
              )}
            </>
          )}

        </div>
      )}

      {showConfirmDeleteId && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 animate-fadeIn text-slate-800 dark:text-slate-100">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-sm w-full shadow-2xl flex flex-col items-center text-center gap-4">
            <div className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-full">
              <Trash2 className="w-8 h-8 animate-pulse" />
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">
              Xóa giải đấu khỏi Cloud?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
              Bạn có chắc chắn muốn xóa vĩnh viễn giải đấu{" "}
              <strong className="text-rose-600 dark:text-rose-400">
                "{tournaments.find((t) => t.id === showConfirmDeleteId)?.matchName || "Trống"}"
              </strong>{" "}
              khỏi Cloud? Toàn bộ danh sách VĐV, trọng tài và bảng điểm trực tuyến sẽ biến mất vĩnh viễn.
            </p>
            <div className="flex gap-2 w-full mt-2">
              <button
                type="button"
                onClick={() => setShowConfirmDeleteId(null)}
                className="flex-1 py-2 border border-slate-200 dark:border-slate-800 text-xs font-bold rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => handleDelete(showConfirmDeleteId)}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                Đồng ý Xóa
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {copyModalTour && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center z-[10009] p-4 animate-fadeIn text-slate-800 dark:text-slate-100 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-2xl flex flex-col gap-4 my-auto">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-2xl shrink-0">
                <Copy className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                  Xác nhận Sao Chép Giải Đấu
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tạo bản sao mới giữ nguyên cấu hình & xóa sạch điểm số
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 font-sans text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col gap-1">
                <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Giải đấu gốc:</span>
                <strong className="text-sm text-slate-900 dark:text-slate-100 font-extrabold">{copyModalTour.matchName}</strong>
                <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                  <span>Thể thức: <strong>{getTournamentModeLabel(copyModalTour, language)}</strong></span>
                  <span>VĐV: <strong>{getTournamentAthleteStats(copyModalTour).total} VĐV</strong></span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300">
                  Tên giải đấu mới (Bản sao):
                </label>
                <input
                  type="text"
                  value={copyMatchName}
                  onChange={(e) => setCopyMatchName(e.target.value)}
                  placeholder="Nhập tên giải mới..."
                  className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-bold text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <span>
                  Hệ thống sẽ giữ nguyên toàn bộ cấu hình, cự ly, sơ đồ & danh sách VĐV. <strong>Tất cả điểm số (Ghi Điểm cá nhân và đồng đội) sẽ được XÓA SẠCH</strong> để sẵn sàng ghi điểm cho giải mới.
                </span>
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setCopyModalTour(null)}
                disabled={isCopying}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-xs font-bold rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmCopy}
                disabled={isCopying}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wide rounded-xl shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isCopying ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
                Xác nhận Sao Chép
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 2-Step Leave Club Confirmation Modal */}
      {showLeaveClubModalStep > 0 && myClub && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-[10010] p-4 animate-fadeIn text-slate-800 dark:text-slate-100">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-sm w-full shadow-2xl flex flex-col items-center text-center gap-4">
            {showLeaveClubModalStep === 1 ? (
              <>
                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-500 rounded-full">
                  <AlertTriangle className="w-8 h-8 animate-bounce" />
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                  {language === "en" ? "Leave Club Request" : "Yêu cầu rời Câu Lạc Bộ"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
                  {language === "en" 
                    ? `You are requesting to leave "${myClub.name}". Your historical scores and contributions will remain with the club, but you will no longer be an official member.`
                    : `Bạn đang gửi yêu cầu rời khỏi câu lạc bộ "${myClub.name}". Mọi kết quả thi đấu lịch sử của bạn vẫn nằm lại CLB, nhưng bạn sẽ không còn là thành viên chính thức.`}
                </p>
                <div className="flex gap-2 w-full mt-2">
                  <button
                    type="button"
                    onClick={() => setShowLeaveClubModalStep(0)}
                    className="flex-1 py-2.5 border border-slate-200 dark:border-slate-800 text-xs font-bold rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    {language === "en" ? "Cancel" : "Hủy bỏ"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLeaveClubModalStep(2)}
                    className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer"
                  >
                    {language === "en" ? "Continue" : "Tiếp tục"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-full">
                  <LogOut className="w-8 h-8 animate-pulse" />
                </div>
                <h3 className="text-base sm:text-lg font-black text-red-600 dark:text-red-400 uppercase tracking-tight">
                  {language === "en" ? "Final Confirmation" : "Xác nhận lần cuối"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans font-bold">
                  {language === "en"
                    ? "This action is irreversible! You will become a Free Agent immediately. To rejoin this club, you must apply and be approved again."
                    : "Hành động này KHÔNG THỂ HOÀN TÁC! Bạn sẽ ngay lập tức trở thành vận động viên tự do. Muốn tham gia lại câu lạc bộ này, bạn phải nộp đơn xét duyệt từ đầu."}
                </p>
                <div className="flex gap-2 w-full mt-2">
                  <button
                    type="button"
                    onClick={() => setShowLeaveClubModalStep(1)}
                    className="flex-1 py-2.5 border border-slate-200 dark:border-slate-800 text-xs font-bold rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    {language === "en" ? "Back" : "Quay lại"}
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmLeaveClubStep2}
                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer"
                  >
                    {language === "en" ? "Confirm Leave" : "Xác nhận Rời"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* 2-Step Kick Member Confirmation Modal */}
      {showKickMemberModalStep > 0 && myClub && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-[10010] p-4 animate-fadeIn text-slate-800 dark:text-slate-100">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-sm w-full shadow-2xl flex flex-col items-center text-center gap-4">
            {showKickMemberModalStep === 1 ? (
              <>
                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-500 rounded-full">
                  <AlertTriangle className="w-8 h-8 animate-bounce" />
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                  {language === "en" ? "Remove Member Warning" : "Cảnh báo loại bỏ thành viên"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
                  {language === "en"
                    ? `You are requesting to remove "${kickTargetName}" from "${myClub.name}". Are you sure you want to proceed?`
                    : `Bạn đang yêu cầu loại bỏ vận động viên "${kickTargetName}" khỏi câu lạc bộ "${myClub.name}". Bạn có chắc chắn muốn tiếp tục?`}
                </p>
                <div className="flex gap-2 w-full mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowKickMemberModalStep(0);
                      setKickTargetUserId("");
                      setKickTargetName("");
                    }}
                    className="flex-1 py-2.5 border border-slate-200 dark:border-slate-800 text-xs font-bold rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    {language === "en" ? "Cancel" : "Hủy bỏ"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowKickMemberModalStep(2)}
                    className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer"
                  >
                    {language === "en" ? "Continue" : "Tiếp tục"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-full">
                  <Trash2 className="w-8 h-8 animate-pulse" />
                </div>
                <h3 className="text-base sm:text-lg font-black text-red-600 dark:text-red-400 uppercase tracking-tight">
                  {language === "en" ? "Final Confirmation" : "Xác nhận lần cuối"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans font-bold">
                  {language === "en"
                    ? `This action cannot be undone! "${kickTargetName}" will be completely removed from the club's roster.`
                    : `Hành động này không thể hoàn tác! Vận động viên "${kickTargetName}" sẽ bị xóa hoàn toàn khỏi danh sách biên chế của câu lạc bộ.`}
                </p>
                <div className="flex gap-2 w-full mt-2">
                  <button
                    type="button"
                    onClick={() => setShowKickMemberModalStep(1)}
                    className="flex-1 py-2.5 border border-slate-200 dark:border-slate-800 text-xs font-bold rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    {language === "en" ? "Back" : "Quay lại"}
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmKickMemberStep2}
                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer"
                  >
                    {language === "en" ? "Remove Member" : "Xác Nhận Xóa"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================= */}
      {/* ⚙️ EDIT CHALLENGE SETTINGS MODAL                            */}
      {/* ========================================================= */}
      {isEditModalOpen && editingChallenge && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center p-4 overflow-y-auto text-slate-800 dark:text-slate-100">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh]"
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
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  {language === "en" ? "Challenge Title *" : "Tiêu đề kèo thách đấu *"}
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all font-bold"
                />
              </div>

              {/* Form Type, Target Type & Size */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                    {language === "en" ? "Challenge Format *" : "Thể thức thi đấu *"}
                  </label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as any)}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all font-bold"
                  >
                    <option value="solo_1v1">{language === "en" ? "Solo 1v1" : "Đấu đơn cá nhân 1v1"}</option>
                    <option value="team_vs_team">{language === "en" ? "Club / Team vs Team" : "Đấu đồng đội CLB"}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                    {language === "en" ? "Target Type *" : "Mục tiêu *"}
                  </label>
                  <select
                    value={editTargetType}
                    onChange={(e) => setEditTargetType(e.target.value as any)}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all font-bold"
                  >
                    <option value="bia_muc_tieu">{language === "en" ? "Target Plate (Default)" : "Bia mục tiêu (mặc định)"}</option>
                    <option value="bia_giay_tinh_diem">{language === "en" ? "Paper Scoreboard" : "Bia giấy tính điểm"}</option>
                  </select>
                </div>

                {editType === "team_vs_team" && (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                      {language === "en" ? "Team size *" : "Số lượng VĐV mỗi bên *"}
                    </label>
                    <select
                      value={editTeamSize}
                      onChange={(e) => setEditTeamSize(Number(e.target.value))}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all font-bold"
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
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                    {language === "en" ? "Select Athlete Profile *" : "Đại diện hồ sơ VĐV thi đấu *"}
                  </label>
                  <select
                    value={editSelectedAthleteId}
                    onChange={(e) => setEditSelectedAthleteId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-white transition-all font-bold"
                  >
                    {loggedInAthlete ? (
                      <option value={loggedInAthlete.id}>
                        {loggedInAthlete.name} (VSC-{loggedInAthlete.id}) - Linked Account
                      </option>
                    ) : (
                      vscSystemAthletes.map((ath) => (
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
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                    {language === "en" ? "Select Club *" : "Đại diện Câu lạc bộ thi đấu *"}
                  </label>
                  <select
                    value={editSelectedClubId}
                    onChange={(e) => setEditSelectedClubId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-white transition-all font-bold"
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
              <div className="bg-gray-50/50 dark:bg-slate-800/50 p-4 rounded-xl border border-gray-150 dark:border-slate-700 space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="editDesignateOpponent"
                    checked={editDesignateOpponent}
                    onChange={(e) => {
                      setEditDesignateOpponent(e.target.checked);
                      if (e.target.checked) {
                        if (editType === "solo_1v1") {
                          const firstOpp = vscSystemAthletes.find(a => a.id !== editSelectedAthleteId);
                          setEditDesignatedOpponentAthleteId(firstOpp?.id || "");
                        } else {
                          const firstClub = systemClubs.find(c => c.id !== editSelectedClubId);
                          setEditDesignatedOpponentClubId(firstClub?.id || "");
                        }
                      }
                    }}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="editDesignateOpponent" className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer">
                    {language === "en" ? "Designate Direct Opponent" : "Chỉ định đối thủ trực tiếp ⚔️"}
                  </label>
                </div>

                {editDesignateOpponent && (
                  <div>
                    {editType === "solo_1v1" ? (
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                          {language === "en" ? "Select Target Opponent Athlete" : "Tìm/Chọn VĐV Đối Thủ chỉ định:"}
                        </label>
                        <select
                          value={editDesignatedOpponentAthleteId}
                          onChange={(e) => setEditDesignatedOpponentAthleteId(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-white font-bold"
                        >
                          <option value="">-- {language === "en" ? "Select Opponent" : "Chọn đối thủ"} --</option>
                          {vscSystemAthletes
                            .filter(a => a.id !== editSelectedAthleteId)
                            .map((ath) => (
                              <option key={ath.id} value={ath.id}>
                                {ath.name} (VSC-{ath.id})
                              </option>
                            ))}
                        </select>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                          {language === "en" ? "Select Target Opponent Club" : "Tìm/Chọn CLB Đối Thủ chỉ định:"}
                        </label>
                        <select
                          value={editDesignatedOpponentClubId}
                          onChange={(e) => setEditDesignatedOpponentClubId(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-white font-bold"
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
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
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
                    className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all font-bold"
                  />
                </div>
              </div>

              {/* Dynamic Game Parameters: Distance, Shots per round, Rounds count */}
              <div className="bg-blue-50/30 dark:bg-slate-800/30 p-4 rounded-xl border border-blue-100/50 dark:border-slate-700 space-y-3.5">
                <span className="text-xs font-bold text-blue-900 dark:text-blue-300 uppercase tracking-widest block mb-1 border-b border-blue-100 dark:border-slate-700 pb-1">
                  {language === "en" ? "Match Settings" : "Cấu hình KÈO ĐẤU"}
                </span>

                {/* Win Mechanism */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                    {language === "en" ? "Win Mechanism *" : "Cách phân định thắng bại *"}
                  </label>
                  <select
                    value={editWinMechanism}
                    onChange={(e) => handleEditWinMechanismChange(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-white font-bold"
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
                    <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                      {language === "en" ? "Target Touch Shots (Point to win) *" : "Số viên chạm thắng *"}
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={100}
                      value={editTargetTouchShots}
                      onChange={(e) => handleEditTargetTouchShotsChange(Math.max(1, Number(e.target.value)))}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-white font-bold"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Shots per Set */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
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
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-white font-bold"
                    />
                  </div>

                  {/* Distance */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                      {language === "en" ? "Distance (e.g. 10m, 15m) *" : "Cự ly (m) *"}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="vd: 10m"
                      value={editDistance}
                      onChange={(e) => setEditDistance(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-white font-bold"
                    />
                  </div>
                </div>

                {/* Rounds Count */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                    {language === "en" ? "Number of Rounds (Sets) *" : "Hiệp đấu (Số hiệp) *"}
                  </label>
                  <div className="flex gap-2">
                    <select
                      disabled={editWinMechanism === "by_target_shots"}
                      value={editWinMechanism === "by_target_shots" ? "1" : editSetsCountOption}
                      onChange={(e) => setEditSetsCountOption(e.target.value)}
                      className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-white font-bold disabled:bg-gray-100 dark:disabled:bg-slate-950 disabled:text-gray-400"
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
                        className="w-24 px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-white font-bold"
                      />
                    )}
                  </div>
                  {editWinMechanism === "by_target_shots" && (
                    <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-1 font-semibold">
                      {language === "en" ? "Locked to 1 round for Target Shots format" : "Mặc định 1 hiệp cho thể thức Bắn chạm X viên"}
                    </p>
                  )}
                </div>
              </div>

              {/* Match Rules Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>{language === "en" ? "Match Rule & Point Format (Optional Note)" : "Ghi chú quy định luật chơi & Cách phân thắng bại"}</span>
                  <span className="text-[10px] text-gray-400 normal-case font-medium">{language === "en" ? "Optional Note" : "Không bắt buộc (Ghi chú)"}</span>
                </label>
                <input
                  type="text"
                  placeholder={language === "en" ? "e.g., Best of 3, Chạm 11 trước, hoặc Bắn 10 viên" : "vd: Trọng tài chấm điểm, chạm 11 trước, hay Best of 3..."}
                  value={editRules}
                  onChange={(e) => setEditRules(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-55 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all font-bold"
                />
              </div>

              {/* Date & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                    {language === "en" ? "Scheduled DateTime *" : "Thời gian hẹn thi đấu *"}
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={editDateTime}
                    onChange={(e) => setEditDateTime(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-55 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                    {language === "en" ? "Venue / Location *" : "Địa điểm / Sân thi đấu *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-55 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all font-bold"
                  />
                </div>
              </div>

              {/* Optional Referee */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  {language === "en" ? "Referee Email (Optional)" : "Email Trọng tài chỉ định (Không bắt buộc)"}
                </label>
                <input
                  type="email"
                  placeholder="referee@example.com"
                  value={editRefereeEmail}
                  onChange={(e) => setEditRefereeEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-55 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all font-bold"
                />
              </div>

              {/* Challenge Description / Notes */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  {language === "en" ? "Notes / Extra description" : "Mô tả thêm / Ghi chú kèo nước"}
                </label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-55 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all font-bold"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingChallenge(null);
                  }}
                  className="px-4 py-2.5 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-150 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
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
      {/* 🏆 MATCH SCORECARD DETAILS MODAL                          */}
      {/* ========================================================= */}
      {selectedDetailChallenge !== null && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center p-4 overflow-y-auto text-slate-800 dark:text-slate-100">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh]"
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
                <h4 className="font-extrabold text-base text-gray-900 dark:text-white">{selectedDetailChallenge.title}</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex justify-center gap-4">
                  <span>{formatDate(selectedDetailChallenge.dateTime)}</span>
                  <span>•</span>
                  <span>{selectedDetailChallenge.location}</span>
                  <span>•</span>
                  <span>{language === "en" ? `Distance: ${selectedDetailChallenge.distance || "10m"}` : `Cự ly: ${selectedDetailChallenge.distance || "10m"}`}</span>
                </p>
                <div className="inline-block mt-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs font-semibold rounded-full border border-indigo-100 dark:border-indigo-900">
                  {selectedDetailChallenge.winMechanism === "by_total_points" 
                    ? (language === "en" ? "Rule: Cumulative Points" : "Luật: Cộng dồn tổng điểm")
                    : selectedDetailChallenge.winMechanism === "by_target_shots"
                    ? (language === "en" ? `Rule: Target Touch (${selectedDetailChallenge.targetTouchShots || 0} Shots)` : `Luật: Bắn chạm (${selectedDetailChallenge.targetTouchShots || 0} viên)`)
                    : (language === "en" ? "Rule: Set-by-Set Wins" : "Luật: Tính theo số hiệp thắng")}
                </div>
              </div>

              {/* Match Information Grid */}
              <div className="bg-indigo-50/40 dark:bg-slate-800/40 p-4 rounded-xl border border-indigo-100/50 dark:border-slate-700 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="block text-[10px] text-indigo-800 dark:text-indigo-300 font-bold uppercase tracking-wider mb-0.5">
                    {language === "en" ? "Target Type" : "Mục tiêu"}
                  </span>
                  <span className="font-semibold text-gray-800 dark:text-gray-250">
                    {selectedDetailChallenge.targetType === "bia_giay_tinh_diem" 
                      ? (language === "en" ? "Paper Scoreboard" : "Bia giấy tính điểm") 
                      : (language === "en" ? "Standard Target" : "Bia mục tiêu")}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-indigo-800 dark:text-indigo-300 font-bold uppercase tracking-wider mb-0.5">
                    {language === "en" ? "Shots Per Round" : "Số viên mỗi hiệp"}
                  </span>
                  <span className="font-semibold text-gray-800 dark:text-gray-250">
                    {selectedDetailChallenge.shotsPerSet || 5} {language === "en" ? "shots" : "viên"}
                  </span>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <span className="block text-[10px] text-indigo-800 dark:text-indigo-300 font-bold uppercase tracking-wider mb-0.5">
                    {language === "en" ? "Rounds Count" : "Hiệp đấu"}
                  </span>
                  <span className="font-semibold text-gray-800 dark:text-gray-250">
                    {selectedDetailChallenge.setsCount || 3} {language === "en" ? "rounds" : "hiệp"}
                  </span>
                </div>
                {selectedDetailChallenge.description && (
                  <div className="col-span-2 sm:col-span-3 border-t border-indigo-100/40 dark:border-slate-700 pt-3 mt-1">
                    <span className="block text-[10px] text-indigo-800 dark:text-indigo-300 font-bold uppercase tracking-wider mb-1">
                      {language === "en" ? "Match Description" : "Mô tả kèo đấu"}
                    </span>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed font-normal bg-white/75 dark:bg-slate-800 p-2.5 rounded-lg border border-indigo-100/20 dark:border-slate-700 whitespace-pre-wrap">
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
                    <div className="flex items-center justify-around gap-4 bg-gray-50 dark:bg-slate-800 p-5 rounded-2xl border border-gray-100 dark:border-slate-700">
                      {/* Challenger */}
                      <div className="flex flex-col items-center text-center w-5/12">
                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-indigo-200 dark:border-slate-600 bg-white dark:bg-slate-700 flex items-center justify-center shadow-md">
                          {selectedDetailChallenge.challengerAvatar ? (
                            <img src={selectedDetailChallenge.challengerAvatar} alt={selectedDetailChallenge.challengerName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <User className="w-6 h-6 text-gray-300 dark:text-gray-500" />
                          )}
                        </div>
                        <span className="text-sm font-bold text-gray-950 dark:text-white mt-2">{selectedDetailChallenge.challengerName}</span>
                        {chWin && (
                          <span className="text-[10px] font-black uppercase text-green-700 bg-green-100 border border-green-200 px-2 py-0.5 rounded-md mt-1">Winner</span>
                        )}
                      </div>

                      {/* Main Score Display */}
                      <div className="text-center shrink-0">
                        <div className="font-extrabold text-2xl text-gray-950 dark:text-white">
                          {isBySets ? `${chSetsWon} - ${opSetsWon}` : `${chSum} - ${opSum}`}
                        </div>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase block mt-1 tracking-wider">
                          {isBySets ? (language === "en" ? "Sets Score" : "Tỷ số Hiệp") : (language === "en" ? "Points Score" : "Tỷ số Điểm")}
                        </span>
                        <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 font-semibold">
                          {isBySets 
                            ? (language === "en" ? `Total points: ${chSum} - ${opSum}` : `Tổng điểm: ${chSum} - ${opSum}`) 
                            : (language === "en" ? `Sets won: ${chSetsWon} - ${opSetsWon}` : `Số hiệp thắng: ${chSetsWon} - ${opSetsWon}`)
                          }
                        </div>
                      </div>

                      {/* Opponent */}
                      <div className="flex flex-col items-center text-center w-5/12">
                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-indigo-200 dark:border-slate-600 bg-white dark:bg-slate-700 flex items-center justify-center shadow-md">
                          {selectedDetailChallenge.opponentAvatar ? (
                            <img src={selectedDetailChallenge.opponentAvatar} alt={selectedDetailChallenge.opponentName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <User className="w-6 h-6 text-gray-300 dark:text-gray-500" />
                          )}
                        </div>
                        <span className="text-sm font-bold text-gray-950 dark:text-white mt-2">{selectedDetailChallenge.opponentName || "Guest"}</span>
                        {opWin && (
                          <span className="text-[10px] font-black uppercase text-green-700 bg-green-100 border border-green-200 px-2 py-0.5 rounded-md mt-1">Winner</span>
                        )}
                      </div>
                    </div>

                    {/* Sets Breakdown */}
                    <div className="space-y-4">
                      <h5 className="font-bold text-xs text-gray-700 dark:text-gray-300 uppercase tracking-widest border-b border-gray-100 dark:border-slate-800 pb-1">
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
                            <div key={setIdx} className="bg-gray-50/50 dark:bg-slate-850 p-3.5 rounded-xl border border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                              {/* Round Number */}
                              <span className="font-extrabold text-xs text-indigo-900 dark:text-indigo-300 uppercase shrink-0">
                                {language === "en" ? `Set ${setIdx + 1}` : `Hiệp ${setIdx + 1}`}
                              </span>

                              {/* Challenger shots & score */}
                              <div className="flex items-center gap-3 w-full sm:w-auto justify-end flex-1 sm:justify-end">
                                {selectedDetailChallenge.targetType !== "bia_giay_tinh_diem" && (
                                  <div className="grid grid-cols-5 gap-1 w-fit">
                                    {Array.from({ length: shotsLimit }).map((_, shotIdx) => {
                                      const shotVal = chRowShots[shotIdx];
                                      let cellClass = "bg-gray-50 border-gray-200 text-gray-400 dark:bg-slate-900 dark:border-slate-800";
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
                                <span className="font-black text-sm text-gray-800 dark:text-white bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-gray-150 dark:border-slate-700 min-w-[28px] text-center">
                                  {chSetScore}
                                </span>
                              </div>

                              <span className="font-bold text-gray-300 hidden sm:inline">:</span>

                              {/* Opponent shots & score */}
                              <div className="flex items-center gap-3 w-full sm:w-auto justify-start flex-1 sm:justify-start">
                                <span className="font-black text-sm text-gray-800 dark:text-white bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-gray-150 dark:border-slate-700 min-w-[28px] text-center">
                                  {opSetScore}
                                </span>
                                {selectedDetailChallenge.targetType !== "bia_giay_tinh_diem" && (
                                  <div className="grid grid-cols-5 gap-1 w-fit">
                                    {Array.from({ length: shotsLimit }).map((_, shotIdx) => {
                                      const shotVal = opRowShots[shotIdx];
                                      let cellClass = "bg-gray-50 border-gray-200 text-gray-400 dark:bg-slate-900 dark:border-slate-800";
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

              {/* Videos and Proofs */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Video className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>{language === "en" ? "Match Video Streams / Proofs" : "Video Minh Chứng Trận Đấu"}</span>
                  </span>
                  {(currentUser?.uid === selectedDetailChallenge.challengerUid || currentUser?.uid === selectedDetailChallenge.opponentUid || isGlobalAdmin) && (
                    <button
                      type="button"
                      onClick={() => openUpdateVideoModal(selectedDetailChallenge)}
                      className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 px-2.5 py-1 rounded border border-emerald-200 dark:border-emerald-800 transition-colors"
                    >
                      {language === "en" ? "Edit Video 📹" : "Cập nhật Video 📹"}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Challenger live/video */}
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-150 dark:border-slate-800">
                    <div className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider mb-1 truncate">
                      {selectedDetailChallenge.challengerName}
                    </div>
                    {selectedDetailChallenge.challengerLiveUrl ? (
                      <a
                        href={selectedDetailChallenge.challengerLiveUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 break-all"
                      >
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        <span className="line-clamp-1">{selectedDetailChallenge.challengerLiveUrl}</span>
                      </a>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">
                        {language === "en" ? "No video link provided" : "Chưa cập nhật link video"}
                      </span>
                    )}
                  </div>

                  {/* Opponent live/video */}
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-150 dark:border-slate-800">
                    <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1 truncate">
                      {selectedDetailChallenge.opponentName || "Đối thủ"}
                    </div>
                    {selectedDetailChallenge.opponentLiveUrl ? (
                      <a
                        href={selectedDetailChallenge.opponentLiveUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 break-all"
                      >
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        <span className="line-clamp-1">{selectedDetailChallenge.opponentLiveUrl}</span>
                      </a>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">
                        {language === "en" ? "No video link provided" : "Chưa cập nhật link video"}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Referee email and system stats */}
              {selectedDetailChallenge.refereeEmail && (
                <div className="bg-amber-50 dark:bg-amber-950/20 rounded-xl p-3 border border-amber-100 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between">
                  <span className="font-bold">{language === "en" ? "Referee:" : "Trọng tài giám sát:"}</span>
                  <span className="font-medium bg-amber-100/50 dark:bg-amber-900/50 px-2.5 py-0.5 rounded-lg border border-amber-200 dark:border-amber-800">{selectedDetailChallenge.refereeEmail}</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 dark:bg-slate-950/20 px-6 py-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-end">
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

      {/* 2-Step Confirmation Modals for Challenge Cancellation */}
      {cancelStep === 1 && (
        <div className="fixed inset-0 z-[10020] flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-100 dark:border-slate-800 shadow-2xl text-slate-800 dark:text-slate-100">
            <h4 className="text-sm font-black uppercase text-amber-600 tracking-wider flex items-center gap-2 mb-3">
              <span>⚠️ XÁC NHẬN HỦY KÈO (BƯỚC 1/2)</span>
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-semibold">
              Bạn có chắc chắn muốn hủy và xóa hoàn toàn kèo đấu đang chờ này không?
              Một khi đã hủy, thông tin kèo đấu sẽ bị xóa khỏi sảnh PK và không thể phục hồi.
            </p>
            <div className="flex gap-3 justify-end mt-6">
              <button
                type="button"
                onClick={() => { setCancelStep(0); setCancelChallengeId(null); }}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
              >
                Quay lại
              </button>
              <button
                type="button"
                onClick={() => setCancelStep(2)}
                className="px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl transition-all shadow-md cursor-pointer"
              >
                Tiếp tục hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {cancelStep === 2 && (
        <div className="fixed inset-0 z-[10020] flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-rose-100 dark:border-slate-850 shadow-2xl text-slate-800 dark:text-slate-101">
            <h4 className="text-sm font-black uppercase text-rose-600 tracking-wider flex items-center gap-2 mb-3">
              <span>🚨 XÁC NHẬN LẦN CUỐI (BƯỚC 2/2)</span>
            </h4>
            <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed font-black bg-rose-50 dark:bg-rose-950/20 p-3 rounded-xl border border-rose-100 dark:border-rose-950/40">
              CẢNH BÁO: Tất cả yêu cầu ứng tuyển liên quan đến kèo đấu này cũng sẽ bị từ chối và xóa bỏ!
              Hành động này hoàn toàn không thể khôi phục lại. Bạn có chắc chắn muốn xác nhận xóa kèo vĩnh viễn?
            </p>
            <div className="flex gap-3 justify-end mt-6">
              <button
                type="button"
                onClick={() => setCancelStep(1)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
              >
                Trở lại bước 1
              </button>
              <button
                type="button"
                onClick={() => cancelChallengeId && handleCancelPkChallenge(cancelChallengeId)}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-all shadow-md cursor-pointer"
              >
                Đồng ý hủy vĩnh viễn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reusable Club Hub Modal */}
      {selectedClubHub && (
        <VscSystemClubsDirectory
          currentUser={currentUser}
          userRole={isGlobalAdmin ? "admin" : "user"}
          history={[]}
          onlineTournaments={onlineTournaments}
          onOpenAuthModal={onOpenAuthModal}
          externalSelectedClub={selectedClubHub}
          onCloseExternalSelectedClub={() => setSelectedClubHub(null)}
          hideDirectoryList={true}
        />
      )}

      {/* Modal: Update Video URLs */}
      {isVideoModalOpen && videoTargetChallenge && createPortal(
        <div className="fixed inset-0 z-[10030] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="text-sm font-black uppercase text-indigo-900 dark:text-indigo-400 tracking-wider flex items-center gap-2">
                <Video className="w-5 h-5 text-indigo-600" />
                <span>{language === "en" ? "Update Match Video Proofs" : "Cập Nhật Video Minh Chứng Kèo Đấu"}</span>
              </h4>
              <button
                type="button"
                onClick={() => { setIsVideoModalOpen(false); setVideoTargetChallenge(null); }}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
              {language === "en" 
                ? "Provide Facebook livestream, reel, post, YouTube, or Google Drive video links for verification."
                : "Dán link video Livestream Facebook / Reel / Bài viết / YouTube làm tư liệu đối chứng."}
            </p>

            <form onSubmit={handleUpdateVideo} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  🔴 {language === "en" ? `Challenger: ${videoTargetChallenge.challengerName}` : `Kênh VĐV Thách Đấu: ${videoTargetChallenge.challengerName}`}
                </label>
                <input
                  type="url"
                  value={videoChallengerUrl}
                  onChange={(e) => setVideoChallengerUrl(e.target.value)}
                  placeholder="https://www.facebook.com/..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  🔵 {language === "en" ? `Opponent: ${videoTargetChallenge.opponentName || "Guest"}` : `Kênh VĐV Nhận Kèo: ${videoTargetChallenge.opponentName || "Đối thủ"}`}
                </label>
                <input
                  type="url"
                  value={videoOpponentUrl}
                  onChange={(e) => setVideoOpponentUrl(e.target.value)}
                  placeholder="https://www.facebook.com/..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => { setIsVideoModalOpen(false); setVideoTargetChallenge(null); }}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                >
                  {language === "en" ? "Cancel" : "Hủy"}
                </button>
                <button
                  type="submit"
                  disabled={videoSaving}
                  className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  {videoSaving ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>{language === "en" ? "Save Videos" : "Lưu Video"}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>,
        document.body
      )}

    </div>
  );
};
