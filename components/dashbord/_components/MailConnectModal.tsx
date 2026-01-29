"use client";

import { ModalShell } from "./ui";

export function MailConnectModal(props: {
  open: boolean;
  onClose: () => void;
  onConnect: () => void;
  providerName: string;
}) {
  return (
    <ModalShell
      open={props.open}
      onClose={props.onClose}
      title="AUTORISATION REQUISE"
      subtitle="Accès à la boîte mail nécessaire"
    >
      <div className="space-y-6 text-sm text-gray-600">
        <p>
          Pour analyser vos candidatures, JobTrack a besoin de
          l&apos;autorisation de lire vos emails via{" "}
          <strong>{props.providerName}</strong>.
        </p>
        <div className="flex justify-end gap-3 border-t border-gray-100 pt-6">
          <button
            onClick={props.onClose}
            className="rounded-xl px-4 py-3 font-semibold text-gray-500 hover:text-black hover:bg-gray-100 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={props.onConnect}
            className="rounded-xl bg-[#ff9f43] px-6 py-3 font-bold text-black hover:bg-[#e68e3c] transition-all hover:shadow-lg shadow-orange-500/20"
          >
            Autoriser l&apos;accès
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
