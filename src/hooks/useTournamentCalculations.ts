import { useMemo } from "react";
import { Athlete, DistanceConfig } from "../types";
import { deepEqual } from "../utils/avatarHelpers";

interface UseTournamentCalculationsProps {
  masterAthletes: Athlete[];
  athletes: Athlete[];
  inputAthletes: Athlete[];
  distances: DistanceConfig[];
  shotsCount: number;
  teamAthletes: Athlete[];
  teamInputAthletes: Athlete[];
  teamDistances: DistanceConfig[];
  teamShotsCount: number;
}

export const useTournamentCalculations = ({
  masterAthletes,
  athletes,
  inputAthletes,
  distances,
  shotsCount,
  teamAthletes,
  teamInputAthletes,
  teamDistances,
  teamShotsCount,
}: UseTournamentCalculationsProps) => {
  
  const leaderboardAthletes = useMemo(() => {
    return masterAthletes.map((m) => {
      const activeAth = athletes.find((a) => a.id === m.id);
      const inputAth = inputAthletes.find((a) => a.id === m.id);
      
      const mergedScores: Record<string, (boolean | null)[]> = {};
      const validDistanceIds = new Set(distances.map((d) => d.id));
      distances.forEach((d) => {
        mergedScores[d.id] = Array(shotsCount).fill(null);
      });
      
      if (activeAth) {
        Object.keys(activeAth.scores || {}).forEach((k) => {
          if (validDistanceIds.has(k) && activeAth.scores[k]) mergedScores[k] = [...activeAth.scores[k]];
        });
      }
      
      if (inputAth) {
        Object.keys(inputAth.scores || {}).forEach((k) => {
          if (validDistanceIds.has(k) && inputAth.scores[k]) mergedScores[k] = [...inputAth.scores[k]];
        });
      }

      const mergedSoloHits = {
        ...(activeAth?.soloHits || {}),
        ...(inputAth?.soloHits || {}),
      };

      const mergedSoloRounds = {
        ...(activeAth?.soloRounds || {}),
        ...(inputAth?.soloRounds || {}),
      };

      return {
        ...m,
        scores: mergedScores,
        soloHits: mergedSoloHits,
        soloRounds: mergedSoloRounds,
        status: activeAth?.status || inputAth?.status || m.status || "Thi đấu"
      };
    });
  }, [masterAthletes, athletes, inputAthletes, distances, shotsCount]);

  const leaderboardTeamAthletes = useMemo(() => {
    return masterAthletes.map((m) => {
      const activeAth = teamAthletes.find((a) => a.id === m.id);
      const inputAth = teamInputAthletes.find((a) => a.id === m.id);
      
      const mergedScores: Record<string, (boolean | null)[]> = {};
      const validTeamDistanceIds = new Set(teamDistances.map((d) => d.id));
      teamDistances.forEach((d) => {
        mergedScores[d.id] = Array(teamShotsCount).fill(null);
      });
      
      if (activeAth) {
        Object.keys(activeAth.scores || {}).forEach((k) => {
          if (validTeamDistanceIds.has(k) && activeAth.scores[k]) mergedScores[k] = [...activeAth.scores[k]];
        });
      }
      
      if (inputAth) {
        Object.keys(inputAth.scores || {}).forEach((k) => {
          if (validTeamDistanceIds.has(k) && inputAth.scores[k]) mergedScores[k] = [...inputAth.scores[k]];
        });
      }

      const mergedSoloHits = {
        ...(activeAth?.soloHits || {}),
        ...(inputAth?.soloHits || {}),
      };

      const mergedSoloRounds = {
        ...(activeAth?.soloRounds || {}),
        ...(inputAth?.soloRounds || {}),
      };

      return {
        ...m,
        scores: mergedScores,
        soloHits: mergedSoloHits,
        soloRounds: mergedSoloRounds,
        status: activeAth?.status || inputAth?.status || m.status || "Thi đấu"
      };
    });
  }, [masterAthletes, teamAthletes, teamInputAthletes, teamDistances, teamShotsCount]);

  return {
    leaderboardAthletes,
    leaderboardTeamAthletes,
  };
};
