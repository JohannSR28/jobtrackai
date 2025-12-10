export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 border-b border-gen-border bg-white relative overflow-hidden">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="mb-20 max-w-3xl">
          <h2 className="gen-typo text-[56px] leading-[0.92] tracking-[-2.5px] max-w-[800px] mb-6 md:text-[42px] md:tracking-[-2px]">
            COMMENT ÇA MARCHE ?
          </h2>
          <p className="text-xl text-gray-500 font-medium">
            Trois étapes simples. Zéro configuration complexe.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="group relative bg-gen-bg border border-gen-border rounded-2xl p-8 transition-transform duration-500 hover:-translate-y-2 overflow-hidden h-full flex flex-col justify-between">
            <div>
              <div className="absolute top-0 right-0 p-6 opacity-10 font-bold text-9xl -mt-6 -mr-6 select-none group-hover:text-brand-orange transition-colors duration-500 font-sans">
                1
              </div>
              <div className="w-14 h-14 bg-white border border-gen-border rounded-xl flex items-center justify-center mb-8 shadow-sm group-hover:scale-110 transition-transform duration-300 relative z-10 text-black">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
              </div>
              <h3 className="gen-typo text-[28px] tracking-[-1px] mb-3 relative z-10 md:text-[24px]">
                CONNECTEZ VOTRE<br />COMPTE
              </h3>
              <p className="text-gray-500 text-sm font-medium relative z-10">
                Liez votre boîte mail (Gmail/Outlook) via notre protocole sécurisé.
              </p>
            </div>
            <div className="mt-8 h-1.5 w-12 bg-gray-300 rounded-full group-hover:w-full group-hover:bg-brand-orange transition-all duration-500"></div>
          </div>

          {/* Card 2 */}
          <div className="group relative bg-gen-bg border border-gen-border rounded-2xl p-8 transition-transform duration-500 hover:-translate-y-2 overflow-hidden h-full flex flex-col justify-between">
            <div>
              <div className="absolute top-0 right-0 p-6 opacity-10 font-bold text-9xl -mt-6 -mr-6 select-none group-hover:text-brand-orange transition-colors duration-500 font-sans">
                2
              </div>
              <div className="w-14 h-14 bg-white border border-gen-border rounded-xl flex items-center justify-center mb-8 shadow-sm group-hover:scale-110 transition-transform duration-300 relative z-10 text-black">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L12 3Z"/></svg>
              </div>
              <h3 className="gen-typo text-[28px] tracking-[-1px] mb-3 relative z-10 md:text-[24px]">
                ANALYSE IA<br />AUTOMATIQUE
              </h3>
              <p className="text-gray-500 text-sm font-medium relative z-10">
                Notre algorithme scanne et identifie les opportunités.
              </p>
            </div>
            <div className="mt-8 h-1.5 w-12 bg-gray-300 rounded-full group-hover:w-full group-hover:bg-brand-orange transition-all duration-500 delay-75"></div>
          </div>

          {/* Card 3 */}
          <div className="group relative bg-gen-black text-white rounded-2xl p-8 transition-transform duration-500 hover:-translate-y-2 overflow-hidden shadow-2xl h-full flex flex-col justify-between border border-gray-800">
            <div>
              <div className="absolute top-0 right-0 p-6 opacity-20 font-bold text-9xl -mt-6 -mr-6 select-none font-sans">
                3
              </div>
              <div className="w-14 h-14 bg-white/10 border border-white/20 rounded-xl flex items-center justify-center mb-8 backdrop-blur-sm group-hover:scale-110 transition-transform duration-300 relative z-10 text-white">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="1"/><path d="M3 10h18"/><path d="M10 21V10"/></svg>
              </div>
              <h3 className="gen-typo text-[28px] tracking-[-1px] mb-3 text-brand-orange relative z-10 md:text-[24px]">
                DASHBOARD<br />LIVE
              </h3>
              <p className="text-gray-400 text-sm font-medium relative z-10">
                Suivez l'évolution en temps réel sur votre tableau de bord.
              </p>
            </div>
            <div className="mt-8 h-1.5 w-12 bg-gray-700 rounded-full group-hover:w-full group-hover:bg-brand-orange transition-all duration-500 delay-150"></div>
          </div>
        </div>
      </div>
    </section>
  );
}