"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth"; // Assure-toi que le chemin est bon

export default function RootPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    // Si le chargement est terminé
    if (!loading) {
      if (user) {
        // 1. Utilisateur connecté -> Dashboard
        router.replace("/dashboard");
      } else {
        // 2. Pas connecté -> Login
        router.replace("/login-page");
      }
    }
  }, [user, loading, router]);

  // --- ÉCRAN DE CHARGEMENT (Style GenLabs) ---
  // On l'affiche tant que 'loading' est vrai OU tant qu'on n'a pas encore redirigé
  return (
    <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center font-sans text-gray-500">
      <div className="flex flex-col items-center gap-4 animate-in fade-in duration-500">
        {/* Le Spinner Orange */}
        <div className="w-10 h-10 rounded-full border-2 border-gray-200 border-t-[#ff9f43] animate-spin"></div>

        {/* Le Texte Typo GenLabs */}
        <span className="gen-typo text-xs font-bold tracking-[0.2em] text-black">
          LOADING...
        </span>
      </div>
    </div>
  );
}
