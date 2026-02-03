"use client";

import { useState, memo } from "react";
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  useDraggable,
  useDroppable,
  defaultDropAnimationSideEffects,
  DropAnimation,
} from "@dnd-kit/core";

import type { Bucket, JobStatus } from "@/hooks/useJobApplications";
import { ToggleMini } from "./ui";
import { useLanguage } from "@/hooks/useLanguage";

type StatusFilter = JobStatus | "all";
type ArchiveMode = "active" | "archived";

const translations = {
  fr: {
    title: "CANDIDATURES",
    active: "Actives",
    archived: "Archivées",
    total: "Total",
    page: "Page",
    prev: "← Préc.",
    next: "Suiv. →",
    filterBy: "FILTRER PAR",
    email: "email",
    emails: "emails",
    dropToMerge: "Relâcher pour fusionner",
    searchPlaceholder: "Entreprise ou poste...",
    searchButton: "Rechercher",
    sortRecent: "Plus récents",
    sortOld: "Plus anciens",
  },
  en: {
    title: "APPLICATIONS",
    active: "Active",
    archived: "Archived",
    total: "Total",
    page: "Page",
    prev: "← Prev",
    next: "Next →",
    filterBy: "FILTER BY",
    email: "email",
    emails: "emails",
    dropToMerge: "Drop to merge",
    searchPlaceholder: "Company or position...",
    searchButton: "Search",
    sortRecent: "Newest first",
    sortOld: "Oldest first",
  },
};

// ==========================================
// 1. SOUS-COMPOSANT CARTE (MEMOIZED)
// ==========================================
interface CardProps {
  bucket: Bucket;
  onSelect: (id: string) => void;
  statusTextClass: (s: JobStatus) => string;
  isOverlay?: boolean;
}

const ApplicationCard = memo(function ApplicationCard({
  bucket,
  onSelect,
  statusTextClass,
  isOverlay,
}: CardProps) {
  const { app, emails } = bucket;
  const { language } = useLanguage();
  const t = translations[language];

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: app.id,
    data: { type: "APP_CARD", bucket },
    disabled: isOverlay,
  });

  const {
    setNodeRef: setDraggableRef,
    attributes,
    listeners,
    isDragging,
  } = useDraggable({
    id: app.id,
    data: { type: "APP_CARD", bucket },
    disabled: isOverlay,
  });

  const opacity = isDragging ? 0.3 : 1;
  const scale = isOver ? "scale-[1.02]" : "scale-100";

  const borderColor = isOver
    ? "border-brand-orange bg-brand-orange/5"
    : "border-gray-200 hover:border-brand-orange hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]";

  const overlayClass = isOverlay
    ? "rotate-2 shadow-2xl scale-105 border-brand-orange bg-white z-50 cursor-grabbing"
    : "grab-active";

  return (
    <div
      ref={(node) => {
        setDroppableRef(node);
        setDraggableRef(node);
      }}
      style={{ opacity }}
      {...attributes}
      {...listeners}
      onClick={!isDragging ? () => onSelect(app.id) : undefined}
      className={`group relative select-none rounded-2xl border px-5 py-4 text-left transition-all duration-200 touch-none ${scale} ${borderColor} ${overlayClass}`}
    >
      {isOver && !isOverlay && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-orange text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg z-20 animate-bounce whitespace-nowrap">
          {t.dropToMerge}
        </div>
      )}

      <div className="flex justify-between items-start mb-1">
        <div className="truncate text-base font-bold text-black group-hover:text-brand-orange transition-colors">
          {app.company ?? "—"}
        </div>
      </div>

      <div className="truncate text-xs text-gray-500 font-medium mb-4">
        {app.position ?? "—"}
      </div>

      <div className="flex items-center justify-between border-t border-gray-100 pt-3">
        <div
          className={`text-[10px] font-bold uppercase tracking-wider ${statusTextClass(app.status)}`}
        >
          {app.status}
        </div>
        <div className="text-[10px] text-gray-400 font-medium">
          {emails.length} {emails.length !== 1 ? t.emails : t.email}
        </div>
      </div>
    </div>
  );
});

// ==========================================
// 2. COMPOSANT PRINCIPAL
// ==========================================

const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: { opacity: "0.5" },
    },
  }),
};

export function ApplicationsPanel(props: {
  archiveMode: ArchiveMode;
  setArchiveMode: (v: ArchiveMode) => void;
  statusFilter: StatusFilter;
  setStatusFilter: (v: StatusFilter) => void;
  statusOptions: ReadonlyArray<{
    key: StatusFilter;
    label: string;
    dot?: string;
  }>;
  statusCounts: Record<StatusFilter, number>;
  filteredTotal: number;
  page: number;
  maxPage: number;
  onPrev: () => void;
  onNext: () => void;
  pagedBuckets: ReadonlyArray<Bucket>;
  onSelectApp: (id: string) => void;
  statusTextClass: (s: JobStatus) => string;
  onMergeAttempt: (targetBucket: Bucket, sourceBucket: Bucket) => void;

  onSearch: (term: string) => void;
  onSortToggle: () => void;
  currentSort: "asc" | "desc";
  isSearching: boolean;
}) {
  const { language } = useLanguage();
  const t = translations[language];
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDragBucket, setActiveDragBucket] = useState<Bucket | null>(null);

  // État local pour le champ texte
  const [localSearch, setLocalSearch] = useState("");

  // Handler déclenché uniquement par le bouton ou Entrée
  const triggerSearch = () => {
    props.onSearch(localSearch);
  };

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
  );

  const toggleBodyCursor = (active: boolean) => {
    if (active) {
      document.body.classList.add("cursor-grabbing-mode");
    } else {
      document.body.classList.remove("cursor-grabbing-mode");
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const bucket = props.pagedBuckets.find((b) => b.app.id === active.id);
    if (bucket) setActiveDragBucket(bucket);
    toggleBodyCursor(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragBucket(null);
    toggleBodyCursor(false);

    if (!over || active.id === over.id) return;

    const sourceBucket = props.pagedBuckets.find((b) => b.app.id === active.id);
    const targetBucket = props.pagedBuckets.find((b) => b.app.id === over.id);

    if (sourceBucket && targetBucket) {
      props.onMergeAttempt(targetBucket, sourceBucket);
    }
  };

  const currentOption = props.statusOptions.find(
    (opt) => opt.key === props.statusFilter,
  );
  const currentDot =
    currentOption?.key === "all"
      ? "bg-gray-400"
      : (currentOption?.dot ?? "bg-gray-400");

  return (
    <>
      <style jsx global>{`
        .grab-active {
          cursor: grab;
        }
        .grab-active:active {
          cursor: grabbing !important;
        }
        body.cursor-grabbing-mode,
        body.cursor-grabbing-mode * {
          cursor: grabbing !important;
          user-select: none !important;
          -webkit-user-select: none !important;
        }
      `}</style>

      <div className="rounded-2xl bg-white border border-gray-200 px-6 py-6 shadow-sm">
        {/* --- HEADER COMPACT ET GAUCHE --- */}
        {/* On utilise 'justify-start' et 'gap' pour tout coller à gauche */}
        <div className="mb-8 flex flex-col xl:flex-row xl:items-center justify-start gap-4 xl:gap-8">
          {/* 1. Titre (Fixe) */}
          <div className="gen-typo text-xl tracking-tight text-black uppercase whitespace-nowrap">
            {t.title}
          </div>

          {/* Wrapper des contrôles : sur Mobile colonne, sur Desktop ligne collée au titre */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full xl:w-auto">
            {/* 2. Toggle Active/Archive */}
            <div className="flex-shrink-0">
              <ToggleMini
                leftLabel={t.active}
                rightLabel={t.archived}
                value={props.archiveMode === "active" ? "left" : "right"}
                onChange={(v) =>
                  props.setArchiveMode(v === "left" ? "active" : "archived")
                }
              />
            </div>

            {/* Séparateur (Desktop uniquement) */}
            <div className="hidden sm:block w-px h-8 bg-gray-200 mx-1"></div>

            {/* 3. Barre de Recherche AVEC BOUTON */}
            <div className="flex items-center gap-2 flex-1 sm:flex-none">
              <div className="relative flex-1 group sm:w-64">
                <input
                  type="text"
                  className="block w-full pl-3 pr-10 py-2 border border-gray-200 rounded-lg leading-5 bg-gray-50 focus:bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange sm:text-xs font-medium transition-all"
                  placeholder={t.searchPlaceholder}
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") triggerSearch();
                  }}
                />
                {/* Spinner de chargement à l'intérieur de l'input */}
                {props.isSearching && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <div className="h-4 w-4 border-2 border-gray-300 border-t-brand-orange rounded-full animate-spin" />
                  </div>
                )}
              </div>

              {/* Bouton de recherche explicite (Icône loupe) */}
              <button
                onClick={triggerSearch}
                className="flex items-center justify-center h-[34px] w-[34px] bg-black text-white rounded-lg hover:bg-gray-800 transition-colors shadow-sm active:scale-95 flex-shrink-0"
                title={t.searchButton}
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </button>
            </div>

            {/* 4. Bouton Tri (Texte sur Desktop, Flèche sur Mobile) */}
            <button
              onClick={props.onSortToggle}
              className="flex items-center justify-center gap-2 px-3 h-[34px] bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm active:scale-95"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`text-gray-600 transition-transform duration-300 ${props.currentSort === "asc" ? "rotate-180" : ""}`}
              >
                <line x1="12" x2="12" y1="3" y2="21" />
                <polyline points="17 7 12 2 7 7" />
              </svg>

              {/* Texte visible uniquement sur écran 'sm' et plus */}
              <span className="hidden sm:inline text-xs font-bold text-gray-700">
                {props.currentSort === "desc" ? t.sortRecent : t.sortOld}
              </span>
            </button>
          </div>
        </div>

        {/* --- SECTION FILTRES STATUT & PAGINATION --- */}
        {/* Inchangé par rapport à avant, mais nettoyé */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-6">
          <div className="flex-1">
            <div className="sm:hidden relative z-20">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="flex items-center justify-between w-full gap-2 rounded-xl bg-gray-50 px-4 py-2.5 text-xs font-bold border border-gray-200 text-black"
              >
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${currentDot}`} />
                  <span>
                    {currentOption?.label} (
                    {props.statusCounts[props.statusFilter] ?? 0})
                  </span>
                </div>
                <svg
                  width="10"
                  height="6"
                  viewBox="0 0 10 6"
                  fill="none"
                  className="text-gray-400"
                >
                  <path
                    d="M1 1L5 5L9 1"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              {isMobileMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsMobileMenuOpen(false)}
                  />
                  <div className="absolute left-0 right-0 top-full mt-2 rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl z-30 animate-in fade-in zoom-in-95">
                    {props.statusOptions.map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => {
                          props.setStatusFilter(opt.key);
                          setIsMobileMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50"
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${opt.key === "all" ? "bg-gray-400" : opt.dot}`}
                        />
                        <span className="flex-1 text-left">{opt.label}</span>
                        <span className="text-gray-400 font-medium">
                          {props.statusCounts[opt.key] ?? 0}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="hidden sm:flex flex-wrap items-center gap-2">
              {props.statusOptions.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => props.setStatusFilter(opt.key)}
                  className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-bold border transition-all duration-200 ${
                    props.statusFilter === opt.key
                      ? "bg-black text-white border-black shadow-md"
                      : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${opt.key === "all" ? "bg-gray-400" : opt.dot}`}
                  />
                  {opt.label}{" "}
                  <span className="text-gray-400 font-normal ml-0.5">
                    {props.statusCounts[opt.key] ?? 0}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 text-xs font-medium text-gray-500 w-full sm:w-auto mt-2 sm:mt-0">
            <span className="whitespace-nowrap">
              {t.total}:{" "}
              <span className="text-black font-bold">
                {props.filteredTotal}
              </span>
            </span>
            <div className="flex items-center gap-1">
              <button
                className="rounded-lg bg-white px-2.5 py-1.5 border border-gray-200 hover:border-brand-orange hover:text-brand-orange disabled:opacity-40 disabled:cursor-not-allowed transition-all font-bold text-black"
                disabled={props.page <= 1}
                onClick={props.onPrev}
              >
                {t.prev}
              </button>
              <span className="px-1">
                {props.page}/{props.maxPage}
              </span>
              <button
                className="rounded-lg bg-white px-2.5 py-1.5 border border-gray-200 hover:border-brand-orange hover:text-brand-orange disabled:opacity-40 disabled:cursor-not-allowed transition-all font-bold text-black"
                disabled={props.page >= props.maxPage}
                onClick={props.onNext}
              >
                {t.next}
              </button>
            </div>
          </div>
        </div>

        {/* GRID DND */}
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {props.pagedBuckets.map((bucket) => (
              <ApplicationCard
                key={bucket.app.id}
                bucket={bucket}
                onSelect={props.onSelectApp}
                statusTextClass={props.statusTextClass}
              />
            ))}
          </div>

          <DragOverlay dropAnimation={dropAnimation}>
            {activeDragBucket ? (
              <div className="w-full">
                <ApplicationCard
                  bucket={activeDragBucket}
                  onSelect={() => {}}
                  statusTextClass={props.statusTextClass}
                  isOverlay={true}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </>
  );
}
