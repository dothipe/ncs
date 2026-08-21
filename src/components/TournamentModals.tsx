import React from "react";
import { createPortal } from "react-dom";
import { 
  Trophy, 
  Users, 
  User, 
  Lock, 
  Shield, 
  Plus, 
  Home, 
  Save, 
  Wifi, 
  WifiOff, 
  AlertTriangle, 
  RefreshCw 
} from "lucide-react";
import { Athlete } from "../types";

interface CompetitionModeSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: string;
  onSelect: (mode: "individual" | "team") => void;
  title: string;
  subtitle: string;
  description: string;
}

export const CompetitionModeSelectionModal: React.FC<CompetitionModeSelectionModalProps> = ({
  isOpen,
  onClose,
  language,
  onSelect,
  title,
  subtitle,
  description
}) => {
  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[10003] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-gray-250 dark:border-slate-800 shadow-2xl overflow-hidden animate-scaleIn p-6 sm:p-8">
        <div className="text-center flex flex-col gap-2 mb-6">
          <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 uppercase tracking-wide">
            {title}
          </h3>
          <p className="text-[10px] sm:text-xs text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider">
            {subtitle}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
            {description}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => onSelect("individual")}
            className="flex flex-col items-center justify-center gap-3 p-6 bg-slate-50 dark:bg-slate-950/40 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border border-gray-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-900 rounded-2xl transition-all duration-200 group cursor-pointer shadow-sm active:scale-98"
          >
            <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <User className="w-6 h-6" />
            </div>
            <div className="text-center">
              <span className="block font-black text-sm text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                {language === "en" ? "Individual" : "Cá Nhân"}
              </span>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 block font-medium">
                {language === "en" ? "Single shooters" : "Chế độ cá nhân"}
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onSelect("team")}
            className="flex flex-col items-center justify-center gap-3 p-6 bg-slate-50 dark:bg-slate-950/40 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border border-gray-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-900 rounded-2xl transition-all duration-200 group cursor-pointer shadow-sm active:scale-98"
          >
            <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <div className="text-center">
              <span className="block font-black text-sm text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                {language === "en" ? "Team" : "Đồng Đội"}
              </span>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 block font-medium">
                {language === "en" ? "Club standings" : "Chế độ đồng đội"}
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

interface MobileRankingSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: string;
  tournamentType: string;
  onSelectCategory: (competitionMode: "individual" | "team", rankingSubTab: "individual" | "team") => void;
}

export const MobileRankingSelectionModal: React.FC<MobileRankingSelectionModalProps> = ({
  isOpen,
  onClose,
  language,
  tournamentType,
  onSelectCategory
}) => {
  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[10004] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl border border-gray-250 dark:border-slate-800 shadow-2xl overflow-hidden animate-scaleIn p-6">
        <div className="text-center flex flex-col gap-2 mb-6">
          <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 uppercase tracking-wide">
            {language === "en" ? "Leaderboard Type" : "Hình Thức Xếp Hạng"}
          </h3>
          <p className="text-[10px] sm:text-xs text-red-600 dark:text-red-400 font-extrabold uppercase tracking-wider">
            {language === "en" ? "Select Standings View" : "Lựa chọn hình thức hiển thị"}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed font-medium">
            {language === "en" 
              ? "Please select which leaderboard category you would like to view:"
              : "Vui lòng lựa chọn hình thức bảng xếp hạng bạn muốn xem:"
            }
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => {
              if (tournamentType === "combined") {
                onSelectCategory("individual", "individual");
              } else if (tournamentType === "team") {
                onSelectCategory("team", "individual");
              } else {
                onSelectCategory("individual", "individual");
              }
            }}
            className="w-full flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-950/40 hover:bg-amber-50 dark:hover:bg-amber-950/20 border border-gray-200 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-900 rounded-2xl transition-all duration-200 group cursor-pointer shadow-sm active:scale-98 text-left animate-fadeIn"
          >
            <div className="w-11 h-11 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
              <Trophy className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <span className="block font-black text-xs sm:text-sm text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                {language === "en" ? "Individual Competition" : "THI ĐẤU CÁ NHÂN"}
              </span>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 block font-bold">
                {language === "en" ? "View individual shooter standings" : "Xem bảng xếp hạng cá nhân"}
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              if (tournamentType === "combined") {
                onSelectCategory("team", "team");
              } else if (tournamentType === "team") {
                onSelectCategory("team", "team");
              } else {
                onSelectCategory("individual", "team");
              }
            }}
            className="w-full flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-950/40 hover:bg-blue-50 dark:hover:bg-blue-950/20 border border-gray-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-900 rounded-2xl transition-all duration-200 group cursor-pointer shadow-sm active:scale-98 text-left animate-fadeIn"
          >
            <div className="w-11 h-11 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <span className="block font-black text-xs sm:text-sm text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                {language === "en" ? "Team Competition" : "THI ĐẤU ĐỒNG ĐỘI"}
              </span>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 block font-bold">
                {language === "en" ? "View club/team combined standings" : "Xem bảng xếp hạng đồng đội"}
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full mt-2 py-3 border border-slate-200 dark:border-slate-800 text-xs font-black rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-sm text-center uppercase tracking-wider"
          >
            {language === "en" ? "Close" : "Đóng"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

interface UnlockScoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  language: string;
  pendingAddAthlete: boolean;
}

export const UnlockScoreModal: React.FC<UnlockScoreModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  language,
  pendingAddAthlete
}) => {
  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[10005] flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-xs animate-fadeIn text-slate-800 dark:text-slate-100">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-scaleIn">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-200 uppercase tracking-wide">
                {pendingAddAthlete 
                  ? (language === "en" ? "Unlock to add athlete?" : "Mở khóa để thêm VĐV?") 
                  : (language === "en" ? "Confirm score entry/edit?" : "Xác nhận ghi / sửa điểm?")
                }
              </h3>
              <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">
                {language === "en" ? "Accidental-touch protection layer" : "Lớp bảo vệ tránh bấm nhầm"}
              </p>
            </div>
          </div>
          
          <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6 space-y-2">
            {pendingAddAthlete ? (
              <p>
                {language === "en" ? (
                  "The system is currently in View Only mode to protect data. To add a new athlete or register for competition, please confirm to unlock Scoring Mode."
                ) : (
                  <>Hệ thống đang ở Chế độ Xem để bảo vệ dữ liệu. Để <strong>thêm vận động viên mới hoặc đăng ký thi đấu</strong>, vui lòng xác nhận mở khóa Chế độ Ghi Điểm.</>
                )}
              </p>
            ) : (
              <p>
                {language === "en" ? (
                  "The system detected a click on an athlete's scorecard. To prevent accidental touches from altering scores, please confirm to edit."
                ) : (
                  <>Hệ thống phát hiện bạn vừa chạm vào ô ghi điểm của vận động viên. Để tránh việc <strong>vô tình chạm làm sai lệch tỉ số</strong>, vui lòng xác nhận ghi điểm.</>
                )}
              </p>
            )}
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl text-[11px] flex flex-col gap-1.5 border border-slate-100 dark:border-slate-800">
              <span className="font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-indigo-500" /> {language === "en" ? "How it works:" : "Cách hoạt động:"}
              </span>
              <span className="text-gray-500 font-medium">
                {language === "en" ? (
                  <>• <strong>Once unlocked</strong>: Scoring Mode is active. You can freely record scores, add, or edit athletes without seeing this dialog again.</>
                ) : (
                  <>• <strong>Xác nhận xong</strong>: Chế độ Ghi Điểm sẽ được mở khóa, bạn có thể tự do ghi điểm, thêm hoặc sửa VĐV mà không gặp lại bảng này.</>
                )}
              </span>
              <span className="text-gray-500 font-medium">
                {language === "en" ? (
                  <>• <strong>Relock</strong>: You can manually click the Lock button at the top of any scoring sheet to re-enable protection.</>
                ) : (
                  <>• <strong>Khóa lại</strong>: Bạn có thể chủ động bấm Khóa ở đầu trang Ghi Điểm bất kỳ lúc nào để quay lại chế độ bảo vệ.</>
                )}
              </span>
            </div>
          </div>

          <div className="flex gap-2.5 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold border border-gray-300 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg text-slate-750 dark:text-slate-300 transition-all cursor-pointer"
            >
              {language === "en" ? "Cancel (Keep View Only)" : "Hủy (Giữ Chế độ Xem)"}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="px-4 py-2 text-xs font-extrabold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md transition-all active:scale-[0.98] cursor-pointer"
            >
              {language === "en" ? "Confirm Unlock" : "Xác nhận mở khóa"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

interface ExitTournamentConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExitToConfig: () => void;
  onExitToHome: () => void;
  language: string;
}

export const ExitTournamentConfirmModal: React.FC<ExitTournamentConfirmModalProps> = ({
  isOpen,
  onClose,
  onExitToConfig,
  onExitToHome,
  language
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center z-[10006] p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-2xl relative text-left">
        <h3 className="text-base font-black text-slate-900 dark:text-slate-100 tracking-tight uppercase flex items-center gap-2">
          ⚠️ {language === "en" ? "Confirm Exit Tournament" : "Xác nhận Thoát Giải Đấu"}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed font-semibold">
          {language === "en" ? "What do you want to do by exiting the current tournament? Please choose a quick action below:" : "Bạn muốn thoát giải đấu hiện tại để làm gì? Vui lòng chọn một hành động điều hướng nhanh bên dưới:"}
        </p>
        
        <div className="flex flex-col gap-2.5 mt-5">
          <button
            type="button"
            onClick={onExitToConfig}
            className="w-full px-4 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-md hover:scale-[1.01]"
          >
            <Plus className="w-4 h-4 shrink-0" />
            {language === "en" ? "Create New Tournament (Config)" : "Tạo giải đấu mới (Cài đặt)"}
          </button>

          <button
            type="button"
            onClick={onExitToHome}
            className="w-full px-4 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-705 dark:text-slate-200 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer border border-slate-200 dark:border-slate-700"
          >
            <Home className="w-4 h-4 shrink-0" />
            {language === "en" ? "Exit & Return to Home" : "Thoát & Quay về Trang Chủ"}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-450 dark:text-slate-500 rounded-xl text-xs font-bold transition-all text-center mt-1 cursor-pointer"
          >
            {language === "en" ? "Cancel" : "Hủy bỏ"}
          </button>
        </div>
      </div>
    </div>
  );
};

interface ExitAndCreateTournamentConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  language: string;
}

export const ExitAndCreateTournamentConfirmModal: React.FC<ExitAndCreateTournamentConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  language
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center z-[10006] p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-2xl relative text-left">
        <h3 className="text-base font-black text-slate-900 dark:text-slate-100 tracking-tight uppercase flex items-center gap-2">
          ⚠️ {language === "en" ? "Confirm Exit to Create New Tournament" : "Xác nhận Thoát để Tạo Giải Mới"}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed font-semibold">
          {language === "en" ? "Are you sure you want to exit the current tournament to proceed with creating a new online tournament?" : "Bạn có chắc chắn muốn thoát khỏi giải đấu hiện tại để tiến hành tạo một giải đấu trực tuyến mới không?"}
        </p>
        
        <div className="flex flex-col gap-2.5 mt-5 font-sans">
          <button
            type="button"
            onClick={onConfirm}
            className="w-full px-4 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-md hover:scale-[1.01]"
          >
            <Plus className="w-4 h-4 shrink-0" />
            {language === "en" ? "Confirm Exit & Create New" : "Xác nhận thoát & Tạo giải mới"}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-450 dark:text-slate-500 rounded-xl text-xs font-bold transition-all text-center mt-1 cursor-pointer"
          >
            {language === "en" ? "Cancel" : "Hủy bỏ"}
          </button>
        </div>
      </div>
    </div>
  );
};

interface SwitchTournamentConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  language: string;
  currentMatchName: string;
  targetTournamentName: string;
}

export const SwitchTournamentConfirmModal: React.FC<SwitchTournamentConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  language,
  currentMatchName,
  targetTournamentName
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center z-[10006] p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-sm w-full shadow-2xl relative text-left">
        <h3 className="text-base font-black text-slate-900 dark:text-slate-100 tracking-tight uppercase flex items-center gap-2">
          ⚠️ {language === "en" ? "Confirm Switch Tournament" : "Xác nhận Chuyển Giải"}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2.5 leading-relaxed font-semibold">
          {language === "en" ? (
            <>You are currently in the tournament <strong className="text-indigo-650 dark:text-indigo-400">"{currentMatchName || "Current Tournament"}"</strong>. Are you sure you want to exit this tournament to switch to <strong className="text-emerald-605 dark:text-emerald-400">"{targetTournamentName}"</strong>?</>
          ) : (
            <>Bạn đang tham gia giải đấu <strong className="text-indigo-650 dark:text-indigo-400">"{currentMatchName || "Giải đấu hiện tại"}"</strong>. Bạn có chắc chắn muốn thoát giải đấu này để chuyển sang giải đấu <strong className="text-emerald-605 dark:text-emerald-400">"{targetTournamentName}"</strong> không?</>
          )}
        </p>
        
        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer border border-slate-200 dark:border-slate-700 text-center"
          >
            {language === "en" ? "Cancel" : "Hủy bỏ"}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer shadow-md text-center"
          >
            {language === "en" ? "Confirm" : "Xác nhận"}
          </button>
        </div>
      </div>
    </div>
  );
};

interface SaveScoresConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  language: string;
  networkStatus: string;
  isSavingScores: boolean;
  saveStatus: { success: boolean; message: string } | null;
}

export const SaveScoresConfirmModal: React.FC<SaveScoresConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  language,
  networkStatus,
  isSavingScores,
  saveStatus
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center z-[10007] p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-2xl relative text-left">
        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
          <div className="bg-indigo-50 dark:bg-indigo-950/40 p-2.5 rounded-2xl border border-indigo-100 dark:border-indigo-800/40 text-indigo-600 dark:text-indigo-400">
            <Save className="w-5.5 h-5.5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-950 dark:text-slate-50 uppercase tracking-tight">
              {language === "en" ? "Confirm Saving Scores" : "Xác nhận Lưu Điểm Số"}
            </h3>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {language === "en" ? "Updating the official score log" : "Thao tác cập nhật bảng ghi điểm chính thức"}
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed font-semibold mb-4">
          {language === "en" ? (
            "The system will synchronize all scores from the Temporary Scoreboard to the official Scoring sheet of the tournament. Please review all details carefully before confirming."
          ) : (
            <>Hệ thống sẽ đồng bộ toàn bộ điểm số từ bảng <span className="text-indigo-600 dark:text-indigo-400 font-bold">Nhập Điểm</span> sang bảng <span className="text-emerald-600 dark:text-emerald-400 font-bold">Ghi Điểm</span> chính thức của giải đấu. Bạn vui lòng kiểm tra kỹ lưỡng các thông tin điểm số trước khi xác nhận.</>
          )}
        </p>

        <div className="mb-4 flex items-center justify-between bg-slate-50 dark:bg-slate-950/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/40">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
            {language === "en" ? "Connection status:" : "Trạng thái kết nối:"}
          </span>
          {networkStatus === "offline" ? (
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/60 px-2.5 py-1 rounded-xl flex items-center gap-1">
              <WifiOff className="w-3.5 h-3.5" />
              {language === "en" ? "Offline (Local Cached)" : "Mất mạng (Lưu máy)"}
            </span>
          ) : (
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60 px-2.5 py-1 rounded-xl flex items-center gap-1">
              <Wifi className="w-3.5 h-3.5" />
              {language === "en" ? "Online (Cloud Synced)" : "Trực tuyến (Đồng bộ mây)"}
            </span>
          )}
        </div>

        {saveStatus && (
          <div className={`p-3.5 rounded-2xl text-xs font-semibold mb-4 leading-relaxed border ${
            saveStatus.success 
              ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50" 
              : "bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800/50"
          }`}>
            <div className="flex gap-2 items-start">
              <div className="mt-0.5 shrink-0">
                {saveStatus.success ? (
                  <span className="text-emerald-500 font-bold">✔</span>
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                )}
              </div>
              <span>{saveStatus.message}</span>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            disabled={isSavingScores}
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer border border-slate-200 dark:border-slate-700 text-center disabled:opacity-50"
          >
            {language === "en" ? "Cancel & Review" : "Hủy kiểm tra lại"}
          </button>

          <button
            type="button"
            disabled={isSavingScores}
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer shadow-md text-center flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {isSavingScores ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                {language === "en" ? "Saving..." : "Đang lưu..."}
              </>
            ) : (
              <>
                {language === "en" ? "Confirm & Save" : "Đồng ý Lưu Điểm"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

interface SaveSingleAthleteConfirmModalProps {
  athlete: Athlete | null;
  onClose: () => void;
  onConfirm: () => void;
  language: string;
  networkStatus: string;
  isSavingScores: boolean;
  saveStatus: { success: boolean; message: string } | null;
}

export const SaveSingleAthleteConfirmModal: React.FC<SaveSingleAthleteConfirmModalProps> = ({
  athlete,
  onClose,
  onConfirm,
  language,
  networkStatus,
  isSavingScores,
  saveStatus
}) => {
  if (!athlete) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center z-[10008] p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-2xl relative text-left">
        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
          <div className="bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-2xl border border-emerald-100 dark:border-emerald-800/40 text-emerald-600 dark:text-emerald-400">
            <Save className="w-5.5 h-5.5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-950 dark:text-slate-50 uppercase tracking-tight">
              {language === "en" ? "Confirm Athlete Score Save" : "Xác nhận Lưu Điểm VĐV"}
            </h3>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {language === "en" ? "Save athlete scores to the official Scoring sheet" : "Thao tác chuyển điểm số VĐV sang danh sách Ghi Điểm"}
            </p>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-950/60 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 mb-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 font-mono font-black text-xs flex items-center justify-center shrink-0 border border-indigo-200 dark:border-indigo-800">
            {athlete.id}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-extrabold text-sm text-slate-800 dark:text-slate-100 truncate">
              {athlete.name}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {language === "en" ? "Team" : "Đội"}: {athlete.team || (language === "en" ? "Independent" : "Tự do")} • {athlete.gender === "Nữ" ? (language === "en" ? "Female" : "Nữ") : (language === "en" ? "Male" : "Nam")}
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed font-semibold mb-4">
          {language === "en" ? (
            `The system will synchronize all scores of the athlete ${athlete.name} from the Temporary Scoreboard to the official tournament Scoring sheet. Please check carefully before confirming.`
          ) : (
            <>Hệ thống sẽ đồng bộ toàn bộ điểm số của vận động viên <span className="text-indigo-600 dark:text-indigo-400 font-bold">{athlete.name}</span> từ bảng <span className="text-indigo-600 dark:text-indigo-400 font-bold">Nhập Điểm</span> sang bảng <span className="text-emerald-600 dark:text-emerald-400 font-bold">Ghi Điểm</span> chính thức của giải đấu. Bạn vui lòng kiểm tra kỹ trước khi xác nhận.</>
          )}
        </p>

        <div className="mb-4 flex items-center justify-between bg-slate-50 dark:bg-slate-950/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/40">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
            {language === "en" ? "Connection status:" : "Trạng thái kết nối:"}
          </span>
          {networkStatus === "offline" ? (
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/60 px-2.5 py-1 rounded-xl flex items-center gap-1">
              <WifiOff className="w-3.5 h-3.5" />
              {language === "en" ? "Offline (Local Cached)" : "Mất mạng (Lưu máy)"}
            </span>
          ) : (
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60 px-2.5 py-1 rounded-xl flex items-center gap-1">
              <Wifi className="w-3.5 h-3.5" />
              {language === "en" ? "Online (Cloud Synced)" : "Trực tuyến (Đồng bộ mây)"}
            </span>
          )}
        </div>

        {saveStatus && (
          <div className={`p-3.5 rounded-2xl text-xs font-semibold mb-4 leading-relaxed border ${
            saveStatus.success 
              ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50" 
              : "bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800/50"
          }`}>
            <div className="flex gap-2 items-start">
              <div className="mt-0.5 shrink-0">
                {saveStatus.success ? (
                  <span className="text-emerald-500 font-bold">✔</span>
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                )}
              </div>
              <span>{saveStatus.message}</span>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            disabled={isSavingScores}
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer border border-slate-200 dark:border-slate-700 text-center disabled:opacity-50"
          >
            {language === "en" ? "Cancel & Review" : "Hủy kiểm tra lại"}
          </button>

          <button
            type="button"
            disabled={isSavingScores}
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer shadow-md text-center flex items-center justify-center gap-1.5 disabled:opacity-50 font-extrabold"
          >
            {isSavingScores ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                {language === "en" ? "Saving..." : "Đang lưu..."}
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                {language === "en" ? "Save Athlete" : "Lưu VĐV này"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

interface UnsavedScoresWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmSave: () => void;
  onDiscard: () => void;
  language: string;
  networkStatus: string;
  isSavingScores: boolean;
  saveStatus: { success: boolean; message: string } | null;
}

export const UnsavedScoresWarningModal: React.FC<UnsavedScoresWarningModalProps> = ({
  isOpen,
  onClose,
  onConfirmSave,
  onDiscard,
  language,
  networkStatus,
  isSavingScores,
  saveStatus
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center z-[10007] p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-2xl relative text-left">
        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
          <div className="bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-2xl border border-amber-100 dark:border-amber-800/40 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-5.5 h-5.5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-950 dark:text-slate-50 uppercase tracking-tight">
              {language === "en" ? "Warning: Unsaved Scores!" : "Cảnh Báo: Điểm Chưa Lưu!"}
            </h3>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {language === "en" ? "You have unsaved changes in progress" : "Bạn đang có điểm chấm dở chưa lưu"}
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed font-semibold mb-6">
          {language === "en" ? (
            "Leaving this page will completely LOSE all unsaved scores currently in progress on the Temporary Scoreboard. Would you like to save them now, or discard these changes to proceed?"
          ) : (
            <>Thao tác chuyển trang sẽ làm <span className="text-amber-600 dark:text-amber-400 font-bold">MẤT HOÀN TOÀN</span> các thông tin điểm số bạn đang chấm dở trong bảng Nhập Điểm. Bạn có muốn lưu điểm số ngay hay hủy bỏ các thay đổi này để tiếp tục?</>
          )}
        </p>

        <div className="mb-4 flex items-center justify-between bg-slate-50 dark:bg-slate-950/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/40">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
            {language === "en" ? "Connection status:" : "Trạng thái kết nối:"}
          </span>
          {networkStatus === "offline" ? (
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/60 px-2.5 py-1 rounded-xl flex items-center gap-1">
              <WifiOff className="w-3.5 h-3.5" />
              {language === "en" ? "Offline (Local Cached)" : "Mất mạng (Lưu máy)"}
            </span>
          ) : (
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60 px-2.5 py-1 rounded-xl flex items-center gap-1">
              <Wifi className="w-3.5 h-3.5" />
              {language === "en" ? "Online (Cloud Synced)" : "Trực tuyến (Đồng bộ mây)"}
            </span>
          )}
        </div>

        {saveStatus && (
          <div className={`p-3.5 rounded-2xl text-xs font-semibold mb-4 leading-relaxed border ${
            saveStatus.success 
              ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50" 
              : "bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800/50"
          }`}>
            <div className="flex gap-2 items-start">
              <div className="mt-0.5 shrink-0">
                {saveStatus.success ? (
                  <span className="text-emerald-500 font-bold">✔</span>
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                )}
              </div>
              <span>{saveStatus.message}</span>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2 font-sans">
          <button
            type="button"
            disabled={isSavingScores}
            onClick={onConfirmSave}
            className="w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer shadow-md text-center flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {isSavingScores ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                {language === "en" ? "Saving..." : "Đang lưu..."}
              </>
            ) : (
              <>
                {language === "en" ? "Save Scores & Continue" : "Đồng ý Lưu Điểm & Tiếp Tục"}
              </>
            )}
          </button>

          <button
            type="button"
            disabled={isSavingScores}
            onClick={onDiscard}
            className="w-full px-4 py-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer border border-rose-100 dark:border-rose-900/40 text-center disabled:opacity-50"
          >
            {language === "en" ? "Discard Changes & Continue" : "Bỏ qua thay đổi (Xóa tạm) & Tiếp tục"}
          </button>

          <button
            type="button"
            disabled={isSavingScores}
            onClick={onClose}
            className="w-full px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer border border-slate-200 dark:border-slate-700 text-center disabled:opacity-50"
          >
            {language === "en" ? "Go Back to Scoring Board" : "Quay lại bảng chấm điểm"}
          </button>
        </div>
      </div>
    </div>
  );
};
