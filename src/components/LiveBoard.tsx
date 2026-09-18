import React, { useState, useMemo, useEffect, useRef } from "react";
import { Athlete, DistanceConfig, Club } from "../types";
import { calculateRounds, getHitCount } from "../utils/qualification";
import { SmartGuideTrigger } from "./GuidesView";
import { 
  X, 
  Tv, 
  ChevronLeft, 
  ChevronRight, 
  Trophy, 
  Shield, 
  Target, 
  Users, 
  User, 
  CheckCircle2, 
  TrendingUp, 
  Medal, 
  Award,
  Sparkles,
  Zap,
  Play,
  Pause
} from "lucide-react";

interface LiveBoardProps {
  isOpen: boolean;
  onClose: () => void;
  matchName: string;
  athletes: Athlete[];
  distances: DistanceConfig[];
  shotsCount: number;
  teamAthletes?: Athlete[];
  teamDistances?: DistanceConfig[];
  teamShotsCount?: number;
  leaderboardTeamAthletes?: Athlete[];
  directMaxShots?: number;
  teamDirectMaxShots?: number;
  directMaxPoints?: number;
  teamDirectMaxPoints?: number;
  tournamentType?: "individual" | "team" | "combined";
  clubs?: Club[];
  laneCapacity?: number;
  currentTournamentDoc?: any;
}

export const LiveBoard: React.FC<LiveBoardProps> = ({
  isOpen,
  onClose,
  matchName,
  athletes,
  distances,
  shotsCount,
  teamAthletes,
  teamDistances,
  teamShotsCount,
  leaderboardTeamAthletes,
  directMaxShots,
  teamDirectMaxShots,
  directMaxPoints,
  teamDirectMaxPoints,
  tournamentType = "combined",
  clubs = [],
  laneCapacity: propLaneCapacity,
  currentTournamentDoc
}) => {
  // Resolve active source variables based on tournamentType
  const activeAthletesList = useMemo(() => {
    if (tournamentType === "team") {
      return leaderboardTeamAthletes || teamAthletes || athletes;
    }
    return athletes;
  }, [tournamentType, athletes, teamAthletes, leaderboardTeamAthletes]);

  const activeDistances = useMemo(() => {
    if (tournamentType === "team") {
      return teamDistances || distances;
    }
    return distances;
  }, [tournamentType, distances, teamDistances]);

  const activeShotsCountVal = useMemo(() => {
    if (tournamentType === "team") {
      return teamShotsCount !== undefined ? teamShotsCount : shotsCount;
    }
    return shotsCount;
  }, [tournamentType, shotsCount, teamShotsCount]);

  const activeDirectMaxShots = useMemo(() => {
    if (tournamentType === "team") {
      return teamDirectMaxShots !== undefined ? teamDirectMaxShots : (directMaxShots || 10);
    }
    return directMaxShots || 10;
  }, [tournamentType, directMaxShots, teamDirectMaxShots]);

  const activeDirectMaxPoints = useMemo(() => {
    if (tournamentType === "team") {
      return teamDirectMaxPoints;
    }
    return directMaxPoints;
  }, [tournamentType, directMaxPoints, teamDirectMaxPoints]);

  const isDirectMode = activeShotsCountVal === 1;
  const isTeamDirectMode = teamShotsCount === 1;

  const effectiveShotsCount = isDirectMode ? activeDirectMaxShots : activeShotsCountVal;
  const effectiveTeamShotsCount = isTeamDirectMode ? (teamDirectMaxShots || 10) : (teamShotsCount !== undefined ? teamShotsCount : shotsCount);

  const [localLaneCapacity, setLocalLaneCapacity] = useState<number>(() => {
    const saved = localStorage.getItem("slingshot_active_tournament_lane_capacity");
    return saved ? Number(saved) : 10;
  });

  const laneCapacity = propLaneCapacity !== undefined ? propLaneCapacity : localLaneCapacity;

  // Keep laneCapacity synchronized with changes in Settings
  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem("slingshot_active_tournament_lane_capacity");
      if (saved) {
        setLocalLaneCapacity(Number(saved));
      }
    }
  }, [isOpen]);
  const [activeFlight, setActiveFlight] = useState<number>(1);
  const [activeMobileTab, setActiveMobileTab] = useState<"board" | "flight" | "topx">("flight");
  const [activeFlightSubTab, setActiveFlightSubTab] = useState<"current" | "next" | "test">("current");
  const [topXLimit, setTopXLimit] = useState<number>(10);
  const [isCustomTopX, setIsCustomTopX] = useState<boolean>(false);
  const [selectedRoundIndex, setSelectedRoundIndex] = useState<number>(0);

  // TV Presentation Mode States
  const [isTvMode, setIsTvMode] = useState<boolean>(false);
  const [tvSlideIdx, setTvSlideIdx] = useState<number>(0); // 0: Podium/Hall of Fame, 1: Top X, 2: Active, 3: Ready, 4: Warmup
  const [isTvPaused, setIsTvPaused] = useState<boolean>(false);
  const [tvSlideSecondsRemaining, setTvSlideSecondsRemaining] = useState<number>(10);
  const [tvLanePageIdx, setTvLanePageIdx] = useState<number>(0);

  const scrollRef1 = useRef<HTMLDivElement>(null);
  const scrollRef2 = useRef<HTMLDivElement>(null);
  const scrollRef3 = useRef<HTMLDivElement>(null);
  const scrollRef4 = useRef<HTMLDivElement>(null);

  const getTvSlideDuration = (idx: number) => {
    if (idx === 0) return 5;   // Bảng vàng: 5s
    if (idx === 1) return 15;  // Top X: 15s
    if (idx === 2) return 20;  // Đang bắn: 20s
    if (idx === 3) return 15;  // Chờ bắn: 15s
    if (idx === 4) return 15;  // Bắn thử: 15s
    return 10;
  };

  useEffect(() => {
    if (!isTvMode || isTvPaused) return;

    let activeRef: React.RefObject<HTMLDivElement | null>;
    if (tvSlideIdx === 1) {
      activeRef = scrollRef1;
    } else if (tvSlideIdx === 2) {
      activeRef = scrollRef2;
    } else if (tvSlideIdx === 3) {
      activeRef = scrollRef3;
    } else if (tvSlideIdx === 4) {
      activeRef = scrollRef4;
    } else {
      return;
    }

    const durationSeconds = getTvSlideDuration(tvSlideIdx);

    const el = activeRef.current;
    if (!el) return;

    el.scrollTop = 0;

    let frameId: number;
    let startTime: number | null = null;
    const durationMs = durationSeconds * 1000;
    const delayMs = 1500;
    const scrollDurationMs = Math.max(1000, durationMs - 3000);

    const scrollStep = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;

      if (elapsed > delayMs) {
        const scrollElapsed = elapsed - delayMs;
        const progress = Math.min(1, scrollElapsed / scrollDurationMs);
        const maxScroll = el.scrollHeight - el.clientHeight;
        
        if (maxScroll > 0) {
          el.scrollTop = progress * maxScroll;
        }
      }

      if (elapsed < durationMs) {
        frameId = requestAnimationFrame(scrollStep);
      }
    };

    frameId = requestAnimationFrame(scrollStep);
    return () => cancelAnimationFrame(frameId);
  }, [isTvMode, isTvPaused, tvSlideIdx]);

  useEffect(() => {
    if (isTvMode) {
      setTvSlideSecondsRemaining(getTvSlideDuration(tvSlideIdx));
    }
  }, [tvSlideIdx, isTvMode]);

  const handleSetTvSlide = (idx: number) => {
    setTvSlideIdx(idx);
    setTvLanePageIdx(0);
    setTvSlideSecondsRemaining(getTvSlideDuration(idx));
  };

  // Resolve active monitoring parameters for National / Large-scale tournaments
  const isNational = !!currentTournamentDoc?.isNational;
  const activeMonitorEnv = isNational ? (currentTournamentDoc?.activeMonitorEnv || "individual") : "individual";
  const activeMonitorRoundIdx = isNational ? (currentTournamentDoc?.activeMonitorRoundIdx ?? 0) : selectedRoundIndex;

  // Keep the local activeFlight & selectedRoundIndex in sync with BTC's admin selection for national tournaments
  useEffect(() => {
    if (isNational && currentTournamentDoc) {
      if (currentTournamentDoc.activeMonitorRoundIdx !== undefined && currentTournamentDoc.activeMonitorRoundIdx !== selectedRoundIndex) {
        setSelectedRoundIndex(currentTournamentDoc.activeMonitorRoundIdx);
      }
      if (currentTournamentDoc.activeMonitorSquad !== undefined && currentTournamentDoc.activeMonitorSquad !== activeFlight) {
        setActiveFlight(currentTournamentDoc.activeMonitorSquad);
      }
    }
  }, [
    isNational,
    currentTournamentDoc?.activeMonitorRoundIdx,
    currentTournamentDoc?.activeMonitorSquad,
    selectedRoundIndex,
    activeFlight
  ]);

  // Master lane data computation matching TournamentExecutionHub
  const lanesDataByFlight = useMemo(() => {
    const currentDistances = activeMonitorEnv === "team"
      ? (teamDistances && teamDistances.length > 0 ? teamDistances : distances)
      : distances;

    const activeRound = currentDistances[activeMonitorRoundIdx] || currentDistances[0];
    if (!activeRound) return { getSquadLanes: (s: number) => [], totalFlightsPossible: 1, effectiveShotsCount: 5, activeRound: null };

    const effectiveShotsCount = activeMonitorEnv === "team"
      ? activeRound.teamShotCount || teamShotsCount || shotsCount || 5
      : activeRound.shotCount || shotsCount || 5;

    const effectiveDirectMaxPoints = activeMonitorEnv === "team"
      ? teamDirectMaxShots
      : directMaxShots;

    const activeAthletesForMonitor = activeMonitorEnv === "team"
      ? (leaderboardTeamAthletes && leaderboardTeamAthletes.length > 0 ? leaderboardTeamAthletes : teamAthletes || athletes)
      : (athletes || []);

    // Run qualification calculateRounds
    const roundResults = calculateRounds(
      activeAthletesForMonitor,
      currentDistances,
      effectiveShotsCount,
      effectiveDirectMaxPoints
    );

    // Get ordered athletes for this round
    let orderedAthletesForRound = activeMonitorEnv === "team"
      ? activeAthletesForMonitor.filter(a => a.isPrimaryTeam)
      : [...activeAthletesForMonitor];

    // If subsequent round, filter only qualified athletes
    if (activeMonitorRoundIdx > 0) {
      const roundRes = roundResults[activeMonitorRoundIdx];
      if (roundRes && roundRes.qualifiedIds) {
        const qualifiedSet = new Set(roundRes.qualifiedIds);
        orderedAthletesForRound = orderedAthletesForRound.filter(a => qualifiedSet.has(a.id));
      }
    }

    // Determine sorting strategy criteria for this round, defaulting to "sbd"
    const activeCriteria = currentTournamentDoc?.roundShootingOrderCriteria?.[activeRound.id] || "sbd";

    // Sort athletes/clubs dynamically based on activeCriteria
    if (activeMonitorEnv === "team") {
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
        if (activeMonitorRoundIdx === 0) {
          let total = 0;
          for (const shooter of mainShooters) {
            let scoreSum = 0;
            if (shooter.scores) {
              scoreSum = Object.values(shooter.scores).reduce((acc: number, val: any) => {
                const count = (val && Array.isArray(val)) ? val.filter((v: any) => v === true).length : 0;
                return acc + count;
              }, 0) as number;
            }
            total += scoreSum;
          }
          return total;
        } else {
          const prevRoundRes = roundResults[activeMonitorRoundIdx - 1];
          if (!prevRoundRes || !prevRoundRes.scores) return 0;
          let total = 0;
          for (const shooter of mainShooters) {
            const sc = prevRoundRes.scores[shooter.id];
            if (sc) {
              const addScore = sc.displayScoreWithSolo !== undefined ? sc.displayScoreWithSolo : sc.displayScore;
              total += (addScore as number) || 0;
            }
          }
          return total;
        }
      };

      sortedClubs.sort((clubA, clubB) => {
        const sbdA = (currentTournamentDoc?.teamDrawnNumbers || {})[clubA] || 999999;
        const sbdB = (currentTournamentDoc?.teamDrawnNumbers || {})[clubB] || 999999;

        if (activeMonitorRoundIdx === 0 || activeCriteria === "sbd") {
          return sbdA - sbdB;
        }

        const scoreA = getClubPrevScore(clubA);
        const scoreB = getClubPrevScore(clubB);

        if (activeCriteria === "points_asc") {
          if (scoreA !== scoreB) return scoreA - scoreB;
          return sbdA - sbdB;
        } else {
          if (scoreA !== scoreB) return scoreB - scoreA;
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
      const drawnNumbers = currentTournamentDoc?.drawnNumbers || {};
      orderedAthletesForRound.sort((a, b) => {
        const sbdA = drawnNumbers[a.id] || 999999;
        const sbdB = drawnNumbers[b.id] || 999999;

        if (activeCriteria === "sbd") {
          return sbdA - sbdB;
        }

        let scoreA = 0;
        let scoreB = 0;

        if (activeMonitorRoundIdx === 0) {
          scoreA = (a.scores && Object.values(a.scores).reduce((acc: number, val: any) => {
            const count = (val && Array.isArray(val)) ? val.filter((v: any) => v === true).length : 0;
            return acc + count;
          }, 0) as number) || 0;
          scoreB = (b.scores && Object.values(b.scores).reduce((acc: number, val: any) => {
            const count = (val && Array.isArray(val)) ? val.filter((v: any) => v === true).length : 0;
            return acc + count;
          }, 0) as number) || 0;
        } else {
          const prevRoundRes = roundResults[activeMonitorRoundIdx - 1];
          if (prevRoundRes && prevRoundRes.scores) {
            const scA = prevRoundRes.scores[a.id];
            const scB = prevRoundRes.scores[b.id];
            scoreA = scA ? (scA.displayScoreWithSolo !== undefined ? scA.displayScoreWithSolo : scA.displayScore) : 0;
            scoreB = scB ? (scB.displayScoreWithSolo !== undefined ? scB.displayScoreWithSolo : scB.displayScore) : 0;
          }
        }

        if (activeCriteria === "points_asc") {
          if (scoreA !== scoreB) return scoreA - scoreB;
          return sbdA - sbdB;
        } else {
          if (scoreA !== scoreB) return scoreB - scoreA;
          return sbdA - sbdB;
        }
      });
    }

    const squadClubs: string[] = [];
    if (activeMonitorEnv === "team") {
      orderedAthletesForRound.forEach(a => {
        if (a.team && !squadClubs.includes(a.team.trim())) {
          squadClubs.push(a.team.trim());
        }
      });
    }

    // Define packedSquads for parallel team mode
    let packedSquads: Array<Array<Athlete | null>> = [];
    const teamLaneLayoutType = currentTournamentDoc?.teamLaneLayoutType || "sequential";
    if (activeMonitorEnv === "team" && teamLaneLayoutType === "parallel") {
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
        packedSquads.push(currentSquad);
      }
    }

    const totalFlightsPossible = activeMonitorEnv === "team"
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
        clubShooters?: Athlete[];
        athleteObj?: Athlete | null;
      }> = [];
      for (let idx = 0; idx < laneCapacity; idx++) {
        const laneNum = idx + 1;
        if (activeMonitorEnv === "team" && teamLaneLayoutType === "sequential") {
          const clubName = squadClubs[(s - 1) * laneCapacity + idx] || null;
          const clubSbd = clubName ? ((currentTournamentDoc?.teamDrawnNumbers || {})[clubName] || null) : null;
          const clubShooters = clubName 
            ? activeAthletesForMonitor.filter(a => a.team?.trim() === clubName && a.isPrimaryTeam)
            : [];
          lanes.push({
            laneNum,
            name: clubName,
            sbd: clubSbd,
            isClub: true,
            clubShooters
          });
        } else if (activeMonitorEnv === "team" && teamLaneLayoutType === "parallel") {
          const squadAthletes = packedSquads[s - 1] || [];
          const activeAthleteOnLane = squadAthletes[idx] || null;
          const sbd = activeAthleteOnLane ? ((currentTournamentDoc?.drawnNumbers || {})[activeAthleteOnLane.id] || null) : null;
          lanes.push({
            laneNum,
            name: activeAthleteOnLane ? activeAthleteOnLane.name : null,
            sbd,
            isClub: false,
            team: activeAthleteOnLane ? activeAthleteOnLane.team : null,
            athleteObj: activeAthleteOnLane
          });
        } else {
          const athleteIndex = (s - 1) * laneCapacity + idx;
          const activeAthleteOnLane = orderedAthletesForRound[athleteIndex] || null;
          const sbd = activeAthleteOnLane ? ((currentTournamentDoc?.drawnNumbers || {})[activeAthleteOnLane.id] || null) : null;
          lanes.push({
            laneNum,
            name: activeAthleteOnLane ? activeAthleteOnLane.name : null,
            sbd,
            isClub: false,
            team: activeAthleteOnLane ? activeAthleteOnLane.team : null,
            athleteObj: activeAthleteOnLane
          });
        }
      }
      return lanes;
    };

    return {
      getSquadLanes,
      totalFlightsPossible,
      effectiveShotsCount,
      activeRound
    };
  }, [
    activeMonitorEnv,
    activeMonitorRoundIdx,
    currentTournamentDoc,
    distances,
    teamDistances,
    athletes,
    teamAthletes,
    leaderboardTeamAthletes,
    laneCapacity,
    shotsCount,
    teamShotsCount,
    directMaxShots,
    teamDirectMaxShots,
  ]);

  const [isPortrait, setIsPortrait] = useState<boolean>(false);
  const top10ContainerRef = useRef<HTMLDivElement>(null);
  const [top10Fading, setTop10Fading] = useState<boolean>(false);

  // Handle portrait/landscape auto-rotation warning overlay
  useEffect(() => {
    const checkOrientation = () => {
      // Small screen devices in portrait orientation are restricted to rotate
      setIsPortrait(window.innerHeight > window.innerWidth && window.innerWidth < 1024);
    };

    checkOrientation();
    window.addEventListener("resize", checkOrientation);
    return () => window.removeEventListener("resize", checkOrientation);
  }, []);

  // Safeguard selectedRoundIndex if distances array is updated or shortened
  useEffect(() => {
    if (activeDistances.length > 0 && selectedRoundIndex >= activeDistances.length) {
      setSelectedRoundIndex(activeDistances.length - 1);
      setActiveFlight(1);
    }
  }, [activeDistances, selectedRoundIndex]);

  const getLastActiveRound = (athlete: Athlete) => {
    if (!activeDistances || activeDistances.length === 0) return 1;
    for (let i = activeDistances.length - 1; i >= 0; i--) {
      const distId = activeDistances[i].id;
      const scores = athlete.scores?.[distId];
      if (scores && scores.some(s => s !== null && s !== undefined)) {
        return i + 1;
      }
    }
    return 1;
  };

  // -----------------------------------------------------------------
  // INDIVIDUAL SURVIVAL RANKINGS (For Podium & Top 10)
  // -----------------------------------------------------------------
  const roundResults = useMemo(() => {
    return calculateRounds(activeAthletesList, activeDistances, effectiveShotsCount, activeDirectMaxPoints);
  }, [activeAthletesList, activeDistances, effectiveShotsCount, activeDirectMaxPoints]);

  const athleteSurvivalInfo = useMemo(() => {
    const hasMaxRoundScoreConf = activeDistances.some(d => d.isMaxRoundScore);

    return activeAthletesList.map((athlete) => {
      let eliminatedInRoundIdx: number | null = null;
      for (let i = 0; i < roundResults.length; i++) {
        if (roundResults[i].eliminatedIds.includes(athlete.id)) {
          let hasSubsequentParticipation = false;
          for (let j = i + 1; j < roundResults.length; j++) {
            if (roundResults[j].qualifiedIds.includes(athlete.id)) {
              hasSubsequentParticipation = true;
              break;
            }
          }
          if (!hasSubsequentParticipation) {
            eliminatedInRoundIdx = i;
            break;
          }
        }
      }

      const survivalVal = eliminatedInRoundIdx === null ? activeDistances.length : eliminatedInRoundIdx;
      const lastActiveRoundIdx = eliminatedInRoundIdx === null ? (activeDistances.length - 1) : eliminatedInRoundIdx;

      let survivalScore = 0;
      let survivalHits = 0;
      let survivalAccuracy = 0;
      let survivalSoloHits = 0;

      let maxScore = -1;
      let maxHits = 0;
      let maxSoloHits = 0;

      let cumulativeHitsSumInShotRounds = 0;
      let cumulativeScoreSumInShotRounds = 0;
      let cumulativeMultiplierSumInShotRounds = 0;
      let cumulativeCountInShotRounds = 0;

      // Find individual maximum score across shot/qualified rounds
      if (activeDistances.length > 0 && lastActiveRoundIdx >= 0) {
        if (hasMaxRoundScoreConf) {
          for (let i = 0; i <= lastActiveRoundIdx; i++) {
            const isQualifiedForRound = i === 0 || roundResults[i]?.qualifiedIds.includes(athlete.id);
            if (isQualifiedForRound) {
              const dist = activeDistances[i];
              const hits = athlete.scores[dist.id] || [];
              const hitCount = getHitCount(hits);
              const score = hitCount * dist.multiplier;

              const wasShot = hits.length > 0 && hits.some(v => v !== null && v !== undefined);
              if (wasShot) {
                cumulativeHitsSumInShotRounds += hitCount;
                cumulativeScoreSumInShotRounds += score;
                cumulativeMultiplierSumInShotRounds += dist.multiplier;
                cumulativeCountInShotRounds++;
              }

              const soloHits = dist.isSolo ? (athlete.soloHits?.[dist.id] || 0) : 0;

              if (score > maxScore) {
                maxScore = score;
                maxHits = hitCount;
                maxSoloHits = soloHits;
              }
            }
          }

          survivalScore = maxScore >= 0 ? maxScore : 0;
          survivalHits = cumulativeHitsSumInShotRounds;

          if (isDirectMode && activeDirectMaxPoints !== undefined && activeDirectMaxPoints > 0) {
            if (cumulativeMultiplierSumInShotRounds === 0 && activeDistances[lastActiveRoundIdx]) {
              cumulativeMultiplierSumInShotRounds = activeDistances[lastActiveRoundIdx].multiplier;
            }
            const totalPossPoints = activeDirectMaxPoints * cumulativeMultiplierSumInShotRounds;
            survivalAccuracy = totalPossPoints > 0 ? (cumulativeScoreSumInShotRounds / totalPossPoints) * 100 : 0;
          } else {
            if (cumulativeCountInShotRounds === 0) {
              cumulativeCountInShotRounds = 1;
            }
            const totalPossShots = cumulativeCountInShotRounds * effectiveShotsCount;
            survivalAccuracy = totalPossShots > 0 ? (cumulativeHitsSumInShotRounds / totalPossShots) * 100 : 0;
          }
          survivalSoloHits = maxSoloHits;
        } else {
          const statsAtLastRound = roundResults[lastActiveRoundIdx]?.scores[athlete.id];
          if (statsAtLastRound) {
            survivalScore = statsAtLastRound.cumulativeScore;
            survivalHits = statsAtLastRound.cumulativeHits;
            if (isDirectMode && activeDirectMaxPoints !== undefined && activeDirectMaxPoints > 0) {
              let totalMultiplier = 0;
              for (let i = 0; i <= lastActiveRoundIdx; i++) {
                totalMultiplier += activeDistances[i].multiplier;
              }
              const totalPossPoints = activeDirectMaxPoints * totalMultiplier;
              survivalAccuracy = totalPossPoints > 0 ? (survivalScore / totalPossPoints) * 100 : 0;
            } else {
              const totalPossShots = (lastActiveRoundIdx + 1) * effectiveShotsCount;
              survivalAccuracy = totalPossShots > 0 ? (survivalHits / totalPossShots) * 100 : 0;
            }
          }
          const lastActiveDist = activeDistances[lastActiveRoundIdx];
          if (lastActiveDist && lastActiveDist.isSolo) {
            survivalSoloHits = athlete.soloHits?.[lastActiveDist.id] || 0;
          }
        }
      }

      let totalScore = 0;
      let totalHits = 0;
      activeDistances.forEach((dist) => {
        const hits = athlete.scores[dist.id] || [];
        const hitCount = getHitCount(hits);
        totalScore += hitCount * dist.multiplier;
        totalHits += hitCount;
      });

      let accuracy = 0;
      let totalMultiplierOfShotRounds = 0;
      let countShotRounds = 0;
      activeDistances.forEach((d) => {
        const wasShot = athlete.scores[d.id] && athlete.scores[d.id].length > 0 && athlete.scores[d.id].some(v => v !== null && v !== undefined);
        if (wasShot) {
          totalMultiplierOfShotRounds += d.multiplier;
          countShotRounds++;
        }
      });
      if (countShotRounds === 0 && activeDistances.length > 0) {
        totalMultiplierOfShotRounds = activeDistances[0].multiplier;
        countShotRounds = 1;
      }
      if (isDirectMode && activeDirectMaxPoints !== undefined && activeDirectMaxPoints > 0) {
        const totalPossiblePoints = activeDirectMaxPoints * totalMultiplierOfShotRounds;
        accuracy = totalPossiblePoints > 0 ? (totalScore / totalPossiblePoints) * 100 : 0;
      } else {
        const totalPossShots = countShotRounds * effectiveShotsCount;
        accuracy = totalPossShots > 0 ? (totalHits / totalPossShots) * 100 : 0;
      }

      // If configuration hasMaxRoundScoreConf is active, we also find the max score among all distances
      if (hasMaxRoundScoreConf) {
        let maxScoreAll = -1;
        activeDistances.forEach((dist) => {
          const hits = athlete.scores[dist.id] || [];
          const hitCount = getHitCount(hits);
          const score = hitCount * dist.multiplier;
          if (score > maxScoreAll) {
            maxScoreAll = score;
          }
        });
        totalScore = maxScoreAll >= 0 ? maxScoreAll : 0;
      }

      return {
        ...athlete,
        survivalVal,
        survivalScore,
        survivalHits,
        survivalAccuracy,
        survivalSoloHits,
        totalScore,
        totalHits,
        accuracy,
        eliminatedInRoundIdx,
      };
    });
  }, [activeAthletesList, roundResults, activeDistances, effectiveShotsCount, isDirectMode, activeDirectMaxPoints]);

  const activeRoundAthletes = useMemo(() => {
    if (selectedRoundIndex === 0) {
      return athleteSurvivalInfo;
    }
    const qualifiedIds = roundResults[selectedRoundIndex]?.qualifiedIds || [];
    const filtered = athleteSurvivalInfo.filter(a => qualifiedIds.includes(a.id));

    // Sort athletes starting from Round 2 (selectedRoundIndex >= 1) by their score in the previous round ascending (lowest score shoots first)
    const prevRoundResult = roundResults[selectedRoundIndex - 1];
    if (prevRoundResult) {
      return [...filtered].sort((a, b) => {
        const scoreA = prevRoundResult.scores[a.id]?.displayScoreWithSolo ?? 0;
        const scoreB = prevRoundResult.scores[b.id]?.displayScoreWithSolo ?? 0;
        if (scoreA !== scoreB) {
          return scoreA - scoreB;
        }
        // Fallback: accuracy in previous round ascending
        const accA = prevRoundResult.scores[a.id]?.accuracy ?? 0;
        const accB = prevRoundResult.scores[b.id]?.accuracy ?? 0;
        return accA - accB;
      });
    }
    return filtered;
  }, [athleteSurvivalInfo, selectedRoundIndex, roundResults]);

  const sortedSurvivalAthletes = useMemo(() => {
    return [...athleteSurvivalInfo].sort((a, b) => {
      const isABỏThi = a.status === "Bỏ thi";
      const isBBỏThi = b.status === "Bỏ thi";
      if (isABỏThi && !isBBỏThi) return 1;
      if (!isABỏThi && isBBỏThi) return -1;

      if (b.survivalVal !== a.survivalVal) {
        return b.survivalVal - a.survivalVal;
      }
      if (b.survivalScore !== a.survivalScore) {
        return b.survivalScore - a.survivalScore;
      }
      if (b.survivalSoloHits !== a.survivalSoloHits) {
        return b.survivalSoloHits - a.survivalSoloHits;
      }
      if (b.survivalAccuracy !== a.survivalAccuracy) {
        return b.survivalAccuracy - a.survivalAccuracy;
      }
      return a.name.localeCompare(b.name, "vi");
    });
  }, [athleteSurvivalInfo]);

  const rankedSurvivalAthletes = useMemo(() => {
    return sortedSurvivalAthletes.map((athlete, idx) => {
      let betterCount = 0;
      for (let j = 0; j < idx; j++) {
        const other = sortedSurvivalAthletes[j];
        if (other.status === "Bỏ thi") continue;
        if (athlete.status === "Bỏ thi") continue;

        if (other.survivalVal !== athlete.survivalVal) {
          if (other.survivalVal > athlete.survivalVal) betterCount++;
        } else if (other.survivalScore !== athlete.survivalScore) {
          if (other.survivalScore > athlete.survivalScore) betterCount++;
        } else if (other.survivalSoloHits !== athlete.survivalSoloHits) {
          if (other.survivalSoloHits > athlete.survivalSoloHits) betterCount++;
        } else if (other.survivalAccuracy !== athlete.survivalAccuracy) {
          if (other.survivalAccuracy > athlete.survivalAccuracy) betterCount++;
        }
      }
      return { ...athlete, dashboardRank: betterCount + 1 };
    });
  }, [sortedSurvivalAthletes]);

  const top3SurvivalAthletes = useMemo(() => {
    const list = rankedSurvivalAthletes.filter(a => a.status !== "Bỏ thi");
    const matched: any[] = [];
    
    // Position 1 (Gold)
    const gold = list[0];
    matched.push(gold || null);

    // Position 2 (Silver)
    const silver = list[1];
    matched.push(silver || null);

    // Position 3 (Bronze)
    const bronze = list[2];
    matched.push(bronze || null);

    return matched;
  }, [rankedSurvivalAthletes]);

  // Top X Survival List
  const top10SurvivalAthletes = useMemo(() => {
    return rankedSurvivalAthletes.filter(a => a.status !== "Bỏ thi").slice(0, topXLimit);
  }, [rankedSurvivalAthletes, topXLimit]);

  // Top 10 autoscroller algorithm - decoupled from athletes updates to prevent constant resets
  useEffect(() => {
    if (!isOpen) return;

    const container = top10ContainerRef.current;
    if (!container) return;

    let scrollInterval: any = null;
    let fadeTimeout: any = null;
    let resetTimeout: any = null;
    let fallbackTimeout: any = null;

    const startScrolling = () => {
      if (!container) return;
      if (container.scrollHeight <= container.clientHeight) return;

      scrollInterval = setInterval(() => {
        if (!container) return;
        if (container.scrollHeight <= container.clientHeight) {
          clearInterval(scrollInterval);
          return;
        }

        container.scrollTop += 1;

        // Check if bottomed out
        const isAtBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 2;
        if (isAtBottom) {
          clearInterval(scrollInterval);

          fadeTimeout = setTimeout(() => {
            setTop10Fading(true);

            resetTimeout = setTimeout(() => {
              if (container) container.scrollTop = 0;
              setTop10Fading(false);

              fallbackTimeout = setTimeout(() => {
                startScrolling();
              }, 1500);
            }, 600);
          }, 1500);
        }
      }, 35);
    };

    // Initial wait before starting scroller
    const initialDelay = setTimeout(() => {
      startScrolling();
    }, 1500);

    return () => {
      clearTimeout(initialDelay);
      clearInterval(scrollInterval);
      clearTimeout(fadeTimeout);
      clearTimeout(resetTimeout);
      clearTimeout(fallbackTimeout);
    };
  }, [isOpen, top10SurvivalAthletes.length]);


  // -----------------------------------------------------------------
  // TEAM SURVIVAL RANKINGS (For Team Podium)
  // -----------------------------------------------------------------
  const resolvedTeamAthletes = useMemo(() => {
    if (tournamentType === "individual") {
      return activeAthletesList; // use individual list, no isPrimaryTeam filter
    }
    const source = leaderboardTeamAthletes && leaderboardTeamAthletes.length > 0 
      ? leaderboardTeamAthletes 
      : (teamAthletes && teamAthletes.length > 0 ? teamAthletes : []);
    return source.filter((a) => a.isPrimaryTeam);
  }, [leaderboardTeamAthletes, teamAthletes, activeAthletesList, tournamentType]);

  const activeTeamDistances = useMemo(() => {
    if (tournamentType === "individual") {
      return activeDistances;
    }
    return teamDistances && teamDistances.length > 0 ? teamDistances : (distances || []);
  }, [tournamentType, activeDistances, teamDistances, distances]);

  const activeTeamShotsCount = useMemo(() => {
    if (tournamentType === "individual") {
      return effectiveShotsCount;
    }
    return effectiveTeamShotsCount;
  }, [tournamentType, effectiveShotsCount, effectiveTeamShotsCount]);

  const teamRoundResults = useMemo(() => {
    const results: any[] = [];
    const teamCumulativeScores: Record<string, number> = {};
    const teamCumulativeHits: Record<string, number> = {};

    const activeTeams = Array.from(new Set(resolvedTeamAthletes.map((a) => {
      const raw = a.team.trim();
      return raw === "" ? "VĐV Tự Do (Không Đội)" : raw;
    }))) as string[];

    for (let r = 0; r < activeTeamDistances.length; r++) {
      const dist = activeTeamDistances[r];
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

      const currentRoundTeams = Array.from(new Set(resolvedTeamAthletes.map((a) => {
        const raw = a.team.trim();
        return raw === "" ? "VĐV Tự Do (Không Đội)" : raw;
      }))).filter((tName) => activeTeams.includes(tName as string)) as string[];

      currentRoundTeams.forEach((teamName: string) => {
        const members = resolvedTeamAthletes.filter((a) => {
          const raw = a.team.trim();
          const t = raw === "" ? "VĐV Tự Do (Không Đội)" : raw;
          return t === teamName;
        });

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
          roundHits += getHitCount(memb.scores[dist.id] || []);
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
        const currentTeamDistances = teamDistances || distances;

        activeMembers.forEach((memb) => {
          if (dist.isCumulative) {
            for (let i = 0; i <= r; i++) {
              const distI = currentTeamDistances[i];
              const wasShot = memb.scores[distI.id] && memb.scores[distI.id].length > 0 && memb.scores[distI.id].some(v => v !== null && v !== undefined);
              if (wasShot) {
                if (isTeamDirectMode && teamDirectMaxPoints !== undefined && teamDirectMaxPoints > 0) {
                  totalPossPoints += teamDirectMaxPoints * distI.multiplier;
                } else {
                  totalPossShots += activeTeamShotsCount;
                }
              }
            }
          } else {
            const wasShot = memb.scores[dist.id] && memb.scores[dist.id].length > 0 && memb.scores[dist.id].some(v => v !== null && v !== undefined);
            if (wasShot) {
              if (isTeamDirectMode && teamDirectMaxPoints !== undefined && teamDirectMaxPoints > 0) {
                totalPossPoints += teamDirectMaxPoints * dist.multiplier;
              } else {
                totalPossShots += activeTeamShotsCount;
              }
            } else {
              if (isTeamDirectMode && teamDirectMaxPoints !== undefined && teamDirectMaxPoints > 0) {
                totalPossPoints += teamDirectMaxPoints * dist.multiplier;
              } else {
                totalPossShots += activeTeamShotsCount;
              }
            }
          }
        });

        if (isTeamDirectMode && teamDirectMaxPoints !== undefined && teamDirectMaxPoints > 0) {
          if (totalPossPoints === 0) {
            totalPossPoints = activeMembers.length * teamDirectMaxPoints * dist.multiplier;
          }
          accuracy = totalPossPoints > 0 ? (displayScore / totalPossPoints) * 100 : 0;
        } else {
          if (totalPossShots === 0) {
            const totalShotsCountInRounds = dist.isCumulative ? (r + 1) * activeTeamShotsCount : activeTeamShotsCount;
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
      let roundPendingSoloTeams: string[] = [];
      let roundResoloTeams: string[] = [];

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
              roundPendingSoloTeams = [...finishedContendersWithNoSolo];

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
                  roundResoloTeams = resoloCandidates;

                  const surelySoloPassed = contendersWithSolo.filter((c) => c.soloHits > winnerScoreBoundary).map((c) => c.id);
                  const surelySoloFailed = contendersWithSolo.filter((c) => c.soloHits < winnerScoreBoundary).map((c) => c.id);

                  nextRoundTeams = [...sures, ...surelySoloPassed, ...resoloCandidates];
                  currentRoundEliminatedTeams = [...surelySoloFailed, ...purelyEliminated];
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

      results.push({
        distance: dist,
        roundIndex: r,
        qualifiedTeams: [...currentRoundTeams],
        eliminatedTeams: currentRoundEliminatedTeams,
        pendingSoloTeams: roundPendingSoloTeams,
        pendingResoloTeams: roundResoloTeams,
        scores: teamRoundScores,
      });

      activeTeams.length = 0;
      activeTeams.push(...nextRoundTeams);
    }

    return results;
  }, [resolvedTeamAthletes, activeTeamDistances, activeTeamShotsCount]);

  const activeTeamScores = useMemo(() => {
    const scores: Record<string, number> = {};
    const hasMaxRoundScoreConf = activeTeamDistances.some(d => d.isMaxRoundScore);

    resolvedTeamAthletes.forEach((athlete) => {
      const rawTeam = athlete.team.trim();
      const teamName = rawTeam === "" ? "VĐV Tự Do (Không Đội)" : rawTeam;

      let personalScore = 0;
      let personalSolo = 0;

      if (hasMaxRoundScoreConf) {
        let maxScore = -1;
        let maxSoloHits = 0;
        activeTeamDistances.forEach((distance, rIdx) => {
          const isQualified = rIdx === 0 || (teamRoundResults[rIdx]?.qualifiedTeams.includes(teamName));
          if (isQualified) {
            const hits = athlete.scores[distance.id] || [];
            const hitCount = getHitCount(hits);
            const score = hitCount * distance.multiplier;
            const soloVal = athlete.soloHits?.[distance.id];
            const soloHitsNum = (soloVal === null || soloVal === undefined) ? 0 : soloVal;

            if (score > maxScore) {
              maxScore = score;
              maxSoloHits = soloHitsNum;
            }
          }
        });
        personalScore = maxScore >= 0 ? maxScore : 0;
        personalSolo = maxSoloHits;
      } else {
        activeTeamDistances.forEach((distance, rIdx) => {
          const isQualified = rIdx === 0 || (teamRoundResults[rIdx]?.qualifiedTeams.includes(teamName));
          if (isQualified) {
            const hits = athlete.scores[distance.id] || [];
            const hitCount = getHitCount(hits);
            personalScore += hitCount * distance.multiplier;

            const soloVal = athlete.soloHits?.[distance.id];
            const soloHitsNum = (soloVal === null || soloVal === undefined) ? 0 : soloVal;
            personalSolo += soloHitsNum;
          }
        });
      }

      scores[teamName] = (scores[teamName] || 0) + personalScore + (personalSolo * 0.001);
    });
    return scores;
  }, [resolvedTeamAthletes, activeTeamDistances, teamRoundResults]);

  const teamRanks = useMemo(() => {
    const teamStats: Record<string, { survivalVal: number; score: number }> = {};
    resolvedTeamAthletes.forEach((ath) => {
      const rawTeam = ath.team.trim();
      const teamName = rawTeam === "" ? "VĐV Tự Do (Không Đội)" : rawTeam;
      if (!teamStats[teamName]) {
        let eliminatedInRoundIdx: number | null = null;
        for (let i = 0; i < teamRoundResults.length; i++) {
          if (teamRoundResults[i].eliminatedTeams.includes(teamName)) {
            eliminatedInRoundIdx = i;
            break;
          }
        }
        const sVal = eliminatedInRoundIdx === null ? activeTeamDistances.length : eliminatedInRoundIdx;
        teamStats[teamName] = {
          survivalVal: sVal,
          score: activeTeamScores[teamName] || 0,
        };
      }
    });

    const teamNames = Object.keys(teamStats);
    const ranks: Record<string, number> = {};
    teamNames.forEach((tName) => {
      const tStats = teamStats[tName];
      let betterTeamsCount = 0;
      teamNames.forEach((otherName) => {
        if (otherName === tName) return;
        const otherStats = teamStats[otherName];
        let isOtherBetter = false;
        if (otherStats.survivalVal !== tStats.survivalVal) {
          isOtherBetter = otherStats.survivalVal > tStats.survivalVal;
        } else {
          isOtherBetter = otherStats.score > tStats.score;
        }
        if (isOtherBetter) {
          betterTeamsCount++;
        }
      });
      ranks[tName] = betterTeamsCount + 1;
    });
    return ranks;
  }, [resolvedTeamAthletes, teamRoundResults, activeTeamScores, activeTeamDistances.length]);

  const teamLeaderboardSurvivalData = useMemo(() => {
    const groups: Record<string, { totalScore: number; memberCount: number }> = {};
    const hasMaxRoundScoreConf = activeTeamDistances.some(d => d.isMaxRoundScore);

    resolvedTeamAthletes.forEach((athlete) => {
      const rawTeam = athlete.team.trim();
      const teamName = rawTeam === "" ? "VĐV Tự Do (Không Đội)" : rawTeam;

      let score = 0;
      let eliminatedInRoundIdx: number | null = null;
      for (let i = 0; i < teamRoundResults.length; i++) {
        if (teamRoundResults[i].eliminatedTeams.includes(teamName)) {
          eliminatedInRoundIdx = i;
          break;
        }
      }
      const lastActiveRoundIdx = eliminatedInRoundIdx === null ? (activeTeamDistances.length - 1) : eliminatedInRoundIdx;

      if (activeTeamDistances.length > 0 && lastActiveRoundIdx >= 0) {
        if (hasMaxRoundScoreConf) {
          let maxScore = -1;
          for (let r = 0; r <= lastActiveRoundIdx; r++) {
            const d = activeTeamDistances[r];
            const hits = athlete.scores[d.id] || [];
            const hitCount = getHitCount(hits);
            const rScore = hitCount * d.multiplier;
            if (rScore > maxScore) {
              maxScore = rScore;
            }
          }
          score = maxScore >= 0 ? maxScore : 0;
        } else {
          for (let r = 0; r <= lastActiveRoundIdx; r++) {
            const d = activeTeamDistances[r];
            const hits = athlete.scores[d.id] || [];
            const hitCount = getHitCount(hits);
            score += hitCount * d.multiplier;
          }
        }
      }

      if (!groups[teamName]) {
        groups[teamName] = { totalScore: 0, memberCount: 0 };
      }
      groups[teamName].totalScore += score;
      groups[teamName].memberCount += 1;
    });

    const list = Object.entries(groups).map(([teamName, item]) => ({
      teamName,
      totalScore: item.totalScore,
      memberCount: item.memberCount,
    }));

    return list.sort((a, b) => {
      const rankA = teamRanks[a.teamName] || 999;
      const rankB = teamRanks[b.teamName] || 999;
      if (rankA !== rankB) {
        return rankA - rankB;
      }
      return a.teamName.localeCompare(b.teamName, "vi");
    });
  }, [resolvedTeamAthletes, activeTeamDistances, teamRoundResults, teamRanks]);

  const top3SurvivalTeams = useMemo(() => {
    const list = [...teamLeaderboardSurvivalData];
    const top3: any[] = [];
    
    // Position 1 (Gold)
    const gold = list[0] || null;
    top3.push(gold);

    // Position 2 (Silver)
    const silver = list[1] || null;
    top3.push(silver);

    // Position 3 (Bronze)
    const bronze = list[2] || null;
    top3.push(bronze);

    return top3;
  }, [teamLeaderboardSurvivalData]);

  const getTeamAvatar = (teamName: string, place: 1 | 2 | 3) => {
    const club = clubs?.find(c => c.name.trim().toLowerCase() === teamName.trim().toLowerCase());
    const badgeColor = place === 1 ? "text-teal-400 fill-teal-450/20" : place === 2 ? "text-slate-300 fill-slate-400/20" : "text-amber-500 fill-amber-600/20";
    const borderColor = place === 1 ? "border-teal-400 ring-4 ring-teal-500/10" : place === 2 ? "border-slate-500 ring-2 ring-slate-400/5" : "border-amber-700/50 ring-2 ring-amber-800/5";
    const size = place === 1 ? "w-12 h-12" : "w-10 h-10";
    const badgeSize = place === 1 ? "w-4 h-4" : "w-3.5 h-3.5";
    const Icon = place === 1 ? Trophy : place === 2 ? Medal : Award;

    const logoUrl = club ? ((club as any).logoUrl || club.avatarUrl) : null;

    if (club && logoUrl) {
      return (
        <div className="relative flex justify-center items-center mb-2">
          <img 
            src={logoUrl} 
            alt={teamName} 
            className={`${size} rounded-full object-cover border ${borderColor} shadow-md`}
            referrerPolicy="no-referrer"
          />
          <div className="absolute -bottom-1 -right-1 bg-[#0b1329] rounded-full p-0.5 shadow-xs border border-[#1f2d50]">
            <Icon className={`${badgeSize} ${badgeColor}`} />
          </div>
        </div>
      );
    }

    // Fallback if no avatar
    const initialText = teamName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";
    return (
      <div className="relative flex justify-center items-center mb-2">
        <div className={`${size} rounded-full bg-[#111a2e] border ${borderColor} flex items-center justify-center shadow-md font-sans text-xs font-black text-slate-300 uppercase tracking-wide`}>
          {initialText}
        </div>
        <div className="absolute -bottom-1 -right-1 bg-[#0b1329] rounded-full p-0.5 shadow-xs border border-[#1f2d50]">
          <Icon className={`${badgeSize} ${badgeColor}`} />
        </div>
      </div>
    );
  };


  // -----------------------------------------------------------------
  // ACTIVE LANE FLIGHT PARTITIONING & SEQUENCING
  // -----------------------------------------------------------------
  // Safe filtering: only show competitors in active lists (ignore "Bỏ thi" for actual flight but user wants to see statuses)
  // Let's preserve the original ordering from Quản Lý VĐV (meaning "athletes" prop array)
  const currentGroup1 = useMemo(() => {
    const startIdx = (activeFlight - 1) * laneCapacity;
    const endIdx = activeFlight * laneCapacity;
    return activeRoundAthletes.slice(startIdx, endIdx);
  }, [activeRoundAthletes, activeFlight, laneCapacity]);

  const currentGroup2 = useMemo(() => {
    const startIdx = activeFlight * laneCapacity;
    const endIdx = (activeFlight + 1) * laneCapacity;
    return activeRoundAthletes.slice(startIdx, endIdx);
  }, [activeRoundAthletes, activeFlight, laneCapacity]);

  const currentGroup3 = useMemo(() => {
    const startIdx = (activeFlight + 1) * laneCapacity;
    const endIdx = (activeFlight + 2) * laneCapacity;
    return activeRoundAthletes.slice(startIdx, endIdx);
  }, [activeRoundAthletes, activeFlight, laneCapacity]);

  const currentGroup1Lanes = useMemo(() => {
    if (isNational && lanesDataByFlight.getSquadLanes) {
      return lanesDataByFlight.getSquadLanes(activeFlight);
    }
    const drawnNumbers = currentTournamentDoc?.drawnNumbers || {};
    return Array.from({ length: laneCapacity }).map((_, slotIdx) => {
      const ath = currentGroup1[slotIdx] || null;
      return {
        laneNum: slotIdx + 1,
        name: ath ? ath.name : null,
        sbd: ath ? (drawnNumbers[ath.id] || null) : null,
        isClub: false,
        team: ath ? ath.team : null,
        athleteObj: ath
      };
    });
  }, [isNational, lanesDataByFlight, activeFlight, currentGroup1, laneCapacity, currentTournamentDoc]);

  const currentGroup2Lanes = useMemo(() => {
    if (isNational && lanesDataByFlight.getSquadLanes) {
      return lanesDataByFlight.getSquadLanes(activeFlight + 1);
    }
    const drawnNumbers = currentTournamentDoc?.drawnNumbers || {};
    return Array.from({ length: laneCapacity }).map((_, slotIdx) => {
      const ath = currentGroup2[slotIdx] || null;
      return {
        laneNum: slotIdx + 1,
        name: ath ? ath.name : null,
        sbd: ath ? (drawnNumbers[ath.id] || null) : null,
        isClub: false,
        team: ath ? ath.team : null,
        athleteObj: ath
      };
    });
  }, [isNational, lanesDataByFlight, activeFlight, currentGroup2, laneCapacity, currentTournamentDoc]);

  const currentGroup3Lanes = useMemo(() => {
    if (isNational && lanesDataByFlight.getSquadLanes) {
      return lanesDataByFlight.getSquadLanes(activeFlight + 2);
    }
    const drawnNumbers = currentTournamentDoc?.drawnNumbers || {};
    return Array.from({ length: laneCapacity }).map((_, slotIdx) => {
      const ath = currentGroup3[slotIdx] || null;
      return {
        laneNum: slotIdx + 1,
        name: ath ? ath.name : null,
        sbd: ath ? (drawnNumbers[ath.id] || null) : null,
        isClub: false,
        team: ath ? ath.team : null,
        athleteObj: ath
      };
    });
  }, [isNational, lanesDataByFlight, activeFlight, currentGroup3, laneCapacity, currentTournamentDoc]);

  const totalFlightsPossible = useMemo(() => {
    if (isNational && lanesDataByFlight.totalFlightsPossible !== undefined) {
      return lanesDataByFlight.totalFlightsPossible;
    }
    return Math.max(1, Math.ceil(activeRoundAthletes.length / laneCapacity));
  }, [isNational, lanesDataByFlight, activeRoundAthletes, laneCapacity]);



  // TV Slides Auto-Rotation Timer
  useEffect(() => {
    if (!isTvMode || isTvPaused) return;
    const timer = setInterval(() => {
      setTvSlideSecondsRemaining((prev) => {
        if (prev <= 1) {
          const nextIdx = (tvSlideIdx + 1) % 5;
          setTvSlideIdx(nextIdx);
          setTvLanePageIdx(0);
          return getTvSlideDuration(nextIdx);
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isTvMode, isTvPaused, tvSlideIdx]);

  if (!isOpen) return null;

  if (isTvMode) {
    return (
      <div className="fixed inset-0 z-50 bg-[#030712] text-white flex flex-col justify-between font-sans select-none overflow-hidden px-8 py-4 animate-fadeIn" id="live-board-tv-backdrop">
        <style>{`
          .scrollbar-none::-webkit-scrollbar {
            display: none;
          }
          .scrollbar-none {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}</style>
        
        {/* TOP STATUS BAR */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-emerald-500/10 border border-emerald-400/40">
              <Tv className="w-8 h-8 animate-pulse text-emerald-300" />
            </div>
            <div>
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.25em] flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                TIVI LIVE BROADCAST BOARD
                <SmartGuideTrigger guideId="tv_mode_guide" className="bg-emerald-500/10 hover:bg-emerald-500/25 border-emerald-500/20 text-emerald-400 font-black text-[9px] px-1.5 py-0.5 ml-1" />
              </span>
              <h1 className="text-3xl font-black uppercase tracking-wider bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-300 bg-clip-text text-transparent">
                {matchName || "GIẢI VÔ ĐỊCH NÁ CAO SU VIỆT NAM"}
              </h1>
            </div>
          </div>

          {/* Slide Progress indicator */}
          <div className="flex items-center gap-6">
            <div className="text-right">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">CHUYỂN SLIDE TRONG</span>
              <span className="text-3xl font-mono font-black text-amber-400">
                {tvSlideSecondsRemaining}s
              </span>
            </div>
            
            {/* Slide Navigation Tabs */}
            <div className="flex gap-2">
              {[0, 1, 2, 3, 4].map((idx) => (
                <button
                  key={`tv-indicator-${idx}`}
                  onClick={() => handleSetTvSlide(idx)}
                  className={`h-9 rounded-xl transition-all flex items-center justify-center font-black text-[10px] uppercase cursor-pointer px-4 border ${
                    tvSlideIdx === idx
                      ? "bg-gradient-to-r from-emerald-500 to-indigo-600 text-white border-emerald-400 shadow-lg shadow-emerald-950/45"
                      : "bg-slate-900/60 text-slate-400 border-slate-800 hover:bg-slate-800"
                  }`}
                >
                  {idx === 0 && "🏆 BẢNG VÀNG"}
                  {idx === 1 && "📈 TOP X"}
                  {idx === 2 && "🎯 ĐANG BẮN"}
                  {idx === 3 && "⏱️ CHỜ BẮN"}
                  {idx === 4 && "⚡ BẮN THỬ"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* MAIN SLIDE BODY */}
        <div className="flex-1 flex flex-col justify-center py-3 min-h-0 overflow-hidden relative">
          
          {/* SLIDE 0: BẢNG VÀNG CÁ NHÂN & ĐỒNG ĐỘI */}
          {tvSlideIdx === 0 && (() => {
            const getTeamLogoUrl = (teamName: string) => {
              if (!teamName) return null;
              const club = clubs?.find(c => c.name.trim().toLowerCase() === teamName.trim().toLowerCase());
              return club ? ((club as any).logoUrl || club.avatarUrl) : null;
            };

            return (
              <div className="grid grid-cols-2 gap-8 h-full items-stretch animate-fadeIn">
                
                {/* INDIVIDUAL HALL OF FAME */}
                <div className="flex flex-col justify-between bg-slate-950/60 border border-slate-900 p-8 rounded-3xl relative overflow-hidden shadow-2xl">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full filter blur-3xl"></div>
                  <div className="flex items-center justify-between pb-4 border-b border-slate-900 mb-4">
                    <h2 className="text-2xl font-black text-indigo-400 uppercase tracking-widest flex items-center gap-3">
                      <Trophy className="w-8 h-8 text-amber-400" />
                      BẢNG VÀNG CÁ NHÂN
                    </h2>
                    <span className="text-[10px] bg-indigo-950/50 text-indigo-300 border border-indigo-900/50 px-3.5 py-1 rounded-full font-black uppercase tracking-wider">TOP 3 CHUNG CUỘC</span>
                  </div>

                  <div className="flex items-end justify-center gap-5 py-2 h-[280px]">
                    {/* Silver - Left */}
                    {top3SurvivalAthletes[1] ? (
                      <div className="flex-1 flex flex-col items-center">
                        <div className="relative w-20 h-20 rounded-full border-4 border-slate-400 bg-slate-900 flex items-center justify-center overflow-hidden mb-3 shadow-lg shrink-0">
                          {top3SurvivalAthletes[1].avatarUrl ? (
                            <img src={top3SurvivalAthletes[1].avatarUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <User className="w-10 h-10 text-slate-300" />
                          )}
                        </div>
                        <span className="font-black text-base text-slate-200 truncate w-full text-center block">{top3SurvivalAthletes[1].name}</span>
                        <span className="text-xs text-slate-400 font-bold truncate tracking-wider uppercase mt-0.5 block">{top3SurvivalAthletes[1].team || "Tự do"}</span>
                        
                        {/* Pedestal base - Silver */}
                        <div className="w-full h-24 bg-gradient-to-b from-slate-800 to-slate-950 border-t-4 border-slate-400 mt-3 rounded-t-2xl flex flex-col items-center justify-between py-3.5 shadow-lg">
                          <div className="text-center">
                            <span className="text-sm font-black text-slate-200 font-mono block">{top3SurvivalAthletes[1].survivalScore || 0} Điểm</span>
                            <span className="text-[10px] text-slate-450 font-black font-mono uppercase mt-0.5 block">
                              {top3SurvivalAthletes[1].survivalSoloHits || 0} Hit / {top3SurvivalAthletes[1].survivalVal || 0} Vòng
                            </span>
                          </div>
                          <span className="text-[10px] font-black text-slate-400 tracking-widest bg-slate-950/80 px-3 py-1 rounded-full border border-slate-800">RANK 2</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center">
                        <div className="w-20 h-20 rounded-full border-4 border-slate-800 bg-slate-950 flex items-center justify-center text-slate-600 mb-3">🥈</div>
                        <span className="text-slate-600 text-sm font-bold">Trống</span>
                        <div className="w-full h-12 bg-slate-900/20 mt-3 rounded-t-xl"></div>
                      </div>
                    )}

                    {/* Gold - Center */}
                    {top3SurvivalAthletes[0] ? (
                      <div className="flex-1 flex flex-col items-center z-10 scale-105">
                        <div className="relative w-24 h-24 rounded-full border-4 border-amber-400 bg-slate-900 flex items-center justify-center overflow-hidden mb-3 shadow-2xl shrink-0 ring-4 ring-amber-400/10">
                          {top3SurvivalAthletes[0].avatarUrl ? (
                            <img src={top3SurvivalAthletes[0].avatarUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <User className="w-12 h-12 text-amber-400" />
                          )}
                        </div>
                        <span className="font-black text-lg text-amber-300 truncate w-full text-center block">{top3SurvivalAthletes[0].name}</span>
                        <span className="text-[10px] text-amber-450 font-black truncate tracking-widest uppercase mt-0.5 block">{top3SurvivalAthletes[0].team || "Tự do"}</span>
                        
                        {/* Pedestal base - Gold */}
                        <div className="w-full h-32 bg-gradient-to-b from-amber-950/30 to-slate-950 border-t-4 border-amber-400 mt-3 rounded-t-2xl flex flex-col items-center justify-between py-4 shadow-2xl">
                          <div className="text-center">
                            <span className="text-base font-black text-amber-300 font-mono block">{top3SurvivalAthletes[0].survivalScore || 0} Điểm</span>
                            <span className="text-[10px] text-amber-400/95 font-black font-mono uppercase mt-0.5 block">
                              {top3SurvivalAthletes[0].survivalSoloHits || 0} Hit / {top3SurvivalAthletes[0].survivalVal || 0} Vòng
                            </span>
                          </div>
                          <span className="text-xs font-black text-amber-400 tracking-widest bg-slate-950/85 px-4.5 py-1 rounded-full border border-amber-500/20 shadow-inner">RANK 1</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center">
                        <div className="w-24 h-24 rounded-full border-4 border-slate-800 bg-slate-950 flex items-center justify-center text-slate-600 mb-3">👑</div>
                        <span className="text-slate-600 text-sm font-bold">Trống</span>
                        <div className="w-full h-16 bg-slate-900/20 mt-3 rounded-t-xl"></div>
                      </div>
                    )}

                    {/* Bronze - Right */}
                    {top3SurvivalAthletes[2] ? (
                      <div className="flex-1 flex flex-col items-center">
                        <div className="relative w-20 h-20 rounded-full border-4 border-amber-700 bg-slate-900 flex items-center justify-center overflow-hidden mb-3 shadow-lg shrink-0">
                          {top3SurvivalAthletes[2].avatarUrl ? (
                            <img src={top3SurvivalAthletes[2].avatarUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <User className="w-10 h-10 text-amber-700" />
                          )}
                        </div>
                        <span className="font-black text-base text-amber-500 truncate w-full text-center block">{top3SurvivalAthletes[2].name}</span>
                        <span className="text-xs text-slate-400 font-bold truncate tracking-wider uppercase mt-0.5 block">{top3SurvivalAthletes[2].team || "Tự do"}</span>
                        
                        {/* Pedestal base - Bronze */}
                        <div className="w-full h-20 bg-gradient-to-b from-amber-950/20 to-slate-950 border-t-4 border-amber-700 mt-3 rounded-t-2xl flex flex-col items-center justify-between py-3 shadow-lg">
                          <div className="text-center">
                            <span className="text-sm font-black text-slate-200 font-mono block">{top3SurvivalAthletes[2].survivalScore || 0} Điểm</span>
                            <span className="text-[10px] text-slate-450 font-black font-mono uppercase mt-0.5 block">
                              {top3SurvivalAthletes[2].survivalSoloHits || 0} Hit / {top3SurvivalAthletes[2].survivalVal || 0} Vòng
                            </span>
                          </div>
                          <span className="text-[10px] font-black text-amber-600 tracking-widest bg-slate-950/80 px-3 py-1 rounded-full border border-slate-850">RANK 3</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center">
                        <div className="w-20 h-20 rounded-full border-4 border-slate-800 bg-slate-950 flex items-center justify-center text-slate-600 mb-3">🥉</div>
                        <span className="text-slate-600 text-sm font-bold">Trống</span>
                        <div className="w-full h-12 bg-slate-900/20 mt-3 rounded-t-xl"></div>
                      </div>
                    )}
                  </div>
                </div>

                {/* TEAM HALL OF FAME */}
                <div className="flex flex-col justify-between bg-slate-950/60 border border-slate-900 p-8 rounded-3xl relative overflow-hidden shadow-2xl">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full filter blur-3xl"></div>
                  <div className="flex items-center justify-between pb-4 border-b border-slate-900 mb-4">
                    <h2 className="text-2xl font-black text-emerald-400 uppercase tracking-widest flex items-center gap-3">
                      <Shield className="w-8 h-8 text-emerald-400" />
                      BẢNG VÀNG ĐỒNG ĐỘI
                    </h2>
                    <span className="text-[10px] bg-emerald-950/50 text-emerald-300 border border-emerald-900/50 px-3.5 py-1 rounded-full font-black uppercase tracking-wider">TOP 3 ĐỒNG ĐỘI CLB</span>
                  </div>

                  <div className="flex items-end justify-center gap-5 py-2 h-[280px]">
                    {/* Silver - Left */}
                    {top3SurvivalTeams[1] ? (
                      <div className="flex-1 flex flex-col items-center">
                        <div className="relative w-20 h-20 rounded-full border-4 border-slate-400 bg-slate-900 flex items-center justify-center overflow-hidden mb-3 shadow-lg shrink-0">
                          {getTeamLogoUrl(top3SurvivalTeams[1].teamName) ? (
                            <img src={getTeamLogoUrl(top3SurvivalTeams[1].teamName)} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <Shield className="w-10 h-10 text-slate-300" />
                          )}
                        </div>
                        <span className="font-black text-base text-slate-200 truncate w-full text-center block">{top3SurvivalTeams[1].teamName}</span>
                        <span className="text-xs text-slate-400 font-bold truncate tracking-wider uppercase mt-0.5 block">CÂU LẠC BỘ</span>
                        
                        {/* Pedestal base - Silver */}
                        <div className="w-full h-24 bg-gradient-to-b from-slate-800 to-slate-950 border-t-4 border-slate-400 mt-3 rounded-t-2xl flex flex-col items-center justify-between py-3.5 shadow-lg">
                          <div className="text-center">
                            <span className="text-sm font-black text-slate-200 font-mono block">{top3SurvivalTeams[1].totalScore || 0} Điểm</span>
                            <span className="text-[10px] text-slate-450 font-black font-mono uppercase mt-0.5 block">
                              {top3SurvivalTeams[1].totalSoloHits || 0} Hit / {top3SurvivalTeams[1].totalSurvivalVal || 0} Vòng
                            </span>
                          </div>
                          <span className="text-[10px] font-black text-slate-400 tracking-widest bg-slate-950/80 px-3 py-1 rounded-full border border-slate-800">RANK 2</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center">
                        <div className="w-20 h-20 rounded-full border-4 border-slate-800 bg-slate-950 flex items-center justify-center text-slate-600 mb-3">🥈</div>
                        <span className="text-slate-600 text-sm font-bold">Trống</span>
                        <div className="w-full h-12 bg-slate-900/20 mt-3 rounded-t-xl"></div>
                      </div>
                    )}

                    {/* Gold - Center */}
                    {top3SurvivalTeams[0] ? (
                      <div className="flex-1 flex flex-col items-center z-10 scale-105">
                        <div className="relative w-24 h-24 rounded-full border-4 border-emerald-400 bg-slate-900 flex items-center justify-center overflow-hidden mb-3 shadow-2xl shrink-0 ring-4 ring-emerald-400/10">
                          {getTeamLogoUrl(top3SurvivalTeams[0].teamName) ? (
                            <img src={getTeamLogoUrl(top3SurvivalTeams[0].teamName)} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <Shield className="w-12 h-12 text-emerald-400" />
                          )}
                        </div>
                        <span className="font-black text-lg text-emerald-300 truncate w-full text-center block">{top3SurvivalTeams[0].teamName}</span>
                        <span className="text-[10px] text-emerald-450 font-black truncate tracking-widest uppercase mt-0.5 block">CÂU LẠC BỘ</span>
                        
                        {/* Pedestal base - Gold */}
                        <div className="w-full h-32 bg-gradient-to-b from-emerald-950/30 to-slate-950 border-t-4 border-emerald-400 mt-3 rounded-t-2xl flex flex-col items-center justify-between py-4 shadow-2xl">
                          <div className="text-center">
                            <span className="text-base font-black text-emerald-300 font-mono block">{top3SurvivalTeams[0].totalScore || 0} Điểm</span>
                            <span className="text-[10px] text-emerald-400 font-black font-mono uppercase mt-0.5 block">
                              {top3SurvivalTeams[0].totalSoloHits || 0} Hit / {top3SurvivalTeams[0].totalSurvivalVal || 0} Vòng
                            </span>
                          </div>
                          <span className="text-xs font-black text-emerald-400 tracking-widest bg-slate-950/85 px-4.5 py-1 rounded-full border border-emerald-500/20 shadow-inner">RANK 1</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center">
                        <div className="w-24 h-24 rounded-full border-4 border-slate-800 bg-slate-950 flex items-center justify-center text-slate-600 mb-3">👑</div>
                        <span className="text-slate-600 text-sm font-bold">Trống</span>
                        <div className="w-full h-16 bg-slate-900/20 mt-3 rounded-t-xl"></div>
                      </div>
                    )}

                    {/* Bronze - Right */}
                    {top3SurvivalTeams[2] ? (
                      <div className="flex-1 flex flex-col items-center">
                        <div className="relative w-20 h-20 rounded-full border-4 border-amber-700 bg-slate-900 flex items-center justify-center overflow-hidden mb-3 shadow-lg shrink-0">
                          {getTeamLogoUrl(top3SurvivalTeams[2].teamName) ? (
                            <img src={getTeamLogoUrl(top3SurvivalTeams[2].teamName)} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <Shield className="w-10 h-10 text-amber-700" />
                          )}
                        </div>
                        <span className="font-black text-base text-amber-500 truncate w-full text-center block">{top3SurvivalTeams[2].teamName}</span>
                        <span className="text-xs text-slate-400 font-bold truncate tracking-wider uppercase mt-0.5 block">CÂU LẠC BỘ</span>
                        
                        {/* Pedestal base - Bronze */}
                        <div className="w-full h-20 bg-gradient-to-b from-amber-950/20 to-slate-950 border-t-4 border-amber-700 mt-3 rounded-t-2xl flex flex-col items-center justify-between py-3 shadow-lg">
                          <div className="text-center">
                            <span className="text-sm font-black text-slate-200 font-mono block">{top3SurvivalTeams[2].totalScore || 0} Điểm</span>
                            <span className="text-[10px] text-slate-450 font-black font-mono uppercase mt-0.5 block">
                              {top3SurvivalTeams[2].totalSoloHits || 0} Hit / {top3SurvivalTeams[2].totalSurvivalVal || 0} Vòng
                            </span>
                          </div>
                          <span className="text-[10px] font-black text-amber-600 tracking-widest bg-slate-950/80 px-3 py-1 rounded-full border border-slate-850">RANK 3</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center">
                        <div className="w-20 h-20 rounded-full border-4 border-slate-800 bg-slate-950 flex items-center justify-center text-slate-600 mb-3">🥉</div>
                        <span className="text-slate-600 text-sm font-bold">Trống</span>
                        <div className="w-full h-12 bg-slate-900/20 mt-3 rounded-t-xl"></div>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            );
          })()}

          {/* SLIDE 1: BẢNG XẾP HẠNG TOP X */}
          {tvSlideIdx === 1 && (() => {
            const drawnNumbers = currentTournamentDoc?.drawnNumbers || {};

            const renderRow = (item: any, globalIndex: number) => {
              if (!item) {
                return (
                  <div key={`tv-empty-row-${globalIndex}`} className="flex items-center justify-center border border-dashed border-slate-900 p-6 rounded-3xl bg-slate-950/20 text-slate-700 text-lg font-bold h-[115px]">
                    HÀNG TRỐNG
                  </div>
                );
              }

              const place = globalIndex + 1;
              const badgeBg = place === 1 ? "bg-amber-400 text-black font-black" : place === 2 ? "bg-slate-300 text-black font-black" : place === 3 ? "bg-amber-600 text-white font-black" : "bg-slate-900 text-slate-400 font-bold font-mono";
              const sbd = drawnNumbers[item.id] || currentTournamentDoc?.drawnNumbers?.[item.id] || null;

              return (
                <div key={`tv-lb-row-${item.id}`} className="flex items-center justify-between bg-slate-950/90 border border-slate-900 px-8 py-5 rounded-3xl shadow-xl h-[115px] hover:border-teal-500/30 transition-all">
                  <div className="flex items-center gap-6 min-w-0">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-md shrink-0 ${badgeBg}`}>
                      {place}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-2xl font-black text-slate-100 truncate uppercase tracking-wide">
                        {item.name}
                      </h4>
                      <div className="flex items-center gap-3.5 mt-2 flex-wrap">
                        <span className="text-sm text-slate-450 font-mono font-black bg-slate-900/80 border border-slate-800/80 px-2.5 py-0.5 rounded">
                          SBD: {sbd ? String(sbd).padStart(3, "0") : "---"}
                        </span>
                        <span className="text-sm bg-slate-900 border border-slate-800 text-slate-400 font-black px-2.5 py-0.5 rounded uppercase">
                          {item.team || "Tự Do"}
                        </span>
                        {item.category && (
                          <span className="text-sm bg-indigo-950/80 text-indigo-400 border border-indigo-900/40 font-black uppercase px-2.5 py-0.5 rounded tracking-wide">
                            {item.category}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-3xl font-black text-teal-400 font-mono">
                      {item.survivalScore || 0} ĐIỂM
                    </div>
                    <div className="text-xs text-slate-400 font-black font-mono mt-1 uppercase tracking-wider">
                      {item.survivalSoloHits || 0} HIT / {item.survivalVal || 0} VÒNG
                    </div>
                  </div>
                </div>
              );
            };

            return (
              <div className="flex flex-col h-full bg-slate-950/60 border border-slate-900 p-8 rounded-3xl relative shadow-2xl animate-fadeIn">
                <div className="flex items-center justify-between pb-4 border-b border-slate-900 mb-6">
                  <h2 className="text-3xl font-black text-teal-400 uppercase tracking-widest flex items-center gap-3">
                    <TrendingUp className="w-9 h-9 text-teal-400" />
                    BẢNG XẾP HẠNG TOP X DẪN ĐẦU
                  </h2>
                  <span className="text-xs bg-teal-950 text-teal-300 border border-teal-900 px-5 py-2 rounded-full font-black uppercase tracking-widest font-mono">
                    SỐ LIỆU ĐỒNG BỘ THỜI GIAN THỰC
                  </span>
                </div>

                {/* Single list with Auto-Scroll */}
                <div ref={scrollRef1} className="flex-1 min-h-0 overflow-y-auto scrollbar-none">
                  <div className="grid grid-cols-1 gap-5 pb-4">
                    {rankedSurvivalAthletes.slice(0, 10).map((item, i) => renderRow(item, i))}
                  </div>
                </div>
              </div>
            );
          })()}

                    {/* SLIDE 2: KHU VỰC THI ĐẤU - ĐANG BẮN */}
          {tvSlideIdx === 2 && (() => {
            return (
              <div className="flex flex-col h-full bg-slate-950/60 border border-slate-900 p-8 rounded-3xl relative shadow-2xl animate-fadeIn">
                <div className="flex items-center justify-between pb-4 border-b border-slate-900 mb-6">
                  <h2 className="text-3xl font-black text-emerald-400 uppercase tracking-widest flex items-center gap-3">
                    <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-ping animate-duration-1000"></span>
                    ĐANG THI ĐẤU (LƯỢT {activeFlight})
                  </h2>
                  <div className="flex gap-4">
                    <span className="text-sm bg-[#12281e] text-emerald-400 border border-[#1b4332] px-4 py-1.5 rounded-full font-black uppercase tracking-wider font-mono">
                      LƯỢT {activeFlight} / {totalFlightsPossible}
                    </span>
                    <span className="text-sm bg-indigo-950 text-indigo-300 border border-indigo-900 px-4 py-1.5 rounded-full font-black uppercase tracking-wider">
                      VÒNG {activeMonitorRoundIdx + 1}
                    </span>
                  </div>
                </div>

                {/* Auto Scroll container */}
                <div ref={scrollRef2} className="flex-1 min-h-0 overflow-y-auto scrollbar-none">
                  <div className="grid grid-cols-1 gap-6 items-start pb-4">
                    {currentGroup1Lanes.map((laneItem, slotIdx) => {
                      const actualLaneNum = laneItem?.laneNum || (slotIdx + 1);
                      const ath = laneItem?.athleteObj;
                      const isBỏThi = ath ? ath.status === "Bỏ thi" : false;

                      if (!laneItem || !laneItem.name) {
                        return (
                          <div key={`tv-lane-empty-g1-L-${slotIdx}`} className="border-2 border-dashed border-slate-900 rounded-3xl bg-slate-950/10 flex flex-col items-center justify-center p-6 text-slate-800 h-[135px]">
                            <span className="text-3xl font-black font-mono">L{actualLaneNum}</span>
                            <span className="text-sm font-bold uppercase tracking-widest text-slate-700">ĐƯỜNG TRỐNG</span>
                          </div>
                        );
                      }

                      if (laneItem.isClub) {
                        const distId = lanesDataByFlight.activeRound?.id;
                        const currentDistance = distances.find(d => d.id === distId) || distances[selectedRoundIndex];
                        const multiplier = currentDistance?.multiplier || 1;
                        const totalTeamHits = laneItem.clubShooters?.reduce((sum, s) => {
                          const shots = distId ? (s.scores?.[distId] || []) : [];
                          return sum + shots.filter(v => v === true).length;
                        }, 0) || 0;
                        const totalTeamPoints = totalTeamHits * multiplier;
                        
                        const maxShots = shotsCount || 5;
                        const isTeamCompleted = laneItem.clubShooters?.every(s => {
                          const shots = distId ? (s.scores?.[distId] || []) : [];
                          return shots.filter((v) => v === true || v === false).length === maxShots;
                        });

                        return (
                          <div key={`tv-lane-g1-club-${laneItem.name}-L-${slotIdx}`} className="rounded-3xl border-2 px-8 py-6 flex items-center justify-between shadow-xl transition-all relative h-[135px] bg-indigo-950/15 border-indigo-900/60">
                            <div className="flex items-center gap-6 min-w-0 flex-1">
                              <div className="w-20 h-20 rounded-2xl flex flex-col items-center justify-center text-4xl font-black shrink-0 border-2 uppercase shadow-inner bg-indigo-950 border-indigo-800 text-indigo-400">
                                <span className="text-[10px] font-black text-indigo-500/80 uppercase -mb-0.5 tracking-wider">LANE</span>
                                {actualLaneNum}
                              </div>
                              <div className="min-w-0 max-w-[35%]">
                                <h3 className="text-2xl font-black text-slate-100 uppercase tracking-wide truncate">
                                  {laneItem.name}
                                </h3>
                                <div className="flex items-center gap-3 mt-2 flex-wrap">
                                  <span className="text-sm text-indigo-400 font-mono font-black bg-slate-900/80 border border-slate-800/80 px-2.5 py-0.5 rounded">
                                    SBD CLB: {laneItem.sbd ? String(laneItem.sbd).padStart(3, "0") : "---"}
                                  </span>
                                  <span className="text-sm bg-indigo-500/20 text-indigo-300 font-black px-2.5 py-0.5 rounded uppercase">
                                    ĐỒNG ĐỘI
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-4 ml-auto mr-8 overflow-hidden">
                                {laneItem.clubShooters?.map(s => {
                                  const shots = distId ? (s.scores?.[distId] || []) : [];
                                  const hits = shots.filter(v => v === true).length;
                                  const pts = hits * multiplier;
                                  const completed = shots.filter((v) => v === true || v === false).length === maxShots;
                                  return (
                                    <div key={s.id} className="bg-slate-900/70 border border-slate-850 px-3.5 py-2 rounded-2xl flex flex-col items-center justify-center min-w-[130px] shrink-0">
                                      <span className="text-xs font-black text-slate-200 truncate max-w-[110px]">{s.name}</span>
                                      <span className="text-emerald-400 font-mono font-black text-sm mt-1">{hits}/{lanesDataByFlight.effectiveShotsCount} HITS</span>
                                      <span className="text-[10px] text-slate-450 font-black font-mono mt-0.5">{pts}đ ({completed ? "Xong" : "Bắn"})</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="text-3xl font-black text-indigo-400 font-mono block">
                                {totalTeamPoints} ĐIỂM
                              </span>
                              <span className={`text-xs font-black uppercase tracking-wider block mt-1.5 ${
                                isTeamCompleted ? "text-indigo-500" : "text-amber-400"
                              }`}>
                                {isTeamCompleted ? "HOÀN THÀNH" : "ĐANG BẮN"}
                              </span>
                            </div>
                          </div>
                        );
                      }

                      // Score calculation
                      const currentDistance = distances[selectedRoundIndex];
                      const currentDistanceId = currentDistance?.id;
                      const currentDistanceShots = currentDistanceId ? (ath?.scores?.[currentDistanceId] || []) : [];
                      const currentDistanceHits = getHitCount(currentDistanceShots);
                      const scoreVal = currentDistanceHits * (currentDistance?.multiplier || 1);
                      const maxShots = shotsCount || 5;
                      const filledCount = isDirectMode
                        ? (currentDistanceShots[0] !== undefined && currentDistanceShots[0] !== null && currentDistanceShots[0] !== "" ? 1 : 0)
                        : currentDistanceShots.slice(0, maxShots).filter((s) => s === true || s === false).length;
                      const statusText = filledCount === maxShots ? "HOÀN THÀNH" : `ĐANG BẮN VIÊN ${filledCount + 1}`;

                      const renderShotsGrid = () => {
                        return (
                          <div className="flex items-center gap-3">
                            {Array.from({ length: maxShots }).map((_, sIdx) => {
                              const val = currentDistanceShots[sIdx];
                              let bgClass = "bg-slate-900/90 border border-slate-800 text-slate-500";
                              let content = (sIdx + 1).toString();
                              if (val === true) {
                                bgClass = "bg-emerald-500 border-2 border-emerald-300 text-slate-950 font-black scale-110 shadow-lg shadow-emerald-500/25";
                                content = "●";
                              } else if (val === false) {
                                bgClass = "bg-rose-600 border-2 border-rose-400 text-white font-black scale-110 shadow-lg shadow-rose-500/25";
                                content = "×";
                              }
                              return (
                                <div key={`shot-dot-${sIdx}`} className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black shadow-inner transition-all duration-300 ${bgClass}`}>
                                  {content}
                                </div>
                              );
                            })}
                          </div>
                        );
                      };

                      return (
                        <div key={`tv-lane-g1-${ath?.id || "ath"}-L-${slotIdx}`} className={`rounded-3xl border-2 px-8 py-6 flex items-center justify-between shadow-xl transition-all relative h-[135px] ${
                          isBỏThi 
                            ? "bg-rose-950/10 border-rose-950/40 opacity-45" 
                            : "bg-emerald-950/15 border-emerald-900/60"
                        }`}>
                          <div className="flex items-center gap-6 min-w-0 flex-1">
                            <div className={`w-20 h-20 rounded-2xl flex flex-col items-center justify-center text-4xl font-black shrink-0 border-2 uppercase shadow-inner ${
                              isBỏThi ? "bg-rose-950 border-rose-900 text-rose-400" : "bg-emerald-950 border-emerald-800 text-emerald-400"
                            }`}>
                              <span className="text-[10px] font-black text-emerald-500/80 uppercase -mb-0.5 tracking-wider">LANE</span>
                              {actualLaneNum}
                            </div>
                            <div className="min-w-0 max-w-[40%]">
                              <h3 className="text-2xl font-black text-slate-100 uppercase tracking-wide truncate flex items-center gap-3">
                                {laneItem.name}
                                {isBỏThi && <span className="text-xs bg-rose-950 border border-rose-900 text-rose-450 font-black px-2 py-0.5 rounded">BỎ THI</span>}
                              </h3>
                              <div className="flex items-center gap-3 mt-2 flex-wrap">
                                <span className="text-sm text-slate-400 font-mono font-black bg-slate-900/80 border border-slate-800/80 px-2.5 py-0.5 rounded">
                                  SBD: {ath?.id?.replace("ath-", "") || "---"}
                                </span>
                                <span className="text-sm bg-slate-900 border border-slate-800 text-slate-400 font-black px-2.5 py-0.5 rounded uppercase">
                                  {laneItem.team || "Tự Do"}
                                </span>
                                {ath?.category && (
                                  <span className="text-sm bg-emerald-500/20 text-emerald-300 font-black px-2.5 py-0.5 rounded uppercase">
                                    {ath.category}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Live Target Ticks */}
                            {!isBỏThi && ath && (
                              <div className="ml-auto mr-8 shrink-0">
                                {renderShotsGrid()}
                              </div>
                            )}
                          </div>

                          {!isBỏThi && ath ? (
                            <div className="text-right shrink-0">
                              <span className="text-3xl font-black text-emerald-400 font-mono block">
                                {scoreVal} ĐIỂM
                              </span>
                              <span className={`text-xs font-black uppercase tracking-wider block mt-1.5 ${
                                filledCount === maxShots ? "text-emerald-500" : "text-amber-400"
                              }`}>
                                {statusText}
                              </span>
                            </div>
                          ) : (
                            <div className="text-right shrink-0">
                              <span className="text-sm bg-rose-950/80 text-rose-400 border border-rose-900/50 px-5 py-2 rounded-full font-black uppercase tracking-wider">
                                KHÔNG THI
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* SLIDE 3: KHU VỰC THI ĐẤU - CHỜ BẮN */}
          {tvSlideIdx === 3 && (() => {
            return (
              <div className="flex flex-col h-full bg-slate-950/60 border border-slate-900 p-8 rounded-3xl relative shadow-2xl animate-fadeIn">
                <div className="flex items-center justify-between pb-4 border-b border-slate-900 mb-6">
                  <h2 className="text-3xl font-black text-blue-400 uppercase tracking-widest flex items-center gap-3">
                    <span className="w-3.5 h-3.5 rounded-full bg-blue-500"></span>
                    CHỜ THI ĐẤU (LƯỢT {activeFlight + 1})
                  </h2>
                  <div className="flex gap-4">
                    <span className="text-sm bg-[#122228] text-blue-400 border border-[#1b3d43] px-4 py-1.5 rounded-full font-black uppercase tracking-wider font-mono">
                      LƯỢT TIẾP THEO
                    </span>
                  </div>
                </div>

                {/* Auto Scroll container */}
                <div ref={scrollRef3} className="flex-1 min-h-0 overflow-y-auto scrollbar-none">
                  <div className="grid grid-cols-1 gap-6 items-start pb-4">
                    {currentGroup2Lanes.map((laneItem, slotIdx) => {
                      const actualLaneNum = laneItem?.laneNum || (slotIdx + 1);
                      const ath = laneItem?.athleteObj;
                      const isBỏThi = ath ? ath.status === "Bỏ thi" : false;

                      if (!laneItem || !laneItem.name) {
                        return (
                          <div key={`tv-lane-empty-g2-L-${slotIdx}`} className="border-2 border-dashed border-slate-900 rounded-3xl bg-slate-950/10 flex flex-col items-center justify-center p-6 text-slate-800 h-[135px]">
                            <span className="text-3xl font-black font-mono">L{actualLaneNum}</span>
                            <span className="text-sm font-bold uppercase tracking-widest text-slate-700">ĐƯỜNG TRỐNG</span>
                          </div>
                        );
                      }

                      if (laneItem.isClub) {
                        return (
                          <div key={`tv-lane-g2-club-${laneItem.name}-L-${slotIdx}`} className="rounded-3xl border-2 px-8 py-6 flex items-center justify-between shadow-xl transition-all relative h-[135px] bg-blue-950/15 border-blue-900/60">
                            <div className="flex items-center gap-6 min-w-0">
                              <div className="w-20 h-20 rounded-2xl flex flex-col items-center justify-center text-4xl font-black shrink-0 border-2 uppercase shadow-inner bg-blue-950 border-blue-800 text-blue-400">
                                <span className="text-[10px] font-black text-blue-500/80 uppercase -mb-0.5 tracking-wider">LANE</span>
                                {actualLaneNum}
                              </div>
                              <div className="min-w-0">
                                <h3 className="text-2xl font-black text-slate-100 uppercase tracking-wide truncate">
                                  {laneItem.name}
                                </h3>
                                <div className="flex items-center gap-3 mt-2 flex-wrap">
                                  <span className="text-sm text-blue-400 font-mono font-black bg-slate-900/80 border border-slate-800/80 px-2.5 py-0.5 rounded">
                                    SBD CLB: {laneItem.sbd ? String(laneItem.sbd).padStart(3, "0") : "---"}
                                  </span>
                                  <span className="text-sm bg-blue-500/20 text-blue-300 font-black px-2.5 py-0.5 rounded uppercase">
                                    ĐỒNG ĐỘI
                                  </span>
                                  <span className="text-sm text-slate-450 font-bold">
                                    Xạ thủ: {laneItem.clubShooters?.map(s => s.name).join(" - ")}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="text-sm px-5 py-2.5 rounded-full font-black uppercase tracking-wider border bg-blue-950/80 text-blue-450 border-blue-900/50">
                                CHUẨN BỊ
                              </span>
                              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-3">
                                LÊN THỚT TIẾP THEO
                              </p>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={`tv-lane-g2-${ath?.id || "ath"}-L-${slotIdx}`} className={`rounded-3xl border-2 px-8 py-6 flex items-center justify-between shadow-xl transition-all relative h-[135px] ${
                          isBỏThi 
                            ? "bg-rose-950/10 border-rose-950/40 opacity-45" 
                            : "bg-blue-950/15 border-blue-900/60"
                        }`}>
                          <div className="flex items-center gap-6 min-w-0">
                            <div className={`w-20 h-20 rounded-2xl flex flex-col items-center justify-center text-4xl font-black shrink-0 border-2 uppercase shadow-inner ${
                              isBỏThi ? "bg-rose-950 border-rose-900 text-rose-450" : "bg-blue-950 border-blue-800 text-blue-400"
                            }`}>
                              <span className="text-[10px] font-black text-blue-500/80 uppercase -mb-0.5 tracking-wider">LANE</span>
                              {actualLaneNum}
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-2xl font-black text-slate-100 uppercase tracking-wide truncate flex items-center gap-3">
                                {laneItem.name}
                                {isBỏThi && <span className="text-xs bg-rose-950 border border-rose-900 text-rose-450 font-black px-2 py-0.5 rounded">BỎ THI</span>}
                              </h3>
                              <div className="flex items-center gap-3 mt-2 flex-wrap">
                                <span className="text-sm text-slate-400 font-mono font-black bg-slate-900/80 border border-slate-800/80 px-2.5 py-0.5 rounded">
                                  SBD: {ath?.id?.replace("ath-", "") || "---"}
                                </span>
                                <span className="text-sm bg-slate-900 border border-slate-800 text-slate-400 font-black px-2.5 py-0.5 rounded uppercase">
                                  {laneItem.team || "Tự Do"}
                                </span>
                                {ath?.category && (
                                  <span className="text-sm bg-blue-500/20 text-blue-300 font-black px-2.5 py-0.5 rounded uppercase">
                                    {ath.category}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className={`text-sm px-5 py-2.5 rounded-full font-black uppercase tracking-wider border ${
                              isBỏThi ? "bg-rose-950/85 text-rose-400 border-rose-900/50" : "bg-blue-950/80 text-blue-400 border-blue-900/50"
                            }`}>
                              {isBỏThi ? "BỎ THI" : "CHUẨN BỊ"}
                            </span>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-3">
                              {isBỏThi ? "KHÔNG THI ĐẤU" : "LÊN THỚT TIẾP THEO"}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* SLIDE 4: KHU VỰC THI ĐẤU - BẮN THỬ */}
          {tvSlideIdx === 4 && (() => {
            return (
              <div className="flex flex-col h-full bg-slate-950/60 border border-slate-900 p-8 rounded-3xl relative shadow-2xl animate-fadeIn">
                <div className="flex items-center justify-between pb-4 border-b border-slate-900 mb-6">
                  <h2 className="text-3xl font-black text-violet-400 uppercase tracking-widest flex items-center gap-3">
                    <span className="w-3.5 h-3.5 rounded-full bg-violet-500"></span>
                    BẮN THỬ - WARMING (LƯỢT {activeFlight + 2})
                  </h2>
                  <div className="flex gap-4">
                    <span className="text-sm bg-[#1e1228] text-violet-400 border border-[#3d1b43] px-4 py-1.5 rounded-full font-black uppercase tracking-wider font-mono">
                      LÙI 2 LƯỢT
                    </span>
                  </div>
                </div>

                {/* Auto Scroll container */}
                <div ref={scrollRef4} className="flex-1 min-h-0 overflow-y-auto scrollbar-none">
                  <div className="grid grid-cols-1 gap-6 items-start pb-4">
                    {currentGroup3Lanes.map((laneItem, slotIdx) => {
                      const actualLaneNum = laneItem?.laneNum || (slotIdx + 1);
                      const ath = laneItem?.athleteObj;
                      const isBỏThi = ath ? ath.status === "Bỏ thi" : false;

                      if (!laneItem || !laneItem.name) {
                        return (
                          <div key={`tv-lane-empty-g3-L-${slotIdx}`} className="border-2 border-dashed border-slate-900 rounded-3xl bg-slate-950/10 flex flex-col items-center justify-center p-6 text-slate-800 h-[135px]">
                            <span className="text-3xl font-black font-mono">L{actualLaneNum}</span>
                            <span className="text-sm font-bold uppercase tracking-widest text-slate-700">ĐƯỜNG TRỐNG</span>
                          </div>
                        );
                      }

                      if (laneItem.isClub) {
                        return (
                          <div key={`tv-lane-g3-club-${laneItem.name}-L-${slotIdx}`} className="rounded-3xl border-2 px-8 py-6 flex items-center justify-between shadow-xl transition-all relative h-[135px] bg-violet-950/15 border-violet-900/60">
                            <div className="flex items-center gap-6 min-w-0">
                              <div className="w-20 h-20 rounded-2xl flex flex-col items-center justify-center text-4xl font-black shrink-0 border-2 uppercase shadow-inner bg-violet-950 border-violet-800 text-violet-400">
                                <span className="text-[10px] font-black text-violet-500/80 uppercase -mb-0.5 tracking-wider">LANE</span>
                                {actualLaneNum}
                              </div>
                              <div className="min-w-0">
                                <h3 className="text-2xl font-black text-slate-100 uppercase tracking-wide truncate">
                                  {laneItem.name}
                                </h3>
                                <div className="flex items-center gap-3 mt-2 flex-wrap">
                                  <span className="text-sm text-violet-400 font-mono font-black bg-slate-900/80 border border-slate-800/80 px-2.5 py-0.5 rounded">
                                    SBD CLB: {laneItem.sbd ? String(laneItem.sbd).padStart(3, "0") : "---"}
                                  </span>
                                  <span className="text-sm bg-violet-500/20 text-violet-300 font-black px-2.5 py-0.5 rounded uppercase">
                                    ĐỒNG ĐỘI
                                  </span>
                                  <span className="text-sm text-slate-450 font-bold">
                                    Xạ thủ: {laneItem.clubShooters?.map(s => s.name).join(" - ")}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="text-sm px-5 py-2.5 rounded-full font-black uppercase tracking-wider border bg-violet-950/80 text-violet-450 border-violet-900/50">
                                KHỞI ĐỘNG
                              </span>
                              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-3">
                                SẴN SÀNG THIẾT BỊ
                              </p>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={`tv-lane-g3-${ath?.id || "ath"}-L-${slotIdx}`} className={`rounded-3xl border-2 px-8 py-6 flex items-center justify-between shadow-xl transition-all relative h-[135px] ${
                          isBỏThi 
                            ? "bg-rose-950/10 border-rose-950/40 opacity-45" 
                            : "bg-violet-950/15 border-violet-900/60"
                        }`}>
                          <div className="flex items-center gap-6 min-w-0">
                            <div className={`w-20 h-20 rounded-2xl flex flex-col items-center justify-center text-4xl font-black shrink-0 border-2 uppercase shadow-inner ${
                              isBỏThi ? "bg-rose-950 border-rose-900 text-rose-450" : "bg-violet-950 border-violet-800 text-violet-400"
                            }`}>
                              <span className="text-[10px] font-black text-violet-500/80 uppercase -mb-0.5 tracking-wider">LANE</span>
                              {actualLaneNum}
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-2xl font-black text-slate-100 uppercase tracking-wide truncate flex items-center gap-3">
                                {laneItem.name}
                                {isBỏThi && <span className="text-xs bg-rose-950 border border-rose-900 text-rose-450 font-black px-2 py-0.5 rounded">BỎ THI</span>}
                              </h3>
                              <div className="flex items-center gap-3 mt-2 flex-wrap">
                                <span className="text-sm text-slate-400 font-mono font-black bg-slate-900/80 border border-slate-800/80 px-2.5 py-0.5 rounded">
                                  SBD: {ath?.id?.replace("ath-", "") || "---"}
                                </span>
                                <span className="text-sm bg-slate-900 border border-slate-800 text-slate-400 font-black px-2.5 py-0.5 rounded uppercase">
                                  {laneItem.team || "Tự Do"}
                                </span>
                                {ath?.category && (
                                  <span className="text-sm bg-violet-500/20 text-violet-300 font-black px-2.5 py-0.5 rounded uppercase">
                                    {ath.category}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className={`text-sm px-5 py-2.5 rounded-full font-black uppercase tracking-wider border ${
                              isBỏThi ? "bg-rose-950/85 text-rose-400 border-rose-900/50" : "bg-violet-950/80 text-violet-400 border-violet-900/50"
                            }`}>
                              {isBỏThi ? "BỎ THI" : "KHỞI ĐỘNG"}
                            </span>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-3">
                              {isBỏThi ? "KHÔNG THI ĐẤU" : "SẴN SÀNG THIẾT BỊ"}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}</div>{/* BOTTOM FLOATING CONTROLLER FOR PRESENTATION ADMIN */}
        <div className="flex items-center justify-between border-t border-slate-900 pt-3">
          {/* Active slide progress indicator ribbon */}
          <div className="flex items-center gap-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">
            <span>SƠ ĐỒ TRÌNH CHIẾU TV</span>
            <div className="flex items-center gap-1">
              {[0, 1, 2, 3, 4].map((idx) => (
                <div
                  key={`tv-progress-dot-${idx}`}
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    tvSlideIdx === idx
                      ? "w-6 bg-gradient-to-r from-emerald-500 to-indigo-500"
                      : "w-1.5 bg-slate-800"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Controls button overlay - flattened and compact */}
          <div className="flex items-center gap-3 bg-slate-950/80 border border-slate-900/60 px-3 py-1.5 rounded-xl shadow-lg">
            {/* Previous button */}
            <button
              onClick={() => handleSetTvSlide((tvSlideIdx - 1 + 5) % 5)}
              className="w-8 h-8 bg-slate-900 hover:bg-slate-800 text-white rounded-lg flex items-center justify-center active:scale-95 transition-all cursor-pointer border border-slate-800"
              title="Slide trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Pause/Play button */}
            <button
              onClick={() => setIsTvPaused(!isTvPaused)}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-black text-[10px] uppercase cursor-pointer border transition-all h-8 ${
                isTvPaused
                  ? "bg-amber-500 text-black border-amber-400 hover:bg-amber-600"
                  : "bg-slate-900 text-amber-400 border-slate-800 hover:bg-slate-800"
              }`}
            >
              {isTvPaused ? (
                <>
                  <Play className="w-3.5 h-3.5 fill-black" />
                  <span>TIẾP TỤC</span>
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5 fill-amber-400" />
                  <span>TẠM DỪNG</span>
                </>
              )}
            </button>

            {/* Next button */}
            <button
              onClick={() => handleSetTvSlide((tvSlideIdx + 1) % 5)}
              className="w-8 h-8 bg-slate-900 hover:bg-slate-800 text-white rounded-lg flex items-center justify-center active:scale-95 transition-all cursor-pointer border border-slate-800"
              title="Slide tiếp theo"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="h-4 w-px bg-slate-800"></div>

            {/* Close TV Mode back to live board */}
            <button
              onClick={() => setIsTvMode(false)}
              className="px-4 py-1.5 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white font-black text-[10px] rounded-lg flex items-center gap-1 active:scale-95 transition-all cursor-pointer shadow-md shadow-rose-950/10 uppercase tracking-wider h-8"
            >
              Thoát TV
            </button>
          </div>
        </div>

      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#090d16] text-slate-100 flex flex-col font-sans select-none overflow-y-auto md:overflow-hidden" id="live-board-backdrop">
      
      {/* Dynamic Header Action Bar representing control widgets */}
      <header className="px-6 py-4 bg-[#0e1424] border-b border-[#1b2640] flex flex-col md:flex-row items-center justify-between gap-4 shrink-0 shadow-lg relative">
        
        {/* Championship Brand Title Layout */}
        <div className="flex items-center gap-3 self-start md:self-auto pr-12 md:pr-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#059669] to-[#047857] flex items-center justify-center text-white shrink-0 shadow-md shadow-[#059669]/10 border border-[#10b981]/25">
            <Tv className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black tracking-wider uppercase bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-300 bg-clip-text text-transparent">
              LIVE BROADCAST BOARD
            </h1>
            <p className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block"></span>
              {matchName || "Bảng hiển thị trực tuyến"}
            </p>
          </div>
        </div>

        {/* Right side block combining Lane Capacity input and the Close button */}
        <div className="flex items-center gap-3 shrink-0 self-stretch md:self-auto flex-wrap md:flex-nowrap justify-end w-full md:w-auto">
          {/* TV Presentation Mode Button */}
          <button
            onClick={() => {
              setIsTvMode(true);
              setTvSlideIdx(0);
              setTvSlideSecondsRemaining(10);
              setIsTvPaused(false);
            }}
            className="px-4 py-2 bg-gradient-to-r from-emerald-500 via-teal-600 to-indigo-600 hover:from-emerald-600 hover:to-indigo-700 text-white font-black text-xs rounded-xl flex items-center gap-2 active:scale-95 transition-all cursor-pointer shadow-lg shadow-emerald-950/30 shrink-0 border border-emerald-400/20 uppercase tracking-widest animate-pulse"
            title="Chuyển sang Chế độ Trình chiếu Tivi"
          >
            <Tv className="w-4 h-4 shrink-0 text-emerald-300" />
            <span>Chế độ Tivi</span>
          </button>

          {/* Exit screen takeover back to app button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 md:static w-[38px] h-[38px] bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white rounded-xl flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-lg shadow-rose-950/20 shrink-0"
            title="Đóng Trực Chiếu"
          >
            <X className="w-5 h-5 shrink-0" />
          </button>
        </div>

      </header>

      {/* Responsive Mobile Layout Swapper (Moved BELOW header) */}
      <div className="flex md:hidden items-center justify-center gap-1 bg-[#141b30] p-1 border-b border-[#232f52] shrink-0 select-none">
        <button
          onClick={() => setActiveMobileTab("flight")}
          className={`flex-1 py-1.5 text-[10px] sm:text-xs font-black rounded-lg transition-all uppercase tracking-wider ${
            activeMobileTab === "flight" ? "bg-emerald-600 text-white shadow-md font-black" : "text-slate-400"
          }`}
        >
          🎯 THI ĐẤU
        </button>
        <button
          onClick={() => setActiveMobileTab("board")}
          className={`flex-1 py-1.5 text-[10px] sm:text-xs font-black rounded-lg transition-all uppercase tracking-wider ${
            activeMobileTab === "board" ? "bg-emerald-600 text-white shadow-md font-black" : "text-slate-400"
          }`}
        >
          🏆 BẢNG VÀNG
        </button>
        <button
          onClick={() => setActiveMobileTab("topx")}
          className={`flex-1 py-1.5 text-[10px] sm:text-xs font-black rounded-lg transition-all uppercase tracking-wider ${
            activeMobileTab === "topx" ? "bg-emerald-600 text-white shadow-md font-black" : "text-slate-400"
          }`}
        >
          📈 TOP X
        </button>
      </div>



      {/* Main Container Stage Body */}
      <div className="flex-none md:flex-1 w-full overflow-visible md:overflow-hidden px-4 pb-4 pt-2 md:p-6 flex flex-col md:flex-row gap-6 h-auto md:h-full">

        {/* ========================================================================= */}
        {/* COLUMN 1: HALL OF FAME PODIUMS AND LEADERBOARDS (Visible on desktop or mobile tab) */}
        {/* ========================================================================= */}
        <div className={`flex-none md:flex-[4.5] flex-col gap-6 overflow-visible md:overflow-y-auto pr-0 md:pr-1 min-w-0 ${
          (activeMobileTab === "board" || activeMobileTab === "topx") ? "flex" : "hidden md:flex"
        }`}>
          
          {/* Section Heading Label */}
          <div className={`flex items-center gap-2 border-b border-[#1f2d50] pb-2 ${
            activeMobileTab === "topx" ? "hidden md:flex" : "flex"
          }`}>
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="text-sm font-black text-amber-400 uppercase tracking-widest flex-1">
              Bảng Vàng Danh Dự (BXH)
            </h2>
            <span className="text-[10px] bg-[#1d312c] border border-emerald-900 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
              SURVIVAL MODE
            </span>
          </div>

          {/* Podiums side-by-side grid */}
          <div className={`grid grid-cols-1 xl:grid-cols-2 gap-5 shrink-0 ${
            activeMobileTab === "topx" ? "hidden md:grid" : "grid"
          }`}>

            {/* Individual Gold Winners Podium */}
            <div className="bg-[#0c1222] border border-[#1b2640] rounded-2xl p-4 flex flex-col items-center shadow-lg relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-400 via-amber-250 to-amber-500"></div>
              <h3 className="text-xs font-black text-amber-400 uppercase tracking-wider mb-5 flex items-center gap-1.5 text-center mt-1">
                <Medal className="w-4 h-4" /> {tournamentType === "individual" ? "Bảng Vàng Cá Nhân (môi trường Cá Nhân)" : (tournamentType === "team" ? "Bảng Vàng Cá Nhân Team (môi trường Đồng Đội)" : "Bảng Vàng Cá Nhân")}
              </h3>

              {/* Podium Steps layout */}
              <div className="w-full flex items-end justify-center pt-8 pb-3 min-h-[160px]">

                {/* 2nd Place (Silver) */}
                <div className="flex-1 flex flex-col items-center">
                  {top3SurvivalAthletes[1] ? (
                    <div className="flex flex-col items-center">
                      <div className="relative w-11 h-11 rounded-full border-2 border-slate-355 bg-slate-900 flex items-center justify-center overflow-hidden mb-2">
                        {top3SurvivalAthletes[1].avatarUrl ? (
                          <img src={top3SurvivalAthletes[1].avatarUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <User className="w-5 h-5 text-slate-300" />
                        )}
                        <span className="absolute bottom-0 right-0 w-4 h-4 bg-slate-300 text-slate-950 font-black rounded-full flex items-center justify-center text-[10px] border border-slate-900 shadow-sm">2</span>
                      </div>
                      <span className="text-[11px] font-black text-slate-100 uppercase truncate max-w-[85px] text-center">{top3SurvivalAthletes[1].name}</span>
                      <span className="text-[9px] text-slate-400 truncate max-w-[80px] text-center mt-0.5">{top3SurvivalAthletes[1].team || "Tự Do"}</span>
                      <span className="text-[10px] font-black text-slate-300 mt-1">{top3SurvivalAthletes[1].survivalScore} điểm</span>
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Round {getLastActiveRound(top3SurvivalAthletes[1])}</span>
                    </div>
                  ) : (
                    <div className="text-[9px] text-slate-600 font-bold uppercase tracking-wider h-14 flex items-center">Đang thi đấu</div>
                  )}
                  <div className="w-full h-8 bg-gradient-to-t from-[#1d263b] to-[#131b2c] rounded-t-lg border-x border-t border-[#232e49] flex items-center justify-center mt-3 shadow-md">
                    <span className="text-xs font-black text-slate-300 uppercase tracking-widest">II</span>
                  </div>
                </div>

                {/* 1st Place (Gold Platinum - center tall) */}
                <div className="flex-1 flex flex-col items-center px-1">
                  {top3SurvivalAthletes[0] ? (
                    <div className="flex flex-col items-center relative -top-3">
                      <div className="absolute -top-7 text-amber-400 animate-bounce">
                        <Sparkles className="w-5 h-5 fill-amber-300/30" />
                      </div>
                      <div className="relative w-14 h-14 rounded-full border-4 border-amber-400 bg-slate-900 flex items-center justify-center overflow-hidden mb-2 shadow-lg shadow-amber-500/10">
                        {top3SurvivalAthletes[0].avatarUrl ? (
                          <img src={top3SurvivalAthletes[0].avatarUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <User className="w-6 h-6 text-amber-400" />
                        )}
                        <span className="absolute bottom-0 right-0 w-5 h-5 bg-amber-400 text-slate-950 font-black rounded-full flex items-center justify-center text-xs border-2 border-slate-900 shadow-md">1</span>
                      </div>
                      <span className="text-xs font-extrabold text-amber-300 uppercase truncate max-w-[95px] text-center tracking-wide">{top3SurvivalAthletes[0].name}</span>
                      <span className="text-[10px] text-amber-400/80 truncate max-w-[90px] text-center mt-0.5">{top3SurvivalAthletes[0].team || "Tự Do"}</span>
                      <span className="text-xs font-black text-amber-400 mt-1 pl-1 bg-amber-950/40 border border-amber-900/40 rounded px-1.5 py-0.2">{top3SurvivalAthletes[0].survivalScore} điểm</span>
                      <span className="text-[9px] text-amber-500/80 font-bold uppercase tracking-wider mt-0.5 animate-pulse">Round {getLastActiveRound(top3SurvivalAthletes[0])}</span>
                    </div>
                  ) : (
                    <div className="text-[9px] text-slate-600 font-bold uppercase tracking-wider h-14 flex items-center">Đang thi đấu</div>
                  )}
                  <div className="w-full h-12 bg-gradient-to-t from-emerald-900/50 to-[#222f4b] rounded-t-xl border-x border-t border-emerald-500/20 flex flex-col items-center justify-center mt-3 shadow-md">
                    <span className="text-xs font-black text-amber-400 uppercase tracking-widest">🏆 I 🏆</span>
                  </div>
                </div>

                {/* 3rd Place (Bronze) */}
                <div className="flex-1 flex flex-col items-center">
                  {top3SurvivalAthletes[2] ? (
                    <div className="flex flex-col items-center">
                      <div className="relative w-11 h-11 rounded-full border-2 border-amber-700 bg-slate-900 flex items-center justify-center overflow-hidden mb-2">
                        {top3SurvivalAthletes[2].avatarUrl ? (
                          <img src={top3SurvivalAthletes[2].avatarUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <User className="w-5 h-5 text-amber-700" />
                        )}
                        <span className="absolute bottom-0 right-0 w-4 h-4 bg-amber-700 text-white font-black rounded-full flex items-center justify-center text-[10px] border border-slate-900 shadow-sm">3</span>
                      </div>
                      <span className="text-[11px] font-black text-slate-100 uppercase truncate max-w-[85px] text-center">{top3SurvivalAthletes[2].name}</span>
                      <span className="text-[9px] text-slate-400 truncate max-w-[80px] text-center mt-0.5">{top3SurvivalAthletes[2].team || "Tự Do"}</span>
                      <span className="text-[10px] font-black text-[#d97706] mt-1">{top3SurvivalAthletes[2].survivalScore} điểm</span>
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Round {getLastActiveRound(top3SurvivalAthletes[2])}</span>
                    </div>
                  ) : (
                    <div className="text-[9px] text-slate-600 font-bold uppercase tracking-wider h-14 flex items-center">Đang thi đấu</div>
                  )}
                  <div className="w-full h-6 bg-gradient-to-t from-[#1d263b] to-[#131b2c] rounded-t-lg border-x border-t border-[#232e49] flex items-center justify-center mt-3 shadow-md">
                    <span className="text-xs font-black text-amber-700 uppercase tracking-widest">III</span>
                  </div>
                </div>

              </div>
            </div>

            {/* Team Gold Winners Podium */}
            <div className="bg-[#0c1222] border border-[#1b2640] rounded-2xl p-4 flex flex-col items-center shadow-lg relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-teal-450 via-teal-350 to-teal-500"></div>
              <h3 className="text-xs font-black text-teal-400 uppercase tracking-wider mb-5 flex items-center gap-1.5 text-center mt-1">
                <Users className="w-4 h-4" /> {tournamentType === "individual" ? "Bảng Vàng Đồng Đội (môi trường Cá Nhân)" : (tournamentType === "team" ? "Bảng Vàng Đồng Đội (môi trường Đồng Đội)" : "Bảng Vàng Đồng Đội")}
              </h3>

              {/* Podium active teams layout */}
              <div className="w-full flex items-end justify-center pt-8 pb-3 min-h-[160px]">
                
                {/* 2nd Place Team */}
                <div className="flex-1 flex flex-col items-center">
                  {top3SurvivalTeams[1] ? (
                    <div className="flex flex-col items-center">
                      {getTeamAvatar(top3SurvivalTeams[1].teamName, 2)}
                      <span className="text-[11px] font-black text-slate-100 uppercase truncate max-w-[95px] text-center">{top3SurvivalTeams[1].teamName}</span>
                      <span className="text-[10px] font-black text-slate-300 mt-1">{top3SurvivalTeams[1].totalScore} điểm</span>
                    </div>
                  ) : (
                    <div className="text-[9px] text-slate-600 font-bold uppercase tracking-wider h-14 flex items-center">Chưa xác định</div>
                  )}
                  <div className="w-full h-8 bg-gradient-to-t from-[#1d263b] to-[#131b2c] rounded-t-lg border-x border-t border-[#232e49] flex items-center justify-center mt-3 shadow-md">
                    <span className="text-xs font-black text-slate-300 uppercase tracking-widest">II</span>
                  </div>
                </div>

                {/* 1st Place Team */}
                <div className="flex-1 flex flex-col items-center px-1">
                  {top3SurvivalTeams[0] ? (
                    <div className="flex flex-col items-center relative -top-3">
                      <div className="absolute -top-7 text-teal-400 animate-bounce">
                        <Sparkles className="w-5 h-5 fill-teal-300/30" />
                      </div>
                      {getTeamAvatar(top3SurvivalTeams[0].teamName, 1)}
                      <span className="text-xs font-extrabold text-teal-300 uppercase truncate max-w-[105px] text-center tracking-wide">{top3SurvivalTeams[0].teamName}</span>
                      <span className="text-xs font-black text-teal-400 mt-1 px-1.5 py-0.2 bg-teal-950/40 border border-teal-900/40 rounded">{top3SurvivalTeams[0].totalScore} điểm</span>
                    </div>
                  ) : (
                    <div className="text-[9px] text-slate-600 font-bold uppercase tracking-wider h-14 flex items-center">Chưa xác định</div>
                  )}
                  <div className="w-full h-12 bg-gradient-to-t from-teal-900/50 to-[#222f4b] rounded-t-xl border-x border-t border-teal-500/20 flex flex-col items-center justify-center mt-3 shadow-md">
                    <span className="text-xs font-black text-teal-400 uppercase tracking-widest">🏆 I 🏆</span>
                  </div>
                </div>

                {/* 3rd Place Team */}
                <div className="flex-1 flex flex-col items-center">
                  {top3SurvivalTeams[2] ? (
                    <div className="flex flex-col items-center">
                      {getTeamAvatar(top3SurvivalTeams[2].teamName, 3)}
                      <span className="text-[11px] font-black text-slate-100 uppercase truncate max-w-[95px] text-center">{top3SurvivalTeams[2].teamName}</span>
                      <span className="text-[10px] font-black text-[#d97706] mt-1">{top3SurvivalTeams[2].totalScore} điểm</span>
                    </div>
                  ) : (
                    <div className="text-[9px] text-slate-600 font-bold uppercase tracking-wider h-14 flex items-center">Chưa xác định</div>
                  )}
                  <div className="w-full h-6 bg-gradient-to-t from-[#1d263b] to-[#131b2c] rounded-t-lg border-x border-t border-[#232e49] flex items-center justify-center mt-3 shadow-md">
                    <span className="text-xs font-black text-amber-700 uppercase tracking-widest">III</span>
                  </div>
                </div>

              </div>
            </div>

          </div>

          {/* Top 10 individual survival athletes list table */}
          <div className={`flex-none md:flex-1 bg-[#0c1222] border border-[#1b2640] rounded-2xl p-4 flex flex-col shadow-lg overflow-visible md:overflow-hidden shrink-0 xl:shrink ${
            activeMobileTab === "board" ? "hidden md:flex" : "flex"
          }`}>
            <div className="flex items-center justify-between border-b border-[#232e49] pb-2 mb-3 shrink-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
                <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider truncate">
                  Danh Sách TOP {topXLimit} Cá Nhân Trụ Lại Nhiều Nhất
                </h3>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[9px] text-[#4f6485] font-black uppercase tracking-widest">Hiển thị:</span>
                <div className="flex items-center gap-1.5">
                  <select
                    value={[5, 10, 15, 20, 30, 50].includes(topXLimit) && !isCustomTopX ? topXLimit : "custom"}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "custom") {
                        setIsCustomTopX(true);
                      } else {
                        setIsCustomTopX(false);
                        setTopXLimit(Number(val));
                      }
                    }}
                    className="bg-[#101726] text-emerald-400 border border-[#232e49] rounded-lg px-2 py-1 text-[10px] font-black focus:outline-none focus:ring-1 focus:ring-emerald-500/50 cursor-pointer transition-colors"
                  >
                    <option value={5}>TOP 5</option>
                    <option value={10}>TOP 10</option>
                    <option value={15}>TOP 15</option>
                    <option value={20}>TOP 20</option>
                    <option value={30}>TOP 30</option>
                    <option value={50}>TOP 50</option>
                    <option value="custom">Tự nhập...</option>
                  </select>

                  {(isCustomTopX || ![5, 10, 15, 20, 30, 50].includes(topXLimit)) && (
                    <input
                      type="number"
                      min={1}
                      max={200}
                      value={topXLimit}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (val > 0) {
                          setTopXLimit(val);
                        }
                      }}
                      className="w-12 bg-[#101726] text-emerald-400 border border-[#232e49] rounded-lg px-1.5 py-1 text-[10px] font-black focus:outline-none focus:ring-1 focus:ring-emerald-500/50 text-center"
                      placeholder="X"
                    />
                  )}
                </div>
              </div>
            </div>
            <div 
              ref={top10ContainerRef}
              className={`flex-none md:flex-1 overflow-visible md:overflow-hidden pr-1 transition-opacity duration-500 ${top10Fading ? "opacity-0" : "opacity-100"}`}
            >
              {top10SurvivalAthletes.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500 font-bold">Chưa ghi nhận điểm thi đấu</div>
              ) : (
                <div className="flex flex-col gap-1.5 pb-4">
                  {top10SurvivalAthletes.map((ath, idx) => {
                    let medalAccent = "bg-slate-900/60 border-[#1f2d50] hover:border-slate-500 text-slate-300";
                    let rankBadge = "bg-slate-800 text-slate-400 border border-slate-700";
                    
                    if (idx === 0) {
                      medalAccent = "bg-gradient-to-r from-amber-500/10 via-amber-600/5 to-transparent border-amber-500/35 text-amber-400 shadow-md shadow-amber-500/5 hover:border-amber-400/50";
                      rankBadge = "bg-gradient-to-r from-amber-400 to-amber-550 text-slate-950 font-black border border-amber-300";
                    } else if (idx === 1) {
                      medalAccent = "bg-gradient-to-r from-slate-400/10 via-slate-550/5 to-transparent border-slate-400/25 text-slate-200 hover:border-slate-300/40";
                      rankBadge = "bg-gradient-to-r from-slate-300 to-slate-400 text-slate-950 font-black border border-slate-200";
                    } else if (idx === 2) {
                      medalAccent = "bg-gradient-to-r from-amber-800/15 via-amber-900/5 to-transparent border-amber-800/30 text-amber-600 hover:border-amber-700/40";
                      rankBadge = "bg-gradient-to-r from-amber-600 to-amber-700 text-slate-100 font-extrabold border border-amber-500";
                    }

                    return (
                      <div 
                        key={`live-rank-${ath.id || "ath"}-${idx}`} 
                        className="group flex items-center gap-3 p-2.5 rounded-xl border transition-all duration-300 hover:translate-x-1.5 hover:shadow-lg hover:shadow-emerald-500/5 cursor-pointer animate-fadeIn"
                        style={{ 
                          animationDelay: `${idx * 45}ms`,
                          backgroundColor: idx === 0 ? "rgba(245, 158, 11, 0.04)" : idx === 1 ? "rgba(148, 163, 184, 0.03)" : idx === 2 ? "rgba(180, 83, 9, 0.03)" : undefined 
                        }}
                      >
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-[11px] font-black shrink-0 shadow-inner ${rankBadge}`}>
                          {ath.dashboardRank || (idx + 1)}
                        </div>
                        
                        <div className="relative w-8 h-8 rounded-full border border-slate-700 overflow-hidden bg-slate-900 shrink-0 group-hover:scale-105 transition-transform duration-300">
                          {ath.avatarUrl ? (
                            <img src={ath.avatarUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <User className="w-4 h-4 text-slate-400 absolute inset-0 m-auto" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-slate-250 truncate uppercase tracking-wide group-hover:text-emerald-400 transition-colors duration-200 flex items-center gap-1.5">
                            {ath.name}
                            {idx === 0 && <span className="text-[10px] text-amber-400 animate-pulse">🏆</span>}
                            {idx === 1 && <span className="text-[10px]">⭐</span>}
                            {idx === 2 && <span className="text-[10px]">🎖️</span>}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">{ath.id} - {ath.team || "Tự Do"}</p>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-xs font-black text-emerald-400">{ath.survivalScore} điểm</p>
                          <p className="text-[9px] text-slate-500 mt-0.5 font-bold uppercase tracking-wider flex items-center gap-1 justify-end">
                            Vòng: 
                            <span className="bg-[#101b2a] border border-[#1b2640] px-1.5 py-0.2 rounded text-emerald-400 font-extrabold text-[9px]">
                              R{getLastActiveRound(ath)}
                            </span>
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* COLUMN 2: ACTIVE FLIGHT MULTI-COLUMN INTERFACING (Lượt bắn biểu diễn)   */}
        {/* ========================================================================= */}
        <div className={`flex-none md:flex-[5.5] flex-col gap-6 overflow-visible md:overflow-hidden ${
          activeMobileTab === "flight" ? "flex" : "hidden md:flex"
        }`}>
          
          {/* Section heading bar */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 border-b border-[#1f2d50] pb-2 text-emerald-400 shrink-0">
            <div className="flex items-center gap-2 flex-1">
              <Target className="w-5 h-5 text-emerald-400" />
              <h2 className="text-sm font-black uppercase tracking-widest">
                KHU VỰC LANE THI ĐẤU
              </h2>
            </div>
            
            {/* Sequential Round & Flight controllers - Desktop/TV/Computer only */}
            <div className="hidden md:flex items-center gap-3 bg-[#141b30] p-1.5 rounded-xl border border-[#232f52] shrink-0 shadow-md">
              {/* Round selector */}
              <div className="flex items-center gap-1.5 pr-3 border-r border-[#232f52]/60">
                <span className="text-[10px] text-amber-400 font-extrabold uppercase tracking-widest pl-1">VÒNG BẮN:</span>
                <select
                  value={selectedRoundIndex}
                  onChange={(e) => {
                    setSelectedRoundIndex(Number(e.target.value));
                    setActiveFlight(1);
                  }}
                  className="bg-[#0e1424] text-amber-400 border border-[#232e49] rounded-lg px-2 py-0.5 text-xs font-black focus:outline-none focus:ring-1 focus:ring-amber-400/50 cursor-pointer"
                >
                  {distances.map((dist, idx) => (
                    <option key={dist.id} value={idx}>
                      Vòng {idx + 1} ({dist.distance})
                    </option>
                  ))}
                </select>
              </div>

              {/* Flight selector */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveFlight(prev => Math.max(1, prev - 1))}
                  disabled={activeFlight === 1}
                  className="p-1 px-2 bg-[#1b2640] hover:bg-[#253457] disabled:opacity-30 disabled:pointer-events-none rounded-lg text-xs font-black transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="text-center text-xs font-black text-slate-200 min-w-[75px]">
                  LƯỢT <span className="text-emerald-400 text-sm font-black">{activeFlight}</span> / {totalFlightsPossible}
                </div>
                <button
                  onClick={() => setActiveFlight(prev => Math.min(totalFlightsPossible, prev + 1))}
                  disabled={activeFlight >= totalFlightsPossible}
                  className="p-1 px-2 bg-[#1b2640] hover:bg-[#253457] disabled:opacity-30 disabled:pointer-events-none rounded-lg text-xs font-black transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* New Mobile Round and Flight controllers (only on mobile screens, hidden on md+) */}
          <div className="flex md:hidden items-center justify-between gap-1 bg-[#141b30]/80 p-2 rounded-xl border border-[#232f52]/60 shrink-0 select-none shadow-md">
            {/* Round selector */}
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-[10px] text-amber-400 font-extrabold uppercase tracking-widest pl-1">VÒNG BẮN:</span>
              <select
                value={selectedRoundIndex}
                onChange={(e) => {
                  setSelectedRoundIndex(Number(e.target.value));
                  setActiveFlight(1);
                }}
                className="bg-[#0e1424] text-amber-400 border border-[#232e49] rounded-lg px-2 py-1 text-xs font-black focus:outline-none focus:ring-1 focus:ring-amber-400/50 cursor-pointer"
              >
                {distances.map((dist, idx) => (
                  <option key={dist.id} value={idx}>
                    Vòng {idx + 1} ({dist.distance})
                  </option>
                ))}
              </select>
            </div>

            {/* Flight selector (without the "LƯỢT X / Y" text box) */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setActiveFlight(prev => Math.max(1, prev - 1))}
                disabled={activeFlight === 1}
                className="p-1 px-3 bg-[#1b2640] hover:bg-[#253457] disabled:opacity-30 disabled:pointer-events-none rounded-lg text-xs font-black transition-colors"
                title="Lượt trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setActiveFlight(prev => Math.min(totalFlightsPossible, prev + 1))}
                disabled={activeFlight >= totalFlightsPossible}
                className="p-1 px-3 bg-[#1b2640] hover:bg-[#253457] disabled:opacity-30 disabled:pointer-events-none rounded-lg text-xs font-black transition-colors"
                title="Lượt sau"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Sub-tabs for Flight columns on mobile screens */}
          <div className="flex lg:hidden items-center justify-center gap-1 bg-[#141b30] p-1 rounded-xl border border-[#232f52]/60 shrink-0 select-none">
            <button
              onClick={() => setActiveFlightSubTab("current")}
              className={`flex-1 py-1.5 px-2 text-[10px] sm:text-xs font-black rounded-lg transition-all duration-200 uppercase tracking-wider ${
                activeFlightSubTab === "current"
                  ? "bg-emerald-600 text-white shadow-md font-black"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              • Đang Bắn ({activeFlight})
            </button>
            <button
              onClick={() => setActiveFlightSubTab("next")}
              className={`flex-1 py-1.5 px-2 text-[10px] sm:text-xs font-black rounded-lg transition-all duration-200 uppercase tracking-wider ${
                activeFlightSubTab === "next"
                  ? "bg-blue-600 text-white shadow-md font-black"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              • Chờ Bắn ({activeFlight + 1})
            </button>
            <button
              onClick={() => setActiveFlightSubTab("test")}
              className={`flex-1 py-1.5 px-2 text-[10px] sm:text-xs font-black rounded-lg transition-all duration-200 uppercase tracking-wider ${
                activeFlightSubTab === "test"
                  ? "bg-[#6d28d9] text-white shadow-md font-black"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              • Bắn Thử ({activeFlight + 2})
            </button>
          </div>

          {/* 3 Columns flight area layout */}
          <div className="flex-none md:flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-visible md:overflow-hidden min-h-0">

            {/* Sub-column 1: Đang thi đấu cá nhân */}
            <div className={`flex flex-col bg-[#0b101c] border border-emerald-500/15 rounded-2xl overflow-visible md:overflow-hidden shadow-md h-auto md:h-full min-h-0 ${
              activeFlightSubTab === "current" ? "flex" : "hidden lg:flex"
            }`}>
              <div className="px-4 py-3 bg-[#10192e] bg-gradient-to-r from-[#10b981]/10 to-[#059669]/5 border-b border-emerald-500/20 flex items-center gap-2 shrink-0">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <h3 className="text-xs font-black text-emerald-400 uppercase tracking-wider flex-1">Đang Thi Đấu</h3>
                <span className="text-[10px] bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded-md font-bold shrink-0 shadow-sm border border-emerald-950">
                  Lượt {activeFlight}
                </span>
              </div>

              <div className="flex-none md:flex-1 flex flex-col justify-stretch p-3 gap-1.5 min-h-0 overflow-visible md:overflow-y-auto pr-1 h-auto md:h-full scrollbar-thin">
                {currentGroup1Lanes.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center border border-dashed border-[#232f52] rounded-xl text-xs text-slate-500 font-extrabold capitalize bg-[#0c1222]/25 py-8">
                    Hết danh sách thi đấu
                  </div>
                ) : (
                  currentGroup1Lanes.map((laneItem, slotIdx) => {
                    if (!laneItem || !laneItem.name) {
                      return (
                        <div key={`empty-slot-g1-${slotIdx}`} className="min-h-[30px] md:min-h-0 md:flex-1 p-2 border border-dashed border-[#232f52] rounded-xl flex items-center justify-center text-[10px] sm:text-xs text-slate-600 font-bold uppercase tracking-widest bg-[#0c1222]/40 transition-all shrink-0 md:shrink">
                          LANE {slotIdx + 1} - TRỐNG
                        </div>
                      );
                    }

                    if (laneItem.isClub) {
                      // Render Club Card
                      const distId = lanesDataByFlight.activeRound?.id;
                      const currentDistance = distances.find(d => d.id === distId) || distances[selectedRoundIndex];
                      const multiplier = currentDistance?.multiplier || 1;
                      const totalTeamHits = laneItem.clubShooters?.reduce((sum, s) => {
                        const shots = distId ? (s.scores?.[distId] || []) : [];
                        return sum + shots.filter(v => v === true).length;
                      }, 0) || 0;
                      const totalTeamPoints = totalTeamHits * multiplier;

                      return (
                        <div key={`live-g1-club-${laneItem.name}-${slotIdx}`} className="p-2 rounded-xl border bg-indigo-950/10 border-indigo-900/40 hover:border-indigo-550 shadow-md animate-fadeIn flex flex-col justify-center shrink-0 md:flex-1 md:shrink md:min-h-0">
                          <div className="flex items-start justify-between gap-2.5 w-full">
                            <div className="flex items-start gap-2.5 min-w-0 flex-1">
                              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-[10px] sm:text-xs font-black shrink-0 border uppercase bg-[#1d2d38] border-indigo-850 text-indigo-400 shadow-sm">
                                L{slotIdx + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-[11px] sm:text-xs font-black text-slate-100 uppercase truncate tracking-wide flex items-center gap-1">
                                  {laneItem.name}
                                </h4>
                                <p className="text-[9px] sm:text-[10px] text-indigo-400 truncate font-bold uppercase tracking-wider font-mono">
                                  SBD CLB: {laneItem.sbd ? String(laneItem.sbd).padStart(3, "0") : "---"}
                                </p>
                              </div>
                            </div>
                            <div className="text-right shrink-0 flex flex-col items-end">
                              <span className="text-[11px] sm:text-xs font-black text-indigo-400 font-mono">
                                {totalTeamPoints} ĐIỂM
                              </span>
                              <span className="text-[8px] text-slate-400 font-bold uppercase font-mono mt-0.5">
                                {totalTeamHits} HITS
                              </span>
                            </div>
                          </div>
                          
                          {/* Club Members list compact inside the card */}
                          <div className="mt-1 border-t border-[#1b2640]/50 pt-1 space-y-0.5">
                            {laneItem.clubShooters?.map(s => {
                              const shots = distId ? (s.scores?.[distId] || []) : [];
                              const hits = shots.filter(v => v === true).length;
                              const pts = hits * multiplier;
                              return (
                                <div key={s.id} className="flex justify-between items-center text-[8px] font-extrabold uppercase tracking-wide">
                                  <span className="text-slate-350 truncate max-w-[120px]">{s.name} | {s.id.replace("ath-", "")}</span>
                                  <span className="text-emerald-400 font-mono">HITS: {hits}/{lanesDataByFlight.effectiveShotsCount} ({pts}đ)</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }

                    // Render Athlete Card
                    const ath = laneItem.athleteObj;
                    const isBỏThi = ath ? ath.status === "Bỏ thi" : false;

                    return (
                      <div key={`live-g1-${ath?.id || "ath"}-${slotIdx}`} className={`p-2 rounded-xl border transition-all flex flex-col justify-center shrink-0 md:flex-1 md:shrink md:min-h-0 ${
                        isBỏThi 
                          ? "bg-rose-950/15 border-rose-950/40 opacity-45"
                          : "bg-emerald-950/10 border-[#1c3943] hover:border-emerald-550 shadow-md animate-fadeIn"
                      }`}>
                        <div className="flex items-center justify-between gap-2.5 w-full">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-[10px] sm:text-xs font-black shrink-0 border uppercase ${
                              isBỏThi ? "bg-rose-950 border-rose-900 text-rose-400" : "bg-[#1d2d38] border-emerald-800 text-emerald-400 shadow-sm"
                            }`}>
                              L{slotIdx + 1}
                            </div>

                            <div className="flex-1 min-w-0">
                              <h4 className="text-[11px] sm:text-xs font-black text-slate-100 uppercase truncate tracking-wide flex items-center gap-1">
                                {laneItem.name}
                                {isBỏThi && <span className="text-[8px] bg-rose-950 border border-rose-900 text-rose-400 font-extrabold px-1 rounded scale-90">BỎ THI</span>}
                              </h4>
                              <p className="text-[9px] sm:text-[10px] text-slate-400 truncate font-bold uppercase tracking-wider flex items-center gap-1.5 flex-wrap">
                                <span>{ath?.id?.replace("ath-", "") || "---"} - {laneItem.team || "Tự Do"}</span>
                                {ath?.category && (
                                  <span className="text-[8px] bg-emerald-500/20 text-emerald-300 font-extrabold px-1 rounded uppercase tracking-wider">
                                    {ath.category}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>

                          {!isBỏThi && ath && (
                            <div className="text-right shrink-0 flex flex-col items-end">
                              <span className="text-[11px] sm:text-xs font-black text-emerald-400 flex items-center gap-1 mt-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-ping shrink-0"></span>
                                {(() => {
                                  const currentDistance = distances[selectedRoundIndex];
                                  const currentDistanceId = currentDistance?.id;
                                  const currentDistanceShots = currentDistanceId ? (ath.scores?.[currentDistanceId] || []) : [];
                                  const currentDistanceHits = getHitCount(currentDistanceShots);
                                  return currentDistanceHits * (currentDistance?.multiplier || 1);
                                })()}
                              </span>
                              <span className={`text-[8px] sm:text-[9px] font-black tracking-wider uppercase block mt-1 ${
                                (() => {
                                  const currentDistance = distances[selectedRoundIndex];
                                  const currentDistanceId = currentDistance?.id;
                                  const maxShots = shotsCount || 5;
                                  const currentDistanceShots = currentDistanceId ? (ath.scores?.[currentDistanceId] || []) : [];
                                  const filledCount = isDirectMode
                                    ? (currentDistanceShots[0] !== undefined && currentDistanceShots[0] !== null && currentDistanceShots[0] !== "" ? 1 : 0)
                                    : currentDistanceShots.slice(0, maxShots).filter((s) => s === true || s === false).length;
                                  return filledCount === maxShots ? "text-emerald-500" : "text-amber-400/90";
                                })()
                              }`}>
                                {(() => {
                                  const currentDistance = distances[selectedRoundIndex];
                                  const currentDistanceId = currentDistance?.id;
                                  const maxShots = shotsCount || 5;
                                  const currentDistanceShots = currentDistanceId ? (ath.scores?.[currentDistanceId] || []) : [];
                                  const filledCount = isDirectMode
                                    ? (currentDistanceShots[0] !== undefined && currentDistanceShots[0] !== null && currentDistanceShots[0] !== "" ? 1 : 0)
                                    : currentDistanceShots.slice(0, maxShots).filter((s) => s === true || s === false).length;
                                  return filledCount === maxShots ? "Hoàn thành" : `ĐANG BẮN VIÊN ${filledCount + 1}`;
                                })()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Sub-column 2: Danh sách VĐV chờ thi đấu */}
            <div className={`flex flex-col bg-[#0b101c] border border-blue-500/15 rounded-2xl overflow-visible md:overflow-hidden shadow-md h-auto md:h-full min-h-0 ${
              activeFlightSubTab === "next" ? "flex" : "hidden lg:flex"
            }`}>
              <div className="px-4 py-3 bg-gradient-to-r from-blue-600/10 to-blue-550/5 border-b border-blue-500/20 flex items-center gap-2 shrink-0">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
                <h3 className="text-xs font-black text-blue-400 uppercase tracking-wider flex-1">Chờ Thi Đấu</h3>
                <span className="text-[10px] bg-blue-950 text-blue-400 px-2 py-0.5 rounded-md font-bold shrink-0 shadow-sm border border-blue-950">
                  Lượt {activeFlight + 1}
                </span>
              </div>

              <div className="flex-none md:flex-1 flex flex-col justify-stretch p-3 gap-1.5 min-h-0 overflow-visible md:overflow-y-auto pr-1 h-auto md:h-full scrollbar-thin">
                {currentGroup2Lanes.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center border border-dashed border-[#232f52] rounded-xl text-xs text-slate-500 font-extrabold capitalize bg-[#0c1222]/25 py-8">
                    Hết danh sách chờ
                  </div>
                ) : (
                  currentGroup2Lanes.map((laneItem, slotIdx) => {
                    if (!laneItem || !laneItem.name) {
                      return (
                        <div key={`empty-slot-g2-${slotIdx}`} className="min-h-[30px] md:min-h-0 md:flex-1 p-2 border border-dashed border-[#232f52] rounded-xl flex items-center justify-center text-[10px] sm:text-xs text-slate-600 font-bold uppercase tracking-widest bg-[#0c1222]/40 transition-all shrink-0 md:shrink">
                          LANE {slotIdx + 1} - TRỐNG
                        </div>
                      );
                    }

                    if (laneItem.isClub) {
                      // Render Club Card for Group 2
                      return (
                        <div key={`live-g2-club-${laneItem.name}-${slotIdx}`} className="p-2 rounded-xl border bg-[#111a30] border-blue-900/40 hover:border-blue-500 shadow-md animate-fadeIn flex flex-col justify-center shrink-0 md:flex-1 md:shrink md:min-h-0">
                          <div className="flex items-start justify-between gap-2.5 w-full">
                            <div className="flex items-start gap-2.5 min-w-0 flex-1">
                              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-[10px] sm:text-xs font-black shrink-0 border uppercase bg-[#1d273d] border-blue-800 text-blue-400 shadow-sm">
                                L{slotIdx + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-[11px] sm:text-xs font-black text-slate-100 uppercase truncate tracking-wide flex items-center gap-1">
                                  {laneItem.name}
                                </h4>
                                <p className="text-[9px] sm:text-[10px] text-blue-400 truncate font-bold uppercase tracking-wider font-mono">
                                  SBD CLB: {laneItem.sbd ? String(laneItem.sbd).padStart(3, "0") : "---"}
                                </p>
                              </div>
                            </div>
                            <div className="text-right shrink-0 flex flex-col items-end">
                              <span className="text-[9px] bg-blue-950/50 text-blue-400 border border-blue-900 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">Chờ bắn</span>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // Render Athlete Card
                    const ath = laneItem.athleteObj;
                    const isBỏThi = ath ? ath.status === "Bỏ thi" : false;

                    return (
                      <div key={`live-g2-${ath?.id || "ath"}-${slotIdx}`} className={`p-2 rounded-xl border transition-all flex flex-col justify-center shrink-0 md:flex-1 md:shrink md:min-h-0 ${
                        isBỏThi
                          ? "bg-rose-950/15 border-rose-950/40 opacity-45"
                          : "bg-blue-950/10 border-[#1f2f55] hover:border-blue-555 shadow-md animate-fadeIn"
                      }`}>
                        <div className="flex items-center justify-between gap-2.5 w-full">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-[10px] sm:text-xs font-black shrink-0 border uppercase ${
                              isBỏThi ? "bg-rose-950 border-rose-900 text-rose-400" : "bg-[#1d273d] border-blue-800 text-blue-400 shadow-sm"
                            }`}>
                              L{slotIdx + 1}
                            </div>

                            <div className="flex-1 min-w-0">
                              <h4 className="text-[11px] sm:text-xs font-black text-slate-100 uppercase truncate tracking-wide flex items-center gap-1">
                                {laneItem.name}
                                {isBỏThi && <span className="text-[8px] bg-rose-950 border border-rose-900 text-rose-400 font-extrabold px-1 rounded scale-90">BỎ THI</span>}
                              </h4>
                              <p className="text-[9px] sm:text-[10px] text-slate-400 truncate font-bold uppercase tracking-wider flex items-center gap-1.5 flex-wrap">
                                <span>{ath?.id?.replace("ath-", "") || "---"} - {laneItem.team || "Tự Do"}</span>
                                {ath?.category && (
                                  <span className="text-[8px] bg-blue-500/20 text-blue-300 font-extrabold px-1 rounded uppercase tracking-wider">
                                    {ath.category}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>

                          {!isBỏThi && (
                            <div className="text-right shrink-0 flex flex-col items-end">
                              <span className="text-[10px] sm:text-[11px] bg-blue-950/50 text-blue-400 border border-blue-900 px-1.5 py-0.5 rounded font-bold uppercase text-[9px] tracking-wide">Sẵn Sàng</span>
                              <span className="text-[8px] text-slate-500 font-bold uppercase mt-1">Kế Tiếp</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Sub-column 3: Danh sách VĐV bắn thử */}
            <div className={`flex flex-col bg-[#0b101c] border border-violet-500/15 rounded-2xl overflow-visible md:overflow-hidden shadow-md h-auto md:h-full min-h-0 ${
              activeFlightSubTab === "test" ? "flex" : "hidden lg:flex"
            }`}>
              <div className="px-4 py-3 bg-gradient-to-r from-violet-600/10 to-violet-550/5 border-b border-violet-500/20 flex items-center gap-2 shrink-0">
                <span className="w-2.5 h-2.5 rounded-full bg-violet-500 animate-pulse"></span>
                <h3 className="text-xs font-black text-violet-400 uppercase tracking-wider flex-1">Bắn Thử (Warming)</h3>
                <span className="text-[10px] bg-violet-950 text-violet-400 px-2 py-0.5 rounded-md font-bold shrink-0 shadow-sm border border-violet-950">
                  Lượt {activeFlight + 2}
                </span>
              </div>

              <div className="flex-none md:flex-1 flex flex-col justify-stretch p-3 gap-1.5 min-h-0 overflow-visible md:overflow-y-auto pr-1 h-auto md:h-full scrollbar-thin">
                {currentGroup3Lanes.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center border border-dashed border-[#232f52] rounded-xl text-xs text-slate-500 font-extrabold capitalize bg-[#0c1222]/25 py-8">
                    Hết danh sách bắn thử
                  </div>
                ) : (
                  currentGroup3Lanes.map((laneItem, slotIdx) => {
                    if (!laneItem || !laneItem.name) {
                      return (
                        <div key={`empty-slot-g3-${slotIdx}`} className="min-h-[30px] md:min-h-0 md:flex-1 p-2 border border-dashed border-[#232f52] rounded-xl flex items-center justify-center text-[10px] sm:text-xs text-slate-600 font-bold uppercase tracking-widest bg-[#0c1222]/40 transition-all shrink-0 md:shrink">
                          LANE {slotIdx + 1} - TRỐNG
                        </div>
                      );
                    }

                    if (laneItem.isClub) {
                      // Render Club Card for Group 3
                      return (
                        <div key={`live-g3-club-${laneItem.name}-${slotIdx}`} className="p-2 rounded-xl border bg-[#1b1535] border-violet-900/40 hover:border-violet-550 shadow-md animate-fadeIn flex flex-col justify-center shrink-0 md:flex-1 md:shrink md:min-h-0">
                          <div className="flex items-start justify-between gap-2.5 w-full">
                            <div className="flex items-start gap-2.5 min-w-0 flex-1">
                              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-[10px] sm:text-xs font-black shrink-0 border uppercase bg-[#251d3d] border-violet-800 text-violet-400 shadow-sm">
                                L{slotIdx + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-[11px] sm:text-xs font-black text-slate-100 uppercase truncate tracking-wide flex items-center gap-1">
                                  {laneItem.name}
                                </h4>
                                <p className="text-[9px] sm:text-[10px] text-violet-400 truncate font-bold uppercase tracking-wider font-mono">
                                  SBD CLB: {laneItem.sbd ? String(laneItem.sbd).padStart(3, "0") : "---"}
                                </p>
                              </div>
                            </div>
                            <div className="text-right shrink-0 flex flex-col items-end">
                              <span className="text-[9px] bg-violet-950/50 text-violet-400 border border-violet-900 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">Chờ bắn thử</span>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // Render Athlete Card
                    const ath = laneItem.athleteObj;
                    const isBỏThi = ath ? ath.status === "Bỏ thi" : false;

                    return (
                      <div key={`live-g3-${ath?.id || "ath"}-${slotIdx}`} className={`p-2 rounded-xl border transition-all flex flex-col justify-center shrink-0 md:flex-1 md:shrink md:min-h-0 ${
                        isBỏThi
                          ? "bg-rose-950/15 border-rose-950/40 opacity-45"
                          : "bg-violet-950/10 border-[#2f1c50] hover:border-violet-550 shadow-md animate-fadeIn"
                      }`}>
                        <div className="flex items-center justify-between gap-2.5 w-full">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-[10px] sm:text-xs font-black shrink-0 border uppercase ${
                              isBỏThi ? "bg-rose-950 border-rose-900 text-rose-400" : "bg-[#251d3d] border-violet-800 text-violet-400 shadow-sm"
                            }`}>
                              L{slotIdx + 1}
                            </div>

                            <div className="flex-1 min-w-0">
                              <h4 className="text-[11px] sm:text-xs font-black text-slate-100 uppercase truncate tracking-wide flex items-center gap-1">
                                {laneItem.name}
                                {isBỏThi && <span className="text-[8px] bg-rose-950 border border-rose-900 text-rose-400 font-extrabold px-1 rounded scale-90">BỎ THI</span>}
                              </h4>
                              <p className="text-[9px] sm:text-[10px] text-slate-400 truncate font-bold uppercase tracking-wider flex items-center gap-1.5 flex-wrap">
                                <span>{ath?.id?.replace("ath-", "") || "---"} - {laneItem.team || "Tự Do"}</span>
                                {ath?.category && (
                                  <span className="text-[8px] bg-violet-500/20 text-violet-300 font-extrabold px-1 rounded uppercase tracking-wider">
                                    {ath.category}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>

                          {!isBỏThi && (
                            <div className="text-right shrink-0 flex flex-col items-end">
                              <span className="text-[10px] sm:text-[11px] bg-violet-950/50 text-violet-400 border border-violet-900 px-1.5 py-0.5 rounded font-bold uppercase text-[9px] tracking-wide">Bắn Thử</span>
                              <span className="text-[8px] text-slate-500 font-bold uppercase mt-1">Lùi 2 Lượt</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
};
