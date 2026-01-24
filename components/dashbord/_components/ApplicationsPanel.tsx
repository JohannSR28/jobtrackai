"use client";
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
  return (
    <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 px-3 py-3">
      <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-sm font-bold">Applications</div>

          <ToggleMini
            leftLabel="Active"
            rightLabel="Archived"
            value={props.archiveMode === "active" ? "left" : "right"}
            onChange={(v) =>
              props.setArchiveMode(v === "left" ? "active" : "archived")
            }
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
          <span>
            Total: <span className="text-slate-100">{props.filteredTotal}</span>
          </span>
          <span className="text-slate-500">•</span>
          <span>
            Page {props.page}/{props.maxPage}
          </span>
          <button
            className="rounded-lg bg-white/5 px-2 py-1 ring-1 ring-white/10 hover:bg-white/10 disabled:opacity-60"
            disabled={props.page <= 1}
            onClick={props.onPrev}
          >
            Prev
          </button>
          <button
            className="rounded-lg bg-white/5 px-2 py-1 ring-1 ring-white/10 hover:bg-white/10 disabled:opacity-60"
            disabled={props.page >= props.maxPage}
            onClick={props.onNext}
          >
            Next
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      <div className="mb-2">
        <div className="sm:hidden flex items-center gap-2">
          <div className="text-xs text-slate-300">Status</div>
          <select
            className="flex-1 rounded-xl bg-slate-950/40 px-3 py-2 text-xs font-semibold ring-1 ring-white/10 outline-none"
            value={props.statusFilter}
            onChange={(e) =>
              props.setStatusFilter(e.target.value as StatusFilter)
            }
          >
            {props.statusOptions.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label} ({props.statusCounts[opt.key] ?? 0})
              </option>
            ))}
          </select>
        </div>

        {/* Desktop chips */}
        <div className="hidden sm:flex flex-wrap items-center gap-2">
          {props.statusOptions.map((opt) => {
            const selected = props.statusFilter === opt.key;
            const count = props.statusCounts[opt.key] ?? 0;

            const dot =
              opt.key === "all" ? "bg-slate-400" : (opt.dot ?? "bg-slate-400");

            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => props.setStatusFilter(opt.key)}
                className={[
                  "flex items-center gap-2 rounded-lg px-2 py-1 text-xs font-semibold ring-1",
                  selected
                    ? "bg-indigo-500/15 ring-indigo-400/30"
                    : "bg-white/5 ring-white/10 hover:bg-white/10",
                ].join(" ")}
              >
                <span className={["h-2 w-2 rounded-full", dot].join(" ")} />
                <span>{opt.label}</span>
                <span className="text-slate-300">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {props.pagedBuckets.map(({ app, emails }) => (
          <div
            key={app.id}
            role="button"
            tabIndex={0}
            className="cursor-pointer select-none rounded-2xl bg-white/5 px-3 py-2 text-left ring-1 ring-white/10 hover:bg-white/10"
            onClick={() => props.onSelectApp(app.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                props.onSelectApp(app.id);
              }
            }}
          >
            <div className="truncate text-sm font-extrabold">
              {app.company ?? "—"}
            </div>
            <div className="truncate text-xs text-slate-300">
              {app.position ?? "—"}
            </div>
            <div
              className={[
                "mt-1 text-[11px] font-semibold",
                props.statusTextClass(app.status),
              ].join(" ")}
            >
              {app.status}
            </div>
            <div className="mt-2 text-[11px] text-slate-400">
              {emails.length}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
