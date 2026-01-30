"use client";

import { ModalShell } from "./ui";
import { useLanguage } from "@/hooks/useLanguage";

const translations = {
  fr: {
    title: "AUTORISATION REQUISE",
    subtitle: "Accès à la boîte mail nécessaire",
    descriptionPart1:
      "Pour analyser vos candidatures, JobTrack a besoin de l'autorisation de lire vos emails via",
    cancel: "Annuler",
    authorize: "Autoriser l'accès",
  },
  en: {
    title: "AUTHORIZATION REQUIRED",
    subtitle: "Email access required",
    descriptionPart1:
      "To analyze your applications, JobTrack needs permission to read your emails via",
    cancel: "Cancel",
    authorize: "Authorize access",
  },
};

export function MailConnectModal(props: {
  open: boolean;
  onClose: () => void;
  onConnect: () => void;
  providerName: string;
}) {
  const { language } = useLanguage();
  const t = translations[language];

  return (
    <ModalShell
      open={props.open}
      onClose={props.onClose}
      title={t.title}
      subtitle={t.subtitle}
    >
      <div className="space-y-6 text-sm text-gray-600">
        <p>
          {t.descriptionPart1} <strong>{props.providerName}</strong>.
        </p>
        <div className="flex justify-end gap-3 border-t border-gray-100 pt-6">
          <button
            onClick={props.onClose}
            className="rounded-xl px-4 py-3 font-semibold text-gray-500 hover:text-black hover:bg-gray-100 transition-colors"
          >
            {t.cancel}
          </button>
          <button
            onClick={props.onConnect}
            className="rounded-xl bg-[#ff9f43] px-6 py-3 font-bold text-black hover:bg-[#e68e3c] transition-all hover:shadow-lg shadow-orange-500/20"
          >
            {t.authorize}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
