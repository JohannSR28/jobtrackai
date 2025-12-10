"use client";

import { useAuth } from "@/hooks/useAuth";
import { redirect } from "next/navigation";
import { useGmailConnection } from "@/hooks/useGmailConnection";
import { useGmailEmails } from "@/hooks/useGmailEmails";
import GoToMainButton from "@/components/go-to-main";

export default function MailConnectionsTestPage() {
  const { user, loading: authLoading } = useAuth();
  const {
    connected,
    loading: connLoading,
    error: connError,
    connect,
    revoke,
    refetch,
  } = useGmailConnection();

  const {
    emails,
    loading: emailsLoading,
    error: emailsError,
    fetchRecentEmails,
  } = useGmailEmails();

  // --- Redirection si non authentifié ---
  if (authLoading) return <p className="text-center p-6">Chargement...</p>;
  if (!user)
    return (
      <div className="p-6 text-center space-y-4">
        <button
          onClick={() => redirect("/")}
          className="mb-4 bg-gray-100 px-3 py-1.5 rounded cursor-pointer text-sm"
        >
          Back to Main
        </button>
        <h1 className="text-2xl font-semibold">Connexion requise</h1>
        <p className="text-gray-700">
          Vous devez être connecté pour tester la connexion Gmail.
        </p>
        <a
          href="/auth/login"
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Se connecter
        </a>
      </div>
    );

  // --- Lecture des e-mails (50 derniers) ---
  const handleFetchEmails = () => {
    if (!connected)
      return alert("Veuillez d'abord connecter votre compte Gmail.");
    fetchRecentEmails();
  };

  return (
    <main className="max-w-3xl mx-auto p-8 space-y-8 text-center">
      <GoToMainButton />
      <h1 className="text-3xl font-bold">Bloc B — Connexion à Gmail</h1>
      <p className="text-gray-600">
        Test de connexion OAuth et récupération des 50 derniers e-mails.
      </p>

      {/* --- Boutons de connexion --- */}
      <div className="flex justify-center gap-3">
        {!connected ? (
          <button
            onClick={connect}
            disabled={connLoading}
            className={`px-4 py-2 rounded text-white shadow-md ${
              connLoading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {connLoading ? "Connexion..." : "Connecter Gmail"}
          </button>
        ) : (
          <button
            onClick={revoke}
            disabled={connLoading}
            className={`px-4 py-2 rounded text-white shadow-md ${
              connLoading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {connLoading ? "Révocation..." : "Révoquer l’accès"}
          </button>
        )}

        <button
          onClick={refetch}
          className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded shadow-md"
        >
          Vérifier statut
        </button>
      </div>

      {/* --- Statuts / Erreurs --- */}
      {connError && <p className="text-red-500">Erreur Gmail : {connError}</p>}
      {emailsError && <p className="text-red-500">{emailsError}</p>}
      {connected && (
        <p className="text-green-600 font-medium">
          ✅ Gmail connecté avec succès.
        </p>
      )}
      {!connected && !connLoading && (
        <p className="text-gray-600">⚠️ Aucun compte Gmail connecté.</p>
      )}

      {/* --- Bouton pour récupérer les 50 derniers e-mails --- */}
      <div className="mt-6">
        <button
          onClick={handleFetchEmails}
          disabled={!connected || emailsLoading}
          className={`px-4 py-2 text-white rounded shadow-md transition ${
            !connected
              ? "bg-gray-300 cursor-not-allowed"
              : emailsLoading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-indigo-600 hover:bg-indigo-700"
          }`}
        >
          {emailsLoading ? "Chargement..." : "Afficher les 50 derniers mails"}
        </button>
      </div>

      {/* --- Liste des e-mails --- */}
      {emails.length > 0 && (
        <div className="text-left mt-8 space-y-3">
          <h2 className="text-lg font-semibold text-gray-800">
            Résultats ({emails.length} e-mails)
          </h2>
          {emails.map((msg) => (
            <div key={msg.id} className="border p-3 rounded bg-gray-50">
              <p className="font-medium text-gray-900">{msg.subject}</p>
              <p className="text-sm text-gray-700">{msg.from}</p>
              <p className="text-sm text-gray-500 mt-1">{msg.content}</p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
