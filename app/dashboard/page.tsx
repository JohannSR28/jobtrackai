"use client";

import { useEffect, useState, useCallback } from "react";

import {
  useJobApplications,
  type Bucket,
  type JobStatus,
  type StatusFilter,
} from "@/hooks/useJobApplications";

import {
  JOB_STATUS,
  clampInt,
  statusDotClass,
  statusTextClass,
} from "@/components/dashbord/_components/ui";

import { HeaderBar } from "@/components/dashbord/_components/HeaderBar";
import { ScanStartModal } from "@/components/dashbord/_components/ScanStartModal";
import { ApplicationsPanel } from "@/components/dashbord/_components/ApplicationsPanel";
import { Drawer } from "@/components/dashbord/_components/Drawer";
import { EmailEditModal } from "@/components/dashbord/_components/EmailEditModal";
import { StatusChangeModal } from "@/components/dashbord/_components/StatusChangeModal";

type ArchiveMode = "active" | "archived";
type ScanMode = "since_last" | "custom";

export default function JobDomainTestPage() {
  const points = 3000;

  // --- 1. HOOK : C'est lui qui va chercher les vraies données ---
  const {
    getApplications,
    updateApplication,
    updateEmail: apiUpdateEmail,
    archiveApplication,
    deleteApplication,
    loading: hookLoading,
    error: hookError,
  } = useJobApplications();

  // --- 2. STATE : On stocke les données de l'API ici ---
  const [data, setData] = useState<{
    applications: Bucket[];
    total: number;
    maxPage: number;
    statusCounts: Record<StatusFilter, number>;
  } | null>(null);

  // --- 3. STATE FILTRES ---
  const [archiveMode, setArchiveMode] = useState<ArchiveMode>("active");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState<number>(1);

  // Responsive page size
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);
  const pageSize = isMobile ? 10 : 20;

  // --- 4. DATA FETCHING (Le coeur du changement) ---
  const fetchData = useCallback(async () => {
    // On appelle l'API via le Hook
    const result = await getApplications({
      archived: archiveMode === "archived",
      status: statusFilter,
      page: page,
      pageSize: pageSize,
    });
    setData(result);
  }, [getApplications, archiveMode, statusFilter, page, pageSize]);

  // Charger les données au montage et quand les filtres changent
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset page quand on change de filtre
  useEffect(() => {
    setPage(1);
    setSelectedAppId(null);
  }, [statusFilter, archiveMode, pageSize]);

  // --- UI STATES (Modales, Drawer, etc.) ---
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [scanMode, setScanMode] = useState<ScanMode>("since_last");
  const [scanStartDate, setScanStartDate] = useState<string>("");
  const [scanOpen, setScanOpen] = useState(false);
  const [scanRunning, setScanRunning] = useState(false);
  const [scanPaused, setScanPaused] = useState(false);

  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [emailEditOpen, setEmailEditOpen] = useState(false);
  const [emailEditId, setEmailEditId] = useState<string | null>(null);

  // --- HELPERS SELECTION ---
  // On cherche l'app sélectionnée dans 'data' (API) et non plus dans 'apps' (fake)
  const selectedBucket: Bucket | null =
    data?.applications.find((b) => b.app.id === selectedAppId) ?? null;

  // Drawer logic
  const [noteDraft, setNoteDraft] = useState("");
  const [appStatusDraft, setAppStatusDraft] = useState<JobStatus>("unknown");

  useEffect(() => {
    if (!selectedBucket) return setNoteDraft("");
    setNoteDraft(selectedBucket.app.notes ?? "");
    setAppStatusDraft(selectedBucket.app.status);
  }, [selectedBucket]);

  const noteDirty = (noteDraft ?? "") !== (selectedBucket?.app.notes ?? "");
  const appStatusDirty = appStatusDraft !== selectedBucket?.app.status;
  const canSaveDrawer = noteDirty || appStatusDirty;

  // Email Modal logic
  const selectedEmailForModal =
    selectedBucket?.emails.find((e) => e.id === emailEditId) ?? null;
  const [emailEditState, setEmailEditState] = useState<{
    company: string;
    position: string;
    status: JobStatus;
    eventType: string;
  } | null>(null);

  useEffect(() => {
    if (!selectedEmailForModal) return setEmailEditState(null);
    setEmailEditState({
      company: selectedEmailForModal.company ?? "",
      position: selectedEmailForModal.position ?? "",
      status: selectedEmailForModal.status,
      eventType: selectedEmailForModal.event_type ?? "",
    });
  }, [selectedEmailForModal]);

  // --- ACTIONS HANDLERS ---

  const handleUpdateApplication = async () => {
    if (!selectedBucket) return;
    // On sauvegarde note et status
    await updateApplication(selectedBucket.app.id, {
      status: appStatusDraft,
      notes: noteDraft,
    });
    setStatusModalOpen(false);
    await fetchData(); // 👈 IMPORTANT: On recharge les données fraîches depuis l'API
  };

  const handleConfirmStatusChange = async (newStatus: JobStatus) => {
    if (!selectedBucket) return;
    await updateApplication(selectedBucket.app.id, { status: newStatus });
    setStatusModalOpen(false);
    await fetchData();
  };

  const handleArchive = async () => {
    if (!selectedBucket) return;
    const ok = window.confirm("Are you sure?");
    if (!ok) return;
    await archiveApplication(
      selectedBucket.app.id,
      !selectedBucket.app.archived
    );
    setSelectedAppId(null);
    await fetchData();
  };

  const handleDelete = async () => {
    if (!selectedBucket) return;
    const ok = window.confirm("Delete permanently?");
    if (!ok) return;
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

  // --- FAKE SCAN LOGIC (inchangée pour l'UI uniquement) ---
  function openScanModal() {
    setScanModalOpen(true);
  }
  function startFakeScan() {
    setScanModalOpen(false);
    setScanOpen(true);
    setScanRunning(true);
  }
  function pauseOrResumeScan() {
    setScanPaused((p) => !p);
  }
  function stopScan() {
    setScanRunning(false);
    setScanOpen(false);
  }

  // --- RENDU ---

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
          points={points}
          email="user@jobtrack.ai"
          busy={hookLoading}
          poll={fetchData}
          profileMenuOpen={profileMenuOpen}
          setProfileMenuOpen={setProfileMenuOpen}
          scanRunning={scanRunning}
          scanPaused={scanPaused}
          onOpenScanModal={openScanModal}
          onPauseOrResume={pauseOrResumeScan}
          onStopScan={stopScan}
        />

        {scanOpen && (
          <div className="mb-4 text-center text-slate-400">
            Scan Simulation...
          </div>
        )}

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
          // Données API
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
          //  Données API
          pagedBuckets={data?.applications ?? []}
          onSelectApp={(id) => setSelectedAppId(id)}
          statusTextClass={statusTextClass}
        />
      </div>

      {/* --- MODALS --- */}

      <ScanStartModal
        open={scanModalOpen}
        mode={scanMode}
        startDate={scanStartDate}
        setMode={setScanMode}
        setStartDate={setScanStartDate}
        onClose={() => setScanModalOpen(false)}
        onStart={startFakeScan}
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
