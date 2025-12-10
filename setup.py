import os

# Contenu EXACT basé sur ton HTML fourni, converti en TSX valide.

files_content = {
    # ---------------------------------------------------------
    # 1. HEADER.tsx
    # ---------------------------------------------------------
    "src/components/Header.tsx": """import Link from "next/link";

export default function Header() {
  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-[1440px] mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white font-bold text-lg">
            J
          </div>
          <span className="font-bold text-xl tracking-tight text-black">
            JobTrackAI
          </span>
        </div>

        <Link
          href="#"
          className="text-sm font-semibold text-gray-600 hover:text-brand-orange transition-colors px-4 py-2"
        >
          Login
        </Link>
      </div>
    </header>
  );
}""",

    # ---------------------------------------------------------
    # 2. HERO.tsx
    # ---------------------------------------------------------
    "src/components/Hero.tsx": """export default function Hero() {
  return (
    <div className="flex flex-col xl:flex-row min-h-screen w-full relative z-10 pt-16">
      {/* Left Section */}
      <div className="flex-1 flex items-center p-[30px] sm:p-[40px] md:p-[60px] xl:p-[80px] xl:pr-[60px]">
        <div>
          <h1 className="text-[42px] sm:text-[56px] xl:text-[65px] font-bold leading-[0.92] mb-[30px] tracking-[-2px] xl:tracking-[-3.5px] max-w-full xl:max-w-[580px] text-black">
            ALL YOUR JOB APPLICATIONS IN ONE PLACE
          </h1>

          <p className="text-[16px] sm:text-[18px] xl:text-[20px] text-[#333] mb-[40px] max-w-[480px] leading-[1.6]">
            Automatically track your applications from start to finish on one
            simple platform.
          </p>

          <div className="flex flex-col sm:flex-row gap-[12px] sm:gap-[20px] items-start sm:items-center">
            <button className="px-6 py-4 text-[13px] sm:text-base font-semibold rounded-full border-none cursor-pointer transition-all duration-300 bg-brand-orange text-black hover:bg-brand-orange-hover hover:-translate-y-0.5 shadow-lg shadow-orange-500/20">
              START NOW FOR FREE
            </button>

            <a
              href="#"
              className="inline-flex items-center justify-center px-6 py-4 text-[13px] sm:text-base font-semibold rounded-full cursor-pointer transition-all duration-300 bg-transparent text-black border-2 border-black hover:bg-black hover:text-white group"
            >
              Learn more
              <span className="ml-[5px] group-hover:translate-x-1 transition-transform">
                →
              </span>
            </a>
          </div>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex-1 flex items-center justify-center p-[30px] xl:p-[30px] xl:pl-[10px] w-full">
        <div className="w-full max-w-[825px] xl:max-w-[1100px] aspect-[4/3] bg-[#e8e8e8] rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.1)]"></div>
      </div>
    </div>
  );
}""",

    # ---------------------------------------------------------
    # 3. AMPLIFY.tsx (Section Bento)
    # ---------------------------------------------------------
    "src/components/Amplify.tsx": """export default function Amplify() {
  return (
    <section className="min-h-screen flex justify-center items-start lg:items-center p-6 pt-20 lg:pt-64 pb-96 relative z-10">
      <div className="max-w-[1200px] w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 relative items-center">
        {/* Center Title */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center text-center relative order-1 lg:order-2 z-0">
          <span className="text-lg text-slate-500 mb-2 relative font-medium">
            floating
          </span>

          <h1 className="font-sans text-[50px] lg:text-[86px] font-bold leading-[0.92] mb-[30px] mt-5 lg:mt-0 tracking-[-2px] lg:tracking-[-3.5px] max-w-full lg:max-w-[580px] text-black relative z-0">
            AMPLIFY<br />
            YOUR<br />
            WORKFLOW
          </h1>
        </div>

        {/* Left Column */}
        <div className="lg:col-span-3 flex flex-col gap-4 order-2 lg:order-1 relative z-20 translate-x-0 lg:translate-x-12 w-full">
          <div className="bg-white rounded-2xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden transform -rotate-2 hover:rotate-0 transition-all duration-500 p-2 w-full">
            <div className="w-full h-64 bg-gray-200 rounded-xl"></div>
          </div>

          <div className="bg-white/65 backdrop-blur-md border border-white/50 shadow-sm rounded-xl p-3 inline-block max-w-[260px]">
            <h3 className="font-bold text-sm uppercase tracking-wide text-slate-800">
              Intelligent Automation
            </h3>
            <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
              Connect your tools and let AI handle repetitive tasks.
            </p>
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-3 flex flex-col h-full justify-center order-3 lg:order-3 relative pointer-events-none gap-12 lg:gap-0 w-full">
          {/* Card 2 */}
          <div className="relative z-30 pointer-events-auto ml-0 mt-0 translate-x-0 lg:-ml-40 lg:-mt-32 lg:translate-x-4 w-full">
            <div className="bg-white rounded-xl shadow-xl border border-gray-100 p-2 mb-2 w-full lg:w-64 transform rotate-2 hover:rotate-0 transition-transform duration-500 origin-bottom-left">
              <div className="w-full h-64 lg:h-40 bg-gray-200 rounded-lg"></div>
            </div>

            <div className="bg-white/65 backdrop-blur-md border border-white/50 shadow-sm rounded-xl p-3 inline-block max-w-[260px] ml-0 lg:ml-0">
              <h3 className="font-bold text-sm uppercase tracking-wide">
                Real-time Collab
              </h3>
              <p className="text-[10px] text-slate-500 mt-1">
                Work together seamlessly.
              </p>
            </div>
          </div>

          {/* Card 3 */}
          <div className="relative z-20 pointer-events-auto flex flex-col items-start lg:items-start text-left lg:text-left mt-0 lg:mt-24 ml-0 lg:ml-0 w-full">
            <div className="bg-white rounded-xl shadow-2xl p-2 mb-4 w-full lg:w-[240px] transform hover:scale-105 transition-transform duration-500">
              <div className="w-full h-64 lg:h-48 bg-gray-200 rounded-lg"></div>
            </div>

            <div className="bg-white/65 backdrop-blur-md border border-white/50 shadow-sm rounded-xl p-3 inline-block max-w-[260px]">
              <h3 className="font-bold text-sm uppercase tracking-wide text-slate-900">
                Unified Analytics
              </h3>
              <p className="text-[10px] text-slate-500 mt-1">
                Comprehensive view of metrics.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}""",
}

def fix_components():
    print("🔧 Réparation des composants en cours...")

    for path, content in files_content.items():
        # Vérification basique du chemin
        directory = os.path.dirname(path)
        if not os.path.exists(directory):
            try:
                os.makedirs(directory)
            except OSError as e:
                print(f"❌ Erreur dossier {directory}: {e}")
                continue

        # Écriture forcée
        try:
            with open(path, "w", encoding="utf-8") as f:
                f.write(content)
            print(f"✅ Corrigé : {path}")
        except Exception as e:
            print(f"❌ Erreur écriture {path}: {e}")

    print("\\n✨ Terminée ! Tes composants sont maintenant une copie conforme du HTML.")

if __name__ == "__main__":
    fix_components()