import React from "react";
import { Youtube, Facebook } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

export function SportiveFooter() {
  const { t } = useLanguage();

  return (
    <footer className="mt-20 border-t border-gray-200 dark:border-slate-800 pt-8 pb-12 text-gray-400 max-w-7xl mx-auto px-4" id="app-footer">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 text-left border-b border-gray-100 dark:border-slate-900 pb-8">
        
        {/* Social connections */}
        <div>
          <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest mb-3.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            {t("footer.media")}
          </h4>
          <div className="flex flex-wrap gap-3">
            <a 
              href="https://youtube.com/@vsc.vietnamslingshot?sub_confirmation=1" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/20 dark:hover:bg-red-950/40 dark:text-red-400 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all border border-red-105 dark:border-red-900/30"
            >
              <Youtube className="w-4 h-4 fill-current" />
              <span>vsc.vietnamslingshot</span>
            </a>

            <a 
              href="https://www.facebook.com/groups/vietnamslingshotchampionship" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-950/20 dark:hover:bg-blue-950/40 dark:text-blue-400 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all border border-blue-105 dark:border-blue-900/30"
            >
              <Facebook className="w-4 h-4 fill-current" />
              <span>Vietnam Slingshot Championship</span>
            </a>

            <a 
              href="http://tiktok.com/@vsc.vietnamslingshot" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all border border-slate-200 dark:border-slate-800"
            >
              <svg className="w-4 h-4 text-current shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
              </svg>
              <span>@vsc.vietnamslingshot</span>
            </a>
          </div>
        </div>

        {/* Sponsors & Clubs */}
        <div>
          <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest mb-3.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            {t("footer.sponsors")}
          </h4>
          <div className="flex flex-wrap gap-2.5">
            <span className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-1.5 rounded-xl text-slate-700 dark:text-slate-300 text-xs font-bold shadow-sm">
              🏆 36 Slingshot Club
            </span>
            <span className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-1.5 rounded-xl text-slate-700 dark:text-slate-300 text-xs font-bold shadow-sm">
              🎯 CLB ná cao su thể thao TNU Thái Nguyên
            </span>
          </div>
        </div>

      </div>

      <div className="text-center">
        <p className="font-semibold text-gray-600 dark:text-gray-400 text-xs">
          {t("footer.copyright")}
        </p>
        <p className="text-[10px] text-gray-400 mt-1.5">
          {t("footer.storage_hint")}
        </p>
      </div>
    </footer>
  );
}
