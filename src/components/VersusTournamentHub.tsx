import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { 
  Trophy, 
  Users, 
  ChevronRight, 
  ChevronLeft,
  Plus, 
  Trash2, 
  Check, 
  AlertCircle, 
  Sword, 
  Play, 
  Star, 
  ListFilter, 
  Lock, 
  Award,
  ChevronDown,
  UserPlus,
  FileSpreadsheet,
  Upload,
  Search,
  X,
  PlusCircle,
  RefreshCw,
  UserCheck,
  Camera,
  Edit3,
  Calendar,
  User,
  Image as ImageIcon,
  MessageSquare
} from "lucide-react";
import { ChatWidget } from "./ChatWidget";
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  where, 
  onSnapshot, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp 
} from "firebase/firestore";
import { db, auth } from "../firebase";
import * as XLSX from "xlsx";
import { subscribeToVscSystemAthletes, subscribeToVscSystemClubs, getUserProfileByEmail, findLinkedEmailAndAvatarForAthlete } from "../lib/firebaseService";
import { VIETNAM_PROVINCES } from "../utils/provinces";

interface Athlete {
  id: string;
  name: string;
  team: string;
  avatarUrl?: string;
  gender?: "male" | "female";
  isPrimaryTeam?: boolean;
  email?: string;
  idCard?: string;
  dob?: string;
  hometown?: string;
  province?: string;
  category?: string;
  status?: string;
  vscPoints?: number;
  country?: string;
  countryCode?: string;
}

interface Club {
  id: string;
  name: string;
  avatarUrl?: string;
  province?: string;
  creatorId?: string;
  creatorEmail?: string;
}

export const AVATAR_MALE = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23f1f5f9'/><circle cx='50' cy='38' r='20' fill='%2364748b'/><path d='M22 85c0-14 11-22 28-22s28 8 28 22z' fill='%2364748b'/></svg>";
export const AVATAR_FEMALE = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23fdf2f8'/><circle cx='50' cy='38' r='20' fill='%23ec4899'/><path d='M22 85c0-14 11-22 28-22s28 8 28 22z' fill='%23ec4899'/></svg>";

const PRESET_AVATARS = [
  AVATAR_MALE,
  AVATAR_FEMALE
];

const PRESET_COUNTRIES = [
  { code: "VN", name: "Việt Nam", emoji: "🇻🇳" },
  { code: "TH", name: "Thái Lan", emoji: "🇹🇭" },
  { code: "LA", name: "Lào", emoji: "🇱🇦" },
  { code: "KH", name: "Campuchia", emoji: "🇰🇭" },
  { code: "SG", name: "Singapore", emoji: "🇸🇬" },
  { code: "MY", name: "Malaysia", emoji: "🇲🇾" },
  { code: "ID", name: "Indonesia", emoji: "🇮🇩" },
  { code: "JP", name: "Nhật Bản", emoji: "🇯🇵" },
  { code: "KR", name: "Hàn Quốc", emoji: "🇰🇷" },
  { code: "US", name: "Hoa Kỳ", emoji: "🇺🇸" },
  { code: "OTHER", name: "Khác (Tự nhập)", emoji: "🌐" }
];

const getCountryEmoji = (code: string) => {
  const found = PRESET_COUNTRIES.find(c => c.code === code);
  return found ? found.emoji : "🌐";
};

const compressImage = (base64Str: string, maxWidth = 150, maxHeight = 150): Promise<string> => {
  return new Promise((resolve) => {
    if (!base64Str || !base64Str.startsWith("data:image")) {
      resolve(base64Str);
      return;
    }
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.75));
      } else {
        resolve(base64Str);
      }
    };
    img.onerror = () => {
      resolve(base64Str);
    };
  });
};

interface VersusTournamentHubProps {
  activeHistoryId: string | null;
  athletes: Athlete[];
  isExecutor: boolean;
  userRole: string;
  language: string;
  onSelectTournament?: (id: string, tournament?: any) => void;
  initialCreateMode?: boolean;
}

export interface VersusMatch {
  id: string;
  stage: "group" | "knockout";
  groupName?: string; // "Bảng A", "Bảng B", etc.
  koRound?: "round_32" | "round_16" | "quarter" | "semi" | "final"; // knockout round
  matchIndex: number; // index inside that round/group
  nextMatchId?: string; // match ID where winner goes
  nextMatchPlayerSlot?: "playerA" | "playerB"; // which slot winner takes
  playerA: { id: string; name: string; team: string; score: number | null };
  playerB: { id: string; name: string; team: string; score: number | null };
  winnerId?: string;
  isDraw?: boolean;
  status: "pending" | "playing" | "completed";
  completedAt?: any;
}

export interface VersusTournament {
  id: string;
  tournamentId: string; // references parent activeHistoryId
  name: string;
  numGroups: number; // 2 to 32
  qualifiersPerGroup: number; // 1 to 4
  status: "setup" | "group_stage" | "knockout" | "completed";
  athletes: Athlete[];
  groups: Record<string, string[]>; // e.g. {"Bảng A": ["ath-1", "ath-2"], "Bảng B": [...]}
  createdAt?: any;
  groupStageFormat?: "round_robin" | "score_shootout" | "mini_pk";
  knockoutFormat?: "points" | "shots" | "sudden_death";
  groupShotsCount?: number;
  knockoutShotsCount?: number;
  athleteScores?: Record<string, number>;
  groupFinalOption?: "play_final" | "by_score";
  semiDrawOption?: "fixed" | "redraw";
  semiDrawCompleted?: boolean;
  startDate?: string;
  endDate?: string;
  location?: string;
  rules?: string;
  avatarUrl?: string;
  bannerUrl?: string;
}

// Helper to generate a mini knockout bracket inside a group
export const generateGroupKnockoutMatches = (
  groupName: string, 
  athIds: string[], 
  selectedAthletes: Athlete[], 
  startMatchIdx: number,
  groupFinalOption?: "play_final" | "by_score"
) => {
  const N = athIds.length;
  if (N <= 1) return { matches: [], nextIdx: startMatchIdx };

  // If groupFinalOption is "by_score", we ONLY generate direct matches without a final match of the mini bracket
  if (groupFinalOption === "by_score") {
    const matches: any[] = [];
    let currentIdx = startMatchIdx;
    const numMatches = Math.ceil(N / 2);

    for (let i = 0; i < numMatches; i++) {
      const pAId = athIds[2 * i];
      const pBId = athIds[2 * i + 1];

      const docRef = doc(collection(db, "versus_matches"));
      const match: any = {
        id: docRef.id,
        stage: "group" as const,
        groupName,
        matchIndex: currentIdx++,
        playerA: { id: "", name: "BYE", team: "", score: null },
        playerB: { id: "", name: "BYE", team: "", score: null },
        status: "pending" as const,
        koLevel: 1
      };

      if (pAId) {
        const athA = selectedAthletes.find(a => a.id === pAId)!;
        match.playerA = { id: athA.id, name: athA.name, team: athA.team, score: null };
      }
      if (pBId) {
        const athB = selectedAthletes.find(a => a.id === pBId)!;
        match.playerB = { id: athB.id, name: athB.name, team: athB.team, score: null };
      }

      // Auto BYE
      if (pAId && !pBId) {
        match.winnerId = pAId;
        match.status = "completed" as const;
        match.playerA.score = 1;
        match.playerB.score = 0;
      } else if (!pAId && pBId) {
        match.winnerId = pBId;
        match.status = "completed" as const;
        match.playerA.score = 0;
        match.playerB.score = 1;
      }

      matches.push(match);
    }

    return { matches, nextIdx: currentIdx };
  }

  let size = 2;
  while (size < N) size *= 2; // 2, 4, 8, 16...

  let currentIdx = startMatchIdx;
  let roundsCount = Math.log2(size);
  const roundsMatches: any[][] = [];

  // Final round
  const finalDocRef = doc(collection(db, "versus_matches"));
  const finalMatch = {
    id: finalDocRef.id,
    stage: "group" as const,
    groupName,
    matchIndex: currentIdx++,
    playerA: { id: "", name: "Thắng Bán Kết 1", team: "", score: null },
    playerB: { id: "", name: "Thắng Bán Kết 2", team: "", score: null },
    status: "pending" as const,
    koLevel: roundsCount
  };
  roundsMatches.push([finalMatch]);

  // Sibling rounds (Semi-finals, Quarter-finals, etc.)
  for (let r = 1; r < roundsCount; r++) {
    const parentRound = roundsMatches[r - 1];
    const currentRoundMatches: any[] = [];
    const numMatches = parentRound.length * 2;

    for (let i = 0; i < numMatches; i++) {
      const parentMatch = parentRound[Math.floor(i / 2)];
      const docRef = doc(collection(db, "versus_matches"));
      const rName = r === 1 ? "Bán Kết" : r === 2 ? "Tứ Kết" : "Vòng Loại";
      
      currentRoundMatches.push({
        id: docRef.id,
        stage: "group" as const,
        groupName,
        matchIndex: currentIdx++,
        nextMatchId: parentMatch.id,
        nextMatchPlayerSlot: i % 2 === 0 ? "playerA" : "playerB",
        playerA: { id: "", name: `Winner ${rName} ${2*i+1}`, team: "", score: null },
        playerB: { id: "", name: `Winner ${rName} ${2*i+2}`, team: "", score: null },
        status: "pending" as const,
        koLevel: roundsCount - r
      });
    }
    roundsMatches.push(currentRoundMatches);
  }

  // Seeding: fill first round matches with actual athletes
  const firstRound = roundsMatches[roundsMatches.length - 1];
  for (let i = 0; i < firstRound.length; i++) {
    const pAId = athIds[2 * i];
    const pBId = athIds[2 * i + 1];

    if (pAId) {
      const athA = selectedAthletes.find(a => a.id === pAId)!;
      firstRound[i].playerA = { id: athA.id, name: athA.name, team: athA.team, score: null };
    } else {
      firstRound[i].playerA = { id: "", name: "BYE", team: "", score: null };
    }

    if (pBId) {
      const athB = selectedAthletes.find(a => a.id === pBId)!;
      firstRound[i].playerB = { id: athB.id, name: athB.name, team: athB.team, score: null };
    } else {
      firstRound[i].playerB = { id: "", name: "BYE", team: "", score: null };
    }

    // Auto BYE
    if (pAId && !pBId) {
      firstRound[i].winnerId = pAId;
      firstRound[i].status = "completed" as const;
      firstRound[i].playerA.score = 1;
      firstRound[i].playerB.score = 0;
    } else if (!pAId && pBId) {
      firstRound[i].winnerId = pBId;
      firstRound[i].status = "completed" as const;
      firstRound[i].playerA.score = 0;
      firstRound[i].playerB.score = 1;
    }
  }

  // Sweep forwards to propagate BYE wins
  for (let rIdx = roundsMatches.length - 1; rIdx > 0; rIdx--) {
    const rMatches = roundsMatches[rIdx];
    const parentRound = roundsMatches[rIdx - 1];

    rMatches.forEach((match) => {
      if (match.status === "completed" && match.winnerId && match.nextMatchId && match.nextMatchPlayerSlot) {
        const parentMatch = parentRound.find((pm: any) => pm.id === match.nextMatchId);
        if (parentMatch) {
          const winnerObj = match.winnerId === match.playerA.id ? match.playerA : match.playerB;
          if (match.nextMatchPlayerSlot === "playerA") {
            parentMatch.playerA = { id: winnerObj.id, name: winnerObj.name, team: winnerObj.team, score: null };
          } else {
            parentMatch.playerB = { id: winnerObj.id, name: winnerObj.name, team: winnerObj.team, score: null };
          }
        }
      }
    });
  }

  const allMatches = roundsMatches.flat();
  return { matches: allMatches, nextIdx: currentIdx };
};

const renderAthleteAvatarGlobal = (athId: string, name: string, selectedTournament: VersusTournament | null) => {
  const sysAvatar = (window as any).getVscSystemAthleteAvatar ? (window as any).getVscSystemAthleteAvatar(athId || name) : "";
  const localAth = selectedTournament?.athletes?.find(a => a.id === athId);
  const avatarUrl = sysAvatar || localAth?.avatarUrl || "";

  const initials = name ? name.trim().split(" ").pop()?.substring(0, 2).toUpperCase() : "?";

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className="w-7 h-7 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-800 cursor-pointer hover:scale-105 transition-transform"
        onClick={() => {
          if ((window as any).triggerViewAthleteProfile) {
            (window as any).triggerViewAthleteProfile(athId || name);
          }
        }}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div
      className="w-7 h-7 rounded-full bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center text-[10px] font-black font-mono shrink-0 border border-rose-200 dark:border-rose-900/30 cursor-pointer hover:scale-105 transition-transform"
      onClick={() => {
        if ((window as any).triggerViewAthleteProfile) {
          (window as any).triggerViewAthleteProfile(athId || name);
        }
      }}
    >
      {initials}
    </div>
  );
};

export const VersusTournamentHub: React.FC<VersusTournamentHubProps> = ({
  activeHistoryId,
  athletes,
  isExecutor,
  userRole,
  language,
  onSelectTournament,
  initialCreateMode,
}) => {
  const isAdmin = userRole === "admin" || isExecutor;

  const renderAthleteAvatar = (athId: string, name: string) => {
    return renderAthleteAvatarGlobal(athId, name, selectedTournament);
  };

  const [tournaments, setTournaments] = useState<VersusTournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<VersusTournament | null>(null);
  const [matches, setMatches] = useState<VersusMatch[]>([]);
  const [coordinateMode, setCoordinateMode] = useState<boolean>(false);
  const [isCreatingNewCup, setIsCreatingNewCup] = useState<boolean>(!!initialCreateMode);
  
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
  } | null>(null);

  const triggerGenerateKnockoutConfirm = () => {
    setConfirmModal({
      isOpen: true,
      title: language === "en" ? "Generate Knockout Bracket?" : "Xác Nhận Sinh Nhánh Knockout 🏆",
      message: language === "en"
        ? "Are you sure you want to generate the knockout bracket now? This will automatically compute group standings and advance qualified players. Make sure all group scores are entered!"
        : "Bạn có chắc chắn muốn khởi tạo nhánh đấu Knockout ngay bây giờ? Hệ thống sẽ tự động tính toán bảng xếp hạng vòng bảng và phân phối các đấu thủ đi tiếp vào sơ đồ loại trực tiếp. Vui lòng đảm bảo toàn bộ điểm số vòng bảng đã được ghi nhận đầy đủ!",
      confirmText: language === "en" ? "Generate Bracket" : "Sinh Nhánh Ngay",
      cancelText: language === "en" ? "Cancel" : "Hủy Bỏ",
      isDanger: false,
      onConfirm: () => {
        handleGenerateKnockout();
        setConfirmModal(null);
      }
    });
  };

  const triggerDeleteTournamentConfirm = (tournId: string) => {
    setConfirmModal({
      isOpen: true,
      title: language === "en" ? "Delete Cup Tournament?" : "Xác Nhận Xóa Giải Đấu Cúp ⚠️",
      message: language === "en"
        ? "Are you sure you want to permanently delete this Cup Tournament, along with all of its groups, standings, and matches? This action cannot be undone!"
        : "Bạn có chắc chắn muốn XÓA VĨNH VIỄN giải đấu Cúp này cùng toàn bộ thông tin bảng đấu, điểm số xếp hạng và lịch sử các trận đấu liên quan không? Hành động này không thể hoàn tác!",
      confirmText: language === "en" ? "Delete permanently" : "Xóa Vĩnh Viễn",
      cancelText: language === "en" ? "Cancel" : "Hủy Bỏ",
      isDanger: true,
      onConfirm: () => {
        handleDeleteTournament(tournId);
        setConfirmModal(null);
      }
    });
  };

  // Sync initialCreateMode prop with local state
  useEffect(() => {
    if (initialCreateMode) {
      setIsCreatingNewCup(true);
    }
  }, [initialCreateMode]);

  // Initialize coordinateMode based on selectedTournament status
  useEffect(() => {
    if (selectedTournament) {
      if (selectedTournament.status === "setup" && isExecutor) {
        setCoordinateMode(true);
      } else {
        setCoordinateMode(false);
      }
    }
  }, [selectedTournament?.id, isExecutor]);
  
  // Loading & Action states
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [activeSubTab, setActiveSubTab] = useState<"group_stage" | "knockout" | "setup">("group_stage");
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>("all");

  // Selection states for creation
  const [newTournName, setNewTournName] = useState<string>("");
  const [newNumGroups, setNewNumGroups] = useState<number>(4);
  const [newQualifiers, setNewQualifiers] = useState<number>(2);
  const [athletesPerGroup, setAthletesPerGroup] = useState<number>(4);
  const [groupStageFormat, setGroupStageFormat] = useState<"round_robin" | "score_shootout" | "mini_pk">("round_robin");
  const [newStartDate, setNewStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newEndDate, setNewEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newLocation, setNewLocation] = useState<string>("");
  const [newRules, setNewRules] = useState<string>("");
  const [newAvatarUrl, setNewAvatarUrl] = useState<string>("");
  const [newBannerUrl, setNewBannerUrl] = useState<string>("");
  const [isCompressingLogo, setIsCompressingLogo] = useState<boolean>(false);
  const [isCompressingBanner, setIsCompressingBanner] = useState<boolean>(false);
  const [groupFinalOption, setGroupFinalOption] = useState<"play_final" | "by_score">("play_final");
  const [semiDrawOption, setSemiDrawOption] = useState<"fixed" | "redraw">("fixed");
  const [knockoutFormat, setKnockoutFormat] = useState<"points" | "shots" | "sudden_death">("shots");
  const [groupShotsCount, setGroupShotsCount] = useState<number>(10);
  const [knockoutShotsCount, setKnockoutShotsCount] = useState<number>(15);
  
  // Roster management for Cup creation
  const [cupAthletes, setCupAthletes] = useState<Athlete[]>([]);
  const [athleteSearchQuery, setAthleteSearchQuery] = useState<string>("");

  // System Athletes state and subscription
  const [vscSystemAthletes, setVscSystemAthletes] = useState<Athlete[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  
  // Modal states for "Thêm Mới VĐV Cúp" (Manual Profile Modal)
  const [isAddManualModalOpen, setIsAddManualModalOpen] = useState(false);
  const [manualFormId, setManualFormId] = useState("");
  const [manualFormName, setManualFormName] = useState("");
  const [manualFormTeam, setManualFormTeam] = useState("");
  const [manualFormGender, setManualFormGender] = useState("Nam");
  const [manualFormEmail, setManualFormEmail] = useState("");
  const [manualFormIdCard, setManualFormIdCard] = useState("");
  const [manualFormDob, setManualFormDob] = useState("");
  const [manualFormHometown, setManualFormHometown] = useState("");
  const [manualFormProvince, setManualFormProvince] = useState("");
  const [manualFormCountry, setManualFormCountry] = useState("Việt Nam");
  const [manualFormCountryCode, setManualFormCountryCode] = useState("VN");
  const [manualFormCategory, setManualFormCategory] = useState("Nghiệp dư");
  const [manualFormStatus, setManualFormStatus] = useState("Thi đấu");
  const [manualFormIsPrimary, setManualFormIsPrimary] = useState(false);
  const [manualFormAvatarUrl, setManualFormAvatarUrl] = useState("");
  const [manualFormValidationErr, setManualFormValidationErr] = useState("");
  const [manualFormDuplicateSysMatch, setManualFormDuplicateSysMatch] = useState<Athlete | null>(null);

  // Modal states for "Thêm VĐV Hệ Thống Vào Cúp" (System Athlete Modal)
  const [isAddSystemAthleteModalOpen, setIsAddSystemAthleteModalOpen] = useState(false);
  const [systemAthleteSearchTerm, setSystemAthleteSearchTerm] = useState("");
  const [sysAthCategories, setSysAthCategories] = useState<Record<string, string>>({});
  const [sysAthIsPrimary, setSysAthIsPrimary] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let unsubscribeAthletes: (() => void) | undefined;
    let unsubscribeClubs: (() => void) | undefined;
    try {
      unsubscribeAthletes = subscribeToVscSystemAthletes((remoteAthletes) => {
        if (remoteAthletes) {
          setVscSystemAthletes(remoteAthletes);
        }
      });
    } catch (err) {
      console.warn("Could not subscribe VSC system athletes inside Versus Hub:", err);
    }
    try {
      unsubscribeClubs = subscribeToVscSystemClubs((remoteClubs) => {
        if (remoteClubs) {
          setClubs(remoteClubs);
        }
      });
    } catch (err) {
      console.warn("Could not subscribe VSC system clubs inside Versus Hub:", err);
    }
    return () => {
      if (unsubscribeAthletes) unsubscribeAthletes();
      if (unsubscribeClubs) unsubscribeClubs();
    };
  }, []);

  // Scoring Modal state
  const [scoringMatch, setScoringMatch] = useState<VersusMatch | null>(null);
  const [scoreA, setScoreA] = useState<string>("");
  const [scoreB, setScoreB] = useState<string>("");
  const [suddenDeathWinner, setSuddenDeathWinner] = useState<string>("");

  // Real-time listener for versus tournaments
  useEffect(() => {
    const effectiveHistoryId = activeHistoryId || "global_versus";
    if (!selectedTournament || selectedTournament.id !== effectiveHistoryId) {
      setLoading(true);
    }

    const qByParent = query(
      collection(db, "versus_tournaments"),
      where("tournamentId", "==", effectiveHistoryId)
    );

    let unsubParent = () => {};
    let unsubSelf = () => {};
    let listParent: VersusTournament[] = [];
    let listSelf: VersusTournament[] = [];

    const handleUpdate = () => {
      const mergedMap = new Map<string, VersusTournament>();
      listParent.forEach(t => mergedMap.set(t.id, t));
      listSelf.forEach(t => mergedMap.set(t.id, t));
      const list = Array.from(mergedMap.values());

      list.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt instanceof Date ? a.createdAt.getTime() : (typeof a.createdAt === 'number' ? a.createdAt : 0));
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt instanceof Date ? b.createdAt.getTime() : (typeof b.createdAt === 'number' ? b.createdAt : 0));
        return timeB - timeA;
      });

      setTournaments(list);

      if (effectiveHistoryId !== "global_versus") {
        const found = list.find(t => t.id === effectiveHistoryId);
        setSelectedTournament(found || null);
      } else {
        // Keep currently selected tournament in lobby if it still exists, otherwise keep as null to let user choose
        setSelectedTournament(prev => {
          if (!prev) return null;
          const found = list.find(t => t.id === prev.id);
          return found || null;
        });
      }
      setLoading(false);
    };

    unsubParent = onSnapshot(qByParent, (snapshot) => {
      listParent = [];
      snapshot.forEach((docSnap) => {
        listParent.push({ id: docSnap.id, ...docSnap.data() } as VersusTournament);
      });
      handleUpdate();
    }, (error) => {
      console.error("Error loading versus tournaments by parent:", error);
      setLoading(false);
    });

    if (effectiveHistoryId !== "global_versus") {
      const selfDocRef = doc(db, "versus_tournaments", effectiveHistoryId);
      unsubSelf = onSnapshot(selfDocRef, (docSnap) => {
        listSelf = [];
        if (docSnap.exists()) {
          listSelf.push({ id: docSnap.id, ...docSnap.data() } as VersusTournament);
        }
        handleUpdate();
      }, (error) => {
        console.error("Error loading versus tournament by self ID:", error);
      });
    }

    return () => {
      unsubParent();
      unsubSelf();
    };
  }, [activeHistoryId]);

  // Real-time listener for matches of selected tournament
  useEffect(() => {
    if (!selectedTournament?.id) {
      setMatches([]);
      return;
    }

    const q = query(
      collection(db, "versus_matches"),
      where("versusTournamentId", "==", selectedTournament.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: VersusMatch[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as VersusMatch);
      });
      // Sort matches by index to keep ordering consistent
      list.sort((a, b) => a.matchIndex - b.matchIndex);
      setMatches(list);
    }, (err) => {
      console.error("Error loading versus matches:", err);
    });

    return () => unsubscribe();
  }, [selectedTournament?.id]);

  // Set default tournament name when athletes or tournament changes
  useEffect(() => {
    if (athletes.length > 0) {
      setNewTournName(language === "en" ? "Match Play Cup" : "Cúp Đối Kháng");
    }
  }, [athletes, language]);

  // Reset tab based on selected tournament status
  useEffect(() => {
    if (selectedTournament) {
      if (selectedTournament.status === "setup") {
        // Fallback to group_stage so that spectators can see the initial drawn group tables instead of a blank screen
        setActiveSubTab("group_stage");
      } else if (selectedTournament.status === "knockout") {
        setActiveSubTab("knockout");
      } else {
        setActiveSubTab("group_stage");
      }
    }
  }, [selectedTournament?.id]);

  // Excel Import Handler
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: "binary" });
        const wsname = workbook.SheetNames[0];
        const ws = workbook.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

        if (data.length <= 1) {
          alert(language === "en" ? "Empty Excel file or invalid format." : "File Excel rỗng hoặc không đúng định dạng.");
          return;
        }

        // Find headers
        const headers = data[0].map((h: any) => String(h || "").trim().toLowerCase());
        const nameIdx = headers.findIndex((h) => h.includes("tên") || h.includes("name") || h.includes("họ tên"));
        const teamIdx = headers.findIndex((h) => h.includes("clb") || h.includes("đoàn") || h.includes("team") || h.includes("câu lạc bộ") || h.includes("đơn vị"));
        const genderIdx = headers.findIndex((h) => h.includes("tính") || h.includes("gender") || h.includes("nam"));

        const newAthletes: Athlete[] = [];
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (!row || row.length === 0) continue;

          const name = nameIdx !== -1 ? String(row[nameIdx] || "").trim() : String(row[0] || "").trim();
          if (!name) continue;

          const team = teamIdx !== -1 ? String(row[teamIdx] || "").trim() : (row[1] ? String(row[1] || "").trim() : "Tự do");
          const genderRaw = genderIdx !== -1 ? String(row[genderIdx] || "").trim().toLowerCase() : "nam";
          const gender = (genderRaw.includes("nữ") || genderRaw.includes("female") || genderRaw === "nữ" || genderRaw.startsWith("n")) ? "female" : "male";

          newAthletes.push({
            id: `CUP-L${Math.floor(10000 + Math.random() * 90000)}`,
            name,
            team,
            gender
          });
        }

        if (newAthletes.length > 0) {
          setCupAthletes((prev) => [...prev, ...newAthletes]);
          alert(language === "en" ? `Successfully imported ${newAthletes.length} athletes!` : `Đã nhập thành công ${newAthletes.length} vận động viên từ Excel!`);
        } else {
          alert(language === "en" ? "No valid athletes found in the file." : "Không tìm thấy vận động viên hợp lệ trong file Excel.");
        }
      } catch (err) {
        console.error("Error reading excel:", err);
        alert(language === "en" ? "Error parsing Excel file." : "Đã xảy ra lỗi khi đọc file Excel. Vui lòng đảm bảo file đúng định dạng.");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = ""; // Reset
  };

  // Add individual athlete manually via modal form save action
  const handleSaveManualProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setManualFormValidationErr("");
    setManualFormDuplicateSysMatch(null);

    if (!manualFormName.trim()) {
      setManualFormValidationErr(language === "en" ? "Please enter athlete name." : "Vui lòng điền họ tên vận động viên.");
      return;
    }

    if (!manualFormId.trim()) {
      setManualFormValidationErr(language === "en" ? "Please enter athlete ID." : "Vui lòng nhập Mã số VĐV (ID).");
      return;
    }

    const trimmedId = manualFormId.trim();

    // Check against VSC System Athletes database
    const matchedSys = vscSystemAthletes.find(
      (a) => a.id.trim().toLowerCase() === trimmedId.toLowerCase()
    );

    // Check against Cup roster
    const matchedRoster = cupAthletes.find(
      (a) => a.id.trim().toLowerCase() === trimmedId.toLowerCase()
    );

    if (matchedSys) {
      setManualFormDuplicateSysMatch(matchedSys);
      setManualFormValidationErr(
        language === "en"
          ? `DUPLICATE SYSTEM ID: Athlete ID "${trimmedId}" belongs to system athlete "${matchedSys.name}".`
          : `⚠️ TRÙNG MÃ VĐV HỆ THỐNG: Mã số VĐV (ID) "${trimmedId}" đã thuộc về VĐV "${matchedSys.name}" (${matchedSys.team || "Chưa có CLB"}) trên Hệ thống VSC. Bạn không cần tạo mới VĐV này! Vui lòng chọn "Thêm ngay VĐV này vào cúp" bên dưới, hoặc đổi Mã số VĐV (ID) khác để tiếp tục đăng ký.`
      );
      return;
    }

    if (matchedRoster) {
      setManualFormValidationErr(
        language === "en"
          ? `DUPLICATE CUP ID: Athlete ID "${trimmedId}" already exists in this cup (Athlete: "${matchedRoster.name}").`
          : `⚠️ TRÙNG MÃ VĐV TRONG CÚP: Mã số VĐV (ID) "${trimmedId}" đã tồn tại trong danh sách cúp này (VĐV: "${matchedRoster.name}"). Vui lòng kiểm tra lại hoặc đổi Mã số VĐV khác.`
      );
      return;
    }

    const newAth: Athlete = {
      id: manualFormId.trim(),
      name: manualFormName.trim(),
      team: manualFormTeam.trim() || (language === "en" ? "Free Agent" : "Tự do"),
      gender: manualFormGender === "Nữ" ? "female" : "male",
      email: manualFormEmail.trim(),
      idCard: manualFormIdCard.trim(),
      dob: manualFormDob,
      hometown: manualFormHometown.trim(),
      province: manualFormProvince,
      category: manualFormCategory,
      status: manualFormStatus,
      isPrimaryTeam: manualFormIsPrimary,
      country: manualFormCountry,
      countryCode: manualFormCountryCode,
      avatarUrl: manualFormAvatarUrl || (manualFormGender === "Nữ" ? AVATAR_FEMALE : AVATAR_MALE)
    };

    setCupAthletes((prev) => [...prev, newAth]);
    setIsAddManualModalOpen(false);

    // Reset fields
    setManualFormId("");
    setManualFormName("");
    setManualFormTeam("");
    setManualFormGender("Nam");
    setManualFormEmail("");
    setManualFormIdCard("");
    setManualFormDob("");
    setManualFormHometown("");
    setManualFormProvince("");
    setManualFormCountry("Việt Nam");
    setManualFormCountryCode("VN");
    setManualFormCategory("Nghiệp dư");
    setManualFormStatus("Thi đấu");
    setManualFormIsPrimary(false);
    setManualFormAvatarUrl("");
    setManualFormValidationErr("");
    setManualFormDuplicateSysMatch(null);
  };

  const handleLoadCloudProfile = async (emailStr: string) => {
    if (!emailStr || !emailStr.trim()) {
      alert(language === "en" ? "Please enter an Email before searching!" : "Vui lòng điền Email trước khi tra cứu!");
      return;
    }
    try {
      const profile = await getUserProfileByEmail(emailStr);
      if (profile) {
        if (profile.displayName) setManualFormName(profile.displayName);
        if (profile.cccd) setManualFormIdCard(profile.cccd);
        if (profile.birthDate) setManualFormDob(profile.birthDate);
        if (profile.address) setManualFormHometown(profile.address);
        if (profile.province) setManualFormProvince(profile.province);
        if (profile.club) setManualFormTeam(profile.club);
        if (profile.avatarUrl || profile.photoURL) {
          setManualFormAvatarUrl(profile.avatarUrl || profile.photoURL);
        }
        alert(language === "en" ? `Successfully found and auto-loaded profile of athlete "${profile.displayName || emailStr}" from Cloud!` : `Đã tìm thấy & tự động nạp thành công hồ sơ của vận động viên "${profile.displayName || emailStr}" từ đám mây Cloud!`);
      } else {
        alert(language === "en" ? `No profile found associated with email "${emailStr.trim()}" on Cloud.` : `Không tìm thấy hồ sơ cá nhân nào liên kết với email "${emailStr.trim()}" trên Cloud.`);
      }
    } catch (e) {
      console.error(e);
      alert(language === "en" ? "Could not connect to search database. Please check your network connection!" : "Không thể kết nối cơ sở dữ liệu tra cứu. Vui lòng kiểm tra lại mạng!");
    }
  };

  const handleAddVscToCup = (ath: Athlete, selectedCategory?: string, selectedIsPrimary?: boolean) => {
    const exists = cupAthletes.some(a => a.id.trim().toLowerCase() === ath.id.trim().toLowerCase());
    if (exists) {
      alert(language === "en" ? `Athlete "${ath.name}" is already in the roster!` : `Vận động viên "${ath.name}" đã có sẵn trong danh sách của cúp rồi!`);
    } else {
      const copied: Athlete = {
        ...ath,
        category: selectedCategory || "Nghiệp dư",
        isPrimaryTeam: selectedIsPrimary || false,
      };
      setCupAthletes(prev => [...prev, copied]);
    }
  };

  // Recalculate group tables based on completed group matches, mini-pk bracket progression, or direct scores
  const groupStandings = useMemo(() => {
    if (!selectedTournament) return {};

    const standings: Record<string, Array<{
      athleteId: string;
      name: string;
      team: string;
      played: number;
      won: number;
      drawn: number;
      lost: number;
      scoreDiff: number; // total successful hits / shots
      pts: number;
    }>> = {};

    const isScoreShootout = selectedTournament.groupStageFormat === "score_shootout";
    const isMiniPk = selectedTournament.groupStageFormat === "mini_pk";
    const scores = selectedTournament.athleteScores || {};

    // 1. Initial configuration for all groups
    Object.entries(selectedTournament.groups).forEach(([groupName, athIds]) => {
      standings[groupName] = (athIds as string[]).map(athId => {
        const ath = selectedTournament.athletes.find(a => a.id === athId) || { name: "Ẩn danh", team: "Tự Do" };
        return {
          athleteId: athId,
          name: ath.name,
          team: ath.team,
          played: isScoreShootout ? 1 : 0,
          won: 0,
          drawn: 0,
          lost: 0,
          scoreDiff: isScoreShootout ? (scores[athId] || 0) : 0,
          pts: isScoreShootout ? (scores[athId] || 0) : 0
        };
      });
    });

    if (isMiniPk) {
      // 2. Compute rankings based on bracket progression inside each group
      Object.entries(selectedTournament.groups).forEach(([groupName, athIds]) => {
        const groupMatches = matches.filter(m => m.stage === "group" && m.groupName === groupName);
        const finalMatch = selectedTournament.groupFinalOption === "by_score"
          ? undefined
          : groupMatches.find(m => !m.nextMatchId);
        const semiMatches = groupMatches.filter(m => finalMatch && m.nextMatchId === finalMatch.id);

        standings[groupName] = (athIds as string[]).map(athId => {
          const ath = selectedTournament.athletes.find(a => a.id === athId) || { name: "Ẩn danh", team: "Tự Do" };
          let pts = 0;
          let wonCount = 0;
          let playedCount = 0;
          let totalScore = 0;

          const athMatches = groupMatches.filter(m => m.playerA.id === athId || m.playerB.id === athId);
          // Only count actual completed or playing matches (avoid pre-filled slots count)
          const playedMatches = athMatches.filter(m => m.status === "completed" || m.status === "playing");
          playedCount = playedMatches.length;

          athMatches.forEach(m => {
            const isPlayerA = m.playerA.id === athId;
            const score = isPlayerA ? (m.playerA.score || 0) : (m.playerB.score || 0);
            totalScore += score;

            if (m.status === "completed") {
              if (m.winnerId === athId) {
                wonCount += 1;
              }
            }
          });

          // Determine bracket depth (rank pts)
          if (playedCount === 0) {
            pts = 0; // Has not played yet
          } else if (finalMatch) {
            if (finalMatch.status === "completed" && finalMatch.winnerId === athId) {
              pts = 1000; // Champion of group
            } else if ((finalMatch.playerA.id === athId || finalMatch.playerB.id === athId) && athId) {
              pts = finalMatch.status === "completed" ? 500 : 400; // Runner-up or currently in Final
            } else {
              const playedSemi = semiMatches.find(m => (m.playerA.id === athId || m.playerB.id === athId) && athId);
              if (playedSemi) {
                pts = (playedSemi.status === "completed" && playedSemi.winnerId !== athId) ? 200 : 150; // Semi-finalist
              } else {
                pts = 100; // Round 1
              }
            }
          } else {
            pts = wonCount * 10;
          }

          return {
            athleteId: athId,
            name: ath.name,
            team: ath.team,
            played: playedCount,
            won: wonCount,
            drawn: 0,
            lost: playedCount - wonCount,
            scoreDiff: totalScore,
            pts: pts
          };
        });
      });
    } else if (!isScoreShootout) {
      // 3. Populate standard round robin stats
      matches.forEach((m) => {
        if (m.stage !== "group" || m.status !== "completed" || !m.groupName) return;

        const groupArray = standings[m.groupName];
        if (!groupArray) return;

        const playerAStats = groupArray.find(p => p.athleteId === m.playerA.id);
        const playerBStats = groupArray.find(p => p.athleteId === m.playerB.id);

        if (playerAStats && playerBStats) {
          playerAStats.played += 1;
          playerBStats.played += 1;

          const sA = m.playerA.score || 0;
          const sB = m.playerB.score || 0;

          playerAStats.scoreDiff += sA;
          playerBStats.scoreDiff += sB;

          if (sA > sB) {
            playerAStats.won += 1;
            playerAStats.pts += 3;
            playerBStats.lost += 1;
          } else if (sB > sA) {
            playerBStats.won += 1;
            playerBStats.pts += 3;
            playerAStats.lost += 1;
          } else {
            // Drawn
            playerAStats.drawn += 1;
            playerAStats.pts += 1;
            playerBStats.drawn += 1;
            playerBStats.pts += 1;
          }
        }
      });
    }

    // Sort standings of each group
    Object.keys(standings).forEach((gName) => {
      standings[gName].sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        if (b.scoreDiff !== a.scoreDiff) return b.scoreDiff - a.scoreDiff;
        return a.name.localeCompare(b.name, "vi");
      });
    });

    return standings;
  }, [selectedTournament, matches]);

  // Check if all group stage matches are finished
  const isGroupStageFinished = useMemo(() => {
    if (selectedTournament?.groupStageFormat === "score_shootout") {
      return true; // direct score entry is always considered ready to advance
    }
    const groupMatches = matches.filter(m => m.stage === "group");
    if (groupMatches.length === 0) return false;
    return groupMatches.every(m => m.status === "completed");
  }, [matches, selectedTournament]);

  // Determine if all 4 Semifinalists are determined and ready to draw
  const semiPlayers = useMemo(() => {
    if (!selectedTournament) return null;
    const qfMatches = matches.filter(m => m.stage === "knockout" && m.koRound === "quarter");
    if (qfMatches.length > 0) {
      const finishedAll = qfMatches.every(m => m.status === "completed");
      if (!finishedAll) return null;

      const players: any[] = [];
      qfMatches.forEach(m => {
        const winnerObj = m.winnerId === m.playerA.id ? m.playerA : m.playerB;
        if (winnerObj && winnerObj.id) {
          players.push(winnerObj);
        }
      });
      return players.length === 4 ? players : null;
    } else {
      // If no Quarterfinals, they are group qualifiers
      const sfMatches = matches.filter(m => m.stage === "knockout" && m.koRound === "semi");
      const players: any[] = [];
      sfMatches.forEach(m => {
        if (m.playerA?.id) players.push(m.playerA);
        if (m.playerB?.id) players.push(m.playerB);
      });
      return players.length === 4 ? players : null;
    }
  }, [matches, selectedTournament]);

  // Draw Semifinals pairing randomly (Mini PK bốc thăm)
  const handleDrawSemifinals = async () => {
    if (!selectedTournament || !semiPlayers || semiPlayers.length !== 4) return;
    
    setActionLoading(true);
    try {
      const shuffled = [...semiPlayers].sort(() => Math.random() - 0.5);
      const sfMatches = matches.filter(m => m.stage === "knockout" && m.koRound === "semi");
      if (sfMatches.length !== 2) {
        alert("Không tìm thấy đủ 2 trận đấu Bán Kết.");
        return;
      }

      // Update Semifinal 1 match
      const sf1Ref = doc(db, "versus_matches", sfMatches[0].id);
      await updateDoc(sf1Ref, {
        playerA: { id: shuffled[0].id, name: shuffled[0].name, team: shuffled[0].team, score: null },
        playerB: { id: shuffled[1].id, name: shuffled[1].name, team: shuffled[1].team, score: null },
        status: "pending",
        winnerId: null
      });

      // Update Semifinal 2 match
      const sf2Ref = doc(db, "versus_matches", sfMatches[1].id);
      await updateDoc(sf2Ref, {
        playerA: { id: shuffled[2].id, name: shuffled[2].name, team: shuffled[2].team, score: null },
        playerB: { id: shuffled[3].id, name: shuffled[3].name, team: shuffled[3].team, score: null },
        status: "pending",
        winnerId: null
      });

      // Update the tournament's semiDrawCompleted flag
      const tourRef = doc(db, "versus_tournaments", selectedTournament.id);
      await updateDoc(tourRef, {
        semiDrawCompleted: true
      });

      alert(language === "en" ? "Semifinal pairings successfully drawn randomly!" : "Bốc thăm chia cặp Bán Kết (Mini PK) thành công!");
    } catch (err) {
      console.error("Error drawing semifinals:", err);
      alert("Đã xảy ra lỗi khi bốc thăm bán kết.");
    } finally {
      setActionLoading(false);
    }
  };

  // Create a new Versus / Cup Tournament
  const handleCreateTournament = async () => {
    if (!newTournName.trim()) return;
    if (cupAthletes.length < newNumGroups * 2) {
      alert(language === "en" 
        ? "Please add more athletes. Each group needs at least 2 athletes."
        : "Vui lòng thêm vận động viên. Mỗi bảng đấu cần tối thiểu 2 tuyển thủ.");
      return;
    }

    setActionLoading(true);
    try {
      // 1. Distribute randomly into groups
      const shuffled = [...cupAthletes].sort(() => Math.random() - 0.5);
      const groups: Record<string, string[]> = {};
      
      for (let i = 0; i < newNumGroups; i++) {
        const groupLetter = String.fromCharCode(65 + i); // A, B, C, D...
        groups[`Bảng ${groupLetter}`] = [];
      }

      shuffled.forEach((ath, idx) => {
        const groupIndex = idx % newNumGroups;
        const groupLetter = String.fromCharCode(65 + groupIndex);
        groups[`Bảng ${groupLetter}`].push(ath.id);
      });

      // Create main document with ID starting with tour- to match useTournamentDatabase criteria
      const tournId = "tour-versus-" + Date.now();
      const docRef = doc(db, "versus_tournaments", tournId);
      const tournamentData: VersusTournament = {
        id: tournId,
        tournamentId: activeHistoryId || "global_versus",
        name: newTournName,
        numGroups: newNumGroups,
        qualifiersPerGroup: newQualifiers,
        status: "group_stage", 
        athletes: cupAthletes,
        groups,
        createdAt: serverTimestamp(),
        groupStageFormat,
        knockoutFormat,
        groupShotsCount,
        knockoutShotsCount,
        athleteScores: {},
        groupFinalOption: groupStageFormat === "mini_pk" ? groupFinalOption : "play_final",
        semiDrawOption,
        semiDrawCompleted: false,
        startDate: newStartDate,
        endDate: newEndDate,
        location: newLocation,
        rules: newRules,
        avatarUrl: newAvatarUrl,
        bannerUrl: newBannerUrl
      };

      await setDoc(docRef, tournamentData);

      // ALSO create a corresponding document in the "tournaments" collection so it appears on the homepage as a normal tournament
      const mainTourRef = doc(db, "tournaments", tournId);
      const mainTourData = {
        id: docRef.id,
        matchName: newTournName,
        creatorId: auth.currentUser?.uid || "system",
        creatorEmail: auth.currentUser?.email || "system@vsc.vn",
        competitionMode: "individual",
        tournamentType: "versus", // Mark it as a versus/cup tournament type!
        status: "group_stage",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        startDate: newStartDate,
        endDate: newEndDate,
        location: newLocation,
        rules: newRules,
        avatarUrl: newAvatarUrl,
        bannerUrl: newBannerUrl,
        referees: [],
        subAdmins: [],
        isPublic: true,
        athletes: cupAthletes,
        teamAthletes: [],
        inputAthletes: [],
        teamInputAthletes: [],
        masterAthletes: cupAthletes,
        teamMasterAthletes: [],
        clubs: []
      };

      await setDoc(mainTourRef, mainTourData);

      // Save heavy sub-arrays in parallel independent root-level collections for homepage list subscription compatibility
      await Promise.all([
        setDoc(doc(db, "vsc_tournament_athletes", tournId), { list: cupAthletes }),
        setDoc(doc(db, "vsc_tournament_team_athletes", tournId), { list: [] }),
        setDoc(doc(db, "vsc_tournament_input_athletes", tournId), { list: cupAthletes }),
        setDoc(doc(db, "vsc_tournament_team_input_athletes", tournId), { list: [] }),
        setDoc(doc(db, "vsc_tournament_master_athletes", tournId), { list: cupAthletes }),
        setDoc(doc(db, "vsc_tournament_team_master_athletes", tournId), { list: [] }),
        setDoc(doc(db, "vsc_tournament_clubs", tournId), { list: [] }),
      ]);

      // 2. Generate group matches
      if (groupStageFormat === "round_robin") {
        let matchIdx = 0;
        const batchPromises: Promise<any>[] = [];

        Object.entries(groups).forEach(([groupName, athIds]) => {
          for (let i = 0; i < athIds.length; i++) {
            for (let j = i + 1; j < athIds.length; j++) {
              const pA = cupAthletes.find(a => a.id === athIds[i])!;
              const pB = cupAthletes.find(a => a.id === athIds[j])!;

              const matchDocRef = doc(collection(db, "versus_matches"));
              const matchData: VersusMatch & { versusTournamentId: string } = {
                id: matchDocRef.id,
                versusTournamentId: tournId,
                stage: "group",
                groupName,
                matchIndex: matchIdx++,
                playerA: { id: pA.id, name: pA.name, team: pA.team, score: null },
                playerB: { id: pB.id, name: pB.name, team: pB.team, score: null },
                status: "pending"
              };

              batchPromises.push(setDoc(matchDocRef, matchData));
            }
          }
        });

        await Promise.all(batchPromises);
      } else if (groupStageFormat === "mini_pk") {
        let matchIdx = 0;
        const batchPromises: Promise<any>[] = [];

        Object.entries(groups).forEach(([groupName, athIds]) => {
          const { matches: groupMatches, nextIdx } = generateGroupKnockoutMatches(groupName, athIds, cupAthletes, matchIdx, groupStageFormat === "mini_pk" ? groupFinalOption : "play_final");
          matchIdx = nextIdx;

          groupMatches.forEach((match) => {
            const matchDocRef = doc(db, "versus_matches", match.id);
            const matchData = {
              ...match,
              versusTournamentId: tournId
            };
            batchPromises.push(setDoc(matchDocRef, matchData));
          });
        });

        await Promise.all(batchPromises);
      }

      // Auto-select the newly created tournament immediately
      setSelectedTournament(tournamentData);
      setAthleteSearchQuery("");
      setActiveSubTab("group_stage");
      if (onSelectTournament) {
        onSelectTournament(tournId, tournamentData);
      }

    } catch (err) {
      console.error("Error creating cup tournament:", err);
      alert("Đã xảy ra lỗi khi tạo giải đấu đối kháng.");
    } finally {
      setActionLoading(false);
    }
  };

  // Generate Knockout Bracket (World Cup Bracket - Dynamic & Bulletproof Tree)
  const handleGenerateKnockout = async () => {
    if (!selectedTournament) return;
    if (!isGroupStageFinished) {
      alert(language === "en" 
        ? "All group stage matches must be completed first!" 
        : "Vui lòng hoàn thành tất cả trận đấu vòng bảng trước!");
      return;
    }

    setActionLoading(true);
    try {
      // 1. Gather all group qualifiers logically seeded
      const allQualifiers: { id: string, name: string, team: string }[] = [];
      const sortedGroupNames = Object.keys(selectedTournament.groups).sort();
      const numGroups = sortedGroupNames.length;
      const maxQual = selectedTournament.qualifiersPerGroup || 2;

      // Fetch group standings and cache winners
      const groupWinners: Record<string, { first?: any, second?: any, third?: any, fourth?: any }> = {};
      sortedGroupNames.forEach((groupName) => {
        const rows = groupStandings[groupName] || [];
        groupWinners[groupName] = {
          first: rows[0] ? selectedTournament.athletes.find(a => a.id === rows[0].athleteId) : undefined,
          second: rows[1] ? selectedTournament.athletes.find(a => a.id === rows[1].athleteId) : undefined,
          third: rows[2] ? selectedTournament.athletes.find(a => a.id === rows[2].athleteId) : undefined,
          fourth: rows[3] ? selectedTournament.athletes.find(a => a.id === rows[3].athleteId) : undefined,
        };
      });

      // Standard World Cup pairing:
      // If we take top 2 (maxQual === 2) and have at least 2 groups:
      // We pair Group i (even) 1st with Group i+1 (odd) 2nd, and vice-versa!
      // Match A: 1st of Group i vs 2nd of Group i+1
      // Match B: 1st of Group i+1 vs 2nd of Group i
      if (maxQual === 2 && numGroups >= 2) {
        // Use the perfect circular crossover pairing (Nhất Group j vs Nhì Group j+1)
        for (let j = 0; j < numGroups; j++) {
          if (j % 2 === 0) {
            const nextGroupIdx = (j + 1) % numGroups;
            const gEven = sortedGroupNames[j];
            const gOdd = sortedGroupNames[nextGroupIdx];

            const firstEven = groupWinners[gEven]?.first;
            const secondEven = groupWinners[gEven]?.second;
            const firstOdd = groupWinners[gOdd]?.first;
            const secondOdd = groupWinners[gOdd]?.second;

            // Pair 1: Nhất Even vs Nhì Odd
            if (firstEven) allQualifiers.push({ id: firstEven.id, name: firstEven.name, team: firstEven.team });
            else allQualifiers.push(null as any);
            if (secondOdd) allQualifiers.push({ id: secondOdd.id, name: secondOdd.name, team: secondOdd.team });
            else allQualifiers.push(null as any);

            // Pair 2: Nhất Odd vs Nhì Even
            if (firstOdd) allQualifiers.push({ id: firstOdd.id, name: firstOdd.name, team: firstOdd.team });
            else allQualifiers.push(null as any);
            if (secondEven) allQualifiers.push({ id: secondEven.id, name: secondEven.name, team: secondEven.team });
            else allQualifiers.push(null as any);
          }
        }
      } else if (maxQual === 4 && numGroups >= 2) {
        // Circular crossover for top 4:
        for (let j = 0; j < numGroups; j++) {
          if (j % 2 === 0) {
            const nextGroupIdx = (j + 1) % numGroups;
            const gEven = sortedGroupNames[j];
            const gOdd = sortedGroupNames[nextGroupIdx];

            const ev1 = groupWinners[gEven]?.first;
            const ev2 = groupWinners[gEven]?.second;
            const ev3 = groupWinners[gEven]?.third;
            const ev4 = groupWinners[gEven]?.fourth;

            const od1 = groupWinners[gOdd]?.first;
            const od2 = groupWinners[gOdd]?.second;
            const od3 = groupWinners[gOdd]?.third;
            const od4 = groupWinners[gOdd]?.fourth;

            // Pair 1: 1st Even vs 4th Odd
            if (ev1) allQualifiers.push({ id: ev1.id, name: ev1.name, team: ev1.team }); else allQualifiers.push(null as any);
            if (od4) allQualifiers.push({ id: od4.id, name: od4.name, team: od4.team }); else allQualifiers.push(null as any);

            // Pair 2: 2nd Even vs 3rd Odd
            if (ev2) allQualifiers.push({ id: ev2.id, name: ev2.name, team: ev2.team }); else allQualifiers.push(null as any);
            if (od3) allQualifiers.push({ id: od3.id, name: od3.name, team: od3.team }); else allQualifiers.push(null as any);

            // Pair 3: 3rd Even vs 2nd Odd
            if (ev3) allQualifiers.push({ id: ev3.id, name: ev3.name, team: ev3.team }); else allQualifiers.push(null as any);
            if (od2) allQualifiers.push({ id: od2.id, name: od2.name, team: od2.team }); else allQualifiers.push(null as any);

            // Pair 4: 4th Even vs 1st Odd
            if (ev4) allQualifiers.push({ id: ev4.id, name: ev4.name, team: ev4.team }); else allQualifiers.push(null as any);
            if (od1) allQualifiers.push({ id: od1.id, name: od1.name, team: od1.team }); else allQualifiers.push(null as any);
          }
        }
      } else {
        // Fallback for custom qualifiers count or single group
        const winners: any[] = [];
        const runners: any[] = [];
        sortedGroupNames.forEach((groupName) => {
          const w = groupWinners[groupName]?.first;
          const r = groupWinners[groupName]?.second;
          const t = groupWinners[groupName]?.third;
          const f = groupWinners[groupName]?.fourth;
          if (w) winners.push(w);
          if (r) runners.push(r);
          if (t) runners.push(t);
          if (f) runners.push(f);
        });

        // Pair Winners with Runners circularly
        for (let i = 0; i < winners.length; i++) {
          const w = winners[i];
          const r = runners[(i + 1) % runners.length] || runners[0];
          if (w) allQualifiers.push({ id: w.id, name: w.name, team: w.team });
          else allQualifiers.push(null as any);
          if (r) allQualifiers.push({ id: r.id, name: r.name, team: r.team });
          else allQualifiers.push(null as any);
        }
      }

      const totalQualifiers = allQualifiers.length;
      if (totalQualifiers < 2) {
        alert(language === "en" 
          ? "At least 2 qualified athletes are needed to start the Knockout Stage." 
          : "Cần ít nhất 2 vận động viên đi tiếp để bắt đầu vòng loại trực tiếp.");
        setActionLoading(false);
        return;
      }

      // 2. Determine ideal bracket size (closest power of 2)
      let bracketSize = 2;
      if (totalQualifiers > 16) {
        bracketSize = 32;
      } else if (totalQualifiers > 8) {
        bracketSize = 16;
      } else if (totalQualifiers > 4) {
        bracketSize = 8;
      } else if (totalQualifiers > 2) {
        bracketSize = 4;
      }

      // Determine rounds needed in reverse order
      let roundsNeeded: ("round_32" | "round_16" | "quarter" | "semi" | "final")[] = [];
      if (bracketSize === 32) {
        roundsNeeded = ["round_32", "round_16", "quarter", "semi", "final"];
      } else if (bracketSize === 16) {
        roundsNeeded = ["round_16", "quarter", "semi", "final"];
      } else if (bracketSize === 8) {
        roundsNeeded = ["quarter", "semi", "final"];
      } else if (bracketSize === 4) {
        roundsNeeded = ["semi", "final"];
      } else {
        roundsNeeded = ["final"];
      }

      const matchesByRound: Record<string, any[]> = {};
      const parentTournId = selectedTournament.id;
      const batchPromises: Promise<any>[] = [];

      // 3. Generate matches pre-linked from Finals down to first round
      // Finals
      const finalDocRef = doc(collection(db, "versus_matches"));
      matchesByRound["final"] = [{
        id: finalDocRef.id,
        stage: "knockout",
        koRound: "final",
        matchIndex: 0,
        playerA: { id: "", name: "Winner SF 1", team: "", score: null },
        playerB: { id: "", name: "Winner SF 2", team: "", score: null },
        status: "pending"
      }];

      if (roundsNeeded.includes("semi")) {
        const sf1Doc = doc(collection(db, "versus_matches"));
        const sf2Doc = doc(collection(db, "versus_matches"));
        matchesByRound["semi"] = [
          {
            id: sf1Doc.id,
            stage: "knockout",
            koRound: "semi",
            matchIndex: 0,
            nextMatchId: finalDocRef.id,
            nextMatchPlayerSlot: "playerA",
            playerA: { id: "", name: "Winner QF 1", team: "", score: null },
            playerB: { id: "", name: "Winner QF 2", team: "", score: null },
            status: "pending"
          },
          {
            id: sf2Doc.id,
            stage: "knockout",
            koRound: "semi",
            matchIndex: 1,
            nextMatchId: finalDocRef.id,
            nextMatchPlayerSlot: "playerB",
            playerA: { id: "", name: "Winner QF 3", team: "", score: null },
            playerB: { id: "", name: "Winner QF 4", team: "", score: null },
            status: "pending"
          }
        ];
      }

      if (roundsNeeded.includes("quarter")) {
        matchesByRound["quarter"] = [];
        for (let i = 0; i < 4; i++) {
          const qfDoc = doc(collection(db, "versus_matches"));
          const nextMatch = matchesByRound["semi"][Math.floor(i / 2)];
          matchesByRound["quarter"].push({
            id: qfDoc.id,
            stage: "knockout",
            koRound: "quarter",
            matchIndex: i,
            nextMatchId: nextMatch.id,
            nextMatchPlayerSlot: i % 2 === 0 ? "playerA" : "playerB",
            playerA: { id: "", name: "Winner R16 " + (2*i + 1), team: "", score: null },
            playerB: { id: "", name: "Winner R16 " + (2*i + 2), team: "", score: null },
            status: "pending"
          });
        }
      }

      if (roundsNeeded.includes("round_16")) {
        matchesByRound["round_16"] = [];
        for (let i = 0; i < 8; i++) {
          const r16Doc = doc(collection(db, "versus_matches"));
          const nextMatch = matchesByRound["quarter"][Math.floor(i / 2)];
          matchesByRound["round_16"].push({
            id: r16Doc.id,
            stage: "knockout",
            koRound: "round_16",
            matchIndex: i,
            nextMatchId: nextMatch.id,
            nextMatchPlayerSlot: i % 2 === 0 ? "playerA" : "playerB",
            playerA: { id: "", name: "Winner R32 " + (2*i + 1), team: "", score: null },
            playerB: { id: "", name: "Winner R32 " + (2*i + 2), team: "", score: null },
            status: "pending"
          });
        }
      }

      if (roundsNeeded.includes("round_32")) {
        matchesByRound["round_32"] = [];
        for (let i = 0; i < 16; i++) {
          const r32Doc = doc(collection(db, "versus_matches"));
          const nextMatch = matchesByRound["round_16"][Math.floor(i / 2)];
          matchesByRound["round_32"].push({
            id: r32Doc.id,
            stage: "knockout",
            koRound: "round_32",
            matchIndex: i,
            nextMatchId: nextMatch.id,
            nextMatchPlayerSlot: i % 2 === 0 ? "playerA" : "playerB",
            playerA: { id: "", name: "TBD", team: "", score: null },
            playerB: { id: "", name: "TBD", team: "", score: null },
            status: "pending"
          });
        }
      }

      // 4. Seeding: fill first round matches with actual qualified athletes
      const firstRoundName = roundsNeeded[0];
      const firstRoundMatches = matchesByRound[firstRoundName];

      for (let i = 0; i < firstRoundMatches.length; i++) {
        const pA = allQualifiers[2 * i];
        const pB = allQualifiers[2 * i + 1];

        if (pA) {
          firstRoundMatches[i].playerA = { id: pA.id, name: pA.name, team: pA.team, score: null };
        } else {
          firstRoundMatches[i].playerA = { id: "", name: "BYE", team: "", score: null };
        }

        if (pB) {
          firstRoundMatches[i].playerB = { id: pB.id, name: pB.name, team: pB.team, score: null };
        } else {
          firstRoundMatches[i].playerB = { id: "", name: "BYE", team: "", score: null };
        }

        // Apply BYE automatically
        if (pA && !pB) {
          firstRoundMatches[i].winnerId = pA.id;
          firstRoundMatches[i].status = "completed";
          firstRoundMatches[i].playerA.score = 1;
          firstRoundMatches[i].playerB.score = 0;
        } else if (!pA && pB) {
          firstRoundMatches[i].winnerId = pB.id;
          firstRoundMatches[i].status = "completed";
          firstRoundMatches[i].playerA.score = 0;
          firstRoundMatches[i].playerB.score = 1;
        }
      }

      // 5. Sweep forwards to propagate any automated BYE wins
      roundsNeeded.forEach((rName, rIdx) => {
        const rMatches = matchesByRound[rName];
        rMatches.forEach((match) => {
          if (match.status === "completed" && match.winnerId && match.nextMatchId && match.nextMatchPlayerSlot) {
            const nextRoundName = roundsNeeded[rIdx + 1];
            if (nextRoundName) {
              const nextRoundMatches = matchesByRound[nextRoundName];
              const nextMatch = nextRoundMatches.find((nm: any) => nm.id === match.nextMatchId);
              if (nextMatch) {
                const winnerObj = match.winnerId === match.playerA.id ? match.playerA : match.playerB;
                if (match.nextMatchPlayerSlot === "playerA") {
                  nextMatch.playerA = { id: winnerObj.id, name: winnerObj.name, team: winnerObj.team, score: null };
                } else {
                  nextMatch.playerB = { id: winnerObj.id, name: winnerObj.name, team: winnerObj.team, score: null };
                }
              }
            }
          }
        });
      });

      // 6. Write all generated matches to Firestore in batch
      Object.values(matchesByRound).flat().forEach((match) => {
        const matchData = {
          ...match,
          versusTournamentId: parentTournId
        };
        batchPromises.push(setDoc(doc(db, "versus_matches", match.id), matchData));
      });

      await Promise.all(batchPromises);

      // Update tournament status to knockout stage
      await updateDoc(doc(db, "versus_tournaments", parentTournId), {
        status: "knockout"
      });

      setActiveSubTab("knockout");
    } catch (err) {
      console.error("Error generating knockout:", err);
      alert("Đã xảy ra lỗi khi tạo vòng loại trực tiếp.");
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Match Scores
  const handleSaveMatchScore = async () => {
    if (!scoringMatch || !selectedTournament) return;

    const sA = scoreA !== "" ? parseInt(scoreA) : null;
    const sB = scoreB !== "" ? parseInt(scoreB) : null;

    if ((sA !== null && (isNaN(sA) || sA < 0)) || (sB !== null && (isNaN(sB) || sB < 0))) {
      alert(language === "en" ? "Please enter valid scores" : "Vui lòng nhập điểm số hợp lệ");
      return;
    }

    setActionLoading(true);
    try {
      const matchRef = doc(db, "versus_matches", scoringMatch.id);
      const isPreviouslyCompleted = scoringMatch.status === "completed";

      if (sA === null && sB === null) {
        // Both scores are deleted/cleared, reset match to pending
        await updateDoc(matchRef, {
          "playerA.score": null,
          "playerB.score": null,
          winnerId: null,
          isDraw: false,
          status: "pending",
          completedAt: null
        });

        // If previously completed, we must clear the winner from the next round slot
        if (isPreviouslyCompleted && scoringMatch.nextMatchId && scoringMatch.nextMatchPlayerSlot) {
          const nextMatchRef = doc(db, "versus_matches", scoringMatch.nextMatchId);
          if (scoringMatch.nextMatchPlayerSlot === "playerA") {
            await updateDoc(nextMatchRef, {
              "playerA.id": "",
              "playerA.name": language === "en" ? "Waiting..." : "Chờ xác định",
              "playerA.team": "",
              "playerA.score": null
            });
          } else {
            await updateDoc(nextMatchRef, {
              "playerB.id": "",
              "playerB.name": language === "en" ? "Waiting..." : "Chờ xác định",
              "playerB.team": "",
              "playerB.score": null
            });
          }
        }
      } else if (sA !== null && sB !== null) {
        // Both players have scores, match is completed!
        let winnerId = "";
        let isDraw = false;

        if (sA > sB) {
          winnerId = scoringMatch.playerA.id;
        } else if (sB > sA) {
          winnerId = scoringMatch.playerB.id;
        } else {
          isDraw = true;
          // If it's standard round robin group stage, draws are allowed
          // If it's knockout OR mini_pk bracket inside groups, we must select a sudden-death decider winner
          const isMiniPk = selectedTournament.groupStageFormat === "mini_pk";
          if (scoringMatch.stage === "knockout" || isMiniPk) {
            if (!suddenDeathWinner) {
              alert(language === "en" 
                ? "This round cannot end in a draw. Please select a decider winner!" 
                : "Lượt đấu này không thể kết thúc hòa. Vui lòng chọn người thắng quyết định!");
              setActionLoading(false);
              return;
            }
            winnerId = suddenDeathWinner;
          }
        }

        await updateDoc(matchRef, {
          "playerA.score": sA,
          "playerB.score": sB,
          winnerId: winnerId || null,
          isDraw,
          status: "completed",
          completedAt: serverTimestamp()
        });

        // Automatically advance the winner to the next stage (works for both group Mini-PK and knockout bracket!)
        if (scoringMatch.nextMatchId && scoringMatch.nextMatchPlayerSlot && winnerId) {
          const winnerObj = winnerId === scoringMatch.playerA.id ? scoringMatch.playerA : scoringMatch.playerB;
          const nextMatchRef = doc(db, "versus_matches", scoringMatch.nextMatchId);

          if (scoringMatch.nextMatchPlayerSlot === "playerA") {
            await updateDoc(nextMatchRef, {
              "playerA.id": winnerObj.id,
              "playerA.name": winnerObj.name,
              "playerA.team": winnerObj.team,
              "playerA.score": null
            });
          } else {
            await updateDoc(nextMatchRef, {
              "playerB.id": winnerObj.id,
              "playerB.name": winnerObj.name,
              "playerB.team": winnerObj.team,
              "playerB.score": null
            });
          }
        }

        // If it's the final match of the tournament, mark the cup as completed
        if (scoringMatch.stage === "knockout" && scoringMatch.koRound === "final") {
          await updateDoc(doc(db, "versus_tournaments", selectedTournament.id), {
            status: "completed"
          });
        }
      } else {
        // Only one player has scored, match is in progress ("playing")
        await updateDoc(matchRef, {
          "playerA.score": sA,
          "playerB.score": sB,
          winnerId: null,
          isDraw: false,
          status: "playing",
          completedAt: null
        });

        // If previously completed, we must clear the winner from the next round slot
        if (isPreviouslyCompleted && scoringMatch.nextMatchId && scoringMatch.nextMatchPlayerSlot) {
          const nextMatchRef = doc(db, "versus_matches", scoringMatch.nextMatchId);
          if (scoringMatch.nextMatchPlayerSlot === "playerA") {
            await updateDoc(nextMatchRef, {
              "playerA.id": "",
              "playerA.name": language === "en" ? "Waiting..." : "Chờ xác định",
              "playerA.team": "",
              "playerA.score": null
            });
          } else {
            await updateDoc(nextMatchRef, {
              "playerB.id": "",
              "playerB.name": language === "en" ? "Waiting..." : "Chờ xác định",
              "playerB.team": "",
              "playerB.score": null
            });
          }
        }
      }

      // Close modal
      setScoringMatch(null);
      setScoreA("");
      setScoreB("");
      setSuddenDeathWinner("");

    } catch (err) {
      console.error("Error saving score:", err);
      alert("Đã xảy ra lỗi khi lưu kết quả.");
    } finally {
      setActionLoading(false);
    }
  };

  // Submit direct group stage athlete score (for Direct Score Shootout mode)
  const handleSaveGroupScore = async (athleteId: string, score: number) => {
    if (!selectedTournament) return;
    try {
      const scores = selectedTournament.athleteScores || {};
      const updatedScores = { ...scores, [athleteId]: score };
      await updateDoc(doc(db, "versus_tournaments", selectedTournament.id), {
        athleteScores: updatedScores
      });
    } catch (err) {
      console.error("Error saving group score:", err);
      alert("Lỗi khi lưu điểm.");
    }
  };

  // Delete Cup Tournament
  const handleDeleteTournament = async (tournId: string) => {
    if (!confirm(language === "en" 
      ? "Are you sure you want to delete this Match Play Cup? This will clear all group standings and match history." 
      : "Bạn có chắc chắn muốn xóa Cúp Đối Kháng này? Thao tác này sẽ xóa sạch toàn bộ lịch sử đấu và bảng điểm.")) {
      return;
    }

    setActionLoading(true);
    try {
      const q = query(collection(db, "versus_matches"), where("versusTournamentId", "==", tournId));
      const matchSnaps = await getDocs(q);
      const deletePromises: Promise<any>[] = [];
      matchSnaps.forEach((m) => {
        deletePromises.push(deleteDoc(doc(db, "versus_matches", m.id)));
      });

      deletePromises.push(deleteDoc(doc(db, "versus_tournaments", tournId)));
      deletePromises.push(deleteDoc(doc(db, "tournaments", tournId)));
      deletePromises.push(deleteDoc(doc(db, "vsc_tournament_athletes", tournId)));
      deletePromises.push(deleteDoc(doc(db, "vsc_tournament_team_athletes", tournId)));
      deletePromises.push(deleteDoc(doc(db, "vsc_tournament_input_athletes", tournId)));
      deletePromises.push(deleteDoc(doc(db, "vsc_tournament_team_input_athletes", tournId)));
      deletePromises.push(deleteDoc(doc(db, "vsc_tournament_master_athletes", tournId)));
      deletePromises.push(deleteDoc(doc(db, "vsc_tournament_team_master_athletes", tournId)));
      deletePromises.push(deleteDoc(doc(db, "vsc_tournament_clubs", tournId)));

      await Promise.all(deletePromises);

      setSelectedTournament(null);
    } catch (err) {
      console.error("Error deleting tournament:", err);
      alert("Đã xảy ra lỗi khi xóa giải đấu.");
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered list of athletes in creation panel
  const filteredAthletesForSelection = useMemo(() => {
    return cupAthletes.filter((ath) => {
      const matchSearch = ath.name.toLowerCase().includes(athleteSearchQuery.toLowerCase()) || 
                          ath.team.toLowerCase().includes(athleteSearchQuery.toLowerCase());
      return matchSearch;
    });
  }, [cupAthletes, athleteSearchQuery]);

  // Reusable component to render match card in visual tree
  const renderMatchCard = (match: VersusMatch) => {
    const isCompleted = match.status === "completed";
    const pAWon = isCompleted && match.winnerId === match.playerA.id;
    const pBWon = isCompleted && match.winnerId === match.playerB.id;

    return (
      <div key={match.id} className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs w-full text-left flex flex-col gap-1.5">
        {/* Player A */}
        <div className="flex justify-between items-center py-1">
          <div className="flex items-center gap-2 truncate">
            {match.playerA.id ? renderAthleteAvatar(match.playerA.id, match.playerA.name) : (
              <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[9px] font-bold text-slate-400 shrink-0 border border-slate-200 dark:border-slate-800">?</div>
            )}
            <div className="min-w-0">
              <span 
                className={`text-xs truncate max-w-[100px] font-bold cursor-pointer hover:text-rose-500 transition-all flex items-center gap-1 ${
                  pAWon ? "text-emerald-500 font-extrabold" : "text-slate-700 dark:text-slate-300"
                }`}
                onClick={() => {
                  if (match.playerA.id && (window as any).triggerViewAthleteProfile) {
                    (window as any).triggerViewAthleteProfile(match.playerA.id);
                  }
                }}
              >
                <span>{match.playerA.name || "TBD"}</span>
                {match.playerA.id && (
                  <span className="text-[8px] font-mono text-slate-450 dark:text-slate-500 shrink-0">
                    ({match.playerA.id.replace("CUP-", "")})
                  </span>
                )}
              </span>
            </div>
          </div>
          <span className="font-mono text-[11px] font-black shrink-0 ml-1">
            {match.playerA.score !== null ? `${match.playerA.score}đ` : "---"}
          </span>
        </div>
        <div className="h-px bg-slate-100 dark:bg-slate-800/50"></div>
        {/* Player B */}
        <div className="flex justify-between items-center py-1">
          <div className="flex items-center gap-2 truncate">
            {match.playerB.id ? renderAthleteAvatar(match.playerB.id, match.playerB.name) : (
              <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[9px] font-bold text-slate-400 shrink-0 border border-slate-200 dark:border-slate-800">?</div>
            )}
            <div className="min-w-0">
              <span 
                className={`text-xs truncate max-w-[100px] font-bold cursor-pointer hover:text-rose-500 transition-all flex items-center gap-1 ${
                  pBWon ? "text-emerald-500 font-extrabold" : "text-slate-700 dark:text-slate-300"
                }`}
                onClick={() => {
                  if (match.playerB.id && (window as any).triggerViewAthleteProfile) {
                    (window as any).triggerViewAthleteProfile(match.playerB.id);
                  }
                }}
              >
                <span>{match.playerB.name || "TBD"}</span>
                {match.playerB.id && (
                  <span className="text-[8px] font-mono text-slate-450 dark:text-slate-500 shrink-0">
                    ({match.playerB.id.replace("CUP-", "")})
                  </span>
                )}
              </span>
            </div>
          </div>
          <span className="font-mono text-[11px] font-black shrink-0 ml-1">
            {match.playerB.score !== null ? `${match.playerB.score}đ` : "---"}
          </span>
        </div>

        {isAdmin && coordinateMode && (
          <button
            type="button"
            onClick={() => {
              setScoringMatch(match);
              setScoreA(match.playerA.score !== null ? String(match.playerA.score) : "");
              setScoreB(match.playerB.score !== null ? String(match.playerB.score) : "");
            }}
            className="w-full mt-2 py-1 text-[9px] font-black text-indigo-600 bg-indigo-50 hover:bg-indigo-100/80 rounded-lg cursor-pointer border-none animate-pulse"
          >
            {isCompleted ? "Sửa" : "Nhập điểm"}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 animate-fadeIn pb-12">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400 animate-pulse">
          <div className="w-10 h-10 border-4 border-rose-500/20 border-t-rose-500 rounded-full animate-spin"></div>
          <span className="text-xs font-bold font-mono tracking-wider uppercase">Loading database...</span>
        </div>
      ) : !selectedTournament ? (
        isCreatingNewCup ? (
          /* Create Cup Panel (If selectedTournament is null & isCreatingNewCup is true) */
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b border-slate-100 dark:border-slate-850 pb-4 gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-tight">
                  <Plus className="w-5 h-5 text-blue-600 animate-pulse shrink-0" />
                  {language === "en" ? "Setup New Match Play Cup" : "Cấu Hình & Tạo Giải Đấu Cúp Mới 🏆"}
                </h2>
                <p className="text-xs text-slate-400 mt-1">{language === "en" ? "Distribute groups randomly and prepare knockout branches" : "Bốc thăm ngẫu nhiên danh sách vận động viên vào các bảng đấu."}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreatingNewCup(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-black rounded-xl border-none cursor-pointer transition-all flex items-center gap-1 shrink-0"
              >
                <ChevronLeft className="w-4 h-4" />
                {language === "en" ? "Back to Lobby" : "Quay lại Sảnh"}
              </button>
            </div>

            {!isAdmin ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <Lock className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                {language === "en" 
                  ? "Only administrators or tournament directors can create Cup Tournaments." 
                  : "Chỉ Ban tổ chức hoặc Admin mới có quyền thiết lập và tạo giải đấu Cúp."}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form Config */}
                <div className="lg:col-span-1 flex flex-col gap-5 border-r border-slate-100 dark:border-slate-800/80 pr-0 lg:pr-6">
                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      {language === "en" ? "Cup Tournament Name" : "Tên Giải Đấu Cúp"}
                    </label>
                    <input
                      type="text"
                      value={newTournName}
                      onChange={(e) => setNewTournName(e.target.value)}
                      placeholder="e.g. Cúp Champions League VSC"
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 font-bold dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                        {language === "en" ? "Num Groups" : "Số Bảng"}
                      </label>
                      <div className="relative">
                        <select
                          value={newNumGroups}
                          onChange={(e) => {
                            const num = parseInt(e.target.value);
                            setNewNumGroups(num);
                          }}
                          className="w-full px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 appearance-none focus:outline-none"
                        >
                          {[2, 3, 4, 6, 8, 10, 12, 16, 20, 24, 32].map((num) => (
                            <option key={num} value={num}>{num} {language === "en" ? "Groups" : "Bảng"}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                        {language === "en" ? "Qualifiers / Group" : "Đi Tiếp/Bảng"}
                      </label>
                      <div className="relative">
                        <select
                          value={newQualifiers}
                          onChange={(e) => setNewQualifiers(parseInt(e.target.value))}
                          className="w-full px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 appearance-none focus:outline-none"
                        >
                          {[1, 2, 3, 4, 8].map((num) => (
                            <option key={num} value={num}>{num} {language === "en" ? "Athletes" : "VĐV"}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2" title="Estimated athletes per group">
                        {language === "en" ? "Size / Group" : "Số VĐV / Bảng"}
                      </label>
                      <div className="relative">
                        <select
                          value={athletesPerGroup}
                          onChange={(e) => setAthletesPerGroup(parseInt(e.target.value))}
                          className="w-full px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 appearance-none focus:outline-none"
                        >
                          {[2, 3, 4, 5, 6, 8, 10, 12, 16, 20].map((num) => (
                            <option key={num} value={num}>{num} {language === "en" ? "Athletes" : "VĐV"}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      {language === "en" ? "Group Format" : "Thể thức Vòng Bảng"}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setGroupStageFormat("round_robin");
                        }}
                        className={`px-3 py-2.5 text-[10px] font-black rounded-xl border transition-all cursor-pointer ${
                          groupStageFormat === "round_robin"
                            ? "bg-rose-50 dark:bg-rose-950/20 border-rose-350 text-rose-600"
                            : "bg-slate-50 dark:bg-slate-850 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {language === "en" ? "Round Robin" : "Đấu Vòng Tròn"}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setGroupStageFormat("mini_pk");
                        }}
                        className={`px-3 py-2.5 text-[10px] font-black rounded-xl border transition-all cursor-pointer ${
                          groupStageFormat === "mini_pk"
                            ? "bg-rose-50 dark:bg-rose-950/20 border-rose-350 text-rose-600"
                            : "bg-slate-50 dark:bg-slate-850 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {language === "en" ? "Mini PK" : "Đấu Mini PK"}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setGroupStageFormat("score_shootout");
                        }}
                        className={`px-3 py-2.5 text-[10px] font-black rounded-xl border transition-all cursor-pointer ${
                          groupStageFormat === "score_shootout"
                            ? "bg-rose-50 dark:bg-rose-950/20 border-rose-350 text-rose-600"
                            : "bg-slate-50 dark:bg-slate-850 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {language === "en" ? "Score shootout" : "Bắn điểm bảng"}
                      </button>
                    </div>
                  </div>

                  {/* Option for Group Final matching (Chung Kết Bảng) */}
                  {groupStageFormat === "mini_pk" && (
                    <div className="bg-amber-50/40 dark:bg-slate-850 p-3.5 rounded-2xl border border-amber-100 dark:border-slate-800 animate-fadeIn">
                      <label className="block text-[10px] font-black text-amber-800 dark:text-amber-400 uppercase tracking-wider mb-2">
                        {language === "en" ? "Group Standing Tiebreaker Option" : "Quy cách xếp hạng đấu Mini PK"}
                      </label>
                      <div className="flex flex-col gap-2">
                        <label className="flex items-start gap-2.5 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                          <input
                            type="radio"
                            name="groupFinalOption"
                            value="play_final"
                            checked={groupFinalOption === "play_final"}
                            onChange={() => setGroupFinalOption("play_final")}
                            className="mt-0.5 accent-rose-600"
                          />
                          <div>
                            <span>{language === "en" ? "Play Group Finals match" : "Phải Đấu Chung Kết Bảng"}</span>
                            <span className="block text-[10px] font-semibold text-slate-400 dark:text-slate-500 mt-0.5 leading-tight">
                              {language === "en" ? "The top 2 athletes play a final match to determine 1st vs 2nd." : "Tạo thêm một trận chung kết nhỏ giữa Nhất & Nhì bảng để phân biệt vị trí."}
                            </span>
                          </div>
                        </label>

                        <label className="flex items-start gap-2.5 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300 mt-2">
                          <input
                            type="radio"
                            name="groupFinalOption"
                            value="by_score"
                            checked={groupFinalOption === "by_score"}
                            onChange={() => setGroupFinalOption("by_score")}
                            className="mt-0.5 accent-rose-600"
                          />
                          <div>
                            <span>{language === "en" ? "Sort strictly by score difference" : "Chỉ xét Điểm thắng lớn nhỏ"}</span>
                            <span className="block text-[10px] font-semibold text-slate-400 dark:text-slate-500 mt-0.5 leading-tight">
                              {language === "en" ? "Ranks determined directly by total mini PK scores, no final match needed." : "Xếp Rank Nhất/Nhì trực tiếp bằng điểm tổng hoặc hiệu số Mini PK tại bảng."}
                            </span>
                          </div>
                        </label>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3.5 bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-150 dark:border-slate-850">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[9px] font-black text-slate-550 uppercase">{language === "en" ? "Group Stage: Shots" : "Vòng Bảng: Số phát bắn"}</label>
                        <span className="text-[10px] font-mono font-black text-rose-600">{groupShotsCount} viên</span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="30"
                        step="5"
                        value={groupShotsCount}
                        onChange={(e) => setGroupShotsCount(parseInt(e.target.value))}
                        className="w-full accent-rose-600 cursor-pointer h-1 bg-gray-200 dark:bg-slate-850"
                      />
                      <span className="block text-[8px] font-semibold text-slate-400 dark:text-slate-500 mt-1 leading-normal">
                        {language === "en" ? "Shots fired per player in group matches." : "Tổng số viên đạn bắn tích điểm mỗi trận vòng bảng."}
                      </span>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[9px] font-black text-slate-550 uppercase">{language === "en" ? "Knockout: Shots" : "Knockout: Số phát bắn"}</label>
                        <span className="text-[10px] font-mono font-black text-indigo-600">{knockoutShotsCount} viên</span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="30"
                        step="5"
                        value={knockoutShotsCount}
                        onChange={(e) => setKnockoutShotsCount(parseInt(e.target.value))}
                        className="w-full accent-indigo-600 cursor-pointer h-1 bg-gray-200 dark:bg-slate-850"
                      />
                      <span className="block text-[8px] font-semibold text-slate-400 dark:text-slate-500 mt-1 leading-normal">
                        {language === "en" ? "Shots fired per player in knockout matches." : "Tổng số viên đạn bắn tích điểm mỗi trận knockout."}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      {language === "en" ? "Knockout Rules Format" : "Cơ Chế Phân Định Thắng Thua Knockout"}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setKnockoutFormat("shots")}
                        className={`px-3 py-2.5 text-[10px] font-black rounded-xl border transition-all cursor-pointer ${
                          knockoutFormat === "shots"
                            ? "bg-indigo-50 dark:bg-indigo-950/20 border-indigo-350 text-indigo-600"
                            : "bg-slate-50 dark:bg-slate-850 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {language === "en" ? "Shots Diff" : "So tổng điểm lượt"}
                      </button>

                      <button
                        type="button"
                        onClick={() => setKnockoutFormat("points")}
                        className={`px-3 py-2.5 text-[10px] font-black rounded-xl border transition-all cursor-pointer ${
                          knockoutFormat === "points"
                            ? "bg-indigo-50 dark:bg-indigo-950/20 border-indigo-350 text-indigo-600"
                            : "bg-slate-50 dark:bg-slate-850 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {language === "en" ? "Match points" : "Đấu Hiệp (Set)"}
                      </button>

                      <button
                        type="button"
                        onClick={() => setKnockoutFormat("sudden_death")}
                        className={`px-3 py-2.5 text-[10px] font-black rounded-xl border transition-all cursor-pointer ${
                          knockoutFormat === "sudden_death"
                            ? "bg-indigo-50 dark:bg-indigo-950/20 border-indigo-350 text-indigo-600"
                            : "bg-slate-50 dark:bg-slate-850 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {language === "en" ? "Sudden death" : "Nhanh Chậm (Sudden)"}
                      </button>
                    </div>
                  </div>

                  {/* Option for Semi Draw redraw */}
                  <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-150 dark:border-slate-850">
                    <label className="block text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      {language === "en" ? "Semi-finals Bracket Draw Rules" : "Cấu hình ghép cặp Vòng Bán Kết"}
                    </label>
                    <div className="flex flex-col gap-2">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                        <input
                          type="radio"
                          name="semiDrawOption"
                          value="fixed"
                          checked={semiDrawOption === "fixed"}
                          onChange={() => setSemiDrawOption("fixed")}
                          className="accent-rose-600"
                        />
                        <span>{language === "en" ? "Fixed bracket path (Winners meet)" : "Mặc định (Nhất cùng nhánh gặp nhau)"}</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300 mt-1">
                        <input
                          type="radio"
                          name="semiDrawOption"
                          value="redraw"
                          checked={semiDrawOption === "redraw"}
                          onChange={() => setSemiDrawOption("redraw")}
                          className="accent-rose-600"
                        />
                        <span>{language === "en" ? "Redraw MINI PK at Semi-finals" : "Bốc thăm MINI PK lại ngay tại Bán Kết ⚔️"}</span>
                      </label>
                    </div>
                  </div>

                  {/* Date Picker Row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                        {language === "en" ? "Start Date" : "Ngày Thi Đấu"}
                      </label>
                      <input
                        type="date"
                        value={newStartDate}
                        onChange={(e) => setNewStartDate(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                        {language === "en" ? "End Date" : "Ngày Kết Thúc"}
                      </label>
                      <input
                        type="date"
                        value={newEndDate}
                        onChange={(e) => setNewEndDate(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      {language === "en" ? "Tournament Location" : "Địa Điểm Thi Đấu"}
                    </label>
                    <input
                      type="text"
                      value={newLocation}
                      onChange={(e) => setNewLocation(e.target.value)}
                      placeholder={language === "en" ? "e.g. Sân bắn VSC Đà Nẵng" : "Ví dụ: Sân bắn VSC Đà Nẵng"}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 font-bold dark:text-white"
                    />
                  </div>

                  {/* Description / Rules */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      {language === "en" ? "Description & Rules" : "Diễn giải / Luật bắn"}
                    </label>
                    <textarea
                      value={newRules}
                      onChange={(e) => setNewRules(e.target.value)}
                      rows={3}
                      placeholder={language === "en" ? "Enter special rules..." : "Nhập luật bắn, thể thức, hoặc lưu ý..."}
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 font-bold dark:text-white leading-relaxed"
                    />
                  </div>

                  {/* Image uploads */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border border-rose-50/10 dark:border-slate-800/80 p-3.5 rounded-2xl bg-rose-50/5 dark:bg-slate-950/10">
                    {/* Logo upload */}
                    <div>
                      <label className="block text-[9px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-1.5">
                        {language === "en" ? "Cup Logo / Avatar" : "Logo / Avatar Giải Đấu"}
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="relative w-12 h-12 rounded-xl border border-dashed border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                          {newAvatarUrl ? (
                            <img src={newAvatarUrl} alt="Cup Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <Trophy className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="cursor-pointer inline-flex items-center justify-center text-[10px] text-white hover:bg-rose-700 font-bold bg-rose-600 px-2.5 py-1.5 rounded-lg transition-all shadow-sm">
                            <span>{isCompressingLogo ? "..." : (language === "en" ? "Upload" : "Tải Lên")}</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={isCompressingLogo}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setIsCompressingLogo(true);
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    if (typeof reader.result === "string") {
                                      compressImage(reader.result, 180, 180).then((compressed) => {
                                        setNewAvatarUrl(compressed);
                                        setIsCompressingLogo(false);
                                      }).catch(() => setIsCompressingLogo(false));
                                    } else {
                                      setIsCompressingLogo(false);
                                    }
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                          {newAvatarUrl && (
                            <button
                              type="button"
                              onClick={() => setNewAvatarUrl("")}
                              className="text-[9px] text-red-600 hover:text-red-700 font-bold border-none bg-transparent cursor-pointer text-left pl-0.5"
                            >
                              {language === "en" ? "Remove" : "Xóa bỏ"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Banner upload */}
                    <div>
                      <label className="block text-[9px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-1.5">
                        {language === "en" ? "Cup Banner" : "Banner Giải Đấu"}
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="relative w-16 h-12 rounded-xl border border-dashed border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                          {newBannerUrl ? (
                            <img src={newBannerUrl} alt="Cup Banner" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <ImageIcon className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="cursor-pointer inline-flex items-center justify-center text-[10px] text-white hover:bg-rose-700 font-bold bg-rose-600 px-2.5 py-1.5 rounded-lg transition-all shadow-sm">
                            <span>{isCompressingBanner ? "..." : (language === "en" ? "Upload" : "Tải Lên")}</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={isCompressingBanner}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setIsCompressingBanner(true);
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    if (typeof reader.result === "string") {
                                      compressImage(reader.result, 1000, 400).then((compressed) => {
                                        setNewBannerUrl(compressed);
                                        setIsCompressingBanner(false);
                                      }).catch(() => setIsCompressingBanner(false));
                                    } else {
                                      setIsCompressingBanner(false);
                                    }
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                          {newBannerUrl && (
                            <button
                              type="button"
                              onClick={() => setNewBannerUrl("")}
                              className="text-[9px] text-red-600 hover:text-red-700 font-bold border-none bg-transparent cursor-pointer text-left pl-0.5"
                            >
                              {language === "en" ? "Remove" : "Xóa bỏ"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleCreateTournament}
                      disabled={actionLoading}
                      className="w-full py-3 text-xs font-black text-white bg-rose-600 hover:bg-rose-700 rounded-xl cursor-pointer border-none shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 uppercase tracking-widest disabled:opacity-50"
                    >
                      {actionLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                          <span>{language === "en" ? "Creating..." : "Đang thiết lập..."}</span>
                        </>
                      ) : (
                        <>
                          <Trophy className="w-4 h-4" />
                          <span>{language === "en" ? "Start Draw & Build Roster" : "Bắt Đầu Bốc Thăm & Tạo Nhánh"}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Cup Roster Management */}
                <div className="lg:col-span-2 flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Users className="w-5 h-5 text-indigo-600" />
                        <span>Danh Sách VĐV Tham Gia Cúp ({cupAthletes.length})</span>
                      </h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">{language === "en" ? "Add shooter profiles manually or fetch directly from the VSC system database" : "Các tuyển thủ sẽ tự động bốc thăm phân chia đều vào các bảng đấu."}</p>
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => setIsAddSystemAthleteModalOpen(true)}
                        className="flex-1 sm:flex-none px-3 py-2 text-xs font-black text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-900/40 rounded-xl cursor-pointer border-none transition-colors flex items-center justify-center gap-1"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>VĐV Hệ Thống</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setManualFormId("");
                          setManualFormName("");
                          setManualFormTeam("");
                          setManualFormGender("Nam");
                          setManualFormEmail("");
                          setManualFormIdCard("");
                          setManualFormDob("");
                          setManualFormHometown("");
                          setManualFormProvince("");
                          setManualFormCountry("Việt Nam");
                          setManualFormCountryCode("VN");
                          setManualFormCategory("Nghiệp dư");
                          setManualFormStatus("Thi đấu");
                          setManualFormIsPrimary(false);
                          setManualFormAvatarUrl("");
                          setManualFormValidationErr("");
                          setManualFormDuplicateSysMatch(null);
                          setIsAddManualModalOpen(true);
                        }}
                        className="flex-1 sm:flex-none px-3 py-2 text-xs font-black text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-900/30 rounded-xl cursor-pointer border-none transition-colors flex items-center justify-center gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Tạo Mới VĐV</span>
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      value={athleteSearchQuery}
                      onChange={(e) => setAthleteSearchQuery(e.target.value)}
                      placeholder={language === "en" ? "Search added athletes by name, club..." : "Tìm nhanh tuyển thủ trong danh sách..."}
                      className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-inner max-h-[360px] overflow-y-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-slate-100/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">
                          <th className="py-2.5 px-4 w-12">#</th>
                          <th className="py-2.5 px-2 text-left">Tuyển Thủ</th>
                          <th className="py-2.5 px-2 text-left">Đội Nhóm (Club)</th>
                          <th className="py-2.5 px-2 w-16">Giới</th>
                          <th className="py-2.5 px-4 w-16">Xóa</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredAthletesForSelection.map((ath, idx) => (
                          <tr key={ath.id} className="text-xs hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                            <td className="py-2 px-4 text-center font-bold font-mono text-slate-400">{idx + 1}</td>
                            <td className="py-2 px-2 font-black text-slate-800 dark:text-slate-200">{ath.name}</td>
                            <td className="py-2 px-2 font-extrabold text-slate-500">{ath.team}</td>
                            <td className="py-2 px-2 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                ath.gender === "female" ? "bg-rose-50 text-rose-500" : "bg-blue-50 text-blue-500"
                              }`}>
                                {ath.gender === "female" ? (language === "en" ? "F" : "Nữ") : (language === "en" ? "M" : "Nam")}
                              </span>
                            </td>
                            <td className="py-2 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setCupAthletes(prev => prev.filter(a => a.id !== ath.id));
                                }}
                                className="p-1 text-slate-400 hover:text-rose-600 bg-transparent rounded-lg border-none cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}

                        {filteredAthletesForSelection.length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-12 text-center text-slate-400 font-bold">
                              {language === "en" ? "No athletes added to the Cup roster yet." : "Chưa có tuyển thủ nào tham gia Cúp."}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Render Lobby / List of Cup Tournaments */
          <div className="space-y-6">
            {/* Header with Create Button */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-tight">
                  <Trophy className="w-7 h-7 text-rose-500 animate-pulse shrink-0" />
                  {language === "en" ? "Match Play Cup Lobby" : "SẢNH ĐỐI KHÁNG / CUP MATCH PLAY 🏆"}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold leading-relaxed">
                  {language === "en" 
                    ? "View and manage all active cup tournaments and versus brackets." 
                    : "Danh sách tổng hợp các giải đấu cúp đối kháng chuyên nghiệp. Bốc thăm chia bảng & đấu loại trực tiếp."}
                </p>
              </div>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingNewCup(true);
                    setCupAthletes([]);
                    setNewTournName(language === "en" ? "Match Play Cup " + (tournaments.length + 1) : "Cúp Đối Kháng " + (tournaments.length + 1));
                  }}
                  className="px-5 py-3 text-xs font-black text-white bg-rose-600 hover:bg-rose-700 active:scale-95 shadow-md hover:shadow-lg rounded-xl flex items-center gap-2 cursor-pointer border-none transition-all"
                >
                  <Plus className="w-4 h-4" />
                  {language === "en" ? "Create New Cup" : "THIẾT LẬP & TẠO CÚP MỚI ➕"}
                </button>
              )}
            </div>

            {tournaments.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center shadow-sm">
                <Trophy className="w-16 h-16 text-slate-350 mx-auto mb-4 animate-bounce" />
                <h3 className="text-base font-black text-slate-850 dark:text-white uppercase tracking-tight">
                  {language === "en" ? "No Cup Tournaments Yet" : "Chưa có giải đấu cúp đối kháng nào"}
                </h3>
                <p className="text-xs text-slate-450 dark:text-slate-500 max-w-md mx-auto mt-2 leading-relaxed font-bold">
                  {language === "en"
                    ? "Create a cup tournament to shuffle groups, record match results, and view the automated bracket tree."
                    : "Hãy tạo một giải đấu đối kháng mới để bắt đầu bốc thăm chia bảng, nhập điểm số, và tự động tạo nhánh đấu loại trực tiếp."}
                </p>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingNewCup(true);
                      setCupAthletes([]);
                      setNewTournName(language === "en" ? "Match Play Cup 1" : "Cúp Đối Kháng 1");
                    }}
                    className="mt-6 px-5 py-2.5 text-xs font-black text-white bg-blue-600 hover:bg-blue-700 rounded-xl cursor-pointer border-none shadow-md transition-colors"
                  >
                    {language === "en" ? "Setup First Cup" : "Tạo Giải Đấu Đầu Tiên"}
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tournaments.map((t) => {
                  const numAthletes = t.athletes?.length || 0;
                  const statusLabel = t.status === "completed" 
                    ? (language === "en" ? "Finished" : "Đã hoàn thành") 
                    : t.status === "knockout" 
                      ? (language === "en" ? "Knockout Stage" : "Đấu loại trực tiếp")
                      : (language === "en" ? "Round Robin" : "Đang đấu vòng bảng");
                  
                  const statusBg = t.status === "completed" 
                    ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    : t.status === "knockout"
                      ? "bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 border border-violet-150 dark:border-violet-900/30"
                      : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-150 dark:border-emerald-900/30";

                  return (
                    <div 
                      key={t.id} 
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 hover:border-rose-350 dark:hover:border-rose-900/40 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group relative overflow-hidden"
                    >
                      <Trophy className="absolute -right-4 -bottom-4 w-24 h-24 text-slate-100 dark:text-slate-950 opacity-40 dark:opacity-10 pointer-events-none group-hover:scale-110 transition-transform" />

                      <div>
                        <div className="flex justify-between items-start gap-2 mb-3.5">
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${statusBg}`}>
                            {statusLabel}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500">
                            ID: {t.id.replace("tour-versus-", "V-")}
                          </span>
                        </div>

                        <h3 className="text-base font-black text-slate-900 dark:text-white mb-2 leading-snug group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors uppercase">
                          {t.name}
                        </h3>

                        <div className="space-y-1.5 my-4 border-t border-slate-100 dark:border-slate-850 pt-3 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                          <div className="flex justify-between">
                            <span>{language === "en" ? "Groups:" : "Số lượng bảng:"}</span>
                            <span className="text-slate-800 dark:text-slate-200 font-extrabold">{t.numGroups || 4} bảng</span>
                          </div>
                          <div className="flex justify-between">
                            <span>{language === "en" ? "Qualifiers / Group:" : "Số VĐV đi tiếp/Bảng:"}</span>
                            <span className="text-slate-800 dark:text-slate-200 font-extrabold">{t.qualifiersPerGroup || 2} VĐV</span>
                          </div>
                          <div className="flex justify-between">
                            <span>{language === "en" ? "Athletes Roster:" : "Tổng số VĐV tham gia:"}</span>
                            <span className="text-rose-600 dark:text-rose-400 font-black">{numAthletes} tuyển thủ</span>
                          </div>
                          {t.groupStageFormat && (
                            <div className="flex justify-between">
                              <span>{language === "en" ? "Group Format:" : "Thể thức vòng bảng:"}</span>
                              <span className="text-blue-600 dark:text-blue-400 font-extrabold">
                                {t.groupStageFormat === "round_robin" ? "Vòng tròn tính điểm" : t.groupStageFormat === "mini_pk" ? "Đấu Mini PK" : "Bắn tính điểm đấu loại"}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2.5 mt-2 border-t border-slate-100 dark:border-slate-850 pt-4 z-10">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTournament(t);
                            if (onSelectTournament) {
                              onSelectTournament(t.id, t);
                            }
                          }}
                          className="flex-1 px-4 py-2.5 text-xs font-black text-white bg-blue-600 hover:bg-blue-700 rounded-xl cursor-pointer shadow-sm hover:shadow transition-colors text-center border-none uppercase tracking-wider"
                        >
                          {language === "en" ? "Enter Cup" : "Vào Giải 🎯"}
                        </button>

                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => triggerDeleteTournamentConfirm(t.id)}
                            className="px-3.5 py-2.5 text-xs font-black text-red-600 hover:text-white bg-red-50 hover:bg-red-650 dark:bg-red-950/20 dark:hover:bg-red-600 rounded-xl cursor-pointer border-none transition-colors"
                            title={language === "en" ? "Delete Cup" : "Xóa Cúp"}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )
      ) : (
        /* Cup Match Center & Dashboard (when selectedTournament is NOT null) */
        <div className="flex flex-col gap-6">
          {/* Top Header Selector Panel */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTournament(null);
                    if (onSelectTournament) {
                      onSelectTournament("");
                    }
                  }}
                  className="w-fit px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-black rounded-lg border-none flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  {language === "en" ? "Back to Opponent Hall" : "Quay lại Sảnh Đối Kháng"}
                </button>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-tight">
                  <Trophy className="w-7 h-7 text-rose-500 animate-pulse shrink-0" />
                  {selectedTournament.name}
                </h1>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {language === "en" 
                    ? "Tournament Dashboard & Bracket for match play cup" 
                    : "Bảng điều phối và sơ đồ thi đấu đối kháng cho giải đấu: " + selectedTournament.name}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setCoordinateMode(!coordinateMode)}
                    className={`px-4 py-2 text-xs font-black shadow-sm rounded-xl flex items-center gap-1.5 cursor-pointer shrink-0 border-none transition-all active:scale-95 ${
                      coordinateMode 
                        ? "bg-amber-500 hover:bg-amber-600 text-white" 
                        : "bg-indigo-600 hover:bg-indigo-700 text-white animate-pulse"
                    }`}
                  >
                    {coordinateMode ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>👁️ {language === "en" ? "Spectator Mode" : "Chế độ người xem"}</span>
                      </>
                    ) : (
                      <>
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>⚙️ {language === "en" ? "Coordinate" : "Điều phối Đối Kháng"}</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Tournament Live Chat & Announcements - Always Visible under Name & Coordinate */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm text-left">
            <ChatWidget
              roomId={`versus-${selectedTournament.id}`}
              roomType="tournament_live"
              title={language === "en" ? "Cup Official Live Chat" : "Trò chuyện & Bản tin Cúp đối kháng"}
              subtitle={selectedTournament.name}
              currentUser={auth.currentUser}
              language={language as "en" | "vi"}
              isBtcOrAdmin={isAdmin}
              defaultExpanded={true}
              maxHeight="280px"
              systemAthletes={vscSystemAthletes}
              systemClubs={clubs}
              onViewAthleteProfile={(name) => {
                if ((window as any).triggerViewAthleteProfile) {
                  (window as any).triggerViewAthleteProfile(name);
                }
              }}
            />
          </div>

          {/* Tabs header & Action Buttons */}
          <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 bg-slate-100 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex gap-2 flex-1 md:flex-none">
              <button
                type="button"
                onClick={() => setActiveSubTab("group_stage")}
                className={`flex-1 md:flex-none px-4 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeSubTab === "group_stage"
                    ? "bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <Users className="w-4 h-4" />
                {selectedTournament.groupStageFormat === "score_shootout" ? (language === "en" ? "Group Stage Scores" : "Bảng Điểm Vòng Bảng") : (language === "en" ? "Group Stage Standings" : "Bảng Xếp Hạng Vòng Bảng")}
              </button>

              <button
                type="button"
                onClick={() => setActiveSubTab("knockout")}
                className={`flex-1 md:flex-none px-4 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeSubTab === "knockout"
                    ? "bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <Sword className="w-4 h-4" />
                {language === "en" ? "Knockout Bracket" : "Nhánh Đấu Loại Trực Tiếp"}
              </button>
            </div>

            <div className="flex items-center gap-2 justify-end">
              {/* Generate Knockout bracket trigger */}
              {isAdmin && coordinateMode && selectedTournament.status === "group_stage" && (
                <button
                  type="button"
                  onClick={triggerGenerateKnockoutConfirm}
                  disabled={actionLoading}
                  className="px-4 py-2.5 text-xs font-black text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md rounded-xl flex items-center gap-1.5 cursor-pointer border-none transition-all"
                >
                  {actionLoading ? (
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <Award className="w-4 h-4 text-yellow-350 fill-yellow-350/10" />
                  )}
                  {language === "en" ? "Advance to Knockout" : "Sinh Nhánh Knockout"}
                </button>
              )}

              {isAdmin && coordinateMode && (
                <button
                  type="button"
                  onClick={() => triggerDeleteTournamentConfirm(selectedTournament.id)}
                  disabled={actionLoading}
                  className="px-3.5 py-2.5 text-xs font-black text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl cursor-pointer border-none flex items-center gap-1"
                  title={language === "en" ? "Delete Cup" : "Xóa giải đấu Cúp này"}
                >
                  <Trash2 className="w-4 h-4 text-rose-500" />
                  {language === "en" ? "Delete" : "Xóa"}
                </button>
              )}
            </div>
          </div>

          {/* Sub-tab 1: Group Stage (Bảng Đấu Soccer Table Style) */}
          {activeSubTab === "group_stage" && (
            <div className="flex flex-col gap-6">
              {/* Grid of Standings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(groupStandings).map(([groupName, rows]) => (
                  <div key={groupName} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
                    <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-800/80 pb-3 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                        {groupName}
                      </span>
                      <span className="text-[10px] text-gray-400 capitalize">
                        {selectedTournament.groupStageFormat === "score_shootout" ? (language === "en" ? "Direct Points" : "Điểm trực tiếp") : 
                         selectedTournament.groupStageFormat === "mini_pk" ? (language === "en" ? "Mini Bracket Progression" : "Vòng đấu loại bảng") :
                         (language === "en" ? "Standings" : "Bảng điểm")}
                      </span>
                    </h3>

                    {/* Soccer League Standings Table */}
                    <div className="overflow-x-auto mt-3">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 dark:border-slate-800/50 text-[10px] text-slate-400 font-black uppercase tracking-wider">
                            <th className="py-2.5 text-center w-8">#</th>
                            <th className="py-2.5">{language === "en" ? "Player" : "Đấu thủ"}</th>
                            
                            {selectedTournament.groupStageFormat === "score_shootout" ? (
                              <>
                                <th className="py-2.5 text-center w-24">{language === "en" ? "Total Score" : "Tổng Điểm"}</th>
                                {isAdmin && coordinateMode && <th className="py-2.5 text-right pr-4 w-20">{language === "en" ? "Edit" : "Nhập"}</th>}
                              </>
                            ) : selectedTournament.groupStageFormat === "mini_pk" ? (
                              <>
                                <th className="py-2.5 text-center w-10">P</th>
                                <th className="py-2.5 text-center w-10">W</th>
                                <th className="py-2.5 text-center w-10">L</th>
                                <th className="py-2.5 text-center w-14">Hits</th>
                                <th className="py-2.5 text-center w-24 text-rose-500">{language === "en" ? "Progression" : "Vòng Đạt"}</th>
                              </>
                            ) : (
                              <>
                                <th className="py-2.5 text-center w-10">P</th>
                                <th className="py-2.5 text-center w-8">W</th>
                                <th className="py-2.5 text-center w-8">D</th>
                                <th className="py-2.5 text-center w-8">L</th>
                                <th className="py-2.5 text-center w-14">Hits</th>
                                <th className="py-2.5 text-center w-12 text-rose-500">Pts</th>
                              </>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/50 dark:divide-slate-800/30">
                          {(rows as any[]).map((row, idx) => {
                            const groupMatches = matches.filter(m => m.stage === "group" && m.groupName === groupName);
                            const isGroupFinished = groupMatches.length > 0 && groupMatches.every(m => m.status === "completed");
                            const isQualified = isGroupFinished && idx < selectedTournament.qualifiersPerGroup;
                            return (
                              <tr key={row.athleteId} className="text-xs">
                                <td className="py-3 text-center font-bold">
                                  <span className={`w-5 h-5 rounded-full flex items-center justify-center mx-auto text-[10px] font-black ${
                                    isQualified 
                                      ? "bg-emerald-500 text-white" 
                                      : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                                  }`}>
                                    {idx + 1}
                                  </span>
                                </td>
                                <td className="py-3 font-extrabold text-slate-800 dark:text-slate-200">
                                  <div className="flex items-center gap-2">
                                    {renderAthleteAvatar(row.athleteId, row.name)}
                                    <div className="min-w-0">
                                      <div 
                                        className="truncate max-w-[130px] cursor-pointer hover:text-rose-500 transition-colors flex items-center gap-1.5 font-black uppercase text-xs" 
                                        title={row.name}
                                        onClick={() => {
                                          if ((window as any).triggerViewAthleteProfile) {
                                            (window as any).triggerViewAthleteProfile(row.athleteId || row.name);
                                          }
                                        }}
                                      >
                                        <span>{row.name}</span>
                                        <span className="text-[9px] font-mono font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded shrink-0">
                                          {row.athleteId.replace("CUP-", "")}
                                        </span>
                                      </div>
                                      <span className="text-[9px] text-gray-400 block font-normal truncate max-w-[110px]" title={row.team}>
                                        {row.team || (language === "en" ? "Free Agent" : "VĐV Tự do")}
                                      </span>
                                    </div>
                                  </div>
                                </td>
                                
                                {selectedTournament.groupStageFormat === "score_shootout" ? (
                                  <>
                                    <td className="py-3 text-center font-mono font-black text-rose-600 dark:text-rose-400 bg-rose-500/5 dark:bg-rose-500/10 text-sm">
                                      {row.scoreDiff}đ
                                    </td>
                                    {isAdmin && (
                                      <td className="py-3 text-right pr-4 font-bold">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const newScoreStr = prompt(
                                              language === "en" 
                                                ? `Enter score for ${row.name}:` 
                                                : `Nhập tổng điểm vòng bảng cho ${row.name}:`,
                                              String(row.scoreDiff)
                                            );
                                            if (newScoreStr !== null) {
                                              const newScore = parseInt(newScoreStr);
                                              if (!isNaN(newScore)) {
                                                handleSaveGroupScore(row.athleteId, newScore);
                                              }
                                            }
                                          }}
                                          className="px-2.5 py-1 text-[10px] font-black text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer border-none shadow-xs"
                                        >
                                          {language === "en" ? "Set" : "Nhập"}
                                        </button>
                                      </td>
                                    )}
                                  </>
                                ) : selectedTournament.groupStageFormat === "mini_pk" ? (
                                  <>
                                    <td className="py-3 text-center font-mono font-bold text-slate-500">{row.played}</td>
                                    <td className="py-3 text-center font-mono font-bold text-emerald-500">{row.won}</td>
                                    <td className="py-3 text-center font-mono font-bold text-slate-400">{row.lost}</td>
                                    <td className="py-3 text-center font-mono font-bold text-slate-600 dark:text-slate-400">{row.scoreDiff}đ</td>
                                    <td className="py-3 text-center font-mono font-black text-rose-600 dark:text-rose-400 bg-rose-500/5 dark:bg-rose-500/10 text-[10px]">
                                      {isGroupFinished ? (
                                        idx === 0 ? (language === "en" ? "🥇 1st Place" : "🥇 Nhất Bảng") :
                                        idx === 1 ? (language === "en" ? "🥈 2nd Place" : "🥈 Nhì Bảng") :
                                        idx === 2 ? (language === "en" ? "🥉 3rd Place" : "🥉 Ba Bảng") :
                                        (language === "en" ? "4th Place" : "Tư Bảng")
                                      ) : row.played === 0 ? (language === "en" ? "Pending" : "Chưa Đấu") :
                                       selectedTournament.groupStageFormat === "mini_pk" ? (
                                         selectedTournament.groupFinalOption === "by_score" ? (
                                           row.won > 0 ? (language === "en" ? "Won R1" : "Thắng Vòng 1") : (language === "en" ? "Lost R1" : "Thua Vòng 1")
                                         ) : (
                                           row.pts === 1000 ? (language === "en" ? "👑 Champ" : "👑 Vô Địch Bảng") :
                                           row.pts === 500 ? (language === "en" ? "🥈 Runner-up" : "🥈 Nhì Bảng") :
                                           row.pts === 400 ? (language === "en" ? "Final" : "Vào Chung Kết") :
                                           row.pts === 200 ? (language === "en" ? "Semifinalist" : "Thua Bán Kết") :
                                           row.pts === 150 ? (language === "en" ? "Semi" : "Vào Bán Kết") :
                                           (language === "en" ? "Round 1" : "Thua Vòng 1")
                                         )
                                       ) : (
                                         language === "en" ? "Playing" : "Đang Đấu"
                                       )}
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    <td className="py-3 text-center font-mono font-bold text-slate-500">{row.played}</td>
                                    <td className="py-3 text-center font-mono font-bold text-emerald-500">{row.won}</td>
                                    <td className="py-3 text-center font-mono font-bold text-amber-500">{row.drawn}</td>
                                    <td className="py-3 text-center font-mono font-bold text-slate-400">{row.lost}</td>
                                    <td className="py-3 text-center font-mono font-bold text-slate-600 dark:text-slate-400">{row.scoreDiff}đ</td>
                                    <td className="py-3 text-center font-mono font-black text-rose-600 dark:text-rose-400 bg-rose-500/5 dark:bg-rose-500/10 text-sm">{row.pts}</td>
                                  </>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>

              {/* Group Matches section */}
              {selectedTournament.groupStageFormat !== "score_shootout" && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
                  <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                    <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <Sword className="w-5 h-5 text-indigo-500 shrink-0" />
                      {selectedTournament.groupStageFormat === "mini_pk" ? (language === "en" ? "Group Mini-Brackets History" : "Danh Sách Lượt Đấu Mini PK") : (language === "en" ? "Group Stage Match History" : "Lịch Sử Thi Đấu Vòng Bảng")}
                    </h3>

                    {/* Filter by Group */}
                    <div className="flex items-center gap-2">
                      <ListFilter className="w-4 h-4 text-slate-400" />
                      <select
                        value={selectedGroupFilter}
                        onChange={(e) => setSelectedGroupFilter(e.target.value)}
                        className="text-xs font-bold text-slate-600 dark:text-slate-350 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-lg border-none focus:outline-none"
                      >
                        <option value="all">{language === "en" ? "All Groups" : "Tất Cả Bảng"}</option>
                        {Object.keys(selectedTournament.groups).map((gName) => (
                          <option key={gName} value={gName}>{gName}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Match Cards list */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {matches
                      .filter((m) => {
                        if (m.stage !== "group") return false;
                        if (selectedGroupFilter !== "all" && m.groupName !== selectedGroupFilter) return false;
                        return true;
                      })
                      .map((match) => {
                        const isCompleted = match.status === "completed";
                        const pAWon = isCompleted && match.playerA.score! > match.playerB.score!;
                        const pBWon = isCompleted && match.playerB.score! > match.playerA.score!;
                        const isDrawn = isCompleted && match.playerA.score! === match.playerB.score!;

                        // Determine label if it is mini_pk bracket
                        let miniLevelLabel = "";
                        if (selectedTournament.groupStageFormat === "mini_pk") {
                          if (!match.nextMatchId) {
                            miniLevelLabel = "Chung kết bảng";
                          } else {
                            miniLevelLabel = "Vòng loại bảng";
                          }
                        }

                        return (
                          <div
                            key={match.id}
                            className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                              isCompleted
                                ? "border-slate-150 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40"
                                : "border-rose-500/20 bg-white dark:bg-slate-900 ring-2 ring-rose-500/5"
                            }`}
                          >
                            <div className="flex justify-between items-center mb-3">
                              <span className="text-[10px] font-black uppercase text-indigo-500 bg-indigo-50 dark:bg-indigo-950/20 px-2 py-0.5 rounded-md flex items-center gap-1.5">
                                <span>{match.groupName}</span>
                                {miniLevelLabel && <span className="w-1.5 h-1.5 bg-indigo-300 rounded-full"></span>}
                                {miniLevelLabel && <span className="normal-case text-slate-400 font-bold">{miniLevelLabel}</span>}
                              </span>
                              <span className={`text-[10px] font-extrabold ${isCompleted ? "text-gray-400" : "text-rose-500 animate-pulse"}`}>
                                {isCompleted ? (language === "en" ? "Finished" : "Xong") : (language === "en" ? "Pending" : "Chờ đấu")}
                              </span>
                            </div>

                            {/* Player rows */}
                            <div className="flex flex-col gap-2">
                              {/* Player A */}
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2 truncate">
                                  <span className={`w-1.5 h-1.5 rounded-full ${pAWon ? "bg-emerald-500" : "bg-transparent"}`}></span>
                                  {match.playerA.id ? renderAthleteAvatar(match.playerA.id, match.playerA.name) : (
                                    <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[9px] font-bold text-slate-400 shrink-0 border border-slate-200 dark:border-slate-800">?</div>
                                  )}
                                  <div className="min-w-0">
                                    <div 
                                      className={`truncate text-xs font-bold flex items-center gap-1 cursor-pointer hover:text-rose-500 transition-all ${
                                        pAWon ? "text-emerald-500 font-extrabold" : "text-slate-800 dark:text-slate-200"
                                      }`}
                                      onClick={() => {
                                        if (match.playerA.id && (window as any).triggerViewAthleteProfile) {
                                          (window as any).triggerViewAthleteProfile(match.playerA.id);
                                        }
                                      }}
                                    >
                                      <span>{match.playerA.name}</span>
                                      {match.playerA.id && (
                                        <span className="text-[8px] font-mono text-slate-450 dark:text-slate-500 shrink-0">
                                          ({match.playerA.id.replace("CUP-", "")})
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[9px] text-gray-400 block font-normal truncate max-w-[130px]">{match.playerA.team || (language === "en" ? "Free Agent" : "Tự do")}</span>
                                  </div>
                                </div>
                                <span className={`font-mono text-sm font-black w-8 text-right ${
                                  pAWon ? "text-emerald-500 text-base" : isDrawn ? "text-amber-500" : "text-slate-400"
                                }`}>
                                  {match.playerA.score !== null ? `${match.playerA.score}đ` : "---"}
                                </span>
                              </div>

                              <div className="h-px bg-slate-100 dark:bg-slate-800/40"></div>

                              {/* Player B */}
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2 truncate">
                                  <span className={`w-1.5 h-1.5 rounded-full ${pBWon ? "bg-emerald-500" : "bg-transparent"}`}></span>
                                  {match.playerB.id ? renderAthleteAvatar(match.playerB.id, match.playerB.name) : (
                                    <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[9px] font-bold text-slate-400 shrink-0 border border-slate-200 dark:border-slate-800">?</div>
                                  )}
                                  <div className="min-w-0">
                                    <div 
                                      className={`truncate text-xs font-bold flex items-center gap-1 cursor-pointer hover:text-rose-500 transition-all ${
                                        pBWon ? "text-emerald-500 font-extrabold" : "text-slate-800 dark:text-slate-200"
                                      }`}
                                      onClick={() => {
                                        if (match.playerB.id && (window as any).triggerViewAthleteProfile) {
                                          (window as any).triggerViewAthleteProfile(match.playerB.id);
                                        }
                                      }}
                                    >
                                      <span>{match.playerB.name}</span>
                                      {match.playerB.id && (
                                        <span className="text-[8px] font-mono text-slate-450 dark:text-slate-500 shrink-0">
                                          ({match.playerB.id.replace("CUP-", "")})
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[9px] text-gray-400 block font-normal truncate max-w-[130px]">{match.playerB.team || (language === "en" ? "Free Agent" : "Tự do")}</span>
                                  </div>
                                </div>
                                <span className={`font-mono text-sm font-black w-8 text-right ${
                                  pBWon ? "text-emerald-500 text-base" : isDrawn ? "text-amber-500" : "text-slate-400"
                                }`}>
                                  {match.playerB.score !== null ? `${match.playerB.score}đ` : "---"}
                                </span>
                              </div>
                            </div>

                            {/* Scoring button trigger */}
                            {isAdmin && coordinateMode && (
                              <button
                                type="button"
                                onClick={() => {
                                  setScoringMatch(match);
                                  setScoreA(match.playerA.score !== null ? String(match.playerA.score) : "");
                                  setScoreB(match.playerB.score !== null ? String(match.playerB.score) : "");
                                }}
                                className="w-full mt-3 py-1.5 text-[10px] font-black uppercase text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl cursor-pointer border-none flex items-center justify-center gap-1"
                              >
                                <Sword className="w-3.5 h-3.5 text-rose-500" />
                                {isCompleted ? (language === "en" ? "Update Score" : "Sửa kết quả") : (language === "en" ? "Enter Score" : "Ghi nhận kết quả")}
                              </button>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sub-tab 2: Knockout Bracket Tree view */}
          {activeSubTab === "knockout" && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm overflow-x-auto">
              <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-3 mb-6 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-rose-500 shrink-0" />
                {language === "en" ? "Championship Knockout Tree" : "Nhánh Đấu Loại Trực Tiếp (Bracket Tree)"}
              </h3>

              {matches.filter(m => m.stage === "knockout").length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <AlertCircle className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  {language === "en" 
                    ? "Knockout Bracket has not been generated yet. Please finish all group matches and click 'Advance to Knockout'." 
                    : "Sơ đồ loại trực tiếp chưa được khởi tạo. Vui lòng hoàn thành mọi lượt bắn vòng bảng rồi nhấn 'Sinh Nhánh Knockout'."}
                </div>
              ) : (
                /* Visual Columns representation of bracket */
                <div className="flex gap-12 min-w-[700px] justify-around items-center py-4 select-none">
                  
                  {/* ROUND OF 32 COLUMN */}
                  {matches.some(m => m.stage === "knockout" && m.koRound === "round_32") && (
                    <div className="flex flex-col gap-3 flex-1 max-w-[240px]">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center mb-2">
                        {language === "en" ? "Round of 32" : "Vòng 1/16"}
                      </h4>
                      {matches
                        .filter(m => m.stage === "knockout" && m.koRound === "round_32")
                        .map((match) => renderMatchCard(match))}
                    </div>
                  )}

                  {/* ROUND OF 16 COLUMN */}
                  {matches.some(m => m.stage === "knockout" && m.koRound === "round_16") && (
                    <div className="flex flex-col gap-4 flex-1 max-w-[240px]">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center mb-2">
                        {language === "en" ? "Round of 16" : "Vòng 1/8"}
                      </h4>
                      {matches
                        .filter(m => m.stage === "knockout" && m.koRound === "round_16")
                        .map((match) => renderMatchCard(match))}
                    </div>
                  )}

                  {/* QUARTERFINALS COLUMN */}
                  {matches.some(m => m.stage === "knockout" && m.koRound === "quarter") && (
                    <div className="flex flex-col gap-6 flex-1 max-w-[240px]">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center mb-2">
                        {language === "en" ? "Quarterfinals" : "Vòng Tứ Kết"}
                      </h4>
                      {matches
                        .filter(m => m.stage === "knockout" && m.koRound === "quarter")
                        .map((match) => renderMatchCard(match))}
                    </div>
                  )}

                  {/* SEMIFINALS COLUMN */}
                  <div className="flex flex-col gap-12 flex-1 max-w-[240px]">
                    <div className="text-center mb-2">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {language === "en" ? "Semifinals" : "Vòng Bán Kết"}
                      </h4>
                      {selectedTournament?.semiDrawOption === "redraw" && semiPlayers && matches.filter(m => m.stage === "knockout" && m.koRound === "semi").every(m => m.status === "pending") && (
                        <button
                          type="button"
                          onClick={handleDrawSemifinals}
                          disabled={actionLoading}
                          className="mt-2 w-full py-1.5 px-3 text-[10px] font-black text-white bg-rose-600 hover:bg-rose-700 active:scale-95 transition-all rounded-xl shadow-md border-none flex items-center justify-center gap-1.5 cursor-pointer animate-pulse"
                        >
                          <Trophy className="w-3.5 h-3.5 shrink-0" />
                          <span>{language === "en" ? "Draw Semifinals" : "🎲 Bốc thăm cặp Bán Kết"}</span>
                        </button>
                      )}
                    </div>
                    {matches
                      .filter(m => m.stage === "knockout" && m.koRound === "semi")
                      .map((match) => renderMatchCard(match))}
                  </div>

                  {/* FINALS COLUMN */}
                  <div className="flex flex-col gap-12 flex-1 max-w-[240px] items-center justify-center">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center mb-2">
                      {language === "en" ? "Final Match" : "Trận Chung Kết"}
                    </h4>
                    {matches
                      .filter(m => m.stage === "knockout" && m.koRound === "final")
                      .map((match) => {
                        const isCompleted = match.status === "completed";
                        const pAWon = isCompleted && match.winnerId === match.playerA.id;
                        const pBWon = isCompleted && match.winnerId === match.playerB.id;

                        return (
                          <div key={match.id} className="w-full p-4 bg-gradient-to-br from-amber-500/5 via-amber-500/10 to-yellow-500/5 dark:from-amber-950/20 dark:to-yellow-950/20 border-2 border-amber-400 rounded-3xl shadow-md flex flex-col gap-2 relative">
                            <div className="absolute -top-3.5 left-1/2 -translate-y-1/2 bg-amber-400 text-amber-950 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                              👑 {language === "en" ? "CHAMPIONSHIP" : "Trận Tranh Cúp"}
                            </div>

                             {/* Player A */}
                             <div className="flex justify-between items-center py-1 mt-1">
                               <div className="flex items-center gap-2 truncate">
                                 {match.playerA.id ? renderAthleteAvatar(match.playerA.id, match.playerA.name) : (
                                   <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[9px] font-bold text-slate-400 shrink-0 border border-slate-200 dark:border-slate-800">?</div>
                                 )}
                                 <div className="min-w-0">
                                   <span 
                                     className={`text-xs truncate max-w-[110px] font-black flex items-center gap-1 cursor-pointer hover:text-rose-500 transition-all ${
                                       pAWon ? "text-amber-600 dark:text-amber-400 text-sm font-extrabold" : "text-slate-700 dark:text-slate-300"
                                     }`}
                                     onClick={() => {
                                       if (match.playerA.id && (window as any).triggerViewAthleteProfile) {
                                         (window as any).triggerViewAthleteProfile(match.playerA.id);
                                       }
                                     }}
                                   >
                                     {pAWon && <Star className="w-3.5 h-3.5 fill-amber-500 stroke-amber-500 shrink-0" />}
                                     <span>{match.playerA.name}</span>
                                     {match.playerA.id && (
                                       <span className="text-[8px] font-mono text-slate-450 dark:text-slate-500 shrink-0">
                                         ({match.playerA.id.replace("CUP-", "")})
                                       </span>
                                     )}
                                   </span>
                                 </div>
                               </div>
                               <span className="font-mono text-xs font-black shrink-0 ml-1">
                                 {match.playerA.score !== null ? `${match.playerA.score}đ` : "---"}
                                </span>
                             </div>
                             <div className="h-px bg-amber-200 dark:bg-amber-800/40"></div>
                             {/* Player B */}
                             <div className="flex justify-between items-center py-1">
                               <div className="flex items-center gap-2 truncate">
                                 {match.playerB.id ? renderAthleteAvatar(match.playerB.id, match.playerB.name) : (
                                   <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[9px] font-bold text-slate-400 shrink-0 border border-slate-200 dark:border-slate-800">?</div>
                                 )}
                                 <div className="min-w-0">
                                   <span 
                                     className={`text-xs truncate max-w-[110px] font-black flex items-center gap-1 cursor-pointer hover:text-rose-500 transition-all ${
                                       pBWon ? "text-amber-600 dark:text-amber-400 text-sm font-extrabold" : "text-slate-700 dark:text-slate-300"
                                     }`}
                                     onClick={() => {
                                       if (match.playerB.id && (window as any).triggerViewAthleteProfile) {
                                         (window as any).triggerViewAthleteProfile(match.playerB.id);
                                       }
                                     }}
                                   >
                                     {pBWon && <Star className="w-3.5 h-3.5 fill-amber-500 stroke-amber-500 shrink-0" />}
                                     <span>{match.playerB.name}</span>
                                     {match.playerB.id && (
                                       <span className="text-[8px] font-mono text-slate-450 dark:text-slate-500 shrink-0">
                                         ({match.playerB.id.replace("CUP-", "")})
                                       </span>
                                     )}
                                   </span>
                                 </div>
                               </div>
                               <span className="font-mono text-xs font-black shrink-0 ml-1">
                                 {match.playerB.score !== null ? `${match.playerB.score}đ` : "---"}
                               </span>
                             </div>

                            {isAdmin && coordinateMode && (
                              <button
                                type="button"
                                onClick={() => {
                                  setScoringMatch(match);
                                  setScoreA(match.playerA.score !== null ? String(match.playerA.score) : "");
                                  setScoreB(match.playerB.score !== null ? String(match.playerB.score) : "");
                                }}
                                className="w-full mt-2 py-1 text-[9px] font-black text-indigo-600 bg-indigo-50 hover:bg-indigo-100/80 rounded-lg cursor-pointer border-none"
                              >
                                {isCompleted ? "Sửa" : "Nhập điểm"}
                              </button>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Match Result Scoring Modal Popup overlay */}
      {scoringMatch && typeof document !== "undefined" && createPortal(
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] animate-fadeIn text-slate-800 dark:text-slate-100"
          onClick={() => {
            setScoringMatch(null);
            setScoreA("");
            setScoreB("");
            setSuddenDeathWinner("");
          }}
        >
          <div 
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-xl flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Sword className="w-4 h-4 text-rose-500" />
                {language === "en" ? "Record Match Result" : "Ghi Nhận Kết Quả Đối Kháng"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setScoringMatch(null);
                  setScoreA("");
                  setScoreB("");
                  setSuddenDeathWinner("");
                }}
                className="w-7 h-7 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center cursor-pointer border-none hover:bg-slate-200 transition-all text-slate-500"
              >
                &times;
              </button>
            </div>

            {/* Input inputs */}
            <div className="flex flex-col gap-4 my-2">
              {selectedTournament && (
                <div className="text-[10px] font-black text-rose-500 bg-rose-50/50 dark:bg-rose-950/20 px-3 py-2 rounded-xl text-center flex items-center justify-center gap-1">
                  <Award className="w-3.5 h-3.5" />
                  <span>
                    {language === "en" ? "Format: " : "Thể thức: "}
                    {scoringMatch.stage === "group" ? (
                      selectedTournament.groupStageFormat === "round_robin" 
                        ? (language === "en" ? `Group Solo - Round Robin (${selectedTournament.groupShotsCount || 10} Shots)` : `Vòng bảng - Solo Vòng Tròn (${selectedTournament.groupShotsCount || 10} phát bắn)`)
                        : selectedTournament.groupStageFormat === "mini_pk"
                        ? (language === "en" ? `Group Mini PK Bracket (${selectedTournament.groupShotsCount || 10} Shots)` : `Vòng bảng - Bốc thăm Loại trực tiếp (${selectedTournament.groupShotsCount || 10} phát bắn)`)
                        : (language === "en" ? `Group Shootout (${selectedTournament.groupShotsCount || 10} Shots)` : `Vòng bảng - Bắn Tính Điểm (${selectedTournament.groupShotsCount || 10} phát bắn)`)
                    ) : (
                      selectedTournament.knockoutFormat === "shots" ? (language === "en" ? `Knockout - Shots Counter (${selectedTournament.knockoutShotsCount || 15} Shots)` : `Knockout - Đấu đếm phát bắn (${selectedTournament.knockoutShotsCount || 15} phát bắn)`) :
                      selectedTournament.knockoutFormat === "points" ? (language === "en" ? "Knockout - Points Target" : "Knockout - Solo chạm điểm") :
                      (language === "en" ? "Knockout - Sudden Death" : "Knockout - Sudden Death quyết định")
                    )}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 items-center">
                {/* Player A Score */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center h-4">
                    <label className="text-[10px] font-black text-slate-550 uppercase truncate max-w-[120px]" title={scoringMatch.playerA.name}>
                      {scoringMatch.playerA.name}
                    </label>
                    {scoreA !== "" && (
                      <button
                        type="button"
                        onClick={() => setScoreA("")}
                        className="text-[9px] font-black text-rose-500 hover:text-rose-700 bg-transparent border-none cursor-pointer p-0 flex items-center gap-0.5 transition-colors"
                        title={language === "en" ? "Delete score" : "Xóa điểm"}
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>{language === "en" ? "Clear" : "Xóa"}</span>
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={scoreA}
                    onChange={(e) => setScoreA(e.target.value)}
                    placeholder="e.g. 10"
                    className="w-full px-3 py-2.5 text-center font-mono font-black text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
                  />
                </div>

                {/* Player B Score */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center h-4">
                    <label className="text-[10px] font-black text-slate-550 uppercase truncate max-w-[120px]" title={scoringMatch.playerB.name}>
                      {scoringMatch.playerB.name}
                    </label>
                    {scoreB !== "" && (
                      <button
                        type="button"
                        onClick={() => setScoreB("")}
                        className="text-[9px] font-black text-rose-500 hover:text-rose-700 bg-transparent border-none cursor-pointer p-0 flex items-center gap-0.5 transition-colors"
                        title={language === "en" ? "Delete score" : "Xóa điểm"}
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>{language === "en" ? "Clear" : "Xóa"}</span>
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={scoreB}
                    onChange={(e) => setScoreB(e.target.value)}
                    placeholder="e.g. 8"
                    className="w-full px-3 py-2.5 text-center font-mono font-black text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              {/* Sudden Death section if it's knockout or mini-pk stage and score is drawn */}
              {((scoringMatch.stage === "knockout") || (selectedTournament?.groupStageFormat === "mini_pk")) && scoreA !== "" && scoreB !== "" && parseInt(scoreA) === parseInt(scoreB) && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-2xl flex flex-col gap-2.5">
                  <div>
                    <h4 className="text-[11px] font-black text-amber-800 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-amber-500 stroke-amber-500" />
                      {language === "en" ? "Sudden Death Decider Needed" : "Cần Quyết Định Sudden Death"}
                    </h4>
                    <p className="text-[10px] text-amber-700/80 mt-0.5">
                      {language === "en" 
                        ? "Since this match cannot end in a draw, please select which player won the sudden-death shootout!" 
                        : "Lượt đấu loại trực tiếp không thể kết thúc hòa. Vui lòng chọn người bắn trúng phát quyết định!"}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSuddenDeathWinner(scoringMatch.playerA.id)}
                      className={`py-2 px-3 text-[10px] font-black uppercase rounded-lg border transition-all cursor-pointer ${
                        suddenDeathWinner === scoringMatch.playerA.id
                          ? "bg-amber-500 text-amber-950 border-amber-500 font-extrabold"
                          : "bg-white dark:bg-slate-800 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900"
                      }`}
                    >
                      {scoringMatch.playerA.name}
                    </button>

                    <button
                      type="button"
                      onClick={() => setSuddenDeathWinner(scoringMatch.playerB.id)}
                      className={`py-2 px-3 text-[10px] font-black uppercase rounded-lg border transition-all cursor-pointer ${
                        suddenDeathWinner === scoringMatch.playerB.id
                          ? "bg-amber-500 text-amber-950 border-amber-500 font-extrabold"
                          : "bg-white dark:bg-slate-800 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900"
                      }`}
                    >
                      {scoringMatch.playerB.name}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end mt-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setScoringMatch(null);
                  setScoreA("");
                  setScoreB("");
                  setSuddenDeathWinner("");
                }}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 bg-transparent rounded-lg cursor-pointer border-none"
              >
                {language === "en" ? "Cancel" : "Hủy"}
              </button>
              <button
                type="button"
                onClick={handleSaveMatchScore}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-black text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer border-none shadow-sm flex items-center justify-center gap-1"
              >
                {actionLoading && <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin shrink-0"></div>}
                {language === "en" ? "Save Score" : "Lưu Kết Quả"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 1. Modal Thêm Hồ Sơ Vận Động Viên Mới */}
      {isAddManualModalOpen && typeof document !== "undefined" && createPortal(
        <div 
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-fadeIn text-slate-800 dark:text-slate-100"
          onClick={() => setIsAddManualModalOpen(false)}
        >
          <div 
            className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto border border-slate-200 dark:border-slate-800 animate-scaleUp relative p-5 sm:p-7 flex flex-col gap-4 text-slate-800 dark:text-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Close Button for convenient mobile touch */}
            <button
              type="button"
              onClick={() => setIsAddManualModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all z-20 cursor-pointer border-none bg-transparent"
              title="Đóng cửa sổ"
            >
              <X className="w-5 h-5 font-bold" />
            </button>

            <form 
              onSubmit={handleSaveManualProfile}
              className="flex flex-col gap-5 mt-2 text-left"
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center pb-2 border-b border-gray-150">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Edit3 className="w-4.5 h-4.5 text-blue-600" />
                  {language === "en" ? "Create New Athlete Profile" : "Thêm Hồ Sơ Vận Động Viên Mới"}
                </h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddManualModalOpen(false)}
                    className="p-1 px-3 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300 rounded text-xs font-semibold flex items-center gap-1 transition-all border-none cursor-pointer"
                  >
                    <X className="w-3 h-3" /> {language === "en" ? "Cancel" : "Hủy bỏ"}
                  </button>
                </div>
              </div>

              {/* Validation Error & Suggested System Profile Sync Block */}
              {manualFormValidationErr && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 rounded-xl text-xs font-semibold leading-relaxed shadow-sm animate-fadeIn flex flex-col gap-2">
                  <div className="flex items-start gap-2">
                    <span className="text-base leading-none">⚠️</span>
                    <div className="flex-1">{manualFormValidationErr}</div>
                  </div>
                  {manualFormDuplicateSysMatch && (
                    <div className="mt-1 pt-2 border-t border-rose-250 dark:border-rose-800/60 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        👉 {language === "en" ? "Suggestion: Load VSC athlete directly into Cup:" : "Gợi ý: Nạp trực tiếp VĐV này vào cúp:"}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          handleAddVscToCup(manualFormDuplicateSysMatch, manualFormCategory, manualFormIsPrimary);
                          setIsAddManualModalOpen(false);
                          setManualFormDuplicateSysMatch(null);
                          setManualFormValidationErr("");
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-extrabold flex items-center gap-1.5 shadow transition-all cursor-pointer hover:scale-105 active:scale-95 border-none"
                      >
                        <PlusCircle className="w-4 h-4" /> {language === "en" ? "Add to Cup Now" : "Thêm ngay VĐV này vào cúp"}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* The 3-Column layout grid block */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Column 1: Avatar section selection */}
                <div className="flex flex-col items-center text-center gap-3 md:border-r md:pr-4 border-gray-150">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{language === "en" ? "Avatar" : "Hình ảnh đại diện"}</span>
                  
                  <div className="relative group cursor-pointer w-24 h-24 rounded-full overflow-hidden border-2 border-blue-500 shadow-md shrink-0 flex items-center justify-center bg-slate-50">
                    <img 
                      src={manualFormAvatarUrl || AVATAR_MALE} 
                      alt="Preview" 
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <label className="absolute inset-0 bg-black/40 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[10px] font-bold">
                      <Camera className="w-4 h-4 mb-0.5" />
                      Tải ảnh lên
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              if (typeof reader.result === "string") {
                                compressImage(reader.result).then((compressed) => {
                                  setManualFormAvatarUrl(compressed);
                                });
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>

                  <div className="w-full flex items-center justify-center gap-1.5">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 text-[11px] text-blue-600 hover:text-blue-800 font-bold bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded transition-colors">
                      <Camera className="w-3.5 h-3.5" />
                      <span>{language === "en" ? "Select" : "Chọn từ thiết bị"}</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              if (typeof reader.result === "string") {
                                compressImage(reader.result).then((compressed) => {
                                  setManualFormAvatarUrl(compressed);
                                });
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!manualFormEmail || !manualFormEmail.trim()) {
                          alert(language === "en" 
                            ? "Please enter/provide the athlete's Email first!" 
                            : "Vui lòng nhập Email của hồ sơ vận động viên trước để đồng bộ ảnh đại diện!"
                          );
                          return;
                        }
                        const emailTrimmed = manualFormEmail.trim().toLowerCase();

                        try {
                          const result = await findLinkedEmailAndAvatarForAthlete(manualFormId, manualFormName, emailTrimmed);
                          if (result && result.avatarUrl) {
                            setManualFormAvatarUrl(result.avatarUrl);
                            alert(language === "en" 
                              ? `Successfully synced Google avatar for email "${emailTrimmed}"!` 
                              : `Đã đồng bộ thành công ảnh đại diện Google từ email "${emailTrimmed}"!`
                            );
                          } else {
                            alert(language === "en" 
                              ? `Could not find any Google avatar linked with email "${emailTrimmed}".` 
                              : `Không tìm thấy tài khoản Google hoặc ảnh đại diện nào khớp với email "${emailTrimmed}".`
                            );
                          }
                        } catch (e) {
                          console.error(e);
                          alert(language === "en" ? "Error syncing Google avatar." : "Lỗi khi đồng bộ ảnh đại diện Google.");
                        }
                      }}
                      title={language === "en" ? "Sync Google avatar" : "Đồng bộ ảnh đại diện từ Google"}
                      className="p-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors flex items-center justify-center active:scale-95 border-none cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="w-full mt-1">
                    <span className="text-[10px] text-gray-400 block mb-1">
                      {language === "en" ? "Or input Image URL:" : "Hoặc nhập URL ảnh phía dưới:"}
                    </span>
                    <input
                      type="text"
                      value={manualFormAvatarUrl}
                      onChange={(e) => setManualFormAvatarUrl(e.target.value)}
                      placeholder="https://example.com/avatar.jpg"
                      className="w-full px-2 py-1 text-[11px] bg-slate-50 dark:bg-slate-950 border border-gray-300 dark:border-slate-800 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-white"
                    />
                  </div>

                  {/* Preset Avatar Selection */}
                  <span className="text-[10px] text-gray-400 block mt-3 mb-1">
                    {language === "en" ? "Select Preset Empty Avatar:" : "Chọn ảnh mẫu trống (Nam/Nữ):"}
                  </span>
                  <div className="flex gap-4 justify-center w-full mt-1">
                    {PRESET_AVATARS.map((url, i) => {
                      const isMale = i === 0;
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setManualFormAvatarUrl(url)}
                          className={`relative rounded-xl p-2 flex flex-col items-center gap-1 border transition-all w-24 cursor-pointer ${
                            manualFormAvatarUrl === url 
                              ? "border-blue-500 bg-blue-50 dark:bg-slate-850 text-blue-700 dark:text-blue-400 font-bold" 
                              : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500"
                          }`}
                        >
                          <img 
                            src={url} 
                            alt={isMale ? "Nam" : "Nữ"} 
                            referrerPolicy="no-referrer" 
                            className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-800 shadow-sm" 
                          />
                          <span className="text-[10px] font-semibold">{isMale ? (language === "en" ? "Male Empty" : "Trống Nam") : (language === "en" ? "Female Empty" : "Trống Nữ")}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Column 2 & 3: Form Input fields */}
                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* ID code */}
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-450 uppercase mb-1 flex items-center gap-1">
                      {language === "en" ? "Athlete ID:" : "Mã số VĐV (ID):"} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={manualFormId}
                      onChange={(e) => {
                        setManualFormId(e.target.value);
                        setManualFormValidationErr("");
                        setManualFormDuplicateSysMatch(null);
                      }}
                      placeholder="e.g. VSC-L96194"
                      disabled={true}
                      className="w-full px-3 py-1.5 text-sm bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono font-bold text-slate-500 dark:text-slate-400 cursor-not-allowed select-none opacity-80"
                    />
                    {(() => {
                      if (!manualFormId.trim()) return null;
                      const trimmedId = manualFormId.trim().toLowerCase();
                      const liveSys = vscSystemAthletes.find(
                        (a) => a.id.trim().toLowerCase() === trimmedId
                      );
                      const liveRoster = cupAthletes.find(
                        (a) => a.id.trim().toLowerCase() === trimmedId
                      );

                      if (liveSys) {
                        return (
                          <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 rounded-lg text-[11px] text-amber-900 dark:text-amber-200 flex flex-col gap-1.5 shadow-sm">
                            <div>
                              ⚠️ ID <strong>"{liveSys.id}"</strong> trùng với VĐV <strong>"{liveSys.name}"</strong> ({liveSys.team || "Chưa có CLB"}) trên Hệ thống VSC.
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                handleAddVscToCup(liveSys, manualFormCategory, manualFormIsPrimary);
                                setIsAddManualModalOpen(false);
                                setManualFormDuplicateSysMatch(null);
                                setManualFormValidationErr("");
                              }}
                              className="py-1 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 shadow border-none"
                            >
                              <PlusCircle className="w-3.5 h-3.5" /> Nạp VĐV "{liveSys.name}" vào cúp ngay
                            </button>
                          </div>
                        );
                      }

                      if (liveRoster) {
                        return (
                          <p className="mt-1 text-[11px] font-bold text-rose-650 dark:text-rose-400">
                            ⚠️ Mã ID này đã thuộc về VĐV "{liveRoster.name}" trong danh sách cúp. Vui lòng đổi ID khác.
                          </p>
                        );
                      }

                      return null;
                    })()}
                  </div>

                  {/* Full name */}
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-450 uppercase mb-1 flex items-center gap-1">
                      {language === "en" ? "Full Name:" : "Họ và Tên:"} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={manualFormName}
                      onChange={(e) => setManualFormName(e.target.value)}
                      placeholder="Nguyễn Văn A"
                      className="w-full px-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-950 border border-gray-300 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold text-slate-900 dark:text-white"
                    />
                  </div>

                  {/* Email liên kết (Tra cứu Cloud) */}
                  <div className="col-span-1 sm:col-span-2 bg-slate-100/50 dark:bg-slate-900/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                      {language === "en" ? "Linked Cloud Email (Optional):" : "Email tài khoản Cloud (Tùy chọn):"}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={manualFormEmail}
                        onChange={(e) => setManualFormEmail(e.target.value)}
                        placeholder="vdv_clb@gmail.com"
                        className="flex-1 px-3 py-1.5 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-850 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleLoadCloudProfile(manualFormEmail)}
                        className="px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:hover:bg-indigo-900 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-indigo-500 animate-pulse" /> {language === "en" ? "Query Cloud" : "Tra cứu Cloud"}
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1">
                      {language === "en" ? "Query athlete details (avatar, cccd, DOB, hometown, province, team) directly from cloud records using their Email." : "Nếu vận động viên đã có hồ sơ cá nhân trên Cloud, nhấp \"Tra cứu Cloud\" để tự động điền nhanh toàn bộ ảnh đại diện, số CCCD, ngày sinh, địa chỉ, tỉnh thành và câu lạc bộ!"}
                    </p>
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-450 uppercase mb-1">
                      {language === "en" ? "Gender:" : "Giới tính:"}
                    </label>
                    <select
                      value={manualFormGender}
                      onChange={(e) => setManualFormGender(e.target.value)}
                      className="w-full px-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-950 border border-gray-300 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold text-slate-900 dark:text-white"
                    >
                      <option value="Nam">{language === "en" ? "Male" : "Nam"}</option>
                      <option value="Nữ">{language === "en" ? "Female" : "Nữ"}</option>
                    </select>
                  </div>

                  {/* Team CLB */}
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-450 uppercase mb-1">
                      {language === "en" ? "Club / Province:" : "Câu lạc bộ / Đội tuyển:"}
                    </label>
                    {clubs.length === 0 ? (
                      <div className="text-xs text-amber-600 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-2.5 flex flex-col gap-1.5 font-sans leading-relaxed">
                        <span>⚠️ {language === "en" ? "No clubs in system list. Using custom input:" : "Chưa có câu lạc bộ nào trong danh sách hệ thống."}</span>
                        <input
                          type="text"
                          value={manualFormTeam}
                          onChange={(e) => setManualFormTeam(e.target.value)}
                          placeholder={language === "en" ? "Enter Club/Team name..." : "Nhập tên CLB / Đội tuyển..."}
                          className="w-full px-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-950 border border-gray-300 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-extrabold text-slate-900 dark:text-white"
                        />
                      </div>
                    ) : (
                      <>
                        <select
                          value={manualFormTeam && !clubs.some(c => c.name === manualFormTeam) ? "Khác" : manualFormTeam}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "Khác") {
                              setManualFormTeam("");
                            } else {
                              setManualFormTeam(val);
                            }
                          }}
                          className="w-full px-3 py-1.5 text-sm bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-extrabold text-slate-900 dark:text-white"
                        >
                          <option value="">{language === "en" ? "-- Select Club --" : "-- Chọn Câu lạc bộ --"}</option>
                          {clubs.map(c => (
                            <option key={c.id} value={c.name}>
                              {c.name} {c.province ? `(${c.province})` : ""}
                            </option>
                          ))}
                          <option value="Khác">{language === "en" ? "Other (Type manually...)" : "Khác (Tự nhập tay...)"}</option>
                        </select>
                        {(manualFormTeam === "Khác" || (manualFormTeam && !clubs.some(c => c.name === manualFormTeam))) && (
                          <input
                            type="text"
                            value={manualFormTeam === "Khác" ? "" : manualFormTeam}
                            onChange={(e) => setManualFormTeam(e.target.value)}
                            placeholder={language === "en" ? "Enter custom club/team name..." : "Nhập tên CLB khác..."}
                            className="mt-2 w-full px-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-950 border border-gray-300 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-extrabold text-slate-900 dark:text-white"
                          />
                        )}
                      </>
                    )}
                    <div className="mt-1.5 flex items-center">
                      <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-indigo-800 dark:text-indigo-400 bg-indigo-50/70 dark:bg-slate-900/40 border border-indigo-150 dark:border-indigo-950 py-1 px-2 rounded-lg leading-none select-none">
                        <input
                          type="checkbox"
                          checked={manualFormIsPrimary}
                          onChange={(e) => setManualFormIsPrimary(e.target.checked)}
                          className="rounded border-indigo-300 dark:border-indigo-800 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                        />
                        <span>{language === "en" ? "Primary for Team" : "Bắn chính cho Đội/CLB"}</span>
                      </label>
                    </div>
                  </div>

                  {/* ID Card / Passport */}
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-450 uppercase mb-1">
                      {language === "en" ? "ID Card / Passport:" : "Căn cước / Hộ chiếu:"}
                    </label>
                    <input
                      type="text"
                      value={manualFormIdCard}
                      onChange={(e) => setManualFormIdCard(e.target.value)}
                      placeholder="Số CMND/CCCD/Passport"
                      className="w-full px-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-950 border border-gray-300 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-slate-900 dark:text-white"
                    />
                  </div>

                  {/* DOB */}
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-450 uppercase mb-1">
                      {language === "en" ? "Date of Birth:" : "Ngày tháng năm sinh:"}
                    </label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="date"
                        value={manualFormDob}
                        onChange={(e) => setManualFormDob(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-950 border border-gray-300 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white font-semibold"
                      />
                    </div>
                  </div>

                  {/* Hometown */}
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-450 uppercase mb-1">
                      {language === "en" ? "Hometown / Address:" : "Quê quán / Nguyên quán:"}
                    </label>
                    <input
                      type="text"
                      value={manualFormHometown}
                      onChange={(e) => setManualFormHometown(e.target.value)}
                      placeholder="e.g. Ba Đình, Hà Nội"
                      className="w-full px-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-950 border border-gray-300 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white font-medium"
                    />
                  </div>

                  {/* Province / City */}
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-450 uppercase mb-1">
                      {language === "en" ? "Current Province / City:" : "Tỉnh / Thành phố hiện tại:"}
                    </label>
                    <select
                      value={manualFormProvince && !VIETNAM_PROVINCES.includes(manualFormProvince) ? "Khác" : manualFormProvince}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "Khác") {
                          setManualFormProvince("Nước Ngoài");
                        } else {
                          setManualFormProvince(val);
                        }
                      }}
                      className="w-full px-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-950 border border-gray-300 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold text-slate-900 dark:text-white"
                    >
                      <option value="">-- Chọn Tỉnh / Thành phố --</option>
                      {VIETNAM_PROVINCES.map((prov) => (
                        <option key={prov} value={prov}>{prov}</option>
                      ))}
                      <option value="Khác">Khác (Tự nhập)</option>
                    </select>
                    {(manualFormProvince === "Khác" || (manualFormProvince && !VIETNAM_PROVINCES.includes(manualFormProvince))) && (
                      <input
                        type="text"
                        value={manualFormProvince === "Khác" ? "" : manualFormProvince}
                        onChange={(e) => setManualFormProvince(e.target.value)}
                        placeholder="Nhập tỉnh thành khác..."
                        className="mt-2 w-full px-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-950 border border-gray-300 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold text-slate-900 dark:text-white"
                      />
                    )}
                  </div>

                  {/* Country with flag selector */}
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-450 uppercase mb-1 flex items-center gap-1">
                      {language === "en" ? "Country:" : "Quốc gia:"} {getCountryEmoji(manualFormCountryCode)}
                    </label>
                    <select
                      value={manualFormCountryCode}
                      onChange={(e) => {
                        const code = e.target.value;
                        setManualFormCountryCode(code);
                        if (code === "OTHER") {
                          setManualFormCountry("");
                        } else {
                          const countryObj = PRESET_COUNTRIES.find(c => c.code === code);
                          if (countryObj) {
                            setManualFormCountry(countryObj.name);
                          }
                        }
                      }}
                      className="w-full px-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-950 border border-gray-300 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white font-medium"
                    >
                      {PRESET_COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.emoji} {c.name}
                        </option>
                      ))}
                    </select>

                    {manualFormCountryCode === "OTHER" && (
                      <div className="mt-2 animate-fadeIn">
                        <label className="block text-[10px] text-gray-400 mb-1 font-semibold">
                          Tự nhập tên quốc gia:
                        </label>
                        <input
                          type="text"
                          value={manualFormCountry}
                          onChange={(e) => setManualFormCountry(e.target.value)}
                          placeholder="e.g. Vương quốc Anh, Canada..."
                          required
                          className="w-full px-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-950 border border-blue-400 dark:border-blue-900 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold text-slate-900 dark:text-white"
                        />
                      </div>
                    )}
                  </div>

                  {/* Attendance Status */}
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-450 uppercase mb-1">
                      {language === "en" ? "Status:" : "Trạng thái điểm danh:"}
                    </label>
                    <select
                      value={manualFormStatus}
                      onChange={(e) => setManualFormStatus(e.target.value)}
                      className="w-full px-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-950 border border-gray-300 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold text-slate-900 dark:text-white"
                    >
                      <option value="Thi đấu">{language === "en" ? "Active" : "Thi đấu"}</option>
                      <option value="Bỏ thi">{language === "en" ? "Absent" : "Bỏ thi"}</option>
                      <option value="Dự bị">{language === "en" ? "Reserve" : "Dự bị"}</option>
                    </select>
                  </div>

                  {/* Category Selection */}
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-450 uppercase mb-1 text-indigo-600">
                      {language === "en" ? "Category:" : "Phân hạng thi đấu:"}
                    </label>
                    <select
                      value={manualFormCategory}
                      onChange={(e) => setManualFormCategory(e.target.value)}
                      className="w-full px-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-950 border border-indigo-300 dark:border-indigo-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold text-indigo-800 dark:text-indigo-300"
                    >
                      <option value="Nghiệp dư">{language === "en" ? "Amateur" : "Nghiệp dư"}</option>
                      <option value="Chuyên nghiệp">{language === "en" ? "Pro" : "Chuyên nghiệp"}</option>
                      <option value="Lão tướng">{language === "en" ? "Veteran" : "Lão tướng"}</option>
                      <option value="Trẻ em">{language === "en" ? "Kids" : "Trẻ em"}</option>
                    </select>
                  </div>

                </div>

              </div>

              {/* Bottom Actions Form */}
              <div className="pt-4 border-t border-gray-150 dark:border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddManualModalOpen(false)}
                  className="py-1.5 px-4 border border-gray-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-semibold hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer bg-transparent"
                >
                  {language === "en" ? "Cancel" : "Hủy"}
                </button>
                <button
                  type="submit"
                  className="py-1.5 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer border-none"
                >
                  <Check className="w-4 h-4" /> 
                  {language === "en" ? "Register Athlete" : "Đăng ký vận động viên"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* 2. Modal Thêm VĐV Hệ Thống */}
      {isAddSystemAthleteModalOpen && typeof document !== "undefined" && createPortal(
        <div 
          className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] animate-fadeIn text-slate-800 dark:text-slate-100"
          onClick={() => setIsAddSystemAthleteModalOpen(false)}
        >
          <div 
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 animate-scaleUp flex flex-col max-h-[85vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-150 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/40">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white uppercase tracking-wide">
                    {language === "en" ? "Add System Athletes to Cup" : "Thêm VĐV Hệ Thống Vào Cúp"}
                  </h3>
                  <p className="text-[10.5px] text-slate-400 dark:text-slate-500 mt-0.5">
                    {language === "en" ? "Select registered VSC athletes to join this cup roster" : "Chọn các VĐV chính thức từ cơ sở dữ liệu VSC để thêm vào giải đấu Cúp"}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsAddSystemAthleteModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors border-none bg-transparent"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Search Field */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={language === "en" ? "Search system athletes..." : "Tìm kiếm VĐV hệ thống theo Tên, Mã số, Tỉnh thành..."}
                  value={systemAthleteSearchTerm}
                  onChange={(e) => setSystemAthleteSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-8 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-950 transition-all font-bold dark:text-white"
                />
                {systemAthleteSearchTerm && (
                  <button 
                    onClick={() => setSystemAthleteSearchTerm("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 rounded border-none bg-transparent"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable List container */}
            <div className="p-4 overflow-y-auto flex-1 bg-slate-50/50 dark:bg-slate-950/20 max-h-[50vh] min-h-[300px] space-y-2">
              {vscSystemAthletes.length === 0 ? (
                <div className="py-12 text-center text-slate-400 italic text-xs">
                  {language === "en" ? "VSC Database is currently empty" : "Danh sách VĐV hệ thống VSC đang trống"}
                </div>
              ) : (() => {
                const queryStr = systemAthleteSearchTerm.toLowerCase().trim();
                const filteredList = vscSystemAthletes.filter(ath => 
                  ath.name.toLowerCase().includes(queryStr) ||
                  ath.id.toLowerCase().includes(queryStr) ||
                  (ath.province && ath.province.toLowerCase().includes(queryStr)) ||
                  (ath.team && ath.team.toLowerCase().includes(queryStr))
                );

                if (filteredList.length === 0) {
                  return (
                    <div className="py-12 text-center text-slate-400 italic text-xs">
                      {language === "en" ? "No matching athletes found" : "Không tìm thấy vận động viên nào phù hợp"}
                    </div>
                  );
                }

                return filteredList.map(ath => {
                  const isAdded = cupAthletes.some(a => a.id.trim().toLowerCase() === ath.id.trim().toLowerCase());
                  return (
                    <div 
                      key={ath.id} 
                      className="p-3 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl flex items-center justify-between gap-3 shadow-sm text-slate-800 dark:text-white"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img 
                          src={ath.avatarUrl || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23f1f5f9'/><circle cx='50' cy='38' r='20' fill='%2364748b'/><path d='M22 85c0-14 11-22 28-22s28 8 28 22z' fill='%2364748b'/></svg>"} 
                          alt={ath.name} 
                          className="w-11 h-11 rounded-full object-cover border border-slate-200 dark:border-slate-800 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0 text-left">
                          <h4 className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-100 truncate flex items-center gap-1.5">
                            {ath.name}
                            <span className="text-[10px] text-indigo-500 font-extrabold bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded-lg border border-indigo-100/30">
                              {ath.id}
                            </span>
                          </h4>
                          <div className="flex items-center gap-x-2 text-[10px] text-slate-400 mt-1">
                            <span>🛡️ {ath.team || (language === "en" ? "Independent" : "Tự do")}</span>
                            <span>•</span>
                            <span>📍 {ath.province || "---"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-3.5 flex-wrap sm:flex-nowrap">
                        {!isAdded && (
                          <>
                            {/* Option Phân hạng thi đấu */}
                            <div className="flex flex-col gap-0.5 min-w-[120px] text-left">
                              <span className="text-[9px] uppercase font-extrabold text-slate-400 dark:text-slate-500">
                                {language === "en" ? "Category" : "Phân hạng"}
                              </span>
                              <select
                                value={sysAthCategories[ath.id] || "Nghiệp dư"}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setSysAthCategories(prev => ({ ...prev, [ath.id]: val }));
                                }}
                                className="px-2 py-1 text-[11px] bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg focus:outline-none font-bold text-indigo-700 dark:text-indigo-400 cursor-pointer"
                              >
                                <option value="Nghiệp dư">{language === "en" ? "Amateur" : "Nghiệp dư"}</option>
                                <option value="Chuyên nghiệp">{language === "en" ? "Pro" : "Chuyên nghiệp"}</option>
                                <option value="Lão tướng">{language === "en" ? "Veteran" : "Lão tướng"}</option>
                                <option value="Trẻ em">{language === "en" ? "Kids" : "Trẻ em"}</option>
                              </select>
                            </div>

                            {/* Nút tích BẮN CHÍNH */}
                            <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-extrabold text-slate-600 dark:text-slate-300 select-none bg-slate-50 dark:bg-slate-950 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
                              <input
                                type="checkbox"
                                checked={sysAthIsPrimary[ath.id] || false}
                                onChange={(e) => {
                                  const val = e.target.checked;
                                  setSysAthIsPrimary(prev => ({ ...prev, [ath.id]: val }));
                                }}
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                              />
                              <span>{language === "en" ? "PRIMARY" : "BẮN CHÍNH"}</span>
                            </label>
                          </>
                        )}

                        <div>
                          {isAdded ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-450 dark:text-slate-500 text-xs font-bold rounded-xl border border-slate-200/50 dark:border-slate-700/50">
                              <Check className="w-3.5 h-3.5" /> {language === "en" ? "Added" : "Đã thêm"}
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAddVscToCup(
                                ath, 
                                sysAthCategories[ath.id] || "Nghiệp dư", 
                                sysAthIsPrimary[ath.id] || false
                              )}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs border-none cursor-pointer active:scale-95 flex items-center gap-1"
                            >
                              <PlusCircle className="w-3.5 h-3.5" />
                              {language === "en" ? "Add" : "Thêm"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-150 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 flex justify-end shrink-0 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setIsAddSystemAthleteModalOpen(false)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-black rounded-xl cursor-pointer border-none"
              >
                {language === "en" ? "Close" : "Đóng"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Reusable Viewport Center Confirmation Modal Portal */}
      {confirmModal && typeof document !== "undefined" && createPortal(
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[10000] animate-fadeIn text-slate-800 dark:text-slate-100"
          onClick={() => setConfirmModal(null)}
        >
          <div 
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl flex flex-col gap-4 animate-scaleUp text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2.5 rounded-xl shrink-0 ${confirmModal.isDanger ? 'bg-red-50 dark:bg-red-950/30 text-red-600' : 'bg-amber-50 dark:bg-amber-950/30 text-amber-600'}`}>
                {confirmModal.isDanger ? <Trash2 className="w-5 h-5" /> : <Award className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  {confirmModal.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed font-semibold">
                  {confirmModal.message}
                </p>
              </div>
            </div>

            <div className="flex gap-2.5 justify-end mt-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 bg-transparent rounded-lg cursor-pointer border-none"
              >
                {confirmModal.cancelText || (language === "en" ? "Cancel" : "Hủy")}
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className={`px-4.5 py-2 text-xs font-black text-white rounded-lg cursor-pointer border-none shadow-sm transition-transform active:scale-95 ${
                  confirmModal.isDanger 
                    ? "bg-red-600 hover:bg-red-700" 
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {confirmModal.confirmText || (language === "en" ? "Confirm" : "Xác nhận")}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
