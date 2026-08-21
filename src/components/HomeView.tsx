import React from "react";
import { OnlineTournamentsPanel } from "./OnlineTournamentsPanel";

interface HomeViewProps {
  isGlobalAdmin: boolean;
  activeHistoryId: string | null;
  onSelectTournament: (id: string, data: any, redirectTab?: any) => void;
  onOpenAuthModal: () => void;
  handleExitTournament: () => Promise<void>;
  setActiveTab: (tab: any) => void;
  setSettingsSubTab: (subtab: any) => void;
  setIsNewTournamentModalOpen: (open: boolean) => void;
  matchName: string;
  competitionMode: "individual" | "team";
  shotsCount: number;
  teamShotsCount: number;
  directMaxPoints: number;
  teamDirectMaxPoints: number;
  distances: any[];
  teamDistances: any[];
  athletes: any[];
  teamAthletes: any[];
  inputAthletes: any[];
  teamInputAthletes: any[];
  startDate: string;
  endDate: string;
  tournamentType: "individual" | "team" | "combined";
  bannerUrl: string;
  avatarUrl: string;
  globalSearch: string;
  setGlobalSearch: (search: string) => void;
  homeFilter: string;
  setHomeFilter: (filter: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  isGlobalAdmin,
  activeHistoryId,
  onSelectTournament,
  onOpenAuthModal,
  handleExitTournament,
  setActiveTab,
  setSettingsSubTab,
  setIsNewTournamentModalOpen,
  matchName,
  competitionMode,
  shotsCount,
  teamShotsCount,
  directMaxPoints,
  teamDirectMaxPoints,
  distances,
  teamDistances,
  athletes,
  teamAthletes,
  inputAthletes,
  teamInputAthletes,
  startDate,
  endDate,
  tournamentType,
  bannerUrl,
  avatarUrl,
  globalSearch,
  setGlobalSearch,
  homeFilter,
  setHomeFilter,
}) => {
  return (
    <div className="animate-fadeIn" id="home-view-container">
      <OnlineTournamentsPanel
        isGlobalAdmin={isGlobalAdmin}
        activeHistoryId={activeHistoryId}
        onSelectTournament={onSelectTournament}
        onOpenAuthModal={onOpenAuthModal}
        onRedirectToCreateTournament={() => {
          if (activeHistoryId) {
            handleExitTournament();
          }
          setActiveTab("settings");
          setSettingsSubTab("config");
          setIsNewTournamentModalOpen(true);
        }}
        currentSetup={{
          matchName,
          competitionMode,
          shotsCount,
          teamShotsCount,
          directMaxPoints,
          teamDirectMaxPoints,
          distances,
          teamDistances,
          athletes,
          teamAthletes,
          inputAthletes,
          teamInputAthletes,
          startDate,
          endDate,
          tournamentType,
          bannerUrl,
          avatarUrl,
        }}
        externalSearch={globalSearch}
        onExternalSearchChange={setGlobalSearch}
        onGoToManageTournaments={() => {
          setHomeFilter("all_list");
          setActiveTab("home");
        }}
        tabFilter={homeFilter}
      />
    </div>
  );
};
