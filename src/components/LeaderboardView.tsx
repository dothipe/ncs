import React from "react";
import { Trophy, Users } from "lucide-react";
import { Leaderboard } from "./Leaderboard";
import { TeamLeaderboard } from "./TeamLeaderboard";

interface LeaderboardViewProps {
  rankingSubTab: "individual" | "team";
  setRankingSubTab: (tab: "individual" | "team") => void;
  competitionMode: "individual" | "team";
  language: string;
  leaderboardAthletes: any[];
  leaderboardTeamAthletes: any[];
  currentDistances: any[];
  currentShotsCount: number;
  directMaxShots: number;
  teamDirectMaxShots: number;
  directMaxPoints: number;
  teamDirectMaxPoints: number;
  clubs: any[];
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  rankingSubTab,
  setRankingSubTab,
  competitionMode,
  language,
  leaderboardAthletes,
  leaderboardTeamAthletes,
  currentDistances,
  currentShotsCount,
  directMaxShots,
  teamDirectMaxShots,
  directMaxPoints,
  teamDirectMaxPoints,
  clubs,
}) => {
  return (
    <div className="flex flex-col gap-5 animate-fadeIn" id="ranking-tab-container">
      {/* Sub-tabs to toggle between Individual and Team/Club rankings */}
      <div className="flex w-full bg-slate-100 dark:bg-slate-900/60 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 gap-2" id="ranking-sub-tabs">
        <button
          type="button"
          onClick={() => setRankingSubTab("individual")}
          className={`flex-1 w-1/2 px-3 py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 text-center ${
            rankingSubTab === "individual"
              ? "bg-blue-600 text-white shadow-md font-extrabold"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
          id="ranking-subtab-ind-btn"
        >
          <Trophy className="w-4 h-4 shrink-0" />
          <span className="truncate">
            {competitionMode === "team" ? (
              language === "en" ? "Individual Standings TEAM" : "BXH Cá Nhân TEAM"
            ) : (
              language === "en" ? "Individual Standings" : "BXH Cá Nhân"
            )}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setRankingSubTab("team")}
          className={`flex-1 w-1/2 px-3 py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 text-center ${
            rankingSubTab === "team"
              ? "bg-blue-600 text-white shadow-md font-extrabold"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
          id="ranking-subtab-team-btn"
        >
          <Users className="w-4 h-4 shrink-0" />
          <span className="truncate">
            {competitionMode === "team" ? (
              language === "en" ? "Club/Team Standings TEAM" : "BXH Đồng Đội TEAM"
            ) : (
              language === "en" ? "Club/Team Standings" : "BXH Đồng Đội"
            )}
          </span>
        </button>
      </div>

      {rankingSubTab === "individual" ? (
        <Leaderboard 
          athletes={competitionMode === "individual" ? leaderboardAthletes : leaderboardTeamAthletes} 
          distances={currentDistances} 
          shotsCount={currentShotsCount} 
          competitionMode={competitionMode}
          directMaxShots={directMaxShots}
          teamDirectMaxShots={teamDirectMaxShots}
          directMaxPoints={directMaxPoints}
          teamDirectMaxPoints={teamDirectMaxPoints}
        />
      ) : (
        <TeamLeaderboard
          athletes={competitionMode === "individual" ? leaderboardAthletes : leaderboardTeamAthletes}
          distances={currentDistances}
          shotsCount={currentShotsCount}
          competitionMode={competitionMode}
          directMaxShots={directMaxShots}
          teamDirectMaxShots={teamDirectMaxShots}
          directMaxPoints={directMaxPoints}
          teamDirectMaxPoints={teamDirectMaxPoints}
          clubs={clubs}
        />
      )}
    </div>
  );
};
