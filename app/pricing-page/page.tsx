"use client";

import { useLanguage } from "@/hooks/useLanguage";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

const PRICING_PLANS = [
  {
    credits: 500,
    price: 5,
    // ID du tarif à 5$
    stripePriceId: "price_1SuOfpHfMNgr7gopmTHUrn1v",
    popular: false,
  },
  {
    credits: 1000,
    price: 8,
    // ID du tarif à 8$
    stripePriceId: "price_1SuOfpHfMNgr7gopyiC8kpEK",
    popular: true,
  },
  {
    credits: 2000,
    price: 12,
    // ID du tarif à 12$
    stripePriceId: "price_1Sv3oQHfMNgr7gopvphLGBKI",
    popular: false,
  },
];

const translations = {
  fr: {
    badge: "Tarification simple",
    title: "ACHETEZ VOS CRÉDITS",
    subtitle:
      "Payez uniquement pour ce que vous utilisez. Toutes les fonctionnalités sont incluses.",
    credits: "crédits",
    popular: "Populaire",
    buyNow: "Acheter",
    loginToBuy: "Se connecter pour acheter", // Nouveau texte
    processing: "Redirection...", // Nouveau texte
    features: [
      "Suivi illimité des candidatures",
      "Analyse IA des réponses",
      "Tableau de bord complet",
      "Support prioritaire",
    ],
    allFeatures: "Toutes les fonctionnalités incluses",
    howItWorks: "Comment ça marche ?",
    step1: "Choisissez",
    step1Desc: "Sélectionnez vos crédits",
    step2: "Payez",
    step2Desc: "Paiement sécurisé Stripe",
    step3: "Utilisez",
    step3Desc: "Crédits disponibles instantanément",
    faq: "Questions fréquentes",
    q1: "Que puis-je faire avec mes crédits ?",
    a1: "Chaque crédit vous permet de tracker une candidature et recevoir des notifications lorsqu'un recruteur répond.",
    q2: "Les crédits expirent-ils ?",
    a2: "Non, vos crédits n'expirent jamais. Utilisez-les à votre rythme.",
    q3: "Que se passe-t-il si je supprime mon compte ?",
    a3: "Si vous supprimez votre compte, vous perdez vos crédits restants. Aucun remboursement n'est possible.",
    goBack: "← Retour",
  },
  en: {
    badge: "Simple pricing",
    title: "BUY YOUR CREDITS",
    subtitle: "Pay only for what you use. All features included.",
    credits: "credits",
    popular: "Popular",
    buyNow: "Buy now",
    loginToBuy: "Log in to buy",
    processing: "Redirecting...",
    features: [
      "Unlimited application tracking",
      "AI response analysis",
      "Complete dashboard",
      "Priority support",
    ],
    allFeatures: "All features included",
    howItWorks: "How it works?",
    step1: "Choose",
    step1Desc: "Select your credits",
    step2: "Pay",
    step2Desc: "Secure Stripe payment",
    step3: "Use",
    step3Desc: "Credits available instantly",
    faq: "FAQ",
    q1: "What can I do with my credits?",
    a1: "Each credit allows you to track an application and receive notifications when a recruiter responds.",
    q2: "Do credits expire?",
    a2: "No, your credits never expire. Use them at your own pace.",
    q3: "What happens if I delete my account?",
    a3: "If you delete your account, you lose your remaining credits. No refunds are possible.",
    goBack: "← Back",
  },
};

export default function Pricing() {
  const { language } = useLanguage();
  const t = translations[language];

  // Hook d'auth pour vérifier la connexion
  const { user } = useAuth();

  const [selectedPlan, setSelectedPlan] = useState<number>(1);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  // État pour savoir quelle carte est en train de charger
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);

  const router = useRouter();

  //  LA FONCTION D'ACHAT
  const handleBuy = async (planIndex: number) => {
    const plan = PRICING_PLANS[planIndex];

    // 1. Si pas connecté -> Redirection vers login
    if (!user) {
      router.push(`/login?next=/pricing-page`);
      return;
    }

    // 2. Si connecté -> On lance le paiement
    setLoadingIndex(planIndex);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          priceId: plan.stripePriceId,
          credits: plan.credits,
        }),
      });

      const data = await response.json();

      if (data.url) {
        // 3. Redirection vers Stripe
        window.location.href = data.url;
      } else {
        console.error("Erreur Stripe:", data.error);
        alert("Une erreur est survenue lors de l'initialisation du paiement.");
        setLoadingIndex(null);
      }
    } catch (error) {
      console.error("Erreur fetch:", error);
      alert("Erreur de connexion au serveur.");
      setLoadingIndex(null);
    }
  };

  return (
    <div className="min-h-screen w-full bg-white flex flex-col relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute top-20 right-10 w-64 h-64 bg-brand-orange/5 rounded-full blur-3xl animate-pulse pointer-events-none"></div>
      <div
        className="absolute bottom-40 left-10 w-96 h-96 bg-brand-orange/5 rounded-full blur-3xl animate-pulse pointer-events-none"
        style={{ animationDelay: "1s" }}
      ></div>

      {/* Header */}
      <header className="fixed top-0 left-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-[1440px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white font-bold text-lg group-hover:bg-brand-orange transition-colors duration-300">
              J
            </div>
            <span className="font-bold text-xl tracking-tight text-black">
              JobTrackAI
            </span>
          </Link>
          <button
            onClick={() => router.back()}
            className="text-sm font-semibold text-gray-600 hover:text-brand-orange transition-colors"
          >
            {t.goBack}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pt-24 pb-16 relative z-10">
        <section className="max-w-[1000px] mx-auto px-6 py-12 text-center">
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 bg-brand-orange/10 border border-brand-orange/30 rounded-full">
            <span className="text-brand-orange font-bold text-[10px] uppercase tracking-widest">
              {t.badge}
            </span>
          </div>

          <h1 className="gen-typo text-[42px] sm:text-[52px] leading-[0.95] tracking-[-2px] mb-4 text-black">
            {t.title}
          </h1>

          <p className="text-base text-gray-500 font-medium max-w-lg mx-auto">
            {t.subtitle}
          </p>
        </section>

        {/* Pricing Cards */}
        <section className="max-w-[1100px] mx-auto px-6 mb-16 mt-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {PRICING_PLANS.map((plan, index) => (
              <div
                key={index}
                // On garde la sélection visuelle
                onClick={() => setSelectedPlan(index)}
                onMouseEnter={() => setHoveredCard(index)}
                onMouseLeave={() => setHoveredCard(null)}
                className={`relative bg-white border-2 rounded-2xl p-6 transition-all duration-500 cursor-pointer ${
                  plan.popular
                    ? "border-brand-orange shadow-[0_20px_50px_rgba(255,159,67,0.2)]"
                    : selectedPlan === index
                      ? "border-brand-orange shadow-lg"
                      : "border-gray-200 hover:border-brand-orange/50 hover:shadow-md"
                }`}
                style={{
                  transform:
                    hoveredCard === index
                      ? "scale(1.08) rotate(0deg)"
                      : index === 0
                        ? "rotate(2deg)"
                        : index === 2
                          ? "rotate(-2deg)"
                          : "none",
                }}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-brand-orange text-black text-[10px] font-bold uppercase tracking-widest rounded-full shadow-lg animate-bounce">
                    {t.popular}
                  </div>
                )}

                <div className="text-center mb-6 relative">
                  <div className="absolute inset-0 flex items-center justify-center opacity-5">
                    <span className="text-8xl font-black text-brand-orange">
                      {index + 1}
                    </span>
                  </div>
                  <div className="relative">
                    <div className="text-4xl font-bold text-black mb-1">
                      {plan.credits}
                    </div>
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {t.credits}
                    </div>
                  </div>
                </div>

                <div className="text-center mb-6 pb-6 border-b border-gray-200">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold text-black">
                      ${plan.price}
                    </span>
                    <span className="text-gray-500 text-xs font-semibold">
                      CAD
                    </span>
                  </div>
                </div>

                {/* BOUTON D'ACTION */}
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // Évite de déclencher le onClick de la div parente
                    handleBuy(index);
                  }}
                  disabled={loadingIndex !== null} // Désactive si un chargement est en cours
                  className={`w-full py-3 rounded-xl font-bold text-sm uppercase tracking-tight transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                    plan.popular
                      ? "bg-brand-orange text-black hover:bg-brand-orange-hover hover:shadow-[0_0_20px_rgba(255,159,67,0.4)] hover:scale-105"
                      : selectedPlan === index
                        ? "bg-black text-white hover:bg-gray-800"
                        : "bg-gray-100 text-gray-700 hover:bg-black hover:text-white"
                  }`}
                >
                  {/* Texte dynamique selon l'état */}
                  {loadingIndex === index
                    ? t.processing
                    : !user
                      ? t.loginToBuy
                      : t.buyNow}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="max-w-[900px] mx-auto px-6 mb-16">
          <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-2xl p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-orange/5 rounded-full blur-2xl"></div>
            <h3 className="gen-typo text-xl tracking-[-0.5px] mb-6 flex items-center gap-2">
              <span className="w-2 h-2 bg-brand-orange rounded-full animate-pulse"></span>
              {t.allFeatures}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {t.features.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 group"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="w-5 h-5 bg-brand-orange/15 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-brand-orange/30 transition-colors">
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-brand-orange"
                    >
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {feature}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="max-w-[1200px] mx-auto px-6 mb-20">
          <h2 className="gen-typo text-[42px] sm:text-[56px] leading-[0.92] tracking-[-2px] text-center mb-16">
            {t.howItWorks}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: t.step1, desc: t.step1Desc, icon: "1" },
              { title: t.step2, desc: t.step2Desc, icon: "2" },
              { title: t.step3, desc: t.step3Desc, icon: "3" },
            ].map((step, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-brand-orange text-black rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6 shadow-lg">
                  {step.icon}
                </div>
                <h4 className="gen-typo text-xl mb-3 tracking-[-0.5px]">
                  {step.title}
                </h4>
                <p className="text-sm text-gray-500 font-medium">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ Mini */}
        <section className="max-w-[900px] mx-auto px-6">
          <h3 className="gen-typo text-3xl sm:text-4xl tracking-[-1.5px] mb-10 text-center">
            {t.faq}
          </h3>
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6 hover:border-brand-orange transition-colors">
              <h4 className="font-bold text-lg mb-2 text-black">{t.q1}</h4>
              <p className="text-gray-600 text-sm font-medium leading-relaxed">
                {t.a1}
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6 hover:border-brand-orange transition-colors">
              <h4 className="font-bold text-lg mb-2 text-black">{t.q2}</h4>
              <p className="text-gray-600 text-sm font-medium leading-relaxed">
                {t.a2}
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6 hover:border-brand-orange transition-colors">
              <h4 className="font-bold text-lg mb-2 text-black">{t.q3}</h4>
              <p className="text-gray-600 text-sm font-medium leading-relaxed">
                {t.a3}
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
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
