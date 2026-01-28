"use client";

import { useRouter } from "next/navigation";
import { Dropdown, MenuItem } from "./ui";
import {
  IconChevronDown,
  IconPause,
  IconRefresh,
  IconStop,
  IconUser,
} from "./icons";
import { Settings } from "lucide-react";

export function HeaderBar(props: {
  points: number;
  walletLoading?: boolean;
  email: string;
  busy: boolean;
  poll: () => void;
  profileMenuOpen: boolean;
  setProfileMenuOpen: (v: boolean) => void;
  scanRunning: boolean;
  scanPaused: boolean;
  onOpenScanModal: () => void;
  onPauseOrResume: () => void;
  onStopScan: () => void;
  onLogout: () => void;

  onOpenSettings: () => void;
}) {
  const router = useRouter();
  const scanActionVisible = props.scanRunning;

  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      {/* ... Partie Gauche (Logo + Points + Scan) INCHANGÉE ... */}
      <div className="min-w-0">
        <div className="text-2xl font-black">Bienvenue sur JobTrackAI</div>
        <div className="mt-2 flex items-center gap-4 text-sm text-slate-300">
          {props.walletLoading ? (
            <div className="h-5 w-24 animate-pulse rounded bg-white/10" />
          ) : (
            <span className="font-semibold text-slate-200 transition-all duration-300">
              {props.points} points
            </span>
          )}
          <span className="text-slate-500">•</span>
          <span className="truncate">{props.email}</span>
        </div>

        <div className="mt-2 flex items-center gap-2">
          {/* ... Boutons Scan ... */}
          <button
            type="button"
            className="rounded-xl bg-indigo-500/20 px-3 py-2 text-xs font-semibold ring-1 ring-indigo-400/30 hover:bg-indigo-500/30 disabled:opacity-60"
            disabled={props.scanRunning}
            onClick={() => props.onOpenScanModal()}
          >
            Scan
          </button>
          {scanActionVisible && (
            <>
              {/* ... Boutons Pause/Stop ... */}
              <button
                onClick={() => props.onPauseOrResume()}
                className="rounded-xl bg-amber-500/20 p-2 ring-1 ring-amber-400/30 hover:bg-amber-500/30"
              >
                <IconPause className="h-4 w-4 text-amber-200" />
              </button>
              <button
                onClick={() => props.onStopScan()}
                className="rounded-xl bg-red-500/20 p-2 ring-1 ring-red-400/30 hover:bg-red-500/30"
              >
                <IconStop className="h-4 w-4 text-red-200" />
              </button>
            </>
          )}
          <button
            onClick={() => props.poll()}
            disabled={props.busy}
            className="rounded-xl bg-white/5 p-2 ring-1 ring-white/10 hover:bg-white/10"
          >
            <IconRefresh
              className={props.busy ? "h-4 w-4 animate-spin" : "h-4 w-4"}
            />
          </button>
        </div>
      </div>

      {/* Partie Droite (Settings + Profil) */}
      <div className="flex items-center gap-2 relative">
        <button
          type="button"
          onClick={props.onOpenSettings}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 ring-1 ring-white/10 transition-colors text-slate-400 hover:text-slate-200"
          title="Paramètres"
        >
          <Settings className="w-5 h-5" />
        </button>

        <div className="relative">
          <button
            type="button"
            className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-xs font-semibold ring-1 ring-white/10 hover:bg-white/10"
            onClick={() => props.setProfileMenuOpen(!props.profileMenuOpen)}
          >
            <IconUser className="h-4 w-4 text-slate-200" />
            <span className="hidden sm:inline">Profil</span>
            <IconChevronDown className="h-4 w-4 text-slate-400" />
          </button>

          <Dropdown open={props.profileMenuOpen} align="right">
            <MenuItem
              label="Acheter des points"
              onClick={() => {
                props.setProfileMenuOpen(false);
                router.push("/pricing-page");
              }}
            />
            <div className="my-1 h-px bg-white/10" />
            <MenuItem
              danger // Optionnel, juste pour le style rouge si tu veux, sinon enlève
              label="Se déconnecter"
              onClick={() => {
                props.setProfileMenuOpen(false);
                props.onLogout();
              }}
            />
          </Dropdown>
        </div>
      </div>
    </div>
  );
}
