"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// --- HOOKS METIER ---
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { useMailConnection } from "@/hooks/useMailConnection";
import {
  useJobApplications,
  type StatusFilter,
  type Bucket,
} from "@/hooks/useJobApplications";
import { useScanTester } from "@/hooks/useScanTester";

// --- TYPES ---
export type ApplicationsData = {
  applications: Bucket[];
  total: number;
  maxPage: number;
  statusCounts: Record<StatusFilter, number>;
};

export type VisualState =
  | "idle"
  | "running"
  | "completed"
  | "pausing"
  | "stopping"
  | "resuming";

// --- HELPERS DATE (VERSION "STRING PURE" - ANTI-BUG TIMEZONE) ---
// Cette méthode évite 100% des conversions implicites du navigateur.
// On prend la chaîne "YYYY-MM-DD" et on colle le suffixe UTC.
// C'est ce qu'il y a de plus fiable pour communiquer avec une API qui attend de l'ISO.

function toUtcIso(dateStr: string) {
  // Sécurité : si la date est vide, on renvoie maintenant en ISO
  if (!dateStr) return new Date().toISOString();
  // On force le format UTC strict sans passer par l'objet Date
  return `${dateStr}T00:00:00.000Z`;
}

function toUtcIsoEndOfDay(dateStr: string) {
  if (!dateStr) return new Date().toISOString();
  // On force la dernière milliseconde de la journée en UTC
  return `${dateStr}T23:59:59.999Z`;
}

function getScanErrorMessage(reason?: string): string {
  switch (reason) {
    case "TOO_MANY_MESSAGES":
      return "⚠️ Trop d'emails (>2000).\nRéduisez la période (ex: 2 semaines).";
    case "RANGE_TOO_LARGE":
      return "⚠️ Période trop longue.\nLa limite est de 90 jours.";
    case "INVALID_RANGE":
      return "⚠️ Date de fin antérieure à la date de début.";
    case "INSUFFICIENT_FUNDS":
      return "⚠️ Crédits insuffisants.";
    default:
      return `Erreur de validation (${reason}).`;
  }
}

// --- CONTROLLER PRINCIPAL ---
export function useDashboardController() {
  const router = useRouter();

  // 1. Core Hooks
  const { user, loading: authLoading, signOut, deleteAccount } = useAuth();
  const { balance, loading: walletLoading, refreshBalance } = useWallet();
  const {
    status: mailStatus,
    pollStatus: pollMailStatus,
    connect: connectMail,
  } = useMailConnection();

  // 2. Data Hooks
  const {
    getApplications,
    updateApplication,
    updateEmail: apiUpdateEmail,
    archiveApplication,
    deleteApplication,
    loading: dataLoading,
    error: dataError,
  } = useJobApplications();

  // 3. Moteur Scan
  const scanTester = useScanTester({ delayMs: 100 });

  // 4. UI State
  const [visualState, setVisualState] = useState<VisualState>("idle");
  const [isTransitioning, setIsTransitioning] = useState(false);

  const [data, setData] = useState<ApplicationsData | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [archiveMode, setArchiveMode] = useState<"active" | "archived">(
    "active",
  );
  const [isMobile, setIsMobile] = useState(false);

  const [modals, setModals] = useState({
    scan: false,
    resume: false,
    mailConnect: false,
    settings: false,
    alert: false,
    delete: false,
    status: false,
    emailEdit: false,
  });
  const [alertMessage, setAlertMessage] = useState("");

  // Refs pour optimisation
  const lastProcessedCount = useRef(0);
  const lastScanStatus = useRef<string | null>(null);

  // --- EFFETS ---

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login-page");
  }, [user, authLoading, router]);
  useEffect(() => {
    pollMailStatus();
  }, [pollMailStatus]);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);

  const fetchData = useCallback(async () => {
    if (authLoading || !user) return;
    const pageSize = isMobile ? 10 : 20;
    const res = await getApplications({
      archived: archiveMode === "archived",
      status: statusFilter,
      page,
      pageSize,
    });
    setData(res as ApplicationsData);
  }, [
    getApplications,
    archiveMode,
    statusFilter,
    page,
    isMobile,
    authLoading,
    user,
  ]);

  useEffect(() => {
    if (user) {
      fetchData();
      scanTester.fetchCheckpoint();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    fetchData(); /* eslint-disable-next-line */
  }, [page, statusFilter, archiveMode]);

  // --- SYNC SCAN & BALANCE (Optimisé) ---
  useEffect(() => {
    const scan = scanTester.scan;
    if (!scan) return;

    const statusChanged = scan.status !== lastScanStatus.current;
    if (statusChanged) {
      lastScanStatus.current = scan.status;
      if (["completed", "failed", "canceled"].includes(scan.status)) {
        refreshBalance();
        fetchData();
      }
    }

    if (
      scan.status === "running" &&
      scan.processedCount > lastProcessedCount.current
    ) {
      lastProcessedCount.current = scan.processedCount;
      refreshBalance();
    }
  }, [
    scanTester.scan,
    scanTester.scan?.status,
    scanTester.scan?.processedCount,
    refreshBalance,
    fetchData,
  ]);

  // --- SYNC VISUELLE (Logique Stricte) ---
  useEffect(() => {
    const scan = scanTester.scan;

    // Si on transitionne manuellement, on ignore le backend
    if (isTransitioning) return;
    if (!scan) return;

    // A. SCAN TERMINÉ -> DISPARITION (Correction ici)
    // On ne lance le timer que si on est dans un état actif (Running/Resuming).
    // Si on est déjà "completed", on ne fait rien (pour ne pas reset le timer).
    // Si on est "idle", on ne fait rien (on ne veut pas voir la barre si on recharge la page).
    if (scan.status === "completed") {
      if (
        visualState === "running" ||
        visualState === "resuming" ||
        visualState === "pausing"
      ) {
        setVisualState("completed");
        setTimeout(() => {
          // On force le passage à idle après 5s
          setVisualState("idle");
        }, 5000);
      }
      return;
    }

    // B. SCAN ANNULÉ/ÉCHOUÉ -> Disparition
    if (
      (scan.status === "canceled" || scan.status === "failed") &&
      visualState !== "idle"
    ) {
      setVisualState("idle");
      return;
    }

    // C. REPRISE AUTO
    // Si le backend est running et qu'on sort d'un "Resuming", on passe au bleu.
    if (scan.status === "running" && visualState === "resuming") {
      setVisualState("running");
    }
  }, [scanTester.scan, scanTester.scan?.status, isTransitioning, visualState]);

  // --- ACTIONS SCAN ---

  const handlePauseScan = async () => {
    if (!scanTester.scan) return;
    setVisualState("pausing");
    setIsTransitioning(true);
    await Promise.all([
      new Promise((r) => setTimeout(r, 1500)),
      scanTester.pause(),
    ]);
    setVisualState("idle");
    setIsTransitioning(false);
  };

  const handleStopScan = async () => {
    if (!scanTester.scan) return;
    setVisualState("stopping");
    setIsTransitioning(true);
    await Promise.all([
      new Promise((r) => setTimeout(r, 1500)),
      scanTester.cancel(scanTester.scan.id),
    ]);
    setVisualState("idle");
    setIsTransitioning(false);
  };

  const handleResumeScan = async () => {
    if (!scanTester.scan) return;
    toggleModal("resume", false);
    setVisualState("resuming");
    setIsTransitioning(true);
    scanTester.runLoop(scanTester.scan.id);
    setTimeout(() => {
      setVisualState("running");
      setIsTransitioning(false);
    }, 1500);
  };

  // --- LOGIQUE DE DÉMARRAGE (Avec reset d'erreur) ---
  const handleStartScan = async (config: {
    mode: "since_last" | "custom";
    startDate: string;
    endDate: string;
  }) => {
    // 1. Reset Error : On efface les vieilles erreurs pour éviter la confusion
    setAlertMessage("");

    let result;
    if (config.mode === "since_last") {
      result = await scanTester.init({ mode: "since_last" });
    } else {
      // 2. Conversion Dates : On utilise les helpers stricts
      const sIso = toUtcIso(config.startDate);
      const eIso = toUtcIsoEndOfDay(config.endDate);

      result = await scanTester.init({
        mode: "custom",
        startIso: sIso,
        endIso: eIso,
      });
    }

    if (result.mode === "invalid") {
      setAlertMessage(getScanErrorMessage(result.validation?.reason));
      toggleModal("alert", true);
      return;
    }

    if (result.mode === "insufficient_funds") {
      setAlertMessage(
        `Crédits insuffisants. Requis: ${result.required}, Actuel: ${result.current}`,
      );
      toggleModal("alert", true);
      return;
    }

    toggleModal("scan", false);
    setVisualState("running");
    if (result.mode === "new" || result.mode === "existing") {
      scanTester.runLoop(result.scan.id);
    }
  };

  const handleScanClick = () => {
    if (!mailStatus?.connected) return toggleModal("mailConnect", true);
    if (scanTester.scan && ["paused"].includes(scanTester.scan.status)) {
      return toggleModal("resume", true);
    }
    toggleModal("scan", true);
  };

  const toggleModal = (key: keyof typeof modals, value: boolean) =>
    setModals((p) => ({ ...p, [key]: value }));

  const isSystemBusy = isTransitioning || scanTester.isLooping;
  const isScanPaused = scanTester.scan?.status === "paused";

  return {
    user,
    authLoading,
    balance,
    walletLoading,
    mailStatus,
    data,
    dataLoading,
    dataError,
    scanTester,
    visualState,
    isSystemBusy,
    isScanPaused,
    modals,
    alertMessage,
    filters: {
      page,
      setPage,
      statusFilter,
      setStatusFilter,
      archiveMode,
      setArchiveMode,
    },
    fetchData,
    refreshBalance,
    connectMail,
    signOut,
    deleteAccount,
    updateApplication,
    apiUpdateEmail,
    archiveApplication,
    deleteApplication,
    toggleModal,
    setAlertMessage,
    handleScanClick,
    handleStartScan,
    handlePauseScan,
    handleStopScan,
    handleResumeScan,
  };
}
