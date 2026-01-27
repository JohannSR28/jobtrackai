"use client";

import { useEffect, useState, useCallback } from "react";
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

import {
  JOB_STATUS,
  clampInt,
  statusDotClass,
  statusTextClass,
} from "@/components/dashbord/_components/ui";

import { HeaderBar } from "@/components/dashbord/_components/HeaderBar";
import { ApplicationsPanel } from "@/components/dashbord/_components/ApplicationsPanel";
import { Drawer } from "@/components/dashbord/_components/Drawer";
import { EmailEditModal } from "@/components/dashbord/_components/EmailEditModal";
import { StatusChangeModal } from "@/components/dashbord/_components/StatusChangeModal";

// --- TYPES LOCAUX (Pour éviter les 'any') ---

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

// --- BARRE DE PROGRESSION ---
function CompactProgressBar({ scan }: { scan: ScanDTO }) {
  const { status, processedCount, totalCount, errorMessage } = scan;
  const rawPercent =
    totalCount > 0 ? Math.round((processedCount / totalCount) * 100) : 0;

  const isActive = status === "running" || status === "created";
  // Fake 5% pour feedback visuel immédiat si démarrage
  const visualPercent = isActive && rawPercent < 5 ? 5 : rawPercent;

  const isError = status === "failed" || !!errorMessage;
  const isPaused = status === "paused";

  return (
    <div className="mx-auto max-w-7xl mb-6 flex items-center gap-4 px-1 animate-in fade-in slide-in-from-top-2 duration-500">
      <div
        className={`flex-1 flex items-center h-10 rounded-lg border overflow-hidden shadow-sm backdrop-blur-sm relative transition-colors duration-500 ${
          isPaused
            ? "bg-amber-900/20 border-amber-500/30"
            : "bg-slate-900/80 border-slate-800"
        }`}
      >
        <div
          className={`absolute inset-y-0 left-0 transition-all duration-700 ease-out ${
            isError
              ? "bg-red-500/20"
              : isPaused
                ? "bg-amber-500/20"
                : "bg-indigo-500/20 animate-pulse"
          }`}
          style={{ width: `${visualPercent}%` }}
        />
        <div
          className={`absolute bottom-0 left-0 h-1 transition-all duration-700 ${
            isError
              ? "bg-red-500"
              : isPaused
                ? "bg-amber-500"
                : "bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,1)]"
          }`}
          style={{ width: `${visualPercent}%` }}
        />
        <div className="relative z-10 flex w-full justify-between items-center px-4 text-xs font-medium">
          <div className="flex items-center gap-3">
            <span
              className={`uppercase tracking-wider font-bold ${
                isError
                  ? "text-red-400"
                  : isPaused
                    ? "text-amber-400"
                    : "text-indigo-400"
              }`}
            >
              {isError
                ? "Error"
                : status === "running"
                  ? "Scanning..."
                  : status}
            </span>
            <span className="text-slate-400 border-l border-white/10 pl-3 hidden sm:inline-block">
              {processedCount} / {totalCount} emails
            </span>
          </div>
          <div className="flex items-center gap-3">
            {errorMessage && (
              <span className="text-red-400 truncate max-w-[200px]">
                {errorMessage}
              </span>
            )}
            <span className="text-slate-200 font-mono">{rawPercent}%</span>
          </div>
        </div>
      </div>
    </div>
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
            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              props.mode === "since_last"
                ? "bg-indigo-500/10 border-indigo-500/50"
                : "bg-slate-900 border-slate-800 hover:border-slate-700"
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
                      props.lastScanDate
                    ).toLocaleDateString()} ${new Date(
                      props.lastScanDate
                    ).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`
                  : "Aucun scan précédent (défaut: -7 jours)"}
              </div>
            </div>
          </label>

          <label
            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              props.mode === "custom"
                ? "bg-indigo-500/10 border-indigo-500/50"
                : "bg-slate-900 border-slate-800 hover:border-slate-700"
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
              <div className="font-medium mb-2">Custom Range</div>
              {props.mode === "custom" && (
                <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wide">
                      From
                    </span>
                    <input
                      type="date"
                      value={props.startDate}
                      onChange={(e) => props.setStartDate(e.target.value)}
                      className="w-full rounded-lg bg-slate-950 px-3 py-2 text-sm ring-1 ring-white/10 focus:ring-indigo-500 outline-none cursor-pointer hover:bg-slate-900 transition-colors"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wide">
                      To
                    </span>
                    <input
                      type="date"
                      value={props.endDate}
                      onChange={(e) => props.setEndDate(e.target.value)}
                      className="w-full rounded-lg bg-slate-950 px-3 py-2 text-sm ring-1 ring-white/10 focus:ring-indigo-500 outline-none cursor-pointer hover:bg-slate-900 transition-colors"
                    />
                  </div>
                </div>
              )}
            </div>
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
          <button
            type="button"
            className="rounded-lg bg-white/5 px-4 py-2 text-xs font-semibold ring-1 ring-white/10 hover:bg-white/10 transition-colors"
            onClick={props.onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 disabled:opacity-50 transition-all"
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
  const { balance, loading: walletLoading, refreshBalance } = useWallet();

  // 1. DATA HOOK
  const {
    getApplications,
    updateApplication,
    updateEmail: apiUpdateEmail,
    archiveApplication,
    deleteApplication,
    loading: hookLoading,
    error: hookError,
  } = useJobApplications();

  // 2. AUTH HOOK
  const { signOut, deleteAccount, user } = useAuth();

  // 3. SCAN HOOK
  // Le hook charge l'état initial via useEffect interne (grâce à ta modif)
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

  // --- ETATS LOCAUX UI ---
  const [data, setData] = useState<ApplicationsData | null>(null);

  type ArchiveMode = "active" | "archived"; // Define the ArchiveMode type

  const [archiveMode, setArchiveMode] = useState<ArchiveMode>("active");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState<number>(1);
  const [isMobile, setIsMobile] = useState(false);

  // States pour les Modales
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [resumeModalOpen, setResumeModalOpen] = useState(false);
  const [alertModalOpen, setAlertModalOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false); // <--- Pour le compte

  // Config Scan
  const [scanMode, setScanMode] = useState<ScanMode>("since_last");
  const [scanStartDate, setScanStartDate] = useState(ONE_WEEK_AGO);
  const [scanEndDate, setScanEndDate] = useState(TODAY);
  const [isInitializingScan, setIsInitializingScan] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // --- LOGIQUE D'AFFICHAGE INTELLIGENT ---
  const [isScanUiVisible, setIsScanUiVisible] = useState(false);

  useEffect(() => {
    // 1. PRIORITÉ : Si la boucle tourne (isLooping), on force l'affichage immédiat
    // Cela règle le problème du "Reprendre" où le statut est encore "paused"
    if (isLooping) {
      setIsScanUiVisible(true);
      return;
    }

    // 2. Sinon, on regarde le statut du scan
    if (scan && (scan.status === "running" || scan.status === "created")) {
      setIsScanUiVisible(true);
    }
    // 3. Si on vient de finir ou pauser, on laisse un délai de 3s
    else if (
      scan &&
      (scan.status === "paused" ||
        scan.status === "completed" ||
        scan.status === "failed")
    ) {
      const timer = setTimeout(() => {
        setIsScanUiVisible(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
    // 4. Cas initial ou inactif
    else {
      setIsScanUiVisible(false);
    }
  }, [scan, scan?.status, isLooping]);

  // Autres états UI
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [emailEditOpen, setEmailEditOpen] = useState(false);
  const [emailEditId, setEmailEditId] = useState<string | null>(null);

  // Responsive & Fetch
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

  // Drawer helpers
  const [noteDraft, setNoteDraft] = useState("");
  const [appStatusDraft, setAppStatusDraft] = useState<JobStatus>("unknown");
  const [emailEditState, setEmailEditState] = useState<EmailEditState | null>(
    null
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

  // --- ACTIONS DU SCAN ---

  const handleScanButtonClick = () => {
    // 1. Grâce au hook qui a chargé l'état au montage, `scan` contient la vérité
    const isActive =
      scan &&
      (scan.status === "created" ||
        scan.status === "running" ||
        scan.status === "paused");

    if (isActive) {
      // Cas A : Scan en cours/pause -> Modale Reprise
      setResumeModalOpen(true);
    } else {
      // Cas B : Rien -> Modale Init (Dates)
      setScanModalOpen(true);
    }
  };

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
        setAlertMessage(
          `Plage de date invalide: ${result.reason || "Vérifiez vos dates"}`
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
      setAlertMessage("Erreur lors de l'initialisation du scan.");
      setAlertModalOpen(true);
    } finally {
      setIsInitializingScan(false);
    }
  };

  // --- SYNC DU SOLDE & DES DONNÉES ---
  useEffect(() => {
    if (!scan) return;

    // Détection des changements importants
    const isBatchFinished = scan.processedCount > 0;
    const isScanStopped = [
      "paused",
      "completed",
      "canceled",
      "failed",
    ].includes(scan.status);

    // CAS 1 : Un batch vient de finir (le compteur a bougé)
    // On rafraîchit le solde pour montrer le débit progressif
    if (scan.status === "running" && isBatchFinished) {
      refreshBalance();
      // Optionnel : fetchData() ici peut être lourd si beaucoup de données.
      // À décommenter si tu veux voir les jobs apparaître en temps réel.
      // fetchData();
    }

    // CAS 2 : Le scan s'arrête (Pause, Stop, Fini, Erreur)
    // On fait une mise à jour finale pour être sûr d'avoir le compte exact
    if (isScanStopped) {
      refreshBalance();
      fetchData(); // Là on recharge la liste des jobs pour être sûr d'avoir tout
    }
  }, [
    scan, // Include the entire scan object as a dependency
    scan?.status, // Réagit aux changements d'état (Running -> Paused)
    scan?.processedCount, // Réagit à l'avancement (10 -> 20 -> 30 emails...)
    refreshBalance,
    fetchData,
  ]);

  // --- AUTH ACTIONS ---
  const LANDING_PAGE_URL = "https://jobtrackai-landing-page.vercel.app/";

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (e) {
      console.error(e);
    } finally {
      window.location.href = LANDING_PAGE_URL;
    }
  };

  // Ouverture de la modale de suppression
  const handleOpenDeleteModal = () => {
    setDeleteModalOpen(true);
  };

  // Confirmation réelle
  const confirmDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      await deleteAccount();
      window.location.href = LANDING_PAGE_URL;
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la suppression.");
      setIsDeletingAccount(false);
      setDeleteModalOpen(false);
    }
  };

  // --- CRUD ACTIONS ---
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
      !selectedBucket.app.archived
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
          // Scan UI controls
          scanRunning={isScanUiVisible && isLooping}
          scanPaused={isScanUiVisible && scan?.status === "paused"}
          onOpenScanModal={handleScanButtonClick}
          onPauseOrResume={() => {
            if (isLooping) pause();
            else if (scan) runLoop(scan.id);
          }}
          onStopScan={() => cancel()}
          // Auth controls
          onLogout={handleLogout}
          onDeleteAccount={handleOpenDeleteModal}
        />

        {isScanUiVisible && scan && <CompactProgressBar scan={scan} />}

        {hookError && (
          <div className="mb-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-red-100 text-xs">
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

      {/* --- LES MODALES --- */}

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
          if (scan) runLoop(scan.id);
          setResumeModalOpen(false);
        }}
        onStop={() => {
          if (scan) cancel(scan.id);
          setResumeModalOpen(false);
        }}
      />

      <AlertModal
        open={alertModalOpen}
        title="Problème de configuration"
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
