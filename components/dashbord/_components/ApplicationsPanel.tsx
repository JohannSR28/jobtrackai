"use client";
import { useState } from "react";
import type { Bucket, JobStatus } from "@/hooks/useJobApplications";
import { ToggleMini } from "./ui";

type StatusFilter = JobStatus | "all";
type ArchiveMode = "active" | "archived";

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
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Trouver l'option active pour l'affichage du bouton
  const currentOption = props.statusOptions.find(
    (opt) => opt.key === props.statusFilter,
  );
  // Couleur du dot (gris par défaut si "all")
  const currentDot =
    currentOption?.key === "all"
      ? "bg-gray-400"
      : (currentOption?.dot ?? "bg-gray-400");

  return (
    // J'ai passé border-black à border-gray-200 pour plus de légèreté
    <div className="rounded-2xl bg-white border border-gray-200 px-6 py-6 shadow-sm">
      {/* Header : Titre + Toggle + Pagination */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-4">
          <div className="gen-typo text-xl tracking-tight text-black">
            APPLICATIONS
          </div>

          <ToggleMini
            leftLabel="Active"
            rightLabel="Archived"
            value={props.archiveMode === "active" ? "left" : "right"}
            onChange={(v) =>
              props.setArchiveMode(v === "left" ? "active" : "archived")
            }
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-gray-500">
          <span>
            Total:{" "}
            <span className="text-black font-bold">{props.filteredTotal}</span>
          </span>
          <span className="text-gray-300">•</span>
          <span>
            Page {props.page}/{props.maxPage}
          </span>
          <div className="flex items-center gap-1 ml-2">
            <button
              className="rounded-lg bg-white px-3 py-2 border border-gray-200 hover:border-brand-orange hover:text-brand-orange disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:text-gray-400 disabled:cursor-not-allowed transition-all font-bold text-black shadow-sm"
              disabled={props.page <= 1}
              onClick={props.onPrev}
            >
              ← Prev
            </button>
            <button
              className="rounded-lg bg-white px-3 py-2 border border-gray-200 hover:border-brand-orange hover:text-brand-orange disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:text-gray-400 disabled:cursor-not-allowed transition-all font-bold text-black shadow-sm"
              disabled={props.page >= props.maxPage}
              onClick={props.onNext}
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      {/* 🟢 Mobile Dropdown Custom */}
      <div className="mb-4 sm:hidden relative z-20">
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        <div className="flex items-center gap-3">
          <div className="text-xs text-gray-400 font-bold uppercase tracking-wide">
            FILTER BY
          </div>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="relative z-20 flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold border border-gray-300 hover:border-brand-orange transition-all shadow-sm text-black min-w-[140px] justify-between"
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
              className={`text-gray-400 transition-transform duration-200 ${
                isMobileMenuOpen ? "rotate-180" : ""
              }`}
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
        </div>

        {isMobileMenuOpen && (
          <div className="absolute left-[85px] top-full mt-2 w-56 rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl z-30 animate-in fade-in zoom-in-95 duration-100">
            {props.statusOptions.map((opt) => {
              const dot =
                opt.key === "all" ? "bg-gray-400" : (opt.dot ?? "bg-gray-400");
              const isSelected = props.statusFilter === opt.key;

              return (
                <button
                  key={opt.key}
                  onClick={() => {
                    props.setStatusFilter(opt.key);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-bold transition-colors ${
                    isSelected
                      ? "bg-brand-orange/10 text-black"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${dot}`} />
                  <span className="flex-1 text-left">{opt.label}</span>
                  <span className="text-gray-400 font-medium">
                    {props.statusCounts[opt.key] ?? 0}
                  </span>
                  {isSelected && <span className="text-brand-orange">✓</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Desktop chips */}
      <div className="hidden sm:flex mb-6 flex-wrap items-center gap-2">
        {props.statusOptions.map((opt) => {
          const selected = props.statusFilter === opt.key;
          const count = props.statusCounts[opt.key] ?? 0;
          const dot =
            opt.key === "all" ? "bg-gray-400" : (opt.dot ?? "bg-gray-400");

          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => props.setStatusFilter(opt.key)}
              className={[
                "flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold border transition-all duration-200",
                selected
                  ? "bg-black text-white border-black shadow-lg shadow-black/20"
                  : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50",
              ].join(" ")}
            >
              <span className={["h-2 w-2 rounded-full", dot].join(" ")} />
              <span>{opt.label}</span>
              <span className={selected ? "text-gray-400" : "text-gray-400"}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Grid des Applications */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {props.pagedBuckets.map(({ app, emails }) => (
          <div
            key={app.id}
            role="button"
            tabIndex={0}
            className="group cursor-pointer select-none rounded-2xl bg-white border border-gray-200 px-5 py-4 text-left transition-all duration-300 hover:border-brand-orange hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:-translate-y-1 active:scale-[0.98]"
            onClick={() => props.onSelectApp(app.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                props.onSelectApp(app.id);
              }
            }}
          >
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
                className={[
                  "text-[10px] font-bold uppercase tracking-wider",
                  props.statusTextClass(app.status),
                ].join(" ")}
              >
                {app.status}
              </div>
              <div className="text-[10px] text-gray-400 font-medium">
                {emails.length} email{emails.length !== 1 ? "s" : ""}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
