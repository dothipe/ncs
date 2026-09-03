import React, { useState, useEffect } from "react";
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
  Printer
} from "lucide-react";
import { updateOnlineTournament, getVscSystemAthletes } from "../lib/firebaseService";
import { Athlete } from "../types";

const AVATAR_MALE = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80";

interface TournamentRegistrationViewProps {
  currentTournamentDoc: any;
  activeHistoryId: string | null;
  language: "vi" | "en";
  currentUser: any;
  onOpenAuthModal?: () => void;
  onAddAuditLog?: (msg: string) => void;
}

export const TournamentRegistrationView: React.FC<TournamentRegistrationViewProps> = ({
  currentTournamentDoc,
  activeHistoryId,
  language,
  currentUser,
  onOpenAuthModal,
  onAddAuditLog
}) => {
  const isEng = language === "en";
  const [isRegistering, setIsRegistering] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [systemAthletes, setSystemAthletes] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchedResults, setSearchedResults] = useState<any[]>([]);
  const [selectedSystemAthlete, setSelectedSystemAthlete] = useState<any | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);

  // Manual form states
  const [manualName, setManualName] = useState("");
  const [manualTeam, setManualTeam] = useState("");
  const [manualGender, setManualGender] = useState("Nam");
  const [manualEmail, setManualEmail] = useState("");
  const [manualGearSling, setManualGearSling] = useState("");
  const [manualGearFork, setManualGearFork] = useState("");
  const [manualGearBand, setManualGearBand] = useState("");
  const [manualGearStance, setManualGearStance] = useState("");

  const masterAthletes: Athlete[] = currentTournamentDoc?.masterAthletes || [];
  const drawnNumbers = currentTournamentDoc?.drawnNumbers || {};
  const isDrawingOpen = currentTournamentDoc?.isDrawingOpen || false;
  const laneCapacity = currentTournamentDoc?.laneCapacity || 10;
  const matchName = currentTournamentDoc?.matchName || "";
  const matchDate = currentTournamentDoc?.matchDate || "";
  const matchLocation = currentTournamentDoc?.location || "";

  // Fetch VSC System Athletes for verification and linking
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
  }, []);

  // Search filter
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchedResults([]);
      return;
    }
    const cleanQuery = searchQuery.toLowerCase().trim();
    const filtered = systemAthletes.filter(ath => 
      (ath.name && ath.name.toLowerCase().includes(cleanQuery)) ||
      (ath.id && ath.id.toLowerCase().includes(cleanQuery)) ||
      (ath.email && ath.email.toLowerCase().includes(cleanQuery)) ||
      (ath.province && ath.province.toLowerCase().includes(cleanQuery))
    );
    setSearchedResults(filtered.slice(0, 5));
  }, [searchQuery, systemAthletes]);

  // Determine if current logged in user is registered
  const registeredAthlete = masterAthletes.find(ath => {
    if (!currentUser) return false;
    // Match by email
    const loggedInEmail = currentUser.email?.toLowerCase().trim();
    if (loggedInEmail && ath.email?.toLowerCase().trim() === loggedInEmail) {
      return true;
    }
    // Match by ID if athlete ID is associated with logged in user profile
    return false;
  });

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
        email: currentUser?.email?.toLowerCase().trim() || sysAthlete.email || "",
        scores: emptyScores,
        province: sysAthlete.province || "",
        country: sysAthlete.country || "Việt Nam",
        countryCode: sysAthlete.countryCode || "VN"
      };

      const updated = [...masterAthletes, newAthlete];
      await updateOnlineTournament(activeHistoryId, { masterAthletes: updated });
      
      onAddAuditLog?.(isEng 
        ? `Athlete ${newAthlete.name} (${newAthlete.id}) registered online` 
        : `VĐV ${newAthlete.name} (${newAthlete.id}) tự đăng ký trực tuyến`);

      setSelectedSystemAthlete(null);
      setSearchQuery("");
      alert(isEng ? "Registration Successful!" : "Đăng Ký Thành Công!");
    } catch (err) {
      console.error(err);
      alert("Đăng ký thất bại. Vui lòng thử lại!");
    } finally {
      setIsRegistering(false);
    }
  };

  const handleRegisterManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeHistoryId) return;
    if (!manualName.trim()) {
      alert(isEng ? "Please enter your name" : "Vui lòng nhập họ và tên");
      return;
    }

    setIsRegistering(true);
    try {
      // Find a safe custom ID
      const randomIdSuffix = Math.floor(1000 + Math.random() * 9000);
      const customId = `REG-${randomIdSuffix}`;

      const distances = currentTournamentDoc?.distances || [];
      const distanceKeys = distances.map((d: any) => d.id || d);
      
      const emptyScores: Record<string, boolean[]> = {};
      const shotsCount = currentTournamentDoc?.shotsCount || 10;
      distanceKeys.forEach((k: string) => {
        emptyScores[k] = Array(shotsCount).fill(false);
      });

      const newAthlete: Athlete = {
        id: customId,
        name: manualName.trim(),
        team: manualTeam.trim() || "Tự Do",
        gender: manualGender,
        avatarUrl: AVATAR_MALE,
        email: currentUser?.email?.toLowerCase().trim() || manualEmail.trim() || "",
        scores: emptyScores,
        gearSlingName: manualGearSling.trim(),
        gearForkWidth: manualGearFork.trim(),
        gearBandSpec: manualGearBand.trim(),
        gearStance: manualGearStance.trim(),
        country: "Việt Nam",
        countryCode: "VN"
      };

      const updated = [...masterAthletes, newAthlete];
      await updateOnlineTournament(activeHistoryId, { masterAthletes: updated });

      onAddAuditLog?.(isEng 
        ? `Guest athlete ${newAthlete.name} (${newAthlete.id}) registered online` 
        : `VĐV tự do ${newAthlete.name} (${newAthlete.id}) tự đăng ký trực tuyến`);

      setShowManualForm(false);
      setManualName("");
      setManualTeam("");
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

      await updateOnlineTournament(activeHistoryId, {
        drawnNumbers: nextDrawnNumbers
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
      ) : !registeredAthlete ? (
        /* Registration Section */
        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-6 sm:p-8 rounded-3xl shadow-sm space-y-6 animate-fadeIn">
          <div className="border-b border-slate-100 dark:border-slate-850 pb-4">
            <h2 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-wide flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-indigo-600" />
              {isEng ? "Step 1: Register for the tournament" : "BƯỚC 1: ĐĂNG KÝ THAM GIA GIẢI ĐẤU"}
            </h2>
            <p className="text-[11px] text-slate-400 mt-1">
              {isEng 
                ? "You can link an existing VSC System Athlete card or fill in the form directly."
                : "Bạn có thể liên kết trực tiếp Thẻ VĐV hệ thống VSC hiện tại của mình hoặc đăng ký hồ sơ tự do mới bên dưới."}
            </p>
          </div>

          {!showManualForm ? (
            <div className="space-y-4">
              {/* Search VSC System */}
              <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-5 rounded-2xl border border-indigo-100/50 dark:border-indigo-900/20 space-y-3.5">
                <label className="block text-xs font-black text-indigo-900 dark:text-indigo-400 uppercase tracking-wider">
                  {isEng ? "Option A: Search & Link VSC System Athlete Card" : "Phương Án A: Tìm Kiếm & Liên Kết Thẻ VĐV Hệ Thống VSC"}
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder={isEng ? "Enter athlete ID (VSC-XXXX), Name, or Hometown..." : "Nhập Mã VĐV (VSC-XXXX), Tên, hoặc Tỉnh thành của bạn..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-1 focus:ring-indigo-500 outline-none font-bold"
                  />
                </div>

                {/* Searched Results dropdown */}
                {searchedResults.length > 0 && (
                  <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-850 overflow-hidden shadow-md">
                    {searchedResults.map(ath => (
                      <div 
                        key={ath.id}
                        onClick={() => setSelectedSystemAthlete(ath)}
                        className={`p-3 text-xs flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors ${
                          selectedSystemAthlete?.id === ath.id ? "bg-indigo-500/10" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <img 
                            src={ath.avatarUrl || AVATAR_MALE} 
                            alt={ath.name} 
                            className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-800 shrink-0 object-cover" 
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <span className="font-extrabold text-slate-800 dark:text-white block">{ath.name}</span>
                            <span className="text-[10px] text-slate-400 font-bold block">{ath.id} • {ath.province || ath.team || "Tự Do"}</span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Selected Athlete Confirmation Card */}
                {selectedSystemAthlete && (
                  <div className="bg-white dark:bg-slate-950 border-2 border-indigo-500/50 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-scaleUp">
                    <div className="flex items-center gap-3.5">
                      <img 
                        src={selectedSystemAthlete.avatarUrl || AVATAR_MALE} 
                        alt={selectedSystemAthlete.name} 
                        className="w-12 h-12 rounded-full border-2 border-indigo-500/30 object-cover shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <span className="text-xs font-black text-rose-500 uppercase tracking-widest block font-mono">{selectedSystemAthlete.id}</span>
                        <span className="text-sm font-black text-slate-850 dark:text-white block">{selectedSystemAthlete.name}</span>
                        <span className="text-[10.5px] text-slate-500 dark:text-slate-400 block font-semibold">{isEng ? "Club/Province: " : "Đoàn / Tỉnh thành: "} {selectedSystemAthlete.province || selectedSystemAthlete.team || "Tự Do"}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={isRegistering}
                      onClick={() => handleRegisterWithSystem(selectedSystemAthlete)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1 shrink-0"
                    >
                      {isRegistering ? (
                        <span className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></span>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          {isEng ? "Confirm & Register This Card" : "Xác Nhận Đăng Ký Thẻ Này"}
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Toggle Manual Form */}
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setShowManualForm(true)}
                  className="text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-black underline cursor-pointer"
                >
                  {isEng ? "Option B: Fill in Registration Details Manually (Guest Athlete)" : "Phương Án B: Tự Điền Thông Tin Đăng Ký (VĐV Tự Do)"}
                </button>
              </div>
            </div>
          ) : (
            /* Manual Form */
            <form onSubmit={handleRegisterManual} className="bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-850 pb-2">
                <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  {isEng ? "Manual Athlete Profile Form" : "BIỂU MẪU ĐĂNG KÝ VĐV TỰ DO"}
                </span>
                <button
                  type="button"
                  onClick={() => setShowManualForm(false)}
                  className="text-[10px] text-slate-405 font-bold hover:text-slate-700 cursor-pointer"
                >
                  {isEng ? "← Back to System Search" : "← Quay lại tìm kiếm hệ thống"}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">{isEng ? "Full Name *" : "Họ và Tên *"}</label>
                  <input
                    type="text"
                    required
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    placeholder="e.g. NGUYEN VAN A"
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">{isEng ? "Club / Province *" : "CLB / Đoàn Thi Đấu *"}</label>
                  <input
                    type="text"
                    required
                    value={manualTeam}
                    onChange={(e) => setManualTeam(e.target.value)}
                    placeholder="e.g. SLINGSHOT HA NOI"
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">{isEng ? "Gender" : "Giới Tính"}</label>
                  <select
                    value={manualGender}
                    onChange={(e) => setManualGender(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none font-bold"
                  >
                    <option value="Nam">{isEng ? "Male" : "Nam"}</option>
                    <option value="Nữ">{isEng ? "Female" : "Nữ"}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">{isEng ? "Email Address" : "Địa chỉ Email"}</label>
                  <input
                    type="email"
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none font-bold"
                  />
                </div>
              </div>

              {/* Technical Specifications of Slingshot Gear */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-850">
                <span className="block text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-3">{isEng ? "Technical Specifications (Optional)" : "THÔNG SỐ KỸ THUẬT NÁ SỬ DỤNG (NẾU CÓ)"}</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[9px] font-black text-slate-550 uppercase mb-1">{isEng ? "Gear Sling" : "Loại Ná"}</label>
                    <input
                      type="text"
                      placeholder="e.g. Vo Cuc"
                      value={manualGearSling}
                      onChange={(e) => setManualGearSling(e.target.value)}
                      className="w-full px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-550 uppercase mb-1">{isEng ? "Fork Width" : "Độ rộng chạc"}</label>
                    <input
                      type="text"
                      placeholder="e.g. 7.5cm"
                      value={manualGearFork}
                      onChange={(e) => setManualGearFork(e.target.value)}
                      className="w-full px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-550 uppercase mb-1">{isEng ? "Band Spec" : "Khổ thun"}</label>
                    <input
                      type="text"
                      placeholder="e.g. 0.55mm"
                      value={manualGearBand}
                      onChange={(e) => setManualGearBand(e.target.value)}
                      className="w-full px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-550 uppercase mb-1">{isEng ? "Ammo/Stance" : "Tư thế bắn"}</label>
                    <input
                      type="text"
                      placeholder="e.g. Toi ma"
                      value={manualGearStance}
                      onChange={(e) => setManualGearStance(e.target.value)}
                      className="w-full px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none font-semibold"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isRegistering}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black cursor-pointer shadow-sm disabled:opacity-55"
                >
                  {isRegistering ? (
                    <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></span>
                  ) : (
                    isEng ? "Submit Registration" : "Hoàn Tất Đăng Ký"
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      ) : (
        /* Registered User Dashboard, Drawing, Card & Success Info */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left panel: Info status & SBD Drawing button */}
          <div className="lg:col-span-7 space-y-6">
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
          </div>

          {/* Right panel: Official Athlete ID Card (Standard 5.4cm x 8.6cm layout) */}
          <div className="lg:col-span-5 flex flex-col items-center gap-4">
            <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest block">{isEng ? "Official Athlete Pass Card Preview" : "THẺ VẬN ĐỘNG VIÊN BAN TỔ CHỨC"}</span>
            
            {/* The Badge itself (Aspect ratio corresponding to standard 5.4cm x 8.6cm) */}
            <div 
              id="official-athlete-badge" 
              className="w-[280px] h-[446px] bg-gradient-to-b from-slate-900 via-slate-850 to-indigo-950 rounded-3xl shadow-xl border-4 border-slate-800 text-white relative overflow-hidden flex flex-col justify-between p-4.5 font-sans animate-scaleUp text-center print:shadow-none print:border-black"
            >
              {/* Top luxury badge brand patterns */}
              <div className="absolute top-0 inset-x-0 h-[100px] bg-gradient-to-b from-amber-500/10 via-transparent to-transparent pointer-events-none"></div>
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-indigo-500/5 via-transparent to-transparent pointer-events-none"></div>

              {/* Card Header */}
              <div className="relative z-10 border-b border-white/10 pb-2">
                <div className="flex items-center justify-center gap-1">
                  <div className="w-4.5 h-4.5 rounded-full bg-rose-600 flex items-center justify-center font-black text-[8px]">V</div>
                  <span className="text-[9px] font-black tracking-widest text-amber-400">VSC VIETNAM</span>
                </div>
                <h3 className="text-[8px] font-black tracking-wider text-slate-300 uppercase mt-1">
                  {isEng ? "OFFICIAL NATIONAL ATHLETE" : "THẺ VẬN ĐỘNG VIÊN QUỐC GIA"}
                </h3>
              </div>

              {/* Main Avatar + Photo Holder */}
              <div className="relative flex flex-col items-center mt-3">
                <div className="relative">
                  <img 
                    src={registeredAthlete.avatarUrl || AVATAR_MALE} 
                    alt={registeredAthlete.name} 
                    className="w-24 h-24 rounded-2xl object-cover border-2 border-amber-400 bg-slate-800 shadow-md"
                    referrerPolicy="no-referrer"
                  />
                  {/* Status Overlay */}
                  <div className="absolute -bottom-2 inset-x-0 mx-auto w-fit bg-amber-400 text-slate-900 text-[8px] font-black uppercase px-2.5 py-0.5 rounded-full border border-slate-950 leading-none">
                    {registeredAthlete.team || "VĐV TỰ DO"}
                  </div>
                </div>
              </div>

              {/* SBD & ID Row */}
              <div className="mt-4 space-y-1 relative z-10">
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black block leading-none">SỐ BÁO DANH (SBD)</span>
                {drawnNumbers[registeredAthlete.id] ? (
                  <div className="inline-block px-4 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-400 rounded-2xl text-slate-900 font-extrabold text-2xl font-mono border border-amber-500 leading-none shadow-sm shadow-amber-500/10 animate-pulse">
                    {String(drawnNumbers[registeredAthlete.id]).padStart(3, "0")}
                  </div>
                ) : (
                  <span className="text-rose-500 text-[10px] font-black uppercase tracking-wide block animate-pulse">CHƯA BỐC THĂM</span>
                )}
                <div className="text-[9px] font-mono text-slate-405 mt-0.5">ID: {registeredAthlete.id}</div>
              </div>

              {/* Athlete Name */}
              <div className="mt-3 relative z-10">
                <span className="text-[11px] sm:text-xs font-black text-white block uppercase tracking-wide truncate max-w-[240px]">
                  {registeredAthlete.name}
                </span>
                <span className="text-[8px] text-slate-450 block truncate max-w-[240px] mt-0.5">
                  {registeredAthlete.email || "Đã liên kết tài khoản"}
                </span>
              </div>

              {/* Field Placement Footer Block */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 mt-3.5 grid grid-cols-2 gap-2 text-left relative z-10">
                <div>
                  <span className="block text-[7px] text-slate-400 font-black uppercase tracking-widest">LƯỢT THI ĐẤU</span>
                  <span className="block font-black text-[11px] text-indigo-300 font-mono mt-0.5">
                    {(() => {
                      const { squadNum } = getAthletePlacements(registeredAthlete.id);
                      return squadNum ? `SQUAD ${squadNum}` : "CHƯA XẾP";
                    })()}
                  </span>
                </div>
                <div className="border-l border-white/10 pl-2">
                  <span className="block text-[7px] text-slate-400 font-black uppercase tracking-widest">BỆ BẮN (LANE)</span>
                  <span className="block font-black text-[11px] text-amber-300 font-mono mt-0.5">
                    {(() => {
                      const { laneNum } = getAthletePlacements(registeredAthlete.id);
                      return laneNum ? `LANE ${laneNum}` : "CHƯA XẾP";
                    })()}
                  </span>
                </div>
              </div>

              {/* Footer design ribbon */}
              <div className="text-[6.5px] font-black text-slate-500 tracking-wider mt-2 pt-1 border-t border-white/5 uppercase">
                {matchName || "VSC VIETNAM NATIONAL CHAMPIONSHIP"}
              </div>
            </div>

            {/* Print action button */}
            <button
              onClick={handlePrintCard}
              className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{isEng ? "Print Athlete Card" : "In Thẻ VĐV Ban Tổ Chức"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
