"use client";

import GoToMainButton from "@/components/go-to-main";
import { useApplications } from "@/hooks/useApplication";

function formatDate(ts: number | null): string {
  if (!ts) return "Date inconnue";
  const d = new Date(ts);
  return d.toLocaleString();
}

function formatStatus(status: string | null): string {
  if (!status) return "inconnu";
  switch (status) {
    case "applied":
      return "Candidature envoyée";
    case "in_review":
      return "En revue";
    case "interview":
      return "Entretien";
    case "offer":
      return "Offre";
    case "rejected":
      return "Refusé";
    case "manual":
      return "Statut manuel";
    default:
      return status;
  }
}

export default function ApplicationsTestPage() {
  const {
    applications,
    loadingList,
    errorList,
    selectedApplicationId,
    selectedDetail,
    loadingDetail,
    errorDetail,
    selectApplication,
  } = useApplications();

  return (
    <main>
      <GoToMainButton />
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-stretch">
        <div className="w-full max-w-6xl mx-auto flex flex-col md:flex-row gap-6 p-4 md:p-8">
          {/* Colonne gauche : liste des candidatures */}
          <section className="md:w-1/3 w-full space-y-4">
            <header className="space-y-2">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                Test Candidatures
              </h1>
              <p className="text-sm text-slate-300">
                Liste des candidatures détectées par JobTrackAI. Clique sur une
                candidature pour voir les emails associés.
              </p>
            </header>

            {loadingList && applications.length === 0 && (
              <p className="text-sm text-slate-400">
                Chargement des candidatures…
              </p>
            )}

            {errorList && (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
                {errorList}
              </div>
            )}

            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              {applications.map((app) => {
                const isSelected = app.id === selectedApplicationId;
                const label =
                  (app.company ?? "Entreprise inconnue") +
                  (app.role ? ` – ${app.role}` : "");
                return (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => selectApplication(app.id)}
                    className={[
                      "w-full text-left rounded-2xl border px-4 py-3 transition-colors",
                      "hover:border-emerald-400/70 hover:bg-slate-900/70",
                      isSelected
                        ? "border-emerald-500 bg-slate-900/80"
                        : "border-slate-800 bg-slate-900/40",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm line-clamp-2">
                        {label}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-200">
                        {formatStatus(app.current_status)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Dernière activité :{" "}
                      {app.last_email_date_ts
                        ? formatDate(app.last_email_date_ts)
                        : "N/A"}
                    </p>
                  </button>
                );
              })}

              {!loadingList && applications.length === 0 && !errorList && (
                <p className="text-sm text-slate-400">
                  Aucune candidature détectée pour le moment.
                </p>
              )}
            </div>
          </section>

          {/* Colonne droite : détail + timeline d'emails */}
          <section className="md:w-2/3 w-full rounded-2xl border border-slate-800 bg-slate-900/60 p-4 md:p-6 flex flex-col">
            {selectedApplicationId == null && (
              <div className="m-auto text-center space-y-2">
                <p className="text-lg font-semibold">
                  Sélectionne une candidature à gauche
                </p>
                <p className="text-sm text-slate-300">
                  Tu verras ici la timeline des emails liés à une application
                  (ordre chronologique).
                </p>
              </div>
            )}

            {selectedApplicationId != null && (
              <>
                {loadingDetail && !selectedDetail && (
                  <p className="text-sm text-slate-400">
                    Chargement des emails de la candidature…
                  </p>
                )}

                {errorDetail && (
                  <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200 mb-3">
                    {errorDetail}
                  </div>
                )}

                {selectedDetail && (
                  <div className="flex-1 flex flex-col gap-4">
                    {/* En-tête candidature */}
                    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-1">
                      <h2 className="text-lg font-semibold">
                        {selectedDetail.application.company ??
                          "Entreprise inconnue"}
                        {selectedDetail.application.role
                          ? ` – ${selectedDetail.application.role}`
                          : ""}
                      </h2>
                      <p className="text-sm text-slate-300">
                        Statut actuel :{" "}
                        <span className="font-medium">
                          {formatStatus(
                            selectedDetail.application.current_status
                          )}
                        </span>
                      </p>
                      <p className="text-xs text-slate-400">
                        Dernier email :{" "}
                        {selectedDetail.application.last_email_date_ts
                          ? formatDate(
                              selectedDetail.application.last_email_date_ts
                            )
                          : "inconnu"}
                      </p>
                    </div>

                    {/* Timeline des emails */}
                    <div className="flex-1 rounded-xl border border-slate-800 bg-slate-950/40 p-4 overflow-y-auto">
                      {selectedDetail.emails.length === 0 ? (
                        <p className="text-sm text-slate-400">
                          Aucun email associé à cette candidature pour
                          l&apos;instant.
                        </p>
                      ) : (
                        <ol className="relative border-l border-slate-700/60 pl-4 space-y-4">
                          {selectedDetail.emails.map((email) => (
                            <li key={email.id} className="relative pl-2">
                              <span className="absolute -left-[9px] mt-1 h-3 w-3 rounded-full bg-emerald-500" />
                              <div className="bg-slate-900/70 border border-slate-800 rounded-xl px-3 py-2.5 space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-semibold">
                                    {formatStatus(email.status)}
                                  </span>
                                  <span className="text-[11px] text-slate-400">
                                    {email.email_date_ts
                                      ? formatDate(email.email_date_ts)
                                      : "Date inconnue"}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-300">
                                  {email.company ?? "Entreprise inconnue"}
                                  {email.role ? ` – ${email.role}` : ""}
                                </p>
                                <p className="text-[11px] text-slate-500 break-all">
                                  Message ID : {email.message_id}
                                </p>
                              </div>
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
