import React, { useState, useEffect, useMemo } from "react";
import { 
  Trophy, 
  Settings, 
  Users, 
  Target, 
  ClipboardCheck, 
  TrendingUp, 
  Play, 
  Lock, 
  Unlock, 
  RefreshCw, 
  UserCheck, 
  LayoutGrid, 
  Activity, 
  Shuffle,
  Shield,
  Clock,
  CheckCircle,
  HelpCircle,
  ListOrdered,
  ChevronLeft,
  ChevronRight,
  Search,
  Megaphone,
  Zap
} from "lucide-react";
import { TournamentData, updateOnlineTournament } from "../lib/firebaseService";
import { Athlete, DistanceConfig } from "../types";
import { calculateRounds, getHitCount } from "../utils/qualification";
import { showToast } from "../utils/toast";

interface TournamentExecutionHubProps {
  currentTournamentDoc: TournamentData | null;
  activeHistoryId: string | null;
  language: "vi" | "en";
  userRole: "admin" | "referee" | "spectator";
  leaderboardAthletes?: Athlete[];
  leaderboardTeamAthletes?: Athlete[];
}

export const TournamentExecutionHub: React.FC<TournamentExecutionHubProps> = ({
  currentTournamentDoc,
  activeHistoryId,
  language,
  userRole,
  leaderboardAthletes = [],
  leaderboardTeamAthletes = []
}) => {
  const isEng = language === "en";

  // Sub-tabs inside Execution Hub
  const [subTab, setSubTab] = useState<"enforcer" | "lucky_draw" | "lane_monitor" | "sorter">("enforcer");

  // Environmental switchers for combined tournaments
  const [sorterEnv, setSorterEnv] = useState<"individual" | "team">(
    currentTournamentDoc?.tournamentType === "team" ? "team" : "individual"
  );
  const [monitorEnv, setMonitorEnv] = useState<"individual" | "team">(
    currentTournamentDoc?.tournamentType === "team" ? "team" : "individual"
  );
  const [drawEnv, setDrawEnv] = useState<"individual" | "team">(
    currentTournamentDoc?.tournamentType === "team" ? "team" : "individual"
  );

  // Local state for sorting criteria
  const [sortCriteria, setSortCriteria] = useState<"sbd" | "points_asc" | "points_desc">("sbd");

  // Selected round indices and monitor squad
  const [selectedSorterRoundIdx, setSelectedSorterRoundIdx] = useState<number>(0);
  const [selectedMonitorRoundIdx, setSelectedMonitorRoundIdx] = useState<number>(0);
  const [selectedMonitorSquad, setSelectedMonitorSquad] = useState<number>(1);

  // Helper to synchronize local monitor state changes to Firestore
  const updateMonitorConfig = async (roundIdx: number, squad: number, env: "individual" | "team") => {
    setSelectedMonitorRoundIdx(roundIdx);
    setSelectedMonitorSquad(squad);
    setMonitorEnv(env);

    if (activeHistoryId && activeHistoryId.startsWith("tour-")) {
      try {
        await updateOnlineTournament(activeHistoryId, {
          activeMonitorRoundIdx: roundIdx,
          activeMonitorSquad: squad,
          activeMonitorEnv: env
        });
      } catch (err) {
        console.error("Failed to sync monitor state to Firestore:", err);
      }
    }
  };

  // Synchronize monitor state from Firestore when changed by other devices
  useEffect(() => {
    if (currentTournamentDoc) {
      if (currentTournamentDoc.activeMonitorRoundIdx !== undefined && currentTournamentDoc.activeMonitorRoundIdx !== selectedMonitorRoundIdx) {
        setSelectedMonitorRoundIdx(currentTournamentDoc.activeMonitorRoundIdx);
      }
      if (currentTournamentDoc.activeMonitorSquad !== undefined && currentTournamentDoc.activeMonitorSquad !== selectedMonitorSquad) {
        setSelectedMonitorSquad(currentTournamentDoc.activeMonitorSquad);
      }
      if (currentTournamentDoc.activeMonitorEnv !== undefined && currentTournamentDoc.activeMonitorEnv !== monitorEnv) {
        setMonitorEnv(currentTournamentDoc.activeMonitorEnv);
      }
    }
  }, [
    currentTournamentDoc?.activeMonitorRoundIdx,
    currentTournamentDoc?.activeMonitorSquad,
    currentTournamentDoc?.activeMonitorEnv
  ]);

  // Auto-synchronize sortCriteria when round or environment changes
  useEffect(() => {
    const currentDistances = sorterEnv === "team"
      ? currentTournamentDoc?.teamDistances || []
      : currentTournamentDoc?.distances || [];
    const activeRound = currentDistances[selectedSorterRoundIdx];
    if (activeRound) {
      const criteria = currentTournamentDoc?.roundShootingOrderCriteria?.[activeRound.id] || "sbd";
      setSortCriteria(criteria as any);
    }
  }, [selectedSorterRoundIdx, sorterEnv, currentTournamentDoc?.roundShootingOrderCriteria]);

  // Local state for manual SBD input
  const [editingSbdAthleteId, setEditingSbdAthleteId] = useState<string | null>(null);
  const [manualSbdValue, setManualSbdValue] = useState<number | "">("");

  // Local state for manual SBD input for Clubs
  const [editingSbdClubName, setEditingSbdClubName] = useState<string | null>(null);
  const [manualClubSbdValue, setManualClubSbdValue] = useState<number | "">("");

  // Search & Filter state for the bottom Shooting Schedule list in Lane Telemetry
  const [scheduleSearchQuery, setScheduleSearchQuery] = useState<string>("");
  const [scheduleSquadFilter, setScheduleSquadFilter] = useState<string>("all");

  // Auto-subscribe to changes if tournament doc updates (via parent triggers)
  const isNational = currentTournamentDoc?.isNational || false;
  const isDrawingOpen = currentTournamentDoc?.isDrawingOpen || false;
  const forcedRefMode = currentTournamentDoc?.forcedRefMode || "free";
  const laneCapacity = currentTournamentDoc?.laneCapacity || 10;
  const masterAthletes = currentTournamentDoc?.masterAthletes || [];
  const drawnNumbers = currentTournamentDoc?.drawnNumbers || {};
  const teamDrawnNumbers = currentTournamentDoc?.teamDrawnNumbers || {};
  const teamLaneLayoutType = currentTournamentDoc?.teamLaneLayoutType || "sequential";

  // Memoize qualifying clubs (excluding Tự do/empty, and must contain at least one main shooter isPrimaryTeam)
  const qualifyingClubs = useMemo(() => {
    const clubMap = new Map<string, Athlete[]>();
    masterAthletes.forEach((athlete) => {
      const rawTeam = (athlete.team || "").trim();
      if (!rawTeam) return;
      const lower = rawTeam.toLowerCase();
      if (
        lower === "tự do" || 
        lower === "vdv tự do (không đội)" || 
        lower === "không đội" || 
        lower === "tự do (không đội)"
      ) return;
      
      if (!clubMap.has(rawTeam)) {
        clubMap.set(rawTeam, []);
      }
      clubMap.get(rawTeam)!.push(athlete);
    });

    const clubsList: string[] = [];
    clubMap.forEach((athletes, clubName) => {
      const hasPrimary = athletes.some((a) => a.isPrimaryTeam);
      if (hasPrimary) {
        clubsList.push(clubName);
      }
    });

    return clubsList.sort();
  }, [masterAthletes]);

  // Utility to calculate athlete's total score
  const calculateTotalScore = (athlete: Athlete, distances: DistanceConfig[]) => {
    let total = 0;
    distances.forEach((dist) => {
      const shots = athlete.scores?.[dist.id] || [];
      shots.forEach((val) => {
        if (val === true) total += 1;
      });
    });
    return total;
  };

  // Helper to calculate total team score in previous rounds
  const getClubScore = (clubName: string, roundIdx: number, roundResults: any, currentDistances: DistanceConfig[]) => {
    let total = 0;
    masterAthletes.forEach((athlete) => {
      if (athlete.team?.trim() === clubName && athlete.isPrimaryTeam) {
        if (roundIdx === 0) {
          total += calculateTotalScore(athlete, currentDistances);
        } else {
          const roundRes = roundResults[roundIdx - 1];
          if (roundRes && roundRes.scores) {
            const scoreObj = roundRes.scores[athlete.id];
            total += scoreObj ? (scoreObj.displayScoreWithSolo !== undefined ? scoreObj.displayScoreWithSolo : scoreObj.displayScore) : 0;
          }
        }
      }
    });
    return total;
  };

  // Trigger Automatic Batch Draw for Clubs (Team environment)
  const handleTeamBatchDrawRemaining = async () => {
    if (!activeHistoryId) return;
    try {
      const clubsCount = qualifyingClubs.length;
      if (clubsCount === 0) {
        showToast(isEng ? "No qualified clubs for Team competition." : "Không có CLB nào đủ điều kiện thi đấu đồng đội.");
        return;
      }

      const nextTeamDrawnNumbers = { ...teamDrawnNumbers };
      const existingNumbers = new Set(Object.values(nextTeamDrawnNumbers));
      const availableNumbers: number[] = [];
      for (let i = 1; i <= clubsCount; i++) {
        if (!existingNumbers.has(i)) {
          availableNumbers.push(i);
        }
      }

      const shuffled = [...availableNumbers].sort(() => Math.random() - 0.5);
      let drawnCount = 0;
      const nextTeamDrawMethods = { ...(currentTournamentDoc?.teamDrawMethods || {}) };

      qualifyingClubs.forEach((clubName) => {
        if (!nextTeamDrawnNumbers[clubName]) {
          const pickedNum = shuffled.pop();
          if (pickedNum !== undefined) {
            nextTeamDrawnNumbers[clubName] = pickedNum;
            nextTeamDrawMethods[clubName] = "btc";
            drawnCount++;
          }
        }
      });

      await updateOnlineTournament(activeHistoryId, {
        teamDrawnNumbers: nextTeamDrawnNumbers,
        teamDrawMethods: nextTeamDrawMethods
      });

      showToast(
        isEng 
          ? `Successfully drawn SBDs for ${drawnCount} clubs!` 
          : `Đã tự động bốc thăm SBD cho ${drawnCount} CLB thành công!`
      );
    } catch (err) {
      console.error("Failed to perform team batch draw:", err);
      showToast(isEng ? "Draw failed." : "Lỗi bốc thăm đồng đội.");
    }
  };

  // Save manual SBD for Clubs
  const handleSaveManualClubSbd = async (clubName: string) => {
    if (!activeHistoryId) return;
    const num = Number(manualClubSbdValue);
    if (isNaN(num) || num < 1) {
      showToast(isEng ? "Invalid number." : "Số thứ tự không hợp lệ.");
      return;
    }

    try {
      const nextTeamDrawnNumbers = { ...teamDrawnNumbers };
      const nextTeamDrawMethods = { ...(currentTournamentDoc?.teamDrawMethods || {}) };
      const existingClub = Object.keys(nextTeamDrawnNumbers).find(
        (name) => name !== clubName && nextTeamDrawnNumbers[name] === num
      );

      if (existingClub) {
        const confirmSwap = window.confirm(
          isEng 
            ? `Number ${num} is already assigned to ${existingClub}. Swap numbers?` 
            : `Số ${num} đã được gán cho CLB "${existingClub}". Bạn có muốn hoán đổi vị trí của họ?`
        );
        if (!confirmSwap) return;

        const currentVal = nextTeamDrawnNumbers[clubName] || null;
        nextTeamDrawnNumbers[existingClub] = currentVal as any;
        const currentMethod = nextTeamDrawMethods[clubName] || "btc";
        nextTeamDrawMethods[existingClub] = currentMethod;
      }

      nextTeamDrawnNumbers[clubName] = num;
      nextTeamDrawMethods[clubName] = "btc";
      await updateOnlineTournament(activeHistoryId, {
        teamDrawnNumbers: nextTeamDrawnNumbers,
        teamDrawMethods: nextTeamDrawMethods
      });

      showToast(isEng ? "Club SBD Updated!" : "Đã cập nhật Số thứ tự SBD của CLB!");
      setEditingSbdClubName(null);
    } catch (err) {
      console.error("Failed to update manual club SBD:", err);
    }
  };

  // Change Team Lane Layout Type
  const handleSetTeamLaneLayoutType = async (type: "parallel" | "sequential") => {
    if (!activeHistoryId) return;
    try {
      await updateOnlineTournament(activeHistoryId, {
        teamLaneLayoutType: type
      });
      showToast(
        isEng
          ? `Team lane layout set to: ${type === "parallel" ? "Parallel" : "Sequential"}`
          : `Đã đổi phương thức xếp bệ lane: ${type === "parallel" ? "Bắn Song Song" : "Bắn Nối Tiếp"}`
      );
    } catch (err) {
      console.error("Failed to update team lane layout type:", err);
    }
  };

  // Toggle bốc thăm trực tuyến status
  const handleToggleDrawingStatus = async () => {
    if (!activeHistoryId) return;
    try {
      const nextStatus = !isDrawingOpen;
      await updateOnlineTournament(activeHistoryId, {
        isDrawingOpen: nextStatus
      });
      showToast(
        isEng 
          ? `Lucky Draw is now ${nextStatus ? "OPEN" : "CLOSED"}!` 
          : `Cổng bốc thăm trực tuyến hiện đã ${nextStatus ? "MỞ" : "ĐÓNG"}!`
      );
    } catch (err) {
      console.error("Failed to toggle drawing status:", err);
      showToast(isEng ? "Failed to update status." : "Lỗi khi cập nhật trạng thái.");
    }
  };

  // Set Forced Environment Mode
  const handleSetForcedMode = async (mode: "individual" | "team" | "free" | "locked") => {
    if (!activeHistoryId) return;
    try {
      const updates: Partial<TournamentData> = {
        forcedRefMode: mode
      };
      // If forced to a mode, sync competitionMode as well
      if (mode === "individual") {
        updates.competitionMode = "individual";
      } else if (mode === "team") {
        updates.competitionMode = "team";
      }
      await updateOnlineTournament(activeHistoryId, updates);
      showToast(
        isEng 
          ? `Referee Mode forced to: ${mode.toUpperCase()}!` 
          : `Đã khóa chỉ định môi trường chấm điểm: ${
              mode === "individual" ? "CÁ NHÂN" :
              mode === "team" ? "ĐỒNG ĐỘI" :
              mode === "locked" ? "KHÓA TOÀN BỘ (CHƯA THI ĐẤU)" : "TỰ DO"
            }!`
      );
    } catch (err) {
      console.error("Failed to set forced ref mode:", err);
      showToast(isEng ? "Failed to enforce mode." : "Lỗi khi thiết lập môi trường.");
    }
  };

  // Trigger Automatic Batch Draw for all athletes who haven't drawn SBD yet
  const handleBatchDrawRemaining = async () => {
    if (!activeHistoryId) return;
    try {
      const totalAthletesCount = masterAthletes.length;
      if (totalAthletesCount === 0) {
        showToast(isEng ? "No registered athletes to draw." : "Chưa có vận động viên nào đăng ký.");
        return;
      }

      // Collect numbers already drawn
      const existingNumbers = new Set(Object.values(drawnNumbers));
      const availableNumbers: number[] = [];
      for (let i = 1; i <= totalAthletesCount; i++) {
        if (!existingNumbers.has(i)) {
          availableNumbers.push(i);
        }
      }

      // Shuffle available numbers
      const shuffled = [...availableNumbers].sort(() => Math.random() - 0.5);

      const nextDrawnNumbers = { ...drawnNumbers };
      const nextDrawMethods = { ...(currentTournamentDoc?.drawMethods || {}) };
      let drawnCount = 0;

      masterAthletes.forEach((athlete) => {
        if (!nextDrawnNumbers[athlete.id]) {
          const pickedNum = shuffled.pop();
          if (pickedNum !== undefined) {
            nextDrawnNumbers[athlete.id] = pickedNum;
            nextDrawMethods[athlete.id] = "btc";
            drawnCount++;
          }
        }
      });

      await updateOnlineTournament(activeHistoryId, {
        drawnNumbers: nextDrawnNumbers,
        drawMethods: nextDrawMethods
      });

      showToast(
        isEng 
          ? `Successfully drawn SBDs for ${drawnCount} athletes!` 
          : `Đã tự động bốc thăm SBD cho ${drawnCount} vận động viên còn lại!`
      );
    } catch (err) {
      console.error("Failed to perform batch draw:", err);
      showToast(isEng ? "Draw failed." : "Lỗi bốc thăm hàng loạt.");
    }
  };

  // Update a single athlete's SBD manually
  const handleSaveManualSbd = async (athleteId: string) => {
    if (!activeHistoryId) return;
    const num = Number(manualSbdValue);
    if (isNaN(num) || num < 1) {
      showToast(isEng ? "Invalid number." : "Số thứ tự không hợp lệ.");
      return;
    }

    try {
      const nextDrawnNumbers = { ...drawnNumbers };
      const nextDrawMethods = { ...(currentTournamentDoc?.drawMethods || {}) };
      // Check if number is already taken by another athlete
      const existingOwnerId = Object.keys(nextDrawnNumbers).find(
        (id) => id !== athleteId && nextDrawnNumbers[id] === num
      );

      if (existingOwnerId) {
        const ownerName = masterAthletes.find((a) => a.id === existingOwnerId)?.name || existingOwnerId;
        const confirmSwap = window.confirm(
          isEng 
            ? `Number ${num} is already assigned to ${ownerName}. Swap numbers?` 
            : `Số ${num} đã được gán cho VĐV "${ownerName}". Bạn có muốn hoán đổi vị trí của họ?`
        );
        if (!confirmSwap) return;

        // Swap numbers if confirmed
        const currentOwnerVal = nextDrawnNumbers[athleteId] || null;
        nextDrawnNumbers[existingOwnerId] = currentOwnerVal as any;
        const currentMethod = nextDrawMethods[athleteId] || "btc";
        nextDrawMethods[existingOwnerId] = currentMethod;
      }

      nextDrawnNumbers[athleteId] = num;
      nextDrawMethods[athleteId] = "btc";
      await updateOnlineTournament(activeHistoryId, {
        drawnNumbers: nextDrawnNumbers,
        drawMethods: nextDrawMethods
      });

      showToast(isEng ? "SBD Updated!" : "Đã cập nhật Số thứ tự SBD!");
      setEditingSbdAthleteId(null);
    } catch (err) {
      console.error("Failed to update manual SBD:", err);
    }
  };

  // Compile and Apply the next round sorting order
  const handleApplyNextRoundSorting = async () => {
    if (!activeHistoryId) return;
    try {
      const currentDistances = sorterEnv === "team"
        ? currentTournamentDoc?.teamDistances || []
        : currentTournamentDoc?.distances || [];

      if (currentDistances.length === 0) {
        showToast(isEng ? "No rounds configured." : "Chưa cấu hình vòng đấu/cự ly.");
        return;
      }

      const selectedDistance = currentDistances[selectedSorterRoundIdx];
      if (!selectedDistance) {
        showToast(isEng ? "Selected round is invalid." : "Vòng đấu đã chọn không hợp lệ.");
        return;
      }

      const effectiveShotsCount = sorterEnv === "team"
        ? selectedDistance.teamShotCount || currentTournamentDoc?.teamShotsCount || 5
        : selectedDistance.shotCount || currentTournamentDoc?.shotsCount || 5;

      const effectiveDirectMaxPoints = sorterEnv === "team"
        ? currentTournamentDoc?.teamDirectMaxShots
        : currentTournamentDoc?.directMaxShots;

      // Run qualification calculateRounds
      const roundResults = calculateRounds(
        masterAthletes,
        currentDistances,
        effectiveShotsCount,
        effectiveDirectMaxPoints
      );

      let orderIds: string[] = [];

      if (sorterEnv === "team") {
        // --- TEAM SORTING LOGIC ---
        // 1. Find all eligible clubs
        const clubsSet = new Set<string>(
          masterAthletes
            .filter((a) => a.team && a.team.trim() !== "" && a.team.trim() !== "Tự do" && a.isPrimaryTeam)
            .map((a) => a.team!.trim())
        );
        const sortedClubs: string[] = Array.from(clubsSet);

        // Helper to sum main shooters' score for a club in previous round
        const getClubPrevScore = (clubName: string) => {
          const mainShooters = masterAthletes.filter(
            (a) => a.team?.trim() === clubName && a.isPrimaryTeam
          );
          const prevRoundRes = roundResults[selectedSorterRoundIdx - 1];
          if (!prevRoundRes || !prevRoundRes.scores) return 0;
          let total = 0;
          for (const shooter of mainShooters) {
            const sc = prevRoundRes.scores[shooter.id];
            if (sc) {
              total += sc.displayScoreWithSolo !== undefined ? sc.displayScoreWithSolo : sc.displayScore;
            }
          }
          return total;
        };

        // Sort clubs
        sortedClubs.sort((clubA, clubB) => {
          const sbdA = (currentTournamentDoc?.teamDrawnNumbers || {})[clubA] || 999999;
          const sbdB = (currentTournamentDoc?.teamDrawnNumbers || {})[clubB] || 999999;

          if (selectedSorterRoundIdx === 0 || sortCriteria === "sbd") {
            // Round 1 or SBD strategy: sort strictly by club SBD
            return sbdA - sbdB;
          }

          // Points-based sorting
          const scoreA = getClubPrevScore(clubA);
          const scoreB = getClubPrevScore(clubB);

          if (sortCriteria === "points_asc") {
            if (scoreA !== scoreB) {
              return scoreA - scoreB;
            }
            return sbdA - sbdB; // Tie-break with club SBD
          } else {
            // points_desc
            if (scoreA !== scoreB) {
              return scoreB - scoreA;
            }
            return sbdA - sbdB; // Tie-break with club SBD
          }
        });

        // 2. Map sorted clubs back to their main shooters consecutively
        for (const club of sortedClubs) {
          const clubShooters = masterAthletes.filter(
            (a) => a.team?.trim() === club && a.isPrimaryTeam
          );
          // Sort shooters alphabetically for deterministic order within club
          clubShooters.sort((a, b) => a.name.localeCompare(b.name));
          orderIds.push(...clubShooters.map((s) => s.id));
        }
      } else {
        // --- INDIVIDUAL SORTING LOGIC ---
        let targetAthletes = [...masterAthletes];

        // If r > 0, filter by qualifiedIds
        if (selectedSorterRoundIdx > 0) {
          const roundRes = roundResults[selectedSorterRoundIdx];
          if (roundRes && roundRes.qualifiedIds) {
            const qualifiedSet = new Set(roundRes.qualifiedIds);
            targetAthletes = masterAthletes.filter(a => qualifiedSet.has(a.id));
          }
        }

        // Sort according to criteria
        targetAthletes.sort((a, b) => {
          const sbdA = drawnNumbers[a.id] || 999999;
          const sbdB = drawnNumbers[b.id] || 999999;

          if (sortCriteria === "sbd") {
            return sbdA - sbdB;
          }

          // Points-based sorting
          let scoreA = 0;
          let scoreB = 0;

          if (selectedSorterRoundIdx === 0) {
            // Round 1 points sorting
            scoreA = calculateTotalScore(a, currentDistances);
            scoreB = calculateTotalScore(b, currentDistances);
          } else {
            // Subsequent rounds points sorting (look at previous round index: selectedSorterRoundIdx - 1)
            const prevRoundRes = roundResults[selectedSorterRoundIdx - 1];
            if (prevRoundRes && prevRoundRes.scores) {
              const scA = prevRoundRes.scores[a.id];
              const scB = prevRoundRes.scores[b.id];
              scoreA = scA ? (scA.displayScoreWithSolo !== undefined ? scA.displayScoreWithSolo : scA.displayScore) : 0;
              scoreB = scB ? (scB.displayScoreWithSolo !== undefined ? scB.displayScoreWithSolo : scB.displayScore) : 0;
            }
          }

          if (sortCriteria === "points_asc") {
            if (scoreA !== scoreB) {
              return scoreA - scoreB;
            }
            return sbdA - sbdB; // Tie-break with SBD
          } else {
            if (scoreA !== scoreB) {
              return scoreB - scoreA;
            }
            return sbdA - sbdB; // Tie-break with SBD
          }
        });

        orderIds = targetAthletes.map((a) => a.id);
      }

      const updatedRoundShootingOrders = {
        ...(currentTournamentDoc?.roundShootingOrders || {}),
        [selectedDistance.id]: orderIds
      };

      const updatedRoundShootingOrderCriteria = {
        ...(currentTournamentDoc?.roundShootingOrderCriteria || {}),
        [selectedDistance.id]: sortCriteria
      };

      await updateOnlineTournament(activeHistoryId, {
        sortedAthleteOrder: orderIds, // Keep flat sortedAthleteOrder fallback
        roundShootingOrders: updatedRoundShootingOrders,
        roundShootingOrderCriteria: updatedRoundShootingOrderCriteria
      });

      showToast(
        isEng 
          ? `Shooting order updated & applied to round: ${selectedDistance.distance}!` 
          : `Đã áp dụng & cập nhật thứ tự lượt bắn cho cự ly: ${selectedDistance.distance}!`
      );
    } catch (err) {
      console.error("Failed to apply sorting:", err);
      showToast(isEng ? "Failed to save order." : "Lỗi khi lưu thứ tự vòng đấu.");
    }
  };

  // Helper to slice athletes into squads based on lane capacity
  const getSquadsList = () => {
    const listWithSbd = masterAthletes.map((a) => ({
      ...a,
      sbd: drawnNumbers[a.id] || 99999
    })).sort((a, b) => a.sbd - b.sbd);

    const squads: Array<typeof listWithSbd> = [];
    for (let i = 0; i < listWithSbd.length; i += laneCapacity) {
      squads.push(listWithSbd.slice(i, i + laneCapacity));
    }
    return squads;
  };

  const squads = getSquadsList();

  return (
    <div className="flex flex-col gap-6 animate-fadeIn" id="national-execution-hub">
      {/* ⚠️ Guard check */}
      {!isNational && (
        <div className="p-8 text-center bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-2xl">
          <Shield className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h2 className="text-sm font-black text-amber-800 dark:text-amber-400 uppercase tracking-widest">
            {isEng ? "NATIONAL DESIGNATION REQUIRED" : "YÊU CẦU CẤU HÌNH GIẢI QUỐC GIA"}
          </h2>
          <p className="text-xs text-amber-600 dark:text-amber-500 max-w-md mx-auto mt-2 leading-relaxed">
            {isEng 
              ? "This master execution hub is only unlocked for tournaments designated as 'National / Large-scale' in settings."
              : "Bảng điều hành thượng tầng này chỉ được kích hoạt cho các giải đấu được cấu hình là 'Giải Đấu Quốc Gia / Quy Mô Lớn' tại trang Cài đặt."}
          </p>
        </div>
      )}

      {isNational && (
        <>
          {/* Header Controls Panel */}
          <div className="bg-gradient-to-r from-rose-800 to-rose-950 text-white p-5 rounded-2xl border border-rose-700 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded">
                {isEng ? "Tournament Executive Hub" : "Hệ Điều Hành Thượng Tầng"}
              </span>
              <h1 className="text-lg font-black tracking-tight uppercase mt-1">
                {isEng ? "Master Orchestrator Center" : "ĐẦU NÃO ĐIỀU HÀNH GIẢI ĐẤU"}
              </h1>
              <p className="text-[10.5px] text-rose-200/90 leading-tight mt-0.5">
                {isEng 
                  ? "Real-time field monitoring, environment synchronization, and lane logistics."
                  : "Giám sát bàn súng, chỉ thị môi trường thi đấu, chia lượt bắn và đồng bộ Trọng tài thực địa."}
              </p>
            </div>

            {/* Quick status badges */}
            <div className="flex gap-2 text-[10px] font-black font-mono">
              <div className="bg-black/30 border border-white/10 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>LANE CAPACITY: {laneCapacity}</span>
              </div>
              <div className="bg-black/30 border border-white/10 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-300" />
                <span>VĐV REGISTERED: {masterAthletes.length}</span>
              </div>
            </div>
          </div>

          {/* Navigtion Tabs inside Executive Hub */}
          <div className="flex border-b border-gray-200 dark:border-slate-800 gap-1 sm:gap-2 overflow-x-auto scrollbar-none" id="executive-hub-tabs">
            <button
              onClick={() => setSubTab("enforcer")}
              className={`px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                subTab === "enforcer"
                  ? "border-rose-600 text-rose-600 dark:text-rose-400 font-extrabold bg-rose-500/5"
                  : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300"
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              {isEng ? "Enforce Environment" : "Chỉ Định Môi Trường & Khóa"}
            </button>
            <button
              onClick={() => setSubTab("lucky_draw")}
              className={`px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                subTab === "lucky_draw"
                  ? "border-rose-600 text-rose-600 dark:text-rose-400 font-extrabold bg-rose-500/5"
                  : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300"
              }`}
            >
              <Shuffle className="w-3.5 h-3.5" />
              {isEng ? "Lucky Draw / SBD" : "Bốc Thăm SBD / Số thứ tự"}
            </button>
            <button
              onClick={() => setSubTab("lane_monitor")}
              className={`px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                subTab === "lane_monitor"
                  ? "border-rose-600 text-rose-600 dark:text-rose-400 font-extrabold bg-rose-500/5"
                  : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300"
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              {isEng ? "Live Lanes Telemetry" : "Giám Sát Bàn Súng Trực Tiếp"}
            </button>
            <button
              onClick={() => setSubTab("sorter")}
              className={`px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                subTab === "sorter"
                  ? "border-rose-600 text-rose-600 dark:text-rose-400 font-extrabold bg-rose-500/5"
                  : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300"
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5" />
              {isEng ? "Next Round Match Sorter" : "Sắp Xếp Lượt Bắn Vòng Sau"}
            </button>
          </div>

          {/* Subtab Contents */}

          {/* Subtab 1: Enforcer (Lock Environment Mode for Referees) */}
          {subTab === "enforcer" && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-150 dark:border-slate-800 p-5 space-y-5 animate-fadeIn">
              <div className="flex items-center gap-2.5 pb-2 border-b border-gray-100 dark:border-slate-850">
                <Shield className="w-5 h-5 text-indigo-500" />
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  {isEng ? "Active Environment Control Matrix" : "BỘ KHÓA CHỈ ĐỊNH MÔI TRƯỜNG THI ĐẤU THỰC ĐỊA"}
                </h2>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-slate-400 leading-relaxed max-w-2xl">
                {isEng 
                  ? "When BTC selects a mode below, all sub-referees on the field will be forced to that screen, disabling accidental clicks."
                  : "Khi Giám đốc giải đấu chỉ định một chế độ bên dưới, thiết bị của toàn bộ Trọng tài thực địa trên sân sẽ bị khóa cứng ở giao diện đó. Việc này ngăn chặn 100% tình trạng chấm điểm nhầm lẫn giữa nội dung Cá nhân và Đồng đội."}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                {/* 1. Free/Unlocked Mode */}
                <div className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                  forcedRefMode === "free"
                    ? "bg-emerald-500/5 dark:bg-emerald-950/10 border-emerald-500"
                    : "bg-slate-50 dark:bg-slate-950/40 border-gray-150 dark:border-slate-800"
                }`}>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-emerald-600 dark:text-emerald-400">
                        {isEng ? "Free Mode" : "CHẾ ĐỘ TỰ DO (MỞ KHÓA)"}
                      </span>
                      <Unlock className="w-4 h-4 text-emerald-500" />
                    </div>
                    <p className="text-[10px] text-gray-500 leading-relaxed">
                      {isEng 
                        ? "Referees are free to switch between Individual and Team modes."
                        : "Hệ thống mở khóa. Trọng tài được tự do chuyển đổi giữa Cá Nhân và Đồng Đội."}
                    </p>
                  </div>
                  <button
                    onClick={() => handleSetForcedMode("free")}
                    className={`w-full py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      forcedRefMode === "free"
                        ? "bg-emerald-600 text-white shadow-xs cursor-default"
                        : "bg-white dark:bg-slate-800 text-gray-700 dark:text-white border border-gray-300 dark:border-slate-700 hover:bg-gray-50"
                    }`}
                  >
                    {forcedRefMode === "free" ? "✓ ĐANG KÍCH HOẠT" : "KÍCH HOẠT"}
                  </button>
                </div>

                {/* 2. Forced Individual Mode */}
                <div className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                  forcedRefMode === "individual"
                    ? "bg-blue-500/5 dark:bg-blue-950/10 border-blue-500"
                    : "bg-slate-50 dark:bg-slate-950/40 border-gray-150 dark:border-slate-800"
                }`}>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-blue-600 dark:text-blue-400">
                        {isEng ? "Forced Individual" : "CHỈ ĐỊNH CÁ NHÂN"}
                      </span>
                      <Lock className="w-4 h-4 text-blue-500" />
                    </div>
                    <p className="text-[10px] text-gray-500 leading-relaxed">
                      {isEng 
                        ? "Forces all referee screens to Individual entry mode only."
                        : "Khóa chặt tất cả Trọng tài ở màn hình chấm điểm Cá Nhân. Nút chuyển Đồng Đội bị vô hiệu hóa."}
                    </p>
                  </div>
                  <button
                    onClick={() => handleSetForcedMode("individual")}
                    className={`w-full py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      forcedRefMode === "individual"
                        ? "bg-blue-600 text-white shadow-xs cursor-default"
                        : "bg-white dark:bg-slate-800 text-gray-700 dark:text-white border border-gray-300 dark:border-slate-700 hover:bg-gray-50"
                    }`}
                  >
                    {forcedRefMode === "individual" ? "✓ ĐANG KHÓA CÁ NHÂN" : "KÍCH HOẠT & KHÓA"}
                  </button>
                </div>

                {/* 3. Forced Team Mode */}
                <div className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                  forcedRefMode === "team"
                    ? "bg-indigo-500/5 dark:bg-indigo-950/10 border-indigo-500"
                    : "bg-slate-50 dark:bg-slate-950/40 border-gray-150 dark:border-slate-800"
                }`}>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400">
                        {isEng ? "Forced Team" : "CHỈ ĐỊNH ĐỒNG ĐỘI"}
                      </span>
                      <Lock className="w-4 h-4 text-indigo-500" />
                    </div>
                    <p className="text-[10px] text-gray-500 leading-relaxed">
                      {isEng 
                        ? "Forces all referee screens to Team scoring mode only."
                        : "Khóa chặt tất cả Trọng tài ở màn hình chấm điểm Đồng Đội. Nút chuyển Cá Nhân bị vô hiệu hóa."}
                    </p>
                  </div>
                  <button
                    onClick={() => handleSetForcedMode("team")}
                    className={`w-full py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      forcedRefMode === "team"
                        ? "bg-indigo-650 text-white shadow-xs cursor-default"
                        : "bg-white dark:bg-slate-800 text-gray-700 dark:text-white border border-gray-300 dark:border-slate-700 hover:bg-gray-50"
                    }`}
                  >
                    {forcedRefMode === "team" ? "✓ ĐANG KHÓA ĐỒNG ĐỘI" : "KÍCH HOẠT & KHÓA"}
                  </button>
                </div>

                {/* 4. Locked (All scoring disabled) Mode */}
                <div className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                  forcedRefMode === "locked"
                    ? "bg-rose-500/5 dark:bg-rose-950/10 border-rose-500"
                    : "bg-slate-50 dark:bg-slate-950/40 border-gray-150 dark:border-slate-800"
                }`}>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-rose-600 dark:text-rose-400">
                        {isEng ? "Lock Scoring" : "KHÓA TOÀN BỘ (CHƯA ĐẤU)"}
                      </span>
                      <Lock className="w-4 h-4 text-rose-500" />
                    </div>
                    <p className="text-[10px] text-gray-500 leading-relaxed">
                      {isEng 
                        ? "Disables all referee input and player calling completely."
                        : "Khóa cứng toàn diện cả 2 môi trường. Không cho phép bất kỳ Trọng tài nào gọi VĐV hay ghi điểm."}
                    </p>
                  </div>
                  <button
                    onClick={() => handleSetForcedMode("locked")}
                    className={`w-full py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      forcedRefMode === "locked"
                        ? "bg-rose-600 text-white shadow-xs cursor-default"
                        : "bg-white dark:bg-slate-800 text-gray-700 dark:text-white border border-gray-300 dark:border-slate-700 hover:bg-gray-50"
                    }`}
                  >
                    {forcedRefMode === "locked" ? "✓ ĐANG KHÓA TOÀN BỘ" : "KÍCH HOẠT & KHÓA SÂN"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Subtab 2: Lucky Draw / SBD (Bốc thăm Số thứ tự báo danh) */}
          {subTab === "lucky_draw" && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-150 dark:border-slate-800 p-5 space-y-5 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-gray-100 dark:border-slate-850 gap-3">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2.5">
                    <Shuffle className="w-5 h-5 text-indigo-500" />
                    <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                      {isEng ? "Roster SBD Drawing Dashboard" : "BỐC THĂM SỐ THỨ TỰ BÁO DANH (SBD)"}
                    </h2>
                  </div>
                  <p className="text-[10px] text-gray-500">
                    {drawEnv === "team"
                      ? "Chế độ bốc thăm số thứ tự cho các Câu Lạc Bộ tham gia thi đấu Đồng Đội."
                      : "Chế độ bốc thăm số báo danh thứ tự (SBD) cho từng Vận Động Viên."}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Environment selector for Combined Tournaments */}
                  {currentTournamentDoc?.tournamentType === "combined" && (
                    <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-gray-200/50 dark:border-slate-800 mr-2">
                      <button
                        onClick={() => setDrawEnv("individual")}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                          drawEnv === "individual"
                            ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                            : "text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200"
                        }`}
                      >
                        <span>{isEng ? "Individual" : "Cá Nhân"}</span>
                      </button>
                      <button
                        onClick={() => setDrawEnv("team")}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                          drawEnv === "team"
                            ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                            : "text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200"
                        }`}
                      >
                        <span>{isEng ? "Team" : "Đồng Đội"}</span>
                      </button>
                    </div>
                  )}

                  {/* Toggle open draw button */}
                  <button
                    onClick={handleToggleDrawingStatus}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-sm border ${
                      isDrawingOpen
                        ? "bg-rose-50/50 hover:bg-rose-100/50 text-rose-600 border-rose-200"
                        : "bg-emerald-50/50 hover:bg-emerald-100/50 text-emerald-600 border-emerald-200"
                    }`}
                  >
                    {isDrawingOpen ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    <span>{isDrawingOpen ? (isEng ? "Close Online Portal" : "ĐÓNG CỔNG TRỰC TUYẾN") : (isEng ? "Open Online Portal" : "MỞ CỔNG TRỰC TUYẾN")}</span>
                  </button>

                  {/* Auto batch draw remaining button */}
                  <button
                    onClick={drawEnv === "team" ? handleTeamBatchDrawRemaining : handleBatchDrawRemaining}
                    className="bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-sm border border-slate-900"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                    <span>{isEng ? "BTC Draw Remaining" : "BTC BỐC THĂM NGẪU NHIÊN"}</span>
                  </button>
                </div>
              </div>

              {/* Statistics Row */}
              {(() => {
                if (drawEnv === "team") {
                  const totalRegistered = qualifyingClubs.length;
                  const drawnCount = qualifyingClubs.filter(name => !!teamDrawnNumbers[name]).length;
                  const pendingCount = totalRegistered - drawnCount;
                  const progressPct = totalRegistered > 0 ? Math.round((drawnCount / totalRegistered) * 100) : 0;

                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-gray-150 dark:border-slate-800">
                      <div>
                        <span className="block text-[8px] text-gray-500 font-extrabold uppercase tracking-widest">{isEng ? "TOTAL CLUBS" : "CÂU LẠC BỘ THI ĐẤU"}</span>
                        <span className="text-lg font-black text-slate-800 dark:text-slate-100 font-mono block mt-0.5">{totalRegistered} ĐỘI</span>
                      </div>
                      <div>
                        <span className="block text-[8px] text-gray-500 font-extrabold uppercase tracking-widest">{isEng ? "ALREADY DRAWN" : "ĐÃ CÓ SBD CLB"}</span>
                        <span className="text-lg font-black text-emerald-600 font-mono block mt-0.5">{drawnCount} ĐỘI</span>
                      </div>
                      <div>
                        <span className="block text-[8px] text-gray-500 font-extrabold uppercase tracking-widest">{isEng ? "PENDING DRAW" : "CHỜ BỐC THĂM CLB"}</span>
                        <span className="text-lg font-black text-amber-500 font-mono block mt-0.5">{pendingCount} ĐỘI</span>
                      </div>
                      <div>
                        <span className="block text-[8px] text-gray-500 font-extrabold uppercase tracking-widest">{isEng ? "DRAW PROGRESS" : "TIẾN ĐỘ BỐC THĂM CLB"}</span>
                        <span className="text-lg font-black text-indigo-600 dark:text-indigo-400 font-mono block mt-0.5">{progressPct}%</span>
                      </div>
                    </div>
                  );
                } else {
                  const totalRegistered = masterAthletes.length;
                  const drawnCount = Object.keys(drawnNumbers).length;
                  const pendingCount = totalRegistered - drawnCount;
                  const progressPct = totalRegistered > 0 ? Math.round((drawnCount / totalRegistered) * 100) : 0;

                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-gray-150 dark:border-slate-800">
                      <div>
                        <span className="block text-[8px] text-gray-500 font-extrabold uppercase tracking-widest">{isEng ? "TOTAL REGISTERED" : "HỘI VIÊN ĐĂNG KÝ"}</span>
                        <span className="text-lg font-black text-slate-800 dark:text-slate-100 font-mono block mt-0.5">{totalRegistered} VĐV</span>
                      </div>
                      <div>
                        <span className="block text-[8px] text-gray-500 font-extrabold uppercase tracking-widest">{isEng ? "ALREADY DRAWN" : "ĐÃ CÓ SBD"}</span>
                        <span className="text-lg font-black text-emerald-600 font-mono block mt-0.5">{drawnCount} VĐV</span>
                      </div>
                      <div>
                        <span className="block text-[8px] text-gray-500 font-extrabold uppercase tracking-widest">{isEng ? "PENDING DRAW" : "CHỜ BỐC THĂM"}</span>
                        <span className="text-lg font-black text-amber-500 font-mono block mt-0.5">{pendingCount} VĐV</span>
                      </div>
                      <div>
                        <span className="block text-[8px] text-gray-500 font-extrabold uppercase tracking-widest">{isEng ? "DRAW PROGRESS" : "TIẾN ĐỘ BỐC THĂM"}</span>
                        <span className="text-lg font-black text-indigo-600 dark:text-indigo-400 font-mono block mt-0.5">{progressPct}%</span>
                      </div>
                    </div>
                  );
                }
              })()}

              {/* Roster list table */}
              <div className="overflow-x-auto border border-gray-150 dark:border-slate-800 rounded-xl">
                {drawEnv === "team" ? (
                  <table className="w-full text-left text-xs font-sans">
                    <thead className="bg-slate-50 dark:bg-slate-950 border-b border-gray-150 dark:border-slate-800 text-[10px] font-black text-slate-550 uppercase tracking-wider">
                      <tr>
                        <th className="p-3 w-1/4">{isEng ? "Club SBD" : "SỐ THỨ TỰ BỐC THĂM (SBD)"}</th>
                        <th className="p-3 w-1/4">{isEng ? "Club Name" : "CÂU LẠC BỘ"}</th>
                        <th className="p-3 w-1/3">{isEng ? "Main Shooters" : "DANH SÁCH VĐV BẮN CHÍNH (MAIN)"}</th>
                        <th className="p-3 text-right">{isEng ? "Actions" : "HÀNH ĐỘNG"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-150 dark:divide-slate-850 font-medium text-slate-700 dark:text-slate-300">
                      {qualifyingClubs.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-6 text-center text-gray-400 font-bold">
                            {isEng ? "No qualified clubs found." : "Chưa tìm thấy Câu Lạc Bộ nào có VĐV bắn chính đăng ký."}
                          </td>
                        </tr>
                      ) : (
                        [...qualifyingClubs]
                          .sort((a, b) => {
                            const sbdA = teamDrawnNumbers[a] || 999999;
                            const sbdB = teamDrawnNumbers[b] || 999999;
                            return sbdA - sbdB;
                          })
                          .map((clubName) => {
                            const sbd = teamDrawnNumbers[clubName] || null;
                            const isEditing = editingSbdClubName === clubName;
                            
                            // Find primary team shooters of this club
                            const primaryShooters = masterAthletes.filter(
                              (a) => a.team?.trim() === clubName && a.isPrimaryTeam
                            );

                            return (
                              <tr key={clubName} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                <td className="p-3">
                                  {isEditing ? (
                                    <input
                                      type="number"
                                      value={manualClubSbdValue}
                                      onChange={(e) => setManualClubSbdValue(e.target.value === "" ? "" : Number(e.target.value))}
                                      placeholder={isEng ? "Enter SBD" : "Nhập SBD CLB..."}
                                      className="w-24 px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded text-xs font-bold focus:outline-none focus:ring-1 focus:ring-rose-500 font-mono text-rose-600"
                                    />
                                  ) : sbd ? (
                                    (() => {
                                      const isSelf = currentTournamentDoc?.teamDrawMethods?.[clubName] === "self";
                                      const drawLabel = isSelf ? (isEng ? "Athlete" : "VĐV bốc") : (isEng ? "Organizer" : "BTC bốc");
                                      const drawColor = isSelf 
                                        ? "text-blue-600 bg-blue-50 dark:bg-blue-950/20 border border-blue-150 dark:border-blue-900/20" 
                                        : "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-150 dark:border-emerald-900/20";
                                      return (
                                        <div className="flex items-center gap-1.5">
                                          <span className="inline-flex items-center justify-center font-black font-mono px-2 py-0.5 rounded text-xs bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-150 dark:border-rose-900/30">
                                            {String(sbd).padStart(3, "0")}
                                          </span>
                                          <span className={`text-[9px] font-semibold flex items-center gap-0.5 px-1.5 py-0.5 rounded-full ${drawColor}`}>
                                            <CheckCircle className="w-2.5 h-2.5" />
                                            {drawLabel}
                                          </span>
                                        </div>
                                      );
                                    })()
                                  ) : (
                                    <span className="text-[10px] bg-amber-50 dark:bg-amber-955/20 text-amber-600 dark:text-amber-400 border border-amber-150 dark:border-amber-900/30 px-2 py-0.5 rounded font-bold uppercase tracking-wider animate-pulse">
                                      {isEng ? "Pending draw" : "Chờ bốc thăm"}
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 font-bold text-slate-800 dark:text-slate-200">{clubName}</td>
                                <td className="p-3">
                                  <div className="flex flex-wrap gap-1.5">
                                    {primaryShooters.map((shoots) => (
                                      <span 
                                        key={shoots.id} 
                                        className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-150 dark:border-emerald-900/30 font-bold"
                                      >
                                        {shoots.name}
                                      </span>
                                    ))}
                                    {primaryShooters.length === 0 && (
                                      <span className="text-[10px] text-gray-400 italic">Không có VĐV Bắn chính</span>
                                    )}
                                  </div>
                                </td>
                                <td className="p-3 text-right">
                                  {isEditing ? (
                                    <div className="flex justify-end gap-1.5">
                                      <button
                                        onClick={() => handleSaveManualClubSbd(clubName)}
                                        className="bg-emerald-600 text-white font-bold px-2 py-1 rounded text-[10px] hover:bg-emerald-500 transition-colors cursor-pointer"
                                      >
                                        {isEng ? "Save" : "Lưu"}
                                      </button>
                                      <button
                                        onClick={() => setEditingSbdClubName(null)}
                                        className="bg-gray-200 text-gray-700 dark:bg-slate-800 dark:text-white font-bold px-2 py-1 rounded text-[10px] hover:bg-gray-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                                      >
                                        {isEng ? "Cancel" : "Hủy"}
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setEditingSbdClubName(clubName);
                                        setManualClubSbdValue(sbd || "");
                                      }}
                                      className="text-[10px] font-extrabold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline cursor-pointer"
                                    >
                                      {isEng ? "Manual Adjust" : "Nhập Thủ Công / Sửa"}
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                      )}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full text-left text-xs font-sans">
                    <thead className="bg-slate-50 dark:bg-slate-950 border-b border-gray-150 dark:border-slate-800 text-[10px] font-black text-slate-550 uppercase tracking-wider">
                      <tr>
                        <th className="p-3">{isEng ? "SBD" : "SỐ THỨ TỰ BỐC THĂM (SBD)"}</th>
                        <th className="p-3">{isEng ? "ID" : "MÃ SỐ VĐV"}</th>
                        <th className="p-3">{isEng ? "Athlete Name" : "HỌ VÀ TÊN"}</th>
                        <th className="p-3">{isEng ? "Club/Team" : "CÂU LẠC BỘ"}</th>
                        <th className="p-3 text-right">{isEng ? "Actions" : "HÀNH ĐỘNG"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-150 dark:divide-slate-850 font-medium text-slate-700 dark:text-slate-300">
                      {masterAthletes.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-gray-400 font-bold">
                            {isEng ? "No registered athletes found." : "Chưa có vận động viên đăng ký tham gia giải."}
                          </td>
                        </tr>
                      ) : (
                        [...masterAthletes]
                          .sort((a, b) => {
                            const sbdA = drawnNumbers[a.id] || 999999;
                            const sbdB = drawnNumbers[b.id] || 999999;
                            return sbdA - sbdB;
                          })
                          .map((athlete) => {
                            const sbd = drawnNumbers[athlete.id] || null;
                            const isEditing = editingSbdAthleteId === athlete.id;

                            return (
                              <tr key={athlete.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                <td className="p-3">
                                  {isEditing ? (
                                    <input
                                      type="number"
                                      value={manualSbdValue}
                                      onChange={(e) => setManualSbdValue(e.target.value === "" ? "" : Number(e.target.value))}
                                      placeholder={isEng ? "Enter SBD" : "Nhập SBD..."}
                                      className="w-24 px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded text-xs font-bold focus:outline-none focus:ring-1 focus:ring-rose-500 font-mono text-rose-600"
                                    />
                                  ) : sbd ? (
                                    (() => {
                                      const isSelf = currentTournamentDoc?.drawMethods?.[athlete.id] === "self";
                                      const drawLabel = isSelf ? (isEng ? "Athlete" : "VĐV bốc") : (isEng ? "Organizer" : "BTC bốc");
                                      const drawColor = isSelf 
                                        ? "text-blue-600 bg-blue-50 dark:bg-blue-950/20 border border-blue-150 dark:border-blue-900/20" 
                                        : "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-150 dark:border-emerald-900/20";
                                      return (
                                        <div className="flex items-center gap-1.5">
                                          <span className="inline-flex items-center justify-center font-black font-mono px-2 py-0.5 rounded text-xs bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-150 dark:border-rose-900/30">
                                            {String(sbd).padStart(3, "0")}
                                          </span>
                                          <span className={`text-[9px] font-semibold flex items-center gap-0.5 px-1.5 py-0.5 rounded-full ${drawColor}`}>
                                            <CheckCircle className="w-2.5 h-2.5" />
                                            {drawLabel}
                                          </span>
                                        </div>
                                      );
                                    })()
                                  ) : (
                                    <span className="text-[10px] bg-amber-50 dark:bg-amber-955/20 text-amber-600 dark:text-amber-400 border border-amber-150 dark:border-amber-900/30 px-2 py-0.5 rounded font-bold uppercase tracking-wider animate-pulse">
                                      {isEng ? "Pending draw" : "Chờ bốc thăm"}
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 font-mono text-[11px] font-bold text-slate-550">{athlete.id}</td>
                                <td className="p-3 font-bold text-slate-800 dark:text-slate-200">{athlete.name}</td>
                                <td className="p-3 text-[11px]">{athlete.team || "Tự do"}</td>
                                <td className="p-3 text-right">
                                  {isEditing ? (
                                    <div className="flex justify-end gap-1.5">
                                      <button
                                        onClick={() => handleSaveManualSbd(athlete.id)}
                                        className="bg-emerald-600 text-white font-bold px-2 py-1 rounded text-[10px] hover:bg-emerald-500 transition-colors cursor-pointer"
                                      >
                                        {isEng ? "Save" : "Lưu"}
                                      </button>
                                      <button
                                        onClick={() => setEditingSbdAthleteId(null)}
                                        className="bg-gray-200 text-gray-700 dark:bg-slate-800 dark:text-white font-bold px-2 py-1 rounded text-[10px] hover:bg-gray-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                                      >
                                        {isEng ? "Cancel" : "Hủy"}
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setEditingSbdAthleteId(athlete.id);
                                        setManualSbdValue(sbd || "");
                                      }}
                                      className="text-[10px] font-extrabold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline cursor-pointer"
                                    >
                                      {isEng ? "Manual Adjust" : "Nhập Thủ Công / Sửa"}
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* Subtab 3: Live Lanes Telemetry (Giám sát Bàn súng thời gian thực) */}
          {subTab === "lane_monitor" && (() => {
            const currentDistances = monitorEnv === "team"
              ? currentTournamentDoc?.teamDistances || []
              : currentTournamentDoc?.distances || [];

            if (currentDistances.length === 0) {
              return (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-150 dark:border-slate-800 p-8 text-center text-gray-400 font-bold">
                  {isEng ? "No competition rounds configured yet." : "Chưa cấu hình vòng đấu/cự ly cho giải đấu."}
                </div>
              );
            }

            const activeRound = currentDistances[selectedMonitorRoundIdx] || currentDistances[0];

            const effectiveShotsCount = monitorEnv === "team"
              ? activeRound.teamShotCount || currentTournamentDoc?.teamShotsCount || 5
              : activeRound.shotCount || currentTournamentDoc?.shotsCount || 5;

            const effectiveDirectMaxPoints = monitorEnv === "team"
              ? currentTournamentDoc?.teamDirectMaxShots
              : currentTournamentDoc?.directMaxShots;

            const activeAthletesForMonitor = monitorEnv === "team"
              ? (leaderboardTeamAthletes.length > 0 ? leaderboardTeamAthletes : currentTournamentDoc?.teamAthletes || masterAthletes)
              : (leaderboardAthletes.length > 0 ? leaderboardAthletes : currentTournamentDoc?.athletes || masterAthletes);

            // Run qualification calculateRounds
            const roundResults = calculateRounds(
              activeAthletesForMonitor,
              currentDistances,
              effectiveShotsCount,
              effectiveDirectMaxPoints
            );

            // Get ordered athletes for this round
            let orderedAthletesForRound: Athlete[] = monitorEnv === "team"
              ? activeAthletesForMonitor.filter(a => a.isPrimaryTeam)
              : [...activeAthletesForMonitor];

            // If subsequent round, filter only qualified athletes
            if (selectedMonitorRoundIdx > 0) {
              const roundRes = roundResults[selectedMonitorRoundIdx];
              if (roundRes && roundRes.qualifiedIds) {
                const qualifiedSet = new Set(roundRes.qualifiedIds);
                orderedAthletesForRound = orderedAthletesForRound.filter(a => qualifiedSet.has(a.id));
              }
            }

            // Determine sorting strategy criteria for this round, defaulting to "sbd" to match the Sorter settings perfectly
            const activeCriteria = currentTournamentDoc?.roundShootingOrderCriteria?.[activeRound.id] || "sbd";

            // Sort athletes/clubs dynamically based on activeCriteria
            if (monitorEnv === "team") {
              const clubsSet = new Set<string>(
                orderedAthletesForRound
                  .filter((a) => a.team && a.team.trim() !== "" && a.team.trim() !== "Tự do")
                  .map((a) => a.team!.trim())
              );
              const sortedClubs = Array.from(clubsSet);

              const getClubPrevScore = (clubName: string) => {
                const mainShooters = orderedAthletesForRound.filter(
                  (a) => a.team?.trim() === clubName
                );
                if (selectedMonitorRoundIdx === 0) {
                  let total = 0;
                  for (const shooter of mainShooters) {
                    total += calculateTotalScore(shooter, currentDistances);
                  }
                  return total;
                } else {
                  const prevRoundRes = roundResults[selectedMonitorRoundIdx - 1];
                  if (!prevRoundRes || !prevRoundRes.scores) return 0;
                  let total = 0;
                  for (const shooter of mainShooters) {
                    const sc = prevRoundRes.scores[shooter.id];
                    if (sc) {
                      total += sc.displayScoreWithSolo !== undefined ? sc.displayScoreWithSolo : sc.displayScore;
                    }
                  }
                  return total;
                }
              };

              sortedClubs.sort((clubA, clubB) => {
                const sbdA = (currentTournamentDoc?.teamDrawnNumbers || {})[clubA] || 999999;
                const sbdB = (currentTournamentDoc?.teamDrawnNumbers || {})[clubB] || 999999;

                if (selectedMonitorRoundIdx === 0 || activeCriteria === "sbd") {
                  return sbdA - sbdB;
                }

                const scoreA = getClubPrevScore(clubA);
                const scoreB = getClubPrevScore(clubB);

                if (activeCriteria === "points_asc") {
                  if (scoreA !== scoreB) {
                    return scoreA - scoreB;
                  }
                  return sbdA - sbdB;
                } else {
                  // points_desc
                  if (scoreA !== scoreB) {
                    return scoreB - scoreA;
                  }
                  return sbdA - sbdB;
                }
              });

              let sortedTeamAthletes: Athlete[] = [];
              for (const club of sortedClubs) {
                const clubShooters = orderedAthletesForRound.filter(
                  (a) => a.team?.trim() === club
                );
                clubShooters.sort((a, b) => a.name.localeCompare(b.name));
                sortedTeamAthletes.push(...clubShooters);
              }
              orderedAthletesForRound = sortedTeamAthletes;
            } else {
              orderedAthletesForRound.sort((a, b) => {
                const sbdA = drawnNumbers[a.id] || 999999;
                const sbdB = drawnNumbers[b.id] || 999999;

                if (activeCriteria === "sbd") {
                  return sbdA - sbdB;
                }

                let scoreA = 0;
                let scoreB = 0;

                if (selectedMonitorRoundIdx === 0) {
                  scoreA = calculateTotalScore(a, currentDistances);
                  scoreB = calculateTotalScore(b, currentDistances);
                } else {
                  const prevRoundRes = roundResults[selectedMonitorRoundIdx - 1];
                  if (prevRoundRes && prevRoundRes.scores) {
                    const scA = prevRoundRes.scores[a.id];
                    const scB = prevRoundRes.scores[b.id];
                    scoreA = scA ? (scA.displayScoreWithSolo !== undefined ? scA.displayScoreWithSolo : scA.displayScore) : 0;
                    scoreB = scB ? (scB.displayScoreWithSolo !== undefined ? scB.displayScoreWithSolo : scB.displayScore) : 0;
                  }
                }

                if (activeCriteria === "points_asc") {
                  if (scoreA !== scoreB) {
                    return scoreA - scoreB;
                  }
                  return sbdA - sbdB;
                } else {
                  // points_desc
                  if (scoreA !== scoreB) {
                    return scoreB - scoreA;
                  }
                  return sbdA - sbdB;
                }
              });
            }

            const squadClubs: string[] = [];
            if (monitorEnv === "team") {
              orderedAthletesForRound.forEach(a => {
                if (a.team && !squadClubs.includes(a.team.trim())) {
                  squadClubs.push(a.team.trim());
                }
              });
            }

            // Define packedSquads for parallel team mode
            let packedSquads: Array<Array<Athlete | null>> = [];
            if (monitorEnv === "team" && teamLaneLayoutType === "parallel") {
              // 1. Group orderedAthletesForRound by team, preserving the sorted team order
              const teamsInOrder: Array<{ teamName: string; athletes: Athlete[] }> = [];
              orderedAthletesForRound.forEach(athlete => {
                const teamName = athlete.team?.trim() || "Tự do";
                let existing = teamsInOrder.find(t => t.teamName === teamName);
                if (!existing) {
                  existing = { teamName, athletes: [] };
                  teamsInOrder.push(existing);
                }
                existing.athletes.push(athlete);
              });

              // 2. Pack teams into squads of size laneCapacity using greedy bin packing with lookahead
              const remainingTeams = [...teamsInOrder];

              while (remainingTeams.length > 0) {
                const currentSquad: Array<Athlete | null> = Array(laneCapacity).fill(null);
                let currentEmptyIdx = 0;

                while (currentEmptyIdx < laneCapacity && remainingTeams.length > 0) {
                  const spaceLeft = laneCapacity - currentEmptyIdx;
                  // Search for the first team that fits in the remaining space of this squad
                  let foundTeamIdx = -1;
                  for (let i = 0; i < remainingTeams.length; i++) {
                    if (remainingTeams[i].athletes.length <= spaceLeft) {
                      foundTeamIdx = i;
                      break;
                    }
                  }

                  if (foundTeamIdx !== -1) {
                    // Found a team that fits! Place its athletes
                    const teamToPlace = remainingTeams[foundTeamIdx];
                    teamToPlace.athletes.forEach((ath, offset) => {
                      currentSquad[currentEmptyIdx + offset] = ath;
                    });
                    currentEmptyIdx += teamToPlace.athletes.length;
                    // Remove from remaining list
                    remainingTeams.splice(foundTeamIdx, 1);
                  } else {
                    // No remaining team fits in this squad.
                    // If currentEmptyIdx === 0, force-place up to laneCapacity
                    if (currentEmptyIdx === 0) {
                      const teamToPlace = remainingTeams[0];
                      const fitCount = Math.min(teamToPlace.athletes.length, laneCapacity);
                      for (let offset = 0; offset < fitCount; offset++) {
                        currentSquad[offset] = teamToPlace.athletes[offset];
                      }
                      currentEmptyIdx = fitCount;
                      
                      if (teamToPlace.athletes.length > laneCapacity) {
                        teamToPlace.athletes = teamToPlace.athletes.slice(laneCapacity);
                      } else {
                        remainingTeams.shift();
                      }
                    } else {
                      // Leave remaining lanes vacant and start next squad
                      break;
                    }
                  }
                }
                packedSquads.push(currentSquad);
              }
            }

            const totalSquads = monitorEnv === "team"
              ? (teamLaneLayoutType === "sequential"
                  ? (Math.ceil(squadClubs.length / laneCapacity) || 1)
                  : (packedSquads.length || 1)
                )
              : (Math.ceil(orderedAthletesForRound.length / laneCapacity) || 1);

            const getSquadLanes = (s: number) => {
              const lanes: Array<{
                laneNum: number;
                name: string | null;
                sbd: number | null;
                isClub: boolean;
                team?: string | null;
              }> = [];
              for (let idx = 0; idx < laneCapacity; idx++) {
                const laneNum = idx + 1;
                if (monitorEnv === "team" && teamLaneLayoutType === "sequential") {
                  const clubName = squadClubs[(s - 1) * laneCapacity + idx] || null;
                  const clubSbd = clubName ? ((currentTournamentDoc?.teamDrawnNumbers || {})[clubName] || null) : null;
                  lanes.push({
                    laneNum,
                    name: clubName,
                    sbd: clubSbd,
                    isClub: true
                  });
                } else if (monitorEnv === "team" && teamLaneLayoutType === "parallel") {
                  const squadAthletes = packedSquads[s - 1] || [];
                  const activeAthleteOnLane = squadAthletes[idx] || null;
                  const sbd = activeAthleteOnLane ? (drawnNumbers[activeAthleteOnLane.id] || null) : null;
                  lanes.push({
                    laneNum,
                    name: activeAthleteOnLane ? activeAthleteOnLane.name : null,
                    sbd,
                    isClub: false,
                    team: activeAthleteOnLane ? activeAthleteOnLane.team : null
                  });
                } else {
                  const athleteIndex = (s - 1) * laneCapacity + idx;
                  const activeAthleteOnLane = orderedAthletesForRound[athleteIndex] || null;
                  const sbd = activeAthleteOnLane ? (drawnNumbers[activeAthleteOnLane.id] || null) : null;
                  lanes.push({
                    laneNum,
                    name: activeAthleteOnLane ? activeAthleteOnLane.name : null,
                    sbd,
                    isClub: false,
                    team: activeAthleteOnLane ? activeAthleteOnLane.team : null
                  });
                }
              }
              return lanes;
            };

            // Generate mini leaderboard data
            let miniLeaderboardData: any[] = [];
            
            if (monitorEnv === "team") {
              const clubsSet = new Set<string>(
                activeAthletesForMonitor
                  .filter((a) => a.team && a.team.trim() !== "" && a.team.trim() !== "Tự do" && a.isPrimaryTeam)
                  .map((a) => a.team!.trim())
              );
              const clubsList = Array.from(clubsSet);
              
              const teamCumulativeScores: Record<string, number> = {};
              const teamCumulativeHits: Record<string, number> = {};
              const teamRoundResultsLocal: any[] = [];
              const primaryAthletes = activeAthletesForMonitor.filter((a) => a.isPrimaryTeam);

              let activeTeams = [...clubsList];

              for (let r = 0; r <= selectedMonitorRoundIdx; r++) {
                const dist = currentDistances[r];
                if (!dist) continue;
                
                const teamRoundScores: Record<string, {
                  roundHits: number;
                  roundScore: number;
                  cumulativeHits: number;
                  cumulativeScore: number;
                  displayScore: number;
                  accuracy: number;
                  displayScoreWithSolo: number;
                  hasUnshotMember: boolean;
                  hasAnySoloEntered: boolean;
                  teamSoloHits: number;
                }> = {};

                const currentRoundTeams = clubsList.filter((tName) => activeTeams.includes(tName));

                currentRoundTeams.forEach((teamName) => {
                  const members = primaryAthletes.filter((a) => a.team?.trim() === teamName);
                  const activeMembers = members.filter(memb => memb.status !== "Bỏ thi");

                  const hasUnshotMember = activeMembers.some((memb) => {
                    const hits = memb.scores[dist.id] || [];
                    return !hits || hits.length === 0 || hits.every((v) => v === null || v === undefined);
                  });

                  let roundHits = 0;
                  let totalSoloHits = 0;
                  let hasAnySoloEntered = false;

                  activeMembers.forEach((memb) => {
                    const hits = memb.scores[dist.id] || [];
                    roundHits += getHitCount(hits);
                    const soloVal = memb.soloHits?.[dist.id];
                    if (soloVal !== undefined && soloVal !== null) {
                      totalSoloHits += soloVal;
                      hasAnySoloEntered = true;
                    }
                  });

                  const roundScore = roundHits * dist.multiplier;
                  const prevScore = teamCumulativeScores[teamName] || 0;
                  const prevHits = teamCumulativeHits[teamName] || 0;

                  const currCumulativeScore = prevScore + roundScore;
                  const currCumulativeHits = prevHits + roundHits;

                  teamCumulativeScores[teamName] = currCumulativeScore;
                  teamCumulativeHits[teamName] = currCumulativeHits;

                  const displayScore = dist.isCumulative ? currCumulativeScore : roundScore;
                  const displayHits = dist.isCumulative ? currCumulativeHits : roundHits;

                  let accuracy = 0;
                  let totalPossPoints = 0;
                  let totalPossShots = 0;

                  activeMembers.forEach((memb) => {
                    if (dist.isCumulative) {
                      for (let i = 0; i <= r; i++) {
                        const distI = currentDistances[i];
                        if (!distI) continue;
                        const wasShot = memb.scores[distI.id] && memb.scores[distI.id].length > 0 && memb.scores[distI.id].some(v => v !== null && v !== undefined);
                        if (wasShot) {
                          if (effectiveDirectMaxPoints !== undefined && effectiveDirectMaxPoints > 0) {
                            totalPossPoints += effectiveDirectMaxPoints * distI.multiplier;
                          } else {
                            totalPossShots += effectiveShotsCount;
                          }
                        }
                      }
                    } else {
                      const wasShot = memb.scores[dist.id] && memb.scores[dist.id].length > 0 && memb.scores[dist.id].some(v => v !== null && v !== undefined);
                      if (wasShot) {
                        if (effectiveDirectMaxPoints !== undefined && effectiveDirectMaxPoints > 0) {
                          totalPossPoints += effectiveDirectMaxPoints * dist.multiplier;
                        } else {
                          totalPossShots += effectiveShotsCount;
                        }
                      } else {
                        if (effectiveDirectMaxPoints !== undefined && effectiveDirectMaxPoints > 0) {
                          totalPossPoints += effectiveDirectMaxPoints * dist.multiplier;
                        } else {
                          totalPossShots += effectiveShotsCount;
                        }
                      }
                    }
                  });

                  if (effectiveDirectMaxPoints !== undefined && effectiveDirectMaxPoints > 0) {
                    if (totalPossPoints === 0) {
                      totalPossPoints = activeMembers.length * effectiveDirectMaxPoints * dist.multiplier;
                    }
                    accuracy = totalPossPoints > 0 ? (displayScore / totalPossPoints) * 100 : 0;
                  } else {
                    if (totalPossShots === 0) {
                      const totalShotsCountInRounds = dist.isCumulative ? (r + 1) * effectiveShotsCount : effectiveShotsCount;
                      totalPossShots = activeMembers.length * totalShotsCountInRounds;
                    }
                    accuracy = totalPossShots > 0 ? (displayHits / totalPossShots) * 100 : 0;
                  }

                  const displayScoreWithSolo = displayScore + (totalSoloHits * 0.001);

                  teamRoundScores[teamName] = {
                    roundHits,
                    roundScore,
                    cumulativeHits: currCumulativeHits,
                    cumulativeScore: currCumulativeScore,
                    displayScore,
                    accuracy,
                    displayScoreWithSolo,
                    hasUnshotMember,
                    hasAnySoloEntered,
                    teamSoloHits: totalSoloHits,
                  };
                });

                let nextRoundTeams: string[] = [];
                let currentRoundEliminatedTeams: string[] = [];

                if (dist.isElimination) {
                  const sortedTeams = [...currentRoundTeams].sort((tA: string, tB: string) => {
                    const scoreA = teamRoundScores[tA]?.displayScoreWithSolo || 0;
                    const scoreB = teamRoundScores[tB]?.displayScoreWithSolo || 0;
                    if (scoreB !== scoreA) {
                      return scoreB - scoreA;
                    }
                    const accA = teamRoundScores[tA]?.accuracy || 0;
                    const accB = teamRoundScores[tB]?.accuracy || 0;
                    return accB - accA;
                  });

                  let N = sortedTeams.length;
                  const elimVal = dist.eliminationValue || 0;

                  if (dist.eliminationType === "count") {
                    N = Math.min(sortedTeams.length, elimVal);
                  } else {
                    N = Math.max(1, Math.round(sortedTeams.length * (elimVal / 100)));
                  }

                  if (sortedTeams.length <= N) {
                    nextRoundTeams = [...sortedTeams];
                    currentRoundEliminatedTeams = [];
                  } else {
                    const cutoffBaseScore = teamRoundScores[sortedTeams[N - 1]]?.displayScore || 0;

                    const sures = sortedTeams.filter((t) => (teamRoundScores[t]?.displayScore || 0) > cutoffBaseScore);
                    const contenders = sortedTeams.filter((t) => (teamRoundScores[t]?.displayScore || 0) === cutoffBaseScore);
                    const purelyEliminated = sortedTeams.filter((t) => (teamRoundScores[t]?.displayScore || 0) < cutoffBaseScore);

                    const slotsLeft = N - sures.length;
                    const anyTeamUnfinished = currentRoundTeams.some((t) => teamRoundScores[t]?.hasUnshotMember);

                    if (anyTeamUnfinished) {
                      nextRoundTeams = [...currentRoundTeams];
                      currentRoundEliminatedTeams = [];
                    } else {
                      if (dist.isSolo && slotsLeft > 0 && slotsLeft < contenders.length) {
                        const finishedContendersWithNoSolo = contenders.filter((t) => !teamRoundScores[t]?.hasAnySoloEntered);

                        if (finishedContendersWithNoSolo.length > 0) {
                          nextRoundTeams = [...sures, ...contenders];
                          currentRoundEliminatedTeams = [];
                        } else {
                          const contendersWithSolo = contenders.map((t) => ({
                            id: t,
                            soloHits: teamRoundScores[t]?.teamSoloHits || 0,
                          }));

                          contendersWithSolo.sort((a, b) => b.soloHits - a.soloHits);

                          const winnerScoreBoundary = contendersWithSolo[slotsLeft - 1].soloHits;
                          const loserScoreBoundary = contendersWithSolo[slotsLeft].soloHits;

                          if (winnerScoreBoundary === loserScoreBoundary) {
                            const resoloCandidates = contendersWithSolo.filter((c) => c.soloHits === winnerScoreBoundary).map((c) => c.id);
                            nextRoundTeams = [...sures, ...resoloCandidates];
                            currentRoundEliminatedTeams = [...purelyEliminated];
                          } else {
                            const soloPassed = contendersWithSolo.slice(0, slotsLeft).map((c) => c.id);
                            const soloFailed = contendersWithSolo.slice(slotsLeft).map((c) => c.id);

                            nextRoundTeams = [...sures, ...soloPassed];
                            currentRoundEliminatedTeams = [...soloFailed, ...purelyEliminated];
                          }
                        }
                      } else {
                        nextRoundTeams = [...sures, ...contenders];
                        currentRoundEliminatedTeams = [...purelyEliminated];
                      }
                    }
                  }
                } else {
                  nextRoundTeams = [...currentRoundTeams];
                  currentRoundEliminatedTeams = [];
                }

                teamRoundResultsLocal.push({
                  distance: dist,
                  roundIndex: r,
                  qualifiedTeams: [...currentRoundTeams],
                  eliminatedTeams: currentRoundEliminatedTeams,
                  scores: teamRoundScores,
                });

                activeTeams = [...nextRoundTeams];
              }

              const activeRoundResTeam = teamRoundResultsLocal[selectedMonitorRoundIdx];
              miniLeaderboardData = clubsList.map((clubName) => {
                const scoreObj = activeRoundResTeam?.scores?.[clubName];
                const sbd = (currentTournamentDoc?.teamDrawnNumbers || {})[clubName] || null;
                
                const isQualified = activeRoundResTeam?.qualifiedTeams?.includes(clubName) && !activeRoundResTeam?.eliminatedTeams?.includes(clubName);
                const isEliminated = activeRoundResTeam?.eliminatedTeams?.includes(clubName);
                
                let statusStr = "";
                if (isQualified) {
                  statusStr = isEng ? "Qualified" : "Vào vòng sau";
                } else if (isEliminated) {
                  statusStr = isEng ? "Eliminated" : "Bị loại";
                } else {
                  statusStr = isEng ? "Competing" : "Đang đấu";
                }

                const prevRoundResTeam = selectedMonitorRoundIdx > 0 ? teamRoundResultsLocal[selectedMonitorRoundIdx - 1] : null;
                const wasAlreadyEliminated = prevRoundResTeam && !prevRoundResTeam.qualifiedTeams?.includes(clubName);

                if (wasAlreadyEliminated) {
                  statusStr = isEng ? "Eliminated previously" : "Bị loại vòng trước";
                }

                const mainShooters = primaryAthletes.filter((a) => a.team?.trim() === clubName);
                mainShooters.sort((a, b) => a.name.localeCompare(b.name));

                return {
                  id: clubName,
                  name: clubName,
                  isClub: true,
                  sbd,
                  roundHits: scoreObj?.roundHits ?? 0,
                  roundScore: scoreObj?.roundScore ?? 0,
                  cumulativeHits: scoreObj?.cumulativeHits ?? 0,
                  cumulativeScore: scoreObj?.cumulativeScore ?? 0,
                  displayScore: scoreObj?.displayScore ?? 0,
                  displayScoreWithSolo: scoreObj?.displayScoreWithSolo ?? 0,
                  statusStr,
                  isQualified,
                  isEliminated,
                  wasAlreadyEliminated,
                  mainShooters,
                };
              }).sort((a, b) => {
                if (a.wasAlreadyEliminated && !b.wasAlreadyEliminated) return 1;
                if (!a.wasAlreadyEliminated && b.wasAlreadyEliminated) return -1;
                
                if (a.displayScoreWithSolo !== b.displayScoreWithSolo) {
                  return b.displayScoreWithSolo - a.displayScoreWithSolo;
                }
                return (a.sbd || 999999) - (b.sbd || 999999);
              });
            } else {
              const activeRoundRes = roundResults[selectedMonitorRoundIdx];
              miniLeaderboardData = activeAthletesForMonitor.map(a => {
                const scoreObj = activeRoundRes?.scores?.[a.id];
                const sbd = drawnNumbers[a.id] || null;
                
                const isQualified = activeRoundRes?.qualifiedIds?.includes(a.id);
                const isEliminated = activeRoundRes?.eliminatedIds?.includes(a.id);
                
                let statusStr = "";
                if (isQualified) {
                  statusStr = isEng ? "Qualified" : "Vào vòng sau";
                } else if (isEliminated) {
                  statusStr = isEng ? "Eliminated" : "Bị loại";
                } else {
                  statusStr = isEng ? "Competing" : "Đang đấu";
                }

                const prevRoundRes = selectedMonitorRoundIdx > 0 ? roundResults[selectedMonitorRoundIdx - 1] : null;
                const wasAlreadyEliminated = prevRoundRes && !prevRoundRes.qualifiedIds?.includes(a.id);

                if (wasAlreadyEliminated) {
                  statusStr = isEng ? "Eliminated previously" : "Bị loại vòng trước";
                }

                return {
                  ...a,
                  sbd,
                  roundHits: scoreObj?.roundHits ?? 0,
                  roundScore: scoreObj?.roundScore ?? 0,
                  cumulativeHits: scoreObj?.cumulativeHits ?? 0,
                  cumulativeScore: scoreObj?.cumulativeScore ?? 0,
                  displayScore: scoreObj?.displayScore ?? 0,
                  displayScoreWithSolo: scoreObj?.displayScoreWithSolo ?? 0,
                  statusStr,
                  isQualified,
                  isEliminated,
                  wasAlreadyEliminated
                };
              }).sort((a, b) => {
                if (a.wasAlreadyEliminated && !b.wasAlreadyEliminated) return 1;
                if (!a.wasAlreadyEliminated && b.wasAlreadyEliminated) return -1;
                
                if (a.displayScoreWithSolo !== b.displayScoreWithSolo) {
                  return b.displayScoreWithSolo - a.displayScoreWithSolo;
                }
                return (a.sbd || 999999) - (b.sbd || 999999);
              });
            }

            return (
              <div className="space-y-6 animate-fadeIn">
                {/* Telemetry Info summary & Round Switcher */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-150 dark:border-slate-800 p-5 space-y-4">
                  <div className="flex items-center gap-2.5 pb-2 border-b border-gray-100 dark:border-slate-850 justify-between">
                    <div className="flex items-center gap-2.5">
                      <Activity className="w-5 h-5 text-rose-500 animate-pulse" />
                      <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                        {isEng ? "Real-time Lane Telemetry Monitor" : "GIÁM SÁT TIẾN ĐỘ BÀN SÚNG THỜI GIAN THỰC (LANE MONITOR)"}
                      </h2>
                    </div>

                    {/* Environment selector for Combined Tournaments inside Lane Monitor */}
                    {currentTournamentDoc?.tournamentType === "combined" && (
                      <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-gray-200/50 dark:border-slate-800 shrink-0">
                        <button
                          onClick={() => {
                            updateMonitorConfig(0, 1, "individual");
                          }}
                          className={`flex-1 py-1 px-2.5 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                            monitorEnv === "individual"
                              ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                              : "text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200"
                          }`}
                        >
                          <span>{isEng ? "Individual" : "Cá Nhân"}</span>
                        </button>
                        <button
                          onClick={() => {
                            updateMonitorConfig(0, 1, "team");
                          }}
                          className={`flex-1 py-1 px-2.5 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                            monitorEnv === "team"
                              ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                              : "text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200"
                          }`}
                        >
                          <span>{isEng ? "Team" : "Đồng Đội"}</span>
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2.5">
                    <span className="block text-[10px] font-black text-gray-550 uppercase tracking-widest leading-none">
                      {isEng ? "CHOOSE TOURNAMENT ROUND:" : "CHỌN VÒNG THI ĐẤU ĐỂ GIÁM SÁT:"}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {currentDistances.map((dist, rIdx) => (
                        <button
                          key={dist.id}
                          type="button"
                          onClick={() => {
                            updateMonitorConfig(rIdx, 1, monitorEnv);
                          }}
                          className={`px-4.5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer border ${
                            selectedMonitorRoundIdx === rIdx
                              ? "bg-rose-600 text-white border-rose-500 shadow-md scale-[1.02]"
                              : "bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-850 hover:bg-gray-50"
                          }`}
                        >
                          {isEng ? `Round ${rIdx + 1}: ${dist.distance}` : `Vòng ${rIdx + 1}: ${dist.distance}`}
                        </button>
                      ))}
                    </div>

                    {/* MC & BTC Information Panel */}
                    <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-gray-150 dark:border-slate-850 space-y-3">
                      <div className="flex items-center gap-2 border-b border-gray-200/60 dark:border-slate-800 pb-2">
                        <Megaphone className="w-4 h-4 text-rose-500 animate-pulse" />
                        <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                          {isEng ? "MC & ORGANIZER ANNOUNCEMENT INFO" : "THÔNG TIN CÔNG BỐ CHO BTC & MC (MICROPHONE)"}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {/* 1. Distance */}
                        <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-gray-100 dark:border-slate-850 flex flex-col gap-1">
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{isEng ? "Distance" : "Cự ly bắn"}</span>
                          <span className="text-xs font-extrabold text-slate-800 dark:text-white flex items-center gap-1">
                            <Target className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            {activeRound.distance}
                          </span>
                        </div>

                        {/* 2. Total Shots */}
                        <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-gray-100 dark:border-slate-850 flex flex-col gap-1">
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{isEng ? "Shot Count" : "Số phát bắn"}</span>
                          <span className="text-xs font-extrabold text-slate-800 dark:text-white flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            {effectiveShotsCount} {isEng ? "shots" : "viên đạn / lượt"}
                          </span>
                        </div>

                        {/* 3. Multiplier */}
                        <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-gray-100 dark:border-slate-850 flex flex-col gap-1">
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{isEng ? "Max Ring Multiplier" : "Hệ số điểm vòng"}</span>
                          <span className="text-xs font-extrabold text-slate-800 dark:text-white flex items-center gap-1">
                            <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            {isEng ? `x${activeRound.multiplier} points` : `Vòng nhân x${activeRound.multiplier}`}
                          </span>
                        </div>

                        {/* 4. Score mechanism */}
                        <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-gray-100 dark:border-slate-850 flex flex-col gap-1 col-span-2 sm:col-span-1">
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{isEng ? "Scoring Mechanism" : "Cơ chế tính điểm"}</span>
                          <span className="text-xs font-extrabold text-slate-800 dark:text-white flex items-center gap-1 truncate" title={activeRound.isCumulative ? (isEng ? "Cumulative" : "Cộng dồn các vòng") : (isEng ? "Independent" : "Độc lập vòng này")}>
                            <TrendingUp className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            {activeRound.isCumulative ? (isEng ? "Cumulative" : "Cộng dồn các vòng") : (isEng ? "Independent" : "Độc lập vòng này")}
                          </span>
                        </div>

                        {/* 5. Elimination */}
                        <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-gray-100 dark:border-slate-850 flex flex-col gap-1 col-span-2 sm:col-span-1 lg:col-span-1">
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{isEng ? "Elimination Rule" : "Thể thức loại đấu"}</span>
                          <span className="text-xs font-extrabold text-slate-800 dark:text-white flex items-center gap-1 truncate" title={activeRound.isElimination ? (activeRound.eliminationType === "percent" ? (isEng ? `Keep Top ${activeRound.eliminationValue}%` : `Giữ lại Top ${activeRound.eliminationValue}%`) : (isEng ? `Keep Top ${activeRound.eliminationValue}` : `Giữ lại Top ${activeRound.eliminationValue} VĐV`)) : (isEng ? "No Elimination" : "Không loại (Đấu tự do)")}>
                            <Shield className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                            {activeRound.isElimination 
                              ? (activeRound.eliminationType === "percent" 
                                  ? (isEng ? `Top ${activeRound.eliminationValue}%` : `Lấy Top ${activeRound.eliminationValue}%`)
                                  : (isEng ? `Top ${activeRound.eliminationValue} shooters` : `Lấy Top ${activeRound.eliminationValue} VĐV`))
                              : (isEng ? "No Elimination" : "Giữ nguyên quân số")}
                          </span>
                        </div>

                        {/* 6. Solo Shootout */}
                        <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-gray-100 dark:border-slate-850 flex flex-col gap-1 col-span-2 sm:col-span-1 lg:col-span-1">
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{isEng ? "Solo Shoot-off" : "Phần đấu phụ Solo"}</span>
                          <span className="text-xs font-extrabold text-slate-800 dark:text-white flex items-center gap-1 truncate" title={activeRound.isSolo ? (isEng ? `Enabled (${activeRound.soloShotCount || effectiveShotsCount} shots)` : `Disabled`) : (isEng ? "Not Configured" : "Không áp dụng")}>
                            <Zap className={`w-3.5 h-3.5 shrink-0 ${activeRound.isSolo ? "text-purple-500 animate-pulse" : "text-gray-400"}`} />
                            {activeRound.isSolo 
                              ? (isEng ? `Enabled (${activeRound.soloShotCount || effectiveShotsCount}s)` : `Có (${activeRound.soloShotCount || effectiveShotsCount} phát)`)
                              : (isEng ? "Disabled" : "Không có")}
                          </span>
                        </div>
                      </div>

                      {/* Announcement helper text for MC */}
                      <div className="p-3 bg-rose-50/30 dark:bg-rose-950/10 border border-rose-100/30 dark:border-rose-900/10 rounded-lg text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed flex items-start gap-2.5">
                        <Users className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-extrabold text-rose-700 dark:text-rose-400 block mb-0.5">{isEng ? "MC Announcement Script Suggestion:" : "MC loa phát thanh gợi ý:"}</span>
                          {isEng ? (
                            <span>
                              "Welcome everyone, we are now entering <strong>Round {selectedMonitorRoundIdx + 1} ({activeRound.distance})</strong>. All athletes will perform <strong>{effectiveShotsCount} shots</strong>. Scoring is calculated as <strong>{activeRound.isCumulative ? "Cumulative of all rounds" : "Independent round score"}</strong>. {activeRound.isElimination ? `At the end of this round, only the top ${activeRound.eliminationType === "percent" ? `${activeRound.eliminationValue}%` : `${activeRound.eliminationValue} athletes`} will qualify for the next round.` : "No athletes will be eliminated in this round."} Squad layout strategy is <strong>{activeCriteria === "sbd" ? "by SBD" : activeCriteria === "points_asc" ? "by points ascending (lower shot first)" : "by points descending (higher shot first)"}</strong>.{activeRound.isSolo ? ` In case of a tie at the elimination boundary, a Solo Shoot-off of ${activeRound.soloShotCount || effectiveShotsCount} shot(s) will be carried out to decide the winner.` : ""}"
                            </span>
                          ) : (
                            <span>
                              "Kính thưa toàn thể quý khán giả và các vận động viên, chúng ta chuẩn bị bước vào thi đấu <strong>Vòng {selectedMonitorRoundIdx + 1} cự ly {activeRound.distance}</strong>. Trong vòng này, mỗi vận động viên thực hiện bắn <strong>{effectiveShotsCount} phát đạn</strong>. Thể thức tính điểm của vòng đấu là <strong>{activeRound.isCumulative ? "Cộng dồn điểm số liên lũy" : "Tính điểm độc lập vòng này"}</strong>. {activeRound.isElimination ? `Kết thúc vòng đấu này, BTC sẽ chỉ giữ lại ${activeRound.eliminationType === "percent" ? `Top ${activeRound.eliminationValue}%` : `Top ${activeRound.eliminationValue} vận động viên`} có điểm số xuất sắc nhất để tiến vào vòng sau.` : "Vòng đấu này không áp dụng loại trừ, tất cả vận động viên đều tiếp tục đồng hành vào các vòng trong."} Thứ tự sắp xếp bệ bắn lượt thi đấu được áp dụng theo quy chế: <strong>{activeCriteria === "sbd" ? "Thứ tự Số báo danh (SBD) bốc thăm" : activeCriteria === "points_asc" ? "Thứ tự Điểm số tăng dần (Thấp bắn trước, Cao bắn sau)" : "Thứ tự Điểm số giảm dần (Cao bắn trước, Thấp bắn sau)"}</strong>.{activeRound.isSolo ? ` Đặc biệt, nếu có điểm số bằng nhau ở ranh giới loại trừ, loạt bắn phụ Solo phân định với ${activeRound.soloShotCount || effectiveShotsCount} phát đạn sẽ được thực hiện để tìm ra vận động viên xuất sắc nhất đi tiếp.` : ""}"
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Squad/Heat Navigation Controls */}
                <div className="bg-white dark:bg-slate-900 p-4.5 rounded-2xl border border-gray-150 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="space-y-1 text-center sm:text-left">
                    <span className="block text-[9px] font-black text-gray-500 uppercase tracking-widest leading-none">
                      {isEng ? "CURRENT ACTIVE SQUAD:" : "SƠ ĐỒ BÀN BẮN THEO LƯỢT THI ĐẤU:"}
                    </span>
                    <div className="text-sm font-black text-slate-800 dark:text-white flex items-center justify-center sm:justify-start gap-2">
                      <span>{isEng ? `SQUAD ${selectedMonitorSquad} of ${totalSquads}` : `LƯỢT BẮN SỐ ${selectedMonitorSquad} / ${totalSquads}`}</span>
                      <span className="text-xs font-normal text-gray-450">&bull; {orderedAthletesForRound.length} {isEng ? "athletes" : "vận động viên/CLB"}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => {
                        const nextSquad = Math.max(1, selectedMonitorSquad - 1);
                        updateMonitorConfig(selectedMonitorRoundIdx, nextSquad, monitorEnv);
                      }}
                      disabled={selectedMonitorSquad <= 1}
                      className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        selectedMonitorSquad <= 1
                          ? "opacity-40 cursor-not-allowed border-gray-200 text-gray-400 bg-gray-50 dark:bg-slate-900"
                          : "bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-750 text-gray-700 dark:text-white hover:bg-gray-50"
                      }`}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>{isEng ? "Prev" : "LƯỢT TRƯỚC"}</span>
                    </button>

                    <button
                      onClick={() => {
                        const nextSquad = Math.min(totalSquads, selectedMonitorSquad + 1);
                        updateMonitorConfig(selectedMonitorRoundIdx, nextSquad, monitorEnv);
                      }}
                      disabled={selectedMonitorSquad >= totalSquads}
                      className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        selectedMonitorSquad >= totalSquads
                          ? "opacity-40 cursor-not-allowed border-gray-200 text-gray-400 bg-gray-50 dark:bg-slate-900"
                          : "bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-750 text-gray-700 dark:text-white hover:bg-gray-50"
                      }`}
                    >
                      <span>{isEng ? "Next" : "LƯỢT SAU"}</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Main Viewport: Grid layout + Mini Leaderboard */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left block (Lanes Grid) */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="flex justify-between items-center px-1">
                      <span className="text-[10px] font-black text-gray-550 uppercase tracking-widest">
                        {isEng ? `Lanes configuration (Capacity: ${laneCapacity})` : `Sơ đồ làn bắn (Sức chứa: ${laneCapacity})`}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {Array.from({ length: laneCapacity }).map((_, idx) => {
                        const laneNum = idx + 1;

                         if (monitorEnv === "team" && teamLaneLayoutType === "sequential") {
                           const clubName = squadClubs[(selectedMonitorSquad - 1) * laneCapacity + idx] || null;
                           const clubSbd = clubName ? ((currentTournamentDoc?.teamDrawnNumbers || {})[clubName] || null) : null;
                           const clubShooters = clubName 
                             ? activeAthletesForMonitor.filter(a => a.team?.trim() === clubName && a.isPrimaryTeam)
                             : [];

                           return (
                             <div 
                               key={`lane-${laneNum}`}
                               className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 min-h-[160px] ${
                                 clubName 
                                   ? "bg-white dark:bg-slate-900 border-indigo-500 shadow-sm ring-1 ring-indigo-500/10" 
                                   : "bg-slate-50 dark:bg-slate-950/30 border-gray-150 dark:border-slate-800 opacity-60"
                               }`}
                             >
                               <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-slate-850">
                                 <span className="text-[10px] font-black tracking-widest text-slate-550 uppercase">
                                   LANE {laneNum}
                                 </span>
                                 <span className={`text-[8.5px] font-black uppercase px-2 py-0.5 rounded-full ${
                                   clubName
                                     ? "bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 border border-indigo-200"
                                     : "bg-gray-100 dark:bg-slate-800 text-gray-400"
                                 }`}>
                                   {clubName ? (isEng ? "CLUB ACTIVE" : "CLB ĐANG BẮN") : (isEng ? "VACANT" : "TRỐNG")}
                                 </span>
                               </div>

                               {clubName ? (
                                 <div className="space-y-3">
                                   <div>
                                     <span className="block text-[8.5px] font-black text-indigo-600 uppercase tracking-wider font-mono">
                                       SBD CLB: {clubSbd ? String(clubSbd).padStart(3, "0") : "---"}
                                     </span>
                                     <span className="text-sm font-black text-slate-800 dark:text-white block mt-0.5 truncate">
                                       {clubName}
                                     </span>
                                     <span className="text-[9px] text-gray-500 block">
                                       {isEng ? `${clubShooters.length} Main Shooters` : `${clubShooters.length} VĐV Bắn Chính`}
                                     </span>
                                   </div>

                                   <div className="space-y-2 bg-slate-50 dark:bg-slate-950 p-2 rounded-xl border border-gray-150 dark:border-slate-800/80 max-h-[160px] overflow-y-auto">
                                     {clubShooters.map((s) => {
                                       const shots = s.scores?.[activeRound.id] || [];
                                       const hits = shots.filter(v => v === true).length;
                                       return (
                                         <div key={s.id} className="pb-1.5 last:pb-0 border-b last:border-0 border-gray-100 dark:border-slate-850">
                                           <div className="flex justify-between text-[8px] font-extrabold uppercase tracking-wide leading-normal">
                                             <span className="text-slate-700 dark:text-slate-300 truncate max-w-[120px]">{s.name} | ID: {s.id.replace("ath-", "")}</span>
                                             <span className="text-indigo-600">HITS: {hits}/{effectiveShotsCount}</span>
                                           </div>
                                           <div className="flex flex-wrap gap-0.5 mt-1">
                                             {Array.from({ length: effectiveShotsCount }).map((_, shotIdx) => {
                                               const shot = shots[shotIdx];
                                               return (
                                                 <span 
                                                   key={shotIdx}
                                                   className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-mono font-black border transition-all ${
                                                     shot === true
                                                       ? "bg-emerald-600 text-white border-emerald-500 shadow-sm"
                                                       : shot === false
                                                       ? "bg-rose-600 text-white border-rose-500 shadow-sm"
                                                       : "bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800/50 dark:border-slate-750"
                                                   }`}
                                                 >
                                                   {shot === true ? "V" : shot === false ? "X" : "-"}
                                                 </span>
                                               );
                                             })}
                                           </div>
                                         </div>
                                       );
                                     })}
                                   </div>
                                 </div>
                               ) : (
                                <div className="h-24 flex flex-col items-center justify-center text-center p-4 text-slate-400 dark:text-slate-600">
                                  <Activity className="w-6 h-6 text-gray-300 dark:text-slate-850 mb-1.5" />
                                  <span className="text-[9px] font-bold">{isEng ? "Vacant Lane" : "Làn trống - Sẵn sàng"}</span>
                                </div>
                              )}
                            </div>
                          );
                        }

                        // Otherwise: Individual or Parallel Team Mode
                        const activeAthleteOnLane = (monitorEnv === "team" && teamLaneLayoutType === "parallel")
                          ? ((packedSquads[selectedMonitorSquad - 1] || [])[idx] || null)
                          : (orderedAthletesForRound[(selectedMonitorSquad - 1) * laneCapacity + idx] || null);

                        return (
                          <div 
                            key={`lane-${laneNum}`}
                            className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3.5 min-h-[140px] ${
                              activeAthleteOnLane 
                                ? "bg-white dark:bg-slate-900 border-rose-500 shadow-sm ring-1 ring-rose-500/10" 
                                : "bg-slate-50 dark:bg-slate-950/30 border-gray-150 dark:border-slate-800 opacity-60"
                            }`}
                          >
                            <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-slate-850">
                              <span className="text-[10px] font-black tracking-widest text-slate-550 uppercase">
                                LANE {laneNum}
                              </span>
                              <span className={`text-[8.5px] font-black uppercase px-2 py-0.5 rounded-full ${
                                activeAthleteOnLane
                                  ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 border border-emerald-200"
                                  : "bg-gray-100 dark:bg-slate-800 text-gray-400"
                              }`}>
                                {activeAthleteOnLane ? (isEng ? "ACTIVE" : "ĐANG BẮN") : (isEng ? "VACANT" : "TRỐNG")}
                              </span>
                            </div>

                            {activeAthleteOnLane ? (
                              <div className="space-y-3">
                                <div>
                                  {monitorEnv === "team" ? (
                                    <div className="flex flex-col">
                                      <span className="block text-[8.5px] font-black text-rose-500 uppercase tracking-wider font-mono">
                                        SBD CLB: {activeAthleteOnLane.team ? String((currentTournamentDoc?.teamDrawnNumbers || {})[activeAthleteOnLane.team] || "---").padStart(3, "0") : "---"}
                                      </span>
                                      <span className="block text-[8px] font-bold text-gray-450 uppercase font-mono mt-0.5">
                                        VĐV SBD: {String(drawnNumbers[activeAthleteOnLane.id] || "0").padStart(3, "0")} | ID: {activeAthleteOnLane.id.replace("ath-", "")}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="block text-[8.5px] font-black text-rose-500 uppercase tracking-wider font-mono">
                                      SBD: {String(drawnNumbers[activeAthleteOnLane.id] || "0").padStart(3, "0")} | ID: {activeAthleteOnLane.id.replace("ath-", "")}
                                    </span>
                                  )}
                                  <span className="text-sm font-black text-slate-800 dark:text-white block mt-0.5 truncate">
                                    {activeAthleteOnLane.name}
                                  </span>
                                  <span className="text-[10px] text-gray-500 dark:text-slate-400 block truncate mt-0.5">
                                    {activeAthleteOnLane.team || (isEng ? "Independent" : "Tự do")}
                                  </span>
                                </div>

                                <div className="space-y-1.5 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-gray-150 dark:border-slate-800/80">
                                  <div className="flex justify-between text-[8px] font-black text-gray-550 uppercase tracking-widest leading-none">
                                    <span>CỰ LY: {activeRound.distance}</span>
                                    <span>
                                      HITS: {(activeAthleteOnLane.scores?.[activeRound.id] || []).filter(s => s === true).length}/{effectiveShotsCount}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {Array.from({ length: effectiveShotsCount }).map((_, shotIdx) => {
                                      const shot = (activeAthleteOnLane.scores?.[activeRound.id] || [])[shotIdx];
                                      return (
                                        <span 
                                          key={shotIdx}
                                          className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-mono font-black border transition-all ${
                                            shot === true
                                              ? "bg-emerald-600 text-white border-emerald-500 shadow-sm"
                                              : shot === false
                                              ? "bg-rose-600 text-white border-rose-500 shadow-sm"
                                              : "bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800/50 dark:border-slate-750"
                                          }`}
                                        >
                                          {shot === true ? "V" : shot === false ? "X" : "-"}
                                        </span>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="h-24 flex flex-col items-center justify-center text-center p-4 text-slate-400 dark:text-slate-600">
                                <Activity className="w-6 h-6 text-gray-300 dark:text-slate-850 mb-1.5" />
                                <span className="text-[9px] font-bold">{isEng ? "Vacant Lane" : "Làn trống - Sẵn sàng"}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Planning Board for next squads */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-150 dark:border-slate-800 p-5 space-y-4">
                      <div className="border-b border-gray-100 dark:border-slate-850 pb-2 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                          {isEng ? "PREVIEW OF UPCOMING SQUADS" : "KẾ HOẠCH LƯỢT TIẾP THEO"}
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Column 1: SƠ ĐỒ CHỜ BẮN */}
                        <div className="space-y-3">
                          <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-gray-150 dark:border-slate-800">
                            <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                              {isEng ? "WAITING LIST (NEXT SQUAD)" : "SƠ ĐỒ CHỜ BẮN (LƯỢT SAU)"}
                            </span>
                            {selectedMonitorSquad + 1 <= totalSquads ? (
                              <span className="text-[9px] font-bold text-slate-500 bg-slate-200/50 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                                {isEng ? `Squad ${selectedMonitorSquad + 1}` : `Lượt ${selectedMonitorSquad + 1}`}
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold text-gray-400">
                                {isEng ? "None" : "Không có"}
                              </span>
                            )}
                          </div>

                          {selectedMonitorSquad + 1 <= totalSquads ? (
                            <div className="divide-y divide-gray-100 dark:divide-slate-850">
                              {getSquadLanes(selectedMonitorSquad + 1).map((lane) => (
                                <div key={lane.laneNum} className="py-2 flex items-center justify-between text-xs font-medium">
                                  <div className="flex items-center gap-3">
                                    <span className="w-12 text-[10px] font-black font-mono text-gray-450 uppercase tracking-widest leading-none">
                                      LANE {lane.laneNum}
                                    </span>
                                    <span className="text-slate-800 dark:text-slate-200 font-bold truncate max-w-[150px]">
                                      {lane.name || <span className="text-gray-400 dark:text-slate-600 italic font-normal">{isEng ? "Vacant" : "Trống"}</span>}
                                    </span>
                                  </div>
                                  {lane.name && (
                                    <span className="font-mono text-[9.5px] font-bold text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/20 px-1.5 py-0.5 rounded bg-indigo-50/50 dark:bg-indigo-950/20">
                                      {lane.sbd ? String(lane.sbd).padStart(3, "0") : "---"}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="py-8 text-center text-gray-400 italic text-xs font-semibold">
                              {isEng ? "No upcoming waiting squads" : "Không có lượt bắn chờ tiếp theo"}
                            </div>
                          )}
                        </div>

                        {/* Column 2: SƠ ĐỒ BẮN THỬ */}
                        <div className="space-y-3">
                          <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-gray-150 dark:border-slate-800">
                            <span className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                              {isEng ? "WARMUP LIST (SUBSEQUENT SQUAD)" : "SƠ ĐỒ BẮN THỬ (LƯỢT SAU NỮA)"}
                            </span>
                            {selectedMonitorSquad + 2 <= totalSquads ? (
                              <span className="text-[9px] font-bold text-slate-500 bg-slate-200/50 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                                {isEng ? `Squad ${selectedMonitorSquad + 2}` : `Lượt ${selectedMonitorSquad + 2}`}
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold text-gray-400">
                                {isEng ? "None" : "Không có"}
                              </span>
                            )}
                          </div>

                          {selectedMonitorSquad + 2 <= totalSquads ? (
                            <div className="divide-y divide-gray-100 dark:divide-slate-850">
                              {getSquadLanes(selectedMonitorSquad + 2).map((lane) => (
                                <div key={lane.laneNum} className="py-2 flex items-center justify-between text-xs font-medium">
                                  <div className="flex items-center gap-3">
                                    <span className="w-12 text-[10px] font-black font-mono text-gray-450 uppercase tracking-widest leading-none">
                                      LANE {lane.laneNum}
                                    </span>
                                    <span className="text-slate-800 dark:text-slate-200 font-bold truncate max-w-[150px]">
                                      {lane.name || <span className="text-gray-400 dark:text-slate-600 italic font-normal">{isEng ? "Vacant" : "Trống"}</span>}
                                    </span>
                                  </div>
                                  {lane.name && (
                                    <span className="font-mono text-[9.5px] font-bold text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/20 px-1.5 py-0.5 rounded bg-rose-50/50 dark:bg-rose-950/20">
                                      {lane.sbd ? String(lane.sbd).padStart(3, "0") : "---"}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="py-8 text-center text-gray-400 italic text-xs font-semibold">
                              {isEng ? "No upcoming warmup squads" : "Không có lượt bắn thử tiếp theo"}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right block (Mini Leaderboard) */}
                  <div className="space-y-4">
                    <span className="block text-[10px] font-black text-gray-550 uppercase tracking-widest px-1">
                      {isEng ? "Round scores & Status table" : "BẢNG ĐIỂM & TRẠNG THÁI VÒNG ĐẤU:"}
                    </span>

                    <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                         <table className="w-full text-left text-xs font-sans">
                           <thead className="bg-slate-50 dark:bg-slate-950 border-b border-gray-150 dark:border-slate-800 text-[9px] font-black text-slate-550 uppercase tracking-wider sticky top-0">
                             <tr>
                               <th className="p-2.5 w-8 text-center">{isEng ? "Rank" : "XH"}</th>
                               <th className="p-2.5 w-12">{isEng ? "SBD" : "SBD"}</th>
                               <th className="p-2.5">{monitorEnv === "team" ? (isEng ? "Club / Main Shooters" : "CLB & VĐV BẮN CHÍNH") : (isEng ? "Athlete" : "HỌ VÀ TÊN")}</th>
                               <th className="p-2.5 text-center">{isEng ? "Hits" : "ĐIỂM"}</th>
                               <th className="p-2.5 text-right">{isEng ? "Status" : "TRẠNG THÁI"}</th>
                             </tr>
                           </thead>
                           <tbody className="divide-y divide-gray-150 dark:divide-slate-850 font-medium text-slate-700 dark:text-slate-300">
                             {miniLeaderboardData.map((athlete, idx) => {
                               const sbd = athlete.sbd;
                               const isQual = athlete.isQualified;
                               const isElim = athlete.isEliminated || athlete.wasAlreadyEliminated;

                               if (athlete.isClub) {
                                 return (
                                   <React.Fragment key={athlete.id}>
                                     {/* Club Row */}
                                     <tr className="bg-slate-50/40 dark:bg-slate-900/40 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors text-[11px] border-b border-gray-150 dark:border-slate-850">
                                       <td className="p-2.5 text-center font-mono font-black text-slate-500">{idx + 1}</td>
                                       <td className="p-2.5">
                                         {sbd ? (
                                           <span className="font-mono font-bold text-[10px] text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/20 px-1 py-0.5 rounded bg-indigo-50/50 dark:bg-indigo-950/20">
                                             {String(sbd).padStart(3, "0")}
                                           </span>
                                         ) : (
                                           <span className="text-[9px] text-gray-400 italic">-</span>
                                         )}
                                       </td>
                                       <td className="p-2.5 font-extrabold text-slate-850 dark:text-slate-100">
                                         <span className="block truncate max-w-[140px] font-black uppercase text-indigo-700 dark:text-indigo-400">
                                           {athlete.name}
                                         </span>
                                       </td>
                                       <td className="p-2.5 text-center font-mono font-black text-rose-600 dark:text-rose-400 text-sm">
                                         {athlete.displayScore}
                                       </td>
                                       <td className="p-2.5 text-right">
                                         <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border ${
                                           isQual
                                             ? "bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-900/50"
                                             : isElim
                                             ? "bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950/20 dark:border-rose-900/50"
                                             : "bg-amber-50 border-amber-200 text-amber-600 dark:bg-amber-950/20 dark:border-amber-900/50"
                                         }`}>
                                           {athlete.statusStr}
                                         </span>
                                       </td>
                                     </tr>

                                     {/* Athlete Sub-rows for this Club */}
                                     {athlete.mainShooters?.map((memb: any) => {
                                       const indRoundRes = roundResults[selectedMonitorRoundIdx];
                                       const membScoreObj = indRoundRes?.scores?.[memb.id];
                                       const membScore = membScoreObj?.displayScore ?? 0;
                                       const membSbd = drawnNumbers[memb.id] || null;

                                       return (
                                         <tr key={memb.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/20 transition-colors text-[10px] bg-white dark:bg-slate-900/10 text-slate-600 dark:text-slate-400">
                                           <td className="p-1.5 text-center font-mono text-slate-300">&bull;</td>
                                           <td className="p-1.5 pl-3">
                                             {membSbd ? (
                                               <span className="font-mono text-[9px] text-slate-500 border border-gray-200 px-1 py-0.2 rounded bg-slate-50">
                                                 {String(membSbd).padStart(3, "0")}
                                               </span>
                                             ) : (
                                               <span className="text-[8px] text-gray-300 italic">-</span>
                                             )}
                                           </td>
                                           <td className="p-1.5 pl-4 font-medium flex items-center gap-1">
                                             <span className="text-slate-400 text-[9px] font-bold">└</span>
                                             <span className="truncate max-w-[120px]">{memb.name}</span>
                                           </td>
                                           <td className="p-1.5 text-center font-mono text-slate-500 font-semibold">
                                             {membScore}
                                           </td>
                                           <td className="p-1.5 text-right text-[8px] text-slate-400 font-bold uppercase tracking-wider pr-4">
                                             {isEng ? "Main" : "Bắn chính"}
                                           </td>
                                         </tr>
                                       );
                                     })}
                                   </React.Fragment>
                                 );
                               }

                               return (
                                 <tr key={athlete.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors text-[11px]">
                                   <td className="p-2.5 text-center font-mono font-black text-slate-400">{idx + 1}</td>
                                   <td className="p-2.5">
                                     {sbd ? (
                                       <span className="font-mono font-bold text-[10px] text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/20 px-1 py-0.5 rounded bg-rose-50/50 dark:bg-rose-950/20">
                                         {String(sbd).padStart(3, "0")}
                                       </span>
                                     ) : (
                                       <span className="text-[9px] text-gray-400 italic">-</span>
                                     )}
                                   </td>
                                   <td className="p-2.5 font-bold text-slate-800 dark:text-slate-200">
                                     <span className="block truncate max-w-[100px]">{athlete.name}</span>
                                   </td>
                                   <td className="p-2.5 text-center font-mono font-black text-rose-600 dark:text-rose-400">
                                     {athlete.displayScore}
                                   </td>
                                   <td className="p-2.5 text-right">
                                     <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border ${
                                       isQual
                                         ? "bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-900/50"
                                         : isElim
                                         ? "bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950/20 dark:border-rose-900/50"
                                         : "bg-amber-50 border-amber-200 text-amber-600 dark:bg-amber-950/20 dark:border-amber-900/50"
                                     }`}>
                                       {athlete.statusStr}
                                     </span>
                                   </td>
                                 </tr>
                               );
                             })}
                             {miniLeaderboardData.length === 0 && (
                               <tr>
                                 <td colSpan={5} className="p-6 text-center text-gray-400 font-bold">
                                   {isEng ? "No athletes or teams to display." : "Chưa có danh sách xếp dạng."}
                                 </td>
                               </tr>
                             )}
                           </tbody>
                         </table>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SƠ ĐỒ DANH SÁCH BẮN CÁC VĐV */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-150 dark:border-slate-800 p-5 space-y-4 shadow-sm">
                  <div className="border-b border-gray-100 dark:border-slate-850 pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div className="flex items-center gap-2.5">
                      <Users className="w-5 h-5 text-rose-500" />
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                          {isEng ? "COMPETE ATHLETE SHOOTING SCHEDULE" : "SƠ ĐỒ DANH SÁCH BẮN CÁC VĐV (VÒNG HIỆN TẠI)"}
                        </h3>
                        <p className="text-[10px] text-gray-550 mt-0.5 font-medium">
                          {isEng 
                            ? "Complete list of assigned squads, lanes and SBD for all qualified athletes in the current round." 
                            : "Danh sách chi tiết số thứ tự, SBD, lượt bắn và làn bắn đã phân chia của các vận động viên tham gia vòng thi hiện tại."}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Filters Bar */}
                  <div className="flex flex-col md:flex-row gap-3 justify-between items-center bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-gray-150 dark:border-slate-800/80">
                    <div className="relative w-full md:max-w-xs">
                      <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
                      <input
                        type="text"
                        placeholder={isEng ? "Search name, SBD, club..." : "Tìm kiếm tên VĐV, SBD, câu lạc bộ..."}
                        value={scheduleSearchQuery}
                        onChange={(e) => setScheduleSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-rose-500 text-slate-800 dark:text-white"
                      />
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                      <span className="text-[10px] font-black text-gray-550 uppercase tracking-wider shrink-0">
                        {isEng ? "SQUAD FILTER:" : "LỌC THEO LƯỢT BẮN:"}
                      </span>
                      <select
                        value={scheduleSquadFilter}
                        onChange={(e) => setScheduleSquadFilter(e.target.value)}
                        className="text-xs font-bold rounded-xl border border-gray-250 dark:border-slate-850 bg-white dark:bg-slate-900 px-3 py-1.5 text-slate-850 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                      >
                        <option value="all">{isEng ? "All Squads" : "Tất cả các lượt"}</option>
                        {Array.from({ length: totalSquads }).map((_, sIdx) => (
                          <option key={sIdx + 1} value={String(sIdx + 1)}>
                            {isEng ? `Squad ${sIdx + 1}` : `Lượt bắn ${sIdx + 1}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="border border-gray-150 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-sans">
                        <thead className="bg-slate-50 dark:bg-slate-950 border-b border-gray-150 dark:border-slate-800 text-[9px] font-black text-slate-550 uppercase tracking-wider">
                          <tr>
                            <th className="p-3 w-12 text-center">STT</th>
                            <th className="p-3 w-20 text-center">SBD</th>
                            <th className="p-3">{isEng ? "Athlete Name" : "Họ và Tên"}</th>
                            <th className="p-3">{isEng ? "Club / Team" : "Đơn vị / CLB"}</th>
                            <th className="p-3 text-center w-24">{isEng ? "Squad" : "Lượt bắn"}</th>
                            <th className="p-3 text-center w-24">{isEng ? "Lane" : "Làn bắn"}</th>
                            <th className="p-3 text-right w-48">{isEng ? "Current Status" : "Trạng thái"}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-150 dark:divide-slate-850 font-medium text-slate-700 dark:text-slate-300">
                          {(() => {
                            const squadClubs: string[] = [];
                            if (monitorEnv === "team") {
                              orderedAthletesForRound.forEach(a => {
                                if (a.team && !squadClubs.includes(a.team.trim())) {
                                  squadClubs.push(a.team.trim());
                                }
                              });
                            }

                            const mappedList = orderedAthletesForRound.map((athlete, idx) => {
                              const sbd = monitorEnv === "team"
                                ? ((currentTournamentDoc?.teamDrawnNumbers || {})[athlete.team || ""] || null)
                                : (drawnNumbers[athlete.id] || null);

                              let squad: number | string = "---";
                              let lane: number | string = "---";
                              
                              if (monitorEnv === "team" && teamLaneLayoutType === "sequential") {
                                const clubIdx = squadClubs.indexOf(athlete.team?.trim() || "");
                                if (clubIdx >= 0) {
                                  squad = Math.floor(clubIdx / laneCapacity) + 1;
                                  lane = (clubIdx % laneCapacity) + 1;
                                }
                              } else if (monitorEnv === "team" && teamLaneLayoutType === "parallel") {
                                let foundSquad = -1;
                                let foundLaneIdx = -1;
                                for (let sIdx = 0; sIdx < packedSquads.length; sIdx++) {
                                  const lIdx = packedSquads[sIdx].findIndex(ath => ath?.id === athlete.id);
                                  if (lIdx !== -1) {
                                    foundSquad = sIdx;
                                    foundLaneIdx = lIdx;
                                    break;
                                  }
                                }
                                if (foundSquad !== -1) {
                                  squad = foundSquad + 1;
                                  lane = foundLaneIdx + 1;
                                }
                              } else {
                                squad = Math.floor(idx / laneCapacity) + 1;
                                lane = (idx % laneCapacity) + 1;
                              }

                              let statusLabel = isEng ? "Scheduled" : "Đã xếp lịch";
                              let statusClass = "bg-slate-50 border-gray-150 text-slate-500 dark:bg-slate-900/40 dark:border-slate-800 dark:text-slate-500";

                              if (typeof squad === "number") {
                                if (squad === selectedMonitorSquad) {
                                  statusLabel = isEng ? "SHOOTING NOW" : "ĐANG BẮN";
                                  statusClass = "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900/50 dark:text-emerald-400 font-black animate-pulse";
                                } else if (squad === selectedMonitorSquad + 1) {
                                  statusLabel = isEng ? "WAITING (NEXT)" : "CHỜ BẮN (LƯỢT SAU)";
                                  statusClass = "bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/20 dark:border-indigo-900/50 dark:text-indigo-400 font-bold";
                                } else if (squad === selectedMonitorSquad + 2) {
                                  statusLabel = isEng ? "WARMUP (SUBSEQUENT)" : "BẮN THỬ (LƯỢT SAU NỮA)";
                                  statusClass = "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/20 dark:border-rose-900/50 dark:text-rose-400 font-bold";
                                } else if (squad < selectedMonitorSquad) {
                                  statusLabel = isEng ? "FINISHED" : "ĐÃ BẮN XONG";
                                  statusClass = "bg-gray-100 border-gray-200 text-gray-550 dark:bg-slate-800/20 dark:border-slate-800 dark:text-slate-500 line-through opacity-65";
                                } else {
                                  statusLabel = isEng ? "WAITING" : "CHƯA ĐẾN LƯỢT";
                                  statusClass = "bg-slate-50 border-gray-150 text-slate-500 dark:bg-slate-900/40 dark:border-slate-800 dark:text-slate-500";
                                }
                              }

                              return {
                                athlete,
                                sbd,
                                squad,
                                lane,
                                statusLabel,
                                statusClass
                              };
                            }).filter(item => {
                              // Search Filter
                              const query = scheduleSearchQuery.trim().toLowerCase();
                              if (query) {
                                const nameMatch = item.athlete.name.toLowerCase().includes(query);
                                const sbdMatch = item.sbd ? String(item.sbd).includes(query) : false;
                                const clubMatch = item.athlete.team ? item.athlete.team.toLowerCase().includes(query) : false;
                                if (!nameMatch && !sbdMatch && !clubMatch) return false;
                              }

                              // Squad Filter
                              if (scheduleSquadFilter !== "all") {
                                if (String(item.squad) !== scheduleSquadFilter) return false;
                              }

                              return true;
                            });

                            if (mappedList.length === 0) {
                              return (
                                <tr>
                                  <td colSpan={7} className="p-8 text-center text-gray-450 italic font-semibold">
                                    {isEng ? "No matching records found." : "Không có dữ liệu vận động viên phù hợp."}
                                  </td>
                                </tr>
                              );
                            }

                            return mappedList.map((item, index) => (
                              <tr 
                                key={item.athlete.id} 
                                className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${
                                  item.squad === selectedMonitorSquad 
                                    ? "bg-rose-500/[0.02] dark:bg-rose-500/[0.01]" 
                                    : ""
                                }`}
                              >
                                <td className="p-3 text-center font-mono font-bold text-slate-400">
                                  {index + 1}
                                </td>
                                <td className="p-3 text-center">
                                  {item.sbd ? (
                                    <span className="font-mono font-bold text-[10.5px] text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/20 px-2 py-0.5 rounded bg-rose-50/50 dark:bg-rose-950/20">
                                      {String(item.sbd).padStart(3, "0")}
                                    </span>
                                  ) : (
                                    <span className="text-gray-450 italic text-[10px]">---</span>
                                  )}
                                </td>
                                <td className="p-3 font-bold text-slate-800 dark:text-slate-200">
                                  {item.athlete.name}
                                  <span className="block text-[9px] text-gray-400 font-normal mt-0.5">ID: {item.athlete.id.replace("ath-", "")}</span>
                                </td>
                                <td className="p-3 font-semibold text-slate-600 dark:text-slate-400">
                                  {item.athlete.team || (isEng ? "Independent" : "Tự do")}
                                </td>
                                <td className="p-3 text-center font-mono font-extrabold text-indigo-600 dark:text-indigo-400 text-sm">
                                  {item.squad}
                                </td>
                                <td className="p-3 text-center font-mono font-extrabold text-slate-700 dark:text-slate-300">
                                  {item.lane !== "---" ? `Làn ${item.lane}` : "---"}
                                </td>
                                <td className="p-3 text-right">
                                  <span className={`text-[9.5px] font-extrabold uppercase px-2 py-0.5 rounded border ${item.statusClass}`}>
                                    {item.statusLabel}
                                  </span>
                                </td>
                              </tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Subtab 4: Next Round Match Sorter (Sắp xếp lượt bắn vòng tiếp theo) */}
          {subTab === "sorter" && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-150 dark:border-slate-800 p-5 space-y-5 animate-fadeIn">
              <div className="flex items-center gap-2.5 pb-2 border-b border-gray-100 dark:border-slate-850">
                <ListOrdered className="w-5 h-5 text-indigo-500" />
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  {isEng ? "Dynamic Next Round Match Sorter" : "THIẾT LẬP THỨ TỰ LƯỢT BẮN VÒNG TIẾP THEO"}
                </h2>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-slate-400 leading-relaxed max-w-2xl">
                {isEng 
                  ? "Define rules to automatically sort athletes on waiting queue for the next round based on their score performance."
                  : "Cấu hình thuật toán tự động sắp xếp danh sách chờ bắn ở vòng tiếp theo. Trọng tài thực địa sẽ được đồng bộ và gọi VĐV theo đúng thứ tự do thuật toán này tính toán."}
              </p>

              {/* Environment selector for Combined Tournaments */}
              {currentTournamentDoc?.tournamentType === "combined" && (
                <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl max-w-xs border border-gray-200/50 dark:border-slate-800">
                  <button
                    onClick={() => {
                      setSorterEnv("individual");
                      setSelectedSorterRoundIdx(0);
                    }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-[10.5px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      sorterEnv === "individual"
                        ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                        : "text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200"
                    }`}
                  >
                    <span>{isEng ? "Individual" : "Cá Nhân"}</span>
                  </button>
                  <button
                    onClick={() => {
                      setSorterEnv("team");
                      setSelectedSorterRoundIdx(0);
                    }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-[10.5px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      sorterEnv === "team"
                        ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                        : "text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200"
                    }`}
                  >
                    <span>{isEng ? "Team" : "Đồng Đội"}</span>
                  </button>
                </div>
              )}

              {/* Configured Round Settings Summary Cards */}
              <div className="bg-slate-50/50 dark:bg-slate-950/20 border border-gray-150 dark:border-slate-800 rounded-xl p-4 space-y-2.5">
                <span className="block text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none">
                  {isEng ? "CONFIGURED ROUNDS SETTINGS SUMMARY" : "DANH SÁCH THIẾT LẬP CÁC VÒNG ĐÃ TẠO (SETTINGS)"}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {((sorterEnv === "team" ? currentTournamentDoc?.teamDistances : currentTournamentDoc?.distances) || []).map((dist, rIdx) => {
                    const criteria = currentTournamentDoc?.roundShootingOrderCriteria?.[dist.id];
                    let criteriaName = isEng ? "Not Configured (Default SBD)" : "Mặc định (SBD)";
                    if (criteria === "sbd") criteriaName = isEng ? "Lucky Draw SBD Order" : "Thứ tự SBD bốc thăm";
                    if (criteria === "points_asc") criteriaName = isEng ? "Points Ascending" : "Điểm tăng dần";
                    if (criteria === "points_desc") criteriaName = isEng ? "Points Descending" : "Điểm giảm dần";
                    const isConfigured = !!criteria;

                    return (
                      <div 
                        key={dist.id} 
                        className={`p-2.5 rounded-lg border flex flex-col justify-between transition-all ${
                          isConfigured 
                            ? "bg-emerald-500/5 border-emerald-500/20 text-slate-700 dark:text-slate-300"
                            : "bg-slate-100/50 dark:bg-slate-900/40 border-gray-200/50 dark:border-slate-850 text-gray-400"
                        }`}
                      >
                        <span className={`font-black uppercase text-[9.5px] tracking-wide ${isConfigured ? "text-emerald-700 dark:text-emerald-400" : "text-gray-500"}`}>
                          {isEng ? `Round ${rIdx + 1}: ${dist.distance}` : `Vòng ${rIdx + 1}: ${dist.distance}`}
                        </span>
                        <div className="flex items-center gap-1.5 mt-1 font-bold text-[10px]">
                          <span className={`w-1.5 h-1.5 rounded-full ${isConfigured ? "bg-emerald-500" : "bg-gray-300"}`} />
                          <span className={isConfigured ? "text-slate-800 dark:text-slate-200" : ""}>{criteriaName}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sorting rules selector */}
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-gray-150 dark:border-slate-800 space-y-4">
                {/* Select Round / Distance config */}
                <div className="pb-3 border-b border-gray-200 dark:border-slate-800">
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">
                    {isEng ? "Select Target Round:" : "CHỌN VÒNG BẮN / CỰ LY ÁP DỤNG THỨ TỰ:"}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(sorterEnv === "team" ? currentTournamentDoc?.teamDistances : currentTournamentDoc?.distances || []).map((dist, rIdx) => (
                      <button
                        key={dist.id}
                        type="button"
                        onClick={() => setSelectedSorterRoundIdx(rIdx)}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer border ${
                          selectedSorterRoundIdx === rIdx
                            ? "bg-indigo-600 text-white border-indigo-500 shadow-sm"
                            : "bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-850 hover:bg-gray-50"
                        }`}
                      >
                        {isEng ? `Round ${rIdx + 1}: ${dist.distance}` : `Vòng ${rIdx + 1}: ${dist.distance}`}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">
                    {isEng ? "Select Sorting Strategy:" : "Chọn thuật toán sắp xếp:"}
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Strategy 1: SBD */}
                    <button
                      onClick={() => setSortCriteria("sbd")}
                      className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                        sortCriteria === "sbd"
                          ? "bg-rose-50/50 dark:bg-rose-950/20 border-rose-500 ring-1 ring-rose-500/10"
                          : "bg-white dark:bg-slate-900 border-gray-150 dark:border-slate-800"
                      }`}
                    >
                      <Shuffle className={`w-4 h-4 shrink-0 mt-0.5 ${sortCriteria === "sbd" ? "text-rose-500" : "text-gray-400"}`} />
                      <div>
                        <span className={`block text-xs font-extrabold uppercase ${sortCriteria === "sbd" ? "text-rose-600 dark:text-rose-400" : "text-slate-700 dark:text-slate-300"}`}>
                          Theo thứ tự SBD bốc thăm
                        </span>
                        <span className="block text-[9.5px] text-gray-550 mt-0.5 leading-normal">
                          Vòng đầu tiên hoặc giữ nguyên theo SBD bốc thăm ban đầu.
                        </span>
                      </div>
                    </button>

                    {/* Strategy 2: Point ASC */}
                    <button
                      onClick={() => setSortCriteria("points_asc")}
                      className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                        sortCriteria === "points_asc"
                          ? "bg-rose-50/50 dark:bg-rose-950/20 border-rose-500 ring-1 ring-rose-500/10"
                          : "bg-white dark:bg-slate-900 border-gray-150 dark:border-slate-800"
                      }`}
                    >
                      <TrendingUp className={`w-4 h-4 shrink-0 mt-0.5 ${sortCriteria === "points_asc" ? "text-rose-500" : "text-gray-400"}`} />
                      <div>
                        <span className={`block text-xs font-extrabold uppercase ${sortCriteria === "points_asc" ? "text-rose-600 dark:text-rose-400" : "text-slate-700 dark:text-slate-300"}`}>
                          Điểm tăng dần (Ascending)
                        </span>
                        <span className="block text-[9.5px] text-gray-550 mt-0.5 leading-normal">
                          VĐV điểm thấp bắn trước, VĐV điểm cao bắn sau. Tăng tối đa kịch tính cho giải đấu!
                        </span>
                      </div>
                    </button>

                    {/* Strategy 3: Point DESC */}
                    <button
                      onClick={() => setSortCriteria("points_desc")}
                      className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                        sortCriteria === "points_desc"
                          ? "bg-rose-50/50 dark:bg-rose-950/20 border-rose-500 ring-1 ring-rose-500/10"
                          : "bg-white dark:bg-slate-900 border-gray-150 dark:border-slate-800"
                      }`}
                    >
                      <Trophy className={`w-4 h-4 shrink-0 mt-0.5 ${sortCriteria === "points_desc" ? "text-rose-500" : "text-gray-400"}`} />
                      <div>
                        <span className={`block text-xs font-extrabold uppercase ${sortCriteria === "points_desc" ? "text-rose-600 dark:text-rose-400" : "text-slate-700 dark:text-slate-300"}`}>
                          Điểm giảm dần (Descending)
                        </span>
                        <span className="block text-[9.5px] text-gray-550 mt-0.5 leading-normal">
                          VĐV điểm cao bắn trước để tạo sức ép điểm số lớn cho các VĐV bắn sau.
                        </span>
                      </div>
                    </button>
                  </div>
                </div>

                {sorterEnv === "team" && (
                  <div className="pt-4 border-t border-gray-150 dark:border-slate-800 space-y-2">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">
                      PHƯƠNG THỨC XẾP BỆ LANE CHO ĐỒNG ĐỘI:
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Sequential / Bắn Nối Tiếp */}
                      <button
                        type="button"
                        onClick={() => handleSetTeamLaneLayoutType("sequential")}
                        className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                          teamLaneLayoutType === "sequential"
                            ? "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-550 ring-1 ring-indigo-550/10"
                            : "bg-white dark:bg-slate-900 border-gray-150 dark:border-slate-800"
                        }`}
                      >
                        <ListOrdered className={`w-4 h-4 shrink-0 mt-0.5 ${teamLaneLayoutType === "sequential" ? "text-indigo-500" : "text-gray-400"}`} />
                        <div>
                          <span className={`block text-xs font-extrabold uppercase ${teamLaneLayoutType === "sequential" ? "text-indigo-600 dark:text-indigo-400" : "text-slate-700 dark:text-slate-300"}`}>
                            Bắn Nối Tiếp (Một Lane / Tuần Tự) - Mặc Định
                          </span>
                          <span className="block text-[9.5px] text-gray-550 mt-0.5 leading-normal">
                            Mỗi Câu Lạc Bộ dùng chung 1 bệ bắn (Lane). Các thành viên bắn chính trong CLB lần lượt bước lên bệ bắn theo thứ tự.
                          </span>
                        </div>
                      </button>

                      {/* Parallel / Bắn Song Song */}
                      <button
                        type="button"
                        onClick={() => handleSetTeamLaneLayoutType("parallel")}
                        className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                          teamLaneLayoutType === "parallel"
                            ? "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-550 ring-1 ring-indigo-550/10"
                            : "bg-white dark:bg-slate-900 border-gray-150 dark:border-slate-800"
                        }`}
                      >
                        <LayoutGrid className={`w-4 h-4 shrink-0 mt-0.5 ${teamLaneLayoutType === "parallel" ? "text-indigo-500" : "text-gray-400"}`} />
                        <div>
                          <span className={`block text-xs font-extrabold uppercase ${teamLaneLayoutType === "parallel" ? "text-indigo-600 dark:text-indigo-400" : "text-slate-700 dark:text-slate-300"}`}>
                            Bắn Song Song (Mỗi VĐV 1 Lane Đồng Thời)
                          </span>
                          <span className="block text-[9.5px] text-gray-550 mt-0.5 leading-normal">
                            Mỗi VĐV bắn chính trong CLB được xếp một bệ bắn riêng biệt cạnh nhau. Cả đội cùng bắn đồng thời tại các lane liền kề.
                          </span>
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-gray-200 dark:border-slate-800 flex justify-end">
                  <button
                    onClick={handleApplyNextRoundSorting}
                    className="bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs px-4.5 py-2.5 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>ÁP DỤNG THỨ TỰ LƯỢT BẮN</span>
                  </button>
                </div>
              </div>

              {/* Preview of Compiled Shooting Order */}
              <div className="space-y-3.5">
                <span className="block text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none">
                  XEM TRƯỚC SẮP XẾP SÂN ĐẤU (PREVIEW QUEUE)
                </span>

                <div className="overflow-x-auto border border-gray-150 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-left text-xs font-sans">
                    <thead className="bg-slate-50 dark:bg-slate-950 border-b border-gray-150 dark:border-slate-800 text-[10px] font-black text-slate-550 uppercase tracking-wider">
                      {sorterEnv === "team" ? (
                        <tr>
                          <th className="p-3 w-16 text-center">{isEng ? "Order" : "STT"}</th>
                          <th className="p-3 w-24">{isEng ? "Club SBD" : "SBD CLB"}</th>
                          <th className="p-3">{isEng ? "Club Name" : "TÊN CLB"}</th>
                          <th className="p-3">{isEng ? "Main Shooters" : "DANH SÁCH THÀNH VIÊN BẮN CHÍNH"}</th>
                          <th className="p-3 text-right">{isEng ? "Team Score" : "ĐIỂM SỐ CLB ĐỒNG BỘ"}</th>
                        </tr>
                      ) : (
                        <tr>
                          <th className="p-3 w-16 text-center">{isEng ? "Order" : "THỨ TỰ BẮN"}</th>
                          <th className="p-3 w-24">{isEng ? "SBD" : "SBD"}</th>
                          <th className="p-3">{isEng ? "Athlete Name" : "HỌ VÀ TÊN"}</th>
                          <th className="p-3">{isEng ? "Club" : "ĐỘI / CLB"}</th>
                          <th className="p-3 text-right">{isEng ? "Total Score" : "ĐIỂM SỐ CHẠY ĐỒNG BỘ"}</th>
                        </tr>
                      )}
                    </thead>
                    <tbody className="divide-y divide-gray-150 dark:divide-slate-850 font-medium text-slate-700 dark:text-slate-300">
                      {masterAthletes.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-gray-400 font-bold">
                            Chưa có VĐV đăng ký.
                          </td>
                        </tr>
                      ) : sorterEnv === "team" ? (
                        (() => {
                          const currentDistances = currentTournamentDoc?.teamDistances || [];
                          if (currentDistances.length === 0) return null;

                          const selectedDistance = currentDistances[selectedSorterRoundIdx];
                          if (!selectedDistance) return null;

                          const effectiveShotsCount = selectedDistance.teamShotCount || currentTournamentDoc?.teamShotsCount || 5;
                          const effectiveDirectMaxPoints = currentTournamentDoc?.teamDirectMaxShots;

                          const roundResults = calculateRounds(
                            masterAthletes,
                            currentDistances,
                            effectiveShotsCount,
                            effectiveDirectMaxPoints
                          );

                          // Find all eligible clubs
                          const clubsSet = new Set<string>(
                            masterAthletes
                              .filter((a) => a.team && a.team.trim() !== "" && a.team.trim() !== "Tự do" && a.isPrimaryTeam)
                              .map((a) => a.team!.trim())
                          );
                          const sortedClubs: string[] = Array.from(clubsSet);

                          const getClubPrevScore = (clubName: string) => {
                            const mainShooters = masterAthletes.filter(
                              (a) => a.team?.trim() === clubName && a.isPrimaryTeam
                            );
                            const prevRoundRes = roundResults[selectedSorterRoundIdx - 1];
                            if (!prevRoundRes || !prevRoundRes.scores) return 0;
                            let total = 0;
                            for (const shooter of mainShooters) {
                              const sc = prevRoundRes.scores[shooter.id];
                              if (sc) {
                                total += sc.displayScoreWithSolo !== undefined ? sc.displayScoreWithSolo : sc.displayScore;
                              }
                            }
                            return total;
                          };

                          // Sort clubs according to criteria
                          sortedClubs.sort((clubA, clubB) => {
                            const sbdA = (currentTournamentDoc?.teamDrawnNumbers || {})[clubA] || 999999;
                            const sbdB = (currentTournamentDoc?.teamDrawnNumbers || {})[clubB] || 999999;

                            if (selectedSorterRoundIdx === 0 || sortCriteria === "sbd") {
                              return sbdA - sbdB;
                            }

                            const scoreA = getClubPrevScore(clubA);
                            const scoreB = getClubPrevScore(clubB);

                            if (sortCriteria === "points_asc") {
                              if (scoreA !== scoreB) {
                                return scoreA - scoreB;
                              }
                              return sbdA - sbdB;
                            } else {
                              if (scoreA !== scoreB) {
                                return scoreB - scoreA;
                              }
                              return sbdA - sbdB;
                            }
                          });

                          return sortedClubs.map((clubName, idx) => {
                            const sbd = (currentTournamentDoc?.teamDrawnNumbers || {})[clubName] || null;
                            const mainShooters = masterAthletes.filter(
                              (a) => a.team?.trim() === clubName && a.isPrimaryTeam
                            );
                            mainShooters.sort((a, b) => a.name.localeCompare(b.name));

                            let displayScoreStr = "";
                            if (selectedSorterRoundIdx === 0) {
                              let totalRound1 = 0;
                              for (const s of mainShooters) {
                                totalRound1 += calculateTotalScore(s, currentDistances);
                              }
                              displayScoreStr = `${totalRound1} HITS`;
                            } else {
                              displayScoreStr = `${getClubPrevScore(clubName)} HITS`;
                            }

                            const sbdDisplay = sbd !== null ? sbd : (idx + 1);

                            return (
                              <tr key={clubName} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                <td className="p-3 text-center font-mono font-black text-slate-400">{idx + 1}</td>
                                <td className="p-3">
                                  <span className="font-mono font-bold text-xs text-rose-600 dark:text-rose-400 border border-rose-150 dark:border-rose-900/30 px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40">
                                    {String(sbdDisplay).padStart(3, "0")}
                                  </span>
                                </td>
                                <td className="p-3 font-bold text-slate-800 dark:text-slate-200">{clubName}</td>
                                <td className="p-3">
                                  <div className="flex flex-wrap gap-1.5">
                                    {mainShooters.map((s) => (
                                      <span key={s.id} className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-150 dark:border-emerald-900/30 font-bold">
                                        {s.name}
                                      </span>
                                    ))}
                                    {mainShooters.length === 0 && (
                                      <span className="text-[10px] text-gray-400 italic">Không có VĐV Bắn chính</span>
                                    )}
                                  </div>
                                </td>
                                <td className="p-3 text-right font-mono font-black text-rose-600 dark:text-rose-400">
                                  {displayScoreStr}
                                </td>
                              </tr>
                            );
                          });
                        })()
                      ) : (
                        (() => {
                          const currentDistances = currentTournamentDoc?.distances || [];
                          if (currentDistances.length === 0) return null;

                          const selectedDistance = currentDistances[selectedSorterRoundIdx];
                          if (!selectedDistance) return null;

                          const effectiveShotsCount = selectedDistance.shotCount || currentTournamentDoc?.shotsCount || 5;
                          const effectiveDirectMaxPoints = currentTournamentDoc?.directMaxShots;

                          // Run qualification calculateRounds
                          const roundResults = calculateRounds(
                            masterAthletes,
                            currentDistances,
                            effectiveShotsCount,
                            effectiveDirectMaxPoints
                          );

                          let targetAthletes = [...masterAthletes];

                          // If r > 0, filter by qualifiedIds
                          if (selectedSorterRoundIdx > 0) {
                            const roundRes = roundResults[selectedSorterRoundIdx];
                            if (roundRes && roundRes.qualifiedIds) {
                              const qualifiedSet = new Set(roundRes.qualifiedIds);
                              targetAthletes = masterAthletes.filter(a => qualifiedSet.has(a.id));
                            }
                          }

                          // Sort according to criteria
                          targetAthletes.sort((a, b) => {
                            const sbdA = drawnNumbers[a.id] || 999999;
                            const sbdB = drawnNumbers[b.id] || 999999;

                            if (sortCriteria === "sbd") {
                              return sbdA - sbdB;
                            }

                            // Points-based sorting
                            let scoreA = 0;
                            let scoreB = 0;

                            if (selectedSorterRoundIdx === 0) {
                              scoreA = calculateTotalScore(a, currentDistances);
                              scoreB = calculateTotalScore(b, currentDistances);
                            } else {
                              const prevRoundRes = roundResults[selectedSorterRoundIdx - 1];
                              if (prevRoundRes && prevRoundRes.scores) {
                                const scA = prevRoundRes.scores[a.id];
                                const scB = prevRoundRes.scores[b.id];
                                scoreA = scA ? (scA.displayScoreWithSolo !== undefined ? scA.displayScoreWithSolo : scA.displayScore) : 0;
                                scoreB = scB ? (scB.displayScoreWithSolo !== undefined ? scB.displayScoreWithSolo : scB.displayScore) : 0;
                              }
                            }

                            if (sortCriteria === "points_asc") {
                              if (scoreA !== scoreB) {
                                  return scoreA - scoreB;
                              }
                              return sbdA - sbdB;
                            } else {
                              if (scoreA !== scoreB) {
                                  return scoreB - scoreA;
                              }
                              return sbdA - sbdB;
                            }
                          });

                          return targetAthletes.map((athlete, idx) => {
                            const sbd = drawnNumbers[athlete.id] !== undefined ? drawnNumbers[athlete.id] : (idx + 1);
                            
                            // Let's compute display score
                            let displayScoreStr = "";
                            if (selectedSorterRoundIdx === 0) {
                              displayScoreStr = `${calculateTotalScore(athlete, currentDistances)} HITS`;
                            } else {
                              const prevRoundRes = roundResults[selectedSorterRoundIdx - 1];
                              const scoreVal = prevRoundRes?.scores?.[athlete.id]?.displayScore ?? 0;
                              const soloHits = athlete.soloHits?.[currentDistances[selectedSorterRoundIdx - 1]?.id] || 0;
                              displayScoreStr = soloHits > 0 
                                ? `${scoreVal} (+${soloHits} Solo)` 
                                : `${scoreVal} HITS`;
                            }

                            return (
                              <tr key={athlete.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                <td className="p-3 text-center font-mono font-black text-slate-400">{idx + 1}</td>
                                <td className="p-3">
                                  <span className="font-mono font-bold text-xs text-rose-600 dark:text-rose-400 border border-rose-150 dark:border-rose-900/30 px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40">
                                    {String(sbd).padStart(3, "0")}
                                  </span>
                                </td>
                                <td className="p-3 font-bold text-slate-800 dark:text-slate-200">{athlete.name}</td>
                                <td className="p-3 text-[11px]">{athlete.team || "Tự do"}</td>
                                <td className="p-3 text-right font-mono font-black text-rose-600 dark:text-rose-400">
                                  {displayScoreStr}
                                </td>
                              </tr>
                            );
                          });
                        })()
                      )}
                    </tbody>
                  </table>
                </div>

                {sorterEnv === "team" && teamLaneLayoutType === "parallel" && (() => {
                  const currentDistances = currentTournamentDoc?.teamDistances || [];
                  if (currentDistances.length === 0) return null;
                  const selectedDistance = currentDistances[selectedSorterRoundIdx];
                  if (!selectedDistance) return null;

                  const effectiveShotsCount = selectedDistance.teamShotCount || currentTournamentDoc?.teamShotsCount || 5;
                  const effectiveDirectMaxPoints = currentTournamentDoc?.teamDirectMaxShots;

                  const roundResults = calculateRounds(
                    masterAthletes,
                    currentDistances,
                    effectiveShotsCount,
                    effectiveDirectMaxPoints
                  );

                  // Find and sort clubs exactly like above
                  const clubsSet = new Set<string>(
                    masterAthletes
                      .filter((a) => a.team && a.team.trim() !== "" && a.team.trim() !== "Tự do" && a.isPrimaryTeam)
                      .map((a) => a.team!.trim())
                  );
                  const sortedClubs = Array.from(clubsSet);

                  const getClubPrevScore = (clubName: string) => {
                    const mainShooters = masterAthletes.filter(
                      (a) => a.team?.trim() === clubName && a.isPrimaryTeam
                    );
                    const prevRoundRes = roundResults[selectedSorterRoundIdx - 1];
                    if (!prevRoundRes || !prevRoundRes.scores) return 0;
                    let total = 0;
                    for (const shooter of mainShooters) {
                      const sc = prevRoundRes.scores[shooter.id];
                      if (sc) {
                        total += sc.displayScoreWithSolo !== undefined ? sc.displayScoreWithSolo : sc.displayScore;
                      }
                    }
                    return total;
                  };

                  sortedClubs.sort((clubA, clubB) => {
                    const sbdA = (currentTournamentDoc?.teamDrawnNumbers || {})[clubA] || 999999;
                    const sbdB = (currentTournamentDoc?.teamDrawnNumbers || {})[clubB] || 999999;
                    if (selectedSorterRoundIdx === 0 || sortCriteria === "sbd") {
                      return sbdA - sbdB;
                    }
                    const scoreA = getClubPrevScore(clubA);
                    const scoreB = getClubPrevScore(clubB);
                    if (sortCriteria === "points_asc") {
                      if (scoreA !== scoreB) return scoreA - scoreB;
                      return sbdA - sbdB;
                    } else {
                      if (scoreA !== scoreB) return scoreB - scoreA;
                      return sbdA - sbdB;
                    }
                  });

                  // Build a flat ordered athletes list for parallel packing
                  let sortedTeamAthletes: Athlete[] = [];
                  for (const club of sortedClubs) {
                    const clubShooters = masterAthletes.filter(
                      (a) => a.team?.trim() === club && a.isPrimaryTeam
                    );
                    clubShooters.sort((a, b) => a.name.localeCompare(b.name));
                    sortedTeamAthletes.push(...clubShooters);
                  }

                  // Group by team, keeping order
                  const teamsInOrder: Array<{ teamName: string; athletes: Athlete[] }> = [];
                  sortedTeamAthletes.forEach(athlete => {
                    const teamName = athlete.team?.trim() || "Tự do";
                    let existing = teamsInOrder.find(t => t.teamName === teamName);
                    if (!existing) {
                      existing = { teamName, athletes: [] };
                      teamsInOrder.push(existing);
                    }
                    existing.athletes.push(athlete);
                  });

                  // Pack into squads
                  const localPackedSquads: Array<Array<Athlete | null>> = [];
                  const remainingTeams = [...teamsInOrder];

                  while (remainingTeams.length > 0) {
                    const currentSquad: Array<Athlete | null> = Array(laneCapacity).fill(null);
                    let currentEmptyIdx = 0;

                    while (currentEmptyIdx < laneCapacity && remainingTeams.length > 0) {
                      const spaceLeft = laneCapacity - currentEmptyIdx;
                      let foundTeamIdx = -1;
                      for (let i = 0; i < remainingTeams.length; i++) {
                        if (remainingTeams[i].athletes.length <= spaceLeft) {
                          foundTeamIdx = i;
                          break;
                        }
                      }

                      if (foundTeamIdx !== -1) {
                        const teamToPlace = remainingTeams[foundTeamIdx];
                        teamToPlace.athletes.forEach((ath, offset) => {
                          currentSquad[currentEmptyIdx + offset] = ath;
                        });
                        currentEmptyIdx += teamToPlace.athletes.length;
                        remainingTeams.splice(foundTeamIdx, 1);
                      } else {
                        if (currentEmptyIdx === 0) {
                          const teamToPlace = remainingTeams[0];
                          const fitCount = Math.min(teamToPlace.athletes.length, laneCapacity);
                          for (let offset = 0; offset < fitCount; offset++) {
                            currentSquad[offset] = teamToPlace.athletes[offset];
                          }
                          currentEmptyIdx = fitCount;
                          if (teamToPlace.athletes.length > laneCapacity) {
                            teamToPlace.athletes = teamToPlace.athletes.slice(laneCapacity);
                          } else {
                            remainingTeams.shift();
                          }
                        } else {
                          break;
                        }
                      }
                    }
                    localPackedSquads.push(currentSquad);
                  }

                  return (
                    <div className="bg-slate-50 dark:bg-slate-900/40 p-4.5 rounded-2xl border border-gray-150 dark:border-slate-800 space-y-3.5 mt-4">
                      <div className="flex items-center gap-2">
                        <LayoutGrid className="w-4 h-4 text-rose-500 shrink-0" />
                        <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                          {isEng ? "PREDICTED SQUAD & LANE SCHEME" : "SƠ ĐỒ CHIA LƯỢT BỆ BẮN SONG SONG (DỰ KIẾN)"}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                        {localPackedSquads.map((squad, sIdx) => {
                          const usedLanes = squad.filter(ath => ath !== null).length;
                          const emptyLanes = laneCapacity - usedLanes;

                          return (
                            <div key={sIdx} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-3.5 space-y-3">
                              <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-800 pb-2">
                                <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                                  {isEng ? `Squad ${sIdx + 1}` : `Lượt bắn ${sIdx + 1}`}
                                </span>
                                <span className="text-[10px] font-bold text-gray-500 bg-gray-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full">
                                  {isEng ? `${usedLanes}/${laneCapacity} Lanes Used` : `${usedLanes}/${laneCapacity} Làn`}
                                </span>
                              </div>

                              <div className="space-y-1.5">
                                {squad.map((athlete, lIdx) => (
                                  <div key={lIdx} className="flex justify-between items-center text-[11px] py-1 font-medium border-b border-dashed border-gray-50 dark:border-slate-850 last:border-0">
                                    <span className="font-mono text-[9.5px] text-gray-450 font-bold uppercase shrink-0 w-12">LANE {lIdx + 1}</span>
                                    {athlete ? (
                                      <div className="flex items-center justify-between gap-2 w-full truncate pl-2">
                                        <span className="text-slate-800 dark:text-slate-200 font-extrabold truncate" title={athlete.name}>{athlete.name}</span>
                                        <span className="text-[9.5px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded uppercase max-w-[100px] truncate" title={athlete.team}>{athlete.team}</span>
                                      </div>
                                    ) : (
                                      <span className="text-gray-400 dark:text-slate-600 italic pl-2 w-full text-left font-normal">{isEng ? "Empty" : "Trống (Bỏ qua)"}</span>
                                    )}
                                  </div>
                                ))}
                              </div>

                              {emptyLanes > 0 && (
                                <div className="text-[10px] text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/20 border border-amber-150 dark:border-amber-900/20 rounded-lg p-2 flex items-center gap-1.5 leading-normal">
                                  <span>⚠️</span>
                                  <span>{isEng ? `${emptyLanes} lane(s) left empty for team alignment.` : `Dư ${emptyLanes} làn bệ bắn được để trống để giữ đồng đội cùng lượt.`}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
