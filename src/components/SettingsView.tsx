import React from "react";
import { Settings, Users } from "lucide-react";
import { SettingsPanel } from "./SettingsPanel";
import { AthleteManagement } from "./AthleteManagement";

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
  tournamentType: "individual" | "team" | "combined";
  setTournamentType: (type: "individual" | "team" | "combined") => void;
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
}) => {
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
          {language === "en" ? "Tournament Parameters" : "Cấu Hình Tham Số Giải"}
        </button>
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
      </div>

      {settingsSubTab === "config" ? (
        <SettingsPanel
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
          matchName={matchName}
          clubs={clubs}
          setClubs={setClubs}
          currentUser={currentUser}
          forceTab={athleteForceTab}
          userRole={userRole}
        />
      )}
    </div>
  );
};
