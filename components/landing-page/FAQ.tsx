export default function FAQ() {
  return (
    <section id="faq" className="border-b border-gen-border bg-gen-bg">
      <div className="grid grid-cols-1 lg:grid-cols-3 max-w-[1440px] mx-auto">
        <div className="p-12 lg:p-20 border-b lg:border-b-0 lg:border-r border-gen-border bg-white">
          <h2 className="gen-typo text-[42px] leading-[0.92] tracking-[-2.5px] mb-6">
            QUESTIONS<br />FRÉQUENTES
          </h2>
          <p className="text-gray-500 font-medium">Vous avez des doutes ?</p>
          <a href="#" className="block mt-8 text-sm font-bold underline decoration-2 underline-offset-4 hover:text-brand-orange uppercase tracking-wide">
            Contacter le support →
          </a>
        </div>

        <div className="lg:col-span-2 p-12 lg:p-20 space-y-10">
          <div>
            <h4 className="gen-typo text-[22px] mb-3 tracking-[-1px]">
              COMMENT JOBTRACKAI DÉTECTE-T-IL MES CANDIDATURES ?
            </h4>
            <p className="text-gray-600 font-medium text-sm leading-relaxed max-w-2xl">
              L’outil utilise des modèles IA pour analyser vos e-mails entrants et
              identifier automatiquement les messages de confirmation.
            </p>
          </div>
          <div className="w-full h-px bg-gray-200"></div>
          <div>
            <h4 className="gen-typo text-[22px] mb-3 tracking-[-1px]">
              MES DONNÉES SONT-ELLES SÉCURISÉES ?
            </h4>
            <p className="text-gray-600 font-medium text-sm leading-relaxed max-w-2xl">
              Oui. API officielle Gmail/Outlook, chiffrement de bout en bout.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}