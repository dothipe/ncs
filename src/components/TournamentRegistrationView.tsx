import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { 
  ClipboardCheck, 
  User, 
  Lock, 
  Unlock, 
  Shuffle, 
  CreditCard, 
  Users, 
  FileText, 
  AlertCircle,
  Calendar,
  MapPin,
  CheckCircle,
  Check,
  Search,
  ChevronRight,
  Printer,
  X,
  UserCheck,
  UserPlus,
  ArrowRight,
  ShieldAlert
} from "lucide-react";
import { updateOnlineTournament, getVscSystemAthletes, subscribeToVscSystemClubs } from "../lib/firebaseService";
import { Athlete, Club } from "../types";

const AVATAR_MALE = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80";

interface TournamentRegistrationViewProps {
  currentTournamentDoc: any;
  activeHistoryId: string | null;
  language: "vi" | "en";
  currentUser: any;
  onOpenAuthModal?: () => void;
  onAddAuditLog?: (msg: string) => void;
  setActiveTab?: (tab: any) => void;
}

export const TournamentRegistrationView: React.FC<TournamentRegistrationViewProps> = ({
  currentTournamentDoc,
  activeHistoryId,
  language,
  currentUser,
  onOpenAuthModal,
  onAddAuditLog,
  setActiveTab
}) => {
  const isEng = language === "en";
  const [isRegistering, setIsRegistering] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  
  const [systemAthletes, setSystemAthletes] = useState<Athlete[]>([]);
  const [systemClubs, setSystemClubs] = useState<Club[]>([]);

  // Double confirmation modal states
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmStep, setConfirmStep] = useState<1 | 2>(1);
  const [athleteToRegister, setAthleteToRegister] = useState<any | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("Nghiệp dư");

  const masterAthletes: Athlete[] = currentTournamentDoc?.masterAthletes || [];
  const drawnNumbers = currentTournamentDoc?.drawnNumbers || {};
  const isDrawingOpen = currentTournamentDoc?.isDrawingOpen || false;
  const laneCapacity = currentTournamentDoc?.laneCapacity || 10;
  const matchName = currentTournamentDoc?.matchName || "";
  
  const rawMatchDate = currentTournamentDoc?.startDate || currentTournamentDoc?.matchDate || "";
  const formatMatchDate = (dateStr: string) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };
  const matchDate = formatMatchDate(rawMatchDate);

  const matchLocation = currentTournamentDoc?.location || "";

  // Fetch VSC System Athletes & Clubs
  useEffect(() => {
    const fetchSys = async () => {
      try {
        const list = await getVscSystemAthletes();
        setSystemAthletes(list || []);
      } catch (err) {
        console.error("Failed to fetch system athletes:", err);
      }
    };
    fetchSys();

    const unsubClubs = subscribeToVscSystemClubs((list) => {
      setSystemClubs(list || []);
    });

    return () => {
      unsubClubs();
    };
  }, []);

  // Find the logged-in user's VSC System Athlete profile
  const userProfile = useMemo(() => {
    if (!currentUser || !systemAthletes.length) return null;
    const email = currentUser.email?.toLowerCase().trim();
    return systemAthletes.find(ath => ath.email?.toLowerCase().trim() === email) || null;
  }, [currentUser, systemAthletes]);

  // Determine if the logged-in user is registered in this tournament
  const registeredAthlete = useMemo(() => {
    if (!userProfile) return null;
    return masterAthletes.find(ath => ath.id === userProfile.id) || null;
  }, [userProfile, masterAthletes]);

  // Determine if the logged-in user is a Club President (Trưởng CLB)
  const myClubs = useMemo(() => {
    if (!currentUser || !systemClubs.length) return [];
    const email = currentUser.email?.toLowerCase().trim();
    return systemClubs.filter(club => club.leaderEmail?.toLowerCase().trim() === email);
  }, [currentUser, systemClubs]);

  const activeClub = myClubs.length > 0 ? myClubs[0] : null;
  const isClubLeader = !!activeClub;

  // Map club members to their VSC System Athlete profile
  const clubMemberProfiles = useMemo(() => {
    if (!activeClub || !systemAthletes.length) return [];
    return activeClub.members
      .map(m => {
        const fullProfile = systemAthletes.find(ath => ath.id === m.athleteId);
        return fullProfile ? { ...fullProfile, clubRole: m.role } : null;
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);
  }, [activeClub, systemAthletes]);

  // Calculate dynamic squad and lane
  const getAthletePlacements = (athleteId: string) => {
    const sbd = drawnNumbers[athleteId];
    if (!sbd) {
      return { squadNum: null, laneNum: null, pos: null };
    }
    const squadNum = Math.floor((sbd - 1) / laneCapacity) + 1;
    const laneNum = ((sbd - 1) % laneCapacity) + 1;
    return { squadNum, laneNum, pos: sbd };
  };

  const initiateRegistrationFlow = (athlete: any) => {
    setAthleteToRegister(athlete);
    setConfirmStep(1);
    setShowConfirmModal(true);
  };

  const handleRegisterWithSystem = async (sysAthlete: any) => {
    if (!activeHistoryId) return;
    
    // Check if already registered
    const exists = masterAthletes.some(a => a.id === sysAthlete.id);
    if (exists) {
      alert(isEng 
        ? "This athlete is already registered in this tournament!" 
        : "VĐV này đã được đăng ký tham gia giải đấu rồi!");
      return;
    }

    setIsRegistering(true);
    try {
      const distances = currentTournamentDoc?.distances || [];
      const distanceKeys = distances.map((d: any) => d.id || d);
      
      const emptyScores: Record<string, boolean[]> = {};
      const shotsCount = currentTournamentDoc?.shotsCount || 10;
      distanceKeys.forEach((k: string) => {
        emptyScores[k] = Array(shotsCount).fill(false);
      });

      const newAthlete: Athlete = {
        id: sysAthlete.id,
        name: sysAthlete.name || "VĐV Hệ Thống",
        team: sysAthlete.team || sysAthlete.province || "Tự Do",
        gender: sysAthlete.gender || "Nam",
        avatarUrl: sysAthlete.avatarUrl || AVATAR_MALE,
        email: sysAthlete.email?.toLowerCase().trim() || "",
        scores: emptyScores,
        province: sysAthlete.province || "",
        country: sysAthlete.country || "Việt Nam",
        countryCode: sysAthlete.countryCode || "VN",
        category: selectedCategory
      };

      const updated = [...masterAthletes, newAthlete];
      await updateOnlineTournament(activeHistoryId, { masterAthletes: updated });
      
      onAddAuditLog?.(isEng 
        ? `Athlete ${newAthlete.name} (${newAthlete.id}) registered online` 
        : `VĐV ${newAthlete.name} (${newAthlete.id}) tự đăng ký trực tuyến`);

      alert(isEng ? "Registration Successful!" : "Đăng Ký Thành Công!");
    } catch (err) {
      console.error(err);
      alert("Đăng ký thất bại. Vui lòng thử lại!");
    } finally {
      setIsRegistering(false);
    }
  };

  // Athlete self random drawing SBD
  const handleAthleteDrawSBD = async () => {
    if (!activeHistoryId || !registeredAthlete) return;
    
    setIsDrawing(true);
    try {
      const existingNumbers = new Set(Object.values(drawnNumbers) as number[]);
      const poolSize = masterAthletes.length;
      const availableNumbers: number[] = [];
      for (let i = 1; i <= poolSize; i++) {
        if (!existingNumbers.has(i)) {
          availableNumbers.push(i);
        }
      }

      if (availableNumbers.length === 0) {
        alert(isEng ? "No available SBD left in the pool!" : "Đã hết số báo danh trống trong hòm phiếu!");
        setIsDrawing(false);
        return;
      }

      // Pick random SBD
      const randomIndex = Math.floor(Math.random() * availableNumbers.length);
      const pickedSBD = availableNumbers[randomIndex];

      const nextDrawnNumbers = { ...drawnNumbers };
      nextDrawnNumbers[registeredAthlete.id] = pickedSBD;

      const nextDrawMethods = { ...(currentTournamentDoc?.drawMethods || {}) };
      nextDrawMethods[registeredAthlete.id] = "self";

      await updateOnlineTournament(activeHistoryId, {
        drawnNumbers: nextDrawnNumbers,
        drawMethods: nextDrawMethods
      });

      onAddAuditLog?.(isEng 
        ? `Athlete ${registeredAthlete.name} drawn SBD #${pickedSBD} online` 
        : `VĐV ${registeredAthlete.name} tự bốc thăm SBD #${pickedSBD} trực tuyến`);

      alert(isEng 
        ? `Congratulations! Your SBD is: ${pickedSBD}` 
        : `Chúc mừng! Số báo danh bốc thăm của bạn là: ${pickedSBD}`);
    } catch (err) {
      console.error("Self drawing failed:", err);
      alert("Bốc thăm không thành công. Vui lòng thử lại!");
    } finally {
      setIsDrawing(false);
    }
  };

  const handlePrintCard = () => {
    window.print();
  };

  // Portal Gate Closed for unregistered users
  if (!isDrawingOpen && !registeredAthlete) {
    return (
      <div className="max-w-xl mx-auto my-12 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-8 rounded-3xl text-center shadow-md animate-fadeIn font-sans">
        <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/40 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-rose-100 dark:border-rose-900/40 animate-bounce">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-wide">
          {isEng ? "REGISTRATION CLOSED" : "CỔNG ĐĂNG KÝ ĐÃ ĐÓNG"}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-3 leading-relaxed">
          {isEng 
            ? "The registration and lucky SBD drawing portal for this tournament is currently closed by the organizers."
            : "Cổng đăng ký thi đấu trực tuyến và bốc thăm Số báo danh ngẫu nhiên đã được Ban Tổ Chức đóng lại."}
        </p>
        <div className="mt-6 border-t border-slate-100 dark:border-slate-850 pt-5 text-left space-y-3.5">
          <div className="flex items-start gap-2 text-xs">
            <Calendar className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-extrabold text-slate-700 dark:text-slate-300 block">{isEng ? "Tournament Name" : "Tên Giải Đấu"}</span>
              <span className="text-slate-500 dark:text-slate-400 block font-bold">{matchName}</span>
            </div>
          </div>
          <div className="flex items-start gap-2 text-xs">
            <MapPin className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-extrabold text-slate-700 dark:text-slate-300 block">{isEng ? "Location" : "Địa Điểm Thi Đấu"}</span>
              <span className="text-slate-500 dark:text-slate-400 block font-bold">{matchLocation || (isEng ? "To be announced" : "Sẽ thông báo sau")}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6 font-sans">
      {/* HEADER banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-rose-950 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-lg border border-slate-800">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent"></div>
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 bg-rose-500/25 text-rose-300 border border-rose-500/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
            {isDrawingOpen ? (
              <span className="flex items-center gap-1 animate-pulse"><Unlock className="w-3 h-3" /> {isEng ? "Drawing Open" : "CỔNG BỐC THĂM ĐANG MỞ"}</span>
            ) : (
              <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> {isEng ? "Drawing Closed" : "CỔNG BỐC THĂM ĐÃ ĐÓNG"}</span>
            )}
          </div>
          <h1 className="text-xl sm:text-3xl font-black uppercase tracking-wide leading-tight">
            {isEng ? "National Tournament Registration" : "Đăng Ký & Bốc Thăm Giải Quốc Gia"}
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm font-semibold max-w-2xl">
            {isEng 
              ? `Official athlete registration portal for ${matchName}. Join and draw your random placement.`
              : `Cổng đăng ký, bốc thăm vị trí bệ bắn và số báo danh (SBD) tự động cho giải đấu ${matchName}.`}
          </p>
        </div>
      </div>

      {!currentUser ? (
        /* Sign-in required fallback */
        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-8 rounded-3xl text-center shadow-md max-w-md mx-auto">
          <User className="w-12 h-12 text-indigo-500 mx-auto mb-4 animate-pulse" />
          <h2 className="text-lg font-black text-slate-850 dark:text-white uppercase tracking-wide">
            {isEng ? "ACCOUNT SIGN-IN REQUIRED" : "YÊU CẦU ĐĂNG NHẬP"}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-2 leading-relaxed">
            {isEng 
              ? "Please sign in to your accounts to register and securely draw your unique SBD number."
              : "Vui lòng đăng nhập tài khoản của bạn để tiến hành đăng ký và tự bốc thăm SBD độc nhất của mình."}
          </p>
          <button
            onClick={onOpenAuthModal}
            className="mt-6 w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer active:scale-95"
          >
            {isEng ? "Sign In / Sign Up Now" : "Đăng Nhập Ngay"}
          </button>
        </div>
      ) : !userProfile ? (
        /* Enforce VSC System Profile creation before registering */
        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-8 rounded-3xl text-center shadow-md max-w-lg mx-auto space-y-5 animate-fadeIn">
          <div className="w-14 h-14 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto border border-amber-500/25">
            <AlertCircle className="w-7 h-7 animate-pulse" />
          </div>
          <div className="space-y-2">
            <h2 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-wide">
              {isEng ? "VSC SYSTEM PROFILE REQUIRED" : "YÊU CẦU ĐĂNG KÝ HỒ SƠ VĐV HỆ THỐNG"}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed max-w-md mx-auto">
              {isEng 
                ? "You do not have a registered VSC System Athlete card linked to your account. To participate in this official national tournament, please create your official system profile first."
                : "Tài khoản của bạn chưa liên kết với Thẻ vận động viên hệ thống VSC. Để đăng ký tham gia giải đấu quốc gia, bạn cần đăng ký/tạo hồ sơ VĐV Hệ Thống VSC của mình trước."}
            </p>
          </div>
          <button
            onClick={() => setActiveTab?.("vsc_system_directory")}
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:opacity-90 text-slate-900 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all cursor-pointer active:scale-98"
          >
            {isEng ? "Go Create System Athlete Profile Now" : "ĐĂNG KÝ HỒ SƠ VĐV HỆ THỐNG NGAY"}
          </button>
        </div>
      ) : (
        /* Logged in user has a system profile */
        <div className="space-y-8 animate-fadeIn">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left panel: Info status & SBD Drawing button */}
            <div className="lg:col-span-7 space-y-6">
              
              {!registeredAthlete ? (
                /* Profile & Register Button */
                <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-6 sm:p-8 rounded-3xl shadow-sm space-y-6">
                  <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-850 pb-4">
                    <div className="p-2.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                      <ClipboardCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{isEng ? "STEP 1" : "BƯỚC 1"}</span>
                      <h2 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-wide">
                        {isEng ? "Tournament Entry Registration" : "ĐĂNG KÝ THAM GIA GIẢI ĐẤU QUỐC GIA"}
                      </h2>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                    {isEng 
                      ? "Your VSC System profile was successfully detected! Please review your official card below and click confirm to register for the tournament."
                      : "Hệ thống đã nhận diện thành công hồ sơ VĐV Hệ Thống VSC của bạn! Vui lòng kiểm tra thông tin thẻ bên dưới và nhấn đăng ký tham gia giải đấu chính thức."}
                  </p>

                  {/* Logged in user's system profile card */}
                  <div className="bg-slate-50 dark:bg-slate-955/20 border border-slate-150 dark:border-slate-800 p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <img 
                        src={userProfile.avatarUrl || AVATAR_MALE} 
                        alt={userProfile.name} 
                        className="w-14 h-14 rounded-full border-2 border-indigo-500/30 object-cover shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="text-center sm:text-left">
                        <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest block font-mono">{userProfile.id}</span>
                        <h3 className="text-sm font-black text-slate-850 dark:text-white block">{userProfile.name}</h3>
                        <span className="text-[11px] text-slate-400 font-bold block">{isEng ? "Province/Club: " : "Tỉnh thành/CLB: "} {userProfile.province || userProfile.team || "Tự Do"}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => initiateRegistrationFlow(userProfile)}
                      className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md active:scale-98"
                    >
                      {isEng ? "Register For Tournament" : "ĐĂNG KÝ THI ĐẤU"}
                    </button>
                  </div>
                </div>
              ) : (
                /* Registered Dashboard, Drawing & Success Pass */
                <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-6 sm:p-8 rounded-3xl shadow-sm space-y-6">
                  <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-850 pb-4">
                    <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                      <CheckCircle className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{isEng ? "STATUS" : "TRẠNG THÁI HỒ SƠ"}</span>
                      <h2 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-wide">
                        {isEng ? "Registration Completed!" : "ĐÃ ĐĂNG KÝ THI ĐẤU THÀNH CÔNG!"}
                      </h2>
                    </div>
                  </div>

                  {/* Dynamic instruction or info based on SBD status */}
                  {(() => {
                    const sbdNum = drawnNumbers[registeredAthlete.id];
                    const { squadNum, laneNum, pos } = getAthletePlacements(registeredAthlete.id);

                    if (sbdNum) {
                      return (
                        <div className="bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 p-5 rounded-2xl space-y-3">
                          <span className="block text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">{isEng ? "OFFICIAL COMPETITOR CONFIRMED" : "XÁC NHẬN SỐ BÁO DANH & ĐIỀU PHỐI THỰC ĐỊA"}</span>
                          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                            {isEng 
                              ? `You have drawn SBD #${sbdNum} and are scheduled for Squad ${squadNum} on Lane ${laneNum} (Order of Entry: ${pos}). Please present your Athlete Card at the gate.`
                              : `Bạn đã hoàn tất bốc thăm Số báo danh chính thức là #${String(sbdNum).padStart(3, "0")}. Theo sắp xếp điều phối từ ban tổ chức, bạn sẽ thi đấu tại Lượt ${squadNum} - Bệ bắn (Lane) ${laneNum} (Vị trí xếp hàng: ${pos}).`}
                          </p>
                        </div>
                      );
                    } else if (isDrawingOpen) {
                      return (
                        <div className="bg-amber-500/5 dark:bg-amber-955/20 border border-amber-100 dark:border-amber-900/40 p-5 rounded-2xl space-y-4">
                          <span className="block text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest">{isEng ? "LUCKY DRAW FOR SBD PENDING" : "CHỜ BỐC THĂM SỐ BÁO DANH NGẪU NHIÊN"}</span>
                          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                            {isEng 
                              ? "The drawing portal is currently open! Please click the button below to randomly draw your Số Báo Danh (SBD). Your bệ bắn (lane) & lượt thi đấu (squad) will be automatically generated immediately."
                              : "Ban tổ chức giải đấu đang mở cổng bốc thăm trực tuyến! Vui lòng nhấn nút dưới đây để hòm phiếu điện tử tự động bốc và cấp Số Báo Danh (SBD) ngẫu nhiên cho bạn."}
                          </p>
                          
                          <button
                            type="button"
                            disabled={isDrawing}
                            onClick={handleAthleteDrawSBD}
                            className="w-full py-3.5 bg-gradient-to-r from-rose-600 to-indigo-650 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:opacity-90 shadow-md transition-all active:scale-98 cursor-pointer"
                          >
                            <Shuffle className="w-4 h-4 animate-spin-slow" />
                            {isDrawing ? (
                              <span>{isEng ? "Drawing..." : "ĐANG BỐC THĂM..."}</span>
                            ) : (
                              <span>{isEng ? "CLICK TO LUCKY DRAW MY SBD" : "BẤM ĐỂ TỰ BỐC THĂM SBD NGẪU NHIÊN"}</span>
                            )}
                          </button>
                        </div>
                      );
                    } else {
                      return (
                        <div className="bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 p-5 rounded-2xl space-y-2">
                          <span className="block text-[10px] font-black text-rose-500 uppercase tracking-widest">{isEng ? "DRAWING PORTAL LOCKED" : "CỔNG BỐC THĂM HIỆN ĐANG ĐÓNG"}</span>
                          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                            {isEng 
                              ? "The draw has not been opened yet or was closed by the BTC. Please wait for the official notification during the technical briefing."
                              : "Hệ thống bốc thăm trực tuyến tự động chưa được mở hoặc Ban Tổ Chức đang tạm đóng lại. Vui lòng chờ tín hiệu hoặc thông báo chính thức tại khu vực thi đấu."}
                          </p>
                        </div>
                      );
                    }
                  })()}

                  {/* Tournament Details Section */}
                  <div className="border-t border-slate-100 dark:border-slate-850 pt-5 space-y-4">
                    <span className="block text-[10px] font-black text-slate-450 uppercase tracking-widest">{isEng ? "Official Tournament Details" : "THÔNG TIN CHI TIẾT GIẢI ĐẤU"}</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex items-start gap-2.5 text-xs">
                        <Calendar className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-extrabold text-slate-700 dark:text-slate-300 block">{isEng ? "Match Date" : "Ngày Thi Đấu"}</span>
                          <span className="text-slate-500 dark:text-slate-400 block font-bold">{matchDate || (isEng ? "To be announced" : "Đang cập nhật")}</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5 text-xs">
                        <MapPin className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-extrabold text-slate-700 dark:text-slate-300 block">{isEng ? "Location" : "Địa Điểm"}</span>
                          <span className="text-slate-500 dark:text-slate-400 block font-bold">{matchLocation || (isEng ? "Official venue" : "Bệ bắn chính thức VSC")}</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5 text-xs">
                        <Users className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-extrabold text-slate-700 dark:text-slate-300 block">{isEng ? "Category" : "Quy Mô"}</span>
                          <span className="text-slate-500 dark:text-slate-400 block font-bold">{isEng ? "National Slingshot Championship" : "Vô Địch Cup Quốc Gia"}</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5 text-xs">
                        <FileText className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-extrabold text-slate-700 dark:text-slate-300 block">{isEng ? "Target Format" : "Thể Thức & Quy Cách Thụ Bia"}</span>
                          <span className="text-slate-500 dark:text-slate-400 block font-bold">{isEng ? "Official VSC Standard" : "Thụ bia tiêu chuẩn VSC Việt Nam"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* CLUB MEMBER REGISTRATION (Exclusive for Club Leaders) */}
              {isClubLeader && (
                <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-6 sm:p-8 rounded-3xl shadow-sm space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                        <Users className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                          {isEng ? `CLUB LEADER CONTROL: ${activeClub.name}` : `QUYỀN TRƯỞNG CLB: ${activeClub.name}`}
                        </span>
                        <h2 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-wide">
                          {isEng ? "Register Roster On Behalf" : "ĐĂNG KÝ THI ĐẤU HỘ CHO THÀNH VIÊN CLB"}
                        </h2>
                      </div>
                    </div>
                    <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-150 dark:border-indigo-900/30 font-black px-2.5 py-1 rounded-xl font-mono">
                      {clubMemberProfiles.length} MEMBER
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {isEng 
                      ? "As the verified Club President, you have special permission to register any official member of your club's roster. Click register on behalf to secure their spot."
                      : "Với vai trò Trưởng câu lạc bộ đã được phê duyệt, bạn có thẩm quyền tối cao đăng ký thi đấu hộ cho các thành viên chính thức trong CLB của mình tham gia giải đấu này."}
                  </p>

                  <div className="border border-slate-150 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-150 dark:divide-slate-800">
                    {clubMemberProfiles.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400 italic">
                        {isEng ? "No verified members inside this club roster yet." : "Hiện chưa có thành viên chính thức nào trong biên chế CLB."}
                      </div>
                    ) : (
                      clubMemberProfiles.map(member => {
                        const isRegistered = masterAthletes.some(a => a.id === member.id);
                        const sbdNum = drawnNumbers[member.id];

                        return (
                          <div key={member.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/30 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                            <div className="flex items-center gap-3">
                              <img 
                                src={member.avatarUrl || AVATAR_MALE} 
                                alt={member.name} 
                                className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-850 object-cover shrink-0"
                                referrerPolicy="no-referrer"
                              />
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-black text-slate-800 dark:text-white">{member.name}</span>
                                  <span className="text-[9px] font-mono font-black text-rose-500">{member.id}</span>
                                </div>
                                <span className="text-[10px] text-slate-400 block font-semibold">
                                  {member.email || "Không có email"} • {isEng ? "Role: " : "Vai trò: "} {member.clubRole === "leader" ? (isEng ? "Leader" : "Trưởng CLB") : (isEng ? "Member" : "Thành viên")}
                                </span>
                              </div>
                            </div>

                            <div className="shrink-0">
                              {isRegistered ? (
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-150 dark:border-emerald-900/20 px-2.5 py-1 rounded-xl">
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    {isEng ? "Registered" : "Đã đăng ký"}
                                  </span>
                                  {sbdNum && (
                                    <span className="inline-flex items-center text-xs font-black bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-150 dark:border-rose-900/30 px-2.5 py-1 rounded-xl font-mono">
                                      SBD {String(sbdNum).padStart(3, "0")}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => initiateRegistrationFlow(member)}
                                  className="w-full sm:w-auto px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[11px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                                >
                                  {isEng ? "Register On Behalf" : "Đăng Ký Hộ"}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right panel: Official Athlete ID Card (Standard 5.4cm x 8.6cm layout) */}
            <div className="lg:col-span-5 flex flex-col items-center gap-4">
              <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest block">{isEng ? "Official Athlete Pass Card Preview" : "THẺ VẬN ĐỘNG VIÊN BAN TỔ CHỨC"}</span>
              
              {/* The Badge itself (Aspect ratio corresponding to standard 5.4cm x 8.6cm) */}
              <div 
                id="official-athlete-badge" 
                className="w-[280px] h-[446px] bg-gradient-to-b from-indigo-950 via-slate-900 to-red-950 rounded-3xl shadow-2xl border-4 border-amber-400 text-white relative overflow-hidden flex flex-col justify-between p-4.5 font-sans animate-scaleUp text-center print:shadow-none print:border-amber-400"
              >
                {/* Top luxury badge brand patterns */}
                <div className="absolute top-0 inset-x-0 h-[100px] bg-gradient-to-b from-amber-500/10 via-transparent to-transparent pointer-events-none"></div>
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-indigo-500/5 via-transparent to-transparent pointer-events-none"></div>

                {/* Card Header: Tournament Name (Tên giải đấu) */}
                <div className="relative z-10 border-b border-white/10 pb-2">
                  <div className="flex flex-col items-center justify-center gap-0.5">
                    <span className="text-[10px] font-black tracking-wider text-yellow-300 uppercase leading-tight line-clamp-2 max-w-[250px] drop-shadow-sm">
                      {matchName || "VSC VIETNAM CHAMPIONSHIP"}
                    </span>
                  </div>
                  <h3 className="text-[8px] font-bold tracking-widest text-white/75 uppercase mt-1">
                    {isEng ? "OFFICIAL COMPETITOR" : "THẺ VẬN ĐỘNG VIÊN"}
                  </h3>
                </div>

                {/* Main Avatar + Photo Holder */}
                <div className="relative flex flex-col items-center mt-3">
                  <div className="relative">
                    <img 
                      src={registeredAthlete?.avatarUrl || userProfile.avatarUrl || AVATAR_MALE} 
                      alt={registeredAthlete?.name || userProfile.name} 
                      className="w-24 h-24 rounded-2xl object-cover border-2 border-amber-400 bg-slate-800 shadow-lg shadow-black/45"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>

                {/* SBD & ID Row (Ngang hàng và cùng font size) */}
                <div className="flex items-center justify-center gap-2.5 relative z-10 py-1.5 px-3 bg-white/5 border border-white/10 rounded-xl mt-3 text-[10px] font-mono font-bold">
                  <div className="flex items-center gap-1 text-yellow-400">
                    <span>SBD:</span>
                    <span className="text-white font-extrabold text-[10px]">
                      {registeredAthlete && drawnNumbers[registeredAthlete.id] 
                        ? String(drawnNumbers[registeredAthlete.id]).padStart(3, "0") 
                        : "---"}
                    </span>
                  </div>
                  <div className="w-px h-3 bg-white/20"></div>
                  <div className="flex items-center gap-1 text-indigo-300">
                    <span>ID:</span>
                    <span className="text-white font-extrabold text-[10px] uppercase">
                      {(registeredAthlete?.id || userProfile.id || "PENDING").substring(0, 8)}
                    </span>
                  </div>
                </div>

                {/* Athlete Name & Team (Tên viết lớn, ĐẬM, tô màu, có Viền chữ + Tên CLB/Team thay Email) */}
                <div className="mt-3.5 relative z-10 flex flex-col items-center">
                  <span 
                    className="text-lg font-black uppercase tracking-wide text-yellow-300 block truncate max-w-[240px] drop-shadow-md"
                    style={{ textShadow: "1px 1px 0px #991b1b, -1px -1px 0px #991b1b, 1px -1px 0px #991b1b, -1px 1px 0px #991b1b, 0px 2px 4px rgba(0,0,0,0.8)" }}
                  >
                    {registeredAthlete?.name || userProfile.name}
                  </span>
                  
                  {/* Team/Club instead of Email */}
                  <span className="text-[9px] font-black text-white bg-slate-800/60 border border-white/10 px-2.5 py-0.5 rounded-full inline-block truncate max-w-[240px] mt-1.5 uppercase tracking-widest">
                    {registeredAthlete?.team || userProfile.team || (isEng ? "FREE AGENT" : "VĐV TỰ DO")}
                  </span>
                </div>

                {/* Field Placement Footer Block */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-2 mt-3 grid grid-cols-3 gap-1.5 text-left relative z-10">
                  <div>
                    <span className="block text-[7px] text-slate-400 font-black uppercase tracking-widest">LƯỢT BẮN</span>
                    <span className="block font-black text-[10px] text-indigo-300 font-mono mt-0.5">
                      {(() => {
                        if (!registeredAthlete) return "CHƯA ĐK";
                        const { squadNum } = getAthletePlacements(registeredAthlete.id);
                        return squadNum ? `SQ ${squadNum}` : "CHƯA XẾP";
                      })()}
                    </span>
                  </div>
                  <div className="border-l border-white/10 pl-1.5">
                    <span className="block text-[7px] text-slate-400 font-black uppercase tracking-widest">BỆ (LANE)</span>
                    <span className="block font-black text-[10px] text-amber-300 font-mono mt-0.5">
                      {(() => {
                        if (!registeredAthlete) return "CHƯA ĐK";
                        const { laneNum } = getAthletePlacements(registeredAthlete.id);
                        return laneNum ? `LANE ${laneNum}` : "CHƯA XẾP";
                      })()}
                    </span>
                  </div>
                  <div className="border-l border-white/10 pl-1.5">
                    <span className="block text-[7px] text-slate-400 font-black uppercase tracking-widest">PHÂN HẠNG</span>
                    <span className="block font-black text-[10px] text-emerald-400 truncate mt-0.5 uppercase">
                      {registeredAthlete?.category || "Nghiệp dư"}
                    </span>
                  </div>
                </div>

                {/* Footer design ribbon: Location & Competition Date */}
                <div className="text-[7.5px] font-black text-amber-450 tracking-wider mt-2.5 pt-1 border-t border-white/15 uppercase font-mono">
                  {(() => {
                    const locPart = matchLocation ? `${matchLocation}` : "";
                    const datePart = matchDate ? `ngày ${matchDate}` : "22/8/2026";
                    
                    if (isEng) {
                      const locEng = matchLocation ? `LOCATION: ${matchLocation.toUpperCase()}, ` : "";
                      const dateEng = matchDate ? `DATE: ${matchDate}` : "DATE: 22/8/2026";
                      return `${locEng}${dateEng}`;
                    } else {
                      if (locPart) {
                        return `${locPart}, ${datePart}`;
                      } else {
                        return `NGÀY THI ĐẤU: ${matchDate || "22/8/2026"}`;
                      }
                    }
                  })()}
                </div>
              </div>

              {/* Print action button */}
              {registeredAthlete && (
                <button
                  onClick={handlePrintCard}
                  className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{isEng ? "Print Athlete Card" : "In Thẻ VĐV Ban Tổ Chức"}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Double Confirmation Modal via createPortal */}
      {showConfirmModal && athleteToRegister && createPortal(
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative animate-scaleUp">
            {/* Close Button */}
            <button 
              onClick={() => setShowConfirmModal(false)}
              className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 dark:text-slate-500 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {confirmStep === 1 ? (
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center border border-indigo-150 dark:border-indigo-900/40">
                  <ClipboardCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-wide">
                    {isEng ? "Tournament Registration Request" : "Xác Nhận Đăng Ký Thi Đấu"}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    {isEng 
                      ? `Are you sure you want to register ${athleteToRegister.name} for this tournament?`
                      : `Bạn có chắc chắn muốn đăng ký cho vận động viên ${athleteToRegister.name} tham gia giải đấu này?`}
                  </p>
                </div>

                {/* Athlete Quick Info Card inside Modal */}
                <div className="bg-slate-50 dark:bg-slate-955/20 border border-slate-150 dark:border-slate-800 p-4 rounded-2xl flex items-center gap-3">
                  <img 
                    src={athleteToRegister.avatarUrl || AVATAR_MALE} 
                    alt={athleteToRegister.name} 
                    className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-850 object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <span className="text-[10px] font-mono text-rose-500 font-bold block">{athleteToRegister.id}</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-white block">{athleteToRegister.name}</span>
                    <span className="text-[10px] text-slate-400 block font-semibold">{athleteToRegister.province || athleteToRegister.team || "Tự Do"}</span>
                  </div>
                </div>

                {/* Category Selection for Self Registration */}
                <div className="space-y-1.5 text-left bg-indigo-50/50 dark:bg-indigo-950/25 border border-indigo-100 dark:border-indigo-900/30 p-3.5 rounded-2xl">
                  <label className="block text-[11px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wide">
                    {isEng ? "Competition Category:" : "Hạng mục đăng ký thi đấu:"}
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-indigo-200 dark:border-indigo-900 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold text-indigo-800 dark:text-indigo-300"
                  >
                    <option value="Nghiệp dư">{isEng ? "Amateur (Nghiệp dư)" : "Nghiệp dư (Mặc định)"}</option>
                    <option value="Chuyên nghiệp">{isEng ? "Professional (Chuyên nghiệp)" : "Chuyên nghiệp"}</option>
                    <option value="Lão tướng">{isEng ? "Senior/Master (Lão tướng)" : "Lão tướng"}</option>
                    <option value="Trẻ em">{isEng ? "Children (Trẻ em)" : "Trẻ em"}</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowConfirmModal(false)}
                    className="flex-1 py-2.5 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-black transition-all hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer"
                  >
                    {isEng ? "Cancel" : "Hủy Bỏ"}
                  </button>
                  <button
                    onClick={() => setConfirmStep(2)}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>{isEng ? "Continue" : "Tiếp Tục"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-955/20 text-amber-600 flex items-center justify-center border border-amber-150 dark:border-amber-900/30">
                  <ShieldAlert className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-black text-amber-600 uppercase tracking-wide">
                    {isEng ? "Final Anti-Spam Confirmation" : "Xác Nhận Lần Cuối (Chống Spam)"}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    {isEng 
                      ? "To prevent automated registrations or accidental submissions, please perform this final step. Click below to secure your place."
                      : "Nhằm phòng tránh việc đăng ký nhầm lẫn hoặc spam hệ thống, vui lòng thực hiện bước xác nhận cuối cùng này. Nhấp nút bên dưới để ghi tên vào danh sách thi đấu chính thức."}
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setConfirmStep(1)}
                    className="flex-1 py-2.5 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-black transition-all hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer"
                  >
                    {isEng ? "Back" : "Quay Lại"}
                  </button>
                  <button
                    disabled={isRegistering}
                    onClick={async () => {
                      await handleRegisterWithSystem(athleteToRegister);
                      setShowConfirmModal(false);
                    }}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isRegistering ? (
                      <span className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></span>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>{isEng ? "Final Confirm" : "Xác Nhận Lần Cuối"}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
