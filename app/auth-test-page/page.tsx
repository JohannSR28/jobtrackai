"use client";

import { useState } from "react";
import { redirect } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import GoToMainButton from "@/components/go-to-main";

export default function AuthUserFunctionalityPage() {
  const { user, logout, deleteAccount } = useAuth();
  const { profile, loading, error } = useProfile(user?.id ?? null);

  if (!user) redirect("/auth/login");

  const [status, setStatus] = useState<Record<string, boolean>>({});

  const testLogout = async () => {
    await logout();
    setStatus((prev) => ({ ...prev, logout: true }));
    redirect("/auth/login");
  };

  const testDelete = async () => {
    if (confirm("Supprimer le compte ?")) {
      await deleteAccount();
      await logout();
      setStatus((prev) => ({ ...prev, deleteAccount: true }));
      redirect("/auth/login");
    }
  };

  return (
    <main style={styles.main}>
      <GoToMainButton />

      <h1 style={styles.title}>
        Bloc A — Authentification & Compte utilisateur
      </h1>
      <p style={styles.subtitle}>
        Cette page permet de tester les principales fonctionnalités liées à
        l’utilisateur et à la gestion de compte.
      </p>

      {/* Section 1 — Création de compte */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>1. Création de compte</h2>
        <p>
          Le compte utilisateur est créé automatiquement lors de la première
          connexion via Supabase Auth.
        </p>
        <div style={styles.noteBox}>
          Vérifiez dans <code>auth.users</code> que la ligne de l’utilisateur
          existe et contient le bon provider.
        </div>
      </section>

      {/* Section 2 — Connexion / Déconnexion */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>2. Connexion / Déconnexion</h2>
        <pre style={styles.pre}>{JSON.stringify(user, null, 2)}</pre>
        <button onClick={testLogout} style={styles.primaryButton}>
          Se déconnecter
        </button>
        {status.logout && <p style={styles.success}>Déconnexion réussie.</p>}
      </section>

      {/* Section 3 — Suppression du compte */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>3. Suppression du compte</h2>
        <p>
          Supprime définitivement le compte et toutes les données liées grâce au
          <code> ON DELETE CASCADE</code>.
        </p>
        <button onClick={testDelete} style={styles.dangerButton}>
          Supprimer le compte
        </button>
        {status.deleteAccount && (
          <p style={styles.success}>Compte supprimé avec succès.</p>
        )}
      </section>

      {/* Section 4 — Lecture du profil */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>4. Lecture du profil</h2>
        {loading ? (
          <p>Chargement du profil...</p>
        ) : error ? (
          <p style={{ color: "red" }}>{error}</p>
        ) : profile ? (
          <ul>
            <li>ID : {profile.id}</li>
            <li>User ID : {profile.user_id}</li>
            <li>
              Photo :{" "}
              {profile.photo_url ? (
                <a href={profile.photo_url} target="_blank" rel="noreferrer">
                  {profile.photo_url}
                </a>
              ) : (
                "—"
              )}
            </li>
            <li>Créé le : {profile.created_at}</li>
          </ul>
        ) : (
          <p>Aucun profil trouvé.</p>
        )}
      </section>

      {/* Section 5 — Métadonnées automatiques */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>5. Métadonnées automatiques</h2>
        <p>
          Lorsqu’un utilisateur est créé, les éléments suivants sont ajoutés :
        </p>
        <ul>
          <li>
            Une ligne dans la table <code>profiles</code>
          </li>
          <li>
            Une transaction de 3000 points dans <code>credit_transactions</code>
          </li>
        </ul>
        <div style={styles.noteBox}>
          Ces actions sont automatiques via le trigger SQL. Aucun code JS n’est
          nécessaire.
        </div>
      </section>
    </main>
  );
}

/* ------------------------------------
   Styles (20 lignes cohérentes, sobres)
------------------------------------ */
const styles = {
  main: {
    fontFamily: "Inter, sans-serif",
    padding: "2rem",
    maxWidth: "800px",
    margin: "auto",
    color: "#222",
    lineHeight: "1.5",
  },
  title: {
    fontSize: "1.8rem",
    marginBottom: "0.5rem",
  },
  subtitle: {
    color: "#555",
    marginBottom: "2rem",
  },
  section: {
    background: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: "6px",
    padding: "1.2rem",
    marginBottom: "1.5rem",
  },
  sectionTitle: {
    fontSize: "1.2rem",
    marginBottom: "0.8rem",
  },
  pre: {
    background: "#f3f4f6",
    padding: "0.8rem",
    borderRadius: "4px",
    overflowX: "auto" as const,
  },
  noteBox: {
    background: "#fefce8",
    padding: "0.6rem",
    borderLeft: "4px solid #eab308",
    borderRadius: "4px",
    fontSize: "0.9rem",
    marginTop: "0.8rem",
  },
  primaryButton: {
    background: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "4px",
    padding: "0.5rem 1rem",
    cursor: "pointer",
  },
  dangerButton: {
    background: "#dc2626",
    color: "white",
    border: "none",
    borderRadius: "4px",
    padding: "0.5rem 1rem",
    cursor: "pointer",
  },
  backButton: {
    marginBottom: "1rem",
    border: "none",
    background: "#f3f4f6",
    padding: "0.4rem 0.8rem",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "0.9rem",
  },
  success: {
    color: "#16a34a",
    marginTop: "0.5rem",
  },
};
