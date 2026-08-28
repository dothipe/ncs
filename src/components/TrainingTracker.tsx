import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { 
  Target, 
  TrendingUp, 
  Calendar, 
  Trash2, 
  Plus, 
  RotateCcw, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Award, 
  Activity, 
  FileText, 
  ChevronRight, 
  ChevronLeft,
  Undo, 
  BarChart2, 
  MapPin, 
  Clock, 
  BookOpen, 
  AlertCircle,
  Sparkles,
  ThumbsUp,
  Flame,
  X
} from "lucide-react";
import { db, collection, addDoc, deleteDoc, doc, query, where, orderBy, onSnapshot } from "../firebase";
import { TrainingSession } from "../types";
import { useLanguage } from "../context/LanguageContext";

interface TrainingTrackerProps {
  currentUser: any;
}

export default function TrainingTracker({ currentUser }: TrainingTrackerProps) {
  const { language } = useLanguage();
  const isEng = language === "en";

  // Helper to format date and time (Hours:Minutes) from ISO string or fallback date
  const formatDateTime = (createdAt: string, fallbackDate: string) => {
    try {
      const dateObj = new Date(createdAt || fallbackDate);
      if (isNaN(dateObj.getTime())) return fallbackDate;
      const d = String(dateObj.getDate()).padStart(2, '0');
      const m = String(dateObj.getMonth() + 1).padStart(2, '0');
      const y = dateObj.getFullYear();
      const h = String(dateObj.getHours()).padStart(2, '0');
      const min = String(dateObj.getMinutes()).padStart(2, '0');
      return `${d}/${m}/${y} ${h}:${min}`;
    } catch (e) {
      return fallbackDate;
    }
  };

  // State lists
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states for adding session
  const [targetType, setTargetType] = useState<"bia_muc_tieu" | "bia_giay">("bia_muc_tieu");
  const [distance, setDistance] = useState<number>(10);
  const [targetShots, setTargetShots] = useState<number>(10);
  const [customDistanceInput, setCustomDistanceInput] = useState("");
  const [showCustomDistance, setShowCustomDistance] = useState(false);
  const [customShotsInput, setCustomShotsInput] = useState("");
  const [showCustomShots, setShowCustomShots] = useState(false);
  const [analyticsTab, setAnalyticsTab] = useState<"trend" | "distance">("trend");
  
  // Computed target shots based on custom or quick selection
  const resolvedTargetShots = useMemo(() => {
    if (showCustomShots) {
      const parsed = parseInt(customShotsInput, 10);
      return isNaN(parsed) || parsed <= 0 ? 10 : parsed;
    }
    return targetShots;
  }, [showCustomShots, customShotsInput, targetShots]);

  // Interactive Hit/Miss states (for bia_muc_tieu)
  const [shots, setShots] = useState<boolean[]>([]);
  
  // Paper target states (for bia_giay)
  const [score, setScore] = useState<string>("");
  
  // General details
  const [notes, setNotes] = useState("");
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  
  // Filter and display states
  const [distanceFilter, setDistanceFilter] = useState<string>("all");
  const [targetTypeFilter, setTargetTypeFilter] = useState<string>("all");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Active hover tooltip state for trend graph
  const [hoveredPointIdx, setHoveredPointIdx] = useState<number | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [isAllHistoryModalOpen, setIsAllHistoryModalOpen] = useState(false);
  const [modalCurrentPage, setModalCurrentPage] = useState(1);

  // Reset pagination when filters or data length change
  useEffect(() => {
    setCurrentPage(1);
    setModalCurrentPage(1);
  }, [distanceFilter, targetTypeFilter]);

  // Pre-selected option arrays
  const quickDistances = [7, 10, 12, 15, 20, 25, 30];
  const quickShots = [5, 10, 15, 20, 30];

  // Subscribe to user's training sessions
  useEffect(() => {
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, "users", currentUser.uid, "training_sessions"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const list: TrainingSession[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as TrainingSession);
      });
      setSessions(list);
      setLoading(false);
    }, (error) => {
      console.error("Error subscribing to training sessions:", error);
      setLoading(false);
    });

    return () => unsub();
  }, [currentUser]);

  // Handle adding Hit/Miss (true for hit, false for miss)
  const handleAddShot = (isHit: boolean) => {
    if (shots.length >= resolvedTargetShots) {
      alert(isEng ? "You have reached the shot limit for this set!" : "Bạn đã bắn đủ số viên giới hạn cho lượt này!");
      return;
    }
    setShots([...shots, isHit]);
  };

  // Undo last shot
  const handleUndoShot = () => {
    if (shots.length > 0) {
      setShots(shots.slice(0, -1));
    }
  };

  // Reset current builder input
  const handleResetBuilder = () => {
    setShots([]);
    setScore("");
    setNotes("");
    setErrorMsg("");
    setSuccessMsg("");
  };

  // Computed values for current interactive builder
  const currentHits = shots.filter(s => s).length;
  const currentMisses = shots.filter(s => !s).length;
  const currentAccuracy = useMemo(() => {
    if (targetType === "bia_muc_tieu") {
      if (shots.length === 0) return 0;
      return Math.round((currentHits / shots.length) * 100);
    } else {
      const numScore = parseFloat(score) || 0;
      const maxScore = resolvedTargetShots * 10;
      if (maxScore === 0) return 0;
      return Math.round((numScore / maxScore) * 100);
    }
  }, [targetType, shots, score, resolvedTargetShots, currentHits]);

  // Save session to Firestore
  const handleSaveSession = async () => {
    if (!currentUser?.uid) {
      setErrorMsg(isEng ? "Please sign in to log training progress." : "Vui lòng đăng nhập để ghi nhận tiến trình tập luyện.");
      return;
    }

    setErrorMsg("");
    setSuccessMsg("");

    let resolvedDistance = distance;
    if (showCustomDistance) {
      const parsed = parseInt(customDistanceInput, 10);
      if (isNaN(parsed) || parsed <= 0) {
        setErrorMsg(isEng ? "Please enter a valid positive distance." : "Vui lòng nhập một cự ly hợp lệ.");
        return;
      }
      resolvedDistance = parsed;
    }

    let finalAccuracy = 0;
    let finalHits = 0;
    let finalMisses = 0;
    let finalScore = 0;
    let finalMaxScore = 0;

    if (targetType === "bia_muc_tieu") {
      if (shots.length === 0) {
        setErrorMsg(isEng ? "Please record at least one shot!" : "Vui lòng bắn và tích ít nhất một viên!");
        return;
      }
      finalHits = currentHits;
      finalMisses = currentMisses;
      finalAccuracy = Math.round((finalHits / shots.length) * 100);
    } else {
      const numScore = parseInt(score, 10);
      if (isNaN(numScore) || numScore < 0) {
        setErrorMsg(isEng ? "Please enter a valid numeric score." : "Vui lòng nhập một điểm số hợp lệ.");
        return;
      }
      finalMaxScore = resolvedTargetShots * 10;
      if (numScore > finalMaxScore) {
        setErrorMsg(
          isEng 
            ? `Score cannot exceed the maximum possible of ${finalMaxScore} (${resolvedTargetShots} shots x 10).` 
            : `Điểm số không được vượt quá tối đa ${finalMaxScore} điểm (${resolvedTargetShots} viên x 10).`
        );
        return;
      }
      finalScore = numScore;
      finalAccuracy = Math.round((finalScore / finalMaxScore) * 100);
    }

    setSaving(true);
    try {
      const sessionData = {
        userId: currentUser.uid,
        date: selectedDate,
        targetType,
        distance: resolvedDistance,
        targetShots: resolvedTargetShots,
        notes: notes.trim(),
        accuracy: finalAccuracy,
        createdAt: new Date().toISOString(), // Standard date sortable
      } as any;

      if (targetType === "bia_muc_tieu") {
        sessionData.shots = shots;
        sessionData.hitsCount = finalHits;
        sessionData.missesCount = finalMisses;
      } else {
        sessionData.score = finalScore;
        sessionData.maxScore = finalMaxScore;
      }

      await addDoc(collection(db, "users", currentUser.uid, "training_sessions"), sessionData);
      setSuccessMsg(isEng ? "Session saved successfully!" : "Ghi nhận lịch sử tập luyện thành công!");
      handleResetBuilder();
    } catch (err: any) {
      console.error("Error saving training session:", err);
      setErrorMsg(isEng ? `Failed to save: ${err.message}` : `Lỗi khi lưu dữ liệu: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Delete session
  const handleDeleteSession = async (id: string) => {
    if (!currentUser?.uid) return;
    try {
      await deleteDoc(doc(db, "users", currentUser.uid, "training_sessions", id));
      setDeleteConfirmId(null);
    } catch (err: any) {
      alert(isEng ? `Error deleting: ${err.message}` : `Lỗi khi xóa: ${err.message}`);
    }
  };

  // Filter logs
  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      const matchesDistance = distanceFilter === "all" || s.distance.toString() === distanceFilter;
      const matchesType = targetTypeFilter === "all" || s.targetType === targetTypeFilter;
      return matchesDistance && matchesType;
    });
  }, [sessions, distanceFilter, targetTypeFilter]);

  // Paginate filtered sessions
  const ITEMS_PER_PAGE = 100;
  const totalPages = Math.ceil(filteredSessions.length / ITEMS_PER_PAGE);
  const paginatedSessions = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredSessions.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredSessions, currentPage]);

  const modalTotalPages = Math.ceil(filteredSessions.length / ITEMS_PER_PAGE);
  const modalPaginatedSessions = useMemo(() => {
    const startIndex = (modalCurrentPage - 1) * ITEMS_PER_PAGE;
    return filteredSessions.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredSessions, modalCurrentPage]);

  // Aggregate stats
  const stats = useMemo(() => {
    if (sessions.length === 0) {
      return { totalSessions: 0, totalShots: 0, avgAccuracy: 0, bestDistance: "N/A" };
    }

    let totalShots = 0;
    let totalHitsOrScoreRatio = 0;
    let sumAccuracy = 0;
    const distanceAccuracies: Record<number, { sum: number; count: number }> = {};

    sessions.forEach(s => {
      totalShots += s.targetShots;
      sumAccuracy += s.accuracy;

      // Group for best distance
      if (!distanceAccuracies[s.distance]) {
        distanceAccuracies[s.distance] = { sum: 0, count: 0 };
      }
      distanceAccuracies[s.distance].sum += s.accuracy;
      distanceAccuracies[s.distance].count += 1;
    });

    const averageAccuracy = Math.round(sumAccuracy / sessions.length);

    // Find best distance
    let bestDist = "N/A";
    let maxAvg = -1;
    Object.keys(distanceAccuracies).forEach(distStr => {
      const distNum = parseInt(distStr, 10);
      const group = distanceAccuracies[distNum];
      const avg = group.sum / group.count;
      if (avg > maxAvg) {
        maxAvg = avg;
        bestDist = `${distNum}m (${Math.round(avg)}%)`;
      }
    });

    return {
      totalSessions: sessions.length,
      totalShots,
      avgAccuracy: averageAccuracy,
      bestDistance: bestDist
    };
  }, [sessions]);

  // AI Coach Insights memo block
  const coachInsights = useMemo(() => {
    if (sessions.length === 0) return null;

    // 1. Calculate accuracy consistency streak (consecutive sessions >= 70% from latest descending)
    let consistencyStreak = 0;
    for (let i = 0; i < sessions.length; i++) {
      if (sessions[i].accuracy >= 70) {
        consistencyStreak++;
      } else {
        break;
      }
    }

    // 2. Trend direction (Comparing last 3 sessions against overall average)
    let trend = "stable"; // "improving" | "stable" | "declining"
    if (sessions.length >= 3) {
      const last3Sum = sessions[0].accuracy + sessions[1].accuracy + sessions[2].accuracy;
      const last3Avg = last3Sum / 3;
      const overallAvg = stats.avgAccuracy;
      if (last3Avg > overallAvg + 4) {
        trend = "improving";
      } else if (last3Avg < overallAvg - 4) {
        trend = "declining";
      }
    }

    // 3. Motivational dynamic message from Coach
    let messageVi = "";
    let messageEn = "";

    if (stats.avgAccuracy >= 80) {
      messageVi = `Tuyệt đỉnh thiện xạ! Bạn đang sở hữu độ chính xác ấn tượng (${stats.avgAccuracy}%). Kỹ thuật kéo thun và ngắm bắn của bạn vô cùng chuẩn xác. Hãy thử sức ở các cự ly xa hơn (15m-20m) hoặc tham gia ngay Thách Đấu PK để khẳng định đẳng cấp nhé!`;
      messageEn = `Superb marksman! You maintain an outstanding average accuracy of ${stats.avgAccuracy}%. Your slinging form and release are highly locked in. Push your limits at 15m-20m ranges or start a PK challenge to showcase your skills!`;
    } else if (stats.avgAccuracy >= 65) {
      if (trend === "improving") {
        messageVi = `Phong độ đang lên như diều gặp gió! Các loạt bắn gần đây có sự tiến bộ vượt bậc so với trung bình của bạn. Hãy giữ nguyên tư thế vững chãi này và tập trung nín thở nhẹ khi nhả da nhé!`;
        messageEn = `Your form is rising fast! Your recent sets show impressive improvement over your average. Keep this solid stance and apply a gentle exhale pause as you release the pocket!`;
      } else {
        messageVi = `Phong độ luyện tập rất tốt và ổn định. Bạn đã có cảm giác thun và góc ngắm vững vàng. Hãy chú ý giữ điểm đặt má (anchor point) thật đồng nhất giữa các lượt bắn để gom đường đạn hẹp hơn nữa.`;
        messageEn = `Very solid and consistent performance. Your band feel and aiming alignment are firm. Ensure your anchor point is perfectly uniform between shots to group your hits even tighter.`;
      }
    } else {
      if (sessions.length < 3) {
        messageVi = `Khởi đầu rất tốt! Hãy tiếp tục duy trì thói quen tập luyện đều đặn hằng ngày và ghi thêm ít nhất 2-3 loạt bắn nữa. AI Coach sẽ có đủ dữ liệu để phân tích chi tiết phong độ cho bạn nhé!`;
        messageEn = `Excellent start! Continue your daily practice and log at least 2-3 more sets. AI Coach will unlock deeper performance feedback once enough data is compiled!`;
      } else if (trend === "declining") {
        messageVi = `Có vẻ bạn đang gặp chút dao động phong độ trong vài lượt bắn gần đây. Đừng nản lòng, đây là một phần tự nhiên trong quá trình luyện tập! Hãy thử giảm cự ly xuống chút ít, tập trung vào tư thế đứng thả lỏng và lực kéo thun thật đều.`;
        messageEn = `It seems your recent sets have fluctuated slightly. Don't be discouraged, it's a natural part of training! Try shortening the distance temporarily, focus on a relaxed stance, and pull the bands uniformly.`;
      } else {
        messageVi = `Hãy kiên trì luyện tập mỗi ngày! Để nâng cao tỉ lệ trúng, bạn nên kiểm tra lại độ vuông góc của thun, giữ tay cầm ná thật tĩnh sau khi buông da bắn (follow-through) ít nhất 1 giây. Sự kiên nhẫn sẽ đưa bạn đến đích!`;
        messageEn = `Stay persistent with your daily training! To boost accuracy, verify your band alignment and practice a clean 'follow-through' by holding your aiming arm steady for at least 1 second after release.`;
      }
    }

    // 4. Badges unlocked dynamically
    const badges = [];
    
    const hasPaperKing = sessions.some(s => s.targetType === "bia_giay" && s.accuracy >= 85);
    const hasMetalKing = sessions.some(s => s.targetType === "bia_muc_tieu" && s.accuracy >= 85);
    const hasLongRange = sessions.some(s => s.distance >= 15 && s.accuracy >= 75);
    const hasPersistence = sessions.length >= 8;

    if (hasPaperKing) {
      badges.push({
        id: "paper_king",
        titleVi: "Bách Phát Bách Trúng (Bia Giấy)",
        titleEn: "Paper Target Specialist",
        descVi: "Ghi điểm số xuất sắc >= 85% trên bia giấy chuyên nghiệp.",
        descEn: "Scored a high accurate set >= 85% on standard paper targets.",
        icon: "🎯",
        color: "from-blue-500 to-indigo-500"
      });
    }

    if (hasMetalKing) {
      badges.push({
        id: "metal_king",
        titleVi: "Thiện Xạ Bia Sắt",
        titleEn: "Metal Target Sniper",
        descVi: "Độ chính xác vượt bậc >= 85% trên bia mục tiêu.",
        descEn: "Hit an outstanding accuracy rate >= 85% on metal targets.",
        icon: "⚡",
        color: "from-amber-500 to-rose-500"
      });
    }

    if (hasLongRange) {
      badges.push({
        id: "long_range",
        titleVi: "Cao Thủ Cự Ly Xa",
        titleEn: "Long-Range Marksman",
        descVi: "Hoàn thành loạt bắn ở cự ly >= 15m với tỉ lệ trúng >= 75%.",
        descEn: "Completed a set at 15m or deeper with >= 75% accuracy.",
        icon: "🏹",
        color: "from-emerald-500 to-teal-500"
      });
    }

    if (hasPersistence) {
      badges.push({
        id: "persistence",
        titleVi: "Kỷ Luật Thép",
        titleEn: "Steel Discipline",
        descVi: "Kiên trì rèn luyện và ghi nhận từ 8 lượt tập luyện trở lên.",
        descEn: "Consistently practiced and logged 8 or more training sessions.",
        icon: "🔥",
        color: "from-purple-500 to-pink-500"
      });
    }

    return {
      consistencyStreak,
      trend,
      messageVi,
      messageEn,
      badges
    };
  }, [sessions, stats]);

  // Custom Chart Data: chronological sort
  const chartData = useMemo(() => {
    return [...sessions]
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(-15); // limit to last 15 sessions for readable trend
  }, [sessions]);

  // Custom Bar Chart Data: sorted by distance
  const distanceBarData = useMemo(() => {
    const map: Record<number, { sum: number; count: number }> = {};
    sessions.forEach(s => {
      if (!map[s.distance]) {
        map[s.distance] = { sum: 0, count: 0 };
      }
      map[s.distance].sum += s.accuracy;
      map[s.distance].count += 1;
    });

    return Object.keys(map)
      .map(distStr => {
        const dist = parseInt(distStr, 10);
        return {
          distance: dist,
          accuracy: Math.round(map[dist].sum / map[dist].count)
        };
      })
      .sort((a, b) => a.distance - b.distance);
  }, [sessions]);

  return (
    <div className="flex flex-col gap-6 text-slate-800 dark:text-slate-100">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col gap-1.5 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent p-5 rounded-3xl border border-emerald-100/40 dark:border-emerald-950/25">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-2xl bg-emerald-500 text-white shadow-sm">
            <Target className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-black uppercase tracking-wide">
              {isEng ? "🎯 PRACTICE TRAINING PROGRESS" : "🎯 TIẾN TRÌNH TẬP LUYỆN CÁ NHÂN"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isEng 
                ? "Self-discipline builds precision. Create logs, tap hits/misses or paper target points, and master consistency." 
                : "Kỷ luật tạo nên sự chính xác. Thiết lập buổi bắn, tích điểm trúng trượt hoặc điểm số bia giấy hàng ngày."}
            </p>
          </div>
        </div>
      </div>

      {/* QUICK OVERVIEW STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-4 rounded-2xl flex items-center gap-3 shadow-xs">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 rounded-xl">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">{isEng ? "Total Sets" : "Tổng Số Lượt"}</span>
            <span className="text-lg font-black">{stats.totalSessions}</span>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-4 rounded-2xl flex items-center gap-3 shadow-xs">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-xl">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">{isEng ? "Total Shots" : "Tổng Số Viên"}</span>
            <span className="text-lg font-black">{stats.totalShots}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-4 rounded-2xl flex items-center gap-3 shadow-xs">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-600 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">{isEng ? "Avg Accuracy" : "Độ Chính Xác TB"}</span>
            <span className="text-lg font-black text-emerald-600">{stats.avgAccuracy}%</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-4 rounded-2xl flex items-center gap-3 shadow-xs">
          <div className="p-3 bg-pink-50 dark:bg-pink-950/40 text-pink-600 rounded-xl">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">{isEng ? "Best Range" : "Cự Ly Tốt Nhất"}</span>
            <span className="text-sm font-black truncate max-w-[120px] block">{stats.bestDistance}</span>
          </div>
        </div>
      </div>

      {/* TWO COLUMN CONTENT: LEFT FORM CREATOR, RIGHT CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: INTERACTIVE LOGGER (LG:5) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm flex flex-col gap-5">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Plus className="w-5 h-5 text-emerald-500" />
            <h3 className="font-black text-sm uppercase tracking-wider">
              {isEng ? "Start Practice Set" : "BẮT ĐẦU LƯỢT TẬP LUYỆN"}
            </h3>
          </div>

          {/* Form setup */}
          <div className="flex flex-col gap-4">
            
            {/* Target Type selector */}
            <div>
              <label className="text-xs font-black uppercase text-slate-400 tracking-wider block mb-2">
                {isEng ? "Target Type" : "Loại Bia Bắn"}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { setTargetType("bia_muc_tieu"); handleResetBuilder(); }}
                  className={`py-2 px-3 rounded-xl text-xs font-extrabold border transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                    targetType === "bia_muc_tieu"
                      ? "bg-emerald-500 border-emerald-500 text-white shadow-sm"
                      : "bg-slate-50 dark:bg-slate-950/30 border-slate-200/50 dark:border-slate-800/60 hover:bg-slate-100"
                  }`}
                >
                  <Target className="w-4 h-4" />
                  <span>{isEng ? "Metal Target (Hit/Miss)" : "Bia Mục Tiêu (Trúng/Trượt)"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setTargetType("bia_giay"); handleResetBuilder(); }}
                  className={`py-2 px-3 rounded-xl text-xs font-extrabold border transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                    targetType === "bia_giay"
                      ? "bg-emerald-500 border-emerald-500 text-white shadow-sm"
                      : "bg-slate-50 dark:bg-slate-950/30 border-slate-200/50 dark:border-slate-800/60 hover:bg-slate-100"
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>{isEng ? "Paper Target (Points)" : "Bia Giấy (Tính Điểm)"}</span>
                </button>
              </div>
            </div>

            {/* Distance configuration */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-black uppercase text-slate-400 tracking-wider">
                  {isEng ? "Distance (meters)" : "Cự Ly Tập Luyện (mét)"}
                </label>
                <button
                  type="button"
                  onClick={() => setShowCustomDistance(!showCustomDistance)}
                  className="text-[10px] font-bold text-indigo-500 hover:underline"
                >
                  {showCustomDistance 
                    ? (isEng ? "Choose Quick" : "Chọn nhanh") 
                    : (isEng ? "Enter Custom" : "Tự nhập cự ly")}
                </button>
              </div>

              {showCustomDistance ? (
                <div className="relative">
                  <input
                    type="number"
                    placeholder={isEng ? "Enter meter (e.g. 15)" : "Nhập số mét cự ly (Ví dụ: 12, 17, ...)"}
                    value={customDistanceInput}
                    onChange={(e) => setCustomDistanceInput(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-950/30 border border-slate-200/50 dark:border-slate-800/60 rounded-xl focus:outline-none focus:border-indigo-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">m</span>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {quickDistances.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDistance(d)}
                      className={`px-3 py-1.5 text-xs font-extrabold rounded-lg border transition-all cursor-pointer ${
                        distance === d
                          ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/60 font-black scale-[1.03]"
                          : "bg-slate-50 dark:bg-slate-950/20 border-slate-100 dark:border-slate-800/50 text-slate-500"
                      }`}
                    >
                      {d}m
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Target shots configuration */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-black uppercase text-slate-400 tracking-wider">
                  {isEng ? "Total Shots Target" : "Giới Hạn Số Viên / Lượt"}
                </label>
                <button
                  type="button"
                  onClick={() => setShowCustomShots(!showCustomShots)}
                  className="text-[10px] font-bold text-indigo-500 hover:underline cursor-pointer"
                >
                  {showCustomShots 
                    ? (isEng ? "Choose Quick" : "Chọn nhanh") 
                    : (isEng ? "Enter Custom" : "Tự nhập số viên")}
                </button>
              </div>

              {showCustomShots ? (
                <div className="relative">
                  <input
                    type="number"
                    placeholder={isEng ? "Enter shots (e.g. 10)" : "Nhập số viên giới hạn (Ví dụ: 8, 12, ...)"}
                    value={customShotsInput}
                    onChange={(e) => {
                      setCustomShotsInput(e.target.value);
                      if (targetType === "bia_muc_tieu") {
                        setShots([]);
                      }
                    }}
                    className="w-full px-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-950/30 border border-slate-200/50 dark:border-slate-800/60 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    {isEng ? "shots" : "viên"}
                  </span>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {quickShots.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setTargetShots(s);
                        if (targetType === "bia_muc_tieu") {
                          setShots([]);
                        }
                      }}
                      className={`px-3.5 py-1.5 text-xs font-extrabold rounded-lg border transition-all cursor-pointer ${
                        targetShots === s && !showCustomShots
                          ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/60 font-black scale-[1.03]"
                          : "bg-slate-50 dark:bg-slate-950/20 border-slate-100 dark:border-slate-800/50 text-slate-500"
                      }`}
                    >
                      {s} {isEng ? "Shots" : "Viên"}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Date input (HIDDEN - Kept for schema compatibility but hidden from view) */}
            <div className="hidden">
              <label className="text-xs font-black uppercase text-slate-400 tracking-wider block mb-1.5">
                {isEng ? "Practice Date" : "Ngày Ghi Nhận Tập Luyện"}
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-950/30 border border-slate-200/50 dark:border-slate-800/60 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Ghi chú (Moved above the shot board / result block) */}
            <div>
              <label className="text-xs font-black uppercase text-slate-400 tracking-wider block mb-1.5">
                {isEng ? "Gear / Weather Notes (Optional)" : "Ghi Chú Loại Thun, Bi, Thời Tiết (Tùy chọn)"}
              </label>
              <textarea
                placeholder={isEng ? "e.g. Band 0.55, Steel Ammo 7.2mm, high wind" : "Ví dụ: thun 0.55-12-19, bi sắt 7, có gió nhẹ..."}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950/30 border border-slate-200/50 dark:border-slate-800/60 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100 resize-none"
              />
            </div>

            {/* INTERACTIVE SHOT BOARD FOR METAL TARGET */}
            {targetType === "bia_muc_tieu" && (
              <div className="bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/60 rounded-2xl p-4 flex flex-col gap-4">
                
                {/* Shots Matrix Indicator */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {isEng ? "Shot Matrix" : "Kết quả loạt bắn"} ({shots.length}/{resolvedTargetShots})
                    </span>
                    <span className="text-xs font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                      {isEng ? "Acc" : "Tỉ Lệ"}: {currentAccuracy}%
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 justify-center py-2 min-h-[44px] items-center bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    {Array.from({ length: resolvedTargetShots }).map((_, idx) => {
                      const wasShot = idx < shots.length;
                      const isHit = wasShot && shots[idx];

                      return (
                        <div
                          key={idx}
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold shadow-xs transition-all ${
                            !wasShot
                              ? "bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 text-slate-300"
                              : isHit
                              ? "bg-emerald-500 text-white border-2 border-emerald-400 animate-bounceIn"
                              : "bg-rose-500 text-white border-2 border-rose-400 animate-bounceIn"
                          }`}
                        >
                          {!wasShot ? idx + 1 : isHit ? "🎯" : "❌"}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* HIT & MISS BIG ACTION BUTTONS */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleAddShot(true)}
                    disabled={shots.length >= resolvedTargetShots}
                    className="py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl text-sm transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer flex flex-col items-center justify-center gap-1"
                  >
                    <span className="text-xl">🎯</span>
                    <span>{isEng ? "HIT" : "TRÚNG (+1)"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddShot(false)}
                    disabled={shots.length >= resolvedTargetShots}
                    className="py-4 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-xl text-sm transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer flex flex-col items-center justify-center gap-1"
                  >
                    <span className="text-xl">❌</span>
                    <span>{isEng ? "MISS" : "TRƯỢT (0)"}</span>
                  </button>
                </div>

                {/* Interactive Stats & Undo */}
                <div className="flex justify-between items-center">
                  <div className="text-[10px] font-bold text-slate-400">
                    {isEng ? "Hits" : "Trúng"}: <span className="text-emerald-500 text-xs font-black">{currentHits}</span> | {isEng ? "Misses" : "Trượt"}: <span className="text-rose-500 text-xs font-black">{currentMisses}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleUndoShot}
                    disabled={shots.length === 0}
                    className="text-xs font-bold text-indigo-500 hover:text-indigo-600 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1 cursor-pointer"
                  >
                    <Undo className="w-3.5 h-3.5" />
                    <span>{isEng ? "Undo Last" : "Hoàn tác"}</span>
                  </button>
                </div>

              </div>
            )}

            {/* INPUT FIELD FOR PAPER TARGET */}
            {targetType === "bia_giay" && (
              <div className="bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/60 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
                    {isEng ? "Paper Scoring Details" : "Nhập điểm số bia giấy"}
                  </span>
                  <span className="text-xs font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                    {isEng ? "Accuracy" : "Tỉ Lệ"}: {currentAccuracy}%
                  </span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-[11px] font-bold text-slate-400">
                    <span>{isEng ? "Scored Points" : "Điểm Số Ghi Nhận"}</span>
                    <span>{isEng ? `Max: ${resolvedTargetShots * 10} pts` : `Tối đa: ${resolvedTargetShots * 10} điểm`}</span>
                  </div>
                  
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max={resolvedTargetShots * 10}
                      placeholder={isEng ? "Enter total score" : `Nhập tổng điểm (Ví dụ: 87, 95)`}
                      value={score}
                      onChange={(e) => setScore(e.target.value)}
                      className="w-full px-4 py-3 bg-white dark:bg-slate-950/60 border border-slate-200/50 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 font-bold text-base text-slate-850 dark:text-slate-100"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                      / {resolvedTargetShots * 10}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-normal italic mt-1">
                    {isEng 
                      ? "* Maximum score is calculated as [Shot limit x 10 points]" 
                      : "* Điểm số tối đa bia giấy tự động nhân hệ số: [Số viên giới hạn x 10 điểm]"}
                  </p>
                </div>
              </div>
            )}

            {/* STATUS FEEDBACK */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/40 text-[11px] font-bold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40 text-[11px] font-bold flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* ACTION BUTTONS */}
            <div className="flex gap-2.5 mt-2">
              <button
                type="button"
                onClick={handleResetBuilder}
                className="px-4 py-2.5 text-xs font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl transition-all hover:bg-slate-200 active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{isEng ? "Reset" : "Làm lại"}</span>
              </button>
              
              <button
                type="button"
                onClick={handleSaveSession}
                disabled={saving}
                className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-black rounded-xl transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>🎯</span>
                <span>{saving ? (isEng ? "Saving..." : "Đang ghi...") : (isEng ? "Record Practice Log" : "GHI LẠI LỊCH SỬ")}</span>
              </button>
            </div>

          </div>

        </div>

        {/* RIGHT COLUMN: GRAPHS & LOGS (LG:7) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* CHARTS CONTAINER (Tabbed Trend or Distance comparison) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-500" />
                <h3 className="font-black text-sm uppercase tracking-wider">
                  {isEng ? "Practice Performance Analytics" : "PHÂN TÍCH HIỆU SUẤT TẬP LUYỆN"}
                </h3>
              </div>
              
              {/* TABS SELECTOR */}
              {sessions.length >= 2 && (
                <div className="flex bg-slate-50 dark:bg-slate-950 p-1 rounded-xl border border-slate-100 dark:border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => setAnalyticsTab("trend")}
                    className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                      analyticsTab === "trend"
                        ? "bg-indigo-500 text-white shadow-sm"
                        : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400"
                    }`}
                  >
                    {isEng ? "Accuracy Trend" : "Biến Thiên Tỉ Lệ Trúng (%)"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnalyticsTab("distance")}
                    className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                      analyticsTab === "distance"
                        ? "bg-indigo-500 text-white shadow-sm"
                        : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400"
                    }`}
                  >
                    {isEng ? "By Distance" : "Hiệu Suất Theo Cự Ly (%)"}
                  </button>
                </div>
              )}
            </div>

            {sessions.length < 2 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
                <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-950 flex items-center justify-center border border-slate-100 dark:border-slate-800">
                  <BarChart2 className="w-5 h-5 text-slate-300" />
                </div>
                <div className="text-slate-400 max-w-sm">
                  <p className="text-xs font-black">{isEng ? "Charts need more logs" : "Biểu đồ cần nhiều dữ liệu hơn"}</p>
                  <p className="text-[10px] mt-1 leading-normal">
                    {isEng 
                      ? "Log at least 2 practice sessions to plot progress trends and compare performance across various shooting distances." 
                      : "Ghi nhận ít nhất 2 phiên tập luyện để vẽ đồ thị tiến trình phong độ và so sánh tỉ lệ trúng ở các cự ly bắn."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="w-full">
                
                {/* 1. PROGRESS TREND GRAPH (CUSTOM SVG LINE CHART) */}
                {analyticsTab === "trend" && (
                  <div className="flex flex-col gap-2 animate-fadeIn">
                    <div className="flex flex-col mb-1">
                      <span className="text-xs font-black text-slate-500">{isEng ? "Accuracy Trend (%)" : "Biến Thiên Tỉ Lệ Trúng (%)"}</span>
                      <span className="text-[9px] text-slate-400 italic">{isEng ? "Last 15 sessions chronologically" : "15 loạt bắn gần nhất theo mốc thời gian (bao gồm giờ phút)"}</span>
                    </div>

                    <div className="relative h-56 bg-slate-50 dark:bg-slate-950/30 p-2 rounded-xl border border-slate-100 dark:border-slate-800/40">
                      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        {/* Gridlines */}
                        <line x1="0" y1="25" x2="100" y2="25" stroke="#94a3b8" strokeOpacity="0.15" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
                        <line x1="0" y1="50" x2="100" y2="50" stroke="#94a3b8" strokeOpacity="0.15" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
                        <line x1="0" y1="75" x2="100" y2="75" stroke="#94a3b8" strokeOpacity="0.15" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />

                        {/* Line Path */}
                        {(() => {
                          const pointsCount = chartData.length;
                          if (pointsCount === 0) return null;
                          
                          const points = chartData.map((item, idx) => {
                            const x = pointsCount > 1 ? (idx / (pointsCount - 1)) * 90 + 5 : 50;
                            // In SVG 0 is at top, 100 is at bottom. Map 0-100 accuracy to 90-10 SVG space
                            const y = 90 - (item.accuracy / 100) * 80;
                            return { x, y, accuracy: item.accuracy, date: item.date, createdAt: item.createdAt };
                          });

                          const dPath = points.reduce((acc, p, idx) => {
                            return acc + (idx === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`);
                          }, "");

                          return (
                            <>
                              {/* Smooth gradient fill underneath the trend line */}
                              <path
                                d={`${dPath} L ${points[points.length - 1].x} 90 L ${points[0].x} 90 Z`}
                                fill="url(#trendGrad)"
                                opacity="0.15"
                              />
                              
                              {/* Linear path definition */}
                              <path
                                d={dPath}
                                fill="none"
                                stroke="url(#lineGrad)"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                vectorEffect="non-scaling-stroke"
                              />

                              {/* Gradient definitions */}
                              <defs>
                                <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#10b981" />
                                  <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                                </linearGradient>
                                <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                                  <stop offset="0%" stopColor="#3b82f6" />
                                  <stop offset="100%" stopColor="#10b981" />
                                </linearGradient>
                              </defs>
                            </>
                          );
                        })()}
                      </svg>

                      {/* Perfectly round HTML points laid over the SVG to prevent stretch/distortion */}
                      {(() => {
                        const pointsCount = chartData.length;
                        if (pointsCount === 0) return null;

                        return chartData.map((item, idx) => {
                          const x = pointsCount > 1 ? (idx / (pointsCount - 1)) * 90 + 5 : 50;
                          const y = 90 - (item.accuracy / 100) * 80;
                          const isHovered = hoveredPointIdx === idx;

                          return (
                            <div
                              key={idx}
                              style={{ left: `${x}%`, top: `${y}%` }}
                              onMouseEnter={() => setHoveredPointIdx(idx)}
                              onMouseLeave={() => setHoveredPointIdx(null)}
                              onTouchStart={() => setHoveredPointIdx(idx)}
                              className={`absolute -translate-x-1/2 -translate-y-1/2 w-4.5 h-4.5 flex items-center justify-center cursor-pointer transition-all duration-150 ${
                                isHovered ? "scale-125 z-20" : "z-10"
                              }`}
                            >
                              <span className={`w-2.5 h-2.5 rounded-full border border-white dark:border-slate-900 shadow-md transition-all ${
                                isHovered 
                                  ? "bg-indigo-500 w-3.5 h-3.5 scale-110" 
                                  : "bg-emerald-500 hover:bg-indigo-500"
                              }`} />
                            </div>
                          );
                        });
                      })()}

                      {/* Left vertical legend helper */}
                      <div className="absolute left-1 top-1 bottom-1 flex flex-col justify-between text-[7px] text-slate-400 font-bold pointer-events-none">
                        <span>100%</span>
                        <span>50%</span>
                        <span>0%</span>
                      </div>

                      {/* Tooltip Overlay */}
                      {hoveredPointIdx !== null && chartData[hoveredPointIdx] && (
                        <div className="absolute bottom-2 right-2 bg-slate-900/95 border border-slate-800 text-[9px] text-white p-2 rounded-lg shadow-xl flex flex-col pointer-events-none max-w-[170px] animate-fadeIn z-10">
                          <span className="font-bold border-b border-slate-800 pb-0.5 mb-1 text-emerald-400">
                            {formatDateTime(chartData[hoveredPointIdx].createdAt, chartData[hoveredPointIdx].date)}
                          </span>
                          <span>{isEng ? "Acc" : "Độ chính xác"}: <span className="font-black text-emerald-400">{chartData[hoveredPointIdx].accuracy}%</span></span>
                          <span>{isEng ? "Range" : "Cự ly"}: {chartData[hoveredPointIdx].distance}m</span>
                          <span>
                            {chartData[hoveredPointIdx].targetType === "bia_muc_tieu" 
                              ? `${isEng ? "Hits" : "Trúng"}: ${chartData[hoveredPointIdx].hitsCount}/${chartData[hoveredPointIdx].targetShots}`
                              : `${isEng ? "Score" : "Điểm"}: ${chartData[hoveredPointIdx].score}/${chartData[hoveredPointIdx].maxScore}`}
                          </span>
                        </div>
                      )}
                    </div>
                    <span className="text-[9px] text-slate-400 self-center mt-1">
                      {isEng ? "← Older sessions  |  Newer sessions →" : "← Loạt bắn xa xưa  |  Loạt bắn gần đây nhất →"}
                    </span>
                  </div>
                )}

                {/* 2. ACCURACY BY DISTANCE BAR CHART (CUSTOM SVG BAR CHART) */}
                {analyticsTab === "distance" && (
                  <div className="flex flex-col gap-2 animate-fadeIn">
                    <div className="flex flex-col mb-1">
                      <span className="text-xs font-black text-slate-500">{isEng ? "Efficiency by Distance (%)" : "Hiệu Suất Theo Cự Ly (%)"}</span>
                      <span className="text-[9px] text-slate-400 italic">{isEng ? "Compare average accuracy across all shooting distances" : "So sánh độ chính xác trung bình theo từng cự ly bắn khác nhau"}</span>
                    </div>

                    <div className="h-56 bg-slate-50 dark:bg-slate-950/30 p-4 rounded-xl border border-slate-100 dark:border-slate-800/40 relative flex flex-col justify-end">
                      
                      {distanceBarData.length === 0 ? (
                        <div className="absolute inset-0 flex items-center justify-center text-[10px] text-slate-400">{isEng ? "No distance data available" : "Chưa có dữ liệu cự ly"}</div>
                      ) : (
                        <div className="flex items-end justify-around h-36 px-4 pb-1">
                          {distanceBarData.map((bar, idx) => {
                            const heightPct = Math.max(5, bar.accuracy); // Min height of 5% for readability
                            return (
                              <div key={idx} className="flex flex-col items-center gap-1.5 w-[45px] group relative cursor-help">
                                {/* Hover Tooltip inside bar */}
                                <div className="text-[9px] font-black bg-slate-900 text-white px-1.5 py-0.5 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 text-center pointer-events-none shadow-md z-10">
                                  {bar.accuracy}%
                                </div>
                                
                                {/* Bar Pillar with an explicit height wrapper of h-28 */}
                                <div className="w-full relative bg-slate-200/60 dark:bg-slate-800/60 rounded-t-md overflow-hidden h-28 flex items-end">
                                  <div
                                    style={{ height: `${heightPct}%` }}
                                    className="w-full bg-gradient-to-t from-indigo-500 to-emerald-400 rounded-t-md transition-all duration-500"
                                  />
                                </div>

                                {/* Label */}
                                <span className="text-[9px] font-bold text-slate-500">{bar.distance}m</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      
                      {/* Horizontal separator */}
                      <div className="border-t border-slate-200 dark:border-slate-800/80 w-full" />
                      
                      {/* Stat indicator label */}
                      <div className="flex justify-between text-[8px] text-slate-400 font-bold mt-1 px-1">
                        <span>{isEng ? "Short Range" : "Cự ly gần"}</span>
                        <span>{isEng ? "Accuracy average (%)" : "Tỉ lệ chính xác trung bình (%)"}</span>
                        <span>{isEng ? "Long Range" : "Cự ly xa"}</span>
                      </div>

                    </div>
                  </div>
                )}

              </div>
            )}

          </div>

          {/* AI COACH & DEEP ANALYTICS CONTAINER */}
          {sessions.length > 0 && coachInsights && (
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm flex flex-col gap-5">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
                <div>
                  <h3 className="font-black text-sm uppercase tracking-wider text-slate-800 dark:text-slate-100">
                    {isEng ? "AI Coach & Performance Insights" : "TRỢ LÝ HUẤN LUYỆN VIÊN AI & PHÂN TÍCH CHUYÊN SÂU"}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                    {isEng ? "Advanced slinging analytics & professional advice" : "Phân tích kỹ thuật & phản hồi chuyên môn tự động"}
                  </p>
                </div>
              </div>

              {/* Bento-style Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* 1. Consistency Streak */}
                <div className="bg-slate-50/50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/60 p-4 rounded-2xl flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                    <Flame className="w-4 h-4 text-orange-500" />
                    <span className="text-[10px] font-black uppercase tracking-wider">{isEng ? "Aim Consistency" : "Chuỗi Phong Độ Ổn Định"}</span>
                  </div>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-black text-slate-800 dark:text-slate-100">
                      {coachInsights.consistencyStreak}
                    </span>
                    <span className="text-xs font-bold text-slate-400">{isEng ? "sets" : "loạt bắn"}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 italic mt-1 font-semibold">
                    {isEng ? "Consecutive sets with accuracy ≥ 70%" : "Số loạt bắn liên tiếp đạt tỉ lệ trúng ≥ 70%"}
                  </p>
                </div>

                {/* 2. Aim Trend */}
                <div className="bg-slate-50/50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/60 p-4 rounded-2xl flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                    <Activity className="w-4 h-4 text-indigo-500" />
                    <span className="text-[10px] font-black uppercase tracking-wider">{isEng ? "Recent Trend" : "Xu Hướng Gần Đây"}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`px-2.5 py-0.5 rounded-lg text-xs font-black uppercase tracking-wider ${
                      coachInsights.trend === "improving"
                        ? "bg-emerald-500 text-white"
                        : coachInsights.trend === "declining"
                          ? "bg-rose-500 text-white"
                          : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                    }`}>
                      {coachInsights.trend === "improving" 
                        ? (isEng ? "Improving" : "Thăng tiến") 
                        : coachInsights.trend === "declining" 
                          ? (isEng ? "Fluctuating" : "Dao động") 
                          : (isEng ? "Consistent" : "Ổn định")}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 italic mt-2.5 font-semibold">
                    {isEng ? "Comparing latest 3 sets with overall avg" : "So sánh phong độ 3 loạt gần nhất với trung bình"}
                  </p>
                </div>

                {/* 3. Mastery Range */}
                <div className="bg-slate-50/50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/60 p-4 rounded-2xl flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                    <Target className="w-4 h-4 text-emerald-500" />
                    <span className="text-[10px] font-black uppercase tracking-wider">{isEng ? "Range Mastery" : "Cự Ly Đắc Lực Nhất"}</span>
                  </div>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-md sm:text-lg font-black text-slate-800 dark:text-slate-100 truncate max-w-full">
                      {stats.bestDistance}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 italic mt-2.5 font-semibold">
                    {isEng ? "Distance with highest avg accuracy" : "Cự ly có tỉ lệ trúng trung bình cao nhất"}
                  </p>
                </div>

              </div>

              {/* Coach Conversational Message */}
              <div className="p-4 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/10 border border-indigo-100/40 dark:border-indigo-900/30 flex gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-500/10 dark:bg-indigo-400/10 flex items-center justify-center shrink-0 text-indigo-500 dark:text-indigo-400">
                  <ThumbsUp className="w-4 h-4" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                    {isEng ? "Coach's Slingshot Tip" : "Lời khuyên từ Huấn luyện viên AI"}
                  </span>
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-bold leading-relaxed">
                    {isEng ? coachInsights.messageEn : coachInsights.messageVi}
                  </p>
                </div>
              </div>

              {/* Achieved Badges */}
              {coachInsights.badges.length > 0 && (
                <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-amber-500" />
                    {isEng ? "Unlocked Slingshot Achievements" : "DANH HIỆU THIỆN XẠ ĐÃ ĐẠT ĐƯỢC"}
                  </span>
                  
                  <div className="flex flex-wrap gap-2 mt-1">
                    {coachInsights.badges.map(b => (
                      <div 
                        key={b.id} 
                        className="group relative flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 cursor-help"
                      >
                        <span className="text-base">{b.icon}</span>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-800 dark:text-slate-200">
                            {isEng ? b.titleEn : b.titleVi}
                          </span>
                        </div>
                        
                        {/* Hover Tooltip explaining badge */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-900 text-white text-[9px] font-bold rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 shadow-md z-30">
                          {isEng ? b.descEn : b.descVi}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* HISTORICAL LOG LIST */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
            
            {/* Header + Filter controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3.5">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-slate-500" />
                <h3 className="font-black text-sm uppercase tracking-wider">
                  {isEng ? "Practice Log History" : "LỊCH SỬ NHẬT KÝ TẬP LUYỆN"}
                </h3>
                <span className="text-xs font-bold text-slate-400 bg-slate-50 dark:bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-100 dark:border-slate-800/50">
                  {filteredSessions.length}
                </span>
              </div>

              {/* Filters inline */}
              <div className="flex gap-2 w-full sm:w-auto">
                <select
                  value={distanceFilter}
                  onChange={(e) => setDistanceFilter(e.target.value)}
                  className="px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-950/40 border border-slate-200/50 dark:border-slate-800/60 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-600 dark:text-slate-300 font-bold"
                >
                  <option value="all">{isEng ? "All Distances" : "Tất cả cự ly"}</option>
                  {Array.from(new Set(sessions.map(s => Number(s.distance) || 0))).sort((a: number, b: number) => a - b).map(dist => (
                    <option key={dist} value={dist.toString()}>{dist}m</option>
                  ))}
                </select>

                <select
                  value={targetTypeFilter}
                  onChange={(e) => setTargetTypeFilter(e.target.value)}
                  className="px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-950/40 border border-slate-200/50 dark:border-slate-800/60 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-600 dark:text-slate-300 font-bold"
                >
                  <option value="all">{isEng ? "All Targets" : "Tất cả bia"}</option>
                  <option value="bia_muc_tieu">{isEng ? "Metal Target" : "Bia mục tiêu"}</option>
                  <option value="bia_giay">{isEng ? "Paper Target" : "Bia giấy"}</option>
                </select>
              </div>
            </div>

            {/* List */}
            {loading ? (
              <div className="text-center py-8 text-xs text-slate-400 font-bold flex items-center justify-center gap-1.5">
                <span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                <span>{isEng ? "Loading sessions..." : "Đang tải danh sách..."}</span>
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs font-bold bg-slate-50/50 dark:bg-slate-950/20 p-5 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                {isEng ? "No practice logs found matching filters." : "Không tìm thấy nhật ký tập luyện nào khớp bộ lọc."}
              </div>
            ) : (
              <div className={totalPages > 1 ? "space-y-3.5" : "max-h-[360px] overflow-y-auto pr-1 space-y-3.5"}>
                {paginatedSessions.map((session) => {
                  const isPaper = session.targetType === "bia_giay";
                  
                  return (
                    <div
                      key={session.id}
                      className="group relative bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60 flex flex-col gap-2.5 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs transition-all"
                    >
                      {/* Row 1: Header - Date-Time & Accuracy far right */}
                      <div className="flex justify-between items-center gap-4">
                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200 font-extrabold text-xs sm:text-sm">
                          <Clock className="w-3.5 h-3.5 text-indigo-500" />
                          <span>{formatDateTime(session.createdAt, session.date)}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {/* Delete Action inside confirm dialog or normal */}
                          {deleteConfirmId === session.id ? (
                            <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/40 p-1 rounded-lg border border-rose-100 dark:border-rose-900/30">
                              <span className="text-[9px] font-black text-rose-600 dark:text-rose-400 px-1">{isEng ? "Sure?" : "Xóa?"}</span>
                              <button
                                onClick={() => handleDeleteSession(session.id)}
                                className="px-1.5 py-0.5 bg-rose-500 text-white text-[9px] font-black rounded-md hover:bg-rose-600 cursor-pointer"
                              >
                                {isEng ? "Yes" : "Có"}
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[9px] font-black rounded-md hover:bg-slate-300 cursor-pointer"
                              >
                                {isEng ? "No" : "Hủy"}
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(session.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all cursor-pointer"
                              title={isEng ? "Delete Session" : "Xóa lịch sử"}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Accuracy Badge (Far Right) */}
                          <div className={`px-2.5 py-0.5 rounded-lg text-xs font-black shadow-3xs ${
                            session.accuracy >= 80
                              ? "bg-emerald-500 text-white"
                              : session.accuracy >= 50
                              ? "bg-indigo-500 text-white"
                              : "bg-slate-500 text-white"
                          }`}>
                            {session.accuracy}%
                          </div>
                        </div>
                      </div>

                      {/* Row 2: Secondary stats horizontal block: Target Type, Distance, Shots, Hits/Score */}
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        {/* Target Type badge */}
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                          isPaper
                            ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100/30 dark:border-blue-900/40"
                            : "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-100/30 dark:border-amber-900/40"
                        }`}>
                          {isPaper ? (isEng ? "Paper" : "Bia Giấy") : (isEng ? "Metal" : "Bia Mục Tiêu")}
                        </span>
                        
                        <span className="text-slate-300">•</span>
                        
                        {/* Distance */}
                        <span className="flex items-center gap-0.5 text-slate-600 dark:text-slate-300">
                          <MapPin className="w-3 h-3 text-rose-500" />
                          <span>{session.distance}m</span>
                        </span>

                        <span className="text-slate-300">•</span>

                        {/* Total shots */}
                        <span className="text-slate-600 dark:text-slate-300">
                          {isEng ? "Shots" : "Đạn"}: <span className="font-extrabold text-slate-800 dark:text-slate-100">{session.targetShots} viên</span>
                        </span>

                        <span className="text-slate-300">•</span>

                        {/* Hits / Score */}
                        <span className="text-slate-600 dark:text-slate-300">
                          {isPaper ? (
                            <>
                              {isEng ? "Score" : "Điểm"}: <span className="font-extrabold text-indigo-600 dark:text-indigo-400">{session.score}/{session.maxScore}</span>
                            </>
                          ) : (
                            <>
                              {isEng ? "Hits" : "Trúng"}: <span className="font-extrabold text-emerald-500">{session.hitsCount}/{session.targetShots} viên</span>
                            </>
                          )}
                        </span>
                      </div>

                      {/* Row 3: Notes (If any, displayed last) */}
                      {session.notes && (
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 italic bg-slate-50/50 dark:bg-slate-950/40 px-3 py-1.5 rounded-xl border border-slate-100/40 dark:border-slate-800/40 mt-0.5">
                          "{session.notes}"
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination Controls */}
            {!loading && totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-2 gap-3">
                <div className="text-[11px] font-bold text-slate-400">
                  {isEng 
                    ? `Showing ${(currentPage - 1) * ITEMS_PER_PAGE + 1}-${Math.min(currentPage * ITEMS_PER_PAGE, filteredSessions.length)} of ${filteredSessions.length}` 
                    : `Hiển thị ${(currentPage - 1) * ITEMS_PER_PAGE + 1}-${Math.min(currentPage * ITEMS_PER_PAGE, filteredSessions.length)} trên ${filteredSessions.length}`}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => {
                      setCurrentPage(prev => Math.max(1, prev - 1));
                    }}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-indigo-500 hover:border-indigo-500 disabled:opacity-40 disabled:hover:text-slate-500 disabled:hover:border-slate-200 dark:disabled:hover:border-slate-800 transition-all cursor-pointer bg-slate-50 dark:bg-slate-950"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  
                  {Array.from({ length: totalPages }).map((_, idx) => {
                    const pageNum = idx + 1;
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-7 h-7 flex items-center justify-center text-xs font-black rounded-lg transition-all cursor-pointer ${
                          currentPage === pageNum
                            ? "bg-indigo-500 text-white shadow-xs"
                            : "bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200/40 dark:border-slate-800/60"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => {
                      setCurrentPage(prev => Math.min(totalPages, prev + 1));
                    }}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-indigo-500 hover:border-indigo-500 disabled:opacity-40 disabled:hover:text-slate-500 disabled:hover:border-slate-200 dark:disabled:hover:border-slate-800 transition-all cursor-pointer bg-slate-50 dark:bg-slate-950"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* View All History Button */}
            {sessions.length > 0 && (
              <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-2 flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setModalCurrentPage(1);
                    setIsAllHistoryModalOpen(true);
                  }}
                  className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-200/60 dark:border-slate-800 text-indigo-600 dark:text-indigo-400 text-xs font-black rounded-xl transition-all active:scale-98 shadow-2xs hover:shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>📂</span>
                  <span>{isEng ? "View All History Logs in Viewport" : "XEM TẤT CẢ LỊCH SỬ TẬP LUYỆN"}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

          </div>

        </div>

      </div>

      {/* PORTAL MODAL - COMPLETE PRACTICE HISTORY */}
      {isAllHistoryModalOpen && createPortal(
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] animate-fadeIn">
          {/* Click outside to close */}
          <div className="absolute inset-0" onClick={() => setIsAllHistoryModalOpen(false)} />
          
          <div className="relative bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col p-6 overflow-hidden z-10 animate-scaleIn">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-500" />
                <div>
                  <h3 className="font-black text-sm sm:text-base uppercase tracking-wider text-slate-800 dark:text-slate-100">
                    {isEng ? "Complete Training History Logs" : "TOÀN BỘ LỊCH SỬ NHẬT KÝ TẬP LUYỆN"}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                    {isEng 
                      ? `Showing up to 100 entries per page • ${filteredSessions.length} total logs` 
                      : `Hiển thị tối đa 100 mục mỗi trang • Tổng cộng ${filteredSessions.length} loạt bắn`}
                  </p>
                </div>
              </div>
              
              <button
                type="button"
                onClick={() => setIsAllHistoryModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Synchronized Filter Indicators */}
            {(distanceFilter !== "all" || targetTypeFilter !== "all") && (
              <div className="flex flex-wrap gap-2 py-2.5 px-1 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <span>{isEng ? "Filters applied" : "Đang lọc theo"}:</span>
                {distanceFilter !== "all" && (
                  <span className="bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-md border border-indigo-100/30">
                    {isEng ? `Distance` : `Cự ly`}: {distanceFilter}m
                  </span>
                )}
                {targetTypeFilter !== "all" && (
                  <span className="bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-md border border-amber-100/30">
                    {isEng ? `Target` : `Bia`}: {targetTypeFilter === "bia_giay" ? (isEng ? "Paper" : "Bia Giấy") : (isEng ? "Metal" : "Bia Mục Tiêu")}
                  </span>
                )}
              </div>
            )}

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto pr-1 py-4 space-y-3.5">
              {modalPaginatedSessions.map((session) => {
                const isPaper = session.targetType === "bia_giay";
                return (
                  <div
                    key={session.id}
                    className="group relative bg-slate-50/40 dark:bg-slate-950/20 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60 flex flex-col gap-2.5 hover:border-slate-200 dark:hover:border-slate-800 transition-all"
                  >
                    <div className="flex justify-between items-center gap-4">
                      <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200 font-extrabold text-xs sm:text-sm">
                        <Clock className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{formatDateTime(session.createdAt, session.date)}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {deleteConfirmId === session.id ? (
                          <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/40 p-1 rounded-lg border border-rose-100 dark:border-rose-900/30">
                            <span className="text-[9px] font-black text-rose-600 dark:text-rose-400 px-1">{isEng ? "Sure?" : "Xóa?"}</span>
                            <button
                              onClick={() => handleDeleteSession(session.id)}
                              className="px-1.5 py-0.5 bg-rose-500 text-white text-[9px] font-black rounded-md hover:bg-rose-600 cursor-pointer"
                            >
                              {isEng ? "Yes" : "Có"}
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[9px] font-black rounded-md hover:bg-slate-300 cursor-pointer"
                            >
                              {isEng ? "No" : "Hủy"}
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(session.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all cursor-pointer"
                            title={isEng ? "Delete Session" : "Xóa lịch sử"}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <div className={`px-2.5 py-0.5 rounded-lg text-xs font-black shadow-3xs ${
                          session.accuracy >= 80
                            ? "bg-emerald-500 text-white"
                            : session.accuracy >= 50
                            ? "bg-indigo-500 text-white"
                            : "bg-slate-500 text-white"
                        }`}>
                          {session.accuracy}%
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                        isPaper
                          ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100/30 dark:border-blue-900/40"
                          : "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-100/30 dark:border-amber-900/40"
                      }`}>
                        {isPaper ? (isEng ? "Paper" : "Bia Giấy") : (isEng ? "Metal" : "Bia Mục Tiêu")}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="flex items-center gap-0.5 text-slate-600 dark:text-slate-300">
                        <MapPin className="w-3 h-3 text-rose-500" />
                        <span>{session.distance}m</span>
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-600 dark:text-slate-300">
                        {isEng ? "Shots" : "Đạn"}: <span className="font-extrabold text-slate-800 dark:text-slate-100">{session.targetShots} viên</span>
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-600 dark:text-slate-300">
                        {isPaper ? (
                          <>{isEng ? "Score" : "Điểm"}: <span className="font-extrabold text-indigo-600 dark:text-indigo-400">{session.score}/{session.maxScore}</span></>
                        ) : (
                          <>{isEng ? "Hits" : "Trúng"}: <span className="font-extrabold text-emerald-500">{session.hitsCount}/{session.targetShots} viên</span></>
                        )}
                      </span>
                    </div>

                    {session.notes && (
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 italic bg-slate-50/50 dark:bg-slate-950/40 px-3 py-1.5 rounded-xl border border-slate-100/40 dark:border-slate-800/40 mt-0.5">
                        "{session.notes}"
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Modal Footer Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4 mt-2 gap-3 shrink-0">
              <div className="text-[11px] font-bold text-slate-400">
                {isEng 
                  ? `Showing ${(modalCurrentPage - 1) * ITEMS_PER_PAGE + 1}-${Math.min(modalCurrentPage * ITEMS_PER_PAGE, filteredSessions.length)} of ${filteredSessions.length}` 
                  : `Hiển thị ${(modalCurrentPage - 1) * ITEMS_PER_PAGE + 1}-${Math.min(modalCurrentPage * ITEMS_PER_PAGE, filteredSessions.length)} trên ${filteredSessions.length}`}
              </div>
              
              <div className="flex items-center gap-1.5 flex-wrap">
                {modalTotalPages > 1 && (
                  <>
                    <button
                      type="button"
                      disabled={modalCurrentPage === 1}
                      onClick={() => setModalCurrentPage(prev => Math.max(1, prev - 1))}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-indigo-500 hover:border-indigo-500 disabled:opacity-40 disabled:hover:text-slate-500 disabled:hover:border-slate-200 dark:disabled:hover:border-slate-800 transition-all cursor-pointer bg-slate-50 dark:bg-slate-950"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    
                    {Array.from({ length: modalTotalPages }).map((_, idx) => {
                      const pageNum = idx + 1;
                      return (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => setModalCurrentPage(pageNum)}
                          className={`w-7 h-7 flex items-center justify-center text-xs font-black rounded-lg transition-all cursor-pointer ${
                            modalCurrentPage === pageNum
                              ? "bg-indigo-500 text-white shadow-xs"
                              : "bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200/40 dark:border-slate-800/60"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      disabled={modalCurrentPage === modalTotalPages}
                      onClick={() => setModalCurrentPage(prev => Math.min(modalTotalPages, prev + 1))}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-indigo-500 hover:border-indigo-500 disabled:opacity-40 disabled:hover:text-slate-500 disabled:hover:border-slate-200 dark:disabled:hover:border-slate-800 transition-all cursor-pointer bg-slate-50 dark:bg-slate-950"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => setIsAllHistoryModalOpen(false)}
                  className="ml-2 px-4 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg transition-all cursor-pointer"
                >
                  {isEng ? "Close" : "Đóng"}
                </button>
              </div>
            </div>

          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
