"use client";

import { useLanguage } from "@/hooks/useLanguage";

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-full p-1">
      <button
        onClick={() => setLanguage("en")}
        className={`px-2 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm font-semibold rounded-full transition-all duration-200 ${
          language === "en"
            ? "bg-brand-orange text-black shadow-sm"
            : "text-gray-600 hover:text-black"
        }`}
      >
        EN
      </button>
      <button
        onClick={() => setLanguage("fr")}
        className={`px-2 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm font-semibold rounded-full transition-all duration-200 ${
          language === "fr"
            ? "bg-brand-orange text-black shadow-sm"
            : "text-gray-600 hover:text-black"
        }`}
      >
        FR
      </button>
    </div>
  );
}
