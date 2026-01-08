import Link from "next/link";

type LinkItem = {
  href: string;
  label: string;
  module?: string; // ex: "Module 1"
  status: "done" | "inProgress" | "todo";
};

const UI_PAGES: LinkItem[] = [
  {
    href: "/landing-page",
    label: "Landing Page",
    status: "done",
  },
  {
    href: "/login-page",
    label: "Login Page",
    status: "done",
  },
];

const FEATURE_PAGES: LinkItem[] = [
  {
    href: "/auth-test-page",
    label: "Authentification Test",
    module: "Module 1",
    status: "done",
  },
  {
    href: "/mail-connection-test-page",
    label: "Mail Connection Test",
    module: "Module 2",
    status: "done",
  },
  {
    href: "/scan-with-time-section-test-page",
    label: "Scan With Time Section Test",
    module: "Module 3 & 4",
    status: "done",
  },
  {
    href: "/ai-analysis-test-page",
    label: "AI Analysis Test",
    module: "Module 5",
    status: "inProgress",
  },
];

// Styles par statut
function getButtonColor(status: LinkItem["status"]) {
  if (status === "done") return "bg-green-600 hover:bg-green-700";
  if (status === "inProgress") return "bg-orange-500 hover:bg-orange-600";
  return "bg-slate-700 hover:bg-slate-800";
}

function Section({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: LinkItem[];
}) {
  return (
    <section className="space-y-3">
      <div className="text-left">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-600">{description}</p>
      </div>

      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className={[
                "block w-full px-6 py-3 text-white rounded-lg font-medium transition shadow-sm",
                "flex items-center justify-between gap-4",
                getButtonColor(item.status),
              ].join(" ")}
            >
              <span className="text-left">
                <span className="block">{item.label}</span>
                {item.module ? (
                  <span className="block text-xs text-white/80">
                    {item.module}
                  </span>
                ) : null}
              </span>

              <span className="text-xs font-semibold text-white/90">
                {item.status === "done"
                  ? "DONE"
                  : item.status === "inProgress"
                  ? "IN PROGRESS"
                  : "TODO"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-8">
        {/* Header */}
        <header className="text-center">
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">
            Welcome to JobTrackAI
          </h1>
          <p className="mt-4 text-slate-600">
            Hub de navigation: pages UI (visuel) vs pages modules (tests de
            fonctionnalités).
          </p>
        </header>

        {/* UI pages (purement visuel) */}
        <Section
          title="Pages UI"
          description="Pages purement frontales, sans logique métier."
          items={UI_PAGES}
        />

        {/* Feature pages */}
        <Section
          title="Modules (Fonctionnalités & Tests)"
          description="Pages de test pour valider l’auth, la connexion mail, les scans, et l’analyse."
          items={FEATURE_PAGES}
        />
      </div>
    </main>
  );
}
