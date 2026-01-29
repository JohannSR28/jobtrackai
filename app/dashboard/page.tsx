"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";

// --- IMPORTS UI ---
import {
  AlertModal,
  ResumeScanModal,
  DeleteAccountModal,
  ModalShell,
} from "@/components/dashbord/_components/ui";

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

// Import des icônes pour la nouvelle Toolbar
import {
  IconRefresh,
  IconPause,
  IconStop,
} from "@/components/dashbord/_components/icons";

// --- IMPORTS HOOKS ---
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

type ScanMode = "since_last" | "custom";

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

// --- BARRE DE PROGRESSION (STYLE GENLABS) ---
function CompactProgressBar({
  scan,
  forceActive,
  forcePaused,
  forceStopped,
}: {
  scan: ScanDTO;
  forceActive: boolean;
  forcePaused: boolean;
  forceStopped: boolean;
}) {
  const { status, processedCount, totalCount, errorMessage } = scan;
  const rawPercent =
    totalCount > 0 ? Math.round((processedCount / totalCount) * 100) : 0;

  // 1. Détermination de l'état visuel (Priorité aux états forcés)
  let visualStatus = status;
  if (forceActive) visualStatus = "running";
  if (forcePaused) visualStatus = "paused";
  if (forceStopped) visualStatus = "canceled";

  // 2. Calcul des indicateurs
  const isActive = visualStatus === "running" || visualStatus === "created";
  const isCompleted = visualStatus === "completed"; // 🟢 Scénario 1
  const isPaused = visualStatus === "paused"; // 🟡 Scénario 2
  const isStopped = visualStatus === "canceled"; // 🔴 Scénario 3

  const isError =
    visualStatus === "failed" || (!!errorMessage && !forceActive && !isStopped);

  // Pourcentage visuel (min 5% si actif pour voir la barre)
  const visualPercent =
    (isActive || isPaused) && rawPercent < 5 ? 5 : rawPercent;

  return (
    <div className="mx-auto mb-6 flex max-w-7xl animate-in slide-in-from-top-2 items-center gap-4 px-1 duration-500 relative z-20">
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
        className={`relative flex h-14 flex-1 items-center overflow-hidden rounded-2xl border transition-all duration-300 ${
          isCompleted
            ? "border-emerald-200 bg-emerald-50/50" // 🟢 Vert
            : isStopped || isError
              ? "border-red-200 bg-red-50/50" // 🔴 Rouge
              : isPaused
                ? "border-amber-200 bg-amber-50/50" // 🟡 Jaune
                : "border-gray-200 bg-white shadow-sm" // 🟠 Orange/Brand (Défaut)
        }`}
      >
        {/* FOND DE LA BARRE */}
        <div
          className={`absolute inset-y-0 left-0 overflow-hidden transition-all duration-500 ease-out ${
            isCompleted
              ? "bg-emerald-100"
              : isStopped || isError
                ? "bg-red-100"
                : isPaused
                  ? "bg-amber-100"
                  : "bg-[#ff9f43]/10" // Brand Orange Background
          }`}
          style={{ width: `${visualPercent}%` }}
        >
          {isActive && !isCompleted && (
            <div className="absolute inset-0 w-full animate-shimmer bg-gradient-to-r from-transparent via-[#ff9f43]/20 to-transparent" />
          )}
        </div>

        {/* LIGNE DE PROGRESSION (BAS) */}
        <div
          className={`absolute bottom-0 left-0 h-1 transition-all duration-500 ${
            isCompleted
              ? "bg-emerald-500"
              : isStopped || isError
                ? "bg-red-500"
                : isPaused
                  ? "bg-amber-500"
                  : "bg-[#ff9f43]" // Brand Orange
          }`}
          style={{ width: `${visualPercent}%` }}
        />

        {/* CONTENU TEXTE */}
        <div className="relative z-10 flex w-full items-center justify-between px-6 text-xs font-bold">
          <div className="flex items-center gap-4">
            <span
              className={`gen-typo text-sm md:text-base uppercase tracking-[-1px] transition-colors duration-300 ${
                isCompleted
                  ? "text-emerald-700"
                  : isStopped || isError
                    ? "text-red-600"
                    : isPaused
                      ? "text-amber-700"
                      : "text-black"
              }`}
            >
              {forceActive
                ? "RESUMING..."
                : forcePaused
                  ? "PAUSING..."
                  : forceStopped
                    ? "STOPPING..."
                    : isCompleted
                      ? "COMPLETED"
                      : isStopped
                        ? "STOPPED"
                        : isError
                          ? "ERROR"
                          : "SCANNING..."}
            </span>
            <span className="hidden border-l border-gray-300 pl-4 text-gray-500 font-medium sm:inline-block">
              {processedCount} / {totalCount} emails
            </span>
          </div>
          <div className="flex items-center gap-4">
            {errorMessage && !forceActive && !isStopped && !isCompleted && (
              <span className="max-w-[200px] truncate text-red-600 font-medium">
                {errorMessage}
              </span>
            )}
            <span className="gen-typo text-xl text-black">{rawPercent}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- MODALES (Restent importées de ui.tsx) ---
// Les modales MailConnectModal, ScanStartModal sont définies dans le fichier global,
// mais tu les as demandées dans la page. Je les réintègre ici pour être sûr qu'elles soient présentes
// ou je les appelle depuis les imports si tu as mis à jour ui.tsx.
// Pour assurer la cohérence avec ta demande "retourne moi le dashboard au complet",
// Je vais supposer que MailConnectModal et ScanStartModal sont importées ou définies localement comme avant.
// Je les laisse ici par sécurité si elles ne sont pas dans ui.tsx exporté.

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
      title="AUTORISATION REQUISE"
      subtitle="Accès à la boîte mail nécessaire"
    >
      <div className="space-y-6 text-sm text-gray-600">
        <p>
          Pour analyser vos candidatures, JobTrack a besoin de
          l&apos;autorisation de lire vos emails via{" "}
          <strong>{props.providerName}</strong>.
        </p>
        <div className="flex justify-end gap-3 border-t border-gray-100 pt-6">
          <button
            onClick={props.onClose}
            className="rounded-xl px-4 py-3 font-semibold text-gray-500 hover:text-black hover:bg-gray-100 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={props.onConnect}
            className="rounded-xl bg-[#ff9f43] px-6 py-3 font-bold text-black hover:bg-[#e68e3c] transition-all hover:shadow-lg shadow-orange-500/20"
          >
            Autoriser l&apos;accès
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

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
      title="START MAIL SCAN"
      subtitle="Sync your applications"
      onClose={props.onClose}
    >
      <div className="space-y-6 text-sm text-gray-600">
        <div className="space-y-3">
          <label
            className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-all duration-200 ${
              props.mode === "since_last"
                ? "border-[#ff9f43] bg-[#ff9f43]/5 shadow-[0_0_0_1px_#ff9f43]"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <input
              type="radio"
              name="scanMode"
              className="accent-[#ff9f43] w-4 h-4"
              checked={props.mode === "since_last"}
              onChange={() => props.setMode("since_last")}
            />
            <div>
              <div className="font-bold text-black text-base mb-1">
                Smart Sync
              </div>
              <div className="text-xs text-gray-500 font-medium">
                {props.lastScanDate
                  ? `Reprendre depuis le : ${new Date(props.lastScanDate).toLocaleDateString()}`
                  : "Aucun scan précédent (défaut: -7 jours)"}
              </div>
            </div>
          </label>

          <label
            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all duration-200 ${
              props.mode === "custom"
                ? "border-[#ff9f43] bg-[#ff9f43]/5 shadow-[0_0_0_1px_#ff9f43]"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <input
              type="radio"
              name="scanMode"
              className="accent-[#ff9f43] w-4 h-4 mt-1"
              checked={props.mode === "custom"}
              onChange={() => props.setMode("custom")}
            />
            <div className="flex-1">
              <div className="mb-3 font-bold text-black text-base">
                Custom Range
              </div>
              {props.mode === "custom" && (
                <div className="grid animate-in slide-in-from-top-1 grid-cols-2 gap-4 duration-200">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                      From
                    </span>
                    <input
                      type="date"
                      value={props.startDate}
                      onChange={(e) => props.setStartDate(e.target.value)}
                      className="w-full cursor-pointer rounded-lg bg-gray-50 border border-gray-200 px-3 py-2.5 text-sm text-black outline-none focus:border-[#ff9f43] focus:ring-1 focus:ring-[#ff9f43] transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                      To
                    </span>
                    <input
                      type="date"
                      value={props.endDate}
                      onChange={(e) => props.setEndDate(e.target.value)}
                      className="w-full cursor-pointer rounded-lg bg-gray-50 border border-gray-200 px-3 py-2.5 text-sm text-black outline-none focus:border-[#ff9f43] focus:ring-1 focus:ring-[#ff9f43] transition-all"
                    />
                  </div>
                </div>
              )}
            </div>
          </label>
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
          <button
            type="button"
            className="rounded-xl px-5 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
            onClick={props.onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-xl bg-black px-6 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5"
            disabled={
              props.busy ||
              (props.mode === "custom" && (!props.startDate || !props.endDate))
            }
            onClick={props.onStart}
          >
            {props.busy ? "Initializing..." : "Start Scan →"}
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

  // --- ETATS LOCAUX ---
  const [data, setData] = useState<ApplicationsData | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // 🟢 GESTION DES ÉTATS TRANSITOIRES
  const [isScanUiVisible, setIsScanUiVisible] = useState(false);
  const [isResuming, setIsResuming] = useState(false); // Jaune -> Bleu
  const [isPausing, setIsPausing] = useState(false); // Jaune (3s + Sync)
  const [isStopping, setIsStopping] = useState(false); // Rouge (3s + Sync)

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
    if (!loading && !user) router.replace("/login-page");
  }, [user, loading, router]);
  useEffect(() => {
    pollMailStatus();
  }, [pollMailStatus]);

  // 🟢 1. LOGIQUE DE VISIBILITÉ DE LA BARRE
  useEffect(() => {
    if (isResuming || isPausing || isStopping) {
      setIsScanUiVisible(true);
      return;
    }

    if (
      isLooping ||
      (scan && (scan.status === "running" || scan.status === "created"))
    ) {
      setIsScanUiVisible(true);
      return;
    }

    if (scan && scan.status === "completed") {
      const timer = setTimeout(() => setIsScanUiVisible(false), 5000);
      return () => clearTimeout(timer);
    }

    setIsScanUiVisible(false);
  }, [scan, scan?.status, isLooping, isResuming, isPausing, isStopping]);

  // 🟢 2. TRANSITION AUTOMATIQUE RESUME -> RUNNING
  useEffect(() => {
    if (isResuming && scan?.status === "running") {
      setIsResuming(false);
    }
  }, [scan?.status, isResuming]);

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

  const handlePause = async () => {
    if (!scan) return;
    setIsPausing(true);

    const apiCall = pause();
    const timer = new Promise((resolve) => setTimeout(resolve, 3000));

    await Promise.all([apiCall, timer]);
    setIsPausing(false);
  };

  const handleStop = async () => {
    if (!scan) return;
    setIsStopping(true);

    const apiCall = cancel(scan.id);
    const timer = new Promise((resolve) => setTimeout(resolve, 3000));

    await Promise.all([apiCall, timer]);
    setIsStopping(false);
    setResumeModalOpen(false);
  };

  const handleResume = () => {
    if (!scan) return;
    setIsResuming(true);
    runLoop(scan.id);
    setResumeModalOpen(false);
  };

  const handleScanButtonClick = () => {
    if (!isMailConnected) {
      setMailConnectModalOpen(true);
      return;
    }
    if (isPausing || isStopping || isResuming) return;

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
    if (expectedMailProvider) connectMail(expectedMailProvider);
    else {
      setAlertMessage("Impossible de déterminer le fournisseur.");
      setAlertModalOpen(true);
      setMailConnectModalOpen(false);
    }
  };

  const handleRemoveMailConnection = async () => {
    if (!window.confirm("Retirer l'accès ?")) return;
    try {
      const res = await removeConnection();
      if (res.ok) {
        await pollMailStatus();
        alert("Succès.");
      } else {
        setAlertMessage(`Erreur: ${res.message}`);
        setAlertModalOpen(true);
      }
    } catch (e) {
      console.error(e);
      setAlertMessage("Erreur.");
      setAlertModalOpen(true);
    }
  };

  const handleStartScanFromModal = async () => {
    setIsInitializingScan(true);
    try {
      let result;
      if (scanMode === "since_last")
        result = await init({ mode: "since_last" });
      else {
        if (!scanStartDate || !scanEndDate) return;
        result = await init({
          mode: "custom",
          startIso: toUtcIso(scanStartDate),
          endIso: toUtcIsoEndOfDay(scanEndDate),
        });
      }

      if (result.mode === "invalid") {
        const reason = result.validation.reason;
        let message = "Erreur.";
        if (reason === "TOO_MANY_MESSAGES")
          message = "⚠️ +2000 emails. Réduisez la durée.";
        else if (reason === "RANGE_TOO_LARGE")
          message = "⚠️ Période trop longue.";
        else if (reason === "INVALID_RANGE")
          message = "⚠️ Dates invalides (+90j).";
        else message = `Erreur: ${reason}`;
        setAlertMessage(message);
        setAlertModalOpen(true);
        return;
      }

      if (result.mode === "insufficient_funds") {
        setAlertMessage(
          `Crédits insuffisants.\nRequis: ${result.required}\nSolde: ${result.current}`,
        );
        setAlertModalOpen(true);
        return;
      }

      setScanModalOpen(false);
      if (result.mode === "new" || result.mode === "existing")
        runLoop(result.scan.id);
    } catch (e) {
      console.error(e);
      setAlertMessage("Erreur init.");
      setAlertModalOpen(true);
    } finally {
      setIsInitializingScan(false);
    }
  };

  // Sync Balance
  useEffect(() => {
    if (!scan) return;
    const isBatchFinished = scan.processedCount > 0;
    const isScanStopped = [
      "paused",
      "completed",
      "canceled",
      "failed",
    ].includes(scan.status);
    if (scan.status === "running" && isBatchFinished) refreshBalance();
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
  const handleOpenDeleteModal = () => setDeleteModalOpen(true);
  const confirmDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      await deleteAccount();
      router.push("/login-page");
    } catch (e) {
      console.error(e);
      alert("Erreur.");
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

  if (loading)
    return (
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center font-sans text-gray-500">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#ff9f43] border-t-transparent animate-spin"></div>
          <span className="gen-typo text-sm tracking-wide text-black">
            LOADING...
          </span>
        </div>
      </div>
    );

  // -- Raccourcis pour l'UI --
  const isScanning = (isLooping || isResuming) && !isPausing && !isStopping;
  const isScanPaused =
    !isResuming && !isPausing && !isStopping && scan?.status === "paused";

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#0a0a0a] font-sans relative overflow-x-hidden">
      {/* BACKGROUND BLOB DECORATION (Identité Visuelle) */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[#ff9f43] opacity-[0.04] blur-[120px] rounded-full pointer-events-none z-0"></div>

      {/* HEADER FIXE */}
      <HeaderBar
        points={balance}
        walletLoading={walletLoading}
        email={user?.email || "user@jobtrack.ai"}
        profileMenuOpen={profileMenuOpen}
        setProfileMenuOpen={setProfileMenuOpen}
        onLogout={handleLogout}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {/* CONTENU PRINCIPAL (Ajout du padding-top pt-24 pour compenser le header fixe) */}
      <div className="relative z-10 mx-auto max-w-[1440px] px-4 sm:px-6 pt-24 pb-12">
        {/* --- ACTION TOOLBAR (NOUVEAU) --- */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          {/* Titre de la section */}
          <div>
            <h1 className="gen-typo text-2xl sm:text-3xl tracking-tight text-black">
              DASHBOARD
            </h1>
            <p className="text-sm text-gray-500 font-medium mt-1">
              Gérez vos candidatures et synchronisez vos emails.
            </p>
          </div>

          {/* Boutons d'action (New Scan, Pause, Refresh) */}
          <div className="flex items-center gap-3 w-full sm:w-auto bg-white/50 backdrop-blur-sm p-1.5 rounded-2xl border border-gray-200/50 shadow-sm animate-in slide-in-from-right-2">
            {/* Bouton NEW SCAN */}
            <button
              onClick={handleScanButtonClick}
              disabled={isScanning}
              className="flex-1 sm:flex-none rounded-xl bg-brand-orange px-5 py-2.5 text-xs font-bold text-black hover:bg-brand-orange-hover hover:shadow-[0_0_20px_rgba(255,159,67,0.4)] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
            >
              {isScanning ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  Scanning...
                </>
              ) : (
                "+ New Scan"
              )}
            </button>

            {/* Boutons contextuels (Pause/Stop) */}
            {(isScanning || isScanPaused) && (
              <>
                <button
                  onClick={isLooping ? handlePause : handleResume}
                  className="rounded-xl bg-amber-50 p-2.5 border border-amber-200 hover:bg-amber-100 transition-colors active:scale-95"
                  title={isScanPaused ? "Reprendre" : "Pause"}
                >
                  <IconPause className="h-4 w-4 text-amber-700" />
                </button>
                <button
                  onClick={handleStop}
                  className="rounded-xl bg-red-50 p-2.5 border border-red-200 hover:bg-red-100 transition-colors active:scale-95"
                  title="Arrêter"
                >
                  <IconStop className="h-4 w-4 text-red-700" />
                </button>
              </>
            )}

            {/* Separator */}
            <div className="w-px h-6 bg-gray-300 mx-1"></div>

            {/* Bouton REFRESH */}
            <button
              onClick={fetchData}
              disabled={hookLoading}
              className="rounded-xl bg-white p-2.5 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50 transition-colors active:scale-95"
              title="Rafraîchir les données"
            >
              <IconRefresh
                className={
                  hookLoading
                    ? "h-4 w-4 animate-spin text-brand-orange"
                    : "h-4 w-4 text-gray-600"
                }
              />
            </button>
          </div>
        </div>

        {/* --- PROGRESS BAR --- */}
        {isScanUiVisible && scan && (
          <CompactProgressBar
            scan={scan}
            forceActive={isResuming}
            forcePaused={isPausing}
            forceStopped={isStopping}
          />
        )}

        {/* --- ERREURS --- */}
        {hookError && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-4 text-red-600 font-medium animate-in slide-in-from-top-2">
            {hookError}
          </div>
        )}

        {/* --- APPLICATIONS PANEL --- */}
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
          onSelectApp={setSelectedAppId}
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
        onResume={handleResume}
        onStop={handleStop}
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
    </div>
  );
}
