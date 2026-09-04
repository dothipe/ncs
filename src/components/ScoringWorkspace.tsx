import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  HelpCircle, 
  Info, 
  User, 
  Users, 
  Unlock, 
  Lock, 
  UserPlus, 
  X, 
  Plus, 
  Check,
  Search
} from "lucide-react";
import { DistanceConfig, Athlete } from "../types";
import { TournamentData } from "../lib/firebaseService";
import { AthleteCard } from "./AthleteCard";

interface ScoringWorkspaceProps {
  language: "vi" | "en";
  tournamentType: "individual" | "team" | "combined";
  competitionMode: "individual" | "team";
  setCompetitionMode: (mode: "individual" | "team") => void;
  setIsSpectatorModeOverridden: (val: boolean) => void;
  userRole: "admin" | "referee" | "spectator";
  isScoringEditAuthorized: boolean;
  setIsScoringEditAuthorized: (auth: boolean) => void;
  currentAthletes: Athlete[];
  activeFilteredScoringAthletes: Athlete[];
  currentTournamentDoc: TournamentData | null;
  currentUser: any;
  currentDistances: DistanceConfig[];
  currentShotsCount: number;
  handleToggleScore: (athleteId: string, distanceId: string, index: number, value: boolean | null) => void;
  handleUpdateAthlete: (athleteId: string, name: string, team: string, customId?: string) => void;
  handleDeleteAthlete: (athleteId: string) => void;
  handleMoveAthlete: (athleteId: string, direction: "up" | "down") => void;
  handleUpdateSoloHits: (athleteId: string, distanceId: string, rounds: any[]) => void;
  setShowUnlockScoreModal: (show: boolean) => void;
  handleUpdateDirectScore: (athleteId: string, distanceId: string, score: number) => void;
  directMaxPoints?: number;
  teamDirectMaxPoints?: number;
  isAddingAthleteToTournament: boolean;
  setIsAddingAthleteToTournament: (show: boolean) => void;
  masterAthletes: Athlete[];
  setAthletes: React.Dispatch<React.SetStateAction<Athlete[]>>;
  setTeamAthletes: React.Dispatch<React.SetStateAction<Athlete[]>>;
  handleAddBlankAthlete: () => void;
  setActiveTab: (tab: any) => void;
  setSettingsSubTab: (subtab: any) => void;
}

export function ScoringWorkspace({
  language,
  tournamentType,
  competitionMode,
  setCompetitionMode,
  setIsSpectatorModeOverridden,
  userRole,
  isScoringEditAuthorized,
  setIsScoringEditAuthorized,
  currentAthletes,
  activeFilteredScoringAthletes,
  currentTournamentDoc,
  currentUser,
  currentDistances,
  currentShotsCount,
  handleToggleScore,
  handleUpdateAthlete,
  handleDeleteAthlete,
  handleMoveAthlete,
  handleUpdateSoloHits,
  setShowUnlockScoreModal,
  handleUpdateDirectScore,
  directMaxPoints,
  teamDirectMaxPoints,
  isAddingAthleteToTournament,
  setIsAddingAthleteToTournament,
  masterAthletes,
  setAthletes,
  setTeamAthletes,
  handleAddBlankAthlete,
  setActiveTab,
  setSettingsSubTab
}: ScoringWorkspaceProps) {
  const [tourAddSearch, setTourAddSearch] = useState("");
  const [selectedTourAthleteIds, setSelectedTourAthleteIds] = useState<string[]>([]);

  useEffect(() => {
    if (currentTournamentDoc?.forcedRefMode === "individual" && competitionMode !== "individual") {
      setCompetitionMode("individual");
    } else if (currentTournamentDoc?.forcedRefMode === "team" && competitionMode !== "team") {
      setCompetitionMode("team");
    }
  }, [currentTournamentDoc?.forcedRefMode, competitionMode, setCompetitionMode]);

  const isGlobalLocked = currentTournamentDoc?.forcedRefMode === "locked";
  const isScoringAuthorized = userRole === "admin" && isScoringEditAuthorized && !isGlobalLocked;

  return (
    <div className="flex flex-col gap-6">

      {/* Global Locked Notice */}
      {isGlobalLocked && (
        <div className="bg-rose-50 border border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/40 p-4 rounded-2xl flex items-center gap-3 animate-pulse">
          <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-extrabold text-sm text-rose-700 dark:text-rose-400 uppercase tracking-wide">
              {language === "en" ? "Tournament Locked / Not Started" : "GIẢI ĐẤU ĐANG KHÓA / CHƯA BẮT ĐẦU THI ĐẤU"}
            </h4>
            <p className="text-[11px] text-rose-600 dark:text-rose-350 leading-normal">
              {language === "en" 
                ? "The executive board has locked all scoring entry. Referees are not permitted to input scores or call players at this time."
                : "Ban điều hành đã khóa toàn bộ hệ thống chấm điểm sân đấu. Trọng tài thực địa không thể nhập điểm hay gọi vận động viên lúc này."}
            </p>
          </div>
        </div>
      )}

      {/* Environment Switcher for Combined Tournament */}
      {tournamentType === "combined" && (
        <div className="flex flex-col gap-1.5 mb-2">
          {currentTournamentDoc?.forcedRefMode && currentTournamentDoc.forcedRefMode !== "free" && (
            <div className="flex items-center gap-1 text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-wider px-1">
              <Lock className="w-3 h-3 text-rose-500 shrink-0" />
              <span>{language === "en" ? "Competition mode locked by executive" : "Môi trường thi đấu đang khóa bởi ban điều hành"}</span>
            </div>
          )}
          <div className="flex w-full bg-gray-100 dark:bg-slate-850 p-1.5 rounded-xl gap-1.5 border border-gray-200/50 dark:border-slate-700/50 relative overflow-hidden">
            <button
              onClick={() => {
                if (currentTournamentDoc?.forcedRefMode && currentTournamentDoc.forcedRefMode !== "free") return;
                setCompetitionMode("individual");
                localStorage.setItem("slingshot_competition_mode", "individual");
                setIsSpectatorModeOverridden(true);
              }}
              disabled={currentTournamentDoc?.forcedRefMode && currentTournamentDoc.forcedRefMode !== "free"}
              className={`flex-1 w-1/2 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                competitionMode === "individual"
                  ? "bg-indigo-650 text-white shadow-md scale-[1.02]"
                  : "text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200"
              } ${(currentTournamentDoc?.forcedRefMode && currentTournamentDoc.forcedRefMode !== "free" && competitionMode !== "individual") ? "opacity-40 cursor-not-allowed hover:text-gray-500" : ""}`}
            >
              <User className="w-4 h-4" />
              {language === "en" ? "Individual" : "Cá Nhân"}
            </button>
            <button
              onClick={() => {
                if (currentTournamentDoc?.forcedRefMode && currentTournamentDoc.forcedRefMode !== "free") return;
                setCompetitionMode("team");
                localStorage.setItem("slingshot_competition_mode", "team");
                setIsSpectatorModeOverridden(true);
              }}
              disabled={currentTournamentDoc?.forcedRefMode && currentTournamentDoc.forcedRefMode !== "free"}
              className={`flex-1 w-1/2 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                competitionMode === "team"
                  ? "bg-indigo-650 text-white shadow-md scale-[1.02]"
                  : "text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200"
              } ${(currentTournamentDoc?.forcedRefMode && currentTournamentDoc.forcedRefMode !== "free" && competitionMode !== "team") ? "opacity-40 cursor-not-allowed hover:text-gray-500" : ""}`}
            >
              <Users className="w-4 h-4" />
              {language === "en" ? "Team" : "Đồng Đội"}
            </button>
          </div>
        </div>
      )}

      {/* Protection Indicator Banner */}
      <div className={`p-4 rounded-2xl border-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-all ${
        isScoringAuthorized
          ? "bg-emerald-50/70 border-emerald-300 dark:bg-emerald-950/20 dark:border-emerald-900/60" 
          : "bg-amber-50/75 border-amber-300 dark:bg-amber-950/20 dark:border-amber-900/60"
      }`}>
        <div className="flex gap-3 items-center">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            isScoringAuthorized
              ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400" 
              : "bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400"
          }`}>
            {isScoringAuthorized ? (
              <Unlock className="w-5 h-5 animate-pulse" />
            ) : (
              <Lock className="w-5 h-5" />
            )}
          </div>
          <div>
            <span className="font-bold block text-sm text-slate-800 dark:text-slate-200">
              {isGlobalLocked
                ? "TRẠNG THÁI: KHÓA SÂN ĐẤU TOÀN DIỆN"
                : userRole === "admin" 
                  ? (isScoringEditAuthorized ? "Chế độ: ĐANG GHI ĐIỂM (Chỉnh Sửa Live)" : "Chế độ: ĐANG XEM (Đóng băng bảng điểm)")
                  : "Chế độ: XEM ĐIỂM (Đóng băng bảng điểm)"}
            </span>
            <p className="text-[11px] text-gray-500 dark:text-slate-400 leading-tight">
              {isGlobalLocked
                ? "Bất kỳ tác vụ cập nhật điểm hay ghi điểm của các bàn đều bị chặn hoàn toàn bởi Ban điều hành."
                : userRole === "admin"
                  ? (isScoringEditAuthorized 
                    ? "Bảng điểm đã được mở khóa. Bạn có thể ghi điểm trực tiếp." 
                    : "Nhấp vào bất kỳ phát bắn nào sẽ hiển thị cảnh báo mở khóa để tránh click nhầm.")
                  : "Chỉ Ban tổ chức / Admin mới có quyền sửa điểm trực tiếp tại đây. Trọng tài chỉ có quyền xem."}
            </p>
          </div>

        </div>

        {userRole === "admin" && !isGlobalLocked && (
          <div className="flex gap-2 self-end sm:self-auto shrink-0">
            {isScoringEditAuthorized ? (
              <button
                onClick={() => setIsScoringEditAuthorized(false)}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" /> {language === "en" ? "Lock: View Only" : "Lock: Chuyển Chế độ Xem"}
              </button>
            ) : (
              <button
                onClick={() => setIsScoringEditAuthorized(true)}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-extrabold rounded-lg shadow-md transition-all flex items-center gap-1.5 cursor-pointer focus:ring-2 focus:ring-indigo-300"
              >
                <Unlock className="w-3.5 h-3.5 animate-bounce" /> {language === "en" ? "Unlock: Edit Scores" : "Unlock: Ghi Điểm"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Informative tips box if athletes is zero */}
      {currentAthletes.length === 0 && (
        <div className="text-center p-12 border-2 border-dashed border-gray-300 dark:border-slate-800 rounded-3xl bg-white dark:bg-slate-900 shadow-sm">
          <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-700 dark:text-slate-300">
            {language === "en" ? "No athletes in the tournament currently" : "Hiện không có VĐV nào trong giải đấu"}
          </h3>
          <p className="text-sm text-gray-400 mt-1 max-w-sm mx-auto">
            {language === "en" ? (
              "Please click the '+' button below to add athletes from system profiles to this tournament!"
            ) : (
              <>Hãy nhấn nút <span className="text-rose-500 font-extrabold text-base border border-rose-200 bg-rose-50/50 px-2 py-0.5 rounded-lg">+</span> bên dưới để thêm các vận động viên từ hồ sơ hệ thống vào giải đấu hiện tại!</>
            )}
          </p>
        </div>
      )}

       {/* Grid Athletes List of Cards (Dynamic responsive) */}
      <div className="flex flex-col gap-6">
        {activeFilteredScoringAthletes.map((athlete) => {
          const originalIndex = currentAthletes.findIndex((a) => a.id === athlete.id);
          const isFirst = originalIndex === 0;
          const isLast = originalIndex === currentAthletes.length - 1;
          
          const activeInputListInDoc = competitionMode === "individual"
            ? (currentTournamentDoc?.inputAthletes || [])
            : (currentTournamentDoc?.teamInputAthletes || []);
          const docActiveInputPlayer = activeInputListInDoc.find((a) => a.id === athlete.id);
          const isLockedByOtherReferee = userRole !== "admin" && (!!(athlete.calledBy && 
            athlete.calledBy.toLowerCase().trim() !== (currentUser?.email || "anonymous").toLowerCase().trim()) || 
            !!(docActiveInputPlayer?.calledBy && docActiveInputPlayer.calledBy.toLowerCase().trim() !== (currentUser?.email || "anonymous").toLowerCase().trim()));
          const lockedByRefereeEmail = athlete.calledBy || docActiveInputPlayer?.calledBy || "";

          return (
            <AthleteCard
              key={athlete.id}
              athlete={athlete}
              distances={currentDistances}
              shotsCount={currentShotsCount}
              onToggleScore={handleToggleScore}
              onUpdateAthlete={handleUpdateAthlete}
              onDeleteAthlete={handleDeleteAthlete}
              onMoveAthlete={handleMoveAthlete}
              isFirst={isFirst}
              isLast={isLast}
              onUpdateSoloHits={handleUpdateSoloHits}
              isScoringEditAuthorized={isScoringAuthorized}
              onTriggerUnlockModal={() => setShowUnlockScoreModal(true)}
              onUpdateDirectScore={handleUpdateDirectScore}
              directMaxPoints={competitionMode === "individual" ? directMaxPoints : teamDirectMaxPoints}
              isLockedByOtherReferee={isLockedByOtherReferee}
              lockedByRefereeEmail={lockedByRefereeEmail}
              userRole={userRole}
            />
          );
        })}
      </div>

      {/* Dynamic instruction helper indicating calculated score logic */}
      <div className="bg-blue-50/50 border border-blue-200/50 rounded-2xl p-4 flex gap-3 text-xs text-blue-800">
        <Info className="w-5 h-5 text-blue-500 shrink-0" />
        <div>
          <span className="font-bold block mb-1">Cách tính điểm tự động của hệ thống:</span>
          <ul className="list-disc pl-4 space-y-1 text-[11px]">
            <li>Mỗi ô checked (tích) của lượt bắn đại diện cho 1 phát trúng (Hit) tương đương 1 điểm cơ sở.</li>
            <li>Điểm số của từng cự ly = <span className="font-bold">Số viên trúng × Hệ số điểm nhân</span> của cự ly đó.</li>
            <li>ĐIỂM TỔNG = Tổng điểm cộng dồn từ toàn bộ các dòng cự ly.</li>
          </ul>
        </div>
      </div>

      {/* Modal for adding system athletes to Tournament Scoring */}
      {isAddingAthleteToTournament && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden relative">
            
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950/50">
              <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-2 uppercase tracking-wide">
                <UserPlus className="w-4 h-4 text-indigo-600" />
                Thêm VĐV hệ thống vào giải đấu
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsAddingAthleteToTournament(false);
                  setTourAddSearch("");
                  setSelectedTourAthleteIds([]);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search & Select All Tools */}
            <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm kiếm hồ sơ theo ID, Tên, Đội..."
                  value={tourAddSearch}
                  onChange={(e) => setTourAddSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium dark:text-white"
                />
              </div>

              {(() => {
                const unselected = masterAthletes.filter(
                  (m) => !currentAthletes.some((a) => a.id === m.id) && m.status !== "Bỏ thi" && (competitionMode !== "team" || m.isPrimaryTeam)
                );
                const filtered = unselected.filter((m) => {
                  if (!tourAddSearch.trim()) return true;
                  const s = tourAddSearch.toLowerCase();
                  return (
                    m.id.toLowerCase().includes(s) ||
                    m.name.toLowerCase().includes(s) ||
                    (m.team && m.team.toLowerCase().includes(s))
                  );
                });

                if (filtered.length === 0) return null;

                const allFilteredSelected = filtered.every((f) => selectedTourAthleteIds.includes(f.id));

                const handleToggleSelectAll = () => {
                  if (allFilteredSelected) {
                    const filteredIds = filtered.map((f) => f.id);
                    setSelectedTourAthleteIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
                  } else {
                    const filteredIds = filtered.map((f) => f.id);
                    setSelectedTourAthleteIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
                  }
                };

                return (
                  <div className="flex items-center justify-between px-1 text-xs pt-1">
                    <button
                      type="button"
                      onClick={handleToggleSelectAll}
                      className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1.5"
                    >
                      <span>{allFilteredSelected ? "Bỏ chọn tất cả" : `Chọn tất cả kết quả (${filtered.length})`}</span>
                    </button>
                    {selectedTourAthleteIds.length > 0 && (
                      <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                        Đã chọn: {selectedTourAthleteIds.length} VĐV
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Athlete Roster Scroll Area */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 min-h-[220px]">
              {(() => {
                const unselected = masterAthletes.filter(
                  (m) => !currentAthletes.some((a) => a.id === m.id) && m.status !== "Bỏ thi" && (competitionMode !== "team" || m.isPrimaryTeam)
                );
                const filtered = unselected.filter((m) => {
                  if (!tourAddSearch.trim()) return true;
                  const s = tourAddSearch.toLowerCase();
                  return (
                    m.id.toLowerCase().includes(s) ||
                    m.name.toLowerCase().includes(s) ||
                    (m.team && m.team.toLowerCase().includes(s))
                  );
                });

                if (unselected.length === 0) {
                  return (
                    <div className="text-center py-8 text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Tất cả vận động viên trong hệ thống hiện đã có mặt ở giải đấu này.
                    </div>
                  );
                }

                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-8 text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Không tìm thấy vận động viên nào phù hợp với tìm kiếm.
                    </div>
                  );
                }

                return filtered.map((m) => {
                  const isChecked = selectedTourAthleteIds.includes(m.id);
                  return (
                    <div
                      key={m.id}
                      onClick={() => {
                        setSelectedTourAthleteIds((prev) =>
                          prev.includes(m.id) ? prev.filter((id) => id !== m.id) : [...prev, m.id]
                        );
                      }}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none ${
                        isChecked
                          ? "bg-indigo-50/90 dark:bg-indigo-950/60 border-indigo-500 dark:border-indigo-600 shadow-sm ring-1 ring-indigo-500"
                          : "bg-slate-50/50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-800 hover:bg-indigo-50/20"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
                            isChecked
                              ? "bg-indigo-600 border-indigo-600 text-white"
                              : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-transparent"
                          }`}
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                        </div>
                        <span className="text-[10px] uppercase font-bold font-mono text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-1.5 py-0.5 rounded shrink-0 border border-indigo-200 dark:border-indigo-900">
                          ID: {m.id}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{m.name}</span>
                            {m.status === "Bỏ thi" && (
                              <span className="text-[9px] font-extrabold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded border border-rose-200 uppercase whitespace-nowrap shrink-0">
                                Bỏ thi
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-gray-500 dark:text-slate-400 block truncate">
                            {m.team || "Tự do"} • {m.gender || "Nam"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Footer: HỦY and GỌI X VĐV */}
            <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 flex items-center justify-between gap-3">
              <div className="text-[11px] text-slate-400 truncate max-w-[200px] sm:max-w-none">
                Nếu chưa có VĐV, vào tab{" "}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("settings");
                    setSettingsSubTab("athletes");
                    setIsAddingAthleteToTournament(false);
                    setSelectedTourAthleteIds([]);
                  }}
                  className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline font-semibold"
                >
                  Quản Lý VĐV
                </button>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingAthleteToTournament(false);
                    setTourAddSearch("");
                    setSelectedTourAthleteIds([]);
                  }}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  HỦY
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedTourAthleteIds.length === 0) {
                      alert(language === "en" ? "Please select at least 1 athlete!" : "Vui lòng chọn ít nhất 1 vận động viên!");
                      return;
                    }
                    const toAdd = masterAthletes.filter((m) => selectedTourAthleteIds.includes(m.id));
                    const newAthletes: Athlete[] = toAdd.map((m) => {
                      const freshScores: Record<string, (boolean | null)[]> = {};
                      currentDistances.forEach((d) => {
                        const dShots = (d.shotCount !== undefined && d.shotCount !== null)
                          ? Number(d.shotCount)
                          : ((d.teamShotCount !== undefined && d.teamShotCount !== null)
                              ? Number(d.teamShotCount)
                              : currentShotsCount);
                        freshScores[d.id] = Array(dShots).fill(null);
                      });
                      return {
                        ...m,
                        scores: freshScores,
                      };
                    });
                    if (competitionMode === "individual") {
                      setAthletes((prev) => [...prev, ...newAthletes]);
                    } else {
                      setTeamAthletes((prev) => [...prev, ...newAthletes]);
                    }
                    setSelectedTourAthleteIds([]);
                    setIsAddingAthleteToTournament(false);
                    setTourAddSearch("");
                  }}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-extrabold shadow-md hover:shadow-lg transition-all cursor-pointer uppercase tracking-wider flex items-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" />
                  GỌI {selectedTourAthleteIds.length} VĐV
                </button>
              </div>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* The giant Centered button below cards list as described by User */}
      {userRole === "admin" && (
        <div className="flex justify-center items-center py-6">
          <button
            onClick={handleAddBlankAthlete}
            className="w-14 h-14 bg-white hover:bg-rose-50 border-2 border-rose-500 text-rose-500 rounded-xl flex items-center justify-center shadow-md hover:shadow-lg hover:scale-105 transition-all duration-150 cursor-pointer"
            title="Thêm vận động viên mới"
            id="add-athlete-giant-btn"
          >
            <Plus className="w-8 h-8 stroke-[3]" />
          </button>
        </div>
      )}

    </div>
  );
}
