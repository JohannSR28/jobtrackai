"use client";

import { useRouter } from "next/navigation";
import { Dropdown, MenuItem } from "./ui";
import { IconChevronDown, IconUser } from "./icons";
import { Settings } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

const translations = {
  fr: {
    pts: "pts",
    settings: "Paramètres",
    buyPoints: "Acheter des points",
    logout: "Se déconnecter",
  },
  en: {
    pts: "pts",
    settings: "Settings",
    buyPoints: "Buy points",
    logout: "Log out",
  },
};

export function HeaderBar(props: {
  points: number;
  walletLoading?: boolean;
  email: string;
  profileMenuOpen: boolean;
  setProfileMenuOpen: (v: boolean) => void;
  onLogout: () => void;
  onOpenSettings: () => void;
}) {
  const router = useRouter();
  const { language } = useLanguage();
  const t = translations[language];

  const handleLogoClick = () => {
    // Redirige vers le dashboard.
    router.push("/dashboard");
  };

  return (
    <>
      {/* Backdrop pour fermer le menu profil */}
      {props.profileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-transparent"
          onClick={() => props.setProfileMenuOpen(false)}
        />
      )}

      <header className="fixed top-0 left-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm transition-all duration-300">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* GAUCHE : Logo (Action Router + Style Orange) */}
          <button
            onClick={handleLogoClick}
            className="flex items-center gap-2 group outline-none"
          >
            {/* Le carré du logo : Noir par défaut, devient Orange au survol */}
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white font-bold text-lg group-hover:bg-brand-orange transition-colors duration-300 shadow-md">
              J
            </div>
            {/* Le texte : JobTrack en noir, AI en orange */}
            <span className="font-bold text-xl tracking-tight text-black hidden sm:block">
              JobTrackAI
            </span>
          </button>

          {/* DROITE : Points + Actions Profil */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Points Badge (Orange subtil) */}
            <div className="flex items-center gap-2 bg-orange-50 rounded-full px-3 py-1.5 border border-orange-100">
              {props.walletLoading ? (
                <div className="h-4 w-16 animate-pulse rounded bg-gray-300" />
              ) : (
                <span className="font-bold text-sm text-brand-orange">
                  {props.points}{" "}
                  <span className="text-orange-400/70 font-medium text-xs">
                    {t.pts}
                  </span>
                </span>
              )}
            </div>

            <div className="h-6 w-px bg-gray-300 hidden sm:block"></div>

            {/* Email (Caché sur mobile) */}
            <div className="hidden md:block text-sm font-medium text-gray-500 truncate max-w-[150px]">
              {props.email}
            </div>

            {/* Settings Button */}
            <button
              type="button"
              onClick={props.onOpenSettings}
              className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-black transition-colors"
              title={t.settings}
            >
              <Settings className="w-5 h-5" />
            </button>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                type="button"
                className="flex items-center gap-2 rounded-full bg-black pl-1 pr-1 sm:pr-3 py-1 hover:bg-gray-800 transition-all shadow-md active:scale-95"
                onClick={() => props.setProfileMenuOpen(!props.profileMenuOpen)}
              >
                <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center border border-gray-300 text-black">
                  <IconUser className="h-4 w-4" />
                </div>
                <IconChevronDown className="h-3 w-3 text-white hidden sm:block" />
              </button>

              <Dropdown open={props.profileMenuOpen} align="right">
                <MenuItem
                  label={t.buyPoints}
                  onClick={() => {
                    props.setProfileMenuOpen(false);
                    router.push("/pricing-page");
                  }}
                />
                <div className="my-1 h-px bg-gray-100" />
                <MenuItem
                  danger
                  label={t.logout}
                  onClick={() => {
                    props.setProfileMenuOpen(false);
                    props.onLogout();
                  }}
                />
              </Dropdown>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
