"use client";

// 1. Import du router Next.js
import { useRouter } from "next/navigation";

import { Dropdown, MenuItem } from "./ui";
import {
  IconChevronDown,
  IconPause,
  IconRefresh,
  IconStop,
  IconUser,
} from "./icons";

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
  onDeleteAccount: () => void;

  // GESTION CONNEXION MAIL
  isMailConnected: boolean | undefined;
  onConnectMail: () => void;
  onRemoveMailConnection: () => void;
}) {
  const scanActionVisible = props.scanRunning;

  const router = useRouter();

  return (
    <div className="mb-3 flex items-start justify-between gap-3">
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
          {/* BOUTON SCAN PRINCIPAL */}
          <button
            type="button"
            className="rounded-xl bg-indigo-500/20 px-3 py-2 text-xs font-semibold ring-1 ring-indigo-400/30 hover:bg-indigo-500/30 disabled:opacity-60"
            disabled={props.scanRunning}
            onClick={() => props.onOpenScanModal()}
          >
            Scan
          </button>

          {scanActionVisible ? (
            <>
              <button
                type="button"
                className="rounded-xl bg-amber-500/20 p-2 ring-1 ring-amber-400/30 hover:bg-amber-500/30 disabled:opacity-60"
                onClick={() => props.onPauseOrResume()}
                title={props.scanPaused ? "Resume" : "Pause"}
                aria-label={props.scanPaused ? "Resume" : "Pause"}
              >
                <IconPause className="h-4 w-4 text-amber-200" />
              </button>

              <button
                type="button"
                className="rounded-xl bg-red-500/20 p-2 ring-1 ring-red-400/30 hover:bg-red-500/30 disabled:opacity-60"
                onClick={() => props.onStopScan()}
                title="Stop"
                aria-label="Stop"
              >
                <IconStop className="h-4 w-4 text-red-200" />
              </button>
            </>
          ) : null}

          <button
            type="button"
            className="rounded-xl bg-white/5 p-2 ring-1 ring-white/10 hover:bg-white/10 disabled:opacity-60"
            disabled={props.busy}
            onClick={() => props.poll()}
            title="Refresh"
            aria-label="Refresh"
          >
            <IconRefresh
              className={props.busy ? "h-4 w-4 animate-spin" : "h-4 w-4"}
            />
          </button>
        </div>
      </div>

      <div className="relative">
        <button
          type="button"
          className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-xs font-semibold ring-1 ring-white/10 hover:bg-white/10"
          onClick={() => props.setProfileMenuOpen(!props.profileMenuOpen)}
          aria-label="Profile menu"
          title="Profile"
        >
          <IconUser className="h-4 w-4 text-slate-200" />
          <span className="hidden sm:inline">Profil</span>
          <IconChevronDown className="h-4 w-4 text-slate-400" />
        </button>

        <Dropdown open={props.profileMenuOpen} align="right">
          <MenuItem
            label="Se déconnecter"
            onClick={() => {
              props.setProfileMenuOpen(false);
              props.onLogout();
            }}
          />
          <MenuItem
            label="Changer de langue"
            onClick={() => {
              props.setProfileMenuOpen(false);
              alert("Fake: change language");
            }}
          />
          <div className="my-1 h-px bg-white/10" />

          <MenuItem
            label="Acheter des points"
            onClick={() => {
              props.setProfileMenuOpen(false);
              // 3. Redirection automatique relative au domaine actuel
              router.push("/pricing-page");
            }}
          />

          {/* LOGIQUE INTELLIGENTE DU MENU MAIL */}
          {props.isMailConnected ? (
            <MenuItem
              label="Retirer l'accès aux mails"
              onClick={() => {
                props.setProfileMenuOpen(false);
                props.onRemoveMailConnection();
              }}
            />
          ) : (
            <MenuItem
              label="Autoriser l'accès aux mails"
              onClick={() => {
                props.setProfileMenuOpen(false);
                props.onConnectMail();
              }}
            />
          )}

          <div className="my-1 h-px bg-white/10" />
          <MenuItem
            danger
            label="Supprimer définitivement son compte"
            onClick={() => {
              props.setProfileMenuOpen(false);
              props.onDeleteAccount();
            }}
          />
        </Dropdown>
      </div>
    </div>
  );
}
