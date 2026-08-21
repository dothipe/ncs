import React from "react";
import { Globe } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

interface HeroBannerProps {
  activeTab: string;
  onlineTournaments: any[];
}

export function HeroBanner({ activeTab, onlineTournaments }: HeroBannerProps) {
  const { language } = useLanguage();

  if (activeTab !== "home") return null;

  return (
    <div 
      className="w-full relative py-20 px-4 flex flex-col justify-center items-center shadow-inner text-center select-none overflow-hidden"
      style={{
        backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.65), rgba(0, 0, 0, 0.35), rgba(0, 0, 0, 0.65)), url("https://lh3.googleusercontent.com/d/1sEes6o_PO8DTO4ZQa3IcvDcMK_2kwoPC")',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {/* Ambient gold glow effect overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent pointer-events-none" />

      <div className="max-w-4xl w-full flex flex-col items-center relative z-10">
        <h2 className="text-[1px] leading-[150px] h-[130px] font-black text-white tracking-wider uppercase drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)] mb-8 font-sans">
          {language === "en" ? "PROFESSIONAL LEAGUE MANAGEMENT SYSTEM" : "HỆ THỐNG QUẢN LÝ GIẢI ĐẤU CHUYÊN NGHIỆP"}
        </h2>
      </div>

      {/* Total online tournaments display at the bottom-right of the Banner */}
      <div className="absolute bottom-3 right-4 z-10 flex items-center gap-1.5 text-xs font-bold text-white/90 bg-black/45 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 shadow-md">
        <Globe className="w-3.5 h-3.5 animate-pulse text-yellow-400" />
        <span>
          {language === "en" 
            ? `Total online tournaments: ${onlineTournaments.length}` 
            : `Tổng số giải đấu trực tuyến: ${onlineTournaments.length}`}
        </span>
      </div>
    </div>
  );
}
