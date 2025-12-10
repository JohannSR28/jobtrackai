import Link from "next/link";

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
}