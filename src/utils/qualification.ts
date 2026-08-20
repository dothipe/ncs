import { Athlete, DistanceConfig } from "../types";

export function getHitCount(hits: any[]): number {
  if (!hits || hits.length === 0) return 0;
  const val = hits[0];
  if (typeof val === "number") {
    return val;
  }
  if (typeof val === "string") {
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? 0 : parsed;
  }
  return hits.filter(Boolean).length;
}

export interface RoundResult {
  distance: DistanceConfig;
  roundIndex: number;
  qualifiedIds: string[]; // IDs of athletes who QUALIFIED to participate in this round
  eliminatedIds: string[]; // IDs of athletes who shot in this round but got ELIMINATED at the end of it
  scores: Record<string, {
    roundHits: number;
    roundScore: number;
    cumulativeHits: number;
    cumulativeScore: number;
    displayScore: number; // roundScore OR cumulativeScore based on isCumulative flag
    displayHits: number;
    accuracy: number;
    displayScoreWithSolo: number; // Hidden score including soloHits
  }>;
  pendingSoloIds?: string[]; // IDs of athletes with pending solo tie-breaks (no soloHits entered)
  pendingResoloIds?: string[]; // IDs of athletes who have equal tie-break scores of soloHits, requiring resolo
}

/**
 * Computes round-by-round scores, progression, and elimination.
 * Rounds are ordered exactly by the order of `distances` array.
 */
export function calculateRounds(
  athletes: Athlete[],
  distances: DistanceConfig[],
  shotsCount: number,
  directMaxPoints?: number
): RoundResult[] {
  const results: RoundResult[] = [];
  
  // Track continuous cumulative stats for each athlete ID
  const cumulativeScores: Record<string, number> = {};
  const cumulativeHits: Record<string, number> = {};
  
  // Initialize with all athletes who are competing (excluding retired/bỏ thi if desired, but we keep all for ranking and mark their skip status)
  let activeIds = athletes
    .filter(a => a.status !== "Bỏ thi")
    .map(a => a.id);

  // If there are no configured distances, return empty
  if (distances.length === 0) return [];

  for (let r = 0; r < distances.length; r++) {
    const dist = distances[r];
    const roundScores: Record<string, {
      roundHits: number;
      roundScore: number;
      cumulativeHits: number;
      cumulativeScore: number;
      displayScore: number;
      displayHits: number;
      accuracy: number;
      displayScoreWithSolo: number;
    }> = {};

    // To ensure athletes who missed out mathematically in earlier rounds but have actual scores in the database
    // are not lost or incorrectly marked as eliminated, we define currentRoundParticipants as activeIds PLUS 
    // any athlete who has actual non-empty scores recorded in this round.
    const currentRoundParticipants = athletes
      .filter(ath => ath.status !== "Bỏ thi" && (activeIds.includes(ath.id) || (ath.scores[dist.id] && ath.scores[dist.id].length > 0 && ath.scores[dist.id].some(v => v !== null && v !== undefined))))
      .map(ath => ath.id);

    // Calculate raw and cumulative scores for each athlete
    athletes.forEach(ath => {
      const isQualified = currentRoundParticipants.includes(ath.id);
      
      // If they are not qualified/active in this round, their round hits & score are 0
      const hits = isQualified ? (ath.scores[dist.id] || []) : [];
      const roundHits = getHitCount(hits);
      const roundScore = roundHits * dist.multiplier;

      // Cumulative stats up to this round
      const prevScore = cumulativeScores[ath.id] || 0;
      const prevHits = cumulativeHits[ath.id] || 0;

      const currCumulativeScore = prevScore + roundScore;
      const currCumulativeHits = prevHits + roundHits;

      // Update the cumulative state tracker
      cumulativeScores[ath.id] = currCumulativeScore;
      cumulativeHits[ath.id] = currCumulativeHits;

      // Display stats depend on isCumulative flag
      const displayScore = dist.isCumulative ? currCumulativeScore : roundScore;
      const displayHits = dist.isCumulative ? currCumulativeHits : roundHits;

      // Hidden/comparison score that includes solo shootout hits if isSolo is active
      const soloHits = dist.isSolo ? (ath.soloHits?.[dist.id] || 0) : 0;
      const displayScoreWithSolo = displayScore + (soloHits * 0.001);

      let accuracy = 0;
      if (directMaxPoints !== undefined && directMaxPoints > 0) {
        let totalMultiplier = 0;
        if (dist.isCumulative) {
          for (let i = 0; i <= r; i++) {
            const d = distances[i];
            const wasShot = ath.scores[d.id] && ath.scores[d.id].length > 0 && ath.scores[d.id].some(v => v !== null && v !== undefined);
            if (wasShot) {
              totalMultiplier += d.multiplier;
            }
          }
          if (totalMultiplier === 0) {
            totalMultiplier = dist.multiplier;
          }
        } else {
          totalMultiplier = dist.multiplier;
        }
        const totalPossPoints = directMaxPoints * totalMultiplier;
        accuracy = totalPossPoints > 0 ? (displayScore / totalPossPoints) * 100 : 0;
      } else {
        let totalPossShots = 0;
        if (dist.isCumulative) {
          for (let i = 0; i <= r; i++) {
            const d = distances[i];
            const wasShot = ath.scores[d.id] && ath.scores[d.id].length > 0 && ath.scores[d.id].some(v => v !== null && v !== undefined);
            if (wasShot) {
              totalPossShots += shotsCount;
            }
          }
          if (totalPossShots === 0) {
            totalPossShots = shotsCount;
          }
        } else {
          totalPossShots = shotsCount;
        }
        accuracy = totalPossShots > 0 ? (displayHits / totalPossShots) * 100 : 0;
      }

      roundScores[ath.id] = {
        roundHits,
        roundScore,
        cumulativeHits: currCumulativeHits,
        cumulativeScore: currCumulativeScore,
        displayScore,
        displayHits,
        accuracy,
        displayScoreWithSolo,
      };
    });

    // Determine elimination at the end of the current round
    let nextRoundQualifiedIds: string[] = [];
    let currentRoundEliminatedIds: string[] = [];
    let roundPendingSoloIds: string[] = [];
    let roundResoloIds: string[] = [];

    if (dist.isElimination) {
      // Sort qualified athletes of the current round to decide who progresses
      const sortedQualified = [...currentRoundParticipants].sort((idA, idB) => {
        const scoreA = roundScores[idA]?.displayScoreWithSolo || 0;
        const scoreB = roundScores[idB]?.displayScoreWithSolo || 0;
        if (scoreB !== scoreA) {
          return scoreB - scoreA;
        }

        const accA = roundScores[idA]?.accuracy || 0;
        const accB = roundScores[idB]?.accuracy || 0;
        return accB - accA;
      });

      // Calculate how many athletes are targeted to advance
      let N = sortedQualified.length;
      const elimVal = dist.eliminationValue || 0;

      if (dist.eliminationType === "count") {
        N = Math.min(sortedQualified.length, elimVal);
      } else {
        // Percent
        N = Math.max(1, Math.round(sortedQualified.length * (elimVal / 100)));
      }

      if (sortedQualified.length <= N) {
        // Everyone progresses because total athletes is less than or equal to the target limit
        nextRoundQualifiedIds = [...sortedQualified];
        currentRoundEliminatedIds = [];
      } else {
        const cutoffScore = roundScores[sortedQualified[N - 1]]?.displayScoreWithSolo || 0;

        // Partition athletes using the sorting score with solo
        const sures: string[] = []; // score strictly greater than cutoff
        const contenders: string[] = []; // score exactly equal to cutoff
        const purelyEliminated: string[] = []; // score strictly less than cutoff

        sortedQualified.forEach(id => {
          const score = roundScores[id]?.displayScoreWithSolo || 0;
          if (score > cutoffScore) {
            sures.push(id);
          } else if (score === cutoffScore) {
            contenders.push(id);
          } else {
            purelyEliminated.push(id);
          }
        });

        // We assign any pending solos to the declared roundPendingSoloIds

        if (dist.isSolo) {
          // SOLO is active: we must choose exactly (N - sures.length) players from contenders based on soloHits (solo tie-break hits)
          const slotsLeft = N - sures.length;

          if (slotsLeft > 0 && slotsLeft < contenders.length) {
            // Map athlete details for easy soloHits query
            const athleteMap = new Map(athletes.map(a => [a.id, a]));

            const unshotContenders: string[] = [];
            const pendingSoloContenders: string[] = [];

            contenders.forEach(id => {
              const ath = athleteMap.get(id);
              if (!ath) return;

              const rScores = ath.scores[dist.id];
              const isUnshotInThisRound = !rScores || rScores.length === 0 || rScores.every((val: any) => val === null);

              if (isUnshotInThisRound) {
                unshotContenders.push(id);
              } else {
                const hasSolo = ath?.soloHits !== undefined && ath.soloHits[dist.id] !== undefined && ath.soloHits[dist.id] !== null;
                if (!hasSolo) {
                  pendingSoloContenders.push(id);
                }
              }
            });

            // Only contenders who have actually shot but haven't entered their solo hits should be in pending solo shootoff
            roundPendingSoloIds = [...pendingSoloContenders];

            if (unshotContenders.length > 0 || pendingSoloContenders.length > 0) {
              // Shootoff is pending! None of the contenders are eliminated yet
              nextRoundQualifiedIds = [...sures, ...contenders];
              currentRoundEliminatedIds = [...purelyEliminated];
            } else {
              // Shootout is completed! Work out winner as usual
              const contendersWithSolo = contenders.map(id => {
                const ath = athleteMap.get(id);
                const soloHits = ath?.soloHits?.[dist.id] || 0;
                return { id, soloHits };
              });

              // Sort descending by soloHits
              contendersWithSolo.sort((a, b) => b.soloHits - a.soloHits);

              const winnerScoreBoundary = contendersWithSolo[slotsLeft - 1].soloHits;
              const loserScoreBoundary = contendersWithSolo[slotsLeft].soloHits;

              if (winnerScoreBoundary === loserScoreBoundary) {
                // We have a tie at the solo cutoff boundary! Resolo is required for anyone with this score.
                const resoloCandidates = contendersWithSolo.filter(c => c.soloHits === winnerScoreBoundary).map(c => c.id);
                roundResoloIds = resoloCandidates;

                const surelySoloPassed = contendersWithSolo.filter(c => c.soloHits > winnerScoreBoundary).map(c => c.id);
                const surelySoloFailed = contendersWithSolo.filter(c => c.soloHits < winnerScoreBoundary).map(c => c.id);

                // Tie candidates are temporarily on the qualified list (not eliminated yet, will resolo)
                nextRoundQualifiedIds = [...sures, ...surelySoloPassed, ...resoloCandidates];
                currentRoundEliminatedIds = [...surelySoloFailed, ...purelyEliminated];
              } else {
                // Clean split!
                const soloPassed = contendersWithSolo.slice(0, slotsLeft).map(c => c.id);
                const soloFailed = contendersWithSolo.slice(slotsLeft).map(c => c.id);

                nextRoundQualifiedIds = [...sures, ...soloPassed];
                currentRoundEliminatedIds = [...soloFailed, ...purelyEliminated];
              }
            }
          } else {
            // No tie-break shootout required (everyone either passes or fails anyway)
            nextRoundQualifiedIds = [...sures, ...contenders];
            currentRoundEliminatedIds = [...purelyEliminated];
          }
        } else {
          // SOLO is inactive: Everyone in contenders with same score as cutoff gets qualified
          nextRoundQualifiedIds = [...sures, ...contenders];
          currentRoundEliminatedIds = [...purelyEliminated];
        }
      }
    } else {
      // No elimination, everyone qualified progresses
      nextRoundQualifiedIds = [...currentRoundParticipants];
      currentRoundEliminatedIds = [];
    }

    results.push({
      distance: dist,
      roundIndex: r,
      qualifiedIds: [...currentRoundParticipants],
      eliminatedIds: currentRoundEliminatedIds,
      scores: roundScores,
      pendingSoloIds: roundPendingSoloIds,
      pendingResoloIds: roundResoloIds,
    });

    // Pass the qualified list to the next round
    activeIds = nextRoundQualifiedIds;
  }

  return results;
}
