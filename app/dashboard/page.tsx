"use client";

import { useState, useEffect } from "react";

// --- CONTROLLER & ACTIONS ---
import { useDashboardController } from "@/hooks/useDashboardController";
import { useMailActions } from "@/hooks/useMailActions";

// --- COMPONENTS ---
import { HeaderBar } from "@/components/dashbord/_components/HeaderBar";
import { ActionToolbar } from "@/components/dashbord/_components/ActionToolbar";
import { DashboardProgressBar } from "@/components/dashbord/_components/DashboardProgressBar";
import { ApplicationsPanel } from "@/components/dashbord/_components/ApplicationsPanel";
import { SettingsDrawer } from "@/components/dashbord/_components/SettingsDrawer";
import { Drawer } from "@/components/dashbord/_components/Drawer";

// --- MODALS ---
import {
  AlertModal,
  DeleteAccountModal,
  ResumeScanModal,
} from "@/components/dashbord/_components/ui";
import { MailConnectModal } from "@/components/dashbord/_components/MailConnectModal";
import { ScanStartModal } from "@/components/dashbord/_components/ScanStartModal";
import { EmailEditModal } from "@/components/dashbord/_components/EmailEditModal";
import { StatusChangeModal } from "@/components/dashbord/_components/StatusChangeModal";

// --- UTILS & TYPES ---
import {
  JOB_STATUS,
  statusTextClass,
} from "@/components/dashbord/_components/ui";
import { JobStatus } from "@/hooks/useJobApplications";
import { useLanguage } from "@/hooks/useLanguage";

type EmailEditState = {
  company: string;
  position: string;
  status: JobStatus;
  eventType: string;
};

export default function JobDomainPage() {
  // 1. Hook Principal (Cerveau - gère la machine à états du scan)
  const ctrl = useDashboardController();

  // 2. Hooks Auxiliaires
  const { removeConnection } = useMailActions();
  const { language, setLanguage } = useLanguage();

  // 3. États UI Locaux (Sélection & Formulaires)
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  // Drawer States (Notes & Statut)
  const [noteDraft, setNoteDraft] = useState("");
  const [appStatusDraft, setAppStatusDraft] = useState<JobStatus>("unknown");

  // Email Edit States
  const [emailEditId, setEmailEditId] = useState<string | null>(null);
  const [emailEditState, setEmailEditState] = useState<EmailEditState | null>(
    null,
  );

  // --- HELPERS DE SÉLECTION ---
  const selectedBucket =
    ctrl.data?.applications.find((b) => b.app.id === selectedAppId) ?? null;
  const selectedEmail =
    selectedBucket?.emails.find((e) => e.id === emailEditId) ?? null;

  // --- EFFETS DE SYNCHRONISATION (Formulaires) ---
  useEffect(() => {
    if (!selectedBucket) {
      setNoteDraft("");
      return;
    }
    setNoteDraft(selectedBucket.app.notes ?? "");
    setAppStatusDraft(selectedBucket.app.status);
  }, [selectedBucket]);

  useEffect(() => {
    if (!selectedEmail) {
      setEmailEditState(null);
      return;
    }
    setEmailEditState({
      company: selectedEmail.company ?? "",
      position: selectedEmail.position ?? "",
      status: selectedEmail.status,
      eventType: selectedEmail.event_type ?? "",
    });
  }, [selectedEmail]);

  // --- HANDLERS (Actions Utilisateur) ---

  const handleUpdateApplication = async () => {
    if (!selectedBucket) return;
    await ctrl.updateApplication(selectedBucket.app.id, {
      status: appStatusDraft,
      notes: noteDraft,
    });
    ctrl.fetchData();
  };

  const handleEmailSave = async () => {
    if (!selectedEmail || !emailEditState) return;
    await ctrl.apiUpdateEmail(selectedEmail.id, {
      company: emailEditState.company,
      position: emailEditState.position,
      status: emailEditState.status,
      event_type: emailEditState.eventType,
    });
    ctrl.toggleModal("emailEdit", false);
    setEmailEditId(null);
    ctrl.fetchData();
  };

  const handleArchive = async () => {
    if (!selectedBucket) return;
    if (!window.confirm("Êtes-vous sûr de vouloir archiver/désarchiver ?"))
      return;
    await ctrl.archiveApplication(
      selectedBucket.app.id,
      !selectedBucket.app.archived,
    );
    setSelectedAppId(null);
    ctrl.fetchData();
  };

  const handleDelete = async () => {
    if (!selectedBucket) return;
    if (!window.confirm("Supprimer définitivement cette candidature ?")) return;
    await ctrl.deleteApplication(selectedBucket.app.id);
    setSelectedAppId(null);
    ctrl.fetchData();
  };

  // --- RENDU ---

  if (ctrl.authLoading) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#ff9f43] border-t-transparent animate-spin"></div>
      </div>
    );
  }

  const isDrawerDirty =
    (noteDraft ?? "") !== (selectedBucket?.app.notes ?? "") ||
    appStatusDraft !== selectedBucket?.app.status;

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#0a0a0a] font-sans relative overflow-x-hidden">
      {/* Background Decor */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[#ff9f43] opacity-[0.04] blur-[120px] rounded-full pointer-events-none z-0"></div>

      <HeaderBar
        points={ctrl.balance}
        walletLoading={ctrl.walletLoading}
        email={ctrl.user?.email || "user@jobtrack.ai"}
        profileMenuOpen={profileMenuOpen}
        setProfileMenuOpen={setProfileMenuOpen}
        onLogout={ctrl.signOut}
        onOpenSettings={() => ctrl.toggleModal("settings", true)}
      />

      <div className="relative z-10 mx-auto max-w-[1440px] px-4 sm:px-6 pt-24 pb-12">
        {/* --- ACTION TOOLBAR --- */}
        {/* Intègre la logique "isSystemBusy" pour griser le bouton et afficher le spinner */}
        <ActionToolbar
          onScanClick={ctrl.handleScanClick}
          onPause={ctrl.handlePauseScan}
          onStop={ctrl.handleStopScan}
          onRefresh={ctrl.fetchData}
          onResume={() => {}} // Géré par onScanClick, prop requise par TS
          // Nouveaux Props Machine à États
          isSystemBusy={ctrl.isSystemBusy}
          visualState={ctrl.visualState}
          isScanPaused={ctrl.isScanPaused}
          loading={ctrl.dataLoading}
        />

        {/* --- PROGRESS BAR --- */}
        {/* Visible uniquement si un état visuel est actif (pas idle) */}
        {ctrl.visualState !== "idle" && ctrl.scanTester.scan && (
          <DashboardProgressBar
            scan={ctrl.scanTester.scan}
            visualState={ctrl.visualState}
          />
        )}

        {/* --- MESSAGES D'ERREUR GLOBAUX --- */}
        {ctrl.dataError && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-4 text-red-600 font-medium animate-in slide-in-from-top-2">
            {ctrl.dataError}
          </div>
        )}

        {/* --- TABLEAU DES CANDIDATURES --- */}
        <ApplicationsPanel
          archiveMode={ctrl.filters.archiveMode}
          setArchiveMode={ctrl.filters.setArchiveMode}
          statusFilter={ctrl.filters.statusFilter}
          setStatusFilter={ctrl.filters.setStatusFilter}
          statusOptions={[
            { key: "all", label: "All" },
            { key: "applied", label: "Applied", dot: "bg-blue-500" },
            { key: "interview", label: "Interview", dot: "bg-purple-500" },
            { key: "offer", label: "Offer", dot: "bg-emerald-500" },
            { key: "rejection", label: "Rejection", dot: "bg-red-500" },
            { key: "unknown", label: "Unknown", dot: "bg-gray-300" },
          ]}
          statusCounts={
            ctrl.data?.statusCounts ?? {
              all: 0,
              applied: 0,
              interview: 0,
              offer: 0,
              rejection: 0,
              unknown: 0,
            }
          }
          filteredTotal={ctrl.data?.total ?? 0}
          page={ctrl.filters.page}
          maxPage={ctrl.data?.maxPage ?? 1}
          onPrev={() => ctrl.filters.setPage((p) => Math.max(1, p - 1))}
          onNext={() =>
            ctrl.filters.setPage((p) =>
              Math.min(ctrl.data?.maxPage ?? 1, p + 1),
            )
          }
          pagedBuckets={ctrl.data?.applications ?? []}
          onSelectApp={setSelectedAppId}
          statusTextClass={statusTextClass}
        />
      </div>

      {/* --- MODALES --- */}

      <SettingsDrawer
        open={ctrl.modals.settings}
        onClose={() => ctrl.toggleModal("settings", false)}
        onRemoveMailConnection={removeConnection}
        onDeleteAccount={() => ctrl.toggleModal("delete", true)}
        isMailConnected={!!ctrl.mailStatus?.connected}
        language={language}
        setLanguage={setLanguage}
      />

      <MailConnectModal
        open={ctrl.modals.mailConnect}
        onClose={() => ctrl.toggleModal("mailConnect", false)}
        onConnect={() =>
          ctrl.connectMail(
            ctrl.user?.app_metadata?.provider === "azure" ? "outlook" : "gmail",
          )
        }
        providerName={
          ctrl.user?.app_metadata?.provider === "azure" ? "Outlook" : "Gmail"
        }
      />

      <ScanStartModal
        open={ctrl.modals.scan}
        onClose={() => ctrl.toggleModal("scan", false)}
        onStart={ctrl.handleStartScan}
        lastScanDate={ctrl.scanTester.lastCheckpoint}
        busy={false}
      />

      <ResumeScanModal
        open={ctrl.modals.resume}
        status={ctrl.scanTester.scan?.status || "Unknown"}
        onClose={() => ctrl.toggleModal("resume", false)}
        onResume={ctrl.handleResumeScan} // On branche les nouveaux handlers
        onStop={ctrl.handleStopScan} // On branche les nouveaux handlers
      />

      <AlertModal
        open={ctrl.modals.alert}
        title="Information"
        message={ctrl.alertMessage}
        onClose={() => ctrl.toggleModal("alert", false)}
      />

      <DeleteAccountModal
        open={ctrl.modals.delete}
        busy={false}
        onClose={() => ctrl.toggleModal("delete", false)}
        onConfirm={ctrl.deleteAccount}
      />

      <StatusChangeModal
        open={ctrl.modals.status}
        currentStatus={selectedBucket?.app.status ?? "unknown"}
        onClose={() => ctrl.toggleModal("status", false)}
        busy={ctrl.dataLoading}
        onConfirm={async (newStatus) => {
          if (selectedBucket) {
            await ctrl.updateApplication(selectedBucket.app.id, {
              status: newStatus,
            });
            ctrl.toggleModal("status", false);
            ctrl.fetchData();
          }
        }}
      />

      <Drawer
        selectedBucket={selectedBucket}
        busy={ctrl.dataLoading}
        onClose={() => setSelectedAppId(null)}
        noteDraft={noteDraft}
        setNoteDraft={setNoteDraft}
        noteDirty={isDrawerDirty}
        appStatusDraft={appStatusDraft}
        onOpenStatusModal={() => ctrl.toggleModal("status", true)}
        onSaveApplication={handleUpdateApplication}
        onResetNote={() => {
          setNoteDraft(selectedBucket?.app.notes ?? "");
          if (selectedBucket) setAppStatusDraft(selectedBucket.app.status);
        }}
        onArchiveApplication={handleArchive}
        onDeleteApplication={handleDelete}
        onEditEmail={(id) => {
          setEmailEditId(id);
          ctrl.toggleModal("emailEdit", true);
        }}
        statusTextClass={statusTextClass}
      />

      <EmailEditModal
        open={ctrl.modals.emailEdit}
        jobStatus={JOB_STATUS}
        selectedEmail={selectedEmail}
        emailEdit={emailEditState}
        setEmailEdit={setEmailEditState}
        onClose={() => ctrl.toggleModal("emailEdit", false)}
        busy={ctrl.dataLoading}
        onSave={handleEmailSave}
        onReset={() => {
          if (!selectedEmail) return;
          setEmailEditState({
            company: selectedEmail.company ?? "",
            position: selectedEmail.position ?? "",
            status: selectedEmail.status,
            eventType: selectedEmail.event_type ?? "",
          });
        }}
      />
    </div>
  );
}
