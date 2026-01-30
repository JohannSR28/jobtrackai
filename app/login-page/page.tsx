"use client";

import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const translations = {
  fr: {
    title: "BIENVENUE SUR\nJOBTRACKAI",
    subtitle:
      "Connectez-vous pour accéder à votre tableau de bord et suivre toutes vos candidatures en un seul endroit.",
    googleButton: "Continuer avec Google",
    outlookButton: "Continuer avec Outlook",
    disclaimer: "En vous connectant, vous acceptez nos",
    terms: "Conditions d'utilisation",
    and: "et notre",
    privacy: "Politique de confidentialité",
    backHome: "← Retour à l'accueil", // Lien du bas
    goToLanding: "Aller à l'accueil", // Nouveau lien du header
    genericError: "Une erreur est survenue. Veuillez recommencer plus tard.",
  },
  en: {
    title: "WELCOME TO\nJOBTRACKAI",
    subtitle:
      "Sign in to access your dashboard and track all your applications in one place.",
    googleButton: "Continue with Google",
    outlookButton: "Continue with Outlook",
    disclaimer: "By signing in, you agree to our",
    terms: "Terms of Service",
    and: "and",
    privacy: "Privacy Policy",
    backHome: "← Back to home", // Lien du bas
    goToLanding: "Go to Landing Page", // Nouveau lien du header
    genericError: "An error occurred. Please try again later.",
  },
};

export default function Login() {
  const { language } = useLanguage();
  const t = translations[language];
  const LANDING_URL = "https://jobtrackai-landing-page.vercel.app/";

  // Récupérer les paramètres de l'URL
  const searchParams = useSearchParams();
  const nextRedirect = searchParams.get("next") || "/dashboard";

  const { signIn } = useAuth();
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (provider: "google" | "azure") => {
    setIsBusy(true);
    setError(null);
    try {
      await signIn(provider, nextRedirect);
    } catch (e) {
      console.error(e);
      setError(t.genericError);
      setIsBusy(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-white flex flex-col relative overflow-hidden">
      {/* Gradient orange background */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-brand-orange opacity-[0.03] blur-[120px] rounded-full pointer-events-none"></div>

      {/* Header */}
      <header className="fixed top-0 left-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Section Logo (Gauche) */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white font-bold text-lg group-hover:bg-brand-orange transition-colors duration-300 flex-shrink-0">
              J
            </div>
            <span className="font-bold text-xl tracking-tight text-black hidden sm:block">
              JobTrackAI
            </span>
          </Link>

          {/* Section Droite (Switcher + Bouton Landing Page) */}
          <div className="flex items-center gap-3 sm:gap-6">
            <LanguageSwitcher />

            <Link
              href={LANDING_URL}
              className="text-xs sm:text-sm font-semibold text-gray-600 hover:text-brand-orange transition-colors"
            >
              {t.goToLanding}
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6 pt-24 relative z-10">
        <div className="w-full max-w-[480px]">
          {/* Titre */}
          <div className="text-center mb-12">
            <div className="inline-block mb-6 px-4 py-2 bg-brand-orange/10 border border-brand-orange/30 rounded-full">
              <span className="text-brand-orange font-bold text-xs uppercase tracking-widest">
                {language === "fr" ? "PROPULSÉ PAR L'IA" : "POWERED BY AI"}
              </span>
            </div>
            <h1 className="gen-typo text-[42px] sm:text-[56px] leading-[0.92] tracking-[-2px] sm:tracking-[-2.5px] mb-6 text-black whitespace-pre-line">
              {t.title}
            </h1>
            <p className="text-gray-500 text-base font-medium max-w-md mx-auto">
              {t.subtitle}
            </p>
          </div>

          {/* Zone d'erreur */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm text-center font-medium animate-in fade-in slide-in-from-top-2">
              {error}
            </div>
          )}

          {/* Boutons de connexion */}
          <div className="space-y-4 mb-8">
            {/* Google Button */}
            <button
              onClick={() => handleLogin("google")}
              disabled={isBusy}
              className="w-full bg-white border-2 border-gray-200 rounded-xl px-6 py-4 font-semibold text-base text-gray-700 hover:border-brand-orange hover:bg-brand-orange/5 hover:shadow-[0_0_0_3px_rgba(255,159,67,0.1)] transition-all duration-200 flex items-center justify-center gap-3 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isBusy ? (
                <div className="h-6 w-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
              ) : (
                <>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  <span className="group-hover:text-black transition-colors">
                    {t.googleButton}
                  </span>
                </>
              )}
            </button>

            {/* Outlook Button */}
            <button
              onClick={() => handleLogin("azure")}
              disabled={isBusy}
              className="w-full bg-white border-2 border-gray-200 rounded-xl px-6 py-4 font-semibold text-base text-gray-700 hover:border-brand-orange hover:bg-brand-orange/5 hover:shadow-[0_0_0_3px_rgba(255,159,67,0.1)] transition-all duration-200 flex items-center justify-center gap-3 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isBusy ? (
                <div className="h-6 w-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
              ) : (
                <>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M23 5v14a1 1 0 0 1-1 1h-9v-7.1l7-3.9V5h3z"
                      fill="#0364B8"
                    />
                    <path
                      d="M13 20H2a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h11v16z"
                      fill="#0078D4"
                    />
                    <path d="M13 5h9v4l-9 5V5z" fill="#28A8EA" />
                    <path d="M13 14v6h9v-4l-9-2z" fill="#0078D4" />
                    <path d="M13 8.5v7L22 20V9l-9-.5z" fill="#50D9FF" />
                    <path
                      d="M7 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 8.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z"
                      fill="white"
                    />
                    <path
                      d="M7 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z"
                      fill="white"
                    />
                  </svg>
                  <span className="group-hover:text-black transition-colors">
                    {t.outlookButton}
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Divider decoratif avec accent orange */}
          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-4"></span>
            </div>
          </div>

          {/* Disclaimer */}
          <p className="text-center text-xs text-gray-500 leading-relaxed">
            {t.disclaimer}{" "}
            <a
              href="#"
              className="text-brand-orange font-semibold hover:underline underline-offset-2 transition-all"
            >
              {t.terms}
            </a>{" "}
            {t.and}{" "}
            <a
              href="#"
              className="text-brand-orange font-semibold hover:underline underline-offset-2 transition-all"
            >
              {t.privacy}
            </a>
            .
          </p>

          {/* Back to home (Lien du bas) */}
          <div className="mt-12 text-center">
            <Link
              href="/"
              className="inline-flex items-center text-sm font-semibold text-gray-600 hover:text-brand-orange transition-colors gap-1"
            >
              {t.backHome}
            </Link>
          </div>
        </div>
      </main>

      {/* Footer minimaliste */}
      <footer className="py-6 border-t border-gray-200 relative z-10">
        <div className="max-w-[1440px] mx-auto px-6">
          <p className="text-xs text-gray-400 font-medium text-center">
            © 2026 JOBTRACKAI.{" "}
            {language === "fr" ? "TOUS DROITS RÉSERVÉS" : "ALL RIGHTS RESERVED"}
            .
          </p>
        </div>
      </footer>
    </div>
  );
}
