import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  Plus, 
  Check, 
  Search, 
  User, 
  Users, 
  Sparkles, 
  ClipboardCheck, 
  Eye, 
  UserPlus, 
  X, 
  Save,
  Lock 
} from "lucide-react";
import { DistanceConfig, Athlete } from "../types";
import { TournamentData } from "../lib/firebaseService";
import { AthleteCard } from "./AthleteCard";
import { deviceStorage } from "../lib/storage";
import { updateOnlineTournament } from "../lib/firebaseService";

// Helper function for centralizing base64 avatar images to save localStorage space
function stripBase64Avatars<T>(data: T): T {
  if (!data) return data;
  try {
    const clone = JSON.parse(JSON.stringify(data));
    
    const cleanAthlete = (athlete: Athlete) => {
      if (athlete && athlete.avatarUrl && athlete.avatarUrl.startsWith("data:image")) {
        athlete.avatarUrl = `local-avatar:${athlete.id}`;
      }
    };

    if (Array.isArray(clone)) {
      clone.forEach((item: any) => {
        if (item && typeof item === "object") {
          if ("scores" in item && "id" in item) {
            cleanAthlete(item as Athlete);
          } else if ("athletes" in item) {
            if (Array.isArray(item.athletes)) {
              item.athletes.forEach(cleanAthlete);
            }
          }
        }
      });
    } else if (typeof clone === "object") {
      const anyClone = clone as any;
      if ("scores" in anyClone && "id" in anyClone) {
        cleanAthlete(anyClone as Athlete);
      }
      if ("athletes" in anyClone && Array.isArray(anyClone.athletes)) {
        anyClone.athletes.forEach(cleanAthlete);
      }
      if ("inputAthletes" in anyClone && Array.isArray(anyClone.inputAthletes)) {
        anyClone.inputAthletes.forEach(cleanAthlete);
      }
      if ("teamInputAthletes" in anyClone && Array.isArray(anyClone.teamInputAthletes)) {
        anyClone.teamInputAthletes.forEach(cleanAthlete);
      }
    }
    return clone;
  } catch (err) {
    console.error("Failed to strip avatars:", err);
    return data;
  }
}

interface InputScoresWorkspaceProps {
  language: "vi" | "en";
  tournamentType: "individual" | "team" | "combined";
  competitionMode: "individual" | "team";
  setCompetitionMode: (mode: "individual" | "team") => void;
  setIsSpectatorModeOverridden: (val: boolean) => void;
  userRole: "admin" | "referee" | "spectator";
  currentUser: any;
  activeFilteredInputAthletes: Athlete[];
  currentInputAthletes: Athlete[];
  currentAthletes: Athlete[];
  currentDistances: DistanceConfig[];
  currentShotsCount: number;
  directMaxPoints?: number;
  teamDirectMaxPoints?: number;
  isAddingAthleteToInputBoard: boolean;
  setIsAddingAthleteToInputBoard: (val: boolean) => void;
  inputBoardAddSearch: string;
  setInputBoardAddSearch: (val: string) => void;
  selectedInputBoardAthleteIds: string[];
  setSelectedInputBoardAthleteIds: React.Dispatch<React.SetStateAction<string[]>>;
  masterAthletes: Athlete[];
  currentTournamentDoc: TournamentData | null;
  inputAthletes: Athlete[];
  setInputAthletes: React.Dispatch<React.SetStateAction<Athlete[]>>;
  teamInputAthletes: Athlete[];
  setTeamInputAthletes: React.Dispatch<React.SetStateAction<Athlete[]>>;
  activeHistoryId: string | null;
  handleAddAuditLog: (msg: string) => void;
  handleToggleInputScore: (athleteId: string, distanceId: string, index: number, value: boolean | null) => void;
  handleUpdateInputAthlete: (athleteId: string, name: string, team: string, customId?: string) => void;
  handleDeleteInputAthlete: (athleteId: string) => void;
  handleMoveInputAthlete: (athleteId: string, direction: "up" | "down") => void;
  handleUpdateInputSoloHits: (athleteId: string, distanceId: string, rounds: any[]) => void;
  handleUpdateDirectInputScore: (athleteId: string, distanceId: string, score: number) => void;
  setSingleAthleteToSave: (ath: Athlete | null) => void;
  setSaveStatus: (status: any) => void;
  handleSaveInputScoresToMain: () => void;
  setPendingScrollAthleteId: (id: string | null) => void;
  setActiveTab: (tab: any) => void;
  setSettingsSubTab: (subtab: any) => void;
}

export function InputScoresWorkspace({
  language,
  tournamentType,
  competitionMode,
  setCompetitionMode,
  setIsSpectatorModeOverridden,
  userRole,
  currentUser,
  activeFilteredInputAthletes,
  currentInputAthletes,
  currentAthletes,
  currentDistances,
  currentShotsCount,
  directMaxPoints,
  teamDirectMaxPoints,
  isAddingAthleteToInputBoard,
  setIsAddingAthleteToInputBoard,
  inputBoardAddSearch,
  setInputBoardAddSearch,
  selectedInputBoardAthleteIds,
  setSelectedInputBoardAthleteIds,
  masterAthletes,
  currentTournamentDoc,
  inputAthletes,
  setInputAthletes,
  teamInputAthletes,
  setTeamInputAthletes,
  activeHistoryId,
  handleAddAuditLog,
  handleToggleInputScore,
  handleUpdateInputAthlete,
  handleDeleteInputAthlete,
  handleMoveInputAthlete,
  handleUpdateInputSoloHits,
  handleUpdateDirectInputScore,
  setSingleAthleteToSave,
  setSaveStatus,
  handleSaveInputScoresToMain,
  setPendingScrollAthleteId,
  setActiveTab,
  setSettingsSubTab
}: InputScoresWorkspaceProps) {

  useEffect(() => {
    if (currentTournamentDoc?.forcedRefMode === "individual" && competitionMode !== "individual") {
      setCompetitionMode("individual");
    } else if (currentTournamentDoc?.forcedRefMode === "team" && competitionMode !== "team") {
      setCompetitionMode("team");
    }
  }, [currentTournamentDoc?.forcedRefMode, competitionMode, setCompetitionMode]);

  const myEmailForInput = (currentUser?.email || "anonymous").toLowerCase().trim();
  const myCalledInputAthletes = currentInputAthletes.filter((a) => {
    const isOnlineTour = activeHistoryId?.startsWith("tour-");
    if (isOnlineTour) {
      const caller = (a.calledBy || "").toLowerCase().trim();
      return caller === myEmailForInput;
    }
    return true;
  });

  const renderAddInputAthleteModal = () => {
    if (!isAddingAthleteToInputBoard || typeof document === "undefined") return null;
    return createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden relative">
          
          {/* Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950/50">
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-2 uppercase tracking-wide">
              <UserPlus className="w-4 h-4 text-indigo-600" />
              {language === "en" ? "Select system athletes for scoring" : "Chọn VĐV hệ thống để Nhập Điểm"}
            </h3>
            <button
              type="button"
              onClick={() => {
                setIsAddingAthleteToInputBoard(false);
                setInputBoardAddSearch("");
                setSelectedInputBoardAthleteIds([]);
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
                placeholder={language === "en" ? "Search profile by ID, Name, Team..." : "Tìm kiếm hồ sơ theo ID, Tên, Đội..."}
                value={inputBoardAddSearch}
                onChange={(e) => setInputBoardAddSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium dark:text-white"
              />
            </div>

            {(() => {
              const unselected = masterAthletes.filter((m) => {
                if (m.status === "Bỏ thi") return false;
                if (competitionMode === "team" && !m.isPrimaryTeam) return false;
                
                // Exclude only if already called by ME (the current user)
                const isAlreadyCalledByMe = currentInputAthletes.some((a) => {
                  if (a.id !== m.id) return false;
                  const myEmail = (currentUser?.email || "anonymous").toLowerCase().trim();
                  const caller = (a.calledBy || "anonymous").toLowerCase().trim();
                  return caller === myEmail;
                });
                return !isAlreadyCalledByMe;
              });
              const filtered = unselected.filter((m) => {
                if (!inputBoardAddSearch.trim()) return true;
                const s = inputBoardAddSearch.toLowerCase();
                return (
                  m.id.toLowerCase().includes(s) ||
                  m.name.toLowerCase().includes(s) ||
                  (m.team && m.team.toLowerCase().includes(s))
                );
              });

              if (filtered.length === 0) return null;

              const allowedFiltered = filtered.filter((f) => {
                const documentActivePlayer = currentInputAthletes.find((a) => a.id === f.id);
                const caller = documentActivePlayer?.calledBy ? documentActivePlayer.calledBy.toLowerCase().trim() : "";
                const myEmail = (currentUser?.email || "anonymous").toLowerCase().trim();
                return !(caller && caller !== "anonymous" && caller !== myEmail);
              });
              const allFilteredSelected = allowedFiltered.length > 0 && allowedFiltered.every((f) => selectedInputBoardAthleteIds.includes(f.id));

              const handleToggleSelectAll = () => {
                if (allFilteredSelected) {
                  const filteredIds = allowedFiltered.map((f) => f.id);
                  setSelectedInputBoardAthleteIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
                } else {
                  const filteredIds = allowedFiltered.map((f) => f.id);
                  setSelectedInputBoardAthleteIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
                }
              };

              return (
                <div className="flex items-center justify-between px-1 text-xs pt-1">
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1.5 font-semibold"
                  >
                    <span>
                      {allFilteredSelected 
                        ? (language === "en" ? "Deselect all" : "Bỏ chọn tất cả") 
                        : (language === "en" ? "Select all results (" + allowedFiltered.length + ")" : "Chọn tất cả kết quả (" + allowedFiltered.length + ")")}
                    </span>
                  </button>
                  {selectedInputBoardAthleteIds.length > 0 && (
                    <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                      {language === "en" ? "Selected: " + selectedInputBoardAthleteIds.length + " athletes" : "Đã chọn: " + selectedInputBoardAthleteIds.length + " VĐV"}
                    </span>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Athlete Roster Scroll Area */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 min-h-[220px]">
            {(() => {
              const unselected = masterAthletes.filter((m) => {
                if (m.status === "Bỏ thi") return false;
                if (competitionMode === "team" && !m.isPrimaryTeam) return false;
                
                // Exclude only if already called by ME (the current user)
                const isAlreadyCalledByMe = currentInputAthletes.some((a) => {
                  if (a.id !== m.id) return false;
                  const myEmail = (currentUser?.email || "anonymous").toLowerCase().trim();
                  const caller = (a.calledBy || "anonymous").toLowerCase().trim();
                  return caller === myEmail;
                });
                return !isAlreadyCalledByMe;
              });
              const filtered = unselected.filter((m) => {
                if (!inputBoardAddSearch.trim()) return true;
                const s = inputBoardAddSearch.toLowerCase();
                return (
                  m.id.toLowerCase().includes(s) ||
                  m.name.toLowerCase().includes(s) ||
                  (m.team && m.team.toLowerCase().includes(s))
                );
              });

              if (unselected.length === 0) {
                return (
                  <div className="text-center py-8 text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {language === "en" ? "All athletes in the system are already present in this Input Board." : "Tất cả vận động viên trong hệ thống hiện đã có mặt ở bảng Nhập Điểm này."}
                  </div>
                );
              }

              if (filtered.length === 0) {
                return (
                  <div className="text-center py-8 text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {language === "en" ? "No profiles found matching ID or Name." : "Không thấy hồ sơ nào có ID hoặc Tên khớp."}
                  </div>
                );
              }

              const sortedFiltered = [...filtered].sort((a, b) => {
                const scoreA = currentAthletes.find((x) => x.id === a.id);
                const scoreB = currentAthletes.find((x) => x.id === b.id);
                
                const statusA = !scoreA ? 0 : (currentDistances.some((d) => !scoreA.scores[d.id] || scoreA.scores[d.id].every(s => s === null)) ? 1 : 2);
                const statusB = !scoreB ? 0 : (currentDistances.some((d) => !scoreB.scores[d.id] || scoreB.scores[d.id].every(s => s === null)) ? 1 : 2);
                
                if (statusA !== statusB) {
                  return statusA - statusB;
                }
                return a.id.localeCompare(b.id, undefined, { numeric: true });
              });

              return sortedFiltered.map((m) => {
                const scoringAthlete = currentAthletes.find((a) => a.id === m.id);
                const isAlreadyInScoring = !!scoringAthlete;
                const isMissingSomeDistances = scoringAthlete 
                  ? currentDistances.some((d) => {
                      const shots = scoringAthlete.scores[d.id];
                      return !shots || shots.every((s) => s === null);
                    })
                  : false;
                
                const activeListInDoc = competitionMode === "individual"
                  ? (currentTournamentDoc?.inputAthletes || [])
                  : (currentTournamentDoc?.teamInputAthletes || []);
                const documentActivePlayer = activeListInDoc.find((a) => a.id === m.id);
                const otherRefereeEmail = documentActivePlayer?.calledBy && 
                  documentActivePlayer.calledBy.toLowerCase().trim() !== (currentUser?.email || "anonymous").toLowerCase().trim()
                  ? documentActivePlayer.calledBy
                  : null;
                
                const isCallerBlocked = !!otherRefereeEmail;
                const isSelectionBlocked = isCallerBlocked;
                const isChecked = selectedInputBoardAthleteIds.includes(m.id);
                
                return (
                  <div
                    key={m.id}
                    onClick={() => {
                      if (isCallerBlocked) {
                        alert(language === "en" ? "Warning: Athlete \"" + m.name + "\" is currently being scored by another referee (" + otherRefereeEmail + ")!" : "Cảnh báo: Vận động viên \"" + m.name + "\" đang được gọi ghi điểm bởi trọng tài khác (" + otherRefereeEmail + ")!");
                        return;
                      }
                      if (isSelectionBlocked) {
                        alert(language === "en" ? "Warning: Athlete \"" + m.name + "\" has completed all distances in the scoring sheet! Cannot select further." : "Cảnh báo: Vận động viên \"" + m.name + "\" đã hoàn thành đầy đủ tất cả các cự ly trong bảng Ghi Điểm! Không thể chọn thêm.");
                        return;
                      }
                      setSelectedInputBoardAthleteIds((prev) => 
                        prev.includes(m.id) 
                          ? prev.filter((id) => id !== m.id) 
                          : [...prev, m.id]
                      );
                    }}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none ${
                      isSelectionBlocked
                        ? "bg-amber-50/45 dark:bg-amber-955/10 border-amber-200 dark:border-amber-955/60 opacity-65 cursor-not-allowed"
                        : isChecked
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
                          {isCallerBlocked ? (
                            <span className="text-[9px] font-extrabold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-955/40 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-900/60 uppercase whitespace-nowrap shrink-0 animate-pulse">
                              {language === "en" ? "🔒 Called by: " + otherRefereeEmail : "🔒 Đang được gọi bởi: " + otherRefereeEmail}
                            </span>
                          ) : (
                            <>
                              {isAlreadyInScoring && (
                                isMissingSomeDistances ? (
                                  <span className="text-[9px] font-extrabold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-900/60 uppercase whitespace-nowrap shrink-0">
                                    {language === "en" ? "Scored (Incomplete distances)" : "Đã có điểm (Chưa đủ cự ly)"}
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-extrabold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-900/60 uppercase whitespace-nowrap shrink-0">
                                    {language === "en" ? "All distances completed" : "Đã đủ tất cả cự ly"}
                                  </span>
                                )
                              )}
                              {m.status === "Bỏ thi" && (
                                <span className="text-[9px] font-extrabold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded border border-rose-200 uppercase whitespace-nowrap shrink-0 animate-pulse">
                                  {language === "en" ? "Withdrawn" : "Bỏ thi"}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-500 dark:text-slate-400 block truncate">
                          {m.team || (language === "en" ? "Independent" : "Tự do")} • {m.gender === "Nữ" ? (language === "en" ? "Female" : "Nữ") : (language === "en" ? "Male" : "Nam")}
                        </span>
                      </div>
                    </div>

                    {isAlreadyInScoring && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPendingScrollAthleteId(m.id);
                          setActiveTab("scoring");
                          setIsAddingAthleteToInputBoard(false);
                          setSelectedInputBoardAthleteIds([]);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 shrink-0 ml-2 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> {language === "en" ? "View" : "Xem"}
                      </button>
                    )}
                  </div>
                );
              });
            })()}
          </div>

          {/* Footer: HỦY and GỌI X VĐV */}
          <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 flex items-center justify-between gap-3">
            <div className="text-[11px] text-slate-400 truncate max-w-[200px] sm:max-w-none">
              {language === "en" ? "If athletes are missing, go to " : "Nếu chưa có VĐV, vào tab "}
              <button
                type="button"
                onClick={() => {
                  setActiveTab("settings");
                  setSettingsSubTab("athletes");
                  setIsAddingAthleteToInputBoard(false);
                  setSelectedInputBoardAthleteIds([]);
                }}
                className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline font-semibold"
              >
                {language === "en" ? "Athlete Management" : "Quản Lý VĐV"}
              </button>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsAddingAthleteToInputBoard(false);
                  setInputBoardAddSearch("");
                  setSelectedInputBoardAthleteIds([]);
                }}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                {language === "en" ? "CANCEL" : "HỦY"}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (selectedInputBoardAthleteIds.length === 0) {
                    alert(language === "en" ? "Please select at least 1 athlete!" : "Vui lòng chọn ít nhất 1 vận động viên!");
                    return;
                  }
                  const toAdd = masterAthletes.filter((m) => selectedInputBoardAthleteIds.includes(m.id));
                  
                  const activeListInDoc = competitionMode === "individual"
                    ? (currentTournamentDoc?.inputAthletes || [])
                    : (currentTournamentDoc?.teamInputAthletes || []);

                  const validToAdd: typeof masterAthletes = [];
                  const skippedNames: string[] = [];

                  toAdd.forEach((m) => {
                    const documentActivePlayer = activeListInDoc.find((a) => a.id === m.id);
                    const caller = documentActivePlayer?.calledBy ? documentActivePlayer.calledBy.toLowerCase().trim() : "";
                    const myEmail = currentUser?.email ? currentUser.email.toLowerCase().trim() : "anonymous";
                    const otherRefereeEmail = caller && caller !== "anonymous" && caller !== myEmail
                      ? documentActivePlayer.calledBy
                      : null;
                    if (otherRefereeEmail) {
                      skippedNames.push(m.name + " (bởi " + otherRefereeEmail + ")");
                    } else {
                      validToAdd.push(m);
                    }
                  });

                  if (skippedNames.length > 0) {
                    alert(language === "en" ? "Skipped the following athletes because they are being scored by another referee:\n- " + skippedNames.join("\n- ") : "Bỏ qua các vận động viên sau do đang được nhập điểm bởi trọng tài khác:\n- " + skippedNames.join("\n- "));
                  }

                  if (validToAdd.length > 0) {
                    const newAthletes: Athlete[] = validToAdd.map((m) => {
                      const scoringAthlete = currentAthletes.find((a) => a.id === m.id);
                      const freshScores: Record<string, (boolean | null)[]> = {};
                      currentDistances.forEach((d) => {
                        if (scoringAthlete && scoringAthlete.scores[d.id]) {
                          freshScores[d.id] = [...scoringAthlete.scores[d.id]];
                        } else {
                          const dShots = (d.shotCount !== undefined && d.shotCount !== null)
                            ? Number(d.shotCount)
                            : ((d.teamShotCount !== undefined && d.teamShotCount !== null)
                                ? Number(d.teamShotCount)
                                : currentShotsCount);
                          freshScores[d.id] = Array(dShots).fill(null);
                        }
                      });
                      return {
                        ...m,
                        scores: freshScores,
                        soloHits: scoringAthlete ? JSON.parse(JSON.stringify(scoringAthlete.soloHits || {})) : {},
                        soloRounds: scoringAthlete ? JSON.parse(JSON.stringify(scoringAthlete.soloRounds || {})) : {},
                        calledBy: currentUser?.email || "anonymous",
                      };
                    });
                    if (competitionMode === "individual") {
                      const updated = [...inputAthletes.filter(a => !newAthletes.some(n => n.id === a.id)), ...newAthletes];
                      setInputAthletes(updated);
                      deviceStorage.set("slingshot_input_athletes", stripBase64Avatars(updated));
                      if (activeHistoryId && activeHistoryId.startsWith("tour-")) {
                        const addedNames = validToAdd.map((m) => `${m.name} (Mã: ${m.id})`).join(", ");
                        handleAddAuditLog(language === "en"
                          ? `Called and locked athletes for scoring: ${addedNames}`
                          : `Đã gọi và khóa vận động viên để chấm điểm: ${addedNames}`
                        );
                        updateOnlineTournament(activeHistoryId, { inputAthletes: stripBase64Avatars(updated) });
                      }
                    } else {
                      const updated = [...teamInputAthletes.filter(a => !newAthletes.some(n => n.id === a.id)), ...newAthletes];
                      setTeamInputAthletes(updated);
                      deviceStorage.set("slingshot_team_input_athletes", stripBase64Avatars(updated));
                      if (activeHistoryId && activeHistoryId.startsWith("tour-")) {
                        const addedNames = validToAdd.map((m) => `${m.name} (Mã: ${m.id})`).join(", ");
                        handleAddAuditLog(language === "en"
                          ? `Called and locked athletes for scoring: ${addedNames}`
                          : `Đã gọi và khóa vận động viên để chấm điểm: ${addedNames}`
                        );
                        updateOnlineTournament(activeHistoryId, { teamInputAthletes: stripBase64Avatars(updated) });
                      }
                    }
                  }
                  setSelectedInputBoardAthleteIds([]);
                  setIsAddingAthleteToInputBoard(false);
                  setInputBoardAddSearch("");
                }}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-extrabold shadow-md hover:shadow-lg transition-all cursor-pointer uppercase tracking-wider flex items-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" />
                {language === "en" ? "CALL " + selectedInputBoardAthleteIds.length + " ATHLETES" : "GỌI " + selectedInputBoardAthleteIds.length + " VĐV"}
              </button>
            </div>
          </div>

        </div>
      </div>,
      document.body
    );
  };

  return (
    <div className="flex flex-col gap-6">

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

      {/* Informative explanation tip */}
      <div className="bg-amber-50/50 dark:bg-amber-955/20 border border-amber-200/50 dark:border-amber-900/30 rounded-2xl p-4 flex gap-3 text-xs text-amber-800 dark:text-amber-300">
        <Sparkles className="w-5 h-5 text-amber-500 shrink-0" />
        <div>
          <span className="font-bold block mb-1 font-sans">
            {language === "en" ? "Temporary Scoring Board:" : "Bảng Nhập Điểm tạm thời:"}
          </span>
          <p className="text-[11px] leading-relaxed">
            {language === "en" ? (
              <>This is a quick score entry area for new matches or ongoing rounds. When scoring is finished, click <strong>SAVE SCORES</strong> to automatically transfer results and save these athletes permanently into the main <strong>Scoring</strong> tab.</>
            ) : (
              <>Đây là khu vực nhập điểm nhanh cho tốp đấu mới hoặc các lượt thi đang diễn ra. Khi nhập điểm xong, hãy bấm nút <strong>LƯU ĐIỂM</strong> để tự động chuyển kết quả và lưu vĩnh viễn các vận động viên này sang tab <strong>Ghi Điểm</strong>. <br/>Hướng dẫn nhập điểm: Tap 1 lần vào ô điểm để ghi Trúng, tap 2 lần để ghi Trượt, tap 3 lần để về ô trống.</>
            )}
          </p>
        </div>
      </div>

      {/* Informative tips box if activeFilteredInputAthletes is zero */}
      {activeFilteredInputAthletes.length === 0 && (
        <div className="text-center p-12 border-2 border-dashed border-gray-300 dark:border-slate-800 rounded-3xl bg-white dark:bg-slate-900 shadow-sm">
          <ClipboardCheck className="w-12 h-12 text-gray-400 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-700 dark:text-slate-300">
            {language === "en" ? "The score entry sheet is currently empty" : "Bảng nhập điểm hiện đang trống"}
          </h3>
          <p className="text-sm text-gray-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">
            {language === "en" ? (
              "Please click the '+' button below to select athletes from system profiles to this Scoring board!"
            ) : (
              <>Hãy nhấn nút <span className="text-indigo-500 font-extrabold text-base border border-indigo-200 bg-indigo-50/50 px-2 py-0.5 rounded-lg">+</span> bên dưới để chọn vận động viên từ hồ sơ hệ thống vào bảng Nhập Điểm!</>
            )}
          </p>
        </div>
      )}

      {/* Grid Athletes List of Cards (Dynamic responsive) */}
      <div className="flex flex-col gap-6">
        {activeFilteredInputAthletes.map((athlete) => {
          const originalIndex = currentInputAthletes.findIndex((a) => a.id === athlete.id);
          const isFirst = originalIndex === 0;
          const isLast = originalIndex === currentInputAthletes.length - 1;
          
          const isLockedByOtherReferee = userRole !== "admin" && (!!(athlete.calledBy && 
            athlete.calledBy.toLowerCase().trim() !== (currentUser?.email || "anonymous").toLowerCase().trim()));
          const lockedByRefereeEmail = athlete.calledBy || "";

          return (
            <AthleteCard
              key={athlete.id}
              athlete={athlete}
              distances={currentDistances}
              shotsCount={currentShotsCount}
              onToggleScore={handleToggleInputScore}
              onUpdateAthlete={handleUpdateInputAthlete}
              onDeleteAthlete={handleDeleteInputAthlete}
              onMoveAthlete={handleMoveInputAthlete}
              isFirst={isFirst}
              isLast={isLast}
              isInputTab={true}
              mainAthletes={currentAthletes}
              onUpdateSoloHits={handleUpdateInputSoloHits}
              onUpdateDirectScore={handleUpdateDirectInputScore}
              directMaxPoints={competitionMode === "individual" ? directMaxPoints : teamDirectMaxPoints}
              isLockedByOtherReferee={isLockedByOtherReferee}
              lockedByRefereeEmail={lockedByRefereeEmail}
              onSaveSingleAthlete={(ath) => {
                setSingleAthleteToSave(ath);
                setSaveStatus(null);
              }}
              userRole={userRole}
            />
          );
        })}
      </div>

      {/* Modal for adding system athletes to Input Board */}
      {renderAddInputAthleteModal()}

      {/* The action buttons panel - PLUS & SAVE SIDE BY SIDE */}
      <div className="flex justify-center items-center gap-4 py-6">
        <button
          onClick={() => setIsAddingAthleteToInputBoard(true)}
          className="w-14 h-14 bg-white dark:bg-slate-900 hover:bg-indigo-50 border-2 border-indigo-500 text-indigo-500 rounded-xl flex items-center justify-center shadow-md hover:shadow-lg hover:scale-105 transition-all duration-150 cursor-pointer animate-pulse"
          title="Thêm vận động viên vào bảng Nhập Điểm"
          id="add-athlete-to-input-board-btn"
        >
          <Plus className="w-8 h-8 stroke-[3]" />
        </button>

        {myCalledInputAthletes.length > 0 && (
          <button
            onClick={handleSaveInputScoresToMain}
            className="h-14 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg hover:scale-105 transition-all duration-150 cursor-pointer border border-emerald-700 text-sm uppercase tracking-wider font-semibold"
            title="Lưu điểm và tự động chuyển sang bảng Ghi Điểm"
            id="save-input-scores-btn"
          >
            <Save className="w-5 h-5 stroke-[2.5]" /> Lưu Điểm ({myCalledInputAthletes.length})
          </button>
        )}
      </div>

    </div>
  );
}
