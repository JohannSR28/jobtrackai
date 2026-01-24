// app/job-domain-test-fake/_components/EmailEditModal.tsx
"use client";

import type { JobEmail, JobStatus } from "@/hooks/useJobApplications";
import { ModalShell } from "./ui";

export function EmailEditModal(props: {
  open: boolean;
  jobStatus: ReadonlyArray<JobStatus>;
  selectedEmail: JobEmail | null;
  emailEdit: {
    company: string;
    position: string;
    status: JobStatus;
    eventType: string;
  } | null;
  setEmailEdit: (
    v: {
      company: string;
      position: string;
      status: JobStatus;
      eventType: string;
    } | null
  ) => void;

  onClose: () => void;

  busy: boolean;
  onSave: () => void;
  onReset: () => void;
}) {
  return (
    <ModalShell
      open={props.open}
      title="Edit email"
      subtitle={props.selectedEmail?.subject ?? undefined}
      onClose={props.onClose}
    >
      {!props.selectedEmail || !props.emailEdit ? (
        <div className="text-sm text-slate-300">No email selected.</div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-24 shrink-0 text-xs text-slate-300">Company</div>
            <input
              className="w-full rounded-xl bg-slate-950/40 px-3 py-2 text-sm ring-1 ring-white/10 outline-none focus:ring-indigo-400/30"
              value={props.emailEdit.company}
              onChange={(e) =>
                props.setEmailEdit({
                  ...props.emailEdit!,
                  company: e.target.value,
                })
              }
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="w-24 shrink-0 text-xs text-slate-300">Position</div>
            <input
              className="w-full rounded-xl bg-slate-950/40 px-3 py-2 text-sm ring-1 ring-white/10 outline-none focus:ring-indigo-400/30"
              value={props.emailEdit.position}
              onChange={(e) =>
                props.setEmailEdit({
                  ...props.emailEdit!,
                  position: e.target.value,
                })
              }
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="w-24 shrink-0 text-xs text-slate-300">Status</div>
            <select
              className="w-full rounded-xl bg-slate-950/40 px-3 py-2 text-sm ring-1 ring-white/10 outline-none focus:ring-indigo-400/30"
              value={props.emailEdit.status}
              onChange={(e) =>
                props.setEmailEdit({
                  ...props.emailEdit!,
                  status: e.target.value as JobStatus,
                })
              }
            >
              {props.jobStatus.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-24 shrink-0 text-xs text-slate-300">Event</div>
            <input
              className="w-full rounded-xl bg-slate-950/40 px-3 py-2 text-sm ring-1 ring-white/10 outline-none focus:ring-indigo-400/30"
              value={props.emailEdit.eventType}
              onChange={(e) =>
                props.setEmailEdit({
                  ...props.emailEdit!,
                  eventType: e.target.value,
                })
              }
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              className="rounded-xl bg-indigo-500/20 px-3 py-2 text-xs font-semibold ring-1 ring-indigo-400/30 hover:bg-indigo-500/30 disabled:opacity-60"
              disabled={props.busy}
              onClick={props.onSave}
            >
              Save
            </button>

            <button
              type="button"
              className="rounded-xl bg-white/5 px-3 py-2 text-xs font-semibold ring-1 ring-white/10 hover:bg-white/10 disabled:opacity-60"
              disabled={props.busy}
              onClick={props.onReset}
            >
              Reset
            </button>
          </div>
        </div>
      )}
    </ModalShell>
  );
}
