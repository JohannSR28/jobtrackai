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
    } | null,
  ) => void;

  onClose: () => void;

  busy: boolean;
  onSave: () => void;
  onReset: () => void;
}) {
  const inputClass =
    "w-full rounded-xl bg-white border border-gray-200 px-4 py-2.5 text-sm font-medium text-black outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-all placeholder:text-gray-300 shadow-sm";
  const labelClass =
    "w-24 shrink-0 text-xs font-bold text-gray-500 uppercase tracking-wide";

  return (
    <ModalShell
      open={props.open}
      title="EDIT EMAIL"
      subtitle={props.selectedEmail?.subject ?? undefined}
      onClose={props.onClose}
    >
      {!props.selectedEmail || !props.emailEdit ? (
        <div className="text-sm text-gray-500 font-medium">
          No email selected.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className={labelClass}>Company</div>
            <input
              className={inputClass}
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
            <div className={labelClass}>Position</div>
            <input
              className={inputClass}
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
            <div className={labelClass}>Status</div>
            <div className="relative w-full">
              <select
                className={`${inputClass} appearance-none cursor-pointer`}
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
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={labelClass}>Event</div>
            <input
              className={inputClass}
              value={props.emailEdit.eventType}
              onChange={(e) =>
                props.setEmailEdit({
                  ...props.emailEdit!,
                  eventType: e.target.value,
                })
              }
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-2">
            <button
              type="button"
              className="rounded-xl bg-white px-4 py-2 text-xs font-bold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
              disabled={props.busy}
              onClick={props.onReset}
            >
              Reset
            </button>
            <button
              type="button"
              className="rounded-xl bg-brand-orange px-6 py-2 text-xs font-bold text-black hover:bg-brand-orange-hover shadow-md hover:shadow-lg disabled:opacity-50 transition-all"
              disabled={props.busy}
              onClick={props.onSave}
            >
              Save Changes
            </button>
          </div>
        </div>
      )}
    </ModalShell>
  );
}
