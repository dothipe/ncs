import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, Award, CheckCircle2, User, Phone, MapPin, Building, ShieldCheck, HelpCircle, ArrowRight, Upload, Sparkles, Loader2 } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { Athlete, SystemClub } from "../types";
import { VIETNAM_PROVINCES } from "../utils/provinces";
import { saveVscSystemAthletes, updateUserProfile, subscribeToVscSystemClubs } from "../lib/firebaseService";

const AVATAR_MALE = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80";
const AVATAR_FEMALE = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80";

const compressImage = (base64Str: string, maxWidth = 180, maxHeight = 180): Promise<string> => {
  return new Promise((resolve) => {
    if (!base64Str || !base64Str.startsWith("data:image")) {
      resolve(base64Str);
      return;
    }
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      } else {
        resolve(base64Str);
      }
    };
    img.onerror = () => {
      resolve(base64Str);
    };
  });
};

interface VscProfileRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  vscSystemAthletes: Athlete[];
  language: "vi" | "en";
}

export const VscProfileRegistrationModal: React.FC<VscProfileRegistrationModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  vscSystemAthletes,
  language
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [clubs, setClubs] = useState<SystemClub[]>([]);

  // Form states
  const [formName, setFormName] = useState("");
  const [formTeam, setFormTeam] = useState("");
  const [formGender, setFormGender] = useState("Nam");
  const [formIdCard, setFormIdCard] = useState("");
  const [formDob, setFormDob] = useState("");
  const [formHometown, setFormHometown] = useState("");
  const [formProvince, setFormProvince] = useState("");
  const [formAvatarUrl, setFormAvatarUrl] = useState("");
  const [isCompressingAvatar, setIsCompressingAvatar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState("");

  // Sub to system clubs for select options
  useEffect(() => {
    if (!isOpen) return;
    const unsub = subscribeToVscSystemClubs((loadedClubs) => {
      setClubs(loadedClubs);
    });
    return () => unsub();
  }, [isOpen]);

  // Sync initial fields from currentUser on open
  useEffect(() => {
    if (isOpen && currentUser) {
      setStep(1); // Start on welcome value prop step
      setFormName(currentUser.displayName || "");
      setFormGender("Nam");
      setFormTeam("");
      setFormIdCard("");
      setFormDob("");
      setFormHometown("");
      setFormProvince("");
      setFormAvatarUrl(currentUser.photoURL || (currentUser as any).avatarUrl || AVATAR_MALE);
      setValidationError("");
    }
  }, [isOpen, currentUser]);

  // Auto generate Next VSC ID
  const formId = useMemo(() => {
    const existingIds = new Set(vscSystemAthletes.map((a) => a.id.trim().toLowerCase()));
    let nextIdNum = 1;
    while (
      existingIds.has(`vsc-${nextIdNum.toString().padStart(4, "0")}`) ||
      existingIds.has(nextIdNum.toString().padStart(4, "0"))
    ) {
      nextIdNum++;
    }
    return `VSC-${nextIdNum.toString().padStart(4, "0")}`;
  }, [vscSystemAthletes]);

  if (!isOpen || !currentUser) return null;

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setValidationError(
        language === "en" 
          ? "Image file is too large (maximum 10MB)." 
          : "Tệp ảnh quá lớn (tối đa 10MB)."
      );
      return;
    }

    setIsCompressingAvatar(true);
    setValidationError("");

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const rawBase64 = event.target?.result as string;
        const compressedBase64 = await compressImage(rawBase64, 180, 180);
        setFormAvatarUrl(compressedBase64);
      } catch (err) {
        console.error("Failed to compress avatar:", err);
        setValidationError(
          language === "en" ? "Failed to process image file." : "Không thể xử lý tệp ảnh này."
        );
      } finally {
        setIsCompressingAvatar(false);
      }
    };
    reader.onerror = () => {
      setIsCompressingAvatar(false);
      setValidationError(
        language === "en" ? "Error reading image file." : "Lỗi khi đọc tệp ảnh."
      );
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setValidationError(language === "en" ? "Please drop an image file." : "Vui lòng thả tệp hình ảnh.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setValidationError(
        language === "en" 
          ? "Image file is too large (maximum 10MB)." 
          : "Tệp ảnh quá lớn (tối đa 10MB)."
      );
      return;
    }

    setIsCompressingAvatar(true);
    setValidationError("");

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const rawBase64 = event.target?.result as string;
        const compressedBase64 = await compressImage(rawBase64, 180, 180);
        setFormAvatarUrl(compressedBase64);
      } catch (err) {
        console.error("Failed to compress avatar:", err);
        setValidationError(
          language === "en" ? "Failed to process image file." : "Không thể xử lý tệp ảnh này."
        );
      } finally {
        setIsCompressingAvatar(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      setStep(2);
      return;
    }

    setValidationError("");

    if (!formName.trim()) {
      setValidationError(language === "en" ? "Please enter your full name." : "Vui lòng nhập họ và tên của bạn.");
      return;
    }

    setLoading(true);

    try {
      // Find matching club name if selected
      const selectedClubObj = clubs.find(c => c.id === formTeam);
      const teamName = selectedClubObj ? selectedClubObj.name : (formTeam || (language === "en" ? "Independent" : "Tự do"));

      // Compress avatar base64 if needed
      let finalAvatar = formAvatarUrl;
      if (finalAvatar && finalAvatar.startsWith("data:image")) {
        finalAvatar = await compressImage(finalAvatar, 180, 180);
      }

      const newAthlete: Athlete = {
        id: formId,
        name: formName.trim(),
        team: teamName,
        gender: formGender,
        idCard: formIdCard.trim(),
        dob: formDob,
        hometown: formHometown.trim(),
        province: formProvince.trim(),
        country: "Việt Nam",
        countryCode: "VN",
        avatarUrl: finalAvatar,
        email: currentUser.email.trim().toLowerCase(),
        status: "Thi đấu",
        scores: {},
        vscPoints: 0 // Default initial points
      };

      const updatedList = [...vscSystemAthletes, newAthlete];
      await saveVscSystemAthletes(updatedList);

      // Sync data back to regular user profile document
      try {
        await updateUserProfile(currentUser.uid, {
          displayName: newAthlete.name,
          cccd: newAthlete.idCard,
          birthDate: newAthlete.dob,
          address: newAthlete.hometown,
          province: newAthlete.province,
          club: newAthlete.team,
          avatarUrl: newAthlete.avatarUrl
        });
      } catch (syncErr) {
        console.warn("Failed back-sync to user profile:", syncErr);
      }

      setLoading(false);
      onClose();
    } catch (err: any) {
      console.error(err);
      setValidationError(
        language === "en" ? "An error occurred. Please try again." : "Có lỗi xảy ra khi tạo hồ sơ. Vui lòng thử lại."
      );
      setLoading(false);
    }
  };

  return createPortal(
    <div 
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] text-slate-800 dark:text-slate-100"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-lg w-full border border-slate-100 dark:border-slate-800 overflow-hidden relative flex flex-col max-h-[90vh] animate-scaleUp text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b border-gray-100 dark:border-slate-850 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl">
              <Award className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white uppercase font-sans">
                {language === "en" ? "VSC National Athletes Registry" : "Hồ Sơ VĐV Quốc Gia VSC"}
              </h2>
              <p className="text-[10px] text-amber-600 dark:text-amber-400 font-extrabold uppercase tracking-wider mt-0.5">
                {step === 1 ? (language === "en" ? "Step 1: Benefits" : "Bước 1: Quyền lợi xạ thủ") : (language === "en" ? "Step 2: Profile Form" : "Bước 2: Điền thông tin hồ sơ")}
              </p>
            </div>
          </div>
          <button 
            title={language === "en" ? "Close" : "Đóng"}
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200/50 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 font-sans">
          {validationError && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/25 border border-rose-100 dark:border-rose-900/30 text-rose-700 dark:text-rose-400 rounded-xl text-xs font-bold leading-relaxed flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              {validationError}
            </div>
          )}

          {step === 1 ? (
            <div className="space-y-4">
              <div className="text-center py-4 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/10 dark:border-amber-500/20 rounded-2xl p-5 relative overflow-hidden">
                <div className="absolute right-2 top-2 text-amber-500/10">
                  <Sparkles className="w-24 h-24" />
                </div>
                <h3 className="text-base font-black text-slate-800 dark:text-slate-100 flex items-center justify-center gap-2">
                  🎖️ Kích hoạt định mức Quân hàm Xạ Thủ!
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  Trở thành một phần của cộng đồng bắn ná cao su chuyên nghiệp nhất Việt Nam. Lưu trữ lâu dài thông số, thành tích và nâng cao điểm số Quân hàm của bạn.
                </p>
              </div>

              {/* Benefits Checklist */}
              <div className="space-y-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850 p-5 rounded-2xl">
                <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Quyền lợi đặc quyền của bạn:</h4>
                
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-xs font-black text-slate-800 dark:text-slate-200">Kích hoạt thông số Quân hàm VSC</h5>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">Kích hoạt tài khoản chính thức để bắt đầu nâng cao cấp bậc, tích lũy điểm số và nhận các huy hiệu đặc quyền VSC.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-xs font-black text-slate-800 dark:text-slate-200">Xếp hạng & Tích luỹ chỉ số PK ELO quốc gia</h5>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">Thách đấu, ghi nhận kết quả và leo hạng trên Bảng xếp hạng VSC trực tiếp thời gian thực.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-xs font-black text-slate-800 dark:text-slate-200">Tự động liên kết thẻ ID Thẻ VĐV thông minh</h5>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">Sở hữu thẻ kỹ thuật số chính thức của Hội nhóm SlingShot Việt Nam, hiển thị hồ sơ đẹp mắt tại Sảnh Chat.</p>
                  </div>
                </div>
              </div>

              <div className="text-center text-[11px] text-slate-450 italic leading-relaxed">
                * Toàn bộ quá trình tạo hồ sơ diễn ra hoàn toàn bảo mật và an toàn dưới hệ thống đám mây VSC Cloud.
              </div>
            </div>
          ) : (
            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* VSC ID (Readonly) */}
              <div className="md:col-span-2 bg-slate-50 dark:bg-slate-950/50 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-850 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Mã Số VĐV Hệ Thống</div>
                  <div className="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-0.5">{formId}</div>
                </div>
                <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black px-2.5 py-1 rounded-lg border border-emerald-500/20 uppercase tracking-wide">
                  Sẵn sàng cấp mới
                </div>
              </div>

              {/* Name (Họ tên) */}
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-450 mb-1">Họ và Tên VĐV *</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ví dụ: Nguyễn Văn A"
                    className="w-full bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 pl-9 pr-3 text-xs font-bold focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              {/* Gender */}
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-450 mb-1">Giới tính</label>
                <select 
                  value={formGender}
                  onChange={(e) => setFormGender(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-3 text-xs font-bold focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                </select>
              </div>

              {/* Email (Readonly) */}
              <div className="md:col-span-2">
                <label className="block text-[10px] font-extrabold uppercase text-slate-450 mb-1">Email Liên Kết Tài Khoản</label>
                <input 
                  type="email" 
                  value={currentUser.email || ""} 
                  readOnly 
                  className="w-full bg-slate-100 dark:bg-slate-950/20 text-slate-450 border border-slate-200 dark:border-slate-850 rounded-xl py-2.5 px-3 text-xs font-bold focus:outline-hidden"
                />
              </div>

              {/* Dob */}
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-450 mb-1">Ngày sinh</label>
                <input 
                  type="date" 
                  value={formDob}
                  onChange={(e) => setFormDob(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-3 text-xs font-bold focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Province dropdown */}
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-450 mb-1">Tỉnh Thành Hoạt Động</label>
                <select 
                  value={formProvince}
                  onChange={(e) => setFormProvince(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-3 text-xs font-bold focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">-- Chọn Tỉnh / Thành phố --</option>
                  {VIETNAM_PROVINCES.map((prov) => (
                    <option key={prov} value={prov}>{prov}</option>
                  ))}
                </select>
              </div>

              {/* Hometown */}
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-450 mb-1">Quê quán</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    value={formHometown}
                    onChange={(e) => setFormHometown(e.target.value)}
                    placeholder="Ví dụ: Hoài Đức, Hà Nội"
                    className="w-full bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 pl-9 pr-3 text-xs font-bold focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Team/Club Selection */}
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-450 mb-1">Đại Diện Câu Lạc Bộ</label>
                <div className="relative">
                  <Building className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <select 
                    value={formTeam}
                    onChange={(e) => setFormTeam(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 pl-9 pr-3 text-xs font-bold focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">-- Tự do (Không tham gia CLB) --</option>
                    {clubs.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* CCCD (Optional) */}
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-450 mb-1">Số CCCD / Thẻ Căn Cước (Bảo mật)</label>
                <input 
                  type="text" 
                  value={formIdCard}
                  onChange={(e) => setFormIdCard(e.target.value)}
                  placeholder="Không bắt buộc"
                  className="w-full bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-3 text-xs font-bold focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Avatar Drag-and-Drop Selection */}
              <div className="md:col-span-2">
                <label className="block text-[10px] font-extrabold uppercase text-slate-450 mb-1">Hình ảnh đại diện VĐV</label>
                <div className="flex flex-col sm:flex-row items-center gap-4 mt-1 bg-slate-50 dark:bg-slate-950/40 p-4 border border-slate-150 dark:border-slate-850 rounded-2xl">
                  <div className="relative group shrink-0">
                    <img 
                      src={formAvatarUrl || (formGender === "Nữ" ? AVATAR_FEMALE : AVATAR_MALE)} 
                      alt="Avatar Preview" 
                      className="w-16 h-16 rounded-full object-cover border-2 border-indigo-500 shadow-sm"
                      referrerPolicy="no-referrer"
                    />
                    {isCompressingAvatar && (
                      <div className="absolute inset-0 bg-slate-950/50 rounded-full flex items-center justify-center">
                        <Loader2 className="w-5 h-5 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                  
                  <div 
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className="flex-1 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl p-3 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900/50 transition-colors"
                  >
                    <input 
                      type="file" 
                      id="modal-avatar-upload" 
                      accept="image/*" 
                      onChange={handleAvatarFileChange} 
                      className="hidden" 
                    />
                    <label htmlFor="modal-avatar-upload" className="cursor-pointer">
                      <Upload className="w-4 h-4 mx-auto text-slate-400 mb-1" />
                      <div className="text-[10px] font-black text-slate-600 dark:text-slate-300">
                        {language === "en" ? "Upload avatar image" : "Tải lên ảnh mới"}
                      </div>
                      <div className="text-[9px] text-slate-400 mt-0.5">
                        {language === "en" ? "Drag & drop here or click to browse" : "Kéo thả ảnh hoặc click để chọn"}
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-6 border-t border-gray-100 dark:border-slate-850 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-950/20">
          {step === 1 ? (
            <>
              <button 
                type="button"
                onClick={onClose}
                className="px-5 py-3 text-xs font-extrabold border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl transition-all cursor-pointer"
              >
                {language === "en" ? "Decide Later" : "Để sau"}
              </button>
              <button 
                type="button"
                onClick={() => setStep(2)}
                className="px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-slate-900 font-extrabold text-xs rounded-xl shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
              >
                <span>{language === "en" ? "Initialize Profile Now" : "Khởi tạo hồ sơ ngay"}</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </button>
            </>
          ) : (
            <>
              <button 
                type="button"
                onClick={() => setStep(1)}
                className="px-5 py-3 text-xs font-extrabold border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl transition-all cursor-pointer"
              >
                {language === "en" ? "Back" : "Quay lại"}
              </button>
              <button 
                type="button"
                onClick={handleSave}
                disabled={loading || isCompressingAvatar}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{language === "en" ? "Processing..." : "Đang xử lý..."}</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>{language === "en" ? "Submit & Register" : "Xác nhận & Khởi tạo"}</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
