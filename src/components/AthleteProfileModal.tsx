import React, { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Athlete, MatchHistoryItem, PKChallenge } from "../types";
import { User, X, FileText, Lock, Award, MessageSquare } from "lucide-react";
import { AVATAR_MALE } from "./AthleteManagement";
import { getHitCount } from "../utils/qualification";
import { db, collection, query, orderBy, onSnapshot } from "../firebase";
import { getVscTitleAndBadge } from "../lib/vscPointsHelper";

interface AthleteProfileModalProps {
  athlete: Athlete | null;
  isOpen: boolean;
  onClose: () => void;
  history: MatchHistoryItem[];
  onlineTournaments?: any[];
  currentUser: any;
  isGlobalAdmin: boolean;
  language?: "vi" | "en";
}

export const AthleteProfileModal: React.FC<AthleteProfileModalProps> = ({
  athlete,
  isOpen,
  onClose,
  history = [],
  onlineTournaments = [],
  currentUser,
  isGlobalAdmin,
  language = "vi",
}) => {
  const [challenges, setChallenges] = useState<PKChallenge[]>([]);

  // Subscribe to PK Challenges to compute ELO live
  useEffect(() => {
    if (!isOpen || !athlete) return;
    const q = query(collection(db, "vsc_pk_challenges"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const list: PKChallenge[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as PKChallenge);
      });
      setChallenges(list);
    }, (error) => {
      console.warn("Error subscribing to PK challenges inside modal:", error);
    });
    return () => unsub();
  }, [isOpen, athlete]);

  // Calculate live PK Stats
  const pkStats = useMemo(() => {
    if (!athlete || challenges.length === 0) {
      return { elo: 1000, wins: 0, losses: 0, draws: 0, streak: 0, totalMatches: 0 };
    }

    const stats: Record<string, { 
      uid: string; 
      name: string; 
      wins: number; 
      losses: number; 
      draws: number; 
      elo: number; 
      streak: number; 
    }> = {};

    // Play through all completed matches chronologically to calculate ELO
    const sortedChallenges = [...challenges]
      .filter(c => c.status === "completed" && c.scores)
      .sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));

    sortedChallenges.forEach((challenge) => {
      const challengerKey = challenge.type === "solo_1v1" ? challenge.challengerUid : `club-${challenge.challengerUid}`;
      const opponentKey = challenge.type === "solo_1v1" ? challenge.opponentUid : `club-${challenge.opponentUid}`;

      if (!challengerKey || !opponentKey) return;

      if (!stats[challengerKey]) {
        stats[challengerKey] = { 
          uid: challenge.challengerUid, 
          name: challenge.challengerName, 
          wins: 0, 
          losses: 0, 
          draws: 0, 
          elo: 1000, 
          streak: 0,
        };
      }
      if (!stats[opponentKey]) {
        stats[opponentKey] = { 
          uid: challenge.opponentUid!, 
          name: challenge.opponentName || "Đối thủ", 
          wins: 0, 
          losses: 0, 
          draws: 0, 
          elo: 1000, 
          streak: 0,
        };
      }

      const scores = challenge.scores!;
      const chScores = scores.challengerScores || [];
      const opScores = scores.opponentScores || [];
      const winMechanism = challenge.winMechanism || "by_sets";

      const chSum = chScores.reduce((a, b) => Number(a) + Number(b), 0);
      const opSum = opScores.reduce((a, b) => Number(a) + Number(b), 0);

      let chSetsWon = 0;
      let opSetsWon = 0;
      const len = Math.max(chScores.length, opScores.length);
      for (let i = 0; i < len; i++) {
        const chS = Number(chScores[i]) || 0;
        const opS = Number(opScores[i]) || 0;
        if (chS > opS) chSetsWon++;
        else if (opS > chS) opSetsWon++;
      }

      const isBySets = winMechanism === "by_sets";
      const challengerWin = isBySets ? (chSetsWon > opSetsWon) : (chSum > opSum);
      const opponentWin = isBySets ? (opSetsWon > chSetsWon) : (opSum > chSum);

      const rCh = stats[challengerKey].elo;
      const rOp = stats[opponentKey].elo;
      const expectedCh = 1 / (1 + Math.pow(10, (rOp - rCh) / 400));
      const expectedOp = 1 / (1 + Math.pow(10, (rCh - rOp) / 400));
      const K = 32;

      if (challengerWin) {
        stats[challengerKey].wins += 1;
        stats[challengerKey].streak += 1;
        stats[opponentKey].losses += 1;
        stats[opponentKey].streak = 0;

        stats[challengerKey].elo = Math.round(rCh + K * (1 - expectedCh));
        stats[opponentKey].elo = Math.round(rOp + K * (0 - expectedOp));
      } else if (opponentWin) {
        stats[opponentKey].wins += 1;
        stats[opponentKey].streak += 1;
        stats[challengerKey].losses += 1;
        stats[challengerKey].streak = 0;

        stats[challengerKey].elo = Math.round(rCh + K * (0 - expectedCh));
        stats[opponentKey].elo = Math.round(rOp + K * (1 - expectedOp));
      } else {
        stats[challengerKey].draws += 1;
        stats[opponentKey].draws += 1;

        stats[challengerKey].elo = Math.round(rCh + K * (0.5 - expectedCh));
        stats[opponentKey].elo = Math.round(rOp + K * (0.5 - expectedOp));
      }
    });

    const playerStats = Object.values(stats).find(s => {
      return s.name.trim().toLowerCase() === athlete.name.trim().toLowerCase();
    });

    if (playerStats) {
      return {
        elo: playerStats.elo,
        wins: playerStats.wins,
        losses: playerStats.losses,
        draws: playerStats.draws,
        streak: playerStats.streak,
        totalMatches: playerStats.wins + playerStats.losses + playerStats.draws
      };
    }

    return { elo: 1000, wins: 0, losses: 0, draws: 0, streak: 0, totalMatches: 0 };
  }, [athlete, challenges]);

  // Prevent background scroll when modal is open
  React.useEffect(() => {
    if (isOpen && athlete) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, athlete]);

  const [localTournaments, setLocalTournaments] = useState<any[]>([]);
  const [decoupledData, setDecoupledData] = useState<{
    athletes: Record<string, any[]>;
    teamAthletes: Record<string, any[]>;
    inputAthletes: Record<string, any[]>;
    teamInputAthletes: Record<string, any[]>;
    masterAthletes: Record<string, any[]>;
    teamMasterAthletes: Record<string, any[]>;
  }>({
    athletes: {},
    teamAthletes: {},
    inputAthletes: {},
    teamInputAthletes: {},
    masterAthletes: {},
    teamMasterAthletes: {},
  });

  // Subscribe to tournaments list locally if the prop is empty
  useEffect(() => {
    if (!isOpen || !athlete) return;
    if (onlineTournaments && onlineTournaments.length > 0) {
      setLocalTournaments([]);
      return;
    }

    const q = query(collection(db, "tournaments"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setLocalTournaments(list);
    }, (err) => {
      console.warn("Failed to subscribe to tournaments list in modal:", err);
    });

    return () => unsub();
  }, [isOpen, athlete, onlineTournaments]);

  // Subscribe to decoupled datasets inside modal while open
  useEffect(() => {
    if (!isOpen || !athlete) return;

    const unsubs: (() => void)[] = [];
    const payloadCollections = [
      { key: "masterAthletes", coll: "vsc_tournament_master_athletes" },
      { key: "athletes", coll: "vsc_tournament_athletes" },
      { key: "teamAthletes", coll: "vsc_tournament_team_athletes" },
      { key: "teamMasterAthletes", coll: "vsc_tournament_team_master_athletes" },
      { key: "inputAthletes", coll: "vsc_tournament_input_athletes" },
      { key: "teamInputAthletes", coll: "vsc_tournament_team_input_athletes" },
    ];

    payloadCollections.forEach(({ key, coll }) => {
      try {
        const unsub = onSnapshot(collection(db, coll), (snap) => {
          const map: Record<string, any[]> = {};
          snap.forEach(docSnap => {
            map[docSnap.id] = docSnap.data()?.list || [];
          });
          setDecoupledData(prev => ({
            ...prev,
            [key]: map
          }));
        }, (err) => {
          console.warn(`Could not subscribe to ${coll} inside modal:`, err);
        });
        unsubs.push(unsub);
      } catch (e) {
        console.warn(`Failed to attach snap listener for ${coll} inside modal:`, e);
      }
    });

    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, [isOpen, athlete]);

  const actualTournaments = useMemo(() => {
    return (onlineTournaments && onlineTournaments.length > 0) ? onlineTournaments : localTournaments;
  }, [onlineTournaments, localTournaments]);

  const mergedOnlineTournaments = useMemo(() => {
    return actualTournaments.map(t => {
      const id = t.id;
      return {
        ...t,
        athletes: (t.athletes && t.athletes.length > 0) ? t.athletes : (decoupledData.athletes[id] || []),
        teamAthletes: (t.teamAthletes && t.teamAthletes.length > 0) ? t.teamAthletes : (decoupledData.teamAthletes[id] || []),
        inputAthletes: (t.inputAthletes && t.inputAthletes.length > 0) ? t.inputAthletes : (decoupledData.inputAthletes[id] || []),
        teamInputAthletes: (t.teamInputAthletes && t.teamInputAthletes.length > 0) ? t.teamInputAthletes : (decoupledData.teamInputAthletes[id] || []),
        masterAthletes: (t.masterAthletes && t.masterAthletes.length > 0) ? t.masterAthletes : (decoupledData.masterAthletes[id] || []),
        teamMasterAthletes: (t.teamMasterAthletes && t.teamMasterAthletes.length > 0) ? t.teamMasterAthletes : (decoupledData.teamMasterAthletes[id] || []),
      };
    });
  }, [actualTournaments, decoupledData]);

  // Calculate detailed historical tournament statistics for the athlete
  const athleteStats = useMemo(() => {
    if (!athlete) return null;
    const athleteIdLower = athlete.id ? athlete.id.trim().toLowerCase() : "";
    const athleteNameLower = athlete.name ? athlete.name.trim().toLowerCase() : "";
    const athleteEmailLower = athlete.email ? athlete.email.trim().toLowerCase() : "";

    const normalizeId = (idStr: string) => {
      if (!idStr) return "";
      const cleaned = idStr.trim().toLowerCase().replace(/^vsc-0*/, "").replace(/^0+/, "");
      return cleaned || idStr.trim().toLowerCase();
    };
    const athleteNormId = normalizeId(athlete.id);
    const normalizeName = (s: string) => (s ? s.trim().toLowerCase().replace(/\s+/g, " ") : "");
    const athleteNormName = normalizeName(athlete.name);

    // Gather all matching participations across historical and online tournaments
    const participations: {
      matchName: string;
      date: string;
      totalShots: number;
      totalHits: number;
      hitRate: number;
      rank: number;
    }[] = [];

    let totalMatchShots = 0;
    let totalMatchHits = 0;
    let highestRank = 9999;

    const getTournamentDateString = (tour: any, lang: string) => {
      if (tour.date) return tour.date;
      if (tour.startDate) return tour.startDate;
      if (tour.createdAt) {
        try {
          const dateObj = typeof tour.createdAt.toDate === "function" 
            ? tour.createdAt.toDate() 
            : (tour.createdAt.seconds ? new Date(tour.createdAt.seconds * 1000) : new Date(tour.createdAt));
          return dateObj.toLocaleDateString(lang === "en" ? "en-US" : "vi-VN");
        } catch (e) {
          return "---";
        }
      }
      return "---";
    };

    const seenMatchKeys = new Set<string>();
    const allMatches = [
      ...mergedOnlineTournaments,
      ...(history || [])
    ];

    allMatches.forEach((match) => {
      if (!match) return;
      const matchDateStr = getTournamentDateString(match, language || "vi");
      const matchTitle = match.matchName || match.name || (language === "en" ? "Tournament Match" : "Trận đấu giải");
      const compositeKey = `${match.id || ""}-${matchTitle}-${matchDateStr}`.trim().toLowerCase();
      if (seenMatchKeys.has(compositeKey)) return;
      seenMatchKeys.add(compositeKey);

      const rawCandidates = [
        ...(match.masterAthletes || []),
        ...(match.inputAthletes || []),
        ...(match.athletes || []),
        ...(match.teamInputAthletes || []),
        ...(match.teamAthletes || []),
        ...(match.teamMasterAthletes || []),
        ...(match.indAthletes || [])
      ];

      const uniqueAthletesMap = new Map<string, any>();
      rawCandidates.forEach((ath) => {
        if (!ath) return;
        const idKey = ath.id ? ath.id.trim().toLowerCase() : "";
        const emailKey = ath.email ? ath.email.trim().toLowerCase() : "";
        const nameKey = ath.name ? ath.name.trim().toLowerCase() : "";
        const key = idKey || emailKey || nameKey;
        if (!key) return;

        const existing = uniqueAthletesMap.get(key);
        if (!existing) {
          uniqueAthletesMap.set(key, ath);
        } else {
          const existingScoreCount = existing.scores ? Object.keys(existing.scores).length : 0;
          const currentScoreCount = ath.scores ? Object.keys(ath.scores).length : 0;
          if (currentScoreCount >= existingScoreCount) {
            uniqueAthletesMap.set(key, ath);
          }
        }
      });

      const allTournamentAthletes = Array.from(uniqueAthletesMap.values());

      const isTargetAthlete = (ath: any) => {
        if (!ath) return false;
        const athId = ath.id ? ath.id.trim().toLowerCase() : "";
        const athEmail = ath.email ? ath.email.trim().toLowerCase() : "";
        const athName = ath.name ? ath.name.trim().toLowerCase() : "";
        const athNormId = normalizeId(ath.id);
        const athNormName = normalizeName(ath.name);

        if (athleteEmailLower && athEmail && athleteEmailLower === athEmail) return true;
        if (athleteIdLower && athId && athleteIdLower === athId) return true;
        if (athleteNormId && athNormId && athleteNormId === athNormId) return true;
        if (athleteNameLower && athName && athleteNameLower === athName) return true;
        if (athleteNormName && athNormName && athleteNormName === athNormName) return true;
        return false;
      };

      const targetAthleteData = allTournamentAthletes.find(isTargetAthlete);

      if (targetAthleteData) {
        let matchShots = 0;
        let matchHits = 0;

        if (targetAthleteData.scores) {
          Object.values(targetAthleteData.scores).forEach((scoreArr: any) => {
            if (Array.isArray(scoreArr)) {
              if (scoreArr.length > 1) {
                matchShots += scoreArr.length;
                matchHits += getHitCount(scoreArr);
              } else if (scoreArr.length === 1) {
                const hc = getHitCount(scoreArr);
                matchHits += hc;
                matchShots += (match.directMaxShots || match.shotsCount || 10);
              }
            }
          });
        }

        if (targetAthleteData.soloHits) {
          Object.values(targetAthleteData.soloHits).forEach((h: any) => {
            if (typeof h === "number" && h > 0) {
              matchHits += h;
              matchShots += (match.shotsCount || 10);
            }
          });
        }

        if (matchShots > 0 || matchHits > 0) {
          if (matchShots === 0 && matchHits > 0) {
            matchShots = matchHits;
          }

          let rank = 1;
          const distances = match.distances || [];
          
          const sortedScores = allTournamentAthletes
            .filter(a => a.status !== "Bỏ thi")
            .map((ath: any) => {
              let totalScore = 0;
              let totalAthleteHits = 0;

              if (distances.length > 0) {
                distances.forEach((dist: any) => {
                  const hits = ath.scores?.[dist.id] || [];
                  const hitCount = getHitCount(hits);
                  totalScore += hitCount * (dist.multiplier || 1);
                  totalAthleteHits += hitCount;
                });
              } else if (ath.scores) {
                Object.values(ath.scores).forEach((scoreArr: any) => {
                  if (Array.isArray(scoreArr)) {
                    const hitCount = getHitCount(scoreArr);
                    totalScore += hitCount;
                    totalAthleteHits += hitCount;
                  }
                });
              }

              if (ath.soloHits) {
                Object.values(ath.soloHits).forEach((h: any) => {
                  if (typeof h === "number") {
                    totalScore += h;
                    totalAthleteHits += h;
                  }
                });
              }

              return {
                athlete: ath,
                score: totalScore,
                hits: totalAthleteHits
              };
            })
            .sort((a, b) => b.score - a.score || b.hits - a.hits);

          const matchRankIdx = sortedScores.findIndex(item => isTargetAthlete(item.athlete));
          if (matchRankIdx !== -1) {
            rank = matchRankIdx + 1;
          }

          if (rank < highestRank) {
            highestRank = rank;
          }

          totalMatchShots += matchShots;
          totalMatchHits += matchHits;

          participations.push({
            matchName: matchTitle,
            date: matchDateStr,
            totalShots: matchShots,
            totalHits: matchHits,
            hitRate: Math.round((matchHits / matchShots) * 100),
            rank
          });
        }
      }
    });

    const overallHitRate = totalMatchShots > 0 ? Math.round((totalMatchHits / totalMatchShots) * 100) : 0;

    return {
      participations: participations.sort((a, b) => b.date.localeCompare(a.date)),
      totalTournaments: participations.length,
      totalShots: totalMatchShots,
      totalHits: totalMatchHits,
      overallHitRate,
      highestRank: highestRank === 9999 ? null : highestRank
    };
  }, [athlete, mergedOnlineTournaments, history, language]);

  if (!isOpen || !athlete) return null;

  const showIdCard = isGlobalAdmin || (currentUser && athlete.email && athlete.email.trim().toLowerCase() === currentUser.email.trim().toLowerCase());
  const vscPointsVal = athlete.vscPoints !== undefined ? athlete.vscPoints : 0;
  const vscBadgeInfo = getVscTitleAndBadge(vscPointsVal);

  const handleStartPrivateChat = () => {
    if (!athlete || !athlete.email) return;
    window.dispatchEvent(new CustomEvent("open_direct_chat", {
      detail: { email: athlete.email, name: athlete.name, avatarUrl: athlete.avatarUrl || "" }
    }));
    onClose();
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-fadeIn text-slate-800 dark:text-slate-100" 
      onClick={onClose}
    >
      <div 
        className="relative my-auto w-full max-w-2xl bg-slate-50 dark:bg-slate-950 rounded-2xl shadow-2xl z-[170] flex flex-col text-left overflow-hidden border border-slate-200 dark:border-slate-800 max-h-[85vh] shrink-0 animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header section */}
        <div className="bg-[#9c0c13] text-white p-4 sm:p-5 flex items-center justify-between shadow-md border-b border-red-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-xl border border-white/10 shrink-0">
              <User className="w-5 h-5 text-yellow-300" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-yellow-300">
                {language === "en" ? "Biographical Sheet" : "Hồ sơ cá nhân"}
              </h3>
              <p className="text-[10px] text-red-100">
                {language === "en" ? "Detailed VSC athlete profile" : "Chi tiết Hồ sơ vận động viên VSC"}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/10 text-white cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content section */}
        <div className="p-4 sm:p-5 space-y-4 sm:space-y-5 flex-1 overflow-y-auto">
          {/* Profile Avatar & Hero Information Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm text-center relative overflow-hidden">
            <div className="absolute top-3 right-3 bg-red-50 dark:bg-red-950/25 border border-red-100 dark:border-red-900/30 text-[#9c0c13] dark:text-red-400 text-xs font-black px-2.5 py-1 rounded-lg">
              {athlete.id}
            </div>
            
            <div className="flex flex-col items-center gap-3">
              <div className="relative shrink-0">
                <img 
                  src={athlete.avatarUrl || AVATAR_MALE} 
                  alt={athlete.name} 
                  className="w-24 h-24 rounded-full object-cover border-4 border-[#9c0c13]/10 bg-slate-50 shadow-md aspect-square shrink-0"
                  referrerPolicy="no-referrer"
                />
                <span className="absolute bottom-0 right-1.5 bg-[#9c0c13] text-white p-1 rounded-full text-[10px] shadow border-2 border-white">
                  ✓
                </span>
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center justify-center gap-1.5">
                  {athlete.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-bold">
                  🛡️ {athlete.team || (language === "en" ? "Independent" : "Tự do")}
                </p>

                {/* VSC Points & Rank Badge */}
                <div className="mt-2.5 flex flex-col items-center justify-center gap-1">
                  <div className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-2xs ${vscBadgeInfo.bgClass} ${vscBadgeInfo.colorClass}`}>
                    {vscBadgeInfo.title}
                  </div>
                  <div className="text-[11px] font-extrabold text-amber-600 dark:text-amber-400 flex items-center gap-1 justify-center mt-0.5">
                    <span>⚡ Điểm VSC:</span>
                    <span className="text-sm font-black bg-amber-500/15 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-md">{vscPointsVal}</span>
                    <span className="text-[9px] text-slate-400 font-bold">(Xếp hạng riêng)</span>
                  </div>
                </div>

                {athlete.email && currentUser && currentUser.email?.trim().toLowerCase() !== athlete.email.trim().toLowerCase() && (
                  <button
                    type="button"
                    onClick={handleStartPrivateChat}
                    className="mt-3 px-4 py-1.5 rounded-xl text-xs font-extrabold bg-[#004ca3] hover:bg-[#003b80] text-white transition-all shadow-3xs cursor-pointer flex items-center gap-1.5 mx-auto border-none"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{language === "en" ? "SEND MESSAGE" : "NHẮN TIN RIÊNG"}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* PK Challenge Arena Stats Block */}
          <div className="bg-gradient-to-br from-rose-50/50 to-amber-50/30 dark:from-slate-900/60 dark:to-rose-950/15 border border-rose-100 dark:border-slate-800/85 rounded-2xl p-5 shadow-sm">
            <h4 className="text-xs font-black text-[#9c0c13] dark:text-rose-400 uppercase tracking-widest border-b border-rose-100/60 dark:border-slate-800/85 pb-2 mb-4 flex items-center gap-2">
              <span className="text-sm">⚔️</span>
              {language === "en" ? "PK ARENA FIGHTING RECORD" : "THÀNH TÍCH ĐẤU TRƯỜNG PK"}
            </h4>
            
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
              <div className="bg-white dark:bg-slate-950 p-2.5 rounded-xl border border-rose-100/50 dark:border-slate-900">
                <div className="text-[9px] font-extrabold text-[#9c0c13] dark:text-rose-400 uppercase">
                  ELO PK
                </div>
                <div className="text-base font-black text-[#9c0c13] dark:text-rose-400 mt-0.5">{pkStats.elo}</div>
              </div>
              <div className="bg-white dark:bg-slate-950 p-2.5 rounded-xl border border-rose-100/50 dark:border-slate-900">
                <div className="text-[9px] font-extrabold text-amber-650 dark:text-amber-400 uppercase">
                  Điểm VSC
                </div>
                <div className="text-base font-black text-amber-600 dark:text-amber-400 mt-0.5">{vscPointsVal}</div>
              </div>
              <div className="bg-white dark:bg-slate-950 p-2.5 rounded-xl border border-rose-100/50 dark:border-slate-900">
                <div className="text-[9px] font-extrabold text-slate-500 uppercase">
                  {language === "en" ? "Matches" : "Số Trận"}
                </div>
                <div className="text-base font-black text-slate-700 dark:text-slate-200 mt-0.5">{pkStats.totalMatches}</div>
              </div>
              <div className="bg-white dark:bg-slate-950 p-2.5 rounded-xl border border-rose-100/50 dark:border-slate-900">
                <div className="text-[9px] font-extrabold text-emerald-600 uppercase">
                  {language === "en" ? "Win-Loss" : "Thắng - Thua"}
                </div>
                <div className="text-base font-black text-emerald-600 mt-0.5">
                  {pkStats.wins}W - {pkStats.losses}L
                </div>
              </div>
              <div className="bg-white dark:bg-slate-950 p-2.5 rounded-xl border border-rose-100/50 dark:border-slate-900">
                <div className="text-[9px] font-extrabold text-amber-650 uppercase">
                  {language === "en" ? "Streak" : "Chuỗi Thắng"}
                </div>
                <div className="text-base font-black text-amber-500 mt-0.5">
                  {pkStats.streak > 0 ? `🔥 ${pkStats.streak}` : "---"}
                </div>
              </div>
            </div>
          </div>

          {/* Personal Details Block */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm">
            <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800/80 pb-2 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#9c0c13]" />
              {language === "en" ? "Personal Information" : "Thông tin cá nhân"}
            </h4>
            
            <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-xs">
              <div>
                <div className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase mb-0.5">
                  {language === "en" ? "Gender" : "Giới tính"}
                </div>
                <div className="font-extrabold text-slate-700 dark:text-slate-200">{athlete.gender || "Nam"}</div>
              </div>
              <div>
                <div className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase mb-0.5">
                  {language === "en" ? "Date of birth" : "Ngày sinh"}
                </div>
                <div className="font-extrabold text-slate-700 dark:text-slate-200">{athlete.dob || "---"}</div>
              </div>
              <div>
                <div className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase mb-0.5">
                  {language === "en" ? "Province" : "Tỉnh thành"}
                </div>
                <div className="font-extrabold text-slate-700 dark:text-slate-200">{athlete.province || "---"}</div>
              </div>
              <div>
                <div className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase mb-0.5">
                  {language === "en" ? "Hometown" : "Quê quán"}
                </div>
                <div className="font-extrabold text-slate-700 dark:text-slate-200">{athlete.hometown || "---"}</div>
              </div>
              
              <div className="col-span-2 border-t border-slate-100 dark:border-slate-800/60 pt-3 mt-1.5">
                <div className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase mb-0.5">
                  {language === "en" ? "Linked Email" : "Email tài khoản liên kết"}
                </div>
                <div className="font-extrabold text-slate-700 dark:text-slate-200 break-all flex items-center gap-1.5">
                  {athlete.email ? (
                    <>
                      <span className="text-emerald-600 dark:text-emerald-400">●</span> {athlete.email}
                    </>
                  ) : (
                    <span className="text-slate-400 font-normal italic">
                      {language === "en" ? "No email linked" : "Chưa liên kết email"}
                    </span>
                  )}
                </div>
              </div>

              {showIdCard && athlete.idCard && (
                <div className="col-span-2 border-t border-slate-100 dark:border-slate-800/60 pt-3">
                  <div className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase mb-0.5 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-red-500" /> 
                    {language === "en" ? "ID Card / Passport (Protected)" : "Số CCCD (Bảo mật)"}
                  </div>
                  <div className="font-extrabold text-[#9c0c13] dark:text-red-400">{athlete.idCard}</div>
                </div>
              )}
            </div>
          </div>

          {/* Gear & Tech Profile Block */}
          {(athlete.gearSlingName || athlete.gearForkWidth || athlete.gearBandSpec || athlete.gearAmmoSize || athlete.gearStance) && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm">
              <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800/80 pb-2 mb-4 flex items-center gap-2">
                <span className="text-base">🎯</span>
                {language === "en" ? "Gear & Technical Profile" : "Cấu hình Trang bị & Kỹ thuật"}
              </h4>
              <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-xs">
                {athlete.gearSlingName && (
                  <div>
                    <div className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase mb-0.5">
                      {language === "en" ? "Slingshot Model" : "Tên loại ná"}
                    </div>
                    <div className="font-extrabold text-[#9c0c13] dark:text-red-400">{athlete.gearSlingName}</div>
                  </div>
                )}
                {athlete.gearForkWidth && (
                  <div>
                    <div className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase mb-0.5">
                      {language === "en" ? "Fork Width" : "Độ rộng chạc"}
                    </div>
                    <div className="font-extrabold text-slate-700 dark:text-slate-200">{athlete.gearForkWidth}</div>
                  </div>
                )}
                {athlete.gearBandSpec && (
                  <div>
                    <div className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase mb-0.5">
                      {language === "en" ? "Band Specs" : "Khổ thun sử dụng"}
                    </div>
                    <div className="font-extrabold text-slate-700 dark:text-slate-200">{athlete.gearBandSpec}</div>
                  </div>
                )}
                {athlete.gearAmmoSize && (
                  <div>
                    <div className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase mb-0.5">
                      {language === "en" ? "Ammo Size" : "Bi sử dụng"}
                    </div>
                    <div className="font-extrabold text-slate-700 dark:text-slate-200">{athlete.gearAmmoSize}</div>
                  </div>
                )}
                {athlete.gearStance && (
                  <div className="col-span-2">
                    <div className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase mb-0.5">
                      {language === "en" ? "Shooting Stance" : "Tư thế bắn"}
                    </div>
                    <div className="font-extrabold text-slate-700 dark:text-slate-200">{athlete.gearStance}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Stats and historical achievements */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm">
            <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800/80 pb-2 mb-4 flex items-center gap-2">
              <Award className="w-4 h-4 text-[#9c0c13]" />
              {language === "en" ? "Competition Achievement Statistics" : "Thống kê thành tích thi đấu"}
            </h4>

            {athleteStats && athleteStats.totalTournaments > 0 ? (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-900">
                    <div className="text-[9px] font-extrabold text-slate-450 uppercase">
                      {language === "en" ? "Tournaments" : "Số Giải"}
                    </div>
                    <div className="text-base font-black text-[#9c0c13] mt-0.5">{athleteStats.totalTournaments}</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-900">
                    <div className="text-[9px] font-extrabold text-slate-450 uppercase">
                      {language === "en" ? "Hit Rate" : "Tỷ Lệ Trúng"}
                    </div>
                    <div className="text-base font-black text-emerald-600 mt-0.5">{athleteStats.overallHitRate}%</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-900">
                    <div className="text-[9px] font-extrabold text-slate-450 uppercase">
                      {language === "en" ? "Best Rank" : "Hạng Cao Nhất"}
                    </div>
                    <div className="text-base font-black text-amber-500 mt-0.5">
                      {athleteStats.highestRank ? `#${athleteStats.highestRank}` : "---"}
                    </div>
                  </div>
                </div>

                {athleteStats.participations.length > 1 && (
                  <div className="space-y-2 text-center">
                    <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase flex items-center justify-between">
                      <span>{language === "en" ? "Progress Chart" : "Biểu đồ tiến trình"}</span>
                      <span className="font-black text-[#9c0c13]">{athleteStats.overallHitRate}% ({language === "en" ? "Average" : "Trung bình"})</span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-900 rounded-xl p-3 h-28 flex items-end">
                      <svg className="w-full h-full" viewBox="0 0 300 80">
                        <line x1="0" y1="10" x2="300" y2="10" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3,3" />
                        <line x1="0" y1="40" x2="300" y2="40" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3,3" />
                        <line x1="0" y1="70" x2="300" y2="70" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3,3" />
                        
                        {(() => {
                          const points = [...athleteStats.participations].reverse();
                          const widthStep = 300 / (points.length - 1 || 1);
                          
                          const coords = points.map((p, idx) => {
                            const x = idx * widthStep;
                            const y = 70 - (p.hitRate / 100) * 60;
                            return { x, y };
                          });

                          const d = coords.reduce((acc, c, idx) => {
                            return idx === 0 ? `M ${c.x} ${c.y}` : `${acc} L ${c.x} ${c.y}`;
                          }, "");

                          return (
                            <>
                              {coords.length > 1 && (
                                <path
                                  d={`${d} L ${coords[coords.length-1].x} 70 L ${coords[0].x} 70 Z`}
                                  fill="rgba(156, 12, 19, 0.05)"
                                />
                              )}
                              <path d={d} fill="none" stroke="#9c0c13" strokeWidth="2.5" />
                              {coords.map((c, idx) => (
                                <g key={idx}>
                                  <circle cx={c.x} cy={c.y} r="4" fill="#9c0c13" stroke="#fff" strokeWidth="1" />
                                  <title>{points[idx].matchName}: {points[idx].hitRate}%</title>
                                </g>
                              ))}
                            </>
                          );
                        })()}
                      </svg>
                    </div>
                  </div>
                )}

                {/* Match Participation List */}
                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                    {language === "en" ? "Tournament History" : "Lịch sử tham gia giải đấu"}
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-48 overflow-y-auto">
                    {athleteStats.participations.map((p, idx) => (
                      <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                        <div className="min-w-0 pr-2">
                          <div className="font-extrabold text-slate-700 dark:text-slate-200 truncate">{p.matchName}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{p.date}</div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <span className="font-mono font-bold text-slate-500">{p.totalHits}/{p.totalShots}</span>
                            <span className="text-[10px] text-emerald-600 font-black ml-1.5 bg-emerald-50 px-1 py-0.5 rounded">
                              {p.hitRate}%
                            </span>
                          </div>
                          <div className="bg-amber-100/75 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-400 text-[10px] font-black px-2 py-0.5 rounded-md min-w-[32px] text-center">
                            #{p.rank}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400 dark:text-slate-500 text-xs italic">
                {language === "en" ? "No competition data found in system history" : "Chưa có dữ liệu thi đấu nào trong lịch sử hệ thống"}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
