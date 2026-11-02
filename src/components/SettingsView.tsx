import React, { useState, useEffect } from "react";
import { 
  Settings, 
  Users, 
  Trophy, 
  Calendar, 
  MapPin, 
  AlignLeft, 
  Image as ImageIcon, 
  Check,
  PlusCircle,
  Search,
  Trash2,
  Plus,
  AlertCircle,
  X,
  ChevronDown,
  Sword,
  UserPlus,
  ChevronLeft,
  Lock,
  Award,
  UserCheck,
  Sparkles,
  RefreshCw
} from "lucide-react";
import { createPortal } from "react-dom";
import { SettingsPanel } from "./SettingsPanel";
import { AthleteManagement } from "./AthleteManagement";
import { db } from "../firebase";
import { doc, updateDoc, collection, query, where, getDocs, deleteDoc, onSnapshot, setDoc } from "firebase/firestore";
import { generateGroupKnockoutMatches, VersusMatch, VersusTournament } from "./VersusTournamentHub";
import { Athlete } from "../types";

// Image compression helper
const compressImage = (base64Str: string, maxWidth = 150, maxHeight = 150): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement("canvas");
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

interface SettingsViewProps {
  settingsSubTab: "config" | "athletes";
  setSettingsSubTab: (subTab: "config" | "athletes") => void;
  language: string;
  matchName: string;
  setMatchName: (name: string) => void;
  bannerUrl: string;
  setBannerUrl: (url: string) => void;
  avatarUrl: string;
  setAvatarUrl: (url: string) => void;
  distances: any[];
  setDistances: (distances: any[]) => void;
  shotsCount: number;
  setShotsCount: (count: number) => void;
  athletes: any[];
  setAthletes: (athletes: any[]) => void;
  masterAthletes: any[];
  setMasterAthletes: (athletes: any[]) => void;
  history: any[];
  setHistory: (history: any[]) => void;
  handleSaveCurrentSessionToHistory: () => void;
  handleResetSession: () => void;
  handleImportSingleBackup: (file: any) => void;
  storedAthleteLists: any[];
  setStoredAthleteLists: (lists: any[]) => void;
  activeHistoryId: string | null;
  setActiveHistoryId: (id: string | null) => void;
  setInputAthletes: (athletes: any[]) => void;
  setTeamInputAthletes: (athletes: any[]) => void;
  startDate: string;
  setStartDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
  location: string;
  setLocation: (loc: string) => void;
  setClubs: (clubs: any[]) => void;
  
  // Team modes
  teamDistances: any[];
  setTeamDistances: (distances: any[]) => void;
  teamShotsCount: number;
  setTeamShotsCount: (count: number) => void;
  teamAthletes: any[];
  setTeamAthletes: (athletes: any[]) => void;
  directMaxShots: number;
  setDirectMaxShots: (shots: number) => void;
  teamDirectMaxShots: number;
  setTeamDirectMaxShots: (shots: number) => void;
  directMaxPoints: number;
  setDirectMaxPoints: (points: number) => void;
  teamDirectMaxPoints: number;
  setTeamDirectMaxPoints: (points: number) => void;
  currentTournamentDoc: any;
  updateOnlineTournament: (id: string, data: any) => Promise<any>;
  isNewTournamentModalOpen: boolean;
  setIsNewTournamentModalOpen: (open: boolean) => void;
  tournamentType: "individual" | "team" | "combined" | "versus";
  setTournamentType: (type: "individual" | "team" | "combined" | "versus") => void;
  laneCapacity: number;
  setLaneCapacity: (capacity: number) => void;
  setActiveTab: (tab: any) => void;
  handleExitTournament: () => Promise<void>;
  userRole: string;
  handleAddAuditLog: (log: string) => void;
  
  // Athlete Management
  currentDistances: any[];
  currentShotsCount: number;
  currentAthletes: any[];
  competitionMode: "individual" | "team";
  clubs: any[];
  currentUser: any;
  athleteForceTab: string;
  vscSystemAthletes?: any[];
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settingsSubTab,
  setSettingsSubTab,
  language,
  matchName,
  setMatchName,
  bannerUrl,
  setBannerUrl,
  avatarUrl,
  setAvatarUrl,
  distances,
  setDistances,
  shotsCount,
  setShotsCount,
  athletes,
  setAthletes,
  masterAthletes,
  setMasterAthletes,
  history,
  setHistory,
  handleSaveCurrentSessionToHistory,
  handleResetSession,
  handleImportSingleBackup,
  storedAthleteLists,
  setStoredAthleteLists,
  activeHistoryId,
  setActiveHistoryId,
  setInputAthletes,
  setTeamInputAthletes,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  location,
  setLocation,
  setClubs,
  
  // Team modes
  teamDistances,
  setTeamDistances,
  teamShotsCount,
  setTeamShotsCount,
  teamAthletes,
  setTeamAthletes,
  directMaxShots,
  setDirectMaxShots,
  teamDirectMaxShots,
  setTeamDirectMaxShots,
  directMaxPoints,
  setDirectMaxPoints,
  teamDirectMaxPoints,
  setTeamDirectMaxPoints,
  currentTournamentDoc,
  updateOnlineTournament,
  isNewTournamentModalOpen,
  setIsNewTournamentModalOpen,
  tournamentType,
  setTournamentType,
  laneCapacity,
  setLaneCapacity,
  setActiveTab,
  handleExitTournament,
  userRole,
  handleAddAuditLog,
  
  // Athlete Management
  currentDistances,
  currentShotsCount,
  currentAthletes,
  competitionMode,
  clubs,
  currentUser,
  athleteForceTab,
  vscSystemAthletes = [],
}) => {

  const isVersusTournament = !!activeHistoryId && (
    activeHistoryId.startsWith("tour-versus-") || 
    currentTournamentDoc?.tournamentType === "versus" || 
    tournamentType === "versus"
  );

  // Force settings subtab to config when in a versus tournament
  useEffect(() => {
    if (isVersusTournament && settingsSubTab !== "config") {
      setSettingsSubTab("config");
    }
  }, [isVersusTournament, settingsSubTab, setSettingsSubTab]);

  // Local state for Versus settings edits
  const [versusName, setVersusName] = useState("");
  const [versusStartDate, setVersusStartDate] = useState("");
  const [versusEndDate, setVersusEndDate] = useState("");
  const [versusLocation, setVersusLocation] = useState("");
  const [versusRules, setVersusRules] = useState("");
  const [versusAvatar, setVersusAvatar] = useState("");
  const [versusBanner, setVersusBanner] = useState("");
  const [isSavingVersus, setIsSavingVersus] = useState(false);
  const [isCompressingAvatar, setIsCompressingAvatar] = useState(false);
  const [isCompressingBanner, setIsCompressingBanner] = useState(false);

  // New Cup configuration states
  const [versusTournamentDoc, setVersusTournamentDoc] = useState<VersusTournament | null>(null);
  const [versusMatches, setVersusMatches] = useState<VersusMatch[]>([]);
  const [versusNumGroups, setVersusNumGroups] = useState<number>(4);
  const [versusQualifiers, setVersusQualifiers] = useState<number>(2);
  const [versusGroupStageFormat, setVersusGroupStageFormat] = useState<"round_robin" | "score_shootout" | "mini_pk">("round_robin");
  const [versusGroupShotsCount, setVersusGroupShotsCount] = useState<number>(10);
  const [versusKnockoutShotsCount, setVersusKnockoutShotsCount] = useState<number>(15);
  const [versusKnockoutFormat, setVersusKnockoutFormat] = useState<"points" | "shots" | "sudden_death">("shots");
  const [versusSemiDrawOption, setVersusSemiDrawOption] = useState<"fixed" | "redraw">("fixed");
  const [versusGroupFinalOption, setVersusGroupFinalOption] = useState<"play_final" | "by_score">("play_final");
  const [versusCupAthletes, setVersusCupAthletes] = useState<Athlete[]>([]);
  const [versusSearchQuery, setVersusSearchQuery] = useState<string>("");

  // Modals for Athlete Management inside Settings
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

  const [isAddSystemAthleteModalOpen, setIsAddSystemAthleteModalOpen] = useState(false);
  const [systemAthleteSearchTerm, setSystemAthleteSearchTerm] = useState("");
  const [sysAthCategories, setSysAthCategories] = useState<Record<string, string>>({});
  const [sysAthIsPrimary, setSysAthIsPrimary] = useState<Record<string, boolean>>({});

  // Real-time listener for versus tournament details & matches
  useEffect(() => {
    if (!isVersusTournament || !activeHistoryId) {
      setVersusTournamentDoc(null);
      setVersusMatches([]);
      return;
    }

    const unsubDoc = onSnapshot(doc(db, "versus_tournaments", activeHistoryId), (docSnap) => {
      if (docSnap.exists()) {
        setVersusTournamentDoc({ id: docSnap.id, ...docSnap.data() } as VersusTournament);
      }
    });

    const qMatches = query(
      collection(db, "versus_matches"),
      where("versusTournamentId", "==", activeHistoryId)
    );
    const unsubMatches = onSnapshot(qMatches, (snapshot) => {
      const list: VersusMatch[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as VersusMatch);
      });
      setVersusMatches(list);
    });

    return () => {
      unsubDoc();
      unsubMatches();
    };
  }, [isVersusTournament, activeHistoryId]);

  // Populates local versus config states once versusTournamentDoc is received
  useEffect(() => {
    if (versusTournamentDoc) {
      setVersusNumGroups(versusTournamentDoc.numGroups || 4);
      setVersusQualifiers(versusTournamentDoc.qualifiersPerGroup || 2);
      setVersusGroupStageFormat(versusTournamentDoc.groupStageFormat || "round_robin");
      setVersusGroupShotsCount(versusTournamentDoc.groupShotsCount || 10);
      setVersusKnockoutShotsCount(versusTournamentDoc.knockoutShotsCount || 15);
      setVersusKnockoutFormat(versusTournamentDoc.knockoutFormat || "shots");
      setVersusSemiDrawOption(versusTournamentDoc.semiDrawOption || "fixed");
      setVersusGroupFinalOption(versusTournamentDoc.groupFinalOption || "play_final");
      setVersusCupAthletes(versusTournamentDoc.athletes || []);
    }
  }, [versusTournamentDoc]);

  // Check if cup configurations and roster can be edited
  const hasKnockoutStarted = versusTournamentDoc?.status === "knockout" || versusTournamentDoc?.status === "completed";
  const hasAnyScores = versusMatches.some(m => m.playerA?.score !== null || m.playerB?.score !== null || m.status === "completed") || (versusTournamentDoc?.athleteScores && Object.keys(versusTournamentDoc.athleteScores).length > 0);
  const isCupEditable = !hasKnockoutStarted && !hasAnyScores;

  // Sync basic state values on initial load or change safely and instantly from props
  useEffect(() => {
    if (isVersusTournament) {
      setVersusName(currentTournamentDoc?.matchName || matchName || "");
      setVersusStartDate(currentTournamentDoc?.startDate || startDate || "");
      setVersusEndDate(currentTournamentDoc?.endDate || endDate || "");
      setVersusLocation(currentTournamentDoc?.location || location || "");
      setVersusRules(currentTournamentDoc?.rules || "");
      setVersusAvatar(currentTournamentDoc?.avatarUrl || avatarUrl || "");
      setVersusBanner(currentTournamentDoc?.bannerUrl || bannerUrl || "");
    }
  }, [isVersusTournament, activeHistoryId, currentTournamentDoc, matchName, startDate, endDate, location, avatarUrl, bannerUrl]);

  // Handlers for adding/removing athletes in Roster Management
  const handleAddVscToCup = (ath: Athlete, selectedCategory?: string, selectedIsPrimary?: boolean) => {
    const exists = versusCupAthletes.some(a => a.id.trim().toLowerCase() === ath.id.trim().toLowerCase());
    if (exists) {
      alert(language === "en" ? `Athlete "${ath.name}" is already in the roster!` : `Vận động viên "${ath.name}" đã có sẵn trong danh sách của cúp rồi!`);
      return;
    }
    const copied: Athlete = {
      ...ath,
      category: selectedCategory || "Nghiệp dư",
      isPrimary: selectedIsPrimary || false
    };
    setVersusCupAthletes(prev => [...prev, copied]);
  };

  const handleAddManualAthlete = () => {
    if (!manualFormId.trim() || !manualFormName.trim()) {
      setManualFormValidationErr(language === "en" ? "ID and Name are required." : "Mã số và Họ tên không được để trống.");
      return;
    }

    const trimmedId = manualFormId.trim();
    const matchedRoster = versusCupAthletes.find(
      (a) => a.id.trim().toLowerCase() === trimmedId.toLowerCase()
    );
    if (matchedRoster) {
      setManualFormValidationErr(
        language === "en"
          ? `DUPLICATE CUP ID: Athlete ID "${trimmedId}" already exists in this cup (Athlete: "${matchedRoster.name}").`
          : `⚠️ TRÙNG MÃ VĐV TRONG CÚP: Mã số VĐV (ID) "${trimmedId}" đã tồn tại trong danh sách cúp này (VĐV: "${matchedRoster.name}"). Vui lòng kiểm tra lại hoặc đổi Mã số VĐV khác.`
      );
      return;
    }

    const matchedSys = vscSystemAthletes.find(
      (a) => a.id.trim().toLowerCase() === trimmedId.toLowerCase()
    );
    if (matchedSys && !manualFormDuplicateSysMatch) {
      setManualFormValidationErr(
        language === "en"
          ? `⚠️ DUPLICATE SYSTEM ID: Athlete ID "${trimmedId}" belongs to system athlete "${matchedSys.name}".`
          : `⚠️ TRÙNG MÃ VĐV HỆ THỐNG: Mã số VĐV (ID) "${trimmedId}" đã thuộc về VĐV "${matchedSys.name}" (${matchedSys.team || "Chưa có CLB"}) trên Hệ thống VSC. Bạn không cần tạo mới VĐV này! Vui lòng chọn "Thêm ngay VĐV này vào cúp" bên dưới, hoặc đổi Mã số VĐV (ID) khác để tiếp tục đăng ký.`
      );
      setManualFormDuplicateSysMatch(matchedSys);
      return;
    }

    const newAth: Athlete = {
      id: trimmedId,
      name: manualFormName.trim(),
      team: manualFormTeam.trim() || (language === "en" ? "Independent" : "Tự do"),
      gender: manualFormGender === "Nữ" ? "female" : "male",
      email: manualFormEmail.trim(),
      idCard: manualFormIdCard.trim(),
      dob: manualFormDob,
      hometown: manualFormHometown.trim(),
      province: manualFormProvince.trim(),
      country: manualFormCountry.trim(),
      countryCode: manualFormCountryCode.trim(),
      category: manualFormCategory,
      status: manualFormStatus,
      isPrimary: manualFormIsPrimary,
      avatarUrl: manualFormAvatarUrl,
      scores: {}
    };

    setVersusCupAthletes((prev) => [...prev, newAth]);
    setIsAddManualModalOpen(false);
  };

  const handleSaveVersusSettings = async () => {
    if (!activeHistoryId) return;
    if (!versusName.trim()) {
      alert(language === "en" ? "Tournament name cannot be empty." : "Vui lòng nhập tên giải đấu.");
      return;
    }

    setIsSavingVersus(true);
    try {
      if (isCupEditable) {
        if (versusCupAthletes.length < versusNumGroups * 2) {
          alert(language === "en"
            ? `Each group needs at least 2 athletes. Minimum required for ${versusNumGroups} groups is ${versusNumGroups * 2} athletes (Currently have ${versusCupAthletes.length}).`
            : `Mỗi bảng đấu cần tối thiểu 2 tuyển thủ. Với cấu hình ${versusNumGroups} bảng, bạn cần ít nhất ${versusNumGroups * 2} vận động viên (Hiện tại mới có ${versusCupAthletes.length} VĐV).`);
          setIsSavingVersus(false);
          return;
        }

        // Distribute randomly into groups
        const shuffled = [...versusCupAthletes].sort(() => Math.random() - 0.5);
        const groups: Record<string, string[]> = {};
        for (let i = 0; i < versusNumGroups; i++) {
          const groupLetter = String.fromCharCode(65 + i);
          groups[`Bảng ${groupLetter}`] = [];
        }
        shuffled.forEach((ath, idx) => {
          const groupIndex = idx % versusNumGroups;
          const groupLetter = String.fromCharCode(65 + groupIndex);
          groups[`Bảng ${groupLetter}`].push(ath.id);
        });

        // Delete all old matches
        const oldMatchesQ = query(collection(db, "versus_matches"), where("versusTournamentId", "==", activeHistoryId));
        const oldMatchesSnap = await getDocs(oldMatchesQ);
        const deletePromises = oldMatchesSnap.docs.map(d => deleteDoc(d.ref));
        await Promise.all(deletePromises);

        // Generate new group stage matches
        const batchPromises: Promise<any>[] = [];
        if (versusGroupStageFormat === "round_robin") {
          let matchIdx = 0;
          Object.entries(groups).forEach(([groupName, athIds]) => {
            for (let i = 0; i < athIds.length; i++) {
              for (let j = i + 1; j < athIds.length; j++) {
                const pA = versusCupAthletes.find(a => a.id === athIds[i])!;
                const pB = versusCupAthletes.find(a => a.id === athIds[j])!;

                const matchDocRef = doc(collection(db, "versus_matches"));
                const matchData: VersusMatch & { versusTournamentId: string } = {
                  id: matchDocRef.id,
                  versusTournamentId: activeHistoryId,
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
        } else if (versusGroupStageFormat === "mini_pk") {
          let matchIdx = 0;
          Object.entries(groups).forEach(([groupName, athIds]) => {
            const { matches: groupMatches, nextIdx } = generateGroupKnockoutMatches(
              groupName,
              athIds,
              versusCupAthletes,
              matchIdx,
              versusGroupStageFormat === "mini_pk" ? versusGroupFinalOption : "play_final"
            );
            matchIdx = nextIdx;

            groupMatches.forEach((match) => {
              const matchDocRef = doc(db, "versus_matches", match.id);
              const matchData = {
                ...match,
                versusTournamentId: activeHistoryId
              };
              batchPromises.push(setDoc(matchDocRef, matchData));
            });
          });
          await Promise.all(batchPromises);
        }

        // Update versus_tournaments doc
        const versusRef = doc(db, "versus_tournaments", activeHistoryId);
        await updateDoc(versusRef, {
          name: versusName,
          startDate: versusStartDate,
          endDate: versusEndDate,
          location: versusLocation,
          rules: versusRules,
          avatarUrl: versusAvatar,
          bannerUrl: versusBanner,
          numGroups: versusNumGroups,
          qualifiersPerGroup: versusQualifiers,
          groupStageFormat: versusGroupStageFormat,
          groupShotsCount: versusGroupShotsCount,
          knockoutShotsCount: versusKnockoutShotsCount,
          knockoutFormat: versusKnockoutFormat,
          semiDrawOption: versusSemiDrawOption,
          groupFinalOption: versusGroupStageFormat === "mini_pk" ? versusGroupFinalOption : "play_final",
          athletes: versusCupAthletes,
          groups,
          athleteScores: {},
          semiDrawCompleted: false,
          status: "group_stage"
        });

        // Sync with top-level parent and master collections
        await updateOnlineTournament(activeHistoryId, {
          matchName: versusName,
          startDate: versusStartDate,
          endDate: versusEndDate,
          location: versusLocation,
          rules: versusRules,
          avatarUrl: versusAvatar,
          bannerUrl: versusBanner,
          athletes: versusCupAthletes,
          masterAthletes: versusCupAthletes
        });

        await Promise.all([
          setDoc(doc(db, "vsc_tournament_athletes", activeHistoryId), { list: versusCupAthletes }),
          setDoc(doc(db, "vsc_tournament_input_athletes", activeHistoryId), { list: versusCupAthletes }),
          setDoc(doc(db, "vsc_tournament_master_athletes", activeHistoryId), { list: versusCupAthletes }),
        ]);

        setAthletes(versusCupAthletes);
        setMasterAthletes(versusCupAthletes);
      } else {
        // If not editable, only save basic info
        await updateOnlineTournament(activeHistoryId, {
          matchName: versusName,
          startDate: versusStartDate,
          endDate: versusEndDate,
          location: versusLocation,
          rules: versusRules,
          avatarUrl: versusAvatar,
          bannerUrl: versusBanner,
        });

        const versusRef = doc(db, "versus_tournaments", activeHistoryId);
        await updateDoc(versusRef, {
          name: versusName,
          startDate: versusStartDate,
          endDate: versusEndDate,
          location: versusLocation,
          rules: versusRules,
          avatarUrl: versusAvatar,
          bannerUrl: versusBanner,
        });
      }

      setMatchName(versusName);
      setStartDate(versusStartDate);
      setEndDate(versusEndDate);
      setLocation(versusLocation);
      setAvatarUrl(versusAvatar);
      setBannerUrl(versusBanner);

      alert(language === "en" ? "Versus settings saved successfully!" : "Đã cập nhật cấu hình giải đấu Cúp thành công! 🏆");
    } catch (err) {
      console.error("Failed to save versus settings:", err);
      alert(language === "en" ? "Failed to save settings." : "Lỗi khi lưu cấu hình giải đấu.");
    } finally {
      setIsSavingVersus(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fadeIn" id="settings-tab-container">
      {/* Sub-tabs navigation bar inside Settings */}
      <div className="flex border-b border-gray-250 dark:border-slate-800 gap-4" id="settings-sub-tabs">
        <button
          type="button"
          onClick={() => setSettingsSubTab("config")}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            settingsSubTab === "config"
              ? "border-blue-600 text-blue-600 dark:text-blue-400 font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300"
          }`}
          id="subtab-config-btn"
        >
          <Settings className="w-4 h-4" />
          {isVersusTournament 
            ? (language === "en" ? "Match Play Cup Configuration" : "Cấu Hình Giải Đấu Cúp")
            : (language === "en" ? "Tournament Parameters" : "Cấu Hình Tham Số Giải")}
        </button>
        {!isVersusTournament && (
          <button
            type="button"
            onClick={() => setSettingsSubTab("athletes")}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              settingsSubTab === "athletes"
                ? "border-blue-600 text-blue-600 dark:text-blue-400 font-extrabold"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300"
            }`}
            id="subtab-athletes-btn"
          >
            <Users className="w-4 h-4" />
            {language === "en" ? "Manage Tournament Athletes" : "Quản Lý VĐV Giải"}
          </button>
        )}
      </div>

      {settingsSubTab === "config" ? (
        isVersusTournament ? (
          /* Render Versus Tournament Settings Form */
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
            <div className="border-b border-slate-100 dark:border-slate-850 pb-4 mb-6">
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <Trophy className="w-5 h-5 text-rose-500 animate-pulse" />
                {language === "en" ? "Match Play Cup Settings" : "Cài Đặt Giải Đấu Đối Kháng Cúp VSC 🏆"}
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                {language === "en" 
                  ? "Update name, dates, location, rules, and promotional logo & banner of this cup." 
                  : "Chỉnh sửa thông tin, ngày thi đấu, địa điểm, thể thức và thay đổi ảnh đại diện, ảnh bìa cho giải đấu Cúp."}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form Config Left */}
              <div className="lg:col-span-2 flex flex-col gap-5 pr-0 lg:pr-6 border-r border-slate-100 dark:border-slate-850">
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    {language === "en" ? "Cup Tournament Name" : "Tên Giải Đấu Cúp"}
                  </label>
                  <input
                    type="text"
                    value={versusName}
                    onChange={(e) => setVersusName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 font-bold dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      {language === "en" ? "Start Date" : "Ngày Thi Đấu"}
                    </label>
                    <input
                      type="date"
                      value={versusStartDate}
                      onChange={(e) => setVersusStartDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 font-bold dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      {language === "en" ? "End Date" : "Ngày Kết Thúc"}
                    </label>
                    <input
                      type="date"
                      value={versusEndDate}
                      onChange={(e) => setVersusEndDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 font-bold dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {language === "en" ? "Tournament Location" : "Địa Điểm Thi Đấu"}
                  </label>
                  <input
                    type="text"
                    value={versusLocation}
                    onChange={(e) => setVersusLocation(e.target.value)}
                    placeholder={language === "en" ? "e.g. VSC Shooting Range, Da Nang" : "Ví dụ: Sân bắn VSC, Đà Nẵng"}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 font-bold dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <AlignLeft className="w-3.5 h-3.5 text-slate-400" />
                    {language === "en" ? "Description & Rules" : "Diễn giải / Luật bắn Đối Kháng"}
                  </label>
                  <textarea
                    value={versusRules}
                    onChange={(e) => setVersusRules(e.target.value)}
                    rows={4}
                    placeholder={language === "en" ? "Enter specific rules, targets or distances..." : "Nhập thể thức bốc thăm, số phát bắn, quy định phân thắng bại..."}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 font-bold dark:text-white leading-relaxed"
                  />
                </div>

                {/* Editable/Read-only tournament parameters */}
                <div className="bg-slate-50 dark:bg-slate-950/20 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800 flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800 pb-2">
                    <h3 className="text-xs font-black uppercase text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                      <Settings className="w-4 h-4" />
                      <span>{language === "en" ? "Cup Format & Bracket Settings" : "Thể Thức & Cấu Hình Nhánh Đấu"}</span>
                    </h3>
                    {!isCupEditable && (
                      <span className="text-[10px] bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400 font-extrabold px-2 py-1 rounded-lg flex items-center gap-1 animate-pulse">
                        <Lock className="w-3 h-3" />
                        <span>{language === "en" ? "Locked (Started)" : "Đã Khóa (Đang Đấu)"}</span>
                      </span>
                    )}
                  </div>

                  {!isCupEditable && (
                    <p className="text-[10.5px] text-amber-600 dark:text-amber-450 italic leading-snug">
                      {language === "en"
                        ? "⚠️ Roster, group distribution and tournament structures are locked because scores are registered or knockout stages have generated."
                        : "⚠️ Do giải đấu cúp đã ghi nhận điểm thi đấu hoặc đã tiến hành bốc thăm phân nhánh Knockout, các cấu hình thể thức, số bảng đấu và danh sách VĐV đã được khóa để đảm bảo tính toàn vẹn dữ liệu."}
                    </p>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                        {language === "en" ? "Num Groups" : "Số Bảng"}
                      </label>
                      <div className="relative">
                        <select
                          disabled={!isCupEditable}
                          value={versusNumGroups}
                          onChange={(e) => setVersusNumGroups(parseInt(e.target.value))}
                          className="w-full px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 appearance-none focus:outline-none disabled:opacity-75"
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
                          disabled={!isCupEditable}
                          value={versusQualifiers}
                          onChange={(e) => setVersusQualifiers(parseInt(e.target.value))}
                          className="w-full px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 appearance-none focus:outline-none disabled:opacity-75"
                        >
                          {[1, 2, 3, 4, 8].map((num) => (
                            <option key={num} value={num}>{num} {language === "en" ? "Athletes" : "VĐV"}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                        {language === "en" ? "Size / Group" : "Số VĐV / Bảng"}
                      </label>
                      <div className="relative">
                        <span className="w-full block px-3 py-2 text-xs font-bold text-slate-500 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                          ~ {versusNumGroups > 0 ? Math.ceil(versusCupAthletes.length / versusNumGroups) : 0} {language === "en" ? "Athletes" : "Tuyển thủ"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      {language === "en" ? "Group Format" : "Thể thức Vòng Bảng"}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["round_robin", "mini_pk", "score_shootout"] as const).map((fmt) => (
                        <button
                          key={fmt}
                          type="button"
                          disabled={!isCupEditable}
                          onClick={() => setVersusGroupStageFormat(fmt)}
                          className={`px-3 py-2.5 text-[10px] font-black rounded-xl border transition-all cursor-pointer disabled:opacity-75 ${
                            versusGroupStageFormat === fmt
                              ? "bg-rose-50 dark:bg-rose-950/20 border-rose-350 text-rose-600"
                              : "bg-white dark:bg-slate-900 border-slate-200 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {fmt === "round_robin" && (language === "en" ? "Round Robin" : "Đấu Vòng Tròn")}
                          {fmt === "mini_pk" && (language === "en" ? "Mini PK" : "Đấu Mini PK")}
                          {fmt === "score_shootout" && (language === "en" ? "Score shootout" : "Bắn điểm bảng")}
                        </button>
                      ))}
                    </div>
                  </div>

                  {versusGroupStageFormat === "mini_pk" && (
                    <div className="bg-amber-50/40 dark:bg-slate-850 p-3.5 rounded-2xl border border-amber-100 dark:border-slate-800 animate-fadeIn">
                      <label className="block text-[10px] font-black text-amber-800 dark:text-amber-400 uppercase tracking-wider mb-2">
                        {language === "en" ? "Group Standing Tiebreaker Option" : "Quy cách xếp hạng đấu Mini PK"}
                      </label>
                      <div className="flex flex-col gap-2">
                        <label className="flex items-start gap-2.5 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                          <input
                            type="radio"
                            name="versusGroupFinalOption"
                            disabled={!isCupEditable}
                            value="play_final"
                            checked={versusGroupFinalOption === "play_final"}
                            onChange={() => setVersusGroupFinalOption("play_final")}
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
                            name="versusGroupFinalOption"
                            disabled={!isCupEditable}
                            value="by_score"
                            checked={versusGroupFinalOption === "by_score"}
                            onChange={() => setVersusGroupFinalOption("by_score")}
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

                  <div className="grid grid-cols-2 gap-3.5 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-150 dark:border-slate-800">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[9px] font-black text-slate-550 uppercase">Vòng Bảng: Lượt</label>
                        <span className="text-[10px] font-mono font-black text-rose-600">{versusGroupShotsCount} viên</span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="30"
                        step="5"
                        disabled={!isCupEditable}
                        value={versusGroupShotsCount}
                        onChange={(e) => setVersusGroupShotsCount(parseInt(e.target.value))}
                        className="w-full accent-rose-600 cursor-pointer h-1 bg-gray-200 dark:bg-slate-850 disabled:opacity-50"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[9px] font-black text-slate-550 uppercase">Knockout: Lượt</label>
                        <span className="text-[10px] font-mono font-black text-indigo-600">{versusKnockoutShotsCount} viên</span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="30"
                        step="5"
                        disabled={!isCupEditable}
                        value={versusKnockoutShotsCount}
                        onChange={(e) => setVersusKnockoutShotsCount(parseInt(e.target.value))}
                        className="w-full accent-indigo-600 cursor-pointer h-1 bg-gray-200 dark:bg-slate-850 disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      {language === "en" ? "Knockout Rules Format" : "Cơ Chế Phân Định Thắng Thua Knockout"}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["shots", "points", "sudden_death"] as const).map((fmt) => (
                        <button
                          key={fmt}
                          type="button"
                          disabled={!isCupEditable}
                          onClick={() => setVersusKnockoutFormat(fmt)}
                          className={`px-3 py-2.5 text-[10px] font-black rounded-xl border transition-all cursor-pointer disabled:opacity-75 ${
                            versusKnockoutFormat === fmt
                              ? "bg-indigo-50 dark:bg-indigo-950/20 border-indigo-350 text-indigo-600"
                              : "bg-white dark:bg-slate-900 border-slate-200 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {fmt === "shots" && (language === "en" ? "Shots Diff" : "So tổng điểm lượt")}
                          {fmt === "points" && (language === "en" ? "Match points" : "Đấu Hiệp (Set)")}
                          {fmt === "sudden_death" && (language === "en" ? "Sudden death" : "Nhanh Chậm (Sudden)")}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-150 dark:border-slate-800">
                    <label className="block text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      {language === "en" ? "Semi-finals Bracket Draw Rules" : "Cấu hình ghép cặp Vòng Bán Kết"}
                    </label>
                    <div className="flex flex-col gap-2">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                        <input
                          type="radio"
                          name="versusSemiDrawOption"
                          disabled={!isCupEditable}
                          value="fixed"
                          checked={versusSemiDrawOption === "fixed"}
                          onChange={() => setVersusSemiDrawOption("fixed")}
                          className="accent-rose-600"
                        />
                        <span>{language === "en" ? "Fixed bracket path (Winners meet)" : "Mặc định (Nhất cùng nhánh gặp nhau)"}</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300 mt-1">
                        <input
                          type="radio"
                          name="versusSemiDrawOption"
                          disabled={!isCupEditable}
                          value="redraw"
                          checked={versusSemiDrawOption === "redraw"}
                          onChange={() => setVersusSemiDrawOption("redraw")}
                          className="accent-rose-600"
                        />
                        <span>{language === "en" ? "Redraw MINI PK at Semi-finals" : "Bốc thăm MINI PK lại ngay tại Bán Kết ⚔️"}</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Config Right (Images) */}
              <div className="lg:col-span-1 flex flex-col gap-6 justify-start">
                {/* Logo Upload */}
                <div className="bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-850 rounded-2xl p-4 flex flex-col gap-3">
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    {language === "en" ? "Cup Logo / Avatar" : "Logo / Avatar Giải Đấu Cúp"}
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="relative w-16 h-16 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                      {versusAvatar ? (
                        <img src={versusAvatar} alt="Cup Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <Trophy className="w-7 h-7 text-slate-400 animate-pulse" />
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="cursor-pointer inline-flex items-center justify-center gap-1.5 text-xs text-white hover:bg-rose-700 font-bold bg-rose-600 px-3.5 py-2 rounded-xl transition-all shadow-sm active:scale-95">
                        <span>{isCompressingAvatar ? (language === "en" ? "Processing..." : "Đang nén...") : (language === "en" ? "Upload Logo" : "Tải Logo Lên")}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={isCompressingAvatar}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setIsCompressingAvatar(true);
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                if (typeof reader.result === "string") {
                                  compressImage(reader.result, 180, 180).then((compressed) => {
                                    setVersusAvatar(compressed);
                                    setIsCompressingAvatar(false);
                                  }).catch(() => setIsCompressingAvatar(false));
                                } else {
                                  setIsCompressingAvatar(false);
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      {versusAvatar && (
                        <button
                          type="button"
                          onClick={() => setVersusAvatar("")}
                          className="text-[11px] text-red-600 hover:text-red-700 hover:underline font-bold text-left pl-1 border-none bg-transparent cursor-pointer"
                        >
                          {language === "en" ? "Remove avatar" : "Xóa ảnh đại diện"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Banner Upload */}
                <div className="bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-850 rounded-2xl p-4 flex flex-col gap-3">
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    {language === "en" ? "Cup Banner" : "Banner Giải Đấu Cúp"}
                  </label>
                  <div className="flex flex-col gap-4">
                    <div className="relative w-full h-28 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden shadow-inner">
                      {versusBanner ? (
                        <img src={versusBanner} alt="Cup Banner" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-slate-400 animate-pulse" />
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="cursor-pointer inline-flex items-center justify-center gap-1.5 text-xs text-white hover:bg-rose-700 font-bold bg-rose-600 px-3.5 py-2 rounded-xl transition-all shadow-sm active:scale-95">
                        <span>{isCompressingBanner ? (language === "en" ? "Processing..." : "Đang nén...") : (language === "en" ? "Upload Banner" : "Tải Banner Lên")}</span>
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
                                    setVersusBanner(compressed);
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
                      {versusBanner && (
                        <button
                          type="button"
                          onClick={() => setVersusBanner("")}
                          className="text-[11px] text-red-600 hover:text-red-700 hover:underline font-bold border-none bg-transparent cursor-pointer"
                        >
                          {language === "en" ? "Remove banner" : "Xóa ảnh bìa"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cup Roster Management Block */}
            <div className="border-t border-slate-150 dark:border-slate-800 pt-6 mt-6 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-5 h-5 text-indigo-600" />
                    <span>{language === "en" ? "Cup Athlete Roster" : "Danh Sách VĐV Tham Gia Cúp"} ({versusCupAthletes.length})</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {isCupEditable
                      ? (language === "en" ? "Add shooters manually or search official VSC profiles. Saving will redraw the groups!" : "Thêm mới VĐV hoặc bổ sung tuyển thủ từ danh sách hệ thống VSC. Khi lưu cài đặt, hệ thống sẽ tự động bốc thăm chia lại các bảng đấu và trận đấu!")
                      : (language === "en" ? "Cup roster is locked because matches have started." : "Danh sách VĐV của cúp đã được khóa vì giải đấu đã chính thức khởi tranh và có điểm số.")}
                  </p>
                </div>

                {isCupEditable && (
                  <div className="flex gap-2 w-full sm:w-auto shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsAddSystemAthleteModalOpen(true)}
                      className="flex-1 sm:flex-none px-3.5 py-2 text-xs font-black text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-900/40 rounded-xl cursor-pointer border-none transition-colors flex items-center justify-center gap-1.5"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>{language === "en" ? "VSC Database" : "VĐV Hệ Thống"}</span>
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
                      className="flex-1 sm:flex-none px-3.5 py-2 text-xs font-black text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-900/30 rounded-xl cursor-pointer border-none transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{language === "en" ? "Create New" : "Tạo Mới VĐV"}</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={versusSearchQuery}
                  onChange={(e) => setVersusSearchQuery(e.target.value)}
                  placeholder={language === "en" ? "Search roster athletes..." : "Tìm nhanh tuyển thủ trong danh sách..."}
                  className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 font-bold text-slate-800 dark:text-white"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </div>

              <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-inner max-h-[360px] overflow-y-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black text-slate-550 uppercase tracking-widest text-center">
                      <th className="py-2.5 px-4 w-12">#</th>
                      <th className="py-2.5 px-2 text-left font-black">Tuyển Thủ</th>
                      <th className="py-2.5 px-2 text-left font-black">Đội Nhóm (Club)</th>
                      <th className="py-2.5 px-2 w-16 font-black">Giới</th>
                      {isCupEditable && <th className="py-2.5 px-4 w-16 font-black">Xóa</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(() => {
                      const qStr = versusSearchQuery.toLowerCase().trim();
                      const filteredList = versusCupAthletes.filter(ath =>
                        ath.name.toLowerCase().includes(qStr) ||
                        ath.id.toLowerCase().includes(qStr) ||
                        (ath.team && ath.team.toLowerCase().includes(qStr))
                      );

                      if (filteredList.length === 0) {
                        return (
                          <tr>
                            <td colSpan={isCupEditable ? 5 : 4} className="py-8 text-center text-slate-400 italic text-xs">
                              {language === "en" ? "No athletes found in cup roster" : "Không tìm thấy vận động viên nào trong danh sách cúp"}
                            </td>
                          </tr>
                        );
                      }

                      return filteredList.map((ath, idx) => (
                        <tr key={ath.id} className="text-xs hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                          <td className="py-2.5 px-4 text-center font-bold font-mono text-slate-450">{idx + 1}</td>
                          <td className="py-2.5 px-2 text-left font-black text-slate-800 dark:text-slate-100">
                            <div className="flex items-center gap-2">
                              <span>{ath.name}</span>
                              <span className="text-[9px] font-mono font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100/35 px-1.5 py-0.5 rounded-md">
                                {ath.id}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-left font-bold text-slate-500 dark:text-slate-400">{ath.team || "---"}</td>
                          <td className="py-2.5 px-2 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                              ath.gender === "female" ? "bg-rose-50 text-rose-500" : "bg-blue-50 text-blue-500"
                            }`}>
                              {ath.gender === "female" ? (language === "en" ? "F" : "Nữ") : (language === "en" ? "M" : "Nam")}
                            </span>
                          </td>
                          {isCupEditable && (
                            <td className="py-2.5 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setVersusCupAthletes(prev => prev.filter(a => a.id !== ath.id));
                                }}
                                className="p-1 text-slate-400 hover:text-rose-600 bg-transparent rounded-lg border-none cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Save Button */}
            <div className="border-t border-slate-100 dark:border-slate-850 pt-5 mt-6 flex justify-end">
              <button
                type="button"
                onClick={handleSaveVersusSettings}
                disabled={isSavingVersus || isCompressingAvatar || isCompressingBanner}
                className="px-6 py-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer border-none uppercase tracking-widest active:scale-95"
              >
                {isSavingVersus ? (
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {language === "en" ? "Save Cup Settings" : "Lưu Cài Đặt Giải Cúp"}
              </button>
            </div>

            {/* Manual Athlete creation Modal Portal */}
            {isAddManualModalOpen && typeof document !== "undefined" && createPortal(
              <div 
                className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] animate-fadeIn text-slate-800 dark:text-slate-150"
                onClick={() => setIsAddManualModalOpen(false)}
              >
                <div 
                  className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 animate-scaleUp flex flex-col max-h-[90vh] overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div className="p-4 sm:p-5 border-b border-slate-150 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/40 shrink-0">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-xl">
                        <PlusCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white uppercase tracking-wide">
                          {language === "en" ? "Add New Athlete Profile" : "Tạo Mới Hồ Sơ VĐV"}
                        </h3>
                        <p className="text-[10.5px] text-slate-400 dark:text-slate-500 mt-0.5">
                          {language === "en" ? "Create a temporary or new shooter profile for this cup" : "Đăng ký tuyển thủ mới trực tiếp vào danh sách thi đấu cúp"}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setIsAddManualModalOpen(false)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors border-none bg-transparent"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Form Container */}
                  <form onSubmit={(e) => { e.preventDefault(); handleAddManualAthlete(); }} className="overflow-y-auto p-5 space-y-4 flex-1 text-left text-xs">
                    {manualFormValidationErr && (
                      <div className="p-3 bg-rose-50 dark:bg-rose-950/25 border border-rose-150 dark:border-rose-900 rounded-xl flex items-start gap-2 text-rose-600 dark:text-rose-400">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span className="font-bold leading-relaxed">{manualFormValidationErr}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 mb-1.5">
                          {language === "en" ? "Athlete ID (Unique)" : "Mã Số VĐV (Mã Định Danh)"} <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={manualFormId}
                          onChange={(e) => setManualFormId(e.target.value.toUpperCase().replace(/\s+/g, ""))}
                          placeholder="e.g. VSC-99"
                          required
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 font-bold dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 mb-1.5">
                          {language === "en" ? "Full Name" : "Họ Và Tên"} <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={manualFormName}
                          onChange={(e) => setManualFormName(e.target.value)}
                          placeholder="e.g. Nguyễn Văn A"
                          required
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 font-bold dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 mb-1.5">
                          {language === "en" ? "Club / Team" : "Đơn vị / CLB"}
                        </label>
                        <input
                          type="text"
                          value={manualFormTeam}
                          onChange={(e) => setManualFormTeam(e.target.value)}
                          placeholder="e.g. CLB Sài Gòn"
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 font-bold dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 mb-1.5">
                          {language === "en" ? "Gender" : "Giới Tính"}
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {["Nam", "Nữ"].map((g) => (
                            <button
                              key={g}
                              type="button"
                              onClick={() => setManualFormGender(g)}
                              className={`py-2 text-xs font-black rounded-xl border transition-all cursor-pointer ${
                                manualFormGender === g
                                  ? "bg-rose-50 dark:bg-rose-950/20 border-rose-450 text-rose-600"
                                  : "bg-slate-50 dark:bg-slate-800 border-slate-300 text-slate-600"
                              }`}
                            >
                              {g}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {manualFormDuplicateSysMatch && (
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl flex flex-col gap-2">
                        <p className="text-[11px] text-amber-800 dark:text-amber-400 font-bold leading-normal">
                          {language === "en" 
                            ? "VSC profile detected! Would you like to directly add this existing profile into the cup?" 
                            : "💡 ĐÃ TÌM THẤY VĐV: Trên Hệ thống VSC đã có hồ sơ của tuyển thủ này. Bạn có muốn tự động lấy thông tin chính thức để thêm vào danh sách cúp không?"}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            handleAddVscToCup(manualFormDuplicateSysMatch);
                            setIsAddManualModalOpen(false);
                          }}
                          className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-xl border-none cursor-pointer text-xs"
                        >
                          {language === "en" ? "Yes, add this profile" : "Có, Thêm Ngay Tuyển Thủ Này Vào Cúp"}
                        </button>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setIsAddManualModalOpen(false)}
                        className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-black rounded-xl cursor-pointer border-none"
                      >
                        {language === "en" ? "Cancel" : "Hủy bỏ"}
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl cursor-pointer border-none"
                      >
                        {language === "en" ? "Register Athlete" : "Đăng ký vận động viên"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>,
              document.body
            )}

            {/* System Athlete selection Modal Portal */}
            {isAddSystemAthleteModalOpen && typeof document !== "undefined" && createPortal(
              <div 
                className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] animate-fadeIn text-slate-800 dark:text-slate-100"
                onClick={() => setIsAddSystemAthleteModalOpen(false)}
              >
                <div 
                  className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 animate-scaleUp flex flex-col max-h-[85vh] overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div className="p-4 sm:p-5 border-b border-slate-150 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/40 shrink-0">
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

                  {/* Filter Search */}
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

                  {/* Scrollable list */}
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
                        const isAdded = versusCupAthletes.some(a => a.id.trim().toLowerCase() === ath.id.trim().toLowerCase());
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
                                  <span className="text-[10px] text-indigo-500 font-extrabold bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded-lg border border-indigo-100/35">
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
                                  <div className="flex flex-col gap-0.5 min-w-[120px] text-left text-xs">
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

                  {/* Footer */}
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
          </div>
        ) : (
          <SettingsPanel
            currentTournamentDoc={currentTournamentDoc}
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
            onSaveCurrentSessionToHistory={handleSaveCurrentSessionToHistory}
            onResetSession={handleResetSession}
            onImportBackup={handleImportSingleBackup}
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
            location={location}
            setLocation={setLocation}
            setClubs={setClubs}
            
            // Team modes
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
            referees={currentTournamentDoc?.referees || []}
            onUpdateReferees={(rList) => {
              if (activeHistoryId && activeHistoryId.startsWith("tour-")) {
                updateOnlineTournament(activeHistoryId, { referees: rList })
                  .catch(err => console.error("Cloud referee update failed:", err));
              }
            }}
            subAdmins={currentTournamentDoc?.subAdmins || []}
            onUpdateSubAdmins={(subList) => {
              if (activeHistoryId && activeHistoryId.startsWith("tour-")) {
                updateOnlineTournament(activeHistoryId, { subAdmins: subList })
                  .catch(err => console.error("Cloud subAdmin update failed:", err));
              }
            }}
            isNewTournamentModalOpen={isNewTournamentModalOpen}
            setIsNewTournamentModalOpen={setIsNewTournamentModalOpen}
            tournamentType={tournamentType}
            setTournamentType={setTournamentType}
            laneCapacity={laneCapacity}
            setLaneCapacity={setLaneCapacity}
            setActiveTab={setActiveTab}
            onExitTournament={handleExitTournament}
            userRole={userRole}
            auditLog={currentTournamentDoc?.auditLog || ""}
            onAddAuditLog={handleAddAuditLog}
          />
        )
      ) : (
        <AthleteManagement
          athletes={masterAthletes}
          setAthletes={setMasterAthletes}
          distances={currentDistances}
          shotsCount={currentShotsCount}
          storedAthleteLists={storedAthleteLists}
          setStoredAthleteLists={setStoredAthleteLists}
          currentActiveAthletes={currentAthletes}
          setCurrentActiveAthletes={competitionMode === "individual" ? setAthletes : setTeamAthletes}
          setActiveIndividualAthletes={setAthletes}
          setTeamAthletes={setTeamAthletes}
          setInputAthletes={setInputAthletes}
          setTeamInputAthletes={setTeamInputAthletes}
          matchName={matchName}
          clubs={clubs}
          setClubs={setClubs}
          currentUser={currentUser}
          forceTab={athleteForceTab}
          userRole={userRole}
          hideVscSystemTab={true}
          activeHistoryId={activeHistoryId}
          currentTournamentDoc={currentTournamentDoc}
          updateOnlineTournament={updateOnlineTournament}
        />
      )}
    </div>
  );
};
