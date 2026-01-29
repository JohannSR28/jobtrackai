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

  const sortedEmails = [...b.emails].sort((a, b) => {
    const dateA = a.received_at ? new Date(a.received_at).getTime() : 0;
    const dateB = b.received_at ? new Date(b.received_at).getTime() : 0;
    return dateB - dateA;
  });

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/10 backdrop-blur-sm transition-opacity"
        onClick={props.onClose}
      />

      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-[540px] bg-white shadow-[-10px_0_30px_rgba(0,0,0,0.05)] border-l border-gray-100 transform transition-transform duration-300">
        <div className="h-full overflow-y-auto flex flex-col">
          {/* Header */}
          <div className="px-8 pt-8 pb-6 bg-white shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="gen-typo text-3xl tracking-tight text-black break-words">
                  {b.app.company ?? "Unknown Company"}
                </div>
                <div className="text-base text-gray-500 font-medium mt-1">
                  {b.app.position ?? "Position not specified"}
                </div>
              </div>
              <button
                type="button"
                className="rounded-full p-2 bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-black transition-colors"
                onClick={props.onClose}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            {/* Actions Bar */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={props.onOpenStatusModal}
                disabled={props.busy}
                className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
              >
                <span
                  className={[
                    "h-2.5 w-2.5 rounded-full ring-2 ring-white",
                    statusDotClass(props.appStatusDraft),
                  ].join(" ")}
                />
                <span
                  className={[
                    "text-xs font-bold uppercase tracking-wide",
                    statusText(props.appStatusDraft),
                  ].join(" ")}
                >
                  {props.appStatusDraft}
                </span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  className="text-gray-400 ml-1"
                >
                  <path
                    d="M3 4.5L6 7.5L9 4.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              <div className="h-6 w-px bg-gray-200 mx-1"></div>

              <button
                type="button"
                className={`rounded-xl px-4 py-2.5 text-xs font-bold border transition-all ${
                  b.app.archived
                    ? "bg-black text-white border-black"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                }`}
                disabled={props.busy}
                onClick={props.onArchiveApplication}
              >
                {b.app.archived ? "Archived" : "Archive"}
              </button>

              <button
                type="button"
                className="rounded-xl bg-red-50 px-4 py-2.5 text-xs font-bold text-red-600 border border-red-100 hover:bg-red-100 hover:border-red-200 transition-all ml-auto"
                disabled={props.busy}
                onClick={props.onDeleteApplication}
              >
                Delete
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Notes Section */}
            <div className="px-8 py-6 bg-gray-50/50 border-t border-b border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                  Personal Notes
                </div>
                {props.noteDirty && (
                  <span className="text-[10px] font-bold text-brand-orange bg-brand-orange/10 px-2 py-1 rounded-md">
                    Unsaved changes
                  </span>
                )}
              </div>

              <textarea
                className="w-full min-h-[120px] rounded-xl bg-white border border-gray-200 px-4 py-3 text-sm font-medium text-black outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-all placeholder:text-gray-300 resize-none shadow-sm"
                value={props.noteDraft}
                onChange={(e) => props.setNoteDraft(e.target.value)}
                placeholder="Add private notes about this application..."
              />

              {props.noteDirty && (
                <div className="mt-3 flex gap-2 animate-in slide-in-from-top-2 fade-in duration-200">
                  <button
                    type="button"
                    className="rounded-lg bg-brand-orange px-4 py-2 text-xs font-bold text-black hover:bg-brand-orange-hover shadow-sm"
                    disabled={props.busy}
                    onClick={props.onSaveApplication}
                  >
                    Save Note
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-white px-4 py-2 text-xs font-bold text-gray-600 border border-gray-200 hover:bg-gray-50"
                    disabled={props.busy}
                    onClick={props.onResetNote}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {/* Emails Section */}
            <div className="px-8 py-8 bg-white pb-20">
              <div className="flex items-center justify-between mb-6">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                  Email History
                </div>
                <div className="text-xs font-bold text-black bg-gray-100 px-2 py-1 rounded-md">
                  {b.emails.length}
                </div>
              </div>

              <div className="space-y-4">
                {sortedEmails.map((em) => (
                  <div
                    key={em.id}
                    className="group bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:border-brand-orange/50 hover:shadow-md transition-all duration-300"
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-black truncate">
                          {em.from_text || "Unknown Sender"}
                        </div>
                        <div className="text-xs text-gray-500 font-medium truncate mt-0.5">
                          {em.subject || "No Subject"}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="opacity-0 group-hover:opacity-100 rounded-lg bg-gray-50 px-3 py-1.5 text-[10px] font-bold text-gray-600 border border-gray-200 hover:bg-white hover:text-brand-orange hover:border-brand-orange transition-all"
                        onClick={() => props.onEditEmail(em.id)}
                      >
                        Edit
                      </button>
                    </div>

                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                          em.status === "rejection"
                            ? "bg-red-50 text-red-600 border-red-100"
                            : em.status === "interview"
                              ? "bg-purple-50 text-purple-600 border-purple-100"
                              : em.status === "offer"
                                ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                : "bg-gray-50 text-gray-600 border-gray-200"
                        }`}
                      >
                        {em.status}
                      </div>
                      {em.received_at && (
                        <div className="text-[10px] text-gray-400 font-medium">
                          {new Date(em.received_at).toLocaleDateString(
                            undefined,
                            {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </div>
                      )}
                    </div>

                    <div className="relative">
                      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gray-100 rounded-full"></div>
                      <div className="pl-3 text-xs text-gray-600 leading-relaxed font-medium line-clamp-3 group-hover:line-clamp-none transition-all">
                        {(em.snippet || "").trim() || "No preview available."}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
