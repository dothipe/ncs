import React, { useState, useEffect } from "react";
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
  ListOrdered
} from "lucide-react";
import { TournamentData, updateOnlineTournament } from "../lib/firebaseService";
import { Athlete, DistanceConfig } from "../types";
import { showToast } from "../utils/toast";

interface TournamentExecutionHubProps {
  currentTournamentDoc: TournamentData | null;
  activeHistoryId: string | null;
  language: "vi" | "en";
  userRole: "admin" | "referee" | "spectator";
}

export const TournamentExecutionHub: React.FC<TournamentExecutionHubProps> = ({
  currentTournamentDoc,
  activeHistoryId,
  language,
  userRole
}) => {
  const isEng = language === "en";

  // Sub-tabs inside Execution Hub
  const [subTab, setSubTab] = useState<"enforcer" | "lucky_draw" | "lane_monitor" | "sorter">("enforcer");

  // Local state for sorting criteria
  const [sortCriteria, setSortCriteria] = useState<"sbd" | "points_asc" | "points_desc">("sbd");

  // Local state for manual SBD input
  const [editingSbdAthleteId, setEditingSbdAthleteId] = useState<string | null>(null);
  const [manualSbdValue, setManualSbdValue] = useState<number | "">("");

  // Auto-subscribe to changes if tournament doc updates (via parent triggers)
  const isNational = currentTournamentDoc?.isNational || false;
  const isDrawingOpen = currentTournamentDoc?.isDrawingOpen || false;
  const forcedRefMode = currentTournamentDoc?.forcedRefMode || "free";
  const laneCapacity = currentTournamentDoc?.laneCapacity || 10;
  const masterAthletes = currentTournamentDoc?.masterAthletes || [];
  const drawnNumbers = currentTournamentDoc?.drawnNumbers || {};

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
  const handleSetForcedMode = async (mode: "individual" | "team" | "free") => {
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
          : `Đã khóa chỉ định môi trường chấm điểm: ${mode === "individual" ? "CÁ NHÂN" : mode === "team" ? "ĐỒNG ĐỘI" : "TỰ DO"}!`
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
      let drawnCount = 0;

      masterAthletes.forEach((athlete) => {
        if (!nextDrawnNumbers[athlete.id]) {
          const pickedNum = shuffled.pop();
          if (pickedNum !== undefined) {
            nextDrawnNumbers[athlete.id] = pickedNum;
            drawnCount++;
          }
        }
      });

      await updateOnlineTournament(activeHistoryId, {
        drawnNumbers: nextDrawnNumbers
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
      }

      nextDrawnNumbers[athleteId] = num;
      await updateOnlineTournament(activeHistoryId, {
        drawnNumbers: nextDrawnNumbers
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
      const distances = currentTournamentDoc?.distances || [];
      let sortedList = [...masterAthletes];

      if (sortCriteria === "sbd") {
        sortedList.sort((a, b) => {
          const sbdA = drawnNumbers[a.id] || 999999;
          const sbdB = drawnNumbers[b.id] || 999999;
          return sbdA - sbdB;
        });
      } else if (sortCriteria === "points_asc") {
        sortedList.sort((a, b) => {
          const scoreA = calculateTotalScore(a, distances);
          const scoreB = calculateTotalScore(b, distances);
          return scoreA - scoreB;
        });
      } else if (sortCriteria === "points_desc") {
        sortedList.sort((a, b) => {
          const scoreA = calculateTotalScore(a, distances);
          const scoreB = calculateTotalScore(b, distances);
          return scoreB - scoreA;
        });
      }

      const orderIds = sortedList.map((a) => a.id);
      await updateOnlineTournament(activeHistoryId, {
        sortedAthleteOrder: orderIds
      });

      showToast(
        isEng 
          ? "Shooting order updated & applied to next round!" 
          : "Đã áp dụng & cập nhật thứ tự lượt bắn cho Vòng tiếp theo!"
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
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
              </div>
            </div>
          )}

          {/* Subtab 2: Lucky Draw / SBD (Bốc thăm Số thứ tự báo danh) */}
          {subTab === "lucky_draw" && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-150 dark:border-slate-800 p-5 space-y-5 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-gray-100 dark:border-slate-850 gap-3">
                <div className="flex items-center gap-2.5">
                  <Shuffle className="w-5 h-5 text-indigo-500" />
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                    {isEng ? "Roster SBD Drawing Dashboard" : "BỐC THĂM SỐ THỨ TỰ BÁO DANH (SBD)"}
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-2">
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
                    onClick={handleBatchDrawRemaining}
                    className="bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-sm border border-slate-900"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                    <span>{isEng ? "BTC Draw Remaining" : "BTC BỐC THĂM NGẪU NHIÊN"}</span>
                  </button>
                </div>
              </div>

              {/* Statistics Row */}
              {(() => {
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
              })()}

              {/* Roster list table */}
              <div className="overflow-x-auto border border-gray-150 dark:border-slate-800 rounded-xl">
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
                                  <div className="flex items-center gap-1.5">
                                    <span className="inline-flex items-center justify-center font-black font-mono px-2 py-0.5 rounded text-xs bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-150 dark:border-rose-900/30">
                                      {String(sbd).padStart(3, "0")}
                                    </span>
                                    <span className="text-[9px] text-emerald-500 font-semibold flex items-center gap-0.5">
                                      <CheckCircle className="w-2.5 h-2.5" />
                                      {isEng ? "Locked" : "Bản bốc"}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-[10px] bg-amber-50 dark:bg-amber-955/20 text-amber-600 dark:text-amber-400 border border-amber-150 dark:border-amber-900/30 px-2 py-0.5 rounded font-bold uppercase tracking-wider animate-pulse">
                                    {isEng ? "Pending draw" : "Chờ bốc thăm"}
                                  </span>
                                )}
                              </td>
                              <td className="p-3 font-mono text-[11px] font-bold text-slate-500">{athlete.id}</td>
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
              </div>
            </div>
          )}

          {/* Subtab 3: Live Lanes Telemetry (Giám sát Bàn súng thời gian thực) */}
          {subTab === "lane_monitor" && (
            <div className="space-y-5 animate-fadeIn">
              {/* Telemetry Info summary */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-150 dark:border-slate-800 p-5 space-y-3.5">
                <div className="flex items-center gap-2.5 pb-2 border-b border-gray-100 dark:border-slate-850">
                  <Activity className="w-5 h-5 text-rose-500 animate-pulse" />
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                    {isEng ? "Real-time Lane Telemetry Monitor" : "GIÁM SÁT TIẾN ĐỘ BÀN SÚNG THỜI GIAN THỰC (LANE MONITOR)"}
                  </h2>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-slate-400 leading-relaxed max-w-2xl">
                  {isEng 
                    ? "Monitor every active lane and see which athletes are currently called on stage and their live shot score bullets."
                    : "Theo dõi dòng chảy dữ liệu trực tiếp tại thực địa. Hiển thị thông tin VĐV đang thi đấu tại từng Lane và trạng thái bắn trúng/trượt thời gian thực do các Trọng tài gõ điểm từ xa truyền về."}
                </p>
              </div>

              {/* Grid representation of lanes */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: laneCapacity }).map((_, idx) => {
                  const laneNum = idx + 1;
                  // Find if there is any athlete currently active inside inputAthletes / teamInputAthletes for this lane
                  // In VSC, each referee calls an athlete. Since there are N lanes, we can associate athletes with lane based on their SBD mod laneCapacity, or based on their order, or simply display who is currently being scored!
                  // Let's find currently called athletes in inputAthletes / teamInputAthletes.
                  const currentInputList = currentTournamentDoc?.competitionMode === "team"
                    ? (currentTournamentDoc?.teamInputAthletes || [])
                    : (currentTournamentDoc?.inputAthletes || []);

                  // Match athlete to this lane based on: we can assign them lane index sequentially, or let referees assign lanes, or simply look at the athlete index.
                  // For displaying lanes, a standard physical rule is: an athlete is on Lane if they are active, let's map the `index` in the list to the Lane, or let's say: athlete called by referee `X` gets lane `idx`. 
                  // Let's look at `currentInputList[idx]` to associate with Lane index `idx`!
                  const activeAthleteOnLane = currentInputList[idx] || null;

                  return (
                    <div 
                      key={`lane-${laneNum}`}
                      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3.5 ${
                        activeAthleteOnLane 
                          ? "bg-white dark:bg-slate-900 border-rose-500 shadow-md ring-1 ring-rose-500/10" 
                          : "bg-slate-50 dark:bg-slate-950/30 border-gray-150 dark:border-slate-800 opacity-60"
                      }`}
                    >
                      {/* Lane index header */}
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
                        <div className="space-y-3.5">
                          {/* Athlete Info */}
                          <div>
                            <span className="block text-[8.5px] font-black text-rose-500 uppercase tracking-wider font-mono">
                              VSC-{String(drawnNumbers[activeAthleteOnLane.id] || "0").padStart(4, "0")}
                            </span>
                            <span className="text-sm font-black text-slate-800 dark:text-white block mt-0.5 truncate">
                              {activeAthleteOnLane.name}
                            </span>
                            <span className="text-[10px] text-gray-500 dark:text-slate-400 block truncate mt-0.5">
                              {activeAthleteOnLane.team || "Independent"} &bull; Ref: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{activeAthleteOnLane.calledBy || "Anon"}</span>
                            </span>
                          </div>

                          {/* Scores Bullets Telemetry Grid */}
                          <div className="space-y-2 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-gray-150 dark:border-slate-800/80">
                            {Object.keys(activeAthleteOnLane.scores || {}).map((distId) => {
                              const distObj = (currentTournamentDoc?.competitionMode === "team" ? currentTournamentDoc?.teamDistances : currentTournamentDoc?.distances)?.find((d) => d.id === distId);
                              const distLabel = distObj?.distance || distId;
                              const shots = activeAthleteOnLane.scores[distId] || [];

                              return (
                                <div key={distId} className="space-y-1.5">
                                  <div className="flex justify-between text-[8px] font-black text-gray-500 uppercase tracking-widest leading-none">
                                    <span>CỰ LY: {distLabel}</span>
                                    <span>HITS: {shots.filter((s) => s === true).length}/{shots.length}</span>
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {shots.map((shot, shotIdx) => (
                                      <span 
                                        key={shotIdx}
                                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-mono font-black border transition-all ${
                                          shot === true
                                            ? "bg-emerald-600 text-white border-emerald-500 shadow-sm"
                                            : shot === false
                                            ? "bg-rose-600 text-white border-rose-500 shadow-sm"
                                            : "bg-gray-150 text-gray-400 border-gray-200 dark:bg-slate-800 dark:border-slate-700"
                                        }`}
                                      >
                                        {shot === true ? "X" : shot === false ? "O" : "-"}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="h-32 flex flex-col items-center justify-center text-center p-4 text-slate-400 dark:text-slate-600">
                          <Activity className="w-8 h-8 text-gray-300 dark:text-slate-800 mb-2" />
                          <span className="text-[10px] font-bold">Làn trống - Sẵn sàng</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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

              {/* Sorting rules selector */}
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-gray-150 dark:border-slate-800 space-y-4">
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
                        <span className="block text-[9.5px] text-gray-500 mt-0.5 leading-normal">
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
                        <span className="block text-[9.5px] text-gray-500 mt-0.5 leading-normal">
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
                        <span className="block text-[9.5px] text-gray-500 mt-0.5 leading-normal">
                          VĐV điểm cao bắn trước để tạo sức ép điểm số lớn cho các VĐV bắn sau.
                        </span>
                      </div>
                    </button>
                  </div>
                </div>

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
                      <tr>
                        <th className="p-3 w-16 text-center">{isEng ? "Order" : "THỨ TỰ BẮN"}</th>
                        <th className="p-3 w-24">{isEng ? "SBD" : "SBD"}</th>
                        <th className="p-3">{isEng ? "Athlete Name" : "HỌ VÀ TÊN"}</th>
                        <th className="p-3">{isEng ? "Club" : "ĐỘI / CLB"}</th>
                        <th className="p-3 text-right">{isEng ? "Total Score" : "ĐIỂM SỐ CHẠY ĐỒNG BỘ"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-150 dark:divide-slate-850 font-medium text-slate-700 dark:text-slate-300">
                      {masterAthletes.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-gray-400 font-bold">
                            Chưa có VĐV đăng ký.
                          </td>
                        </tr>
                      ) : (
                        (() => {
                          const distances = currentTournamentDoc?.distances || [];
                          const list = [...masterAthletes];

                          if (sortCriteria === "sbd") {
                            list.sort((a, b) => {
                              const sbdA = drawnNumbers[a.id] || 999999;
                              const sbdB = drawnNumbers[b.id] || 999999;
                              return sbdA - sbdB;
                            });
                          } else if (sortCriteria === "points_asc") {
                            list.sort((a, b) => {
                              const scoreA = calculateTotalScore(a, distances);
                              const scoreB = calculateTotalScore(b, distances);
                              return scoreA - scoreB;
                            });
                          } else if (sortCriteria === "points_desc") {
                            list.sort((a, b) => {
                              const scoreA = calculateTotalScore(a, distances);
                              const scoreB = calculateTotalScore(b, distances);
                              return scoreB - scoreA;
                            });
                          }

                          return list.map((athlete, idx) => {
                            const sbd = drawnNumbers[athlete.id] || null;
                            const totalHits = calculateTotalScore(athlete, distances);

                            return (
                              <tr key={athlete.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                <td className="p-3 text-center font-mono font-black text-slate-400">{idx + 1}</td>
                                <td className="p-3">
                                  {sbd ? (
                                    <span className="font-mono font-bold text-xs text-rose-600 dark:text-rose-400 border border-rose-150 dark:border-rose-900/30 px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40">
                                      {String(sbd).padStart(3, "0")}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-gray-450 italic">Chờ bốc</span>
                                  )}
                                </td>
                                <td className="p-3 font-bold text-slate-800 dark:text-slate-200">{athlete.name}</td>
                                <td className="p-3 text-[11px]">{athlete.team || "Tự do"}</td>
                                <td className="p-3 text-right font-mono font-black text-rose-600 dark:text-rose-400">
                                  {totalHits} HITS
                                </td>
                              </tr>
                            );
                          });
                        })()
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
