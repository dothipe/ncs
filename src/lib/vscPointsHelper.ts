export interface VscBadge {
  title: string;
  colorClass: string;
  bgClass: string;
  level: number;
  minScore: number;
  totalScore: number;
  vscPoints: number;
  elo: number;
}

export const VSC_MAX_POINTS_CAP = 1000;

export function calculateCombinedVscScore(vscPoints: number = 0, elo: number = 1000): number {
  const cappedVsc = Math.min(VSC_MAX_POINTS_CAP, Math.max(0, Number(vscPoints) || 0));
  const safeElo = Math.max(0, Number(elo) || 1000);
  return safeElo + cappedVsc;
}

export function getVscTitleAndBadge(arg1?: number, arg2?: number): VscBadge {
  let vsc = 0;
  let elo = 1000;
  let totalScore = 1000;

  if (arg2 !== undefined) {
    // Called with (vscPoints, elo)
    vsc = Math.min(VSC_MAX_POINTS_CAP, Math.max(0, Number(arg1) || 0));
    elo = Math.max(0, Number(arg2) || 1000);
    totalScore = elo + vsc;
  } else if (arg1 !== undefined) {
    if (arg1 >= 1000) {
      // Called with already calculated totalScore (e.g. 1250)
      totalScore = arg1;
      elo = Math.max(1000, arg1 - 1000);
      vsc = Math.min(VSC_MAX_POINTS_CAP, arg1 - elo);
    } else {
      // Called with single vscPoints (e.g. 150)
      vsc = Math.min(VSC_MAX_POINTS_CAP, Math.max(0, Number(arg1) || 0));
      elo = 1000;
      totalScore = elo + vsc;
    }
  }

  if (totalScore >= 2000) {
    return {
      title: "Tôn Giả VSC 👑",
      colorClass: "text-amber-600 dark:text-amber-400 font-extrabold",
      bgClass: "bg-amber-100 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800",
      level: 10,
      minScore: 2000,
      totalScore,
      vscPoints: vsc,
      elo
    };
  }
  if (totalScore >= 1850) {
    return {
      title: "Huyền Thoại VSC 🔥",
      colorClass: "text-rose-600 dark:text-rose-400 font-extrabold",
      bgClass: "bg-rose-100 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800",
      level: 9,
      minScore: 1850,
      totalScore,
      vscPoints: vsc,
      elo
    };
  }
  if (totalScore >= 1700) {
    return {
      title: "Đấu Sĩ Kim Cương 💎",
      colorClass: "text-cyan-600 dark:text-cyan-400 font-bold",
      bgClass: "bg-cyan-100 dark:bg-cyan-950/40 border border-cyan-300 dark:border-cyan-800",
      level: 8,
      minScore: 1700,
      totalScore,
      vscPoints: vsc,
      elo
    };
  }
  if (totalScore >= 1600) {
    return {
      title: "Tướng Quân Bạch Kim 🛡️",
      colorClass: "text-slate-700 dark:text-slate-350 font-bold",
      bgClass: "bg-slate-100 dark:bg-slate-800/40 border border-slate-300 dark:border-slate-700",
      level: 7,
      minScore: 1600,
      totalScore,
      vscPoints: vsc,
      elo
    };
  }
  if (totalScore >= 1500) {
    return {
      title: "Đại Cao Thủ Ngọc Bích 💚",
      colorClass: "text-emerald-600 dark:text-emerald-400 font-bold",
      bgClass: "bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800",
      level: 6,
      minScore: 1500,
      totalScore,
      vscPoints: vsc,
      elo
    };
  }
  if (totalScore >= 1400) {
    return {
      title: "Cao Thủ Vàng 🥇",
      colorClass: "text-yellow-650 dark:text-yellow-400 font-bold",
      bgClass: "bg-yellow-100 dark:bg-yellow-950/40 border border-yellow-300 dark:border-yellow-850",
      level: 5,
      minScore: 1400,
      totalScore,
      vscPoints: vsc,
      elo
    };
  }
  if (totalScore >= 1300) {
    return {
      title: "Xạ Thủ Bạc 🥈",
      colorClass: "text-slate-600 dark:text-slate-400 font-bold",
      bgClass: "bg-slate-100 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800",
      level: 4,
      minScore: 1300,
      totalScore,
      vscPoints: vsc,
      elo
    };
  }
  if (totalScore >= 1200) {
    return {
      title: "Chiến Binh Đồng 🥉",
      colorClass: "text-orange-600 dark:text-orange-400 font-bold",
      bgClass: "bg-orange-100 dark:bg-orange-950/40 border border-orange-300 dark:border-orange-800",
      level: 3,
      minScore: 1200,
      totalScore,
      vscPoints: vsc,
      elo
    };
  }
  if (totalScore >= 1100) {
    return {
      title: "Xạ Thủ Tập Sự 🎯",
      colorClass: "text-indigo-650 dark:text-indigo-400 font-bold",
      bgClass: "bg-indigo-100 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-850",
      level: 2,
      minScore: 1100,
      totalScore,
      vscPoints: vsc,
      elo
    };
  }
  return {
    title: "Tập Sự Sơ Cấp 🪵",
    colorClass: "text-stone-500 dark:text-stone-400 font-normal",
    bgClass: "bg-stone-100 dark:bg-stone-900/40 border border-stone-200 dark:border-stone-800",
    level: 1,
    minScore: 0,
    totalScore,
    vscPoints: vsc,
    elo
  };
}
