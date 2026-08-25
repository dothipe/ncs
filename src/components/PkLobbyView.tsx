import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Trophy, 
  Sword, 
  Plus, 
  MapPin, 
  Calendar, 
  Clock, 
  Award, 
  Shield, 
  User, 
  Users, 
  Check, 
  X, 
  Play, 
  ChevronRight, 
  Search, 
  Flame, 
  ChevronUp, 
  CheckCircle,
  HelpCircle,
  TrendingUp,
  AlertCircle
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { PKChallenge, Athlete, SystemClub } from "../types";
import { db } from "../firebase";
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  getDoc,
  deleteDoc
} from "firebase/firestore";
import { subscribeToVscSystemAthletes, subscribeToVscSystemClubs } from "../lib/firebaseService";

interface PkLobbyViewProps {
  currentUser: any;
  onOpenAuthModal: () => void;
}

export const PkLobbyView: React.FC<PkLobbyViewProps> = ({ currentUser, onOpenAuthModal }) => {
  const { language } = useLanguage();
  const [activeSubTab, setActiveSubTab] = useState<"lobby" | "leaderboard" | "history">("lobby");
  const [challenges, setChallenges] = useState<PKChallenge[]>([]);
  const [systemAthletes, setSystemAthletes] = useState<Athlete[]>([]);
  const [systemClubs, setSystemClubs] = useState<SystemClub[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "solo_1v1" | "team_vs_team">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "open" | "accepted" | "ongoing">("all");

  // Create Challenge Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formType, setFormType] = useState<"solo_1v1" | "team_vs_team">("solo_1v1");
  const [formTeamSize, setFormTeamSize] = useState<number>(3);
  const [formRules, setFormRules] = useState("Best of 3 (Thắng 2/3 hiệp)");
  const [formDateTime, setFormDateTime] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formRefereeEmail, setFormRefereeEmail] = useState("");
  const [selectedAthleteId, setSelectedAthleteId] = useState("");
  const [selectedClubId, setSelectedClubId] = useState("");

  // Arena state (active match detail view)
  const [activeArenaChallenge, setActiveArenaChallenge] = useState<PKChallenge | null>(null);

  // Score editing inside Arena
  const [challengerScoresInput, setChallengerScoresInput] = useState<number[]>([0, 0, 0]);
  const [opponentScoresInput, setOpponentScoresInput] = useState<number[]>([0, 0, 0]);

  // Loading indicator / Toast message
  const [actionLoading, setActionLoading] = useState(false);

  // Subscribe to PK Challenges (Real-time updates)
  useEffect(() => {
    const q = query(collection(db, "vsc_pk_challenges"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snap) => {
      const list: PKChallenge[] = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as PKChallenge);
      });
      setChallenges(list);
      setLoading(false);

      // If user is currently in the arena, keep their arena challenge updated in real-time
      if (activeArenaChallenge) {
        const updated = list.find((c) => c.id === activeArenaChallenge.id);
        if (updated) {
          setActiveArenaChallenge(updated);
        }
      }
    }, (error) => {
      console.error("Error listening to challenges:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [activeArenaChallenge]);

  // Subscribe to System Athletes to link profiles
  useEffect(() => {
    const unsubscribe = subscribeToVscSystemAthletes((athletesList) => {
      setSystemAthletes(athletesList);
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to System Clubs to link profiles
  useEffect(() => {
    const unsubscribe = subscribeToVscSystemClubs((clubsList: any[]) => {
      setSystemClubs(clubsList);
    });
    return () => unsubscribe();
  }, []);

  // Find linked system athlete for current logged-in user
  const loggedInAthlete = useMemo(() => {
    if (!currentUser?.email) return null;
    return systemAthletes.find(
      (a) => a.email && a.email.trim().toLowerCase() === currentUser.email.toLowerCase()
    ) || null;
  }, [currentUser, systemAthletes]);

  // Find linked club for current logged-in user (either creator or member)
  const loggedInClubs = useMemo(() => {
    if (!currentUser?.uid) return [];
    return systemClubs.filter(
      (c) => c.leaderId === currentUser.uid || c.members?.some((m) => m.userId === currentUser.uid)
    );
  }, [currentUser, systemClubs]);

  // Initialize form defaults on open
  useEffect(() => {
    if (isCreateModalOpen) {
      if (loggedInAthlete) {
        setSelectedAthleteId(loggedInAthlete.id);
      } else if (systemAthletes.length > 0) {
        setSelectedAthleteId(systemAthletes[0].id);
      }
      if (loggedInClubs.length > 0) {
        setSelectedClubId(loggedInClubs[0].id);
      }
      
      // Default dates/times
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(19, 0, 0, 0);
      const tzoffset = tomorrow.getTimezoneOffset() * 60000;
      const localISOTime = (new Date(tomorrow.getTime() - tzoffset)).toISOString().slice(0, 16);
      setFormDateTime(localISOTime);
    }
  }, [isCreateModalOpen, loggedInAthlete, systemAthletes, loggedInClubs]);

  // Sync arena input score states with the active arena data
  useEffect(() => {
    if (activeArenaChallenge) {
      const scores = activeArenaChallenge.scores;
      setChallengerScoresInput(scores?.challengerScores || [0, 0, 0]);
      setOpponentScoresInput(scores?.opponentScores || [0, 0, 0]);
    }
  }, [activeArenaChallenge]);

  // Calculate stats dynamically for PK Leaderboard
  const pkLeaderboard = useMemo(() => {
    const stats: Record<string, { 
      uid: string; 
      name: string; 
      avatarUrl: string; 
      wins: number; 
      losses: number; 
      draws: number; 
      elo: number; 
      streak: number; 
      isClub?: boolean;
    }> = {};

    challenges.forEach((challenge) => {
      if (challenge.status !== "completed" || !challenge.scores) return;

      const challengerKey = challenge.type === "solo_1v1" ? challenge.challengerUid : `club-${challenge.challengerUid}`;
      const opponentKey = challenge.type === "solo_1v1" ? challenge.opponentUid : `club-${challenge.opponentUid}`;

      if (!challengerKey || !opponentKey) return;

      // Initialize if not exists
      if (!stats[challengerKey]) {
        stats[challengerKey] = { 
          uid: challenge.challengerUid, 
          name: challenge.challengerName, 
          avatarUrl: challenge.challengerAvatar || "", 
          wins: 0, 
          losses: 0, 
          draws: 0, 
          elo: 1000, 
          streak: 0,
          isClub: challenge.type === "team_vs_team"
        };
      }
      if (!stats[opponentKey]) {
        stats[opponentKey] = { 
          uid: challenge.opponentUid!, 
          name: challenge.opponentName || "Đối thủ", 
          avatarUrl: challenge.opponentAvatar || "", 
          wins: 0, 
          losses: 0, 
          draws: 0, 
          elo: 1000, 
          streak: 0,
          isClub: challenge.type === "team_vs_team"
        };
      }

      const scores = challenge.scores;
      const chSum = (scores.challengerScores || []).reduce((a, b) => a + b, 0);
      const opSum = (scores.opponentScores || []).reduce((a, b) => a + b, 0);

      // Simple ELO computation helper
      const rCh = stats[challengerKey].elo;
      const rOp = stats[opponentKey].elo;
      const expectedCh = 1 / (1 + Math.pow(10, (rOp - rCh) / 400));
      const expectedOp = 1 / (1 + Math.pow(10, (rCh - rOp) / 400));
      const K = 32;

      if (chSum > opSum) {
        // Challenger wins
        stats[challengerKey].wins += 1;
        stats[challengerKey].streak += 1;
        stats[opponentKey].losses += 1;
        stats[opponentKey].streak = 0;

        stats[challengerKey].elo = Math.round(rCh + K * (1 - expectedCh));
        stats[opponentKey].elo = Math.round(rOp + K * (0 - expectedOp));
      } else if (opSum > chSum) {
        // Opponent wins
        stats[opponentKey].wins += 1;
        stats[opponentKey].streak += 1;
        stats[challengerKey].losses += 1;
        stats[challengerKey].streak = 0;

        stats[opponentKey].elo = Math.round(rOp + K * (1 - expectedOp));
        stats[challengerKey].elo = Math.round(rCh + K * (0 - expectedCh));
      } else {
        // Draw
        stats[challengerKey].draws += 1;
        stats[opponentKey].draws += 1;

        stats[challengerKey].elo = Math.round(rCh + K * (0.5 - expectedCh));
        stats[opponentKey].elo = Math.round(rOp + K * (0.5 - expectedOp));
      }
    });

    return Object.values(stats).sort((a, b) => b.elo - a.elo);
  }, [challenges]);

  // Handle Challenge Creation
  const handleCreateChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenAuthModal();
      return;
    }

    if (!formTitle.trim() || !formLocation.trim()) {
      alert(language === "en" ? "Please fill in all required fields!" : "Vui lòng điền đầy đủ tiêu đề và địa điểm!");
      return;
    }

    setActionLoading(true);

    try {
      let creatorName = currentUser.displayName || "Cơ thủ";
      let creatorAvatar = currentUser.photoURL || "";

      // Overwrite with linked system athlete profile info if solo
      if (formType === "solo_1v1" && selectedAthleteId) {
        const linkedAth = systemAthletes.find(a => a.id === selectedAthleteId);
        if (linkedAth) {
          creatorName = linkedAth.name;
          if (linkedAth.avatarUrl) creatorAvatar = linkedAth.avatarUrl;
        }
      }

      // Overwrite with club info if team
      if (formType === "team_vs_team" && selectedClubId) {
        const linkedClub = systemClubs.find(c => c.id === selectedClubId);
        if (linkedClub) {
          creatorName = linkedClub.name;
          if (linkedClub.logoUrl) creatorAvatar = linkedClub.logoUrl;
        }
      }

      const challengeData: any = {
        type: formType,
        title: formTitle.trim(),
        rules: formRules.trim(),
        dateTime: formDateTime,
        location: formLocation.trim(),
        description: formDescription.trim(),
        status: "open",
        challengerUid: currentUser.uid,
        challengerName: creatorName,
        challengerAvatar: creatorAvatar,
        createdAt: new Date().toISOString(),
      };

      if (formType === "team_vs_team") {
        challengeData.teamSize = formTeamSize;
      }
      if (formRefereeEmail.trim()) {
        challengeData.refereeEmail = formRefereeEmail.trim().toLowerCase();
      }

      await addDoc(collection(db, "vsc_pk_challenges"), challengeData);

      // Reset Form and close modal
      setFormTitle("");
      setFormDescription("");
      setFormLocation("");
      setFormRefereeEmail("");
      setIsCreateModalOpen(false);

      alert(language === "en" 
        ? "Successfully created PK challenge looking for opponents!" 
        : "Đăng kèo tìm đối thủ thành công! Hãy đợi người chơi khác nhận thách đấu."
      );
    } catch (err) {
      console.error("Error creating challenge:", err);
      alert("Đã xảy ra lỗi khi tạo kèo: " + (err as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Accepting a Challenge
  const handleAcceptChallenge = async (challenge: PKChallenge) => {
    if (!currentUser) {
      onOpenAuthModal();
      return;
    }

    if (challenge.challengerUid === currentUser.uid) {
      alert(language === "en" 
        ? "You cannot accept your own challenge!" 
        : "Bạn không thể tự nhận kèo thi đấu do chính bạn tạo ra!"
      );
      return;
    }

    const confirmAccept = window.confirm(
      language === "en" 
        ? `Are you sure you want to accept this challenge from "${challenge.challengerName}"?` 
        : `Bạn có chắc chắn muốn nhận kèo thách đấu này của "${challenge.challengerName}" không?`
    );
    if (!confirmAccept) return;

    setActionLoading(true);

    try {
      let opponentName = currentUser.displayName || "Đối thủ";
      let opponentAvatar = currentUser.photoURL || "";

      // Overwrite with linked system athlete profile info if solo
      if (challenge.type === "solo_1v1") {
        if (loggedInAthlete) {
          opponentName = loggedInAthlete.name;
          if (loggedInAthlete.avatarUrl) opponentAvatar = loggedInAthlete.avatarUrl;
        }
      } else {
        // Overwrite with first available club owned by user
        if (loggedInClubs.length > 0) {
          opponentName = loggedInClubs[0].name;
          if (loggedInClubs[0].logoUrl) opponentAvatar = loggedInClubs[0].logoUrl;
        }
      }

      const challengeRef = doc(db, "vsc_pk_challenges", challenge.id);
      await updateDoc(challengeRef, {
        opponentUid: currentUser.uid,
        opponentName: opponentName,
        opponentAvatar: opponentAvatar,
        status: "accepted",
        scores: {
          challengerScores: [0, 0, 0],
          opponentScores: [0, 0, 0],
          challengerConfirm: false,
          opponentConfirm: false
        }
      });

      alert(language === "en" 
        ? "Successfully accepted challenge! The match has been matched." 
        : "Nhận kèo đấu thành công! Kèo đã được ghép cặp, hãy hẹn giờ ra sân thi đấu."
      );
    } catch (err) {
      console.error("Error accepting challenge:", err);
      alert("Lỗi khi nhận kèo: " + (err as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Deleting an open Challenge
  const handleDeleteChallenge = async (challengeId: string) => {
    const confirmDelete = window.confirm(
      language === "en" ? "Are you sure you want to delete this challenge?" : "Bạn có chắc chắn muốn hủy kèo đấu này không?"
    );
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "vsc_pk_challenges", challengeId));
      alert(language === "en" ? "Challenge cancelled successfully." : "Hủy kèo thành công.");
    } catch (err) {
      console.error("Error cancelling challenge:", err);
    }
  };

  // Check if current user is referee/admin for the arena match
  const isRefereeOfMatch = useMemo(() => {
    if (!currentUser || !activeArenaChallenge) return false;
    // Is designated referee by email
    if (activeArenaChallenge.refereeEmail && currentUser.email && activeArenaChallenge.refereeEmail.toLowerCase() === currentUser.email.toLowerCase()) {
      return true;
    }
    // Is global admin
    const admins = ["vscvietnamslingshot@gmail.com", "nahnatofficial@gmail.com"];
    if (currentUser.email && admins.includes(currentUser.email.toLowerCase())) {
      return true;
    }
    return false;
  }, [currentUser, activeArenaChallenge]);

  // Submit/Update Scores in the Arena
  const handleUpdateScores = async (isConfirmStep = false) => {
    if (!currentUser || !activeArenaChallenge) return;

    try {
      const challengeRef = doc(db, "vsc_pk_challenges", activeArenaChallenge.id);
      
      const updatedScores = {
        challengerScores: challengerScoresInput,
        opponentScores: opponentScoresInput,
        challengerConfirm: isConfirmStep && currentUser.uid === activeArenaChallenge.challengerUid 
          ? true 
          : activeArenaChallenge.scores?.challengerConfirm || false,
        opponentConfirm: isConfirmStep && currentUser.uid === activeArenaChallenge.opponentUid 
          ? true 
          : activeArenaChallenge.scores?.opponentConfirm || false,
      };

      // If both sides confirmed or referee submitted, complete the match
      const bothConfirmed = updatedScores.challengerConfirm && updatedScores.opponentConfirm;
      const isRefConfirm = isRefereeOfMatch && isConfirmStep;

      const newStatus = (bothConfirmed || isRefConfirm) ? "completed" : "ongoing";

      await updateDoc(challengeRef, {
        status: newStatus,
        scores: updatedScores
      });

      alert(language === "en" 
        ? "Scoreboard updated successfully!" 
        : "Cập nhật bảng điểm thành công!"
      );

      if (newStatus === "completed") {
        alert(language === "en" 
          ? "Match completed! ELO ratings have been recalculated." 
          : "Trận đấu đã kết thúc chính thức! Điểm xếp hạng ELO đã được cập nhật thành công."
        );
        setActiveArenaChallenge(null);
      }
    } catch (err) {
      console.error("Error updating scores:", err);
      alert("Lỗi cập nhật bảng điểm: " + (err as Error).message);
    }
  };

  // Filter Challenges list
  const filteredChallenges = useMemo(() => {
    return challenges.filter((c) => {
      // Filter tab
      if (activeSubTab === "lobby" && c.status === "completed") return false;
      if (activeSubTab === "history" && c.status !== "completed") return false;

      // Filter input search query
      if (searchQuery.trim() !== "") {
        const queryNorm = searchQuery.toLowerCase();
        const titleMatch = c.title.toLowerCase().includes(queryNorm);
        const challengerMatch = c.challengerName.toLowerCase().includes(queryNorm);
        const opponentMatch = c.opponentName?.toLowerCase().includes(queryNorm) || false;
        const locationMatch = c.location.toLowerCase().includes(queryNorm);
        if (!titleMatch && !challengerMatch && !opponentMatch && !locationMatch) return false;
      }

      // Filter challenge type
      if (filterType !== "all" && c.type !== filterType) return false;

      // Filter status
      if (activeSubTab === "lobby" && filterStatus !== "all" && c.status !== filterStatus) return false;

      return true;
    });
  }, [challenges, activeSubTab, searchQuery, filterType, filterStatus]);

  // Format date helper
  const formatDate = (isoString: string) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 animate-fade-in" id="vsc-pk-arena-root">
      
      {/* Title & Stats Ribbon */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-100 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-50 rounded-xl text-rose-500 shadow-sm">
              <Sword className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                {language === "en" ? "VSC PK Arena & Matchmaking" : "Khán Đài PK & Tìm Đối Thủ"}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {language === "en" 
                  ? "Host customizable 1v1 and team battles, secure opponents, and compete for ELO ladder standings." 
                  : "Môi trường giao lưu PK tự do, thách đấu 1v1 hoặc CLB, tích điểm thăng hạng quân hàm ELO."}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-center">
          <button
            onClick={() => {
              if (!currentUser) {
                onOpenAuthModal();
              } else {
                setIsCreateModalOpen(true);
              }
            }}
            className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-medium px-4 py-2.5 rounded-xl shadow-md cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{language === "en" ? "Host Challenge" : "Đăng Kèo PK"}</span>
          </button>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center border-b border-gray-200 mb-6 overflow-x-auto scrollbar-none">
        <button
          onClick={() => { setActiveSubTab("lobby"); setActiveArenaChallenge(null); }}
          className={`px-5 py-3 font-semibold text-sm transition-all relative border-b-2 whitespace-nowrap flex items-center gap-2 ${
            activeSubTab === "lobby" && !activeArenaChallenge
              ? "border-rose-600 text-rose-600"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <Sword className="w-4 h-4" />
          <span>{language === "en" ? "PK Matchmaking Lobby" : "Sảnh Kèo Đang Chờ"}</span>
          {challenges.filter(c => c.status === "open").length > 0 && (
            <span className="bg-rose-500 text-white text-xs px-2 py-0.5 rounded-full font-bold ml-1">
              {challenges.filter(c => c.status === "open").length}
            </span>
          )}
        </button>

        <button
          onClick={() => { setActiveSubTab("leaderboard"); setActiveArenaChallenge(null); }}
          className={`px-5 py-3 font-semibold text-sm transition-all relative border-b-2 whitespace-nowrap flex items-center gap-2 ${
            activeSubTab === "leaderboard"
              ? "border-rose-600 text-rose-600"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>{language === "en" ? "PK ELO Standings" : "Bảng Anh Hùng PK"}</span>
        </button>

        <button
          onClick={() => { setActiveSubTab("history"); setActiveArenaChallenge(null); }}
          className={`px-5 py-3 font-semibold text-sm transition-all relative border-b-2 whitespace-nowrap flex items-center gap-2 ${
            activeSubTab === "history"
              ? "border-rose-600 text-rose-600"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <Award className="w-4 h-4" />
          <span>{language === "en" ? "Match Results History" : "Lịch Sử Kết Quả"}</span>
        </button>
      </div>

      {/* Main Container */}
      <div className="min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-500 text-sm mt-4">
              {language === "en" ? "Loading arena status..." : "Đang tải dữ liệu sảnh đấu..."}
            </p>
          </div>
        ) : activeArenaChallenge ? (
          /* ========================================================= */
          /* 🏟️ DEDICATED REAL-TIME PK ARENA VIEW                      */
          /* ========================================================= */
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden max-w-4xl mx-auto mb-10"
          >
            {/* Arena Header */}
            <div className="bg-rose-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Sword className="w-5 h-5 text-rose-400 animate-pulse" />
                <span className="font-bold uppercase tracking-wider text-xs bg-rose-800 text-rose-200 px-2.5 py-1 rounded-md">
                  {activeArenaChallenge.type === "solo_1v1" ? "1v1 Battle" : `${activeArenaChallenge.teamSize}v${activeArenaChallenge.teamSize} CLB`}
                </span>
                <span className="text-sm opacity-90 truncate max-w-xs md:max-w-md ml-2 font-medium">
                  {activeArenaChallenge.title}
                </span>
              </div>
              <button 
                onClick={() => setActiveArenaChallenge(null)}
                className="text-white hover:text-rose-200 p-1.5 hover:bg-rose-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Match Information Bar */}
            <div className="bg-rose-950/40 border-b border-gray-100 px-6 py-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                <span className="font-medium text-gray-700">
                  {language === "en" ? "Location: " : "Địa điểm: "} {activeArenaChallenge.location}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-rose-500 shrink-0" />
                <span className="font-medium text-gray-700">
                  {language === "en" ? "Scheduled: " : "Thời gian: "} {formatDate(activeArenaChallenge.dateTime)}
                </span>
              </div>
              <div className="flex items-center gap-2 col-span-1 sm:col-span-2">
                <Shield className="w-4 h-4 text-rose-500 shrink-0" />
                <span className="font-medium text-gray-700">
                  {language === "en" ? "Match Rule: " : "Luật đấu: "} {activeArenaChallenge.rules}
                </span>
              </div>
              {activeArenaChallenge.refereeEmail && (
                <div className="flex items-center gap-2 col-span-1 sm:col-span-2">
                  <User className="w-4 h-4 text-rose-500 shrink-0" />
                  <span className="font-medium text-gray-700">
                    {language === "en" ? "Assigned Referee: " : "Trọng tài chỉ định: "} {activeArenaChallenge.refereeEmail}
                  </span>
                </div>
              )}
            </div>

            {/* Versus Arena Combatants Layout */}
            <div className="p-8 flex flex-col md:flex-row items-center justify-around gap-8 bg-gradient-to-b from-rose-50/20 to-white">
              
              {/* CHALLENGER (Bên Thách Đấu) */}
              <div className="flex flex-col items-center text-center w-full md:w-5/12">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full border-4 border-rose-500/30 overflow-hidden shadow-lg mb-4 bg-gray-50 flex items-center justify-center">
                    {activeArenaChallenge.challengerAvatar ? (
                      <img 
                        src={activeArenaChallenge.challengerAvatar} 
                        alt={activeArenaChallenge.challengerName}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <User className="w-12 h-12 text-gray-300" />
                    )}
                  </div>
                  <span className="absolute bottom-3 right-0 bg-rose-600 text-white font-bold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                    Host
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 truncate max-w-xs">{activeArenaChallenge.challengerName}</h3>
                <span className="text-xs text-gray-400 mt-0.5 uppercase tracking-widest">Challenger</span>
                
                {/* Confirmation Status Badge */}
                <div className="mt-4">
                  {activeArenaChallenge.scores?.challengerConfirm ? (
                    <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-semibold border border-green-200">
                      <CheckCircle className="w-3.5 h-3.5" />
                      {language === "en" ? "Confirmed Results" : "Đã xác nhận tỉ số"}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-xs font-semibold border border-amber-200">
                      <Clock className="w-3.5 h-3.5" />
                      {language === "en" ? "Pending Confirmation" : "Chờ xác nhận tỉ số"}
                    </span>
                  )}
                </div>
              </div>

              {/* VS SEPARATOR */}
              <div className="flex flex-col items-center justify-center shrink-0 my-2 md:my-0">
                <div className="w-16 h-16 rounded-full bg-rose-600 text-white flex items-center justify-center font-black text-xl italic shadow-lg outline-8 outline-rose-50">
                  VS
                </div>
                <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mt-2">Arena</span>
              </div>

              {/* OPPONENT (Bên Nhận Kèo) */}
              <div className="flex flex-col items-center text-center w-full md:w-5/12">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full border-4 border-gray-200 overflow-hidden shadow-lg mb-4 bg-gray-50 flex items-center justify-center">
                    {activeArenaChallenge.opponentAvatar ? (
                      <img 
                        src={activeArenaChallenge.opponentAvatar} 
                        alt={activeArenaChallenge.opponentName}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <User className="w-12 h-12 text-gray-300" />
                    )}
                  </div>
                  <span className="absolute bottom-3 right-0 bg-gray-600 text-white font-bold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                    Guest
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 truncate max-w-xs">
                  {activeArenaChallenge.opponentName || (language === "en" ? "Awaiting Guest..." : "Đang chờ đối...")}
                </h3>
                <span className="text-xs text-gray-400 mt-0.5 uppercase tracking-widest">Opponent</span>

                {/* Confirmation Status Badge */}
                <div className="mt-4">
                  {activeArenaChallenge.scores?.opponentConfirm ? (
                    <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-semibold border border-green-200">
                      <CheckCircle className="w-3.5 h-3.5" />
                      {language === "en" ? "Confirmed Results" : "Đã xác nhận tỉ số"}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-xs font-semibold border border-amber-200">
                      <Clock className="w-3.5 h-3.5" />
                      {language === "en" ? "Pending Confirmation" : "Chờ xác nhận tỉ số"}
                    </span>
                  )}
                </div>
              </div>

            </div>

            {/* Scoreboard Editor Card */}
            <div className="p-6 border-t border-gray-100 bg-gray-50/50">
              <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider text-center mb-6">
                {language === "en" ? "Interactive Set Scoreboard" : "Cập Nhật Điểm Số Từng Hiệp"}
              </h4>

              {/* Multi-set inputs */}
              <div className="max-w-xl mx-auto space-y-4 mb-8">
                {[0, 1, 2].map((setIndex) => (
                  <div key={setIndex} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between gap-4">
                    <span className="font-bold text-gray-500 text-xs uppercase tracking-wider">
                      {language === "en" ? `Set ${setIndex + 1}` : `Hiệp ${setIndex + 1}`}
                    </span>

                    {/* Challenger Set Score */}
                    <div className="flex items-center gap-2 w-5/12 justify-end">
                      <button 
                        type="button"
                        disabled={activeArenaChallenge.status === "completed"}
                        onClick={() => {
                          const arr = [...challengerScoresInput];
                          arr[setIndex] = Math.max(0, arr[setIndex] - 1);
                          setChallengerScoresInput(arr);
                        }}
                        className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 font-bold text-sm select-none cursor-pointer"
                      >
                        -
                      </button>
                      <span className="w-12 text-center font-black text-lg text-rose-600">
                        {challengerScoresInput[setIndex] || 0}
                      </span>
                      <button 
                        type="button"
                        disabled={activeArenaChallenge.status === "completed"}
                        onClick={() => {
                          const arr = [...challengerScoresInput];
                          arr[setIndex] = (arr[setIndex] || 0) + 1;
                          setChallengerScoresInput(arr);
                        }}
                        className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 font-bold text-sm select-none cursor-pointer"
                      >
                        +
                      </button>
                    </div>

                    <span className="font-bold text-gray-300 px-1">:</span>

                    {/* Opponent Set Score */}
                    <div className="flex items-center gap-2 w-5/12 justify-start">
                      <button 
                        type="button"
                        disabled={activeArenaChallenge.status === "completed"}
                        onClick={() => {
                          const arr = [...opponentScoresInput];
                          arr[setIndex] = Math.max(0, arr[setIndex] - 1);
                          setOpponentScoresInput(arr);
                        }}
                        className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 font-bold text-sm select-none cursor-pointer"
                      >
                        -
                      </button>
                      <span className="w-12 text-center font-black text-lg text-gray-800">
                        {opponentScoresInput[setIndex] || 0}
                      </span>
                      <button 
                        type="button"
                        disabled={activeArenaChallenge.status === "completed"}
                        onClick={() => {
                          const arr = [...opponentScoresInput];
                          arr[setIndex] = (arr[setIndex] || 0) + 1;
                          setOpponentScoresInput(arr);
                        }}
                        className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 font-bold text-sm select-none cursor-pointer"
                      >
                        +
                      </button>
                    </div>

                  </div>
                ))}
              </div>

              {/* Action Buttons for Arena */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 border-t border-gray-100 pt-6">
                
                {/* Save Draft/Scoreboard button (Challenger, Opponent, or Ref) */}
                {(currentUser?.uid === activeArenaChallenge.challengerUid || 
                  currentUser?.uid === activeArenaChallenge.opponentUid || 
                  isRefereeOfMatch) && (
                  <button
                    type="button"
                    onClick={() => handleUpdateScores(false)}
                    className="w-full sm:w-auto bg-gray-800 hover:bg-gray-900 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors cursor-pointer text-sm"
                  >
                    {language === "en" ? "Update Scoreboard" : "Lưu điểm tạm thời 💾"}
                  </button>
                )}

                {/* Confirm Final Result Button */}
                {(currentUser?.uid === activeArenaChallenge.challengerUid || 
                  currentUser?.uid === activeArenaChallenge.opponentUid || 
                  isRefereeOfMatch) && (
                  <button
                    type="button"
                    onClick={() => handleUpdateScores(true)}
                    className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors cursor-pointer text-sm flex items-center justify-center gap-2 shadow-md"
                  >
                    <Check className="w-4 h-4" />
                    <span>
                      {isRefereeOfMatch 
                        ? (language === "en" ? "Referee Match Confirmation" : "Xác nhận kết quả (Trọng tài) 👑")
                        : (language === "en" ? "Submit & Lock Result" : "Ký xác nhận tỉ số ✍️")}
                    </span>
                  </button>
                )}

                {/* Return button */}
                <button
                  type="button"
                  onClick={() => setActiveArenaChallenge(null)}
                  className="w-full sm:w-auto border border-gray-200 hover:bg-gray-100 text-gray-700 font-semibold px-6 py-2.5 rounded-xl transition-colors cursor-pointer text-sm"
                >
                  {language === "en" ? "Exit Arena" : "Quay lại sảnh kèo"}
                </button>
              </div>

              {/* Safeguard Warnings */}
              <div className="mt-5 max-w-lg mx-auto bg-amber-50 rounded-xl p-3.5 border border-amber-200 text-[11px] text-amber-800 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">
                    {language === "en" ? "Anti-Cheat Rule: " : "Luật bảo mật chống gian lận: "}
                  </span>
                  {language === "en" 
                    ? "Both the Challenger and Opponent must click 'Submit & Lock Result' with identical scoreboards before ELO ratings will update. Designated Referees can finalize and lock scoreboards unilaterally." 
                    : "Cả 2 bên Challenger và Opponent cần cùng bấm 'Ký xác nhận tỉ số' để khớp kết quả trước khi hệ thống ghi nhận. Trọng tài được chỉ định hoặc Admin hệ thống có đặc quyền ký duyệt đơn phương."}
                </div>
              </div>
            </div>

          </motion.div>
        ) : activeSubTab === "lobby" ? (
          /* ========================================================= */
          /* 🏟️ CHALLEGING MATCHES LOBBY LIST VIEW                     */
          /* ========================================================= */
          <div>
            {/* Search and Filters Controls */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={language === "en" ? "Search challenges, players, venues..." : "Tìm kiếm kèo đấu, người thách đấu, địa điểm..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Match Type filter */}
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="bg-white border border-gray-200 rounded-xl text-xs px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                >
                  <option value="all">{language === "en" ? "All Formats" : "Tất cả thể thức"}</option>
                  <option value="solo_1v1">{language === "en" ? "1v1 Individual" : "Đấu đơn 1v1"}</option>
                  <option value="team_vs_team">{language === "en" ? "Club / Team Battles" : "Đấu đồng đội CLB"}</option>
                </select>

                {/* Status filter */}
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="bg-white border border-gray-200 rounded-xl text-xs px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                >
                  <option value="all">{language === "en" ? "All Statuses" : "Tất cả trạng thái"}</option>
                  <option value="open">{language === "en" ? "Awaiting Opponents" : "Đang chờ đối"}</option>
                  <option value="accepted">{language === "en" ? "Matched / Scheduled" : "Đã chốt kèo"}</option>
                  <option value="ongoing">{language === "en" ? "Ongoing Battles" : "Đang thi đấu"}</option>
                </select>
              </div>
            </div>

            {/* List of Kèo */}
            {filteredChallenges.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
                <Sword className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-base font-bold text-gray-800">
                  {language === "en" ? "No Active Challenges" : "Không có kèo đấu nào đang hiển thị"}
                </h3>
                <p className="text-gray-500 text-xs mt-1 max-w-sm mx-auto">
                  {language === "en" 
                    ? "Be the first to host a custom match in the arena by clicking 'Host Challenge' above!" 
                    : "Hiện tại sảnh đấu chưa có kèo phù hợp với điều kiện lọc. Hãy là người đầu tiên đăng kèo PK thách đấu bằng nút phía trên!"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <AnimatePresence mode="popLayout">
                  {filteredChallenges.map((challenge) => {
                    const isOwner = currentUser?.uid === challenge.challengerUid;
                    const isMatched = challenge.status !== "open";

                    return (
                      <motion.div
                        key={challenge.id}
                        layout
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden relative"
                      >
                        {/* Card Header Status Indicator */}
                        <div className="px-5 py-3.5 bg-gray-55/40 border-b border-gray-100 flex items-center justify-between">
                          <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                            challenge.status === "open"
                              ? "bg-rose-50 text-rose-600 border border-rose-100 animate-pulse"
                              : challenge.status === "accepted"
                              ? "bg-blue-50 text-blue-600 border border-blue-100"
                              : "bg-amber-50 text-amber-600 border border-amber-100"
                          }`}>
                            {challenge.status === "open" 
                              ? (language === "en" ? "Awaiting Guest" : "Tìm đối thủ 🔍") 
                              : challenge.status === "accepted"
                              ? (language === "en" ? "Matched / Pending Arena" : "Đã nhận kèo 🤝")
                              : (language === "en" ? "Ongoing Battle" : "Đang thi đấu ⚔️")
                            }
                          </span>

                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            {challenge.type === "solo_1v1" ? "Solo 1v1" : `${challenge.teamSize}v${challenge.teamSize} Team`}
                          </span>
                        </div>

                        {/* Content Body */}
                        <div className="p-5 flex-1 flex flex-col justify-between gap-5">
                          <div>
                            <h3 className="text-base font-bold text-gray-900 line-clamp-1 mb-1">
                              {challenge.title}
                            </h3>
                            {challenge.description && (
                              <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                                {challenge.description}
                              </p>
                            )}

                            {/* Challenge Details Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 text-[11px] text-gray-600">
                              <div className="flex items-center gap-2">
                                <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                <span className="truncate font-medium">{challenge.location}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                <span className="truncate font-medium">{formatDate(challenge.dateTime)}</span>
                              </div>
                              <div className="flex items-center gap-2 sm:col-span-2 border-t border-gray-50 pt-2 mt-1">
                                <Shield className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                <span className="font-semibold truncate text-gray-700">
                                  {language === "en" ? "Rules: " : "Quy định: "} {challenge.rules}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Contestants Visualization bar */}
                          <div className="flex items-center justify-between border-t border-gray-50 pt-3.5">
                            <div className="flex items-center gap-2 max-w-[45%]">
                              <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-rose-100 bg-gray-50 flex items-center justify-center">
                                {challenge.challengerAvatar ? (
                                  <img 
                                    src={challenge.challengerAvatar} 
                                    alt={challenge.challengerName} 
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <User className="w-4 h-4 text-gray-400" />
                                )}
                              </div>
                              <span className="text-xs font-bold text-gray-900 truncate">
                                {challenge.challengerName}
                              </span>
                            </div>

                            <span className="text-[10px] italic font-black text-rose-500 shrink-0">VS</span>

                            <div className="flex items-center gap-2 max-w-[45%] justify-end text-right">
                              {isMatched ? (
                                <>
                                  <span className="text-xs font-bold text-gray-900 truncate">
                                    {challenge.opponentName}
                                  </span>
                                  <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-gray-200 bg-gray-50 flex items-center justify-center order-first sm:order-last">
                                    {challenge.opponentAvatar ? (
                                      <img 
                                        src={challenge.opponentAvatar} 
                                        alt={challenge.opponentName} 
                                        className="w-full h-full object-cover"
                                        referrerPolicy="no-referrer"
                                      />
                                    ) : (
                                      <User className="w-4 h-4 text-gray-400" />
                                    )}
                                  </div>
                                </>
                              ) : (
                                <span className="text-xs italic text-gray-400">
                                  {language === "en" ? "Awaiting..." : "Đang chờ đối..."}
                                </span>
                              )}
                            </div>
                          </div>

                        </div>

                        {/* Card Footer Button Bar */}
                        <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
                          {isOwner && !isMatched && (
                            <button
                              type="button"
                              onClick={() => handleDeleteChallenge(challenge.id)}
                              className="text-xs font-medium text-rose-600 hover:text-rose-700 cursor-pointer"
                            >
                              {language === "en" ? "Cancel Challenge" : "Hủy kèo"}
                            </button>
                          )}

                          {!isOwner && !isMatched && (
                            <button
                              type="button"
                              onClick={() => handleAcceptChallenge(challenge)}
                              className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer shadow-sm transition-colors ml-auto"
                            >
                              <Sword className="w-3.5 h-3.5" />
                              <span>{language === "en" ? "Accept Challenge" : "Nhận Kèo PK"}</span>
                            </button>
                          )}

                          {isMatched && (
                            <button
                              type="button"
                              onClick={() => setActiveArenaChallenge(challenge)}
                              className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-900 text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer shadow-sm transition-all ml-auto w-full justify-center"
                            >
                              <Play className="w-3 h-3 text-rose-500 fill-rose-500" />
                              <span>{language === "en" ? "Enter PK Arena" : "Vào Khán Đài PK 🏟️"}</span>
                            </button>
                          )}
                        </div>

                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        ) : activeSubTab === "leaderboard" ? (
          /* ========================================================= */
          /* 🏆 PK LEADERSHIP ELO RATING BOARD                        */
          /* ========================================================= */
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-100 bg-rose-50/20 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    <span>{language === "en" ? "Top PK Slingshot Gladiators" : "Bảng Xếp Hạng Anh Hùng PK"}</span>
                  </h3>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {language === "en" 
                      ? "ELO rating scores recalculate after every officially synchronized match result." 
                      : "Điểm ELO tự động cập nhật sau mỗi trận đấu PK hoàn thành."}
                  </p>
                </div>
                <Flame className="w-5 h-5 text-rose-500 animate-pulse" />
              </div>

              {pkLeaderboard.length === 0 ? (
                <div className="p-12 text-center text-gray-500 text-xs">
                  {language === "en" ? "No completed PK match data yet." : "Chưa có dữ liệu trận đấu PK nào được hoàn thành để xếp hạng."}
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {pkLeaderboard.map((player, idx) => {
                    // Medal or Rank badge
                    let rankBadge = <span className="font-bold text-gray-500 text-sm">{idx + 1}</span>;
                    if (idx === 0) {
                      rankBadge = <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-full border border-amber-200">🥇 Gold</span>;
                    } else if (idx === 1) {
                      rankBadge = <span className="bg-gray-100 text-gray-800 text-xs font-bold px-2.5 py-1 rounded-full border border-gray-200">🥈 Silver</span>;
                    } else if (idx === 2) {
                      rankBadge = <span className="bg-amber-50 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full border border-amber-150">🥉 Bronze</span>;
                    }

                    return (
                      <div key={player.uid} className="p-4 flex items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-14 text-center shrink-0">
                            {rankBadge}
                          </div>

                          <div className="w-9 h-9 rounded-full overflow-hidden border border-gray-100 bg-gray-50 flex items-center justify-center shrink-0">
                            {player.avatarUrl ? (
                              <img 
                                src={player.avatarUrl} 
                                alt={player.name} 
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <User className="w-5 h-5 text-gray-300" />
                            )}
                          </div>

                          <div>
                            <div className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                              <span>{player.name}</span>
                              {player.isClub && (
                                <span className="bg-rose-50 text-rose-700 text-[9px] font-black uppercase px-1.5 py-0.2 rounded">CLB</span>
                              )}
                            </div>
                            <div className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-2">
                              <span>Win: <b className="text-green-600">{player.wins}</b></span>
                              <span>Draw: <b>{player.draws}</b></span>
                              <span>Loss: <b className="text-rose-500">{player.losses}</b></span>
                              {player.streak > 0 && (
                                <span className="text-amber-600 font-bold flex items-center gap-0.5">
                                  <Flame className="w-3 h-3 shrink-0" />
                                  <span>{player.streak} Win Streak</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-black text-rose-600 text-base tracking-tight flex items-center justify-end gap-1">
                            <span>{player.elo}</span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase">ELO</span>
                          </div>
                          <span className="text-[9px] text-gray-400 font-medium">Ranked #{(idx + 1)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ========================================================= */
          /* 📜 COMPLETED PK MATCHES ARCHIVES LIST VIEW                 */
          /* ========================================================= */
          <div>
            {filteredChallenges.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
                <Award className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-base font-bold text-gray-800">
                  {language === "en" ? "No Match Results Found" : "Không tìm thấy kết quả nào"}
                </h3>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredChallenges.map((challenge) => {
                  const chScores = challenge.scores?.challengerScores || [];
                  const opScores = challenge.scores?.opponentScores || [];
                  const chSum = chScores.reduce((a, b) => a + b, 0);
                  const opSum = opScores.reduce((a, b) => a + b, 0);

                  const challengerWin = chSum > opSum;
                  const opponentWin = opSum > chSum;
                  const draw = chSum === opSum;

                  return (
                    <div 
                      key={challenge.id}
                      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col justify-between"
                    >
                      {/* Match metadata bar */}
                      <div className="px-5 py-3.5 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                        <span>{formatDate(challenge.dateTime)}</span>
                        <span>{challenge.type === "solo_1v1" ? "1v1 Solo" : "Club Team"}</span>
                      </div>

                      {/* Scoreboard block */}
                      <div className="p-6">
                        <h4 className="text-sm font-bold text-gray-900 text-center mb-5 line-clamp-1">{challenge.title}</h4>
                        
                        <div className="flex items-center justify-around gap-4 bg-gray-50 p-4 rounded-xl border border-gray-50">
                          
                          {/* Challenger */}
                          <div className="flex flex-col items-center text-center w-5/12">
                            <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-100 bg-gray-50 flex items-center justify-center shadow-sm">
                              {challenge.challengerAvatar ? (
                                <img src={challenge.challengerAvatar} alt={challenge.challengerName} className="w-full h-full object-cover" />
                              ) : (
                                <User className="w-5 h-5 text-gray-300" />
                              )}
                            </div>
                            <span className="text-xs font-bold text-gray-900 mt-2 truncate max-w-full">{challenge.challengerName}</span>
                            {challengerWin && (
                              <span className="text-[9px] font-black uppercase text-green-600 bg-green-50 border border-green-100 px-1.5 py-0.2 rounded mt-1">Winner</span>
                            )}
                          </div>

                          {/* Scores Sum */}
                          <div className="text-center shrink-0">
                            <div className="font-black text-xl text-gray-900">
                              {chSum} - {opSum}
                            </div>
                            <span className="text-[10px] text-gray-400 font-bold uppercase">Final</span>
                          </div>

                          {/* Opponent */}
                          <div className="flex flex-col items-center text-center w-5/12">
                            <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-100 bg-gray-50 flex items-center justify-center shadow-sm">
                              {challenge.opponentAvatar ? (
                                <img src={challenge.opponentAvatar} alt={challenge.opponentName} className="w-full h-full object-cover" />
                              ) : (
                                <User className="w-5 h-5 text-gray-300" />
                              )}
                            </div>
                            <span className="text-xs font-bold text-gray-900 mt-2 truncate max-w-full">{challenge.opponentName || "Guest"}</span>
                            {opponentWin && (
                              <span className="text-[9px] font-black uppercase text-green-600 bg-green-50 border border-green-100 px-1.5 py-0.2 rounded mt-1">Winner</span>
                            )}
                          </div>

                        </div>
                      </div>

                      {/* Footer Details */}
                      <div className="px-5 py-3.5 bg-gray-50/50 border-t border-gray-100 text-xs text-gray-500">
                        <span className="font-medium text-gray-600">Location: </span>{challenge.location}
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* ➕ HOST CHALLENGE CREATION MODAL                             */}
      {/* ========================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-8"
          >
            {/* Modal Header */}
            <div className="bg-rose-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Sword className="w-5 h-5 text-rose-400" />
                <span>{language === "en" ? "Host New PK Challenge" : "Đăng Kèo PK Thách Đấu Mới"}</span>
              </h3>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="text-white/80 hover:text-white p-1.5 hover:bg-rose-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateChallenge} className="p-6 space-y-4">
              
              {/* Challenge Title */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  {language === "en" ? "Challenge Title *" : "Tiêu đề kèo thách đấu *"}
                </label>
                <input
                  type="text"
                  required
                  placeholder={language === "en" ? "e.g., Evening friendly slingshot clash" : "vd: Kèo giao lưu trà đá tối thứ 7"}
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                />
              </div>

              {/* Form Type & Size */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    {language === "en" ? "Challenge Format *" : "Thể thức thi đấu *"}
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                  >
                    <option value="solo_1v1">{language === "en" ? "Solo 1v1" : "Đấu đơn cá nhân 1v1"}</option>
                    <option value="team_vs_team">{language === "en" ? "Club / Team vs Team" : "Đấu đồng đội CLB"}</option>
                  </select>
                </div>

                {formType === "team_vs_team" && (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      {language === "en" ? "Team size *" : "Số lượng VĐV mỗi bên *"}
                    </label>
                    <select
                      value={formTeamSize}
                      onChange={(e) => setFormTeamSize(Number(e.target.value))}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                    >
                      <option value={2}>2v2</option>
                      <option value={3}>3v3</option>
                      <option value={4}>4v4</option>
                      <option value={5}>5v5</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Linked Athlete Profile Selection */}
              {formType === "solo_1v1" && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    {language === "en" ? "Select Athlete Profile *" : "Đại diện hồ sơ VĐV thi đấu *"}
                  </label>
                  <select
                    value={selectedAthleteId}
                    onChange={(e) => setSelectedAthleteId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  >
                    {loggedInAthlete ? (
                      <option value={loggedInAthlete.id}>
                        {loggedInAthlete.name} (VSC-{loggedInAthlete.id}) - Linked Account
                      </option>
                    ) : (
                      systemAthletes.map((ath) => (
                        <option key={ath.id} value={ath.id}>
                          {ath.name} (VSC-{ath.id})
                        </option>
                      ))
                    )}
                  </select>
                  {!loggedInAthlete && (
                    <p className="text-[10px] text-gray-400 mt-1">
                      {language === "en" 
                        ? "Note: Your account is not linked to a system athlete. Linking email in VSC System directory will lock this automatically." 
                        : "Lưu ý: Tài khoản của bạn chưa được liên kết với hồ sơ VĐV. Bạn có thể chọn tạm hồ sơ VĐV đại diện thi đấu."}
                    </p>
                  )}
                </div>
              )}

              {/* Linked Club Selection */}
              {formType === "team_vs_team" && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    {language === "en" ? "Select Club *" : "Đại diện Câu lạc bộ thi đấu *"}
                  </label>
                  <select
                    value={selectedClubId}
                    onChange={(e) => setSelectedClubId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  >
                    {loggedInClubs.length > 0 ? (
                      loggedInClubs.map((club) => (
                        <option key={club.id} value={club.id}>
                          {club.name} (CLB-{club.id})
                        </option>
                      ))
                    ) : (
                      systemClubs.map((club) => (
                        <option key={club.id} value={club.id}>
                          {club.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              )}

              {/* Match Rules Rule Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  {language === "en" ? "Match Rule & Point Format *" : "Quy định luật chơi & Cách phân thắng bại *"}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Best of 3, Chạm 11 điểm trước, hoặc Bắn 10 viên"
                  value={formRules}
                  onChange={(e) => setFormRules(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                />
              </div>

              {/* Date & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    {language === "en" ? "Scheduled DateTime *" : "Thời gian hẹn thi đấu *"}
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formDateTime}
                    onChange={(e) => setFormDateTime(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    {language === "en" ? "Venue / Location *" : "Địa điểm / Sân thi đấu *"}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Sân ĐH Y Hà Nội"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                  />
                </div>
              </div>

              {/* Optional Referee */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  {language === "en" ? "Referee Email (Optional)" : "Email Trọng tài chỉ định (Không bắt buộc)"}
                </label>
                <input
                  type="email"
                  placeholder="referee@example.com"
                  value={formRefereeEmail}
                  onChange={(e) => setFormRefereeEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                />
              </div>

              {/* Challenge Description / Notes */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  {language === "en" ? "Notes / Extra description" : "Mô tả thêm / Ghi chú kèo nước"}
                </label>
                <textarea
                  rows={2}
                  placeholder="vd: Kèo bia giao lưu trà đá chia tiền sân vui vẻ..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-150 rounded-xl transition-colors cursor-pointer"
                >
                  {language === "en" ? "Discard" : "Hủy bỏ"}
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md cursor-pointer transition-colors flex items-center gap-2"
                >
                  {actionLoading ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : null}
                  <span>{language === "en" ? "Post Challenge" : "Đăng Kèo Ngay"}</span>
                </button>
              </div>

            </form>

          </motion.div>
        </div>
      )}

    </div>
  );
};
