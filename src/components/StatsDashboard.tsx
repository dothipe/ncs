import React, { useMemo } from "react";
import { Athlete, DistanceConfig } from "../types";
import { Users, Target, Trophy, Award, Building2 } from "lucide-react";
import { getHitCount } from "../utils/qualification";

interface StatsDashboardProps {
  athletes: Athlete[];
  distances: DistanceConfig[];
  shotsCount: number;
}

export const StatsDashboard: React.FC<StatsDashboardProps> = ({ athletes, distances, shotsCount }) => {
  const stats = useMemo(() => {
    if (athletes.length === 0) {
      return {
        totalAthletes: 0,
        averageAccuracy: 0,
        highestScore: 0,
        highestScorer: "Chưa có",
        topTeam: "Chưa có",
        activeShots: 0,
      };
    }

    let highestScore = 0;
    let highestScorer = "Chưa có";
    let totalHits = 0;
    let totalPossibleShots = 0;

    // Team aggregate score calculation
    const teamScores: Record<string, { totalScore: number; count: number }> = {};

    athletes.forEach((athlete) => {
      let athleteScore = 0;
      let athleteHits = 0;

      distances.forEach((dist) => {
        const hits = athlete.scores[dist.id] || [];
        const hitCount = getHitCount(hits);
        athleteScore += hitCount * dist.multiplier;
        athleteHits += hitCount;
      });

      totalHits += athleteHits;
      totalPossibleShots += distances.length * shotsCount;

      if (athleteScore > highestScore) {
        highestScore = athleteScore;
        highestScorer = athlete.name;
      }

      if (athlete.team.trim()) {
        const team = athlete.team.trim();
        if (!teamScores[team]) {
          teamScores[team] = { totalScore: 0, count: 0 };
        }
        teamScores[team].totalScore += athleteScore;
        teamScores[team].count += 1;
      }
    });

    // Calculate top team by average score
    let topTeam = "Chưa có";
    let highestTeamAvg = -1;
    Object.entries(teamScores).forEach(([team, data]) => {
      const avg = data.totalScore / (data.count || 1);
      if (avg > highestTeamAvg) {
        highestTeamAvg = avg;
        topTeam = team;
      }
    });

    const averageAccuracy = totalPossibleShots > 0 ? (totalHits / totalPossibleShots) * 100 : 0;

    return {
      totalAthletes: athletes.length,
      averageAccuracy,
      highestScore,
      highestScorer,
      topTeam,
      totalHits,
    };
  }, [athletes, distances, shotsCount]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
      {/* 1. Total Athletes */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-4 rounded-xl shadow-sm flex items-center gap-3">
        <div className="p-2 sm:p-3 bg-blue-50 text-blue-600 rounded-lg">
          <Users className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
        <div>
          <span className="text-[10px] sm:text-xs font-bold text-gray-400 block uppercase tracking-wide">Vận động viên</span>
          <span className="text-xl sm:text-2xl font-black font-mono text-gray-900 block leading-tight">
            {stats.totalAthletes}
          </span>
        </div>
      </div>

      {/* 2. Accuracy Average */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-4 rounded-xl shadow-sm flex items-center gap-3">
        <div className="p-2 sm:p-3 bg-emerald-50 text-emerald-600 rounded-lg">
          <Target className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
        <div>
          <span className="text-[10px] sm:text-xs font-bold text-gray-400 block uppercase tracking-wide">Tỉ lệ bắn trúng rổ</span>
          <span className="text-xl sm:text-2xl font-black font-mono text-emerald-600 block leading-tight">
            {stats.averageAccuracy.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* 3. Highest Score info */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-4 rounded-xl shadow-sm flex items-center gap-3">
        <div className="p-2 sm:p-3 bg-amber-50 text-amber-500 rounded-lg">
          <Trophy className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
        <div className="min-w-0">
          <span className="text-[10px] sm:text-xs font-bold text-gray-400 block uppercase tracking-wide">Điểm kỷ lục</span>
          <span className="text-xl sm:text-2xl font-black font-mono text-amber-600 leading-tight block">
            {stats.highestScore}đ
          </span>
          <span className="text-[10px] text-gray-400 truncate block mt-0.5" title={stats.highestScorer}>
            {stats.highestScorer}
          </span>
        </div>
      </div>

      {/* 4. Leading Team */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-4 rounded-xl shadow-sm flex items-center gap-3">
        <div className="p-2 sm:p-3 bg-indigo-50 text-indigo-600 rounded-lg">
          <Building2 className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
        <div className="min-w-0">
          <span className="text-[10px] sm:text-xs font-bold text-gray-400 block uppercase tracking-wide">Đội dẫn đầu</span>
          <span className="text-sm sm:text-base font-extrabold text-indigo-700 truncate block leading-normal">
            {stats.topTeam}
          </span>
          <span className="text-[10px] text-gray-400 block mt-0.5">Hiệu suất trung bình cao nhất</span>
        </div>
      </div>
    </div>
  );
};
