import React from "react";
import { X } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { MatchHistoryItem } from "../types";
import { TournamentData } from "../lib/firebaseService";

export interface PublishDraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  draftPreviewItem: MatchHistoryItem;
  onlineTournaments: TournamentData[];
  onOverwrite: (id: string) => void;
  onCreateNew: (name: string) => void;
}

export const PublishDraftModal: React.FC<PublishDraftModalProps> = ({
  isOpen,
  onClose,
  draftPreviewItem,
  onlineTournaments,
  onOverwrite,
  onCreateNew,
}) => {
  const { language } = useLanguage();
  const cleanName = draftPreviewItem.matchName.replace(/\s*\([^)]*\)\s*$/, "").trim();
  const [publishOption, setPublishOption] = React.useState<"overwrite" | "new">(
    onlineTournaments.length > 0 ? "overwrite" : "new"
  );

  // Find closest tournament
  const defaultTourId = React.useMemo(() => {
    if (onlineTournaments.length === 0) return "";
    const cleanDraft = cleanName.toLowerCase();
    const match = onlineTournaments.find(
      (t) =>
        t.matchName.toLowerCase().includes(cleanDraft) ||
        cleanDraft.includes(t.matchName.toLowerCase())
    );
    return match ? match.id : onlineTournaments[0].id;
  }, [onlineTournaments, cleanName]);

  const [selectedTourId, setSelectedTourId] = React.useState(defaultTourId);
  const [newTourName, setNewTourName] = React.useState(cleanName);

  // Sync selectedTourId when defaultTourId changes
  React.useEffect(() => {
    if (defaultTourId) setSelectedTourId(defaultTourId);
  }, [defaultTourId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-[99999]">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white flex justify-between items-center">
          <div>
            <h3 className="text-base font-black uppercase tracking-wider">
              {language === "en" ? "Publish draft to Online Cloud 🏆" : "Đăng bản nháp lên Online Cloud 🏆"}
            </h3>
            <p className="text-[10px] text-indigo-100 mt-1">
              {language === "en"
                ? "Sync history scores to the online system"
                : "Đồng bộ bảng điểm lịch sử của bạn lên hệ thống trực tuyến"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-full transition-all text-white cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 tracking-wider uppercase block mb-1">
              {language === "en" ? "CURRENT DRAFT" : "BẢN NHÁP HIỆN TẠI"}
            </span>
            <div className="text-xs font-black text-slate-800 dark:text-slate-200">
              {draftPreviewItem.matchName}
            </div>
            <div className="flex gap-4 mt-2 text-[10px] text-slate-500 font-mono">
              <span>
                👤 {draftPreviewItem.athletes.length} {language === "en" ? "Athletes" : "VĐV"}
              </span>
              <span>
                🎯 {draftPreviewItem.shotCount} {language === "en" ? "Shots" : "Lượt bắn"}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              {language === "en" ? "Select Publishing Method" : "Chọn phương thức xuất bản"}
            </label>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={onlineTournaments.length === 0}
                onClick={() => setPublishOption("overwrite")}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  publishOption === "overwrite"
                    ? "border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400"
                    : "border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-950"
                } ${onlineTournaments.length === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <div className="text-xs font-bold">
                  {language === "en" ? "OVERWRITE online tournament" : "GHI ĐÈ giải đấu online"}
                </div>
                <div className="text-[9px] mt-1 opacity-80">
                  {language === "en"
                    ? "Replace data of an existing online tournament"
                    : "Thay thế dữ liệu của một giải online sẵn có"}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPublishOption("new")}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  publishOption === "new"
                    ? "border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400"
                    : "border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-950"
                }`}
              >
                <div className="text-xs font-bold">
                  {language === "en" ? "CREATE NEW tournament" : "TẠO GIẢI MỚI hoàn toàn"}
                </div>
                <div className="text-[9px] mt-1 opacity-80">
                  {language === "en"
                    ? "Initialize and upload a new online tournament"
                    : "Khởi tạo và tải lên một giải đấu trực tuyến mới"}
                </div>
              </button>
            </div>

            {publishOption === "overwrite" && onlineTournaments.length > 0 && (
              <div className="space-y-2 pt-2">
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {language === "en"
                    ? "Online Tournaments List (Closest match suggested)"
                    : "Danh sách giải online (Được gợi ý giải gần tên nhất)"}
                </label>
                <select
                  value={selectedTourId}
                  onChange={(e) => setSelectedTourId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {onlineTournaments.map((tour, idx) => (
                    <option key={`app-tour-opt-${tour.id}-${idx}`} value={tour.id}>
                      {tour.matchName}{" "}
                      {tour.id === defaultTourId
                        ? language === "en"
                          ? " ⭐️ (Most recent)"
                          : " ⭐️ (Gần đây nhất)"
                        : ""}
                    </option>
                  ))}
                </select>
                <p className="text-[9px] text-rose-500 font-medium">
                  {language === "en"
                    ? "⚠️ Notice: This action will completely overwrite scores of the selected tournament."
                    : "⚠️ Bạn lưu ý: Hành động này sẽ thay thế hoàn toàn điểm số của giải đấu được chọn."}
                </p>
              </div>
            )}

            {publishOption === "new" && (
              <div className="space-y-2 pt-2">
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {language === "en" ? "New Online Tournament Name" : "Tên giải đấu online mới"}
                </label>
                <input
                  type="text"
                  value={newTourName}
                  onChange={(e) => setNewTourName(e.target.value)}
                  placeholder={language === "en" ? "Enter tournament name..." : "Nhập tên giải đấu..."}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none"
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer text-center"
          >
            {language === "en" ? "Close" : "Đóng"}
          </button>

          <button
            type="button"
            onClick={() => {
              if (publishOption === "overwrite") {
                onOverwrite(selectedTourId);
              } else {
                onCreateNew(newTourName);
              }
            }}
            className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md text-center"
          >
            {language === "en" ? "Publish Online 🚀" : "Đăng online 🚀"}
          </button>
        </div>
      </div>
    </div>
  );
};
