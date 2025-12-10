'use client';

import { useState } from "react";

export default function Benefits() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <section className="bg-gen-black text-white py-32 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-brand-orange opacity-[0.08] blur-[150px] rounded-full pointer-events-none"></div>

        <div className="max-w-[1200px] mx-auto px-6 relative z-10 text-center">
          <span className="inline-block py-2 px-5 rounded-full bg-brand-orange/15 border border-brand-orange/40 backdrop-blur-md text-brand-orange shadow-[0_0_15px_rgba(255,159,67,0.1)] text-xs font-mono uppercase tracking-widest mb-8 font-bold">
            Offre de lancement
          </span>

          <h2 className="gen-typo text-[56px] leading-[0.92] tracking-[-2.5px] max-w-[800px] mx-auto mb-10 text-white md:text-[42px] md:tracking-[-2px]">
            NE PERDEZ PLUS JAMAIS<br />
            <span className="text-brand-orange">UNE OPPORTUNITÉ</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mt-20 text-left">
            {[
              { title: "GAIN DE TEMPS", desc: "Fini les fichiers Excel manuels. Tout est automatisé." },
              { title: "CENTRALISATION", desc: "Tout au même endroit." },
              { title: "NOTIFICATIONS", desc: "Soyez alerté dès qu'un recruteur vous répond." },
              { title: "CONFIDENTIALITÉ", desc: "Vos données sont chiffrées." },
            ].map((item, i) => (
              <div key={i} className="border-t border-white/20 pt-8">
                <h4 className="gen-typo text-xl mb-3 text-white">{item.title}</h4>
                <p className="text-gray-400 text-sm font-medium">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-20">
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-brand-orange text-black px-12 py-5 rounded-full font-bold text-lg hover:bg-brand-orange-hover hover:shadow-[0_0_50px_rgba(255,159,67,0.5)] active:scale-95 transition-all duration-200 uppercase tracking-tight transform"
            >
              Activer mes 500 points offerts
            </button>
            <p className="text-xs text-gray-500 mt-6 font-mono">
              PAS DE CARTE BANCAIRE REQUISE.
            </p>
          </div>
        </div>
      </section>

      {/* --- MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          ></div>
          <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl p-8 animate-fade-in border border-gray-100">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-black"
            >
              ✕
            </button>

            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-brand-orange text-white rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-orange-100 shadow-lg">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/></svg>
              </div>
              <h3 className="gen-typo text-2xl mb-2 tracking-tight">ACTIVER MES POINTS</h3>
              <p className="text-gray-500 text-sm">Entrez vos coordonnées pour débloquer 500 crédits.</p>
            </div>

            <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
              <input type="text" placeholder="Nom complet" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 font-medium focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange" />
              <input type="email" placeholder="Adresse E-mail" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 font-medium focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange" />
              <button type="submit" className="w-full bg-gen-black text-white font-bold py-4 rounded-xl hover:bg-gray-900 transition-colors uppercase tracking-wide text-sm">
                Confirmer l'inscription →
              </button>
            </form>
            <p className="text-center text-[10px] text-gray-400 mt-6">En cliquant, vous acceptez nos conditions.</p>
          </div>
        </div>
      )}
    </>
  );
}