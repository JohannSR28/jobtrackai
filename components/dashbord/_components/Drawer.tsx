// app/job-domain-test-fake/_components/Drawer.tsx
"use client";

import {
  statusTextClass as defaultStatusTextClass,
  statusDotClass,
} from "./ui";
import type { Bucket, JobStatus } from "@/hooks/useJobApplications";
type DrawerProps = Readonly<{
  selectedBucket: Bucket | null;
  busy: boolean;
  onClose: () => void;

  noteDraft: string;
  setNoteDraft: (v: string) => void;

  noteDirty: boolean;

  appStatusDraft: JobStatus;
  onOpenStatusModal: () => void;

  onSaveApplication: () => void;
  onResetNote: () => void;

  onArchiveApplication: () => void;
  onDeleteApplication: () => void;

  onEditEmail: (emailId: string) => void;

  statusTextClass?: (s: JobStatus) => string;
}>;

export function Drawer(props: DrawerProps) {
  const statusText = props.statusTextClass ?? defaultStatusTextClass;

  if (!props.selectedBucket) return null;
  const b = props.selectedBucket;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={props.onClose} />

      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-[540px] bg-slate-950/95 shadow-2xl">
        <div className="h-full overflow-y-auto">
          <div className="px-4 pt-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="truncate text-lg font-extrabold">
                  {b.app.company ?? "—"}
                </div>
                <div className="truncate text-sm text-slate-300">
                  {b.app.position ?? "—"}
                </div>

                {/* ✨ MODIFICATION : Boutons d'actions intégrés ici */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {/* Status Button */}
                  <button
                    type="button"
                    onClick={props.onOpenStatusModal}
                    disabled={props.busy}
                    className="flex items-center gap-2 rounded-lg bg-white/5 px-2 py-1.5 ring-1 ring-white/10 hover:bg-white/10 disabled:opacity-60 transition-all"
                  >
                    <span
                      className={[
                        "h-2 w-2 rounded-full",
                        statusDotClass(props.appStatusDraft),
                      ].join(" ")}
                    />
                    <span
                      className={[
                        "text-xs font-semibold",
                        statusText(props.appStatusDraft),
                      ].join(" ")}
                    >
                      {props.appStatusDraft}
                    </span>
                  </button>

                  {/* Separator & Count */}
                  <div className="ml-1 text-xs text-slate-400">
                    • {b.emails.length} email{b.emails.length !== 1 ? "s" : ""}
                  </div>

                  {/* Archive Button (Mini) */}
                  <button
                    type="button"
                    className="rounded-lg bg-amber-500/10 px-2 py-1.5 text-xs font-semibold text-amber-200 ring-1 ring-amber-400/30 hover:bg-amber-500/20 disabled:opacity-60 transition-all"
                    disabled={props.busy}
                    onClick={props.onArchiveApplication}
                  >
                    {b.app.archived ? "Unarchive" : "Archive"}
                  </button>

                  {/* Delete Button (Mini) */}
                  <button
                    type="button"
                    className="rounded-lg bg-red-500/10 px-2 py-1.5 text-xs font-semibold text-red-200 ring-1 ring-red-400/30 hover:bg-red-500/20 disabled:opacity-60 transition-all"
                    disabled={props.busy}
                    onClick={props.onDeleteApplication}
                  >
                    Delete
                  </button>
                </div>
              </div>

              <button
                type="button"
                className="rounded-lg bg-white/5 px-2 py-1 text-xs font-semibold ring-1 ring-white/10 hover:bg-white/10"
                onClick={props.onClose}
              >
                Close
              </button>
            </div>
          </div>

          <div className="px-4 pt-3">
            <div className="text-xs font-bold text-slate-200">Note</div>
            <textarea
              className="mt-1 w-full min-h-[90px] rounded-xl bg-slate-950/30 px-3 py-2 text-sm ring-1 ring-white/10 outline-none focus:ring-indigo-400/30"
              value={props.noteDraft}
              onChange={(e) => props.setNoteDraft(e.target.value)}
              placeholder="Écris une note…"
            />
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                className="rounded-xl bg-indigo-500/20 px-3 py-2 text-xs font-semibold ring-1 ring-indigo-400/30 hover:bg-indigo-500/30 disabled:opacity-60"
                disabled={props.busy || !props.noteDirty}
                onClick={props.onSaveApplication}
              >
                Save
              </button>
              <button
                type="button"
                className="rounded-xl bg-white/5 px-3 py-2 text-xs font-semibold ring-1 ring-white/10 hover:bg-white/10 disabled:opacity-60"
                disabled={props.busy || !props.noteDirty}
                onClick={props.onResetNote}
              >
                Reset
              </button>
            </div>
          </div>

          {/* 🗑️ ANCIENNE SECTION "Actions" SUPPRIMÉE ICI */}

          <div className="px-4 pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-slate-200">Emails</div>
              <div className="text-[11px] text-slate-400">
                {b.emails.length}
              </div>
            </div>

            <div className="mt-2 space-y-2">
              {b.emails.map((em) => (
                <div key={em.id} className="bg-white/5 rounded-xl px-3 py-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-xs font-extrabold text-slate-100">
                        {em.from_text ?? "—"}
                      </div>
                      <div className="truncate text-[11px] text-slate-300">
                        {em.subject ?? "—"}
                      </div>
                      <div className="mt-1 text-[11px] text-slate-400">
                        <span
                          className={[
                            "font-semibold",
                            statusText(em.status),
                          ].join(" ")}
                        >
                          {em.status}
                        </span>
                        {em.received_at ? (
                          <span className="text-slate-500">
                            {" "}
                            • {new Date(em.received_at).toLocaleString()}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="rounded-lg bg-indigo-500/20 px-2 py-1 text-[11px] font-semibold ring-1 ring-indigo-400/30 hover:bg-indigo-500/30 disabled:opacity-60"
                      disabled={props.busy}
                      onClick={() => props.onEditEmail(em.id)}
                    >
                      Edit
                    </button>
                  </div>

                  <div className="mt-2 text-[11px] text-slate-400">Snippet</div>
                  <div className="mt-1 whitespace-pre-wrap text-xs text-slate-200">
                    {(em.snippet ?? "—").trim() || "—"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
