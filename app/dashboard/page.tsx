"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";

import {
  AlertModal,
  ResumeScanModal,
  DeleteAccountModal,
  ModalShell,
} from "@/components/dashbord/_components/ui";

import {
  useJobApplications,
  type Bucket,
  type JobStatus,
  type StatusFilter,
} from "@/hooks/useJobApplications";

import { useScanTester, type ScanDTO } from "@/hooks/useScanTester";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { useMailConnection } from "@/hooks/useMailConnection";
import { useMailActions } from "@/hooks/useMailActions";
import { useLanguage } from "@/hooks/useLanguage";

import {
  JOB_STATUS,
  clampInt,
  statusDotClass,
  statusTextClass,
} from "@/components/dashbord/_components/ui";

import { HeaderBar } from "@/components/dashbord/_components/HeaderBar";
import { SettingsDrawer } from "@/components/dashbord/_components/SettingsDrawer";
import { ApplicationsPanel } from "@/components/dashbord/_components/ApplicationsPanel";
import { Drawer } from "@/components/dashbord/_components/Drawer";
import { EmailEditModal } from "@/components/dashbord/_components/EmailEditModal";
import { StatusChangeModal } from "@/components/dashbord/_components/StatusChangeModal";

// --- TYPES LOCAUX ---

type ApplicationsData = {
  applications: Bucket[];
  total: number;
  maxPage: number;
  statusCounts: Record<StatusFilter, number>;
};

type EmailEditState = {
  company: string;
  position: string;
  status: JobStatus;
  eventType: string;
};

// --- HELPERS DATE ---
const TODAY = new Date().toISOString().split("T")[0];
const ONE_WEEK_AGO = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  .toISOString()
  .split("T")[0];

function toUtcIso(dateStr: string, timeStr = "00:00") {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  const local = new Date(y, m - 1, d, hh, mm, 0);
  return local.toISOString();
}

function toUtcIsoEndOfDay(dateStr: string) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  const local = new Date(y, m - 1, d, 23, 59, 59, 999);
  return local.toISOString();
}

// --- BARRE DE PROGRESSION (AMÉLIORÉE) ---
function CompactProgressBar({
  scan,
  forceActive, // Pour le Bleu (Resume)
  forcePaused, //  Pour le Jaune (Pause)
}: {
  scan: ScanDTO;
  forceActive: boolean;
  forcePaused: boolean;
}) {
  const { status, processedCount, totalCount, errorMessage } = scan;
  const rawPercent =
    totalCount > 0 ? Math.round((processedCount / totalCount) * 100) : 0;

  let visualStatus = status;
  if (forceActive) visualStatus = "running";
  if (forcePaused) visualStatus = "paused";

  const isActive = visualStatus === "running" || visualStatus === "created";
  const visualPercent = isActive && rawPercent < 5 ? 5 : rawPercent;

  const isError =
    visualStatus === "failed" ||
    visualStatus === "canceled" ||
    (!!errorMessage && !forceActive);

  const isPaused = visualStatus === "paused";

  return (
    <div className="mx-auto mb-6 flex max-w-7xl animate-in slide-in-from-top-2 items-center gap-4 px-1 duration-500">
      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 1.5s infinite linear;
        }
      `}</style>

      <div
        className={`relative flex h-10 flex-1 items-center overflow-hidden rounded-lg border shadow-sm backdrop-blur-sm transition-colors duration-300 ${
          isPaused
            ? "border-amber-500/30 bg-amber-900/20"
            : "border-slate-800 bg-slate-900/80"
        }`}
      >
        <div
          className={`absolute inset-y-0 left-0 overflow-hidden transition-all duration-500 ease-out ${
            isError
              ? "bg-red-500/20"
              : isPaused
                ? "bg-amber-500/20" // 🟡 Jaune immédiat
                : "bg-indigo-600/30"
          }`}
          style={{ width: `${visualPercent}%` }}
        >
          {isActive && (
            <div className="absolute inset-0 w-full animate-shimmer bg-gradient-to-r from-transparent via-indigo-400/30 to-transparent" />
          )}
        </div>

        <div
          className={`absolute bottom-0 left-0 h-1 transition-all duration-500 ${
            isError
              ? "bg-red-500"
              : isPaused
                ? "bg-amber-500" // 🟡 Ligne Jaune
                : "bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,1)]"
          }`}
          style={{ width: `${visualPercent}%` }}
        />

        <div className="relative z-10 flex w-full items-center justify-between px-4 text-xs font-medium">
          <div className="flex items-center gap-3">
            <span
              className={`font-bold uppercase tracking-wider transition-colors duration-300 ${
                isError
                  ? "text-red-400"
                  : isPaused
                    ? "text-amber-400"
                    : "text-indigo-400"
              }`}
            >
              {/* 🟢 GESTION DES TEXTES INSTANTANÉS */}
              {forceActive
                ? "RESUMING..."
                : forcePaused
                  ? "PAUSING..."
                  : visualStatus === "canceled"
                    ? "STOPPED"
                    : isError
                      ? "Error"
                      : visualStatus === "running"
                        ? "Scanning..."
                        : visualStatus}
            </span>
            <span className="hidden border-l border-white/10 pl-3 text-slate-400 sm:inline-block">
              {processedCount} / {totalCount} emails
            </span>
          </div>
          <div className="flex items-center gap-3">
            {errorMessage && !forceActive && (
              <span className="max-w-[200px] truncate text-red-400">
                {errorMessage}
              </span>
            )}
            <span className="font-mono text-slate-200">{rawPercent}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- CONNEXION MAIL REQUISE (MODALE) ---
function MailConnectModal(props: {
  open: boolean;
  onClose: () => void;
  onConnect: () => void;
  providerName: string;
}) {
  return (
    <ModalShell
      open={props.open}
      onClose={props.onClose}
      title="Autorisation Requise"
      subtitle="Accès à la boîte mail nécessaire"
    >
      <div className="space-y-4 text-sm text-slate-300">
        <p>
          Pour analyser vos candidatures, JobTrack a besoin de
          l&apos;autorisation de lire vos emails via{" "}
          <strong>{props.providerName}</strong>.
        </p>
        <div className="rounded-md border border-amber-500/20 bg-amber-500/10 p-3 text-amber-200">
          🔒 Nous ne stockons jamais vos emails complets. Seules les
          candidatures détectées sont analysées.
        </div>
        <div className="flex justify-end gap-3 border-t border-white/10 pt-4">
          <button
            onClick={props.onClose}
            className="rounded-lg px-4 py-2 hover:bg-white/10"
          >
            Annuler
          </button>
          <button
            onClick={props.onConnect}
            className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-500"
          >
            Autoriser l&apos;accès
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

// --- MODAL CONFIGURATION (Init) ---
type ScanMode = "since_last" | "custom";

function ScanStartModal(props: {
  open: boolean;
  mode: ScanMode;
  startDate: string;
  endDate: string;
  lastScanDate: string | null;
  setMode: (m: ScanMode) => void;
  setStartDate: (v: string) => void;
  setEndDate: (v: string) => void;
  onClose: () => void;
  onStart: () => void;
  busy: boolean;
}) {
  return (
    <ModalShell
      open={props.open}
      title="Start Mail Scan"
      subtitle="Sync your applications"
      onClose={props.onClose}
    >
      <div className="space-y-4 text-sm text-slate-200">
        <div className="space-y-3">
          <label
            className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
              props.mode === "since_last"
                ? "border-indigo-500/50 bg-indigo-500/10"
                : "border-slate-800 bg-slate-900 hover:border-slate-700"
            }`}
          >
            <input
              type="radio"
              name="scanMode"
              className="text-indigo-500 focus:ring-indigo-500"
              checked={props.mode === "since_last"}
              onChange={() => props.setMode("since_last")}
            />
            <div>
              <div className="font-medium">Smart Sync</div>
              <div className="text-xs text-slate-400">
                {props.lastScanDate
                  ? `Reprendre depuis le : ${new Date(
                      props.lastScanDate,
                    ).toLocaleDateString()} ${new Date(
                      props.lastScanDate,
                    ).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`
                  : "Aucun scan précédent (défaut: -7 jours)"}
              </div>
            </div>
          </label>

          <label
            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
              props.mode === "custom"
                ? "border-indigo-500/50 bg-indigo-500/10"
                : "border-slate-800 bg-slate-900 hover:border-slate-700"
            }`}
          >
            <input
              type="radio"
              name="scanMode"
              className="mt-1 text-indigo-500 focus:ring-indigo-500"
              checked={props.mode === "custom"}
              onChange={() => props.setMode("custom")}
            />
            <div className="flex-1">
              <div className="mb-2 font-medium">Custom Range</div>
              {props.mode === "custom" && (
                <div className="grid animate-in slide-in-from-top-1 grid-cols-2 gap-3 duration-200">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      From
                    </span>
                    <input
                      type="date"
                      value={props.startDate}
                      onChange={(e) => props.setStartDate(e.target.value)}
                      className="w-full cursor-pointer rounded-lg bg-slate-950 px-3 py-2 text-sm outline-none ring-1 ring-white/10 transition-colors hover:bg-slate-900 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      To
                    </span>
                    <input
                      type="date"
                      value={props.endDate}
                      onChange={(e) => props.setEndDate(e.target.value)}
                      className="w-full cursor-pointer rounded-lg bg-slate-950 px-3 py-2 text-sm outline-none ring-1 ring-white/10 transition-colors hover:bg-slate-900 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </label>
        </div>

        <div className="flex justify-end gap-2 border-t border-white/5 pt-2">
          <button
            type="button"
            className="rounded-lg bg-white/5 px-4 py-2 text-xs font-semibold ring-1 ring-white/10 transition-colors hover:bg-white/10"
            onClick={props.onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-500 disabled:opacity-50"
            disabled={
              props.busy ||
              (props.mode === "custom" && (!props.startDate || !props.endDate))
            }
            onClick={props.onStart}
          >
            {props.busy ? "Initializing..." : "Start Scan"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

// --- PAGE PRINCIPALE ---

export default function JobDomainPage() {
  const router = useRouter();

  const { signOut, deleteAccount, user, loading } = useAuth();
  const { balance, loading: walletLoading, refreshBalance } = useWallet();
  const { language, setLanguage } = useLanguage();

  const {
    scan,
    init,
    runLoop,
    pause,
    cancel,
    isLooping,
    action,
    lastCheckpoint,
    fetchCheckpoint,
  } = useScanTester({ delayMs: 500 });

  const {
    status: mailStatus,
    pollStatus: pollMailStatus,
    connect: connectMail,
  } = useMailConnection();
  const { removeConnection } = useMailActions();

  const {
    getApplications,
    updateApplication,
    updateEmail: apiUpdateEmail,
    archiveApplication,
    deleteApplication,
    loading: hookLoading,
    error: hookError,
  } = useJobApplications();

  const [data, setData] = useState<ApplicationsData | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isScanUiVisible, setIsScanUiVisible] = useState(false);
  const [isResuming, setIsResuming] = useState(false);

  type ArchiveMode = "active" | "archived";
  const [archiveMode, setArchiveMode] = useState<ArchiveMode>("active");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState<number>(1);
  const [isMobile, setIsMobile] = useState(false);

  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [resumeModalOpen, setResumeModalOpen] = useState(false);
  const [mailConnectModalOpen, setMailConnectModalOpen] = useState(false);
  const [alertModalOpen, setAlertModalOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const [scanMode, setScanMode] = useState<ScanMode>("since_last");
  const [scanStartDate, setScanStartDate] = useState(ONE_WEEK_AGO);
  const [scanEndDate, setScanEndDate] = useState(TODAY);
  const [isInitializingScan, setIsInitializingScan] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login-page");
    }
  }, [user, loading, router]);

  useEffect(() => {
    pollMailStatus();
  }, [pollMailStatus]);

  useEffect(() => {
    if (isLooping || isResuming || action === "pause") {
      setIsScanUiVisible(true);
      return;
    }

    if (scan && (scan.status === "running" || scan.status === "created")) {
      setIsScanUiVisible(true);
    } else if (
      scan &&
      (scan.status === "paused" ||
        scan.status === "completed" ||
        scan.status === "failed" ||
        scan.status === "canceled")
    ) {
      const timer = setTimeout(() => {
        setIsScanUiVisible(false);
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setIsScanUiVisible(false);
    }
  }, [scan, scan?.status, isLooping, isResuming, action]);

  useEffect(() => {
    if (scan?.status === "running") {
      setIsResuming(false);
    }
  }, [scan?.status]);

  const expectedMailProvider = useMemo(() => {
    const p = user?.app_metadata?.provider;
    if (p === "google") return "gmail";
    if (p === "azure") return "outlook";
    return null;
  }, [user]);

  const isMailConnected = !!(
    mailStatus?.authenticated && mailStatus?.connected
  );

  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [emailEditOpen, setEmailEditOpen] = useState(false);
  const [emailEditId, setEmailEditId] = useState<string | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);
  const pageSize = isMobile ? 10 : 20;

  const fetchData = useCallback(async () => {
    const result = await getApplications({
      archived: archiveMode === "archived",
      status: statusFilter,
      page: page,
      pageSize: pageSize,
    });
    setData(result as ApplicationsData);
  }, [getApplications, archiveMode, statusFilter, page, pageSize]);

  useEffect(() => {
    fetchData();
    fetchCheckpoint();
  }, [fetchData, fetchCheckpoint]);

  const selectedBucket =
    data?.applications.find((b) => b.app.id === selectedAppId) ?? null;

  const selectedEmailForModal =
    selectedBucket?.emails.find((e) => e.id === emailEditId) ?? null;

  const [noteDraft, setNoteDraft] = useState("");
  const [appStatusDraft, setAppStatusDraft] = useState<JobStatus>("unknown");
  const [emailEditState, setEmailEditState] = useState<EmailEditState | null>(
    null,
  );

  useEffect(() => {
    if (!selectedBucket) return setNoteDraft("");
    setNoteDraft(selectedBucket.app.notes ?? "");
    setAppStatusDraft(selectedBucket.app.status);
  }, [selectedBucket]);

  const canSaveDrawer =
    (noteDraft ?? "") !== (selectedBucket?.app.notes ?? "") ||
    appStatusDraft !== selectedBucket?.app.status;

  useEffect(() => {
    if (!selectedEmailForModal) return setEmailEditState(null);
    setEmailEditState({
      company: selectedEmailForModal.company ?? "",
      position: selectedEmailForModal.position ?? "",
      status: selectedEmailForModal.status,
      eventType: selectedEmailForModal.event_type ?? "",
    });
  }, [selectedEmailForModal]);

  // --- ACTIONS ---

  const handleScanButtonClick = () => {
    if (!isMailConnected) {
      setMailConnectModalOpen(true);
      return;
    }

    const isActive =
      scan &&
      (scan.status === "created" ||
        scan.status === "running" ||
        scan.status === "paused");

    if (isActive) {
      setResumeModalOpen(true);
    } else {
      setScanModalOpen(true);
    }
  };

  const handleConnectMail = () => {
    if (expectedMailProvider) {
      connectMail(expectedMailProvider);
    } else {
      setAlertMessage(
        "Impossible de déterminer le fournisseur (Gmail/Outlook).",
      );
      setAlertModalOpen(true);
      setMailConnectModalOpen(false);
    }
  };

  const handleRemoveMailConnection = async () => {
    const ok = window.confirm(
      "Voulez-vous vraiment retirer l'accès à votre boîte mail ? Les scans ne seront plus possibles.",
    );
    if (!ok) return;

    try {
      const res = await removeConnection();
      if (res.ok) {
        await pollMailStatus();
        alert("Accès retiré avec succès.");
      } else {
        setAlertMessage(`Erreur: ${res.message}`);
        setAlertModalOpen(true);
      }
    } catch (e) {
      console.error(e);
      setAlertMessage("Erreur inattendue.");
      setAlertModalOpen(true);
    }
  };

  // 👇 GESTION AMÉLIORÉE DES ERREURS DE SCAN (CORRIGÉE AVEC LE BON CHEMIN)
  const handleStartScanFromModal = async () => {
    setIsInitializingScan(true);
    try {
      let result;
      if (scanMode === "since_last") {
        result = await init({ mode: "since_last" });
      } else {
        if (!scanStartDate || !scanEndDate) return;
        const startIso = toUtcIso(scanStartDate);
        const endIso = toUtcIsoEndOfDay(scanEndDate);
        result = await init({ mode: "custom", startIso, endIso });
      }

      if (result.mode === "invalid") {
        const reason = result.validation.reason;
        let message = "Impossible d'initialiser le scan.";

        if (reason === "TOO_MANY_MESSAGES") {
          message =
            "⚠️ Limite atteinte : Plus de 2000 emails détectés.\n\n" +
            "Le scan est trop volumineux. Veuillez réduire la plage de dates pour scanner moins de jours.";
        } else if (reason === "RANGE_TOO_LARGE") {
          message =
            "⚠️ Plage trop large : Vous ne pouvez pas scanner une période aussi longue d'un coup.\n\n" +
            "Réduisez la durée sélectionnée. (90j Max)";
        } else if (reason === "INVALID_RANGE") {
          message =
            "⚠️ Date invalide : Vos dates semblent incorrectes ou trop anciennes.\n\n" +
            "Google limite l'accès aux emails de plus de 90 jours.";
        } else {
          message = `Erreur de validation : ${reason || "Inconnue"}`;
        }

        setAlertMessage(message);
        setAlertModalOpen(true);
        return;
      }

      if (result.mode === "insufficient_funds") {
        setAlertMessage(
          `Crédits insuffisants pour ce scan.\n\n` +
            `Coût estimé : ${result.required} crédits\n` +
            `Votre solde : ${result.current} crédits\n\n` +
            `Il vous manque ${result.required - result.current} crédits.`,
        );
        setAlertModalOpen(true);
        return;
      }

      setScanModalOpen(false);

      if (result.mode === "new" || result.mode === "existing") {
        runLoop(result.scan.id);
      }
    } catch (e) {
      console.error(e);
      setAlertMessage("Erreur technique lors de l'initialisation du scan.");
      setAlertModalOpen(true);
    } finally {
      setIsInitializingScan(false);
    }
  };

  useEffect(() => {
    if (!scan) return;
    const isBatchFinished = scan.processedCount > 0;
    const isScanStopped = [
      "paused",
      "completed",
      "canceled",
      "failed",
    ].includes(scan.status);

    if (scan.status === "running" && isBatchFinished) {
      refreshBalance();
    }
    if (isScanStopped) {
      refreshBalance();
      fetchData();
    }
  }, [scan, scan?.status, scan?.processedCount, refreshBalance, fetchData]);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (e) {
      console.error(e);
    } finally {
      router.push("/login-page");
    }
  };

  const handleOpenDeleteModal = () => {
    setDeleteModalOpen(true);
  };

  const confirmDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      await deleteAccount();
      router.push("/login-page");
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la suppression.");
      setIsDeletingAccount(false);
      setDeleteModalOpen(false);
    }
  };

  const handleUpdateApplication = async () => {
    if (!selectedBucket) return;
    await updateApplication(selectedBucket.app.id, {
      status: appStatusDraft,
      notes: noteDraft,
    });
    setStatusModalOpen(false);
    await fetchData();
  };
  const handleConfirmStatusChange = async (newStatus: JobStatus) => {
    if (!selectedBucket) return;
    await updateApplication(selectedBucket.app.id, { status: newStatus });
    setStatusModalOpen(false);
    await fetchData();
  };
  const handleArchive = async () => {
    if (!selectedBucket) return;
    if (!window.confirm("Are you sure?")) return;
    await archiveApplication(
      selectedBucket.app.id,
      !selectedBucket.app.archived,
    );
    setSelectedAppId(null);
    await fetchData();
  };
  const handleDelete = async () => {
    if (!selectedBucket) return;
    if (!window.confirm("Delete permanently?")) return;
    await deleteApplication(selectedBucket.app.id);
    setSelectedAppId(null);
    await fetchData();
  };
  const handleEmailSave = async () => {
    if (!selectedEmailForModal || !emailEditState) return;
    await apiUpdateEmail(selectedEmailForModal.id, {
      company: emailEditState.company,
      position: emailEditState.position,
      status: emailEditState.status,
      event_type: emailEditState.eventType,
    });
    setEmailEditOpen(false);
    setEmailEditId(null);
    await fetchData();
  };

  const statusOptions = [
    { key: "all" as const, label: "All" },
    {
      key: "applied" as const,
      label: "Applied",
      dot: statusDotClass("applied"),
    },
    {
      key: "interview" as const,
      label: "Interview",
      dot: statusDotClass("interview"),
    },
    { key: "offer" as const, label: "Offer", dot: statusDotClass("offer") },
    {
      key: "rejection" as const,
      label: "Rejection",
      dot: statusDotClass("rejection"),
    },
    {
      key: "unknown" as const,
      label: "Unknown",
      dot: statusDotClass("unknown"),
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-indigo-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-5 py-6">
        <HeaderBar
          points={balance}
          walletLoading={walletLoading}
          email={user?.email || "user@jobtrack.ai"}
          busy={hookLoading}
          poll={fetchData}
          profileMenuOpen={profileMenuOpen}
          setProfileMenuOpen={setProfileMenuOpen}
          scanRunning={(isScanUiVisible && isLooping) || isResuming}
          scanPaused={
            isScanUiVisible && scan?.status === "paused" && !isResuming
          }
          onOpenScanModal={handleScanButtonClick}
          onPauseOrResume={() => {
            if (isLooping) {
              pause();
            } else if (scan) {
              setIsResuming(true);
              runLoop(scan.id);
              setResumeModalOpen(false);
            }
          }}
          onStopScan={() => cancel()}
          onLogout={handleLogout}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        {/* On affiche la barre si scan visible, et on passe l'état optimiste */}
        {isScanUiVisible && scan && (
          <CompactProgressBar
            scan={scan}
            forceActive={isResuming}
            forcePaused={action === "pause"}
          />
        )}

        {hookError && (
          <div className="mb-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-100">
            {hookError}
          </div>
        )}

        <ApplicationsPanel
          archiveMode={archiveMode}
          setArchiveMode={setArchiveMode}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          statusOptions={statusOptions}
          statusCounts={
            data?.statusCounts ?? {
              all: 0,
              applied: 0,
              interview: 0,
              offer: 0,
              rejection: 0,
              unknown: 0,
            }
          }
          filteredTotal={data?.total ?? 0}
          page={page}
          maxPage={data?.maxPage ?? 1}
          onPrev={() => setPage((p) => clampInt(p - 1, 1, data?.maxPage ?? 1))}
          onNext={() => setPage((p) => clampInt(p + 1, 1, data?.maxPage ?? 1))}
          pagedBuckets={data?.applications ?? []}
          onSelectApp={(id) => setSelectedAppId(id)}
          statusTextClass={statusTextClass}
        />
      </div>

      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onRemoveMailConnection={handleRemoveMailConnection}
        onDeleteAccount={handleOpenDeleteModal}
        isMailConnected={isMailConnected}
        language={language}
        setLanguage={setLanguage}
      />

      <MailConnectModal
        open={mailConnectModalOpen}
        onClose={() => setMailConnectModalOpen(false)}
        onConnect={handleConnectMail}
        providerName={expectedMailProvider === "gmail" ? "Gmail" : "Outlook"}
      />

      <ScanStartModal
        open={scanModalOpen}
        mode={scanMode}
        startDate={scanStartDate}
        endDate={scanEndDate}
        lastScanDate={lastCheckpoint}
        setMode={setScanMode}
        setStartDate={setScanStartDate}
        setEndDate={setScanEndDate}
        onClose={() => setScanModalOpen(false)}
        onStart={handleStartScanFromModal}
        busy={isInitializingScan}
      />

      <ResumeScanModal
        open={resumeModalOpen}
        status={scan?.status || "Unknown"}
        onClose={() => setResumeModalOpen(false)}
        onResume={() => {
          if (scan) {
            setIsResuming(true);
            runLoop(scan.id);
            setResumeModalOpen(false);
          }
        }}
        onStop={() => {
          if (scan) cancel(scan.id);
          setResumeModalOpen(false);
        }}
      />

      <AlertModal
        open={alertModalOpen}
        title="Information"
        message={alertMessage}
        onClose={() => setAlertModalOpen(false)}
      />

      <DeleteAccountModal
        open={deleteModalOpen}
        busy={isDeletingAccount}
        onClose={() => !isDeletingAccount && setDeleteModalOpen(false)}
        onConfirm={confirmDeleteAccount}
      />

      <StatusChangeModal
        open={statusModalOpen}
        currentStatus={selectedBucket?.app.status ?? "unknown"}
        onClose={() => setStatusModalOpen(false)}
        busy={hookLoading}
        onConfirm={handleConfirmStatusChange}
      />

      <Drawer
        selectedBucket={selectedBucket}
        busy={hookLoading}
        onClose={() => setSelectedAppId(null)}
        noteDraft={noteDraft}
        setNoteDraft={setNoteDraft}
        noteDirty={canSaveDrawer}
        appStatusDraft={appStatusDraft}
        onOpenStatusModal={() => setStatusModalOpen(true)}
        onSaveApplication={handleUpdateApplication}
        onResetNote={() => {
          setNoteDraft(selectedBucket?.app.notes ?? "");
          if (selectedBucket) setAppStatusDraft(selectedBucket.app.status);
        }}
        onArchiveApplication={handleArchive}
        onDeleteApplication={handleDelete}
        onEditEmail={(emailId) => {
          setEmailEditId(emailId);
          setEmailEditOpen(true);
        }}
        statusTextClass={statusTextClass}
      />

      <EmailEditModal
        open={emailEditOpen}
        jobStatus={JOB_STATUS}
        selectedEmail={selectedEmailForModal}
        emailEdit={emailEditState}
        setEmailEdit={setEmailEditState}
        onClose={() => {
          setEmailEditOpen(false);
          setEmailEditId(null);
        }}
        busy={hookLoading}
        onSave={handleEmailSave}
        onReset={() => {
          if (!selectedEmailForModal) return;
          setEmailEditState({
            company: selectedEmailForModal.company ?? "",
            position: selectedEmailForModal.position ?? "",
            status: selectedEmailForModal.status,
            eventType: selectedEmailForModal.event_type ?? "",
          });
        }}
      />

      {profileMenuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setProfileMenuOpen(false)}
        />
      )}
    </div>
  );
}
