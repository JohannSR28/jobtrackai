// app/error/page.tsx
"use client";
import { useSearchParams } from "next/navigation";

export default function ErrorPage() {
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");

  const messages: Record<string, string> = {
    missing_code: "Le code d'autorisation est manquant.",
    exchange_failed: "La communication avec Google a échoué.",
    callback_failed: "Une erreur est survenue pendant la connexion.",
  };

  return (
    <div className="text-center mt-20">
      <h1 className="text-2xl font-bold mb-4">Erreur de connexion Gmail</h1>
      <p>{messages[reason ?? "callback_failed"]}</p>
    </div>
  );
}
