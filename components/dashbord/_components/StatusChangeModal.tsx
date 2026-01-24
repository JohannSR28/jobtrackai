// app/job-domain-test-fake/_components/StatusChangeModal.tsx
"use client";

import type { JobStatus } from "@/app/_fake/fakeJobDomainData";
import { ModalShell, statusTextClass, statusDotClass } from "./ui";

export function StatusChangeModal(props: {
  open: boolean;
  currentStatus: JobStatus;
  onClose: () => void;
  onConfirm: (newStatus: JobStatus) => void;
  busy: boolean;
}) {
  const statuses: JobStatus[] = [
    "applied",
    "interview",
    "offer",
    "rejection",
    "unknown",
  ];

  return (
    <ModalShell
      open={props.open}
      title="Change status"
      subtitle="Select a new status for this application"
      onClose={props.onClose}
    >
      <div className="space-y-2">
        <div className="text-xs text-slate-400 mb-3">
          Current status:{" "}
          <span
            className={[
              "font-semibold",
              statusTextClass(props.currentStatus),
            ].join(" ")}
          >
            {props.currentStatus}
          </span>
        </div>

        <div className="grid gap-2">
          {statuses.map((status) => {
            const isCurrent = status === props.currentStatus;

            return (
              <button
                key={status}
                type="button"
                disabled={props.busy || isCurrent}
                onClick={() => {
                  if (
                    window.confirm(
                      `Are you sure you want to change the status to "${status}"?`
                    )
                  ) {
                    props.onConfirm(status);
                  }
                }}
                className={[
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold ring-1 transition-all",
                  isCurrent
                    ? "bg-white/10 ring-white/20 cursor-not-allowed opacity-60"
                    : "bg-white/5 ring-white/10 hover:bg-white/10 hover:ring-white/20",
                ].join(" ")}
              >
                <span
                  className={[
                    "h-3 w-3 rounded-full",
                    statusDotClass(status),
                  ].join(" ")}
                />
                <span className={statusTextClass(status)}>{status}</span>
                {isCurrent ? (
                  <span className="ml-auto text-xs text-slate-400">
                    (current)
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="pt-2">
          <button
            type="button"
            className="w-full rounded-xl bg-white/5 px-3 py-2 text-xs font-semibold ring-1 ring-white/10 hover:bg-white/10"
            onClick={props.onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
