import React from "react";
import { MainDashboard } from "./MainDashboard";

interface DashboardViewProps {
  leaderboardAthletes: any[];
  distances: any[];
  shotsCount: number;
  matchName: string;
  masterAthletes: any[];
  teamAthletes: any[];
  teamDistances: any[];
  teamShotsCount: number;
  leaderboardTeamAthletes: any[];
  directMaxShots: number;
  teamDirectMaxShots: number;
  directMaxPoints: number;
  teamDirectMaxPoints: number;
  tournamentType: "individual" | "team" | "combined";
  clubs: any[];
  setIsLiveBoardOpen: (open: boolean) => void;
  setIsExportModalOpen: (open: boolean) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  leaderboardAthletes,
  distances,
  shotsCount,
  matchName,
  masterAthletes,
  teamAthletes,
  teamDistances,
  teamShotsCount,
  leaderboardTeamAthletes,
  directMaxShots,
  teamDirectMaxShots,
  directMaxPoints,
  teamDirectMaxPoints,
  tournamentType,
  clubs,
  setIsLiveBoardOpen,
  setIsExportModalOpen,
}) => {
  return (
    <div className="animate-fadeIn" id="dashboard-view-container">
      <MainDashboard
        athletes={leaderboardAthletes}
        distances={distances}
        shotsCount={shotsCount}
        matchName={matchName}
        masterAthletes={masterAthletes}
        teamAthletes={teamAthletes}
        teamDistances={teamDistances}
        teamShotsCount={teamShotsCount}
        leaderboardTeamAthletes={leaderboardTeamAthletes}
        directMaxShots={directMaxShots}
        teamDirectMaxShots={teamDirectMaxShots}
        directMaxPoints={directMaxPoints}
        teamDirectMaxPoints={teamDirectMaxPoints}
        tournamentType={tournamentType}
        clubs={clubs}
        onOpenLiveBoard={() => setIsLiveBoardOpen(true)}
        onOpenExportModal={() => setIsExportModalOpen(true)}
      />
    </div>
  );
};
