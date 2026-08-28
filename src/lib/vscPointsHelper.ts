export interface VscBadge {
  title: string;
  colorClass: string;
  bgClass: string;
}

export function getVscTitleAndBadge(points: number = 100): VscBadge {
  if (points >= 1000) {
    return {
      title: "Tôn Giả VSC 👑",
      colorClass: "text-amber-600 dark:text-amber-400 font-extrabold",
      bgClass: "bg-amber-100 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800"
    };
  }
  if (points >= 900) {
    return {
      title: "Huyền Thoại VSC 🔥",
      colorClass: "text-rose-600 dark:text-rose-400 font-extrabold",
      bgClass: "bg-rose-100 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800"
    };
  }
  if (points >= 800) {
    return {
      title: "Đấu Sĩ Kim Cương 💎",
      colorClass: "text-cyan-600 dark:text-cyan-400 font-bold",
      bgClass: "bg-cyan-100 dark:bg-cyan-950/40 border border-cyan-300 dark:border-cyan-800"
    };
  }
  if (points >= 700) {
    return {
      title: "Tướng Quân Bạch Kim 🛡️",
      colorClass: "text-slate-700 dark:text-slate-350 font-bold",
      bgClass: "bg-slate-100 dark:bg-slate-800/40 border border-slate-300 dark:border-slate-700"
    };
  }
  if (points >= 600) {
    return {
      title: "Đại Cao Thủ Ngọc Bích 💚",
      colorClass: "text-emerald-600 dark:text-emerald-400 font-bold",
      bgClass: "bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800"
    };
  }
  if (points >= 500) {
    return {
      title: "Cao Thủ Vàng 🥇",
      colorClass: "text-yellow-650 dark:text-yellow-400 font-bold",
      bgClass: "bg-yellow-100 dark:bg-yellow-950/40 border border-yellow-300 dark:border-yellow-850"
    };
  }
  if (points >= 400) {
    return {
      title: "Xạ Thủ Bạc 🥈",
      colorClass: "text-slate-600 dark:text-slate-400 font-bold",
      bgClass: "bg-slate-100 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800"
    };
  }
  if (points >= 300) {
    return {
      title: "Chiến Binh Đồng 🥉",
      colorClass: "text-orange-600 dark:text-orange-400 font-bold",
      bgClass: "bg-orange-100 dark:bg-orange-950/40 border border-orange-300 dark:border-orange-800"
    };
  }
  if (points >= 100) {
    return {
      title: "Xạ Thủ Tập Sự 🎯",
      colorClass: "text-indigo-650 dark:text-indigo-400 font-bold",
      bgClass: "bg-indigo-100 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-850"
    };
  }
  return {
    title: "Tập Sự Sơ Cấp 🪵",
    colorClass: "text-stone-500 dark:text-stone-400 font-normal",
    bgClass: "bg-stone-100 dark:bg-stone-900/40 border border-stone-200 dark:border-stone-800"
  };
}
